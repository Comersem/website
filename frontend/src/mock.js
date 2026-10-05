// Static company info. Catalog and quotes now come from the backend API.
export const COMPANY = {
  name: "COMERSEM",
  tagline: "Refrigeración Comercial",
  description:
    "Empresa 100% Mexicana especializada en refrigeración comercial con 25 años de experiencia.",
  badges: ["ISO 9001", "25 años"],
  phone: "+52 33 1902 5608",
  phoneRaw: "+523319025608",
  whatsapp: "523319025608",
  email: "ventas@comersem.com.mx",
  address: "Prol. Gigantes #111, Tonalá, Jalisco",
  logo: "/logo.png",
  year: 2026,
};

export const QUICK_LINKS = [
  { label: "Inicio", to: "/" },
  { label: "Buscar equipos", to: "/buscar" },
  { label: "Más cotizados", to: "/?popular=1" },
];

// Helper to build a WhatsApp quote message from cart items
export const buildWhatsappMessage = (items) => {
  const lines = [
    "*Solicitud de Cotización — COMERSEM*",
    "",
    "Hola, me interesan los siguientes equipos:",
    "",
  ];
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.label}  (x${it.qty})`);
    if (it.capacidad) lines.push(`   ${it.capacidad}`);
  });
  const total = items.reduce((a, b) => a + b.qty, 0);
  lines.push("", `*Total de equipos: ${total}*`, "", "Quedo atento a su cotización. ¡Gracias!");
  return encodeURIComponent(lines.join("\n"));
};
