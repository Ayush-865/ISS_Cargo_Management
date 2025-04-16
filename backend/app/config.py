# /app/config.py
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file if it exists

class Config:
    # Database configuration - Replace with your actual database URL
    # Example for PostgreSQL: "postgresql://user:password@host:port/database"
    # Example for SQLite (relative path): "sqlite:///./cargo_data.db"
    # Example for SQLite (absolute path): "sqlite:////path/to/your/cargo_data.db"
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rs-app/placement_app.db")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Add other configurations if needed