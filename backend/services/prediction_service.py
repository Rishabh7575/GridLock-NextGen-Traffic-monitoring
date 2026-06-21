import math
import time
from typing import Optional, Dict

import pandas as pd

from backend.schemas.prediction import PredictionRequest, PredictionResponse
from backend.services.artifact_loader import get_artifacts
from backend.core.logging import get_logger

logger = get_logger(__name__)

CLOSURE_THRESHOLD = 0.35

ENHANCED_CLOSURE_FEATURE_ORDER = [
    "corridor_encoded",
    "event_cause_encoded",
    "vehicle_type_encoded",
    "hour_of_day",
    "day_of_week",
    "month",
    "hour_sin",
    "hour_cos",
    "is_high_priority_corridor",
    "is_non_corridor",
    "has_vehicle_type",
    "has_zone",
    "police_station_encoded",
    "zone_encoded",
    "is_peak_hour",
    "is_weekend",
    "is_night",
    "cause_corridor_key_freq",
    "cause_priority_key_freq",
    "cause_closure_rate",
    "corridor_closure_rate",
    "cause_corridor_closure_rate"
]

NEW_PRIORITY_FEATURE_ORDER = [
    "event_cause_encoded",
    "vehicle_type_encoded",
    "hour_of_day",
    "day_of_week",
    "month",
    "hour_sin",
    "hour_cos",
    "description_char_count",
    "has_fatal_keyword",
    "has_collision_keyword",
    "has_injury_keyword",
    "has_ambulance_keyword",
    "has_blocked_keyword",
    "has_multi_vehicle_keyword",
    "emergency_keyword_count",
    "cause_median_duration",
    "cause_vehicle_median_duration",
    "closure_probability"
]

HIGH_PRIORITY_CORRIDORS = frozenset([
    "Mysore Road", "Bellary Road 1", "Bellary Road 2", "Tumkur Road",
    "Hosur Road", "ORR North 1", "ORR North 2", "ORR East 1",
    "ORR East 2", "Magadi Road", "Old Madras Road", "Bannerghatta Road",
    "West of Chord Road", "CBD 2", "ORR West 1", "ORR West 2",
])

def _safe_encode(encoders: dict, col: str, value: Optional[str]) -> int:
    if value is None or str(value).strip().lower() in ("", "null", "nan", "none"):
        return -1
    le = encoders.get(col)
    if le is None:
        return -1
    try:
        return int(le.transform([str(value)])[0])
    except ValueError:
        return -1

