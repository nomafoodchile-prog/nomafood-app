'use client'

import { useEffect, useState } from 'react'

// La OC se viste según la marca del pedido (Brotes o NOMMA) para no mezclar identidades.
const TEMAS = {
  nomma:  { primary: '#1b2a4a', gold: '#c9a24e', nombre: 'NOMMA FOOD' },
  brotes: { primary: '#143026', gold: '#e6b23f', nombre: 'BROTES ASIÁTICOS' },
} as const
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fecha = (s?: string | null) => s ? new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function OrdenCompraMinoristaPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/central/orden-compra-minorista/${params.id}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Error al cargar la orden')
        setData(d)
      })
      .catch(e => setErr(e.message))
  }, [params.id])

  if (err) return <div style={{ padding: 40, fontFamily: 'system-ui', color: '#b91c1c' }}>{err}</div>
  if (!data) return <div style={{ padding: 40, fontFamily: 'system-ui', color: '#666' }}>Cargando orden de compra…</div>

  const { pedido, items } = data
  const marcaKey: 'nomma' | 'brotes' = String(pedido?.marca || '').toLowerCase().includes('brotes') ? 'brotes' : 'nomma'
  const T = TEMAS[marcaKey]
  const NAVY = T.primary
  const GOLD = T.gold
  const cel = { padding: '8px 10px', borderBottom: '1px solid #eee', fontSize: 13 } as const
  const th = { padding: '8px 10px', textAlign: 'left' as const, fontSize: 12, color: '#fff', background: NAVY, fontWeight: 600 }
  const despacho = [pedido.despacho_direccion, pedido.despacho_comuna, pedido.despacho_region].filter(Boolean).join(', ') || '—'

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Arial, sans-serif', color: '#1f2430', background: '#f4f2ec', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`@media print { .no-print { display:none !important } body { background:#fff } @page { size:A4; margin:14mm } }`}</style>

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <a href="#" onClick={e => { e.preventDefault(); window.history.back() }} style={{ color: NAVY, textDecoration: 'none', fontSize: 14 }}>← Volver</a>
          <button onClick={() => window.print()} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Imprimir / Guardar PDF
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '32px 34px', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          {/* Encabezado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${GOLD}`, paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, color: NAVY }}>{T.nombre}</div>
              <div style={{ fontSize: 12, color: '#6b6f77' }}>Alma Libre Grupo SpA · Santiago de Chile</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>ORDEN DE COMPRA</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>N° {pedido.numero}</div>
              <div style={{ fontSize: 12, color: '#6b6f77' }}>Fecha: {fecha(pedido.created_at)}</div>
            </div>
          </div>

          {/* Datos del cliente + despacho */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cliente</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{pedido.cliente_nombre || '—'}</div>
              <div style={{ fontSize: 13 }}>{pedido.cliente_telefono || '—'}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>{pedido.cliente_email || ''}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Despacho</div>
              <div style={{ fontSize: 13 }}>{despacho}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>Estado: {pedido.estado}</div>
              {pedido.metodo_pago && <div style={{ fontSize: 13, color: '#6b6f77' }}>Pago: {pedido.metodo_pago}</div>}
            </div>
          </div>

          {/* Items — con casilla para verificar el armado */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'center', width: 34 }}>✓</th>
                <th style={th}>Producto</th>
                <th style={{ ...th, textAlign: 'center' }}>Cant.</th>
                <th style={{ ...th, textAlign: 'right' }}>P. unit.</th>
                <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...cel, textAlign: 'center', fontSize: 16 }}>☐</td>
                  <td style={cel}>{it.producto_nombre}{it.producto_sku ? <span style={{ color: '#9aa', fontSize: 11 }}> · {it.producto_sku}</span> : null}</td>
                  <td style={{ ...cel, textAlign: 'center', fontWeight: 700 }}>{it.cantidad}</td>
                  <td style={{ ...cel, textAlign: 'right' }}>{clp(it.precio)}</td>
                  <td style={{ ...cel, textAlign: 'right' }}>{clp((Number(it.precio) || 0) * (Number(it.cantidad) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: 260 }}>
              {Number(pedido.subtotal) > 0 && <Row label="Subtotal" val={clp(pedido.subtotal)} />}
              {Number(pedido.envio) > 0 && <Row label="Envío" val={clp(pedido.envio)} />}
              {Number(pedido.iva) > 0 && <Row label="IVA" val={clp(pedido.iva)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 6, borderTop: `2px solid ${NAVY}`, fontWeight: 800, color: NAVY, fontSize: 16 }}>
                <span>TOTAL</span><span>{clp(pedido.total)}</span>
              </div>
            </div>
          </div>

          {pedido.notas && (
            <div style={{ marginTop: 22, fontSize: 12, color: '#6b6f77' }}><b>Notas:</b> {pedido.notas}</div>
          )}

          <div style={{ marginTop: 28, paddingTop: 14, borderTop: '1px solid #eee', fontSize: 11, color: '#9aa', textAlign: 'center' }}>
            Documento interno de gestión · No constituye factura ni boleta electrónica · {T.nombre}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#444' }}>
      <span>{label}</span><span>{val}</span>
    </div>
  )
}
