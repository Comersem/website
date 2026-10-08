import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const LOCAL_PRODUCT_IMAGES = {
  ci1: "/assets/conservadores_hielo/FT_FCC-20-2.png",
  ci2: "/assets/conservadores_hielo/FT_FCC-100-2.png",
  ci3: "/assets/conservadores_hielo/FT_FCC-150-2.png",
  ci4: "/assets/conservadores_hielo/FT_FCC-60-2.png",
  ci5: "/assets/conservadores_hielo/FT_FCC-200-2.png",
  ci6: "/assets/conservadores_hielo/FT_FCC-40-2.png",
  ci7: "/assets/conservadores_hielo/FT_FCC-300-2.png",
  eh1: "/assets/enfriadores_horizontales/FT_FHA-10.png",
  eh2: "/assets/enfriadores_horizontales/FCH-200.png",
  eh3: "/assets/enfriadores_horizontales/FT_FCH-300.png",
  eh4: "/assets/enfriadores_horizontales/FCH-350.png",
  eh5: "/assets/enfriadores_horizontales/FCH-500.png",
  eh6: "/assets/enfriadores_horizontales/FT_FHA-12.png",
  ev1: "/assets/enfriadores_verticales/FT_FVP-9.png",
  ev2: "/assets/enfriadores_verticales/FT_FVP-13.png",
  ev3: "/assets/enfriadores_verticales/FT_FVP-21.png",
  ev4: "/assets/enfriadores_verticales/FT_FVP-36-2.png",
  ev5: "/assets/enfriadores_verticales/FT_FVP-36-4.png",
  ev6: "/assets/enfriadores_verticales/FT_FCVS-8.png",
  ev7: "/assets/enfriadores_verticales/FT_FCV-160.png",
  ev8: "/assets/enfriadores_verticales/FT_FCV-220.png",
  ev9: "/assets/enfriadores_verticales/FT_FCV-300.png",
  ev10: "/assets/enfriadores_verticales/FT_FVP-21-2.png",
  ev11: "/assets/enfriadores_verticales/FT_FCV-450-2.png",
  ev12: "/assets/enfriadores_verticales/FT_FCV-802.png",
  ev13: "/assets/enfriadores_verticales/FT_FCV-804.png",
  ev14: "/assets/enfriadores_verticales/FT_FCV-450.png",
  cg1: "/assets/congeladores/FCF-7.png",
  cg2: "/assets/congeladores/FCF-15.png",
  cg3: "/assets/congeladores/FCF-25.png",
  cg4: "/assets/congeladores/FC-25-PI-2P.png",
  cg5: "/assets/congeladores/FCVC-21-LP-PS.png",
  cg6: "/assets/congeladores/FCF-7-PI.png",
  cg7: "/assets/congeladores/FCF-15-PI.png",
  cg8: "/assets/congeladores/FCF-25-AI.png",
  cg9: "/assets/congeladores/FCF-25-PI.png",
  cg10: "/assets/congeladores/FCVC-21-LP-PC.png",
  cg11: "/assets/congeladores/FC-25-AI-2P.png",
  pr1: "/assets/enfriadores_verticales/enfriadores_verticales/ev_fvp-36-2.png",
  pr2: "/assets/enfriadores_verticales/enfriadores_verticales/ev_fvp-21.png",
  pr3: "/assets/conservadores_hielo/FT_FCC-60-2.png",
  pr4: "/assets/congeladores/FCP-14-3.png",
  pr5: "/assets/congeladores/FCF-15.png",
};

export const getLocalProductImage = (product) =>
  LOCAL_PRODUCT_IMAGES[product.id] || product.img;

export const withLocalProductImage = (product) => {
  const image = getLocalProductImage(product);
  if (!LOCAL_PRODUCT_IMAGES[product.id]) return product;
  return image ? { ...product, img: image, imgComercial: image } : product;
};

const withLocalCatalogImages = (categories) =>
  categories.map((category) => ({
    ...category,
    bg: undefined,
    products: category.products.map(withLocalProductImage),
  }));

let bundledCatalogPromise;

export const getBundledCatalog = () => {
  if (!bundledCatalogPromise) {
    bundledCatalogPromise = fetch(`${process.env.PUBLIC_URL || ""}/catalog.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Bundled catalog request failed: ${response.status}`);
        }
        return response.json().then(withLocalCatalogImages);
      })
      .catch((error) => {
        bundledCatalogPromise = undefined;
        throw error;
      });
  }
  return bundledCatalogPromise;
};

const loadCatalog = async () => {
  try {
    return withLocalCatalogImages((await api.get("/catalog")).data);
  } catch (error) {
    console.warn("Catalog API unavailable; using bundled read-only catalog data.", error);
    return getBundledCatalog();
  }
};

const loadProductSearch = async (params) => {
  try {
    const result = (await api.get("/products", { params })).data;
    return { ...result, items: result.items.map(withLocalProductImage) };
  } catch (error) {
    console.warn("Product search API unavailable; searching bundled read-only catalog data.", error);
    const categories = await getBundledCatalog();
    const query = String(params.q || "").trim().toLowerCase();
    const minCapacity = params.min_ft3;
    const maxCapacity = params.max_ft3;

    const items = categories.flatMap((category) =>
      category.products
        .map((product) => ({ ...product, category: category.key }))
        .filter((product) => {
          const text = [
            product.name,
            product.label,
            product.spec,
            product.descripcion,
            product.capacidad,
            product.badge,
            product.subtitulo,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const capacityMatch = product.capacidad?.match(/([\d.,]+)\s*ft/i);
          const capacity = capacityMatch
            ? Number(capacityMatch[1].replace(/,/g, ""))
            : undefined;
          const temperature = product.especificaciones?.Temperatura || "";
          const temperatures =
            temperature.match(/[−-]?\d+(?:\.\d+)?/g)?.map((value) => Number(value.replace("−", "-"))) || [];
          const minimumTemperature = temperatures.length ? Math.min(...temperatures) : undefined;
          const maximumTemperature = temperatures.length ? Math.max(...temperatures) : undefined;

          return (
            (!query || text.includes(query)) &&
            (!params.category || product.category === params.category) &&
            (minCapacity === undefined || (capacity !== undefined && capacity >= minCapacity)) &&
            (maxCapacity === undefined || (capacity !== undefined && capacity <= maxCapacity)) &&
            (params.temp !== "refrigeracion" ||
              (minimumTemperature !== undefined && minimumTemperature >= 0)) &&
            (params.temp !== "congelacion" ||
              (maximumTemperature !== undefined && maximumTemperature < 0)) &&
            (params.disponible === undefined || product.disponible === params.disponible)
          );
        })
    );

    return { total: items.length, items };
  }
};

export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: loadCatalog,
  });

export const useProductSearch = (params) =>
  useQuery({
    queryKey: ["products", params],
    queryFn: () => loadProductSearch(params),
    keepPreviousData: true,
  });
