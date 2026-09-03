from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import app.models
from app.api.v1 import auth, exercise, user
from app.core.limiter import limiter
from app.db.engine import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(exercise.router)


# Rotta di prova
@app.get("/")
def home():
    return {"Server running"}
