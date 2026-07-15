'use client'

import { useEffect, useState } from 'react'
import { Sprout, Leaf, Snowflake, Truck, ArrowRight, ShoppingBag } from 'lucide-react'

type Row = Record<string, unknown>
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const clp = (v: unknown) => { const n = Number(v); return Number.isNaN(n) || !n ? 'Consultar' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n) }

export default function LandingPage() {
  const [prods, setProds] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/landing/productos').then(r => r.json()).then((d: Row) => {
      setProds((d.productos as Row[]) || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const categorias = [...new Set(prods.map(p => S(p.categoria) || 'Otros'))]

  return (
    <div style={{ background: '#f7f6f2', color: '#1b2a4a', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#1b2a4a', color: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#c9a24e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sprout size={20} color="#1b2a4a" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, letterSpacing: 1 }}>NOMMA FOOD</div>
            <div style={{ fontSize: 11, opacity: .7 }}>Alma Libre Grupo SpA</div>
          </div>
          <a href="#productos" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, marginRight: 18, opacity: .85 }}>Productos</a>
          <a href="/mayoristas" style={{ background: '#c9a24e', color: '#1b2a4a', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '9px 16px', borderRadius: 8 }}>Soy mayorista</a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '64px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef3e5', color: '#3B6D11', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}><Leaf size={14} /> 100% vegetariano y vegano</div>
        <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: '20px 0 14px', fontWeight: 800 }}>Comida real, fresca<br />y de verdad rica 🌿</h1>
        <p style={{ fontSize: 18, color: '#5F5E5A', maxWidth: 620, margin: '0 auto 26px', lineHeight: 1.6 }}>Elaboramos productos vegetarianos y veganos en nuestra propia cocina, con ingredientes frescos y sin conservantes. Directo de la fábrica a tu mesa.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#productos" style={{ background: '#1b2a4a', color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '13px 26px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>Ver productos <ArrowRight size={17} /></a>
          <a href="/mayoristas" style={{ background: '#fff', color: '#1b2a4a', textDecoration: 'none', fontWeight: 600, padding: '13px 26px', borderRadius: 10, border: '1px solid #e5e2d8', display: 'inline-flex', alignItems: 'center', gap: 8 }}><ShoppingBag size={17} /> Comprar al por mayor</a>
        </div>
      </section>

      {/* Beneficios */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 20px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {[
          { i: <Leaf size={22} color="#3B6D11" />, t: 'Ingredientes frescos', d: 'Seleccionados cada día, sin conservantes ni aditivos.' },
          { i: <Snowflake size={22} color="#185FA5" />, t: 'Cadena de frío', d: 'Producción y despacho con trazabilidad por lote.' },
          { i: <Truck size={22} color="#BA7517" />, t: 'Directo de fábrica', d: 'Sin intermediarios: mejor precio y frescura.' },
        ].map((b, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #efece3' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{b.i}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.t}</div>
            <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.5 }}>{b.d}</div>
          </div>
        ))}
      </section>

      {/* Productos */}
      <section id="productos" style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 20px 60px' }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Nuestros productos</h2>
        <p style={{ textAlign: 'center', color: '#5F5E5A', marginBottom: 34 }}>Todo lo que hacemos, hecho con cariño.</p>

        {loading ? <p style={{ textAlign: 'center', color: '#999' }}>Cargando…</p>
          : prods.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>Pronto publicaremos nuestro catálogo. 🌱</p>
          : categorias.map(cat => (
            <div key={cat} style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #efece3' }}>{cat}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
                {prods.filter(p => (S(p.categoria) || 'Otros') === cat).map(p => (
                  <div key={S(p.id)} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #efece3', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 150, background: '#f0eee6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.foto_oficial_url ? <img src={S(p.foto_oficial_url)} alt={S(p.nombre)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Sprout size={34} color="#c9a24e" />}
                    </div>
                    <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{S(p.nombre)}</div>
                      <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.5, flex: 1 }}>{S(p.descripcion_publica)}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                        <span style={{ fontWeight: 700, color: '#c9a24e', fontSize: 17 }}>{clp(p.precio_venta)}</span>
                        {p.unidad_venta ? <span style={{ fontSize: 12, color: '#999' }}>/ {S(p.unidad_venta)}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </section>

      {/* CTA mayorista */}
      <section style={{ background: '#1b2a4a', color: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>¿Restaurante, minimarket u oficina?</h2>
          <p style={{ fontSize: 17, opacity: .85, maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6 }}>Compra al por mayor con precios especiales, pedidos en línea y despacho a tu local.</p>
          <a href="/mayoristas" style={{ background: '#c9a24e', color: '#1b2a4a', textDecoration: 'none', fontWeight: 700, padding: '14px 30px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>Quiero ser mayorista <ArrowRight size={18} /></a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#12203a', color: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 20px', textAlign: 'center', fontSize: 13, opacity: .7 }}>
          NOMMA FOOD · Alma Libre Grupo SpA · Santiago, Chile
        </div>
      </footer>
    </div>
  )
}
