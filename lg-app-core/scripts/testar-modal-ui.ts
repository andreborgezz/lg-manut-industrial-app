// testa o modal de novo orçamento em 1366x768
import { chromium } from 'playwright-core'
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
      for (const c of candidatos) { if (fs.existsSync(c)) return c }
    }
  }
  throw new Error('Chromium não encontrado')
}

const tmpDir = path.join(__dirname, '../tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

async function main() {
  const exec = resolverExecPath()
  const browser = await chromium.launch({ executablePath: exec, headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  await page.goto('http://localhost:5173/orcamentos', { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(tmpDir, 'b1-01-pagina.png') })

  // abre modal com N
  await page.keyboard.press('n')
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(tmpDir, 'b1-02-modal-aberto.png') })

  // tooltips do botão desabilitado: verifica title
  const titleSalvar = await page.$eval('button[type="submit"]', (b) => (b as HTMLButtonElement).title)
  console.log('title do botão Salvar:', titleSalvar)

  // clica no chip "2d"
  await page.click('button.prazo-chip:nth-child(2)')
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(tmpDir, 'b1-03-prazo-2d.png') })

  // clica no chip "Fim de semana"
  await page.click('button.chip-fds')
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(tmpDir, 'b1-04-fds-ativo.png') })

  // digita escopo e verifica preview
  await page.click('textarea')
  await page.keyboard.type('Troca de vedações\nLimpeza geral\nInspeção final')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(tmpDir, 'b1-05-preview-escopo.png') })

  // pressiona Esc para fechar
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(tmpDir, 'b1-06-fechado.png') })

  console.log('Screenshots salvas em lg-app-core/tmp/b1-*.png')
  await browser.close()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
