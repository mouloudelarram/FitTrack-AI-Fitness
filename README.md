# 🏋️ FitTrack MVP — Calorie & Fitness Tracker

A full-stack calorie tracking mobile application built with Flutter + AWS Serverless, similar to MyFitnessPal.

---

## 🗂 Project Structure

```
fitness-tracker-mvp/
│
├── backend/                          # Python AWS Lambda backend
│   ├── lambdas/
│   │   ├── add_food_log.py           # POST/GET/DELETE food logs
│   │   ├── get_daily_calories.py     # GET daily dashboard
│   │   ├── create_user_profile.py   # GET/POST/PUT user profile
│   │   ├── log_weight.py             # GET/POST weight logs
│   │   └── upload_food_image.py      # POST presigned S3 upload URL
│   ├── utils/
│   │   ├── dynamodb_helper.py        # DynamoDB CRUD utilities
│   │   └── auth_helper.py            # JWT + CORS helpers
│   ├── requirements.txt
│   ├── package.json
│   └── serverless.yml                # Full IaC: Lambda, API GW, DDB, S3, Cognito
│
├── mobile_app/                       # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart                 # App entry + Amplify config
│   │   ├── screens/
│   │   │   ├── login_screen.dart
│   │   │   ├── signup_screen.dart
│   │   │   ├── dashboard_screen.dart
│   │   │   ├── add_food_screen.dart
│   │   │   └── progress_screen.dart
│   │   ├── services/
│   │   │   ├── api_service.dart      # All API calls
│   │   │   └── auth_service.dart     # Cognito auth wrapper
│   │   └── models/
│   │       ├── user_profile.dart
│   │       ├── food_log.dart
│   │       └── weight_log.dart
│   ├── pubspec.yaml
│   └── README.md
│
├── infrastructure/
│   ├── aws_setup_guide.md            # Full AWS deployment guide
│   └── deploy_commands.sh            # One-click deploy script
│
└── README.md                         # This file
```

---

## ⚡ Quick Start (15 minutes)

### Prerequisites
- AWS Account (free tier)
- Node.js 18+
- Python 3.10+
- Flutter 3.0+

---

### Part 1: Deploy Backend (5 min)

```bash
# 1. Install tools
pip install awscli
npm install -g serverless

# 2. Configure AWS credentials
aws configure

# 3. Deploy backend (creates all AWS resources)
cd fitness-tracker-mvp
chmod +x infrastructure/deploy_commands.sh
./infrastructure/deploy_commands.sh
```

**Save the output values:**
```
UserPoolId:        us-east-1_XXXXXXXXX
UserPoolClientId:  XXXXXXXXXXXXXXXXXXXXXXXXXX
ApiGatewayUrl:     https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/dev
```

---

##### ========================================
#####   ✓ DEPLOY COMPLETE!
##### ========================================
##### 
##### 📌 UPDATE THESE VALUES IN YOUR FLUTTER APP:
##### 
#####    File: mobile_app/lib/main.dart
#####    const String cognitoUserPoolId = 'us-east-1_9oB0rSPXl';
#####    const String cognitoAppClientId = '72acnibcmssmo45om6h19vmrpd';
##### 
#####    File: mobile_app/lib/services/api_service.dart
#####    const String _baseUrl = 'https://9mx7n208r4.execute-api.us-east-1.amazonaws.com/dev';
##### 
##### ========================================
##### 
##### ✓ Config saved to mobile_app/aws_config.txt
##### 
##### Next step: Update mobile_app/lib/main.dart and mobile_app/lib/services/api_service.dart
##### Then run: cd mobile_app && flutter pub get && flutter run


### Part 2: Configure Flutter App (2 min)

**Edit `mobile_app/lib/main.dart`:**
```dart
const String cognitoUserPoolId = 'us-east-1_XXXXXXXXX';    // ← Your value
const String cognitoAppClientId = 'XXXXXXXXXXXXXXXXXX';     // ← Your value
```

**Edit `mobile_app/lib/services/api_service.dart`:**
```dart
const String _baseUrl = 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/dev'; // ← Your URL
```

---

### Part 3: Run Flutter App (3 min)

```bash
cd mobile_app
flutter pub get
flutter run
```

---

## 🏗 Architecture

```
Flutter App
    │
    ├── Amplify Auth (Cognito) ──► Amazon Cognito User Pool
    │                               (JWT tokens, email verification)
    │
    └── HTTP API calls ──────────► Amazon API Gateway
                                    (REST API + Cognito Authorizer)
                                         │
                              ┌──────────┼──────────────┐
                              ▼          ▼               ▼
                         Lambda       Lambda          Lambda
                       (add food)  (dashboard)   (weight logs)
                              │          │               │
                              └──────────┴───────────────┘
                                         │
                                   DynamoDB Tables
                                   ├── users
                                   ├── food_logs (+ GSI)
                                   └── weight_logs (+ GSI)
                                         │
                                      S3 Bucket
                                   (food images)
```

---

## 📱 Features

