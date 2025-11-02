# backend/services/clothes_service.py
from __future__ import annotations

import os
import uuid
from io import BytesIO
from typing import Iterable, Optional

from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from ..models import Cloth, ClothCategory


MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
os.makedirs(MEDIA_DIR, exist_ok=True)


class ClothesService:
    """Forretningslogikk for plagg (Cloth). Routeren kaller denne."""

    def __init__(self, db: Session):
        self.db = db

    # ---------- helpers ----------

    @staticmethod
    def _validate_category(category: str) -> None:
        valid = {c.value for c in ClothCategory}
        if category not in valid:
            raise ValueError(f"Ugyldig kategori. Gyldige: {', '.join(sorted(valid))}")

    @staticmethod
    def _save_png(content: bytes) -> str:
        """Konverterer til PNG, lagrer på disk, og returnerer image_url."""
        try:
            img = Image.open(BytesIO(content)).convert("RGBA")
        except (UnidentifiedImageError, OSError):
            raise ValueError("Kunne ikke lese bildefilen (støttes kun JPG/PNG).")

        filename = f"{uuid.uuid4().hex}.png"
        path = os.path.join(MEDIA_DIR, filename)
        img.save(path, format="PNG")
        return f"/media/{filename}"

    @staticmethod
    def _delete_file_if_exists(image_url: Optional[str]) -> None:
        try:
            if image_url and image_url.startswith("/media/"):
                filename = os.path.basename(image_url)
                path = os.path.join(MEDIA_DIR, filename)
                if os.path.exists(path):
                    os.remove(path)
        except Exception:
            # Bevisst "best effort" – vi lar ikke filfeil krasje api-kallet.
            pass

    # ---------- API-orienterte metoder ----------

    def list(self, category: Optional[str] = None) -> Iterable[Cloth]:
        q = self.db.query(Cloth).order_by(Cloth.created_at.desc())
        if category:
            self._validate_category(category)
            q = q.filter(Cloth.category == category)
        return q.all()

    def get(self, cloth_id: int) -> Optional[Cloth]:
        return self.db.query(Cloth).get(cloth_id)

    def create(self, *, name: str, category: str, image_content: bytes) -> Cloth:
        self._validate_category(category)
        image_url = self._save_png(image_content)

        cloth = Cloth(
            name=name,
            category=category,
            image_url=image_url,
            user_id=None,
        )
        self.db.add(cloth)
        self.db.commit()
        self.db.refresh(cloth)
        return cloth

    def delete(self, cloth_id: int) -> bool:
        cloth = self.get(cloth_id)
        if not cloth:
            return False
        self._delete_file_if_exists(cloth.image_url)
        self.db.delete(cloth)
        self.db.commit()
        return True
