/// HTTP server for receiving sync requests

use std::sync::Arc;
use axum::{
    Router,
    routing::{post, get},
    extract::State,
    Json,
    http::StatusCode,
};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;
use tauri::Emitter;
use crate::local_db::LocalDatabase;
use crate::models::{
    HandshakeRequest,
    HandshakeResponse,
    SyncDirection,
    PairingRequest,
    PairingResponse,
};
use super::pairing::PairingManager;

#[derive(Clone)]
struct AppState {
    db: Arc<LocalDatabase>,
    pairing: Arc<PairingManager>,
    app_handle: Option<tauri::AppHandle>,
}

pub struct SyncServer {
    port: u16,
    db: Arc<LocalDatabase>,
    pairing: Arc<PairingManager>,
    server_handle: Arc<tokio::sync::Mutex<Option<JoinHandle<()>>>>,
    app_handle: Option<tauri::AppHandle>,
}

impl SyncServer {
    pub async fn new(db: Arc<LocalDatabase>, pairing: Arc<PairingManager>) -> Result<Self, String> {
        // Create a TCP listener to get an available port
        let listener = TcpListener::bind("0.0.0.0:0").await
            .map_err(|e| format!("Failed to bind to port: {}", e))?;

        let port = listener.local_addr()
            .map_err(|e| format!("Failed to get local address: {}", e))?
            .port();

        // Drop the listener immediately so the port can be reused
        drop(listener);

        Ok(Self {
            port,
            db,
            pairing,
            server_handle: Arc::new(tokio::sync::Mutex::new(None)),
            app_handle: None,
        })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn set_app_handle(&mut self, app_handle: tauri::AppHandle) {
        self.app_handle = Some(app_handle);
    }

    pub async fn start(&self) -> Result<(), String> {
        let state = AppState {
            db: self.db.clone(),
            pairing: self.pairing.clone(),
            app_handle: self.app_handle.clone(),
        };

        let app = Router::new()
            .route("/health", get(health_handler))
            .route("/pair", post(pairing_handler))
            .route("/handshake", post(handshake_handler))
            .with_state(state);

        let addr = format!("0.0.0.0:{}", self.port);
        let listener = TcpListener::bind(&addr).await
            .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

        println!("🌐 [SyncServer] HTTP server listening on {}", addr);

        let server_handle = tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("❌ [SyncServer] Server error: {}", e);
            }
        });

        let mut handle = self.server_handle.lock().await;
        *handle = Some(server_handle);

        Ok(())
    }

    pub async fn stop(self) -> Result<(), String> {
        let mut handle = self.server_handle.lock().await;
        if let Some(h) = handle.take() {
            h.abort();
        }
        Ok(())
    }
}

async fn health_handler() -> StatusCode {
    StatusCode::OK
}

async fn pairing_handler(
    State(state): State<AppState>,
    Json(request): Json<PairingRequest>,
) -> (StatusCode, Json<PairingResponse>) {
    println!("📨 [SyncServer] Received pairing request from {} ({})",
        request.device_name, request.device_id);

    // Start a pairing session (but don't auto-confirm)
    // The user must enter the PIN through the UI
    match state.pairing.start_pairing_session(request.device_id.clone(), request.pin.clone()) {
        Ok(_) => {
            println!("✅ [SyncServer] Pairing session started for {}", request.device_name);

            // Emit event to the app so the UI can show a pairing prompt
            if let Some(app_handle) = &state.app_handle {
                let incoming_request = crate::models::IncomingPairingRequest {
                    device_id: request.device_id.clone(),
                    device_name: request.device_name.clone(),
                    ip_address: "unknown".to_string(), // Would need to extract from request
                    port: 0,
                    timestamp: chrono::Utc::now().timestamp(),
                };

                if let Err(e) = app_handle.emit("pairing-request", &incoming_request) {
                    eprintln!("❌ [SyncServer] Failed to emit pairing-request event: {}", e);
                } else {
                    println!("✅ [SyncServer] Emitted pairing-request event to UI");
                }
            }

            // Return success - pairing will be confirmed when user enters PIN
            (StatusCode::OK, Json(PairingResponse {
                success: true,
                message: "Pairing request received. Please enter the PIN shown on the other device.".to_string(),
                shared_secret: None, // No secret yet - waiting for user confirmation
            }))
        },
        Err(e) => {
            println!("❌ [SyncServer] Failed to start pairing session: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(PairingResponse {
                success: false,
                message: format!("Failed to start pairing session: {}", e),
                shared_secret: None,
            }))
        }
    }
}

async fn handshake_handler(
    State(_state): State<AppState>,
    Json(_request): Json<HandshakeRequest>,
) -> Json<HandshakeResponse> {
    Json(HandshakeResponse {
        device_id: "placeholder".to_string(),
        device_name: "placeholder".to_string(),
        remote_version: 0,
        session_id: "placeholder".to_string(),
        sync_direction: SyncDirection::None,
    })
}
