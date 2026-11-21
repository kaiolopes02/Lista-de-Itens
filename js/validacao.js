/* ============================================================
   VALIDAÇÃO — Schema único para toda entrada não confiável
   Sem DOM e sem Firebase: pode ser importado pelo Node nos testes.
   ============================================================ */

export const UNIDADES      = ['un', 'kg'];
export const MAX_NOME      = 120;
export const TEMA_PADRAO   = 'azul';
export const TEMAS_VALIDOS = [
  'azul', 'verde', 'violeta', 'vermelho', 'laranja',
  'amarelo', 'anil', 'rosa', 'escuro',
];

const CAMPOS_ITEM = ['id', 'nome', 'preco', 'quantidade', 'unidade', 'incluido'];

function ehObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/** Valida um item completo. Campos extras, ausentes ou de tipo errado reprovam. */
export function validarItem(item) {
  if (!ehObjeto(item)) return false;
  const chaves = Object.keys(item);
  if (chaves.length !== CAMPOS_ITEM.length) return false;
  if (!CAMPOS_ITEM.every(campo => Object.hasOwn(item, campo))) return false;

  if (!Number.isSafeInteger(item.id) || item.id <= 0) return false;
  if (typeof item.nome !== 'string') return false;
  if (item.nome.trim().length === 0 || item.nome.length > MAX_NOME) return false;
  if (!Number.isFinite(item.preco) || item.preco < 0) return false;
  if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) return false;
  if (!UNIDADES.includes(item.unidade)) return false;
  if (typeof item.incluido !== 'boolean') return false;
  return true;
}

/**
 * Valida um estado inteiro de forma atômica: um item inválido reprova tudo.
 * `itensOpcionais` aceita ausência de `itens` (o RTDB não armazena array vazio).
 * @returns {{itens: Array, temaAtual: string}|null}
 */
export function normalizarEstado(dados, { itensOpcionais = false } = {}) {
  if (!ehObjeto(dados)) return null;

  let itens = dados.itens;
  if (itens === undefined || itens === null) {
    if (!itensOpcionais) return null;
    itens = [];
  }
  if (!Array.isArray(itens)) return null;

  const ids = new Set();
  const normalizados = [];
  for (const item of itens) {
    if (!validarItem(item) || ids.has(item.id)) return null;
    ids.add(item.id);
    normalizados.push({
      id:         item.id,
      nome:       item.nome.trim(),
      preco:      item.preco,
      quantidade: item.quantidade,
      unidade:    item.unidade,
      incluido:   item.incluido,
    });
  }

  const temaAtual = TEMAS_VALIDOS.includes(dados.temaAtual) ? dados.temaAtual : TEMA_PADRAO;
  return { itens: normalizados, temaAtual };
}

/** Descarta entradas de histórico inválidas, mantendo as boas. */
export function normalizarHistorico(lista) {
  if (!Array.isArray(lista)) return [];
  const validas = [];
  for (const entrada of lista) {
    if (!ehObjeto(entrada)) continue;
    if (!Number.isFinite(entrada.id)) continue;
    if (typeof entrada.data !== 'string' || Number.isNaN(Date.parse(entrada.data))) continue;
    const estado = normalizarEstado({ itens: entrada.itens, temaAtual: entrada.temaAtual });
    if (!estado) continue;
    validas.push({ id: entrada.id, data: entrada.data, ...estado });
  }
  return validas;
}

/** Próximo id: maior que todos os existentes e que Date.now(). */
export function proximoId(itens) {
  const maior = itens.reduce(
    (maximo, item) => (Number.isSafeInteger(item?.id) && item.id > maximo ? item.id : maximo),
    0,
  );
  return Math.max(Date.now(), maior + 1);
}

/** Serializa um snapshot em base64url (sem +, / ou = na URL). */
export function codificarSnapshot(obj) {
  return btoa(encodeURIComponent(JSON.stringify(obj)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Decodifica snapshots novos (base64url) e legados (base64 comum). */
export function decodificarSnapshot(texto) {
  if (typeof texto !== 'string' || texto.length === 0) return null;
  try {
    let base64 = texto
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/ /g, '+')          // URLSearchParams converte "+" legado em espaço
      .replace(/[\r\n\t]/g, '');
    base64 += '='.repeat((4 - (base64.length % 4)) % 4);
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, caractere => caractere.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(decodeURIComponent(json));
    return ehObjeto(obj) ? obj : null;
  } catch {
    return null;
  }
}
