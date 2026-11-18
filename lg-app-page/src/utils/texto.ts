/** Remove acentos e converte para minúsculas para buscas insensíveis a acentuação. */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
