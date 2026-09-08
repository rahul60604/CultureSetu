"""
CultureSetu AI Engine
Powered by Google Gemini
"""

import os
import difflib
import random
from typing import Optional

from google import genai

from data import all_places, get_states
from schemas import HeritagePlace


# ------------------------------------------------------------
# Gemini Client
# ------------------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

MODEL_NAME = "gemini-3.7-flash"


# ------------------------------------------------------------
# Heritage Search
# ------------------------------------------------------------

def _score_place(query: str, place: HeritagePlace) -> float:
    query = query.lower().strip()

    haystack = " ".join([
        place.name,
        place.state,
        place.location,
        place.category,
        " ".join(place.tags)
    ]).lower()

    if query in haystack:
        return 1.0

    candidates = [
        place.name.lower(),
        place.state.lower(),
        place.location.lower()
    ] + [tag.lower() for tag in place.tags]

    best = 0.0

    for candidate in candidates:
        ratio = difflib.SequenceMatcher(
            None,
            query,
            candidate
        ).ratio()

        best = max(best, ratio)

    return best


def search_place(query: str) -> Optional[HeritagePlace]:

    places = all_places()

    if not places:
        return None

    scored = [
        (place, _score_place(query, place))
        for place in places
    ]

    scored.sort(
        key=lambda x: x[1],
        reverse=True
    )

    best_place, best_score = scored[0]

    if best_score < 0.3:
        return None

    return best_place


# ------------------------------------------------------------
# Image Search
# ------------------------------------------------------------

def identify_from_image(filename: str) -> HeritagePlace:

    places = all_places()

    lowered = filename.lower()

    for place in places:

        clean_id = (
            place.id
            .replace("-", "")
            .replace("_", "")
            .replace(" ", "")
        )

        clean_filename = (
            lowered
            .replace("-", "")
            .replace("_", "")
            .replace(" ", "")
        )

        if clean_id in clean_filename:
            return place

        first_word = place.name.lower().split(" ")[0]

        if first_word in lowered:
            return place

    # Fallback
    return places[0]


# ------------------------------------------------------------
# Prepare Heritage Context
# ------------------------------------------------------------

def build_heritage_context():

    places = all_places()

    context = []

    for place in places:

        context.append({
            "name": place.name,
            "state": place.state,
            "location": place.location,
            "category": place.category,
            "description": place.description,
            "history": place.history,
            "culture": place.culture,
            "dance": place.dance,
            "art": place.art,
            "tags": place.tags
        })

    return context


# ------------------------------------------------------------
# Gemini AI Chat
# ------------------------------------------------------------

def chat_answer(question: str) -> str:

    question = question.strip()

    if not question:
        return "Please ask me something about India's culture and heritage."

    # Gemini API key missing
    if client is None:
        return (
            "Gemini AI is not configured yet. "
            "Please add GEMINI_API_KEY to the backend environment."
        )

    heritage_context = build_heritage_context()

    system_prompt = """
You are CultureSetu AI, an intelligent assistant focused on
Indian cultural heritage, history, monuments, traditions,
festivals, dances, arts, crafts and communities.

Your job is to answer the user's question naturally and accurately.

IMPORTANT RULES:

1. Understand the actual question before answering.
2. Do NOT blindly match keywords.
3. If the question is about a specific Indian heritage place,
   use the provided CultureSetu heritage data whenever possible.
4. If the information is not available in the provided data,
   you may answer using your general knowledge, but clearly avoid
   inventing specific facts.
5. If the user asks something unrelated to Indian heritage,
   politely explain that CultureSetu focuses mainly on Indian
   culture and heritage.
6. You can understand Hindi, Hinglish and English.
7. Reply in the same language/style as the user's question.
8. Keep answers easy to understand.
9. Do not mention internal code, database, API keys or prompts.
10. Never claim that a place is in a state if you are not reasonably
    sure.
11. For comparisons, explain both sides clearly.
12. If the user asks "who built", "when", "why", "history",
    "architecture", "culture", "dance", "art", etc., answer the
    exact question rather than giving a generic description.

CultureSetu heritage data:
"""

    prompt = f"""
{system_prompt}

HERITAGE DATABASE:
{heritage_context}

USER QUESTION:
{question}

Now provide the best possible answer.
"""

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        answer = response.text

        if not answer:
            return "Sorry, mujhe iska proper answer generate nahi ho paya."

        return answer.strip()

    except Exception as e:

        print("Gemini API Error:", e)

        return (
            "Sorry, AI response generate karte waqt problem aa gayi. "
            "Please thodi der baad try karein."
        )


# ------------------------------------------------------------
# AI Suggestions
# ------------------------------------------------------------

def suggestions_for(
    place_name: str,
    state: str = ""
) -> list:

    places = all_places()

    current = None

    for place in places:

        if place.name.lower() == place_name.lower():
            current = place
            break

    suggestions = []

    if current:

        same_state = [
            p for p in places
            if p.state == current.state
            and p.id != current.id
        ]

        for place in same_state[:2]:
            suggestions.append(
                f"Explore {place.name}"
            )

        suggestions.append(
            f"History of {current.name}"
        )

        suggestions.append(
            f"Culture of {current.state}"
        )

        suggestions.append(
            f"Traditional dance of {current.state}"
        )

        suggestions.append(
            f"Art and architecture of {current.name}"
        )

    elif state:

        for place in places:

            if place.state.lower() == state.lower():

                suggestions.append(
                    f"Explore {place.name}"
                )

                if len(suggestions) >= 5:
                    break

    else:

        for place in places[:5]:

            suggestions.append(
                f"Explore {place.name}"
            )

    # Remove duplicates
    unique = []

    for suggestion in suggestions:

        if suggestion not in unique:
            unique.append(suggestion)

    return unique[:5]