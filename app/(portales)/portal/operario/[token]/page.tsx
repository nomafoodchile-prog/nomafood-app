'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, CheckCircle2, AlertCircle, Play, Pause, Camera, Send,
  ChevronDown, ChevronUp, User, LogOut, RefreshCw, Wifi, WifiOff,
  ClipboardList, Package, Wrench, SprayCan, Star, MessageSquare
} from 'lucide-react'

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada'
type TaskType = 'produccion' | 'limpieza' | 'mantencion' | 'inventario' | 'otro'

interface Operator {
  id: string
  nombre: string
  apellido: string
  cargo: string
  turno: string
  token: string
}

interface Task {
  id: string
  titulo: string
  descripcion: string
  tipo: TaskType
  status: TaskStatus
  prioridad: number
  minutos_estimados: number
  minutos_reales?: number
  started_at?: string
  completed_at?: string
  notas?: string
}

interface Incidencia {
  tipo: 'maquina' | 'material' | 'seguridad' | 'calidad' | 'otro'
  descripcion: string
  urgencia: 'baja' | 'media' | 'alta'
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const TYPE_ICONS: Record<TaskType, typeof Clock> = {
  produccion: ClipboardList,
  limpieza: SprayCan,
  mantencion: Wrench,
  inventario: Package,
  otro: Star,
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_progreso: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  bloqueada: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  bloqueada: 'Bloqueada',
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtHour(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */
export default function PortalOperario({ params }: { params: { token: string } }) {
  const { token } = params

  const [operator, setOperator] = useState<Operator | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date>(new Date())

  // Timer state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [timerSecs, setTimerSecs] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  // UI state
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [showIncidencia, setShowIncidencia] = useState(false)
  const [showReporte, setShowReporte] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Incidencia form
  const [incidencia, setIncidencia] = useState<Incidencia>({
    tipo: 'otro', descripcion: '', urgencia: 'media'
  })

  // Reporte diario
  const [reporte, setReporte] = useState('')
  const [nota, setNota] = useState('')

  /* ── Carga de datos ── */
  const loadData = useCallback(async () => {
    try {
      setOnline(navigator.onLine)
      const res = await fetch(`/api/portal/operario/${token}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
        setError(err.error || 'Token inválido o expirado')
        setLoading(false)
        return
      }
      const data = await res.json()
      setOperator(data.operator)
      setTasks(data.tasks)
      setLastSync(new Date())
      setError(null)
    } catch (e) {
      setOnline(false)
      setError('Sin conexión. Trabajando en modo offline.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const id = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadData])

  // Connectivity listeners
  useEffect(() => {
    const onOnline = () => { setOnline(true); loadData() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [loadData])

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setTimerSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  /* ── Acciones ── */
  async function startTask(taskId: string) {
    setSaving(taskId)
    try {
      await fetch(`/api/portal/operario/${token}/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'en_progreso', started_at: new Date().toISOString() })
      })
      setActiveTaskId(taskId)
      setTimerSecs(0)
      setTimerRunning(true)
      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, status: 'en_progreso', started_at: new Date().toISOString() }
        : t))
    } finally { setSaving(null) }
  }

  async function pauseTask() {
    setTimerRunning(false)
  }

  async function completeTask(taskId: string) {
    setSaving(taskId)
    try {
      const mins = Math.round(timerSecs / 60) || 1
      await fetch(`/api/portal/operario/${token}/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completada',
          completed_at: new Date().toISOString(),
          minutos_reales: mins,
          notas: nota
        })
      })
      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, status: 'completada', completed_at: new Date().toISOString(), minutos_reales: mins }
        : t))
      if (activeTaskId === taskId) {
        setActiveTaskId(null); setTimerRunning(false); setTimerSecs(0)
      }
      setNota('')
      showSuccess('¡Tarea completada!')
    } finally { setSaving(null) }
  }

  async function submitIncidencia() {
    if (!incidencia.descripcion.trim()) return
    setSaving('incidencia')
    try {
      await fetch(`/api/portal/operario/${token}/incidencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...incidencia, operator_token: token })
      })
      setIncidencia({ tipo: 'otro', descripcion: '', urgencia: 'media' })
      setShowIncidencia(false)
      showSuccess('Incidencia reportada')
    } finally { setSaving(null) }
  }

  async function submitReporte() {
    if (!reporte.trim()) return
    setSaving('reporte')
    try {
      await fetch(`/api/portal/operario/${token}/reporte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: reporte,
          tareasCompletadas: tasks.filter(t => t.status === 'completada').length,
          totalTareas: tasks.length,
          fecha: new Date().toISOString()
        })
      })
      setReporte('')
      setShowReporte(false)
      showSuccess('Reporte enviado')
    } finally { setSaving(null) }
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  /* ── Stats ── */
  const completadas = tasks.filter(t => t.status === 'completada').length
  const enProgreso = tasks.filter(t => t.status === 'en_progreso').length
  const totalTasks = tasks.length
  const pct = totalTasks > 0 ? Math.round((completadas / totalTasks) * 100) : 0

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Cargando portal...</p>
        </div>
      </div>
    )
  }

  /* ── ERROR / TOKEN INVÁLIDO ── */
  if (error && !operator) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <AlertCircle className="text-red-500 w-12 h-12 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Acceso no autorizado</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-4">Contacta a tu supervisor para obtener un enlace válido.</p>
        </div>
      </div>
    )
  }

  /* ── PORTAL PRINCIPAL ── */
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0f0f0f] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center">
            <User size={16} className="text-[#0f0f0f]" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Portal Operario</p>
            <p className="text-sm font-semibold">{operator?.nombre} {operator?.apellido}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online
            ? <Wifi size={14} className="text-green-400" />
            : <WifiOff size={14} className="text-red-400" />}
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-white/10">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <WifiOff size={12} /> Sin conexión — los cambios se sincronizarán al reconectar
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#0f0f0f]">{completadas}</p>
            <p className="text-xs text-gray-500 mt-0.5">Completadas</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{enProgreso}</p>
            <p className="text-xs text-gray-500 mt-0.5">En progreso</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#c9a84c]">{pct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Avance</p>
          </div>
        </div>

        {/* Timer activo */}
        {activeTaskId && (
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <p className="text-xs opacity-75 mb-1">Tarea activa</p>
            <p className="text-sm font-semibold mb-3 truncate">
              {tasks.find(t => t.id === activeTaskId)?.titulo}
            </p>
            <div className="text-3xl font-mono font-bold text-center my-3">
              {fmtTime(timerSecs)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimerRunning(r => !r)}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-2 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {timerRunning ? <><Pause size={15} /> Pausar</> : <><Play size={15} /> Reanudar</>}
              </button>
              <button
                onClick={() => completeTask(activeTaskId)}
                disabled={saving === activeTaskId}
                className="flex-1 bg-green-400 hover:bg-green-500 text-green-900 rounded-xl py-2 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <CheckCircle2 size={15} /> Completar
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Progreso del día</span>
            <span className="text-xs text-gray-500">{completadas}/{totalTasks} tareas</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a84c] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Última sincronización: {lastSync.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Lista de tareas */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 px-1">Tareas del turno</h2>

          {tasks.length === 0 && (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
              <ClipboardList className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-500">No hay tareas asignadas hoy</p>
            </div>
          )}

          {tasks.map(task => {
            const Icon = TYPE_ICONS[task.tipo] || Star
            const isExpanded = expandedTask === task.id
            const isActive = activeTaskId === task.id

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  isActive ? 'border-blue-300' : 'border-gray-100'
                } ${task.status === 'completada' ? 'opacity-60' : ''}`}
              >
                {/* Cabecera tarea */}
                <button
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className={`p-2 rounded-lg ${
                    task.status === 'completada' ? 'bg-green-100' :
                    task.status === 'en_progreso' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon size={16} className={
                      task.status === 'completada' ? 'text-green-600' :
                      task.status === 'en_progreso' ? 'text-blue-600' : 'text-gray-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      task.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}>{task.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {task.minutos_estimados && (
                        <span className="text-xs text-gray-400">~{task.minutos_estimados} min</span>
                      )}
                    </div>
                  </div>
                  {task.status === 'completada'
                    ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    : isExpanded
                      ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  }
                </button>

                {/* Detalle expandible */}
                {isExpanded && task.status !== 'completada' && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                    {task.descripcion && (
                      <p className="text-xs text-gray-600">{task.descripcion}</p>
                    )}
                    {task.started_at && (
                      <p className="text-xs text-gray-400">
                        Iniciada: {fmtHour(task.started_at)}
                        {task.completed_at && ` · Completada: ${fmtHour(task.completed_at)}`}
                      </p>
                    )}

                    {/* Nota opcional */}
                    {task.status === 'en_progreso' && activeTaskId === task.id && (
                      <textarea
                        value={nota}
                        onChange={e => setNota(e.target.value)}
                        placeholder="Nota opcional al completar..."
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                        rows={2}
                      />
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      {task.status === 'pendiente' && (
                        <button
                          onClick={() => startTask(task.id)}
                          disabled={!!activeTaskId || saving === task.id}
                          className="flex-1 bg-[#0f0f0f] text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {saving === task.id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Play size={13} />}
                          Iniciar tarea
                        </button>
                      )}
                      {task.status === 'en_progreso' && activeTaskId !== task.id && (
                        <button
                          onClick={() => startTask(task.id)}
                          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Play size={13} /> Reanudar
                        </button>
                      )}
                      {task.status === 'en_progreso' && (
                        <button
                          onClick={() => completeTask(task.id)}
                          disabled={saving === task.id}
                          className="flex-1 bg-green-500 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} /> Marcar completa
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tarea completada: info final */}
                {isExpanded && task.status === 'completada' && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">
                      ✓ Completada a las {fmtHour(task.completed_at)}
                      {task.minutos_reales && ` · ${task.minutos_reales} min reales`}
                    </p>
                    {task.notas && <p className="text-xs text-gray-400 mt-1 italic">"{task.notas}"</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowIncidencia(true)}
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center hover:bg-amber-100 transition-colors"
          >
            <AlertCircle className="mx-auto text-amber-500 mb-1" size={20} />
            <p className="text-xs font-semibold text-amber-700">Reportar</p>
            <p className="text-xs text-amber-600">incidencia</p>
          </button>
          <button
            onClick={() => setShowReporte(true)}
            className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center hover:bg-blue-100 transition-colors"
          >
            <MessageSquare className="mx-auto text-blue-500 mb-1" size={20} />
            <p className="text-xs font-semibold text-blue-700">Reporte</p>
            <p className="text-xs text-blue-600">del día</p>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>{operator?.cargo} · Turno {operator?.turno}</p>
          <p className="mt-1">Noma Food · Sistema Operacional</p>
        </div>
      </div>

      {/* Modal: Reportar incidencia */}
      {showIncidencia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" /> Reportar Incidencia
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                <select
                  value={incidencia.tipo}
                  onChange={e => setIncidencia(p => ({ ...p, tipo: e.target.value as Incidencia['tipo'] }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                >
                  <option value="maquina">Falla de máquina</option>
                  <option value="material">Falta de material</option>
                  <option value="seguridad">Seguridad</option>
                  <option value="calidad">Calidad del producto</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Urgencia</label>
                <div className="flex gap-2">
                  {(['baja', 'media', 'alta'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setIncidencia(p => ({ ...p, urgencia: u }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize ${
                        incidencia.urgencia === u
                          ? u === 'alta' ? 'bg-red-500 text-white'
                            : u === 'media' ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >{u}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción *</label>
                <textarea
                  value={incidencia.descripcion}
                  onChange={e => setIncidencia(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe la incidencia..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowIncidencia(false)}
                  className="flex-1 bg-gray-100 rounded-xl py-2.5 text-sm text-gray-600 font-medium"
                >Cancelar</button>
                <button
                  onClick={submitIncidencia}
                  disabled={!incidencia.descripcion.trim() || saving === 'incidencia'}
                  className="flex-1 bg-[#0f0f0f] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving === 'incidencia'
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Send size={14} />}
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reporte del día */}
      {showReporte && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-800 mb-1">Reporte del día</h3>
            <p className="text-xs text-gray-400 mb-4">
              Tareas completadas: {completadas}/{totalTasks}
            </p>
            <textarea
              value={reporte}
              onChange={e => setReporte(e.target.value)}
              placeholder="¿Cómo fue el turno? ¿Algo importante que reportar?"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
              rows={5}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowReporte(false)}
                className="flex-1 bg-gray-100 rounded-xl py-2.5 text-sm text-gray-600 font-medium"
              >Cancelar</button>
              <button
                onClick={submitReporte}
                disabled={!reporte.trim() || saving === 'reporte'}
                className="flex-1 bg-[#c9a84c] text-[#0f0f0f] rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving === 'reporte'
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Send size={14} />}
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
