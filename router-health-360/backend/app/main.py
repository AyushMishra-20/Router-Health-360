"""
FastAPI entrypoint. Backend owner: wire up routers here.
Do not put business logic here — routes live in app/api/, logic in app/core/ and app/ai/.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Campus Router Health 360")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: lock this down to the deployed frontend origin before submission
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# TODO(backend): from app.api.rankings import router as rankings_router; app.include_router(rankings_router)
# TODO(backend): from app.api.router_detail import router as detail_router; app.include_router(detail_router)
# TODO(ai-deploy): from app.api.copilot import router as copilot_router; app.include_router(copilot_router)
