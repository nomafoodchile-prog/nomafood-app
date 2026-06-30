import Link from 'next/link'
import { wholesaleProducts, wholesaleCategories } from '@/lib/wholesale'
import { ShoppingCart, Star, Clock, Package } from 'lucide-react'

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function ProductCard({ product }: { product: typeof wholesaleProducts[0] }) {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Image placeholder */}
      <div className="h-40 bg-gradient-to-br from-[#0f0f0f] via-gray-800 to-[#c9a84c]/30 flex items-center justify-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-[#c9a84c]/20 border-2 border-[#c9a84c]/40 flex items-center justify-center">
          <span className="text-2xl">🌱</span>
        </div>
        {!product.available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Sin stock</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#c9a84c] text-[#0f0f0f]">
            {product.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[#1a1a1a] text-sm mb-1">{product.name}</h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={11} className="text-[#c9a84c]" />
            <span>{product.shelfLife}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Package size={11} className="text-[#c9a84c]" />
            <span>{product.format}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 line-through">{currency(product.basePrice)}</p>
            <p className="text-lg font-bold text-[#c9a84c]">{currency(product.clientPrice)}</p>
          </div>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              product.available
                ? 'bg-[#c9a84c] text-[#0f0f0f] hover:bg-[#b8962e]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!product.available}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MayoristasPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="bg-[#0f0f0f] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#c9a84c] rounded-xl flex items-center justify-center font-black text-[#0f0f0f] text-sm">
                NF
              </div>
              <div>
                <p className="font-bold text-white leading-tight">Noma Food</p>
                <p className="text-[10px] text-gray-400">Portal Mayoristas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#c9a84c] text-[#0f0f0f] text-[9px] font-bold rounded-full flex items-center justify-center">
                  0
                </span>
              </button>
              <Link
                href="/login"
                className="bg-[#c9a84c] text-[#0f0f0f] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-[#b8962e] transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#0f0f0f] to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a84c]/20 border border-[#c9a84c]/40 rounded-full px-4 py-1.5 mb-6">
            <Star size={12} className="text-[#c9a84c]" />
            <span className="text-xs text-[#c9a84c] font-semibold">Fábrica de comida vegana · Santiago, Chile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            Portal Mayoristas<br />
            <span className="text-[#c9a84c]">Noma Food</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Comida vegana de fábrica para tu negocio. Productos frescos, sin gluten, sin conservantes.
            Lista mayorista con descuentos exclusivos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:brotesladera@gmail.com"
              className="bg-[#c9a84c] text-[#0f0f0f] font-bold px-6 py-3 rounded-xl hover:bg-[#b8962e] transition-colors"
            >
              Solicitar acceso
            </a>
            <a
              href="#catalogo"
              className="border border-[#c9a84c]/40 text-white px-6 py-3 rounded-xl hover:border-[#c9a84c] transition-colors"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      </div>

      {/* Benefits bar */}
      <div className="bg-[#c9a84c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-[#0f0f0f]">
            <span>✓ Despacho en Santiago</span>
            <span>✓ 100% vegano</span>
            <span>✓ Sin conservantes</span>
            <span>✓ Crédito a 30 días</span>
            <span>✓ Mínimo de pedido $85.000</span>
          </div>
        </div>
      </div>

      {/* Catalog */}
      <main id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Catálogo de productos</h2>
          <p className="text-gray-500 text-sm">Precios con descuento mayorista. Lista actualizada al 30 jun 2026.</p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button className="px-4 py-2 rounded-full text-xs font-semibold bg-[#0f0f0f] text-white">
            Todos
          </button>
          {wholesaleCategories.map(cat => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-gray-600 hover:bg-[#0f0f0f] hover:text-white transition-colors border border-gray-200"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wholesaleProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-[#0f0f0f] rounded-2xl p-8 sm:p-12 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">¿Quieres ser cliente mayorista?</h3>
          <p className="text-gray-400 text-sm mb-6">
            Solicita acceso al portal y recibe tu lista de precios personalizada.
            Atendemos cafeterías, restaurantes, hoteles y tiendas de alimentos naturales.
          </p>
          <a
            href="mailto:brotesladera@gmail.com?subject=Solicitud acceso portal mayoristas Noma Food"
            className="inline-block bg-[#c9a84c] text-[#0f0f0f] font-bold px-8 py-3 rounded-xl hover:bg-[#b8962e] transition-colors"
          >
            Solicitar acceso →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f0f0f] text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs">
          <p>© 2026 Noma Food · Alma Libre Grupo SpA · Santiago, Chile</p>
          <p className="mt-1">Fábrica vegana · RUT 77.xxx.xxx-x</p>
        </div>
      </footer>
    </div>
  )
}
