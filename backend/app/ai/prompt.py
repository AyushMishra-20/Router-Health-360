"""
Prompt template and formatting logic for the AI Copilot layer.
Enforces strict grounding: only pre-computed aggregate statistics and explicit complaints
are supplied to the LLM to prevent hallucinating evidence.
"""

SYSTEM_PROMPT = """You are an AI network engineering copilot for Campus Router Health 360.
Your job is to explain why a specific WiFi router is performing the way it is, strictly based on pre-aggregated performance data and user complaints.

STRICT GROUNDING RULES:
1. CITE ONLY THE NUMBERS AND COMPLAINTS PROVIDED IN THE USER PROMPT.
2. DO NOT invent, assume, or fabricate any statistics, percentages, dates, or metrics not explicitly listed.
3. If performance metrics are healthy, state clearly that the router is operating within normal parameters.
4. Output your response ONLY as valid JSON with exactly two keys: "cause" and "evidence".
   - "cause": A clear, concise 1-2 sentence explanation of the router's current status and root cause based on numbers.
   - "evidence": A JSON array of 2-4 bullet point strings citing specific numerical metrics (comparing router stats vs fleet averages) or explicit complaint snippets.
"""

USER_PROMPT_TEMPLATE = """ROUTER DETAILS:
- Router ID: {router_id}
- Location: Building {building}, Room {room}
- Hardware Model: {model} (Firmware: {firmware})
- User Type: {user_type}
- Health Score: {health_score:.1f} / 100
- Computed Status: {status}
- Recommended Action/Fix: {recommended_fix_str}

METRICS SUMMARY (ROUTER VS FLEET AVERAGE):
- Average Speed: {avg_speed:.1f} Mbps (Fleet Avg: {fleet_avg_speed:.1f} Mbps)
- Average Latency: {avg_latency:.1f} ms (Fleet Avg: {fleet_avg_latency:.1f} ms)
- Average Packet Loss: {avg_packet_loss:.2f}% (Fleet Avg: {fleet_avg_packet_loss:.2f}%)
- Total Disconnects: {total_disconnects} (Fleet Avg: {fleet_avg_disconnects:.1f})
- Average Signal Strength: {avg_signal:.1f} dBm (Fleet Avg: {fleet_avg_signal:.1f} dBm)

USER COMPLAINTS ({complaint_count} total):
{complaints_text}

USER QUESTION: "{question}"

Return ONLY valid JSON matching this schema:
{{
  "cause": "<1-2 sentence explanation citing numbers>",
  "evidence": [
    "<bullet point citing metric vs fleet avg>",
    "<bullet point citing disconnects/complaints>"
  ]
}}
"""


def build_copilot_prompt(router_data: dict, question: str, recommended_fix: str | None) -> tuple[str, str]:
    """
    Builds the system prompt and grounded user prompt for the Anthropic Claude API.
    `router_data` is expected to match the shape of GET /api/router/{{router_id}}.
    """
    router_id = router_data.get("router_id", "Unknown")
    building = router_data.get("building", "N/A")
    room = router_data.get("room", "N/A")
    model = router_data.get("model", "N/A")
    firmware = router_data.get("firmware", "N/A")
    user_type = router_data.get("user_type", "N/A")
    health_score = router_data.get("health_score", 50.0)
    status = router_data.get("status", "degraded")

    metrics_summary = router_data.get("metrics_summary", {})
    avg_speed = metrics_summary.get("avg_speed", 0.0)
    avg_latency = metrics_summary.get("avg_latency", 0.0)
    avg_packet_loss = metrics_summary.get("avg_packet_loss", 0.0)
    total_disconnects = metrics_summary.get("total_disconnects", 0)
    avg_signal = metrics_summary.get("avg_signal", -50.0)

    fleet_avg_speed = metrics_summary.get("fleet_avg_speed", 45.0)
    fleet_avg_latency = metrics_summary.get("fleet_avg_latency", 30.0)
    fleet_avg_packet_loss = metrics_summary.get("fleet_avg_packet_loss", 1.0)
    fleet_avg_disconnects = metrics_summary.get("fleet_avg_disconnects", 2.0)
    fleet_avg_signal = metrics_summary.get("fleet_avg_signal", -53.8)

    complaints = router_data.get("complaints", [])
    if complaints:
        complaint_lines = [f"- [{c.get('timestamp', 'N/A')}] \"{c.get('text', '')}\"" for c in complaints]
        complaints_text = "\n".join(complaint_lines)
    else:
        complaints_text = "No user complaints reported."

    recommended_fix_str = recommended_fix if recommended_fix else "None (Router is operating normally)"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        router_id=router_id,
        building=building,
        room=room,
        model=model,
        firmware=firmware,
        user_type=user_type,
        health_score=health_score,
        status=status,
        recommended_fix_str=recommended_fix_str,
        avg_speed=avg_speed,
        fleet_avg_speed=fleet_avg_speed,
        avg_latency=avg_latency,
        fleet_avg_latency=fleet_avg_latency,
        avg_packet_loss=avg_packet_loss,
        fleet_avg_packet_loss=fleet_avg_packet_loss,
        total_disconnects=total_disconnects,
        fleet_avg_disconnects=fleet_avg_disconnects,
        avg_signal=avg_signal,
        fleet_avg_signal=fleet_avg_signal,
        complaint_count=len(complaints),
        complaints_text=complaints_text,
        question=question if question else "Why is this router performing the way it is?",
    )

    return SYSTEM_PROMPT, user_prompt
