// lib/agente/ejecutar.ts
// Un ciclo del orquestador: detecta señales → las guarda (dedup) → calcula
// contexto → el cerebro produce el informe → guarda el informe en app_config.
// Lo usan el cron (24/7) y el botón "Ejecutar ahora" del cockpit.
// Solo lectura de datos + escritura a `notificaciones` (alertas internas) y
// `app_config` (último informe). NUNCA manda correos/dinero ni ejecuta acciones.

import type { SupabaseClient } from '@supabase/supabase-js'
import { generarSenales, persistirSenales, type Senal } from './senales'
import { calcularContexto } from './contexto'
import { generarInforme, type Informe } from './cerebro'

const CLAVE = 'agente_ultimo'

export interface ResultadoAgente {
  ejecutado: string
  disparador: 'cron' | 'manual'
  stats: { senales: number; criticas: number; altas: number; nuevas: number }
  contexto: Awaited<ReturnType<typeof calcularContexto>>
  informe: Informe
}

async function guardarConfig(db: SupabaseClient, valor: string) {
  const { data, error } = await db.from('app_config').update({ valor }).eq('clave', CLAVE).select('clave')
  if (error) return
  if (!data || data.length === 0) {
    await db.from('app_config').insert({ clave: CLAVE, valor })
  }
}

export async function ejecutarAgente(db: SupabaseClient, disparador: 'cron' | 'manual'): Promise<ResultadoAgente> {
  const senales: Senal[] = await generarSenales(db)
  const nuevas = await persistirSenales(db, senales)
  const contexto = await calcularContexto(db)
  const informe = await generarInforme(senales, contexto)

  const resultado: ResultadoAgente = {
    ejecutado: new Date().toISOString(),
    disparador,
    stats: {
      senales: senales.length,
      criticas: senales.filter(s => s.prioridad === 'critica').length,
      altas: senales.filter(s => s.prioridad === 'alta').length,
      nuevas,
    },
    contexto,
    informe,
  }

  await guardarConfig(db, JSON.stringify(resultado))
  return resultado
}

export async function leerUltimo(db: SupabaseClient): Promise<ResultadoAgente | null> {
  const { data } = await db.from('app_config').select('valor').eq('clave', CLAVE).maybeSingle()
  const v = (data as { valor: unknown } | null)?.valor
  if (!v) return null
  try {
    return (typeof v === 'string' ? JSON.parse(v) : v) as ResultadoAgente
  } catch {
    return null
  }
}
