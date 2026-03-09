# 🥗 FitTrack — Calorie Prediction Model

> Machine learning model trained on **USDA FoodData Central** to predict food calories (kcal per 100g) from food name and/or macronutrients. Served locally via a FastAPI REST API.

---

## 📊 Model Performance

| Metric | Value |
|--------|-------|
| Algorithm | ExtraTreesRegressor (scikit-learn) |
| Test MAE | **10.89 kcal** |
| Test R² | **0.9941** |
| Features | 33 |
| Prediction unit | kcal per 100g |
| Inference time | < 5ms |

---

## 📁 Project Structure

```
your-folder/
├── calorie_model.joblib          ← trained model
├── model_config.json             ← metadata (MAE, R², feature list)
├── tfidf_vectorizer.joblib       ← only needed if Ridge model was selected
├── predict_server.py             ← FastAPI local server
└── README.md
```

---

## 🗄️ Dataset

**Source:** [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets.html)

Three CSV files used during training:

| File | Contents | Size |
|------|----------|------|
| `food.csv` | Food names and IDs | ~15 MB |
| `food_nutrient.csv` | All nutrient values per food | ~3–5 GB |
| `nutrient.csv` | Nutrient definitions | < 1 MB |

> `food_nutrient.csv` is loaded in **chunks of 500k rows** to avoid RAM crashes — only the 8 required nutrient IDs are kept per chunk.

**Nutrients extracted:**

| Nutrient | USDA ID | Role |
|----------|---------|------|
| Energy (kcal) | 1008 | ✅ Target variable |
| Protein | 1003 | Feature |
| Total fat | 1004 | Feature |
| Carbohydrates | 1005 | Feature |
| Dietary fiber | 1079 | Feature |
| Total sugars | 2000 | Feature |
| Sodium | 1093 | Feature |
| Saturated fat | 1258 | Feature |

---

## 🔧 Feature Engineering

The model uses **33 features** built from the food name and macronutrient values.

### Group 1 — Raw Nutrients (8 features)
`protein_g`, `fat_g`, `carbs_g`, `fiber_g`, `sugar_g`, `sodium_mg`, `saturated_fat_g`, `calculated_calories`

> `calculated_calories` = protein×4 + fat×9 + carbs×4 (Atwater formula)

### Group 2 — Macro Ratios (5 features)

| Feature | Formula |
|---------|---------|
| `protein_ratio` | protein / (protein + fat + carbs) |
| `fat_ratio` | fat / (protein + fat + carbs) |
| `carb_ratio` | carbs / (protein + fat + carbs) |
| `fat_per_protein` | fat / (protein + 0.001) |
| `sugar_per_carb` | sugar / (carbs + 0.001) |

### Group 3 — Name Metadata (4 features)
`name_char_len`, `name_word_count`, `has_percentage` (contains `%`), `has_number` (contains a digit)

### Group 4 — Keyword Flags (16 binary features)

| Feature | Keywords |
|---------|----------|
| `is_fried` | fried, deep fried, crispy |
| `is_raw` | raw, fresh, uncooked |
| `is_baked` | baked, roasted, broiled, grilled |
| `is_sweet` | sugar, candy, cake, cookie, chocolate, syrup, honey |
| `is_dairy` | milk, cheese, butter, cream, yogurt |
| `is_meat` | beef, chicken, pork, turkey, lamb, fish, salmon, tuna, bacon |
| `is_vegetable` | broccoli, spinach, lettuce, carrot, celery, cucumber, tomato |
| `is_grain` | bread, rice, pasta, wheat, oat, flour, cereal |
| `is_nut` | almond, peanut, walnut, cashew, pistachio, nut |
| `is_oil` | oil, lard, shortening, margarine |
| `is_beverage` | juice, soda, drink, water, tea, coffee, beer, wine |
| `is_sauce` | sauce, gravy, dressing, mayo, ketchup, mustard |
| `is_fast_food` | burger, pizza, fries, hotdog, taco, sandwich |
| `is_diet` | diet, light, low fat, reduced, fat free, zero |
| `is_processed` | canned, frozen, instant, packaged |
| `is_whole` | whole, organic, natural, homemade |

---

## 🤖 Model Training

### Models Compared

| Model | Feature set | Notes |
|-------|-------------|-------|
| **ExtraTrees ✅ Winner** | Numeric | Best MAE, fastest |
| XGBoost | Numeric | 400 trees, lr=0.05 |
| LightGBM | Numeric | 400 trees, 63 leaves |
| RandomForest | Numeric | 200 trees, depth=12 |
| GradientBoosting | Numeric | 200 trees, lr=0.08 |
| Ridge + TF-IDF | Numeric + text | 3000 TF-IDF features |

