/// HTTP API module for exposing Tauri commands as REST endpoints.
///
/// This module provides a unified HTTP API that allows both desktop (via IPC)
/// and web (via HTTP) platforms to use the same SQLite backend.

pub mod middleware;
pub mod response;
pub mod routes;

// Re-export commonly used items
pub use middleware::{cors_layer, security_middleware};
pub use response::ApiResponse;
