# API Contract — DO NOT BREAK WITHOUT TELLING THE OTHER TWO

This is the shared interface between backend, frontend, and AI layer. Everyone builds
against this from minute 0 so integration at hour 5 isn't a surprise.

## GET /api/rankings

Query params: `?limit=10` (default 10), optional `?building=`, `?firmware=` (bonus)

Response:
```json
[
  {
    "router_id": "R-1042",
    "building": "Hostel-B",
    "room": "204",
    "model": "TP-Link AX3000",
    "health_score": 34.2,
    "status": "unhealthy",
    "top_issue": "high_packet_loss"
  }
]
```

## GET /api/router/{router_id}

Response:
```json
{
  "router_id": "R-1042",
  "building": "Hostel-B",
  "room": "204",
  "model": "TP-Link AX3000",
  "firmware": "1.2.3",
  "user_type": "student",
  "health_score": 34.2,
  "status": "unhealthy",
  "metrics_timeseries": [
    {"timestamp": "2025-01-01T18:00:00", "speed": 12.4, "latency": 88, "packet_loss": 8.1, "disconnects": 2, "signal": -71}
  ],
  "metrics_summary": {
    "avg_speed": 15.2,
    "avg_latency": 92,
    "avg_packet_loss": 8.4,
    "total_disconnects": 14,
    "avg_signal": -70,
    "fleet_avg_speed": 45.0,
    "fleet_avg_latency": 30,
    "fleet_avg_packet_loss": 1.2,
    "fleet_avg_disconnects": 2
  },
  "complaints": [
    {"timestamp": "2025-01-03T20:15:00", "text": "wifi keeps dropping every night"}
  ]
}
```

## POST /api/copilot

Request:
```json
{ "router_id": "R-1042", "question": "why is this router performing badly?" }
```

Response:
```json
{
  "router_id": "R-1042",
  "status": "unhealthy",
  "cause": "Sustained high packet loss during evening peak hours",
  "evidence": [
    "Avg packet loss 8.4% vs fleet avg 1.2%",
    "14 disconnects in the past week vs fleet avg 2",
    "3 complaints in the past 5 days mention dropped connections"
  ],
  "recommended_fix": "firmware_update",
  "fix_options": ["firmware_update", "relocate", "replace_hardware", "user_education"]
}
```

Rules the backend + AI layer must enforce (see validation scenarios in the brief):
- If `health_score` is above the healthy threshold → `status: "healthy"`, `cause` explains it's fine, `recommended_fix: null`.
- If metrics are healthy but there are complaints → `recommended_fix: "user_education"`, never `replace_hardware`.
- `evidence` must only ever contain numbers that exist in `metrics_summary` / `complaints` — no invented stats.

## Status values
`"healthy" | "degraded" | "unhealthy"`

## Fix values
`"firmware_update" | "relocate" | "replace_hardware" | "user_education" | null`

## CORS
Backend must allow the deployed frontend origin (and `http://localhost:5173` for dev).
