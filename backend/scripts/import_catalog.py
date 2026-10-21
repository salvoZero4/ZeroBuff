"""
Seed script: replace the global exercise catalog with the curated base catalog.

Usage:
    uv run python -m scripts.import_catalog --dry-run
        Validate the JSON and print the entries. No database access.

    python scripts/import_catalog.py
        Replace the catalog on settings.database_url (local dev database).

    CATALOG_DATABASE_URL=postgresql://... python scripts/import_catalog.py
        Replace the catalog on an explicit target (e.g. a Neon branch).

Input: scripts/data/base_exercises.json (each entry is stored as-is:
name, muscle_group, secondary_muscle_groups, equipment).

User-created exercises (created_by_user not null) are never touched.
Everything runs in a single transaction: either the whole replacement
happens or nothing does.
"""

import argparse
import json
import os
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.models.exercise import Equipment, Exercise, MuscleGroup
from app.models.routine import RoutineExercise  # adjust import path if different
from app.models.session import Set_log  # adjust import path if different
from sqlmodel import Session, col, create_engine, delete, func, select

DATA_FILE = Path(__file__).parent / "data" / "base_exercises.json"

REQUIRED_KEYS = {"name", "muscle_group", "secondary_muscle_groups", "equipment"}
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", None}


@dataclass(frozen=True)
class CatalogEntry:
    name: str
    muscle_group: MuscleGroup
    secondary_muscle_groups: list[MuscleGroup]
    equipment: Equipment


def load_catalog(path: Path) -> list[CatalogEntry]:
    """Read and validate the JSON file. Exit with a full error list if invalid."""
    raw_entries = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    entries: list[CatalogEntry] = []

    for i, raw in enumerate(raw_entries, start=1):
        label = f"entry {i} ({raw.get('name', '?')})"

        missing = REQUIRED_KEYS - raw.keys()
        unknown = raw.keys() - REQUIRED_KEYS
        if missing:
            errors.append(f"{label}: missing keys {sorted(missing)}")
            continue
        if unknown:
            errors.append(f"{label}: unknown keys {sorted(unknown)}")

        name = raw["name"].strip()
        if not name:
            errors.append(f"{label}: empty name")

        try:
            muscle = MuscleGroup(raw["muscle_group"])
            equipment = Equipment(raw["equipment"])
            secondary = [MuscleGroup(m) for m in raw["secondary_muscle_groups"]]
        except ValueError as exc:
            errors.append(f"{label}: {exc}")
            continue

        if muscle in secondary:
            errors.append(f"{label}: primary muscle repeated in secondary")

        entries.append(
            CatalogEntry(
                name=name,
                muscle_group=muscle,
                secondary_muscle_groups=secondary,
                equipment=equipment,
            )
        )

    dupes = [n for n, c in Counter(e.name.lower() for e in entries).items() if c > 1]
    if dupes:
        errors.append(f"duplicate names (case-insensitive): {dupes}")

    if errors:
        sys.exit("Validation failed:\n- " + "\n- ".join(errors))
    return entries


def print_catalog(entries: list[CatalogEntry]) -> None:
    print(f"{len(entries)} exercises:")
    for e in entries:
        print(f"  {e.name:<36} {e.muscle_group.value:<12} {e.equipment.value}")


def confirm(host: str | None) -> bool:
    """Local DB: y/N. Remote DB: the operator must type the host name."""
    if host in LOCAL_HOSTS:
        return input("\nProceed? [y/N] ").strip().lower() == "y"
    typed = input(f"\nRemote database. Type the host '{host}' to confirm: ")
    return typed.strip() == host


def replace_catalog(entries: list[CatalogEntry]) -> None:
    url = os.environ.get("CATALOG_DATABASE_URL", settings.database_url)
    engine = create_engine(url)
    host = engine.url.host

    with Session(engine) as session:
        global_ids = select(Exercise.id).where(col(Exercise.created_by_user).is_(None))

        n_global = session.exec(
            select(func.count())
            .select_from(Exercise)
            .where(col(Exercise.id).in_(global_ids))
        ).one()
        n_routine_rows = session.exec(
            select(func.count())
            .select_from(RoutineExercise)
            .where(col(RoutineExercise.exercise_id).in_(global_ids))
        ).one()
        n_set_logs = session.exec(
            select(func.count())
            .select_from(Set_log)
            .where(col(Set_log.exercise_id).in_(global_ids))
        ).one()

        print(f"\nTarget database: {host}/{engine.url.database}")
        print(f"Global exercises to delete:        {n_global}")
        print(f"routine_exercise rows to delete:   {n_routine_rows}")
        print(f"set_log rows to delete:            {n_set_logs}")
        print(f"Exercises to insert:               {len(entries)}")

        if not confirm(host):
            print("Cancelled.")
            return

        try:
            session.exec(
                delete(Set_log).where(col(Set_log.exercise_id).in_(global_ids))
            )
            session.exec(
                delete(RoutineExercise).where(
                    col(RoutineExercise.exercise_id).in_(global_ids)
                )
            )
            session.exec(
                delete(Exercise).where(col(Exercise.created_by_user).is_(None))
            )
            session.add_all(
                Exercise(
                    name=e.name,
                    muscle_group=e.muscle_group,
                    secondary_muscle_groups=e.secondary_muscle_groups,
                    equipment=e.equipment,
                    created_by_user=None,
                )
                for e in entries
            )
            session.commit()
        except Exception as exc:
            session.rollback()
            print(f"\nError, rolled back: {exc}")
            raise

        total = session.exec(
            select(func.count())
            .select_from(Exercise)
            .where(col(Exercise.created_by_user).is_(None))
        ).one()
        print(f"\nDone. Global exercises now: {total}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--dry-run", action="store_true", help="validate only, no database access"
    )
    args = parser.parse_args()

    entries = load_catalog(DATA_FILE)
    print_catalog(entries)
    if args.dry_run:
        return
    replace_catalog(entries)


if __name__ == "__main__":
    main()
