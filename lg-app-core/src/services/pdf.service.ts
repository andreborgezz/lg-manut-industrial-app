import { chromium, type Browser } from 'playwright-core'
import { gerarHtml, type DadosOrcamento } from '../pdf/orcamento.template'
import path from 'path'
import os from 'os'
import fs from 'fs'

export type { DadosOrcamento }

let browser: Browser | null = null

// resolve o executável do Chromium/headless-shell instalado pelo playwright
function resolverExecPath(): string {
  // em container Docker a imagem do Playwright define PLAYWRIGHT_BROWSERS_PATH
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (browsersPath && fs.existsSync(browsersPath)) {
    for (const dir of fs.readdirSync(browsersPath)) {
      const candidatos = [
        path.join(browsersPath, dir, 'chrome-linux', 'chrome'),
        path.join(browsersPath, dir, 'chromium-headless-shell-linux64', 'chrome-headless-shell'),
        path.join(browsersPath, dir, 'chromium', 'chrome'),
      ]
      for (const c of candidatos) {
        if (fs.existsSync(c)) return c
      }
    }
  }

  // tenta o caminho padrão do playwright
  try {
    const p = chromium.executablePath()
    if (fs.existsSync(p)) return p
  } catch { /* segue */ }

  // fallback: instalação local do Windows
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')
  if (fs.existsSync(base)) {
    for (const dir of fs.readdirSync(base)) {
      const candidatos = [
        path.join(base, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
        path.join(base, dir, 'chrome-win64', 'chrome.exe'),
        path.join(base, dir, 'chrome-linux', 'chrome'),
      ]
      for (const c of candidatos) {
        if (fs.existsSync(c)) return c
      }
    }
  }

  throw new Error('Chromium não encontrado. Execute: npx playwright install chromium')
}

// em container sem root o Chromium precisa de --no-sandbox
const ARGS_SANDBOX = process.getuid?.() !== 0 ? ['--no-sandbox', '--disable-setuid-sandbox'] : []

// abre o browser na primeira chamada (lazy singleton)
async function obterBrowser(): Promise<Browser> {
  if (browser) return browser
  const execPath = resolverExecPath()
  browser = await chromium.launch({ executablePath: execPath, headless: true, args: ARGS_SANDBOX })
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
    // aguarda todas as fontes base64 carregarem antes de renderizar
    await page.evaluate(() => document.fonts.ready)
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
