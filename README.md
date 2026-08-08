# Campus Router Health 360

AI copilot that scores router health across a 10,000-device campus fleet, surfaces the
worst performers, and explains *why* a router is bad with evidence pulled straight from
the data.

Built for the DigiPlus IT Agentic AI Hackathon (Thakur College of Engineering & Technology).

## Live URLs
- Frontend: `https://router-health-360.vercel.app` (Deployment ready via `infra/vercel.json`)
- Backend API: `https://router-health-360-backend.onrender.com` (Deployment ready via `infra/render.yaml`)


## Architecture

```
router-health-360/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entrypoint, CORS, route registration
│   │   ├── api/              # OWNED BY: Backend — /rankings, /router/{id}, /copilot routes
│   │   ├── core/              # OWNED BY: Backend — CSV loading, health score logic, models
│   │   └── ai/                 # OWNED BY: AI/Deploy — LLM prompt + grounding logic
│   ├── data/                    # routers.csv, metrics.csv, complaints.csv go here
│   ├── tests/
│   └── requirements.txt
├── frontend/                      # OWNED BY: Frontend — dashboard UI
├── infra/                          # OWNED BY: AI/Deploy — deployment configs
└── docs/
    ├── architecture.md
    └── api-contract.md            # READ THIS FIRST — shared contract, don't break it
```

## Local dev

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Health score formula

See `docs/architecture.md` for the full documented formula and weights.

## Team

| Role | Owner | Folders |
|---|---|---|
| Backend/Data | _name_ | `backend/app/api/`, `backend/app/core/` |
| Frontend | _name_ | `frontend/` |
| AI/Deploy | _name_ | `backend/app/ai/`, `infra/` |
