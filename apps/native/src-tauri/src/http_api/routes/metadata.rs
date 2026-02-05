use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};

use crate::http_api::response::ApiResponse;
use crate::models::get_level_config;
use crate::web_server::AppState;

// GET /api/metadata/languages
async fn get_languages_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<String>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.get_all_languages(user_id) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_all_languages failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/metadata/topics
async fn get_topics_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<String>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.get_all_topics(user_id) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_all_topics failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/metadata/tags
async fn get_tags_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<String>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.get_all_tags(user_id) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_all_tags failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/metadata/levels/:language
async fn get_level_config_handler(
    Path(language): Path<String>,
) -> Result<Json<ApiResponse<Vec<String>>>, StatusCode> {
    let levels = get_level_config(&language);
    Ok(Json(ApiResponse::success(levels)))
}

/// Create metadata routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/languages", get(get_languages_handler))
        .route("/topics", get(get_topics_handler))
        .route("/tags", get(get_tags_handler))
        .route("/levels/{language}", get(get_level_config_handler))
}
