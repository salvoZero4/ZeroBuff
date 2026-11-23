import pytest
from uuid import UUID
from app.models.exercise import Equipment, Exercise, ExerciseTranslation, MuscleGroup
from scripts.import_exercise_translations import load_translations, upsert_translations
from sqlmodel import select


def add_exercise(session, name, equipment=Equipment.barbell):
    exercise = Exercise(name=name, muscle_group=MuscleGroup.chest, equipment=equipment)
    session.add(exercise)
    session.flush()
    return exercise


def test_catalog_translation_coverage():
    assert len(load_translations()) == 74


def test_import_is_repeatable_and_preserves_ids(session):
    exercise = add_exercise(session, "Bench Press")
    exercise_id = exercise.id
    upsert_translations(session, "it", {"Bench Press": "Panca piana"})
    session.commit()
    first = session.exec(select(ExerciseTranslation)).one()
    first_id = first.id
    upsert_translations(session, "it", {"Bench Press": "Panca con bilanciere"})
    session.commit()

    translation = session.exec(select(ExerciseTranslation)).one()
    assert translation.id == first_id
    assert translation.exercise_id == exercise_id
    assert translation.name == "Panca con bilanciere"
    assert session.get(Exercise, exercise_id).name == "Bench Press"


def test_import_rejects_incomplete_or_ambiguous_matches(session):
    add_exercise(session, "Bench Press")
    with pytest.raises(ValueError, match="Missing"):
        upsert_translations(session, "it", {"Bench Press": "Panca", "Missing": "Altro"})
    add_exercise(session, "Bench Press")
    with pytest.raises(ValueError, match="Bench Press"):
        upsert_translations(session, "it", {"Bench Press": "Panca"})
    assert session.exec(select(ExerciseTranslation)).all() == []


def test_list_matches_both_names_before_filtering_and_paging(authenticated_client, session):
    bench = add_exercise(session, "Barbell Bench Press")
    incline = add_exercise(session, "Incline Bench Press")
    add_exercise(session, "Dumbbell Bench Press", Equipment.dumbbell)
    upsert_translations(session, "it", {
        bench.name: "Panca piana",
        incline.name: "Panca inclinata",
        "Dumbbell Bench Press": "Panca con manubri",
    })
    session.commit()

    params = {"name": "panca", "equipment": "barbell", "limit": 1, "offset": 1}
    response = authenticated_client.get(
        "/v1/exercises/", params=params, headers={"Accept-Language": "fr, it-IT;q=0.9, en;q=0.2"}
    )
    assert response.status_code == 200
    assert response.headers["Vary"] == "Accept-Language"
    assert [entry["name"] for entry in response.json()["exercises"]] == [incline.name]

    params.update(name="bench press", limit=10, offset=0)
    response = authenticated_client.get("/v1/exercises/", params=params, headers={"Accept-Language": "it"})
    assert [entry["name"] for entry in response.json()["exercises"]] == [bench.name, incline.name]


def test_list_language_preferences_and_canonical_response(authenticated_client, session):
    bench = add_exercise(session, "Bench Press")
    upsert_translations(session, "it", {bench.name: "Panca piana"})
    session.commit()

    params = {"name": "Panca piana"}
    translated = authenticated_client.get(
        "/v1/exercises/", params=params, headers={"Accept-Language": "it-IT"}
    )
    assert [item["name"] for item in translated.json()["exercises"]] == ["Bench Press"]
    for header in ("fr", "en;q=0.9, it;q=0.4", "it;q=0,en;q=1"):
        response = authenticated_client.get(
            "/v1/exercises/", params=params, headers={"Accept-Language": header}
        )
        assert response.json()["exercises"] == []

    detail = authenticated_client.get(f"/v1/exercises/{bench.id}", headers={"Accept-Language": "it"})
    assert detail.json()["name"] == "Bench Press"


def test_list_tolerates_typos_in_translated_name(authenticated_client, session):
    bench = add_exercise(session, "Bench Press")
    upsert_translations(session, "it", {bench.name: "Panca piana"})
    session.commit()

    params = {"name": "pancca"}
    response = authenticated_client.get(
        "/v1/exercises/", params=params, headers={"Accept-Language": "it"}
    )
    assert response.status_code == 200
    assert [exercise["id"] for exercise in response.json()["exercises"]] == [str(bench.id)]

    response = authenticated_client.get("/v1/exercises/", params=params)
    assert response.status_code == 200
    assert response.json()["exercises"] == []


def test_dictionary_exposes_only_global_translations(authenticated_client, session):
    bench = add_exercise(session, "Bench Press")
    upsert_translations(session, "it", {bench.name: "Panca piana"})
    session.commit()
    custom = authenticated_client.post(
        "/v1/exercises/",
        json={"name": "Push up a casa", "muscle_group": "chest", "equipment": "bodyweight"},
    ).json()
    session.add(ExerciseTranslation(exercise_id=UUID(custom["id"]), language="it", name="Should not be visible"))
    session.commit()

    response = authenticated_client.get("/v1/exercises/translations?language=it")
    assert response.json() == {"translations": [{"exercise_id": str(bench.id), "name": "Panca piana"}]}

    response = authenticated_client.get(
        "/v1/exercises/?name=Should+not+be+visible", headers={"Accept-Language": "it"}
    )
    assert response.json()["exercises"] == []
