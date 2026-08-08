import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.core import scoring
from app.core import data

client = TestClient(app)

def test_health_check():
    """Verify health endpoint is up."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_bad_router_score():
    """Verify that a known bad router (R-1042) gets a low score and unhealthy status."""
    response = client.get("/api/router/R-1042")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["router_id"] == "R-1042"
    assert res_data["health_score"] < 40
    assert res_data["status"] == "unhealthy"
    assert res_data["metrics_summary"]["total_disconnects"] == 102

def test_fake_router_404():
    """Verify that a non-existent router returns 404."""
    response = client.get("/api/router/R-9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Router not found"

def test_one_bad_hour_not_worst(monkeypatch):
    """
    Verify that a router with only 1 bad hour does NOT rank in the worst-10.
    We mock get_router_summary to return a fleet where 10 routers have sustained bad metrics,
    and 1 router has 1 bad hour (which is not sustained), and verify the rankings.
    """
    # Create a mock summary dataframe
    mock_summary = pd.DataFrame([
        # 10 very bad routers
        {
            "router_id": f"R-BAD-{i}", "building": "Hostel", "room": str(100+i),
            "model": "TP-Link", "firmware_version": "1.0", "user_type": "student",
            "avg_speed": 11.0, "avg_latency": 130.0, "avg_packet_loss": 3.8,
            "total_disconnects": 100.0, "avg_signal": -74.0, "bad_hours_fraction": 0.25,
            "complaint_count": 5
        } for i in range(10)
    ] + [
        # 1 router with 1 bad hour (out of 24 hours). 23 hours perfect, 1 hour bad.
        # Average speed is very high, average latency low, average packet loss low, low disconnects.
        {
            "router_id": "R-SPIKE", "building": "Library", "room": "200",
            "model": "TP-Link", "firmware_version": "1.0", "user_type": "student",
            # Speed is slightly lower than max but high (e.g. 55 Mbps)
            "avg_speed": 55.0, 
            # Latency is low (e.g. 26 ms)
            "avg_latency": 26.0,
            # Average packet loss is very low: 23 hours * 0.4% + 1 hour * 8.0% = (9.2 + 8.0)/24 = 0.71%
            "avg_packet_loss": 0.71,
            # Disconnects: 1 hour has 1 disconnect, others 0
            "total_disconnects": 7.0,
            "avg_signal": -50.0,
            # 1 bad hour out of 24 = 4.1% fraction
            "bad_hours_fraction": 1.0 / 24.0,
            "complaint_count": 0
        }
    ] + [
        # 20 perfect routers
        {
            "router_id": f"R-GOOD-{i}", "building": "Lab", "room": str(300+i),
            "model": "TP-Link", "firmware_version": "1.0", "user_type": "staff",
            "avg_speed": 60.0, "avg_latency": 24.0, "avg_packet_loss": 0.38,
            "total_disconnects": 6.0, "avg_signal": -48.0, "bad_hours_fraction": 0.0,
            "complaint_count": 0
        } for i in range(20)
    ])

    # Monkeypatch the get_router_summary function to return our mock dataframe
    monkeypatch.setattr(scoring, "get_router_summary", lambda: mock_summary)

    # Get the rankings with limit 10
    response = client.get("/api/rankings?limit=10")
    assert response.status_code == 200
    rankings = response.json()
    
    # Assert limit is respected
    assert len(rankings) == 10
    
    # Assert R-SPIKE is NOT in the worst 10 list
    worst_ids = [r["router_id"] for r in rankings]
    assert "R-SPIKE" not in worst_ids
    
    # The worst-10 must be the 10 BAD routers we mocked
    for i in range(10):
        assert f"R-BAD-{i}" in worst_ids
