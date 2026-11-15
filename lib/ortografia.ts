// Corrector de ortografía simple para nombres de productos/insumos.
// Pensado para equipo que escribe con faltas: arregla tildes/mayúsculas de
// palabras conocidas (seguro, automático) y sugiere la palabra correcta cuando
// detecta algo muy parecido a una del diccionario (se ofrece, no se impone).

// Diccionario de palabras frecuentes en la fábrica, BIEN escritas (con tilde).
const DICCIONARIO = [
  // harinas / cereales
  'harina', 'harinas', 'trigo', 'integral', 'arroz', 'avena', 'maíz', 'maicena', 'chuño', 'sémola', 'fécula', 'quinoa', 'mijo', 'panko', 'apanado',
  // proteínas
  'proteína', 'soya', 'soja', 'texturizada', 'gluten', 'seitán', 'tofu', 'garbanzo', 'garbanzos', 'lenteja', 'lentejas', 'poroto', 'porotos', 'arveja', 'arvejas', 'edamame',
  // aceites / grasas
  'aceite', 'oliva', 'maravilla', 'girasol', 'vegetal', 'margarina', 'mantequilla', 'manteca', 'sésamo', 'ajonjolí', 'maní',
  // condimentos / especias
  'sal', 'azúcar', 'pimienta', 'comino', 'orégano', 'páprika', 'pimentón', 'merkén', 'curry', 'jengibre', 'ajo', 'cebolla', 'perejil', 'cilantro', 'albahaca', 'canela', 'clavo', 'cúrcuma', 'laurel', 'tomillo', 'romero', 'nuez', 'moscada', 'levadura', 'polvo', 'hornear', 'bicarbonato', 'caldo',
  // salsas / líquidos
  'salsa', 'vinagre', 'ostra', 'teriyaki', 'hoisin', 'sriracha', 'miso', 'tahini', 'agua', 'vino',
  // vegetales / frescos
  'zanahoria', 'champiñón', 'champiñones', 'tomate', 'palta', 'limón', 'morrón', 'pimiento', 'apio', 'betarraga', 'brócoli', 'coliflor', 'espinaca', 'choclo', 'papa', 'camote',
  // lácteos / sustitutos
  'leche', 'queso', 'crema', 'yogur', 'coco', 'almendra', 'almendras', 'castaña', 'castañas',
  // asiáticos (reventa)
  'nori', 'wakame', 'wasabi', 'shiitake', 'bambú', 'fideo', 'fideos', 'cuscús',
  // paquetería
  'bolsa', 'bolsas', 'caja', 'cajas', 'bandeja', 'bandejas', 'etiqueta', 'etiquetas', 'film', 'papel', 'vacío', 'envase',
  // limpieza
  'detergente', 'cloro', 'desinfectante', 'sanitizante', 'jabón', 'esponja', 'guantes', 'alcohol', 'toalla', 'escobillón',
]

const CONECTORES = new Set(['de', 'del', 'con', 'sin', 'y', 'a', 'al', 'la', 'el', 'los', 'las', 'en', 'o', 'u', 'para', 'por'])

const quita = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// clave sin tilde → palabra canónica (con tilde). Si hay choque, gana la primera.
const CANON = new Map<string, string>()
for (const w of DICCIONARIO) { const k = quita(w); if (!CANON.has(k)) CANON.set(k, w) }
const CLAVES = Array.from(CANON.keys())

function lev(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n; if (!n) return m
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
  }
  return d[m][n]
}

const capitalizar = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// Corrige una palabra. nivel 'seguro' solo arregla tildes de palabras conocidas;
// nivel 'sugerir' además corrige errores cercanos (distancia de edición).
function corregirPalabra(w: string, nivel: 'seguro' | 'sugerir'): string {
  const low = w.toLowerCase()
  const key = quita(low)
  if (key.length < 2 || CONECTORES.has(key)) return low
  const exacta = CANON.get(key)
  if (exacta) return exacta                    // misma palabra, solo tilde/mayúscula
  if (nivel === 'seguro') return low
  if (key.length < 4) return low               // muy corta para arriesgar corrección
  // busca la palabra del diccionario más cercana
  let mejor = '', dist = 99
  for (const k of CLAVES) { const d = lev(key, k); if (d < dist) { dist = d; mejor = k } }
  const umbral = key.length <= 6 ? 1 : 2
  return dist <= umbral && mejor ? (CANON.get(mejor) as string) : low
}

function corregirFrase(texto: string, nivel: 'seguro' | 'sugerir'): string {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  if (!limpio) return ''
  const palabras = limpio.split(' ').map(p => corregirPalabra(p, nivel))
  return capitalizar(palabras.join(' '))
}

// Arreglo SEGURO (tildes/mayúsculas de palabras conocidas). Para aplicar siempre.
export function corregirSeguro(texto: string): string {
  return corregirFrase(texto, 'seguro')
}

// Sugerencia de corrección (incluye errores cercanos). Devuelve null si no cambia
// respecto al arreglo seguro, para no sugerir de más.
export function sugerirOrtografia(texto: string): string | null {
  const sugerido = corregirFrase(texto, 'sugerir')
  const base = corregirFrase(texto, 'seguro')
  return quita(sugerido) !== quita(base) ? sugerido : null
}
