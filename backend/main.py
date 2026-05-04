# import os
# import json
# import uuid
# from math import radians, cos, sin, asin, sqrt
# from typing import Optional

# import httpx
# import firebase_admin
# from firebase_admin import credentials, firestore, storage
# from fastapi import FastAPI, HTTPException, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# # ── Firebase Admin ──────────────────────────────────────────────────────────
# cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccount.json")
# cred = credentials.Certificate(cred_path)
# firebase_admin.initialize_app(
#     cred,
#     {"storageBucket": os.getenv("STORAGE_BUCKET", "safe-way-504b4.firebasestorage.app")},
# )
# db = firestore.client()

# # ── App ──────────────────────────────────────────────────────────────────────
# app = FastAPI(title="Safe Way API", version="1.0.0")
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ── Helpers ──────────────────────────────────────────────────────────────────
# def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
#     R = 6371.0
#     la1, lo1, la2, lo2 = map(radians, [lat1, lon1, lat2, lon2])
#     dlat, dlon = la2 - la1, lo2 - lo1
#     a = sin(dlat / 2) ** 2 + cos(la1) * cos(la2) * sin(dlon / 2) ** 2
#     return 2 * R * asin(sqrt(a))


# def distance_label(km: float) -> str:
#     if km < 1:
#         return f"{int(km * 1000)} מ'"
#     return f"{km:.1f} ק\"מ"


# # ── Models ───────────────────────────────────────────────────────────────────
# class GeocodeRequest(BaseModel):
#     address: str


# class ShelterIn(BaseModel):
#     address: str
#     lat: float
#     lng: float
#     type: str          # "public" | "building"
#     floor: Optional[str] = None
#     capacity: Optional[int] = None
#     notes: Optional[str] = None
#     added_by: Optional[str] = None   # Firebase UID if logged in
#     image_url: Optional[str] = None


# # ── Routes ───────────────────────────────────────────────────────────────────
# @app.get("/")
# def root():
#     return {"status": "ok", "app": "Safe Way"}


# @app.post("/api/geocode")
# async def geocode(req: GeocodeRequest):
#     """Convert a Hebrew/Israeli address to lat/lng via Nominatim."""
#     async with httpx.AsyncClient(timeout=10) as client:
#         resp = await client.get(
#             "https://nominatim.openstreetmap.org/search",
#             params={
#                 "q": req.address,
#                 "format": "json",
#                 "limit": 1,
#                 "countrycodes": "il",
#                 "addressdetails": 1,
#             },
#             headers={"User-Agent": "SafeWayApp/1.0 (shelter-locator)"},
#         )
#     data = resp.json()
#     if not data:
#         raise HTTPException(status_code=404, detail="הכתובת לא נמצאה")
#     result = data[0]
#     return {
#         "lat": float(result["lat"]),
#         "lng": float(result["lon"]),
#         "display": result.get("display_name", req.address),
#     }


# @app.post("/api/upload")
# async def upload_image(file: UploadFile = File(...)):
#     """Upload shelter image to Firebase Storage and return a signed URL."""
#     allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
#     if file.content_type not in allowed:
#         raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")

#     ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
#     blob_name = f"shelters/{uuid.uuid4()}.{ext}"
#     bucket = storage.bucket()
#     blob = bucket.blob(blob_name)
#     contents = await file.read()
#     blob.upload_from_string(contents, content_type=file.content_type)

#     # Generate a long-lived signed URL (10 years)
#     from datetime import timedelta
#     signed_url = blob.generate_signed_url(
#         expiration=timedelta(days=3650),
#         method="GET",
#         version="v4",
#     )
#     return {"url": signed_url}


# @app.post("/api/shelters")
# def add_shelter(shelter: ShelterIn):
#     """Add a shelter to Firestore."""
#     doc_ref = db.collection("shelters").document()
#     doc_ref.set(
#         {
#             **shelter.model_dump(),
#             "created_at": firestore.SERVER_TIMESTAMP,
#         }
#     )
#     return {"id": doc_ref.id}


# @app.get("/api/shelters")
# def get_shelters():
#     """Return all shelters (for SSR or non-realtime clients)."""
#     docs = db.collection("shelters").stream()
#     return [{"id": d.id, **d.to_dict()} for d in docs]


