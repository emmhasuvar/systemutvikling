# backend/routers/clothes.py
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Response, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ClothOut
from ..services.clothes_service import ClothesService
from ..models import Cloth, ClothCategory  # ✅ used only for the PUT handler

router = APIRouter(prefix="/clothes", tags=["clothes"])


# Dependency som gir oss en service med aktiv DB-session
def svc(db: Session = Depends(get_db)) -> ClothesService:
    return ClothesService(db)


@router.get("/", response_model=list[ClothOut])
def list_clothes(
    category: Optional[str] = Query(None, description="topp | underdel | sko | tilbehør"),
    s: ClothesService = Depends(svc),
):
    try:
        return s.list(category)
    except ValueError as e:
        # Valideringsfeil fra service -> 400
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{cloth_id}", response_model=ClothOut)
def get_cloth(cloth_id: int, s: ClothesService = Depends(svc)):
    cloth = s.get(cloth_id)
    if not cloth:
        raise HTTPException(status_code=404, detail="Not found")
    return cloth


@router.post("/", response_model=ClothOut)
async def create_cloth(
    name: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    s: ClothesService = Depends(svc),
):
    content = await file.read()
    try:
        return s.create(name=name, category=category, image_content=content)
    except ValueError as e:
        # Ugyldig kategori eller ugyldig bildefil
        raise HTTPException(status_code=400, detail=str(e))


# ✅ Oppdater navn + kategori via FormData uten å endre service-laget
@router.put("/{cloth_id}", response_model=ClothOut)
def update_cloth(
    cloth_id: int,
    name: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
):
    # valider kategori
    valid = {c.value for c in ClothCategory}
    if category not in valid:
        raise HTTPException(status_code=400, detail="Ugyldig kategori")

    cloth = db.query(Cloth).filter(Cloth.id == cloth_id).first()
    if not cloth:
        raise HTTPException(status_code=404, detail="Not found")

    cloth.name = name
    cloth.category = category

    db.commit()
    db.refresh(cloth)
    return cloth


@router.delete("/{cloth_id}", status_code=204)
def delete_cloth(cloth_id: int, s: ClothesService = Depends(svc)):
    ok = s.delete(cloth_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)
