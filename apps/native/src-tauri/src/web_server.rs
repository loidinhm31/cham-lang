//! Embedded web server for serving frontend assets and API endpoints in production builds.
//! This module is only compiled for desktop targets (not Android).
//!
//! The server runs on port 25091 and serves:
//! - Bundled frontend assets for the "Open in Browser" feature
//!
//! Security: All API endpoints require a valid session token and validate Host headers.

use axum::{
    body::Body,
    http::{header, Response, StatusCode, Uri},
    routing::get,
    Router,
};
use rust_embed::RustEmbed;
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::sync::{broadcast, oneshot};

use crate::http_api::routes::api_routes;
use crate::local_db::LocalDatabase;
use crate::session::SharedSessionManager;

/// Port for the embedded web server
pub const WEB_SERVER_PORT: u16 = 25091;

/// Embed the dist folder at compile time (only in release mode)
/// In debug mode, assets are served by Vite dev server, so we provide a dummy implementation
#[cfg(not(debug_assertions))]
#[derive(RustEmbed)]
#[folder = "../dist"]
struct Asset;

/// Dummy Asset struct for debug/dev mode - returns None for all assets
/// since the Vite dev server handles asset serving on port 1420
#[cfg(debug_assertions)]
struct Asset;

#[cfg(debug_assertions)]
impl Asset {
    fn get(_path: &str) -> Option<rust_embed::EmbeddedFile> {
        None // In dev mode, assets are served by Vite
    }
}

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
            // Create the main API router (already has state applied)
            let api_router = api_routes(state.clone());

            // Build the app with API routes and static assets fallback
            let app = Router::new()
                .nest("/api", api_router)
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
