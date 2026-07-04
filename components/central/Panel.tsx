import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Contenedor de sección estilo Nomma: tarjeta blanca redondeada con sombra
 * suave, título opcional y una acción (link "Ver todo →" o botón a la derecha).
 * Base reutilizable para toda la app central.
 */
export function Panel({
  title,
  icon: Icon,
  action,
  actionHref,
  actionLabel,
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: string
  icon?: React.ElementType
  action?: React.ReactNode
  actionHref?: string
  actionLabel?: string
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  const hasHeader = title || action || actionHref
  return (
    <section className={`bg-white rounded-2xl shadow-card p-5 lg:p-6 ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1b2a4a] flex items-center gap-2">
            {Icon && <Icon size={17} className="text-[#c9a24e]" />}
            {title}
          </h2>
          {action
            ? action
            : actionHref && (
                <Link href={actionHref} className="text-xs font-medium text-[#c9a24e] hover:underline flex items-center gap-1">
                  {actionLabel || 'Ver todo'} <ChevronRight size={13} />
                </Link>
              )}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
