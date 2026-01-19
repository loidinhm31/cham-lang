use axum::{
    middleware,
    response::sse::{Event, KeepAlive, Sse},
    routing::get,
    Json, Router,
};
use futures::stream::Stream;
use std::convert::Infallible;
use std::time::Duration;
use tokio::sync::broadcast;

use crate::http_api::{cors_layer, security_middleware, ApiResponse};
use crate::web_server::AppState;

mod collections;
mod learning;
mod metadata;
mod practice;
mod vocabularies;

/// Health check endpoint
async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("OK".to_string()))
}

/// SSE endpoint for shutdown notifications
/// Browsers connect to this endpoint and receive events when the server is about to shut down
async fn sse_handler(
    axum::extract::State(state): axum::extract::State<AppState>,
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

/// Assemble all API routes
pub fn api_routes(state: AppState) -> Router {
    Router::new()
        // Health check (no auth required)
        .route("/health", get(health_check))
        // SSE endpoint (no auth required for shutdown notifications)
        .route("/events", get(sse_handler))
        // Vocabularies routes
        .nest("/vocabularies", vocabularies::routes())
        // Collections routes
        .nest("/collections", collections::routes())
        // Practice routes
        .nest("/practice", practice::routes())
        // Learning settings routes
        .nest("/learning", learning::routes())
        // Metadata routes
        .nest("/metadata", metadata::routes())
        // Apply security middleware to all routes except health and events
        .layer(middleware::from_fn_with_state(
            state.clone(),
            security_middleware,
        ))
        // Apply CORS layer
        .layer(cors_layer())
        // Apply state to the router
        .with_state(state)
}
