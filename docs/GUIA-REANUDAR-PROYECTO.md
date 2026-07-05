# Guía para reanudar el proyecto NOMMA FOOD

_Cómo iniciar una sesión nueva sin perder contexto._

## Prompt exacto para iniciar la próxima sesión
Copia y pega esto al abrir la nueva sesión:

```
Lee, en este orden, y sin cambiar nada hasta que te lo pida:
1. docs/ESTADO-DEL-SISTEMA.md   (estado real del sistema)
2. docs/RESPALDO-SESION-2026-07-05.md   (lo último avanzado)
3. docs/CHECKLIST-MAESTRO-NOMMA.md   (pendientes por prioridad)

El repo está en ~/Downloads/nomafood-upload/nomafood-app y se trabaja en la rama
feature/portal-chofer (worktree). Revisa `git log --oneline -10` de esa rama para
ver los últimos commits reales. El preview de Vercel valida los cambios (no hay
Node local). Yo (asistente) subo código directo a esa rama; Nataly corre las
migraciones en Supabase (SQL Editor → Run) y da los clics sensibles (variables de
Vercel, dominios, Mercado Pago).

Confírmame que leíste los 3 documentos y dime cuál es la PRÓXIMA TAREA CRÍTICA
según el checklist. Luego seguimos con esa, una a la vez.
```

## Reglas de trabajo
- **No inventar avances.** Documentar solo lo que existe en el repo y en Supabase.
- **No incluir secretos** (tokens, claves, contraseñas) en ningún documento.
- **El asistente sube código**; **Nataly** corre migraciones y edita variables/servicios externos.
- **Validar con el preview de Vercel** (rama `feature/portal-chofer`), no hay build local.
- **Un cambio a la vez**, probar, y recién avanzar.

## Datos clave para retomar
- **Rama:** `feature/portal-chofer` · repo `github.com/nomafoodchile-prog/nomafood-app`.
- **Preview:** `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app`.
- **Supabase:** proyecto `nomafood-produccion`, ref `fufmwauofcqnlrfhcenq`; SQL Editor `.../sql/new`.
- **Migraciones** en `supabase/*.sql` (todas aplicadas; ver ESTADO §6).
- **Config externa pendiente (Nataly):** verificar dominio `nomafood.cl` en Resend (registros DNS en NIC Chile) + cambiar Sender del SMTP a `portal@nomafood.cl`.

## Próxima tarea crítica recomendada
**Terminar la verificación del dominio `nomafood.cl` en Resend** (agregar los registros DKIM/SPF/DMARC en la "Editar Zona" de NIC Chile) → luego cambiar el "Sender email" del SMTP de Supabase a `portal@nomafood.cl`. Con eso, los correos de acceso llegan a **cualquier** cliente automáticamente y el Portal Mayorista queda 100% operativo de punta a punta.
Después: **probar un pago real** (otra tarjeta/persona) y **endurecer la RLS** de mayoristas antes de producción.
