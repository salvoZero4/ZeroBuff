from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, String, cast, delete, func, select

from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineExercise
from app.models.session import Session as WorkoutSession
from app.models.session import Set_log
from app.models.user import User
from app.services.service_helpers import commit_with_http_error_handling
from app.schemas.routine import (
    ExerciseInRoutineRead,
    ExerciseStats,
    RoutineCreate,
    RoutineListRead,
    RoutineRead,
    RoutineStats,
    RoutineUpdate,
)


def get_routines(session: Session, user_id: UUID, limit: int, offset: int):

    query = (
        select(
            Routine.id,
            Routine.name,
            func.count(RoutineExercise.exercise_id).label("exercises_count"),
            func.string_agg(
                func.distinct(cast(Exercise.muscle_group, String)), ","
            ).label("muscle_groups"),
        )
        .outerjoin(RoutineExercise, RoutineExercise.routine_id == Routine.id)
        .outerjoin(Exercise, Exercise.id == RoutineExercise.exercise_id)
        .where(Routine.user_id == user_id)
        .group_by(Routine.id, Routine.name)
        .order_by(Routine.name)
        .limit(limit)
        .offset(offset)
    )

    routines = session.exec(query).all()

    return [
        RoutineListRead(
            id=routine.id,
            name=routine.name,
            exercises_count=routine.exercises_count,
            muscle_groups=[
                muscle_group
                for muscle_group in routine.muscle_groups.split(",")
                if muscle_group
            ]
            if routine.muscle_groups
            else [],
        )
        for routine in routines
    ]


def get_exercises_in_routine(
    session: Session, routine_id: UUID, user_id: UUID
) -> RoutineRead:
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routine with ID {routine_id} not found",
        )
    if routine.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this routine",
        )
    query = (
        select(
            RoutineExercise.id,
            RoutineExercise.routine_id,
            RoutineExercise.exercise_id,
            RoutineExercise.sets,
            RoutineExercise.reps,
            RoutineExercise.rest_time,
            RoutineExercise.order_index,
            Exercise.name.label("exercise_name"),
            Exercise.muscle_group.label("muscle_group"),
        )
        .join(Exercise, Exercise.id == RoutineExercise.exercise_id)
        .where(RoutineExercise.routine_id == routine_id)
        .order_by(RoutineExercise.order_index)
    )

    exercises = session.exec(query).all()

    return RoutineRead(
        id=routine.id,
        name=routine.name,
        exercises=[
            ExerciseInRoutineRead(
                id=exercise.id,
                exercise_id=exercise.exercise_id,
                sets=exercise.sets,
                reps=exercise.reps,
                rest_time=exercise.rest_time,
                order_index=exercise.order_index,
                name=exercise.exercise_name,
                muscle_group=exercise.muscle_group,
            )
            for exercise in exercises
        ],
    )


def create_routine(
    routine_data: RoutineCreate, session: Session, user: User
) -> RoutineRead:
    normalized_name = routine_data.name.strip().title()
    existing_routine = session.exec(
        select(Routine).where(
            Routine.name == normalized_name, Routine.user_id == user.id
        )
    ).first()
    if existing_routine:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Routine with name '{normalized_name}' already exists.",
        )
    # Check for duplicate exercise IDs
    exercise_ids = [exercise.exercise_id for exercise in routine_data.exercises]
    if len(exercise_ids) != len(set(exercise_ids)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate exercise found in the routine.",
        )
    if exercise_ids:
        # Check if all exercise IDs exist in the database
        found_ids = set(
            session.exec(select(Exercise.id).where(Exercise.id.in_(exercise_ids))).all()
        )

        missing_ids = set(exercise_ids) - found_ids
        if missing_ids:
            missing_str = ", ".join(str(uid) for uid in missing_ids)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercises not found: {missing_str}",
            )
    # Create a new Routine instance
    new_routine = Routine(user_id=user.id, name=normalized_name)
    # Create RoutineExercise instances for each exercise in the routine
    exercises_in_routine = [
        RoutineExercise(
            routine_id=new_routine.id,
            exercise_id=exercise.exercise_id,
            sets=exercise.sets,
            reps=exercise.reps,
            rest_time=exercise.rest_time,
            order_index=exercise.order_index,
        )
        for exercise in routine_data.exercises
    ]

    # Add the new routine to the session and commit
    session.add(new_routine)
    session.add_all(exercises_in_routine)
    commit_with_http_error_handling(session, "Failed to create routine")
    session.refresh(new_routine)
    for exercise in exercises_in_routine:
        session.refresh(exercise)

    return get_exercises_in_routine(session, new_routine.id, user.id)


