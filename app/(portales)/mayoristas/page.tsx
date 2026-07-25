import { redirect } from 'next/navigation'

// La landing pública es única (/). Esta ruta antigua redirige al formulario
// de solicitud dentro de la landing principal, para no tener dos landings.
export default function MayoristasRedirect() {
  redirect('/#solicitud-mayorista')
}
