import fs from 'node:fs'
import puppeteer, { type Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { gerarHtml, type DadosOrcamento } from '../pdf/orcamento.template'

export type { DadosOrcamento }

let browser: Browser | null = null

function encontrarBrowserLocal(): string | undefined {
  if (process.platform !== 'win32') return undefined
  const candidatos = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  return candidatos.find((p) => fs.existsSync(p))
}

async function obterBrowser(): Promise<Browser> {
  if (browser) return browser
  const localWin = encontrarBrowserLocal()
  if (localWin) {
    browser = await puppeteer.launch({
      executablePath: localWin,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    return browser
  }
  const execPath = await chromium.executablePath()
  browser = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: chromium.args,
  })
  return browser
}

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
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
