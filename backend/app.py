# backend/app.py
import os
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
# DB-tabeller (i prod bruk Alembic, men dette er fint nå)
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
# Statisk: /media (lagrede bilder)
# -----------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# -----------------------------------------------------
# (Valgfritt) serve frontend/index.html på /
# -----------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", include_in_schema=False)
def root():
    if not os.path.exists(INDEX_HTML):
        return {"msg": "frontend/index.html finnes ikke. API kjører."}
    return FileResponse(INDEX_HTML)

@app.get("/", include_in_schema=False)
def root():
    if not os.path.exists(INDEX_HTML):
        # Ikke krise om du ikke bruker dette – bare åpne HTML-filen direkte
        return {"msg": "frontend/index.html finnes ikke. API kjører."}
    return FileResponse(INDEX_HTML)

# -----------------------------------------------------
# BAKGRUNNSFJERNER
# 1) Prøver å bruke rembg (hvis installert)
# 2) Hvis ikke, faller tilbake til 'bare RGBA' (ikke ekte fjerning)
#    -> Bytt ut med din tidligere funksjon om du har en egen implementasjon
# -----------------------------------------------------
def remove_bg_pil(pil_image: Image.Image) -> Image.Image:
    """
    Returnerer en RGBA-PNG med (forhåpentlig) fjernet bakgrunn.
    Hvis 'rembg' er installert brukes den. Ellers en enkel fallback.
    """
    try:
        # Hvis du tidligere hadde en custom funksjon, lim den inn her
        # og returner resultatet som PIL.Image i RGBA.
        from rembg import remove  # type: ignore
        # rembg forventer bytes; vi går via bytes -> bytes -> PIL
        buf_in = BytesIO()
        pil_image.save(buf_in, format="PNG")
        out_bytes = remove(buf_in.getvalue())
        out_img = Image.open(BytesIO(out_bytes)).convert("RGBA")
        return out_img
    except Exception:
        # Fallback: ingen ekte segmentering – bare konverter til RGBA
        # (Bra nok til å teste flyten; bytt til din faktiske kode)
        return pil_image.convert("RGBA")

@app.post("/remove-bg", response_class=Response, tags=["utils"])
async def remove_bg_endpoint(file: UploadFile = File(...)):
    """
    Tar inn et bilde og returnerer image/png der bakgrunnen er fjernet.
    Frontend kan deretter vise resultatet og poste PNG-en videre til /clothes/
    for å lagre i databasen.
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
# API-ruter for Clothes og Looks (som du allerede har)
# -----------------------------------------------------
app.include_router(clothes_router.router)
app.include_router(looks_router.router)

@app.get("/healthz", tags=["utils"])
def healthz():
    return {"ok": True}