# @app.get("/api/shelters/nearest")
# def nearest_shelter(lat: float, lng: float):
#     """Find the nearest shelter to given coordinates."""
#     docs = db.collection("shelters").stream()
#     best = None
#     best_km = float("inf")
#     for doc in docs:
#         d = doc.to_dict()
#         if "lat" not in d or "lng" not in d:
#             continue
#         km = haversine_km(lat, lng, d["lat"], d["lng"])
#         if km < best_km:
#             best_km = km
#             best = {"id": doc.id, **d}
#     if best is None:
#         raise HTTPException(status_code=404, detail="לא נמצאו מקלטים")
#     best["distance_km"] = round(best_km, 3)
#     best["distance_label"] = distance_label(best_km)
#     return best


# @app.post("/api/import")
# def import_shelters():
#     """
#     One-time import of israel_shelters.json into Firestore.
#     Supports multiple known field-name variants.
#     """
#     json_path = os.path.join(os.path.dirname(__file__), "israel_shelters.json")
#     if not os.path.exists(json_path):
#         raise HTTPException(status_code=404, detail="israel_shelters.json לא נמצא")

#     with open(json_path, encoding="utf-8") as f:
#         raw = json.load(f)

#     # Support both a list at root or nested under a key
#     if isinstance(raw, dict):
#         shelters_data = raw.get("shelters", raw.get("data", list(raw.values())[0]))
#     else:
#         shelters_data = raw

#     def pick(row: dict, *keys, default=None):
#         for k in keys:
#             if k in row:
#                 return row[k]
#         return default

#     batch = db.batch()
#     count = 0
#     for row in shelters_data:
#         lat = pick(row, "lat", "latitude", "Lat", "LAT")
#         lng = pick(row, "lng", "lon", "longitude", "Lng", "LON")
#         if lat is None or lng is None:
#             continue
#         ref = db.collection("shelters").document()
#         batch.set(
#             ref,
#             {
#                 "address": pick(row, "address", "כתובת", "Address", default=""),
#                 "lat": float(lat),
#                 "lng": float(lng),
#                 "type": pick(row, "type", "סוג", "Type", default="public"),
#                 "floor": pick(row, "floor", "קומה", "Floor"),
#                 "capacity": pick(row, "capacity", "קיבולת", "Capacity"),
#                 "notes": pick(row, "notes", "הערות", "Notes"),
#                 "image_url": None,
#                 "added_by": "import",
#                 "created_at": firestore.SERVER_TIMESTAMP,
#             },
#         )
#         count += 1
#         if count % 499 == 0:
#             batch.commit()
#             batch = db.batch()

#     batch.commit()
#     return {"imported": count}
import os
import json
import uuid
from math import radians, cos, sin, asin, sqrt
from typing import Optional

import httpx
import firebase_admin
from firebase_admin import credentials, firestore, storage
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Firebase Admin ──────────────────────────────────────────────────────────
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccount.json")
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(
    cred,
    {"storageBucket": os.getenv("STORAGE_BUCKET", "safe-way-504b4.firebasestorage.app")},
)
db = firestore.client()

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Safe Way API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    la1, lo1, la2, lo2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = la2 - la1, lo2 - lo1
    a = sin(dlat / 2) ** 2 + cos(la1) * cos(la2) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


def distance_label(km: float) -> str:
    if km < 1:
        return f"{int(km * 1000)} מ'"
    return f"{km:.1f} ק\"מ"


# ── Models ───────────────────────────────────────────────────────────────────
class GeocodeRequest(BaseModel):
    address: str


class ShelterIn(BaseModel):
    address: str
    lat: float
    lng: float
    type: str          # "public" | "building"
    floor: Optional[str] = None
    capacity: Optional[int] = None
    notes: Optional[str] = None
    added_by: Optional[str] = None   # Firebase UID if logged in
    image_url: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "app": "Safe Way"}


