from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from PIL import Image, ImageFilter
import numpy as np

app = FastAPI(title="Egen bakgrunnsfjerner")

# CORS: gjør at frontend (file:// eller annen origin) får lov å kalle API-et
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # stram inn til din origin i produksjon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BYTES = 10 * 1024 * 1024  # 10 MB

def estimate_bg_color(img: Image.Image, border: int = 10) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    h, w, _ = arr.shape
    edges = np.concatenate([
        arr[:border, :, :].reshape(-1,3),
        arr[-border:, :, :].reshape(-1,3),
        arr[:, :border, :].reshape(-1,3),
        arr[:, -border:, :].reshape(-1,3),
    ], axis=0)
    return edges.mean(axis=0)

def remove_background_smart(pil_img: Image.Image, thr: int = 40, blur: int = 2) -> Image.Image:
    img_rgba = pil_img.convert("RGBA")
    arr = np.array(img_rgba)
    rgb = arr[..., :3].astype(np.float32)
    bg = estimate_bg_color(img_rgba)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    bg_mask = dist < float(thr)
    alpha = arr[..., 3].copy()
    alpha[bg_mask] = 0
    if blur > 0:
        mask_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(blur))
        alpha = np.array(mask_img)
    out = arr.copy()
    out[..., 3] = alpha
    return Image.fromarray(out, mode="RGBA")

@app.get("/", response_class=HTMLResponse)
def index():
    return """
    <html><body>
      <h3>Last opp et bilde for å fjerne bakgrunn</h3>
      <form action="/remove-bg?thr=60&blur=2" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept="image/*" required />
        <button type="submit">Kjør</button>
      </form>
      <p>API-dokumentasjon: <a href="/docs">/docs</a></p>
    </body></html>
    """

@app.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...), thr: int = 40, blur: int = 2):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Last opp en bildefil.")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Filen er for stor.")
    try:
        img = Image.open(BytesIO(data))
        result = remove_background_smart(img, thr=thr, blur=blur)
        buf = BytesIO()
        result.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feil under behandling: {e}")
