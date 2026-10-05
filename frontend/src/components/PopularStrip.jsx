import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Plus, Check, Flame, X } from "lucide-react";
import { api, resolveImg } from "../lib/api";
import { useQuote } from "../context/QuoteContext";

const PopularStrip = ({ categories, onInfo, onClose }) => {
  const { addItem, items } = useQuote();
  const { data } = useQuery({
    queryKey: ["popular"],
    queryFn: async () => (await api.get("/products/popular", { params: { limit: 8 } })).data,
  });
  const products = data?.items || [];
  if (products.length === 0) return null;
  const catByKey = Object.fromEntries((categories || []).map((c) => [c.key, c]));

  return (
    <section id="popular-strip" className="relative bg-white py-14 scroll-mt-28" data-testid="popular-strip">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.28em] uppercase text-steel">
              <TrendingUp className="w-4 h-4" /> Más cotizados
            </p>
            <h2 className="mt-2 text-base md:text-lg font-extrabold text-navy tracking-tight">
              {data.based_on_quotes
                ? "Los equipos que más solicitan nuestros clientes"
                : "Equipos destacados de nuestro catálogo"}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-ice bg-white text-xs font-semibold text-slate-500 hover:text-charcoal hover:bg-ice transition-colors"
              aria-label="Ocultar más cotizados"
              data-testid="popular-close-btn"
            >
              <X className="w-3.5 h-3.5" /> Ocultar
            </button>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory no-scrollbar" data-testid="popular-list">
          {products.map((p, i) => {
            const accent = catByKey[p.category]?.accent || "#3E6A8A";
            const inQuote = items.some((it) => it.id === p.id);
            return (
              <article
                key={p.id}
                className="snap-start shrink-0 w-[230px] rounded-3xl border border-ice bg-white shadow-[0_8px_30px_rgba(62,106,138,0.08)] hover:shadow-[0_16px_40px_rgba(62,106,138,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                data-testid={`popular-card-${p.id}`}
              >
                <button
                  onClick={() => onInfo(p)}
                  className="relative w-full h-40 flex items-center justify-center p-4"
                  style={{ background: `linear-gradient(160deg, ${accent}14, #ffffff)` }}
                  aria-label={`Ver ${p.label}`}
                >
                  <span
                    className="absolute top-3 left-3 w-7 h-7 rounded-full text-white text-xs font-extrabold flex items-center justify-center"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  {p.times_quoted > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 border border-ice px-2 py-0.5 text-[10px] font-bold text-forest" data-testid={`popular-count-${p.id}`}>
                      <Flame className="w-3 h-3" /> {p.times_quoted} {p.times_quoted === 1 ? "solicitud" : "solicitudes"}
                    </span>
                  )}
                  <img src={resolveImg(p.img)} alt={p.label} className="max-h-full w-auto object-contain drop-shadow-[0_12px_18px_rgba(11,42,74,0.18)]" loading="lazy" />
                </button>
                <div className="px-4 pb-4">
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>
                    {catByKey[p.category]?.shortLabel}
                  </p>
                  <h3 className="mt-0.5 text-sm font-extrabold text-charcoal leading-snug line-clamp-2 min-h-[2.5rem]">{p.label}</h3>
                  <p className="mt-1 text-xs text-slate-400 truncate">{p.capacidad}</p>
                  <button
                    onClick={() => addItem(p)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-white text-xs font-semibold hover:-translate-y-0.5 transition-all"
                    style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
                    data-testid={`popular-add-${p.id}`}
                  >
                    {inQuote ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {inQuote ? "Agregado" : "Cotizar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PopularStrip;
