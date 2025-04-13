use crate::models::*;
use anyhow::Result;
use std::collections::HashMap;
use log::{info, debug};

pub struct PlacementService {
    placement_cache: HashMap<String, Vec<PlacementResult>>,
}

impl PlacementService {
    pub fn new() -> Self {
        PlacementService {
            placement_cache: HashMap::new(),
        }
    }

    pub async fn optimize_placement(&self, items: Vec<Item>, containers: Vec<Container>) -> Result<PlacementResponse> {
        info!("Optimizing placement for {} items in {} containers", items.len(), containers.len());
        
        let mut response = PlacementResponse {
            success: true,
            placements: Vec::new(),
            rearrangements: Vec::new(),
            error: None,
        };

        // Sort items by priority and expiry date
        let mut sorted_items = items;
        sorted_items.sort_by(|a, b| a.compare_priority(b));

        // Group containers by zone for efficient lookup
        let mut zone_containers: HashMap<String, Vec<&Container>> = HashMap::new();
        for container in &containers {
            zone_containers
                .entry(container.zone.clone())
                .or_default()
                .push(container);
        }

        // Track used spaces in containers
        let mut container_spaces: HashMap<String, Vec<(String, Position)>> = HashMap::new();
        
        // Process each item
        for item in sorted_items {
            if let Some(status) = &item.status {
                if status == &ItemStatus::Waste {
                    continue; // Skip waste items
                }
            }

            let placement = self.find_optimal_placement(&item, &zone_containers, &container_spaces)?;
            
            match placement {
                Some(placement_result) => {
                    // Update used spaces
                    container_spaces
                        .entry(placement_result.container_id.clone())
                        .or_default()
                        .push((item.item_id.clone(), placement_result.position.clone()));
                    
                    response.placements.push(placement_result);
                }
                None => {
                    // Try rearrangement if direct placement fails
                    debug!("Direct placement failed for item {}, trying rearrangement", item.item_id);
                    match self.try_rearrangement(&item, &zone_containers, &mut container_spaces)? {
                        Some((steps, final_placement)) => {
                            debug!("Successfully found rearrangement for item {}", item.item_id);
                            response.rearrangements.extend(steps);
                            response.placements.push(final_placement);
                        }
                        None => {
                            response.success = false;
                            response.error = Some(format!("Unable to place item {}: no suitable space found", item.item_id));
                            break;
                        }
                    }
                }
            }
        }

        Ok(response)
    }

    fn find_optimal_placement(
        &self,
        item: &Item,
        zone_containers: &HashMap<String, Vec<&Container>>,
        container_spaces: &HashMap<String, Vec<(String, Position)>>,
    ) -> Result<Option<PlacementResult>> {
        debug!("Finding optimal placement for item {}", item.item_id);
        
        // First try preferred zone
        if let Some(containers) = zone_containers.get(&item.preferred_zone) {
            for container in containers {
                if let Some(result) = self.try_container_placement(item, container, container_spaces, true)? {
                    return Ok(Some(result));
                }
            }
        }

        // If preferred zone doesn't work, try other zones
        for (zone, containers) in zone_containers {
            if zone != &item.preferred_zone {
                for container in containers {
                    if let Some(result) = self.try_container_placement(item, container, container_spaces, false)? {
                        return Ok(Some(result));
                    }
                }
            }
        }

        Ok(None)
    }

    fn try_container_placement(
        &self,
        item: &Item,
        container: &Container,
        container_spaces: &HashMap<String, Vec<(String, Position)>>,
        is_preferred_zone: bool,
    ) -> Result<Option<PlacementResult>> {
        // Get possible orientations
        let orientations = self.get_possible_orientations(item, container);
        
        for (width, depth, height) in orientations {
            // Try to find a valid position for this orientation
            if let Some((position, steps)) = self.find_position(
                width, depth, height,
                container,
                container_spaces.get(&container.container_id).unwrap_or(&Vec::new()),
            )? {
                return Ok(Some(PlacementResult {
                    item_id: item.item_id.clone(),
                    container_id: container.container_id.clone(),
                    position,
                    retrieval_steps: steps,
                    is_preferred_zone,
                }));
            }
        }
        
        Ok(None)
    }

