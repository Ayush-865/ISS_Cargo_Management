mod models;
mod handlers;
mod placement_service;
mod db_models;

use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use placement_service::PlacementService;
use env_logger::Env;
use sqlx::{SqlitePool, migrate::MigrateDatabase, Sqlite};
use dotenv::dotenv;
use std::env;
use log::{info, error};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging with timestamp
    env_logger::Builder::from_env(Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();

    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment variable
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    // Create database file if it doesn't exist
    if !Sqlite::database_exists(&database_url).await.unwrap_or(false) {
        info!("Creating database {}", database_url);
        match Sqlite::create_database(&database_url).await {
            Ok(_) => info!("Database created successfully."),
            Err(error) => panic!("Error creating database: {}", error),
        }
    }

    // Establish database connection pool
    let db_pool = SqlitePool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run database migrations
    info!("Running database migrations...");
    match sqlx::migrate!("./migrations").run(&db_pool).await {
        Ok(_) => info!("Migrations applied successfully."),
        Err(e) => {
            error!("Failed to apply migrations: {}", e);
            panic!("Migration failed");
        }
    }

    // Create PlacementService (if it now uses the db pool, modify its constructor)
    // For now, assume it might still contain some logic, but handlers will use db_pool primarily.
    let placement_service = web::Data::new(PlacementService::new());

    println!("Starting server at http://127.0.0.1:8080");

    HttpServer::new(move || {
        // Configure CORS middleware
        let cors = Cors::default()
            .allow_any_origin() // In production, you'd want to restrict this to your frontend origin
            .allow_any_method()
            .allow_any_header()
            .max_age(3600); // 1 hour cache for preflight requests

        App::new()
            .wrap(cors) // Add CORS middleware first
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .app_data(web::Data::new(db_pool.clone()))
            .app_data(placement_service.clone())
            .service(
                web::scope("/api")
                    .route("/placement", web::post().to(handlers::optimize_placement))
                    .route("/place", web::post().to(handlers::place_item))
                    .route("/retrieve", web::post().to(handlers::retrieve_item))
                    .route("/waste-management", web::get().to(handlers::get_waste_management))
                    .route("/cargo-return", web::get().to(handlers::get_cargo_return_plan))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
} 