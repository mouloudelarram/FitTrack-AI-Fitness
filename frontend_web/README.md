# FitTrack Frontend Web

React + Vite + TypeScript + Tailwind web client for FitTrack, connected to the same AWS backend and Cognito user pool used by the Flutter mobile app.

## What Was Verified From The Repo

### Backend API

All backend routes are defined in [`backend/serverless.yml`](../backend/serverless.yml) and implemented in `backend/lambdas/`.

| Method | Path | Request body / params | Response summary |
|--------|------|------------------------|------------------|
| `GET` | `/profile` | none | Current user profile or `404` |
| `POST` | `/profile` | `email`, `age`, `height`, `weight`, `gender`, `activity_level`, optional `calorie_goal` | Creates profile or returns existing one |
| `PUT` | `/profile` | same fields as create, all optional | Updates profile |
| `GET` | `/food-logs?date=YYYY-MM-DD` | `date` query optional | `date`, `food_logs`, `total_calories` |
| `POST` | `/food-logs` | `food_name`, `calories`, `meal_type`, `date`, optional `image_url`, `notes`, `serving_size` | New food log |
| `DELETE` | `/food-logs/{log_id}` | path param | Success message |
| `GET` | `/dashboard?date=YYYY-MM-DD&include_week=true` | `date`, optional `include_week=true` | Goal, totals, meal breakdown, food logs, optional week summary |
| `GET` | `/weight-logs?days=30` | `days` query optional | `weight_logs`, `stats`, `period_days` |
| `POST` | `/weight-logs` | `weight`, `date`, optional `unit`, `notes` | New weight log |
| `POST` | `/images/upload` | `content_type`, optional `file_name`, `log_id` | S3 presigned POST payload |
| `GET` | `/images/download?key=...` | `key` query | Presigned download URL |

### Authentication

- Auth system: Amazon Cognito user pool created in [`backend/serverless.yml`](../backend/serverless.yml).
- Username/login mechanism: email.
- Sign-up flow: sign up, confirm email code, then create profile.
- Tokens: backend accepts `Authorization: Bearer <access_token>`.
- Current repo config source: [`mobile_app/aws_config.txt`](../mobile_app/aws_config.txt)
  - API URL: `https://9mx7n208r4.execute-api.us-east-1.amazonaws.com/dev`
  - Region: `us-east-1`
  - User Pool ID: `us-east-1_9oB0rSPXl`
  - App Client ID: `72acnibcmssmo45om6h19vmrpd`

### ML / File Upload Notes

- File upload is real and backend-backed through the S3 presign endpoints above.
- The repo contains a calorie prediction service in [`models/calorie prediction/google colab/test/predict_server.py`](../models/calorie%20prediction/google%20colab/test/predict_server.py).
- That ML service is **not** wired into the deployed serverless backend today.
- The web app supports it as an **optional** extra integration via `VITE_ML_API_URL`.
- The predictor returns **kcal per 100g**, so the meal form labels that clearly.

## Web App Features

- Cognito sign up, confirmation, sign in, and sign out
- Protected routes with token refresh
- Dashboard with daily totals, meal breakdown, week calorie chart, and recent weight trend
- Meal logging with real API calls and optional S3 image upload
- Meal edit flow implemented as create-new + delete-old because the current backend has add/delete but no update route
- Progress page for logging weight and reviewing stats/history
- Profile page for creating or updating goal-related user data

## Local Setup

### 1. Create env file

```powershell
Copy-Item .env.example .env.local
```

Update values in `.env.local` if your deployed backend or Cognito config differs.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Vite should start on a local URL such as `http://127.0.0.1:5173/` or the next free port.

### 4. Production build

```bash
npm run build
```

## Optional Local ML Predictor

If you want calorie estimation in the meal form:

1. Go to `models/calorie prediction/google colab/test`
2. Install that folder's Python dependencies
3. Start the local FastAPI server:

```bash
python predict_server.py
```

4. Set `VITE_ML_API_URL=http://localhost:8000` in `.env.local`

## Important Behavior Notes

- The backend stores calories, not macronutrient totals, so the dashboard shows calorie and meal-type breakdowns rather than macro charts.
- Existing food log images are stored as URLs; the web app derives the S3 object key and requests a presigned download URL when it needs to display them.
- Because the backend has no update endpoint for food logs, editing is intentionally transparent about using replacement mode.

## Project Structure

```text
frontend_web/
  src/
    api/          Axios clients and backend adapters
    assets/       Static assets
    components/   Shared UI and layout pieces
    features/     Auth, dashboard, meals, progress, profile modules
    hooks/        Shared React hooks
    pages/        Route pages
    store/        Zustand auth state
    types/        TypeScript models
    utils/        Env, formatting, JWT helpers
```
