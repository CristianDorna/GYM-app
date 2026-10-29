import json
import random
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
EXERCISES_FILE = BACKEND_DIR / "exercises.json"

GROUPS = [
    {"id": "pecho", "name": "Pecho", "icon": "🏋️", "description": "Empujes y aperturas"},
    {"id": "espalda", "name": "Espalda", "icon": "🧗", "description": "Remo y tracción"},
    {"id": "piernas", "name": "Piernas", "icon": "🦵", "description": "Fuerza de tren inferior"},
    {"id": "hombros", "name": "Hombros", "icon": "💪", "description": "Press y elevaciones"},
    {"id": "biceps", "name": "Bíceps", "icon": "💪", "description": "Flexión del codo y tracción"},
    {"id": "triceps", "name": "Tríceps", "icon": "🔥", "description": "Extensión del codo y empuje"},
    {"id": "core", "name": "Core", "icon": "⚡", "description": "Estabilidad y abdomen"},
]


def load_exercises() -> list[dict[str, Any]]:
    with EXERCISES_FILE.open(encoding="utf-8") as exercises_file:
        exercises = json.load(exercises_file)

    required_fields = {
        "id",
        "name",
        "muscle_group",
        "exercise_type",
        "description",
        "sets",
        "reps",
        "rest_seconds",
        "video_url",
    }
    if not isinstance(exercises, list) or not exercises:
        raise ValueError(f"{EXERCISES_FILE} debe contener una lista de ejercicios.")

    for exercise in exercises:
        if not isinstance(exercise, dict) or not required_fields.issubset(exercise):
            raise ValueError(f"Cada ejercicio en {EXERCISES_FILE} debe incluir todos los campos requeridos.")
    return exercises


EXERCISES = load_exercises()
app = FastAPI(title="Gym Routine API", version="1.0.0")


@app.get("/api/groups")
def get_groups() -> list[dict[str, Any]]:
    return [
        {
            **group,
            "exercise_count": sum(
                exercise["muscle_group"] == group["id"] for exercise in EXERCISES
            ),
        }
        for group in GROUPS
    ]


@app.get("/api/exercises")
def get_exercises(
    muscle_group: str | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=80),
) -> list[dict[str, Any]]:
    exercises = EXERCISES
    if muscle_group:
        if not any(group["id"] == muscle_group for group in GROUPS):
            raise HTTPException(status_code=404, detail="No se encontró ese grupo muscular.")
        exercises = [
            exercise for exercise in exercises if exercise["muscle_group"] == muscle_group
        ]
    if q:
        search_term = q.casefold()
        exercises = [
            exercise
            for exercise in exercises
            if search_term
            in " ".join(
                (
                    exercise["name"],
                    exercise["description"],
                    exercise["muscle_group"],
                )
            ).casefold()
        ]
    return exercises


@app.get("/api/routines/{group_id}")
def get_routine(
    group_id: str,
    limit: int = Query(default=4, ge=2, le=5),
) -> dict[str, Any]:
    group = next((item for item in GROUPS if item["id"] == group_id), None)
    if group is None:
        raise HTTPException(status_code=404, detail="No se encontró ese grupo muscular.")

    available = [
        exercise for exercise in EXERCISES if exercise["muscle_group"] == group_id
    ]
    if len(available) < 2:
        raise HTTPException(
            status_code=500,
            detail=f"No hay suficientes ejercicios configurados para {group['name']}.",
        )

    compound = [exercise for exercise in available if exercise["exercise_type"] == "compuesto"]
    isolation = [exercise for exercise in available if exercise["exercise_type"] == "aislamiento"]
    if not compound or not isolation:
        raise HTTPException(
            status_code=500,
            detail=f"La rutina de {group['name']} debe incluir ejercicios compuestos y de aislamiento.",
        )

    routine_size = min(limit, len(available))
    selected = [random.choice(compound), random.choice(isolation)]
    remaining = [exercise for exercise in available if exercise not in selected]
    selected.extend(random.sample(remaining, routine_size - len(selected)))
    random.shuffle(selected)

    return {
        "group": group,
        "exercise_count": len(selected),
        "exercises": selected,
    }


@app.get("/data/exercises.json", include_in_schema=False)
def get_static_exercises() -> FileResponse:
   return FileResponse(EXERCISES_FILE, media_type="application/json")


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
