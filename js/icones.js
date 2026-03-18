/* ============================================================
   ÍCONES — SVGs inline com tamanho explícito
   ============================================================ */

// Todos os SVGs têm width/height fixos para evitar renderização em 300×150px
const S = (path, w = 18, h = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="display:inline-block;vertical-align:middle;flex-shrink:0"
    aria-hidden="true">${path}</svg>`;

export const ICONES = {
  // Carrinho de compras
  carrinho: S(`<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>`),

  // Carrinho com + (estado vazio)
  carrinhoMais: S(`<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>`, 40, 40),

  // Paleta (temas)
  paleta: S(`<circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="14" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15" r="1.5" fill="currentColor" stroke="none"/><path d="M12 22a2 2 0 002-2c0-1.1-1-2-2-3-1 1-2 1.9-2 3a2 2 0 002 2z"/>`),

  // Compartilhar
  compartilhar: S(`<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`),

  // A→Z
  ordenarNome: S(`<path d="M5 17H3l4-8 4 8H9"/><line x1="5.2" y1="15" x2="8.8" y2="15"/><line x1="15" y1="3" x2="15" y2="21"/><path d="M18 6l3-3-3-3"/>`),

  // 1→9
  ordenarNum: S(`<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>`),

  // Check duplo (marcar todos)
  marcarTodos: S(`<polyline points="17 1 9 10 5 6"/><polyline points="21 9 13 18 9 14"/>`),

  // Sacola (total de itens)
  cesto: S(`<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>`),

  // Lixeira
  lixeira: S(`<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>`),

  // Lápis (editar)
  editar: S(`<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>`),

  // + (adicionar)
  mais: S(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`),

  // × (fechar/cancelar)
  fechar: S(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),

  // Disquete (salvar)
  salvar: S(`<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>`),

  // Check simples
  check: S(`<polyline points="20 6 9 17 4 12"/>`, 14, 14),

  // R$ (preço)
  moedas: S(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>`),

  // # (quantidade)
  hashtag: S(`<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>`),

  // Nota fiscal (total)
  recibo: S(`<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>`),

  // Etiqueta (nome)
  etiqueta: S(`<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`),

  // ✓ círculo (sucesso)
  checkCirculo: S(`<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`),

  // × círculo (erro)
  erroCirculo: S(`<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`),

  // i círculo (info)
  infoCirculo: S(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`),

  // Relógio (histórico)
  relogio: S(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`),

  // Arquivo / finalizar compra
  arquivo: S(`<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>`),

  // Chevron para acordeão
  chevron: S(`<polyline points="6 9 12 15 18 9"/>`),
};

export function icone(nome) {
  return ICONES[nome] ?? ICONES.infoCirculo;
}
