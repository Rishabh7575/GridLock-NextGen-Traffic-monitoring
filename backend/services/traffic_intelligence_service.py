import json
import math
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

from backend.config import get_settings
from backend.schemas.intelligence import (
    DominoRequest,
    DominoResponse,
    DominoRoadImpact,
    DominoStep,
    CongestionCostRequest,
    CongestionCostResponse,
    RoadStressItem,
    RoadStressRequest,
    RoadStressResponse,
    RouteCostBreakdown,
    SafeDiversionPath,
    ShockwaveAffectedRoad,
    ShockwaveRequest,
    ShockwaveResponse,
    ShockwaveWindow,
    StressFactor,
    VehicleSurgeRequest,
    VehicleSurgeResponse,
    VehicleSurgeWindow,
)


STRESS_WEIGHTS = {
    "density_ratio": 0.25,
    "speed_drop": 0.20,
    "delay_ratio": 0.15,
    "road_centrality": 0.15,
    "historical_congestion_frequency": 0.10,
    "neighbor_congestion_influence": 0.10,
    "weather_risk": 0.05,
}


EVENT_SEVERITY = {
    "accident": 0.80,
    "congestion": 0.75,
    "water_logging": 0.72,
    "tree_fall": 0.65,
    "construction": 0.60,
    "vehicle_breakdown": 0.45,
    "public_event": 0.58,
    "procession": 0.55,
    "protest": 0.62,
    "vip_movement": 0.50,
    "road_conditions": 0.55,
    "pot_holes": 0.45,
    "others": 0.40,
}


