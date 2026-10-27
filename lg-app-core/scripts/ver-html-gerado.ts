// renderiza o HTML do orçamento diretamente (sem PDF viewer do Chrome) para comparação visual
import { chromium } from 'playwright-core'
import { gerarHtml } from '../src/pdf/orcamento.template'
import fs from 'fs'
import path from 'path'
import os from 'os'

function resolverExecPath(): string {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')
  if (fs.existsSync(base)) {
    for (const dir of fs.readdirSync(base)) {
      const candidatos = [
        path.join(base, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
        path.join(base, dir, 'chrome-win64', 'chrome.exe'),
      ]
      for (const c of candidatos) {
        if (fs.existsSync(c)) return c
      }
    }
  }
  throw new Error('Chromium não encontrado')
}

const dados = {
  numero: 184,
  titulo: 'Revestimento PH6 troca vedações 702',
  escopo: 'M,O\nEscopo dos Serviços Revestimento;\nTroca de vedações cilindro hidráulico',
  valor: '2025',
  prazoDias: 1,
  fimDeSemana: true,
  entradaEm: '2026-09-16',
}

async function main() {
  const html = gerarHtml(dados)
  const tmpDir = path.join(__dirname, '../tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const execPath = resolverExecPath()
  const browser = await chromium.launch({ executablePath: execPath, headless: true })

  // pg1: viewport A4 em pixels a 96dpi (595pt * 96/72 ≈ 794px)
  const PX = Math.round(595.5 * 96 / 72)
  const PY = Math.round(842.25 * 96 / 72)

  const page = await browser.newPage({ viewport: { width: PX, height: PY } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)

  await page.screenshot({
    path: path.join(tmpDir, 'html-pg1.png'),
    clip: { x: 0, y: 0, width: PX, height: PY },
  })

  // rola para a segunda página
  await page.evaluate((y) => window.scrollTo(0, y), PY)
  await page.waitForTimeout(100)
  await page.screenshot({
    path: path.join(tmpDir, 'html-pg2.png'),
    clip: { x: 0, y: 0, width: PX, height: PY },
  })

  console.log('html-pg1.png e html-pg2.png salvos em tmp/')
  await browser.close()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
