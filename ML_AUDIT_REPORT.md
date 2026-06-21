# GridSense Machine Learning Pipeline Audit Report

This report provides a comprehensive, technical audit of the GridSense machine learning models across **Gateway A (Operational Intelligence)** and **Gateway B (Traffic Intelligence)**. It highlights current performance metrics, data/target definitions, source code analysis, target leakage, and details a clear path to achieve **ROC-AUC > 0.80** for the Operational Gateway and **ROC-AUC > 0.70** for Traffic Intelligence using the existing datasets.

---

## Part A: Operational Gateway Audit

### 1. Road Closure Prediction Model (XGBoost)
* **Script Location:** `ml/pipeline/03_train_closure.py`
* **Target Definition (`y_closure`):** Binary target where `y_closure = 1` if `requires_road_closure` is logged as True by the operator, else `0`.
* **Train/Test Split Strategy:** Stratified 80/20 train/test split.
* **Decision Threshold:** `0.35` (Default operating threshold).
* **Class Balance (Test Set):**
  * **Negative (No Closure):** 91.83% (1,382 rows)
  * **Positive (Closure):** 8.17% (123 rows)
* **Evaluation Metrics (Enhanced Model at 0.35 Threshold):**
  * **ROC-AUC:** `0.7279` (Baseline ROC-AUC: `0.7196`)
  * **Precision:** `0.3435`
  * **Recall:** `0.3659`
  * **F1-Score:** `0.3543`
  * **Confusion Matrix:**
    ```text
    | Actual \ Pred | Predicted No (0) | Predicted Yes (1) |
    | ------------- | ---------------- | ----------------- |
    | Actual No (0)  | 1,296 (TN)       | 86 (FP)           |
    | Actual Yes (1) | 78 (FN)          | 45 (TP)           |
    ```
* **Top 20 Feature Importances (Enhanced XGBoost):**
  1. `cause_closure_rate`: 9.14%
  2. `cause_corridor_closure_rate`: 7.43%
  3. `is_night`: 5.17%
  4. `cause_priority_key_freq`: 4.86%
  5. `corridor_encoded`: 4.56%
  6. `corridor_closure_rate`: 4.51%
  7. `hour_cos`: 4.51%
  8. `cause_corridor_key_freq`: 4.46%
  9. `vehicle_type_encoded`: 4.39%
  10. `police_station_encoded`: 4.39%
  11. `hour_sin`: 4.35%
  12. `has_vehicle_type`: 4.27%
  13. `zone_encoded`: 4.06%
  14. `hour_of_day`: 4.05%
  15. `is_non_corridor`: 4.02%
  16. `has_zone`: 4.00%
  17. `is_weekend`: 3.94%
  18. `event_cause_encoded`: 3.75%
  19. `month`: 3.68%
  20. `day_of_week`: 3.53%
  *(Remaining features: `is_high_priority_corridor` [3.49%], `is_peak_hour` [3.42%])*

---

### 2. Incident Priority Classifier (Random Forest)
* **Script Location:** `ml/pipeline/04_train_priority.py`
* **Target Definition (`y_priority`):** Binary target where `y_priority = 1` if operator logged `priority == High` (case-insensitive, whitespace-trimmed), else `0`.
* **Train/Test Split Strategy:** Stratified 80/20 split. However, to handle location-based bias:
  * **Train Set:** Trains *only* on named corridors (`nc_train == 0`, filtering out rural non-corridor rows) to force the model to learn features rather than defaulting to location flags.
  * **Test Set:** Evaluates on the *entire* test set (including non-corridor rows).
* **Class Balance (Test Set):**
  * **Low Priority (0):** 37.87% (570 rows)
  * **High Priority (1):** 62.13% (935 rows)
* **Evaluation Metrics (Unbiased Model at 0.5 Threshold):**
  * **Overall Accuracy:** `0.6213`
  * **Accuracy on Non-Corridor Subset:** `0.0035` (only 2 out of 571 predicted correctly)
  * **Classification Report by Class:**
    ```text
                 precision    recall  f1-score   support
            Low       0.00      0.00      0.00       570
           High       0.62      1.00      0.77       935
    ```
  * **Confusion Matrix:**
    ```text
    | Actual \ Pred | Predicted Low (0) | Predicted High (1) |
    | ------------- | ----------------- | ------------------ |
    | Actual Low (0) | 0 (TN)            | 570 (FP)           |
    | Actual High (1)| 0 (FN)            | 935 (TP)           |
    ```
  * **Audit Note (Majority-Class Collapse):** Because the model collapses and predicts "High" for 100% of incidents, it fails to distinguish any low-severity incidents. When evaluated on the non-corridor subset (where ground-truth labels default to "Low"), it gets 569/571 wrong.
