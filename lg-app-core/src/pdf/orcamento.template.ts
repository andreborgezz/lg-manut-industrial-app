import { gerarFontFaces } from './fontes'
import { CNPJ, ENDERECO, TELEFONE, EMAIL, CIDADE, SAUDACAO, SIGNATARIO, TERMOS } from './textos'

export type DadosOrcamento = {
  numero: number
  titulo: string | null
  escopo: string | null
  valor: string | null
  prazoDias: number | null
  fimDeSemana: boolean
  entradaEm?: string | Date | null
}

// escapa texto do banco para evitar injeção de HTML
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// normaliza título: MAIÚSCULAS, preserva Ç/acentos, espaços → _
function nomeArquivo(numero: number, titulo: string | null): string {
  if (!titulo) return `ORÇAMENTO_${numero}`
  const limpo = titulo
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇÑ0-9_]/gi, '')
  return `ORÇAMENTO_${numero}_${limpo}`
}

// formata valor BRL sem espaço após R$ (ex: "R$2.025,00")
function formatarValor(valor: string | null): string {
  if (!valor) return 'R$0,00'
  const num = Number(valor)
  if (isNaN(num)) return 'R$0,00'
  return 'R$' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// prazo com zero à esquerda, sempre "dias" (como no modelo)
function formatarPrazo(dias: number): string {
  return `Prazo ${String(dias).padStart(2, '0')} dias`
}

// data por extenso no fuso America/Sao_Paulo
// para strings como "2026-09-16" interpreta como data local (sem conversão UTC)
function dataExtenso(entradaEm?: string | Date | null): string {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  let dia: number, mes: number, ano: number

  if (entradaEm) {
    if (typeof entradaEm === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entradaEm.trim())) {
      // string de data pura: não converte fuso — usa como está
      const parts = entradaEm.trim().split('-')
      ano = parseInt(parts[0], 10)
      mes = parseInt(parts[1], 10) - 1
      dia = parseInt(parts[2], 10)
    } else {
      const d = typeof entradaEm === 'string' ? new Date(entradaEm) : entradaEm
      const sp = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      dia = sp.getDate(); mes = sp.getMonth(); ano = sp.getFullYear()
    }
  } else {
    const sp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    dia = sp.getDate(); mes = sp.getMonth(); ano = sp.getFullYear()
  }

  return `${CIDADE}, ${dia} de ${meses[mes]} ${ano}`
}

// SVG WhatsApp: círculo verde com ícone de telefone branco
const WHATSAPP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="11pt" height="11pt" style="vertical-align:middle;margin-right:4pt;display:inline-block"><circle cx="12" cy="12" r="12" fill="#25D366"/><path fill="#fff" d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9s-.5-.1-.7.1-.7.9-.9 1.1-.3.2-.6 0c-1.6-.8-2.7-1.8-3.6-3.3-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.1 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.1-1.3z"/></svg>`

// cabeçalho comum às 2 páginas
// na pg1: info começa em left=48pt; na pg2: left=27.6pt (sem offset pois não há linha laranja)
function htmlCabecalho(arquivoEscapado: string, pg: 1 | 2): string {
  const leftInfo = pg === 1 ? '48pt' : '27.6pt'
  return `<div class="cab">
  <div class="cab-fundo">
    <div class="cab-nome">L.G. MANUTENÇÃO<br>INDUSTRIAL</div>
    <div class="cab-info" style="left:${leftInfo}">
      <div class="cab-cnpj">${esc(CNPJ)}</div>
      <div class="cab-arquivo">${arquivoEscapado}</div>
    </div>
    <div class="cab-logo"><span class="cab-logo-texto">L.G.</span></div>
  </div>
</div>`
}

// rodapé comum às 2 páginas
function htmlRodape(): string {
  return `<div class="rodape">
  <div class="rod-linha">${esc(ENDERECO)}</div>
  <div class="rod-linha">${WHATSAPP_SVG}${esc(TELEFONE)}<span class="rod-espacador"></span>${esc(EMAIL)}</div>
</div>`
}

