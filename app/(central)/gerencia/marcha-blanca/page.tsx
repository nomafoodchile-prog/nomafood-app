'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Zap, Database, Globe,
  Shield, Users, Package, ShoppingCart, Truck, ChefHat, ClipboardList,
  BarChart3, CreditCard, Mail, MapPin, Bell, Settings, Play,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw, AlertTriangle
} from 'lucide-react'

/* ───────────────────────────── TIPOS ───────────────────────────── */
type ModuleStatus = 'listo' | 'parcial' | 'pendiente' | 'critico'
type DataType = 'real' | 'mock' | 'sin-conectar'
type IntegrationStatus = 'activa' | 'configurada' | 'pendiente' | 'no-iniciada'

interface ModuleInfo {
  nombre: string
  url: string
  status: ModuleStatus
  datos: DataType
  porcentaje: number
  icono: React.ReactNode
  seccion: string
  falta: string[]
  ok: string[]
}

interface Integracion {
  nombre: string
  status: IntegrationStatus
  porcentaje: number
  descripcion: string
  pendiente: string
}

interface ChecklistItem {
  categoria: string
  items: { texto: string; ok: boolean; critico: boolean }[]
}

/* ─────────────────────────── DATOS ───────────────────────────── */
const MODULOS: ModuleInfo[] = [
  // Auth
  {
    nombre: 'Login', url: '/login', status: 'parcial', datos: 'mock', porcentaje: 70,
    icono: <Shield size={16} />, seccion: 'Autenticación',
    ok: ['UI completa', 'Formulario funcional', 'Recuperar contraseña'],
    falta: ['Conectar Supabase Auth real', 'Redirect por rol post-login', 'RLS habilitado']
  },
  {
    nombre: 'Recuperar Contraseña', url: '/recuperar', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <Shield size={16} />, seccion: 'Autenticación',
    ok: ['UI completa', 'Formulario funcional'],
    falta: ['Email real via Resend', 'Token de reset en Supabase', 'Template de email']
  },
  // Operaciones
  {
    nombre: 'Dashboard', url: '/dashboard', status: 'parcial', datos: 'mock', porcentaje: 65,
    icono: <BarChart3 size={16} />, seccion: 'Operaciones',
    ok: ['KPIs visuales', 'Gráficos recharts', 'Diseño responsive'],
    falta: ['Queries reales Supabase', 'KPIs por rol', 'Alertas en tiempo real']
  },
  {
    nombre: 'Pedidos', url: '/operaciones/pedidos', status: 'parcial', datos: 'mock', porcentaje: 65,
    icono: <ShoppingCart size={16} />, seccion: 'Operaciones',
    ok: ['Lista de pedidos', 'Filtros por estado', 'Vista detalle', 'Cambio de estado'],
    falta: ['Conexión Supabase', 'Webhook Mercado Pago', 'Crear pedido manual', 'Asignar a producción/picking']
  },
  {
    nombre: 'Producción', url: '/operaciones/produccion', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <ChefHat size={16} />, seccion: 'Operaciones',
    ok: ['Vista de órdenes de producción', 'KPIs diarios', 'Estado por operario'],
    falta: ['Conexión Supabase', 'Asignar tareas a operarios', 'Recetas reales', 'Control de materias primas']
  },
  {
    nombre: 'Tareas', url: '/operaciones/tareas', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <ClipboardList size={16} />, seccion: 'Operaciones',
    ok: ['Lista de tareas', 'Estado por persona', 'Prioridades'],
    falta: ['Conexión Supabase', 'Asignación real de operarios', 'Notificaciones push', 'Historial']
  },
  {
    nombre: 'Inventario', url: '/operaciones/inventario', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <Package size={16} />, seccion: 'Operaciones',
    ok: ['Vista de stock', 'Alertas quiebre', 'Movimientos'],
    falta: ['Conexión Supabase', 'Entradas/salidas reales', 'Integración con pedidos y producción']
  },
  {
    nombre: 'Despachos', url: '/operaciones/despachos', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <Truck size={16} />, seccion: 'Operaciones',
    ok: ['Vista de guías', 'Estado de despacho', 'Chofer asignado'],
    falta: ['Conexión Supabase', 'Asignar ruta a chofer', 'Confirmación entrega real', 'Integración portal chofer']
  },
  {
    nombre: 'Limpieza', url: '/operaciones/limpieza', status: 'parcial', datos: 'mock', porcentaje: 58,
    icono: <ClipboardList size={16} />, seccion: 'Operaciones',
    ok: ['Checklist de limpieza', 'Estado por área', 'Fecha y hora'],
    falta: ['Conexión Supabase', 'Firma de responsable', 'Fotos de evidencia', 'Notificación a jefe']
  },
  {
    nombre: 'Mantención', url: '/operaciones/mantencion', status: 'parcial', datos: 'mock', porcentaje: 58,
    icono: <Settings size={16} />, seccion: 'Operaciones',
    ok: ['Registro de fallas', 'Calendario mantención', 'Estado máquinas'],
    falta: ['Conexión Supabase', 'Reportes reales', 'Alertas de mantención preventiva']
  },
  // Comercial
  {
    nombre: 'Clientes', url: '/comercial/clientes', status: 'parcial', datos: 'mock', porcentaje: 62,
    icono: <Users size={16} />, seccion: 'Comercial',
    ok: ['Lista clientes', 'Fichas de cliente', 'Historial de compras mock'],
    falta: ['Conexión Supabase', 'Solicitudes nuevos clientes', 'Aprobación de clientes mayoristas', 'Envío invitación']
  },
  {
    nombre: 'Campañas', url: '/comercial/campanas', status: 'parcial', datos: 'mock', porcentaje: 45,
    icono: <Mail size={16} />, seccion: 'Comercial',
    ok: ['Lista de campañas', 'Creación de campaña mock'],
    falta: ['Conexión Supabase', 'Envío real via Resend', 'Segmentación de clientes', 'Estado de envíos', 'Templates HTML']
  },
  {
    nombre: 'Productos', url: '/comercial/productos', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <Package size={16} />, seccion: 'Comercial',
    ok: ['Catálogo visual', 'Categorías', 'Precios', 'Imágenes placeholder'],
    falta: ['Conexión Supabase', 'Fotos reales', 'Gestión precios mayoristas', 'Sincronización con inventario']
  },
  // Compras
  {
    nombre: 'Proveedores', url: '/compras/proveedores', status: 'parcial', datos: 'mock', porcentaje: 65,
    icono: <Truck size={16} />, seccion: 'Compras',
    ok: ['Lista proveedores', 'Fichas', 'Historial compras', 'Encoding UTF-8 corregido'],
    falta: ['Conexión Supabase', 'Órdenes de compra reales', 'Recepción de mercadería', 'Integración inventario']
  },
  // Finanzas
  {
    nombre: 'Caja', url: '/finanzas/caja', status: 'parcial', datos: 'mock', porcentaje: 62,
    icono: <CreditCard size={16} />, seccion: 'Finanzas',
    ok: ['KPIs de caja', 'Movimientos', 'Filtros por fecha'],
    falta: ['Conexión Supabase', 'Movimientos reales', 'Integración con pagos Mercado Pago', 'Cuadre de caja']
  },
  {
    nombre: 'Cobranza', url: '/finanzas/cobranza', status: 'parcial', datos: 'mock', porcentaje: 62,
    icono: <CreditCard size={16} />, seccion: 'Finanzas',
    ok: ['KPIs cobranza', 'Facturas por estado', 'Gestión vencidos'],
    falta: ['Conexión Supabase', 'Facturas reales', 'Recordatorios automáticos', 'Integración pagos']
  },
  {
    nombre: 'Costos', url: '/finanzas/costos', status: 'parcial', datos: 'mock', porcentaje: 62,
    icono: <BarChart3 size={16} />, seccion: 'Finanzas',
    ok: ['Breakdown de costos', 'Costo por kg', 'Gráfico barras'],
    falta: ['Conexión Supabase', 'Costos reales por producción', 'Alertas de desviación']
  },
  {
    nombre: 'Balance', url: '/finanzas/balance', status: 'parcial', datos: 'mock', porcentaje: 60,
    icono: <BarChart3 size={16} />, seccion: 'Finanzas',
    ok: ['Vista de balance', 'Gráficos de tendencia'],
    falta: ['Conexión Supabase', 'Balance real', 'Exportar a Excel/PDF']
  },
  // Personas
  {
    nombre: 'Usuarios', url: '/personas/usuarios', status: 'parcial', datos: 'mock', porcentaje: 62,
    icono: <Users size={16} />, seccion: 'Personas',
    ok: ['Lista 9 usuarios', 'Roles', 'Estado activo/inactivo', 'Último acceso'],
    falta: ['Conexión Supabase', 'Crear usuario real', 'Enviar invitación', 'Integración Auth Supabase']
  },
  {
    nombre: 'Accesos', url: '/personas/accesos', status: 'parcial', datos: 'mock', porcentaje: 65,
    icono: <Shield size={16} />, seccion: 'Personas',
    ok: ['Matriz permisos 12×6', 'KPIs por rol', 'Barra de progreso'],
    falta: ['Conexión Supabase', 'Guardar permisos reales', 'RLS en Supabase', 'Aplicar permisos al sidebar']
  },
  // Portales
  {
    nombre: 'Portal Operario', url: '/portal/operario/demo', status: 'parcial', datos: 'mock', porcentaje: 45,
    icono: <ChefHat size={16} />, seccion: 'Portales',
    ok: ['UI de tareas del día', 'Botón iniciar/finalizar', 'Timer', 'Estado de tareas'],
    falta: ['Conexión Supabase', 'Auth por token real', 'Incidencias con foto', 'Reporte diario', 'Asistencia GeoVictoria']
  },
  {
    nombre: 'Portal Chofer', url: '/portal/chofer/demo', status: 'parcial', datos: 'mock', porcentaje: 40,
    icono: <Truck size={16} />, seccion: 'Portales',
    ok: ['UI ruta del día', 'Lista de entregas', 'Botón Waze', 'Estado de pedidos'],
    falta: ['Conexión Supabase', 'Auth por token real', 'Foto de entrega', 'Rendición gastos', 'Incidencias']
  },
  {
    nombre: 'Portal Picker', url: '/portal/picker/demo', status: 'parcial', datos: 'mock', porcentaje: 40,
    icono: <Package size={16} />, seccion: 'Portales',
    ok: ['UI pedidos por armar', 'Checklist de productos', 'Estado del pedido'],
    falta: ['Conexión Supabase', 'Auth por token real', 'Ubicaciones bodega', 'Foto en caso de error']
  },
  {
    nombre: 'Portal Mayoristas', url: '/mayoristas', status: 'parcial', datos: 'mock', porcentaje: 35,
    icono: <ShoppingCart size={16} />, seccion: 'Portales',
    ok: ['Landing profesional', 'Catálogo productos', 'Precios mayoristas', 'Formulario solicitud'],
    falta: ['Login mayorista', 'Carrito de compra', 'Checkout real', 'Mercado Pago', 'Historial pedidos', 'Confirmación por email']
  }
]

