import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const QuoteContext = createContext(null);

const STORAGE_KEY = "comersem_quote_v1";

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Could not restore saved quote", e);
    return [];
  }
};

export const QuoteProvider = ({ children }) => {
  const [items, setItems] = useState(loadSaved);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Could not persist quote", e);
    }
  }, [items]);

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          label: product.label,
          capacidad: product.capacidad,
          img: product.img,
          qty: 1,
        },
      ];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((p) => p.id !== id));

  const setQty = (id, qty) =>
    setItems((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p))
        .filter((p) => p.qty > 0)
    );

  const clear = () => setItems([]);

  const totalQty = useMemo(() => items.reduce((a, b) => a + b.qty, 0), [items]);

  const value = {
    items,
    addItem,
    removeItem,
    setQty,
    clear,
    totalQty,
    open,
    setOpen,
  };

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
};

export const useQuote = () => {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
};
