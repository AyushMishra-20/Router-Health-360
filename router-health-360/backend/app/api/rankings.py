from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel
from app.core.scoring import get_scored_routers

router = APIRouter()

class RankingResponse(BaseModel):
    router_id: str
    building: str
    room: str
    model: str
    health_score: float
    status: str
    top_issue: Optional[str]

@router.get("/api/rankings", response_model=List[RankingResponse])
def get_rankings(
    limit: int = Query(default=10, ge=1),
    building: Optional[str] = None,
    firmware: Optional[str] = None
):
    """
    Get ranked list of routers, sorted worst health score first.
    Filters by building and/or firmware version if provided.
    """
    scored = get_scored_routers()
    
    # Sort worst health score first
    scored_sorted = sorted(scored, key=lambda x: x["health_score"])
    
    # Apply filters
    filtered = []
    for r in scored_sorted:
        if building and r["building"].lower() != building.lower():
            continue
        if firmware and r["firmware"].lower() != firmware.lower():
            continue
        filtered.append(r)
        
    # Apply limit
    result = filtered[:limit]
    
    # Return formatted response matching the contract
    return [
        {
            "router_id": r["router_id"],
            "building": r["building"],
            "room": r["room"],
            "model": r["model"],
            "health_score": r["health_score"],
            "status": r["status"],
            "top_issue": r["top_issue"]
        }
        for r in result
    ]
