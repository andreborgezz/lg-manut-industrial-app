// gera PDF de exemplo sem tocar no R2
import { gerarPdfOrcamento } from '../src/services/pdf.service'
import fs from 'fs'
import path from 'path'

// dados idênticos ao modelo de referência
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
  const buffer = await gerarPdfOrcamento(dados)
  const dir = path.join(__dirname, '../tmp')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  fs.writeFileSync(path.join(dir, 'orcamento-exemplo.pdf'), buffer)
  console.log('PDF salvo em tmp/orcamento-exemplo.pdf')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
