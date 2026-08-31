import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

// Tarjeta de marca que se muestra al compartir el link (WhatsApp, redes, Google).
// Se genera automáticamente; Next la asocia como og:image y twitter:image.
// Es marca-consciente: en el dominio de Brotes sale con la identidad de Brotes.
export const alt = 'Productos vegetarianos y veganos para canal mayorista'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const host = (await headers()).get('host') || ''
  const esBrotes = host.includes('brotesasiaticos')

  const t = esBrotes
    ? { bg: 'linear-gradient(135deg, #143026 0%, #0b1c14 100%)', square: '#e6b23f', name: 'BROTES ASIÁTICOS', accent: '#e6d29a', foot: 'brotesasiaticos.cl - Alma Libre Grupo SpA', footColor: '#9db0a0' }
    : { bg: 'linear-gradient(135deg, #16233f 0%, #0f1b31 100%)', square: '#c9a24e', name: 'NOMMA FOOD', accent: '#e2ca8f', foot: 'nommafood.cl - Alma Libre Grupo SpA', footColor: '#9aa6bd' }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: t.bg,
          padding: '84px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '38px' }}>
          <div style={{ display: 'flex', width: '72px', height: '72px', borderRadius: '18px', background: t.square }} />
          <div style={{ display: 'flex', fontSize: '36px', fontWeight: 800, letterSpacing: '5px', color: '#ffffff' }}>
            {t.name}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: '62px', fontWeight: 800, lineHeight: 1.1, maxWidth: '940px', color: '#ffffff' }}>
          Productos vegetarianos y veganos para tu negocio
        </div>
        <div style={{ display: 'flex', fontSize: '30px', color: t.accent, marginTop: '30px' }}>
          Abastecimiento mayorista - directo de fabrica
        </div>
        <div style={{ display: 'flex', fontSize: '22px', color: t.footColor, marginTop: '48px' }}>
          {t.foot}
        </div>
      </div>
    ),
    { ...size },
  )
}
