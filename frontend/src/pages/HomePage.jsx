import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import QuoteDrawer from "../components/QuoteDrawer";
import ProductModal from "../components/ProductModal";
import PopularStrip from "../components/PopularStrip";
import { useCatalog } from "../hooks/useCatalog";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center" data-testid="home-loading">
    <div className="w-10 h-10 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
  </div>
);

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const activeCat = params.get("cat") || "hielo";
  const showPopular = params.get("popular") === "1";
  const setActiveCat = (key) => setParams(key === "hielo" ? {} : { cat: key });
  const [index, setIndex] = useState(0);
  const [modalProduct, setModalProduct] = useState(null);
  const { data: categories, isLoading, isError } = useCatalog();

  const category = useMemo(
    () => categories?.find((c) => c.key === activeCat) || categories?.[0],
    [categories, activeCat]
  );

  useEffect(() => setIndex(0), [activeCat]);
  useEffect(() => {
    if (!showPopular) return;
    const t = setTimeout(
      () => document.getElementById("popular-strip")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      150
    );
    return () => clearTimeout(t);
  }, [showPopular, isLoading]);

  if (isLoading) return <Loading />;
  if (isError || !category)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500" data-testid="home-error">
        No se pudo cargar el catálogo.
      </div>
    );

  return (
    <>
      <Navbar activeCat={activeCat} setActiveCat={setActiveCat} />
      <main>
        <Hero category={category} index={index} setIndex={setIndex} onInfo={setModalProduct} />
        {showPopular && (
          <PopularStrip
            categories={categories}
            onInfo={setModalProduct}
            onClose={() => setParams(activeCat === "hielo" ? {} : { cat: activeCat })}
          />
        )}
      </main>
      <Footer />
      <QuoteDrawer />
      <ProductModal
        product={modalProduct}
        accent={(modalProduct && categories.find((c) => c.key === modalProduct.category)?.accent) || category.accent}
        open={!!modalProduct}
        onClose={() => setModalProduct(null)}
      />
    </>
  );
}
