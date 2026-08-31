'use client'

import { useEffect, useState } from 'react'

// Tema por marca: la orden de compra se viste según la marca del cliente,
// para que un pedido de Brotes NUNCA salga con la identidad de NOMMA (y viceversa).
const TEMAS = {
  nomma:  { primary: '#1b2a4a', gold: '#c9a24e', nombre: 'NOMMA FOOD' },
  brotes: { primary: '#143026', gold: '#e6b23f', nombre: 'BROTES ASIÁTICOS' },
} as const
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fecha = (s?: string | null) => s ? new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function OrdenCompraPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/central/orden-compra/${params.id}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Error al cargar la orden')
        setData(d)
      })
      .catch(e => setErr(e.message))
  }, [params.id])

  if (err) return <div style={{ padding: 40, fontFamily: 'system-ui', color: '#b91c1c' }}>{err}</div>
  if (!data) return <div style={{ padding: 40, fontFamily: 'system-ui', color: '#666' }}>Cargando orden de compra…</div>

  const { pedido, items, mayorista, facturacion } = data
  const marcaKey: 'nomma' | 'brotes' = String(mayorista?.marca || '').toLowerCase().includes('brotes') ? 'brotes' : 'nomma'
  const T = TEMAS[marcaKey]
  const NAVY = T.primary
  const GOLD = T.gold
  const cel = { padding: '8px 10px', borderBottom: '1px solid #eee', fontSize: 13 } as const
  const th = { padding: '8px 10px', textAlign: 'left' as const, fontSize: 12, color: '#fff', background: NAVY, fontWeight: 600 }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Arial, sans-serif', color: '#1f2430', background: '#f4f2ec', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`@media print { .no-print { display:none !important } body { background:#fff } @page { size:A4; margin:14mm } }`}</style>

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Botón imprimir */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <a href="#" onClick={e => { e.preventDefault(); window.history.back() }} style={{ color: NAVY, textDecoration: 'none', fontSize: 14 }}>← Volver</a>
          <button onClick={() => window.print()} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Imprimir / Guardar PDF
          </button>
        </div>

        {/* Documento */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '32px 34px', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          {/* Encabezado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${GOLD}`, paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, color: NAVY }}>{T.nombre}</div>
              <div style={{ fontSize: 12, color: '#6b6f77' }}>Alma Libre Grupo SpA · Santiago de Chile</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>ORDEN DE COMPRA</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>N° {pedido.numero_pedido}</div>
              <div style={{ fontSize: 12, color: '#6b6f77' }}>Fecha: {fecha(pedido.created_at)}</div>
            </div>
          </div>

          {/* Datos de facturación del cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Facturar a</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{mayorista?.empresa || mayorista?.nombre || '—'}</div>
              <div style={{ fontSize: 13 }}>RUT: {mayorista?.rut || '—'}</div>
              <div style={{ fontSize: 13 }}>Giro: {facturacion?.giro || '—'}</div>
              <div style={{ fontSize: 13 }}>{facturacion?.direccion || '—'}{facturacion?.comuna ? `, ${facturacion.comuna}` : ''}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>{mayorista?.nombre}{facturacion?.cargo ? ` · ${facturacion.cargo}` : ''}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>{mayorista?.email} · {mayorista?.telefono}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Despacho</div>
              <div style={{ fontSize: 13 }}>{pedido.direccion_entrega || facturacion?.direccion || '—'}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>Entrega solicitada: {fecha(pedido.fecha_entrega_req)}</div>
              <div style={{ fontSize: 13, color: '#6b6f77' }}>Estado: {pedido.estado}</div>
            </div>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <thead>
              <tr>
                <th style={th}>Producto</th>
                <th style={{ ...th, textAlign: 'center' }}>Cant.</th>
                <th style={{ ...th, textAlign: 'left' }}>Unidad</th>
                <th style={{ ...th, textAlign: 'right' }}>P. unit. neto</th>
                <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={i}>
                  <td style={cel}>{it.producto_nombre}{it.producto_sku ? <span style={{ color: '#9aa', fontSize: 11 }}> · {it.producto_sku}</span> : null}</td>
                  <td style={{ ...cel, textAlign: 'center' }}>{it.cantidad}</td>
                  <td style={cel}>{it.unidad}</td>
                  <td style={{ ...cel, textAlign: 'right' }}>{clp(it.precio_final)}</td>
                  <td style={{ ...cel, textAlign: 'right' }}>{clp(it.precio_final * it.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: 260 }}>
              <Row label="Neto productos" val={clp(pedido.neto)} />
              {Number(pedido.despacho) > 0 && <Row label="Despacho (RM)" val={clp(pedido.despacho)} />}
              <Row label="IVA 19%" val={clp(pedido.iva)} />
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