def run_prediction(req: PredictionRequest) -> PredictionResponse:
    t0 = time.perf_counter()
    import re
    arts = get_artifacts()

    corridor = req.corridor
    is_non_corridor = int(not corridor or str(corridor).strip().lower() in ("non-corridor", "", "null", "nan"))
    is_high_priority_corridor = int(corridor.strip() in HIGH_PRIORITY_CORRIDORS) if not is_non_corridor else 0

    hour_sin = math.sin(2 * math.pi * req.hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * req.hour_of_day / 24)
    
    # Month is not provided in PredictionRequest, assume default 6 for testing
    month = 6 

    if not arts.all_core_loaded:
        logger.warning("Artifacts not ready — serving mock prediction")
        return PredictionResponse(
            closure_probability=0.08,
            closure_flag=False,
            priority_probability=0.20,
            predicted_priority="Low",
            disagreement_flag=False,
            disagreement_reason=None,
            predicted_duration_mins=45.0,
            duration_bucket="short",
            duration_p25=15.0,
            duration_p75=90.0,
            model_versions={"closure_model": "mock", "priority_model": "mock"},
            inference_ms=int((time.perf_counter() - t0) * 1000)
        )

    # Recreate the 22 enhanced features for the closure model
    # Frequency
    cause_corridor_key = f"{req.event_cause or '__MISSING__'}_{corridor or '__MISSING__'}"
    cause_priority_key = f"{req.event_cause or '__MISSING__'}_high"
    
    cc_key_freq = arts.closure_lookups["freq_lookups"]["cause_corridor_key_freq"].get(cause_corridor_key, 0.0)
    cp_key_freq = arts.closure_lookups["freq_lookups"]["cause_priority_key_freq"].get(cause_priority_key, 0.0)

    # Target encodings
    global_closure_rate = arts.closure_lookups["global_closure_rate"]
    cause_closure_rate = arts.closure_lookups["te_lookups"]["cause_closure_rate"].get(req.event_cause, global_closure_rate)
    corridor_closure_rate = arts.closure_lookups["te_lookups"]["corridor_closure_rate"].get(corridor, global_closure_rate)
    cause_corridor_closure_rate = arts.closure_lookups["te_lookups"]["cause_corridor_closure_rate"].get(cause_corridor_key, global_closure_rate)

    is_peak_hour = int((8 <= req.hour_of_day <= 10) or (17 <= req.hour_of_day <= 20))
    is_weekend = int(req.day_of_week in (5, 6))
    is_night = int(req.hour_of_day >= 22 or req.hour_of_day <= 5)

    closure_feature_dict = {
        # Base features
        "corridor_encoded": _safe_encode(arts.encoders, "corridor", corridor) if arts.all_core_loaded else -1,
        "event_cause_encoded": _safe_encode(arts.encoders, "event_cause", req.event_cause) if arts.all_core_loaded else -1,
        "vehicle_type_encoded": _safe_encode(arts.encoders, "vehicle_type", req.vehicle_type) if arts.all_core_loaded else -1,
        "hour_of_day": req.hour_of_day,
        "day_of_week": req.day_of_week,
        "month": month,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "is_high_priority_corridor": is_high_priority_corridor,
        "is_non_corridor": is_non_corridor,
        "has_vehicle_type": int(req.vehicle_type is not None and req.vehicle_type != ""),
        "has_zone": 0,
        
        # Enhanced features
        "police_station_encoded": -1,
        "zone_encoded": -1,
        "is_peak_hour": is_peak_hour,
        "is_weekend": is_weekend,
        "is_night": is_night,
        "cause_corridor_key_freq": cc_key_freq,
        "cause_priority_key_freq": cp_key_freq,
        "cause_closure_rate": cause_closure_rate,
        "corridor_closure_rate": corridor_closure_rate,
        "cause_corridor_closure_rate": cause_corridor_closure_rate
    }

    # Closure Prediction
    X_closure = pd.DataFrame([[closure_feature_dict[c] for c in ENHANCED_CLOSURE_FEATURE_ORDER]], columns=ENHANCED_CLOSURE_FEATURE_ORDER)
    closure_prob = float(arts.closure_model.predict_proba(X_closure)[0][1])
    closure_flag = closure_prob >= CLOSURE_THRESHOLD

    # Recreate narrative/NLP features for priority model
    description = req.description or ""
    description_char_count = len(description)

    has_fatal = int(bool(re.search('fatal|casualty|death|dead|killed|die', description, re.IGNORECASE)))
    has_collision = int(bool(re.search('collision|accident|crash|hit|rammed|wrecked|collided', description, re.IGNORECASE)))
    has_injury = int(bool(re.search('injury|injured|hurt|bleed|bleeding|wound', description, re.IGNORECASE)))
    has_ambulance = int(bool(re.search('ambulance|hospital|paramedic|medic', description, re.IGNORECASE)))
    has_blocked = int(bool(re.search('blocked|block|obstruction|obstructed|closed|closure|jammed|jam', description, re.IGNORECASE)))
    has_multi_vehicle = int(bool(re.search('multi-vehicle|multiple vehicle|chain reaction|pileup|pile-up|collision of|collided with', description, re.IGNORECASE)))
    emergency_keyword_count = has_fatal + has_collision + has_injury + has_ambulance + has_blocked + has_multi_vehicle

    # Historical severity duration medians
    global_median = arts.priority_lookups.get("global_median", 45.0)
    cause_median_duration = arts.priority_lookups.get("cause_medians", {}).get(req.event_cause, global_median)
    
    cv_key = f"{req.event_cause}||{req.vehicle_type}"
    cause_vehicle_median_duration = arts.priority_lookups.get("cause_vehicle_medians", {}).get(cv_key, cause_median_duration)

    priority_feature_dict = {
        "event_cause_encoded": _safe_encode(arts.encoders, "event_cause", req.event_cause) if arts.all_core_loaded else -1,
        "vehicle_type_encoded": _safe_encode(arts.encoders, "vehicle_type", req.vehicle_type) if arts.all_core_loaded else -1,
        "hour_of_day": req.hour_of_day,
        "day_of_week": req.day_of_week,
        "month": month,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "description_char_count": description_char_count,
        "has_fatal_keyword": has_fatal,
        "has_collision_keyword": has_collision,
        "has_injury_keyword": has_injury,
        "has_ambulance_keyword": has_ambulance,
        "has_blocked_keyword": has_blocked,
        "has_multi_vehicle_keyword": has_multi_vehicle,
        "emergency_keyword_count": emergency_keyword_count,
        "cause_median_duration": cause_median_duration,
        "cause_vehicle_median_duration": cause_vehicle_median_duration,
        "closure_probability": closure_prob
    }

    # Priority Prediction
    X_priority = pd.DataFrame([[priority_feature_dict[c] for c in NEW_PRIORITY_FEATURE_ORDER]], columns=NEW_PRIORITY_FEATURE_ORDER)
    priority_prob = float(arts.priority_model.predict_proba(X_priority)[0][1])
    predicted_priority = "High" if priority_prob >= 0.35 else "Low"

    # Disagreement
    disagreement_flag = bool(is_non_corridor and predicted_priority == "High")
    disagreement_reason = "This incident is off the named corridors. The current system defaults these to Low priority. Our model predicts High based on cause, vehicle type, and time pattern." if disagreement_flag else None

    # Duration
    duration_rec = arts.duration_lookup.get(req.event_cause) or arts.duration_lookup.get("__default__", {"median": 45.0, "p25": 15.0, "p75": 90.0})
    predicted_duration_mins = float(duration_rec.get("median", 45.0))
    duration_p25 = float(duration_rec.get("p25", 15.0))
    duration_p75 = float(duration_rec.get("p75", 90.0))
    
    duration_bucket = "short"
    if predicted_duration_mins > 120:
        duration_bucket = "long"
    elif predicted_duration_mins > 60:
        duration_bucket = "medium"

    inference_ms = int((time.perf_counter() - t0) * 1000)

    return PredictionResponse(
        closure_probability=round(closure_prob, 4),
        closure_flag=closure_flag,
        priority_probability=round(priority_prob, 4),
        predicted_priority=predicted_priority,
        disagreement_flag=disagreement_flag,
        disagreement_reason=disagreement_reason,
        predicted_duration_mins=predicted_duration_mins,
        duration_bucket=duration_bucket,
        duration_p25=duration_p25,
        duration_p75=duration_p75,
        model_versions={"closure_model": "v1.0", "priority_model": "v1.0"},
        inference_ms=inference_ms
    )