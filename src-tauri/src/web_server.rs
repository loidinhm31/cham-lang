//! Embedded web server for serving frontend assets in production builds.
//! This module is only compiled for desktop targets (not Android).
//!
//! The server runs on port 25091 and serves the bundled frontend assets,
//! enabling the "Open in Browser" feature to work in production.

use axum::{
    body::Body,
    http::{header, Response, StatusCode, Uri},
    routing::get,
    Router,
};
use rust_embed::RustEmbed;
use std::net::SocketAddr;
use tokio::runtime::Runtime;

/// Port for the embedded web server
pub const WEB_SERVER_PORT: u16 = 25091;

/// Embed the dist folder at compile time
#[derive(RustEmbed)]
#[folder = "../dist"]
struct Asset;

/// Start the embedded web server in a background thread.
/// Returns a handle to the runtime for graceful shutdown if needed.
pub fn start_web_server() -> std::thread::JoinHandle<()> {
    std::thread::spawn(|| {
        // Create a new Tokio runtime for the web server
        let rt = Runtime::new().expect("Failed to create Tokio runtime");

        rt.block_on(async {
            let app = Router::new()
                // Serve all routes through our asset handler
                .fallback(get(serve_asset));

            let addr = SocketAddr::from(([127, 0, 0, 1], WEB_SERVER_PORT));
            println!("🌐 Starting embedded web server on http://{}", addr);

            let listener = match tokio::net::TcpListener::bind(addr).await {
                Ok(listener) => listener,
                Err(e) => {
                    eprintln!(
                        "❌ Failed to bind web server to port {}: {}",
                        WEB_SERVER_PORT, e
                    );
                    eprintln!("   The port may already be in use (e.g., by Vite dev server)");
                    return;
                }
            };

            println!(
                "✓ Embedded web server ready at http://localhost:{}",
                WEB_SERVER_PORT
            );

            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("❌ Web server error: {}", e);
            }
        });
    })
}

/// Serve static assets from the embedded files
async fn serve_asset(uri: Uri) -> Response<Body> {
    let path = uri.path().trim_start_matches('/');

    // Try to serve the requested file
    if let Some(content) = Asset::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .header(header::CACHE_CONTROL, "public, max-age=31536000")
            .body(Body::from(content.data.into_owned()))
            .unwrap();
    }

    // For SPA routing: serve index.html for paths without file extensions
    // This allows React Router to handle client-side routing
    if !path.contains('.') || path.is_empty() {
        if let Some(content) = Asset::get("index.html") {
            return Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .header(header::CACHE_CONTROL, "no-cache")
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