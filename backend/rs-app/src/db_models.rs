use chrono::{DateTime, Utc};
use sqlx::FromRow;
use serde::{Serialize, Deserialize}; // Keep serde if needed for API conversion

// Match the table columns from migrations/20231120000001_create_tables.sql

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)] // Add FromRow
pub struct DbItem {
    pub id: i64, // Changed from Integer to i64 for sqlx compatibility
    #[sqlx(rename = "itemId")]
    pub item_id: String,
    pub name: String,
    pub width: f64,
    pub depth: f64,
    pub height: f64,
    pub mass: Option<f64>,
    pub priority: i64, // Changed from Integer to i64
    #[sqlx(rename = "expiryDate")]
    pub expiry_date: Option<DateTime<Utc>>,
    #[sqlx(rename = "usageLimit")]
    pub usage_limit: Option<i64>, // Changed from Integer to i64
    #[sqlx(rename = "currentUses")]
    pub current_uses: i64, // Changed from Integer to i64
    #[sqlx(rename = "preferredZone")]
    pub preferred_zone: Option<String>,
    pub status: String, // Store status as uppercase string: "ACTIVE", "WASTE_EXPIRED", "WASTE_DEPLETED", "DISPOSED"
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct DbContainer {
    pub id: i64,
    #[sqlx(rename = "containerId")]
    pub container_id: String,
    pub zone: String,
    pub width: f64,
    pub depth: f64,
    pub height: f64,
    #[sqlx(rename = "isWasteContainer")]
    pub is_waste_container: Option<bool>,
    #[sqlx(rename = "maxWeightCapacity")]
    pub max_weight_capacity: Option<f64>,
}

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct DbPlacement {
    pub id: i64,
    #[sqlx(rename = "itemId_fk")]
    pub item_id_fk: String,
    #[sqlx(rename = "containerId_fk")]
    pub container_id_fk: String,
    pub start_w: f64,
    pub start_d: f64,
    pub start_h: f64,
    pub end_w: f64,
    pub end_d: f64,
    pub end_h: f64,
} 