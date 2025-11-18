use mongodb::{Client, Collection, Database};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::options::ClientOptions;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::models::{Vocabulary, UserPreferences, PracticeSession, UserPracticeProgress};

pub struct DatabaseManager {
    client: Arc<Mutex<Option<Client>>>,
    db_name: String,
}

impl DatabaseManager {
    pub fn new(db_name: String) -> Self {
        DatabaseManager {
            client: Arc::new(Mutex::new(None)),
            db_name,
        }
    }

    pub async fn connect(&self, connection_string: &str) -> Result<(), String> {
        let mut client_options = ClientOptions::parse(connection_string)
            .await
            .map_err(|e| format!("Failed to parse connection string: {}", e))?;

        client_options.app_name = Some("ChamLang".to_string());

        let client = Client::with_options(client_options)
            .map_err(|e| format!("Failed to create client: {}", e))?;

        // Test connection
        client
            .database("admin")
            .run_command(doc! {"ping": 1})
            .await
            .map_err(|e| format!("Failed to connect to MongoDB: {}", e))?;

        *self.client.lock().await = Some(client);
        Ok(())
    }

    pub async fn get_database(&self) -> Result<Database, String> {
        let client = self.client.lock().await;
        match &*client {
            Some(c) => Ok(c.database(&self.db_name)),
            None => Err("Database not connected".to_string()),
        }
    }

    pub async fn get_vocabulary_collection(&self) -> Result<Collection<Vocabulary>, String> {
        let db = self.get_database().await?;
        Ok(db.collection("vocabularies"))
    }

    pub async fn get_preferences_collection(&self) -> Result<Collection<UserPreferences>, String> {
        let db = self.get_database().await?;
        Ok(db.collection("user_preferences"))
    }

    pub async fn get_practice_sessions_collection(&self) -> Result<Collection<PracticeSession>, String> {
        let db = self.get_database().await?;
        Ok(db.collection("practice_sessions"))
    }

    pub async fn get_practice_progress_collection(&self) -> Result<Collection<UserPracticeProgress>, String> {
        let db = self.get_database().await?;
        Ok(db.collection("practice_progress"))
    }

    pub async fn disconnect(&self) -> Result<(), String> {
        *self.client.lock().await = None;
        Ok(())
    }

    pub async fn is_connected(&self) -> bool {
        self.client.lock().await.is_some()
    }
}

// Helper function to parse ObjectId from string
pub fn parse_object_id(id: &str) -> Result<ObjectId, String> {
    ObjectId::parse_str(id).map_err(|e| format!("Invalid ObjectId: {}", e))
}
