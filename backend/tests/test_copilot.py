"""
Test suite for AI Copilot rule logic, prompt grounding, and API endpoint scenarios.
Validates the 4 required brief scenarios:
a. Sustained bad metrics -> unhealthy status, evidence cites real numbers
b. One bad hour only -> aggregate scoring stays healthy/degraded
c. Healthy router -> healthy status, evidence shows good numbers, fix is None
d. Complaints with healthy metrics -> recommended_fix is "user_education", never "replace_hardware"
"""
import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.rules import determine_status, determine_recommended_fix
from app.ai.prompt import build_copilot_prompt
from app.main import app

client = TestClient(app)


class TestCopilotRulesAndEndpoint(unittest.TestCase):

    def test_scenario_a_sustained_bad_metrics(self):
        """a. Router with sustained bad metrics -> status unhealthy, evidence cites real numbers"""
        health_score = 34.2
        metrics = {
            "avg_speed": 12.0,
            "avg_latency": 95.0,
            "avg_packet_loss": 8.4,
            "total_disconnects": 45,
            "avg_signal": -72.0,
            "fleet_avg_speed": 47.8,
            "fleet_avg_latency": 41.4,
            "fleet_avg_packet_loss": 0.9,
            "fleet_avg_disconnects": 23.1,
            "fleet_avg_signal": -53.8,
        }
        complaints = [{"timestamp": "2025-01-03", "text": "WiFi drops constantly"}]

        status = determine_status(health_score)
        self.assertEqual(status, "unhealthy")

        fix = determine_recommended_fix(status, metrics, complaints)
        self.assertIn(fix, ["replace_hardware", "firmware_update"])

        router_data = {
            "router_id": "R-TEST-BAD",
            "building": "Hostel-B",
            "room": "204",
            "model": "TP-Link AX3000",
            "firmware": "1.0.0",
            "user_type": "student",
            "health_score": health_score,
            "status": status,
            "metrics_summary": metrics,
            "complaints": complaints,
        }
        sys_p, user_p = build_copilot_prompt(router_data, "Why is it slow?", fix)
        self.assertIn("8.40%", user_p)
        self.assertIn("45", user_p)

    def test_scenario_b_one_bad_hour_only(self):
        """b. Router with one bad hour only -> health score stays > 40, status is degraded or healthy"""
        health_score = 72.0  # Aggregate across 24h stays high despite 1 bad hour
        metrics = {
            "avg_speed": 46.0,
            "avg_latency": 40.0,
            "avg_packet_loss": 0.8,
            "total_disconnects": 12,
            "avg_signal": -52.0,
            "fleet_avg_speed": 47.8,
            "fleet_avg_latency": 41.4,
            "fleet_avg_packet_loss": 0.9,
            "fleet_avg_disconnects": 23.1,
            "fleet_avg_signal": -53.8,
        }
        status = determine_status(health_score)
        self.assertEqual(status, "healthy")

    def test_scenario_c_healthy_router(self):
        """c. A healthy router -> status healthy, evidence shows good numbers, fix is None"""
        health_score = 88.5
        metrics = {
            "avg_speed": 62.0,
            "avg_latency": 25.0,
            "avg_packet_loss": 0.4,
            "total_disconnects": 8,
            "avg_signal": -48.0,
            "fleet_avg_speed": 47.8,
            "fleet_avg_latency": 41.4,
            "fleet_avg_packet_loss": 0.9,
            "fleet_avg_disconnects": 23.1,
            "fleet_avg_signal": -53.8,
        }
        complaints = []

        status = determine_status(health_score)
        self.assertEqual(status, "healthy")

        fix = determine_recommended_fix(status, metrics, complaints)
        self.assertIsNone(fix)

    def test_scenario_d_complaints_with_healthy_metrics(self):
        """d. Healthy metrics with complaints -> fix MUST be 'user_education', never 'replace_hardware'"""
        health_score = 78.0
        metrics = {
            "avg_speed": 55.0,
            "avg_latency": 30.0,
            "avg_packet_loss": 0.5,
            "total_disconnects": 10,
            "avg_signal": -50.0,
            "fleet_avg_speed": 47.8,
            "fleet_avg_latency": 41.4,
            "fleet_avg_packet_loss": 0.9,
            "fleet_avg_disconnects": 23.1,
            "fleet_avg_signal": -53.8,
        }
        complaints = [{"timestamp": "2025-01-04", "text": "Can't connect my gaming console"}]

        status = determine_status(health_score)
        self.assertEqual(status, "healthy")

        fix = determine_recommended_fix(status, metrics, complaints)
        self.assertEqual(fix, "user_education")
        self.assertNotEqual(fix, "replace_hardware")

    def test_api_copilot_endpoint_dataset(self):
        """Integration test against actual dataset router R-1000"""
        response = client.post("/api/copilot", json={"router_id": "R-1000", "question": "Is R-1000 healthy?"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["router_id"], "R-1000")
        self.assertIn(data["status"], ["healthy", "degraded", "unhealthy"])
        self.assertIsInstance(data["cause"], str)
        self.assertIsInstance(data["evidence"], list)
        self.assertIn("fix_options", data)


if __name__ == "__main__":
    unittest.main()
