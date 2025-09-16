# backend/routers/clothes.py
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Response
from sqlalchemy.orm import Session
from PIL import Image
from io import BytesIO

from ..database import get_db
from ..models import Cloth
from ..schemas import ClothOut

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

router = APIRouter(prefix="/clothes", tags=["clothes"])

@router.get("/", response_model=list[ClothOut])
def list_clothes(db: Session = Depends(get_db)):
    return db.query(Cloth).order_by(Cloth.created_at.desc()).all()

@router.get("/{cloth_id}", response_model=ClothOut)
def get_cloth(cloth_id: int, db: Session = Depends(get_db)):
    cloth = db.query(Cloth).get(cloth_id)
    if not cloth:
        raise HTTPException(404, "Not found")
    return cloth

@router.post("/", response_model=ClothOut)
async def create_cloth(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Les inn og (valgfritt) etterbehandle bildet
    content = await file.read()
    img = Image.open(BytesIO(content)).convert("RGBA")

    # Sørg for PNG og unikt filnavn
    filename = f"{uuid.uuid4().hex}.png"
    path = os.path.join(MEDIA_DIR, filename)
    img.save(path, format="PNG")

    # Lagre DB-rad (image_url peker til /media/{filename})
    image_url = f"/media/{filename}"
    cloth = Cloth(name=name, image_url=image_url)
    db.add(cloth)
    db.commit()
    db.refresh(cloth)
    return cloth

@router.delete("/{cloth_id}", status_code=204)
def delete_cloth(cloth_id: int, db: Session = Depends(get_db)):
    cloth = db.query(Cloth).get(cloth_id)
    if not cloth:
        raise HTTPException(status_code=404, detail="Not found")

    # Forsøk å slette bildefilen fra disk
    try:
        if cloth.image_url and cloth.image_url.startswith("/media/"):
            filename = os.path.basename(cloth.image_url)
            path = os.path.join(MEDIA_DIR, filename)
            if os.path.exists(path):
                os.remove(path)
    except Exception:
        pass  # ignorer hvis filen ikke finnes

    db.delete(cloth)
    db.commit()
    return Response(status_code=204)
