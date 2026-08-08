"""
FastAPI router for POST /api/copilot endpoint.
Consumes router detail data, executes deterministic rule logic, grounds the Anthropic LLM prompt,
and returns structured diagnostics and evidence.
"""
import os
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.rules import determine_status, determine_recommended_fix
from app.ai.prompt import build_copilot_prompt

logger = logging.getLogger(__name__)

router = APIRouter()


class CopilotRequest(BaseModel):
    router_id: str
    question: Optional[str] = "Why is this router performing the way it is?"


class CopilotResponse(BaseModel):
    router_id: str
    status: str
    cause: str
    evidence: List[str]
    recommended_fix: Optional[str]
    fix_options: List[str] = [
        "firmware_update",
        "relocate",
        "replace_hardware",
        "user_education",
    ]


def _fetch_router_detail(router_id: str) -> dict:
    """
    Attempts to fetch router details by calling the shared backend functions.
    If backend teammate has not yet implemented router_detail.py, loads from CSV dataset as fallback.
    """
    # 1. Try importing teammate's endpoint/function if available
    try:
        from app.api.router_detail import get_router_detail_data # type: ignore
        return get_router_detail_data(router_id)
    except (ImportError, AttributeError):
        pass

    try:
        from app.core.scoring import get_router_detail # type: ignore
        return get_router_detail(router_id)
    except (ImportError, AttributeError):
        pass

    # 2. Fallback: Data loader from sample_data/sample_data directory
    try:
        import pandas as pd
        import glob

        possible_paths = [
            os.path.join("sample_data", "sample_data"),
            os.path.join("..", "sample_data", "sample_data"),
            os.path.join("backend", "data"),
        ]

        data_dir = None
        for p in possible_paths:
            if os.path.exists(os.path.join(p, "metrics.csv")):
                data_dir = p
                break

        if not data_dir:
            raise FileNotFoundError("metrics.csv dataset not found")

        metrics_df = pd.read_csv(os.path.join(data_dir, "metrics.csv"))
        routers_df = pd.read_csv(os.path.join(data_dir, "routers.csv"))

        complaint_files = glob.glob(os.path.join(data_dir, "*complaint*.csv")) + glob.glob(os.path.join(data_dir, "*COMPLA*.CSV"))
        complaints_df = pd.read_csv(complaint_files[0]) if complaint_files else pd.DataFrame()

        r_info = routers_df[routers_df["router_id"] == router_id]
        if r_info.empty:
            raise ValueError(f"Router ID {router_id} not found in routers dataset")

        r_row = r_info.iloc[0]
        r_metrics = metrics_df[metrics_df["router_id"] == router_id]

        fleet_avg_speed = float(metrics_df["avg_speed_mbps"].mean())
        fleet_avg_latency = float(metrics_df["latency_ms"].mean())
        fleet_avg_packet_loss = float(metrics_df["packet_loss_pct"].mean())
        fleet_avg_disconnects = float(metrics_df.groupby("router_id")["disconnects"].sum().mean())
        fleet_avg_signal = float(metrics_df["signal_dbm"].mean())

        if not r_metrics.empty:
            avg_speed = float(r_metrics["avg_speed_mbps"].mean())
            avg_latency = float(r_metrics["latency_ms"].mean())
            avg_packet_loss = float(r_metrics["packet_loss_pct"].mean())
            total_disconnects = int(r_metrics["disconnects"].sum())
            avg_signal = float(r_metrics["signal_dbm"].mean())
        else:
            avg_speed, avg_latency, avg_packet_loss, total_disconnects, avg_signal = 45.0, 30.0, 0.5, 10, -50.0

        r_complaints = []
        if not complaints_df.empty and "router_id" in complaints_df.columns:
            comp_rows = complaints_df[complaints_df["router_id"] == router_id]
            for _, c_row in comp_rows.iterrows():
                r_complaints.append({
                    "timestamp": str(c_row.get("date", "2025-01-01")),
                    "text": str(c_row.get("complaint_text", ""))
                })

        # Calculate score using simple normalization
        score = 100.0
        score -= max(0, (avg_packet_loss - fleet_avg_packet_loss) * 15.0)
        score -= max(0, (total_disconnects - 15) * 1.0)
        if avg_speed < 30.0:
            score -= (30.0 - avg_speed) * 1.5
        health_score = max(0.0, min(100.0, score))

        return {
            "router_id": router_id,
            "building": str(r_row.get("building", "Main")),
            "room": str(r_row.get("room", "101")),
            "model": str(r_row.get("model", "AX3000")),
            "firmware": str(r_row.get("firmware_version", "1.0")),
            "user_type": str(r_row.get("user_type", "student")),
            "health_score": health_score,
            "metrics_summary": {
                "avg_speed": avg_speed,
                "avg_latency": avg_latency,
                "avg_packet_loss": avg_packet_loss,
                "total_disconnects": total_disconnects,
                "avg_signal": avg_signal,
                "fleet_avg_speed": fleet_avg_speed,
                "fleet_avg_latency": fleet_avg_latency,
                "fleet_avg_packet_loss": fleet_avg_packet_loss,
                "fleet_avg_disconnects": fleet_avg_disconnects,
                "fleet_avg_signal": fleet_avg_signal,
            },
            "complaints": r_complaints,
        }
    except Exception as e:
        logger.warning(f"Error reading dataset fallback: {e}")
        raise HTTPException(status_code=404, detail=f"Router details not found for {router_id}")


