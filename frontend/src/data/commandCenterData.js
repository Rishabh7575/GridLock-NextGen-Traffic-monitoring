export const operationalAIMock = {
  highPriority: {
    title: "High Priority Prediction",
    bestModel: "Random Forest",
    metrics: {
      accuracy: 0.9987,
      precision: 1,
      recall: 0.9979,
      f1: 0.9989,
      rocAuc: 1,
    },
    confusionMatrix: {
      labels: ["Low", "High"],
      values: [
        [568, 0],
        [2, 935],
      ],
    },
    featureImportance: [
      { feature: "is_high_priority_corridor", importance: 0.18 },
      { feature: "corridor_priority_rate", importance: 0.15 },
      { feature: "cause_station_key_rate", importance: 0.13 },
      { feature: "police_station_freq", importance: 0.1 },
      { feature: "event_cause_target_rate", importance: 0.09 },
      { feature: "station_load", importance: 0.08 },
      { feature: "vehicle_type_freq", importance: 0.06 },
      { feature: "hour_of_day", importance: 0.05 },
    ],
    rocCurve: [
      { fpr: 0, tpr: 0 },
      { fpr: 0.002, tpr: 0.92 },
      { fpr: 0.005, tpr: 0.98 },
      { fpr: 0.01, tpr: 0.998 },
      { fpr: 1, tpr: 1 },
    ],
  },
  duration: {
    title: "Duration Classification",
    bestModel: "Random Forest",
    metrics: {
      accuracy: 0.5085,
      precision: 0.5075,
      recall: 0.5109,
      f1: 0.5076,
    },
    confusionMatrix: {
      labels: ["Short", "Medium", "Long"],
      values: [
        [96, 68, 31],
        [74, 102, 58],
        [29, 50, 82],
      ],
    },
    featureImportance: [
      { feature: "event_cause_duration_rate", importance: 0.16 },
      { feature: "cause_station_key_rate", importance: 0.12 },
      { feature: "station_load", importance: 0.11 },
      { feature: "hour_of_day", importance: 0.09 },
      { feature: "vehicle_type_freq", importance: 0.08 },
      { feature: "zone_closure_rate", importance: 0.07 },
      { feature: "corridor_freq", importance: 0.06 },
      { feature: "month", importance: 0.05 },
    ],
    distribution: [
      { name: "Short", value: 33 },
      { name: "Medium", value: 40 },
      { name: "Long", value: 27 },
    ],
  },
  corridorRisk: {
    title: "Corridor Risk Classification",
    bestModel: "Random Forest",
    metrics: {
      accuracy: 0.4444,
      precision: 0.6458,
      recall: 0.4583,
      f1: 0.5,
    },
    confusionMatrix: {
      labels: ["Low", "Medium", "High", "Critical"],
      values: [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [0, 0, 2, 2],
      ],
    },
    featureImportance: [
      { feature: "closure_rate", importance: 0.26 },
      { feature: "incident_frequency", importance: 0.22 },
      { feature: "priority_frequency", importance: 0.2 },
      { feature: "average_duration", importance: 0.16 },
      { feature: "station_count", importance: 0.09 },
      { feature: "zone_count", importance: 0.07 },
    ],
    riskDistribution: [
      { name: "Low", value: 5 },
      { name: "Medium", value: 5 },
      { name: "High", value: 5 },
      { name: "Critical", value: 6 },
    ],
  },
};

