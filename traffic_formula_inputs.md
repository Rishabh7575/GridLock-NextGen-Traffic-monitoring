# Traffic Intelligence Layer: Variable & Formula Blueprint

This document audits the variables and mathematical formulas used in the GridSense Traffic Intelligence layer. It classifies variables into those available in the current dataset, those currently missing (simulated/hardcoded), recommended physical traffic equations, and proxies that can be estimated from the existing CAD (Computer-Aided Dispatch) incident logs.

---

## 1. Road Stress

### 1. Available Variables Today
* `road_centrality` (float): Pre-computed betweenness centrality based on the corridor adjacency network.
* `historical_congestion_frequency` (float): Normalized scoring of historical incident frequency per corridor.
* `neighbor_congestion_influence` (float): Computed as a function of adjacent corridor density and risk scores.
* `weather_risk` (float): Estimated from historical waterlogging and tree-fall incident ratios.
* `hour_of_day`, `day_of_week` (int): Temporal indexes of active events.

### 2. Missing Variables (Not in dataset)
* Real-time vehicle density or lane occupancy rate (no loop sensors or radar telemetry).
* Live average corridor speed (no GPS probe vehicle or floating car data feeds).
* Dynamic travel times (no physical Bluetooth/Wi-Fi sniffer logs).
* Physical road capacity (no official database of lanes or flow thresholds).

### 3. Recommended Formula
```text
Road_Stress = Base_Vulnerability_Index × Dynamic_Load_Multiplier × Acute_Event_Severity
```
* `Base_Vulnerability_Index = 0.4 × road_centrality + 0.4 × historical_congestion_frequency + 0.2 × weather_risk`
* `Dynamic_Load_Multiplier = 1.0 + (rolling_incident_count_7d / historical_daily_average)`
* `Acute_Event_Severity = 1.0 + 1.5 × (requires_road_closure) + 0.5 × (priority == High)`

### 4. Variables Estimated from Existing Datasets (Proxies)
* **`historical_density_proxy`:** Calculated as `incident_frequency / max_frequency` (representing incident density as a proxy for vehicle congestion).
* **`historical_speed_kmph`:** Estimated via: `38.0 - 14.0 × density_proxy - 7.0 × closure_rate - 5.0 × duration_pressure`.
* **`speed_drop_pct_proxy`:** Estimated via: `18.0 + 30.0 × density_proxy + 12.0 × closure_rate`.
* **`current_speed_proxy_kmph`:** Derived as: `historical_speed × (1.0 - speed_drop / 100.0)`.
* **`delay_ratio_proxy`:** Estimated by computing: `current_travel_time_proxy_mins / historical_travel_time_proxy_mins`.
* **`capacity_proxy`:** Estimated via centrality: `100.0 + 45.0 × road_centrality + 25.0 × (1.0 - density_proxy)`.

---

## 2. Shockwave (Propagation)

### 1. Available Variables Today
* Corridor network graph adjacency (`corridor_adjacency.json`).
* Hop distance (integer count of intersection links from source).
* Neighbor base stress scores.

### 2. Missing Variables (Not in dataset)
* Physical corridor distances (length of road segments in meters or kilometers).
* Queue length (physical tailback of stopped vehicles in meters).
* Wave speed (propagation velocity of the queue boundary, e.g. km/h).
* Signal timing cycle structures (green-light ratios at neighboring junctions).

### 3. Recommended Formula (Lighthill-Whitham-Richards Theory)
```text
Shockwave_Impact(d, t) = Source_Delay_Magnitude × Decay_Factor^(d / Queue_Propagation_Velocity) × Time_Activation(t)
```
* `Source_Delay_Magnitude = current_travel_time - historical_travel_time`
* `Queue_Propagation_Velocity = (Inflow_Rate - Outflow_Rate) / (Jam_Density - Inflow_Density)` (derived from vehicle flow boundaries).

### 4. Variables Estimated from Existing Datasets (Proxies)
* **`source_pressure`:** Composite proxy: `0.45 × (source_stress / 100) + 0.25 × event_severity + 0.20 × capacity_blocked_pct + 0.10 × peak_hour_pressure`.
* **`congestion_probability`:** Extrapolated via: `0.20 + 0.35 × source_pressure + 0.25 × neighbor_stress - 0.10 × hop_distance`.
* **`estimated_spread_time_mins`:** Modeled as: `5.5 + hop_distance × 8.0 + (1.0 - source_pressure) × 8.0 + neighbor_centrality × 6.0 - event_pressure × 3.0`.

