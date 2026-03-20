"""
dynamodb_helper.py  — Fixed version (v2: float → Decimal)
=====================================
Root cause of the 502 errors:
  - query_items() was not accepting or forwarding `expression_names`
    to DynamoDB, so any query using reserved-word aliases like #dt
    (for 'date') or #w (for 'weight') caused a DynamoDB ValidationException
    which API Gateway surfaced as a 502.
  - update_item() had the same problem.

This fixed version makes `expression_names` a proper optional parameter
on both functions and forwards it correctly to boto3.
"""

import boto3
import os
from decimal import Decimal, ROUND_HALF_UP

_dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.environ.get('AWS_REGION_NAME', 'us-east-1')
)


def _table(table_name: str):
    return _dynamodb.Table(table_name)


def _to_decimal(obj):
    """
    Recursively convert float values to Decimal before writing to DynamoDB.
    boto3's DynamoDB resource client rejects Python floats entirely —
    you must use Decimal for all numeric values that have a decimal point.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))   # str() avoids floating-point precision errors
    if isinstance(obj, dict):
        return {k: _to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_decimal(v) for v in obj]
    return obj


# ──────────────────────────────────────────────────────────────
# put_item
# ──────────────────────────────────────────────────────────────
def put_item(table_name: str, item: dict) -> dict:
    """Write a single item. Floats are automatically converted to Decimal."""
    return _table(table_name).put_item(Item=_to_decimal(item))


# ──────────────────────────────────────────────────────────────
# get_item
# ──────────────────────────────────────────────────────────────
def get_item(table_name: str, key: dict) -> dict | None:
    """Return the item or None if not found."""
    resp = _table(table_name).get_item(Key=key)
    return resp.get('Item')


# ──────────────────────────────────────────────────────────────
# delete_item
# ──────────────────────────────────────────────────────────────
def delete_item(table_name: str, key: dict) -> dict:
    """Delete an item by primary key."""
    return _table(table_name).delete_item(Key=key)


# ──────────────────────────────────────────────────────────────
# update_item   ← FIX: expression_names now forwarded correctly
# ──────────────────────────────────────────────────────────────
def update_item(
    table_name: str,
    key: dict,
    update_expression: str,
    expression_values: dict,
    expression_names: dict | None = None,   # ← was missing or ignored before
) -> dict:
    """
    Update an item.

    expression_names is required whenever your UpdateExpression references
    DynamoDB reserved words via #alias notation (e.g. #w for 'weight',
    #dt for 'date', #s for 'status', etc.).
    """
    kwargs = {
        'Key': key,
        'UpdateExpression': update_expression,
        'ExpressionAttributeValues': _to_decimal(expression_values),
        'ReturnValues': 'UPDATED_NEW',
    }
    if expression_names:
        kwargs['ExpressionAttributeNames'] = expression_names   # ← the fix

    return _table(table_name).update_item(**kwargs)


# ──────────────────────────────────────────────────────────────
# query_items   ← FIX: expression_names now forwarded correctly
# ──────────────────────────────────────────────────────────────
def query_items(
    table_name: str,
    index_name: str,
    key_condition_expression: str,
    expression_values: dict,
    expression_names: dict | None = None,   # ← was missing or ignored before
    filter_expression: str | None = None,
    limit: int | None = None,
) -> list[dict]:
    """
    Query a GSI and return all matching items (handles pagination).

    expression_names is required when the KeyConditionExpression (or
    FilterExpression) references reserved words via #alias notation.
    Example: 'user_id = :uid AND #dt = :date'  →  expression_names={'#dt': 'date'}

    Without this, DynamoDB raises:
      ValidationException: Value provided in ExpressionAttributeNames
      unused in expressions
    or worse silently misinterprets the expression — causing a 502.
    """
    kwargs = {
        'IndexName': index_name,
        'KeyConditionExpression': key_condition_expression,   # string form
        'ExpressionAttributeValues': expression_values,
    }
    if expression_names:
        kwargs['ExpressionAttributeNames'] = expression_names   # ← the fix
    if filter_expression:
        kwargs['FilterExpression'] = filter_expression
    if limit:
        kwargs['Limit'] = limit

    table = _table(table_name)
    items = []

    # Paginate until all results are retrieved
    while True:
        resp = table.query(**kwargs)
        items.extend(resp.get('Items', []))
        last_key = resp.get('LastEvaluatedKey')
        if not last_key:
            break
        kwargs['ExclusiveStartKey'] = last_key

    return items