from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from data import all_places, get_states, get_by_id
from schemas import (
    HeritagePlace,
    SearchRequest,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    SuggestionsRequest,
    SuggestionsResponse,
    SuggestionItem,
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


# ============================================================
# CultureSetu FastAPI Application
# ============================================================

app = FastAPI(
    title="CultureSetu API",
    description="AI Powered Cultural Heritage Platform — Backend",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "CultureSetu API",
        "message": "CultureSetu Backend is running successfully!"
    }


# ============================================================
# Health Check
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "FastAPI",
        "service": "CultureSetu"
    }


# ============================================================
# States
# ============================================================

@app.get("/api/states", response_model=StatesResponse)
def api_states():
    return {
        "states": get_states()
    }


# ============================================================
# Popular Heritage Places
# ============================================================

@app.get(
    "/api/heritage/popular",
    response_model=PopularResponse
)
def api_popular(
    state: str = Query(default="")
):
    places = all_places()

    if state:
        filtered = [
            p
            for p in places
            if p.state.lower() == state.lower()
        ]

        # Agar state match nahi hua
        # to saare places return karo
        places = filtered if filtered else places

    ordered = sorted(
        places,
        key=lambda p: p.popularity,
        reverse=True
    )

    return {
        "places": ordered
    }


# ============================================================
# Text Search
# ============================================================

@app.post(
    "/api/heritage/search",
    response_model=SearchResponse
)
def api_search(
    payload: SearchRequest
):
    place = search_place(payload.query)

    if place is None:
        return {
            "place": None,
            "message": (
                f"Koi heritage place "
                f"'{payload.query}' se match nahi hua."
            ),
        }

    return {
        "place": place,
        "message": None
    }


# ============================================================
# Image Search
# ============================================================

@app.post(
    "/api/heritage/image-search",
    response_model=SearchResponse
)
async def api_image_search(
    image: UploadFile = File(...)
):

    # Check image type
    if (
        not image.content_type
        or not image.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not an image."
        )

    # Read uploaded image
    contents = await image.read()

    # Empty file check
    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty image file."
        )

    # AI image identification
    place = identify_from_image(
        image.filename or ""
    )

    return {
        "place": place,
        "message": None
    }


# ============================================================
# AI Assistant Chat
# ============================================================

@app.post(
    "/api/ai/chat",
    response_model=ChatResponse
)
def api_chat(
    payload: ChatRequest
):
    answer = chat_answer(
        payload.question
    )

    return {
        "answer": answer
    }


# ============================================================
# AI Suggestions
# ============================================================

@app.post(
    "/api/ai/suggestions",
    response_model=SuggestionsResponse
)
def api_suggestions(
    payload: SuggestionsRequest
):

    titles = suggestions_for(
        payload.place,
        payload.state or ""
    )

    return {
        "suggestions": [
            {
                "title": title
            }
            for title in titles
        ]
    }


# ============================================================
# Heritage Map
# ============================================================

@app.get(
    "/api/heritage/map",
    response_model=MapResponse
)
def api_map():

    places = all_places()

    markers = [
        {
            "name": p.name,
            "location": p.location,
            "latitude": p.latitude,
            "longitude": p.longitude,
        }
        for p in places
        if (
            p.latitude is not None
            and p.longitude is not None
        )
    ]

    return {
        "places": markers
    }


# ============================================================
# Single Heritage Place
# ============================================================

@app.get(
    "/api/heritage/{place_id}",
    response_model=HeritagePlace
)
def api_get_place(
    place_id: str
):

    place = get_by_id(place_id)

    if place is None:
        raise HTTPException(
            status_code=404,
            detail="Place not found."
        )

    return place