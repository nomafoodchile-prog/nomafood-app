'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, Upload, Copy, AlertTriangle, CheckCircle2, Table } from 'lucide-react'

type Fila = { nombre: string; tipo: string; unidad: string; categoria: string; costo: string; stock_min: string; stock_max: string; vence: string }
type Res = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }

const COLS = ['Nombre', 'Tipo', 'Unidad', 'Categoría', 'Costo ($)', 'Stock mín.', 'Stock máx.', '¿Vence?']
// Plantilla con ejemplos (separada por TAB para pegar directo en Excel/Sheets).
const PLANTILLA = [
  COLS.join('\t'),
  ['Harina sin gluten', 'materia prima', 'kilo', 'Secos', '1200', '10', '50', 'sí'].join('\t'),
  ['Aceite maravilla', 'materia prima', 'litro', 'Líquidos', '2300', '5', '20', 'sí'].join('\t'),
  ['Caja cartón 20x20', 'envase', 'unidad', 'Empaque', '180', '100', '500', 'no'].join('\t'),
  ['Bebida lata (reventa)', 'reventa', 'unidad', 'Reventa', '600', '24', '120', 'no'].join('\t'),
].join('\n')

const S = (v: unknown) => v === null || v === undefined ? '' : String(v).trim()

// Parte una línea por TAB; si no hay tabs, intenta por coma / punto y coma.
function cols(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  if (line.includes(',')) return line.split(',')
  return [line]
}

function parsear(texto: string): Fila[] {
  const lineas = texto.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim() !== '')
  const out: Fila[] = []
  for (let i = 0; i < lineas.length; i++) {
    const c = cols(lineas[i]).map(x => x.trim())
    // Salta la fila de encabezado si la pegaron
    if (i === 0 && S(c[0]).toLowerCase().startsWith('nombre')) continue
    if (S(c[0]) === '') continue
    out.push({
      nombre: S(c[0]), tipo: S(c[1]), unidad: S(c[2]), categoria: S(c[3]),
      costo: S(c[4]), stock_min: S(c[5]), stock_max: S(c[6]), vence: S(c[7]),
    })
  }
  return out
}

