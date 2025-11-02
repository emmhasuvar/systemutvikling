# backend/routers/looks.py
from __future__ import annotations

import json
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Look, Cloth
from ..schemas import LookOut

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

router = APIRouter(prefix="/looks", tags=["looks"])


@router.get("/", response_model=list[LookOut])
def list_looks(db: Session = Depends(get_db)):
    return db.query(Look).order_by(Look.created_at.desc()).all()


@router.get("/{look_id}", response_model=LookOut)
def get_look(look_id: int, db: Session = Depends(get_db)):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(status_code=404, detail="Not found")
    return look


@router.post("/", response_model=LookOut)
async def create_look(
    # Frontend sender multipart/form-data:
    # - file: collage-PNG/JPG
    # - cloth_ids: enten JSON-string "[1,2,3]" ELLER "1,2,3"
    # - title: valgfritt
    file: UploadFile = File(...),
    cloth_ids: str = Form(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # 1) Parse cloth_ids fra Form
    try:
        # forsøk JSON først (eks: "[1,2,3]")
        ids: List[int] = json.loads(cloth_ids) if cloth_ids.strip().startswith("[") else [
            int(x) for x in cloth_ids.split(",") if x.strip()
        ]
    except Exception:
        raise HTTPException(status_code=400, detail="cloth_ids må være JSON-listen som '[1,2]' eller '1,2'")

    if not ids:
        raise HTTPException(status_code=400, detail="cloth_ids kan ikke være tom")

    # 2) Hent klær og valider at alle finnes
    clothes = db.query(Cloth).filter(Cloth.id.in_(ids)).all()
    if len(clothes) != len(set(ids)):
        found = {c.id for c in clothes}
        missing = [i for i in ids if i not in found]
        raise HTTPException(status_code=400, detail=f"Ugyldige cloth_ids: {missing}")

    # 3) Lagre collage-bildet til media/
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tom bildefil")
    ext = ".png"
    if file.filename and file.filename.lower().endswith((".jpg", ".jpeg")):
        ext = ".jpg"
    filename = f"look_{uuid.uuid4().hex}{ext}"
    path = os.path.join(MEDIA_DIR, filename)
    with open(path, "wb") as fh:
        fh.write(content)
    image_url = f"/media/{filename}"

    # 4) Opprett Look og relasjoner
    look = Look(title=title, image_url=image_url)
    look.clothes = clothes  # fyller look_clothes-koblingene
    db.add(look)
    db.commit()
    db.refresh(look)
    return look


@router.delete("/{look_id}", status_code=204)
def delete_look(look_id: int, db: Session = Depends(get_db)):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(status_code=404, detail="Not found")

    # prøv å slette collage-filen
    try:
        if look.image_url and look.image_url.startswith("/media/"):
            fname = os.path.basename(look.image_url)
            p = os.path.join(MEDIA_DIR, fname)
            if os.path.exists(p):
                os.remove(p)
    except Exception:
        pass

    db.delete(look)
    db.commit()
    return Response(status_code=204)
