"""
FitTrack — Realistic 14-Month Seed Data Generator
===================================================
Creates a new Cognito user and seeds 14 months of realistic data:
  - User profile with calorie goal
  - Daily food logs (breakfast / lunch / dinner / snack) for 14 months
  - Weight logs showing a realistic loss + maintenance journey
  - Enough variety to make every page of the web app look lived-in

Usage:
    pip install boto3 requests
    python seed_user.py
"""

import boto3
import requests
import json
import uuid
import random
import math
from datetime import date, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError

# ─────────────────────────────────────────────────────────────
# CONFIGURE — change these to match your seed user
# ─────────────────────────────────────────────────────────────
REGION        = "us-east-1"
STAGE         = "dev"
SERVICE_NAME  = "fitness-tracker-mvp"
STACK_NAME    = f"{SERVICE_NAME}-{STAGE}"

SEED_EMAIL    = "demo.user@fittrack.dev"
SEED_PASSWORD = "Demo1234!"

# Profile
PROFILE = {
    "name":           "Alex Martin",
    "age":            29,
    "height":         178,        # cm
    "start_weight":   92.0,       # kg — starting weight 14 months ago
    "target_weight":  75.0,       # kg — goal
    "gender":         "male",
    "activity_level": "moderate",
}

# How many months of history to generate
MONTHS_BACK = 14

# Skip ~15% of days (nobody logs every single day)
SKIP_DAY_PROBABILITY = 0.12
# ─────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

API_URL      = ""
USER_POOL_ID = ""
CLIENT_ID    = ""


# ══════════════════════════════════════════════════════════════
# FOOD DATABASE  — realistic meals with calories
# ══════════════════════════════════════════════════════════════

BREAKFASTS = [
    ("Oatmeal with berries",        320, "breakfast"),
    ("Greek yogurt with granola",   280, "breakfast"),
    ("Scrambled eggs on toast",     380, "breakfast"),
    ("Avocado toast",               350, "breakfast"),
    ("Protein smoothie",            310, "breakfast"),
    ("Banana and peanut butter",    290, "breakfast"),
    ("Whole grain cereal with milk",260, "breakfast"),
    ("Veggie omelette",             340, "breakfast"),
    ("Overnight oats",              300, "breakfast"),
    ("Cottage cheese and fruit",    250, "breakfast"),
    ("Pancakes (2) with syrup",     480, "breakfast"),
    ("Eggs Benedict",               520, "breakfast"),
    ("Bagel with cream cheese",     420, "breakfast"),
    ("French toast",                450, "breakfast"),
]

LUNCHES = [
    ("Grilled chicken salad",       420, "lunch"),
    ("Turkey and avocado wrap",     480, "lunch"),
    ("Quinoa bowl with veggies",    390, "lunch"),
    ("Tuna sandwich",               440, "lunch"),
    ("Lentil soup and bread",       380, "lunch"),
    ("Caesar salad with chicken",   460, "lunch"),
    ("Brown rice and stir-fry veg", 410, "lunch"),
    ("Chicken burrito bowl",        550, "lunch"),
    ("Salmon and roasted veg",      490, "lunch"),
    ("Pasta salad",                 430, "lunch"),
    ("Greek salad with pita",       370, "lunch"),
    ("Black bean tacos (2)",        480, "lunch"),
    ("Sushi roll (8 pieces)",       400, "lunch"),
    ("Vegetable curry and rice",    460, "lunch"),
    ("BLT sandwich",                510, "lunch"),
    ("Chicken noodle soup + roll",  390, "lunch"),
]

DINNERS = [
    ("Grilled salmon with broccoli",    520, "dinner"),
    ("Chicken stir-fry with rice",      580, "dinner"),
    ("Beef steak with sweet potato",    650, "dinner"),
    ("Pasta bolognese",                 620, "dinner"),
    ("Baked cod and quinoa",            490, "dinner"),
    ("Turkey meatballs with spaghetti", 600, "dinner"),
    ("Vegetable stir-fry with tofu",    430, "dinner"),
    ("Pork tenderloin and asparagus",   540, "dinner"),
    ("Chicken tikka masala and rice",   630, "dinner"),
    ("Shrimp tacos (3)",                510, "dinner"),
    ("Homemade pizza slice x2",         680, "dinner"),
    ("Lamb chops and roasted veg",      590, "dinner"),
    ("Stuffed peppers",                 470, "dinner"),
    ("Salmon teriyaki and edamame",     550, "dinner"),
    ("Chicken and vegetable soup",      380, "dinner"),
    ("BBQ ribs and coleslaw",           720, "dinner"),
    ("Veggie lasagna",                  520, "dinner"),
]