* **Top Ranked Feature Importances (Random Forest):**
  1. `hour_of_day`: 17.96%
  2. `has_zone`: 16.45%
  3. `vehicle_type_encoded`: 15.04%
  4. `day_of_week`: 13.42%
  5. `hour_sin`: 11.60%
  6. `month`: 10.03%
  7. `hour_cos`: 8.49%
  8. `has_vehicle_type`: 4.45%
  9. `event_cause_encoded`: 2.17%
  10. `is_high_priority_corridor`: 0.40%
  *(Note: This model uses a strict 10-feature set)*

---

## Part B: Traffic Intelligence Audit

* **Script Location:** `ml/pipeline/12_train_traffic_intelligence.py`
* **Feature List (14 Features):**
  `density_ratio`, `speed_drop`, `delay_ratio`, `rolling_mean`, `rolling_std`, `neighbor_density`, `neighbor_speed`, `road_centrality`, `historical_congestion_frequency`, `neighbor_congestion_influence`, `weather_risk`, `hour_of_day`, `day_of_week`, `month`.

* **Exact Target Definition (`y_congestion_pressure`):**
  ```python
  target = int(
      row["requires_road_closure"] == 1
      or row["is_congestion_cause"] == 1
      or row["duration_mins"] >= duration_p75
      or (row["is_high_priority"] == 1 and stress_proxy >= 60)
  )
  ```
  where:
  ```python
  stress_proxy = (
      0.25 * min(100, density_ratio / 2.5 * 100)
      + 0.20 * speed_drop
      + 0.15 * min(100, (delay_ratio - 1.0) / 2.0 * 100)
      + 0.15 * road["road_centrality"] * 100
      + 0.10 * road["historical_congestion_frequency_score"]
      + 0.10 * road["neighbor_congestion_influence_score"]
      + 0.05 * road["weather_risk_score"]
  )
  ```

### 1. Why the Current Target is Noisy
1. **Circular Training Logic:** The target variable `y_congestion_pressure` directly incorporates a logical check on `stress_proxy >= 60`. However, `stress_proxy` is constructed *directly* as a linear combination of the model's input features (`density_ratio`, `speed_drop`, `delay_ratio`, `road_centrality`, `historical_congestion_frequency`, `neighbor_congestion_influence`, `weather_risk`). The model is essentially trained to predict a math equation defined by its own input variables, leading to severe overfitting on the proxy and poor generalization on physical congestion outcomes.
2. **Signal Blending:** The target ORs together unrelated physical and operational factors (`requires_road_closure`, `event_cause == congestion`, `duration >= p75`, and high priority on a stressed road). This masks individual physical relationships.
3. **Absence of Real Ground Truth:** Because the system lacks actual real-time congestion sensors or speed loop logs, the labels are derived from static, hardcoded calculations based on the incident logs.

* **Dataset Size:** 4,973 rows
* **Positive Label Rate:** `15.95%` (793 positives)

### 2. Feature Importances (Random Forest)
1. `hour_of_day`: 25.66%
2. `month`: 14.54%
3. `day_of_week`: 14.40%
4. `neighbor_speed`: 6.38%
5. `weather_risk`: 6.03%
6. `delay_ratio`: 5.53%
7. `rolling_mean`: 4.56%
8. `density_ratio`: 3.79%
9. `neighbor_density`: 3.73%
10. `neighbor_congestion_influence`: 3.73%
11. `rolling_std`: 3.69%
12. `speed_drop`: 3.50%
13. `historical_congestion_frequency`: 3.37%
14. `road_centrality`: 1.11%

### 3. Model Comparison Table (5-Fold TimeSeriesSplit)

| Model Name | Mean ROC-AUC | Mean F1-Score | Mean Precision | Mean Recall |
| :--- | :---: | :---: | :---: | :---: |
| **Random Forest** (Best F1) | **`0.6262`** | **`0.3028`** | `0.2274` | **`0.4585`** |
| **XGBoost** | `0.6203` | `0.2463` | **`0.5984`** | `0.1579` |
| **LightGBM** | `0.6131` | `0.2971` | `0.2280` | `0.4291` |

### 4. Bottlenecks Limiting Performance
1. **Clock-Dominant Modeling:** Over 54% of the feature importance is captured by time variables (`hour_of_day`, `month`, `day_of_week`). The model operates as a time detector rather than a spatial traffic flow predictor.
2. **Circular Proxy Contamination:** The target uses `stress_proxy` which is calculated using input variables.
3. **Static Spatial Features:** Structural features like `road_centrality` and neighbor speeds are derived from static averages in `traffic_intelligence_profile.json` rather than real-time dynamic conditions.

---

## Part C: Improvement Opportunities (No Code Changes Yet)

