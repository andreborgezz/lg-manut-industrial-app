// monta o "set" de um update parcial: só as chaves enviadas (não undefined) e conhecidas
export function montarSet(dados: Record<string, unknown>, colunas: Record<string, string>) {
  const chaves = Object.keys(colunas).filter((k) => dados[k] !== undefined)
  return {
    vazio: chaves.length === 0,
    sets: chaves.map((k, i) => `${colunas[k]} = $${i + 2}`).join(', '),
    valores: chaves.map((k) => dados[k]),
  }
}
