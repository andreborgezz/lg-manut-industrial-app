// gera PDF de exemplo sem tocar no R2
import { gerarPdfOrcamento } from '../src/services/pdf.service'
import fs from 'fs'
import path from 'path'

const dados = {
  numero: 185,
  titulo: 'Manutenção Preventiva',
  escopo: 'Limpeza e lubrificação geral\nVerificação de rolamentos\nTroca de correia dentada',
  valor: '2025.00',
  prazoDias: 1,
  fimDeSemana: false,
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
