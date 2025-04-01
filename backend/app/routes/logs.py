# /app/routes/logs.py
from typing import List
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.models_db import Log # Import DB model for querying
from app.models_api import LogsResponse, LogResponseItem # Import response models
from sqlalchemy import desc, asc
from datetime import datetime
import iso8601
import json # To parse details_json

logs_bp = Blueprint('logs_bp', __name__, url_prefix='/api/logs')

@logs_bp.route('', methods=['GET'])
def handle_get_logs():
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Query parameters
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        item_id = request.args.get('itemId')
        user_id = request.args.get('userId')
        action_type = request.args.get('actionType')

        query = db.query(Log)

        # Apply filters based on query parameters
        if start_date_str:
            try:
                start_date = iso8601.parse_date(start_date_str)
                query = query.filter(Log.timestamp >= start_date)
            except (iso8601.ParseError, ValueError):
                 return jsonify({"error": f"Invalid startDate format: {start_date_str}. Use ISO 8601."}), 400
        if end_date_str:
             try:
                 end_date = iso8601.parse_date(end_date_str)
                 # Add time component to make it inclusive of the end date
                 end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                 query = query.filter(Log.timestamp <= end_date)
             except (iso8601.ParseError, ValueError):
                  return jsonify({"error": f"Invalid endDate format: {end_date_str}. Use ISO 8601."}), 400

        if item_id:
            query = query.filter(Log.itemId_fk == item_id)
        if user_id:
            query = query.filter(Log.userId == user_id)
        if action_type:
             # Assuming actionType values match LogActionType enum members
            query = query.filter(Log.actionType == action_type)

        # Order results (e.g., newest first)
        logs_db = query.order_by(desc(Log.timestamp)).all()

        # Prepare response using Pydantic models
        logs_response_items: List[LogResponseItem] = []
        for log in logs_db:
            details_dict = None
            if log.details_json:
                try:
                    details_dict = json.loads(log.details_json)
                except json.JSONDecodeError:
                     print(f"Warning: Could not parse details_json for log ID {log.id}")
                     details_dict = {"error": "Failed to parse details JSON"}

            logs_response_items.append(LogResponseItem(
                timestamp=log.timestamp,
                userId=log.userId,
                actionType=log.actionType.value, # Get string value from enum
                itemId=log.itemId_fk, # Map from DB field name
                details=details_dict
            ))

        response_data = LogsResponse(logs=logs_response_items)
        return jsonify(response_data.dict())

    except Exception as e:
        print(f"Error in /api/logs route: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()