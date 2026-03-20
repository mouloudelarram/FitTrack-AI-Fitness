import json
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.dynamodb_helper import get_item, query_items
from utils.auth_helper import extract_user_id_from_event, success_response, error_response

FOOD_LOGS_TABLE = os.environ.get('FOOD_LOGS_TABLE', 'fitness-tracker-food-logs')
USERS_TABLE = os.environ.get('USERS_TABLE', 'fitness-tracker-users')


def get_calories_for_date(user_id, date):
    items = query_items(
        FOOD_LOGS_TABLE,
        'user_id-date-index',
        'user_id = :uid AND #dt = :date',
        {':uid': user_id, ':date': date},
        expression_names={'#dt': 'date'}
    )
    total = sum(int(item.get('calories', 0)) for item in items)
    breakdown = {}
    for item in items:
        meal_type = item.get('meal_type', 'snack')
        breakdown[meal_type] = breakdown.get(meal_type, 0) + int(item.get('calories', 0))
    return total, breakdown, items


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return success_response({})

    user_id = extract_user_id_from_event(event)
    if not user_id:
        return error_response("Unauthorized", 401)

    query_params = event.get('queryStringParameters') or {}
    date = query_params.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    include_week = query_params.get('include_week', 'false').lower() == 'true'

    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return error_response("date must be in YYYY-MM-DD format")

    user_profile = get_item(USERS_TABLE, {'user_id': user_id})
    calorie_goal = int(user_profile.get('calorie_goal', 2000)) if user_profile else 2000

    total_calories, breakdown, food_items = get_calories_for_date(user_id, date)
    remaining = calorie_goal - total_calories
    percentage_consumed = round((total_calories / calorie_goal * 100), 1) if calorie_goal > 0 else 0

    response_data = {
        'date': date,
        'calorie_goal': calorie_goal,
        'total_calories_consumed': total_calories,
        'remaining_calories': remaining,
        'percentage_consumed': percentage_consumed,
        'meal_breakdown': breakdown,
        'food_logs': food_items,
        'status': 'over_goal' if total_calories > calorie_goal else 'under_goal'
    }

    if include_week:
        week_data = []
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        for i in range(6, -1, -1):
            day = (date_obj - timedelta(days=i)).strftime('%Y-%m-%d')
            day_calories, day_breakdown, _ = get_calories_for_date(user_id, day)
            week_data.append({
                'date': day,
                'calories': day_calories,
                'goal': calorie_goal
            })
        response_data['week_summary'] = week_data

    return success_response(response_data)