### Split Strategy
- **70%** train / **15%** validation / **15%** test — random seed 42
- **5-fold cross-validation** on the winning model to confirm no overfitting
- **Final model** retrained on the full dataset before saving

### Why ExtraTrees?
ExtraTreesRegressor uses random thresholds at each split instead of finding the optimal one. This extra randomness reduces variance on large, clean, tabular datasets — exactly the shape of the USDA data.

---

## ⚙️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Training | Google Colab (T4 GPU, 12 GB RAM) |
| Data processing | pandas, numpy |
| ML framework | scikit-learn |
| Boosting comparison | XGBoost, LightGBM |
| Explainability | SHAP |
| Model serialization | joblib |
| API server | FastAPI + uvicorn |
| Text features | TF-IDF (sklearn) |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.9+
- The 3 model files from your Colab Drive output folder

### Step 1 — Download model files from Colab

Run this in your Colab notebook:

```python
from google.colab import files

files.download('/content/drive/MyDrive/calories prediction/output/calorie_model.joblib')
files.download('/content/drive/MyDrive/calories prediction/output/model_config.json')
files.download('/content/drive/MyDrive/calories prediction/output/tfidf_vectorizer.joblib')
```

### Step 2 — Install dependencies

```bash
pip install fastapi uvicorn joblib scikit-learn numpy scipy xgboost lightgbm
```

### Step 3 — Start the server

```bash
# Navigate to the folder containing your .joblib files
cd path/to/your/models/folder

# Start the API
python predict_server.py
```

Expected output:
```
Loading model...
  ✅ ExtraTreesRegressor  |  MAE: 10.89 kcal  |  expects 33 features
  ✅ Feature count verified: 33 == 33
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 4 — Verify

| URL | What you see |
|-----|-------------|
| http://localhost:8000 | Model info JSON |
| http://localhost:8000/docs | Interactive API explorer |
| http://localhost:8000/health | `{"status": "ok"}` |

---

## 📡 API Reference

### `GET /`
Returns model status and metadata.

```bash
curl http://localhost:8000/
```

```json
{
  "status": "running",
  "model": "ExtraTreesRegressor",
  "test_mae": 10.89,
  "test_r2": 0.9941,
  "features": 33
}
```

---

### `POST /predict-calories`

Predicts calories for a food item.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `food_name` | string | ✅ Yes | Name of the food |
| `protein_g` | float | No | Protein (g per 100g) |
| `fat_g` | float | No | Fat (g per 100g) |
| `carbs_g` | float | No | Carbohydrates (g per 100g) |
| `fiber_g` | float | No | Dietary fiber (g per 100g) |
| `sugar_g` | float | No | Total sugar (g per 100g) |
| `sodium_mg` | float | No | Sodium (mg per 100g) |
| `saturated_fat_g` | float | No | Saturated fat (g per 100g) |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `food_name` | string | Echo of the input |
| `predicted_calories` | float | Predicted kcal per 100g |
| `unit` | string | Always `"kcal per 100g"` |
| `macros_provided` | bool | True if any macro > 0 |
| `model_mae` | float | Model's mean absolute error |

---

## 🧪 Testing

### Name only (no macros)

```bash
curl -X POST http://localhost:8000/predict-calories \
  -H "Content-Type: application/json" \
  -d '{"food_name": "grilled chicken breast"}'
```

```json
{
  "food_name": "grilled chicken breast",
  "predicted_calories": 163.4,
  "unit": "kcal per 100g",
  "macros_provided": false,
  "model_mae": 10.89
}
```

### With macros (higher accuracy)

```bash
curl -X POST http://localhost:8000/predict-calories \
  -H "Content-Type: application/json" \
  -d '{
    "food_name": "banana raw",
    "protein_g": 1.1,
    "fat_g": 0.3,
    "carbs_g": 23.0
  }'
```

### Expected results for common foods

| Food | Macros provided | Actual kcal | Expected prediction |
|------|----------------|-------------|---------------------|
| Apple raw | Yes | 52 | 45–60 |
| Banana raw | Yes | 89 | 80–98 |
| Chicken breast cooked | Yes | 165 | 150–180 |
| Butter salted | Yes | 717 | 700–740 |
| Olive oil | Yes | 884 | 875–902 |
| Broccoli raw | Yes | 34 | 28–42 |
| Cheddar cheese | Yes | 403 | 380–425 |
| Fried chicken | No | ~260 | 200–320 |
| Chocolate cake | No | ~371 | 300–440 |

> **Accuracy with macros:** MAE ~10–15 kcal
> **Accuracy name only:** MAE ~40–80 kcal depending on food type

---

## 📱 Flutter Integration

### Point Flutter to local server

In `mobile_app/lib/services/api_service.dart`:

```dart
// Android emulator
const String _baseUrl = 'http://10.0.2.2:8000';

