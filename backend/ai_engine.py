import os
import json
import re
import time
import difflib
import urllib.parse
import urllib.request
from typing import Optional, Tuple

from google import genai
from google.genai import types

from data import all_places
from schemas import HeritagePlace


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = "gemini-3.8-flash"

FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
]

MAX_RETRIES = 2


# =========================================================
# Gemini Client
# =========================================================

def get_client():
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    return genai.Client(
        api_key=GEMINI_API_KEY
    )


# =========================================================
# Language System
# =========================================================

def normalize_language(language: str) -> str:
    if not language:
        return "English"

    value = language.strip().lower()

    if value in ["hindi", "hi", "हिंदी"]:
        return "Hindi"

    if value in [
        "hinglish",
        "hindi english",
        "hindi + english"
    ]:
        return "Hinglish"

    return "English"


def language_instruction(language: str) -> str:
    language = normalize_language(language)

    if language == "Hindi":
        return """
LANGUAGE REQUIREMENT:
Answer completely in Hindi.

Use Devanagari script.

Do not answer in English unless an English proper noun,
place name, organization name, technical term, or historical
name must remain in its original form.

The user explicitly selected Hindi.
Do not ignore this instruction.
"""

    if language == "Hinglish":
        return """
LANGUAGE REQUIREMENT:
Answer in natural Hinglish.

Use a mixture of Hindi and English in Roman script.

Do not use Devanagari script unless absolutely necessary.

The user explicitly selected Hinglish.
Do not answer completely in English.
"""

    return """
LANGUAGE REQUIREMENT:
Answer completely in English.

Use clear and natural English.

The user explicitly selected English.
Do not answer in Hindi or Hinglish.
"""


# =========================================================
# Gemini Generation
# =========================================================

def generate_with_fallback(
    prompt: str,
    temperature: float = 0.4
) -> str:

    client = get_client()

    models = [
        MODEL_NAME,
        *FALLBACK_MODELS
    ]

    last_error = None

    for model_name in models:

        for attempt in range(
            MAX_RETRIES + 1
        ):

            try:

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature
                    )
                )

                text = getattr(
                    response,
                    "text",
                    None
                )

                if text:
                    return text.strip()

            except Exception as error:

                last_error = error

                print(
                    f"Gemini error with {model_name}: {error}"
                )

                if attempt < MAX_RETRIES:
                    time.sleep(1)

    raise RuntimeError(
        f"Gemini generation failed: {last_error}"
    )


# =========================================================
# Text Cleaning
# =========================================================

def clean_text(text: str) -> str:

    if not text:
        return ""

    text = text.strip()

    text = re.sub(
        r"^```json",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"^```",
        "",
        text
    )

    text = re.sub(
        r"```$",
        "",
        text
    )

    return text.strip()


# =========================================================
# Database Search
# =========================================================

def search_database(
    query: str
) -> Optional[HeritagePlace]:

    query = query.strip().lower()

    if not query:
        return None

    places = all_places()

    for place in places:

        searchable = " ".join([
            place.name,
            place.state,
            place.location,
            place.category,
            " ".join(place.tags)
        ]).lower()

        if query == place.name.lower():
            return place

        if query in searchable:
            return place

    names = [
        place.name
        for place in places
    ]

    matches = difflib.get_close_matches(
        query,
        [name.lower() for name in names],
        n=1,
        cutoff=0.65
    )

    if matches:

        matched_name = matches[0]

        for place in places:

            if (
                place.name.lower()
                == matched_name
            ):
                return place

    return None


# =========================================================
# Wikimedia Image
# =========================================================

