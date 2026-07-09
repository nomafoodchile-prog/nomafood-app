import { ChefHat } from 'lucide-react'

export default function OperarioProduccionPage() {
  return (
    <div className="p-5">
      <header className="pt-4 pb-6"><h1 className="text-xl font-bold text-[#1b2a4a]">Producción</h1></header>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        <ChefHat className="w-8 h-8 mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-[#1b2a4a]">Próximamente</p>
        <p className="text-sm mt-1">Producción paso a paso con receta aprobada, lotes FEFO y cierre con calidad llega en O-C.</p>
      </div>
    </div>
  )
}
