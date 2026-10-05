from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr

from database import db, client
from auth import (
    verify_password, create_access_token, get_current_admin, seed_admin,
    check_lockout, record_failure, clear_failures, client_ip,
)
from catalog import seed_catalog, enrich
from emailer import send_email, quote_email_html, customer_email_html, reply_email_html
import storage

COMPANY = {"phone": "+52 33 1902 5608", "phoneRaw": "+523319025608", "email": "ventas@comersem.com.mx",
           "address": "Prol. Gigantes #111, Tonalá, Jalisco"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")

NO_ID = {"_id": 0}
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


# ---------- Models ----------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class QuoteItemInput(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=999)


class QuoteCustomer(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: EmailStr
    telefono: str = Field(min_length=7, max_length=30)
    empresa: Optional[str] = Field(default="", max_length=120)
    mensaje: Optional[str] = Field(default="", max_length=1000)


class QuoteInput(BaseModel):
    customer: QuoteCustomer
    items: list[QuoteItemInput] = Field(min_length=1, max_length=50)


class ProductInput(BaseModel):
    category: str
    name: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=160)
    subtitulo: str = ""
    capacidad: str = ""
    spec: str = ""
    descripcion: str = ""
    especificaciones: dict[str, str] = {}
    badge: str = ""
    img: str = ""
    imgComercial: str = ""
    imgTecnica: str = ""
    featured: bool = False
    disponible: bool = True


class QuoteStatusInput(BaseModel):
    status: str = Field(pattern="^(nueva|atendida|cerrada)$")


class PriceLine(BaseModel):
    product_id: str
    unit_price: float = Field(ge=0, le=10_000_000)


class QuoteReplyInput(BaseModel):
    prices: list[PriceLine] = Field(min_length=1, max_length=50)
    notes: str = Field(default="", max_length=1500)
    validity_days: int = Field(default=15, ge=1, le=90)
    include_iva: bool = True
    shipping: float = Field(default=0, ge=0, le=1_000_000)


# ---------- Public catalog ----------
@api.get("/")
async def root():
    return {"message": "COMERSEM API"}


@api.get("/categories")
async def list_categories():
    return await db.categories.find({}, NO_ID).sort("order", 1).to_list(50)


@api.get("/catalog")
async def full_catalog():
    cats = await db.categories.find({}, NO_ID).sort("order", 1).to_list(50)
    products = await db.products.find({}, NO_ID).sort("order", 1).to_list(1000)
    for c in cats:
        c["products"] = [p for p in products if p["category"] == c["key"]]
    return cats


@api.get("/products")
async def search_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    min_ft3: Optional[float] = None,
    max_ft3: Optional[float] = None,
    temp: Optional[str] = None,
    disponible: Optional[bool] = None,
):
    query: dict = {}
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"label": rx}, {"spec": rx}, {"descripcion": rx},
                        {"capacidad": rx}, {"badge": rx}, {"subtitulo": rx}]
    if category:
        query["category"] = category
    if min_ft3 is not None or max_ft3 is not None:
        rng = {}
        if min_ft3 is not None:
            rng["$gte"] = min_ft3
        if max_ft3 is not None:
            rng["$lte"] = max_ft3
        query["capacity_ft3"] = rng
    if temp == "refrigeracion":
        query["temp_min_c"] = {"$gte": 0}
    elif temp == "congelacion":
        query["temp_max_c"] = {"$lt": 0}
    if disponible is not None:
        query["disponible"] = disponible
    items = await db.products.find(query, NO_ID).sort([("category", 1), ("order", 1)]).to_list(1000)
    return {"total": len(items), "items": items}


@api.get("/products/popular")
async def popular_products(limit: int = 6):
    limit = max(1, min(limit, 12))
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "times_quoted": {"$sum": 1}, "units": {"$sum": "$items.qty"}}},
        {"$sort": {"times_quoted": -1, "units": -1}},
        {"$limit": limit},
    ]
    stats = await db.quotes.aggregate(pipeline).to_list(limit)
    ids = [s["_id"] for s in stats]
    products = {p["id"]: p for p in await db.products.find({"id": {"$in": ids}, "disponible": True}, NO_ID).to_list(limit)}
    result = [{**products[s["_id"]], "times_quoted": s["times_quoted"], "units": s["units"]}
              for s in stats if s["_id"] in products]
    if len(result) < limit:
        fill = await db.products.find({"id": {"$nin": ids}, "featured": True, "disponible": True}, NO_ID) \
            .sort("order", 1).to_list(limit - len(result))
        result += [{**p, "times_quoted": 0, "units": 0} for p in fill]
    return {"based_on_quotes": bool(stats), "items": result}


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, NO_ID)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


