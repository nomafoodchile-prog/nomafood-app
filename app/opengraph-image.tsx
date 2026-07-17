import { ImageResponse } from 'next/og'

// Tarjeta de marca que se muestra al compartir el link (WhatsApp, redes, Google).
// Se genera automáticamente; Next la asocia como og:image y twitter:image.
export const alt = 'NOMMA FOOD — Productos vegetarianos y veganos para canal mayorista'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
          background: 'linear-gradient(135deg, #16233f 0%, #0f1b31 100%)',
          padding: '84px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '38px' }}>
          <div style={{ display: 'flex', width: '72px', height: '72px', borderRadius: '18px', background: '#c9a24e' }} />
          <div style={{ display: 'flex', fontSize: '36px', fontWeight: 800, letterSpacing: '5px', color: '#ffffff' }}>
            NOMMA FOOD
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: '62px', fontWeight: 800, lineHeight: 1.1, maxWidth: '940px', color: '#ffffff' }}>
          Productos vegetarianos y veganos para tu negocio
        </div>
        <div style={{ display: 'flex', fontSize: '30px', color: '#e2ca8f', marginTop: '30px' }}>
          Abastecimiento mayorista - directo de fabrica
        </div>
        <div style={{ display: 'flex', fontSize: '22px', color: '#9aa6bd', marginTop: '48px' }}>
          nomafood.cl - Alma Libre Grupo SpA
        </div>
      </div>
    ),
    { ...size },
  )
}
