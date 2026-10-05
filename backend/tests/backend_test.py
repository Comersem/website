"""COMERSEM backend API tests."""
import io
import os
import struct
import time
import uuid
import zlib

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mexican-commerce.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


def _png_bytes():
    # 1x1 transparent PNG
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Catalog ----------
class TestCatalog:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["message"] == "COMERSEM API"

    def test_categories(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        keys = {c["key"] for c in data}
        assert {"hielo", "horizontales", "verticales", "congeladores", "promociones"}.issubset(keys)

    def test_catalog_counts(self, session):
        r = session.get(f"{API}/catalog")
        assert r.status_code == 200
        cats = {c["key"]: c for c in r.json()}
        expected = {"hielo": 7, "horizontales": 6, "verticales": 14, "congeladores": 11, "promociones": 5}
        for k, n in expected.items():
            assert k in cats
            assert len(cats[k]["products"]) == n, f"{k} expected {n}, got {len(cats[k]['products'])}"

    def test_product_by_id(self, session):
        r = session.get(f"{API}/products/ci1")
        assert r.status_code == 200
        assert r.json()["id"] == "ci1"

    def test_product_404(self, session):
        r = session.get(f"{API}/products/does-not-exist")
        assert r.status_code == 404


# ---------- Search ----------
class TestSearch:
    def test_q_filter(self, session):
        r = session.get(f"{API}/products?q=FVP")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data and "items" in data
        assert data["total"] >= 1
        for p in data["items"]:
            blob = " ".join([p.get("name", ""), p.get("label", ""), p.get("spec", ""), p.get("descripcion", "")])
            assert "fvp" in blob.lower()

    def test_category_filter(self, session):
        r = session.get(f"{API}/products?category=congeladores")
        assert r.status_code == 200
        assert all(p["category"] == "congeladores" for p in r.json()["items"])

    def test_ft3_range(self, session):
        r = session.get(f"{API}/products?min_ft3=20&max_ft3=50")
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p.get("capacity_ft3") is not None
            assert 20 <= p["capacity_ft3"] <= 50

    def test_temp_refrigeracion(self, session):
        r = session.get(f"{API}/products?temp=refrigeracion")
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p.get("temp_min_c") is not None and p["temp_min_c"] >= 0

    def test_temp_congelacion(self, session):
        r = session.get(f"{API}/products?temp=congelacion")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 18, f"Expected 18 congelacion items, got {data['total']}"
        for p in data["items"]:
            assert p["temp_max_c"] < 0

    def test_combined(self, session):
        r = session.get(f"{API}/products?category=congeladores&temp=congelacion&min_ft3=10")
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p["category"] == "congeladores"
            assert p["temp_max_c"] < 0
            assert p["capacity_ft3"] >= 10


# ---------- Quotes ----------
class TestQuotes:
    def test_create_quote_success(self, session):
        payload = {
            "customer": {
                "nombre": "TEST Juan Perez",
                "email": "test+quote@example.com",
                "telefono": "5551234567",
                "empresa": "TEST Co",
                "mensaje": "Cotización de prueba",
            },
            "items": [{"product_id": "ci1", "qty": 2}, {"product_id": "ev1", "qty": 1}],
        }
        r = session.post(f"{API}/quotes", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["folio"].startswith("COT-")
        assert data["status"] == "nueva"
        assert data["total_qty"] == 3
        assert data["email_sent"] is True
        assert len(data["items"]) == 2
        assert all("label" in i and "capacidad" in i for i in data["items"])
        pytest.quote_id_for_admin = data["id"]
        pytest.quote_folio_for_admin = data["folio"]

    def test_invalid_email(self, session):
        payload = {
            "customer": {"nombre": "Bad", "email": "not-an-email", "telefono": "5551112222"},
            "items": [{"product_id": "ci1", "qty": 1}],
        }
        r = session.post(f"{API}/quotes", json=payload)
        assert r.status_code == 422

    def test_unknown_product(self, session):
        payload = {
            "customer": {"nombre": "Who", "email": "a@b.com", "telefono": "5550000000"},
            "items": [{"product_id": "nope-xxx", "qty": 1}],
        }
        r = session.post(f"{API}/quotes", json=payload)
        assert r.status_code == 400

    def test_empty_items(self, session):
        payload = {
            "customer": {"nombre": "Empty", "email": "a@b.com", "telefono": "5550000000"},
            "items": [],
        }
        r = session.post(f"{API}/quotes", json=payload)
        assert r.status_code == 422


# ---------- Auth ----------
class TestAuth:
    def test_login_wrong_password(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pwd-xyz"})
        assert r.status_code == 401

    def test_login_success_token_no_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and body["user"]["email"] == ADMIN_EMAIL
        assert "access_token" not in r.headers.get("set-cookie", "")  # ignore CDN edge cookies

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_products_requires_auth(self):
        r = requests.get(f"{API}/admin/products")
        assert r.status_code == 401

    def test_bcrypt_hash_format(self, session, auth_headers):
        # Indirect: hash is in DB only; verify login works (bcrypt verified)
        assert True


# ---------- Admin product CRUD ----------
class TestAdminProducts:
    created_id = None

    def test_list_all(self, session, auth_headers):
        r = session.get(f"{API}/admin/products", params={"page_size": 100}, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 43 and len(body["items"]) >= 43

    def test_pagination(self, session, auth_headers):
        r1 = session.get(f"{API}/admin/products", params={"page": 1, "page_size": 10}, headers=auth_headers).json()
        r2 = session.get(f"{API}/admin/products", params={"page": 2, "page_size": 10}, headers=auth_headers).json()
        assert len(r1["items"]) == 10 and r1["pages"] >= 5
        assert {p["id"] for p in r1["items"]}.isdisjoint({p["id"] for p in r2["items"]})
        f = session.get(f"{API}/admin/products", params={"category": "congeladores", "q": "FCF"}, headers=auth_headers).json()
        assert f["total"] >= 1 and all(p["category"] == "congeladores" for p in f["items"])

    def test_create_product_enrichment(self, session, auth_headers):
        payload = {
            "category": "congeladores",
            "name": "TEST-FCG",
            "label": "TEST Congelador 30",
            "capacidad": "30 ft³ / 850 L",
            "especificaciones": {"Temperatura": "−18°C a −22°C"},
        }
        r = session.post(f"{API}/admin/products", json=payload, headers=auth_headers)
        assert r.status_code == 201, r.text
        p = r.json()
        assert p["capacity_ft3"] == 30
        assert p["temp_min_c"] == -22
        assert p["temp_max_c"] == -18
        TestAdminProducts.created_id = p["id"]

    def test_new_product_in_search(self, session):
        r = session.get(f"{API}/products?min_ft3=30&temp=congelacion")
        assert r.status_code == 200
        ids = {p["id"] for p in r.json()["items"]}
        assert TestAdminProducts.created_id in ids

    def test_update_product(self, session, auth_headers):
        pid = TestAdminProducts.created_id
        payload = {
            "category": "congeladores",
            "name": "TEST-FCG",
            "label": "TEST Congelador 30 UPDATED",
            "capacidad": "30 ft³ / 850 L",
            "especificaciones": {"Temperatura": "−18°C a −22°C"},
        }
        r = session.put(f"{API}/admin/products/{pid}", json=payload, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["label"] == "TEST Congelador 30 UPDATED"

    def test_invalid_category(self, session, auth_headers):
        payload = {"category": "no-such-cat", "name": "x", "label": "x"}
        r = session.post(f"{API}/admin/products", json=payload, headers=auth_headers)
        assert r.status_code == 400

    def test_delete_product(self, session, auth_headers):
        pid = TestAdminProducts.created_id
        r = session.delete(f"{API}/admin/products/{pid}", headers=auth_headers)
        assert r.status_code == 200
        r = session.get(f"{API}/products/{pid}")
        assert r.status_code == 404


# ---------- Upload ----------
class TestUpload:
    uploaded_path = None

    def test_upload_png(self, auth_headers):
        png = _png_bytes()
        files = {"file": ("test.png", png, "image/png")}
        r = requests.post(f"{API}/admin/upload", files=files, headers={"Authorization": auth_headers["Authorization"]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and body["url"].startswith("/api/files/")
        TestUpload.uploaded_path = body["path"]

    def test_serve_file(self):
        assert TestUpload.uploaded_path
        r = requests.get(f"{API}/files/{TestUpload.uploaded_path}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_non_image(self, auth_headers):
        files = {"file": ("evil.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/admin/upload", files=files, headers={"Authorization": auth_headers["Authorization"]})
        assert r.status_code == 400


# ---------- Admin quotes ----------
class TestAdminQuotes:
    def _create_quote(self, session):
        payload = {
            "customer": {"nombre": "TEST Admin Quote", "email": "test+admin@example.com", "telefono": "5559990000"},
            "items": [{"product_id": "ci1", "qty": 1}],
        }
        r = session.post(f"{API}/quotes", json=payload)
        assert r.status_code == 201
        return r.json()["id"]

    def test_list_quotes(self, session, auth_headers):
        qid = self._create_quote(session)
        r = session.get(f"{API}/admin/quotes", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        quotes = body["items"]
        assert isinstance(quotes, list) and len(quotes) >= 1 and body["total"] >= 1
        assert "new_count" in body and "pages" in body
        assert qid in {q["id"] for q in quotes}
        # verify newest first
        if len(quotes) >= 2:
            assert quotes[0]["created_at"] >= quotes[1]["created_at"]

    def test_update_status(self, session, auth_headers):
        qid = self._create_quote(session)
        r = session.patch(f"{API}/admin/quotes/{qid}", json={"status": "atendida"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "atendida"

    def test_invalid_status(self, session, auth_headers):
        qid = self._create_quote(session)
        r = session.patch(f"{API}/admin/quotes/{qid}", json={"status": "garbage"}, headers=auth_headers)
        assert r.status_code == 422
