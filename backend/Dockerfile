FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/


COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project


COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./


RUN uv sync --frozen --no-dev

EXPOSE 8000


CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]