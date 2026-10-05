import React, { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api, apiError, resolveImg } from "../../lib/api";

const ImageUpload = ({ value, onChange, label = "Fotografía del equipo" }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    try {
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url);
      toast.success("Imagen subida");
    } catch (e) {
      toast.error(apiError(e, "No se pudo subir la imagen"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
      <div className="flex items-start gap-4">
        <div className="w-28 h-28 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative shrink-0">
          {value ? (
            <>
              <img src={resolveImg(value)} alt="" className="max-w-full max-h-full object-contain p-1" data-testid="image-upload-preview" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500"
                aria-label="Quitar imagen"
                data-testid="image-upload-clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Camera className="w-7 h-7 text-slate-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
            data-testid="image-upload-input"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            data-testid="image-upload-btn"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {busy ? "Subiendo…" : "Subir foto"}
          </button>
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="o pega una URL de imagen"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            data-testid="image-url-input"
          />
          <p className="text-[11px] text-slate-400">PNG, JPG o WEBP · máx. 8 MB</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