# ---------- Quotes ----------
@api.post("/quotes", status_code=201)
async def create_quote(data: QuoteInput, request: Request):
    ids = [i.product_id for i in data.items]
    products = {p["id"]: p for p in await db.products.find({"id": {"$in": ids}}, NO_ID).to_list(100)}
    items = []
    for i in data.items:
        p = products.get(i.product_id)
        if not p:
            raise HTTPException(status_code=400, detail=f"Producto {i.product_id} no existe")
        items.append({"product_id": p["id"], "name": p["name"], "label": p["label"],
                      "capacidad": p.get("capacidad"), "img": p.get("img"), "qty": i.qty})
    now = datetime.now(timezone.utc)
    ip = client_ip(request)
    since = (now - timedelta(hours=1)).isoformat()
    by_email = await db.quotes.count_documents({"customer.email": data.customer.email.lower(), "created_at": {"$gte": since}})
    by_ip = await db.quotes.count_documents({"ip": ip, "created_at": {"$gte": since}})
    total_hour = await db.quotes.count_documents({"created_at": {"$gte": since}})
    if by_email >= 5 or by_ip >= 10 or total_hour >= 60:
        raise HTTPException(status_code=429, detail="Has enviado varias solicitudes. Intenta de nuevo en una hora.")
    quote = {
        "id": str(uuid.uuid4()),
        "folio": "COT-" + now.strftime("%y%m%d") + "-" + uuid.uuid4().hex[:4].upper(),
        "customer": {**data.customer.model_dump(), "email": data.customer.email.lower()},
        "items": items,
        "total_qty": sum(i["qty"] for i in items),
        "status": "nueva",
        "email_sent": False,
        "customer_email_sent": False,
        "ip": ip,
        "created_at": now.isoformat(),
    }
    try:
        await send_email(
            to=os.environ["SALES_EMAIL"],
            subject=f"Cotización {quote['folio']} — {quote['customer']['nombre']}",
            html=quote_email_html(quote),
        )
        quote["email_sent"] = True
    except Exception as e:
        logger.error(f"Quote email failed: {e}")
    try:
        await send_email(
            to=quote["customer"]["email"],
            subject=f"Recibimos tu cotización {quote['folio']} — COMERSEM",
            html=customer_email_html(quote, COMPANY),
        )
        quote["customer_email_sent"] = True
    except Exception as e:
        logger.error(f"Customer confirmation email failed: {e}")
    await db.quotes.insert_one(quote)
    quote.pop("_id", None)
    return quote


# ---------- Auth ----------
@api.post("/auth/login")
async def login(data: LoginInput, request: Request):
    email = data.email.lower()
    ident = f"{client_ip(request)}:{email}"
    await check_lockout(ident)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await record_failure(ident)
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    await clear_failures(ident)
    token = create_access_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email, "name": user["name"], "role": user["role"]}}


@api.post("/auth/logout")
async def logout(user=Depends(get_current_admin)):
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_admin)):
    return user


