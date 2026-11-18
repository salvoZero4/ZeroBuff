
### Exercise translations

Apply the Alembic migrations and populate the base catalog before loading
translations in a new environment. On a populated database, load translations
directly onto the existing exercises.

```sh
uv run python -m scripts.import_exercise_translations --dry-run
uv run python -m scripts.import_exercise_translations
```

Set `CATALOG_DATABASE_URL` to the target database for the second command. It
upserts the Italian names by exercise ID and is safe to rerun. The
`/v1/exercises/translations?language=it` endpoint returns the display names,
and search accepts `Accept-Language: it` to match them alongside the canonical
English names.
