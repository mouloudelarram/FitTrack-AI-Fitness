import json
import os
import sys
import uuid
import boto3
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.auth_helper import extract_user_id_from_event, success_response, error_response

S3_BUCKET = os.environ.get('S3_BUCKET', 'fitness-tracker-food-images')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
URL_EXPIRY_SECONDS = 3600  # 1 hour presigned URL expiry

s3_client = boto3.client('s3', region_name=AWS_REGION)

ALLOWED_CONTENT_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
}


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return success_response({})

    user_id = extract_user_id_from_event(event)
    if not user_id:
        return error_response("Unauthorized", 401)

    http_method = event.get('httpMethod', 'POST')

    if http_method == 'GET':
        # Return a presigned GET URL for an existing image
        query_params = event.get('queryStringParameters') or {}
        object_key = query_params.get('key')
        if not object_key:
            return error_response("key parameter is required")

        # Security: ensure user can only access their own images
        if not object_key.startswith(f"food-images/{user_id}/"):
            return error_response("Unauthorized access to this image", 403)

        try:
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': object_key},
                ExpiresIn=URL_EXPIRY_SECONDS
            )
            return success_response({'url': presigned_url, 'expires_in': URL_EXPIRY_SECONDS})
        except Exception as e:
            return error_response(f"Failed to generate download URL: {str(e)}", 500)

    # POST - generate presigned upload URL
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return error_response("Invalid JSON body")

    content_type = body.get('content_type', 'image/jpeg')
    if content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(f"Unsupported content type. Allowed: {list(ALLOWED_CONTENT_TYPES.keys())}")

    extension = ALLOWED_CONTENT_TYPES[content_type]
    file_name = body.get('file_name', '')
    log_id = body.get('log_id', '')

    image_id = str(uuid.uuid4())
    date_prefix = datetime.utcnow().strftime('%Y/%m/%d')
    object_key = f"food-images/{user_id}/{date_prefix}/{image_id}.{extension}"

    metadata = {
        'user-id': user_id,
        'upload-timestamp': datetime.utcnow().isoformat(),
        'original-filename': file_name[:100] if file_name else 'unknown'
    }
    if log_id:
        metadata['log-id'] = log_id

    try:
        presigned_post = s3_client.generate_presigned_post(
            Bucket=S3_BUCKET,
            Key=object_key,
            Fields={
                'Content-Type': content_type,
                'x-amz-meta-user-id': user_id,
                'x-amz-meta-upload-timestamp': metadata['upload-timestamp']
            },
            Conditions=[
                {'Content-Type': content_type},
                ['content-length-range', 1, 10 * 1024 * 1024],  # Max 10MB
                {'x-amz-meta-user-id': user_id}
            ],
            ExpiresIn=300  # 5 minutes to complete upload
        )

        public_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{object_key}"

        return success_response({
            'upload_url': presigned_post['url'],
            'upload_fields': presigned_post['fields'],
            'object_key': object_key,
            'public_url': public_url,
            'expires_in': 300,
            'max_size_bytes': 10 * 1024 * 1024
        }, 201)

    except Exception as e:
        return error_response(f"Failed to generate upload URL: {str(e)}", 500)