SNACKS = [
    ("Apple",                       80,  "snack"),
    ("Protein bar",                 200, "snack"),
    ("Mixed nuts (30g)",            180, "snack"),
    ("Greek yogurt",                130, "snack"),
    ("Banana",                      105, "snack"),
    ("Hummus and carrots",          150, "snack"),
    ("Rice cakes x2",               70,  "snack"),
    ("Cheese stick",                80,  "snack"),
    ("Dark chocolate (2 squares)",  110, "snack"),
    ("Trail mix (40g)",             190, "snack"),
    ("Orange",                      62,  "snack"),
    ("Coffee with oat milk",        60,  "snack"),
    ("Protein shake",               160, "snack"),
    ("Hard-boiled egg",             78,  "snack"),
    ("Peanut butter on rice cake",  170, "snack"),
]

CHEAT_MEALS = [
    ("Burger and fries",            950, "dinner"),
    ("Pizza (3 slices)",            870, "dinner"),
    ("Pad Thai",                    760, "dinner"),
    ("Fish and chips",              820, "dinner"),
    ("Mac and cheese",              680, "dinner"),
    ("Nachos with guac",            720, "snack"),
    ("Ice cream (2 scoops)",        350, "snack"),
    ("Chocolate cake slice",        450, "snack"),
    ("Croissant and latte",         490, "breakfast"),
    ("Full English breakfast",      780, "breakfast"),
]


# ══════════════════════════════════════════════════════════════
# WEIGHT CURVE — realistic loss then maintenance
# ══════════════════════════════════════════════════════════════

def weight_for_day(day_index: int, total_days: int) -> float:
    """
    Simulate a realistic weight journey:
    - Months 1-3:  fast loss (~1kg/month)
    - Months 4-8:  slower loss (~0.5kg/month)
    - Months 9-11: plateau / slight rebound
    - Months 12+:  maintenance with small fluctuations
    """
    start = PROFILE["start_weight"]
    target = PROFILE["target_weight"]
    total_loss = start - target

    progress = day_index / total_days

    if progress < 0.21:       # first 3 months — fast loss
        curve = progress / 0.21 * 0.45
    elif progress < 0.57:     # months 4-8 — slower loss
        curve = 0.45 + (progress - 0.21) / 0.36 * 0.40
    elif progress < 0.78:     # months 9-11 — plateau
        curve = 0.85 + math.sin(progress * 8) * 0.03
    else:                     # months 12+ — maintenance
        curve = 0.87 + math.sin(progress * 12) * 0.02

    base_weight = start - (total_loss * curve)
    # Daily noise ±0.6kg
    noise = random.gauss(0, 0.3)
    return round(max(target - 1, base_weight + noise), 1)


# ══════════════════════════════════════════════════════════════
# CALORIE GOAL (Mifflin-St Jeor)
# ══════════════════════════════════════════════════════════════

def calculate_calorie_goal(weight_kg: float) -> int:
    age    = PROFILE["age"]
    height = PROFILE["height"]
    gender = PROFILE["gender"]
    bmr = (10 * weight_kg) + (6.25 * height) - (5 * age) + (5 if gender == "male" else -161)
    return round(bmr * 1.55)   # moderate activity


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════

def print_header(title):
    print(f"\n{CYAN}{BOLD}{'═' * 58}")
    print(f"  {title}")
    print(f"{'═' * 58}{RESET}")


def print_ok(msg):  print(f"  {GREEN}✓ {msg}{RESET}")
def print_warn(msg): print(f"  {YELLOW}→ {msg}{RESET}")
def print_err(msg):  print(f"  {RED}✗ {msg}{RESET}")


def call(method, path, token, payload=None, params=None):
    url     = f"{API_URL}{path}"
    headers = {"Authorization": token, "Content-Type": "application/json"}
    resp    = requests.request(
        method, url, headers=headers,
        json=payload, params=params, timeout=20
    )
    return resp.status_code, resp.json() if resp.text else {}


# ══════════════════════════════════════════════════════════════
# STEP 1 — CloudFormation outputs
# ══════════════════════════════════════════════════════════════

