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

  await page.goto('http://localhost:5173/orcamentos', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // screenshot antes do modal
  await page.screenshot({ path: path.join(tmpDir, 'modal-antes.png') })
  console.log('screenshot: modal-antes.png')

  // abre via atalho N
  await page.keyboard.press('n')
  await page.waitForTimeout(600)

  // screenshot com modal aberto
  await page.screenshot({ path: path.join(tmpDir, 'modal-aberto.png') })
  console.log('screenshot: modal-aberto.png')

  // testa navegação por teclado — Tab pelo form
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
  }
  await page.screenshot({ path: path.join(tmpDir, 'modal-tab3.png') })
  console.log('screenshot: modal-tab3.png')

  // digita no campo que tiver foco
  await page.keyboard.type('Empresa Teste')
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(tmpDir, 'modal-digitando.png') })
  console.log('screenshot: modal-digitando.png')

  await browser.close()
  console.log('ok — screenshots em lg-app-page/tmp/')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
