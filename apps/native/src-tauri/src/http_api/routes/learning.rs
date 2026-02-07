use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json, Router,
};

use crate::http_api::response::ApiResponse;
use crate::models::{LearningSettings, UpdateLearningSettingsRequest};
use crate::web_server::AppState;

// GET /api/learning/settings
async fn get_settings_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Option<LearningSettings>>>, StatusCode> {
    match state.db.get_learning_settings() {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_learning_settings failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/learning/settings/or-create
async fn get_or_create_settings_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<LearningSettings>>, StatusCode> {
    match state.db.get_or_create_learning_settings() {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_or_create_learning_settings failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// PUT /api/learning/settings
async fn update_settings_handler(
    State(state): State<AppState>,
    Json(request): Json<UpdateLearningSettingsRequest>,
) -> Result<Json<ApiResponse<LearningSettings>>, StatusCode> {
    match state.db.update_learning_settings(&request) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("update_learning_settings failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create learning settings routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/settings", get(get_settings_handler))
        .route("/settings", axum::routing::put(update_settings_handler))
        .route("/settings/or-create", get(get_or_create_settings_handler))
}
