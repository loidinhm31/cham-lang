//! Session token management for secure browser sync.
//!
//! This module provides cryptographically secure session tokens
//! for authenticating browser requests to the embedded web server.

use rand::Rng;
use std::sync::{Arc, Mutex};

/// Session manager for handling secure tokens
pub struct SessionManager {
    /// Current active session token (if any)
    token: Mutex<Option<String>>,
}

impl SessionManager {
    /// Create a new session manager with no active token
    pub fn new() -> Self {
        Self {
            token: Mutex::new(None),
        }
    }

    /// Generate a new cryptographically random session token.
    /// Returns the generated token as a hex string.
    ///
    /// The token is 32 bytes (256 bits) of random data, encoded as 64 hex characters.
    pub fn generate_token(&self) -> String {
        let mut rng = rand::rng();
        let bytes: [u8; 32] = rng.random();
        let token = hex::encode(bytes);

        // Store the token
        let mut guard = self.token.lock().unwrap();
        *guard = Some(token.clone());

        println!("Generated new session token: {}...", &token[..8]);
        token
    }

    /// Validate a provided token against the stored session token.
    /// Returns true if the token matches.
    pub fn validate_token(&self, token: &str) -> bool {
        let guard = self.token.lock().unwrap();
        match &*guard {
            Some(stored) => {
                // Use constant-time comparison to prevent timing attacks
                constant_time_eq(stored.as_bytes(), token.as_bytes())
            }
            None => false,
        }
    }

    /// Clear the current session token.
    pub fn clear_token(&self) {
        let mut guard = self.token.lock().unwrap();
        *guard = None;
        println!("Session token cleared");
    }

    /// Check if there's an active session
    pub fn has_active_session(&self) -> bool {
        let guard = self.token.lock().unwrap();
        guard.is_some()
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Thread-safe reference to a session manager
pub type SharedSessionManager = Arc<SessionManager>;

/// Create a new shared session manager
pub fn create_session_manager() -> SharedSessionManager {
    Arc::new(SessionManager::new())
}

/// Constant-time comparison to prevent timing attacks
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_token() {
        let manager = SessionManager::new();
        let token = manager.generate_token();

        // Token should be 64 hex characters (32 bytes)
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_validate_token() {
        let manager = SessionManager::new();
        let token = manager.generate_token();

        assert!(manager.validate_token(&token));
        assert!(!manager.validate_token("invalid_token"));
    }

    #[test]
    fn test_clear_token() {
        let manager = SessionManager::new();
        let token = manager.generate_token();

        assert!(manager.validate_token(&token));
        manager.clear_token();
        assert!(!manager.validate_token(&token));
    }

    #[test]
    fn test_has_active_session() {
        let manager = SessionManager::new();

        assert!(!manager.has_active_session());
        manager.generate_token();
        assert!(manager.has_active_session());
        manager.clear_token();
        assert!(!manager.has_active_session());
    }
}
