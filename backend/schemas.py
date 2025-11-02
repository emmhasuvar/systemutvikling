# backend/schemas.py
from typing import List, Optional, Literal
from pydantic import BaseModel
from datetime import datetime

class ClothBase(BaseModel):
    name: str
    category: Literal["topp", "underdel", "sko", "tilbehør"]

class ClothOut(ClothBase):
    id: int
    image_url: str
    created_at: datetime
    class Config:
        orm_mode = True

class LookCreate(BaseModel):
    title: Optional[str] = None
    cloth_ids: List[int]

class LookOut(BaseModel):
    id: int
    title: Optional[str]
    created_at: datetime
    clothes: List[ClothOut]
    class Config:
        orm_mode = True
