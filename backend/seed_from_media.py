# backend/seed_from_media.py
import os
from datetime import datetime
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Cloth, ClothCategory

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)


def guess_category(name: str) -> str:
    s = (name or "").lower()
    if any(w in s for w in ["sko", "sneaker", "boots", "sandaler", "hæler", "heler", "slippers"]):
        return ClothCategory.sko.value
    if any(w in s for w in ["bukse", "jeans", "skjørt", "skjort", "shorts", "underdel", "tights"]):
        return ClothCategory.underdel.value
    if any(w in s for w in ["belte", "caps", "hatt", "lue", "smykke", "veske", "tilbehør", "tilbehor", "hals", "skjerf"]):
        return ClothCategory.tilbehør.value
    return ClothCategory.topp.value


def is_image(filename: str) -> bool:
    return filename.lower().endswith((".png", ".jpg", ".jpeg"))


def main():
    files = [f for f in os.listdir(MEDIA_DIR) if is_image(f)]
    if not files:
        print("Ingen bildefiler i backend/media – ingenting å seede.")
        return

    created = 0
    with SessionLocal() as db:  # auto commit/close-kontroll
        for fn in sorted(files):
            image_url = f"/media/{fn}"
            # hopp over hvis finnes fra før
            if db.query(Cloth).filter(Cloth.image_url == image_url).first():
                continue

            name = os.path.splitext(fn)[0]
            category = guess_category(name)

            cloth = Cloth(
                name=name,
                image_url=image_url,
                category=category,   # viktig pga. NOT NULL
                user_id=None,
                created_at=datetime.utcnow(),
            )
            db.add(cloth)
            created += 1

        db.commit()

    print(f"Seed ferdig. La til {created} nye plagg.")


if __name__ == "__main__":
    main()
