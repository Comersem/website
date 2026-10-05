import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { COMPANY, QUICK_LINKS } from "../mock";
import { useCatalog } from "../hooks/useCatalog";

const Footer = () => {
  const { data: categories = [] } = useCatalog();
  const catTo = (key) => (key === "hielo" ? "/" : `/?cat=${key}`);
  return (
    <footer className="relative bg-[#0B2A4A] text-slate-200">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="inline-flex items-center" data-testid="footer-logo">
              <img
                src={COMPANY.logo}
                alt="COMERSEM"
                className="h-11 w-auto object-contain brightness-0 invert opacity-95"
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300/90 max-w-xs">
              {COMPANY.description}
            </p>
            <div className="mt-5 flex gap-2">
              {COMPANY.badges.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 rounded-md bg-white/10 text-xs font-semibold text-slate-100 border border-white/10 whitespace-nowrap"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2.5 text-sm">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-slate-300 hover:text-sky-300 transition-colors"
                    data-testid={`footer-link-${l.to.replace(/[^a-z]/gi, "") || "home"}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Categorías</h4>
            <ul className="space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.key}>
                  <Link
                    to={catTo(c.key)}
                    className="text-slate-300 hover:text-sky-300 transition-colors text-left"
                    data-testid={`footer-cat-${c.key}`}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="text-sm font-bold text-white mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-slate-300">
                <Phone className="w-4 h-4 text-sky-300 shrink-0" />
                <a href={`tel:${COMPANY.phoneRaw}`} className="hover:text-white" data-testid="footer-phone-link">
                  {COMPANY.phone}
                </a>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-sky-300 shrink-0" />
                <a href={`mailto:${COMPANY.email}`} className="hover:text-white break-words">
                  {COMPANY.email}
                </a>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <MapPin className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <span>{COMPANY.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-6 border-t border-white/10 text-center text-xs sm:text-sm text-slate-400">
          © {COMPANY.year} Comersem. Todos los derechos reservados. | {COMPANY.tagline}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
