'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Check, Truck, Search, AlertCircle, PartyPopper, X, Camera, ImageUp } from 'lucide-react'

type Existente = { nombre: string; categoria: string; marca: string }
type Opcion = { id: string; nombre: string }
type ItemRec = { producto: string; cantidad: string; lote: string; vencimiento: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

async function subirFoto(file: File, etiqueta: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `recepciones/${Date.now()}-${etiqueta}.${ext}`
  const { error } = await supabase.storage.from('evidencias').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('evidencias').getPublicUrl(path).data.publicUrl
}

export default function RecepcionForm({ existentes, proveedores, bodegas }: { existentes: Existente[]; proveedores: Opcion[]; bodegas: Opcion[] }) {
  const [proveedor, setProveedor] = useState('')
  const [bodega, setBodega] = useState('')
  const [obs, setObs] = useState('')

  // línea en edición
  const [busqueda, setBusqueda] = useState('')
  const [prod, setProd] = useState('')
  const [cant, setCant] = useState('')
  const [lote, setLote] = useState('')
  const [vence, setVence] = useState('')
  const [items, setItems] = useState<ItemRec[]>([])

  // fotos
  const [facturaUrl, setFacturaUrl] = useState('')
  const [mercaUrl, setMercaUrl] = useState('')
  const [subF, setSubF] = useState(false)
  const [subM, setSubM] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [res, setRes] = useState<{ numero: string; creados: number; errores: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const coincidencias = useMemo(() => {
    const q = norm(busqueda)
    if (q.length < 2) return [] as string[]
    return existentes.map(e => e.nombre).filter(n => norm(n).includes(q)).slice(0, 8)
  }, [busqueda, existentes])

  async function onFoto(e: ChangeEvent<HTMLInputElement>, cual: 'factura' | 'merca') {
    const f = e.target.files?.[0]; if (!f) return
    setAviso(null)
    const setSub = cual === 'factura' ? setSubF : setSubM
    const setUrl = cual === 'factura' ? setFacturaUrl : setMercaUrl
    setSub(true)
    try { setUrl(await subirFoto(f, cual)) }
    catch { setAviso('No se pudo subir la foto. Reintenta.') }
    finally { setSub(false) }
  }

  function agregarItem() {
    setAviso(null); setRes(null)
    if (!prod) { setAviso('Elige el producto recibido.'); return }
    const c = Number(cant)
    if (!cant || Number.isNaN(c) || c <= 0) { setAviso('Escribe una cantidad válida.'); return }
    setItems(prev => [...prev, { producto: prod, cantidad: cant.trim(), lote: lote.trim(), vencimiento: vence }])
    setProd(''); setBusqueda(''); setCant(''); setLote(''); setVence('')
  }
  function quitar(i: number) { setItems(prev => prev.filter((_, j) => j !== i)) }

  async function registrar() {
    setAviso(null); setRes(null)
    if (!proveedor) { setAviso('Elige el proveedor.'); return }
    if (!bodega) { setAviso('Elige la bodega/cámara de destino.'); return }
    if (items.length === 0) { setAviso('Agrega al menos un producto recibido.'); return }
    if (!facturaUrl) { setAviso('Saca la foto de la factura.'); return }
    if (subF || subM) { setAviso('Espera a que terminen de subir las fotos.'); return }
    setGuardando(true)
    try {
      const observaciones = [obs.trim(), mercaUrl ? `Foto mercadería: ${mercaUrl}` : ''].filter(Boolean).join(' | ')
      const r = await fetch('/api/portal/operario/carga', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'recepcion', proveedor_id: proveedor, bodega_id: bodega, documento_url: facturaUrl, observaciones, items }),
      })
      const d = await r.json()
      if (!r.ok || d.ok === false) { setAviso(d.error || 'No se pudo registrar.'); return }
      setRes({ numero: d.numero, creados: d.creados, errores: d.errores })
      // limpia para la siguiente recepción
      setItems([]); setFacturaUrl(''); setMercaUrl(''); setObs(''); setProveedor(''); setBodega('')
    } catch { setAviso('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  const fotoBtn = 'flex-1 rounded-xl border-2 border-dashed py-4 flex flex-col items-center justify-center gap-1 text-xs cursor-pointer'

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-[#1b2a4a] flex items-center gap-2"><Truck size={20} /> Recibir mercadería</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cuando llega un pedido del proveedor: anota lo que llegó y saca foto de la factura y la mercadería. Entra al stock solo.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        {/* Proveedor + bodega */}
        <div>
          <label className="text-xs font-medium text-gray-500">1 · Proveedor</label>
          <select value={proveedor} onChange={e => setProveedor(e.target.value)} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-[#c9a24e] outline-none">
            <option value="">Elige el proveedor…</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">2 · Bodega / cámara destino</label>
          <select value={bodega} onChange={e => setBodega(e.target.value)} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-[#c9a24e] outline-none">
            <option value="">Elige dónde se guarda…</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Agregar productos recibidos */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <label className="text-xs font-medium text-gray-500">3 · ¿Qué llegó?</label>
        {prod ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-green-300 bg-green-50 px-3 py-2.5">
            <span className="text-sm font-medium text-green-900 truncate">{prod}</span>
            <button type="button" onClick={() => { setProd(''); setBusqueda('') }} className="text-green-700 shrink-0 flex items-center gap-1 text-xs"><X size={14} /> cambiar</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca el producto…"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
            </div>
            {busqueda.trim().length >= 2 && (coincidencias.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {coincidencias.map(n => <button key={n} type="button" onClick={() => { setProd(n); setBusqueda('') }} className="text-xs px-2.5 py-1 rounded-full bg-[#f5efdf] border border-[#c9a24e]/40 text-[#1b2a4a]">{n}</button>)}
              </div>
            ) : <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> No encuentro ese producto. Cárgalo en “Productos”.</p>)}
          </>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="text-[11px] text-gray-500">Cantidad</label>
            <input value={cant} onChange={e => setCant(e.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" placeholder="10"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
          <div className="col-span-1">
            <label className="text-[11px] text-gray-500">Lote</label>
            <input value={lote} onChange={e => setLote(e.target.value)} placeholder="opc."
              className="w-full mt-1 rounded-xl border border-gray-200 px-2 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
          <div className="col-span-1">
            <label className="text-[11px] text-gray-500">Vence</label>
            <input type="date" value={vence} onChange={e => setVence(e.target.value)}
              className="w-full mt-1 rounded-xl border border-gray-200 px-2 py-2.5 text-xs focus:border-[#c9a24e] outline-none" />
          </div>
        </div>
        <button onClick={agregarItem} className="w-full bg-[#1b2a4a] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]">
          <Plus size={16} /> Agregar producto
        </button>

        {items.length > 0 && (
          <ul className="divide-y divide-gray-50 border-t border-gray-100 pt-1">
            {items.map((i, idx) => (
              <li key={idx} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{i.producto}</p>
                  <p className="text-[11px] text-gray-400">{i.cantidad}{i.lote ? ` · lote ${i.lote}` : ''}{i.vencimiento ? ` · vence ${i.vencimiento}` : ''}</p>
                </div>
                <button onClick={() => quitar(idx)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fotos */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <label className="text-xs font-medium text-gray-500">4 · Fotos</label>
        <div className="flex gap-2">
          <label className={`${fotoBtn} ${facturaUrl ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-500'}`}>
            {subF ? <Loader2 size={20} className="animate-spin" /> : facturaUrl ? <Check size={20} /> : <Camera size={20} />}
            {subF ? 'Subiendo…' : facturaUrl ? 'Factura ✓' : 'Foto factura'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFoto(e, 'factura')} />
          </label>
          <label className={`${fotoBtn} ${mercaUrl ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-500'}`}>
            {subM ? <Loader2 size={20} className="animate-spin" /> : mercaUrl ? <Check size={20} /> : <ImageUp size={20} />}
            {subM ? 'Subiendo…' : mercaUrl ? 'Mercadería ✓' : 'Foto mercadería'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFoto(e, 'merca')} />
          </label>
        </div>
        <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Nota (opcional): guía, N° factura…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
      </div>

      {aviso && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={15} /> {aviso}</div>}

      <button onClick={registrar} disabled={guardando} className="w-full bg-[#c9a24e] text-[#1b2a4a] rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
        {guardando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Registrar recepción
      </button>

      {res && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm flex items-center gap-2"><PartyPopper size={16} className="text-green-600" /> Recepción {res.numero} registrada</h2>
          <p className="text-xs text-gray-600 mt-1">{res.creados} producto(s) entraron al stock{res.errores > 0 ? ` · ${res.errores} con problema` : ''}. Ya viajó a tu Central.</p>
        </div>
      )}
    </>
  )
}