// iOS simulator
// const String _baseUrl = 'http://localhost:8000';

// Physical device — use your machine's local IP
// const String _baseUrl = 'http://192.168.1.XXX:8000';
```

Find your local IP:
```bash
ipconfig        # Windows
ifconfig        # Mac / Linux
```

### Add prediction method

```dart
Future<Map<String, dynamic>> predictCalories({
  required String foodName,
  double proteinG = 0,
  double fatG = 0,
  double carbsG = 0,
}) async {
  final headers = await _getHeaders();
  final response = await http.post(
    Uri.parse('$_baseUrl/predict-calories'),
    headers: headers,
    body: json.encode({
      'food_name': foodName,
      'protein_g': proteinG,
      'fat_g':     fatG,
      'carbs_g':   carbsG,
    }),
  );
  return _handleResponse(response);
}
```

---

## ☁️ AWS Deployment

When ready to move from local to production:

```bash
# 1 — Upload models to S3
aws s3 mb s3://fitness-tracker-mvp-models
aws s3 cp calorie_model.joblib    s3://fitness-tracker-mvp-models/
aws s3 cp model_config.json       s3://fitness-tracker-mvp-models/
aws s3 cp tfidf_vectorizer.joblib s3://fitness-tracker-mvp-models/

# 2 — Package Lambda
mkdir lambda_pkg
pip install joblib scikit-learn scipy numpy xgboost lightgbm -t lambda_pkg/
cp predict_calories_lambda.py lambda_pkg/predict_calories.py
cd lambda_pkg && zip -r ../predict.zip . && cd ..

# 3 — Deploy
aws lambda create-function \
  --function-name fittrack-predict-calories \
  --runtime python3.10 \
  --handler predict_calories.lambda_handler \
  --zip-file fileb://predict.zip \
  --timeout 30 --memory-size 512 \
  --environment Variables={MODEL_BUCKET=fitness-tracker-mvp-models}
```

Add to `serverless.yml`:

```yaml
predictCalories:
  handler: lambdas/predict_calories.lambda_handler
  memorySize: 512
  timeout: 30
  environment:
    MODEL_BUCKET: fitness-tracker-mvp-models
  events:
    - http:
        path: /predict-calories
        method: POST
        cors: true
```

---

## 🛠️ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `500 Internal Server Error` | Feature count mismatch | Check `GET /` — `features_match` must be `true` |
| `AssertionError` on startup | `build_features()` returns wrong count | Match function exactly to `numeric_features` in `model_config.json` |
| `ModuleNotFoundError: xgboost` | Package missing | `pip install xgboost lightgbm` |
| Connection refused on phone | Wrong IP | Use `10.0.2.2` for Android emulator, your machine's LAN IP for real device |
| Colab RAM crash | `food_nutrient.csv` loaded fully | Use chunked notebook + set runtime to **T4 GPU** (12 GB RAM) |
| Wrong predictions | Feature order mismatch | Feature order in `build_features()` must exactly match `config_feature_list` |
| `joblib.load` fails | scikit-learn version mismatch | `pip install scikit-learn==1.3.2` (same as Colab) |

### Verify feature alignment at any time

```bash
curl http://localhost:8000/

# Must show:
# "features_match": true
# "model_expects" == "code_builds"
```

### Check model_config.json

```bash
cat model_config.json
```

Key fields:

| Field | Description |
|-------|-------------|
| `model_type` | Algorithm name |
| `numeric_features` | Exact list of 33 features in exact order |
| `uses_tfidf` | If `true`, `tfidf_vectorizer.joblib` is required |
| `test_mae` | Model accuracy on held-out test set |
| `cv_mae_mean` | Cross-validation MAE mean |
| `cv_mae_std` | Cross-validation MAE standard deviation |

---

## 📈 Charts Generated by Colab Notebook

Saved to `My Drive/calories prediction/output/`:

| File | Content |
|------|---------|
| `distributions.png` | Histograms of all nutritional values |
| `correlation.png` | Pearson correlation heatmap between nutrients |
| `feature_insights.png` | Mean calories by food group + Atwater vs actual scatter |
| `model_comparison.png` | MAE / RMSE / R² bar chart for all 5 models |
| `evaluation_detail.png` | Predicted vs actual, residuals, error by calorie range |
| `feature_importance.png` | Top 20 features by importance score |
| `shap.png` | SHAP summary plot for model explainability |

---

*FitTrack Calorie Prediction — USDA FoodData Central — ExtraTreesRegressor — MAE 10.89 kcal*