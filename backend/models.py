# backend/models.py
from enum import Enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from .database import Base


# Underkategorier for plagg
class ClothCategory(str, Enum):
    topp = "topp"
    underdel = "underdel"
    sko = "sko"
    tilbehør = "tilbehør"


# Many-to-many kobling mellom looks og clothes
look_clothes = Table(
    "look_clothes",
    Base.metadata,
    Column("look_id", ForeignKey("looks.id", ondelete="CASCADE"), primary_key=True),
    Column("cloth_id", ForeignKey("clothes.id", ondelete="CASCADE"), primary_key=True),
)


class Cloth(Base):
    __tablename__ = "clothes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)

    # Ny kolonne: underkategori
    # native_enum=False -> lagres som TEXT (spesielt fint for SQLite)
    category = Column(SAEnum(ClothCategory, native_enum=False), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class Look(Base):
    __tablename__ = "looks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clothes = relationship(
        "Cloth",
        secondary=look_clothes,
        lazy="joined",
    )