---

## 3. Vehicle Surge

### 1. Available Variables Today
* Historical incident frequencies per day.
* Storm-day incident surge coefficients (March 7 historical multiplier).

### 2. Missing Variables (Not in dataset)
* Live inflow rate of vehicles entering the junction (no road tubes or camera counts).
* Live outflow rate of vehicles clearing the intersection.
* Dynamic counts of waiting vehicles at the signal.

### 3. Recommended Formula
```text
Surge_Index = (Real_Time_Inflow_Rate / Historical_Baseline_Rate) × Environmental_Agitator
```
* `Net_Accumulation = (Inflow_Rate - Outflow_Rate) × delta_t`
* `Additional_Waiting_Time = Net_Accumulation × Average_Delay_Per_Vehicle`
* `Environmental_Agitator = 1.0 + 0.5 × (weather_alert == heavy_rain)`

### 4. Variables Estimated from Existing Datasets (Proxies)
* **`incoming_vehicle_rate_per_min`:** Estimated as: `incident_frequency_per_day × 3.0 + stress_score / 30.0`.
* **`outgoing_vehicle_rate_per_min`:** Estimated as: `incoming_rate × (0.92 - min(stress_score, 95) / 300)`.
* **`average_vehicle_delay_mins`:** Estimated as: `median_duration_mins / 25.0`.

---

## 4. Domino (Cascade Spillover)

### 1. Available Variables Today
* Adjacent corridor connections list.
* Pre-computed cascade risk multipliers for planned construction/processions.

### 2. Missing Variables (Not in dataset)
* Driver detour split rates (percentage of drivers choosingdetour route A vs. route B).
* Live volume capacities of detour corridors.

### 3. Recommended Formula
```text
Domino_Probability = Primary_Stress × Route_Substitutability_Weight × (1.0 - Adjacent_Available_Capacity)
```
* `Adjacent_Available_Capacity = 1.0 - (Adjacent_Volume / Adjacent_Capacity)`
* `Route_Substitutability_Weight = percentage of drivers detouring to this path` (from routing graphs).

### 4. Variables Estimated from Existing Datasets (Proxies)
* **`Route_Substitutability_Weight`:** Estimated using the inverse of adjacent corridor stress scores (drivers detouring onto the lowest-stress paths).
* **`projected_stress_score`:** Estimated as: `before_stress + probability × 22.0 / hop_distance`.
* **`city_congestion_increase_pct`:** Aggregated via: `sum(stress_deltas) / total_modeled_roads * 1.8`.

---

## 5. Cost (Congestion Cost Calculator)

### 1. Available Variables Today
* Corridor travel distances (estimates derived from GPS coordinates).
* Median incident clearance durations.

### 2. Missing Variables (Not in dataset)
* Real-time vehicle counts (AADT - Annual Average Daily Traffic) passing the block.
* Fleet distribution ratios (percentage of heavy trucks, LCV delivery vans, private cars, two-wheelers).
* Real-time vehicle fuel consumption rates during stop-and-go conditions.
* Dynamic driver wage metrics and freight penalty fees.

### 3. Recommended Formula
```text
Economic_Cost = (Affected_Vehicles × Total_Delay_Hours × Value_of_Time) + (Excess_Fuel_Consumed × Fuel_Price)
```
* `Total_Delay_Hours = (distance_km / current_speed - distance_km / free_flow_speed) × Affected_Vehicles`
* `Excess_Fuel_Consumed = Affected_Vehicles × Total_Delay_Hours × Idle_Fuel_Rate_Per_Hour`

### 4. Variables Estimated from Existing Datasets (Proxies)
* **`effective_mileage_kmpl`:** Estimated as: `normal_mileage × (1.0 - 0.35 × (stress_score / 100))`.
* **`idle_fuel_cost`:** Calculated as: `(delay_mins / 60) × idle_fuel_litre_per_hour × fuel_price_per_litre`.
* **`time_cost`:** Calculated as: `(travel_time_mins / 60) × (commuter_value_of_time + commercial_driver_cost)`.
* **`delay_penalty`:** Modeled as: `delay_mins × logistics_delay_penalty_per_min`.
