# COMERSEM — Catálogo de Refrigeración Comercial

Catálogo y sistema de cotizaciones para equipos de refrigeración comercial.

**Stack:** React (CRA) + shadcn/ui · FastAPI · MongoDB

## Funciones
- Catálogo (43 productos, 5 categorías) con búsqueda por modelo, capacidad, temperatura y disponibilidad
- Solicitud de cotización con folio `COT-YYMMDD-XXXX` y correo al cliente y a ventas
- Panel de administración: productos, fotos, bandeja de cotizaciones y respuesta con precios + IVA 16%

## Ejecutar en local
```bash
# Backend
cd backend
cp .env.example .env        # completa los valores
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
cp .env.example .env        # apunta REACT_APP_BACKEND_URL a http://localhost:8001
yarn install
yarn start
```

MongoDB debe estar disponible en la dirección configurada en `backend/.env` antes de iniciar la API.

## Pruebas
```bash
cd backend && pytest
```

## Notas
- Correo y almacenamiento de imágenes usan el proxy de Emergent (`EMERGENT_*`). Se recomienda migrar a SMTP/S3 para producción.
- No subas `.env` ni credenciales al repositorio.
- Más detalle de arquitectura y API en `memory/PRD.md`.
