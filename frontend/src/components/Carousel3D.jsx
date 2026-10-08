import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveImg } from "../lib/api";
import { getLocalProductImage } from "../hooks/useCatalog";

// 3D perspective carousel replicating the COMERSEM hero showcase.
const Carousel3D = ({ products, index, setIndex, onInfo }) => {
  const n = products.length;
  const go = (dir) => setIndex((prev) => (prev + dir + n) % n);

  const offsetOf = (i) => {
    let diff = i - index;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    return diff;
  };

  const styleFor = (offset) => {
    const abs = Math.abs(offset);
    if (abs > 2) {
      return { opacity: 0, transform: `translateX(${offset * 55}%) scale(0.4)`, zIndex: 0, pointerEvents: "none" };
    }
    const translate = offset * 42; // percentage
    const scale = offset === 0 ? 1 : abs === 1 ? 0.66 : 0.44;
    const rotate = offset === 0 ? 0 : offset > 0 ? -22 : 22;
    const opacity = offset === 0 ? 1 : abs === 1 ? 0.55 : 0.28;
    const z = 20 - abs;
    const blur = offset === 0 ? 0 : abs === 1 ? 1.5 : 3;
    return {
      opacity,
      transform: `translateX(${translate}%) scale(${scale}) rotateY(${rotate}deg)`,
      zIndex: z,
      filter: `blur(${blur}px)`,
    };
  };

  return (
    <div className="relative w-full select-none" style={{ perspective: "1600px" }}>
      <div className="relative h-[300px] sm:h-[380px] md:h-[440px] flex items-center justify-center">
        {products.map((p, i) => {
          const offset = offsetOf(i);
          const isCenter = offset === 0;
          return (
            <button
              key={p.id}
              onClick={() => (isCenter ? onInfo(p) : setIndex(i))}
              className="absolute w-[56%] sm:w-[42%] md:w-[34%] max-w-[380px] h-full flex items-center justify-center transition-all duration-700 ease-out will-change-transform"
              style={styleFor(offset)}
              tabIndex={isCenter ? 0 : -1}
              aria-label={p.label}
            >
              <img
                src={resolveImg(getLocalProductImage(p))}
                alt={p.label}
                className="max-h-full w-auto object-contain drop-shadow-[0_30px_40px_rgba(11,42,74,0.25)]"
                draggable={false}
              />
            </button>
          );
        })}
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => go(-1)}
        aria-label="Anterior"
        className="absolute left-1 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur border border-white shadow-lg flex items-center justify-center text-slate-600 hover:text-sky-600 hover:scale-105 transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Siguiente"
        className="absolute right-1 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur border border-white shadow-lg flex items-center justify-center text-slate-600 hover:text-sky-600 hover:scale-105 transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Carousel3D;
