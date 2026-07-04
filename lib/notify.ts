// Sonido + vibración para avisos en vivo (chofer y central).
// El audio del navegador queda "desbloqueado" tras el primer gesto del usuario.

type ACtor = typeof AudioContext
let ctx: AudioContext | null = null
let unlocked = false

function getAC(): ACtor | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext || (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext || null
}

/** Llamar una vez ante el primer gesto del usuario (click/touch) para permitir sonido. */
export function unlockAudio() {
  if (unlocked) return
  const AC = getAC()
  if (!AC) return
  try {
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    unlocked = true
  } catch { /* nada */ }
}

/** Registra el desbloqueo automático al primer pointerdown. Devuelve cleanup. */
export function armAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => {}
  const h = () => unlockAudio()
  window.addEventListener('pointerdown', h, { once: true })
  window.addEventListener('touchstart', h, { once: true })
  return () => {
    window.removeEventListener('pointerdown', h)
    window.removeEventListener('touchstart', h)
  }
}

/** Beep + vibración. strong=true → más largo/fuerte (para incidencias). */
export function notify(strong = false) {
  const AC = getAC()
  if (AC) {
    try {
      ctx = ctx || new AC()
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      const beeps = strong ? [0, 0.28, 0.56] : [0]
      for (const t of beeps) {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'
        o.frequency.value = strong ? 987 : 880
        g.gain.setValueAtTime(0.0001, now + t)
        g.gain.exponentialRampToValueAtTime(strong ? 0.55 : 0.32, now + t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.24)
        o.start(now + t); o.stop(now + t + 0.26)
      }
    } catch { /* audio bloqueado */ }
  }
  try { navigator.vibrate?.(strong ? [300, 120, 300, 120, 300] : [200, 100, 200]) } catch { /* sin soporte */ }
}
