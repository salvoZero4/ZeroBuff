from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.v1 import auth
from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler 

import app.models

from app.db.engine import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)

#Rotta di prova
@app.get("/")
def home():
    return { "Server running" }

