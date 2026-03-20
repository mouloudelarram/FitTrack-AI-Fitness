"""
Fitness Tracker MVP - Lambda Function Tester
============================================
Tests all Lambda endpoints via API Gateway with Cognito auth.
Usage: python test_lambdas.py
"""

import boto3
import requests
import json
import os
from datetime import date
from botocore.exceptions import ClientError

# ─────────────────────────────────────────────
# CONFIGURE THESE BEFORE RUNNING
# ─────────────────────────────────────────────
REGION         = "us-east-1"
STAGE          = "dev"
TEST_EMAIL     = "testuser@example.com"
TEST_PASSWORD  = "Test1234!"

# Leave empty to auto-fetch from CloudFormation outputs
USER_POOL_ID   = ""
CLIENT_ID      = ""
API_URL        = ""
# ─────────────────────────────────────────────

SERVICE_NAME   = "fitness-tracker-mvp"
STACK_NAME     = f"{SERVICE_NAME}-{STAGE}"
TODAY          = date.today().isoformat()

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════

def print_header(title):
    print(f"\n{CYAN}{BOLD}{'═' * 55}")
    print(f"  {title}")
    print(f"{'═' * 55}{RESET}")


def print_result(method, path, status_code, body):
    ok = 200 <= status_code < 300
    color = GREEN if ok else RED
    mark  = "✓" if ok else "✗"
    print(f"\n  {color}{BOLD}{mark} {method} {path}{RESET}")
    print(f"  Status : {color}{status_code}{RESET}")
    try:
        parsed = json.loads(body) if isinstance(body, str) else body
        preview = json.dumps(parsed, indent=2)
        # Truncate very long responses
        lines = preview.split("\n")
        if len(lines) > 20:
            preview = "\n".join(lines[:20]) + f"\n  ... ({len(lines)-20} more lines)"
        for line in preview.split("\n"):
            print(f"  {line}")
    except Exception:
        print(f"  {body[:300]}")


def call(method, path, token, payload=None, params=None):
    url     = f"{API_URL}{path}"
    headers = {"Authorization": token, "Content-Type": "application/json"}
    # print(headers)
    resp    = requests.request(
        method, url, headers=headers,
        json=payload, params=params, timeout=15
    )
    print_result(method, path, resp.status_code, resp.text)
    try:
        return resp.status_code, resp.json()
    except Exception:
        return resp.status_code, {}


# ══════════════════════════════════════════════
# STEP 1 — FETCH CLOUDFORMATION OUTPUTS
# ══════════════════════════════════════════════

def fetch_stack_outputs():
    global USER_POOL_ID, CLIENT_ID, API_URL

    if USER_POOL_ID and CLIENT_ID and API_URL:
        print(f"{YELLOW}Using manually configured values.{RESET}")
        return

    print(f"{YELLOW}Fetching CloudFormation stack outputs for '{STACK_NAME}'...{RESET}")
    cf = boto3.client("cloudformation", region_name=REGION)

    try:
        resp    = cf.describe_stacks(StackName=STACK_NAME)
        outputs = resp["Stacks"][0]["Outputs"]
        mapping = {o["OutputKey"]: o["OutputValue"] for o in outputs}

        USER_POOL_ID = mapping.get("UserPoolId", "")
        CLIENT_ID    = mapping.get("UserPoolClientId", "")
        API_URL      = mapping.get("ApiGatewayUrl", "")

        print(f"  {GREEN}✓ UserPoolId     : {USER_POOL_ID}{RESET}")
        print(f"  {GREEN}✓ ClientId       : {CLIENT_ID}{RESET}")
        print(f"  {GREEN}✓ API URL        : {API_URL}{RESET}")

    except ClientError as e:
        print(f"  {RED}✗ Could not fetch stack: {e}{RESET}")
        print(f"  {YELLOW}→ Set USER_POOL_ID, CLIENT_ID, and API_URL manually at the top of this file.{RESET}")
        raise SystemExit(1)


# ══════════════════════════════════════════════
# STEP 2 — CREATE / CONFIRM TEST USER
# ══════════════════════════════════════════════

