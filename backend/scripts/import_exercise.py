"""
Script di seed: importa il dataset hasaneyldrm/exercises-dataset nella tabella Exercise.

Uso:
    python scripts/import_exercises.py

Prerequisito: scarica data/exercises.json dal repo
https://github.com/hasaneyldrm/exercises-dataset e mettilo in scripts/data/exercises.json
"""

import json
from pathlib import Path

from app.core.config import settings
from app.models.exercise import Equipment, Exercise, MuscleGroup
from sqlmodel import Session, create_engine, select

DATA_FILE = Path(__file__).parent / "data" / "exercises.json"


MUSCLE_MAP: dict[str, MuscleGroup] = {
    # petto
    "pectorals": MuscleGroup.chest,
    "chest": MuscleGroup.chest,
    "upper chest": MuscleGroup.chest_upper,
    # dorso
    "lats": MuscleGroup.lats,
    "latissimus dorsi": MuscleGroup.lats,
    "back": MuscleGroup.upper_back,
    "upper back": MuscleGroup.upper_back,
    "rhomboids": MuscleGroup.upper_back,
    "rotator cuff": MuscleGroup.upper_back,
    "levator scapulae": MuscleGroup.upper_back,
    "serratus anterior": MuscleGroup.upper_back,
    "spine": MuscleGroup.lower_back,
    "lower back": MuscleGroup.lower_back,
    # spalle
    "delts": MuscleGroup.side_delts,
    "deltoids": MuscleGroup.side_delts,
    "shoulders": MuscleGroup.side_delts,
    "rear deltoids": MuscleGroup.rear_delts,
    # braccia
    "biceps": MuscleGroup.biceps,
    "triceps": MuscleGroup.triceps,
    "forearms": MuscleGroup.forearms,
    "wrist extensors": MuscleGroup.forearms,
    "wrist flexors": MuscleGroup.forearms,
    "wrists": MuscleGroup.forearms,
    "hands": MuscleGroup.forearms,
    "grip muscles": MuscleGroup.forearms,
    "brachialis": MuscleGroup.brachialis,
    # gambe
    "quads": MuscleGroup.quads,
    "quadriceps": MuscleGroup.quads,
    "hamstrings": MuscleGroup.hamstrings,
    "glutes": MuscleGroup.glutes,
    "calves": MuscleGroup.calves,
    "soleus": MuscleGroup.calves,
    "shins": MuscleGroup.calves,
    "ankle stabilizers": MuscleGroup.calves,
    "ankles": MuscleGroup.calves,
    "feet": MuscleGroup.calves,
    "adductors": MuscleGroup.adductors,
    "groin": MuscleGroup.adductors,
    "inner thighs": MuscleGroup.adductors,
    "abductors": MuscleGroup.abductors,
    "hip flexors": MuscleGroup.hip_flexors,
    # core
    "abs": MuscleGroup.abs,
    "abdominals": MuscleGroup.abs,
    "lowerabs": MuscleGroup.abs,
    "core": MuscleGroup.abs,
    "obliques": MuscleGroup.obliques,
    # altro
    "traps": MuscleGroup.traps,
    "trapezius": MuscleGroup.traps,
    "sternocleidomastoid": MuscleGroup.neck,
    "cardiovascular system": MuscleGroup.cardio,
}

EQUIPMENT_MAP: dict[str, Equipment] = {
    "barbell": Equipment.barbell,
    "ez barbell": Equipment.barbell,
    "olympic barbell": Equipment.barbell,
    "trap bar": Equipment.barbell,
    "dumbbell": Equipment.dumbbell,
    "leverage machine": Equipment.machine,
    "elliptical machine": Equipment.machine,
    "skierg machine": Equipment.machine,
    "sled machine": Equipment.machine,
    "stepmill machine": Equipment.machine,
    "stationary bike": Equipment.machine,
    "upper body ergometer": Equipment.machine,
    "smithmachine": Equipment.smith_machine,
    "cable": Equipment.cable,
    "kettlebell": Equipment.kettlebell,
    "body weight": Equipment.bodyweight,
    "assisted": Equipment.bodyweight,
    "weighted": Equipment.bodyweight_weighted,
    "band": Equipment.resistance_band,
    "resistance band": Equipment.resistance_band,
    "bosu ball": Equipment.other,
    "hammer": Equipment.other,
    "medicine ball": Equipment.other,
    "roller": Equipment.other,
    "rope": Equipment.other,
    "tire": Equipment.other,
    "stability ball": Equipment.other,
    "wheel roller": Equipment.other,
}


