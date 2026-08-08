from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.core.data import metrics_df, complaints_df, get_fleet_averages
from app.core.scoring import get_scored_routers

router = APIRouter()

class MetricTimeseriesItem(BaseModel):
    timestamp: str
    speed: float
    latency: float
    packet_loss: float
    disconnects: int
    signal: float

class MetricsSummary(BaseModel):
    avg_speed: float
    avg_latency: float
    avg_packet_loss: float
    total_disconnects: int
    avg_signal: float
    fleet_avg_speed: float
    fleet_avg_latency: float
    fleet_avg_packet_loss: float
    fleet_avg_disconnects: float

class ComplaintItem(BaseModel):
    timestamp: str
    text: str

class RouterDetailResponse(BaseModel):
    router_id: str
    building: str
    room: str
    model: str
    firmware: str
    user_type: str
    health_score: float
    status: str
    metrics_timeseries: List[MetricTimeseriesItem]
    metrics_summary: MetricsSummary
    complaints: List[ComplaintItem]

@router.get("/api/router/{router_id}", response_model=RouterDetailResponse)
def get_router_detail(router_id: str):
    """
    Get detailed metrics, averages, fleet averages, and complaints for a specific router.
    """
    # 1. Check if the router exists in scored routers
    scored = get_scored_routers()
    router_info = next((r for r in scored if r["router_id"].lower() == router_id.lower()), None)
    
    if not router_info:
        raise HTTPException(status_code=404, detail="Router not found")
        
    # 2. Filter timeseries metrics for this router
    router_metrics = metrics_df[metrics_df["router_id"].str.lower() == router_id.lower()]
    timeseries = []
    for _, row in router_metrics.iterrows():
        timeseries.append({
            "timestamp": str(row["hour"]),
            "speed": round(float(row["avg_speed_mbps"]), 1),
            "latency": round(float(row["latency_ms"]), 1),
            "packet_loss": round(float(row["packet_loss_pct"]), 1),
            "disconnects": int(row["disconnects"]),
            "signal": round(float(row["signal_dbm"]), 1)
        })
        
    # 3. Filter complaints for this router
    router_complaints = complaints_df[complaints_df["router_id"].str.lower() == router_id.lower()]
    complaints = []
    for _, row in router_complaints.iterrows():
        complaints.append({
            "timestamp": str(row["date"]),
            "text": str(row["complaint_text"])
        })
        
    # 4. Get fleet averages
    fleet_avgs = get_fleet_averages()
    
    # 5. Build response matching api-contract.md structure
    response = {
        "router_id": router_info["router_id"],
        "building": router_info["building"],
        "room": router_info["room"],
        "model": router_info["model"],
        "firmware": router_info["firmware"],
        "user_type": router_info["user_type"],
        "health_score": router_info["health_score"],
        "status": router_info["status"],
        "metrics_timeseries": timeseries,
        "metrics_summary": {
            "avg_speed": router_info["avg_speed"],
            "avg_latency": router_info["avg_latency"],
            "avg_packet_loss": router_info["avg_packet_loss"],
            "total_disconnects": router_info["total_disconnects"],
            "avg_signal": router_info["avg_signal"],
            "fleet_avg_speed": round(fleet_avgs["fleet_avg_speed"], 1),
            "fleet_avg_latency": round(fleet_avgs["fleet_avg_latency"], 1),
            "fleet_avg_packet_loss": round(fleet_avgs["fleet_avg_packet_loss"], 1),
            "fleet_avg_disconnects": round(fleet_avgs["fleet_avg_disconnects"], 1)
        },
        "complaints": complaints
    }
    
    return response
