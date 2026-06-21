import { client } from "./client";
import { homeMock, operationalAIMock, trafficIntelligenceMock } from "../data/commandCenterData";

const withFallback = async (request, fallback) => {
  try {
    const response = await request();
    return response.data;
  } catch {
    return fallback;
  }
};

export const getHomeCommandData = async () => {
  const [incidents, corridors] = await Promise.all([
    withFallback(() => client.get("/incidents?limit=5"), null),
    withFallback(() => client.get("/corridors/risk"), null),
  ]);

  if (!incidents && !corridors) return homeMock;

  const activeIncidents = incidents?.filtered ?? incidents?.incidents?.length ?? homeMock.activeIncidents;
  const highRiskCorridors = corridors?.corridors?.filter((c) => c.composite_risk_score >= 55).length ?? homeMock.highRiskCorridors;
  const criticalRoads = corridors?.corridors?.filter((c) => c.composite_risk_score >= 75).length ?? homeMock.criticalRoads;

  return {
    ...homeMock,
    activeIncidents,
    highRiskCorridors,
    criticalRoads,
    incidents: incidents?.incidents?.slice(0, 3).map((item) => ({
      id: item.id,
      type: item.event_cause,
      corridor: item.corridor || "Non-corridor",
      priority: item.priority,
      eta: item.duration_mins ? `${Math.round(item.duration_mins)} min` : "Pending",
    })) ?? homeMock.incidents,
  };
};

export const getOperationalAIData = async () => operationalAIMock;

export const getTrafficIntelligenceData = async () => {
  const [roadStress, shockwave, surge, domino, cost] = await Promise.all([
    withFallback(() => client.post("/intelligence/road-stress", { max_results: 10 }), null),
    withFallback(() => client.post("/intelligence/shockwave", { source_corridor: "ORR East 2", event_cause: "accident" }), null),
    withFallback(() => client.post("/intelligence/vehicle-surge", { corridor: "ORR East 2" }), null),
    withFallback(() => client.post("/intelligence/domino", { source_corridor: "ORR East 2", additional_vehicles: 10 }), null),
    withFallback(() => client.post("/intelligence/congestion-cost", {
      routes: [
        { route_id: "route_1", corridor: "ORR East 2", distance_km: 6.5 },
        { route_id: "route_2", corridor: "Mysore Road", distance_km: 8 },
      ],
    }), null),
  ]);

  if (!roadStress && !shockwave && !surge && !domino && !cost) {
    return trafficIntelligenceMock;
  }

  return {
    ...trafficIntelligenceMock,
    roadStress: roadStress?.roads?.map((road) => ({
      corridor: road.corridor,
      stress: road.stress_score,
      level: road.stress_level,
      lat: 12.9716,
      lng: 77.5946,
      factors: road.calculated_values || {},
      insight: road.insight,
    })) ?? trafficIntelligenceMock.roadStress,
    shockwave: shockwave ? {
      source: shockwave.source_corridor,
      forecast: shockwave.affected_roads?.slice(0, 5).map((road, index) => ({
        corridor: road.corridor,
        minutes: road.estimated_spread_time_mins,
        probability: road.congestion_probability,
        lat: trafficIntelligenceMock.shockwave.forecast[index]?.lat ?? 12.9716,
        lng: trafficIntelligenceMock.shockwave.forecast[index]?.lng ?? 77.5946,
      })) ?? trafficIntelligenceMock.shockwave.forecast,
    } : trafficIntelligenceMock.shockwave,
    vehicleSurge: surge ? {
      corridor: surge.corridor,
      flowBalanceIndex: surge.vehicle_surge_index > 0 ? surge.incoming_vehicle_rate_per_min / Math.max(surge.outgoing_vehicle_rate_per_min, 0.1) : 1,
      incoming: surge.incoming_vehicle_rate_per_min,
      outgoing: surge.outgoing_vehicle_rate_per_min,
      windows: surge.windows?.map((item) => ({
        minutes: item.minutes,
        vehicles: item.net_accumulated_vehicles,
        wait: item.additional_waiting_time_mins,
      })) ?? trafficIntelligenceMock.vehicleSurge.windows,
    } : trafficIntelligenceMock.vehicleSurge,
    domino: domino ? {
      source: domino.source_corridor,
      scenarios: domino.steps?.slice(0, 3).map((step, index) => ({
        vehicles: [5, 10, 15][index],
        sourceStress: step.impacted_roads?.[0]?.after_stress_score ?? 50,
        critical: (step.impacted_roads?.[0]?.after_stress_score ?? 0) >= 80,
        cityLift: step.city_congestion_increase_pct,
      })) ?? trafficIntelligenceMock.domino.scenarios,
      timeline: trafficIntelligenceMock.domino.timeline,
    } : trafficIntelligenceMock.domino,
    congestionCost: cost ? {
      bestRoute: cost.best_route_id,
      routes: cost.routes?.map((route) => ({
        route: route.route_id,
        corridor: route.corridor,
        distance: route.distance_km,
        fuel: route.fuel_cost,
        time: route.time_cost,
        idle: route.idle_fuel_cost,
        economic: route.total_cost,
      })) ?? trafficIntelligenceMock.congestionCost.routes,
    } : trafficIntelligenceMock.congestionCost,
  };
};
