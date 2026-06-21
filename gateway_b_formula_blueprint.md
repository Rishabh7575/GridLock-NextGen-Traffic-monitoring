# Traffic Intelligence Layer: Formula Blueprint
**Optimization Goals:** Explainability, Simulation Realism, and Decision Support.

---

## 1. Road Stress

**1. Current Formula:**
*(From `12_train_traffic_intelligence.py`)*
```python
stress_proxy = (0.25 * density_ratio) + (0.20 * speed_drop) + (0.15 * delay_ratio) + 
               (0.15 * road_centrality) + (0.10 * freq_score) + (0.10 * neighbor_inf) + (0.05 * weather)
```

**2. Weak Assumptions:**
* **Linear Additivity:** Uses flat additive weights. An extreme event (like 100% speed drop/gridlock) cannot force the stress score to maximum if the baseline historical factors (like centrality) are low.
* **Capping:** Arbitrary `min(100, ...)` limits hide the true severity of extreme outlier events.

**3. Proposed Improved Formula:**
```text
Road_Stress = Base_Vulnerability_Index × Dynamic_Load_Multiplier × Acute_Event_Severity
```
*Where `Acute_Event_Severity` is a non-linear multiplier (e.g., 1.0 for normal, 2.5 for lane closure).*

**4. Required Inputs:**
* `Base_Vulnerability_Index`: Pre-computed structural risk (centrality, historical blackspot score).
* `Dynamic_Load_Multiplier`: Current hour inflow volume vs. historical average.
* `Acute_Event_Severity`: Real-time incident triggers (e.g., road closures, severe weather).

**5. Output Explanation:**
A 0–100+ "Stress Gauge". Easily explained to dispatchers as: *"The baseline structural risk of this road is being amplified by 2.5x due to a current lane closure."*

---

## 2. Shockwave (Propagation)

**1. Current Formula:**
*(Implicit via `neighbor_influence` in `11_build_traffic_intelligence.py`)*
```python
neighbor_influence = min(100, neighbor_density * 60.0 + neighbor_risk * 0.4)
```

**2. Weak Assumptions:**
* **Instantaneous & Static:** Assumes risk transfers to neighboring junctions instantly and constantly. It does not account for the physical distance between junctions or the time it takes for a traffic queue to back up.

**3. Proposed Improved Formula:**
```text
Shockwave_Impact(d, t) = Source_Delay_Magnitude × Decay_Factor^(d / Average_Queue_Speed) × Time_Activation(t)
```

**4. Required Inputs:**
* `Source_Delay_Magnitude`: The time delay at the primary incident epicenter.
* `d`: Distance to the neighboring junction (meters).
* `Average_Queue_Speed`: Speed at which the traffic jam propagates backward.
* `t`: Time elapsed since the primary incident began.

**5. Output Explanation:**
A "Time-to-Impact" countdown. Instead of a static risk score, the system tells dispatchers: *"Traffic backup will hit the adjacent Northern Junction in approximately 14 minutes."*

---

## 3. Vehicle Surge

**1. Current Formula:**
*(From `10_train_surge.py`)*
```python
surge_multiplier = march7_incidents / max(march6_incidents, 1)
```

**2. Weak Assumptions:**
* **Historical Rigidity:** The multiplier is hardcoded based on a single historical weather event (March 7) and applies a flat ratio to the entire network for a full day. It lacks real-time responsiveness.

**3. Proposed Improved Formula:**
```text
Surge_Index = (Real_Time_Inflow_Rate / Historical_Baseline_Rate) × Environmental_Agitator
```

**4. Required Inputs:**
* `Real_Time_Inflow_Rate`: Rolling 1-hour incident or vehicle volume rate.
* `Historical_Baseline_Rate`: Expected volume for that specific hour and day of the week.
* `Environmental_Agitator`: Live weather API severity score or mass-transit disruption flag.

**5. Output Explanation:**
A dynamic demand multiplier. Displayed as: *"Current volume is surging at 3.2x normal capacity due to sudden heavy rainfall,"* directly driving automated recommendations for extra officer deployments.

---

## 4. Domino (Cascade Spillover)

**1. Current Formula:**
*(From `09_train_cascade.py`)*
```python
spillover_multiplier = primary_cascade_multiplier * 0.4
```

**2. Weak Assumptions:**
* **Flat Spillover Rate:** Assumes a hardcoded 40% transfer of risk to all adjacent corridors, ignoring whether the adjacent corridor is a parallel alternative (high risk) or perpendicular (lower risk), and ignoring its current available capacity.

**3. Proposed Improved Formula:**
```text
Domino_Probability = Primary_Stress × Route_Substitutability_Weight × (1 - Adjacent_Available_Capacity)
```

**4. Required Inputs:**
* `Primary_Stress`: The current stress level of the failing corridor.
* `Route_Substitutability_Weight`: How likely drivers are to use the adjacent corridor as a detour (parallel routes = high weight).
* `Adjacent_Available_Capacity`: How "full" the adjacent corridor already is.

**5. Output Explanation:**
A network failure probability percentage. Explains network dynamics clearly: *"There is an 85% probability that the East Corridor will also fail, because it is the primary detour and is already at 90% capacity."*

---

## 5. Cost Calculator

**1. Current Formula:**
*Not currently implemented.* (Delays are tracked purely as time ratios, e.g., `current_travel / historical_travel`, with no economic translation).

**2. Weak Assumptions:**
* **Treating Delays as Abstract Ratios:** By not monetizing delays, the system fails to communicate the economic damage of gridlock, severely limiting its value for executive decision-making and ROI justification.

**3. Proposed Improved Formula:**
```text
Economic_Cost = (Affected_Vehicles × Total_Delay_Hours × Value_of_Time) + (Excess_Fuel_Consumed × Fuel_Price)
```

**4. Required Inputs:**
* `Affected_Vehicles`: Estimated volume passing through the junction during the incident duration.
* `Total_Delay_Hours`: Accumulated excess travel time.
* `Value_of_Time`: Localized economic parameter (e.g., Average hourly wage / commercial freight value).
* `Excess_Fuel_Consumed`: Estimated idling fuel burn based on vehicle types.

**5. Output Explanation:**
A live monetary ticker. Displayed on the executive dashboard as: *"This incident has caused ₹4.2 Lakhs in economic loss to the city."* This translates abstract machine learning metrics directly into business and administrative value.
