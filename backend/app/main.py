from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.v1 import auth

import app.models

from app.db.engine import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(auth.router)

#Rotta di prova
@app.get("/")
def home():
    return { "Server running" }

