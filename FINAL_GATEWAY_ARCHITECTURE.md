# GridSense - Final Gateway Architecture

This document provides the final architectural blueprint for GridSense, classifying the system's analytical modules, machine learning pipelines, and simulation features into two primary gateways: **Gateway A (Operational Intelligence)** and **Gateway B (Traffic Intelligence)**.

---

## Architectural Classification Overview

```mermaid
graph TD
    subgraph Gateway A [Gateway A: Operational Intelligence]
        A1[Road Closure Predictor]
        A2[Incident Priority Classifier]
        A3[Clearance Duration Estimation]
        A4[Resource Deployment Recommendation]
    end

    subgraph Gateway B [Gateway B: Traffic Intelligence]
        B1[Junction Incident Forecaster]
        B2[Chronic Blackspot & Neglect Index]
        B3[Cascade Ripple Simulator]
        B4[Weather Surge Replay & Vulnerability]
        B5[Road Stress Indicator]
        B6[Shockwave Propagation Predictor]
        B7[Vehicle Surge Estimator]
        B8[Domino Cascade Simulator]
        B9[Congestion Cost Calculator]
    end

    Data[(Processed Events & Corridors)] --> Gateway A
    Data --> Gateway B
```

---

## Gateway A: Operational Intelligence
Gateway A focuses on immediate, reactive decision support at the dispatcher level. It automates triage, classifies severity to remove historical human bias, estimates incident duration, and recommends direct dispatch routing.

### 1. Road Closure Predictor
* **Inputs:**
  * `corridor` (str) - Name of the affected corridor.
  * `event_cause` (str) - Cause of the incident (e.g., `accident`, `water_logging`, `vehicle_breakdown`).
  * `vehicle_type` (str) - Primary vehicle type involved.
  * `hour_of_day` (int) - Hour (0-23) of occurrence.
  * `day_of_week` (int) - Day of the week (0-6).
  * `station_load` (float, optional) - Current active incident burden on the surrounding police station.
* **Outputs:**
  * `closure_probability` (float) - Probability (0.0 to 1.0) that the incident will require a physical road closure.
* **APIs:**
  * `POST /api/v1/predict/triage` (returns `closure_probability`)
* **Frontend Component Required:**
  * **Triage Screen - Live Feed Panel** ([TriageScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/triage/TriageScreen.jsx))
  * Renders a real-time risk badge next to active incidents (e.g., `Road Closure Risk: 78%`). If the risk exceeds the operational threshold of `0.35`, the card flashes red and triggers a system-wide banner notification.
* **Business Value:**
  * Prevents secondary traffic gridlock. Preemptively alerting dispatchers of high closure risk 30-45 minutes before standard reports come in allows the city to activate rerouting detours early, saving thousands of commuter hours.
* **Demo Value:**
  * **Core Live Alerting Feature:** During the demo, a dispatcher can input a simulated incoming accident, showing how the system immediately flags the high probability of road closure and prompts for proactive route diversion.

### 2. Incident Priority Classifier
* **Inputs:**
  * `event_cause` (str) - Type of incident.
  * `vehicle_type` (str) - Vehicle involvement profile.
  * `hour_of_day` (int) - Hour of the incident.
  * `day_of_week` (int) - Day of week.
  * `corridor` (str) - Location corridor to verify baseline bias.
* **Outputs:**
  * `predicted_priority` (int) - Priority class (0 for Low, 1 for High).
  * `priority_probability` (float) - Confidence score of the classification.
  * `disagreement_flag` (bool) - Set to true if the model output differs from the historical logging default.
* **APIs:**
  * `POST /api/v1/predict/triage` (returns `predicted_priority`, `priority_probability`, `disagreement_flag`)
* **Frontend Component Required:**
  * **Triage Screen - Bias Correction Toggle** ([TriageScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/triage/TriageScreen.jsx))
  * Displays a side-by-side comparison of historical dispatch priority mapping vs. GridSense's unbiased priority prediction, highlighting cases corrected by the model.
* **Business Value:**
  * Ensures operational equity and improves emergency response times. By using objective factors (incident cause, vehicle profile) instead of location alone, it eliminates historical dispatching bias where incidents on minor roads were neglected.
* **Demo Value:**
  * **"Bias-Correction" Interactive Demo:** Showcases a scenario where a severe accident occurs outside a major corridor. Clicking the "Bias-Correction" toggle demonstrates how GridSense upgrades the incident status to "High Priority" despite historical precedent marking it as low.

### 3. Clearance Duration Estimation
* **Inputs:**
  * `event_cause` (str) - Primary cause of the incident.
  * `corridor` (str, optional) - Corridor location for localized lookup.
