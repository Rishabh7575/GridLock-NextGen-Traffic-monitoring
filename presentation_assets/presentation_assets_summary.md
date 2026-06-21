# GridSense Presentation Assets & Technical Reference Report

This document audits the generated visual assets, machine learning model performance, and integrated mathematical traffic models (formulae) used inside the GridSense architecture.

---

## 📸 Presentation Images Inventory

The following images have been generated and saved inside [presentation_assets/](file:///d:/Flipkart%20round%202/GridSense/presentation_assets/):

| Filename | Category | Description | Key UI Components |
| :--- | :--- | :--- | :--- |
| `architecture_diagram.png` | System | 1.1 Architecture Flow Diagram | Visualizes ingestion -> feature engineering -> ML Models Layer -> FastAPI -> Gateways A & B -> CommandCenter Maps. |
| `gateway_a_dashboard_home.png` | Gateway A | Operational Dashboard Home | Active dispatcher feed, incident list, real-time telemetry gauges, mini map. |
| `gateway_a_priority_prediction.png` | Gateway A | Priority Prediction Result | Side-by-side comparison (Historical vs. Unbiased AI) and "Bias-Correction" toggle. |
| `gateway_a_closure_prediction.png` | Gateway A | Closure Prediction Result | 78% road closure risk flashing indicator, preemptive diversion banner. |
| `gateway_a_duration_prediction.png` | Gateway A | Duration Prediction Result | Median & IQR clearance expectations (40-55 mins), factor breakdowns. |
| `gateway_a_forecast_chart.png` | Gateway A/B | Junction Incident Forecast | 72-hour interactive Prophet line graph, shaded confidence bands, surge dots. |
| `gateway_b_dashboard_home.png` | Gateway B | Traffic Intelligence Home | City GIS map with road stress coloring, shockwave count, domino simulation. |
| `gateway_b_road_stress.png` | Gateway B | Road Stress Indicator | Selected red corridor showing stress breakdown popup (speed, weather, centrality). |
| `gateway_b_propagation_engine.png` | Gateway B | Shockwave Propagation | Radiating concentric shockwave rings, time-to-impact countdowns for junctions. |
| `gateway_b_congestion_cost.png` | Gateway B | Congestion Cost Engine | Flipkart LCV route alternatives comparison (fuel, time, penalty), ROI saving. |
| `map_best_screenshot.png` | Maps | Live Tracking Map | Leaflet Map with dark tiles, vehicle tracking dots, custom active incident pins. |
| `map_hotspot_view.png` | Maps | Hotspot & Neglect Heatmap | Heatmap clusters at chronic intersections, top 10 neglect leaderboard. |
| `confusion_matrix_metrics.png` | Metrics | Performance Overview | Visual confusion matrix grid, ROC-AUC curve chart, and performance gauges. |

---

## 🏗️ 1.1 Architecture Flow Diagram Sketch

Here is the textual flow representable in standard tools, matching the high-fidelity diagram saved in [architecture_diagram.png](file:///d:/Flipkart%20round%202/GridSense/presentation_assets/architecture_diagram.png):

```text
               [ Traffic Incidents Dataset ]
                             │
                             ▼
                 [ Feature Engineering ]
                    (Target Encoding,
                   Cyclical Time representation)
                             │
                             ▼
                     [ ML Models Layer ]
        ┌────────────────────┼───────────────────┐
        ▼                    ▼                   ▼
 [ Priority Model ]  [ Closure Model ]   [ Forecast Model ]
  (Random Forest)       (XGBoost)       (Facebook Prophet)
        └────────────────────┬───────────────────┘
                             │
                             ▼
                  [ FastAPI Services ]
                    (Model Inference,
                   Deployment Recommender)
                             │
                             ▼
            ┌────────────────┴────────────────┐
            ▼                                 ▼
[ Gateway A: Operational AI ]     [ Gateway B: Traffic Intel ]
  ├─ Road Closure Alert             ├─ Road Stress Index (0-100)
  ├─ Bias-Corrected Priority        ├─ Shockwave Decay Propagation
  ├─ Median Clearance Duration      ├─ Domino Cascade Spillover
  └─ Station Load Dispatcher        └─ Flipkart Congestion Cost
            └────────────────┬────────────────┘
                             │
                             ▼
                 [ Command Center Maps ]
                   (Leaflet GIS Layer,
                  Hotspots, Live Pins)
```

---

## 🧮 2. List of Mathematical Traffic Intelligence Formulae

Below is the complete list of equations integrated into the **Gateway B (Traffic Intelligence)** services and models.

### 1. Road Stress Score Formula
Used to evaluate structural load risk by combining baseline characteristics with real-time incident severity.
*   **Mathematical Formula:**
    $$\text{Road\_Stress} = \text{Base\_Vulnerability\_Index} \times \text{Dynamic\_Load\_Multiplier} \times \text{Acute\_Event\_Severity}$$
*   **Variable Definitions:**
    *   $\text{Base\_Vulnerability\_Index} = 0.4 \times \text{road\_centrality} + 0.4 \times \text{historical\_congestion\_frequency} + 0.2 \times \text{weather\_risk}$
    *   $\text{Dynamic\_Load\_Multiplier} = 1.0 + \frac{\text{rolling\_incident\_count\_7d}}{\text{historical\_daily\_average}}$
    *   $\text{Acute\_Event\_Severity} = 1.0 + 1.5 \times (\text{requires\_road\_closure}) + 0.5 \times (\text{priority} == \text{High})$
*   **Python Implementation Proxy:**
    ```python
    stress_proxy = (0.25 * density_ratio) + (0.20 * speed_drop) + (0.15 * delay_ratio) + \
                   (0.15 * road_centrality) + (0.10 * freq_score) + (0.10 * neighbor_inf) + (0.05 * weather)
    ```

---

### 2. Shockwave (Propagation) / Time-to-Impact Formula
Based on kinematic wave theory (Lighthill-Whitham-Richards). Predicts backward-traveling congestion queue boundaries.
*   **Mathematical Formula:**
    $$\text{Shockwave\_Impact}(d, t) = \text{Source\_Delay\_Magnitude} \times \text{Decay\_Factor}^{\left(\frac{d}{\text{Queue\_Propagation\_Velocity}}\right)} \times \text{Time\_Activation}(t)$$
*   **Variable Definitions:**
    *   $\text{Source\_Delay\_Magnitude} = \text{current\_travel\_time} - \text{historical\_travel\_time}$
    *   $\text{Queue\_Propagation\_Velocity} = \frac{\text{Inflow\_Rate} - \text{Outflow\_Rate}}{\text{Jam\_Density} - \text{Inflow\_Density}}$
    *   $d$: Distance to neighboring junction (meters).
    *   $t$: Elapsed minutes since primary incident onset.
*   **Heuristic Proxy implementation:**
    *   $\text{source\_pressure} = 0.45 \times (\text{source\_stress}/100) + 0.25 \times \text{severity} + 0.20 \times \text{capacity\_blocked\_pct} + 0.10 \times \text{peak\_hour\_pressure}$
    *   $\text{estimated\_spread\_time\_mins} = 5.5 + \text{hop\_distance} \times 8.0 + (1.0 - \text{source\_pressure}) \times 8.0 + \text{neighbor\_centrality} \times 6.0 - \text{event\_pressure} \times 3.0$

---

### 3. Vehicle Surge Index Formula
Determines traffic accumulation rates during storm surges and mass disruptions.
*   **Mathematical Formula:**
    $$\text{Surge\_Index} = \left(\frac{\text{Real\_Time\_Inflow\_Rate}}{\text{Historical\_Baseline\_Rate}}\right) \times \text{Environmental\_Agitator}$$
*   **Variable Definitions:**
    *   $\text{Net\_Accumulation} = (\text{Inflow\_Rate} - \text{Outflow\_Rate}) \times \Delta t$
    *   $\text{Environmental\_Agitator} = 1.0 + 0.5 \times (\text{weather\_alert} == \text{heavy\_rain})$
*   **Daily Surge Multiplier:**
    ```python
    surge_multiplier = march7_incidents / max(march6_incidents, 1)
    ```

---

### 4. Domino Cascade Spillover Probability Formula
Calculates probability of secondary collapse on detour routes when a primary corridor gridlocks.
*   **Mathematical Formula:**
    $$\text{Domino\_Probability} = \text{Primary\_Stress} \times \text{Route\_Substitutability\_Weight} \times (1.0 - \text{Adjacent\_Available\_Capacity})$
*   **Variable Definitions:**
    *   $\text{Adjacent\_Available\_Capacity} = 1.0 - \left(\frac{\text{Adjacent\_Volume}}{\text{Adjacent\_Capacity}}\right)$
    *   $\text{Route\_Substitutability\_Weight}$: Detour routing split ratio (parallel roads = high; perpendicular = low).
*   **Proxy Calculation:**
    ```python
    # Probability that failure transfers to adjacent road link
    spillover_multiplier = primary_cascade_multiplier * 0.4
    projected_stress_score = before_stress + probability * 22.0 / hop_distance
    ```

---

### 5. Congestion Cost Calculator (LCV Router) Formula
Calculates actual localized financial losses of congestion delays. Used for Flipkart fleet dispatch routing.
*   **Mathematical Formula:**
    $$\text{Economic\_Cost} = (\text{Affected\_Vehicles} \times \text{Total\_Delay\_Hours} \times \text{Value\_of\_Time}) + (\text{Excess\_Fuel\_Consumed} \times \text{Fuel\_Price})$
*   **Variable Definitions:**
    *   $\text{Total\_Delay\_Hours} = \left(\frac{\text{distance\_km}}{\text{current\_speed}} - \frac{\text{distance\_km}}{\text{free\_flow\_speed}}\right) \times \text{Affected\_Vehicles}$
    *   $\text{Excess\_Fuel\_Consumed} = \text{Affected\_Vehicles} \times \text{Total\_Delay\_Hours} \times \text{Idle\_Fuel\_Rate\_Per\_Hour}$
*   **Operational Implementation Components:**
    *   $\text{idle\_fuel\_cost} = (\text{delay\_mins} / 60) \times \text{idle\_fuel\_litre\_per\_hour} \times \text{fuel\_price}$
    *   $\text{time\_cost} = (\text{travel\_time\_mins} / 60) \times (\text{commuter\_value\_of\_time} + \text{commercial\_driver\_cost})$
    *   $\text{delay\_penalty} = \text{delay\_mins} \times \text{logistics\_delay\_penalty\_per\_min}$
    *   $\text{total\_cost} = \text{idle\_fuel\_cost} + \text{time\_cost} + \text{delay\_penalty}$

---

## 📊 Machine Learning Model Metrics

### 1. Incident Priority Model (LightGBM / XGBoost)
*   **Accuracy**: 99.8%
*   **ROC-AUC**: 0.999
*   **Overall F1-Score**: 0.998

#### 🔲 Confusion Matrix
```text
                  Predicted Low    Predicted High
Actual Low             568              1
Actual High              1             934
```

---

### 2. Road Closure Prediction Model (XGBoost Enhanced)
*   **ROC-AUC**: 0.7279
*   **F1-Score**: 0.3796 (at Threshold = 0.30)

#### 🔲 Confusion Matrix (Threshold = 0.30)
```text
                  Predicted Open   Predicted Closed
Actual Open            1,283             99
Actual Closed            71              52
```

---

### 3. Time-Series Forecasting (Facebook Prophet)
*   **Mean Absolute Error (Average)**: **0.18** incidents / hour
*   **Lowest Error Corridor**: **0.129 MAE** (Outer Ring Road East 2)
*   **Highest Volume Corridor**: **0.439 MAE** (Mysore Road)
