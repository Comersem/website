import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ page, pages, total, pageSize, onPage, testId = "pagination" }) => {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm" data-testid={testId}>
      <p className="text-slate-500" data-testid={`${testId}-range`}>
        Mostrando <span className="font-bold text-slate-700">{from}–{to}</span> de{" "}
        <span className="font-bold text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Página anterior"
          data-testid={`${testId}-prev`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 font-semibold text-slate-700" data-testid={`${testId}-page`}>
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Página siguiente"
          data-testid={`${testId}-next`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