def fetch_stack_outputs():
    global API_URL, USER_POOL_ID, CLIENT_ID
    print_header("Fetching CloudFormation outputs")
    cf = boto3.client("cloudformation", region_name=REGION)
    resp    = cf.describe_stacks(StackName=STACK_NAME)
    outputs = {o["OutputKey"]: o["OutputValue"] for o in resp["Stacks"][0]["Outputs"]}
    USER_POOL_ID = outputs["UserPoolId"]
    CLIENT_ID    = outputs["UserPoolClientId"]
    API_URL      = outputs["ApiGatewayUrl"]
    print_ok(f"UserPoolId : {USER_POOL_ID}")
    print_ok(f"ClientId   : {CLIENT_ID}")
    print_ok(f"API URL    : {API_URL}")


# ══════════════════════════════════════════════════════════════
# STEP 2 — Create & confirm Cognito user
# ══════════════════════════════════════════════════════════════

def create_cognito_user():
    print_header(f"Creating Cognito user  →  {SEED_EMAIL}")
    cognito = boto3.client("cognito-idp", region_name=REGION)

    try:
        cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=SEED_EMAIL,
            Password=SEED_PASSWORD,
            UserAttributes=[{"Name": "email", "Value": SEED_EMAIL}],
        )
        print_ok("User signed up.")
    except cognito.exceptions.UsernameExistsException:
        print_warn("User already exists — skipping sign-up.")

    try:
        cognito.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=SEED_EMAIL)
        print_ok("User confirmed.")
    except cognito.exceptions.NotAuthorizedException:
        print_warn("User already confirmed.")


# ══════════════════════════════════════════════════════════════
# STEP 3 — Authenticate
# ══════════════════════════════════════════════════════════════

def get_token() -> str:
    print_header("Authenticating")
    cognito = boto3.client("cognito-idp", region_name=REGION)
    resp  = cognito.initiate_auth(
        ClientId=CLIENT_ID,
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={"USERNAME": SEED_EMAIL, "PASSWORD": SEED_PASSWORD},
    )
    token = resp["AuthenticationResult"]["IdToken"]
    print_ok(f"ID token obtained: {token[:40]}...")
    return token


# ══════════════════════════════════════════════════════════════
# STEP 4 — Create profile
# ══════════════════════════════════════════════════════════════

def create_profile(token: str):
    print_header("Creating user profile")
    current_weight  = weight_for_day(0, 1)   # approximate current weight
    calorie_goal    = calculate_calorie_goal(current_weight)

    status, body = call("POST", "/profile", token, payload={
        "email":          SEED_EMAIL,
        "age":            PROFILE["age"],
        "height":         PROFILE["height"],
        "weight":         current_weight,
        "gender":         PROFILE["gender"],
        "activity_level": PROFILE["activity_level"],
        "calorie_goal":   calorie_goal,
    })

    if 200 <= status < 300:
        print_ok(f"Profile created  (calorie goal: {calorie_goal} kcal/day)")
    else:
        print_warn(f"Profile POST returned {status}: {body} — may already exist, continuing.")


# ══════════════════════════════════════════════════════════════
# STEP 5 — Seed food logs
# ══════════════════════════════════════════════════════════════

def seed_food_logs(token: str, start_date: date, end_date: date):
    print_header(f"Seeding food logs  ({start_date}  →  {end_date})")
    total_days   = (end_date - start_date).days
    logged_days  = 0
    skipped_days = 0
    total_logs   = 0

    current = start_date
    while current <= end_date:
        # Skip some days to look realistic
        if random.random() < SKIP_DAY_PROBABILITY:
            skipped_days += 1
            current += timedelta(days=1)
            continue

        day_index   = (current - start_date).days
        is_weekend  = current.weekday() >= 5
        is_cheat    = random.random() < (0.15 if is_weekend else 0.07)

        date_str = current.isoformat()
        meals    = []

        # Breakfast — skip ~10% of days
        if random.random() > 0.10:
            meals.append(random.choice(BREAKFASTS))

        # Lunch
        meals.append(random.choice(LUNCHES))

        # Dinner — sometimes a cheat meal on weekends
        if is_cheat:
            meals.append(random.choice(CHEAT_MEALS))
        else:
            meals.append(random.choice(DINNERS))

        # Snack — 70% chance
        if random.random() < 0.70:
            meals.append(random.choice(SNACKS))
        # Second snack — 25% chance
        if random.random() < 0.25:
            meals.append(random.choice(SNACKS))

        for food_name, calories, meal_type in meals:
            # Small calorie variance ±5%
            cal = int(calories * random.uniform(0.95, 1.05))
            status, _ = call("POST", "/food-logs", token, payload={
                "food_name":  food_name,
                "calories":   cal,
                "meal_type":  meal_type,
                "date":       date_str,
            })
            if 200 <= status < 300:
                total_logs += 1
            else:
                print_err(f"Food log failed on {date_str}: {food_name}")

        logged_days += 1
        # Progress every 30 days
        if logged_days % 30 == 0:
            pct = int(day_index / total_days * 100)
            print_ok(f"  Progress: {logged_days} days logged, {total_logs} entries  ({pct}%)")

        current += timedelta(days=1)

    print_ok(f"Food logs complete — {total_logs} entries across {logged_days} days ({skipped_days} days skipped)")


