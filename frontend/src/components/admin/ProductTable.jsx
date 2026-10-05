import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { api, apiError, resolveImg } from "../../lib/api";

const ProductTable = ({ products, categories, loading, onEdit }) => {
  const qc = useQueryClient();
  const catByKey = Object.fromEntries(categories.map((c) => [c.key, c]));

  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.label}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      toast.success("Equipo eliminado");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (loading) return <p className="text-slate-400">Cargando equipos…</p>;
  if (products.length === 0)
    return <p className="text-slate-400 rounded-2xl bg-white border border-slate-100 p-8 text-center" data-testid="admin-products-empty">No hay equipos que coincidan.</p>;

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden" data-testid="admin-product-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed lg:table-auto">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3 hidden md:table-cell w-36 lg:w-auto">Categoría</th>
              <th className="px-4 py-3 hidden lg:table-cell">Capacidad</th>
              <th className="px-4 py-3 hidden lg:table-cell">Temperatura</th>
              <th className="px-4 py-3 hidden sm:table-cell w-32 lg:w-auto">Estado</th>
              <th className="px-4 py-3 text-right w-[104px] lg:w-auto">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const cat = catByKey[p.category];
              return (
                <tr key={p.id} className="hover:bg-slate-50/70" data-testid={`admin-product-row-${p.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {p.img ? (
                          <img src={resolveImg(p.img)} alt="" className="max-w-full max-h-full object-contain p-1" />
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin foto</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                          {p.label}
                          {p.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{p.name}{p.badge ? ` · ${p.badge}` : ""}</p>
                        <span className={`sm:hidden mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${p.disponible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.disponible ? "Disponible" : "Agotado"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: cat?.accent || "#64748b" }}>
                      {cat?.shortLabel || p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{p.capacidad || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{p.especificaciones?.Temperatura || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.disponible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.disponible ? "Disponible" : "Agotado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                        aria-label="Editar"
                        data-testid={`admin-edit-${p.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar"
                        data-testid={`admin-delete-${p.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
