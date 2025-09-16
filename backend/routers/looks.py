# backend/routers/looks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Look, Cloth
from ..schemas import LookCreate, LookOut

router = APIRouter(prefix="/looks", tags=["looks"])

@router.get("/", response_model=list[LookOut])
def list_looks(db: Session = Depends(get_db)):
    return db.query(Look).order_by(Look.created_at.desc()).all()

@router.get("/{look_id}", response_model=LookOut)
def get_look(look_id: int, db: Session = Depends(get_db)):
    look = db.query(Look).get(look_id)
    if not look:
        raise HTTPException(404, "Not found")
    return look

@router.post("/", response_model=LookOut)
def create_look(payload: LookCreate, db: Session = Depends(get_db)):
    # Hent klærne
    clothes = db.query(Cloth).filter(Cloth.id.in__(payload.cloth_ids)).all()
    if len(clothes) != len(set(payload.cloth_ids)):
        raise HTTPException(400, "Én eller flere cloth_ids finnes ikke")

    look = Look(title=payload.title or None)
    look.clothes = clothes
    db.add(look)
    db.commit()
    db.refresh(look)
    return look