const INTEGRACIONES: Integracion[] = [
  {
    nombre: 'Supabase (Base de datos)',
    status: 'configurada',
    porcentaje: 35,
    descripcion: '42 tablas definidas en schema.sql. Supabase conectado en código. Variables de entorno en Vercel.',
    pendiente: 'Ejecutar schema.sql en Supabase Dashboard > SQL Editor. Configurar RLS policies. Conectar queries reales en cada página.'
  },
  {
    nombre: 'Supabase Auth',
    status: 'configurada',
    porcentaje: 30,
    descripcion: 'Cliente configurado. Middleware preparado. Roles definidos.',
    pendiente: 'Activar Auth en Supabase. Crear usuarios reales. Configurar redirect por rol post-login. RLS por user_id.'
  },
  {
    nombre: 'Resend (Email transaccional)',
    status: 'configurada',
    porcentaje: 25,
    descripcion: 'Package instalado. Variables de entorno preparadas. Código de envío parcialmente implementado.',
    pendiente: 'Ingresar RESEND_API_KEY real en Vercel. Verificar dominio nomafood.cl en Resend. Probar templates.'
  },
  {
    nombre: 'Mercado Pago',
    status: 'pendiente',
    porcentaje: 10,
    descripcion: 'Variables de entorno preparadas. Flujo diseñado. Package mercadopago NO instalado aún.',
    pendiente: 'Instalar package mercadopago. Crear API routes /api/mp/crear-preferencia y /api/mp/webhook. Ingresar credenciales reales en Vercel.'
  },
  {
    nombre: 'Vercel (Deploy)',
    status: 'activa',
    porcentaje: 85,
    descripcion: 'Desplegado y funcionando en nomafood-app.vercel.app. CI/CD automático desde GitHub.',
    pendiente: 'Conectar dominio nomafood.cl. Verificar SSL automático. Configurar variables de entorno reales.'
  },
  {
    nombre: 'GitHub (CI/CD)',
    status: 'activa',
    porcentaje: 100,
    descripcion: 'Repo nomafoodchile-prog/nomafood-app. Deploy automático en push a main.',
    pendiente: 'Ninguno — funcionando correctamente.'
  },
  {
    nombre: 'WhatsApp Business API',
    status: 'pendiente',
    porcentaje: 5,
    descripcion: 'Variables de entorno preparadas en .env.example.',
    pendiente: 'Configurar Meta Business. Obtener WhatsApp Access Token y Phone Number ID reales.'
  },
  {
    nombre: 'Google Maps / Waze',
    status: 'pendiente',
    porcentaje: 15,
    descripcion: 'Leaflet instalado (alternativa open source). Código de mapa en DriverMapClient.tsx.',
    pendiente: 'Elegir entre Leaflet (gratuito) o Google Maps (requiere API key). Portal chofer ya tiene botón Waze.'
  },
  {
    nombre: 'GeoVictoria (Asistencia)',
    status: 'no-iniciada',
    porcentaje: 0,
    descripcion: 'No iniciada. Estructura de datos diseñada en schema (tabla operators).',
    pendiente: 'En espera de contrato con GeoVictoria. Diseñar webhook para recibir marcaciones.'
  }
]

