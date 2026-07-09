import { CalendarDays } from 'lucide-react'

export default function OperarioAsistenciaPage() {
  return (
    <div className="p-5">
      <header className="pt-4 pb-6"><h1 className="text-xl font-bold text-[#1b2a4a]">Mi asistencia</h1></header>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        <CalendarDays className="w-8 h-8 mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-[#1b2a4a]">Próximamente</p>
        <p className="text-sm mt-1">Calendario mensual y cumplimiento (con GeoVictoria) llega en la fase O-D.</p>
      </div>
    </div>
  )
}