export default function CargaInsumosPage() {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [res, setRes] = useState<{ creados: number; duplicados: number; errores: number; resultados: Res[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const filas = useMemo(() => parsear(texto), [texto])
  const validas = filas.filter(f => f.nombre).length

  function copiarPlantilla() {
    navigator.clipboard.writeText(PLANTILLA).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {})
  }

  async function cargar() {
    setError(null); setRes(null)
    if (filas.length === 0) { setError('Pega o escribe al menos un insumo.'); return }
    setEnviando(true)
    try {
      const r = await fetch('/api/central/productos/carga-masiva', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filas }),
      })
      const d = await r.json()
      if (!r.ok) { setError(S(d.error) || 'Error al cargar'); return }
      setRes(d)
      if (d.creados > 0 && d.errores === 0) setTexto('') // limpia si salió todo bien
    } catch {
      setError('No se pudo conectar. Revisa tu internet e intenta de nuevo.')
    } finally { setEnviando(false) }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/comercial/productos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1b2a4a]"><ArrowLeft size={15} /> Volver a Productos</Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Carga rápida de insumos</h1>
        <p className="text-sm text-gray-500 mt-1">Carga muchos insumos de una sola vez. Llena una planilla, pégala aquí y el sistema los crea todos. Ideal para que lo haga tu equipo.</p>
      </div>

      {/* Paso 1 — plantilla */}
      <div className="noma-card !p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-[#1b2a4a] flex items-center gap-2"><Table size={16} /> Paso 1 · Copia la plantilla</h2>
          <button onClick={copiarPlantilla} className="noma-btn-primary text-sm flex items-center gap-2">{copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiada' : 'Copiar plantilla'}</button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Pégala en <strong>Excel o Google Sheets</strong>, llena tus insumos (una fila por insumo) y luego copia tus filas para el Paso 2. El orden de las columnas es:</p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-xs border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-gray-500"><tr>{COLS.map(c => <th key={c} className="px-3 py-2 text-left font-medium border-r border-gray-100 whitespace-nowrap">{c}</th>)}</tr></thead>
            <tbody>
              {PLANTILLA.split('\n').slice(1).map((l, i) => (
                <tr key={i} className="border-t border-gray-100">{l.split('\t').map((v, j) => <td key={j} className="px-3 py-1.5 border-r border-gray-100 text-gray-600 whitespace-nowrap">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="text-xs text-gray-500 mt-3 space-y-1 leading-relaxed">
          <li><strong>Solo el Nombre es obligatorio.</strong> Lo demás es opcional (si lo dejas vacío, el sistema usa un valor por defecto).</li>
          <li><strong>Tipo:</strong> escribe <em>materia prima</em>, <em>envase</em> o <em>reventa</em>. Si lo dejas vacío, queda como materia prima.</li>
          <li><strong>Unidad:</strong> kilo, litro o unidad (también vale kg, lt, un). Si lo dejas vacío, queda "unidad".</li>
          <li><strong>Costo:</strong> lo que te cuesta comprarlo (opcional, sin puntos ni $: 1200).</li>
          <li><strong>¿Vence?:</strong> escribe <em>sí</em> o <em>no</em> (si vence, el sistema le pedirá lote y fecha al recibirlo).</li>
        </ul>
      </div>

      {/* Paso 2 — pegar */}
      <div className="noma-card !p-4">
        <h2 className="font-semibold text-[#1b2a4a] flex items-center gap-2"><Upload size={16} /> Paso 2 · Pega tus insumos aquí</h2>
        <p className="text-sm text-gray-500 mt-1">Copia las filas desde tu planilla (sin el encabezado, aunque si lo incluyes el sistema lo ignora) y pégalas en el recuadro.</p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={8}
          placeholder={'Harina sin gluten\tmateria prima\tkilo\tSecos\t1200\t10\t50\tsí\nAceite maravilla\tmateria prima\tlitro\tLíquidos\t2300\t5\t20\tsí'}
          className="noma-input mt-3 font-mono text-xs w-full"
        />
        {filas.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">Detecté <strong>{validas}</strong> insumo(s) para cargar.</div>
        )}

        {/* Vista previa */}
        {filas.length > 0 && (
          <div className="mt-3 overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-400"><tr>{COLS.map(c => <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filas.slice(0, 30).map((f, i) => (
                  <tr key={i} className={!f.nombre ? 'bg-red-50/50' : ''}>
                    <td className="px-3 py-1.5 font-medium text-[#1a1a1a] whitespace-nowrap">{f.nombre || <span className="text-red-500">(falta nombre)</span>}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.tipo || 'materia prima'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.unidad || 'unidad'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.categoria || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.costo || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.stock_min || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.stock_max || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{f.vence || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > 30 && <div className="px-3 py-2 text-[11px] text-gray-400 bg-gray-50/50">…y {filas.length - 30} más. Se cargan todas.</div>}
          </div>
        )}

        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={15} /> {error}</div>}

        <button onClick={cargar} disabled={enviando || validas === 0} className="noma-btn-primary text-sm flex items-center gap-2 mt-4 disabled:opacity-50">
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Cargar {validas > 0 ? `${validas} insumo(s)` : 'insumos'}
        </button>
      </div>

      {/* Resultado */}
      {res && (
        <div className="noma-card !p-4">
          <h2 className="font-semibold text-[#1b2a4a] flex items-center gap-2"><CheckCircle2 size={16} className="text-green-600" /> Resultado</h2>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-sm px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium">{res.creados} creados</span>
            {res.duplicados > 0 && <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">{res.duplicados} ya existían</span>}
            {res.errores > 0 && <span className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-medium">{res.errores} con error</span>}
          </div>
          {(res.duplicados > 0 || res.errores > 0) && (
            <div className="mt-3 overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400"><tr><th className="px-3 py-2 text-left font-medium">Fila</th><th className="px-3 py-2 text-left font-medium">Insumo</th><th className="px-3 py-2 text-left font-medium">Estado</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {res.resultados.filter(r => r.estado !== 'creado').map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-gray-400">{r.fila}</td>
                      <td className="px-3 py-1.5 font-medium text-[#1a1a1a]">{r.nombre || '—'}</td>
                      <td className="px-3 py-1.5">{r.estado === 'duplicado' ? <span className="text-amber-600">Ya existía</span> : <span className="text-red-600">{r.detalle || 'Error'}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">Los insumos quedaron en <Link href="/comercial/productos" className="text-[#c9a24e] font-medium">Productos</Link>. Desde ahí puedes afinar cada uno (proveedor, stock, etc.) cuando necesites.</p>
        </div>
      )}
    </div>
  )
}
