"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.backend.api.routes import arr, snapshots, sync, config, stripe, alerts

app = FastAPI(
    title="ARR Command Center API",
    version="0.1.0",
    description="API para calcular, visualizar y auditar el ARR de isEazy",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(snapshots.router, prefix="/api/snapshots", tags=["snapshots"])
app.include_router(arr.router, prefix="/api/arr", tags=["arr"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(stripe.router, prefix="/api/stripe-mrr", tags=["stripe"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
