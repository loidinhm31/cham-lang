use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::http_api::response::ApiResponse;
use crate::models::{Collection, CreateCollectionRequest, UpdateCollectionRequest};
use crate::web_server::AppState;

// POST /api/collections
async fn create_handler(
    State(state): State<AppState>,
    Json(request): Json<CreateCollectionRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.create_collection(
        &request.name,
        &request.description,
        &request.language,
        request.is_public,
    ) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("create_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/collections/:id
async fn get_one_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<Collection>>, StatusCode> {
    match state.db.get_collection(&id) {
        Ok(Some(result)) => Ok(Json(ApiResponse::success(result))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            eprintln!("get_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/collections/user
async fn get_user_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<Collection>>>, StatusCode> {
    match state.db.get_user_collections() {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_user_collections failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/collections/public?language=...
#[derive(Deserialize)]
struct PublicQuery {
    language: Option<String>,
}

async fn get_public_handler(
    State(state): State<AppState>,
    Query(query): Query<PublicQuery>,
) -> Result<Json<ApiResponse<Vec<Collection>>>, StatusCode> {
    match state.db.get_public_collections(query.language.as_deref()) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_public_collections failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// PUT /api/collections
async fn update_handler(
    State(state): State<AppState>,
    Json(request): Json<UpdateCollectionRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let name = request.name.unwrap_or_default();
    let description = request.description.unwrap_or_default();
    let is_public = request.is_public.unwrap_or(false);

    match state
        .db
        .update_collection(&request.id, &name, &description, is_public)
    {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Collection updated successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("update_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// DELETE /api/collections/:id
async fn delete_one_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.delete_collection(&id) {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Collection deleted successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("delete_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// POST /api/collections/:collection_id/share/:user_id
async fn share_handler(
    State(state): State<AppState>,
    Path((collection_id, user_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.share_collection(&collection_id, &user_id, "viewer") {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Collection shared successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("share_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// POST /api/collections/:collection_id/unshare/:user_id
async fn unshare_handler(
    State(state): State<AppState>,
    Path((collection_id, user_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.unshare_collection(&collection_id, &user_id) {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Collection unshared successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("unshare_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create collection routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", post(create_handler))
        .route("/", axum::routing::put(update_handler))
        .route("/{id}", get(get_one_handler))
        .route("/{id}", axum::routing::delete(delete_one_handler))
        .route("/user", get(get_user_handler))
        .route("/public", get(get_public_handler))
        .route("/{collection_id}/share/{user_id}", post(share_handler))
        .route("/{collection_id}/unshare/{user_id}", post(unshare_handler))
}
