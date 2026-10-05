"""Security regression tests: Bearer-only auth, CORS, lockout, quote rate limiting."""
import os
import struct
import zlib
import uuid

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

PUBLIC_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mexican-commerce.preview.emergentagent.com").rstrip("/")
PUBLIC_API = f"{PUBLIC_URL}/api"
LOCAL_URL = "http://localhost:8001"
LOCAL_API = f"{LOCAL_URL}/api"
FRONTEND_ORIGIN = "https://mexican-commerce.preview.emergentagent.com"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

MONGO = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
DB = MONGO[os.environ.get("DB_NAME", "test_database")]


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{PUBLIC_API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- AUTH: Bearer-only, no cookie ----------
class TestAuthBearerOnly:
    def test_login_returns_token_no_cookie(self):
        r = requests.post(f"{PUBLIC_API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and "user" in body
        assert body["user"]["email"] == ADMIN_EMAIL
        # No Set-Cookie header for access_token
        set_cookie = r.headers.get("set-cookie", "")
        assert "access_token" not in set_cookie, f"Unexpected Set-Cookie: {set_cookie}"

    def test_me_with_bearer_works(self, auth_headers):
        r = requests.get(f"{PUBLIC_API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_with_cookie_only_rejected(self, admin_token):
        # Send valid token as cookie only, no Authorization header
        r = requests.get(f"{PUBLIC_API}/auth/me", cookies={"access_token": admin_token})
        assert r.status_code == 401, "Cookie-based auth should be removed"

    def test_logout_without_bearer_401(self):
        r = requests.post(f"{PUBLIC_API}/auth/logout")
        assert r.status_code == 401

    def test_logout_with_bearer_ok(self, auth_headers):
        r = requests.post(f"{PUBLIC_API}/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------- LOCKOUT ----------
class TestLockout:
    TEST_IP = "10.9.9.9"
    OTHER_IP = "10.9.9.10"
    IDENT = f"{TEST_IP}:{ADMIN_EMAIL}"

    @classmethod
    def setup_class(cls):
        DB.login_attempts.delete_many({"identifier": {"$in": [cls.IDENT, f"{cls.OTHER_IP}:{ADMIN_EMAIL}"]}})

    @classmethod
    def teardown_class(cls):
        DB.login_attempts.delete_many({"identifier": {"$in": [cls.IDENT, f"{cls.OTHER_IP}:{ADMIN_EMAIL}"]}})

    def test_lockout_after_5_failures(self):
        for i in range(5):
            r = requests.post(
                f"{LOCAL_API}/auth/login",
                json={"email": ADMIN_EMAIL, "password": "wrong-pwd"},
                headers={"X-Forwarded-For": self.TEST_IP},
            )
            assert r.status_code == 401, f"Attempt {i+1}: expected 401 got {r.status_code}"
        # 6th attempt even with correct password → 429
        r = requests.post(
            f"{LOCAL_API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"X-Forwarded-For": self.TEST_IP},
        )
        assert r.status_code == 429, f"Expected 429, got {r.status_code}: {r.text}"

    def test_lockout_recorded_in_mongo(self):
        count = DB.login_attempts.count_documents({"identifier": self.IDENT})
        assert count >= 5, f"Expected >=5 docs, got {count}"

    def test_other_ip_not_locked(self):
        r = requests.post(
            f"{LOCAL_API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"X-Forwarded-For": self.OTHER_IP},
        )
        assert r.status_code == 200, f"Different IP should login OK, got {r.status_code}"


# ---------- CORS ----------
class TestCORS:
    def test_evil_origin_rejected(self):
        r = requests.get(f"{LOCAL_API}/categories", headers={"Origin": "https://evil.example"})
        assert r.status_code == 200
        acao = r.headers.get("access-control-allow-origin")
        assert acao is None, f"Evil origin should not get ACAO header, got: {acao}"

    def test_allowed_origin_echoed(self):
        r = requests.get(f"{LOCAL_API}/categories", headers={"Origin": FRONTEND_ORIGIN})
        assert r.status_code == 200
        acao = r.headers.get("access-control-allow-origin")
        assert acao == FRONTEND_ORIGIN, f"Expected ACAO={FRONTEND_ORIGIN}, got {acao}"
        acac = r.headers.get("access-control-allow-credentials")
        assert acac is None, f"allow_credentials should be False, got {acac}"


# ---------- QUOTE RATE LIMIT ----------
class TestQuoteRateLimit:
    TEST_IP = "10.8.8.8"

    EMAIL_SUFFIX = "@rltest.example.com"

    @classmethod
    def teardown_class(cls):
        DB.quotes.delete_many({"customer.email": {"$regex": r"@rltest\.example\.com$"}})

    def test_per_ip_rate_limit(self):
        headers = {"X-Forwarded-For": self.TEST_IP, "Content-Type": "application/json"}
        for i in range(1, 11):
            payload = {
                "customer": {
                    "nombre": f"RL Test {i}",
                    "email": f"rl{i}{self.EMAIL_SUFFIX}",
                    "telefono": "5551112222",
                },
                "items": [{"product_id": "ci1", "qty": 1}],
            }
            r = requests.post(f"{LOCAL_API}/quotes", json=payload, headers=headers)
            assert r.status_code == 201, f"Quote {i}: expected 201 got {r.status_code}: {r.text[:200]}"
        # 11th → 429
        payload = {
            "customer": {"nombre": "RL 11", "email": f"rl11{self.EMAIL_SUFFIX}", "telefono": "5551112222"},
            "items": [{"product_id": "ci1", "qty": 1}],
        }
        r = requests.post(f"{LOCAL_API}/quotes", json=payload, headers=headers)
        assert r.status_code == 429, f"11th should be 429, got {r.status_code}"

    def test_quote_stored_with_ip(self):
        doc = DB.quotes.find_one({"customer.email": f"rl1{self.EMAIL_SUFFIX}"})
        assert doc is not None
        assert doc.get("ip") == self.TEST_IP, f"Expected ip={self.TEST_IP}, got {doc.get('ip')}"


# ---------- Admin AUTHZ regression (small) ----------
def _png_bytes():
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


class TestAdminAuthz:
    def test_admin_products_401_without_bearer(self):
        r = requests.get(f"{PUBLIC_API}/admin/products")
        assert r.status_code == 401

    def test_admin_quotes_401_without_bearer(self):
        r = requests.get(f"{PUBLIC_API}/admin/quotes")
        assert r.status_code == 401

    def test_admin_me_401_without_bearer(self):
        r = requests.get(f"{PUBLIC_API}/auth/me")
        assert r.status_code == 401

    def test_admin_products_count(self, auth_headers):
        r = requests.get(f"{PUBLIC_API}/admin/products", params={"page_size": 100}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total"] >= 43

    def test_admin_quotes_list(self, auth_headers):
        r = requests.get(f"{PUBLIC_API}/admin/quotes", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_product_crud_and_upload(self, auth_headers):
        # Create
        payload = {
            "category": "congeladores",
            "name": "TEST-SEC",
            "label": "TEST SEC Product",
            "capacidad": "20 ft³ / 566 L",
            "especificaciones": {"Temperatura": "−18°C a −22°C"},
        }
        r = requests.post(f"{PUBLIC_API}/admin/products", json=payload, headers=auth_headers)
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        # Update
        payload["label"] = "TEST SEC Updated"
        r = requests.put(f"{PUBLIC_API}/admin/products/{pid}", json=payload, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["label"] == "TEST SEC Updated"
        # Upload
        files = {"file": ("sec.png", _png_bytes(), "image/png")}
        r = requests.post(f"{PUBLIC_API}/admin/upload", files=files, headers=auth_headers)
        assert r.status_code == 200
        file_path = r.json()["path"]
        # Serve
        r = requests.get(f"{PUBLIC_API}/files/{file_path}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        # PATCH a quote status (create one first)
        qr = requests.post(f"{PUBLIC_API}/quotes", json={
            "customer": {"nombre": "TEST SEC", "email": "secpatch@secregress.example.com", "telefono": "5550000000"},
            "items": [{"product_id": "ci1", "qty": 1}],
        })
        assert qr.status_code == 201
        qid = qr.json()["id"]
        r = requests.patch(f"{PUBLIC_API}/admin/quotes/{qid}", json={"status": "atendida"}, headers=auth_headers)
        assert r.status_code == 200
        # Cleanup
        DB.quotes.delete_many({"customer.email": "secpatch@secregress.example.com"})
        r = requests.delete(f"{PUBLIC_API}/admin/products/{pid}", headers=auth_headers)
        assert r.status_code == 200
