"""
auth_helper.py  — Fixed version
=================================
Root cause of CORS errors in browser:
  - success_response() and error_response() were not including
    Access-Control-Allow-Origin (and related) headers.
  - API Gateway's `cors: true` in serverless.yml only handles the
    OPTIONS preflight automatically. The ACTUAL response from your
    Lambda must also return CORS headers — otherwise the browser
    blocks it even though the preflight passed.

This fixed version adds CORS headers to every response.
"""

import json
import os

# Allow all origins in dev; lock this down to your frontend domain in prod.
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
}


# ──────────────────────────────────────────────────────────────
# Token / user-id extraction
# ──────────────────────────────────────────────────────────────

def extract_user_id_from_event(event: dict) -> str | None:
    """
    Pull the Cognito sub (user_id) from the API Gateway authorizer context.
    API Gateway injects this after validating the JWT from the Authorization header.
    """
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})

    # Standard Cognito USER_POOLS authorizer path
    claims = authorizer.get("claims", {})
    user_id = claims.get("sub")

    if user_id:
        return user_id

    # Fallback: some setups flatten claims directly onto authorizer
    user_id = authorizer.get("sub")
    return user_id or None


# ──────────────────────────────────────────────────────────────
# Response helpers  ← CORS headers added here
# ──────────────────────────────────────────────────────────────

def success_response(body: dict, status_code: int = 200) -> dict:
    """
    Return a well-formed API Gateway response with CORS headers.
    All Lambda handlers should use this instead of building dicts manually.
    """
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,          # ← the fix: CORS on every success
        "body": json.dumps(body, default=str),
    }


def error_response(message: str, status_code: int = 400) -> dict:
    """
    Return an error response with CORS headers.
    Without CORS headers on error responses the browser also blocks them,
    making it impossible to show the user a meaningful error message.
    """
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,          # ← the fix: CORS on every error too
        "body": json.dumps({"error": message}),
    }