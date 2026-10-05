// Production static server for the React build (frontend/build).
// The FastAPI backend is deployed separately; point REACT_APP_BACKEND_URL at it before building.
const path = require("path");
const fs = require("fs");
const express = require("express");

const BUILD_DIR = path.join(__dirname, "frontend", "build");
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(path.join(BUILD_DIR, "index.html"))) {
  console.error("frontend/build not found. Run `npm run build` before `npm start`.");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Hashed assets can be cached for a year; index.html must always be revalidated.
app.use(
  "/static",
  express.static(path.join(BUILD_DIR, "static"), { immutable: true, maxAge: "1y" })
);
app.use(express.static(BUILD_DIR, { index: false, maxAge: "1h" }));

// Single-page app fallback (react-router routes such as /buscar and /admin).
app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(BUILD_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`Comersem frontend listening on port ${PORT}`));
