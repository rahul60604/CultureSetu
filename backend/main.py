from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from data import all_places, get_by_id, get_states

from schemas import (
    SearchRequest,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    SuggestionsRequest,
    SuggestionsResponse,
    StatesResponse,
    PopularResponse,
    MapResponse,
    MapPlace,
)

from ai_engine import (
    search_place,
    identify_from_image,
    chat_answer,
    suggestions_for,
)


# =========================================================
# Application
# =========================================================

app = FastAPI(
    title="CultureSetu API",
    description="AI-powered Indian Cultural Heritage API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Root
# =========================================================

@app.get("/")
def root():
    return {
        "name": "CultureSetu API",
        "status": "running",
        "version": "1.0.0",
    }


# =========================================================
# Health
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "places": len(all_places()),
    }


# =========================================================
# States
# =========================================================

@app.get(
    "/api/states",
    response_model=StatesResponse
)
def states():
    return {
        "states": get_states()
    }


# =========================================================
# Popular Heritage Places
# =========================================================

@app.get(
    "/api/heritage/popular",
    response_model=PopularResponse
)
def popular_places(
    state: Optional[str] = Query(
        default=None
    ),
    limit: int = Query(
        default=8,
        ge=1,
        le=20
    ),
):

    places = all_places()

    if state:

        state_clean = (
            state
            .strip()
            .lower()
        )

        places = [
            place
            for place in places
            if place.state.strip().lower()
            == state_clean
        ]

    places = sorted(
        places,
        key=lambda place: place.popularity,
        reverse=True,
    )

    return {
        "places": places[:limit]
    }


# =========================================================
# Heritage Search
# =========================================================

@app.post(
    "/api/heritage/search",
    response_model=SearchResponse
)
def heritage_search(
    payload: SearchRequest
):

    query = payload.query.strip()

    if not query:

        return {
            "place": None,
            "message":
                "Please enter a heritage place name."
        }

    place = search_place(
        query,
        language=payload.language
    )

    if place is None:

        return {
            "place": None,
            "message":
                "No matching heritage place was found."
        }

    return {
        "place": place,
        "message":
            f"Found {place.name}."
    }


# =========================================================
# Image Search
# =========================================================

@app.post(
    "/api/heritage/image-search",
    response_model=SearchResponse
)
async def heritage_image_search(
    image: UploadFile = File(...)
):

    if not image.content_type:

        raise HTTPException(
            status_code=400,
            detail=
                "Image content type is missing."
        )

    if not image.content_type.startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=400,
            detail=
                "Please upload a valid image file."
        )

    contents = await image.read()

    if not contents:

        raise HTTPException(
            status_code=400,
            detail=
                "The uploaded image is empty."
        )

    place, message = identify_from_image(
        image_bytes=contents,
        mime_type=image.content_type,
    )

    return {
        "place": place,
        "message": message,
    }


# =========================================================
# AI Chat
# =========================================================

@app.post(
    "/api/ai/chat",
    response_model=ChatResponse
)
def ai_chat(
    payload: ChatRequest
):

    question = payload.question.strip()

    if not question:

        return {
            "answer":
                "Please enter a question.",
            "place": None
        }

    answer, place = chat_answer(
        question=question,
        language=payload.language,
        conversation_context=
            payload.conversation_context,
    )

    return {
        "answer": answer,
        "place": place,
    }


# =========================================================
# AI Suggestions
# =========================================================

@app.post(
    "/api/ai/suggestions",
    response_model=SuggestionsResponse
)
def ai_suggestions(
    payload: SuggestionsRequest
):

    suggestions = suggestions_for(
        place=payload.place,
        state=payload.state,
    )

    return {
        "suggestions": suggestions
    }


# =========================================================
# Heritage Map
# =========================================================

@app.get(
    "/api/heritage/map",
    response_model=MapResponse
)
def heritage_map():

    map_places = []

    for place in all_places():

        if (
            place.latitude is None
            or
            place.longitude is None
        ):
            continue

        map_places.append(
            MapPlace(
                name=place.name,
                location=place.location,
                latitude=place.latitude,
                longitude=place.longitude,
            )
        )

    return {
        "places": map_places
    }


# =========================================================
# Heritage Details
# =========================================================

@app.get(
    "/api/heritage/{place_id}"
)
def heritage_details(
    place_id: str
):

    place = get_by_id(
        place_id
    )

    if place is None:

        raise HTTPException(
            status_code=404,
            detail=
                "Heritage place not found."
        )

    return {
        "place": place
    }