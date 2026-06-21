# Incident Priority Classifier: Recovery & Class Separability Plan

This document details the diagnostic audit of the Incident Priority Classifier's majority-class collapse. It outlines how target leakage, logging bias, and weak features limit the current model's ROC-AUC (~0.50), and proposes a recovery plan to build a physically representative priority predictor.

---

## 1. Audit of Priority Labels (The Root Cause of Collapse)

### The Bias Issue
The current target label `y_priority` is derived directly from the operator-logged `priority` column:
```python
feat["y_priority"] = (df["priority"].str.strip().str.lower() == "high").astype(int)
```
In historical operations, dispatchers logged **62.12%** of all incidents as "High Priority". This was not driven by the physical severity of the events, but rather by operational incentives:
1. **Response Urgency:** Dispatchers logged incidents on main corridors as "High" to ensure police units arrived quickly, regardless of whether it was a minor vehicle breakdown or a major collision.
2. **Rural/Non-Corridor Neglect:** Incidents occurring outside major corridors (non-corridor events) defaulted to "Low" priority, creating a high level of under-reporting for off-corridor emergencies.

### The Training Bias Hook
To fix this, the current training script trains *only* on named corridors (`nc_train == 0`). However, because named corridors are highly congested, the majority of their logged events are still flagged as High Priority. Consequently:
* The model suffers from **majority-class collapse**, predicting "High" for nearly all incidents to minimize training loss.
* The test set still contains non-corridor incidents where the ground truth label is default "Low". When the model correctly predicts a severe accident on a non-corridor route as "High", it is flagged as a **False Positive** because the baseline labels default to Low.

---

## 2. Leakage & Weak Feature Audit

### Target Leakage
* **`is_high_priority_corridor`:** This feature is a direct leak of the historical logging policy. Because operators log high priority on high-priority corridors, the model uses this binary flag as a shortcut to predict "High," neglecting physical severity features.

### Weak/Noisy Features
* **`month`:** Seasonal month patterns have negligible correlation with whether a specific vehicle breakdown is severe.
* **`has_vehicle_type` & `has_zone`:** These are missingness flags (binary indicators of whether the operator filled in the field). They represent data logging discipline rather than incident severity.
* **Categorical Encodings (`event_cause_encoded`, `vehicle_type_encoded`):** These are too high-level. A `vehicle_breakdown` feature cannot distinguish between a minor flat tire and a jackknifed commercial truck blocking three lanes.

---

## 3. Recommended New Features for Class Separability

To help the model distinguish between high and low severity, we must engineer features that represent **physical impact and scale**:

1. **Predicted Road Closure Probability:**
   * Feed the output probability from the **Road Closure Predictor** (which has high label confidence) as a feature into the Priority Classifier. A high likelihood of road closure is a strong indicator of high priority.
2. **Text Description Length & Keyword Matching:**
   * Run basic string matching on the incident `description` field for emergency terms:
     * *High Severity Keywords:* `fatal`, `casualty`, `injured`, `ambulance`, `fire`, `oil spill`, `collision`, `blocked all lanes`.
     * *Low Severity Keywords:* `flat tire`, `parked`, `no delay`, `cleared`, `minor`.
   * Length of the description is also a proxy for severity (operators write longer notes for complex accidents).
3. **Historical Cause-Vehicle Duration Proxy:**
   * Compute a pre-calculated median clearance time for the specific combination of `event_cause` and `vehicle_type`. If historical breakdowns involving buses take 90 minutes to clear, the feature will flag a bus breakdown as high priority early.
4. **Lane Blockage Magnitude (if available):**
   * A numeric count of lanes affected or a categorical scale (`single_lane_blocked`, `all_lanes_blocked`).

---

## 4. Reconstructing an Unbiased Target Label

Since the operator-logged `priority` field is highly biased, tuning hyperparameters or changing models will not fix the issue. We propose reconstructing an **objective, rules-based priority target** for training:

```text
True_Severity_Priority = 1  IF:
  (requires_road_closure == True) OR
  (duration_mins > 90 minutes) OR
  (description contains critical keywords: "injured", "fatal", "fire", "blocked")
ELSE:
  True_Severity_Priority = 0
```

### Why this works:
* It anchors the target label to physical realities (road closures and long clearance times).
* It eliminates location-based logging bias, allowing the model to learn true severity features across both corridor and non-corridor zones.
* It resolves the majority-class collapse by balancing the label distribution around actual physical disruptions.