@app.post("/api/geocode")
async def geocode(req: GeocodeRequest):
    address = req.address.strip()
    queries = [address]
    if not any(w in address.lower() for w in ["ישראל", "israel"]):
        queries.append(f"{address}, ישראל")
        queries.append(f"{address}, Israel")
    headers = {"User-Agent": "SafeWayApp/1.0 (shelter-locator)"}
    async with httpx.AsyncClient(timeout=15) as client:
        for query in queries:
            for params in [
                {"q": query, "format": "json", "limit": 1, "countrycodes": "il", "addressdetails": 1, "accept-language": "he"},
                {"q": query, "format": "json", "limit": 1, "addressdetails": 1, "accept-language": "he"},
            ]:
                resp = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
                data = resp.json()
                if data:
                    result = data[0]
                    return {"lat": float(result["lat"]), "lng": float(result["lon"]), "display": result.get("display_name", address)}
    raise HTTPException(status_code=404, detail="הכתובת לא נמצאה. נסה: שם רחוב + מספר + עיר (לדוגמה: הרצל 10 תל אביב)")


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload shelter image to Firebase Storage and return a signed URL."""
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    blob_name = f"shelters/{uuid.uuid4()}.{ext}"
    bucket = storage.bucket()
    blob = bucket.blob(blob_name)
    contents = await file.read()
    blob.upload_from_string(contents, content_type=file.content_type)

    # Generate a long-lived signed URL (10 years)
    from datetime import timedelta
    signed_url = blob.generate_signed_url(
        expiration=timedelta(days=3650),
        method="GET",
        version="v4",
    )
    return {"url": signed_url}


@app.post("/api/shelters")
def add_shelter(shelter: ShelterIn):
    """Add a shelter to Firestore."""
    doc_ref = db.collection("shelters").document()
    doc_ref.set(
        {
            **shelter.dict(),
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return {"id": doc_ref.id}


@app.get("/api/shelters")
def get_shelters():
    """Return all shelters (for SSR or non-realtime clients)."""
    docs = db.collection("shelters").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


@app.get("/api/shelters/nearest")
def nearest_shelter(lat: float, lng: float):
    """Find the nearest shelter to given coordinates."""
    docs = db.collection("shelters").stream()
    best = None
    best_km = float("inf")
    for doc in docs:
        d = doc.to_dict()
        if "lat" not in d or "lng" not in d:
            continue
        km = haversine_km(lat, lng, d["lat"], d["lng"])
        if km < best_km:
            best_km = km
            best = {"id": doc.id, **d}
    if best is None:
        raise HTTPException(status_code=404, detail="לא נמצאו מקלטים")
    best["distance_km"] = round(best_km, 3)
    best["distance_label"] = distance_label(best_km)
    return best


@app.post("/api/import")
def import_shelters():
    """
    One-time import of israel_shelters.json into Firestore.
    Supports multiple known field-name variants.
    """
    json_path = os.path.join(os.path.dirname(__file__), "israel_shelters.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="israel_shelters.json לא נמצא")

    with open(json_path, encoding="utf-8") as f:
        raw = json.load(f)

    # Support both a list at root or nested under a key
    if isinstance(raw, dict):
        shelters_data = raw.get("shelters", raw.get("data", list(raw.values())[0]))
    else:
        shelters_data = raw

    def pick(row: dict, *keys, default=None):
        for k in keys:
            if k in row:
                return row[k]
        return default

    batch = db.batch()
    count = 0
    for row in shelters_data:
        lat = pick(row, "lat", "latitude", "Lat", "LAT")
        lng = pick(row, "lng", "lon", "longitude", "Lng", "LON")
        if lat is None or lng is None:
            continue
        ref = db.collection("shelters").document()
        batch.set(
            ref,
            {
                "address": pick(row, "address", "כתובת", "Address", default=""),
                "lat": float(lat),
                "lng": float(lng),
                "type": pick(row, "type", "סוג", "Type", default="public"),
                "floor": pick(row, "floor", "קומה", "Floor"),
                "capacity": pick(row, "capacity", "קיבולת", "Capacity"),
                "notes": pick(row, "notes", "הערות", "Notes"),
                "image_url": None,
                "added_by": "import",
                "created_at": firestore.SERVER_TIMESTAMP,
            },
        )
        count += 1
        if count % 499 == 0:
            batch.commit()
            batch = db.batch()

    batch.commit()
    return {"imported": count}