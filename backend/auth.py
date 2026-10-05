import os
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import HTTPException, Request

from database import db

JWT_ALGORITHM = "HS256"
MAX_ATTEMPTS, LOCK_MINUTES = 5, 15


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_lockout(identifier: str) -> None:
    since = (datetime.now(timezone.utc) - timedelta(minutes=LOCK_MINUTES)).isoformat()
    recent = await db.login_attempts.count_documents({"identifier": identifier, "at": {"$gte": since}})
    if recent >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta en 15 minutos.")


async def record_failure(identifier: str) -> None:
    now = datetime.now(timezone.utc)
    await db.login_attempts.insert_one({"identifier": identifier, "at": now.isoformat(), "created": now})


async def clear_failures(identifier: str) -> None:
    await db.login_attempts.delete_many({"identifier": identifier})


async def get_current_admin(request: Request) -> dict:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(header[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


async def seed_admin() -> None:
    email = os.environ["ADMIN_EMAIL"].lower()
    if await db.users.find_one({"email": email}) is None:
        await db.users.insert_one({
            "id": "admin-" + os.urandom(6).hex(),
            "email": email,
            "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "name": "Administrador",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("created", expireAfterSeconds=LOCK_MINUTES * 60)
    await db.quotes.create_index([("created_at", -1)])
    await db.quotes.create_index([("ip", 1), ("created_at", -1)])
    await db.quotes.create_index([("customer.email", 1), ("created_at", -1)])
