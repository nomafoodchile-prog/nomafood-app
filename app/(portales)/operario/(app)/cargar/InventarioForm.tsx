'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, Check, Boxes, Search, AlertCircle, PartyPopper, X } from 'lucide-react'

type Existente = { nombre: string; categoria: string; marca: string }
type ItemInv = { producto: string; cantidad: string; unidad: string; vencimiento: string; lote: string }
type Res = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

export default function InventarioForm({ existentes, unidades }: { existentes: Existente[]; unidades: string[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [prod, setProd] = useState('')          // producto elegido (debe existir)
  const [cant, setCant] = useState('')
  const [unidad, setUnidad] = useState('')       // '' = usar la del producto
  const [vence, setVence] = useState('')
  const [lote, setLote] = useState('')

  const [lista, setLista] = useState<ItemInv[]>([])
  const [guardando, setGuardando] = useState(false)
  const [res, setRes] = useState<{ creados: number; duplicados: number; errores: number; resultados: Res[] } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Productos que coinciden con lo que busca (máx 8)
  const coincidencias = useMemo(() => {
    const q = norm(busqueda)
    if (q.length < 2) return [] as string[]
    return existentes.map(e => e.nombre).filter(n => norm(n).includes(q)).slice(0, 8)
  }, [busqueda, existentes])

  function agregar() {
    setAviso(null); setRes(null)
    if (!prod) { setAviso('Elige un producto de la lista.'); return }
    const c = Number(cant)
    if (!cant || Number.isNaN(c) || c < 0) { setAviso('Escribe una cantidad válida.'); return }
    setLista(prev => [...prev, { producto: prod, cantidad: cant.trim(), unidad, vencimiento: vence, lote: lote.trim() }])
    // limpia para el siguiente (deja pedir otro producto)
    setProd(''); setBusqueda(''); setCant(''); setVence(''); setLote('')
  }

  function quitar(i: number) { setLista(prev => prev.filter((_, j) => j !== i)) }

  async function guardar() {
    if (lista.length === 0) { setAviso('Agrega al menos un producto a la lista.'); return }
    setGuardando(true); setRes(null); setAviso(null)
    try {
      const r = await fetch('/api/portal/operario/carga', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'inventario', filas: lista }),
      })
      const d = await r.json()
      if (!r.ok) { setAviso(d.error || 'No se pudo guardar.'); return }
      setRes(d)
      if (d.creados > 0) {
        // saca de la lista los que se guardaron bien (por orden de fila)
        const okFilas = new Set(d.resultados.filter((x: Res) => x.estado === 'creado').map((x: Res) => x.fila))
        setLista(prev => prev.filter((_, idx) => !okFilas.has(idx + 1)))
      }
    } catch { setAviso('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-[#1b2a4a] flex items-center gap-2"><Boxes size={20} /> Inventario inicial</h1>
        <p className="text-sm text-gray-500 mt-0.5">Elige un producto que ya existe y anota cuánto hay. Agrega y al final Guarda.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        {/* 1 · Elegir producto existente */}
        <div>
          <label className="text-xs font-medium text-gray-500">1 · Producto</label>
          {prod ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2.5">
              <span className="text-sm font-medium text-green-900 truncate">{prod}</span>
              <button type="button" onClick={() => { setProd(''); setBusqueda('') }} className="text-green-700 shrink-0 flex items-center gap-1 text-xs"><X size={14} /> cambiar</button>
            </div>
          ) : (
            <>
              <div className="mt-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca el producto…"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
              </div>
              {busqueda.trim().length >= 2 && (
                coincidencias.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {coincidencias.map(n => <button key={n} type="button" onClick={() => { setProd(n); setBusqueda('') }} className="text-xs px-2.5 py-1 rounded-full bg-[#f5efdf] border border-[#c9a24e]/40 text-[#1b2a4a]">{n}</button>)}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> No encuentro ese producto. Primero cárgalo en la pestaña “Productos”.</p>
                )
              )}
            </>
          )}
        </div>

        {/* 2 · Cantidad y unidad */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">2 · Cantidad</label>
            <input value={cant} onChange={e => setCant(e.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" placeholder="Ej: 10"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Unidad</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-[#c9a24e] outline-none">
              <option value="">(la del producto)</option>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* 3 · Vencimiento y lote (opcionales) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Vence (opcional)</label>
            <input type="date" value={vence} onChange={e => setVence(e.target.value)}
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Lote (opcional)</label>
            <input value={lote} onChange={e => setLote(e.target.value)} placeholder="Ej: L-2026"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
        </div>

        {aviso && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={15} /> {aviso}</div>}

        <button onClick={agregar} className="w-full bg-[#1b2a4a] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]">
          <Plus size={17} /> Agregar a la lista
        </button>
      </div>

      {lista.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm">Por guardar ({lista.length})</h2>
          <ul className="mt-2 divide-y divide-gray-50">
            {lista.map((i, idx) => (
              <li key={idx} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{i.producto}</p>
                  <p className="text-[11px] text-gray-400">{i.cantidad}{i.unidad ? ` ${i.unidad}` : ''}{i.vencimiento ? ` · vence ${i.vencimiento}` : ''}{i.lote ? ` · lote ${i.lote}` : ''}</p>
                </div>
                <button onClick={() => quitar(idx)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
          <button onClick={guardar} disabled={guardando} className="w-full mt-3 bg-[#c9a24e] text-[#1b2a4a] rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
            {guardando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Guardar {lista.length} ítem(s)
          </button>
        </div>
      )}

      {res && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm flex items-center gap-2"><PartyPopper size={16} className="text-green-600" /> Resultado</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-medium">{res.creados} guardados</span>
            {res.errores > 0 && <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-medium">{res.errores} con problema</span>}
          </div>
          {res.resultados.filter(r => r.estado !== 'creado').length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {res.resultados.filter(r => r.estado !== 'creado').map((r, i) => (
                <li key={i}><span className="font-medium text-[#1a1a1a]">{r.nombre || '—'}</span>: {r.detalle || 'problema'}</li>
              ))}
            </ul>
          )}
          {res.creados > 0 && <p className="text-xs text-green-700 mt-2">¡Listo! El stock quedó registrado.</p>}
        </div>
      )}
    </>
  )
}