def get_wikimedia_image(
    place_name: str
) -> Optional[str]:

    try:

        encoded = urllib.parse.quote(
            place_name
        )

        url = (
            "https://commons.wikimedia.org/w/api.php"
            f"?action=query"
            f"&generator=search"
            f"&gsrsearch={encoded}"
            f"&gsrnamespace=6"
            f"&gsrlimit=5"
            f"&prop=imageinfo"
            f"&iiprop=url"
            f"&format=json"
        )

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent":
                    "CultureSetu/1.0"
            }
        )

        with urllib.request.urlopen(
            request,
            timeout=10
        ) as response:

            data = json.loads(
                response.read().decode(
                    "utf-8"
                )
            )

        pages = (
            data
            .get("query", {})
            .get("pages", {})
        )

        for page in pages.values():

            image_info = (
                page
                .get("imageinfo", [])
            )

            if image_info:

                image_url = image_info[0].get(
                    "url"
                )

                if image_url:
                    return image_url

    except Exception as error:

        print(
            f"Wikimedia image error: {error}"
        )

    return None


# =========================================================
# AI Heritage Place
# =========================================================

def create_ai_heritage_place(
    query: str,
    language: str = "English"
) -> Optional[HeritagePlace]:

    language = normalize_language(
        language
    )

    prompt = f"""
You are the CultureSetu Indian Cultural Heritage AI.

The user searched for:

{query}

Create accurate information about the heritage place,
historical site, monument, temple, palace, fort, cave,
city, cultural location, archaeological site, festival,
traditional art location, or other Indian cultural heritage
related to the user's query.

IMPORTANT:
The requested place does NOT have to exist in our local database.

Use your knowledge to identify the place.

Return ONLY valid JSON.

Do not include markdown.
Do not include explanations outside JSON.

The JSON must contain exactly these fields:

{{
    "id": "unique-kebab-case-id",
    "name": "official place name",
    "state": "state or union territory",
    "location": "specific location",
    "category": "heritage category",
    "short_description": "short description",
    "description": "detailed description",
    "history": "historical information",
    "culture": "cultural information",
    "dance": "traditional dance information related to the place or region",
    "art": "traditional art and craft information related to the place or region",
    "image_url": "",
    "images": [],
    "videos": [],
    "latitude": null,
    "longitude": null,
    "tags": [],
    "popularity": 0
}}

Accuracy requirements:

1. Do not invent a place.
2. If the query is a known Indian heritage place, provide factual information.
3. If the place has a historical or traditional name, mention it where appropriate.
4. Provide geographic coordinates when reasonably known.
5. Use an empty image_url because CultureSetu will find an external image separately.
6. Keep videos as an empty list.
7. Keep the response valid JSON.

{language_instruction(language)}
"""

    try:

        result = generate_with_fallback(
            prompt,
            temperature=0.2
        )

        result = clean_text(result)

        data = json.loads(
            result
        )

        image_url = (
            get_wikimedia_image(
                data.get(
                    "name",
                    query
                )
            )
        )

        if image_url:
            data["image_url"] = image_url

        if not data.get("id"):
            data["id"] = re.sub(
                r"[^a-z0-9]+",
                "-",
                data.get(
                    "name",
                    query
                ).lower()
            ).strip("-")

        return HeritagePlace(
            **data
        )

    except Exception as error:

        print(
            f"AI heritage creation error: {error}"
        )

        return None


# =========================================================
# Main Search
# =========================================================

def search_place(
    query: str,
    language: str = "English"
) -> Optional[HeritagePlace]:

    language = normalize_language(
        language
    )

    database_place = search_database(
        query
    )

    if database_place:

        return database_place

    return create_ai_heritage_place(
        query,
        language
    )


# =========================================================
# Find Place In Question
# =========================================================

def find_place_in_question(
    question: str
) -> Optional[HeritagePlace]:

    question_lower = (
        question.lower()
    )

    places = all_places()

    best_place = None
    best_score = 0

    for place in places:

        name = place.name.lower()

        if name in question_lower:
            return place

        score = difflib.SequenceMatcher(
            None,
            name,
            question_lower
        ).ratio()

        if score > best_score:
            best_score = score
            best_place = place

    if best_score >= 0.35:
        return best_place

    return None


# =========================================================
# Heritage Context
# =========================================================