def _fallback_cause_and_evidence(router_data: dict, status: str, fix: Optional[str]) -> tuple[str, list[str]]:
    """Deterministic fallback cause and evidence generator if Anthropic API call is unavailable."""
    router_id = router_data.get("router_id", "")
    metrics = router_data.get("metrics_summary", {})
    complaints = router_data.get("complaints", [])

    avg_speed = metrics.get("avg_speed", 0.0)
    avg_loss = metrics.get("avg_packet_loss", 0.0)
    disconnects = metrics.get("total_disconnects", 0)
    fleet_loss = metrics.get("fleet_avg_packet_loss", 0.9)
    fleet_disc = metrics.get("fleet_avg_disconnects", 23.0)
    fleet_speed = metrics.get("fleet_avg_speed", 47.8)

    evidence = [
        f"Average speed is {avg_speed:.1f} Mbps vs fleet average {fleet_speed:.1f} Mbps",
        f"Average packet loss is {avg_loss:.2f}% vs fleet average {fleet_loss:.2f}%",
        f"Total disconnects: {disconnects} vs fleet average {fleet_disc:.1f}"
    ]

    if complaints:
        evidence.append(f"{len(complaints)} complaint(s) logged by users")

    if status == "healthy":
        cause = f"Router {router_id} is operating within normal performance parameters with low packet loss and stable connections."
    elif status == "degraded":
        cause = f"Router {router_id} is experiencing moderate metric degradation compared to fleet averages."
    else:
        cause = f"Router {router_id} exhibits severe performance issues including high packet loss and elevated disconnect rates."

    return cause, evidence


@router.post("/api/copilot", response_model=CopilotResponse)
def copilot_endpoint(req: CopilotRequest):
    router_data = _fetch_router_detail(req.router_id)

    health_score = router_data.get("health_score", 50.0)
    metrics_summary = router_data.get("metrics_summary", {})
    complaints = router_data.get("complaints", [])

    # 1. Determine status & recommended fix deterministically
    status = determine_status(health_score)
    router_data["status"] = status
    recommended_fix = determine_recommended_fix(status, metrics_summary, complaints)

    # 2. Build grounded prompt
    system_prompt, user_prompt = build_copilot_prompt(router_data, req.question or "", recommended_fix)

    # 3. Call Anthropic API (or fallback if API key not set)
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    cause, evidence = "", []

    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=500,
                temperature=0.2,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw_text = response.content[0].text.strip()
            # Clean JSON codeblock wrappers if present
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            parsed = json.loads(raw_text.strip())
            cause = parsed.get("cause", "")
            evidence = parsed.get("evidence", [])
        except Exception as err:
            logger.warning(f"Anthropic API call failed or unparseable JSON: {err}")
            cause, evidence = _fallback_cause_and_evidence(router_data, status, recommended_fix)
    else:
        cause, evidence = _fallback_cause_and_evidence(router_data, status, recommended_fix)

    return CopilotResponse(
        router_id=req.router_id,
        status=status,
        cause=cause,
        evidence=evidence,
        recommended_fix=recommended_fix,
        fix_options=[
            "firmware_update",
            "relocate",
            "replace_hardware",
            "user_education",
        ],
    )
