import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
  if (!d) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d?.msg || String(d);
};
