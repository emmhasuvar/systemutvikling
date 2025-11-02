# backend/schemas.py
from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel

# Detect Pydantic v2 (so we can set from_attributes=True)
try:
    from pydantic import ConfigDict  # v2
    _V2 = True
except Exception:  # pydantic v1 fallback
    _V2 = False


class ClothBase(BaseModel):
    name: str
    category: Literal["topp", "underdel", "sko", "tilbehør"]


class ClothOut(ClothBase):
    id: int
    image_url: Optional[str]
    created_at: datetime

    if _V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class LookCreate(BaseModel):
    title: Optional[str] = None
    cloth_ids: List[int]


class LookOut(BaseModel):
    id: int
    title: Optional[str]
    image_url: Optional[str]          # <-- include collage URL in responses
    created_at: datetime
    clothes: List[ClothOut]

    if _V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True
