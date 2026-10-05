import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    return resp.json().get("id")


def quote_email_html(quote: dict) -> str:
    c = quote["customer"]
    rows = "".join(
        f'<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">{escape(it["label"])}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #e2e8f0">{escape(it.get("capacidad") or "")}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center"><strong>{int(it["qty"])}</strong></td></tr>'
        for it in quote["items"]
    )
    field = lambda k, v: (f'<tr><td style="padding:4px 8px;color:#64748b">{k}</td>'
                          f'<td style="padding:4px 8px;font-weight:600">{escape(str(v))}</td></tr>') if v else ""
    return (
        '<table role="presentation" width="100%" style="font-family:Arial,sans-serif;color:#0f172a">'
        '<tr><td style="padding:24px">'
        f'<h2 style="margin:0 0 4px;color:#0284c7">Nueva solicitud de cotización</h2>'
        f'<p style="margin:0 0 16px;color:#64748b">Folio <strong>{escape(quote["folio"])}</strong></p>'
        '<table role="presentation" style="margin-bottom:16px">'
        + field("Nombre", c.get("nombre")) + field("Empresa", c.get("empresa"))
        + field("Correo", c.get("email")) + field("Teléfono", c.get("telefono"))
        + field("Mensaje", c.get("mensaje")) +
        '</table>'
        '<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0">'
        '<tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Equipo</th>'
        '<th style="padding:8px;text-align:left">Capacidad</th><th style="padding:8px">Cant.</th></tr>'
        f'{rows}</table>'
        f'<p style="margin:16px 0 0;font-weight:700">Total de equipos: {quote["total_qty"]}</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">Enviado automáticamente por {escape(EMAIL_FROM_NAME)}.</p>'
        '</td></tr></table>'
    )


def customer_email_html(quote: dict, company: dict) -> str:
    c = quote["customer"]
    rows = "".join(
        f'<tr><td style="padding:8px;border-bottom:1px solid #D4DFE7">{escape(it["label"])}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #D4DFE7">{escape(it.get("capacidad") or "")}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #D4DFE7;text-align:center"><strong>{int(it["qty"])}</strong></td></tr>'
        for it in quote["items"]
    )
    return (
        '<table role="presentation" width="100%" style="font-family:Arial,sans-serif;color:#2B3138;background:#DCEBF5">'
        '<tr><td style="padding:24px">'
        '<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px">'
        '<tr><td style="padding:28px">'
        f'<p style="margin:0;font-size:12px;letter-spacing:3px;color:#3E6A8A;font-weight:700">{escape(EMAIL_FROM_NAME)}</p>'
        f'<h2 style="margin:8px 0 4px;color:#0B2A4A">¡Gracias, {escape(c.get("nombre") or "")}!</h2>'
        '<p style="margin:0 0 16px;color:#5B6973">Recibimos tu solicitud de cotización. Nuestro equipo de ventas te contactará muy pronto.</p>'
        f'<p style="margin:0 0 16px;padding:12px 16px;background:#F2F7FB;border-radius:10px">Folio: <strong style="color:#3E6A8A">{escape(quote["folio"])}</strong></p>'
        '<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #D4DFE7">'
        '<tr style="background:#F5F8FA"><th style="padding:8px;text-align:left">Equipo</th>'
        '<th style="padding:8px;text-align:left">Capacidad</th><th style="padding:8px">Cant.</th></tr>'
        f'{rows}</table>'
        f'<p style="margin:16px 0 0;font-weight:700">Total de equipos: {quote["total_qty"]}</p>'
        f'<p style="margin:20px 0 0;color:#5B6973">¿Tienes prisa? Llámanos al <a href="tel:{escape(company["phoneRaw"])}" style="color:#2E7D5B;font-weight:700">{escape(company["phone"])}</a> '
        f'o escríbenos a <a href="mailto:{escape(company["email"])}" style="color:#2E7D5B">{escape(company["email"])}</a>.</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">{escape(EMAIL_FROM_NAME)} · {escape(company["address"])}. Este es un mensaje automático de confirmación.</p>'
        '</td></tr></table></td></tr></table>'
    )



