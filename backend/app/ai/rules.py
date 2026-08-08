"""
Rule-based logic (non-LLM) for determining router status and recommended fixes.
Ensures deterministic and explainable decisions compliant with API contract rules:
- status: healthy (health_score >= 70), degraded (40-70), unhealthy (<40)
- recommended_fix:
    - healthy router with no complaints -> None
    - healthy router with complaints -> 'user_education' (never 'replace_hardware')
    - degraded / unhealthy routers -> deterministic fix based on metrics vs fleet statistics
"""

VALID_FIXES = {"firmware_update", "relocate", "replace_hardware", "user_education", None}


def determine_status(health_score: float) -> str:
    """
    Determines status based on health score.
    - >= 70: healthy
    - 40 - 69.9: degraded
    - < 40: unhealthy
    """
    if health_score >= 70.0:
        return "healthy"
    elif health_score >= 40.0:
        return "degraded"
    else:
        return "unhealthy"


def determine_recommended_fix(status: str, metrics_summary: dict, complaints: list) -> str | None:
    """
    Determines recommended fix deterministically using metrics and complaints.
    """
    has_complaints = bool(complaints and len(complaints) > 0)

    # 1. Healthy routers
    if status == "healthy":
        if has_complaints:
            # Rule: If metrics are healthy but there are complaints -> user_education, never replace_hardware
            return "user_education"
        return None

    # Extract metrics with sane fallbacks if missing
    avg_speed = float(metrics_summary.get("avg_speed", 45.0))
    avg_packet_loss = float(metrics_summary.get("avg_packet_loss", 0.5))
    total_disconnects = float(metrics_summary.get("total_disconnects", 10.0))
    avg_signal = float(metrics_summary.get("avg_signal", -53.0))

    fleet_avg_speed = float(metrics_summary.get("fleet_avg_speed", 45.0))
    fleet_avg_packet_loss = float(metrics_summary.get("fleet_avg_packet_loss", 0.9))
    fleet_avg_disconnects = float(metrics_summary.get("fleet_avg_disconnects", 23.0))
    fleet_avg_signal = float(metrics_summary.get("fleet_avg_signal", -53.8))

    # 2. Degraded routers (40 <= health_score < 70)
    if status == "degraded":
        # Signal significantly worse than fleet average (-15 dBm lower)
        if avg_signal < (fleet_avg_signal - 15.0):
            return "relocate"

        # Elevated packet loss or disconnects
        high_loss_threshold = max(2.0, fleet_avg_packet_loss * 2.0)
        high_disc_threshold = max(25.0, fleet_avg_disconnects * 1.3)
        if avg_packet_loss >= high_loss_threshold or total_disconnects >= high_disc_threshold:
            return "firmware_update"

        if has_complaints:
            return "user_education"

        return "firmware_update"

    # 3. Unhealthy routers (health_score < 40)
    severe_loss_threshold = max(3.5, fleet_avg_packet_loss * 3.5)
    severe_disc_threshold = max(40.0, fleet_avg_disconnects * 1.8)
    severe_speed_threshold = min(15.0, fleet_avg_speed * 0.35)

    # Clearly bad metrics indicating physical hardware failure
    if (
        avg_packet_loss >= severe_loss_threshold
        or total_disconnects >= severe_disc_threshold
        or avg_speed <= severe_speed_threshold
    ):
        return "replace_hardware"

    # Severe signal isolation
    if avg_signal < (fleet_avg_signal - 20.0) and avg_packet_loss < 2.0:
        return "relocate"

    return "firmware_update"
