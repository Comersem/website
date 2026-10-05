import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Plus, Minus, Trash2, Send, ArrowLeft, CheckCircle2, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useQuote } from "../context/QuoteContext";
import { COMPANY, buildWhatsappMessage } from "../mock";
import { api, apiError, resolveImg } from "../lib/api";

const EMPTY_FORM = { nombre: "", email: "", telefono: "", empresa: "", mensaje: "" };
const inputCls = "h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300";

const QuoteDrawer = () => {
  const qc = useQueryClient();
  const { items, open, setOpen, totalQty, setQty, removeItem, clear } = useQuote();
  const [step, setStep] = useState("items"); // items | form | done
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleOpenChange = (v) => {
    setOpen(v);
    if (!v && step === "done") {
      setStep("items");
      setResult(null);
      setForm(EMPTY_FORM);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/quotes", {
        customer: form,
        items: items.map((it) => ({ product_id: it.id, qty: it.qty })),
      });
      setResult({ folio: data.folio, items: [...items], email: form.email, emailSent: data.customer_email_sent });
      qc.invalidateQueries({ queryKey: ["popular"] });
      clear();
      setStep("done");
      toast.success(`Cotización ${data.folio} enviada`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const sendWhatsapp = (list) => {
    window.open(`https://wa.me/${COMPANY.whatsapp}?text=${buildWhatsappMessage(list)}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-white" data-testid="quote-drawer">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 text-left space-y-0">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-sky-600">{COMPANY.name}</p>
          <SheetTitle className="text-2xl font-extrabold text-slate-800 mt-1">
            {step === "form" ? "Tus datos" : step === "done" ? "¡Solicitud enviada!" : "Mi Cotización"}
          </SheetTitle>
        </SheetHeader>

        {step === "items" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center" data-testid="quote-empty">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-sky-400" />
                  </div>
                  <p className="mt-5 text-lg font-bold text-slate-700">Tu cotización está vacía</p>
                  <p className="mt-2 text-sm text-slate-400 max-w-xs">
                    Agrega refrigeradores desde el catálogo y envíanos tu solicitud
                  </p>
                </div>
              ) : (
                <div className="space-y-3" data-testid="quote-items">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3" data-testid={`quote-item-${it.id}`}>
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={resolveImg(it.img)} alt={it.label} className="max-w-full max-h-full object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{it.label}</p>
                        {it.capacidad && <p className="text-xs text-slate-400 truncate">{it.capacidad}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-full border border-slate-200 bg-white">
                            <button onClick={() => setQty(it.id, it.qty - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-sky-600" aria-label="Menos" data-testid={`qty-minus-${it.id}`}>
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold text-slate-700" data-testid={`qty-${it.id}`}>{it.qty}</span>
                            <button onClick={() => setQty(it.id, it.qty + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-sky-600" aria-label="Más" data-testid={`qty-plus-${it.id}`}>
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeItem(it.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50" aria-label="Eliminar" data-testid={`remove-${it.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={clear} className="w-full mt-1 text-xs font-semibold text-slate-400 hover:text-red-500 py-2" data-testid="quote-clear-btn">
                    Vaciar cotización
                  </button>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Total de equipos</span>
                <span className="text-2xl font-extrabold text-slate-800" data-testid="quote-total">{totalQty}</span>
              </div>
              <button
                disabled={items.length === 0}
                onClick={() => setStep("form")}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-full text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5 enabled:shadow-[0_10px_24px_rgba(46,125,91,0.35)]"
                style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
                data-testid="quote-continue-btn"
              >
                <Send className="w-4 h-4" />
                Continuar Cotización
              </button>
            </div>
          </>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="flex-1 flex flex-col" data-testid="quote-form">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              <p className="text-sm text-slate-500">
                Déjanos tus datos y nuestro equipo de ventas te enviará la cotización de {totalQty} equipo{totalQty === 1 ? "" : "s"}.
              </p>
              <input required minLength={2} value={form.nombre} onChange={set("nombre")} placeholder="Nombre completo *" className={inputCls} data-testid="quote-nombre" />
              <input required type="email" value={form.email} onChange={set("email")} placeholder="Correo electrónico *" className={inputCls} data-testid="quote-email" />
              <input required minLength={7} value={form.telefono} onChange={set("telefono")} placeholder="Teléfono / WhatsApp *" className={inputCls} data-testid="quote-telefono" />
              <input value={form.empresa} onChange={set("empresa")} placeholder="Empresa (opcional)" className={inputCls} data-testid="quote-empresa" />
              <textarea value={form.mensaje} onChange={set("mensaje")} rows={3} placeholder="Mensaje o detalles adicionales" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" data-testid="quote-mensaje" />
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
              <button type="button" onClick={() => setStep("items")} className="h-12 px-4 rounded-full border border-slate-200 text-slate-600 font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50" data-testid="quote-back-btn">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full text-white font-semibold shadow-[0_10px_24px_rgba(46,125,91,0.35)] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
                data-testid="quote-submit-btn"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {busy ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && result && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8" data-testid="quote-success">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="mt-6 text-lg font-bold text-slate-800">Recibimos tu solicitud</p>
            <p className="mt-1 text-sm text-slate-500">
              Folio <span className="font-mono font-bold text-sky-600" data-testid="quote-folio">{result.folio}</span>
            </p>
            <p className="mt-3 text-sm text-slate-400 max-w-xs" data-testid="quote-confirmation-note">
              {result.emailSent
                ? <>Te enviamos una copia con el detalle a <span className="font-semibold text-slate-600">{result.email}</span>.</>
                : "Nuestro equipo de ventas te contactará muy pronto."}{" "}
              ¿Prefieres continuar por WhatsApp?
            </p>
            <button
              onClick={() => sendWhatsapp(result.items)}
              className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full text-white font-semibold shadow-[0_10px_24px_rgba(46,125,91,0.35)] hover:-translate-y-0.5 transition-all"
              style={{ background: "linear-gradient(135deg,#2E7D5B 0%,#256649 100%)" }}
              data-testid="quote-whatsapp-btn"
            >
              <MessageCircle className="w-5 h-5" /> Enviar por WhatsApp
            </button>
            <button onClick={() => handleOpenChange(false)} className="mt-3 text-sm font-semibold text-slate-400 hover:text-slate-600" data-testid="quote-close-btn">
              Cerrar
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default QuoteDrawer;
