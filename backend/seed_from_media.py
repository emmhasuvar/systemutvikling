# backend/seed_from_media.py
import os
from pathlib import Path

from .database import SessionLocal
from .models import Cloth

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = (BASE_DIR / "media").resolve()

def main():
    db = SessionLocal()
    try:
        exts = {".png", ".jpg", ".jpeg", ".webp"}
        files = [p for p in MEDIA_DIR.iterdir() if p.suffix.lower() in exts and p.is_file()]
        added = 0

        for p in files:
            image_url = f"/media/{p.name}"

            exists = db.query(Cloth).filter(Cloth.image_url == image_url).first()
            if exists:
                continue

            name = p.stem.replace("_", " ").replace("-", " ")
            cloth = Cloth(name=name, image_url=image_url)
            db.add(cloth)
            added += 1

        db.commit()
        print(f"Ferdig. La til {added} nye rader.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
