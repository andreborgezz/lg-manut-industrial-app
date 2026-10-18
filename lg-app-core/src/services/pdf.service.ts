import { chromium, type Browser } from 'playwright-core'
import { gerarHtml, type DadosOrcamento } from '../pdf/orcamento.template'

export type { DadosOrcamento }

let browser: Browser | null = null

// abre o browser na primeira chamada (lazy singleton)
async function obterBrowser(): Promise<Browser> {
  if (browser) return browser
  let execPath: string
  try {
    execPath = chromium.executablePath()
  } catch {
    throw new Error('Chromium não instalado. Execute: npx playwright install chromium')
  }
  browser = await chromium.launch({ executablePath: execPath, headless: true })
  return browser
}

// fecha o browser no shutdown do servidor
async function fecharBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
process.on('SIGTERM', fecharBrowser)
process.on('SIGINT', fecharBrowser)

export async function gerarPdfOrcamento(dados: DadosOrcamento): Promise<Buffer> {
  const b = await obterBrowser()
  const page = await b.newPage()
  try {
    const html = gerarHtml(dados)
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
