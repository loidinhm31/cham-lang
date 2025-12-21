/// Protocol types and data structures for mDNS sync communication

// Re-export protocol types from models
pub use crate::models::{
    HandshakeRequest,
    HandshakeResponse,
    SyncDirection,
};

/// Service type for mDNS discovery
pub const SERVICE_TYPE: &str = "_chamlang-sync._tcp.local.";

/// Version of the sync protocol
pub const PROTOCOL_VERSION: &str = "1.0";

/// Default chunk size for database transfer (1 MB)
pub const DEFAULT_CHUNK_SIZE: usize = 1024 * 1024;

/// Authentication token validity period (5 minutes)
pub const AUTH_TOKEN_VALIDITY_SECONDS: i64 = 300;

/// Pairing PIN timeout (2 minutes)
pub const PAIRING_PIN_TIMEOUT_SECONDS: i64 = 120;
