import React, { useMemo } from "react";
import { Snowflake, Sparkle } from "lucide-react";

// Decorative floating ice particles — replaces the original emoji glyphs with
// clean lucide icons (per design guidelines: no emoji for icons).
const SnowOverlay = ({ accent = "#38bdf8" }) => {
  const flakes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 16; i++) {
      arr.push({
        id: `flake-${i}`,
        left: Math.random() * 100,
        top: Math.random() * 90,
        size: 10 + Math.random() * 20,
        delay: Math.random() * 6,
        dur: 7 + Math.random() * 8,
        opacity: 0.12 + Math.random() * 0.28,
        spark: Math.random() > 0.65,
      });
    }
    return arr;
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {flakes.map((f) => {
        const Icon = f.spark ? Sparkle : Snowflake;
        return (
          <Icon
            key={f.id}
            className="absolute animate-floaty"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              width: f.size,
              height: f.size,
              color: accent,
              opacity: f.opacity,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.dur}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default SnowOverlay;
