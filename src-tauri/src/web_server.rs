//! Embedded web server for serving frontend assets and API endpoints in production builds.
//! This module is only compiled for desktop targets (not Android).
//!
//! The server runs on port 25091 and serves:
//! - Bundled frontend assets for the "Open in Browser" feature
//! - REST API endpoints for SQLite data sync (/api/export, /api/import)
//!
//! Security: All API endpoints require a valid session token and validate Host headers.

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, Request, Response, StatusCode, Uri},
    middleware::{self, Next},
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use futures::stream::Stream;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::sync::{broadcast, oneshot};

use crate::local_db::LocalDatabase;
use crate::models::{
    Collection, LearningSettings, PracticeSession, UserPracticeProgress, Vocabulary,
};
use crate::session::SharedSessionManager;

/// Port for the embedded web server
pub const WEB_SERVER_PORT: u16 = 25091;

/// Embed the dist folder at compile time
#[derive(RustEmbed)]
#[folder = "../dist"]
struct Asset;

/// Shared state for the web server
#[derive(Clone)]
pub struct AppState {
    pub db: LocalDatabase,
    pub session_manager: SharedSessionManager,
    /// Broadcast channel for SSE shutdown notifications
    pub shutdown_broadcast: broadcast::Sender<String>,
}

/// Handle for graceful shutdown
pub struct ServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
    shutdown_broadcast_tx: Option<broadcast::Sender<String>>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
}

impl ServerHandle {
    /// Shutdown the server gracefully, notifying connected browsers first
    pub fn shutdown(mut self) {
        // First, notify all connected browsers via SSE that we're shutting down
        if let Some(tx) = &self.shutdown_broadcast_tx {
            println!("Sending shutdown notification to browsers...");
            let _ = tx.send("shutdown".to_string());
            // Give browsers a moment to receive the message
            std::thread::sleep(Duration::from_millis(500));
        }

        // Then proceed with actual server shutdown
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
        println!("Web server stopped");
    }
}

/// Global server handle for shutdown
static SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::new(None);

/// Start the embedded web server in a background thread.
/// Returns the session token for the browser URL.
pub fn start_web_server(db: LocalDatabase, session_manager: SharedSessionManager) -> String {
    // Generate a new session token
    let token = session_manager.generate_token();

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    // Create a broadcast channel for SSE shutdown notifications
    // Capacity of 16 should be plenty for shutdown events
    let (shutdown_broadcast_tx, _) = broadcast::channel::<String>(16);
    let shutdown_broadcast_for_state = shutdown_broadcast_tx.clone();

    let state = AppState {
        db,
        session_manager,
        shutdown_broadcast: shutdown_broadcast_for_state,
    };

    let thread_handle = std::thread::spawn(move || {
        let rt = Runtime::new().expect("Failed to create Tokio runtime");

        rt.block_on(async {
            // Create CORS layer - allow both Vite dev server and embedded server origins
            let cors = tower_http::cors::CorsLayer::new()
                .allow_origin([
                    "http://localhost:25091"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(),
                    "http://localhost:1420"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(), // Vite dev
                ])
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::OPTIONS,
                ])
                .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::ACCEPT]);

            let app = Router::new()
                // API routes with security middleware
                .route("/api/export", get(api_export))
                .route("/api/import", post(api_import))
                .route("/api/health", get(api_health))
                // SSE route for shutdown notifications (no auth required - just for shutdown signal)
                .route("/api/events", get(sse_handler))
                .layer(middleware::from_fn_with_state(
                    state.clone(),
                    security_middleware,
                ))
                .layer(cors)
                .with_state(state.clone())
                // Static assets fallback (no auth required for assets)
                .fallback(get(serve_asset));

            // Try IPv6 first (for localhost resolution), fall back to IPv4
            let ipv6_addr = SocketAddr::from(([0, 0, 0, 0, 0, 0, 0, 1], WEB_SERVER_PORT)); // [::1]
            let ipv4_addr = SocketAddr::from(([127, 0, 0, 1], WEB_SERVER_PORT));

            println!("Starting embedded web server...");

            let listener = match tokio::net::TcpListener::bind(ipv6_addr).await {
                Ok(listener) => {
                    println!("   Bound to IPv6 [::1]:{}", WEB_SERVER_PORT);
                    listener
                }
                Err(e6) => {
                    println!("   IPv6 bind failed: {}, trying IPv4...", e6);
                    // Fall back to IPv4
                    match tokio::net::TcpListener::bind(ipv4_addr).await {
                        Ok(listener) => {
                            println!("   Bound to IPv4 127.0.0.1:{}", WEB_SERVER_PORT);
                            listener
                        }
                        Err(e4) => {
                            eprintln!("Failed to bind web server: IPv6: {}, IPv4: {}", e6, e4);
                            eprintln!("   The port may already be in use");
                            return;
                        }
                    }
                }
            };

            println!(
                "Embedded web server ready at http://localhost:{}",
                WEB_SERVER_PORT
            );

            // Use axum's serve with graceful shutdown
            axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                    println!("Shutdown signal received");
                })
                .await
                .ok();
        });
    });

    // Store the handle for later shutdown
    let handle = ServerHandle {
        shutdown_tx: Some(shutdown_tx),
        shutdown_broadcast_tx: Some(shutdown_broadcast_tx),
        thread_handle: Some(thread_handle),
    };

    *SERVER_HANDLE.lock().unwrap() = Some(handle);

    token
}

