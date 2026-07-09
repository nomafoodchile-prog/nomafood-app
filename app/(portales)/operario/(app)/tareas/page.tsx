import { ClipboardList } from 'lucide-react'

export default function OperarioTareasPage() {
  return (
    <div className="p-5">
      <header className="pt-4 pb-6"><h1 className="text-xl font-bold text-[#1b2a4a]">Mis tareas</h1></header>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        <ClipboardList className="w-8 h-8 mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-[#1b2a4a]">Próximamente</p>
        <p className="text-sm mt-1">Tus tareas del día con prioridad y control de tiempos llegan en la fase O-B.</p>
      </div>
    </div>
  )
}
