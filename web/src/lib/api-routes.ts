export const API_ROUTES = {
  HEALTH: '/health',
  
  // Prediction / Triage / Cascade
  TRIAGE: '/api/v1/predict/triage',
  CASCADE: '/api/v1/predict/cascade',
  PLANNED_EVENT_LOOKUP: '/api/v1/predict/planned-event-lookup',
  
  // Forecasting
  FORECAST_CORRIDORS: '/api/v1/forecast/corridors',
  FORECAST_JUNCTION: (junction: string) => `/api/v1/forecast/junction/${junction}`,
  
  // Incidents
  INCIDENTS: '/api/v1/incidents',
  INCIDENTS_SUMMARY: '/api/v1/incidents/summary',
  INCIDENTS_JUNCTIONS: '/api/v1/incidents/junctions',
  
  // Corridors
  CORRIDORS_RISK: '/api/v1/corridors/risk',
  CORRIDOR_JUNCTIONS: (corridor: string) => `/api/v1/corridors/${corridor}/junctions`,
  
  // Blackspots
  BLACKSPOT_JUNCTIONS: '/api/v1/blackspot/junctions',
  BLACKSPOT_NEGLECT: '/api/v1/blackspot/neglect',
  BLACKSPOT_PROFILE: (junction: string) => `/api/v1/blackspot/junctions/${junction}`,
  
  // Surge Mode
  SURGE_VULNERABILITY: '/api/v1/surge/vulnerability',
  SURGE_REPLAY: '/api/v1/surge/replay/march7',
  SURGE_TRIGGER: '/api/v1/surge/trigger',
  
  // Flipkart/LCV specific
  LCV_RISK: '/api/v1/lcv/risk',
  
  // Traffic Intelligence Engine
  ROAD_STRESS: '/api/v1/intelligence/road-stress',
  SHOCKWAVE: '/api/v1/intelligence/shockwave',
  VEHICLE_SURGE: '/api/v1/intelligence/vehicle-surge',
  CONGESTION_COST: '/api/v1/intelligence/congestion-cost',
  DOMINO: '/api/v1/intelligence/domino',
  MODEL_METRICS: '/api/v1/intelligence/model-metrics',
} as const;
