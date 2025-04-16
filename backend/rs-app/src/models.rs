use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coordinates {
    pub width: f64,
    pub depth: f64,
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    #[serde(rename = "startCoordinates")]
    pub start_coordinates: Coordinates,
    #[serde(rename = "endCoordinates")]
    pub end_coordinates: Coordinates,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    #[serde(rename = "itemId")]
    pub item_id: String,
    pub name: String,
    pub width: f64,
    pub depth: f64,
    pub height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mass: Option<f64>,
    pub priority: i32,
    #[serde(rename = "expiryDate")]
    pub expiry_date: Option<DateTime<Utc>>,
    #[serde(rename = "usageLimit")]
    pub usage_limit: i32,
    #[serde(rename = "currentUses", default = "default_current_uses")]
    pub current_uses: i32,
    #[serde(rename = "preferredZone")]
    pub preferred_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ItemStatus>,
}

fn default_current_uses() -> i32 {
    0
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ItemStatus {
    ACTIVE,
    WASTE_EXPIRED,
    WASTE_DEPLETED,
    DISPOSED,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Container {
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub zone: String,
    pub width: f64,
    pub depth: f64,
    pub height: f64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub is_waste_container: Option<bool>,
    #[serde(rename = "maxWeightCapacity", skip_serializing_if = "Option::is_none")]
    pub max_weight_capacity: Option<f64>,
}

// --- Request Structs ---

#[derive(Debug, Serialize, Deserialize)]
pub struct PlacementRequest {
    pub items: Vec<Item>,
    pub containers: Vec<Container>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceRequest {
    #[serde(rename = "itemId")]
    pub item_id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub position: Position,
}


// --- Response Structs ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlacementResult {
    #[serde(rename = "itemId")]
    pub item_id: String,
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub position: Position,
    #[serde(skip_serializing)]
    pub retrieval_steps: i32,
    #[serde(skip_serializing)]
    pub is_preferred_zone: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RearrangementStep {
    pub step: i32,
    pub action: String,
    #[serde(rename = "itemId")]
    pub item_id: String,
    #[serde(rename = "fromContainer")]
    pub from_container: Option<String>,
    #[serde(rename = "toContainer")]
    pub to_container: Option<String>,
    #[serde(rename = "fromPosition")]
    pub from_position: Option<Position>,
    #[serde(rename = "toPosition")]
    pub to_position: Option<Position>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlacementResponse {
    pub success: bool,
    pub placements: Vec<PlacementResult>,
    pub rearrangements: Vec<RearrangementStep>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RetrievalRequest {
    #[serde(rename = "itemId")]
    pub item_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RetrievalResponse {
    pub success: bool,
    pub item: Option<Item>,
    #[serde(rename = "containerId")]
    pub container_id: Option<String>,
    pub position: Option<Position>,
    #[serde(rename = "stepsRequired")]
    pub steps_required: i32,
    #[serde(rename = "itemsToMove")]
    pub items_to_move: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WasteManagementResponse {
    #[serde(rename = "expiredItems")]
    pub expired_items: Vec<Item>,
    #[serde(rename = "fullyUsedItems")]
    pub fully_used_items: Vec<Item>,
    #[serde(rename = "suggestedWasteContainer")]
    pub suggested_waste_container: String,
    #[serde(rename = "totalWasteMass")]
    pub total_waste_mass: f64,
}

// Helper methods for item comparison
impl Item {
    pub fn is_waste(&self) -> bool {
        // Check if status is explicitly set to Waste
        if let Some(status) = &self.status {
            if *status == ItemStatus::WASTE_EXPIRED || *status == ItemStatus::WASTE_DEPLETED {
                return true;
            }
        }
        
        // Check expiry date
        if let Some(expiry) = self.expiry_date {
            if expiry < Utc::now() {
                return true;
            }
        }
        
        // Check usage limit
        self.current_uses >= self.usage_limit
    }

    pub fn compare_priority(&self, other: &Item) -> Ordering {
        other.priority.cmp(&self.priority)
            .then_with(|| {
                match (self.expiry_date, other.expiry_date) {
                    (Some(a), Some(b)) => a.cmp(&b),
                    (Some(_), None) => Ordering::Less,
                    (None, Some(_)) => Ordering::Greater,
                    (None, None) => Ordering::Equal,
                }
            })
    }
}

// Helper methods for position calculations
impl Position {
    #[allow(dead_code)]
    pub fn volume(&self) -> f64 {
        let width = self.end_coordinates.width - self.start_coordinates.width;
        let depth = self.end_coordinates.depth - self.start_coordinates.depth;
        let height = self.end_coordinates.height - self.start_coordinates.height;
        width * depth * height
    }

    pub fn overlaps(&self, other: &Position) -> bool {
        !(self.end_coordinates.width <= other.start_coordinates.width ||
          self.start_coordinates.width >= other.end_coordinates.width ||
          self.end_coordinates.depth <= other.start_coordinates.depth ||
          self.start_coordinates.depth >= other.end_coordinates.depth ||
          self.end_coordinates.height <= other.start_coordinates.height ||
          self.start_coordinates.height >= other.end_coordinates.height)
    }

    #[allow(dead_code)]
    pub fn is_accessible(&self, _container: &Container) -> bool {
        // Item is accessible if it's directly visible from the open face
        (self.start_coordinates.depth - 0.0).abs() < f64::EPSILON
    }
} 