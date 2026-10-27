/**
 * Cria um usuário no banco de dados.
 * Uso: tsx scripts/criar-usuario.ts
 * A senha é lida do terminal sem aparecer em logs nem em argumentos.
 */
import 'dotenv/config'
import readline from 'readline'
import bcrypt from 'bcryptjs'
import pool, { connect } from '../database'

function perguntar(rl: readline.Interface, pergunta: string): Promise<string> {
  return new Promise((resolve) => rl.question(pergunta, resolve))
}

function lerSenhaOculta(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    process.stdout.write(prompt)

    // no Windows o stdin não suporta setRawMode via rl, então usamos process.stdin diretamente
    let senha = ''
    process.stdin.setRawMode?.(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    const onData = (char: string) => {
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode?.(false)
        process.stdin.removeListener('data', onData)
        process.stdin.pause()
        rl.close()
        process.stdout.write('\n')
        resolve(senha)
      } else if (char === '') {
        process.stdout.write('\n')
        process.exit(0)
      } else if (char === '') {
        if (senha.length > 0) senha = senha.slice(0, -1)
      } else {
        senha += char
      }
    }

    process.stdin.on('data', onData)
  })
}

async function main() {
  console.log('=== Criar usuário ===\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const nome = (await perguntar(rl, 'Nome: ')).trim()
  const email = (await perguntar(rl, 'E-mail: ')).trim().toLowerCase()
  rl.close()

  if (!nome || !email) {
    console.error('Nome e e-mail são obrigatórios.')
    process.exit(1)
  }

  const senha = await lerSenhaOculta('Senha: ')
  const confirmacao = await lerSenhaOculta('Confirmar senha: ')

  if (senha !== confirmacao) {
    console.error('As senhas não coincidem.')
    process.exit(1)
  }

  if (senha.length < 8) {
    console.error('A senha deve ter pelo menos 8 caracteres.')
    process.exit(1)
  }

  const senhaHash = await bcrypt.hash(senha, 12)

  await connect()

  try {
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, senhaHash]
    )
    const u = rows[0] as { id: number; nome: string; email: string }
    console.log(`\nUsuário criado com sucesso!`)
    console.log(`  ID:    ${u.id}`)
    console.log(`  Nome:  ${u.nome}`)
    console.log(`  Email: ${u.email}`)
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === '23505') {
      console.error('Já existe um usuário com esse e-mail.')
    } else {
      console.error('Erro ao criar usuário:', err)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