    fn get_possible_orientations(&self, item: &Item, container: &Container) -> Vec<(f64, f64, f64)> {
        let mut orientations = vec![];
        let dims = [
            (item.width, item.depth, item.height),
            (item.width, item.height, item.depth),
            (item.depth, item.width, item.height),
            (item.depth, item.height, item.width),
            (item.height, item.width, item.depth),
            (item.height, item.depth, item.width),
        ];

        for &(w, d, h) in &dims {
            if w <= container.width && d <= container.depth && h <= container.height {
                orientations.push((w, d, h));
            }
        }

        orientations
    }

    fn find_position(
        &self,
        width: f64,
        depth: f64,
        height: f64,
        container: &Container,
        existing_items: &[(String, Position)],
    ) -> Result<Option<(Position, i32)>> {
        let mut best_position = None;
        let mut min_steps = i32::MAX;

        // Try positions using Extreme Point-Based Best Fit (EPBF) approach
        let extreme_points = self.calculate_extreme_points(container, existing_items);
        
        for ep in extreme_points {
            let x = ep.0;
            let z = ep.1;
            let y = ep.2;
            
            if x + width <= container.width && 
               z + depth <= container.depth && 
               y + height <= container.height {
                
                let position = Position {
                    start_coordinates: Coordinates {
                        width: x,
                        depth: z,
                        height: y,
                    },
                    end_coordinates: Coordinates {
                        width: x + width,
                        depth: z + depth,
                        height: y + height,
                    },
                };

                // Check if position is valid
                if self.is_valid_position(&position, existing_items) {
                    // Calculate retrieval steps
                    let steps = self.calculate_retrieval_steps(&position, existing_items);
                    
                    // Update if this is the best position so far
                    // Prefer positions with fewer steps and closer to the front
                    if steps < min_steps || (steps == min_steps && z < position.start_coordinates.depth) {
                        min_steps = steps;
                        best_position = Some(position);
                    }
                }
            }
        }

        // If no valid extreme point was found, try a simple 3D grid search as fallback
        if best_position.is_none() {
            // Try positions starting from the front (depth = 0) with a grid step
            let grid_step = 0.1; // Define a suitable grid step for your application
            
            for z in (0..=(container.depth as i32 - depth as i32)).map(|i| i as f64 * grid_step) {
                if z + depth > container.depth { continue; }
                
                for x in (0..=(container.width as i32 - width as i32)).map(|i| i as f64 * grid_step) {
                    if x + width > container.width { continue; }
                    
                    for y in (0..=(container.height as i32 - height as i32)).map(|i| i as f64 * grid_step) {
                        if y + height > container.height { continue; }
                        
                        let position = Position {
                            start_coordinates: Coordinates {
                                width: x,
                                depth: z,
                                height: y,
                            },
                            end_coordinates: Coordinates {
                                width: x + width,
                                depth: z + depth,
                                height: y + height,
                            },
                        };

                        // Check if position is valid
                        if self.is_valid_position(&position, existing_items) {
                            // Calculate retrieval steps
                            let steps = self.calculate_retrieval_steps(&position, existing_items);
                            
                            // Update if this is the best position so far
                            if steps < min_steps || (steps == min_steps && z < position.start_coordinates.depth) {
                                min_steps = steps;
                                best_position = Some(position);
                            }
                        }
                    }
                }
            }
        }

        Ok(best_position.map(|pos| (pos, min_steps)))
    }

    fn calculate_extreme_points(
        &self, 
        container: &Container,
        existing_items: &[(String, Position)]
    ) -> Vec<(f64, f64, f64)> {
        let mut extreme_points = vec![
            (0.0, 0.0, 0.0), // Start with the bottom-front-left corner
        ];

        // For each existing item, generate new extreme points
        for (_, pos) in existing_items {
            // Add 3 extreme points for each item:
            // - Top face
            extreme_points.push((
                pos.start_coordinates.width,
                pos.start_coordinates.depth,
                pos.end_coordinates.height
            ));
            
            // - Right face
            extreme_points.push((
                pos.end_coordinates.width,
                pos.start_coordinates.depth,
                pos.start_coordinates.height
            ));
            
            // - Front face
            extreme_points.push((
                pos.start_coordinates.width,
                pos.end_coordinates.depth,
                pos.start_coordinates.height
            ));
        }

        // Remove any points that are inside existing items
        extreme_points.retain(|&(x, z, y)| {
            for (_, pos) in existing_items {
                if x >= pos.start_coordinates.width && x < pos.end_coordinates.width &&
                   z >= pos.start_coordinates.depth && z < pos.end_coordinates.depth &&
                   y >= pos.start_coordinates.height && y < pos.end_coordinates.height {
                    return false;
                }
            }
            return true;
        });

        // Filter points that are outside the container
        extreme_points.retain(|&(x, z, y)| {
            x >= 0.0 && x <= container.width &&
            z >= 0.0 && z <= container.depth &&
            y >= 0.0 && y <= container.height
        });

        // Sort extreme points to prefer front positions first (z coordinate smallest)
        extreme_points.sort_by(|a, b| {
            a.1.partial_cmp(&b.1).unwrap()
                .then(a.2.partial_cmp(&b.2).unwrap())
                .then(a.0.partial_cmp(&b.0).unwrap())
        });

        extreme_points
    }