def setup_test_user():
    print_header("Setting up Cognito test user")
    cognito = boto3.client("cognito-idp", region_name=REGION)

    # Try to sign up (may already exist)
    try:
        cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=TEST_EMAIL,
            Password=TEST_PASSWORD,
        )
        print(f"  {GREEN}✓ User created: {TEST_EMAIL}{RESET}")
    except cognito.exceptions.UsernameExistsException:
        print(f"  {YELLOW}→ User already exists, skipping sign-up.{RESET}")
    except ClientError as e:
        print(f"  {RED}✗ Sign-up error: {e}{RESET}")
        raise

    # Auto-confirm (skips email verification)
    try:
        cognito.admin_confirm_sign_up(
            UserPoolId=USER_POOL_ID,
            Username=TEST_EMAIL,
        )
        print(f"  {GREEN}✓ User confirmed.{RESET}")
    except cognito.exceptions.NotAuthorizedException:
        print(f"  {YELLOW}→ User already confirmed.{RESET}")
    except ClientError as e:
        print(f"  {RED}✗ Confirm error: {e}{RESET}")
        raise


# ══════════════════════════════════════════════
# STEP 3 — AUTHENTICATE & GET TOKEN
# ══════════════════════════════════════════════

def get_token():
    print_header("Authenticating with Cognito")
    cognito = boto3.client("cognito-idp", region_name=REGION)

    resp = cognito.initiate_auth(
        ClientId=CLIENT_ID,
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={
            "USERNAME": TEST_EMAIL,
            "PASSWORD": TEST_PASSWORD,
        },
    )
    token = resp["AuthenticationResult"]["IdToken"]
    print(f"  {GREEN}✓ Got ID token (first 40 chars): {token[:40]}...{RESET}")
    return token


# ══════════════════════════════════════════════
# STEP 4 — TEST EACH LAMBDA
# ══════════════════════════════════════════════

def test_profile(token):
    print_header("Lambda: createUserProfile  →  /profile")

    # POST — create (trying common field name variants)
    status, body = call("POST", "/profile", token, payload={
        "name":            "Test User",
        "age":             28,
        "height":          175,       # some Lambdas use 'height' not 'height_cm'
        "height_cm":       175,
        "weight":          75.0,      # some Lambdas use 'weight' not 'weight_kg'
        "weight_kg":       75.0,
        "gender":          "male",
        "activity_level":  "moderate",
        "goal":            "lose_weight",
        "daily_calories":  2000,
    })

    if 200 <= status < 300:
        print(f"  {GREEN}→ Profile created successfully.{RESET}")
    else:
        print(f"  {YELLOW}→ POST /profile failed with {status}. Check your Lambda logs:{RESET}")
        print(f"  {YELLOW}  aws logs tail /aws/lambda/{SERVICE_NAME}-{STAGE}-createUserProfile --follow{RESET}")

    # GET — fetch
    call("GET", "/profile", token)

    # PUT — update (only if profile exists)
    if 200 <= status < 300:
        call("PUT", "/profile", token, payload={
            "age":        29,
            "weight":     74.0,
            "weight_kg":  74.0,
        })


def test_food_logs(token):
    print_header("Lambda: addFoodLog  →  /food-logs")

    # POST — the Lambda accepted these fields (confirmed from run 1)
    status, body = call("POST", "/food-logs", token, payload={
        "food_name":    "Chicken Breast",
        "calories":     250,
        "protein_g":    40,
        "carbs_g":      0,
        "fat_g":        5,
        "meal_type":    "lunch",      # required field seen in response
        "serving_size": "200g",
        "notes":        "test entry",
        "date":         TODAY,
    })

    # Grab log_id from response
    log_id = None
    if isinstance(body, dict):
        log_id = body.get("log_id") or body.get("id")

    # GET — try different query param combinations (502 in run 1 = likely missing required param)
    print(f"\n  {YELLOW}→ Trying GET /food-logs with various param combos...{RESET}")
    call("GET", "/food-logs", token, params={"date": TODAY})
    call("GET", "/food-logs", token, params={"start_date": TODAY, "end_date": TODAY})
    call("GET", "/food-logs", token)   # no params at all

    # DELETE — remove the log we just created
    if log_id:
        call("DELETE", f"/food-logs/{log_id}", token)
    else:
        print(f"\n  {YELLOW}→ Skipping DELETE: could not find log_id in POST response.{RESET}")


def test_dashboard(token):
    print_header("Lambda: getDailyCalories  →  /dashboard")
    # Try different param combos — 502 in run 1 suggests a missing/wrong param
    call("GET", "/dashboard", token, params={"date": TODAY})
    call("GET", "/dashboard", token)   # no params


