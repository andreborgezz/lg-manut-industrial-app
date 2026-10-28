import 'dotenv/config'
import { Resend } from 'resend'
import { gerarPdfOrcamento } from '../src/services/pdf.service'

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('Erro: Defina a variável RESEND_API_KEY no arquivo .env')
  process.exit(1)
}
const resend = new Resend(apiKey)

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
  console.log('1. Gerando PDF de teste...')
  const pdfBuffer = await gerarPdfOrcamento(dados)
  console.log(`PDF gerado com sucesso! Tamanho: ${pdfBuffer.length} bytes`)

  const destinatario = process.argv[2] || 'borges01andre@gmail.com'
  console.log(`2. Enviando e-mail para ${destinatario} via Resend...`)

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: [destinatario],
    subject: `Teste - Orçamento nº ${dados.numero} | LG Manutenção`,
    html: `
      <h2>Orçamento de Teste nº ${dados.numero}</h2>
      <p>Olá André,</p>
      <p>Segue em anexo o PDF do orçamento de teste gerado pelo sistema LG Manutenção Industrial.</p>
      <p><strong>Valor:</strong> R$ 2.025,00</p>
    `,
    attachments: [
      {
        filename: `orcamento-${dados.numero}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (error) {
    console.error('Erro retornado pela API do Resend:', error)
    process.exit(1)
  }

  console.log('E-mail enviado com sucesso! Resposta do Resend:', data)
  process.exit(0)
}

main().catch((err) => {
  console.error('Erro na execução:', err)
  process.exit(1)
})
