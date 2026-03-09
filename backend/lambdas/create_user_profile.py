import json
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.dynamodb_helper import put_item, get_item, update_item
from utils.auth_helper import extract_user_id_from_event, success_response, error_response

USERS_TABLE = os.environ.get('USERS_TABLE', 'fitness-tracker-users')


def calculate_calorie_goal(age, weight_kg, height_cm, gender='male', activity_level='moderate'):
    """
    Simple rule engine using Mifflin-St Jeor equation to estimate TDEE.
    """
    if gender.lower() == 'male':
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

    activity_multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
    }
    multiplier = activity_multipliers.get(activity_level, 1.55)
    tdee = bmr * multiplier
    return round(tdee)


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return success_response({})

    user_id = extract_user_id_from_event(event)
    if not user_id:
        return error_response("Unauthorized", 401)

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return error_response("Invalid JSON body")

    http_method = event.get('httpMethod', 'POST')

    if http_method == 'GET':
        existing = get_item(USERS_TABLE, {'user_id': user_id})
        if not existing:
            return error_response("User profile not found", 404)
        return success_response(existing)

    if http_method == 'PUT':
        existing = get_item(USERS_TABLE, {'user_id': user_id})
        if not existing:
            return error_response("User profile not found", 404)

        age = body.get('age', existing.get('age', 30))
        height = body.get('height', existing.get('height', 170))
        weight = body.get('weight', existing.get('weight', 70))
        gender = body.get('gender', existing.get('gender', 'male'))
        activity_level = body.get('activity_level', existing.get('activity_level', 'moderate'))
        calorie_goal = body.get('calorie_goal') or calculate_calorie_goal(
            int(age), float(weight), float(height), gender, activity_level
        )

        update_expression = "SET age = :age, height = :height, #w = :weight, calorie_goal = :goal, gender = :gender, activity_level = :activity, updated_at = :updated"
        expression_values = {
            ':age': int(age),
            ':height': float(height),
            ':weight': float(weight),
            ':goal': int(calorie_goal),
            ':gender': gender,
            ':activity': activity_level,
            ':updated': datetime.utcnow().isoformat()
        }
        expression_names = {'#w': 'weight'}
        update_item(USERS_TABLE, {'user_id': user_id}, update_expression, expression_values, expression_names)
        updated = get_item(USERS_TABLE, {'user_id': user_id})
        return success_response(updated)

    # POST - create profile
    email = body.get('email', '')
    age = body.get('age', 30)
    height = body.get('height', 170)
    weight = body.get('weight', 70)
    gender = body.get('gender', 'male')
    activity_level = body.get('activity_level', 'moderate')
    calorie_goal = body.get('calorie_goal') or calculate_calorie_goal(
        int(age), float(weight), float(height), gender, activity_level
    )

    existing = get_item(USERS_TABLE, {'user_id': user_id})
    if existing:
        return success_response(existing)

    user_profile = {
        'user_id': user_id,
        'email': email,
        'age': int(age),
        'height': float(height),
        'weight': float(weight),
        'gender': gender,
        'activity_level': activity_level,
        'calorie_goal': int(calorie_goal),
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }

    put_item(USERS_TABLE, user_profile)
    return success_response(user_profile, 201)