def update_routine(
    routine_id: UUID, routine_data: RoutineUpdate, session: Session, user_id: UUID
) -> RoutineRead:
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routine with ID {routine_id} not found",
        )
    if routine.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this routine",
        )

    # Update the routine name if provided
    if routine_data.name is not None:
        normalized_name = routine_data.name.strip().title()
        existing_routine = session.exec(
            select(Routine).where(
                Routine.name == normalized_name, Routine.user_id == user_id
            )
        ).first()
        # Check if the user is trying to update the routine name to a name that already exists for another routine
        if existing_routine and existing_routine.id != routine_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Routine with name '{normalized_name}' already exists.",
            )
        routine.name = normalized_name

    # Update exercises in the routine if provided
    if routine_data.exercises is not None:
        # Delete existing exercises in the routine
        session.exec(
            delete(RoutineExercise)
            .where(RoutineExercise.routine_id == routine.id)
            .execution_options(synchronize_session=False)
        )

        # Add new exercises to the routine
        new_exercises = [
            RoutineExercise(
                routine_id=routine.id,
                exercise_id=exercise.exercise_id,
                sets=exercise.sets,
                reps=exercise.reps,
                rest_time=exercise.rest_time,
                order_index=exercise.order_index,
            )
            for exercise in routine_data.exercises
        ]
        session.add_all(new_exercises)

    session.add(routine)
    commit_with_http_error_handling(session, "Failed to update routine")

    return get_exercises_in_routine(session, routine.id, user_id)


def delete_routine(routine_id: UUID, session: Session, user_id: UUID):
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Routine with ID {routine_id} not found",
        )
    if routine.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this routine",
        )
    session.delete(routine)
    commit_with_http_error_handling(session, "Failed to delete routine")


def get_routine_stats(
    routine_id: UUID, user_id: UUID, session: Session
) -> RoutineStats:
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found"
        )
    if routine.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this routine",
        )

    routine_exercises = session.exec(
        select(RoutineExercise.exercise_id, Exercise.name)
        .join(Exercise, Exercise.id == RoutineExercise.exercise_id)
        .where(RoutineExercise.routine_id == routine_id)
    ).all()

    if not routine_exercises:
        return RoutineStats(routine_id=routine_id, exercises_stats=[])

    # Create a dictionary of exercise names, using the exercise ID as the key
    exercise_names: dict[UUID, str] = {
        row.exercise_id: row.name for row in routine_exercises
    }
    exercise_ids = list(exercise_names.keys())

    top_set_per_session = (
        select(
            Set_log.exercise_id,
            WorkoutSession.id.label("session_id"),
            WorkoutSession.date,
            func.max(Set_log.weight).label("top_weight"),
        )
        .join(WorkoutSession, Set_log.session_id == WorkoutSession.id)
        .where(
            Set_log.exercise_id.in_(exercise_ids),
            WorkoutSession.user_id == user_id,
        )
        .group_by(Set_log.exercise_id, WorkoutSession.id, WorkoutSession.date)
        .subquery()
    )

    session_rank = func.dense_rank().over(
        partition_by=top_set_per_session.c.exercise_id,
        order_by=top_set_per_session.c.date.desc(),
    )

    ranked = select(
        top_set_per_session.c.exercise_id,
        top_set_per_session.c.date,
        top_set_per_session.c.top_weight,
        session_rank.label("rank"),
    ).subquery()

    results = session.exec(
        select(
            ranked.c.exercise_id,
            ranked.c.date,
            ranked.c.top_weight,
            ranked.c.rank,
        ).where(ranked.c.rank <= 2)
    ).all()

    by_exercise: dict[UUID, dict[int, object]] = {}
    for row in results:
        by_exercise.setdefault(row.exercise_id, {})[row.rank] = row

    exercises_stats: list[ExerciseStats] = []
    for exercise_id in exercise_ids:
        ranks = by_exercise.get(exercise_id, {})
        latest = ranks.get(1)
        previous = ranks.get(2)

        improvement = None
        if latest and previous and previous.top_weight > 0:
            improvement = round(
                (latest.top_weight - previous.top_weight) / previous.top_weight * 100, 1
            )

        exercises_stats.append(
            ExerciseStats(
                exercise_id=exercise_id,
                name=exercise_names[exercise_id],
                latest_weight=latest.top_weight if latest else None,
                latest_date=latest.date if latest else None,
                previous_weight=previous.top_weight if previous else None,
                previous_date=previous.date if previous else None,
                percentage_improvement=improvement,
            )
        )

    return RoutineStats(routine_id=routine_id, exercises_stats=exercises_stats)