export const trafficIntelligenceMock = {
  roadStress: [
    {
      corridor: "ORR East 2",
      stress: 45.2,
      level: "Moderate",
      lat: 12.97598,
      lng: 77.695923,
      factors: {
        roadImportance: 2.8,
        closureFrequency: 1.7,
        priorityFrequency: 100,
        durationRisk: 100,
        stationLoad: 47.7,
        neighborInfluence: 32.8,
      },
      insight: "Priority frequency and duration risk dominate the stress profile.",
    },
    {
      corridor: "Mysore Road",
      stress: 44.1,
      level: "Moderate",
      lat: 12.958088,
      lng: 77.564186,
      factors: {
        roadImportance: 38.3,
        closureFrequency: 11,
        priorityFrequency: 99.7,
        durationRisk: 5.7,
        stationLoad: 75.8,
        neighborInfluence: 40.6,
      },
      insight: "Station load and neighbor influence make this corridor sensitive to spillover.",
    },
    {
      corridor: "Bellary Road 2",
      stress: 40.3,
      level: "Moderate",
      lat: 13.103,
      lng: 77.594,
      factors: {
        roadImportance: 5.9,
        closureFrequency: 3.2,
        priorityFrequency: 100,
        durationRisk: 8.3,
        stationLoad: 63.4,
        neighborInfluence: 38,
      },
      insight: "High priority density keeps stress elevated during response windows.",
    },
    {
      corridor: "Hosur Road",
      stress: 39.8,
      level: "Moderate",
      lat: 12.908,
      lng: 77.637,
      factors: {
        roadImportance: 29.4,
        closureFrequency: 6.6,
        priorityFrequency: 100,
        durationRisk: 6.8,
        stationLoad: 42,
        neighborInfluence: 35,
      },
      insight: "Neighbor pressure from ORR East can raise downstream congestion risk.",
    },
  ],
  shockwave: {
    source: "ORR East 2",
    forecast: [
      { corridor: "ORR East 1", minutes: 16.7, probability: 0.47, lat: 12.917, lng: 77.623 },
      { corridor: "Varthur Road", minutes: 19.1, probability: 0.42, lat: 12.956, lng: 77.742 },
      { corridor: "Old Airport Road", minutes: 23.4, probability: 0.39, lat: 12.959, lng: 77.657 },
      { corridor: "Hosur Road", minutes: 29.8, probability: 0.36, lat: 12.908, lng: 77.637 },
    ],
  },
  vehicleSurge: {
    corridor: "ORR East 2",
    flowBalanceIndex: 1.43,
    incoming: 2.2,
    outgoing: 1.54,
    windows: [
      { minutes: 5, vehicles: 3.3, wait: 0.4 },
      { minutes: 15, vehicles: 9.9, wait: 1.2 },
      { minutes: 30, vehicles: 19.8, wait: 2.4 },
    ],
  },
  domino: {
    source: "ORR East 2",
    scenarios: [
      { vehicles: 5, sourceStress: 54.2, critical: false, cityLift: 2.4 },
      { vehicles: 10, sourceStress: 63.2, critical: false, cityLift: 4.7 },
      { vehicles: 15, sourceStress: 72.2, critical: false, cityLift: 7.1 },
    ],
    timeline: [
      { minutes: 5, road: "ORR East 2", stress: 54 },
      { minutes: 15, road: "ORR East 1", stress: 58 },
      { minutes: 30, road: "Varthur Road", stress: 61 },
    ],
  },
  congestionCost: {
    bestRoute: "route_1",
    routes: [
      {
        route: "route_1",
        corridor: "ORR East 2",
        distance: 6.5,
        fuel: 62.33,
        time: 51.02,
        idle: 12.36,
        economic: 125.71,
      },
      {
        route: "route_2",
        corridor: "Mysore Road",
        distance: 8,
        fuel: 78.11,
        time: 76.83,
        idle: 20.54,
        economic: 175.48,
      },
    ],
  },
};

export const homeMock = {
  activeIncidents: 24,
  highRiskCorridors: 6,
  criticalRoads: 0,
  alerts: [
    { title: "ORR East 2 duration risk elevated", severity: "moderate", corridor: "ORR East 2" },
    { title: "Mysore Road station load rising", severity: "high", corridor: "Mysore Road" },
    { title: "Shockwave forecast active on ORR East", severity: "moderate", corridor: "ORR East 1" },
  ],
  incidents: [
    { id: "INC-241", type: "vehicle_breakdown", corridor: "Mysore Road", priority: "High", eta: "12 min" },
    { id: "INC-244", type: "accident", corridor: "ORR East 2", priority: "High", eta: "8 min" },
    { id: "INC-250", type: "water_logging", corridor: "Bellary Road 2", priority: "Medium", eta: "18 min" },
  ],
};

export const bengaluruCenter = [12.9716, 77.5946];
