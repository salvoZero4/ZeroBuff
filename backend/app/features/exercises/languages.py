import re

SUPPORTED_LANGUAGES = ("en", "it")
_LANGUAGE_RANGE = re.compile(r"(?:[a-z]{1,8}(?:-[a-z0-9]{1,8})*|\*)")
_QUALITY = re.compile(r"q=(0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?)")


def preferred_language(header: str | None) -> str:
    """Resolve an HTTP language priority list against the catalog languages."""
    preferences: list[tuple[str, float]] = []
    for item in (header or "").lower().split(","):
        language, separator, weight = item.strip().partition(";")
        language = language.strip()
        quality = _QUALITY.fullmatch(weight.strip()) if separator else None
        if _LANGUAGE_RANGE.fullmatch(language) and (not separator or quality):
            preferences.append((language, float(quality[1]) if quality else 1.0))

    excluded = {language for language, quality in preferences if quality == 0}
    explicitly_listed = {language.split("-")[0] for language, _ in preferences}
    for language, quality in sorted(preferences, key=lambda item: -item[1]):
        if quality == 0:
            continue
        if language == "*":
            for candidate in SUPPORTED_LANGUAGES:
                if candidate not in explicitly_listed and candidate not in excluded:
                    return candidate
            continue
        primary = language.split("-")[0]
        if primary in SUPPORTED_LANGUAGES and (primary not in excluded or primary == language):
            return primary
    return "en"