    fn is_valid_position(&self, position: &Position, existing_items: &[(String, Position)]) -> bool {
        // Check for overlaps with existing items
        for (_, existing_pos) in existing_items {
            if position.overlaps(existing_pos) {
                return false;
            }
        }
        true
    }

    fn calculate_retrieval_steps(&self, position: &Position, existing_items: &[(String, Position)]) -> i32 {
        let mut steps = 0;
        
        // If item is at the front (depth = 0), it's directly accessible
        if (position.start_coordinates.depth - 0.0).abs() < f64::EPSILON {
            return 0;
        }

        // Count items that need to be moved
        for (_, other_pos) in existing_items {
            if other_pos.start_coordinates.depth < position.start_coordinates.depth &&
               self.blocks_retrieval(other_pos, position) {
                steps += 1;
            }
        }

        steps
    }

    fn blocks_retrieval(&self, blocking_pos: &Position, target_pos: &Position) -> bool {
        // Check if the blocking item overlaps with the retrieval path
        !(blocking_pos.end_coordinates.width <= target_pos.start_coordinates.width ||
          blocking_pos.start_coordinates.width >= target_pos.end_coordinates.width ||
          blocking_pos.end_coordinates.height <= target_pos.start_coordinates.height ||
          blocking_pos.start_coordinates.height >= target_pos.end_coordinates.height)
    }

    fn try_rearrangement(
        &self,
        item: &Item,
        zone_containers: &HashMap<String, Vec<&Container>>,
        container_spaces: &mut HashMap<String, Vec<(String, Position)>>,
    ) -> Result<Option<(Vec<RearrangementStep>, PlacementResult)>> {
        debug!("Attempting rearrangement to place item {}", item.item_id);
        let mut rearrangement_steps: Vec<RearrangementStep> = Vec::new();
        let mut step_counter = 1;

        // Create a copy of container spaces for simulation
        let mut temp_spaces = container_spaces.clone();

        // Try to find items that can be moved to make space
        if let Some(containers) = zone_containers.get(&item.preferred_zone) {
            for container in containers {
                let current_items = temp_spaces.get(&container.container_id).cloned().unwrap_or_default();
                
                // Sort items by priority (lowest first) and accessibility (most accessible first)
                let mut movable_items: Vec<_> = current_items.iter().collect();
                movable_items.sort_by(|a, b| {
                    let a_steps = self.calculate_retrieval_steps(&a.1, &current_items);
                    let b_steps = self.calculate_retrieval_steps(&b.1, &current_items);
                    a_steps.cmp(&b_steps)
                });

                // Try moving each item
                for (item_id, current_pos) in &movable_items {
                    // Remove item temporarily
                    temp_spaces.get_mut(&container.container_id).unwrap()
                        .retain(|(id, _)| id != item_id);

                    // Try to place our target item
                    if let Some(result) = self.try_container_placement(
                        item,
                        container,
                        &temp_spaces,
                        true,
                    )? {
                        // Find new place for moved item
                        if let Some((new_container, new_pos)) = self.find_alternative_placement(
                            item_id,
                            current_pos,
                            zone_containers,
                            &temp_spaces,
                        )? {
                            // Record the move
                            rearrangement_steps.push(RearrangementStep {
                                step: step_counter,
                                action: "move".to_string(),
                                item_id: item_id.clone(),
                                from_container: Some(container.container_id.clone()),
                                to_container: Some(new_container.clone()),
                                from_position: Some(current_pos.clone()),
                                to_position: Some(new_pos.clone()),
                            });
                            step_counter += 1;

                            // Update simulation state
                            temp_spaces.entry(new_container)
                                .or_default()
                                .push((item_id.clone(), new_pos));

                            // Place target item
                            temp_spaces.entry(container.container_id.clone())
                                .or_default()
                                .push((item.item_id.clone(), result.position.clone()));

                            // Record the placement
                            rearrangement_steps.push(RearrangementStep {
                                step: step_counter,
                                action: "place".to_string(),
                                item_id: item.item_id.clone(),
                                from_container: None,
                                to_container: Some(container.container_id.clone()),
                                from_position: None,
                                to_position: Some(result.position.clone()),
                            });

                            // Update actual state
                            *container_spaces = temp_spaces;

                            return Ok(Some((rearrangement_steps, result)));
                        }
                    }

                    // Restore item if move didn't work
                    temp_spaces.entry(container.container_id.clone())
                        .or_default()
                        .push((item_id.clone(), current_pos.clone()));
                }
            }
        }

        // Try more complex rearrangements with multiple items if simple ones didn't work
        if let Some(result) = self.try_complex_rearrangement(item, zone_containers, container_spaces)? {
            return Ok(Some(result));
        }

        Ok(None)
    }

