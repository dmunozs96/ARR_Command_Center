"""FastAPI application entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.backend.api.routes import alerts, arr, config, expert, exports, imports, snapshots, stripe, sync

app = FastAPI(
    title="ARR Command Center API",
    version="0.1.0",
    description="API para calcular, visualizar y auditar el ARR de isEazy",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://frontend-web-production-17b9.up.railway.app",
        *([os.environ["FRONTEND_ORIGIN"]] if os.environ.get("FRONTEND_ORIGIN") else []),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(snapshots.router, prefix="/api/snapshots", tags=["snapshots"])
app.include_router(arr.router, prefix="/api/arr", tags=["arr"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(imports.router, prefix="/api/imports", tags=["imports"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(stripe.router, prefix="/api/stripe-mrr", tags=["stripe"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(expert.router, prefix="/api/expert", tags=["expert"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
