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


# -----------------------------
# Logging
# -----------------------------
logger = logging.getLogger("looksy")
logging.basicConfig(level=logging.INFO)

# -----------------------------
# DB-tabeller
# -----------------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Looksy API")

# -----------------------------
# CORS (åpent for testing)
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Statisk: media + frontend
# -----------------------------
# --- statisk og sider ---
# -----------------------------
# Statisk: media + frontend
# -----------------------------
BASE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# 1) /media for opplastede bilder
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# 2) Frontend (alle statiske filer under /static)
HOME_DIR    = os.path.join(PROJECT_ROOT, "frontend", "show_home")
UPLOAD_DIR  = os.path.join(PROJECT_ROOT, "frontend", "show_upload")
CLOTHES_DIR = os.path.join(PROJECT_ROOT, "frontend", "show_clothes")
LAGLOOKS_DIR = os.path.join(PROJECT_ROOT, "frontend", "show_lag_looks") 

app.mount("/static", StaticFiles(directory=os.path.join(PROJECT_ROOT, "frontend")), name="static")

@app.get("/", include_in_schema=False)
def home_page():
    return FileResponse(os.path.join(HOME_DIR, "index.html"))

@app.get("/upload", include_in_schema=False)
def upload_page():
    return FileResponse(os.path.join(UPLOAD_DIR, "index.html"))

@app.get("/clothes", include_in_schema=False)
def clothes_page():
    return FileResponse(os.path.join(CLOTHES_DIR, "index.html"))

@app.get("/lag-looks", include_in_schema=False)
def lag_looks_page():
    return FileResponse(os.path.join(LAGLOOKS_DIR, "index.html"))

@app.get("/looks", include_in_schema=False)
def looks_page_alias():
    return FileResponse(os.path.join(LAGLOOKS_DIR, "index.html"))
# -----------------------------
# Bakgrunnsfjerner (rembg)
# -----------------------------
try:
    from rembg import remove, new_session  # type: ignore

    _rembg_session = None
    _rembg_model = None
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
    """Fjern bakgrunn hvis rembg finnes, ellers bare konverter til RGBA."""
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

    logger.warning("Fallback i bruk – bakgrunn fjernes ikke.")
    return pil_image.convert("RGBA")

@app.post("/remove-bg", response_class=Response, tags=["utils"])
async def remove_bg_endpoint(file: UploadFile = File(...)):
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

# -----------------------------
# API-ruter
# -----------------------------
app.include_router(clothes_router.router, prefix="/api")
app.include_router(looks_router.router,   prefix="/api")


@app.get("/healthz", tags=["utils"])
def healthz():
    return {"ok": True}
