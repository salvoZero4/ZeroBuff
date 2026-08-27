from fastapi import router, Depends

from main import get_session
from app.models import User