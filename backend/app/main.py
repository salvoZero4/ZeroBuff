from fastapi import FastAPI, Depends
from sqlmodel import Session, select
from contextlib import asynccontextmanager

import app.models

from app.db.engine import init_db
from app.db.session import get_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)



@app.get("/")
def home():
    return { "Server running" }