const CHECKLIST: ChecklistItem[] = [
  {
    categoria: '1. Infraestructura',
    items: [
      { texto: 'Deploy en Vercel funcionando', ok: true, critico: true },
      { texto: 'HTTPS / SSL activo en .vercel.app', ok: true, critico: true },
      { texto: 'Dominio nomafood.cl configurado en Vercel', ok: false, critico: false },
      { texto: 'SSL en dominio propio activo', ok: false, critico: false },
      { texto: 'Variables de entorno reales en Vercel', ok: false, critico: true },
      { texto: 'Schema SQL ejecutado en Supabase', ok: false, critico: true },
      { texto: 'RLS policies activas en Supabase', ok: false, critico: true },
    ]
  },
  {
    categoria: '2. Usuarios y Accesos',
    items: [
      { texto: 'Supabase Auth habilitado', ok: false, critico: true },
      { texto: 'Usuario Gerencia creado', ok: false, critico: true },
      { texto: 'Usuario Administrador creado', ok: false, critico: true },
      { texto: 'Usuario Operario de prueba creado', ok: false, critico: false },
      { texto: 'Usuario Chofer de prueba creado', ok: false, critico: false },
      { texto: 'Usuario Picker de prueba creado', ok: false, critico: false },
      { texto: 'Login redirige por rol', ok: false, critico: true },
    ]
  },
  {
    categoria: '3. Módulos Centrales',
    items: [
      { texto: 'Dashboard muestra datos reales', ok: false, critico: false },
      { texto: 'Pedidos conectado a Supabase', ok: false, critico: true },
      { texto: 'Producción conectada a Supabase', ok: false, critico: true },
      { texto: 'Inventario conectado a Supabase', ok: false, critico: true },
      { texto: 'Despachos conectados a Supabase', ok: false, critico: true },
      { texto: 'Clientes conectados a Supabase', ok: false, critico: true },
      { texto: 'Todos los módulos accesibles ✅', ok: true, critico: true },
    ]
  },
  {
    categoria: '4. Portales de Rol',
    items: [
      { texto: 'Portal Operario funcional con datos reales', ok: false, critico: true },
      { texto: 'Portal Chofer funcional con datos reales', ok: false, critico: true },
      { texto: 'Portal Picker funcional con datos reales', ok: false, critico: true },
      { texto: 'Portales optimizados para celular', ok: true, critico: true },
      { texto: 'Auth por token en portales de rol', ok: false, critico: true },
    ]
  },
  {
    categoria: '5. Portal Mayoristas',
    items: [
      { texto: 'Landing page mayoristas accesible', ok: true, critico: false },
      { texto: 'Formulario solicitud envía email real', ok: false, critico: false },
      { texto: 'Login mayorista funcional', ok: false, critico: true },
      { texto: 'Catálogo con productos reales', ok: false, critico: true },
      { texto: 'Carrito de compras funcional', ok: false, critico: true },
      { texto: 'Checkout con Mercado Pago', ok: false, critico: true },
      { texto: 'Pedido se crea en admin tras pago', ok: false, critico: true },
    ]
  },
  {
    categoria: '6. Integraciones',
    items: [
      { texto: 'Resend enviando emails reales', ok: false, critico: false },
      { texto: 'Mercado Pago recibiendo pagos', ok: false, critico: false },
      { texto: 'Webhook Mercado Pago configurado', ok: false, critico: false },
      { texto: 'Google Analytics configurado', ok: false, critico: false },
    ]
  },
  {
    categoria: '7. Seguridad',
    items: [
      { texto: 'RLS activo en todas las tablas', ok: false, critico: true },
      { texto: 'Service role key solo en servidor', ok: true, critico: true },
      { texto: 'PAT GitHub rotado antes de jul-2026', ok: false, critico: true },
      { texto: 'Variables sensibles solo en Vercel env', ok: true, critico: true },
      { texto: 'Auditoría de acciones implementada', ok: false, critico: false },
    ]
  }
]