def _mxn(v: float) -> str:
    return f"${v:,.2f} MXN"


def reply_email_html(quote: dict, reply: dict, company: dict) -> str:
    c = quote["customer"]
    td = 'style="padding:8px;border-bottom:1px solid #D4DFE7"'
    rows = "".join(
        f'<tr><td {td}>{escape(l["label"])}<br><span style="color:#7E8E99;font-size:12px">{escape(l.get("capacidad") or "")}</span></td>'
        f'<td {td} align="center">{int(l["qty"])}</td>'
        f'<td {td} align="right">{_mxn(l["unit_price"])}</td>'
        f'<td {td} align="right"><strong>{_mxn(l["line_total"])}</strong></td></tr>'
        for l in reply["lines"]
    )
    totals = ""
    if reply["shipping"]:
        totals += f'<tr><td colspan="3" align="right" style="padding:6px 8px;color:#5B6973">Envío</td><td align="right" style="padding:6px 8px">{_mxn(reply["shipping"])}</td></tr>'
    totals += f'<tr><td colspan="3" align="right" style="padding:6px 8px;color:#5B6973">Subtotal</td><td align="right" style="padding:6px 8px">{_mxn(reply["subtotal"])}</td></tr>'
    if reply["include_iva"]:
        totals += f'<tr><td colspan="3" align="right" style="padding:6px 8px;color:#5B6973">IVA 16%</td><td align="right" style="padding:6px 8px">{_mxn(reply["iva"])}</td></tr>'
    totals += (f'<tr><td colspan="3" align="right" style="padding:10px 8px;font-weight:700;color:#0B2A4A">Total</td>'
               f'<td align="right" style="padding:10px 8px;font-weight:800;font-size:18px;color:#2E7D5B">{_mxn(reply["total"])}</td></tr>')
    notes = (f'<p style="margin:16px 0 0;padding:12px 16px;background:#F2F7FB;border-radius:10px;color:#2B3138;white-space:pre-line">{escape(reply["notes"])}</p>'
             if reply["notes"] else "")
    return (
        '<table role="presentation" width="100%" style="font-family:Arial,sans-serif;color:#2B3138;background:#DCEBF5">'
        '<tr><td style="padding:24px">'
        '<table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px">'
        '<tr><td style="padding:28px">'
        f'<p style="margin:0;font-size:12px;letter-spacing:3px;color:#3E6A8A;font-weight:700">{escape(EMAIL_FROM_NAME)}</p>'
        f'<h2 style="margin:8px 0 4px;color:#0B2A4A">Tu cotización está lista</h2>'
        f'<p style="margin:0 0 16px;color:#5B6973">Hola {escape(c.get("nombre") or "")}, aquí tienes los precios de los equipos que solicitaste. '
        f'Folio <strong style="color:#3E6A8A">{escape(quote["folio"])}</strong>.</p>'
        '<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #D4DFE7">'
        '<tr style="background:#F5F8FA"><th style="padding:8px;text-align:left">Equipo</th><th style="padding:8px">Cant.</th>'
        '<th style="padding:8px;text-align:right">Precio unitario</th><th style="padding:8px;text-align:right">Importe</th></tr>'
        f'{rows}{totals}</table>'
        f'{notes}'
        f'<p style="margin:16px 0 0;color:#5B6973;font-size:13px">Precios en pesos mexicanos. Cotización válida por {int(reply["validity_days"])} días.</p>'
        f'<p style="margin:20px 0 0;color:#5B6973">Para confirmar tu pedido responde a este correo, llámanos al '
        f'<a href="tel:{escape(company["phoneRaw"])}" style="color:#2E7D5B;font-weight:700">{escape(company["phone"])}</a> '
        f'o escríbenos a <a href="mailto:{escape(company["email"])}" style="color:#2E7D5B">{escape(company["email"])}</a>.</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">{escape(EMAIL_FROM_NAME)} · {escape(company["address"])}.</p>'
        '</td></tr></table></td></tr></table>'
    )

