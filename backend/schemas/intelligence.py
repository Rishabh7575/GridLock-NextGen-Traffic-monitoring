from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class RoadStressRequest(BaseModel):
    corridor: Optional[str] = None
    current_vehicle_count: Optional[float] = None
    road_capacity: Optional[float] = None
    current_speed_kmph: Optional[float] = None
    historical_speed_kmph: Optional[float] = None
    current_travel_time_mins: Optional[float] = None
    historical_travel_time_mins: Optional[float] = None
    weather_risk: Optional[float] = Field(default=None, description="0-100 override")
    max_results: int = 10


class StressFactor(BaseModel):
    raw_value: float
    component_score: float
    weight: float
    contribution: float
    source: str


class SafeDiversionPath(BaseModel):
    corridor: str
    stress_score: float
    safe_score: float
    estimated_open_window_mins: int
    reason: str


class RoadStressItem(BaseModel):
    corridor: str
    stress_score: float
    stress_level: str
    factors: Dict[str, StressFactor]
    calculated_values: Dict[str, float]
    safe_diversions: List[SafeDiversionPath] = []
    insight: str


class RoadStressResponse(BaseModel):
    mode: str
    assumptions: List[str]
    roads: List[RoadStressItem]


class ShockwaveRequest(BaseModel):
    source_corridor: str
    event_cause: str = "accident"
    hour_of_day: int = 18
    day_of_week: int = 0
    current_vehicle_count: Optional[float] = None
    road_capacity: Optional[float] = None
    current_speed_kmph: Optional[float] = None
    capacity_blocked_pct: float = 0.0
    severity_factor: Optional[float] = Field(default=None, description="0-1 override")


class ShockwaveAffectedRoad(BaseModel):
    corridor: str
    hop_distance: int
    congestion_probability: float
    estimated_spread_time_mins: float
    projected_stress_score: float
    explanation: str


class ShockwaveWindow(BaseModel):
    minutes: int
    affected_roads: List[ShockwaveAffectedRoad]


class ShockwaveResponse(BaseModel):
    source_corridor: str
    event_cause: str
    source_stress_score: float
    source_pressure: float
    affected_roads: List[ShockwaveAffectedRoad]
    forecast_windows: List[ShockwaveWindow]
    nearby_open_paths: List[SafeDiversionPath]
    insight: str
    assumptions: List[str]


class VehicleSurgeRequest(BaseModel):
    corridor: str
    current_vehicle_count: Optional[float] = None
    road_capacity: Optional[float] = None
    incoming_vehicle_rate_per_min: Optional[float] = None
    outgoing_vehicle_rate_per_min: Optional[float] = None
    average_vehicle_delay_mins: Optional[float] = None


class VehicleSurgeWindow(BaseModel):
    minutes: int
    predicted_incoming_vehicles: float
    net_accumulated_vehicles: float
    congestion_growth_pct: float
    additional_waiting_time_mins: float
    roads_likely_to_congest: List[str]


class VehicleSurgeResponse(BaseModel):
    corridor: str
    current_vehicles: float
    incoming_vehicle_rate_per_min: float
    outgoing_vehicle_rate_per_min: float
    vehicle_surge_index: float
    windows: List[VehicleSurgeWindow]
    insight: str
    assumptions: List[str]


class RouteOptionInput(BaseModel):
    route_id: str
    corridor: Optional[str] = None
    distance_km: float
    current_speed_kmph: Optional[float] = None
    free_flow_speed_kmph: Optional[float] = None
    stress_score: Optional[float] = None
    vehicle_type: str = "lcv"


class CongestionCostRequest(BaseModel):
    routes: List[RouteOptionInput]
    fuel_price_per_litre: float = 100.0
    mileage_kmpl: float = 12.0
    congested_mileage_kmpl: Optional[float] = None
    value_of_time_per_hour: float = 150.0
    driver_cost_per_hour: float = 120.0
    idle_fuel_litre_per_hour: float = 1.0
    delay_penalty_per_min: float = 0.0


class RouteCostBreakdown(BaseModel):
    route_id: str
    corridor: Optional[str]
    distance_km: float
    current_speed_kmph: float
    free_flow_speed_kmph: float
    travel_time_mins: float
    free_flow_time_mins: float
    delay_mins: float
    fuel_litres: float
    fuel_cost: float
    idle_fuel_cost: float
    time_cost: float
    delay_penalty: float
    congestion_cost: float
    total_cost: float
    stress_score: float
    recommendation_score: float
    explanation: str


class CongestionCostResponse(BaseModel):
    best_route_id: str
    best_route_reason: str
    routes: List[RouteCostBreakdown]
    savings_vs_worst: float
    assumptions: List[str]


class DominoRequest(BaseModel):
    source_corridor: str
    event_cause: str = "accident"
    hour_of_day: int = 18
    day_of_week: int = 0
    additional_vehicles: float = 10.0
    road_capacity: Optional[float] = None
    capacity_blocked_pct: float = 0.0
    simulation_minutes: List[int] = Field(default_factory=lambda: [10, 20, 30])


class DominoRoadImpact(BaseModel):
    corridor: str
    before_stress_score: float
    after_stress_score: float
    congestion_risk_before: float
    congestion_risk_after: float
    additional_waiting_time_mins: float
    explanation: str


class DominoStep(BaseModel):
    minutes: int
    impacted_roads: List[DominoRoadImpact]
    city_congestion_increase_pct: float


class DominoResponse(BaseModel):
    source_corridor: str
    scenario: str
    source_before_stress: float
    source_after_stress: float
    city_congestion_increase_pct: float
    steps: List[DominoStep]
    recommended_intervention: str
    insight: str
    assumptions: List[str]
