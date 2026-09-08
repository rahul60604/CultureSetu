import difflib
import random
from typing import Optional

from data import all_places, get_states
from schemas import HeritagePlace


def _score_place(query: str, place: HeritagePlace) -> float:
    """Very small heuristic 'relevance score' for a query vs a place."""
    query = query.lower().strip()
    haystack = " ".join(
        [
            place.name,
            place.state,
            place.location,
            place.category,
            " ".join(place.tags),
        ]
    ).lower()

    if query in haystack:
        return 1.0

    # fuzzy match against name / state / tags individually
    candidates = [place.name.lower(), place.state.lower(), place.location.lower()] + place.tags
    best = 0.0
    for c in candidates:
        ratio = difflib.SequenceMatcher(None, query, c).ratio()
        best = max(best, ratio)

    return best


def search_place(query: str) -> Optional[HeritagePlace]:
    """
    Find the best-matching heritage place for a free-text query
    (typed, voice-transcribed, or clicked from a suggestion chip).

    --> Swap point: replace this with an LLM call that extracts
        the place name from natural language, then look it up.
    """
    places = all_places()
    if not places:
        return None

    scored = [(p, _score_place(query, p)) for p in places]
    scored.sort(key=lambda x: x[1], reverse=True)

    best_place, best_score = scored[0]

    # require a minimum confidence, otherwise "no match"
    if best_score < 0.3:
        return None

    return best_place


def identify_from_image(filename: str) -> HeritagePlace:
    """
    Placeholder image-recognition step.

    Real projects would run the uploaded image bytes through a
    vision model (CLIP embeddings, a fine-tuned classifier, or
    a multimodal LLM call) and compare against known heritage
    images. Here we only look at the filename as a stand-in, and
    fall back to a random well-known place so the UI always has
    something to show end-to-end.

    --> Swap point: accept the raw image bytes instead of just
        `filename`, run them through your model, and return the
        best-matching HeritagePlace.
    """
    places = all_places()
    lowered = filename.lower()

    for place in places:
        if place.id.replace("-", "") in lowered.replace("-", "").replace(" ", "").replace("_", ""):
            return place
        if place.name.lower().split(" ")[0] in lowered:
            return place

    return random.choice(places)


def chat_answer(question: str) -> str:
    """
    Simple retrieval-based Q&A: find the most relevant place for
    the question, then answer using its stored fields.

    --> Swap point: replace the body of this function with a call
        to an LLM (server-side only, keep the API key out of the
        frontend), optionally passing the matched place's data as
        context so the model stays grounded in real facts.
    """
    place = search_place(question)
    lowered = question.lower()

    if place is None:
        states = ", ".join(get_states())
        return (
            "Mujhe is sawaal ke liye koi specific heritage place nahi mila. "
            f"Aap in states ke baare mein pooch sakte hain: {states}."
        )

    if "history" in lowered or "itihas" in lowered:
        return f"{place.name} ka itihas: {place.history}"

    if "dance" in lowered or "naach" in lowered:
        return f"{place.name} se juda dance: {place.dance}"

    if "art" in lowered or "kala" in lowered:
        return f"{place.name} ki art: {place.art}"

    if "culture" in lowered or "sanskriti" in lowered:
        return f"{place.name} ki culture: {place.culture}"

    return f"{place.name} ({place.location}) — {place.short_description}"


def suggestions_for(place_name: str, state: str = "") -> list:
    """
    Suggest a few related searches: other places in the same
    state, or same category, so the "AI Suggests" chips have
    something meaningful to show.

    --> Swap point: replace with an LLM-generated list of
        follow-up questions/topics based on the place's data.
    """
    places = all_places()
    current = None
    for p in places:
        if p.name.lower() == place_name.lower():
            current = p
            break

    suggestions = []

    if current:
        same_state = [p for p in places if p.state == current.state and p.id != current.id]
        same_category = [p for p in places if p.category == current.category and p.id != current.id]

        for p in same_state[:2]:
            suggestions.append(f"Explore {p.name} in {p.state}")

        for p in same_category[:2]:
            title = f"More {p.category.lower()}s like {p.name}"
            if title not in suggestions:
                suggestions.append(title)

        suggestions.append(f"Traditional dance forms of {current.state}")
        suggestions.append(f"History of {current.name}")

    elif state:
        for p in [p for p in places if p.state == state][:4]:
            suggestions.append(f"Explore {p.name}")

    if not suggestions:
        for p in random.sample(places, min(4, len(places))):
            suggestions.append(f"Explore {p.name}")

    # de-duplicate while keeping order
    seen = set()
    unique = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            unique.append(s)

    return unique[:5]
