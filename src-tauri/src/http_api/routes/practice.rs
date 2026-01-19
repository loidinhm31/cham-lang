use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::http_api::response::ApiResponse;
use crate::models::{
    CreatePracticeSessionRequest, PracticeSession, UpdateProgressRequest, UserPracticeProgress,
};
use crate::web_server::AppState;

// POST /api/practice/sessions
async fn create_session_handler(
    State(state): State<AppState>,
    Json(request): Json<CreatePracticeSessionRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.create_practice_session(&request, user_id) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("create_practice_session failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/practice/sessions?language=...&limit=...
#[derive(Deserialize)]
struct SessionsQuery {
    language: String,
    limit: Option<i64>,
}

async fn get_sessions_handler(
    State(state): State<AppState>,
    Query(query): Query<SessionsQuery>,
) -> Result<Json<ApiResponse<Vec<PracticeSession>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state
        .db
        .get_practice_sessions(user_id, &query.language, query.limit)
    {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_practice_sessions failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// PUT /api/practice/progress
async fn update_progress_handler(
    State(state): State<AppState>,
    Json(request): Json<UpdateProgressRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.update_practice_progress(&request, user_id) {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Progress updated successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("update_practice_progress failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/practice/progress/:language
async fn get_progress_handler(
    State(state): State<AppState>,
    Path(language): Path<String>,
) -> Result<Json<ApiResponse<Option<UserPracticeProgress>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.get_practice_progress(user_id, &language) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_practice_progress failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create practice routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/sessions",
            post(create_session_handler).get(get_sessions_handler),
        )
        .route("/progress", axum::routing::put(update_progress_handler))
        .route("/progress/{language}", get(get_progress_handler))
}
