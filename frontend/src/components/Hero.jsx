import React from "react";
import { Plus, Info, Check } from "lucide-react";
import Carousel3D from "./Carousel3D";
import SnowOverlay from "./SnowOverlay";
import { useQuote } from "../context/QuoteContext";

const Hero = ({ category, index, setIndex, onInfo }) => {
  const { addItem, items } = useQuote();
  const products = category.products;
  const active = products[index] || products[0];
  const inQuote = items.some((it) => it.id === active.id);

  const titleParts = (category.titleHint || "").split("·");

  return (
    <section
      className="relative overflow-hidden pt-[120px] lg:pt-[110px] pb-10"
      style={{ background: category.grad }}
    >
      {/* faint product-scene background */}
      {category.bg && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.10]"
          style={{ backgroundImage: `url(${category.bg})` }}
          aria-hidden
        />
      )}
      {/* radial glow */}
      <div className="absolute inset-0" style={{ background: category.glow }} aria-hidden />
      <SnowOverlay accent={category.accent} />

      <div className="relative mx-auto max-w-[1280px] px-4">
        {/* Eyebrow */}
        <div className="text-center mb-2">
          <p
            className="text-xs sm:text-sm font-bold tracking-[0.28em] uppercase"
            style={{ color: category.accent }}
          >
            {titleParts[0]}
          </p>
          {titleParts[1] && (
            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">
              {category.shortLabel} ·{titleParts[1]}
            </p>
          )}
        </div>

        {/* Carousel */}
        <Carousel3D products={products} index={index} setIndex={setIndex} onInfo={onInfo} />

        {/* Product info card */}
        <div className="relative mx-auto -mt-2 md:-mt-4 max-w-3xl">
          <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_20px_50px_rgba(62,106,138,0.15)] px-6 sm:px-10 py-7 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] leading-tight font-extrabold text-slate-800 tracking-tight" data-testid="hero-product-title">
              {active.label}
            </h1>
            {active.subtitulo && (
              <p className="mt-2 text-base sm:text-lg font-semibold" style={{ color: category.accent }}>
                {active.subtitulo}
              </p>
            )}
            <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
              {active.descripcion?.split(".")[0]}.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => addItem(active)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 h-12 rounded-full text-white font-semibold shadow-[0_10px_24px_rgba(46,125,91,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(46,125,91,0.5)] transition-all"
                style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
                data-testid="hero-add-quote-btn"
              >
                {inQuote ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {inQuote ? "Agregado" : "Agregar a Cotización"}
              </button>
              <button
                onClick={() => onInfo(active)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 h-12 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:shadow-sm transition-all"
                data-testid="hero-info-btn"
              >
                <Info className="w-5 h-5" />
                Más Información
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIndex(i)}
                aria-label={`Ver ${p.name}`}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 26 : 8,
                  backgroundColor: i === index ? category.accent : "rgba(100,116,139,0.35)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