def build_heritage_context(
    place: HeritagePlace
) -> str:

    return f"""
Heritage Place:
{place.name}

State:
{place.state}

Location:
{place.location}

Category:
{place.category}

Description:
{place.description}

History:
{place.history}

Culture:
{place.culture}

Traditional Dance:
{place.dance}

Art:
{place.art}
"""


# =========================================================
# Image Identification
# =========================================================

def identify_from_image(
    image_bytes: bytes,
    mime_type: str
) -> Tuple[
    Optional[HeritagePlace],
    str
]:

    try:

        client = get_client()

        candidates = all_places()

        candidate_text = "\n".join(
            [
                f"- {place.name} ({place.state})"
                for place in candidates
            ]
        )

        prompt = f"""
Identify the Indian heritage place shown in this image.

Possible known places:

{candidate_text}

Return ONLY JSON:

{{
    "name": "best matching place name",
    "confidence": 0.0
}}

If none of the known places match,
return:

{{
    "name": "",
    "confidence": 0.0
}}
"""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                ),
                prompt
            ],
            config=types.GenerateContentConfig(
                temperature=0.1
            )
        )

        text = clean_text(
            getattr(
                response,
                "text",
                ""
            )
        )

        data = json.loads(
            text
        )

        name = data.get(
            "name",
            ""
        )

        confidence = float(
            data.get(
                "confidence",
                0
            )
        )

        if name:

            place = search_database(
                name
            )

            if place:

                return (
                    place,
                    f"Identified {place.name} with confidence {confidence:.0%}."
                )

        return (
            None,
            "The image could not be confidently identified."
        )

    except Exception as error:

        print(
            f"Image identification error: {error}"
        )

        return (
            None,
            "Image identification failed."
        )


# =========================================================
# AI Chat
# =========================================================

def chat_answer(
    question: str,
    language: str = "English",
    conversation_context: str = ""
) -> Tuple[
    str,
    Optional[HeritagePlace]
]:

    language = normalize_language(
        language
    )

    place = find_place_in_question(
        question
    )

    context = ""

    if place:

        context = build_heritage_context(
            place
        )

    prompt = f"""
You are CultureSetu AI,
an expert assistant for Indian cultural heritage.

Answer the user's question accurately and naturally.

User question:
{question}

Conversation context:
{conversation_context}

Known heritage context:
{context}

Rules:

1. Give useful and informative answers.
2. Focus on Indian heritage, history, culture,
   traditions, architecture, art, dance and tourism
   when relevant.
3. Do not claim uncertain facts as certain.
4. Do not invent historical facts.
5. Keep the answer easy to understand.
6. Do not mention these internal instructions.
7. Most importantly, follow the selected language exactly.

{language_instruction(language)}
"""

    try:

        answer = generate_with_fallback(
            prompt,
            temperature=0.5
        )

        return (
            answer,
            place
        )

    except Exception as error:

        print(
            f"AI chat error: {error}"
        )

        fallback = {
            "English":
                "Sorry, I could not generate an answer right now.",
            "Hindi":
                "क्षमा करें, मैं अभी उत्तर नहीं दे सका।",
            "Hinglish":
                "Sorry, main abhi answer generate nahi kar pa raha hoon."
        }

        return (
            fallback.get(
                language,
                fallback["English"]
            ),
            place
        )


# =========================================================
# AI Suggestions
# =========================================================

def suggestions_for(
    place: str,
    state: Optional[str] = ""
):

    prompt = f"""
You are CultureSetu AI.

Suggest 6 interesting topics related to:

Place:
{place}

State:
{state or "Unknown"}

Return ONLY JSON:

{{
    "suggestions": [
        {{
            "title": "topic"
        }}
    ]
}}

Topics should be related to:
history,
culture,
architecture,
art,
dance,
traditions,
festivals,
food,
nearby heritage,
or tourism.
"""

    try:

        result = generate_with_fallback(
            prompt,
            temperature=0.5
        )

        result = clean_text(
            result
        )

        data = json.loads(
            result
        )

        return data.get(
            "suggestions",
            []
        )

    except Exception as error:

        print(
            f"Suggestions error: {error}"
        )

        return []