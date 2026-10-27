// carrega fontes locais e gera @font-face com src em base64
// sem nenhuma requisição de rede em tempo de renderização
import fs from 'fs'
import path from 'path'

function woff2B64(modulo: string, arquivo: string): string {
  // __dirname pode ser src/pdf ou dist/pdf — sobe até encontrar node_modules
  const candidatos = [
    path.join(__dirname, '../../node_modules/@fontsource', modulo, 'files', arquivo),
    path.join(__dirname, '../../../node_modules/@fontsource', modulo, 'files', arquivo),
    path.join(process.cwd(), 'node_modules/@fontsource', modulo, 'files', arquivo),
  ]
  const p = candidatos.find(c => fs.existsSync(c)) ?? candidatos[0]
  if (!fs.existsSync(p)) {
    console.warn(`[pdf/fontes] não encontrado: ${p}`)
    return ''
  }
  return 'data:font/woff2;base64,' + fs.readFileSync(p).toString('base64')
}

function fontFace(family: string, weight: number, src: string): string {
  if (!src) return ''
  return `@font-face {
  font-family: '${family}';
  font-weight: ${weight};
  font-style: normal;
  src: url('${src}') format('woff2');
}`
}

// Kollektif não está disponível — usa Montserrat como substituta
export function gerarFontFaces(): string {
  const openSans400 = woff2B64('open-sans', 'open-sans-latin-400-normal.woff2')
  const openSans700 = woff2B64('open-sans', 'open-sans-latin-700-normal.woff2')
  const alegreya700 = woff2B64('alegreya', 'alegreya-latin-700-normal.woff2')
  const mont400    = woff2B64('montserrat', 'montserrat-latin-400-normal.woff2')
  const mont700    = woff2B64('montserrat', 'montserrat-latin-700-normal.woff2')

  return [
    fontFace('Open Sans',  400, openSans400),
    fontFace('Open Sans',  700, openSans700),
    fontFace('Alegreya',   700, alegreya700),
    // Kollektif → Montserrat
    fontFace('Kollektif',  400, mont400),
    fontFace('Kollektif',  700, mont700),
  ].filter(Boolean).join('\n')
}
