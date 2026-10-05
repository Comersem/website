import React from "react";
import { Search, X } from "lucide-react";

export const DEFAULT_FILTERS = { q: "", category: "", capacity: "", temp: "" };

const CAPACITIES = [
  { value: "", label: "Cualquier capacidad" },
  { value: "0-10", label: "Hasta 10 ft³" },
  { value: "10-25", label: "10 – 25 ft³" },
  { value: "25-50", label: "25 – 50 ft³" },
  { value: "50-", label: "Más de 50 ft³" },
];

const TEMPS = [
  { value: "", label: "Cualquier temperatura" },
  { value: "refrigeracion", label: "Refrigeración (0°C a 8°C)" },
  { value: "congelacion", label: "Congelación (bajo 0°C)" },
];

const selectCls =
  "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition-shadow";

const SearchFilters = ({ filters, setFilters, categories }) => {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const dirty = Object.values(filters).some(Boolean);

  return (
    <div
      className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(62,106,138,0.10)] p-4 sm:p-5"
      data-testid="search-filters"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
        <label className="sm:col-span-2 xl:col-span-5 relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.q}
            onChange={set("q")}
            placeholder="Buscar por modelo, ej. FVP-21, FCF-15…"
            className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            data-testid="search-input"
          />
        </label>
        <select value={filters.category} onChange={set("category")} className={`sm:col-span-2 xl:col-span-3 ${selectCls}`} data-testid="search-category-select">
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select value={filters.capacity} onChange={set("capacity")} className={`xl:col-span-2 ${selectCls}`} data-testid="search-capacity-select">
          {CAPACITIES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={filters.temp} onChange={set("temp")} className={`xl:col-span-2 ${selectCls}`} data-testid="search-temp-select">
          {TEMPS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {dirty && (
        <button
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors"
          data-testid="search-clear-btn"
        >
          <X className="w-3.5 h-3.5" /> Limpiar filtros
        </button>
      )}
    </div>
  );
};

export default SearchFilters;