export function gerarHtml(dados: DadosOrcamento): string {
  const fontFaces = gerarFontFaces()

  const arquivo = nomeArquivo(dados.numero, dados.titulo)
  const arquivoEsc = esc(arquivo)
  const valorFormatado = esc(formatarValor(dados.valor))

  const linhasEscopo = (dados.escopo ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const bulletsEscopo = linhasEscopo
    .map(l => `<li>${esc(l)}</li>`)
    .join('\n')

  const bulletSabado = dados.fimDeSemana
    ? `<li>1 &ndash; Sábado 50%</li>`
    : ''

  const bulletPrazo = dados.prazoDias != null
    ? `<li>${esc(formatarPrazo(dados.prazoDias))};</li>`
    : ''

  const cab1 = htmlCabecalho(arquivoEsc, 1)
  const cab2 = htmlCabecalho(arquivoEsc, 2)
  const rod  = htmlRodape()
  const data = esc(dataExtenso(dados.entradaEm))

  const termosHtml = TERMOS.map(t => `<div class="termo-bloco">
    <div class="termo-titulo">${esc(t.titulo)}</div>
    <div class="termo-texto">${esc(t.texto)}</div>
  </div>`).join('\n')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<style>
${fontFaces}

/* reset de auto-link do WebKit/Blink */
* { -webkit-touch-callout: none; }
a { color: inherit !important; text-decoration: none !important; }

@page { size: A4 portrait; margin: 0; }

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 595.5pt;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  /* desativa detecção automática de links */
  -webkit-user-select: none;
}

/* bloco de página A4 */
.pagina {
  width: 595.5pt;
  height: 842.25pt;
  position: relative;
  overflow: hidden;
  page-break-after: always;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.pagina:last-child { page-break-after: auto; }

/* ── cabeçalho ── */
.cab {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 128.5pt;
}

.cab-fundo {
  position: absolute;
  inset: 0;
  background: #000000;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* nome da empresa: Montserrat Bold ~22pt, branco */
.cab-nome {
  position: absolute;
  top: 23pt;
  left: 27.6pt;
  color: #ffffff !important;
  font-family: 'Kollektif', 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 22pt;
  line-height: 36pt;
  letter-spacing: 4pt;
  text-transform: uppercase;
  white-space: nowrap;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* CNPJ e nome do arquivo */
.cab-info {
  position: absolute;
  top: 92pt;
  right: 140pt; /* impede sobreposição com o logo */
  overflow: hidden;
}

.cab-cnpj {
  color: #EE9C00 !important;
  font-family: 'Kollektif', 'Montserrat', sans-serif;
  font-weight: 400;
  font-size: 11pt;
  letter-spacing: 1.5pt;
  text-transform: uppercase;
  line-height: 14pt;
  white-space: nowrap;
}

.cab-arquivo {
  color: #EE9C00 !important;
  font-family: 'Kollektif', 'Montserrat', sans-serif;
  font-weight: 400;
  font-size: 9pt;
  letter-spacing: 1.5pt;
  text-transform: uppercase;
  line-height: 13pt;
  margin-top: 2pt;
  word-break: break-all;
}

/* logo: círculo branco com "L.G." preto */
.cab-logo {
  position: absolute;
  right: 31.5pt;
  top: 11pt;
  width: 99pt;
  height: 99pt;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cab-logo-texto {
  color: #000000 !important;
  font-family: 'Alegreya', Georgia, serif;
  font-weight: 700;
  font-size: 40pt;
  line-height: 1;
  letter-spacing: -1pt;
}

/* ── título ORÇAMENTO ── */
.titulo-orcamento {
  position: absolute;
  top: 134pt;
  left: 0; right: 0;
  text-align: center;
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 700;
  font-size: 18pt;
  color: #000000 !important;
  text-transform: uppercase;
  letter-spacing: 0;
}

/* linha laranja */
.linha-laranja {
  position: absolute;
  left: 31pt; right: 21.5pt;
  height: 4.5pt;
  background: #EE9C00;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── lista de bullets ── */
.escopo-lista {
  position: absolute;
  top: 181pt;
  left: 31pt; right: 27pt;
  list-style: disc;
  padding-left: 9pt;
}

.escopo-lista li {
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 700;
  font-size: 9pt;
  color: #000000 !important;
  margin-bottom: 30pt;
  line-height: 1.3;
}

/* ── bloco VALOR (posição absoluta na pg1) ── */
.valor-linha-top {
  position: absolute;
  top: 690pt;
  left: 31pt; right: 21.5pt;
  height: 4pt;
  background: #EE9C00;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.valor-label {
  position: absolute;
  top: 700pt;
  right: 42pt;
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 700;
  font-size: 18pt;
  color: #000000 !important;
  text-transform: uppercase;
  letter-spacing: 0;
}

.valor-numero {
  position: absolute;
  top: 722pt;
  right: 42pt;
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 700;
  font-size: 18pt;
  color: #000000 !important;
  letter-spacing: 0;
}

.valor-linha-bot {
  position: absolute;
  top: 745pt;
  left: 31pt; right: 21.5pt;
  height: 4pt;
  background: #EE9C00;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── rodapé (posição absoluta, bottom 0) ── */
.rodape {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 58.25pt;
  background: #000000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4pt;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.rod-linha {
  color: #ffffff !important;
  font-family: 'Kollektif', 'Montserrat', sans-serif;
  font-weight: 400;
  font-size: 8.5pt;
  letter-spacing: 1.3pt;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
}

.rod-espacador {
  display: inline-block;
  width: 45pt;
}

/* ── página 2: termos ── */
.termos-area {
  position: absolute;
  top: 178pt;
  left: 27pt; right: 17.5pt;
}

.termo-bloco { /* espaço gerenciado pelo termo-texto margin-bottom */ }

.termo-titulo {
  font-family: 'Kollektif', 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 11pt;
  color: #000000 !important;
  text-transform: uppercase;
  margin-bottom: 4pt;
}

.termo-texto {
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 400;
  font-size: 11pt;
  color: #000000 !important;
  line-height: 16.5pt;
  text-align: justify;
  margin-bottom: 36pt;
}

/* assinatura (top definido por script) */
.assinatura {
  position: absolute;
  left: 27pt; right: 17.5pt;
}

.assinatura-data {
  text-align: center;
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 400;
  font-size: 11pt;
  color: #000000 !important;
  margin-bottom: 40pt;
}

.assinatura-saudacao {
  font-family: 'Open Sans', Arial, sans-serif;
  font-weight: 400;
  font-size: 11pt;
  color: #000000 !important;
  line-height: 16.5pt;
}
</style>
</head>
<body>

<!-- ════ PÁGINA 1 ════ -->
<div class="pagina">

  ${cab1}

  <div class="titulo-orcamento">ORÇAMENTO</div>
  <div class="linha-laranja" style="top:158pt"></div>

  <ul class="escopo-lista">
    ${bulletsEscopo}
    ${bulletSabado}
    ${bulletPrazo}
  </ul>

  <div class="valor-linha-top"></div>
  <div class="valor-label">VALOR</div>
  <div class="valor-numero">${valorFormatado}</div>
  <div class="valor-linha-bot"></div>

  ${rod}

</div>

<!-- ════ PÁGINA 2: TERMOS ════ -->
<div class="pagina">

  ${cab2}

  <div class="termos-area">
    ${termosHtml}
  </div>

  <div class="assinatura" id="assinatura-pos">
    <div class="assinatura-data">${data}</div>
    <div class="assinatura-saudacao">${esc(SAUDACAO)}<br>${esc(SIGNATARIO)}</div>
  </div>

  ${rod}

</div>

<script>
// posiciona assinatura: 55pt abaixo do último termo, máx 729pt (antes do rodapé)
(function() {
  const termos = document.querySelector('.termos-area');
  const assin  = document.getElementById('assinatura-pos');
  if (!termos || !assin) return;
  const pageTop = termos.closest('.pagina').getBoundingClientRect().top;
  const bottom  = termos.getBoundingClientRect().bottom;
  const PT = 96 / 72;
  const topPt = (bottom - pageTop) / PT + 55;
  assin.style.top = Math.min(topPt, 729) + 'pt';
})();
</script>
</body>
</html>`
}
