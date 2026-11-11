'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, Check, Package, Lightbulb, AlertCircle, PartyPopper } from 'lucide-react'

type Existente = { nombre: string; categoria: string; marca: string }
type Item = { nombre: string; categoria: string; unidad: string; unidades_por_caja: string; marca: string }
type Res = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const limpiarNombre = (s: string) => { const t = s.trim().replace(/\s+/g, ' '); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t }

// Distancia de edición (para detectar "escribió parecido")
function lev(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n; if (!n) return m
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
  }
  return d[m][n]
}

export default function CargarInsumosPage() {
  const [cargando, setCargando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [unidades, setUnidades] = useState<string[]>([])
  const [existentes, setExistentes] = useState<Existente[]>([])

  const [cat, setCat] = useState('')
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('unidad')
  const [caja, setCaja] = useState('')
  const [marca, setMarca] = useState('')

  const [lista, setLista] = useState<Item[]>([])
  const [guardando, setGuardando] = useState(false)
  const [res, setRes] = useState<{ creados: number; duplicados: number; errores: number; resultados: Res[] } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/portal/operario/carga').then(r => r.json()).then(d => {
      setAutorizado(Boolean(d.autorizado))
      setCategorias(Array.isArray(d.categorias) ? d.categorias : [])
      setUnidades(Array.isArray(d.unidades) ? d.unidades : [])
      setExistentes(Array.isArray(d.existentes) ? d.existentes : [])
    }).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const nombreNorm = norm(nombre)
  // Nombres ya en la lista de esta sesión + los que ya existen en el sistema
  const yaEnLista = useMemo(() => new Set(lista.map(i => norm(i.nombre))), [lista])
  const existeExacto = nombreNorm.length > 0 && existentes.some(e => norm(e.nombre) === nombreNorm)

  // Sugerencias: nombres existentes parecidos a lo que va escribiendo (corrector anti-typo/duplicado)
  const sugerencias = useMemo(() => {
    if (nombreNorm.length < 3) return [] as string[]
    const scored = existentes.map(e => {
      const en = norm(e.nombre)
      let score = 99
      if (en === nombreNorm) score = 0
      else if (en.includes(nombreNorm) || nombreNorm.includes(en)) score = 1
      else score = lev(en, nombreNorm)
      return { nombre: e.nombre, score }
    }).filter(s => s.score <= 3 && norm(s.nombre) !== nombreNorm)
    scored.sort((a, b) => a.score - b.score)
    return Array.from(new Set(scored.map(s => s.nombre))).slice(0, 3)
  }, [nombreNorm, existentes])

  function agregar() {
    setAviso(null); setRes(null)
    const n = limpiarNombre(nombre)
    if (!cat) { setAviso('Elige una categoría.'); return }
    if (!n) { setAviso('Escribe el nombre del producto.'); return }
    if (yaEnLista.has(norm(n))) { setAviso('Ya lo agregaste a la lista de abajo.'); return }
    if (existeExacto) { setAviso(`"${n}" ya existe en el sistema. No hace falta cargarlo de nuevo.`); return }
    setLista(prev => [...prev, { nombre: n, categoria: cat, unidad, unidades_por_caja: caja.trim(), marca: marca.trim() }])
    // limpia solo nombre/caja/marca; conserva categoría y unidad para cargar varios seguidos
    setNombre(''); setCaja(''); setMarca('')
  }

  function quitar(i: number) { setLista(prev => prev.filter((_, j) => j !== i)) }

  async function guardar() {
    if (lista.length === 0) { setAviso('Agrega al menos un producto.'); return }
    setGuardando(true); setRes(null); setAviso(null)
    try {
      const r = await fetch('/api/portal/operario/carga', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'insumos', filas: lista }),
      })
      const d = await r.json()
      if (!r.ok) { setAviso(d.error || 'No se pudo guardar.'); return }
      setRes(d)
      if (d.creados > 0) {
        // saca de la lista los que se crearon bien; deja los que fallaron para reintentar
        const creados = new Set(d.resultados.filter((x: Res) => x.estado === 'creado').map((x: Res) => norm(x.nombre)))
        setLista(prev => prev.filter(i => !creados.has(norm(i.nombre))))
        // refresca existentes para que las sugerencias incluyan lo recién cargado
        fetch('/api/portal/operario/carga').then(r => r.json()).then(dd => { if (Array.isArray(dd.existentes)) setExistentes(dd.existentes) }).catch(() => {})
      }
    } catch { setAviso('Revisa tu internet e intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  if (cargando) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#1b2a4a] animate-spin" /></div>

  if (!autorizado) return (
    <div className="p-4">
      <div className="bg-white rounded-2xl p-6 text-center shadow-sm mt-6">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h1 className="text-lg font-bold text-[#1b2a4a] mt-3">Carga no habilitada</h1>
        <p className="text-sm text-gray-500 mt-2">Tu jefatura todavía no te activó la carga de datos. Pídele que te la active desde la Central.</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#1b2a4a] flex items-center gap-2"><Package size={20} /> Cargar insumos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agrega los productos uno por uno y al final presiona Guardar. Fácil y rápido.</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500">1 · Categoría</label>
          <select value={cat} onChange={e => setCat(e.target.value)} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-[#c9a24e] outline-none">
            <option value="">Elige una…</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">2 · Producto</label>
          <input
            value={nombre} onChange={e => setNombre(e.target.value)} spellCheck lang="es"
            autoCapitalize="sentences" placeholder="Ej: Proteína de soya"
            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none"
          />
          {existeExacto && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle size={13} /> Este producto ya existe en el sistema.</p>}
          {!existeExacto && sugerencias.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] text-gray-400 flex items-center gap-1"><Lightbulb size={12} /> ¿Quisiste decir…? (tócalo para usar el nombre correcto)</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {sugerencias.map(s => <button key={s} type="button" onClick={() => setNombre(s)} className="text-xs px-2.5 py-1 rounded-full bg-[#f5efdf] border border-[#c9a24e]/40 text-[#1b2a4a]">{s}</button>)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">3 · Unidad de medida</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-[#c9a24e] outline-none">
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">4 · Por caja</label>
            <input value={caja} onChange={e => setCaja(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Ej: 12"
              className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">5 · Marca</label>
          <input value={marca} onChange={e => setMarca(e.target.value)} spellCheck placeholder="Ej: Carozzi"
            className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a24e] outline-none" />
        </div>

        {aviso && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={15} /> {aviso}</div>}

        <button onClick={agregar} className="w-full bg-[#1b2a4a] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]">
          <Plus size={17} /> Agregar a la lista
        </button>
      </div>

      {/* Lista agregada */}
      {lista.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1b2a4a] text-sm">Por guardar ({lista.length})</h2>
          </div>
          <ul className="mt-2 divide-y divide-gray-50">
            {lista.map((i, idx) => (
              <li key={idx} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{i.nombre}</p>
                  <p className="text-[11px] text-gray-400">{i.categoria} · {i.unidad}{i.unidades_por_caja ? ` · caja ×${i.unidades_por_caja}` : ''}{i.marca ? ` · ${i.marca}` : ''}</p>
                </div>
                <button onClick={() => quitar(idx)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
          <button onClick={guardar} disabled={guardando} className="w-full mt-3 bg-[#c9a24e] text-[#1b2a4a] rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
            {guardando ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Guardar {lista.length} insumo(s)
          </button>
        </div>
      )}

      {/* Resultado */}
      {res && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[#1b2a4a] text-sm flex items-center gap-2"><PartyPopper size={16} className="text-green-600" /> Resultado</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-medium">{res.creados} guardados</span>
            {res.duplicados > 0 && <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">{res.duplicados} ya existían</span>}
            {res.errores > 0 && <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-medium">{res.errores} con problema</span>}
          </div>
          {res.resultados.filter(r => r.estado !== 'creado').length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {res.resultados.filter(r => r.estado !== 'creado').map((r, i) => (
                <li key={i}><span className="font-medium text-[#1a1a1a]">{r.nombre || '—'}</span>: {r.estado === 'duplicado' ? 'ya existía' : (r.detalle || 'problema')}</li>
              ))}
            </ul>
          )}
          {res.creados > 0 && <p className="text-xs text-green-700 mt-2">¡Listo! Quedaron guardados. Puedes seguir agregando más.</p>}
        </div>
      )}
    </div>
  )
}
