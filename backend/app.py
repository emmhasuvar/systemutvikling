# backend/app.py
import os
import logging
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .database import Base, engine
from .routers import clothes as clothes_router
from .routers import looks as looks_router

# -----------------------------------------------------
# Logging
# -----------------------------------------------------
logger = logging.getLogger("looksy")
logging.basicConfig(level=logging.INFO)

# -----------------------------------------------------
# DB-tabeller (i prod bruk Alembic)
# -----------------------------------------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Looksy API")

# -----------------------------------------------------
# CORS (åpent for enkel testing; stram inn i prod)
# -----------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------
# Statisk: /media (lagrede bilder) + /static (frontend)
# -----------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", include_in_schema=False)
def root():
    if not os.path.exists(INDEX_HTML):
        return {"msg": "frontend/index.html finnes ikke. API kjører."}
    return FileResponse(INDEX_HTML)

# -----------------------------------------------------
# BAKGRUNNSFJERNER (rembg med session). Fallback = RGBA uten fjerning
# -----------------------------------------------------
try:
    from rembg import remove, new_session  # type: ignore
    _rembg_session = None
    _rembg_model = None
    # Prøv mest kompatible modeller først
    for _model in ("u2net", "u2netp", "u2net_human_seg", "isnet-general"):
        try:
            _rembg_session = new_session(_model)
            _rembg_model = _model
            break
        except Exception:
            continue

    if _rembg_session is None:
        raise RuntimeError("Ingen støttet rembg-modell funket")

    REMBG_OK = True
    logger.info(f"REMBG: OK – session initialised ({_rembg_model}).")
except Exception as e:
    REMBG_OK = False
    logger.warning(f"REMBG: NOT OK – falling back. Error: {e}")

def remove_bg_pil(pil_image: Image.Image) -> Image.Image:
    """
    Returnerer en RGBA med fjernet bakgrunn hvis rembg er tilgjengelig,
    ellers kun konvertert til RGBA (fallback, ingen ekte fjerning).
    """
    # (valgfritt) skalere ned veldig store bilder for ytelse
    try:
        pil_image = pil_image.convert("RGB")
        pil_image.thumbnail((2048, 2048))
    except Exception:
        pass

    if REMBG_OK:
        buf_in = BytesIO()
        pil_image.save(buf_in, format="PNG")
        out_bytes = remove(buf_in.getvalue(), session=_rembg_session)
        out_img = Image.open(BytesIO(out_bytes)).convert("RGBA")
        return out_img

    logger.warning("Using fallback – no background will actually be removed.")
    return pil_image.convert("RGBA")

@app.post("/remove-bg", response_class=Response, tags=["utils"])
async def remove_bg_endpoint(file: UploadFile = File(...)):
    """
    Tar inn et bilde og returnerer image/png der bakgrunnen er fjernet (hvis rembg).
    Frontend kan vise resultatet og poste PNG videre til /clothes/ for lagring.
    """
    try:
        content = await file.read()
        img = Image.open(BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Ugyldig bilde")

    out = remove_bg_pil(img)
    buf = BytesIO()
    out.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")

# -----------------------------------------------------
# API-ruter for Clothes og Looks
# -----------------------------------------------------
app.include_router(clothes_router.router)
app.include_router(looks_router.router)

@app.get("/healthz", tags=["utils"])
def healthz():
    return {"ok": True}
