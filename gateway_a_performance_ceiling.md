# Gateway A: Realistic Performance Ceiling Evaluation

This document evaluates the machine learning models, statistical predictors, and risk indexes classified under Gateway A (Operational Intelligence and key forecasting components). The goal is to identify which models have the highest performance potential and which are limited by data quality or label noise.

---

## Performance Ceiling Summary Matrix

| Feature / Model | Current Metric Quality | Feature Quality | Label Quality | Estimated Performance Ceiling | Potential Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Closure Prediction** | ROC-AUC: `0.720` – `0.761` | Medium-High | High (Objective) | ROC-AUC: `0.82` – `0.85` | **High Potential** |
| **2. Priority Prediction** | ROC-AUC: `0.315` – `0.536` | Low-Medium | Very Low (Biased) | ROC-AUC: `0.60` – `0.65` | **Low Potential** |
| **3. Blackspot Classification** | N/A (Analytical Index) | High (Aggregated) | N/A (Rule-based) | N/A (100% consistent) | **Medium Potential** |
| **4. Corridor Risk Classification** | N/A (Analytical Index) | Medium (Biased weights) | N/A (Rule-based) | N/A (Vulnerable to noise)| **Low Potential** |
| **5. Junction Incident Forecasting** | Prophet MAE-validated | Low-Medium | High (Auto-logged) | MAE reduction of 20–30% | **Medium Potential** |

---

## Detailed Model Evaluations

### 1. Closure Prediction (Road Closure Predictor)
* **Current Metrics:**
  * XGBoost Binary Classifier: ROC-AUC ranges from **`0.720`** (baseline features) to **`0.761`** (with station-level concurrency features).
  * Precision: `0.34` | Recall: `0.36` (at `0.35` decision threshold).
* **Feature Quality:**
  * **Medium-High:** Structural inputs like `event_cause`, `vehicle_type`, `hour_of_day`, and `day_of_week` provide strong contextual signals. The addition of station loads adds network concurrency awareness. However, it lacks real-time variables such as active lane blockages, physical road width, or current traffic volume.
* **Label Quality:**
  * **High:** Physical road closures are typically logged objectively by operators since they have clear operational consequences (dispatching barriers, redirecting routes).
* **Estimated Maximum Achievable Performance:**
  * **ROC-AUC: `0.82` – `0.85`**
  * By incorporating high-fidelity features (such as live weather precipitation rates, lane configurations, and incident location distance to nearby intersections), the classification boundary can be separated much more clearly.
* **Potential Classification:** **High Potential**

---

### 2. Priority Prediction (Incident Priority Classifier)
* **Current Metrics:**
  * Balanced Random Forest / XGBoost: ROC-AUC ranges from **`0.315`** to **`0.536`**.
  * Shows severe "majority-class collapse." The model achieves a deceptively high F1 score (`0.76`) by predicting almost all incidents as "High Priority," resulting in near-zero True Negatives.
* **Feature Quality:**
  * **Low-Medium:** Normal incident descriptors are insufficient to determine severity without emergency telemetry (e.g., casualty counts, fire involvement, vehicle crash severity indices).
* **Label Quality:**
  * **Very Low:** Historically, dispatchers heavily over-logged incidents as "High Priority" on major corridors to trigger faster resource deployment. This created a noisy ground truth where priority represents location importance rather than actual incident severity.
* **Estimated Maximum Achievable Performance:**
  * **ROC-AUC: `0.60` – `0.65`**
  * Without auditing the historical labels or introducing a clean, rules-based priority definition, the model cannot distinguish true severity from reporting bias.
* **Potential Classification:** **Low Potential**

---

### 3. Blackspot Risk Classification
* **Current Metrics:**
  * Analytical Score formula: `(total_incidents * 0.4) + (recurrence_weeks * 3) + (closures * 5) + (high_priority_count * 0.3)`.
  * Results are binned into tiers (`Monitored`, `At Risk`, `Critical`, `Chronic`).
* **Feature Quality:**
  * **High:** Features are aggregated from historical data, reflecting incident volume and repeat behaviors.
* **Label Quality:**
  * **N/A (Rule-based):** The classification is determined by a deterministic score rather than an ML loss function.
* **Estimated Maximum Achievable Performance:**
  * **100% computational consistency.** Its accuracy as a planning index is limited only by missing/under-reported historical incident logs.
* **Potential Classification:** **Medium Potential**

---

### 4. Corridor Risk Classification
* **Current Metrics:**
  * Deterministic formula: `0.5 * (high_priority_rate * 100) + 0.3 * (closure_rate * 100) + 0.2 * min(total_incidents / 10, 100)`.
* **Feature Quality:**
  * **Medium:** Highly dependent on aggregated rates of closure and priority.
* **Label Quality:**
  * **N/A (Rule-based).**
* **Estimated Maximum Achievable Performance:**
  * **Low Predictive Accuracy:** Because the index assigns 50% weight to `high_priority_rate`, it is directly contaminated by the priority logging bias. A corridor with low-severity incidents that are frequently flagged as high priority will be scored as high risk.
* **Potential Classification:** **Low Potential**

---

### 5. Junction Incident Forecasting (Prophet time-series)
* **Current Metrics:**
  * Prophet models trained hourly per junction (junctions with $\ge 15$ incidents). Holds out 14 days for MAE verification.
* **Feature Quality:**
  * **Low-Medium:** Only fits univariate time-series timestamps (`ds` and `y`). It lacks exogenous regressors such as rain volume, weekend public gatherings, or planned corridor construction.
* **Label Quality:**
  * **High:** Timestamps for incident starts are logged automatically by the CAD (Computer-Aided Dispatch) database.
* **Estimated Maximum Achievable Performance:**
  * **MAE Reduction of 20% – 30%**
  * Introducing weather forecasts, school holiday tables, and major events calendars as exogenous regressors (Prophet `add_regressor`) will significantly reduce time-series errors on outlier days.
* **Potential Classification:** **Medium Potential**
