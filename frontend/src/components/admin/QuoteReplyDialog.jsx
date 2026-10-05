import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { api, apiError } from "../../lib/api";

export const mxn = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v || 0);
const inputCls = "h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-300";

const QuoteReplyDialog = ({ quote, open, onClose }) => {
  const qc = useQueryClient();
  const [prices, setPrices] = useState({});
  const [shipping, setShipping] = useState("");
  const [includeIva, setIncludeIva] = useState(true);
  const [validity, setValidity] = useState(15);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !quote) return;
    const prev = quote.reply;
    setPrices(Object.fromEntries(quote.items.map((it) => [it.product_id, prev?.lines?.find((l) => l.product_id === it.product_id)?.unit_price ?? ""])));
    setShipping(prev?.shipping ? String(prev.shipping) : "");
    setIncludeIva(prev ? prev.include_iva : true);
    setValidity(prev?.validity_days || 15);
    setNotes(prev?.notes || "");
  }, [open, quote]);

  const totals = useMemo(() => {
    if (!quote) return { subtotal: 0, iva: 0, total: 0 };
    const lines = quote.items.reduce((a, it) => a + (Number(prices[it.product_id]) || 0) * it.qty, 0);
    const subtotal = lines + (Number(shipping) || 0);
    const iva = includeIva ? subtotal * 0.16 : 0;
    return { subtotal, iva, total: subtotal + iva };
  }, [quote, prices, shipping, includeIva]);

  if (!quote) return null;
  const complete = quote.items.every((it) => prices[it.product_id] !== "" && Number(prices[it.product_id]) >= 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/quotes/${quote.id}/reply`, {
        prices: quote.items.map((it) => ({ product_id: it.product_id, unit_price: Number(prices[it.product_id]) })),
        shipping: Number(shipping) || 0,
        include_iva: includeIva,
        validity_days: Number(validity),
        notes,
      });
      toast.success(`Cotización enviada a ${quote.customer.email}`);
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl" data-testid="quote-reply-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-800">
            Responder {quote.folio}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Para {quote.customer.nombre} · {quote.customer.email}
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" data-testid="quote-reply-form">
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Equipo</th>
                  <th className="px-3 py-2 text-center">Cant.</th>
                  <th className="px-3 py-2 text-right w-36">Precio unit.</th>
                  <th className="px-3 py-2 text-right w-32 hidden sm:table-cell">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.items.map((it) => (
                  <tr key={it.product_id}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{it.label}</p>
                      <p className="text-xs text-slate-400">{it.capacidad}</p>
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700">{it.qty}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0" step="0.01" required
                        value={prices[it.product_id] ?? ""}
                        onChange={(e) => setPrices((p) => ({ ...p, [it.product_id]: e.target.value }))}
                        placeholder="0.00"
                        className={inputCls}
                        data-testid={`reply-price-${it.product_id}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 hidden sm:table-cell">
                      {mxn((Number(prices[it.product_id]) || 0) * it.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Envío (MXN)</span>
              <input type="number" min="0" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="0.00" className={`${inputCls} mt-1`} data-testid="reply-shipping" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vigencia (días)</span>
              <input type="number" min="1" max="90" value={validity} onChange={(e) => setValidity(e.target.value)} className={`${inputCls} mt-1`} data-testid="reply-validity" />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={includeIva} onChange={(e) => setIncludeIva(e.target.checked)} className="w-4 h-4 accent-sky-600" data-testid="reply-iva" />
              Incluir IVA 16%
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas para el cliente</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1500} placeholder="Tiempo de entrega, condiciones de pago, garantía…" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" data-testid="reply-notes" />
          </label>

          <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm space-y-1" data-testid="reply-totals">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{mxn(totals.subtotal)}</span></div>
            {includeIva && <div className="flex justify-between text-slate-500"><span>IVA 16%</span><span>{mxn(totals.iva)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-slate-800">
              <span>Total</span><span className="text-emerald-600" data-testid="reply-total">{mxn(totals.total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-11 px-5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50" data-testid="reply-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={busy || !complete} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50" data-testid="reply-submit">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {busy ? "Enviando…" : quote.reply ? "Reenviar cotización" : "Enviar cotización"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteReplyDialog;
