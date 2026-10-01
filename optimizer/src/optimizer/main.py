from fastapi import FastAPI

app = FastAPI(title="RideShareHub Optimizer", version="0.0.1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
