import fs from 'fs'
import path from 'path'

export type DadosOrcamento = {
  numero: number
  titulo: string | null
  escopo: string | null
  valor: string | null
  prazoDias: number | null
  fimDeSemana: boolean
}

// escapa texto do banco para evitar injeção de HTML no PDF
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// normaliza o título para nome de arquivo: MAIÚSCULAS, espaços → _, só alfanumérico e _
function nomeArquivo(numero: number, titulo: string | null): string {
  if (!titulo) return `ORCAMENTO_${numero}`
  const limpo = titulo
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
  return `ORCAMENTO_${numero}_${limpo}`
}

// formata valor numérico para BRL sem espaço após R$ (ex: "R$2.025,00")
function formatarValor(valor: string | null): string {
  if (!valor) return 'R$0,00'
  const num = Number(valor)
  if (isNaN(num)) return 'R$0,00'
  return 'R$' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// carrega a logo como base64; fallback silencioso se o arquivo não existir
function carregarLogoBase64(): string {
  const caminhos = [
    path.join(__dirname, '../../assets/logo.png'),
    path.join(__dirname, '../../../assets/logo.png'),
    path.join(process.cwd(), 'assets/logo.png'),
  ]
  for (const p of caminhos) {
    if (fs.existsSync(p)) {
      return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
    }
  }
  console.warn('[pdf] assets/logo.png não encontrada — logo omitida')
  return ''
}

export function gerarHtml(dados: DadosOrcamento): string {
  const logoSrc = carregarLogoBase64()
  const logoTag = logoSrc
    ? `<img src="${logoSrc}" alt="Logo L.G." style="width:100px;height:100px;border-radius:50%;object-fit:cover;">`
    : ''

  const arquivo = esc(nomeArquivo(dados.numero, dados.titulo))
  const valorFormatado = esc(formatarValor(dados.valor))

  // bullets do escopo — cada linha não-vazia vira um <li>
  const linhasEscopo = (dados.escopo ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const escopoHtml = linhasEscopo.length > 0
    ? `<ul style="list-style:none;margin:0;padding:0;">
        ${linhasEscopo.map(l => `<li style="margin-bottom:10px;">• <strong>${esc(l)}</strong></li>`).join('\n        ')}
      </ul>`
    : ''

  // prazo
  const prazoHtml = dados.prazoDias != null
    ? `<p style="margin:12px 0 0 0;font-size:11px;"><strong>Prazo ${dados.prazoDias} ${dados.prazoDias === 1 ? 'dia' : 'dias'};</strong></p>`
    : ''

  /* TODO: confirmar com o dono como "Sábado 50%" aparece quando fimDeSemana=true */

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 210mm;
    height: 297mm;
    font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #222;
    background: #fff;
  }
  /* página em coluna para ancorar o rodapé */
  .pagina {
    display: flex;
    flex-direction: column;
    width: 210mm;
    min-height: 297mm;
  }

  /* cabeçalho ~21% = ~62mm */
  .cabecalho {
    background: #000;
    padding: 20px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 62mm;
    flex-shrink: 0;
    font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
  }
  .cab-esquerda { display: flex; flex-direction: column; gap: 6px; }
  .cab-nome {
    color: #fff;
    font-weight: 700;
    font-size: 30px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .cab-cnpj {
    color: #EE9C00;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 8px;
  }
  .cab-arquivo {
    color: #EE9C00;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* título */
  .titulo-bloco {
    padding: 18px 5% 0 5%;
    font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
    flex-shrink: 0;
  }
  .titulo-texto {
    font-weight: 700;
    font-size: 22px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .linha-ambar { height: 4px; background: #EE9C00; border-radius: 2px; }

  /* corpo */
  .corpo {
    padding: 20px 5%;
    flex: 1;
    font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
  }

  /* bloco de valor — ancorado no fim antes do rodapé */
  .valor-bloco {
    padding: 0 5% 16px 5%;
    flex-shrink: 0;
    font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
  }
  .valor-label {
    text-align: right;
    font-weight: 700;
    font-size: 18px;
    text-transform: uppercase;
    margin: 8px 0 4px 0;
  }
  .valor-numero {
    text-align: right;
    font-weight: 700;
    font-size: 20px;
    margin-bottom: 8px;
  }

  /* rodapé ~7.5% = ~22mm */
  .rodape {
    background: #000;
    min-height: 22mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
    font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
    font-size: 9px;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: center;
    padding: 8px 16px;
  }
</style>
</head>
<body>
<div class="pagina">

  <!-- cabeçalho -->
  <div class="cabecalho">
    <div class="cab-esquerda">
      <div class="cab-nome">L.G.<br>MANUTENÇÃO INDUSTRIAL</div>
      <div class="cab-cnpj">CNPJ: 32.715.262/0001-29</div>
      <div class="cab-arquivo">${arquivo}</div>
    </div>
    ${logoTag}
  </div>

  <!-- título -->
  <div class="titulo-bloco">
    <div class="titulo-texto">Orçamento</div>
    <div class="linha-ambar"></div>
  </div>

  <!-- corpo -->
  <div class="corpo">
    ${escopoHtml}
    ${prazoHtml}
  </div>

  <!-- valor ancorado acima do rodapé -->
  <div class="valor-bloco">
    <div class="linha-ambar"></div>
    <div class="valor-label">VALOR</div>
    <div class="valor-numero">${valorFormatado}</div>
    <div class="linha-ambar"></div>
  </div>

  <!-- rodapé -->
  <div class="rodape">
    <span>AV. PADRE JOAQUIM GONÇALVES PACHECO, 324 - SOROCABA, SP</span>
    <span>(15) 99723-6224 &bull; LEONARDO@LGMANUTENCAOINDUSTRIAL.COM.BR</span>
  </div>

</div>
</body>
</html>`
}