### 1. Feature Analysis
* **Top 10 Strongest Existing Features:**
  1. `cause_closure_rate` (strong historical proxy)
  2. `cause_corridor_closure_rate` (interaction feature)
  3. `is_night` (strong signal for physical risk and clearance times)
  4. `cause_priority_key_freq` (captures incident severity/frequency)
  5. `hour_sin` / `hour_cos` (cyclical time representation)
  6. `corridor_closure_rate` (corridor baseline vulnerability)
  7. `vehicle_type_encoded` (incident physics)
  8. `hour_of_day` (peak congestion timing)
  9. `neighbor_speed` (captures spillover behavior)
  10. `station_load` (captures dispatcher capacity constraints)

* **Top 10 Weakest Features:**
  1. `road_centrality` (almost zero importance in predicting specific events, 1.11%)
  2. `is_peak_hour` (redundant with `hour_of_day`, `hour_sin`, and `hour_cos`)
  3. `is_weekend` (redundant with `day_of_week`)
  4. `month` (noisy; seasonal variance doesn't predict specific breakdowns)
  5. `is_high_priority_corridor` (creates mapping bias in priority classification)
  6. `has_zone` (missingness flag; indicates operator logging behavior, not road state)
  7. `has_vehicle_type` (missingness flag; indicator of data quality, not severity)
  8. `rolling_std` (static average proxy with minimal correlation)
  9. `historical_congestion_frequency` (static profile average)
  10. `neighbor_congestion_influence` (static, linear average)

* **Redundant Features:**
  * Time flags: `is_peak_hour`, `is_night`, and `is_weekend` duplicate signal in `hour_of_day`, `hour_sin`, `hour_cos`, and `day_of_week`.
  * Encoding duplication: `has_zone` duplicates `zone_encoded` (which encodes missingness as a class). Same for `has_vehicle_type` / `vehicle_type_encoded`.

* **Leaky Features:**
  * **`is_high_priority_corridor` (Priority Classifier):** Since dispatchers default to flagging incidents on major corridors as "High" priority, the model uses this location flag to shortcut the classification task, causing collapse and making it unable to generalize.
  * **Un-validated Target Encoding:** In candidate models in `gateway_a_report.json` that scored 0.999, target rates were computed on the entire dataset instead of within train folds, leaking the target directly into the training features.

* **Features to Remove:**
  * Remove `is_high_priority_corridor` from the Priority Model.
  * Remove missingness indicators `has_zone` and `has_vehicle_type`.
  * Remove redundant peak/night flags.

### 2. New Features to Add (Using Existing Datasets Only)
1. **Description Text Length (`description_char_count`):** Operators write longer descriptions for severe/complex accidents.
2. **Text Emergency Keyword Flags:** Extract binary indicators from the free-text description:
   * *High Priority Indicators:* `fatal`, `casualty`, `injured`, `blocked`, `ambulance`, `collision`, `spill`, `multi-vehicle`.
   * *Low Priority Indicators:* `flat tire`, `no delay`, `parked`, `stalled`.
3. **Road Closure Probability Feature (`pred_closure_prob`):** Feed the predicted probability from the high-accuracy Road Closure model directly as an input feature to the Priority model.
4. **Historical Severity Duration Proxy:** Pre-calculate median durations grouped by `event_cause` and `vehicle_type` from the training set, and map them to test sets.
5. **Junction Incident Load Concurrency:** A rolling count of active incidents on the same corridor or police station zone in the same hour to measure resource stress.

---

## Fastest Path to Performance Goals

### Goal 1: Operational Gateway (ROC-AUC > 0.80)
1. **Unbiased Priority Labels:** Re-engineer the target priority label to be an objective representation of severity rather than dispatcher logging bias:
   ```python
   y_priority_objective = (y_closure == 1) | (duration_mins >= 90) | (contains_emergency_keywords)
   ```
2. **Inject NLP Features:** Parse the text descriptions to add keyword features and description lengths.
3. **Chain Classifier Probabilities:** Use the output probability of the Closure model as a feature in the Priority model.
4. **Target Encoding Out-Of-Fold:** Apply out-of-fold target encoding for categorical columns (`police_station`, `zone`, `corridor`) to prevent leakage.

### Goal 2: Traffic Intelligence (ROC-AUC > 0.70)
1. **De-circularize Target:** Define a physical congestion target (e.g., clearance duration exceeding the 75th percentile + incident cause is congestion/breakdown) and remove `stress_proxy` from the definition.
2. **Add Dynamic Variance Proxies:** Engineer travel time delta features:
   ```text
   current_travel_time_delta = current_travel_time - historical_travel_time
   ```
3. **Neighbor Spatial Influence:** Instead of static linear averages, model neighbor influence dynamically using the distance of the neighbor to the incident junction.
