import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.routers import (
    analytics_router,
    auth_router,
    chat_router,
    dashboard_router,
    drivers_router,
    expenses_router,
    fuel_logs_router,
    maintenance_router,
    trips_router,
    vehicles_router,
)

app = FastAPI(title="TransitOps API", version="1.0.0")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(vehicles_router.router)
app.include_router(drivers_router.router)
app.include_router(trips_router.router)
app.include_router(maintenance_router.router)
app.include_router(fuel_logs_router.router)
app.include_router(expenses_router.router)
app.include_router(dashboard_router.router)
app.include_router(analytics_router.router)
app.include_router(chat_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
