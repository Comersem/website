import React, { useMemo, useState } from "react";
import { SearchX, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import QuoteDrawer from "../components/QuoteDrawer";
import ProductModal from "../components/ProductModal";
import SearchFilters, { DEFAULT_FILTERS } from "../components/SearchFilters";
import ProductCard from "../components/ProductCard";
import { useCatalog, useProductSearch } from "../hooks/useCatalog";

export default function SearchPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modalProduct, setModalProduct] = useState(null);
  const { data: categories = [] } = useCatalog();

  const params = useMemo(() => {
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.category) p.category = filters.category;
    if (filters.temp) p.temp = filters.temp;
    if (filters.capacity) {
      const [min, max] = filters.capacity.split("-");
      if (min) p.min_ft3 = Number(min);
      if (max) p.max_ft3 = Number(max);
    }
    return p;
  }, [filters]);

  const { data, isFetching } = useProductSearch(params);
  const items = data?.items || [];
  const catByKey = Object.fromEntries(categories.map((c) => [c.key, c]));
  const modalAccent = modalProduct ? catByKey[modalProduct.category]?.accent : undefined;

  return (
    <>
      <Navbar />
      <main className="pt-[120px] lg:pt-[110px] pb-16 min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <div className="mx-auto max-w-[1280px] px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.28em] uppercase text-sky-600">Catálogo completo</p>
              <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800">
                Encuentra tu equipo ideal
              </h1>
              <p className="mt-2 text-base text-slate-500 max-w-2xl">
                Busca por modelo o filtra por capacidad y temperatura entre todos nuestros refrigeradores,
                congeladores y conservadores.
              </p>
            </div>
            <Link
              to="/?popular=1"
              className="self-start sm:mt-7 inline-flex items-center gap-2 shrink-0 px-4 h-10 rounded-full bg-white border border-emerald-100 text-forest text-sm font-semibold shadow-sm hover:shadow-md hover:bg-emerald-50 hover:-translate-y-0.5 transition-all"
              data-testid="search-popular-link"
            >
              <TrendingUp className="w-4 h-4" />
              Más cotizados
            </Link>
          </div>

          <SearchFilters filters={filters} setFilters={setFilters} categories={categories} />

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500" data-testid="search-results-count">
              {isFetching ? "Buscando…" : `${items.length} equipo${items.length === 1 ? "" : "s"} encontrado${items.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {items.length === 0 && !isFetching ? (
            <div className="mt-16 flex flex-col items-center text-center" data-testid="search-empty">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
                <SearchX className="w-8 h-8 text-sky-400" />
              </div>
              <p className="mt-5 text-lg font-bold text-slate-700">Sin resultados</p>
              <p className="mt-2 text-sm text-slate-400 max-w-xs">Prueba con otro modelo o amplía los filtros.</p>
            </div>
          ) : (
            <div
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              data-testid="search-results-grid"
            >
              {items.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  accent={catByKey[p.category]?.accent}
                  categoryLabel={catByKey[p.category]?.shortLabel}
                  onInfo={setModalProduct}
                  delay={i * 40}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <QuoteDrawer />
      <ProductModal
        product={modalProduct}
        accent={modalAccent}
        open={!!modalProduct}
        onClose={() => setModalProduct(null)}
      />
    </>
  );
}
