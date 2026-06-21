# GridSense Frontend Architecture

This document defines the comprehensive Next.js frontend architecture for the GridSense application. It splits the core application into two main gateways (Operational Intelligence & Traffic Intelligence) plus a dedicated Map interface, utilizing Next.js, Tailwind CSS, shadcn/ui, Recharts, Leaflet, and React Query.

## 1. Directory Structure

We will adopt a Next.js App Router structure optimized for domain-driven design.

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # Main layout with Sidebar/Navbar
│   │   │   ├── page.tsx                   # Redirects to /gateway-a
│   │   │   ├── gateway-a/
│   │   │   │   └── page.tsx               # Operational Intelligence
│   │   │   └── gateway-b/
│   │   │       └── page.tsx               # Traffic Intelligence
│   │   ├── map/
│   │   │   ├── layout.tsx                 # Fullscreen map layout
│   │   │   └── page.tsx                   # Dedicated Map Page
│   │   ├── layout.tsx                     # Root HTML/Body
│   │   └── globals.css                    # Global Tailwind tokens
│   ├── components/
│   │   ├── ui/                            # shadcn/ui generic components
│   │   ├── charts/                        # Recharts wrappers
│   │   ├── maps/                          # Leaflet map components
│   │   ├── gateway-a/                     # Domain specific components
│   │   └── gateway-b/                     # Domain specific components
│   ├── hooks/
│   │   ├── api/                           # React Query custom hooks
│   │   └── use-debounce.ts
│   ├── lib/
│   │   ├── api-client.ts                  # Axios/Fetch configuration
│   │   ├── utils.ts                       # Tailwind merge utils (cn)
│   │   └── types.ts                       # TypeScript interfaces
│   └── public/
│       └── assets/
```

## 2. Page & Component Structure

### A. Gateway A: Operational Intelligence (`/gateway-a`)
Focuses on event triage, prediction, forecasting, and historical planning.

**Core Components:**
- `IncidentPriorityCard`: Displays High/Low probability with explanation texts.
- `ClosureRiskCard`: Displays closure flag, probability score, and confidence interval.
- `DurationEstimatorCard`: Visualizes median duration alongside p25 and p75 boundaries.
- `ForecastingChart`: Line chart showing 72-hour incident volume trends.
- `BlackspotAnalyticsTable`: Data table listing top blackspots, chronic locations, and neglected police stations.
- `CascadePlannerPanel`: Interactive form to input planned events and calculate affected corridors and risk multipliers.

### B. Gateway B: Traffic Intelligence (`/gateway-b`)
Focuses on physical network physics, congestion, domino effects, and efficiency.

**Core Components:**
- `RoadStressGauge`: A semi-circle gauge chart showing the current stress score and a breakdown of contributing factors.
- `PropagationEnginePanel`: Displays vehicle surge ratios, current vs predicted vehicles, propagation probability, and ETA to spread.
- `DominoSimulatorCard`: Interactive sandbox with sliders for vehicle increases and accident severity, outputting network-wide congestion increases.
- `CongestionCostEngine`: A side-by-side comparison interface for Route A vs Route B, calculating delay, fuel cost, idle cost, and final efficiency score.

### C. Map Page (`/map`)
A dedicated fullscreen geographical interface using React-Leaflet.

**Core Components:**
- `StressHeatmapLayer`: GeoJSON/Polyline layer coloring corridors Green/Yellow/Orange/Red based on real-time stress.
- `PropagationAnimationLayer`: Animated directional arrows originating from source roads to affected neighbor roads.
- `DominoSimulationOverlay`: A toggleable layer that highlights roads affected by the user's sandbox domino scenario.
- `RouteComparisonOverlay`: Renders the calculated optimal and alternative routes from the Cost Engine directly on the map.

## 3. Data Layer & API Hooks (React Query)

To keep the UI responsive, all backend communication will be managed via custom React Query hooks:

- **Gateway A Hooks:**
  - `usePredictPriority(incidentData)`
  - `usePredictClosure(incidentData)`
  - `useDurationEstimate(incidentData)`
  - `useForecasting(hours=72)`
  - `useBlackspots()`
  - `useCascadePlanner(eventData)`

- **Gateway B Hooks:**
  - `useRoadStress(corridorId)`
  - `usePropagation(surgeData)`
  - `useDominoSimulation(scenarioInputs)`
  - `useCongestionCost(routeA, routeB)`

- **Map Hooks:**
  - `useMapStressData()`
  - `useMapRoutes()`

## 4. Visualizations Required

### Charts (Recharts)
1. **72-Hour Forecast (Area/Line Chart):** Shaded area chart showing incident volume trends over time.
2. **Duration Distribution (Box Plot / Bar):** Visualizing median, p25, and p75.
3. **Road Stress Breakdown (Gauge + Donut):** Main gauge for total score, donut for factor breakdown (density, delay, weather).
4. **Cost Comparison (Radar or Grouped Bar Chart):** Route A vs Route B on multiple axes (Fuel, Time, Delay).

### Map Layers (Leaflet)
1. **Corridor Vectors:** Polylines mapped to existing `corridors.json` geometries.
2. **Stress Heatmap:** Dynamic coloring of polylines based on real-time scores.
3. **Flow Animations:** SVG overlays on polylines to simulate directional vehicle propagation.
4. **Route Vectors:** Highlighted primary and secondary paths.

## 5. Implementation Order

To build this systematically and efficiently:

1. **Phase 1: Foundation (Day 1)**
   - Initialize Next.js project with App Router, Tailwind, and shadcn/ui.
   - Setup React Query provider and global layout (Sidebar navigation).

2. **Phase 2: Gateway A (Day 2)**
   - Build generic cards and forms.
   - Implement Priority, Closure, and Duration components.
   - Integrate Recharts for Forecasting.

3. **Phase 3: Gateway B (Day 3)**
   - Build Gauge charts for Road Stress.
   - Implement Domino Simulator form logic and state.
   - Build Congestion Cost comparison UI.

4. **Phase 4: Map Engine (Day 4)**
   - Integrate `react-leaflet`.
   - Implement dynamic Polyline coloring based on stress.
   - Add propagation animations and route layers.

5. **Phase 5: API Wiring & Polish (Day 5)**
   - Connect all React Query hooks to the FastAPI backend.
   - Implement loading skeletons, error boundaries, and dynamic UI states.
   - Apply final modern aesthetics (Glassmorphism, dark mode gradients).