# ══════════════════════════════════════════════════════════════
# STEP 6 — Seed weight logs
# ══════════════════════════════════════════════════════════════

def seed_weight_logs(token: str, start_date: date, end_date: date):
    print_header(f"Seeding weight logs  ({start_date}  →  {end_date})")
    total_days = (end_date - start_date).days
    logged     = 0
    failed     = 0

    current = start_date
    # Log weight every 3-5 days — realistic for someone tracking progress
    next_log_date = current
    while current <= end_date:
        if current >= next_log_date:
            day_index = (current - start_date).days
            weight    = weight_for_day(day_index, total_days)

            status, _ = call("POST", "/weight-logs", token, payload={
                "weight": weight,
                "date":   current.isoformat(),
                "unit":   "kg",
                "notes":  random.choice([
                    "", "", "", "",           # mostly no notes
                    "Morning weigh-in",
                    "After workout",
                    "Feeling lighter!",
                    "Stayed on track this week",
                    "Hard week but still going",
                    "New low!",
                ]),
            })
            if 200 <= status < 300:
                logged += 1
            else:
                failed += 1

            # Next log in 3-5 days
            next_log_date = current + timedelta(days=random.randint(3, 5))

        current += timedelta(days=1)

    print_ok(f"Weight logs complete — {logged} entries logged  ({failed} failed)")


# ══════════════════════════════════════════════════════════════
# STEP 7 — Update profile with current weight
# ══════════════════════════════════════════════════════════════

def update_profile_current_weight(token: str, end_date: date, start_date: date):
    print_header("Updating profile with current weight")
    total_days    = (end_date - start_date).days
    current_weight = weight_for_day(total_days, total_days)
    calorie_goal   = calculate_calorie_goal(current_weight)

    status, body = call("PUT", "/profile", token, payload={
        "weight":       current_weight,
        "calorie_goal": calorie_goal,
    })
    if 200 <= status < 300:
        print_ok(f"Profile updated — current weight: {current_weight}kg, goal: {calorie_goal} kcal/day")
    else:
        print_err(f"Profile update failed ({status}): {body}")


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

def main():
    random.seed(42)   # reproducible data

    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════════════════════════╗")
    print(f"║       FitTrack — 14-Month Seed Data Generator           ║")
    print(f"╚══════════════════════════════════════════════════════════╝{RESET}")

    end_date   = date.today()
    start_date = end_date - timedelta(days=30 * MONTHS_BACK)

    print(f"\n  {YELLOW}Seeding {MONTHS_BACK} months of data")
    print(f"  Range   : {start_date}  →  {end_date}")
    print(f"  User    : {SEED_EMAIL}")
    print(f"  Weight  : {PROFILE['start_weight']}kg  →  ~{PROFILE['target_weight']}kg (goal){RESET}")

    fetch_stack_outputs()
    create_cognito_user()
    token = get_token()
    create_profile(token)
    seed_food_logs(token, start_date, end_date)
    seed_weight_logs(token, start_date, end_date)
    update_profile_current_weight(token, end_date, start_date)

    print(f"\n{GREEN}{BOLD}{'═' * 58}")
    print(f"  Seed complete!  Log in with:")
    print(f"  Email    : {SEED_EMAIL}")
    print(f"  Password : {SEED_PASSWORD}")
    print(f"{'═' * 58}{RESET}\n")


if __name__ == "__main__":
    main()