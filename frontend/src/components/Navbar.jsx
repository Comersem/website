import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Search } from "lucide-react";
import { COMPANY } from "../mock";
import { useQuote } from "../context/QuoteContext";
import { useCatalog } from "../hooks/useCatalog";

const CatIcon = ({ glyph, color }) => (
  <span
    className="inline-block text-[11px] leading-none"
    style={{ color }}
    aria-hidden
  >
    {glyph}
  </span>
);

const NAV_ACCENT = "#0B2A4A";

const Navbar = ({ activeCat, setActiveCat: setCatProp }) => {
  const { totalQty, setOpen } = useQuote();
  const { data: CATEGORIES = [] } = useCatalog();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSearch = pathname === "/buscar";
  const setActiveCat = setCatProp || ((key) => navigate(key === "hielo" ? "/" : `/?cat=${key}`));
  const promo = CATEGORIES.find((c) => c.key === "promociones");
  const promoActive = activeCat === "promociones" && !onSearch;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_8px_30px_rgba(62,106,138,0.10)] px-3 md:px-5 h-[60px]">
          {/* Logo + Inicio merged */}
          <button
            onClick={() => setActiveCat("hielo")}
            className="flex items-center shrink-0 mr-2 px-2 h-11 rounded-full bg-white border border-sky-100 shadow-sm hover:shadow-md hover:bg-sky-50 transition-all"
            aria-label="Inicio"
            data-testid="nav-home-logo-btn"
          >
            <img src={COMPANY.logo} alt="COMERSEM" className="h-8 md:h-9 w-auto object-contain" />
          </button>

          {/* Category tabs */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {CATEGORIES.filter((c) => c.key !== "promociones").map((c) => {
              const active = c.key === activeCat;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`group flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold transition-all duration-200 ${
                    active && !onSearch
                      ? "text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                  style={active && !onSearch ? { backgroundColor: NAV_ACCENT } : {}}
                  data-testid={`nav-cat-${c.key}`}
                >
                  <CatIcon glyph={c.icon} color={active && !onSearch ? "#fff" : NAV_ACCENT} />
                  <span>{c.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(onSearch ? "/" : "/buscar")}
              aria-pressed={onSearch}
              className={`flex items-center gap-2 px-3 md:px-4 h-10 rounded-full border font-semibold text-sm transition-all ${
                onSearch
                  ? "bg-sky-600 border-sky-600 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-sm"
              }`}
              aria-label="Buscar equipos"
              data-testid="nav-search-btn"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Buscar</span>
            </button>
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-2 px-3 md:px-5 h-10 rounded-full text-white font-semibold text-sm shadow-[0_8px_20px_rgba(46,125,91,0.35)] hover:shadow-[0_10px_26px_rgba(46,125,91,0.5)] hover:-translate-y-0.5 transition-all"
              style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
              data-testid="nav-quote-btn"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden md:inline">Cotización ({totalQty})</span>
              <span className="md:hidden">{totalQty}</span>
            </button>
          </div>
        </div>

        {/* Promociones — right side, below navbar (desktop) */}
        {promo && (
          <div className="hidden lg:flex justify-end mt-2">
            <button
              onClick={() => setActiveCat("promociones")}
              className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-semibold shadow-md hover:-translate-y-0.5 transition-all ${
                promoActive ? "text-white" : "bg-white/90 backdrop-blur border border-white text-slate-600 hover:text-slate-900"
              }`}
              style={promoActive ? { backgroundColor: promo.accent } : {}}
              data-testid="nav-cat-promociones"
            >
              <CatIcon glyph={promo.icon} color={promoActive ? "#fff" : promo.accent} />
              {promo.shortLabel}
            </button>
          </div>
        )}

        {/* Mobile category row */}
        <div className="lg:hidden relative mt-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 pr-8 no-scrollbar" data-testid="nav-mobile-cats">
          {CATEGORIES.map((c) => {
            const active = c.key === activeCat && !onSearch;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active ? "text-white" : "bg-white/80 text-slate-500 border border-white"
                }`}
                style={active ? { backgroundColor: NAV_ACCENT } : {}}
                data-testid={`nav-cat-mobile-${c.key}`}
              >
                <CatIcon glyph={c.icon} color={active ? "#fff" : NAV_ACCENT} />
                {c.shortLabel}
              </button>
            );
          })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ice/90 to-transparent" aria-hidden />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
