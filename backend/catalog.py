import json
import re
from datetime import datetime, timezone
from pathlib import Path

from database import db

CATALOG_FILE = Path(__file__).parent / "data" / "catalog.json"
CATEGORY_FIELDS = ["id", "key", "label", "shortLabel", "icon", "accent", "rgb", "titleHint", "grad", "glow", "bg"]


def parse_capacity_ft3(capacidad: str | None) -> float | None:
    m = re.search(r"([\d.,]+)\s*ft", capacidad or "")
    return float(m.group(1).replace(",", "")) if m else None


def parse_temps(temp: str | None) -> tuple[float | None, float | None]:
    nums = [float(n.replace("−", "-")) for n in re.findall(r"[−-]?\d+(?:\.\d+)?", temp or "")]
    return (min(nums), max(nums)) if nums else (None, None)


def enrich(product: dict) -> dict:
    product["capacity_ft3"] = parse_capacity_ft3(product.get("capacidad"))
    tmin, tmax = parse_temps((product.get("especificaciones") or {}).get("Temperatura"))
    product["temp_min_c"], product["temp_max_c"] = tmin, tmax
    product["updated_at"] = datetime.now(timezone.utc).isoformat()
    return product


async def seed_catalog() -> None:
    if await db.categories.count_documents({}) > 0:
        return
    data = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()
    for order, cat in enumerate(data):
        await db.categories.insert_one({**{k: cat.get(k) for k in CATEGORY_FIELDS}, "order": order})
        for pos, p in enumerate(cat["products"]):
            await db.products.insert_one(enrich({**p, "category": cat["key"], "order": pos, "created_at": now}))
    await db.products.create_index("id", unique=True)
    await db.products.create_index("category")
