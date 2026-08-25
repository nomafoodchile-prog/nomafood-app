'use client'

import { useEffect, useState, type FormEvent, type CSSProperties, type ReactNode } from 'react'
import {
  Sprout, Leaf, Snowflake, ArrowRight, Factory, Sparkles,
  GraduationCap, Coffee, Building2, Store, ShoppingBag, Award, Handshake,
  MapPin, Mail, Check, ChevronDown, MessageCircle, Gift,
  TrendingUp, PackageCheck, Star, CalendarClock, Cookie, CreditCard, Menu, X, Ship,
} from 'lucide-react'
import ImportacionSection from '@/components/ImportacionSection'

type Row = Record<string, unknown>
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const clp = (v: unknown) => {
  const n = Number(v)
  return Number.isNaN(n) || !n ? 'Consultar' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

// Paleta NOMMA FOOD
const NAVY = '#16233f'
const NAVY_DEEP = '#0f1b31'
const CREAM = '#f6f3ec'
const WARM = '#fbf9f4'
const GOLD = '#c9a24e'
const GOLD_SOFT = '#e2ca8f'
const OLIVE = '#5c6b4a'
const MUTED = '#6b6a63'
const LINE = '#eae5d8'

// WhatsApp comercial de NOMMA FOOD.
const WHATSAPP_URL = 'https://wa.me/56941104151'

const serif = "Georgia, 'Times New Roman', serif"

// Navegación principal — orden y anchors oficiales de la landing.
const NAV = [
  { t: 'Nosotros', h: '#nosotros', icon: Factory },
  { t: 'Productos', h: '#productos', icon: Cookie },
  { t: 'Importación', h: '#importacion', icon: Ship },
  { t: 'NOMMA CARD', h: '#nomma-card', icon: CreditCard },
  { t: 'Trabajemos juntos', h: '#solicitud-mayorista', icon: Handshake },
]

function ProductCard({ p }: { p: Row }) {
  const fotos = [
    { url: S(p.foto_oficial_url), label: 'Producto' },
    { url: S(p.foto_empaque_url), label: 'Empaque' },
  ].filter(x => x.url)
  const [idx, setIdx] = useState(0)
  const activa = fotos[idx]?.url
  return (
    <div className="nf-card" style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 210, background: '#f0eee6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
        {activa
          ? <img src={activa} alt={S(p.nombre)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          : <Sprout size={38} color={GOLD} />}
      </div>
      {fotos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 10px 0' }}>
          {fotos.map((ph, i) => (
            <button key={ph.label} type="button" onClick={() => setIdx(i)} aria-label={ph.label}
              style={{ flex: 1, cursor: 'pointer', border: `1.5px solid ${i === idx ? GOLD : LINE}`, borderRadius: 8, overflow: 'hidden', background: '#fff', padding: 0, position: 'relative', height: 46 }}>
              <img src={ph.url} alt={ph.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: i === idx ? 1 : .55, display: 'block' }} />
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#fff', background: 'rgba(22,35,63,.6)', padding: '1px 0', textAlign: 'center' }}>{ph.label}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, marginBottom: 5 }}>{S(p.nombre)}</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, flex: 1 }}>{S(p.descripcion_publica)}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
          <span style={{ fontWeight: 800, color: GOLD, fontSize: 18 }}>{clp(p.precio_venta)}</span>
          {p.unidad_venta ? <span style={{ fontSize: 12, color: '#a5a29a' }}>/ {S(p.unidad_venta)}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [prods, setProds] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/landing/productos')
      .then(r => r.json())
      .then((d: Row) => { setProds((d.productos as Row[]) || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Registro de visita (analítica propia): fuente, campaña y UTMs.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      let vid = localStorage.getItem('nf_vid')
      if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('nf_vid', vid) }
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          path: window.location.pathname,
          referrer: document.referrer || null,
          utm_source: q.get('utm_source'),
          utm_medium: q.get('utm_medium'),
          utm_campaign: q.get('utm_campaign'),
          visitor_id: vid,
        }),
      }).catch(() => {})
    } catch { /* no romper la landing por analítica */ }
  }, [])

  const categorias = [...new Set(prods.map(p => S(p.categoria) || 'Otros'))]

  return (
    <div style={{ background: CREAM, color: NAVY, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        html { scroll-behavior: smooth; }
        .nf-sec { scroll-margin-top: 78px; }
        .nf-wrap { max-width: 1140px; margin: 0 auto; padding-left: 22px; padding-right: 22px; }
        .nf-hero { display: grid; grid-template-columns: 1.05fr .95fr; gap: 46px; align-items: center; }
        .nf-points { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; }
        .nf-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .nf-foot { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; }
        .nf-navlinks { display: flex; gap: 24px; align-items: center; }
        .nf-navbtns { display: flex; }
        .nf-burger { display: none; }
        .nf-navlink:hover { opacity: 1 !important; }
        .nf-btn { transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
        .nf-btn:hover { transform: translateY(-2px); }
        .nf-card { transition: transform .18s ease, box-shadow .18s ease; }
        .nf-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(22,35,63,.10); }
        .nf-faq input { display: none; }
        .nf-faq .nf-a { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
        .nf-faq input:checked ~ .nf-a { max-height: 320px; }
        .nf-faq input:checked ~ label .nf-chev { transform: rotate(180deg); }
        @media (max-width: 900px) {
          .nf-hero, .nf-points, .nf-foot, .nf-form-grid { grid-template-columns: 1fr; }
          .nf-navlinks, .nf-navbtns { display: none; }
          .nf-burger { display: inline-flex; align-items: center; }
          .nf-h1 { font-size: 38px !important; }
        }
      ` }} />

      {/* ══ 1. HEADER ══ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(22,35,63,.96)', backdropFilter: 'blur(8px)', color: '#fff', borderBottom: `1px solid rgba(201,162,78,.25)` }}>
        <div className="nf-wrap" style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64 }}>
          <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: '#fff' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(201,162,78,.35)' }}><Sprout size={22} color={NAVY} /></div>
            <div>
              <div style={{ fontWeight: 800, letterSpacing: 2, fontSize: 16 }}>NOMMA FOOD</div>
              <div style={{ fontSize: 10.5, opacity: .65, letterSpacing: .5 }}>Alma Libre Grupo SpA</div>
            </div>
          </a>
          <div style={{ flex: 1 }} />

          {/* Navegación desktop */}
          <nav className="nf-navlinks">
            {NAV.map(({ t, h, icon: Ic }) => (
              <a key={h} href={h} className="nf-navlink" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, opacity: .85, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Ic size={16} color={GOLD_SOFT} strokeWidth={1.75} /> {t}
              </a>
            ))}
          </nav>

          {/* Botones desktop */}
          <div className="nf-navbtns" style={{ alignItems: 'center', gap: 10, marginLeft: 8 }}>
            <a href="/portal/mayoristas/login" className="nf-btn" style={{ color: '#fff', textDecoration: 'none', fontSize: 13.5, fontWeight: 600, padding: '9px 15px', borderRadius: 9, border: '1px solid rgba(255,255,255,.28)' }}>Ingresar</a>
            <a href="#solicitud-mayorista" className="nf-btn" style={{ background: GOLD, color: NAVY, textDecoration: 'none', fontSize: 13.5, fontWeight: 700, padding: '10px 16px', borderRadius: 9 }}>Solicitar cuenta</a>
          </div>

          {/* Botón hamburguesa (solo móvil) */}
          <button className="nf-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú" aria-expanded={menuOpen} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.28)', borderRadius: 9, color: '#fff', padding: 8, cursor: 'pointer' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Menú desplegable móvil */}
        <div className="nf-mobile-menu" style={{ display: menuOpen ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,.12)', background: NAVY_DEEP }}>
          <div className="nf-wrap" style={{ padding: '10px 22px 18px' }}>
            {NAV.map(({ t, h, icon: Ic }) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none', fontSize: 15.5, fontWeight: 600, padding: '13px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <Ic size={19} color={GOLD_SOFT} strokeWidth={1.75} /> {t}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a href="/portal/mayoristas/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.28)' }}>Ingresar</a>
              <a href="#solicitud-mayorista" onClick={() => setMenuOpen(false)} style={{ flex: 1, textAlign: 'center', background: GOLD, color: NAVY, textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 10 }}>Solicitar cuenta</a>
            </div>
          </div>
        </div>
      </header>

      {/* ══ 2. HERO ══ */}
      <section className="nf-sec" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,162,78,.22), transparent 70%)' }} />
        <div className="nf-wrap nf-hero" style={{ paddingTop: 70, paddingBottom: 74, position: 'relative' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,162,78,.14)', border: `1px solid rgba(201,162,78,.4)`, color: GOLD_SOFT, padding: '7px 15px', borderRadius: 30, fontSize: 13, fontWeight: 600, marginBottom: 22 }}>
              <Leaf size={15} /> Productos vegetarianos y veganos para canal mayorista
            </div>
            <h1 className="nf-h1" style={{ fontFamily: serif, fontSize: 52, lineHeight: 1.08, margin: '0 0 20px', fontWeight: 700 }}>
              Productos clásicos e innovadores, <span style={{ color: GOLD }}>listos para vender.</span>
            </h1>
            <p style={{ fontSize: 18.5, color: 'rgba(255,255,255,.82)', maxWidth: 520, lineHeight: 1.6, marginBottom: 30 }}>
              Abastecimiento mayorista para negocios que buscan calidad, presentación y una propuesta distinta. Sabores innovadores, cadena de frío y atención cercana.
            </p>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', marginBottom: 30 }}>
              <a href="#solicitud-mayorista" className="nf-btn" style={{ background: GOLD, color: NAVY, textDecoration: 'none', fontWeight: 700, padding: '15px 28px', borderRadius: 11, display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5, boxShadow: '0 10px 26px rgba(201,162,78,.35)' }}>
                Solicitar cuenta mayorista <ArrowRight size={18} />
              </a>
              <a href="#productos" className="nf-btn" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '15px 26px', borderRadius: 11, border: '1px solid rgba(255,255,255,.22)', display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5 }}>
                <ShoppingBag size={18} /> Ver catálogo
              </a>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[[<Sparkles key="f" size={16} color={GOLD_SOFT} />, 'Sabores innovadores'], [<Snowflake key="s" size={16} color={GOLD_SOFT} />, 'Cadena de frío'], [<CalendarClock key="c" size={16} color={GOLD_SOFT} />, 'Despacho programado']].map(([ic, tx], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'rgba(255,255,255,.78)' }}>{ic}{tx}</div>
              ))}
            </div>
          </div>

          {/* Composición visual derecha */}
          <div style={{ position: 'relative' }}>
            <div style={{ background: 'linear-gradient(150deg, rgba(255,255,255,.10), rgba(255,255,255,.03))', border: '1px solid rgba(255,255,255,.16)', borderRadius: 26, padding: 22, backdropFilter: 'blur(4px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { i: <Leaf size={30} color={NAVY} />, bg: '#e8efd8', t: 'Línea salada' },
                  { i: <Sparkles size={30} color={NAVY} />, bg: '#f3e4c4', t: 'Pastelería' },
                  { i: <Sprout size={30} color={NAVY} />, bg: '#dfe7e2', t: 'Panadería' },
                  { i: <Snowflake size={30} color={NAVY} />, bg: '#d9e5ef', t: 'Congelados' },
                ].map((c, i) => (
                  <div key={i} style={{ background: c.bg, borderRadius: 16, padding: '26px 16px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 10 }}>{c.i}</div>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{c.t}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, background: GOLD, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <MapPin size={22} color={NAVY} />
                <div>
                  <div style={{ fontWeight: 800, color: NAVY, fontSize: 14.5 }}>Próximamente con envíos a regiones</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(22,35,63,.75)' }}>Hoy despachamos en la Región Metropolitana</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 3. BENEFICIOS PRINCIPALES ══ */}
      <section id="nosotros" className="nf-sec" style={{ background: WARM }}>
        <div className="nf-wrap" style={{ padding: '68px 22px' }}>
          <div style={{ textAlign: 'center' }}>
            <Eyebrow>Nuestra propuesta</Eyebrow>
            <H2>Reinventamos lo que ya se vende</H2>
            <p style={{ color: MUTED, maxWidth: 660, margin: '0 auto 30px', fontSize: 17, lineHeight: 1.7 }}>
              No inventamos categorías nuevas: tomamos productos que tu cliente ya conoce y quiere, y los llevamos a otro nivel — mejores ingredientes y sabores nuevos.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[[<Sparkles key="a" size={16} color={OLIVE} />, 'Sabores nuevos'], [<Snowflake key="b" size={16} color={OLIVE} />, 'Cadena de frío'], [<Handshake key="c" size={16} color={OLIVE} />, 'Atención cercana']].map(([ic, tx], i) => (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 30, padding: '10px 18px', fontWeight: 700, fontSize: 14, color: NAVY }}>{ic}{tx}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 4. PRESENCIA COMERCIAL / PRUEBA SOCIAL ══ */}
      <section className="nf-sec" style={{ background: NAVY, color: '#fff' }}>
        <div className="nf-wrap" style={{ padding: '62px 22px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: GOLD_SOFT, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
            <Star size={15} /> Presencia comercial real
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>Nuestra propuesta ya está presente en canales reales</h2>
          <p style={{ color: 'rgba(255,255,255,.72)', maxWidth: 640, margin: '0 auto 34px', fontSize: 16, lineHeight: 1.6 }}>
            Productos NOMMA FOOD presentes en casinos y puntos de venta de universidades como:
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            {[
              { name: 'UBO', file: 'ubo.png', label: '' },
              { name: 'DUOC', file: 'duoc.svg', label: '' },
              { name: 'Universidad de Chile', file: 'uchile.svg', label: 'Universidad de Chile' },
            ].map(u => (
              <div key={u.name} style={{ background: '#fff', border: '1px solid rgba(255,255,255,.16)', borderRadius: 14, padding: '16px 26px', minHeight: 74, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Logo real; si aún no está el archivo, cae al texto + ícono automáticamente */}
                  <img
                    src={`/logos/${u.file}`}
                    alt={u.name}
                    style={{ height: 40, maxWidth: 170, objectFit: 'contain', display: 'block' }}
                    onError={e => { const t = e.currentTarget; t.style.display = 'none'; const fb = t.nextElementSibling as HTMLElement | null; if (fb) fb.style.display = 'inline-flex' }}
                  />
                  <span style={{ display: 'none', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16, color: NAVY }}>
                    <GraduationCap size={20} color={GOLD} /> {u.name}
                  </span>
                </div>
                {u.label ? <span style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, letterSpacing: .3 }}>{u.label}</span> : null}
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 14.5, marginBottom: 22 }}>Pensado para negocios que buscan una oferta atractiva y confiable:</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[[<GraduationCap key="g" size={17} />, 'Universidades'], [<Store key="s" size={17} />, 'Minimarkets'], [<Coffee key="c" size={17} />, 'Cafeterías'], [<Building2 key="b" size={17} />, 'Oficinas'], [<ShoppingBag key="t" size={17} />, 'Tiendas de conveniencia']].map(([ic, tx], i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,162,78,.12)', color: GOLD_SOFT, padding: '8px 16px', borderRadius: 24, fontSize: 14, fontWeight: 600 }}>{ic}{tx}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5. PRODUCTOS / CATEGORÍAS ══ */}
      <section id="productos" className="nf-sec" style={{ background: CREAM }}>
        <div className="nf-wrap" style={{ padding: '68px 22px' }}>
          <Eyebrow>Catálogo</Eyebrow>
          <H2>Nuestros productos</H2>
          <p style={{ textAlign: 'center', color: MUTED, marginBottom: 44, fontSize: 16.5 }}>Soluciones listas para comercializar, hechas con amor.</p>

          {loading
            ? <p style={{ textAlign: 'center', color: '#aaa' }}>Cargando catálogo…</p>
            : prods.length === 0
              ? <ProductosPlaceholder />
              : categorias.map(cat => (
                <div key={cat} style={{ marginBottom: 44 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: `2px solid ${GOLD_SOFT}`, display: 'inline-block', paddingRight: 30 }}>{cat}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(238px, 1fr))', gap: 20 }}>
                    {prods.filter(p => (S(p.categoria) || 'Otros') === cat).map(p => (
                      <ProductCard key={S(p.id)} p={p} />
                    ))}
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* ══ 7. BENEFICIOS DE TRABAJAR CON NOSOTROS ══ */}
      <section className="nf-sec" style={{ background: CREAM }}>
        <div className="nf-wrap" style={{ padding: '68px 22px' }}>
          <Eyebrow>Más que un proveedor</Eyebrow>
          <H2>Beneficios de trabajar con nosotros</H2>
          <p style={{ textAlign: 'center', color: MUTED, maxWidth: 660, margin: '0 auto 44px', fontSize: 16.5, lineHeight: 1.6 }}>
            No solo vendemos productos: queremos entender tu negocio y ayudar a que tu vitrina venda mejor.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {[
              { i: <Handshake size={22} color={GOLD} />, t: 'Relación cercana', d: 'Nos importan las personas detrás de cada empresa. Construimos vínculos, no solo pedidos.' },
              { i: <TrendingUp size={22} color={GOLD} />, t: 'Acompañamiento comercial', d: 'Te ayudamos a elegir el mix correcto para tu canal y tu público.' },
              { i: <PackageCheck size={22} color={GOLD} />, t: 'Productos para rotación', d: 'Formatos y presentaciones pensados para vender rápido y bien.' },
              { i: <Sparkles size={22} color={GOLD} />, t: 'Presentación atractiva', d: 'Una propuesta que hace que tu vitrina y tu negocio se vean mejor.' },
              { i: <Award size={22} color={GOLD} />, t: 'Calidad + propuesta comercial', d: 'Sabor y calidad, con la mirada puesta en el resultado de tu negocio.' },
              { i: <Building2 size={22} color={GOLD} />, t: 'Soluciones por canal', d: 'Adaptamos la oferta a universidades, cafeterías, oficinas y más.' },
            ].map((b, i) => (
              <div key={i} className="nf-card" style={{ background: '#fff', borderRadius: 16, padding: 26, border: `1px solid ${LINE}`, display: 'flex', gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{b.i}</div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 15.5 }}>{b.t}</div>
                  <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{b.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. NOMMA CARD ══ */}
      <section id="nomma-card" className="nf-sec" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`, color: '#fff' }}>
        <div className="nf-wrap nf-points" style={{ padding: '74px 22px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: GOLD_SOFT, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
              <Gift size={16} /> Programa de fidelización
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 38, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.12 }}>Tu negocio también gana con cada compra</h2>
            <p style={{ color: 'rgba(255,255,255,.82)', fontSize: 17, lineHeight: 1.65, marginBottom: 26 }}>
              Con <strong style={{ color: GOLD }}>NOMMA CARD</strong> acumulas beneficios reales por cada pedido. Convierte tus compras en nuevas oportunidades para tu negocio.
            </p>
            <div style={{ display: 'grid', gap: 14, marginBottom: 8 }}>
              {[
                'Acumulas automáticamente 1,5% del monto neto de cada compra.',
                'Los puntos se acreditan solo cuando el pedido fue entregado con éxito.',
                'No se acreditan al momento de comprar: así evitamos errores por cancelación o incidencia.',
                'Canjeas tus beneficios desde 10.000 puntos acumulados.',
                'Los puntos se canjean por productos o descuentos en futuras compras.',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(201,162,78,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Check size={15} color={GOLD} /></div>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,.9)', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta premium + barra de progreso */}
          <div>
            <div style={{
              background: `linear-gradient(135deg, #1f3355 0%, #16233f 55%, #101a31 100%)`,
              border: '1px solid rgba(201,162,78,.4)', borderRadius: 20, padding: 26, aspectRatio: '1.6 / 1',
              boxShadow: '0 26px 60px rgba(0,0,0,.4)', position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,162,78,.28), transparent 70%)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <div style={{ fontWeight: 800, letterSpacing: 2, fontSize: 15 }}>NOMMA CARD</div>
                  <div style={{ fontSize: 11, opacity: .6, letterSpacing: 1 }}>NOMMA FOOD · Cliente mayorista</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sprout size={22} color={NAVY} /></div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 46, height: 34, borderRadius: 7, background: 'linear-gradient(135deg, #d9bd7e, #b8933f)', marginBottom: 16, opacity: .9 }} />
                <div style={{ fontSize: 11, opacity: .6, letterSpacing: 2, marginBottom: 3 }}>NEGOCIO</div>
                <div style={{ fontFamily: serif, fontSize: 20, letterSpacing: 1 }}>Nombre de tu negocio</div>
              </div>
            </div>

            {/* Progreso */}
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 16, padding: 20, marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.75)' }}>Progreso hacia tu primer canje</span>
                <span style={{ fontWeight: 800, color: GOLD }}>7.500 <span style={{ opacity: .5, fontWeight: 500 }}>/ 10.000 pts</span></span>
              </div>
              <div style={{ height: 12, borderRadius: 8, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                <div style={{ width: '75%', height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${GOLD_SOFT}, ${GOLD})` }} />
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 10 }}>Te faltan 2.500 puntos para canjear tu primer beneficio.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 9. CÓMO FUNCIONA ══ */}
      <section id="como" className="nf-sec" style={{ background: WARM }}>
        <div className="nf-wrap" style={{ padding: '68px 22px' }}>
          <Eyebrow>Simple y transparente</Eyebrow>
          <H2>Cómo funciona</H2>
          <p style={{ textAlign: 'center', color: MUTED, marginBottom: 46, fontSize: 16.5 }}>Cinco pasos para empezar a comprar al por mayor.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {[
              ['Solicita tu cuenta', 'Completa el formulario mayorista con los datos de tu negocio.'],
              ['Revisamos tu solicitud', 'Validamos la información y te contactamos a la brevedad.'],
              ['Te damos acceso', 'Habilitamos tu cuenta en el portal mayorista privado.'],
              ['Compras en línea', 'Explora el catálogo y arma tu pedido desde tu cuenta.'],
              ['Coordinamos despacho', 'Acordamos entrega según la frecuencia de tu negocio.'],
            ].map(([t, d], i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 22, border: `1px solid ${LINE}`, position: 'relative' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: NAVY, color: GOLD, fontFamily: serif, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{i + 1}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{t}</div>
                <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 10. FORMULARIO MAYORISTA ══ */}
      <FormularioMayorista />

      {/* ══ 10.b CANAL DE IMPORTACIÓN ══ */}
      <ImportacionSection />

      {/* ══ 11. FAQ ══ */}
      <section className="nf-sec" style={{ background: WARM }}>
        <div className="nf-wrap" style={{ padding: '66px 22px', maxWidth: 820 }}>
          <Eyebrow>Preguntas frecuentes</Eyebrow>
          <H2>Resolvemos tus dudas</H2>
          <div style={{ marginTop: 36, display: 'grid', gap: 12 }}>
            {[
              ['¿Cómo solicito una cuenta mayorista?', 'Completa el formulario de esta página con los datos de tu negocio. Revisamos tu solicitud y te contactamos para habilitar tu acceso al portal mayorista.'],
              ['¿Atienden universidades, minimarkets o cafeterías?', 'Sí. Nuestra propuesta está pensada para universidades, minimarkets, cafeterías, oficinas y tiendas de conveniencia, entre otros canales.'],
              ['¿Hacen despacho?', 'Sí, con despacho programado según la frecuencia de tu negocio. Hoy operamos en la Región Metropolitana.'],
              ['¿Próximamente enviarán a regiones?', 'Estamos preparando el despacho a regiones. Muy pronto podremos llegar a más zonas del país.'],
              ['¿Puedo importar productos desde el extranjero con NOMMA FOOD?', 'Sí. Tenemos un canal de importación para traer productos desde el extranjero. Cuéntanos qué buscas en la sección Importación y te ayudamos con la cotización y el proceso.'],
              ['¿Cómo funciona el proceso de importación?', 'Nos dices qué producto te interesa y coordinamos la cotización, los tiempos y el despacho. Te acompañamos en todo el proceso para que importar sea simple y seguro.'],
              ['¿Cómo funciona NOMMA CARD?', 'Acumulas 1,5% del monto neto de cada compra. Los puntos se acreditan al entregar el pedido con éxito y puedes canjearlos desde 10.000 puntos por productos o descuentos.'],
              ['¿Cuál es el beneficio de trabajar con NOMMA FOOD?', 'Además de la calidad y presentación comercial, ofrecemos acompañamiento cercano, productos pensados para rotación y una relación comercial de largo plazo.'],
            ].map(([q, a], i) => (
              <div key={i} className="nf-faq" style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
                <input type="checkbox" id={`faq-${i}`} />
                <label htmlFor={`faq-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 15.5 }}>
                  {q}
                  <ChevronDown className="nf-chev" size={20} color={GOLD} style={{ transition: 'transform .3s ease', flexShrink: 0 }} />
                </label>
                <div className="nf-a">
                  <div style={{ padding: '0 22px 20px', color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 12. CTA FINAL ══ */}
      <section style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -140, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,162,78,.18), transparent 70%)' }} />
        <div className="nf-wrap" style={{ padding: '74px 22px', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontFamily: serif, fontSize: 38, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.15 }}>Haz crecer tu negocio con una propuesta atractiva y confiable</h2>
          <p style={{ color: 'rgba(255,255,255,.82)', fontSize: 18, maxWidth: 600, margin: '0 auto 30px', lineHeight: 1.6 }}>
            Descubre la propuesta de NOMMA FOOD para tu canal de venta.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#solicitud-mayorista" className="nf-btn" style={{ background: GOLD, color: NAVY, textDecoration: 'none', fontWeight: 700, padding: '15px 30px', borderRadius: 11, display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5, boxShadow: '0 10px 26px rgba(201,162,78,.35)' }}>
              Solicitar cuenta mayorista <ArrowRight size={18} />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="nf-btn" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '15px 28px', borderRadius: 11, border: '1px solid rgba(255,255,255,.24)', display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5 }}>
              <MessageCircle size={18} /> Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ══ 13. FOOTER ══ */}
      <footer style={{ background: NAVY_DEEP, color: '#fff' }}>
        <div className="nf-wrap nf-foot" style={{ padding: '52px 22px 20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sprout size={22} color={NAVY} /></div>
              <div>
                <div style={{ fontWeight: 800, letterSpacing: 2 }}>NOMMA FOOD</div>
                <div style={{ fontSize: 11, opacity: .6 }}>Alma Libre Grupo SpA</div>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,.62)', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
              Productos vegetarianos y veganos de calidad, listos para comercializar. Hechos y seleccionados con cariño, en Santiago de Chile.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, letterSpacing: .5 }}>Contacto</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 14, color: 'rgba(255,255,255,.72)' }}>
              <a href="mailto:nommafood.cl@gmail.com" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}><Mail size={16} color={GOLD} /> nommafood.cl@gmail.com</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}><MessageCircle size={16} color={GOLD} /> +56 9 4110 4151</a>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><MapPin size={16} color={GOLD} /> Santiago, Chile</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, letterSpacing: .5 }}>Enlaces</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 14, color: 'rgba(255,255,255,.72)' }}>
              <a href="#productos" style={{ color: 'inherit', textDecoration: 'none' }}>Productos</a>
              <a href="#nomma-card" style={{ color: 'inherit', textDecoration: 'none' }}>NOMMA CARD</a>
              <a href="#solicitud-mayorista" style={{ color: 'inherit', textDecoration: 'none' }}>Solicitar cuenta mayorista</a>
              <a href="/portal/mayoristas/login" style={{ color: 'inherit', textDecoration: 'none' }}>Ingresar al portal</a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div className="nf-wrap" style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>
            <span>© {'2026'} NOMMA FOOD · Alma Libre Grupo SpA. Todos los derechos reservados.</span>
            <span>Hecho con amor 🌿 en Chile</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Helpers de presentación ──
