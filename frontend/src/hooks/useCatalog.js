import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: async () => (await api.get("/catalog")).data,
  });

export const useProductSearch = (params) =>
  useQuery({
    queryKey: ["products", params],
    queryFn: async () => (await api.get("/products", { params })).data,
    keepPreviousData: true,
  });
