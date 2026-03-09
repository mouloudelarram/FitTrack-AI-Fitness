import boto3
import os
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))


def get_table(table_name):
    return dynamodb.Table(table_name)


def put_item(table_name, item):
    table = get_table(table_name)
    try:
        response = table.put_item(Item=item)
        return response
    except ClientError as e:
        raise Exception(f"DynamoDB put_item error: {e.response['Error']['Message']}")


def get_item(table_name, key):
    table = get_table(table_name)
    try:
        response = table.get_item(Key=key)
        return response.get('Item')
    except ClientError as e:
        raise Exception(f"DynamoDB get_item error: {e.response['Error']['Message']}")


def query_items(table_name, index_name, key_condition, expression_values):
    table = get_table(table_name)
    try:
        response = table.query(
            IndexName=index_name,
            KeyConditionExpression=key_condition,
            ExpressionAttributeValues=expression_values
        )
        return response.get('Items', [])
    except ClientError as e:
        raise Exception(f"DynamoDB query error: {e.response['Error']['Message']}")


def update_item(table_name, key, update_expression, expression_values, expression_names=None):
    table = get_table(table_name)
    kwargs = {
        'Key': key,
        'UpdateExpression': update_expression,
        'ExpressionAttributeValues': expression_values,
        'ReturnValues': 'UPDATED_NEW'
    }
    if expression_names:
        kwargs['ExpressionAttributeNames'] = expression_names
    try:
        response = table.update_item(**kwargs)
        return response
    except ClientError as e:
        raise Exception(f"DynamoDB update_item error: {e.response['Error']['Message']}")


def delete_item(table_name, key):
    table = get_table(table_name)
    try:
        response = table.delete_item(Key=key)
        return response
    except ClientError as e:
        raise Exception(f"DynamoDB delete_item error: {e.response['Error']['Message']}")
