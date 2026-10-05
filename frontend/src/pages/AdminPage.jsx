import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { LogOut, Package, FileText, Plus, ExternalLink, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useCatalog } from "../hooks/useCatalog";
import { COMPANY } from "../mock";
import ProductTable from "../components/admin/ProductTable";
import ProductForm from "../components/admin/ProductForm";
import QuotesTable from "../components/admin/QuotesTable";
import Pagination from "../components/admin/Pagination";

const PAGE_SIZE = 20;
const QUOTE_STATUS = [["", "Todas"], ["nueva", "Nuevas"], ["atendida", "Atendidas"], ["cerrada", "Cerradas"]];

const useDebounced = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const TabBtn = ({ active, onClick, icon: Icon, children, testId }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors ${
      active ? "bg-sky-600 text-white" : "text-slate-500 hover:bg-slate-100"
    }`}
    data-testid={testId}
  >
    <Icon className="w-4 h-4" /> {children}
  </button>
);

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("productos");
  const [editing, setEditing] = useState(null); // null | {} (new) | product
  const { data: categories = [] } = useCatalog();
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pCat, setPCat] = useState("");
  const q = useDebounced(pSearch);
  const [qPage, setQPage] = useState(1);
  const [qStatus, setQStatus] = useState("");
  useEffect(() => setPPage(1), [q, pCat]);
  useEffect(() => setQPage(1), [qStatus]);

  const products = useQuery({
    queryKey: ["admin-products", pPage, q, pCat],
    queryFn: async () =>
      (await api.get("/admin/products", { params: { page: pPage, page_size: PAGE_SIZE, q: q || undefined, category: pCat || undefined } })).data,
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
  const quotes = useQuery({
    queryKey: ["admin-quotes", qPage, qStatus],
    queryFn: async () =>
      (await api.get("/admin/quotes", { params: { page: qPage, page_size: PAGE_SIZE, status: qStatus || undefined } })).data,
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  if (user === null) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando…</div>;
  if (user === false) return <Navigate to="/admin/login" replace />;

  const newQuotes = quotes.data?.new_count ?? 0;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-page">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-2 md:py-0 md:h-16 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0 order-1">
            <img src={COMPANY.logo} alt="COMERSEM" className="h-7 w-auto" />
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="hidden sm:inline text-sm font-semibold text-slate-700 truncate">Administración</span>
          </div>
          <nav className="flex items-center gap-1 order-3 md:order-2 w-full md:w-auto justify-center">
            <TabBtn active={tab === "productos"} onClick={() => setTab("productos")} icon={Package} testId="admin-tab-products">
              Productos
            </TabBtn>
            <TabBtn active={tab === "cotizaciones"} onClick={() => setTab("cotizaciones")} icon={FileText} testId="admin-tab-quotes">
              Cotizaciones
              {newQuotes > 0 && (
                <span className="ml-1 px-1.5 rounded-full bg-emerald-500 text-white text-[10px]" data-testid="admin-new-quotes-badge">
                  {newQuotes}
                </span>
              )}
            </TabBtn>
          </nav>
          <div className="flex items-center gap-2 order-2 md:order-3">
            <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600" data-testid="admin-view-site">
              <ExternalLink className="w-4 h-4" /> Ver sitio
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
        {tab === "productos" ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Catálogo</h1>
                <p className="text-sm text-slate-500 mt-1" data-testid="admin-products-count">
                  {products.data?.total ?? 0} equipos en {categories.length} categorías
                </p>
              </div>
              <button
                onClick={() => setEditing({})}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors"
                data-testid="admin-add-product-btn"
              >
                <Plus className="w-4 h-4" /> Nuevo equipo
              </button>
            </div>
            <div className="mb-4 flex flex-col sm:flex-row gap-2">
              <label className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={pSearch}
                  onChange={(e) => setPSearch(e.target.value)}
                  placeholder="Buscar por modelo o nombre…"
                  className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                  data-testid="admin-products-search"
                />
              </label>
              <select
                value={pCat}
                onChange={(e) => setPCat(e.target.value)}
                className="h-11 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700"
                data-testid="admin-products-category"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <ProductTable
              products={products.data?.items || []}
              categories={categories}
              loading={products.isLoading}
              onEdit={setEditing}
            />
            <Pagination
              page={products.data?.page || 1}
              pages={products.data?.pages || 1}
              total={products.data?.total || 0}
              pageSize={PAGE_SIZE}
              onPage={setPPage}
              testId="admin-products-pagination"
            />
            <ProductForm
              open={editing !== null}
              product={editing}
              categories={categories}
              onClose={() => setEditing(null)}
            />
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Cotizaciones recibidas</h1>
                <p className="text-sm text-slate-500 mt-1" data-testid="admin-quotes-count">
                  {quotes.data?.total ?? 0} en total · {newQuotes} nuevas
                </p>
              </div>
              <div className="flex gap-1 rounded-full bg-white border border-slate-200 p-1" data-testid="admin-quotes-status-filter">
                {QUOTE_STATUS.map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setQStatus(k)}
                    className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-colors ${
                      qStatus === k ? "bg-sky-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                    data-testid={`admin-quotes-status-${k || "all"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <QuotesTable quotes={quotes.data?.items || []} loading={quotes.isLoading} />
            <Pagination
              page={quotes.data?.page || 1}
              pages={quotes.data?.pages || 1}
              total={quotes.data?.total || 0}
              pageSize={PAGE_SIZE}
              onPage={setQPage}
              testId="admin-quotes-pagination"
            />
          </>
        )}
      </main>
    </div>
  );
}
