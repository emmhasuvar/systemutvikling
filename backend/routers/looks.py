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

# ▶ Make MEDIA_DIR absolute (resolves .../routers/../media → /abs/path/backend/media)
MEDIA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "media"))
os.makedirs(MEDIA_DIR, exist_ok=True)

router = APIRouter(prefix="/looks", tags=["looks"])


def _fix_and_get_image_url(look: Look) -> str:
    """
    Ensure look.image_url points to a real file in MEDIA_DIR.
    If the exact filename doesn't exist, try swapping extension
    between .png/.jpg/.jpeg using the same stem. Persist the fix.
    """
    url = (look.image_url or "").strip()
    if not url:
        return url

    fname = os.path.basename(url)
    if not fname:
        return url

    # 1) If the exact file exists -> ok
    p = os.path.join(MEDIA_DIR, fname)
    if os.path.exists(p):
        return url

    # 2) Try other common extensions with same stem
    stem, _ext = os.path.splitext(fname)
    for ext in (".png", ".jpg", ".jpeg", ".JPG", ".JPEG", ".PNG"):
        cand = stem + ext
        cand_path = os.path.join(MEDIA_DIR, cand)
        if os.path.exists(cand_path):
            fixed_url = f"/media/{cand}"
            # Persist the healed URL so the client doesn't need workarounds
            look.image_url = fixed_url
            return fixed_url

    # 3) Nothing found; leave as-is (client may still show a broken icon)
    return url


@router.get("/", response_model=list[LookOut])
def list_looks(db: Session = Depends(get_db)):
    looks = db.query(Look).order_by(Look.created_at.desc()).all()
    changed = False
    for look in looks:
        fixed = _fix_and_get_image_url(look)
        if fixed != (look.image_url or ""):
            changed = True
    if changed:
        db.commit()  # persist any healed image_url values
    return looks


@router.get("/{look_id}", response_model=LookOut)
def get_look(look_id: int, db: Session = Depends(get_db)):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(status_code=404, detail="Not found")
    # heal on single get as well
    fixed = _fix_and_get_image_url(look)
    if fixed != (look.image_url or ""):
        db.commit()
    return look


@router.post("/", response_model=LookOut)
async def create_look(
    file: UploadFile = File(...),
    cloth_ids: str = Form(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # parse cloth_ids
    try:
        ids: List[int] = (
            json.loads(cloth_ids)
            if cloth_ids.strip().startswith("[")
            else [int(x) for x in cloth_ids.split(",") if x.strip()]
        )
    except Exception:
        raise HTTPException(status_code=400, detail="cloth_ids må være JSON-listen som '[1,2]' eller '1,2'")
    if not ids:
        raise HTTPException(status_code=400, detail="cloth_ids kan ikke være tom")

    # validate clothes exist
    clothes = db.query(Cloth).filter(Cloth.id.in_(ids)).all()
    if len(clothes) != len(set(ids)):
        found = {c.id for c in clothes}
        missing = [i for i in ids if i not in found]
        raise HTTPException(status_code=400, detail=f"Ugyldige cloth_ids: {missing}")

    # write image
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

    look = Look(title=title, image_url=image_url)
    look.clothes = clothes
    db.add(look)
    db.commit()
    db.refresh(look)
    return look
@router.put("/{look_id}", response_model=LookOut)
def update_look(
    look_id: int,
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(status_code=404, detail="Not found")
    look.title = title
    db.commit()
    db.refresh(look)
    return look


@router.delete("/{look_id}", status_code=204)
def delete_look(look_id: int, db: Session = Depends(get_db)):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(status_code=404, detail="Not found")

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
