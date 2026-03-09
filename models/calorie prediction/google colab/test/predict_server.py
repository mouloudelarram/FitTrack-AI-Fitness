import json
import re
import joblib
import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="FitTrack Calorie Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model ─────────────────────────────────────────────────────────────
print("Loading model...")
model  = joblib.load("calorie_model.joblib")
config = json.load(open("model_config.json"))
tfidf  = None
if config.get("uses_tfidf"):
    tfidf = joblib.load("tfidf_vectorizer.joblib")

print(f"  ✅ {config['model_type']}  |  MAE: {config['test_mae']} kcal  |  expects {model.n_features_in_} features")

# ── Keyword groups — must exactly match config_feature_list ───────────────
KEYWORD_GROUPS = {
    'is_fried':     ['fried', 'deep fried', 'crispy'],
    'is_raw':       ['raw', 'fresh', 'uncooked'],
    'is_baked':     ['baked', 'roasted', 'broiled', 'grilled'],
    'is_sweet':     ['sugar', 'candy', 'cake', 'cookie', 'chocolate', 'syrup', 'honey'],
    'is_dairy':     ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
    'is_meat':      ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'bacon'],
    'is_vegetable': ['broccoli', 'spinach', 'lettuce', 'carrot', 'celery', 'cucumber', 'tomato'],
    'is_grain':     ['bread', 'rice', 'pasta', 'wheat', 'oat', 'flour', 'cereal'],
    'is_nut':       ['almond', 'peanut', 'walnut', 'cashew', 'pistachio', 'nut'],
    'is_oil':       ['oil', 'lard', 'shortening', 'margarine'],
    'is_beverage':  ['juice', 'soda', 'drink', 'water', 'tea', 'coffee', 'beer', 'wine'],
    'is_sauce':     ['sauce', 'gravy', 'dressing', 'mayo', 'ketchup', 'mustard'],   # ← was missing
    'is_fast_food': ['burger', 'pizza', 'fries', 'hotdog', 'taco', 'sandwich'],
    'is_diet':      ['diet', 'light', 'low fat', 'reduced', 'fat free', 'zero'],
    'is_processed': ['canned', 'frozen', 'instant', 'packaged'],
    'is_whole':     ['whole', 'organic', 'natural', 'homemade'],                    # ← was missing
}

# ── Feature order must exactly match config_feature_list ──────────────────
# config_feature_list:
# protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg, saturated_fat_g,
# calculated_calories,                          ← was named 'atwater_cal' in old code
# protein_ratio, fat_ratio, carb_ratio,
# fat_per_protein, sugar_per_carb,
# name_char_len,                                ← was named 'name_len' in old code
# name_word_count,                              ← was named 'word_count' in old code
# has_percentage,                               ← was missing entirely
# has_number,
# is_fried ... is_whole  (16 keyword flags)

def build_features(name, protein_g=0, fat_g=0, carbs_g=0,
                   fiber_g=0, sugar_g=0, sodium_mg=0, saturated_fat_g=0):
    total              = (protein_g + fat_g + carbs_g) or 1
    calculated_calories = protein_g * 4 + fat_g * 9 + carbs_g * 4

    features = [
        protein_g,
        fat_g,
        carbs_g,
        fiber_g,
        sugar_g,
        sodium_mg,
        saturated_fat_g,
        calculated_calories,                        # was atwater_cal
        protein_g / total,                          # protein_ratio
        fat_g     / total,                          # fat_ratio
        carbs_g   / total,                          # carb_ratio
        fat_g     / (protein_g + 0.001),            # fat_per_protein
        sugar_g   / (carbs_g   + 0.001),            # sugar_per_carb
        len(name),                                  # name_char_len
        len(name.split()),                          # name_word_count
        int('%' in name),                           # has_percentage  ← was missing
        int(bool(re.search(r'\d', name))),          # has_number
    ]

    # 16 keyword flags — order must match config_feature_list exactly
    for keywords in KEYWORD_GROUPS.values():
        pattern = '|'.join(re.escape(k) for k in keywords)
        features.append(int(bool(re.search(pattern, name))))

    return np.array(features, dtype=np.float32).reshape(1, -1)


# ── Sanity check at startup ────────────────────────────────────────────────
_test = build_features("test")
assert _test.shape[1] == model.n_features_in_, \
    f"Feature mismatch: code builds {_test.shape[1]}, model expects {model.n_features_in_}"
print(f"  ✅ Feature count verified: {_test.shape[1]} == {model.n_features_in_}")


# ── Schemas ────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    food_name:       str
    protein_g:       Optional[float] = 0
    fat_g:           Optional[float] = 0
    carbs_g:         Optional[float] = 0
    fiber_g:         Optional[float] = 0
    sugar_g:         Optional[float] = 0
    sodium_mg:       Optional[float] = 0
    saturated_fat_g: Optional[float] = 0


# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":    "running",
        "model":     config["model_type"],
        "test_mae":  config["test_mae"],
        "test_r2":   config["test_r2"],
        "features":  model.n_features_in_,
    }


@app.post("/predict-calories")
def predict(req: PredictRequest):
    name = req.food_name.strip().lower()
    if not name:
        return JSONResponse(status_code=400, content={"error": "food_name is required"})

    X = build_features(
        name,
        req.protein_g, req.fat_g, req.carbs_g,
        req.fiber_g,   req.sugar_g, req.sodium_mg, req.saturated_fat_g
    )

    if config.get("uses_tfidf") and tfidf is not None:
        from scipy.sparse import hstack, csr_matrix
        X = hstack([tfidf.transform([name]), csr_matrix(X)]).toarray()

    predicted = float(np.clip(model.predict(X)[0], 0, 902))

    return {
        "food_name":          req.food_name,
        "predicted_calories": round(predicted, 1),
        "unit":               "kcal per 100g",
        "macros_provided":    req.protein_g > 0 or req.fat_g > 0 or req.carbs_g > 0,
        "model_mae":          config["test_mae"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)