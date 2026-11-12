from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter
from app.features.auth.router import router as auth_router
from app.features.exercises.router import router as exercises_router
from app.features.routines.router import router as routines_router
from app.features.schedule.router import router as schedule_router
from app.features.users.router import router as users_router
from app.features.weight.router import router as weight_router
from app.features.workout_sessions.router import router as workout_sessions_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(exercises_router)
app.include_router(routines_router)
app.include_router(schedule_router)
app.include_router(workout_sessions_router)
app.include_router(weight_router)


# Rotta di prova
@app.get("/")
def home():
    return {"Server running"}