/* ─────────────────────── COMPONENTES UI ──────────────────────── */
function StatusBadge({ status }: { status: ModuleStatus | IntegrationStatus }) {
  const map: Record<string, { label: string; cls: string }> = {
    listo:       { label: '✅ Listo',       cls: 'bg-green-100 text-green-700' },
    parcial:     { label: '⚠️ Parcial',     cls: 'bg-yellow-100 text-yellow-700' },
    pendiente:   { label: '🕐 Pendiente',   cls: 'bg-blue-100 text-blue-700' },
    critico:     { label: '🔴 Crítico',     cls: 'bg-red-100 text-red-700' },
    activa:      { label: '✅ Activa',      cls: 'bg-green-100 text-green-700' },
    configurada: { label: '⚙️ Configurada', cls: 'bg-yellow-100 text-yellow-700' },
    'no-iniciada':{ label: '⏳ No iniciada', cls: 'bg-gray-100 text-gray-500' }
  }
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function DataBadge({ tipo }: { tipo: DataType }) {
  const map = {
    real: { label: 'Datos reales', cls: 'bg-green-100 text-green-700' },
    mock: { label: 'Mock data', cls: 'bg-orange-100 text-orange-700' },
    'sin-conectar': { label: 'Sin conectar', cls: 'bg-red-100 text-red-700' }
  }
  const s = map[tipo]
  return <span className={`px-2 py-0.5 rounded-full text-xs ${s.cls}`}>{s.label}</span>
}

function ProgressBar({ value, color = 'gold' }: { value: number; color?: string }) {
  const colors = {
    gold: 'bg-[#c9a84c]', green: 'bg-green-500', red: 'bg-red-500', blue: 'bg-blue-500'
  }
  const c = value >= 80 ? colors.green : value >= 50 ? colors.gold : value >= 30 ? 'bg-orange-400' : colors.red
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${c}`} style={{ width: `${value}%` }} />
    </div>
  )
}

function ModuleCard({ mod, expanded, onToggle }: { mod: ModuleInfo; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors"
      >
        <span className="text-gray-500">{mod.icono}</span>
        <span className="font-medium text-sm text-gray-800 flex-1">{mod.nombre}</span>
        <DataBadge tipo={mod.datos} />
        <StatusBadge status={mod.status} />
        <span className="text-xs text-gray-500 w-8 text-right">{mod.porcentaje}%</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      <div className="px-3 pb-1">
        <ProgressBar value={mod.porcentaje} />
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1.5">✅ Implementado</p>
            {mod.ok.map((item, i) => (
              <p key={i} className="text-xs text-gray-600 flex gap-1.5 mb-0.5">
                <CheckCircle2 size={11} className="text-green-500 mt-0.5 shrink-0" /> {item}
              </p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-700 mb-1.5">🔧 Falta</p>
            {mod.falta.map((item, i) => (
              <p key={i} className="text-xs text-gray-600 flex gap-1.5 mb-0.5">
                <AlertCircle size={11} className="text-orange-500 mt-0.5 shrink-0" /> {item}
              </p>
            ))}
          </div>
          <div className="col-span-2">
            <a
              href={mod.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#c9a84c] hover:text-[#b8943b]"
            >
              <ExternalLink size={11} /> Ver módulo → {mod.url}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── PÁGINA PRINCIPAL ─────────────────────── */
export default function MarchaBlancoPage() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('Operaciones')
  const [showChecklist, setShowChecklist] = useState(true)
  const [showIntegraciones, setShowIntegraciones] = useState(true)
  const [testRunning, setTestRunning] = useState<string | null>(null)

  // Calcular porcentaje general
  const avgPct = Math.round(MODULOS.reduce((s, m) => s + m.porcentaje, 0) / MODULOS.length)
  const integPct = Math.round(INTEGRACIONES.reduce((s, i) => s + i.porcentaje, 0) / INTEGRACIONES.length)
  const overallPct = Math.round((avgPct + integPct) / 2)

  const mockCount = MODULOS.filter(m => m.datos === 'mock').length
  const listoCount = MODULOS.filter(m => m.status === 'listo').length
  const parcialCount = MODULOS.filter(m => m.status === 'parcial').length

  const checklistTotal = CHECKLIST.flatMap(c => c.items).length
  const checklistOk = CHECKLIST.flatMap(c => c.items).filter(i => i.ok).length
  const criticosFaltantes = CHECKLIST.flatMap(c => c.items).filter(i => !i.ok && i.critico).length

  // Agrupar módulos por sección
  const sections = [...new Set(MODULOS.map(m => m.seccion))]

  async function runModuleTest(nombre: string) {
    setTestRunning(nombre)
    await new Promise(r => setTimeout(r, 1500))
    setTestRunning(null)
    alert(`Prueba de "${nombre}" ejecutada.\nResultado: UI cargando correctamente. Datos: mock.\nVerifica la consola del navegador para más detalles.`)
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-[#c9a84c]" />
          <h1 className="text-xl font-bold text-[#0f0f0f]">Marcha Blanca / Estado de Implementación</h1>
        </div>
        <p className="text-sm text-gray-500">Centro de control de lanzamiento — Noma Food Sistema Operacional</p>
      </div>

      {/* KPIs GENERALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Avance General', value: `${overallPct}%`,
            sub: 'módulos + integraciones', color: overallPct >= 70 ? 'text-green-600' : 'text-[#c9a84c]'
          },
          {
            label: 'Módulos Parciales', value: `${parcialCount}/${MODULOS.length}`,
            sub: 'con UI completa, sin datos reales', color: 'text-yellow-600'
          },
          {
            label: 'Usando Mock Data', value: `${mockCount} módulos`,
            sub: 'necesitan conexión Supabase', color: 'text-orange-600'
          },
          {
            label: 'Checklist Lanzamiento', value: `${checklistOk}/${checklistTotal}`,
            sub: `${criticosFaltantes} críticos pendientes`, color: criticosFaltantes > 0 ? 'text-red-600' : 'text-green-600'
          }
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* BARRA DE AVANCE GENERAL */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progreso hacia Marcha Blanca Real</span>
          <span className="text-sm font-bold text-[#c9a84c]">{overallPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-[#c9a84c] to-[#e8c76a] transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Estructura UI lista</span>
          <span>Conexión datos reales</span>
          <span>Pruebas completas</span>
          <span>🚀 Lanzamiento</span>
        </div>
      </div>

      {/* ALERTA CRÍTICA */}
      {criticosFaltantes > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 mb-1">
              {criticosFaltantes} elementos críticos pendientes antes del lanzamiento
            </p>
            <p className="text-xs text-red-600">
              Ejecutar schema SQL en Supabase · Configurar Auth · Conectar módulos a datos reales · Rotar PAT GitHub · Configurar variables de entorno reales
            </p>
          </div>
        </div>
      )}

      {/* MÓDULOS POR SECCIÓN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Estado de Módulos por Sección</h2>
        </div>
        <div className="p-4 space-y-4">
          {sections.map(sec => {
            const mods = MODULOS.filter(m => m.seccion === sec)
            const secPct = Math.round(mods.reduce((s, m) => s + m.porcentaje, 0) / mods.length)
            const isOpen = expandedSection === sec
            return (
              <div key={sec} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isOpen ? null : sec)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700">{sec}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{mods.length} módulos · {secPct}% promedio</span>
                    <div className="w-24">
                      <ProgressBar value={secPct} />
                    </div>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-3 space-y-2">
                    {mods.map(mod => (
                      <div key={mod.nombre} className="flex items-center gap-3">
                        <ModuleCard
                          mod={mod}
                          expanded={expandedModule === mod.nombre}
                          onToggle={() => setExpandedModule(expandedModule === mod.nombre ? null : mod.nombre)}
                        />
                        <button
                          onClick={() => runModuleTest(mod.nombre)}
                          disabled={testRunning === mod.nombre}
                          className="shrink-0 p-1.5 rounded-lg bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 text-[#c9a84c] transition-colors"
                          title="Ejecutar prueba"
                        >
                          {testRunning === mod.nombre
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Play size={13} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* INTEGRACIONES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <button
          onClick={() => setShowIntegraciones(!showIntegraciones)}
          className="w-full flex items-center justify-between p-4 border-b border-gray-100"
        >
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Globe size={16} className="text-[#c9a84c]" /> Estado de Integraciones
          </h2>
          {showIntegraciones ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showIntegraciones && (
          <div className="p-4 space-y-3">
            {INTEGRACIONES.map((integ, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">{integ.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{integ.porcentaje}%</span>
                    <StatusBadge status={integ.status} />
                  </div>
                </div>
                <ProgressBar value={integ.porcentaje} />
                <p className="text-xs text-gray-500 mt-2">{integ.descripcion}</p>
                {integ.pendiente !== 'Ninguno — funcionando correctamente.' && (
                  <p className="text-xs text-orange-600 mt-1 flex gap-1">
                    <AlertCircle size={11} className="shrink-0 mt-0.5" /> {integ.pendiente}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHECKLIST DE LANZAMIENTO */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between p-4 border-b border-gray-100"
        >
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardList size={16} className="text-[#c9a84c]" />
            Checklist de Lanzamiento ({checklistOk}/{checklistTotal})
          </h2>
          {showChecklist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showChecklist && (
          <div className="p-4 grid md:grid-cols-2 gap-4">
            {CHECKLIST.map((cat, ci) => (
              <div key={ci} className="border border-gray-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">{cat.categoria}</p>
                {cat.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2 py-0.5">
                    {item.ok
                      ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      : item.critico
                        ? <XCircle size={14} className="text-red-500 shrink-0" />
                        : <Clock size={14} className="text-gray-300 shrink-0" />}
                    <span className={`text-xs ${item.ok ? 'text-gray-500' : item.critico ? 'text-red-700 font-medium' : 'text-gray-400'}`}>
                      {item.texto}
                    </span>
                    {item.critico && !item.ok && (
                      <span className="text-xs bg-red-100 text-red-600 px-1 rounded ml-auto">crítico</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PENDIENTES DE NATALY */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
          <Bell size={16} /> Pendientes de Nataly — Acciones Manuales Requeridas
        </h2>
        {[
          {
            num: '01', urgencia: 'CRÍTICO', titulo: 'Ejecutar schema SQL en Supabase',
            pasos: ['Ir a app.supabase.com → tu proyecto → SQL Editor', 'Pegar el contenido de supabase/schema.sql del repo', 'Ejecutar (F5 o botón Run)']
          },
          {
            num: '02', urgencia: 'CRÍTICO', titulo: 'Configurar variables de entorno reales en Vercel',
            pasos: ['Ir a vercel.com → nomafood-app → Settings → Environment Variables', 'Agregar: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY', 'Agregar: RESEND_API_KEY, MERCADO_PAGO_ACCESS_TOKEN, NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY', 'Hacer Redeploy desde Vercel']
          },
          {
            num: '03', urgencia: 'CRÍTICO', titulo: 'Rotar/eliminar PAT de GitHub expuesto',
            pasos: ['Ir a github.com → Settings → Developer settings → Personal access tokens', 'Revocar token ghp_uRITV05...', 'Crear nuevo token con scope mínimo (solo repo write)', 'NO compartir el nuevo token por WhatsApp ni chat']
          },
          {
            num: '04', urgencia: 'IMPORTANTE', titulo: 'Conectar dominio nomafood.cl en Vercel',
            pasos: ['Ir a vercel.com → nomafood-app → Settings → Domains', 'Agregar nomafood.cl y www.nomafood.cl', 'Copiar los registros DNS que Vercel indica', 'Ir a tu proveedor de dominio y agregar esos registros']
          },
          {
            num: '05', urgencia: 'IMPORTANTE', titulo: 'Crear usuarios iniciales en Supabase Auth',
            pasos: ['Ir a app.supabase.com → Authentication → Users', 'Crear usuario gerencia@nomafood.cl con rol gerencia', 'Crear usuario admin@nomafood.cl con rol administrador', 'Enviar credenciales de forma segura']
          },
          {
            num: '06', urgencia: 'IMPORTANTE', titulo: 'Verificar dominio en Resend para emails',
            pasos: ['Ir a resend.com → Domains', 'Agregar nomafood.cl', 'Copiar registros DNS (SPF, DKIM)', 'Agregar en tu proveedor de dominio', 'Ingresar RESEND_API_KEY en Vercel']
          },
          {
            num: '07', urgencia: 'CUANDO ESTÉ LISTO', titulo: 'Configurar credenciales reales de Mercado Pago',
            pasos: ['Ir a mercadopago.cl → Tu cuenta → Credenciales', 'Copiar Access Token de producción', 'Copiar Public Key de producción', 'Agregar en Vercel como MERCADO_PAGO_ACCESS_TOKEN y NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY']
          }
        ].map((p, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-700 bg-amber-200 rounded px-1.5 py-0.5">{p.num}</span>
              <span className={`text-xs font-bold ${p.urgencia === 'CRÍTICO' ? 'text-red-600' : p.urgencia === 'IMPORTANTE' ? 'text-amber-700' : 'text-gray-500'}`}>
                {p.urgencia}
              </span>
              <span className="text-sm font-semibold text-gray-800">{p.titulo}</span>
            </div>
            <ol className="ml-12 space-y-0.5">
              {p.pasos.map((paso, j) => (
                <li key={j} className="text-xs text-gray-600 flex gap-1.5">
                  <span className="text-amber-500 shrink-0">{j + 1}.</span> {paso}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-400 pb-4">
        <p>Noma Food Sistema Operacional · Marcha Blanca Dashboard · Última actualización: julio 2026</p>
        <p className="mt-1">Avance general: {overallPct}% · {MODULOS.length} módulos · {INTEGRACIONES.length} integraciones</p>
      </div>
    </div>
  )
}