    fn try_complex_rearrangement(
        &self,
        item: &Item,
        zone_containers: &HashMap<String, Vec<&Container>>,
        container_spaces: &mut HashMap<String, Vec<(String, Position)>>,
    ) -> Result<Option<(Vec<RearrangementStep>, PlacementResult)>> {
        debug!("Attempting complex rearrangement for item {}", item.item_id);
        let mut rearrangement_steps: Vec<RearrangementStep> = Vec::new();
        let mut step_counter = 1;

        // Create a copy of container spaces for simulation
        let mut temp_spaces = container_spaces.clone();

        // Try to rearrange items between containers to make space
        if let Some(preferred_containers) = zone_containers.get(&item.preferred_zone) {
            for target_container in preferred_containers {
                // Identify low-priority items that could be moved from this container
                let current_items = temp_spaces.get(&target_container.container_id).cloned().unwrap_or_default();
                if current_items.is_empty() {
                    continue;
                }

                // Try different combinations of items to move (up to 2 items for simplicity)
                let mut items_to_try: Vec<_> = current_items.iter().collect();
                items_to_try.sort_by(|a, b| {
                    let a_steps = self.calculate_retrieval_steps(&a.1, &current_items);
                    let b_steps = self.calculate_retrieval_steps(&b.1, &current_items);
                    a_steps.cmp(&b_steps)
                });

                // Try moving single items first
                for (item1_id, item1_pos) in &items_to_try {
                    // Remove item temporarily
                    temp_spaces.get_mut(&target_container.container_id).unwrap()
                        .retain(|(id, _)| id != item1_id);

                    // Try to place our target item
                    if let Some(result) = self.try_container_placement(
                        item,
                        target_container,
                        &temp_spaces,
                        true,
                    )? {
                        // Find new place for moved item
                        if let Some((new_container1, new_pos1)) = self.find_alternative_placement(
                            item1_id,
                            item1_pos,
                            zone_containers,
                            &temp_spaces,
                        )? {
                            // Record the first move
                            rearrangement_steps.push(RearrangementStep {
                                step: step_counter,
                                action: "move".to_string(),
                                item_id: item1_id.clone(),
                                from_container: Some(target_container.container_id.clone()),
                                to_container: Some(new_container1.clone()),
                                from_position: Some(item1_pos.clone()),
                                to_position: Some(new_pos1.clone()),
                            });
                            step_counter += 1;

                            // Update simulation state
                            temp_spaces.entry(new_container1)
                                .or_default()
                                .push((item1_id.clone(), new_pos1));

                            // Place target item
                            temp_spaces.entry(target_container.container_id.clone())
                                .or_default()
                                .push((item.item_id.clone(), result.position.clone()));

                            // Record the placement
                            rearrangement_steps.push(RearrangementStep {
                                step: step_counter,
                                action: "place".to_string(),
                                item_id: item.item_id.clone(),
                                from_container: None,
                                to_container: Some(target_container.container_id.clone()),
                                from_position: None,
                                to_position: Some(result.position.clone()),
                            });

                            // Update actual state
                            *container_spaces = temp_spaces;

                            return Ok(Some((rearrangement_steps, result)));
                        }
                    }

                    // Reset for next iteration
                    temp_spaces.entry(target_container.container_id.clone())
                        .or_default()
                        .push((item1_id.clone(), item1_pos.clone()));
                }

                // Try moving pairs of items if single item moves didn't work
                for i in 0..items_to_try.len() {
                    for j in i+1..items_to_try.len() {
                        let (item1_id, item1_pos) = items_to_try[i];
                        let (item2_id, item2_pos) = items_to_try[j];

                        // Remove both items temporarily
                        temp_spaces.get_mut(&target_container.container_id).unwrap()
                            .retain(|(id, _)| id != item1_id && id != item2_id);

                        // Try to place our target item
                        if let Some(result) = self.try_container_placement(
                            item,
                            target_container,
                            &temp_spaces,
                            true,
                        )? {
                            // Find new places for moved items
                            if let Some((new_container1, new_pos1)) = self.find_alternative_placement(
                                item1_id,
                                item1_pos,
                                zone_containers,
                                &temp_spaces,
                            )? {
                                // Update simulation state for first item
                                temp_spaces.entry(new_container1.clone())
                                    .or_default()
                                    .push((item1_id.clone(), new_pos1.clone()));

                                if let Some((new_container2, new_pos2)) = self.find_alternative_placement(
                                    item2_id,
                                    item2_pos,
                                    zone_containers,
                                    &temp_spaces,
                                )? {
                                    // Record the moves
                                    rearrangement_steps.push(RearrangementStep {
                                        step: step_counter,
                                        action: "move".to_string(),
                                        item_id: item1_id.clone(),
                                        from_container: Some(target_container.container_id.clone()),
                                        to_container: Some(new_container1.clone()),
                                        from_position: Some(item1_pos.clone()),
                                        to_position: Some(new_pos1.clone()),
                                    });
                                    step_counter += 1;

                                    rearrangement_steps.push(RearrangementStep {
                                        step: step_counter,
                                        action: "move".to_string(),
                                        item_id: item2_id.clone(),
                                        from_container: Some(target_container.container_id.clone()),
                                        to_container: Some(new_container2.clone()),
                                        from_position: Some(item2_pos.clone()),
                                        to_position: Some(new_pos2.clone()),
                                    });
                                    step_counter += 1;

                                    // Update simulation state for second item
                                    temp_spaces.entry(new_container2)
                                        .or_default()
                                        .push((item2_id.clone(), new_pos2));

                                    // Place target item
                                    temp_spaces.entry(target_container.container_id.clone())
                                        .or_default()
                                        .push((item.item_id.clone(), result.position.clone()));

                                    // Record the placement
                                    rearrangement_steps.push(RearrangementStep {
                                        step: step_counter,
                                        action: "place".to_string(),
                                        item_id: item.item_id.clone(),
                                        from_container: None,
                                        to_container: Some(target_container.container_id.clone()),
                                        from_position: None,
                                        to_position: Some(result.position.clone()),
                                    });

                                    // Update actual state
                                    *container_spaces = temp_spaces;

                                    return Ok(Some((rearrangement_steps, result)));
                                } else {
                                    // Remove first item if second placement failed
                                    temp_spaces.get_mut(&new_container1).unwrap()
                                        .retain(|(id, _)| id != item1_id);
                                }
                            }
                        }

                        // Reset for next iteration
                        temp_spaces.entry(target_container.container_id.clone())
                            .or_default()
                            .push((item1_id.clone(), item1_pos.clone()));
                        temp_spaces.entry(target_container.container_id.clone())
                            .or_default()
                            .push((item2_id.clone(), item2_pos.clone()));
                    }
                }
            }
        }

        Ok(None)
    }

    fn find_alternative_placement(
        &self,
        _item_id: &str,  // Prefix with underscore since it's not used
        current_pos: &Position,
        zone_containers: &HashMap<String, Vec<&Container>>,
        temp_spaces: &HashMap<String, Vec<(String, Position)>>,
    ) -> Result<Option<(String, Position)>> {
        let item_width = current_pos.end_coordinates.width - current_pos.start_coordinates.width;
        let item_depth = current_pos.end_coordinates.depth - current_pos.start_coordinates.depth;
        let item_height = current_pos.end_coordinates.height - current_pos.start_coordinates.height;

        // Try all containers except the current one
        for containers in zone_containers.values() {
            for container in containers {
                if let Some((position, _)) = self.find_position(
                    item_width,
                    item_depth,
                    item_height,
                    container,
                    temp_spaces.get(&container.container_id).unwrap_or(&Vec::new()),
                )? {
                    return Ok(Some((container.container_id.clone(), position)));
                }
            }
        }
        Ok(None)
    }
} 