* **Outputs:**
  * `predicted_duration_mins` (float) - Estimated median duration (in minutes) for clearing the incident.
* **APIs:**
  * `POST /api/v1/predict/triage` (returns `predicted_duration_mins`)
* **Frontend Component Required:**
  * **Incident Details Pane & Tooltips** ([TriageScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/triage/TriageScreen.jsx) / [CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * A typical clearance card showing the median and IQR (Interquartile Range) for duration expectations (e.g., `Expected Clearance: 40-55 mins`).
* **Business Value:**
  * Enables data-backed service-level agreements (SLAs) for road clearance. Replaces operator guesswork with statistical, historic percentiles.
* **Demo Value:**
  * Populates a clear metadata tooltip on the active incident list, demonstrating how administrators can see exactly when a lane is expected to reopen.

### 4. Resource Deployment Recommendation
* **Inputs:**
  * `incident_id` (str) - Unique identifier of the incident.
  * `corridor` (str) - Incident location.
  * `priority` (str) - Incident priority level.
* **Outputs:**
  * `recommended_station` (str) - Name of the nearest/most available police station to deploy from.
  * `station_concurrency_load` (int) - Number of concurrent incidents that station is currently handling.
  * `suggested_officer_count` (int) - Suggested unit size to dispatch.
* **APIs:**
  * `POST /api/v1/deploy/recommend`
* **Frontend Component Required:**
  * **Deployment Screen - Resource Dispatch Panel** ([DeploymentScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/deployment/DeploymentScreen.jsx))
  * Renders a map overlay with lines connecting the active incident to neighboring stations, highlighting station capacity. Renders a one-click "Confirm Deployment" button.
* **Business Value:**
  * Balances city-wide emergency response loads. Avoids dispatching from a station that is already overwhelmed, shifting the load to nearby under-utilized stations.
* **Demo Value:**
  * **Interactive Dispatch Demonstration:** Clicking an active incident visualizes station loads, showing why the system suggests deploying a unit from a slightly further station because the closest station is at 100% capacity.

---

## Gateway B: Traffic Intelligence
Gateway B focuses on network-wide planning, predictive simulation, time-series forecasting, and economic impact calculations. It is aimed at planners, traffic engineers, and logistics coordinators (e.g., Flipkart LCV routers).

### 1. Junction Incident Forecaster
* **Inputs:**
  * `junction` (str) - Name of the junction (e.g., `Silk Board`).
  * `hours_ahead` (int) - Number of future hours to forecast (default: `72`).
* **Outputs:**
  * `forecast` (list of objects) - Hourly predictions containing timestamp, expected incident count, lower confidence boundary (yhat_lower), and upper confidence boundary (yhat_upper).
* **APIs:**
  * `GET /api/v1/forecast/junction/{junction}`
  * `GET /api/v1/forecast/corridors`
* **Frontend Component Required:**
  * **Forecast Screen - Seasonality Timeline Chart** ([ForecastScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/forecast/ForecastScreen.jsx))
  * An interactive line graph (with shading for confidence bands) representing the 72-hour forecast and highlighting typical daily/weekly rush-hour peaks.
* **Business Value:**
  * Proactive shift management. Allows transit authorities to schedule officer shifts and pre-position towing vehicles based on peak-hour incident forecasts rather than reactive notification.
* **Demo Value:**
  * **Tactical Forecast Dropdown:** Let the user select major intersections and visually explore the predicted incident peaks over the next weekend.

### 2. Chronic Blackspot & Response Neglect Index
* **Inputs:**
  * `tier` (str, optional) - Filter for risk levels (`Chronic`, `Critical`, `At Risk`, `Monitored`).
  * `corridor` (str, optional) - Filter by corridor.
* **Outputs:**
  * `junctions` (list) - List of junctions ranked by risk score.
  * `neglect_list` (list) - List of stations with their neglect ratios (percentage of incidents taking $\ge 5\times$ longer than the cause-based median).
* **APIs:**
  * `GET /api/v1/blackspot/junctions`
  * `GET /api/v1/blackspot/neglect`
  * `GET /api/v1/blackspot/junctions/{junction}`
* **Frontend Component Required:**
  * **Blackspot & Neglect Screen** ([BlackspotScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/blackspot/BlackspotScreen.jsx))
  * Renders a geographic heatmap of blackspots, a leaderboard of the top 10 chronic intersections, and a station neglect leaderboard.
* **Business Value:**
  * Strategic civil engineering and accountability. Identifies where infrastructure redesign is needed (e.g., pedestrian bridges, signal changes) and audits stations with systemic clearance delays.
* **Demo Value:**
  * **Administrative Audit View:** Displays a dashboard showing the "Response Neglect Index," showing how municipal leaders can identify bottlenecks and track police station performance.

### 3. Cascade Ripple Simulator
* **Inputs:**
  * `event_cause` (str) - Cause of the planned event (e.g., `construction`, `vip_movement`).
  * `corridor` (str) - Target corridor.
  * `hour_of_day` (int) - Start hour.
  * `day_of_week` (int) - Day of the week.
* **Outputs:**
  * `cascade_multiplier` (float) - Calculated risk multiplier for the planned event.
  * `affected_junctions` (list) - Junctions on the corridor that face increased risk.
  * `adjacent_corridors` (list) - Secondary corridors where risk will spill over.
* **APIs:**
  * `POST /api/v1/predict/cascade`
* **Frontend Component Required:**
  * **Command Center Map - Planned Event Overlay** ([CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * A scheduler pane where planners can drag and drop planned maintenance or events, updating map colors to show risk propagation.
* **Business Value:**
  * Avoids concurrent road blocks. Ensures that planned construction or VIP routes do not overlap with other high-impact activities on adjacent arterials.
* **Demo Value:**
  * **"What-If" Planned Event Scenario:** Planners simulate scheduling road construction on a major corridor, and the map instantly highlights adjacent corridors turning orange to warn of spillover.

### 4. Weather Surge Replay & Vulnerability Index
* **Inputs:**
  * `alert_type` (str) - Type of weather event (e.g., `heavy_rain`).
  * `severity` (str) - Level of warning (e.g., `red`).
* **Outputs:**
  * `vulnerabilities` (list) - Per-corridor list of weather risk indexes.
  * `replay_data` (list) - Hour-by-hour historical playback sequence for March 7, 2024.
* **APIs:**
  * `GET /api/v1/surge/vulnerability`
  * `GET /api/v1/surge/replay/march7`
  * `POST /api/v1/surge/trigger`
* **Frontend Component Required:**
  * **Surge Screen - Historical Storm Replay** ([SurgeScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/surge/SurgeScreen.jsx))
  * An interactive timeline slider showing the progression of the March 7 storm, displaying live waterlogging events and showcasing proactive resource pre-deployment.
* **Business Value:**
  * Disaster response planning. Pre-calculates exact officer placement patterns based on historic rain event vulnerability metrics.
* **Demo Value:**
  * **Storm Surge Replay Mode:** Renders an animated timeline that replays the storm events of March 7, showing how GridSense pre-deploys rescue resources 12 hours prior to the storm.

### 5. Road Stress Indicator
* **Inputs:**
  * `corridor` (str) - Selected corridor.
  * `current_vehicle_count` (int, optional) - Live vehicles.
  * `road_capacity` (int, optional) - Design capacity.
  * `current_speed_kmph` (float, optional) - Live vehicle speeds.
* **Outputs:**
  * `stress_score` (float) - Composite score from 0 to 100.
  * `stress_level` (str) - Qualitative evaluation (`Healthy`, `Moderate`, `High Stress`, `Critical`).
  * `factors` (object) - Contributions of each component (speed drop, centrality, weather risk, etc.).
* **APIs:**
  * `POST /api/v1/intelligence/road-stress`
* **Frontend Component Required:**
  * **Command Center Map - Corridor Color Overlay** ([CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * Renders colored corridors (green, orange, red) on the main map. Hovering over a corridor displays a popup detailing its stress breakdown.
* **Business Value:**
  * Sensorless traffic density tracking. Integrates network connectivity, weather, and basic speed data to estimate congestion without requiring expensive physical loop sensors.
* **Demo Value:**
  * Hovering over a red corridor exposes a breakdown panel showing exactly how speed drop and centrality contribute to its critical status.

### 6. Shockwave Propagation Predictor
* **Inputs:**
  * `source_corridor` (str) - Epicenter corridor.
  * `event_cause` (str) - Cause of the backup.
  * `capacity_blocked_pct` (float) - Blockage magnitude.
  * `current_speed_kmph` (float, optional) - Current speed.
* **Outputs:**
  * `source_pressure` (float) - Pressure index at the source.
  * `affected_roads` (list) - Adjacent corridors with estimated spread times and projected stress.
  * `forecast_windows` (list) - Groups of affected roads for 5, 15, and 30 minutes.
* **APIs:**
  * `POST /api/v1/intelligence/shockwave`
* **Frontend Component Required:**
  * **Map Propagation Visualization Overlay** ([CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * Renders expanding shockwave circles radiating outwards from the active incident over time, showing a list of neighboring junctions and their time-to-impact.
* **Business Value:**
  * Dynamic signaling control. Enables upstream traffic control systems to adjust green-light phases before the queuing shockwave physically reaches their intersection.
* **Demo Value:**
  * **Time-to-Impact Countdowns:** Displays a countdown timer showing that traffic backup will reach the adjacent junction in `12 minutes`, driving immediate operator awareness.

### 7. Vehicle Surge Estimator
* **Inputs:**
  * `corridor` (str) - Target corridor.
  * `current_vehicle_count` (int, optional) - Live count.
  * `incoming_vehicle_rate_per_min` (float, optional) - Inflow rate.
  * `outgoing_vehicle_rate_per_min` (float, optional) - Outflow rate.
* **Outputs:**
  * `vehicle_surge_index` (float) - Inflow minus outflow. Positive numbers represent vehicle accumulation.
  * `windows` (list) - Net accumulated vehicles and congestion growth % over 5, 15, and 30 minutes.
* **APIs:**
  * `POST /api/v1/intelligence/vehicle-surge`
* **Frontend Component Required:**
  * **Command Center Sidebar - Surge Index Gauge** ([CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * Renders a live speedometer-style gauge representing the vehicle accumulation index.
* **Business Value:**
  * Queue capacity warning. Acts as an early warning indicator that a corridor is taking in more vehicles than it can handle, signaling potential gridlock.
* **Demo Value:**
  * Displays a live water-tank style visual showing net inflow vs. outflow, showing when a corridor's capacity is about to overflow.

### 8. Domino Cascade Simulator
* **Inputs:**
  * `source_corridor` (str) - Primary failed corridor.
  * `event_cause` (str) - Cause of failure.
  * `additional_vehicles` (int) - Volume injected.
  * `capacity_blocked_pct` (float) - Blockage ratio.
  * `simulation_minutes` (list) - Array of minutes to simulate (e.g. `[10, 20, 30]`).
* **Outputs:**
  * `city_congestion_increase_pct` (float) - Total city-wide congestion impact.
  * `steps` (list) - State changes of the network at each timestamp.
  * `recommended_intervention` (str) - Specific deployment coordinates to prevent secondary collapse.
* **APIs:**
  * `POST /api/v1/intelligence/domino`
* **Frontend Component Required:**
  * **Command Center Map - What-If Cascade Simulation panel** ([CommandCenterMap.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/map/CommandCenterMap.jsx))
  * Renders a step-by-step progress timeline of the city network.
* **Business Value:**
  * Strategic city planning and dispatcher response coordination. Enables the control center to determine the risk of total gridlock and prioritize dispatcher response locations.
* **Demo Value:**
  * **Cascade Timeline Simulation:** Clicking the simulation button plays a 30-minute cascade animation showing neighboring streets turning red step-by-step.

### 9. Congestion Cost Calculator
* **Inputs:**
  * `routes` (list) - Target corridors, distances, current speed, free-flow speed.
  * `fuel_price_per_litre` (float) - Current fuel cost.
  * `mileage_kmpl` (float) - Baseline vehicle mileage.
  * `idle_fuel_litre_per_hour` (float) - Fuel burn rate while idling.
  * `value_of_time_per_hour` (float) - Commuter value of time.
  * `driver_cost_per_hour` (float) - Professional driver cost.
  * `delay_penalty_per_min` (float) - Logistic delay fine.
* **Outputs:**
  * `routes` (list) - Cost breakdowns (fuel, idle fuel, time, delay penalty) and total cost.
  * `best_route_id` (str) - Most cost-effective route.
  * `savings_vs_worst` (float) - Monetary savings if the optimal route is selected.
* **APIs:**
  * `POST /api/v1/intelligence/congestion-cost`
* **Frontend Component Required:**
  * **Flipkart LCV Integration Dashboard** ([FlipkartScreen.jsx](file:///d:/Flipkart%20round%202/GridSense/frontend/src/components/flipkart/FlipkartScreen.jsx))
  * Renders route cost options, highlighting fuel and time costs for delivery trucks.
* **Business Value:**
  * Direct ROI tracking for commercial logistics. Translates abstract delay ratios into actual monetary loss, enabling fleets (like Flipkart LCVs) to avoid expensive, high-congestion zones.
* **Demo Value:**
  * **Economic Loss Ticker:** Renders a live counter tracking the financial cost of a traffic backup, and displays comparative routing cards with cost savings.