# ---------- Admin ----------
@api.get("/admin/products")
async def admin_products(page: int = 1, page_size: int = 20, q: Optional[str] = None,
                         category: Optional[str] = None, user=Depends(get_current_admin)):
    page, page_size = max(1, page), max(1, min(page_size, 100))
    query = {}
    if category:
        query["category"] = category
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"label": rx}, {"badge": rx}]
    total = await db.products.count_documents(query)
    items = await (db.products.find(query, NO_ID).sort([("category", 1), ("order", 1)])
                   .skip((page - 1) * page_size).limit(page_size).to_list(page_size))
    return {"items": items, "total": total, "page": page, "page_size": page_size,
            "pages": max(1, -(-total // page_size))}


@api.post("/admin/products", status_code=201)
async def admin_create_product(data: ProductInput, user=Depends(get_current_admin)):
    if not await db.categories.find_one({"key": data.category}):
        raise HTTPException(status_code=400, detail="Categoría inválida")
    count = await db.products.count_documents({"category": data.category})
    doc = enrich({**data.model_dump(), "id": "p-" + uuid.uuid4().hex[:8], "order": count,
                  "created_at": datetime.now(timezone.utc).isoformat()})
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, data: ProductInput, user=Depends(get_current_admin)):
    if not await db.categories.find_one({"key": data.category}):
        raise HTTPException(status_code=400, detail="Categoría inválida")
    res = await db.products.update_one({"id": product_id}, {"$set": enrich(data.model_dump())})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return await db.products.find_one({"id": product_id}, NO_ID)


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user=Depends(get_current_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"ok": True}


@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), user=Depends(get_current_admin)):
    if file.content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Solo imágenes PNG, JPG, WEBP o GIF")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="La imagen supera 8 MB")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    path = f"{storage.APP_NAME}/products/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(storage.put_object, path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=424, detail="No se pudo subir la imagen")
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"], "original_filename": file.filename,
        "content_type": file.content_type, "size": result.get("size", len(data)), "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    try:
        data, content_type = await asyncio.to_thread(storage.get_object, path)
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=424, detail="No se pudo leer la imagen")
    return Response(content=data, media_type=record.get("content_type") or content_type,
                    headers={"Cache-Control": "public, max-age=86400"})


@api.get("/admin/quotes")
async def admin_quotes(page: int = 1, page_size: int = 20, status: Optional[str] = None,
                       user=Depends(get_current_admin)):
    page, page_size = max(1, page), max(1, min(page_size, 100))
    query = {"status": status} if status else {}
    total = await db.quotes.count_documents(query)
    new_count = await db.quotes.count_documents({"status": "nueva"})
    items = await (db.quotes.find(query, NO_ID).sort("created_at", -1)
                   .skip((page - 1) * page_size).limit(page_size).to_list(page_size))
    return {"items": items, "total": total, "page": page, "page_size": page_size,
            "pages": max(1, -(-total // page_size)), "new_count": new_count}


@api.patch("/admin/quotes/{quote_id}")
async def admin_quote_status(quote_id: str, data: QuoteStatusInput, user=Depends(get_current_admin)):
    res = await db.quotes.update_one({"id": quote_id}, {"$set": {"status": data.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return await db.quotes.find_one({"id": quote_id}, NO_ID)


@api.post("/admin/quotes/{quote_id}/reply")
async def admin_quote_reply(quote_id: str, data: QuoteReplyInput, user=Depends(get_current_admin)):
    quote = await db.quotes.find_one({"id": quote_id}, NO_ID)
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    price_by_id = {p.product_id: p.unit_price for p in data.prices}
    missing = [it["product_id"] for it in quote["items"] if it["product_id"] not in price_by_id]
    if missing:
        raise HTTPException(status_code=400, detail="Falta precio para algunos equipos")
    lines = [{**it, "unit_price": round(price_by_id[it["product_id"]], 2),
              "line_total": round(price_by_id[it["product_id"]] * it["qty"], 2)} for it in quote["items"]]
    subtotal = round(sum(l["line_total"] for l in lines) + data.shipping, 2)
    iva = round(subtotal * 0.16, 2) if data.include_iva else 0.0
    reply = {
        "lines": lines, "shipping": round(data.shipping, 2), "subtotal": subtotal, "iva": iva,
        "total": round(subtotal + iva, 2), "include_iva": data.include_iva, "notes": data.notes.strip(),
        "validity_days": data.validity_days, "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": user["email"], "email_sent": False,
    }
    try:
        await send_email(
            to=quote["customer"]["email"],
            subject=f"Tu cotización {quote['folio']} — COMERSEM",
            html=reply_email_html(quote, reply, COMPANY),
        )
        reply["email_sent"] = True
    except Exception as e:
        logger.error(f"Quote reply email failed: {e}")
        raise HTTPException(status_code=424, detail="No se pudo enviar el correo al cliente")
    await db.quotes.update_one({"id": quote_id}, {"$set": {"reply": reply, "status": "atendida"}})
    return await db.quotes.find_one({"id": quote_id}, NO_ID)


app.include_router(api)
_origins = [o.strip() for o in os.environ["CORS_ORIGINS"].split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
async def on_startup():
    await seed_admin()
    await seed_catalog()
    try:
        await asyncio.to_thread(storage.init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
