import React from "react";
import { Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { useQuote } from "../context/QuoteContext";
import { resolveImg } from "../lib/api";

const ProductModal = ({ product, accent = "#3E6A8A", open, onClose }) => {
  const { addItem, items } = useQuote();
  if (!product) return null;
  const inQuote = items.some((it) => it.id === product.id);
  const specs = Object.entries(product.especificaciones || {});

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100%-1.5rem)] max-w-3xl max-h-[92vh] overflow-y-auto md:overflow-hidden p-0 gap-0 bg-white rounded-2xl" data-testid="product-modal">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image side */}
          <div
            className="relative flex items-center justify-center p-6 md:p-8 min-h-[200px] md:min-h-[280px]"
            style={{ background: `linear-gradient(160deg, ${accent}14, #ffffff)` }}
          >
            {product.badge && (
              <span
                className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {product.badge}
              </span>
            )}
            <img
              src={resolveImg(product.img)}
              alt={product.label}
              className="max-h-[200px] md:max-h-[320px] w-auto object-contain drop-shadow-[0_20px_30px_rgba(11,42,74,0.2)]"
            />
          </div>

          {/* Details side */}
          <div className="p-5 sm:p-8 flex flex-col md:max-h-[85vh] md:overflow-y-auto">
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-800 pr-6" data-testid="product-modal-title">{product.label}</DialogTitle>
            {product.subtitulo && (
              <p className="mt-1 text-sm font-semibold" style={{ color: accent }}>
                {product.subtitulo}
              </p>
            )}
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">{product.descripcion}</p>

            {specs.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Especificaciones
                </h3>
                <dl className="divide-y divide-slate-100">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 py-2">
                      <dt className="text-sm text-slate-500">{k}</dt>
                      <dd className="text-sm font-semibold text-slate-800 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <button
              onClick={() => addItem(product)}
              className="mt-6 w-full flex items-center justify-center gap-2 h-12 rounded-full text-white font-semibold shadow-[0_10px_24px_rgba(46,125,91,0.35)] hover:-translate-y-0.5 transition-all"
              style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
              data-testid="modal-add-quote-btn"
            >
              {inQuote ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {inQuote ? "Agregado a Cotización" : "Agregar a Cotización"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
