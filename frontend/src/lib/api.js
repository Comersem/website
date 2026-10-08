import axios from "axios";

const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();
export const BACKEND_URL =
  configuredBackendUrl ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8001" : "");
const TOKEN_KEY = "comersem_admin_token";

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const resolveImg = (src) => (src ? (src.startsWith("/api/") ? `${BACKEND_URL}${src}` : src) : undefined);

export const apiError = (e, fallback = "Ocurrió un error. Intenta de nuevo.") => {
  const d = e?.response?.data?.detail;
  if (!d && e?.code === "ERR_NETWORK") {
    return "No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.";
  }
  if (!d && e?.response?.status === 404) {
    return "No se encontró este servicio. Verifica la dirección del backend.";
  }
  if (!d) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d?.msg || String(d);
};
