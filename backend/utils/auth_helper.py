import json
import os
import urllib.request
import urllib.error
from jose import jwk, jwt
from jose.utils import base64url_decode

COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', '')
COGNITO_APP_CLIENT_ID = os.environ.get('COGNITO_APP_CLIENT_ID', '')

_jwks_cache = None


def _get_jwks():
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    keys_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    try:
        with urllib.request.urlopen(keys_url) as response:
            _jwks_cache = json.loads(response.read().decode())['keys']
        return _jwks_cache
    except Exception as e:
        raise Exception(f"Failed to fetch JWKS: {str(e)}")


def verify_token(token):
    """
    Verify a Cognito JWT token and return the decoded claims.
    Returns dict with user info or raises exception if invalid.
    """
    try:
        headers = jwt.get_unverified_headers(token)
        kid = headers['kid']
        keys = _get_jwks()
        public_key = None
        for key in keys:
            if key['kid'] == kid:
                public_key = jwk.construct(key)
                break
        if public_key is None:
            raise Exception("Public key not found")
        message, encoded_signature = token.rsplit('.', 1)
        decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
        if not public_key.verify(message.encode('utf8'), decoded_signature):
            raise Exception("Signature verification failed")
        claims = jwt.get_unverified_claims(token)
        if claims.get('token_use') != 'access':
            if claims.get('token_use') != 'id':
                raise Exception("Invalid token use")
        return claims
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


def extract_user_id_from_event(event):
    """
    Extract user_id from API Gateway event.
    Supports both Authorization header and requestContext from Cognito authorizer.
    """
    try:
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        if claims:
            return claims.get('sub') or claims.get('cognito:username')
    except Exception:
        pass
    try:
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            claims = verify_token(token)
            return claims.get('sub') or claims.get('username')
    except Exception:
        pass
    return None


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
    }


def success_response(body, status_code=200):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(body)
    }


def error_response(message, status_code=400):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps({'error': message})
    }
