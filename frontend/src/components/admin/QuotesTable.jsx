import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Mail, Phone, Building2, MailCheck, MailX, Send, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "../../lib/api";
import QuoteReplyDialog, { mxn } from "./QuoteReplyDialog";

const STATUS = {
  nueva: { label: "Nueva", cls: "bg-emerald-50 text-emerald-700" },
  atendida: { label: "Atendida", cls: "bg-sky-50 text-sky-700" },
  cerrada: { label: "Cerrada", cls: "bg-slate-100 text-slate-500" },
};

const fmtDate = (iso) => new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

const QuoteRow = ({ q }) => {
  const qc = useQueryClient();
  const [openRow, setOpenRow] = useState(false);
  const [replying, setReplying] = useState(false);

  const setStatus = async (status) => {
    try {
      await api.patch(`/admin/quotes/${q.id}`, { status });
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success("Estado actualizado");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden" data-testid={`quote-row-${q.id}`}>
      <button onClick={() => setOpenRow((v) => !v)} className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-slate-50/70">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-sky-600">{q.folio}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[q.status]?.cls}`} data-testid={`quote-status-${q.id}`}>
              {STATUS[q.status]?.label}
            </span>
            {q.email_sent ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><MailCheck className="w-3.5 h-3.5" /> Ventas</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600"><MailX className="w-3.5 h-3.5" /> Ventas</span>
            )}
            {q.customer_email_sent ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600" data-testid={`quote-customer-mail-${q.id}`}><MailCheck className="w-3.5 h-3.5" /> Cliente</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600" data-testid={`quote-customer-mail-${q.id}`}><MailX className="w-3.5 h-3.5" /> Cliente</span>
            )}
            {q.reply && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700" data-testid={`quote-replied-${q.id}`}>
                <BadgeDollarSign className="w-3.5 h-3.5" /> {mxn(q.reply.total)}
              </span>
            )}
          </div>
          <p className="mt-1 font-bold text-slate-800 truncate">{q.customer.nombre}{q.customer.empresa ? ` · ${q.customer.empresa}` : ""}</p>
          <p className="text-xs text-slate-400">{fmtDate(q.created_at)} · {q.total_qty} equipo{q.total_qty === 1 ? "" : "s"}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openRow ? "rotate-180" : ""}`} />
      </button>
      {openRow && (
        <div className="border-t border-slate-100 px-4 sm:px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 text-sm text-slate-600 min-w-0">
            <p className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-slate-400 shrink-0" /> <a href={`mailto:${q.customer.email}`} className="hover:text-sky-600 truncate">{q.customer.email}</a></p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0" /> <a href={`tel:${q.customer.telefono}`} className="hover:text-sky-600">{q.customer.telefono}</a></p>
            {q.customer.empresa && <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400 shrink-0" /> {q.customer.empresa}</p>}
            {q.customer.mensaje && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-slate-600 italic">“{q.customer.mensaje}”</p>}
            <div className="pt-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</span>
              <select value={q.status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-full border border-slate-200 px-3 text-sm font-semibold" data-testid={`quote-status-select-${q.id}`}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {q.items.map((it) => {
                const line = q.reply?.lines?.find((l) => l.product_id === it.product_id);
                return (
                  <li key={it.product_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{it.label}</p>
                      <p className="text-xs text-slate-400">{it.capacidad}{line ? ` · ${mxn(line.unit_price)} c/u` : ""}</p>
                    </div>
                    <span className="font-extrabold text-slate-700 text-right">
                      ×{it.qty}
                      {line && <span className="block text-xs font-semibold text-emerald-600">{mxn(line.line_total)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {q.reply && (
              <p className="mt-2 text-xs text-slate-400" data-testid={`quote-reply-meta-${q.id}`}>
                Enviada {fmtDate(q.reply.sent_at)} · Total <span className="font-bold text-slate-700">{mxn(q.reply.total)}</span>
                {q.reply.include_iva ? " (IVA incluido)" : ""} · vigencia {q.reply.validity_days} días
              </p>
            )}
            <button
              onClick={() => setReplying(true)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              data-testid={`quote-reply-btn-${q.id}`}
            >
              <Send className="w-4 h-4" /> {q.reply ? "Editar y reenviar precios" : "Responder con precios"}
            </button>
          </div>
        </div>
      )}
      <QuoteReplyDialog quote={q} open={replying} onClose={() => setReplying(false)} />
    </div>
  );
};

const QuotesTable = ({ quotes, loading }) => {
  if (loading) return <p className="text-slate-400">Cargando cotizaciones…</p>;
  if (quotes.length === 0)
    return <p className="text-slate-400 rounded-2xl bg-white border border-slate-100 p-8 text-center" data-testid="quotes-empty">Aún no hay cotizaciones.</p>;
  return (
    <div className="space-y-3" data-testid="admin-quotes-list">
      {quotes.map((q) => <QuoteRow key={q.id} q={q} />)}
    </div>
  );
};

export default QuotesTable;
