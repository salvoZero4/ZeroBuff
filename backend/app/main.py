from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import auth, exercise, routine, user
from app.core.limiter import limiter

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(exercise.router)
app.include_router(routine.router)


# Rotta di prova
@app.get("/")
def home():
    return {"Server running"}
