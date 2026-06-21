from fastapi import APIRouter, Depends

from backend.schemas.intelligence import (
    DominoRequest,
    DominoResponse,
    CongestionCostRequest,
    CongestionCostResponse,
    RoadStressRequest,
    RoadStressResponse,
    ShockwaveRequest,
    ShockwaveResponse,
    VehicleSurgeRequest,
    VehicleSurgeResponse,
)
from backend.services.traffic_intelligence_service import TrafficIntelligenceService

router = APIRouter(prefix="/intelligence", tags=["traffic-intelligence"])


@router.post("/road-stress", response_model=RoadStressResponse)
def road_stress(
    request: RoadStressRequest,
    service: TrafficIntelligenceService = Depends(),
):
    return service.get_road_stress(request)


@router.post("/shockwave", response_model=ShockwaveResponse)
def shockwave(
    request: ShockwaveRequest,
    service: TrafficIntelligenceService = Depends(),
):
    return service.predict_shockwave(request)


@router.post("/vehicle-surge", response_model=VehicleSurgeResponse)
def vehicle_surge(
    request: VehicleSurgeRequest,
    service: TrafficIntelligenceService = Depends(),
):
    return service.estimate_vehicle_surge(request)


@router.post("/congestion-cost", response_model=CongestionCostResponse)
def congestion_cost(
    request: CongestionCostRequest,
    service: TrafficIntelligenceService = Depends(),
):
    return service.calculate_congestion_cost(request)


@router.get("/model-metrics", response_model=dict)
def model_metrics(service: TrafficIntelligenceService = Depends()):
    return service.get_model_metrics()


@router.post("/domino", response_model=DominoResponse)
def domino(
    request: DominoRequest,
    service: TrafficIntelligenceService = Depends(),
):
    return service.simulate_domino(request)
