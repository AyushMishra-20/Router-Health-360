# Architecture

## Flow

```
routers.csv + metrics.csv + complaints.csv
            │
            ▼
   backend/app/core  (load, join, aggregate per router)
            │
            ▼
   health_score computed per router (documented formula below)
            │
   ┌────────┴─────────┐
   ▼                   ▼
/api/rankings     /api/router/{id}
   │                   │
   └────────┬──────────┘
            ▼
     frontend dashboard (worst-10 table + detail panel)
            │
            ▼
   user asks copilot a question
            │
            ▼
   backend/app/ai builds grounded prompt from
   metrics_summary + complaints → calls LLM → returns
   structured {cause, evidence, recommended_fix}
            │
            ▼
      /api/copilot response rendered as a card in frontend
```

## Health score formula

Aggregated per router across the full metrics window (not per-hour, so a single bad hour
doesn't sink a router's rank):

```
speed_score       = normalize(avg_speed, higher_is_better=True)
latency_score     = normalize(avg_latency, higher_is_better=False)
packet_loss_score = normalize(avg_packet_loss, higher_is_better=False)
disconnect_score  = normalize(total_disconnects, higher_is_better=False)
signal_score      = normalize(avg_signal, higher_is_better=True)

health_score = (
    0.25 * speed_score +
    0.20 * latency_score +
    0.20 * packet_loss_score +
    0.25 * disconnect_score +
    0.10 * signal_score
)  # 0-100 scale
```

`normalize()` maps a raw value to 0–100 using fleet-wide min/max (or fixed sane bounds,
e.g. packet_loss 0%→100, 15%→0).

Thresholds (tune after looking at real data distribution):
- `health_score >= 70` → `"healthy"`
- `40 <= health_score < 70` → `"degraded"`
- `health_score < 40` → `"unhealthy"`

## Consistency check (avoids "one bad hour" false positives)

In addition to the average, compute the **fraction of hourly samples that are bad**
(e.g. packet_loss > 5%). Only let a router be flagged unhealthy if either:
- the aggregated average is bad, OR
- bad readings occur in ≥30% of sampled hours

This satisfies: *"A router with sustained bad metrics ranks in the worst-10; a router
with one bad hour does not."*
