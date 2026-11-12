// Categorías de insumos/materias primas de la fábrica (fuente única de verdad).
// Las definió el equipo según lo que tienen hoy. Se usan en:
//  - la planilla de Carga Rápida (referencia + ejemplos)
//  - el filtro por categoría en Productos
//  - la normalización al cargar (acepta variantes y las guarda canónicas)
export const CATEGORIAS_INSUMO = [
  'Proteínas vegetales',
  'Condimentos y especias',
  'Salsas y líquidos',
  'Aceites y grasas',
  'Vegetales y frescos',
  'Lácteos y derivados / sustitutos',
  'Harinas',
  'Snack Aldea Vegetal',
  'Paquetería',
  'Limpieza',
] as const

const sinAcentos = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Variantes que puede escribir el equipo → categoría canónica.
const ALIAS: Record<string, string> = {}
const reg = (canon: string, variantes: string[]) => {
  ALIAS[sinAcentos(canon)] = canon
  for (const v of variantes) ALIAS[sinAcentos(v)] = canon
}
reg('Proteínas vegetales', ['proteina', 'proteinas', 'proteina vegetal', 'proteinas vegetales', 'proteina de soya', 'gluten'])
reg('Condimentos y especias', ['condimento', 'condimentos', 'especia', 'especias', 'alino', 'alinos', 'aliño', 'aliños', 'condimentos y especias'])
reg('Salsas y líquidos', ['salsa', 'salsas', 'liquido', 'liquidos', 'salsas y liquidos', 'salsa y liquido'])
reg('Aceites y grasas', ['aceite', 'aceites', 'grasa', 'grasas', 'aceites y grasas'])
reg('Vegetales y frescos', ['vegetal', 'vegetales', 'fresco', 'frescos', 'verdura', 'verduras', 'vegetales y frescos'])
reg('Lácteos y derivados / sustitutos', ['lacteo', 'lacteos', 'lacteos y derivados', 'sustituto', 'sustitutos', 'lacteos y derivados / sustitutos', 'lacteos y sustitutos'])
reg('Harinas', ['harina', 'harinas', 'harina de trigo', 'harina sin gluten', 'premezcla', 'premezclas'])
reg('Snack Aldea Vegetal', ['snack', 'snacks', 'snack aldea', 'snack aldea vegetal', 'aldea vegetal', 'snacks aldea'])
reg('Paquetería', ['paqueteria', 'paquete', 'empaque', 'empaques', 'envase', 'envases', 'bolsa', 'caja'])
reg('Limpieza', ['limpieza', 'aseo', 'sanitizante', 'sanitizantes', 'desinfectante', 'desinfectantes'])

// Devuelve la categoría canónica si reconoce lo escrito; si no, respeta el texto original.
export function normalizarCategoria(valor: string | null | undefined): string {
  const t = (valor ?? '').toString().trim()
  if (!t) return ''
  return ALIAS[sinAcentos(t)] || t
}
