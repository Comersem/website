import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import ImageUpload from "./ImageUpload";
import { api, apiError } from "../../lib/api";

const EMPTY = {
  category: "hielo", name: "", label: "", subtitulo: "", capacidad: "", spec: "", descripcion: "",
  badge: "", img: "", imgTecnica: "", featured: false, disponible: true,
};
const SPEC_HINT = ["Capacidad", "Temperatura", "Compresor", "Voltaje", "Refrigerante", "Dimensiones", "Peso neto", "Garantía"];
let specSeq = 0;
const specRow = (k, v) => ({ id: `spec-${++specSeq}`, k, v });
const inputCls = "h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300";

const Field = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const ProductForm = ({ open, product, categories, onClose }) => {
  const qc = useQueryClient();
  const isNew = !product?.id;
  const [form, setForm] = useState(EMPTY);
  const [specs, setSpecs] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = product?.id ? product : EMPTY;
    setForm({ ...EMPTY, ...p });
    const entries = Object.entries(p.especificaciones || {});
    setSpecs(entries.length ? entries.map(([k, v]) => specRow(k, v)) : SPEC_HINT.slice(0, 4).map((k) => specRow(k, "")));
  }, [open, product]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setSpec = (i, field, val) => setSpecs((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const especificaciones = Object.fromEntries(specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => [s.k.trim(), s.v.trim()]));
    const payload = { ...form, especificaciones, imgComercial: form.img };
    delete payload.id; delete payload.order; delete payload.created_at; delete payload.updated_at;
    delete payload.capacity_ft3; delete payload.temp_min_c; delete payload.temp_max_c;
    try {
      if (isNew) await api.post("/admin/products", payload);
      else await api.put(`/admin/products/${product.id}`, payload);
      toast.success(isNew ? "Equipo creado" : "Cambios guardados");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl" data-testid="product-form-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-800">
            {isNew ? "Nuevo equipo" : `Editar ${product.name}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" data-testid="product-form">
          <ImageUpload value={form.img} onChange={(url) => setForm((f) => ({ ...f, img: url }))} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoría">
              <select value={form.category} onChange={set("category")} className={inputCls} data-testid="pf-category">
                {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Modelo">
              <input required value={form.name} onChange={set("name")} placeholder="FVP-21" className={inputCls} data-testid="pf-name" />
            </Field>
            <Field label="Nombre completo" className="sm:col-span-2">
              <input required value={form.label} onChange={set("label")} placeholder="Enfriador Vertical FVP-21" className={inputCls} data-testid="pf-label" />
            </Field>
            <Field label="Subtítulo">
              <input value={form.subtitulo} onChange={set("subtitulo")} className={inputCls} data-testid="pf-subtitulo" />
            </Field>
            <Field label="Etiqueta (badge)">
              <input value={form.badge} onChange={set("badge")} placeholder="Más vendido" className={inputCls} data-testid="pf-badge" />
            </Field>
            <Field label="Capacidad">
              <input value={form.capacidad} onChange={set("capacidad")} placeholder="21 ft³ / 595 L" className={inputCls} data-testid="pf-capacidad" />
            </Field>
            <Field label="Resumen técnico">
              <input value={form.spec} onChange={set("spec")} placeholder="21 ft³ · 1 puerta · LED" className={inputCls} data-testid="pf-spec" />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea value={form.descripcion} onChange={set("descripcion")} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" data-testid="pf-descripcion" />
            </Field>
            <Field label="Ficha técnica (URL imagen)" className="sm:col-span-2">
              <input value={form.imgTecnica} onChange={set("imgTecnica")} className={inputCls} data-testid="pf-img-tecnica" />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Especificaciones</span>
              <button type="button" onClick={() => setSpecs((s) => [...s, specRow("", "")])} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700" data-testid="pf-add-spec">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={s.id} className="flex gap-2">
                  <input value={s.k} onChange={(e) => setSpec(i, "k", e.target.value)} placeholder="Temperatura" list="spec-hints" className={`${inputCls} w-2/5`} data-testid={`pf-spec-key-${i}`} />
                  <input value={s.v} onChange={(e) => setSpec(i, "v", e.target.value)} placeholder="2°C a 8°C" className={inputCls} data-testid={`pf-spec-val-${i}`} />
                  <button type="button" onClick={() => setSpecs((arr) => arr.filter((_, idx) => idx !== i))} className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50" aria-label="Quitar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <datalist id="spec-hints">{SPEC_HINT.map((h) => <option key={h} value={h} />)}</datalist>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">La capacidad en ft³ y la temperatura se usan para los filtros de búsqueda.</p>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.disponible} onChange={set("disponible")} className="w-4 h-4 accent-sky-600" data-testid="pf-disponible" /> Disponible
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.featured} onChange={set("featured")} className="w-4 h-4 accent-sky-600" data-testid="pf-featured" /> Destacado
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50" data-testid="pf-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50" data-testid="pf-submit">
              <Save className="w-4 h-4" /> {busy ? "Guardando…" : isNew ? "Crear equipo" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
