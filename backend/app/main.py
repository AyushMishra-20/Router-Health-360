"""
FastAPI entrypoint. Backend owner: wire up routers here.
Do not put business logic here — routes live in app/api/, logic in app/core/ and app/ai/.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.copilot import router as copilot_router

app = FastAPI(title="Campus Router Health 360")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all frontend origins in dev/prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.include_router(copilot_router)

# Include teammate's routers dynamically if present
try:
    from app.api.rankings import router as rankings_router
    app.include_router(rankings_router)
except ImportError:
    pass

try:
    from app.api.router_detail import router as detail_router
    app.include_router(detail_router)
except ImportError:
    pass

