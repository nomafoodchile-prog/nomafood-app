'use client'

import { useMemo, useState } from 'react'
import { Loader2, Minus, Trash2, Check, PackageMinus, Search, AlertCircle, PartyPopper, X } from 'lucide-react'

type Existente = { nombre: string; categoria: string; marca: string }
type ItemSal = { producto: string; cantidad: string; motivo: string }
type Res = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

export default function SalidaForm({ existentes }: { existentes: Existente[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [prod, setProd] = useState('')
  const [cant, setCant] = useState('')
  const [motivo, setMotivo] = useState('')

  const [lista, setLista] = useState<ItemSal[]>([])
  const [guardando, setGuardando] = useState(false)
  const [res, setRes] = useState<{ creados: number; errores: number; resultados: Res[] } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const coincidencias = useMemo(() => {
    const q = norm(busqueda)
    if (q.length < 2) return [] as string[]
    return existentes.map(e => e.nombre).filter(n => norm(n).includes(q)).slice(0, 8)
  }, [busqueda, existentes])

  function agregar() {
    setAviso(null); setRes(null)
    if (!prod) { setAviso('Elige el producto que sacaste.'); return }
    const c = Number(cant)
    if (!cant || Number.isNaN(c) || c <= 0) { setAviso('Escribe una cantidad válida.'); return }
    setLista(prev => [...prev, { producto: prod, cantidad: cant.trim(), motivo: motivo.trim() }])
    setProd(''); setBusqueda(''); setCant(''); setMotivo('')
  }

  function quitar(i: number) { setLista(prev => prev.filter((_, j) => j !== i)) }

  async function guardar() {
    if (lista.length === 0) { setAviso('Agrega al menos un producto a la lista.'); return }
    setGuardando(true); setRes(null); setAviso(null)
    try {
      const r = await fetch('/api/portal/operario/carga', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'salida', filas: lista }),
      })
      const d = await r.json()
      if (!r.ok) { setAviso(d.error || 'No se pudo descontar.'); return }
      setRes(d)
      if (d.creados > 0) {
        const okFilas = new Set(d.resultados.filter((x: Res) => x.estado === 'creado').map((x: Res) => x.fila))
        setLista(prev => prev.filter((_, idx) => !okFilas.has(idx + 1)))
      }
    } catch { setAviso('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-[#1b2a4a] flex items-center gap-2"><PackageMinus size={20} /> Sacar de bodega</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registra lo que retiras para producir. Se descuenta del stock (primero lo que vence antes).</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">1 · Producto que sacaste</label>
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
                  <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> No encuentro ese producto.</p>
                )
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">2 · Cantidad que sacaste</label>
            <input value={cant} onChange={e => setCant(e.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" placeholder="Ej: 5"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Motivo (opcional)</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Producción Mendocino"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
        </div>

        {aviso && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={15} /> {aviso}</div>}

        <button onClick={agregar} className="w-full bg-[#1b2a4a] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]">
          <Minus size={17} /> Agregar a la lista
        </button>
      </div>

      {lista.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm">Por descontar ({lista.length})</h2>
          <ul className="mt-2 divide-y divide-gray-50">
            {lista.map((i, idx) => (
              <li key={idx} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{i.producto}</p>
                  <p className="text-[11px] text-gray-400">−{i.cantidad}{i.motivo ? ` · ${i.motivo}` : ''}</p>
                </div>
                <button onClick={() => quitar(idx)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
          <button onClick={guardar} disabled={guardando} className="w-full mt-3 bg-[#c9a24e] text-[#1b2a4a] rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
            {guardando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Descontar {lista.length} ítem(s)
          </button>
        </div>
      )}

      {res && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm flex items-center gap-2"><PartyPopper size={16} className="text-green-600" /> Resultado</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-medium">{res.creados} descontados</span>
            {res.errores > 0 && <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-medium">{res.errores} con problema</span>}
          </div>
          {res.resultados.length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {res.resultados.map((r, i) => (
                <li key={i}><span className="font-medium text-[#1a1a1a]">{r.nombre || '—'}</span>: {r.detalle || (r.estado === 'creado' ? 'ok' : 'problema')}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
