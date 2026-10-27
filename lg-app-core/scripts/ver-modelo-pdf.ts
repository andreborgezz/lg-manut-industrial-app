// renderiza as 2 páginas do PDF modelo em PNG usando pdf.js via CDN local (já offline)
// usa a embed nativa do Chrome com zoom para capturar cada página
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
      for (const c of candidatos) {
        if (fs.existsSync(c)) return c
      }
    }
  }
  throw new Error('Chromium não encontrado')
}

async function main() {
  const pdfPath = path.resolve(__dirname, '../../database/PDF-example/modelo-orcamento.pdf')
  const pdfB64 = fs.readFileSync(pdfPath).toString('base64')
  const tmpDir = path.join(__dirname, '../tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const execPath = resolverExecPath()
  const browser = await chromium.launch({ executablePath: execPath, headless: true })

  // HTML que usa pdf.js via importmap offline não está disponível,
  // então usamos embed nativa com página específica via #page=N
  for (const pg of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 850, height: 1100 } })
    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; }
      embed { display:block; width:850px; height:1100px; }
    </style></head><body>
    <embed src="data:application/pdf;base64,${pdfB64}#page=${pg}" type="application/pdf" width="850" height="1100">
    </body></html>`
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(tmpDir, `modelo-pg${pg}.png`), fullPage: false })
    await page.close()
    console.log(`pg${pg} salva`)
  }

  console.log('ok: tmp/modelo-pg1.png, tmp/modelo-pg2.png')
  await browser.close()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
