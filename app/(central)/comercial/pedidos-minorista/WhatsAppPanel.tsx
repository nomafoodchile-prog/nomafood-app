'use client'

import { useMemo, useState } from 'react'
import { X, Phone, Send, CheckCircle2, MessageCircle, Loader2 } from 'lucide-react'
import { llenarPlantilla, waLink, TIPOS_MENSAJE } from '@/lib/whatsapp'

interface PedidoWA {
  id: string; numero: string; marca: string
  cliente_nombre: string | null; cliente_telefono: string | null; estado: string
}
interface Envio { id: string; tipo: string; created_at: string; estado: string }

const cuandoHora = (iso: string) => { try { return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
const LABEL: Record<string, string> = Object.fromEntries(TIPOS_MENSAJE.map(t => [t.tipo, t.label]))

export default function WhatsAppPanel({
  pedido, plantillas, enviados, onClose, onSent,
}: {
  pedido: PedidoWA
  plantillas: Record<string, Record<string, string>>
  enviados: Envio[]
  onClose: () => void
  onSent: () => void
}) {
  const marca = pedido.marca || 'Brotes Asiáticos'
  const vars = useMemo(() => ({ nombre: pedido.cliente_nombre, pedido: pedido.numero, marca }), [pedido, marca])
  const plantillasMarca = plantillas[marca] || plantillas['Brotes Asiáticos'] || {}
  const [tipo, setTipo] = useState<string>('recibido')
  const [texto, setTexto] = useState<string>(() => llenarPlantilla(plantillasMarca['recibido'] || '', vars))
  const [enviando, setEnviando] = useState(false)

  const elegir = (t: string) => {
    setTipo(t)
    setTexto(llenarPlantilla(plantillasMarca[t] || '', vars))
  }

  const yaEnviado = (t: string) => enviados.some(e => e.tipo === t)

  const enviar = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    // 1) abre WhatsApp con el mensaje prellenado
    try { window.open(waLink(pedido.cliente_telefono, texto), '_blank') } catch { /* popup */ }
    // 2) registra el envío (para timeline / no duplicar)
    try {
      await fetch('/api/central/comunicaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minorista_pedido_id: pedido.id, tipo, texto, destino: pedido.cliente_telefono, marca }),
      })
      onSent()
    } catch { /* ignore */ }
    setEnviando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl max-h-full sm:max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#128C7E] text-white px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5" /> WhatsApp</h2>
            <p className="text-xs text-white/80">{marca}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <div className="font-bold text-[#16233f]">{pedido.cliente_nombre || 'Cliente'}</div>
            <div className="text-gray-500 flex items-center gap-1.5 mt-0.5"><Phone className="w-3.5 h-3.5" />{pedido.cliente_telefono || 'Sin teléfono'}</div>
            <div className="text-xs text-gray-400 mt-0.5">Pedido #{pedido.numero} · {pedido.estado}</div>
          </div>

          {!pedido.cliente_telefono && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-2.5 text-xs">Este pedido no tiene teléfono registrado. Al abrir WhatsApp tendrás que elegir el contacto manualmente.</div>
          )}

          <div>
            <div className="text-[11px] font-bold uppercase text-gray-400 mb-1.5">Mensajes rápidos</div>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_MENSAJE.map(t => (
                <button key={t.tipo} onClick={() => elegir(t.tipo)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border font-medium flex items-center gap-1 ${tipo === t.tipo ? 'bg-[#16233f] text-white border-[#16233f]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {yaEnviado(t.tipo) && <CheckCircle2 className="w-3 h-3 text-green-500" />}{t.label}
                </button>
              ))}
            </div>
          </div>

          {yaEnviado(tipo) && (
            <div className="text-[11px] text-amber-600">⚠ Ya enviaste "{LABEL[tipo] || tipo}" a este cliente. Puedes reenviarlo si lo necesitas.</div>
          )}

          <div>
            <div className="text-[11px] font-bold uppercase text-gray-400 mb-1.5">Mensaje (puedes editarlo)</div>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5}
              className="w-full border rounded-xl px-3 py-2 text-sm text-[#16233f] resize-y" />
          </div>

          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1eb855] text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar por WhatsApp
          </button>

          {enviados.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-gray-400 mb-1.5">Enviados</div>
              <div className="space-y-1">
                {enviados.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{LABEL[e.tipo] || e.tipo}</span>
                    <span>{cuandoHora(e.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