/// Stop the web server
pub fn stop_web_server() {
    let handle = SERVER_HANDLE.lock().unwrap().take();
    if let Some(h) = handle {
        h.shutdown();
    }
}

/// Check if the web server is currently running
pub fn is_server_running() -> bool {
    SERVER_HANDLE.lock().unwrap().is_some()
}

//=============================================================================
// Security Middleware
//=============================================================================

/// Token query parameter
#[derive(Deserialize)]
struct TokenQuery {
    token: Option<String>,
}

/// Security middleware that validates session token and Host header
async fn security_middleware(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    request: Request<Body>,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    let path = request.uri().path();
    println!("Request received: {} {}", request.method(), path);

    // Skip security for non-API routes
    if !path.starts_with("/api/") {
        println!("   Non-API route, passing through");
        return Ok(next.run(request).await);
    }

    // Skip security for health check
    if path == "/api/health" {
        println!("   Health check, passing through");
        return Ok(next.run(request).await);
    }

    // Skip security for SSE events (only sends shutdown notifications)
    if path == "/api/events" {
        println!("   SSE events, passing through");
        return Ok(next.run(request).await);
    }

    // Validate Host header (DNS rebinding protection)
    if let Some(host) = request.headers().get("host") {
        if let Ok(host_str) = host.to_str() {
            println!("   Host header: {}", host_str);
            let valid_hosts = ["localhost:25091", "localhost"];
            if !valid_hosts.iter().any(|h| host_str.starts_with(h)) {
                eprintln!("Rejected request with invalid Host: {}", host_str);
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    // Validate session token
    let token = query.token.clone().unwrap_or_default();
    println!(
        "   Token received: {}...",
        &token.chars().take(16).collect::<String>()
    );
    if !state.session_manager.validate_token(&token) {
        eprintln!("Rejected request with invalid token");
        return Err(StatusCode::UNAUTHORIZED);
    }
    println!("   Token validated successfully");

    // For POST requests, validate Origin header
    if request.method() == "POST" {
        if let Some(origin) = request.headers().get("origin") {
            if let Ok(origin_str) = origin.to_str() {
                // Allow both production (25091) and Vite dev server (1420) origins
                let valid_origins = ["http://localhost:25091", "http://localhost:1420"];
                if !valid_origins.contains(&origin_str) {
                    eprintln!("Rejected POST with invalid Origin: {}", origin_str);
                    return Err(StatusCode::UNAUTHORIZED);
                }
            }
        }
    }

    println!("   Passing to handler");
    Ok(next.run(request).await)
}

//=============================================================================
// API Endpoints
//=============================================================================

/// SQLite backup data structure (matches frontend DatabaseMigration.ts)
#[derive(Debug, Serialize, Deserialize)]
pub struct SQLiteBackupData {
    pub version: String,
    pub exported_at: String,
    pub collections: Vec<Collection>,
    pub vocabularies: Vec<Vocabulary>,
    pub practice_sessions: Vec<PracticeSession>,
    pub practice_progress: Vec<UserPracticeProgress>,
    pub learning_settings: Option<LearningSettings>,
}

/// API response wrapper
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

/// Health check endpoint
async fn api_health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("OK".to_string()))
}

/// SSE endpoint for shutdown notifications
/// Browsers connect to this endpoint and receive events when the server is about to shut down
async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut rx = state.shutdown_broadcast.subscribe();

    let stream = async_stream::stream! {
        // Send an initial "connected" event
        yield Ok(Event::default().event("connected").data("Browser connected to desktop server"));

        // Keep connection alive and wait for shutdown event
        loop {
            tokio::select! {
                // Check for shutdown broadcast
                result = rx.recv() => {
                    match result {
                        Ok(msg) => {
                            println!("SSE: Sending {} event to browser", msg);
                            yield Ok(Event::default().event(&msg).data("Server is shutting down"));
                            // After sending shutdown, we can close the stream
                            break;
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            // Channel closed, server is shutting down
                            yield Ok(Event::default().event("shutdown").data("Server connection closed"));
                            break;
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => {
                            // We missed some messages, but keep listening
                            continue;
                        }
                    }
                }
                // Send keepalive ping every 30 seconds
                _ = tokio::time::sleep(Duration::from_secs(30)) => {
                    yield Ok(Event::default().event("ping").data("keepalive"));
                }
            }
        }
    };

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// Export endpoint - returns all SQLite data as JSON
async fn api_export(State(state): State<AppState>) -> Result<Json<SQLiteBackupData>, StatusCode> {
    let user_id = state.db.get_local_user_id();

    // Get all collections
    let collections = state.db.get_user_collections(user_id).map_err(|e| {
        eprintln!("Failed to get collections: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Get all vocabularies
    let vocabularies = state
        .db
        .get_all_vocabularies(user_id, None, None)
        .map_err(|e| {
            eprintln!("Failed to get vocabularies: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Get all languages to query practice data
    let languages = state.db.get_all_languages(user_id).unwrap_or_default();

    // Get all practice sessions and progress for all languages
    let mut practice_sessions = Vec::new();
    let mut practice_progress = Vec::new();

    for lang in &languages {
        if let Ok(sessions) = state.db.get_practice_sessions(user_id, lang, None) {
            practice_sessions.extend(sessions);
        }
        if let Ok(Some(progress)) = state.db.get_practice_progress(user_id, lang) {
            practice_progress.push(progress);
        }
    }

    // Get learning settings
    let learning_settings = state.db.get_learning_settings(user_id).ok().flatten();

    let backup = SQLiteBackupData {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        collections,
        vocabularies,
        practice_sessions,
        practice_progress,
        learning_settings,
    };

    println!(
        "Exported {} collections, {} vocabularies",
        backup.collections.len(),
        backup.vocabularies.len()
    );

    Ok(Json(backup))
}

/// Import response
#[derive(Serialize)]
struct ImportResult {
    collections: usize,
    vocabularies: usize,
}

/// Import endpoint - imports JSON data to SQLite
async fn api_import(
    State(state): State<AppState>,
    Json(backup): Json<SQLiteBackupData>,
) -> Result<Json<ApiResponse<ImportResult>>, StatusCode> {
    let user_id = state.db.get_local_user_id();

    println!(
        "Importing {} collections, {} vocabularies",
        backup.collections.len(),
        backup.vocabularies.len()
    );

    // Clear existing data first
    state.db.clear_all_data().map_err(|e| {
        eprintln!("Failed to clear database: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut collections_imported = 0;
    let mut vocabularies_imported = 0;

    // Import collections (preserving original IDs for vocabulary references)
    for collection in &backup.collections {
        if let Err(e) = state.db.import_collection_with_id(
            &collection.id,
            &collection.name,
            &collection.description,
            &collection.language,
            user_id,
            collection.is_public,
        ) {
            eprintln!("Failed to import collection '{}': {}", collection.name, e);
        } else {
            collections_imported += 1;
        }
    }

    // Import vocabularies
    for vocab in &backup.vocabularies {
        if let Err(e) = state.db.create_vocabulary(vocab, user_id) {
            eprintln!("Failed to import vocabulary '{}': {}", vocab.word, e);
        } else {
            vocabularies_imported += 1;
        }
    }

    // Import learning settings if present
    if let Some(settings) = &backup.learning_settings {
        let _ = state.db.create_learning_settings(
            user_id,
            &settings.sr_algorithm,
            settings.leitner_box_count,
            settings.consecutive_correct_required,
            settings.show_failed_words_in_session,
            settings.new_words_per_day,
            settings.daily_review_limit,
            settings.auto_advance_timeout_seconds,
            settings.show_hint_in_fillword,
        );
    }

    // Update version
    let _ = state.db.update_version();

    println!(
        "Import complete: {} collections, {} vocabularies",
        collections_imported, vocabularies_imported
    );

    Ok(Json(ApiResponse::success(ImportResult {
        collections: collections_imported,
        vocabularies: vocabularies_imported,
    })))
}

//=============================================================================
// Static Asset Serving
//=============================================================================

/// Serve static assets from the embedded files
async fn serve_asset(uri: Uri) -> Response<Body> {
    let path = uri.path().trim_start_matches('/');

    // In dev mode, browser opens directly to Vite (1420), not here
    // This fallback only handles production mode

    // Try to serve the requested file
    if let Some(content) = Asset::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, "public, max-age=31536000")
            .header(
                header::ACCESS_CONTROL_ALLOW_ORIGIN,
                "http://localhost:25091",
            )
            .body(Body::from(content.data.into_owned()))
            .unwrap();
    }

    // For SPA routing: serve index.html for paths without file extensions
    if !path.contains('.') || path.is_empty() {
        if let Some(content) = Asset::get("index.html") {
            return Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .header(header::CACHE_CONTROL, "no-cache")
                .header(
                    header::ACCESS_CONTROL_ALLOW_ORIGIN,
                    "http://localhost:25091",
                )
                .body(Body::from(content.data.into_owned()))
                .unwrap();
        }
    }

    // 404 for everything else
    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(Body::from("404 Not Found"))
        .unwrap()
}
