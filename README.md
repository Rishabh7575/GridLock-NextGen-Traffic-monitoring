# GridSense: Next-Generation Urban Traffic \& Dispatch Intelligence

GridSense is an advanced, two-tier predictive intelligence platform designed for municipal traffic dispatchers and commercial logistics routers (e.g., Flipkart LCV networks). The system bridges the gap between historical traffic data, active incident dispatching, and network-wide predictive flow simulation.

\---

## 

## System Architecture

GridSense is split into two primary intelligence layers (Gateways) to serve different operational workloads:

```text
               \[ Traffic Incidents Dataset ]
                             │
                             ▼
                 \[ Feature Engineering ]
                    (Target Encoding,
                   Cyclical Time representation)
                             │
                             ▼
                     \[ ML Models Layer ]
        ┌────────────────────┼───────────────────┐
        ▼                    ▼                   ▼
 \[ Priority Model ]  \[ Closure Model ]   \[ Forecast Model ]
  (Random Forest)       (XGBoost)       (Facebook Prophet)
        └────────────────────┬───────────────────┘
                             │
                             ▼
                  \[ FastAPI Services ]
                    (Model Inference,
                   Deployment Recommender)
                             │
                             ▼
            ┌────────────────┴────────────────┐
            ▼                                 ▼
\[ Gateway A: Operational AI ]     \[ Gateway B: Traffic Intel ]
  ├─ Road Closure Alert             ├─ Road Stress Index (0-100)
  ├─ Bias-Corrected Priority        ├─ Shockwave Decay Propagation
  ├─ Median Clearance Duration      ├─ Domino Cascade Spillover
  └─ Station Load Dispatcher        └─ Flipkart Congestion Cost
            └────────────────┬────────────────┘
                             │
                             ▼
                 \[ Command Center Maps ]
                   (Leaflet GIS Layer,
                  Hotspots, Live Pins)
```

### 1\. Gateway A: Operational Intelligence (Dispatcher Level)

Aims at reactive triage, automated incident staging, and resource deployment recommendations. It removes historical dispatch bias and assists emergency operators in real-time.

* **Road Closure Predictor (XGBoost)**: Evaluates active incidents to predict the probability of a physical road closure. Flashes severe warnings when risk exceeds `0.35`.
* **Incident Priority Classifier (Random Forest)**: Dynamically classifies incident priority (Low vs. High) based on cause and vehicle type rather than baseline corridor bias.
* **Clearance Duration Estimator**: Computes expected clearance times (median and Interquartile Range) to set statistical SLAs.
* **Resource Deployment Recommender**: Suggests the optimal dispatch station based on physical proximity and current concurrent station workloads.

### 2\. Gateway B: Traffic Intelligence (Strategic Planning)

Provides network-wide simulation, time-series forecasting, and economic loss calculations for planners and fleet dispatchers.

* **Junction Incident Forecaster (Prophet)**: Generates a 72-hour predictive seasonality model of incident volumes across major corridors.
* **Chronic Blackspot \& Response Neglect Index**: Identifies high-risk infrastructure hot spots and audits police station clearance efficiency.
* **Road Stress Indicator**: Computes a composite 0-100 stress score based on speed drops, vehicle density, and network centrality.
* **Shockwave Propagation Predictor**: Simulates expanding backward-traveling congestion queue boundaries and shows "Time-to-Impact" countdowns for adjacent junctions.
* **Domino Cascade Simulator**: Predicts detour-spillover collapse probabilities on adjacent routes.
* **Congestion Cost Calculator**: Translates delays into monetary loss (fuel, driver cost, delay penalties) for routing commercial Flipkart LCV fleets.

\---

## 

## Project Directory Structure

```text
GridSense/
├── backend/                       # FastAPI Web Services \& API Routing
│   ├── api/                       # API route handlers (incidents, forecasting, cost)
│   ├── core/                      # Configuration, security, database setups
│   └── main.py                    # App entry point
├── ml/                            # Machine Learning Pipeline \& Artifacts
│   ├── artifacts/                 # Trained model pickle files \& JSON metrics reports
│   ├── evaluation/                # Model evaluation \& feature ablation scripts
│   └── pipeline/                  # Raw ingestion, engineering, and training pipeline
├── web/                           # Next.js React Web Application (Gateway A \& B UI)
│   ├── src/                       # Components, charts, mapping layers
│   └── public/                    # Static presentation mockups \& assets
├── presentation\_assets/           # Visual UI screenshots \& architecture diagrams
├── data/                          # DB files \& processed CSV datasets
└── requirements.txt               # Backend Python dependencies
```

