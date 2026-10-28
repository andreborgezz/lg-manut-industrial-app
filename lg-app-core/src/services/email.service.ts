import { Resend } from 'resend'
import { env } from '../config/env'
import pool from '../../database'
import { AppError } from '../utils/errors'
import { buscarPorId } from './orcamento.service'
import { gerarPdfOrcamento } from './pdf.service'
import { enviarPdf } from './storage.service'

function obterResend() {
  if (!env.RESEND_API_KEY) {
    throw new AppError('RESEND_API_KEY não configurada no arquivo .env', 500)
  }
  return new Resend(env.RESEND_API_KEY)
}

function formatarMoeda(v: string | number | null | undefined): string {
  if (!v) return 'A combinar'
  const n = typeof v === 'number' ? v : Number(v)
  if (isNaN(n)) return String(v)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export type EnviarEmailOrcamentoOptions = {
  destinatario?: string
  mensagemPersonalizada?: string
}

export async function enviarEmailOrcamento(
  orcamentoId: number,
  options?: EnviarEmailOrcamentoOptions
) {
  const orc = await buscarPorId(orcamentoId)
  if (!orc) throw new AppError('Orçamento não encontrado', 404)

  // Consulta informações complementares da empresa e solicitante
  const { rows: infoRows } = await pool.query(
    `select 
       e.nome as "empresaNome",
       e.email as "empresaEmail",
       s.nome as "solicitanteNome",
       s.email as "solicitanteEmail"
     from orcamentos o
     join empresas e on e.id = o.empresa_id
     left join solicitantes s on s.id = o.solicitante_id
     where o.id = $1`,
    [orcamentoId]
  )
  const info = infoRows[0] || {}

  const para = (options?.destinatario || info.solicitanteEmail || info.empresaEmail || 'borges01andre@gmail.com').trim()
  if (!para || !para.includes('@')) {
    throw new AppError('Destinatário de e-mail inválido', 400)
  }

  // Gera o buffer do PDF
  const pdfBuffer = await gerarPdfOrcamento({
    numero: orc.numero,
    titulo: orc.titulo,
    escopo: orc.escopo,
    valor: orc.valor,
    prazoDias: orc.prazoDias,
    fimDeSemana: orc.fimDeSemana,
  })

  // Salva no storage R2 se configurado e atualiza pdf_path
  try {
    const chave = `orcamentos/${orc.numero}.pdf`
    await enviarPdf(chave, pdfBuffer)
    await pool.query('UPDATE orcamentos SET pdf_path = $2 WHERE id = $1', [orc.id, chave])
  } catch (err) {
    // Se o R2 não estiver configurado ou falhar temporariamente, não trava o envio do e-mail
    console.warn('Aviso: Não foi possível persistir no storage R2:', err)
  }

  const empresaNome = info.empresaNome || 'Prezado(a) Cliente'
  const solicitanteNome = info.solicitanteNome ? `${info.solicitanteNome}` : ''
  const saudacaoNome = solicitanteNome || empresaNome
  const tituloDesc = orc.titulo || orc.maquina || 'Manutenção Industrial'
  const valorFormatado = formatarMoeda(orc.valor)
  const prazoTexto = orc.prazoDias
    ? `${orc.prazoDias} dia(s)${orc.fimDeSemana ? ' (incluindo fins de semana)' : ' úteis'}`
    : 'A combinar'

  const assunto = `Orçamento nº ${orc.numero} - ${tituloDesc} | LG Manutenção Industrial`

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 24px;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
          background-color: #0f172a;
          color: #ffffff;
          padding: 24px 32px;
          border-bottom: 4px solid #2563eb;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .header p {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #94a3b8;
        }
        .content {
          padding: 32px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .lead {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .card {
          background-color: #f1f5f9;
          border-radius: 6px;
          padding: 18px 20px;
          margin: 20px 0;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .card-row:last-child {
          border-bottom: none;
        }
        .card-label {
          color: #64748b;
          font-weight: 500;
        }
        .card-value {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }
        .highlight {
          color: #2563eb;
          font-size: 16px;
        }
        .msg-personalizada {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 12px 16px;
          margin: 20px 0;
          font-size: 14px;
          color: #1e40af;
          border-radius: 0 4px 4px 0;
        }
        .anexo-info {
          font-size: 13px;
          color: #64748b;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed #cbd5e1;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px 32px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LG MANUTENÇÃO INDUSTRIAL</h1>
          <p>Orçamento Oficial</p>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${saudacaoNome}!</div>
          <div class="lead">
            Segue em anexo a proposta comercial e orçamento técnico de <strong>nº ${orc.numero}</strong> referente ao atendimento solicitado.
          </div>

          ${options?.mensagemPersonalizada ? `
            <div class="msg-personalizada">
              <strong>Observação:</strong><br>
              ${options.mensagemPersonalizada.replace(/\n/g, '<br>')}
            </div>
          ` : ''}

          <div class="card">
            <div class="card-row">
              <span class="card-label">Orçamento:</span>
              <span class="card-value">Nº ${orc.numero}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Cliente / Empresa:</span>
              <span class="card-value">${empresaNome}</span>
            </div>
            ${orc.maquina ? `
              <div class="card-row">
                <span class="card-label">Equipamento / Máquina:</span>
                <span class="card-value">${orc.maquina}</span>
              </div>
            ` : ''}
            <div class="card-row">
              <span class="card-label">Serviço:</span>
              <span class="card-value">${tituloDesc}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Prazo de Execução:</span>
              <span class="card-value">${prazoTexto}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Valor Total:</span>
              <span class="card-value highlight">${valorFormatado}</span>
            </div>
          </div>

          <div class="anexo-info">
            📎 <strong>Documento em anexo:</strong> O detalhamento completo dos serviços, peças e termos está disponível no arquivo <code>orcamento-${orc.numero}.pdf</code> anexado a esta mensagem.
          </div>
        </div>
        <div class="footer">
          <p>LG Manutenção Industrial &bull; Este é um e-mail automático emitido pelo sistema de gestão.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const resend = obterResend()
  const resposta = await resend.emails.send({
    from: env.RESEND_FROM,
    to: [para],
    subject: assunto,
    html,
    attachments: [
      {
        filename: `orcamento-${orc.numero}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (resposta.error) {
    throw new AppError(`Erro ao enviar e-mail via Resend: ${resposta.error.message}`, 400)
  }

  return {
    sucesso: true,
    emailId: resposta.data?.id,
    destinatario: para,
    numero: orc.numero,
  }
}
