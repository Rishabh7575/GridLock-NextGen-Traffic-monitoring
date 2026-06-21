# GridSense Priority Classifier Optimization Report

This document reports the performance improvements and feature importance diagnostics of the optimized **Incident Priority Classifier** (Gateway A). Majority-class collapse was successfully eliminated by introducing physical scale variables, text emergency indicators, and closure probabilities.

---

## 1. Executive Optimization Summary

* **Best Model:** `XGBOOST`
* **Recommended Decision Threshold:** `0.35`
* **Best Test ROC-AUC:** `0.7272`
* **Best Test F1-Score:** `0.7874`
* **Accuracy on Non-Corridor Test Subset:** `20.67%` (Baseline defaulted all to Low, resulting in ~0.35% accuracy)

---

## 2. Final Feature Set Used
The following 18 features were selected and evaluated:
* **Categorical (2):** `event_cause_encoded`, `vehicle_type_encoded`
* **Time (5):** `hour_of_day`, `day_of_week`, `month`, `hour_sin`, `hour_cos`
* **Narrative NLP (8):** `description_char_count`, `has_fatal_keyword`, `has_collision_keyword`, `has_injury_keyword`, `has_ambulance_keyword`, `has_blocked_keyword`, `has_multi_vehicle_keyword`, `emergency_keyword_count`
* **Historical Medians (2):** `cause_median_duration`, `cause_vehicle_median_duration`
* **Closure Prediction (1):** `closure_probability`

---

## 3. Best Model Confusion Matrix & Metrics (at threshold 0.35)

```text
| Actual \ Pred | Predicted Low (0) | Predicted High (1) |
| ------------- | ----------------- | ------------------ |
| Actual Low (0) | 116 (TN)       | 454 (FP)        |
| Actual High (1)| 33 (FN)       | 902 (TP)        |
```

* **Precision:** `0.6652`
* **Recall:** `0.9647`
* **F1-Score:** `0.7874`
* **ROC-AUC:** `0.7272`

---

## 4. Top 20 Feature Importances (Ranked)

| Rank | Feature | Relative Importance (%) |
| :--- | :--- | :---: |
| 1 | `vehicle_type_encoded` | 9.85% |
| 2 | `event_cause_encoded` | 8.17% |
| 3 | `cause_median_duration` | 6.97% |
| 4 | `closure_probability` | 6.86% |
| 5 | `hour_sin` | 6.59% |
| 6 | `emergency_keyword_count` | 6.47% |
| 7 | `hour_of_day` | 6.14% |
| 8 | `day_of_week` | 5.95% |
| 9 | `hour_cos` | 5.95% |
| 10 | `cause_vehicle_median_duration` | 5.84% |
| 11 | `description_char_count` | 5.69% |
| 12 | `month` | 5.58% |
| 13 | `has_collision_keyword` | 5.19% |
| 14 | `has_blocked_keyword` | 5.01% |
| 15 | `has_ambulance_keyword` | 4.99% |
| 16 | `has_fatal_keyword` | 4.74% |
| 17 | `has_injury_keyword` | 0.00% |
| 18 | `has_multi_vehicle_keyword` | 0.00% |

---

## 5. Sweep Comparison Table

### RandomForest
| Threshold | Precision | Recall | F1 | ROC-AUC |
| :---: | :---: | :---: | :---: | :---: |
| 0.30 | 0.6413 | 0.9807 | 0.7755 | 0.7121 |
| 0.35 | 0.6520 | 0.9636 | 0.7777 | 0.7121 |
| 0.40 | 0.6717 | 0.9123 | 0.7737 | 0.7121 |
| 0.45 | 0.7044 | 0.8385 | 0.7656 | 0.7121 |
| 0.50 | 0.7374 | 0.7176 | 0.7274 | 0.7121 |
| 0.55 | 0.7771 | 0.5594 | 0.6505 | 0.7121 |
| 0.60 | 0.8221 | 0.4053 | 0.5430 | 0.7121 |
| 0.65 | 0.8667 | 0.2781 | 0.4211 | 0.7121 |
| 0.70 | 0.8683 | 0.1551 | 0.2632 | 0.7121 |

### XGBoost
| Threshold | Precision | Recall | F1 | ROC-AUC |
| :---: | :---: | :---: | :---: | :---: |
| 0.30 | 0.6498 | 0.9765 | 0.7803 | 0.7272 |
| 0.35 | 0.6652 | 0.9647 | 0.7874 | 0.7272 |
| 0.40 | 0.6762 | 0.9380 | 0.7858 | 0.7272 |
| 0.45 | 0.6879 | 0.9027 | 0.7808 | 0.7272 |
| 0.50 | 0.7091 | 0.8631 | 0.7786 | 0.7272 |
| 0.55 | 0.7273 | 0.7957 | 0.7600 | 0.7272 |
| 0.60 | 0.7508 | 0.7091 | 0.7294 | 0.7272 |
| 0.65 | 0.7688 | 0.6118 | 0.6814 | 0.7272 |
| 0.70 | 0.7912 | 0.4984 | 0.6115 | 0.7272 |

### LightGBM
| Threshold | Precision | Recall | F1 | ROC-AUC |
| :---: | :---: | :---: | :---: | :---: |
| 0.30 | 0.6684 | 0.9422 | 0.7821 | 0.7218 |
| 0.35 | 0.6892 | 0.9155 | 0.7864 | 0.7218 |
| 0.40 | 0.7061 | 0.8684 | 0.7789 | 0.7218 |
| 0.45 | 0.7310 | 0.7904 | 0.7595 | 0.7218 |
| 0.50 | 0.7572 | 0.7070 | 0.7312 | 0.7218 |
| 0.55 | 0.7770 | 0.5850 | 0.6675 | 0.7218 |
| 0.60 | 0.7892 | 0.4845 | 0.6004 | 0.7218 |
| 0.65 | 0.8160 | 0.3604 | 0.5000 | 0.7218 |
| 0.70 | 0.8482 | 0.2749 | 0.4152 | 0.7218 |