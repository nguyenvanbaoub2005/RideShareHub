from fastapi import FastAPI, HTTPException

from optimizer.schemas import OptimizeTripRouteRequest, OptimizeTripRouteResponse
from optimizer.vrppd import solve_vrppd

app = FastAPI(title="RideShareHub Optimizer", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/optimize/trip-route", response_model=OptimizeTripRouteResponse)
def optimize_trip_route(payload: OptimizeTripRouteRequest) -> OptimizeTripRouteResponse:
    try:
        return solve_vrppd(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
