use actix_web::{web, HttpResponse, Result, http::StatusCode};
use crate::models::*;
use crate::db_models::{DbItem, DbPlacement}; // Remove DbContainer
// Remove PlacementService import
use log::{info, warn, error, debug};
use serde_json::json;
use sqlx::SqlitePool; // Remove Row, Transaction, Sqlite
use std::collections::{HashMap, HashSet};
// Remove anyhow::anyhow import


// ==============================================================================
// == Helper Functions (Moved from PlacementService or adapted from Python) =====
// ==============================================================================

fn boxes_overlap(
    start1: &Coordinates, end1: &Coordinates, start2: &Coordinates, end2: &Coordinates
) -> bool {
    let tol = 1e-6; // Tolerance
    let no_overlap_w = end1.width <= start2.width + tol || end2.width <= start1.width + tol;
    let no_overlap_d = end1.depth <= start2.depth + tol || end2.depth <= start1.depth + tol;
    let no_overlap_h = end1.height <= start2.height + tol || end2.height <= start1.height + tol;
    ! (no_overlap_w || no_overlap_d || no_overlap_h)
}

// Find spot function adapted for Rust, using API models for simulation
fn find_spot_in_container(
    item_dims: (f64, f64, f64),    // Width, Depth, Height of the item being placed
    container: &Container,         // Container dimensions (API model)
    current_placements_in_container: &[(String, Position)], // Current simulation state (itemId, Position)
    is_high_priority: bool
) -> Option<(Position, (f64, f64, f64))> { // Returns (Position, orientation_used)

    let item_w = item_dims.0;
    let item_d = item_dims.1;
    let item_h = item_dims.2;

    let orientations = [
        (item_w, item_d, item_h), (item_w, item_h, item_d),
        (item_d, item_w, item_h), (item_d, item_h, item_w),
        (item_h, item_w, item_d), (item_h, item_d, item_w),
    ];
    let precision = 3; // Decimal places

    for (w, d, h) in orientations {
        if w > container.width + 1e-6 || d > container.depth + 1e-6 || h > container.height + 1e-6 {
            continue;
        }

        // Simplified grid search strategy
        let width_increment = (container.width / 10.0).max(0.01);
        let depth_increment = (container.depth / 10.0).max(0.01);
        let height_increment = (container.height / 10.0).max(0.01);

        let mut search_depths: Vec<f64> = (0..=( (container.depth / depth_increment).floor() as i32 + 1))
                                            .map(|i| (i as f64 * depth_increment).min(container.depth - d).max(0.0))
                                            .collect();
        search_depths.dedup_by(|a, b| ((*a) - (*b)).abs() < 1e-9); // Fix by dereferencing
        if !is_high_priority { search_depths.reverse(); } // Low prio tries deep spots first


        let mut possible_base_heights = vec![0.0];
        possible_base_heights.extend(current_placements_in_container.iter().map(|(_, p)| p.end_coordinates.height));
        possible_base_heights.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        possible_base_heights.dedup_by(|a, b| ((*a) - (*b)).abs() < 1e-9); // Fix by dereferencing


        for start_h_base in possible_base_heights {
            let start_h = start_h_base; // Precision applied later if needed
            if start_h + h > container.height + 1e-6 { continue; }

            for start_d in &search_depths {
                let start_d = *start_d;
                if start_d + d > container.depth + 1e-6 { continue; }

                 let mut search_widths: Vec<f64> = (0..=( (container.width / width_increment).floor() as i32 + 1))
                                            .map(|i| (i as f64 * width_increment).min(container.width - w).max(0.0))
                                            .collect();
                search_widths.dedup_by(|a, b| ((*a) - (*b)).abs() < 1e-9); // Fix by dereferencing

                for start_w in search_widths {
                     if start_w + w > container.width + 1e-6 { continue; }

                    let start_coords = Coordinates { width: start_w, depth: start_d, height: start_h };
                    let end_coords = Coordinates {
                        width: start_w + w,
                        depth: start_d + d,
                        height: start_h + h,
                    };
                    let candidate_position = Position { start_coordinates: start_coords.clone(), end_coordinates: end_coords.clone() };

                    // 1. Boundary Check (redundant if start calc is correct, but good safety)
                     if end_coords.width > container.width + 1e-6 || end_coords.depth > container.depth + 1e-6 || end_coords.height > container.height + 1e-6 {
                         continue;
                     }

                    // 2. Overlap Check
                    let mut overlaps = false;
                    for (_, existing_pos) in current_placements_in_container {
                        if boxes_overlap(&start_coords, &end_coords, &existing_pos.start_coordinates, &existing_pos.end_coordinates) {
                            overlaps = true;
                            break;
                        }
                    }
                    if overlaps { continue; }

                    // 3. Stability Check (Simplified)
                    let is_on_floor = start_h.abs() < 1e-6;
                    let mut is_supported = false;
                    if !is_on_floor {
                        for (_, p_pos) in current_placements_in_container {
                            if (p_pos.end_coordinates.height - start_h).abs() < 1e-6 { // Is this item below?
                                // Check horizontal overlap
                                let base_start_w = start_w; let base_end_w = end_coords.width;
                                let base_start_d = start_d; let base_end_d = end_coords.depth;
                                let support_start_w = p_pos.start_coordinates.width; let support_end_w = p_pos.end_coordinates.width;
                                let support_start_d = p_pos.start_coordinates.depth; let support_end_d = p_pos.end_coordinates.depth;
                                if !(base_end_w <= support_start_w + 1e-6 || support_end_w <= base_start_w + 1e-6 ||
                                     base_end_d <= support_start_d + 1e-6 || support_end_d <= base_start_d + 1e-6) {
                                    is_supported = true;
                                    break;
                                }
                            }
                        }
                    }
                     if !is_on_floor && !is_supported { continue; } // Skip floating positions

                    // All checks passed
                    return Some((candidate_position, (w, d, h)));
                }
            }
        }
    }
    None // No spot found
}