class TrafficIntelligenceService:
    """Prototype traffic intelligence layer built from existing GridSense artifacts.

    Live traffic variables are optional. When absent, the service uses historical
    proxies derived from incident frequency, duration, closure rate, blackspots,
    weather vulnerability, and corridor adjacency.
    """

    def __init__(self):
        settings = get_settings()
        self.artifact_dir = Path(settings.ARTIFACT_DIR)
        self.profile = self._load_json("traffic_intelligence_profile.json") or self._fallback_profile()
        self.roads: Dict[str, dict] = self.profile.get("roads", {})
        graph = self.profile.get("graph", {})
        self.adjacency: Dict[str, List[str]] = graph.get("adjacency", {})
        self.cascade_multipliers = self._load_json("cascade_multipliers.json") or {}

    def get_road_stress(self, req: RoadStressRequest) -> RoadStressResponse:
        assumptions = self._base_assumptions(req)
        if req.corridor:
            item = self._build_stress_item(req.corridor, req, include_diversions=True)
            roads = [item]
            mode = "single_corridor"
        else:
            roads = [
                self._build_stress_item(corridor, req, include_diversions=False)
                for corridor in self.roads
                if corridor != "Non-corridor"
            ]
            roads.sort(key=lambda road: road.stress_score, reverse=True)
            roads = roads[: max(1, req.max_results)]
            mode = "leaderboard"
        return RoadStressResponse(mode=mode, assumptions=assumptions, roads=roads)

    def predict_shockwave(self, req: ShockwaveRequest) -> ShockwaveResponse:
        stress_req = RoadStressRequest(
            corridor=req.source_corridor,
            current_vehicle_count=req.current_vehicle_count,
            road_capacity=req.road_capacity,
            current_speed_kmph=req.current_speed_kmph,
        )
        source_stress = self._build_stress_item(req.source_corridor, stress_req, include_diversions=True)
        event_pressure = self._event_pressure(req.event_cause, req.severity_factor)
        peak_pressure = self._time_pressure(req.hour_of_day, req.day_of_week)
        blocked_pressure = _clamp(req.capacity_blocked_pct / 100.0)
        source_pressure = _clamp(
            0.45 * (source_stress.stress_score / 100.0)
            + 0.25 * event_pressure
            + 0.20 * blocked_pressure
            + 0.10 * peak_pressure
        )

        affected = self._shockwave_candidates(
            req.source_corridor,
            source_pressure,
            event_pressure,
            blocked_pressure,
        )
        windows = [
            ShockwaveWindow(
                minutes=minutes,
                affected_roads=[
                    road for road in affected if road.estimated_spread_time_mins <= minutes
                ],
            )
            for minutes in (5, 15, 30)
        ]
        nearby_open_paths = self._safe_diversions(req.source_corridor, max_items=5)
        insight = self._shockwave_insight(req.source_corridor, affected, source_pressure)
        assumptions = self._base_assumptions(stress_req)
        assumptions.append("Shockwave timing is prototype logic based on graph hops, stress, event severity, and capacity loss.")

        return ShockwaveResponse(
            source_corridor=req.source_corridor,
            event_cause=req.event_cause,
            source_stress_score=source_stress.stress_score,
            source_pressure=round(source_pressure, 3),
            affected_roads=affected,
            forecast_windows=windows,
            nearby_open_paths=nearby_open_paths,
            insight=insight,
            assumptions=assumptions,
        )

    def estimate_vehicle_surge(self, req: VehicleSurgeRequest) -> VehicleSurgeResponse:
        road = self._road(req.corridor)
        stress = self._build_stress_item(req.corridor, RoadStressRequest(corridor=req.corridor), False)
        capacity = req.road_capacity or road.get("capacity_proxy", 120.0)
        current_vehicles = req.current_vehicle_count
        if current_vehicles is None:
            current_vehicles = max(10.0, road.get("historical_density_proxy", 0.35) * capacity)
        incoming_rate = req.incoming_vehicle_rate_per_min
        if incoming_rate is None:
            incoming_rate = max(1.0, road.get("incident_frequency_per_day", 0.5) * 3.0 + stress.stress_score / 30.0)
        outgoing_rate = req.outgoing_vehicle_rate_per_min
        if outgoing_rate is None:
            outgoing_rate = incoming_rate * (0.92 - min(stress.stress_score, 95.0) / 300.0)
        avg_delay = req.average_vehicle_delay_mins or max(1.0, road.get("median_duration_mins", 45.0) / 25.0)
        surge_index = incoming_rate - outgoing_rate

        likely_roads = [p.corridor for p in self._safe_diversions(req.corridor, max_items=8) if p.stress_score >= 45]
        if not likely_roads:
            likely_roads = self.adjacency.get(req.corridor, [])[:4]

        windows = []
        for minutes in (5, 15, 30):
            incoming = incoming_rate * minutes
            net = surge_index * minutes
            growth_pct = (net / max(current_vehicles, 1.0)) * 100.0
            waiting = max(0.0, (net / max(capacity, 1.0)) * avg_delay * 6.0)
            windows.append(
                VehicleSurgeWindow(
                    minutes=minutes,
                    predicted_incoming_vehicles=round(incoming, 1),
                    net_accumulated_vehicles=round(net, 1),
                    congestion_growth_pct=round(growth_pct, 1),
                    additional_waiting_time_mins=round(waiting, 1),
                    roads_likely_to_congest=likely_roads[:4],
                )
            )

        assumptions = self._base_assumptions(RoadStressRequest(corridor=req.corridor))
        if req.incoming_vehicle_rate_per_min is None or req.outgoing_vehicle_rate_per_min is None:
            assumptions.append("Vehicle rates are derived from incident frequency and stress because live counts are not present.")

        return VehicleSurgeResponse(
            corridor=req.corridor,
            current_vehicles=round(current_vehicles, 1),
            incoming_vehicle_rate_per_min=round(incoming_rate, 2),
            outgoing_vehicle_rate_per_min=round(outgoing_rate, 2),
            vehicle_surge_index=round(surge_index, 2),
            windows=windows,
            insight=(
                f"{req.corridor} has a vehicle surge index of {surge_index:.2f} vehicles/min; "
                f"positive values mean vehicles are accumulating faster than they clear."
            ),
            assumptions=assumptions,
        )

    def calculate_congestion_cost(self, req: CongestionCostRequest) -> CongestionCostResponse:
        """Compare route economics using a simple replaceable prototype formula."""
        congested_mileage = req.congested_mileage_kmpl or max(req.mileage_kmpl * 0.72, 1.0)
        assumptions = [
            "Prototype formula compares fuel cost, idle fuel, value of time, driver time, and delay penalty.",
            "If route speed or stress is missing, corridor historical proxies are used.",
            "Congested mileage defaults to 72% of normal mileage unless supplied.",
        ]
        breakdowns: List[RouteCostBreakdown] = []
        for route in req.routes:
            road = self._road(route.corridor or route.route_id)
            stress_score = route.stress_score
            if stress_score is None:
                stress_score = self._build_stress_item(
                    route.corridor or route.route_id,
                    RoadStressRequest(corridor=route.corridor or route.route_id),
                    include_diversions=False,
                ).stress_score
            free_flow_speed = route.free_flow_speed_kmph or road.get("historical_speed_kmph", 35.0)
            current_speed = route.current_speed_kmph or road.get("current_speed_proxy_kmph", free_flow_speed * 0.75)
            current_speed = max(current_speed, 3.0)
            free_flow_speed = max(free_flow_speed, current_speed, 5.0)

            travel_time_mins = route.distance_km / current_speed * 60.0
            free_flow_time_mins = route.distance_km / free_flow_speed * 60.0
            delay_mins = max(0.0, travel_time_mins - free_flow_time_mins)
            congestion_ratio = _clamp(stress_score / 100.0, 0.0, 1.0)
            effective_mileage = max(
                req.mileage_kmpl * (1.0 - 0.35 * congestion_ratio),
                congested_mileage,
                1.0,
            )
            fuel_litres = route.distance_km / effective_mileage
            fuel_cost = fuel_litres * req.fuel_price_per_litre
            idle_fuel_cost = (delay_mins / 60.0) * req.idle_fuel_litre_per_hour * req.fuel_price_per_litre
            time_cost = (travel_time_mins / 60.0) * (req.value_of_time_per_hour + req.driver_cost_per_hour)
            delay_penalty = delay_mins * req.delay_penalty_per_min
            congestion_cost = idle_fuel_cost + (delay_mins / 60.0) * req.value_of_time_per_hour + delay_penalty
            total_cost = fuel_cost + idle_fuel_cost + time_cost + delay_penalty
            recommendation_score = max(0.0, 100.0 - total_cost / max(route.distance_km, 0.1) - stress_score * 0.25)
            breakdowns.append(
                RouteCostBreakdown(
                    route_id=route.route_id,
                    corridor=route.corridor,
                    distance_km=round(route.distance_km, 2),
                    current_speed_kmph=round(current_speed, 1),
                    free_flow_speed_kmph=round(free_flow_speed, 1),
                    travel_time_mins=round(travel_time_mins, 1),
                    free_flow_time_mins=round(free_flow_time_mins, 1),
                    delay_mins=round(delay_mins, 1),
                    fuel_litres=round(fuel_litres, 3),
                    fuel_cost=round(fuel_cost, 2),
                    idle_fuel_cost=round(idle_fuel_cost, 2),
                    time_cost=round(time_cost, 2),
                    delay_penalty=round(delay_penalty, 2),
                    congestion_cost=round(congestion_cost, 2),
                    total_cost=round(total_cost, 2),
                    stress_score=round(stress_score, 1),
                    recommendation_score=round(recommendation_score, 1),
                    explanation=(
                        f"{route.route_id} costs about {total_cost:.0f}: "
                        f"{travel_time_mins:.1f} min travel, {delay_mins:.1f} min delay, "
                        f"{fuel_litres:.2f} L fuel, stress {stress_score:.1f}/100."
                    ),
                )
            )
        breakdowns.sort(key=lambda item: (item.total_cost, -item.recommendation_score))
        best = breakdowns[0]
        worst = breakdowns[-1]
        return CongestionCostResponse(
            best_route_id=best.route_id,
            best_route_reason=(
                f"{best.route_id} has the lowest total estimated cost ({best.total_cost:.0f}) "
                f"with {best.delay_mins:.1f} min delay and stress {best.stress_score:.1f}/100."
            ),
            routes=breakdowns,
            savings_vs_worst=round(max(0.0, worst.total_cost - best.total_cost), 2),
            assumptions=assumptions,
        )

    def get_model_metrics(self) -> dict:
        evaluation = self._load_json("traffic_intelligence_evaluation.json")
        if evaluation is None:
            return {
                "status": "not_trained",
                "message": "Run ml/pipeline/12_train_traffic_intelligence.py to generate metrics.",
            }
        return {"status": "available", **evaluation}

    def simulate_domino(self, req: DominoRequest) -> DominoResponse:
        base_item = self._build_stress_item(
            req.source_corridor,
            RoadStressRequest(corridor=req.source_corridor),
            include_diversions=False,
        )
        road = self._road(req.source_corridor)
        capacity = req.road_capacity or road.get("capacity_proxy", 120.0)
        vehicle_pressure = _clamp(req.additional_vehicles / max(capacity, 1.0))
        blocked_pressure = _clamp(req.capacity_blocked_pct / 100.0)
        source_delta = min(35.0, vehicle_pressure * 70.0 + blocked_pressure * 45.0)
        source_after = _clamp(base_item.stress_score + source_delta, 0.0, 100.0)

        shockwave = self.predict_shockwave(
            ShockwaveRequest(
                source_corridor=req.source_corridor,
                event_cause=req.event_cause,
                hour_of_day=req.hour_of_day,
                day_of_week=req.day_of_week,
                capacity_blocked_pct=req.capacity_blocked_pct,
            )
        )

        steps: List[DominoStep] = []
        all_deltas: List[float] = [source_after - base_item.stress_score]
        for minutes in sorted(set(req.simulation_minutes)):
            impacts: List[DominoRoadImpact] = [
                DominoRoadImpact(
                    corridor=req.source_corridor,
                    before_stress_score=base_item.stress_score,
                    after_stress_score=round(source_after, 1),
                    congestion_risk_before=round(base_item.stress_score / 100.0, 3),
                    congestion_risk_after=round(source_after / 100.0, 3),
                    additional_waiting_time_mins=round(source_delta / 8.0, 1),
                    explanation=(
                        f"Source road absorbs {req.additional_vehicles:g} extra vehicles "
                        f"and {req.capacity_blocked_pct:g}% capacity loss."
                    ),
                )
            ]
            for affected in shockwave.affected_roads:
                if affected.estimated_spread_time_mins > minutes:
                    continue
                before = self._build_stress_item(
                    affected.corridor,
                    RoadStressRequest(corridor=affected.corridor),
                    include_diversions=False,
                ).stress_score
                decay = 1.0 / max(1, affected.hop_distance)
                delta = min(30.0, source_delta * 0.45 * decay + affected.congestion_probability * 18.0)
                after = _clamp(before + delta, 0.0, 100.0)
                all_deltas.append(after - before)
                impacts.append(
                    DominoRoadImpact(
                        corridor=affected.corridor,
                        before_stress_score=round(before, 1),
                        after_stress_score=round(after, 1),
                        congestion_risk_before=round(before / 100.0, 3),
                        congestion_risk_after=round(after / 100.0, 3),
                        additional_waiting_time_mins=round((after - before) / 6.5, 1),
                        explanation=(
                            f"Shockwave reaches this road in {affected.estimated_spread_time_mins:g} min "
                            f"with {affected.congestion_probability * 100:.0f}% congestion probability."
                        ),
                    )
                )
            city_pct = self._city_increase_pct(all_deltas)
            steps.append(
                DominoStep(
                    minutes=minutes,
                    impacted_roads=impacts,
                    city_congestion_increase_pct=city_pct,
                )
            )

        city_increase = self._city_increase_pct(all_deltas)
        top_road = None
        if steps and steps[-1].impacted_roads:
            top_road = max(steps[-1].impacted_roads, key=lambda item: item.after_stress_score)
        intervention = (
            f"Pre-position officers before {min(req.simulation_minutes)} min at {top_road.corridor}."
            if top_road
            else f"Monitor {req.source_corridor}; no secondary impact crossed the current threshold."
        )
        scenario = (
            f"Add {req.additional_vehicles:g} vehicles and block {req.capacity_blocked_pct:g}% "
            f"capacity on {req.source_corridor}."
        )
        return DominoResponse(
            source_corridor=req.source_corridor,
            scenario=scenario,
            source_before_stress=base_item.stress_score,
            source_after_stress=round(source_after, 1),
            city_congestion_increase_pct=city_increase,
            steps=steps,
            recommended_intervention=intervention,
            insight=(
                f"{req.source_corridor} stress moves from {base_item.stress_score:.1f} to "
                f"{source_after:.1f}; the simulated city-wide congestion lift is {city_increase:.1f}%."
            ),
            assumptions=[
                "Domino simulation is linked to the shockwave graph and uses stress deltas, not live GPS traces.",
                "City-wide congestion lift is a prototype aggregate over modeled corridors.",
            ],
        )

    def _build_stress_item(
        self,
        corridor: str,
        req: RoadStressRequest,
        include_diversions: bool,
    ) -> RoadStressItem:
        road = self._road(corridor)
        factors, calculated = self._stress_factors(road, req)
        score = round(sum(f.contribution for f in factors.values()), 1)
        score = round(_clamp(score, 0.0, 100.0), 1)
        diversions = self._safe_diversions(corridor, max_items=5) if include_diversions else []
        return RoadStressItem(
            corridor=corridor,
            stress_score=score,
            stress_level=_stress_level(score),
            factors=factors,
            calculated_values=calculated,
            safe_diversions=diversions,
            insight=self._stress_insight(corridor, score, factors),
        )

    def _stress_factors(self, road: dict, req: RoadStressRequest) -> tuple[Dict[str, StressFactor], Dict[str, float]]:
        historical_density = max(float(road.get("historical_density_proxy", 0.25)), 0.05)
        if req.current_vehicle_count is not None and req.road_capacity:
            current_density = _clamp(req.current_vehicle_count / max(req.road_capacity, 1.0))
            density_source = "request vehicle count / capacity"
        else:
            current_density = historical_density
            density_source = "historical density proxy"
        density_ratio = current_density / historical_density
        density_score = _clamp((density_ratio / 2.5) * 100.0, 0.0, 100.0)

        historical_speed = req.historical_speed_kmph or road.get("historical_speed_kmph", 32.0)
        if req.current_speed_kmph is not None:
            current_speed = req.current_speed_kmph
            speed_source = "request current speed"
        else:
            current_speed = road.get("current_speed_proxy_kmph", historical_speed * 0.82)
            speed_source = "historical speed proxy"
        speed_drop = max(0.0, (historical_speed - current_speed) / max(historical_speed, 1.0) * 100.0)
        speed_score = _clamp(speed_drop, 0.0, 100.0)

        historical_travel = req.historical_travel_time_mins or road.get("historical_travel_time_proxy_mins", 12.0)
        if req.current_travel_time_mins is not None:
            current_travel = req.current_travel_time_mins
            delay_source = "request travel time"
        else:
            current_travel = road.get("current_travel_time_proxy_mins", historical_travel * 1.2)
            delay_source = "historical delay proxy"
        delay_ratio = current_travel / max(historical_travel, 1.0)
        delay_score = _clamp((delay_ratio - 1.0) / 2.0 * 100.0, 0.0, 100.0)

        centrality = _clamp(road.get("road_centrality", 0.0))
        historical_frequency = _clamp(road.get("historical_congestion_frequency_score", 0.0), 0.0, 100.0)
        neighbor_influence = _clamp(road.get("neighbor_congestion_influence_score", 0.0), 0.0, 100.0)
        weather_risk = req.weather_risk if req.weather_risk is not None else road.get("weather_risk_score", 0.0)
        weather_risk = _clamp(weather_risk, 0.0, 100.0)

        raw_components = {
            "density_ratio": (density_ratio, density_score, density_source),
            "speed_drop": (speed_drop, speed_score, speed_source),
            "delay_ratio": (delay_ratio, delay_score, delay_source),
            "road_centrality": (centrality, centrality * 100.0, "corridor graph centrality"),
            "historical_congestion_frequency": (
                historical_frequency,
                historical_frequency,
                "incident frequency from dataset",
            ),
            "neighbor_congestion_influence": (
                neighbor_influence,
                neighbor_influence,
                "adjacent corridor density/risk",
            ),
            "weather_risk": (weather_risk, weather_risk, "weather surge artifact"),
        }

        factors = {
            name: StressFactor(
                raw_value=round(raw, 3),
                component_score=round(component, 1),
                weight=weight,
                contribution=round(component * weight, 2),
                source=source,
            )
            for name, weight in STRESS_WEIGHTS.items()
            for raw, component, source in [raw_components[name]]
        }
        calculated = {
            "current_density": round(current_density, 3),
            "historical_density": round(historical_density, 3),
            "density_ratio": round(density_ratio, 3),
            "historical_speed_kmph": round(historical_speed, 1),
            "current_speed_kmph": round(current_speed, 1),
            "speed_drop_pct": round(speed_drop, 1),
            "historical_travel_time_mins": round(historical_travel, 1),
            "current_travel_time_mins": round(current_travel, 1),
            "delay_ratio": round(delay_ratio, 3),
        }
        return factors, calculated

    def _safe_diversions(self, corridor: str, max_items: int = 5) -> List[SafeDiversionPath]:
        candidates = []
        for adjacent in self.adjacency.get(corridor, []):
            if adjacent == "Non-corridor":
                continue
            item = self._build_stress_item(
                adjacent,
                RoadStressRequest(corridor=adjacent),
                include_diversions=False,
            )
            safe_score = round(100.0 - item.stress_score, 1)
            if safe_score >= 70:
                window = 45
            elif safe_score >= 55:
                window = 30
            else:
                window = 15
            reason = (
                "nearby open path; lower stress than source"
                if safe_score >= 55
                else "nearby path, but monitor before diversion"
            )
            candidates.append(
                SafeDiversionPath(
                    corridor=adjacent,
                    stress_score=item.stress_score,
                    safe_score=safe_score,
                    estimated_open_window_mins=window,
                    reason=reason,
                )
            )
        candidates.sort(key=lambda path: path.safe_score, reverse=True)
        return candidates[:max_items]

    def _shockwave_candidates(
        self,
        source_corridor: str,
        source_pressure: float,
        event_pressure: float,
        blocked_pressure: float,
    ) -> List[ShockwaveAffectedRoad]:
        affected: List[ShockwaveAffectedRoad] = []
        visited: Set[str] = {source_corridor}
        frontier = [(source_corridor, 0)]
        while frontier:
            corridor, hop = frontier.pop(0)
            if hop >= 2:
                continue
            for neighbor in self.adjacency.get(corridor, []):
                if neighbor in visited or neighbor == "Non-corridor":
                    continue
                visited.add(neighbor)
                next_hop = hop + 1
                frontier.append((neighbor, next_hop))
                road = self._road(neighbor)
                stress = self._build_stress_item(
                    neighbor,
                    RoadStressRequest(corridor=neighbor),
                    include_diversions=False,
                ).stress_score
                centrality = _clamp(road.get("road_centrality", 0.0))
                probability = _clamp(
                    0.20
                    + 0.35 * source_pressure
                    + 0.25 * (stress / 100.0)
                    + 0.15 * event_pressure
                    + 0.10 * blocked_pressure
                    - 0.10 * (next_hop - 1)
                )
                spread_time = (
                    5.5
                    + next_hop * 8.0
                    + (1.0 - source_pressure) * 8.0
                    + centrality * 6.0
                    - event_pressure * 3.0
                    - blocked_pressure * 2.0
                )
                spread_time = round(max(4.0, spread_time), 1)
                projected_stress = _clamp(stress + probability * 22.0 / next_hop, 0.0, 100.0)
                affected.append(
                    ShockwaveAffectedRoad(
                        corridor=neighbor,
                        hop_distance=next_hop,
                        congestion_probability=round(probability, 3),
                        estimated_spread_time_mins=spread_time,
                        projected_stress_score=round(projected_stress, 1),
                        explanation=(
                            f"{next_hop}-hop road with base stress {stress:.1f}; "
                            f"probability combines source pressure, own stress, and event severity."
                        ),
                    )
                )
        affected.sort(key=lambda item: (item.estimated_spread_time_mins, -item.congestion_probability))
        return affected

    def _event_pressure(self, cause: str, severity_factor: Optional[float]) -> float:
        if severity_factor is not None:
            return _clamp(severity_factor)
        multiplier = self.cascade_multipliers.get(cause, {}).get("cascade_multiplier")
        if multiplier is not None:
            return _clamp(float(multiplier) / 4.0)
        return EVENT_SEVERITY.get(cause, 0.45)

    def _time_pressure(self, hour: int, day_of_week: int) -> float:
        peak = 1.0 if hour in {8, 9, 10, 17, 18, 19, 20} else 0.45
        weekend_relief = 0.85 if day_of_week in {5, 6} else 1.0
        return peak * weekend_relief

    def _stress_insight(self, corridor: str, score: float, factors: Dict[str, StressFactor]) -> str:
        top = sorted(factors.items(), key=lambda item: item[1].contribution, reverse=True)[:3]
        reasons = ", ".join(
            f"{name.replace('_', ' ')} {factor.component_score:.1f}/100"
            for name, factor in top
        )
        return f"{corridor} has a {_stress_level(score).lower()} stress score of {score:.1f}/100 driven by {reasons}."

    def _shockwave_insight(
        self,
        corridor: str,
        affected: List[ShockwaveAffectedRoad],
        pressure: float,
    ) -> str:
        if not affected:
            return f"{corridor} has source pressure {pressure:.2f}, but no adjacent corridor is modeled as affected."
        first = affected[0]
        return (
            f"{corridor} has source pressure {pressure:.2f}; the earliest modeled shockwave reaches "
            f"{first.corridor} in {first.estimated_spread_time_mins:g} min with "
            f"{first.congestion_probability * 100:.0f}% congestion probability."
        )

    def _city_increase_pct(self, deltas: Iterable[float]) -> float:
        values = [max(0.0, d) for d in deltas]
        if not values:
            return 0.0
        return round(min(100.0, sum(values) / max(len(self.roads), 1) * 1.8), 1)

    def _road(self, corridor: str) -> dict:
        if corridor in self.roads:
            return self.roads[corridor]
        return {
            "corridor": corridor,
            "historical_density_proxy": 0.25,
            "historical_speed_kmph": 32.0,
            "current_speed_proxy_kmph": 26.0,
            "historical_travel_time_proxy_mins": 12.0,
            "current_travel_time_proxy_mins": 15.0,
            "road_centrality": 0.0,
            "historical_congestion_frequency_score": 25.0,
            "neighbor_congestion_influence_score": 20.0,
            "weather_risk_score": 0.0,
            "median_duration_mins": 45.0,
            "capacity_proxy": 120.0,
        }

    def _base_assumptions(self, req: RoadStressRequest) -> List[str]:
        assumptions = [
            "Uses existing incident, corridor, blackspot, cascade, and surge artifacts.",
            "No live traffic feed is present, so missing vehicle density/speed values use dataset-derived proxies.",
        ]
        if req.current_vehicle_count is not None and req.road_capacity:
            assumptions.append("Density ratio uses request vehicle count and road capacity.")
        if req.current_speed_kmph is not None:
            assumptions.append("Speed drop uses request current speed.")
        return assumptions

    def _fallback_profile(self) -> dict:
        corridor_risk = self._load_json("corridor_risk_index.json") or {}
        adjacency = self._load_json("corridor_adjacency.json") or {}
        roads = {}
        max_incidents = max((r.get("total_incidents", 0) for r in corridor_risk.values()), default=1)
        for corridor, rec in corridor_risk.items():
            density = rec.get("total_incidents", 0) / max(max_incidents, 1)
            roads[corridor] = {
                "corridor": corridor,
                "total_incidents": rec.get("total_incidents", 0),
                "historical_density_proxy": max(0.05, density),
                "historical_speed_kmph": 32.0,
                "current_speed_proxy_kmph": 25.0,
                "historical_travel_time_proxy_mins": 12.0,
                "current_travel_time_proxy_mins": 16.0,
                "road_centrality": 0.0,
                "historical_congestion_frequency_score": rec.get("composite_risk_score", 25.0),
                "neighbor_congestion_influence_score": 25.0,
                "weather_risk_score": 0.0,
                "median_duration_mins": rec.get("median_duration_mins", 45.0),
                "capacity_proxy": 120.0,
            }
        return {"roads": roads, "graph": {"adjacency": adjacency}}

    def _load_json(self, name: str):
        path = self.artifact_dir / name
        if not path.exists():
            return None
        with open(path) as f:
            return json.load(f)


def _stress_level(score: float) -> str:
    if score <= 30:
        return "Healthy"
    if score <= 60:
        return "Moderate"
    if score <= 80:
        return "High Stress"
    return "Critical"


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    if value is None or math.isnan(float(value)):
        return low
    return max(low, min(high, float(value)))
