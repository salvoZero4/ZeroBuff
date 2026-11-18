"""Load Italian catalog names onto existing exercises.

Run from backend with `uv run python -m scripts.import_exercise_translations`.
Use --dry-run to validate the files without connecting to a database.
Set CATALOG_DATABASE_URL explicitly to apply the translations.
"""

import argparse
import json
import os
from collections import defaultdict
from pathlib import Path

from app.models.exercise import Exercise, ExerciseTranslation
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, create_engine, select

DATA_DIR = Path(__file__).parent / "data"


def _unique_keys(pairs: list[tuple[str, str]]) -> dict[str, str]:
    result: dict[str, str] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate translation key: {key}")
        result[key] = value
    return result


def load_translations() -> dict[str, str]:
    catalog = json.loads((DATA_DIR / "base_exercises.json").read_text(encoding="utf-8"))
    canonical = {entry["name"] for entry in catalog}
    names = json.loads(
        (DATA_DIR / "exercise_names.it.json").read_text(encoding="utf-8"),
        object_pairs_hook=_unique_keys,
    )
    if set(names) != canonical:
        raise ValueError(
            f"Catalog coverage mismatch. Missing: {sorted(canonical - names.keys())}. "
            f"Unexpected: {sorted(names.keys() - canonical)}."
        )
    if any(not isinstance(value, str) or not value.strip() for value in names.values()):
        raise ValueError("Every translated name must be non-empty text.")
    return {key: value.strip() for key, value in names.items()}


def upsert_translations(session: Session, language: str, names: dict[str, str]) -> None:
    matches = defaultdict(list)
    for exercise in session.exec(
        select(Exercise).where(
            Exercise.created_by_user.is_(None),
            Exercise.name.in_(names),
        )
    ):
        matches[exercise.name].append(exercise.id)

    invalid = [name for name in names if len(matches[name]) != 1]
    if invalid:
        raise ValueError(f"Missing or ambiguous global exercise names: {', '.join(invalid)}")

    statement = insert(ExerciseTranslation).values(
        [
            {"exercise_id": matches[name][0], "language": language, "name": value}
            for name, value in names.items()
        ]
    )
    session.execute(
        statement.on_conflict_do_update(
            constraint="uq_exercise_translation_language",
            set_={"name": statement.excluded.name},
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        names = load_translations()
        if args.dry_run:
            print(f"Validated {len(names)} Italian exercise names.")
            return
        url = os.environ.get("CATALOG_DATABASE_URL")
        if not url:
            parser.error("Set CATALOG_DATABASE_URL to the database to update.")
        with Session(create_engine(url)) as session:
            with session.begin():
                upsert_translations(session, "it", names)
        print(f"Loaded {len(names)} Italian exercise names.")
    except ValueError as exc:
        parser.exit(1, f"{exc}\n")


if __name__ == "__main__":
    main()