def test_weight_logs(token):
    print_header("Lambda: logWeight  →  /weight-logs")

    # POST — Lambda returned 'weight is required', so use 'weight' not 'weight_kg'
    call("POST", "/weight-logs", token, payload={
        "weight":     74.5,           # ← confirmed field name from error in run 1
        "weight_kg":  74.5,           # send both just in case
        "unit":       "kg",
        "notes":      "morning weigh-in",
        "date":       TODAY,
    })

    # GET — confirmed working in run 1
    call("GET", "/weight-logs", token)
    call("GET", "/weight-logs", token, params={"period_days": 90})


def test_images(token):
    print_header("Lambda: uploadFoodImage  →  /images/upload & /images/download")

    # POST — request presigned upload URL
    status, body = call("POST", "/images/upload", token, payload={
        "filename":     "lunch.jpg",
        "content_type": "image/jpeg",
        "file_type":    "image/jpeg",   # send both variants
    })

    # ── Extract fields using the CONFIRMED response shape from run 1 ──
    # Response keys: upload_url, upload_fields, object_key, public_url
    presigned_url    = None
    presigned_fields = None
    object_key       = None

    if isinstance(body, dict):
        presigned_url    = body.get("upload_url")    # ← confirmed key from run 1
        presigned_fields = body.get("upload_fields") # ← confirmed key from run 1
        object_key       = body.get("object_key")    # ← confirmed key from run 1

    # Minimal valid 1×1 JPEG
    tiny_jpeg = bytes([
        0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,
        0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,
        0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,
        0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
        0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,
        0x24,0x2E,0x27,0x20,0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,
        0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,0x39,0x3D,0x38,0x32,
        0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
        0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,
        0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,
        0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
        0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,
        0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0xFB,0x00,
        0xFF,0xD9
    ])

    if presigned_url and presigned_fields:
        print(f"\n  {YELLOW}→ Uploading test image to S3 via presigned POST (upload_fields)...{RESET}")
        # S3 requires: all form fields first, then the file field last.
        # Separate the 'file' field from metadata fields.
        form_data = {k: v for k, v in presigned_fields.items() if k != 'file'}
        s3_resp = requests.post(
            presigned_url,
            data=form_data,
            files={"file": ("lunch.jpg", tiny_jpeg, "image/jpeg")},
            timeout=15,
        )
        color = GREEN if s3_resp.status_code in (200, 204) else RED
        mark  = "✓" if s3_resp.status_code in (200, 204) else "✗"
        print(f"  {color}{mark} S3 upload status: {s3_resp.status_code}{RESET}")
        if s3_resp.status_code not in (200, 204):
            print(f"  {RED}  S3 error: {s3_resp.text[:400]}{RESET}")
            print(f"  {YELLOW}  → This is fixed in upload_food_image.py (see bug summary below){RESET}")
    else:
        print(f"\n  {RED}✗ Could not extract upload_url or upload_fields from response.{RESET}")

    # GET /images/download — Lambda expects 'key' param (confirmed from error in run 1)
    if object_key:
        call("GET", "/images/download", token, params={"key": object_key})
    else:
        # Fallback: try common param names
        call("GET", "/images/download", token, params={"key": "lunch.jpg"})
        call("GET", "/images/download", token, params={"filename": "lunch.jpg"})


# ══════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════

def print_cloudwatch_hints():
    lambdas = [
        "createUserProfile",
        "addFoodLog",
        "getDailyCalories",
        "logWeight",
        "uploadFoodImage",
    ]
    print(f"\n{YELLOW}{BOLD}╔══════════════════════════════════════════════════════╗")
    print(f"║  To debug any 502, run the matching CloudWatch cmd:  ║")
    print(f"╚══════════════════════════════════════════════════════╝{RESET}")
    for fn in lambdas:
        log_group = f"/aws/lambda/{SERVICE_NAME}-{STAGE}-{fn}"
        print(f"  {CYAN}aws logs tail {log_group} --follow{RESET}")


def main():
    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════════════════════╗")
    print(f"║       Fitness Tracker MVP — Lambda Tester  v2        ║")
    print(f"╚══════════════════════════════════════════════════════╝{RESET}")

    fetch_stack_outputs()
    setup_test_user()
    token = get_token()

    test_profile(token)
    test_food_logs(token)
    test_dashboard(token)
    test_weight_logs(token)
    test_images(token)

    print(f"\n{GREEN}{BOLD}{'═' * 55}")
    print(f"  All tests complete!")
    print(f"{'═' * 55}{RESET}")

    print_cloudwatch_hints()


if __name__ == "__main__":
    main()
    
# serverless deploy function -f createUserProfile
# serverless deploy function -f addFoodLog
# serverless deploy function -f getDailyCalories
# serverless deploy function -f logWeight
# serverless deploy function -f uploadFoodImage