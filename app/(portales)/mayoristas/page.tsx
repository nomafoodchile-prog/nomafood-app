import type { Metadata } from 'next'
import {
  Sprout, Snowflake, Coffee, Building2, CalendarClock, ShoppingBag, Leaf,
  ArrowRight, MapPin, PlayCircle, Store, GraduationCap, Utensils,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { SolicitudForm } from './SolicitudForm'

export const metadata: Metadata = {
  title: 'NOMMA FOOD — Portal Mayorista | Alimentos vegetarianos y veganos',
  description: 'Abastecemos cafeterías, universidades, minimarkets, oficinas y negocios con productos vegetarianos y veganos innovadores y de alta rotación. Solicita acceso mayorista.',
  openGraph: {
    title: 'NOMMA FOOD — Portal Mayorista',
    description: 'Alimentos vegetarianos y veganos listos para vender. Solicita acceso mayorista.',
    type: 'website', locale: 'es_CL', siteName: 'NOMMA FOOD',
  },
  twitter: { card: 'summary_large_image', title: 'NOMMA FOOD — Portal Mayorista', description: 'Alimentos vegetarianos y veganos listos para vender.' },
}

interface Prod { id: string; name: string; category: string | null; descripcion_publica: string | null; foto_url: string | null }

async function getData() {
  try {
    const db = createServerClient()
    const [cfg, prods, puntos] = await Promise.all([
      db.from('landing_config').select('hero_titulo, hero_subtitulo, video_url, zonas_cobertura').eq('id', 1).maybeSingle(),
      db.from('products').select('id, name, category, descripcion_publica, foto_url').eq('destacado', true).limit(6),
      db.from('mayoristas').select('empresa, nombre').eq('activo', true).limit(12),
    ])
    return {
      config: cfg.data as { hero_titulo: string; hero_subtitulo: string; video_url: string | null; zonas_cobertura: string[] } | null,
      productos: (prods.data as Prod[]) || [],
      puntos: ((puntos.data as { empresa: string | null; nombre: string }[]) || []).map(p => p.empresa || p.nombre).filter(Boolean) as string[],
    }
  } catch {
    return { config: null, productos: [] as Prod[], puntos: [] as string[] }
  }
}

const SERVICIOS = [
  { icon: Snowflake, t: 'Vitrinas refrigeradas', d: 'Productos listos para exhibir y vender en tu vitrina.' },
  { icon: Coffee, t: 'Cafeterías y universidades', d: 'Abastecimiento constante para alta demanda.' },
  { icon: Building2, t: 'Oficinas y minimarkets', d: 'Soluciones prácticas para locales de comida.' },
  { icon: CalendarClock, t: 'Pedidos programados', d: 'Planifica tu abastecimiento con despacho a tu puerta.' },
  { icon: ShoppingBag, t: 'Catálogo mayorista', d: 'Atención comercial dedicada y lista de productos.' },
  { icon: Leaf, t: 'Vegetariano y vegano', d: 'Productos innovadores con excelente rotación.' },
]

export default async function LandingMayoristas() {
  const { config, productos, puntos } = await getData()
  const titulo = config?.hero_titulo || 'Alimentos vegetarianos y veganos listos para vender'
  const subtitulo = config?.hero_subtitulo || 'Abastecemos cafeterías, universidades, minimarkets, oficinas y negocios con productos innovadores, prácticos y de alta rotación.'
  const zonas = config?.zonas_cobertura || ['Providencia', 'Ñuñoa', 'Santiago Centro', 'Las Condes', 'Macul']

  return (
    <main className="bg-[#f5f0e8] text-[#1b2a4a]">
      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-[#1b2a4a] text-white">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#c9a24e]/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-14 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sprout className="w-7 h-7 text-[#c9a24e]" />
            <span className="text-lg font-bold tracking-[0.2em]">NOMMA FOOD</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight max-w-3xl mx-auto animate-[fadeUp_.6s_ease-out]">{titulo}</h1>
          <p className="text-white/75 mt-4 max-w-2xl mx-auto text-sm sm:text-base animate-[fadeUp_.8s_ease-out]">{subtitulo}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="#solicitud" className="bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
              Solicitar acceso mayorista <ArrowRight size={18} />
            </a>
            <a href="#productos" className="border border-white/30 hover:bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              Ver catálogo
            </a>
          </div>
          <div className="mt-10 flex justify-center gap-3 opacity-90">
            {['🥪', '🥗', '🍰', '🥟', '🍜', '🥖'].map((e, i) => (
              <span key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. QUIÉNES SOMOS */}
      <section className="max-w-4xl mx-auto px-5 py-12 text-center">
        <h2 className="text-2xl font-bold">Producción vegetariana y vegana, pensada para vender</h2>
        <p className="text-gray-600 mt-3 text-sm sm:text-base">
          Elaboramos línea salada, pastelería, panadería y productos listos para vitrina, con recetas inspiradas en
          sabores tradicionales y asiáticos. Nos enfocamos en <b>calidad, innovación, abastecimiento y apoyo comercial</b> para
          nuestros clientes mayoristas.
        </p>
      </section>

      {/* 3. SERVICIOS */}
      <section className="max-w-5xl mx-auto px-5 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICIOS.map(s => (
            <div key={s.t} className="bg-white rounded-2xl p-5 shadow-card hover:shadow-lg transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-[#c9a24e]/12 flex items-center justify-center mb-3"><s.icon className="w-5 h-5 text-[#c9a24e]" /></div>
              <h3 className="font-bold">{s.t}</h3>
              <p className="text-sm text-gray-500 mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRODUCTOS DESTACADOS */}
      <section id="productos" className="max-w-5xl mx-auto px-5 py-12">
        <h2 className="text-2xl font-bold text-center">Productos destacados</h2>
        <p className="text-gray-500 text-center text-sm mt-1">Catálogo referencial. Los precios mayoristas se comparten al aprobar tu acceso.</p>
        {productos.length === 0 ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['Sándwiches y ciabattas', 'Pastelería', 'Ensaladas y bowls', 'Productos para vitrina', 'Línea asiática', 'Panadería'].map(c => (
              <span key={c} className="px-4 py-2 rounded-full bg-white shadow-card text-sm text-[#1b2a4a]">{c}</span>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {productos.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-[#1b2a4a] to-[#c9a24e]/40 flex items-center justify-center">
                  {p.foto_url ? <img src={p.foto_url} alt={p.name} className="w-full h-full object-cover" /> : <Leaf className="w-8 h-8 text-white/70" />}
                </div>
                <div className="p-3">
                  {p.category && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#c9a24e]/15 text-[#c9a24e]">{p.category}</span>}
                  <h3 className="font-bold text-sm mt-1">{p.name}</h3>
                  {p.descripcion_publica && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.descripcion_publica}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. VIDEO */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <div className="rounded-2xl overflow-hidden bg-[#1b2a4a] aspect-video flex items-center justify-center relative">
          {config?.video_url ? (
            <video src={config.video_url} controls className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-white/80 px-6">
              <PlayCircle className="w-14 h-14 mx-auto mb-3 text-[#c9a24e]" />
              <p className="font-semibold">Muy pronto: conoce cómo preparamos nuestros productos.</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. VITRINA Y PUNTOS DE VENTA */}
      <section className="max-w-5xl mx-auto px-5 py-12">
        <h2 className="text-2xl font-bold text-center">Productos listos para destacar en tu vitrina</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[Store, Coffee, GraduationCap].map((Icon, i) => (
            <div key={i} className="rounded-2xl aspect-[4/3] bg-gradient-to-br from-[#1b2a4a] to-[#c9a24e]/30 flex items-center justify-center">
              <Icon className="w-10 h-10 text-white/70" />
            </div>
          ))}
        </div>
        <div className="mt-8 bg-white rounded-2xl shadow-card p-6">
          <h3 className="font-bold flex items-center gap-2"><MapPin size={18} className="text-[#c9a24e]" /> Dónde estamos</h3>
          {puntos.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mt-3">Ya abastecemos a:</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {puntos.map(n => <span key={n} className="px-3 py-1 rounded-full bg-[#f5f0e8] text-sm text-[#1b2a4a] flex items-center gap-1"><Utensils size={12} className="text-[#c9a24e]" />{n}</span>)}
              </div>
            </>
          )}
          <p className="text-xs text-gray-400 mt-4">Zonas de cobertura:</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {zonas.map(z => <span key={z} className="px-3 py-1 rounded-full border border-gray-200 text-sm text-gray-600">{z}</span>)}
          </div>
        </div>
      </section>

      {/* 7. CTA FINAL */}
      <section className="bg-[#1b2a4a] text-white">
        <div className="max-w-3xl mx-auto px-5 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">¿Quieres vender NOMMA FOOD en tu negocio?</h2>
          <p className="text-white/75 mt-3">Solicita acceso mayorista y nuestro equipo comercial evaluará tu solicitud.</p>
          <a href="#solicitud" className="inline-flex items-center gap-2 mt-6 bg-[#c9a24e] hover:bg-[#b8923f] text-[#1b2a4a] font-bold px-6 py-3.5 rounded-xl transition-transform hover:-translate-y-0.5">
            Solicitar acceso mayorista <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* 8. FORMULARIO */}
      <section id="solicitud" className="max-w-2xl mx-auto px-5 py-14">
        <h2 className="text-2xl font-bold text-center">Solicitud de acceso mayorista</h2>
        <p className="text-gray-500 text-center text-sm mt-1 mb-6">Completa tus datos y te contactaremos.</p>
        <SolicitudForm />
      </section>

      <footer className="text-center text-xs text-gray-400 pb-10">NOMMA FOOD · Alma Libre Grupo SpA</footer>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </main>
  )
}
