use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::http_api::response::ApiResponse;
use crate::models::{
    BulkMoveRequest, BulkMoveResult, CreateVocabularyRequest, PaginatedResponse,
    UpdateVocabularyRequest, Vocabulary,
};
use crate::web_server::AppState;

// POST /api/vocabularies
async fn create_handler(
    State(state): State<AppState>,
    Json(request): Json<CreateVocabularyRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    let vocab = Vocabulary {
        id: None,
        word: request.word,
        word_type: request.word_type,
        level: request.level,
        ipa: request.ipa,
        audio_url: request.audio_url,
        concept: request.concept,
        definitions: request.definitions,
        example_sentences: request.example_sentences,
        topics: request.topics,
        tags: request.tags,
        related_words: request.related_words,
        language: request.language,
        collection_id: request.collection_id.clone(),
        user_id: user_id.to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        sync_version: 1,
        synced_at: None,
    };

    match state.db.create_vocabulary(&vocab, user_id) {
        Ok(vocab_id) => {
            let _ = state
                .db
                .update_collection_word_count(&request.collection_id);
            Ok(Json(ApiResponse::success(vocab_id)))
        }
        Err(e) => {
            eprintln!("create_vocabulary failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/vocabularies/:id
async fn get_one_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<Vocabulary>>, StatusCode> {
    match state.db.get_vocabulary(&id) {
        Ok(Some(vocab)) => Ok(Json(ApiResponse::success(vocab))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            eprintln!("get_vocabulary failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// PUT /api/vocabularies
async fn update_handler(
    State(state): State<AppState>,
    Json(request): Json<UpdateVocabularyRequest>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.update_vocabulary(&request.id, &request) {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Updated successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("update_vocabulary failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// DELETE /api/vocabularies/:id
async fn delete_one_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<String>>, StatusCode> {
    match state.db.delete_vocabulary(&id) {
        Ok(_) => Ok(Json(ApiResponse::success(
            "Deleted successfully".to_string(),
        ))),
        Err(e) => {
            eprintln!("delete_vocabulary failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// POST /api/vocabularies/bulk-move
async fn bulk_move_handler(
    State(state): State<AppState>,
    Json(request): Json<BulkMoveRequest>,
) -> Result<Json<ApiResponse<BulkMoveResult>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state.db.bulk_move_vocabularies(
        &request.vocabulary_ids,
        &request.target_collection_id,
        user_id,
    ) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("bulk_move_vocabularies failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/vocabularies?language=...&limit=...
#[derive(Deserialize)]
struct GetAllQuery {
    language: Option<String>,
    limit: Option<i64>,
}

async fn get_all_handler(
    State(state): State<AppState>,
    Query(query): Query<GetAllQuery>,
) -> Result<Json<ApiResponse<Vec<Vocabulary>>>, StatusCode> {
    let user_id = state.db.get_local_user_id();
    match state
        .db
        .get_all_vocabularies(user_id, query.language.as_deref(), query.limit)
    {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_all_vocabularies failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/vocabularies/search?query=...&language=...
#[derive(Deserialize)]
struct SearchQuery {
    query: String,
    language: Option<String>,
}

async fn search_handler(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<ApiResponse<Vec<Vocabulary>>>, StatusCode> {
    match state
        .db
        .search_vocabularies(&params.query, params.language.as_deref())
    {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("search_vocabularies failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/vocabularies/by-collection/:collection_id?limit=...
#[derive(Deserialize)]
struct ByCollectionQuery {
    limit: Option<i64>,
}

async fn by_collection_handler(
    State(state): State<AppState>,
    Path(collection_id): Path<String>,
    Query(query): Query<ByCollectionQuery>,
) -> Result<Json<ApiResponse<Vec<Vocabulary>>>, StatusCode> {
    match state
        .db
        .get_vocabularies_by_collection(&collection_id, query.limit)
    {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_vocabularies_by_collection failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// GET /api/vocabularies/by-collection/:collection_id/paginated?limit=...&offset=...
#[derive(Deserialize)]
struct PaginatedQuery {
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn by_collection_paginated_handler(
    State(state): State<AppState>,
    Path(collection_id): Path<String>,
    Query(query): Query<PaginatedQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<Vocabulary>>>, StatusCode> {
    match state.db.get_vocabularies_by_collection_paginated(
        &collection_id,
        query.limit,
        query.offset,
    ) {
        Ok(result) => Ok(Json(ApiResponse::success(result))),
        Err(e) => {
            eprintln!("get_vocabularies_by_collection_paginated failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create vocabulary routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", post(create_handler).get(get_all_handler))
        .route("/", axum::routing::put(update_handler))
        .route("/{id}", get(get_one_handler))
        .route("/{id}", axum::routing::delete(delete_one_handler))
        .route("/bulk-move", post(bulk_move_handler))
        .route("/search", get(search_handler))
        .route("/by-collection/{collection_id}", get(by_collection_handler))
        .route(
            "/by-collection/{collection_id}/paginated",
            get(by_collection_paginated_handler),
        )
}
