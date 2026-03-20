import json
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.dynamodb_helper import put_item, get_item, delete_item, query_items
from utils.auth_helper import extract_user_id_from_event, success_response, error_response

FOOD_LOGS_TABLE = os.environ.get('FOOD_LOGS_TABLE', 'fitness-tracker-food-logs')

MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return success_response({})

    user_id = extract_user_id_from_event(event)
    if not user_id:
        return error_response("Unauthorized", 401)

    http_method = event.get('httpMethod', 'POST')
    path_params = event.get('pathParameters') or {}
    log_id = path_params.get('log_id')

    if http_method == 'GET':
        query_params = event.get('queryStringParameters') or {}
        date_filter = query_params.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
        items = query_items(
            FOOD_LOGS_TABLE,
            'user_id-date-index',
            'user_id = :uid AND #dt = :date',
            {':uid': user_id, ':date': date_filter},
            expression_names={'#dt': 'date'}
        )
        # Sort by created_at
        items.sort(key=lambda x: x.get('created_at', ''))
        total_calories = sum(int(item.get('calories', 0)) for item in items)
        return success_response({
            'date': date_filter,
            'food_logs': items,
            'total_calories': total_calories
        })

    if http_method == 'DELETE':
        if not log_id:
            return error_response("log_id is required")
        existing = get_item(FOOD_LOGS_TABLE, {'log_id': log_id})
        if not existing or existing.get('user_id') != user_id:
            return error_response("Log entry not found or unauthorized", 404)
        delete_item(FOOD_LOGS_TABLE, {'log_id': log_id})
        return success_response({'message': 'Food log deleted successfully'})

    # POST - add food log
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return error_response("Invalid JSON body")

    food_name = body.get('food_name', '').strip()
    if not food_name:
        return error_response("food_name is required")

    calories = body.get('calories')
    if calories is None:
        return error_response("calories is required")

    try:
        calories = int(calories)
        if calories < 0:
            raise ValueError
    except (ValueError, TypeError):
        return error_response("calories must be a non-negative integer")

    meal_type = body.get('meal_type', 'snack').lower()
    if meal_type not in MEAL_TYPES:
        meal_type = 'snack'

    date = body.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return error_response("date must be in YYYY-MM-DD format")

    image_url = body.get('image_url', '')
    notes = body.get('notes', '')
    serving_size = body.get('serving_size', '')

    log_entry = {
        'log_id': str(uuid.uuid4()),
        'user_id': user_id,
        'food_name': food_name,
        'calories': calories,
        'meal_type': meal_type,
        'date': date,
        'image_url': image_url,
        'notes': notes,
        'serving_size': serving_size,
        'created_at': datetime.utcnow().isoformat()
    }

    put_item(FOOD_LOGS_TABLE, log_entry)
    return success_response(log_entry, 201)