| Feature | Description |
|---------|-------------|
| 🔐 Authentication | Sign up, login, logout via Amazon Cognito |
| 👤 User Profile | Age, height, weight, calorie goal, activity level |
| 🍽️ Food Logging | Add food, calories, meal type, serving size |
| 📊 Daily Dashboard | Calorie ring, meal breakdown, food log with swipe-delete |
| 📅 Date Navigation | View and log food for any past date |
| ⚖️ Weight Tracking | Log weight, line chart, stats (min/max/change) |
| 📸 Photo Upload | Take or pick meal photos, upload to S3 |
| 🧮 Calorie Calculator | Auto-calculates goal using Mifflin-St Jeor equation |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Get user profile |
| POST | `/profile` | Create user profile |
| PUT | `/profile` | Update user profile |
| GET | `/food-logs?date=YYYY-MM-DD` | Get food logs for date |
| POST | `/food-logs` | Add food log |
| DELETE | `/food-logs/{log_id}` | Delete food log |
| GET | `/dashboard?date=YYYY-MM-DD` | Get daily dashboard |
| GET | `/weight-logs?days=30` | Get weight history |
| POST | `/weight-logs` | Log weight |
| POST | `/images/upload` | Get S3 presigned upload URL |
| GET | `/images/download?key=...` | Get S3 presigned download URL |

All endpoints require `Authorization: Bearer <access_token>` header.

---

## 🗄️ Database Schema

### Table: `fitness-tracker-mvp-users-dev`
| Field | Type | Description |
|-------|------|-------------|
| user_id (PK) | String | Cognito user sub |
| email | String | User email |
| age | Number | Age in years |
| height | Number | Height in cm |
| weight | Number | Weight in kg |
| gender | String | male / female |
| activity_level | String | sedentary / light / moderate / active / very_active |
| calorie_goal | Number | Daily calorie target |

### Table: `fitness-tracker-mvp-food-logs-dev`
| Field | Type | Description |
|-------|------|-------------|
| log_id (PK) | String | UUID |
| user_id (GSI) | String | Cognito user sub |
| food_name | String | Name of food |
| calories | Number | Calories |
| meal_type | String | breakfast / lunch / dinner / snack |
| date (GSI Range) | String | YYYY-MM-DD |
| image_url | String | S3 URL (optional) |
| notes | String | Optional notes |

### Table: `fitness-tracker-mvp-weight-logs-dev`
| Field | Type | Description |
|-------|------|-------------|
| log_id (PK) | String | UUID |
| user_id (GSI) | String | Cognito user sub |
| weight | Number | Weight in kg |
| date (GSI Range) | String | YYYY-MM-DD |
| unit | String | kg / lbs |
| notes | String | Optional notes |

---

## 🔧 Environment Variables

All Lambda functions use these environment variables (set in `serverless.yml`):

```
USERS_TABLE=fitness-tracker-mvp-users-dev
FOOD_LOGS_TABLE=fitness-tracker-mvp-food-logs-dev
WEIGHT_LOGS_TABLE=fitness-tracker-mvp-weight-logs-dev
S3_BUCKET=fitness-tracker-mvp-food-images-dev
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=<from deploy>
COGNITO_APP_CLIENT_ID=<from deploy>
```

---

## 🆓 AWS Free Tier Usage

This MVP is designed to run within AWS free tier:

| Service | This App's Usage | Free Tier |
|---------|-----------------|-----------|
| Lambda | ~100 req/day | 1M/month ✅ |
| DynamoDB | <1 GB | 25 GB ✅ |
| S3 | <1 GB images | 5 GB ✅ |
| API Gateway | ~100 req/day | 1M/month ✅ |
| Cognito | <100 users | 50K MAU ✅ |

---

## 📦 Zip Project

```bash
cd ..  # Go to parent directory
zip -r fitness-tracker-mvp.zip fitness-tracker-mvp/ \
  --exclude "*/node_modules/*" \
  --exclude "*/.git/*" \
  --exclude "*/__pycache__/*" \
  --exclude "*/build/*" \
  --exclude "*/.dart_tool/*"
```

---

## 🐛 Common Issues

**CORS errors** → Re-deploy backend: `serverless deploy`

**Amplify not configured** → Check `cognitoUserPoolId` in `main.dart`

**401 Unauthorized** → Token expired, sign out and sign in again

**DynamoDB errors** → Check Lambda logs in CloudWatch

**Flutter pub get fails** → Run `flutter doctor` and resolve issues first

---

## Frontend Web App

`frontend_web` is a React + Vite + TypeScript + Tailwind web client that uses the same Cognito user pool and API Gateway backend as the Flutter app.

### Web App Setup

```bash
cd frontend_web
cp .env.example .env.local
npm install
npm run dev
```

If you are on Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

### How It Connects To The Backend

- `VITE_API_BASE_URL` points at the existing serverless backend
- `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, and `VITE_COGNITO_CLIENT_ID` point at the same Cognito setup used by `mobile_app`
- `VITE_ML_API_URL` is optional and can point to the local FastAPI calorie predictor under `models`; this predictor is not currently exposed by `backend/serverless.yml`

See `frontend_web/README.md` for the verified API/auth contract and the full web-app setup notes.
