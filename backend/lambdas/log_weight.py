import json
import os
import sys
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.dynamodb_helper import put_item, get_item, query_items, update_item
from utils.auth_helper import extract_user_id_from_event, success_response, error_response

WEIGHT_LOGS_TABLE = os.environ.get('WEIGHT_LOGS_TABLE', 'fitness-tracker-weight-logs')
USERS_TABLE = os.environ.get('USERS_TABLE', 'fitness-tracker-users')


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return success_response({})

    user_id = extract_user_id_from_event(event)
    if not user_id:
        return error_response("Unauthorized", 401)

    http_method = event.get('httpMethod', 'POST')

    if http_method == 'GET':
        query_params = event.get('queryStringParameters') or {}
        days = int(query_params.get('days', 30))
        days = min(days, 365)

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        items = query_items(
            WEIGHT_LOGS_TABLE,
            'user_id-date-index',
            'user_id = :uid',
            {':uid': user_id}
        )

        # Filter by date range
        start_str = start_date.strftime('%Y-%m-%d')
        items = [item for item in items if item.get('date', '') >= start_str]
        items.sort(key=lambda x: x.get('date', ''))

        stats = {}
        if items:
            weights = [float(item['weight']) for item in items]
            stats = {
                'current_weight': weights[-1],
                'start_weight': weights[0],
                'min_weight': min(weights),
                'max_weight': max(weights),
                'change': round(weights[-1] - weights[0], 2),
                'entries_count': len(weights)
            }

        return success_response({
            'weight_logs': items,
            'stats': stats,
            'period_days': days
        })

    # POST - log weight
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return error_response("Invalid JSON body")

    weight = body.get('weight')
    if weight is None:
        return error_response("weight is required")

    try:
        weight = float(weight)
        if weight <= 0 or weight > 700:
            raise ValueError
    except (ValueError, TypeError):
        return error_response("weight must be a positive number in kg")

    date = body.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return error_response("date must be in YYYY-MM-DD format")

    notes = body.get('notes', '')
    unit = body.get('unit', 'kg')

    # Convert lbs to kg if needed
    weight_kg = weight
    if unit == 'lbs':
        weight_kg = round(weight * 0.453592, 2)

    log_entry = {
        'log_id': str(uuid.uuid4()),
        'user_id': user_id,
        'weight': weight_kg,
        'weight_original': weight,
        'unit': unit,
        'date': date,
        'notes': notes,
        'created_at': datetime.utcnow().isoformat()
    }

    put_item(WEIGHT_LOGS_TABLE, log_entry)

    # Update current weight in user profile
    try:
        update_item(
            USERS_TABLE,
            {'user_id': user_id},
            "SET #w = :weight, updated_at = :updated",
            {':weight': weight_kg, ':updated': datetime.utcnow().isoformat()},
            {'#w': 'weight'}
        )
    except Exception:
        pass  # Non-critical update

    return success_response(log_entry, 201)
