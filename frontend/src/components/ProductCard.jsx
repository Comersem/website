import React from "react";
import { Plus, Check, Info, Thermometer, Box } from "lucide-react";
import { useQuote } from "../context/QuoteContext";
import { resolveImg } from "../lib/api";
import { getLocalProductImage } from "../hooks/useCatalog";

const ProductCard = ({ product, accent = "#3E6A8A", categoryLabel, onInfo, delay = 0 }) => {
  const { addItem, items } = useQuote();
  const inQuote = items.some((it) => it.id === product.id);
  const temp = product.especificaciones?.Temperatura;

  return (
    <article
      className="group flex flex-col rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(62,106,138,0.08)] hover:shadow-[0_18px_44px_rgba(62,106,138,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
      data-testid={`product-card-${product.id}`}
    >
      <button
        onClick={() => onInfo(product)}
        className="relative h-52 flex items-center justify-center p-5"
        style={{ background: `linear-gradient(160deg, ${accent}14, #ffffff)` }}
        aria-label={`Ver ${product.label}`}
      >
        {product.badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>
            {product.badge}
          </span>
        )}
        {!product.disponible && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-white">
            Agotado
          </span>
        )}
        <img
          src={resolveImg(getLocalProductImage(product))}
          alt={product.label}
          className="max-h-full w-auto object-contain drop-shadow-[0_16px_24px_rgba(11,42,74,0.18)] group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </button>

      <div className="flex-1 flex flex-col px-5 pb-5">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>
          {categoryLabel}
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-800 leading-snug">{product.label}</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {product.capacidad && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1">
              <Box className="w-3.5 h-3.5" /> {product.capacidad}
            </span>
          )}
          {temp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1">
              <Thermometer className="w-3.5 h-3.5" /> {temp}
            </span>
          )}
        </div>
        <div className="mt-auto pt-5 flex gap-2">
          <button
            onClick={() => addItem(product)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full text-white text-sm font-semibold shadow-[0_8px_20px_rgba(46,125,91,0.3)] hover:-translate-y-0.5 transition-all"
            style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
            data-testid={`add-quote-${product.id}`}
          >
            {inQuote ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inQuote ? "Agregado" : "Cotizar"}
          </button>
          <button
            onClick={() => onInfo(product)}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Más información"
            data-testid={`info-${product.id}`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
