from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from backend.api.dependencies import get_db
from backend.schemas.incident import (
    IncidentListResponse,
    IncidentSummaryResponse,
    JunctionsResponse
)
from backend.db.repositories.incident_repository import IncidentRepository

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
def get_incidents(
    corridor: Optional[str] = None,
    event_cause: Optional[str] = None,
    priority: Optional[str] = None,
    event_type: Optional[str] = None,
    exclude_stale: bool = True,
    limit: int = 2000,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    try:
        repo = IncidentRepository(db)

        total, filtered, incidents = repo.get_incidents(
            corridor,
            event_cause,
            priority,
            event_type,
            exclude_stale,
            limit,
            offset,
        )

        return {
            "total": total,
            "filtered": filtered,
            "incidents": [
                {
                    "id": i.id,
                    "event_type": i.event_type,
                    "event_cause": i.event_cause,
                    "latitude": i.latitude,
                    "longitude": i.longitude,
                    "corridor": i.corridor,
                    "junction": i.junction,
                    "police_station": i.police_station,
                    "priority": i.priority,
                    "requires_road_closure": i.requires_road_closure,
                    "start_datetime": str(i.start_datetime),
                    "duration_mins": i.duration_mins,
                    "status": i.status,
                    "is_stale_active": i.is_stale_active,
                }
                for i in incidents
            ]
        }

    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    try:
        repo = IncidentRepository(db)
        return repo.get_summary()

    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }


@router.get("/junctions")
def get_junctions(db: Session = Depends(get_db)):
    try:
        repo = IncidentRepository(db)

        return {
            "junctions": repo.get_junction_aggregates()
        }

    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }