use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, Method, Request, Response, StatusCode},
    middleware::Next,
};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

use crate::web_server::AppState;

/// Token query parameter
#[derive(Deserialize)]
pub struct TokenQuery {
    pub token: Option<String>,
}

/// Security middleware that validates session token and Host header
pub async fn security_middleware(
    State(state): State<AppState>,
    Query(query): Query<TokenQuery>,
    request: Request<Body>,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    let path = request.uri().path();
    println!("HTTP API Request: {} {}", request.method(), path);

    // Skip security for health check
    if path == "/api/health" {
        println!("   Health check, passing through");
        return Ok(next.run(request).await);
    }

    // Skip security for SSE events
    if path == "/api/events" {
        println!("   SSE events, passing through");
        return Ok(next.run(request).await);
    }

    // Validate Host header (DNS rebinding protection)
    if let Some(host) = request.headers().get("host") {
        if let Ok(host_str) = host.to_str() {
            println!("   Host header: {}", host_str);
            // Allow localhost with any port, or just localhost
            if !host_str.starts_with("localhost") && !host_str.starts_with("127.0.0.1") {
                eprintln!("Rejected request with invalid Host: {}", host_str);
                return Err(StatusCode::FORBIDDEN);
            }
        }
    }

    // Validate session token
    let token = query.token.as_deref().unwrap_or("");
    println!(
        "   Token received: {}...",
        &token.chars().take(16).collect::<String>()
    );
    if !state.session_manager.validate_token(token) {
        eprintln!("Rejected request with invalid token");
        return Err(StatusCode::UNAUTHORIZED);
    }
    println!("   Token validated successfully");

    // For POST/PUT/DELETE requests, validate Origin header
    if matches!(
        request.method(),
        &Method::POST | &Method::PUT | &Method::DELETE
    ) {
        if let Some(origin) = request.headers().get("origin") {
            if let Ok(origin_str) = origin.to_str() {
                // Allow both production (25091) and Vite dev server (1420) origins
                let valid_origins = ["http://localhost:25091", "http://localhost:1420"];
                if !valid_origins.contains(&origin_str) {
                    eprintln!(
                        "Rejected {} with invalid Origin: {}",
                        request.method(),
                        origin_str
                    );
                    return Err(StatusCode::FORBIDDEN);
                }
            }
        }
    }

    println!("   Passing to handler");
    Ok(next.run(request).await)
}

/// Create CORS layer for HTTP API
pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin([
            "http://localhost:25091"
                .parse::<axum::http::HeaderValue>()
                .unwrap(),
            "http://localhost:1420"
                .parse::<axum::http::HeaderValue>()
                .unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
}