function Eyebrow({ children }: { children: ReactNode }) {
  return <div style={{ textAlign: 'center', color: GOLD, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}
function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, textAlign: 'center', margin: '0 0 8px', lineHeight: 1.15 }}>{children}</h2>
}

function ProductosPlaceholder() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(238px, 1fr))', gap: 20 }}>
      {['Línea salada', 'Pastelería', 'Panadería', 'Congelados'].map((t, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 16, border: `1px dashed ${GOLD_SOFT}`, overflow: 'hidden' }}>
          <div style={{ height: 158, background: 'linear-gradient(135deg, #efe9db, #f6f3ec)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sprout size={38} color={GOLD} /></div>
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 5 }}>{t}</div>
            <div style={{ fontSize: 13, color: MUTED }}>Próximamente publicaremos esta categoría. 🌱</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Formulario mayorista (in-page) → /api/mayoristas/solicitud → Comercial > Solicitudes ──
function FormularioMayorista() {
  const empty = {
    empresa: '', rut: '', giro: '', nombre: '', cargo: '', telefono: '', email: '',
    direccion: '', direccion_despacho: '', comuna: '', tipo_cliente: '',
    cantidad_sucursales: '',
    productos_interes: '', volumen_estimado: '', comentario: '',
    dias_atencion: '', horario_atencion: '',
    consentimiento: false, website: '', // website = honeypot anti-spam
  }
  const [f, setF] = useState(empty)
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [numero, setNumero] = useState('')

  const set = (k: string, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setEstado('enviando'); setMsg('')
    // La dirección de despacho se anexa al comentario (la central la ve completa).
    const comentario = [
      f.direccion_despacho ? `Dirección de despacho: ${f.direccion_despacho}.` : '',
      f.comentario,
    ].filter(Boolean).join(' ')
    // Días + horario de atención se combinan en horario_recepcion (campo existente).
    const horario_recepcion = [f.dias_atencion, f.horario_atencion].filter(Boolean).join(' · ') || null
    try {
      const r = await fetch('/api/mayoristas/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: f.empresa, rut: f.rut, giro: f.giro, nombre: f.nombre,
          cargo: f.cargo, telefono: f.telefono, email: f.email,
          direccion: f.direccion, comuna: f.comuna, tipo_cliente: f.tipo_cliente,
          cantidad_sucursales: f.cantidad_sucursales,
          productos_interes: f.productos_interes, volumen_estimado: f.volumen_estimado,
          horario_recepcion,
          comentario, consentimiento: f.consentimiento, website: f.website,
          origen: 'landing',
        }),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        setEstado('ok'); setNumero(S(d.numero)); setF(empty)
      } else {
        setEstado('error'); setMsg(S(d.error) || 'No pudimos registrar tu solicitud. Intenta de nuevo.')
      }
    } catch {
      setEstado('error'); setMsg('Hubo un problema de conexión. Intenta nuevamente.')
    }
  }

  const inputStyle: CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 14.5, background: '#fff', color: NAVY, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6, display: 'block' }

  // Función (no componente) para no remontar inputs en cada tecla y perder el foco.
  const field = (k: string, label: string, opts: { type?: string; full?: boolean; ph?: string } = {}) => (
    <div key={k} style={{ gridColumn: opts.full ? '1 / -1' : 'auto' }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={opts.type || 'text'} value={S((f as Row)[k])} onChange={e => set(k, e.target.value)} placeholder={opts.ph || ''} required={['empresa', 'rut', 'giro', 'nombre', 'cargo', 'telefono', 'email', 'direccion', 'comuna', 'tipo_cliente', 'volumen_estimado', 'horario_atencion'].includes(k)} />
    </div>
  )

  if (estado === 'ok') {
    return (
      <section id="solicitud-mayorista" className="nf-sec" style={{ background: CREAM }}>
        <div className="nf-wrap" style={{ padding: '70px 22px', maxWidth: 720 }}>
          <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${LINE}`, padding: 44, textAlign: 'center', boxShadow: '0 20px 50px rgba(22,35,63,.08)' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#e8efd8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Check size={34} color={OLIVE} /></div>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 12 }}>¡Solicitud recibida! 🌿</h2>
            <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 8px' }}>
              Gracias por tu interés en NOMMA FOOD. Revisaremos tu solicitud y te contactaremos a la brevedad para habilitar tu cuenta mayorista.
            </p>
            {numero ? <p style={{ color: NAVY, fontWeight: 700, marginTop: 12 }}>N° de solicitud: {numero}</p> : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="solicitud-mayorista" className="nf-sec" style={{ background: CREAM }}>
      <div className="nf-wrap" style={{ padding: '70px 22px', maxWidth: 860 }}>
        <Eyebrow>Únete al canal mayorista</Eyebrow>
        <H2>Solicita tu cuenta mayorista</H2>
        <p style={{ textAlign: 'center', color: MUTED, maxWidth: 560, margin: '0 auto 40px', fontSize: 16.5, lineHeight: 1.6 }}>
          Cuéntanos sobre tu negocio. Revisamos cada solicitud con atención y te contactamos para habilitar tu acceso.
        </p>

        <form onSubmit={submit} style={{ background: '#fff', borderRadius: 20, border: `1px solid ${LINE}`, padding: 30, boxShadow: '0 20px 50px rgba(22,35,63,.07)' }}>
          <div className="nf-form-grid">
            {field('empresa', 'Razón social *', { ph: 'Ej: Comercial Los Andes SpA' })}
            {field('rut', 'RUT *', { ph: '76.123.456-7' })}
            {field('giro', 'Giro *', { ph: 'Ej: Cafetería, minimarket…' })}
            {field('nombre', 'Nombre de contacto *')}
            {field('cargo', 'Cargo *', { ph: 'Ej: Dueño, administrador…' })}
            {field('telefono', 'Teléfono *', { type: 'tel', ph: '+56 9 …' })}
            {field('email', 'Correo *', { type: 'email', ph: 'tu@correo.cl' })}
            {field('comuna', 'Comuna *')}
            {field('direccion', 'Dirección de facturación *', { full: true })}
            {field('direccion_despacho', 'Dirección de despacho', { full: true, ph: 'Si es distinta a la de facturación' })}
            {field('cantidad_sucursales', 'Cantidad de sucursales', { type: 'number', ph: 'Ej: 1 si tienes un solo local' })}
            <div>
              <label style={labelStyle}>Tipo de negocio *</label>
              <select style={inputStyle} value={f.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)} required>
                <option value="">Selecciona…</option>
                {['Universidad', 'Minimarket', 'Cafetería', 'Oficina', 'Tienda de conveniencia', 'Restaurante', 'Casino', 'Otro'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Frecuencia estimada de compra *</label>
              <select style={inputStyle} value={f.volumen_estimado} onChange={e => set('volumen_estimado', e.target.value)} required>
                <option value="">Selecciona…</option>
                {['Semanal', 'Quincenal', 'Mensual', 'Ocasional', 'Aún no lo sé'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Días de atención *</label>
              <select style={inputStyle} value={f.dias_atencion} onChange={e => set('dias_atencion', e.target.value)} required>
                <option value="">Selecciona…</option>
                {['Lunes a viernes', 'Lunes a sábado', 'Lunes a domingo', 'Todos los días', 'Fines de semana', 'Otro'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {field('horario_atencion', 'Horario de atención *', { ph: 'Ej: 09:00 a 18:00' })}
            {field('productos_interes', 'Productos de interés', { full: true, ph: 'Ej: línea salada, pastelería, congelados…' })}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Comentarios adicionales</label>
              <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={f.comentario} onChange={e => set('comentario', e.target.value)} placeholder="Cuéntanos lo que necesites que sepamos." />
            </div>
          </div>

          {/* Honeypot anti-spam (oculto) */}
          <input type="text" value={f.website} onChange={e => set('website', e.target.value)} tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />

          <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 20, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.consentimiento} onChange={e => set('consentimiento', e.target.checked)} required style={{ marginTop: 3, width: 17, height: 17, accentColor: GOLD }} />
            <span style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>Autorizo a NOMMA FOOD a contactarme por los datos entregados para gestionar mi solicitud mayorista.</span>
          </label>

          {estado === 'error' ? <div style={{ marginTop: 18, background: '#fdecec', border: '1px solid #f3c6c6', color: '#a33', borderRadius: 10, padding: '12px 16px', fontSize: 14 }}>{msg}</div> : null}

          <button type="submit" disabled={estado === 'enviando'} className="nf-btn" style={{ marginTop: 22, width: '100%', background: estado === 'enviando' ? '#9aa' : NAVY, color: '#fff', border: 'none', fontWeight: 700, padding: '15px', borderRadius: 12, fontSize: 15.5, cursor: estado === 'enviando' ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            {estado === 'enviando' ? 'Enviando…' : <>Enviar solicitud <ArrowRight size={18} /></>}
          </button>
          <p style={{ textAlign: 'center', color: '#a5a29a', fontSize: 12.5, marginTop: 14 }}>Tus datos se envían de forma segura al equipo comercial de NOMMA FOOD.</p>
        </form>
      </div>
    </section>
  )
}
