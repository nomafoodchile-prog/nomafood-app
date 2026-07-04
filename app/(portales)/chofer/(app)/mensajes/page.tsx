'use client'

import { MessageCircle } from 'lucide-react'

export default function MensajesPage() {
  return (
    <div>
      <div className="bg-[#1f3d2c] text-white px-5 py-4">
        <h1 className="text-lg font-semibold text-center">Mensajes</h1>
      </div>
      <div className="px-5 py-16 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-[#eef3ee] flex items-center justify-center mb-3">
          <MessageCircle className="w-7 h-7 text-[#1f3d2c]" />
        </div>
        <p className="font-semibold text-gray-800">Mensajes de la Central</p>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">Aquí recibirás avisos y mensajes automáticos según tu ruta. Disponible en la próxima fase.</p>
      </div>
    </div>
  )
}