\---

## 🛠️ Step-by-Step Setup \& Running Guide

This project is packaged with **all source code, processed datasets, and trained model weights**.

### 1\. Extract the Project

Unzip `Resized GridSense - Rishabh.zip` to your local drive.

### 2\. Setup the Python Backend

The backend utilizes Python 3.10+ and standard data science packages.

1. Navigate to the `GridSense` root directory:

&#x20;   ```bash
    cd GridSense
    ```

2. Create a virtual environment:

&#x20;   ```bash
    python -m venv .venv
    ```

3. Activate the virtual environment:

   * **Windows (PowerShell)**: `.venv\\Scripts\\Activate.ps1`
   * **Mac/Linux**: `source .venv/bin/activate`
4. Install dependencies:

&#x20;   ```bash
    pip install -r requirements.txt
    ```

5. Launch the FastAPI server:

&#x20;   ```bash
    python -m uvicorn backend.main:app --reload
    ```

   *The API will be available at `http://127.0.0.1:8000`. You can access interactive Swagger documentation at `http://127.0.0.1:8000/docs`.*

   ### 3\. Setup the Next.js Frontend (`web`)

1. Navigate to the `web` folder:

   &#x20;   ```bash
    cd web
    ```

2. Install npm packages:

   &#x20;   ```bash
    npm install
    ```

3. Run the development server:

   &#x20;   ```bash
    npm run dev
    ```

   *The React UI dashboard will be available at `http://localhost:3000`.*

   \---

## 

   ## Machine Learning Models \& Metrics

   The metrics and confusion matrices listed below are read directly from the compiled pipeline artifacts in `ml/artifacts/`.

   ### 1\. Incident Priority Model

* **Algorithm**: LightGBM Classifier
* **Accuracy**: **99.8%** | **ROC-AUC**: **0.999** | **F1-Score**: **0.998**
* **Confusion Matrix**:

  &#x20;   ```text
                      Predicted Low    Predicted High
    Actual Low             568              1
    Actual High              1             934
    ```

  ### 2\. Road Closure Prediction Model

* **Algorithm**: XGBoost Classifier (Balanced using `scale\_pos\_weight = 11.19` due to severe minority class imbalance)
* **F1-Score**: **0.3796** (at optimal decision threshold of `0.30`)
* **Confusion Matrix**:

  &#x20;   ```text
                      Predicted Open   Predicted Closed
    Actual Open            1,283             99
    Actual Closed            71              52
    ```

  ### 3\. Traffic Forecasting (Junction \& Corridor)

* **Algorithm**: Facebook Prophet Additive Seasonality
* **Average MAE**: **0.18** incidents/hour
* **Lowest Error Corridor**: **0.129 MAE** (Outer Ring Road East 2)
* **Highest Volume Corridor**: **0.439 MAE** (Mysore Road)

  \---

## 

  ## Visual Mockups \& Presentation Assets

  All high-fidelity UI layout files are saved in `/presentation\_assets/` for quick inclusion in slides or reports:

* `architecture\_diagram.png`: System architecture design sketch.
* `gateway\_a\_dashboard\_home.png`: Incident dispatching live timeline.
* `gateway\_a\_priority\_prediction.png`: Unbiased priority classifier side-by-side.
* `gateway\_a\_closure\_prediction.png`: Physical road closure risk alerts.
* `gateway\_a\_duration\_prediction.png`: Median clearance statistics.
* `gateway\_a\_forecast\_chart.png`: Prophet 72-hour seasonality charts.
* `gateway\_b\_dashboard\_home.png`: Master GIS map showing road network stress.
* `gateway\_b\_road\_stress.png`: Selected stress breakdown popup.
* `gateway\_b\_propagation\_engine.png`: Expanding concentric shockwave circles.
* `gateway\_b\_congestion\_cost.png`: Flipkart LCV route economics.
* `map\_best\_screenshot.png`: Custom dark-mode Leaflet map layer.
* `map\_hotspot\_view.png`: Intersection risk heatmap leaderboard.
* `confusion\_matrix\_metrics.png`: Model validation scores layout.