def resolve_delts(raw_muscle: str, exercise_name: str) -> MuscleGroup:
    """I valori generici 'delts'/'deltoids'/'shoulders' non specificano quale
    porzione del deltoide: proviamo a dedurlo dal nome dell'esercizio."""
    if raw_muscle == "rear deltoids":
        return MuscleGroup.rear_delts

    name_lower = exercise_name.lower()
    if "lateral" in name_lower or "side" in name_lower:
        return MuscleGroup.side_delts
    if (
        "rear" in name_lower
        or "reverse fly" in name_lower
        or "reverse flye" in name_lower
    ):
        return MuscleGroup.rear_delts
    if "front" in name_lower or "press" in name_lower:
        return MuscleGroup.front_delts
    return MuscleGroup.side_delts


def resolve_muscle(raw_muscle: str, exercise_name: str) -> MuscleGroup | None:
    raw_muscle = raw_muscle.strip().lower()
    if raw_muscle in ("delts", "deltoids", "shoulders", "rear deltoids"):
        return resolve_delts(raw_muscle, exercise_name)
    return MUSCLE_MAP.get(raw_muscle)


def resolve_equipment(raw_equipment: str) -> Equipment:
    raw_equipment = raw_equipment.strip().lower()
    return EQUIPMENT_MAP.get(raw_equipment, Equipment.other)


def load_dataset() -> list[dict]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def build_exercise(raw: dict) -> Exercise | None:
    name = raw["name"].strip().title()

    primary = resolve_muscle(raw["target"], raw["name"])
    if primary is None:
        print(f"  [SKIP] '{name}': target non mappato -> '{raw['target']}'")
        return None

    secondary_raw = raw.get("secondary_muscles", []) or []
    secondary: list[MuscleGroup] = []
    for m in secondary_raw:
        resolved = resolve_muscle(m, raw["name"])
        if resolved is not None and resolved not in secondary and resolved != primary:
            secondary.append(resolved)

    equipment = resolve_equipment(raw["equipment"])

    return Exercise(
        name=name,
        muscle_group=primary,
        secondary_muscle_groups=secondary,
        equipment=equipment,
        created_by_user=None,  # esercizio "di sistema", nessun proprietario
    )


def main() -> None:
    print(f"Carico il dataset da {DATA_FILE} ...")
    raw_exercises = load_dataset()
    print(f"Trovati {len(raw_exercises)} esercizi grezzi.")

    engine = create_engine(settings.database_url)

    with Session(engine) as session:
        existing_names = set(session.exec(select(Exercise.name)).all())

        to_insert: list[Exercise] = []
        seen_in_batch: set[str] = set()
        skipped_unmapped = 0
        skipped_duplicate = 0

        for raw in raw_exercises:
            exercise = build_exercise(raw)
            if exercise is None:
                skipped_unmapped += 1
                continue

            if exercise.name in existing_names or exercise.name in seen_in_batch:
                skipped_duplicate += 1
                continue

            seen_in_batch.add(exercise.name)
            to_insert.append(exercise)

        print(f"\nDa inserire: {len(to_insert)}")
        print(f"Saltati (muscolo non mappato): {skipped_unmapped}")
        print(f"Saltati (nome duplicato): {skipped_duplicate}")

        confirm = input("\nProcedere con l'inserimento? [s/N] ")
        if confirm.strip().lower() != "s":
            print("Annullato.")
            return

        try:
            session.add_all(to_insert)
            session.commit()
            print(f"\nFatto: {len(to_insert)} esercizi inseriti.")
        except Exception as e:
            session.rollback()
            print(f"\nErrore durante l'inserimento, rollback eseguito: {e}")
            raise


if __name__ == "__main__":
    main()
