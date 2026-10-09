# Project Guidelines

## Architecture

- Frontend: React Native
- Backend: Python, FastAPI
- Database: PostgreSQL on Neon
- Database migrations: Alembic
- Backend deployment: Render
- CI/CD: Docker and GitHub Actions

## Development Rules

- Inspect existing files before proposing changes.
- Follow the existing architecture and coding conventions.
- Avoid unnecessary dependencies and large refactors.
- Keep frontend API calls consistent with existing backend endpoints.
- Never expose secrets, API keys, or database credentials.
- Never modify production configuration without explicit approval.
- Explain important changes and list the tests to run.
- Do not claim a feature works until it has been tested.

## Workflow

- Work on one feature at a time.
- Prefer small, reviewable changes.
- Preserve existing functionality.
- Ask before changing database schemas or generating migrations.
- Review the diff before committing changes.
