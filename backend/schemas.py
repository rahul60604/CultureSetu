from typing import List, Optional
from pydantic import BaseModel, Field


class VideoItem(BaseModel):
    title: str
    url: str


class HeritagePlace(BaseModel):
    id: str
    name: str
    state: str
    location: str
    category: str = "Heritage"
    short_description: str = ""
    description: str = ""
    history: str = ""
    culture: str = ""
    dance: str = ""
    art: str = ""
    image_url: str = "bg.jpg"
    images: List[str] = Field(default_factory=list)
    videos: List[VideoItem] = Field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tags: List[str] = Field(default_factory=list)
    popularity: int = 0


# ---------------- Request bodies ----------------

class SearchRequest(BaseModel):
    query: str


class ChatRequest(BaseModel):
    question: str


class SuggestionsRequest(BaseModel):
    place: str
    state: Optional[str] = ""


# ---------------- Response bodies ----------------

class SearchResponse(BaseModel):
    place: Optional[HeritagePlace] = None
    message: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str


class SuggestionItem(BaseModel):
    title: str


class SuggestionsResponse(BaseModel):
    suggestions: List[SuggestionItem]


class StatesResponse(BaseModel):
    states: List[str]


class PopularResponse(BaseModel):
    places: List[HeritagePlace]


class MapPlace(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float


class MapResponse(BaseModel):
    places: List[MapPlace]