// ==============================================================================
// == Main Placement Handler ====================================================
// ==============================================================================

pub async fn optimize_placement(
    req: web::Json<PlacementRequest>,
    db_pool: web::Data<SqlitePool>, // Use DB pool from app state
) -> Result<HttpResponse> {
    info!("Received placement request for {} items", req.items.len());

    // --- Phase 0: Data Loading & Initial Setup ---
    let mut tx = match db_pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            error!("Failed to begin database transaction: {}", e);
            return Ok(HttpResponse::InternalServerError().json(PlacementResponse::error(e.to_string())));
        }
    };

    let req_container_ids: Vec<String> = req.containers.iter().map(|c| c.container_id.clone()).collect();
    let req_item_ids: HashSet<String> = req.items.iter().map(|i| i.item_id.clone()).collect();
    let all_container_ids_map: HashMap<String, Container> = req.containers.iter().cloned().map(|c| (c.container_id.clone(), c)).collect();


    // Load existing placements for relevant containers from DB
    let mut existing_placements_db: Vec<DbPlacement> = Vec::new();
    
    for container_id in &req_container_ids {
        match sqlx::query_as::<_, DbPlacement>(
            r#"SELECT * FROM placements WHERE "containerId_fk" = ?"#
        )
        .bind(container_id)
        .fetch_all(&mut *tx)
        .await
        {
            Ok(placements) => existing_placements_db.extend(placements),
            Err(e) => {
                error!("Failed to fetch existing placements for container {}: {}", container_id, e);
                // Continue rather than failing completely - container might not exist yet
            }
        }
    }


    // Build initial simulation state & check for duplicates in request vs DB
    // sim_placements: HashMap<ContainerId, Vec<(ItemId, Position)>>
    let mut sim_placements: HashMap<String, Vec<(String, Position)>> = HashMap::new();
    // final_placements_for_response: HashMap<ItemId, PlacementResult> // Stores final intended state
    let mut final_placements_for_response: HashMap<String, PlacementResult> = HashMap::new();
    let mut existing_item_ids_in_db: HashSet<String> = HashSet::new();

    for p_db in &existing_placements_db {
        // ** DUPLICATE CHECK **
        if req_item_ids.contains(&p_db.item_id_fk) {
            let err_msg = format!("Item '{}' is already placed in the database.", p_db.item_id_fk);
            error!("{}", err_msg);
            tx.rollback().await.ok();
            return Ok(HttpResponse::Conflict().json(PlacementResponse::error(err_msg)));
        }
        existing_item_ids_in_db.insert(p_db.item_id_fk.clone());
        let position = Position {
            start_coordinates: Coordinates { width: p_db.start_w, depth: p_db.start_d, height: p_db.start_h },
            end_coordinates: Coordinates { width: p_db.end_w, depth: p_db.end_d, height: p_db.end_h },
        };
        sim_placements.entry(p_db.container_id_fk.clone()).or_default().push((p_db.item_id_fk.clone(), position.clone()));
        // Pre-populate final response with existing state (will be updated if item moves)
        final_placements_for_response.insert(p_db.item_id_fk.clone(), PlacementResult {
            item_id: p_db.item_id_fk.clone(),
            container_id: p_db.container_id_fk.clone(),
            position,
            retrieval_steps: 0, // Not used in response, placeholder
            is_preferred_zone: false, // Placeholder
        });
    }

     // Load properties of existing items from DB
    let mut existing_items_props_db: Vec<DbItem> = Vec::new();
    if !existing_item_ids_in_db.is_empty() {
        for item_id in &existing_item_ids_in_db {
            match sqlx::query_as::<_, DbItem>(
                r#"SELECT * FROM items WHERE "itemId" = ?"#
            )
            .bind(item_id)
            .fetch_optional(&mut *tx)
            .await {
                Ok(Some(item)) => existing_items_props_db.push(item),
                Ok(None) => warn!("Item {} referenced in placement but not found in items table", item_id),
                Err(e) => {
                    error!("Failed to fetch existing item properties for {}: {}", item_id, e);
                    // Continue rather than failing
                }
            }
        }
    }

    // Combine item properties (priority, dimensions) for simulation lookup
    // HashMap<ItemId, (Priority, Width, Depth, Height)>
    let mut all_item_props: HashMap<String, (i32, f64, f64, f64)> = HashMap::new();
    for db_item in existing_items_props_db {
        all_item_props.insert(db_item.item_id, (db_item.priority as i32, db_item.width, db_item.depth, db_item.height));
    }
    for req_item in &req.items {
        // Use request data for incoming items (overwrites if ID somehow existed but wasn't placed)
        all_item_props.insert(req_item.item_id.clone(), (req_item.priority, req_item.width, req_item.depth, req_item.height));
    }


    // --- Simulation Phases ---
    let mut rearrangements_result: Vec<RearrangementStep> = Vec::new();
    let mut processed_item_ids_in_request: HashSet<String> = HashSet::new();
    let mut items_failed_completely: Vec<String> = Vec::new();
    let mut sorted_incoming_items = req.items.clone(); // Clone request items for processing
    sorted_incoming_items.sort_by(|a, b| b.priority.cmp(&a.priority)); // Descending priority

    // --- Phase 1: Initial Placement Attempt (Preferred Zones First) ---
    debug!("--- Phase 1: Attempting Preferred Zone Placements ---");
    let mut items_requiring_placement_pass_2: Vec<Item> = Vec::new(); // Items for next phase

    for item_req in &sorted_incoming_items {
        if processed_item_ids_in_request.contains(&item_req.item_id) { continue; } // Already handled?

        debug!("Processing item: {} (Prio: {}, PrefZone: {})", item_req.item_id, item_req.priority, item_req.preferred_zone);
        let mut placed = false;
        let is_high_prio = item_req.priority >= 50; // Example threshold

        let preferred_container_ids: Vec<&String> = all_container_ids_map.keys()
            .filter(|cid| all_container_ids_map[*cid].zone == item_req.preferred_zone)
            .collect();

        if !preferred_container_ids.is_empty() {
            for container_id in preferred_container_ids {
                let container = &all_container_ids_map[container_id];
                let current_sim_placements_in_cont = sim_placements.get(container_id).map_or(vec![], |v| v.clone()); // Clone for find_spot

                if let Some((position, _orientation)) = find_spot_in_container(
                    (item_req.width, item_req.depth, item_req.height),
                    container,
                    &current_sim_placements_in_cont,
                    is_high_prio
                ) {
                    // Update Simulation State
                    sim_placements.entry(container_id.clone()).or_default().push((item_req.item_id.clone(), position.clone()));
                    // Update final results
                    final_placements_for_response.insert(item_req.item_id.clone(), PlacementResult {
                        item_id: item_req.item_id.clone(), container_id: container_id.clone(), position,
                        retrieval_steps: 0, is_preferred_zone: true
                    });
                    processed_item_ids_in_request.insert(item_req.item_id.clone());
                    debug!("    SUCCESS (Phase 1): Placed {} in preferred {}", item_req.item_id, container_id);
                    placed = true;
                    break;
                }
            }
        }

        if !placed {
            debug!("    INFO (Phase 1): Could not place {} in preferred zone.", item_req.item_id);
            items_requiring_placement_pass_2.push(item_req.clone());
        }
    }


    // --- Phase 2: Rearrangement Simulation ---
    debug!("--- Phase 2: Evaluating Rearrangements ---");
    let mut items_requiring_placement_pass_3 = items_requiring_placement_pass_2; // Start with items needing placement
    let mut rearrangement_step_counter = 0;
    let mut made_rearrangement_in_iteration = true; // Loop control

    while made_rearrangement_in_iteration {
        made_rearrangement_in_iteration = false;
        let mut items_still_needing_placement_after_iter: Vec<Item> = Vec::new();

        // Evaluate highest priority items first
        items_requiring_placement_pass_3.sort_by(|a, b| b.priority.cmp(&a.priority));

        for high_prio_item in &items_requiring_placement_pass_3 {
            if processed_item_ids_in_request.contains(&high_prio_item.item_id) { continue; }

            debug!("Reviewing rearrangement for: {} (Prio: {})", high_prio_item.item_id, high_prio_item.priority);
            let mut rearrangement_successful_for_this_item = false;

            let preferred_container_ids: Vec<&String> = all_container_ids_map.keys()
                .filter(|cid| all_container_ids_map[*cid].zone == high_prio_item.preferred_zone)
                .collect();

             if preferred_container_ids.is_empty() {
                 debug!("    No preferred zone for {}. Moving to next stage.", high_prio_item.item_id);
                 items_still_needing_placement_after_iter.push(high_prio_item.clone());
                 continue;
             }

            // Try direct placement again first
            let mut placed_directly_in_phase2 = false;
             for container_id in &preferred_container_ids {
                 let container = &all_container_ids_map[*container_id];
                 let current_sim_placements_in_cont = sim_placements.get(*container_id).map_or(vec![], |v| v.clone());
                 if let Some((position, _)) = find_spot_in_container(
                     (high_prio_item.width, high_prio_item.depth, high_prio_item.height),
                     container, &current_sim_placements_in_cont, true)
                 {
                     sim_placements.entry((*container_id).clone()).or_default().push((high_prio_item.item_id.clone(), position.clone()));
                     final_placements_for_response.insert(high_prio_item.item_id.clone(), PlacementResult {
                         item_id: high_prio_item.item_id.clone(), container_id: (*container_id).clone(), position,
                         retrieval_steps: 0, is_preferred_zone: true
                     });
                     processed_item_ids_in_request.insert(high_prio_item.item_id.clone());
                     debug!("    SUCCESS (Phase 2 Direct): Placed {} in preferred {}", high_prio_item.item_id, container_id);
                     placed_directly_in_phase2 = true;
                     made_rearrangement_in_iteration = true; // State changed
                     break;
                 }
             }
             if placed_directly_in_phase2 { continue; } // Go to next high_prio_item


            // Identify potential items to displace in preferred containers
            let mut potential_displacees = vec![];
            for container_id in &preferred_container_ids {
                if let Some(current_sim_placements_in_cont) = sim_placements.get(*container_id) {
                    for (existing_item_id, existing_pos) in current_sim_placements_in_cont {
                        let existing_prio = all_item_props.get(existing_item_id).map_or(-1, |props| props.0);
                        if existing_prio >= 0 && existing_prio < high_prio_item.priority {
                            potential_displacees.push((existing_item_id.clone(), existing_prio, (*container_id).clone(), existing_pos.clone()));
                        }
                    }
                }
            }
            potential_displacees.sort_by_key(|&(_, prio, _, _)| prio); // Sort by priority ASC

            if potential_displacees.is_empty() {
                debug!("    No lower-priority items to displace for {}", high_prio_item.item_id);
                items_still_needing_placement_after_iter.push(high_prio_item.clone());
                continue;
            }

            // Try displacing items one by one
            for (displacee_id, _, source_container_id, source_position) in potential_displacees {
                debug!("    Attempting to displace: {} from {}", displacee_id, source_container_id);

                // 1. Simulate removal
                let mut temp_sim_placements_in_source = sim_placements.get(&source_container_id).map_or(vec![], |v| v.clone());
                temp_sim_placements_in_source.retain(|(id, _)| id != &displacee_id);

                // 2. Check if high-prio item fits now
                let source_container = &all_container_ids_map[&source_container_id];
                if let Some(spot_for_high_prio) = find_spot_in_container(
                    (high_prio_item.width, high_prio_item.depth, high_prio_item.height),
                    source_container, &temp_sim_placements_in_source, true)
                {
                     // 3. Try to find NEW home for displacee
                    let displacee_props = all_item_props.get(&displacee_id);
                    if displacee_props.is_none() {
                        error!("Cannot find props for displacee {}. Skipping displacement.", displacee_id); continue;
                    }
                    let displacee_dims = (displacee_props.unwrap().1, displacee_props.unwrap().2, displacee_props.unwrap().3);
                    let mut relocated = false;

                    for target_container_id in all_container_ids_map.keys() {
                        if target_container_id == &source_container_id { continue; } // Don't try same container

                        let target_container = &all_container_ids_map[target_container_id];
                        let current_sim_placements_in_target = sim_placements.get(target_container_id).map_or(vec![], |v| v.clone());

                        if let Some(spot_for_displacee) = find_spot_in_container(
                            displacee_dims, target_container, &current_sim_placements_in_target, false) // Low prio placement
                        {
                            let (new_position_displacee, _) = spot_for_displacee;
                            debug!("      SUCCESS: Found new spot for displaced {} in {}", displacee_id, target_container_id);

                            // 4. Commit simulation changes
                            rearrangement_step_counter += 1;
                            rearrangements_result.push(RearrangementStep {
                                step: rearrangement_step_counter, action: "move".to_string(), item_id: displacee_id.clone(),
                                from_container: Some(source_container_id.clone()), from_position: Some(source_position.clone()),
                                to_container: Some(target_container_id.clone()), to_position: Some(new_position_displacee.clone())
                            });

                            // Update sim_placements: remove displacee from old, add to new
                            sim_placements.get_mut(&source_container_id).unwrap().retain(|(id, _)| id != &displacee_id);
                            sim_placements.entry(target_container_id.clone()).or_default().push((displacee_id.clone(), new_position_displacee.clone()));

                            // Update final response for displaced item
                            final_placements_for_response.insert(displacee_id.clone(), PlacementResult {
                                item_id: displacee_id.clone(), container_id: target_container_id.clone(), position: new_position_displacee,
                                retrieval_steps: 0, is_preferred_zone: false // Zone check needed if API requires it
                            });

                            // Place high-prio item in freed spot
                            let (position_high_prio, _) = spot_for_high_prio;
                            sim_placements.get_mut(&source_container_id).unwrap().push((high_prio_item.item_id.clone(), position_high_prio.clone()));

                             // Update final response for high-prio item
                             final_placements_for_response.insert(high_prio_item.item_id.clone(), PlacementResult {
                                item_id: high_prio_item.item_id.clone(), container_id: source_container_id.clone(), position: position_high_prio,
                                retrieval_steps: 0, is_preferred_zone: true
                            });

                            processed_item_ids_in_request.insert(high_prio_item.item_id.clone());
                            rearrangement_successful_for_this_item = true;
                            made_rearrangement_in_iteration = true; // State changed
                            debug!("    SUCCESS (Phase 2): Displaced {}, Placed {} in {}", displacee_id, high_prio_item.item_id, source_container_id);
                            relocated = true;
                            break; // Stop trying to relocate this specific displacee
                        }
                    }
                    if !relocated {
                        debug!("      Failed to relocate displaced item {}. Trying next displacee.", displacee_id);
                        // Don't commit simulation changes, loop continues to next displacee
                    }

                } else {
                     debug!("      Removing {} does not free space for {}. Trying next displacee.", displacee_id, high_prio_item.item_id);
                }

                if rearrangement_successful_for_this_item {
                    break; // Stop trying to displace other items for this high_prio_item
                }
            } // End loop through potential displacees

            // If no successful rearrangement occurred for this item in this iteration
            if !rearrangement_successful_for_this_item {
                 debug!("    All displacement attempts failed for {} in this iteration.", high_prio_item.item_id);
                 items_still_needing_placement_after_iter.push(high_prio_item.clone());
            }
        } // End loop through items needing placement in this iteration

        items_requiring_placement_pass_3 = items_still_needing_placement_after_iter;
    } // End while made_rearrangement_in_iteration


    // --- Phase 3: Final Placement Attempt (Anywhere) ---
    debug!("--- Phase 3: Final Placement Attempt (Anywhere) ---");
    for item_req in &items_requiring_placement_pass_3 { // Use items remaining after Phase 2
        if processed_item_ids_in_request.contains(&item_req.item_id) { continue; }

        debug!("Attempting final placement for: {}", item_req.item_id);
        let mut placed = false;
        let is_high_prio = item_req.priority >= 50;

        for container_id in all_container_ids_map.keys() {
            let container = &all_container_ids_map[container_id];
            let current_sim_placements_in_cont = sim_placements.get(container_id).map_or(vec![], |v| v.clone());

             if let Some((position, _)) = find_spot_in_container(
                (item_req.width, item_req.depth, item_req.height),
                container, &current_sim_placements_in_cont, is_high_prio)
            {
                sim_placements.entry(container_id.clone()).or_default().push((item_req.item_id.clone(), position.clone()));
                final_placements_for_response.insert(item_req.item_id.clone(), PlacementResult {
                    item_id: item_req.item_id.clone(), container_id: container_id.clone(), position,
                    retrieval_steps: 0, is_preferred_zone: container.zone == item_req.preferred_zone
                });
                processed_item_ids_in_request.insert(item_req.item_id.clone());
                debug!("    SUCCESS (Phase 3): Placed {} in NON-PREFERRED {}", item_req.item_id, container_id);
                placed = true;
                break;
            }
        }

        if !placed {
            warn!("    !!! PLACEMENT FAILED COMPLETELY for item {} !!!", item_req.item_id);
            items_failed_completely.push(item_req.item_id.clone());
            processed_item_ids_in_request.insert(item_req.item_id.clone()); // Mark as processed (failed)
            // Remove from final response map if it was somehow added
            final_placements_for_response.remove(&item_req.item_id);
        }
    }

    debug!("--- End Simulation Phases --- Failed items: {:?}", items_failed_completely);

    // --- Phase 4: Persistence ---
    debug!("--- Phase 4: Persisting Changes to Database ---");
    // Use the final state from `final_placements_for_response`

     // 4.1 Upsert Containers (ensure they exist, maybe update dims if needed)
     for (c_id, c_data) in &all_container_ids_map {
          match sqlx::query(
              r#"INSERT INTO containers ("containerId", zone, width, depth, height, "isWasteContainer", "maxWeightCapacity")
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT("containerId") DO UPDATE SET
                    zone=excluded.zone,
                    width=excluded.width,
                    depth=excluded.depth,
                    height=excluded.height,
                    "isWasteContainer"=excluded."isWasteContainer",
                    "maxWeightCapacity"=excluded."maxWeightCapacity"
              "#)
              .bind(c_id)
              .bind(&c_data.zone)
              .bind(c_data.width)
              .bind(c_data.depth)
              .bind(c_data.height)
              .bind(c_data.is_waste_container)
              .bind(c_data.max_weight_capacity)
              .execute(&mut *tx).await {
              Ok(_) => debug!("Upserted container {}", c_id),
              Err(e) => {
                  error!("Failed to upsert container {}: {}", c_id, e);
                  tx.rollback().await.ok();
                   return Ok(HttpResponse::InternalServerError().json(PlacementResponse::error(format!("DB error upserting container {}: {}", c_id, e))));
              }
          }
     }

    // 4.2 Process final placements: Upsert Items and Placements
     for (item_id, final_placement) in &final_placements_for_response {
         // Find corresponding request item data
         let req_item_data = req.items.iter().find(|i| i.item_id == *item_id);

         // Upsert Item
         match sqlx::query(
            r#"
            INSERT INTO items ("itemId", name, width, depth, height, mass, priority, "expiryDate", "usageLimit", "currentUses", "preferredZone", status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            ON CONFLICT("itemId") DO UPDATE SET
                name=excluded.name,
                width=excluded.width,
                depth=excluded.depth,
                height=excluded.height,
                mass=excluded.mass,
                priority=excluded.priority,
                "expiryDate"=excluded."expiryDate",
                "usageLimit"=excluded."usageLimit",
                -- currentUses = currentUses, -- Don't reset uses on placement update
                "preferredZone"=excluded."preferredZone",
                status='ACTIVE' -- Ensure item is marked active on placement/move
            "#)
            .bind(item_id)
            .bind(req_item_data.map_or("Unknown", |i| &i.name))
            .bind(req_item_data.map_or(0.0, |i| i.width))
            .bind(req_item_data.map_or(0.0, |i| i.depth))
            .bind(req_item_data.map_or(0.0, |i| i.height))
            .bind(req_item_data.and_then(|i| i.mass))
            .bind(req_item_data.map_or(0, |i| i.priority))
            .bind(req_item_data.and_then(|i| i.expiry_date))
            .bind(req_item_data.map(|i| i.usage_limit as i64))
            .bind(req_item_data.map_or(0, |i| i.current_uses as i64))
            .bind(req_item_data.map(|i| &i.preferred_zone))
            .execute(&mut *tx).await {
             Ok(_) => debug!("Upserted item {}", item_id),
             Err(e) => {
                  error!("Failed to upsert item {}: {}", item_id, e);
                  tx.rollback().await.ok();
                   return Ok(HttpResponse::InternalServerError().json(PlacementResponse::error(format!("DB error upserting item {}: {}", item_id, e))));
             }
         }

         // Upsert Placement (delete old, insert new conceptually)
         match sqlx::query(r#"DELETE FROM placements WHERE "itemId_fk" = ?"#)
                 .bind(item_id)
                 .execute(&mut *tx).await {
             Ok(_) => debug!("Deleted old placement for {}", item_id),
             Err(e) => error!("Failed to delete old placement for {}: {} (may not exist)", item_id, e), // Log error but proceed
         }

         match sqlx::query(
             r#"INSERT INTO placements ("itemId_fk", "containerId_fk", start_w, start_d, start_h, end_w, end_d, end_h)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#)
             .bind(item_id)
             .bind(&final_placement.container_id)
             .bind(final_placement.position.start_coordinates.width)
             .bind(final_placement.position.start_coordinates.depth)
             .bind(final_placement.position.start_coordinates.height)
             .bind(final_placement.position.end_coordinates.width)
             .bind(final_placement.position.end_coordinates.depth)
             .bind(final_placement.position.end_coordinates.height)
             .execute(&mut *tx).await {
              Ok(_) => debug!("Inserted new placement for {}", item_id),
             Err(e) => {
                  error!("Failed to insert placement for {}: {}", item_id, e);
                  tx.rollback().await.ok();
                   return Ok(HttpResponse::InternalServerError().json(PlacementResponse::error(format!("DB error inserting placement {}: {}", item_id, e))));
             }
         }
     }

    // 4.3 Handle failed items (just log for now, item records might exist from above)
    if !items_failed_completely.is_empty() {
        warn!("The following items could not be placed: {:?}", items_failed_completely);
        // Potentially log these failures to a dedicated log table in the future
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        error!("Database transaction commit failed: {}", e);
        // No need to rollback, commit failed
        return Ok(HttpResponse::InternalServerError().json(PlacementResponse::error(format!("Database commit failed: {}", e))));
    }
    debug!("--- DB Commit Successful ---");


    // --- Phase 5: Format Response ---
    debug!("--- Phase 5: Formatting Response ---");
    let final_placements_list: Vec<PlacementResult> = final_placements_for_response.values().cloned().collect();
    let success = items_failed_completely.is_empty();
    let error_msg = if success { None } else { Some(format!("Placement incomplete. Could not place items: {:?}", items_failed_completely)) };

    let response_data = PlacementResponse {
        success,
        placements: final_placements_list,
        rearrangements: rearrangements_result,
        error: error_msg,
    };

    let status_code = if success { StatusCode::OK } else { StatusCode::MULTI_STATUS }; // Use 207 if partially successful
    Ok(HttpResponse::build(status_code).json(response_data))
}


// --- Other Handlers (Place, Retrieve, Waste, Cargo) ---
// These would also need to be updated to use the db_pool if they need DB access

pub async fn place_item(
    _req: web::Json<PlaceRequest>,
    _db_pool: web::Data<SqlitePool>, // Add pool if needed
    // _placement_service: web::Data<PlacementService>, // Remove if not used
) -> Result<HttpResponse> {
    info!("Recording placement for item {}", _req.item_id);
    // TODO: Implement database update logic for manual placement recording
    Ok(HttpResponse::NotImplemented().json(PlaceResponse {
        success: false,
        error: Some("Manual placement recording not implemented.".to_string()),
    }))
}

pub async fn retrieve_item(
    _req: web::Json<RetrievalRequest>,
     _db_pool: web::Data<SqlitePool>, // Add pool if needed
    // _placement_service: web::Data<PlacementService>, // Remove if not used
) -> Result<HttpResponse> {
    info!("Processing retrieval request for item {}", _req.item_id);
     // TODO: Implement database logic to find item, calculate steps, update status/uses
    Ok(HttpResponse::NotImplemented().json(RetrievalResponse {
        success: false, item: None, container_id: None, position: None,
        steps_required: 0, items_to_move: vec![],
        error: Some("Item retrieval not implemented.".to_string()),
    }))
}

pub async fn get_waste_management(
     _db_pool: web::Data<SqlitePool>, // Add pool if needed
    // _placement_service: web::Data<PlacementService>, // Remove if not used
) -> Result<HttpResponse> {
    info!("Processing waste management request");
    // TODO: Implement database logic to find expired/depleted items
    Ok(HttpResponse::NotImplemented().json(WasteManagementResponse {
        expired_items: vec![], fully_used_items: vec![],
        suggested_waste_container: "N/A".to_string(), total_waste_mass: 0.0,
        //error: Some("Waste management not implemented.".to_string()),
    }))
}

pub async fn get_cargo_return_plan(
     _db_pool: web::Data<SqlitePool>, // Add pool if needed
    // _placement_service: web::Data<PlacementService>, // Remove if not used
) -> Result<HttpResponse> {
    info!("Processing cargo return plan request");
     // TODO: Implement database logic for cargo return plan
    Ok(HttpResponse::NotImplemented().json(json!({
        "success": false,
        "error": "Cargo return plan not implemented.",
        "wasteItems": [], "loadingSequence": [], "totalReturnMass": 0.0, "spaceReclaimed": 0.0
    })))
}

// Keep helper if needed elsewhere, otherwise remove
// fn validate_coordinates(coords: &Coordinates, container: &Container) -> bool {
//     coords.width >= 0.0 && coords.width <= container.width &&
//     coords.depth >= 0.0 && coords.depth <= container.depth &&
//     coords.height >= 0.0 && coords.height <= container.height
// }

// Add a helper to create error responses consistently
impl PlacementResponse {
    fn error(msg: String) -> Self {
        PlacementResponse {
            success: false,
            placements: vec![],
            rearrangements: vec![],
            error: Some(msg),
        }
    }
} 