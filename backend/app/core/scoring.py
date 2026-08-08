import pandas as pd
from app.core.data import get_router_summary, get_fleet_averages

def normalize(val, min_val, max_val, higher_is_better):
    """Normalize a value to 0-100 based on min/max bounds."""
    if max_val == min_val:
        return 100.0
    if higher_is_better:
        score = 100.0 * (val - min_val) / (max_val - min_val)
    else:
        score = 100.0 * (max_val - val) / (max_val - min_val)
    return max(0.0, min(100.0, score))

def get_scored_routers():
    """Calculate health scores, status, top issue, and sort worst-first."""
    summary = get_router_summary()
    
    if summary.empty:
        return []
        
    # Get fleet min and max for normalization
    mins = summary[["avg_speed", "avg_latency", "avg_packet_loss", "total_disconnects", "avg_signal"]].min()
    maxes = summary[["avg_speed", "avg_latency", "avg_packet_loss", "total_disconnects", "avg_signal"]].max()
    
    scored_list = []
    for _, row in summary.iterrows():
        # Normalize each metric
        speed_score = normalize(row["avg_speed"], mins["avg_speed"], maxes["avg_speed"], True)
        latency_score = normalize(row["avg_latency"], mins["avg_latency"], maxes["avg_latency"], False)
        packet_loss_score = normalize(row["avg_packet_loss"], mins["avg_packet_loss"], maxes["avg_packet_loss"], False)
        disconnect_score = normalize(row["total_disconnects"], mins["total_disconnects"], maxes["total_disconnects"], False)
        signal_score = normalize(row["avg_signal"], mins["avg_signal"], maxes["avg_signal"], True)
        
        # Calculate weighted health score
        health_score = (
            0.25 * speed_score +
            0.20 * latency_score +
            0.20 * packet_loss_score +
            0.25 * disconnect_score +
            0.10 * signal_score
        )
        # Round to 1 decimal place as shown in api-contract.md
        health_score = round(health_score, 1)
        
        # Consistency check for status
        # Unhealthy if health score is bad (< 40) OR bad hourly fraction is >= 30%
        bad_fraction = row["bad_hours_fraction"]
        if health_score < 40 or bad_fraction >= 0.30:
            status = "unhealthy"
        elif health_score < 70:
            status = "degraded"
        else:
            status = "healthy"
            
        # Determine top issue
        if status == "healthy":
            top_issue = None
        else:
            issues = {
                "low_speed": speed_score,
                "high_latency": latency_score,
                "high_packet_loss": packet_loss_score,
                "high_disconnects": disconnect_score,
                "weak_signal": signal_score
            }
            # The issue corresponds to the lowest normalized score
            top_issue = min(issues, key=issues.get)
            
        scored_list.append({
            "router_id": str(row["router_id"]),
            "building": str(row["building"]),
            "room": str(row["room"]),
            "model": str(row["model"]),
            "firmware": str(row["firmware_version"]),
            "user_type": str(row["user_type"]),
            "health_score": health_score,
            "status": status,
            "top_issue": top_issue,
            "avg_speed": round(float(row["avg_speed"]), 1),
            "avg_latency": round(float(row["avg_latency"]), 1),
            "avg_packet_loss": round(float(row["avg_packet_loss"]), 1),
            "total_disconnects": int(row["total_disconnects"]),
            "avg_signal": round(float(row["avg_signal"]), 1),
            "bad_hours_fraction": float(bad_fraction)
        })
        
    return scored_list
