# Zerobuff

A backend API for tracking gym workouts — routines, live sessions, sets, and progress over time. Built to be paired with a mobile frontend.

No fluff, just the numbers: plan a routine, log your sets in real time, see if you're actually getting stronger.

## Tech stack

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL 18 (Docker)
- **ORM:** SQLModel
- **Migrations:** Alembic
- **Auth:** JWT (access + refresh tokens), password hashing with Argon2id
- **Rate limiting:** SlowAPI
- **Testing:** pytest + httpx, against a dedicated Postgres test container (tmpfs-backed, isolated from dev data)

## Features

- **Auth** — register, login, refresh, change password
- **Users** — profile with optional fields (date of birth, sex, height)
- **Exercises** — a shared, global catalog (1,300+ exercises seeded from an open dataset), plus user-submitted custom exercises with fuzzy duplicate detection (PostgreSQL `pg_trgm`)
- **Routines** — full CRUD for workout plans, with per-exercise sets/reps/rest time and ordering
- **Schedule** — assign routines to days of the week
- **Sessions** — start a workout, log sets against any exercise in any order (no forced sequence — pick up where you left off if a machine's busy), close out the session, and review history
- **Stats** — per-exercise history and per-routine progress comparisons (top set vs. previous session), computed with window functions

## API documentation

Once running, interactive API docs are available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Data model (high level)

- `User` — id (UUID), username, email, hashed password
- `UserProfile` — optional 1:1 profile data (date of birth, sex, height)
- `Exercise` — global catalog, with muscle group, secondary muscle groups, and equipment; `created_by_user` is null for system exercises
- `Routine` — a saved workout plan
- `RoutineExercise` — links an exercise to a routine with sets, reps, rest time, and order
- `Schedule` — assigns a routine to a day of the week (one routine per day, per user)
- `Session` — a workout in progress or completed, optionally linked to a routine
- `SetLog` — an individual logged set (exercise, reps, weight, RIR) tied to a session

## Getting started

### Requirements

- Docker and Docker Compose
- Python 3.12+ (if running outside Docker)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/salvoZero4/zerobuff.git
   cd zerobuff
   ```

2. Copy the environment template and fill in your own values:

   ```bash
   cp .env.example .env
   ```

3. Start the services:

   ```bash
   docker compose up -d
   ```

4. Run database migrations:

   ```bash
   alembic upgrade head
   ```

5. (Optional) Seed the exercise catalog. The dataset isn't committed to this repo — download it first from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset):

   ```bash
   mkdir -p scripts/data
   curl -L -o scripts/data/exercises.json \
     https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json
   ```

   Then run the seed script:

   ```bash
   python scripts/import_exercises.py
   ```

The API is now available at `http://localhost:8000`.

## Running tests

Tests run against a separate, isolated Postgres container so they never touch development data:

```bash
docker compose compose up -d zerobuff_db_test
pytest
```

## Project structure

```
app/
├── api/v1/          # routers: auth, users, exercises, routines, session, schedule
├── core/            # config, security, rate limiter
├── db/              # engine and session handling
├── models/          # SQLModel table models
├── schemas/         # Pydantic request/response schemas
└── services/        # business logic, kept separate from route handlers
tests/
├── conftest.py      # fixtures: session, client, authenticated_client, clean_db, run_migrations
├── test_auth.py
├── test_users.py
├── exercises/       # one file per endpoint
└── routines/        # one file per endpoint
scripts/
└── seed_exercises.py
```

## Design notes

A few decisions worth knowing if you're reading the code:

- Routine create/update takes the full state of the plan in a single call (not incremental updates), for atomicity — the backend diffs it internally
- Every query touching user data filters explicitly by `user_id`
- Sets can be logged against any exercise in a session regardless of the routine's original order
- IDs are UUIDs throughout, not auto-incrementing integers

## Roadmap

- [ ] Logout / refresh token revocation
- [ ] `instructions` field on exercises (already present in the seed dataset, not yet persisted)
- [ ] CI/CD pipeline
- [ ] Mobile frontend

## License

MIT — see [LICENSE](LICENSE) for details.
