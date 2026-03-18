/* ============================================================
   STORAGE — Estado global, localStorage e histórico
   ============================================================ */

const CHAVE_LISTA    = 'listaCompras_v2';
const CHAVE_HISTORICO = 'listaCompras_historico';
const MAX_HISTORICO  = 5;

/** Estado em memória da aplicação */
export const state = {
  itens: [],
  temaAtual: 'azul',
};

/** Persiste o estado no localStorage */
export function salvarEstado() {
  try {
    localStorage.setItem(CHAVE_LISTA, JSON.stringify(state));
  } catch (e) {
    console.warn('Não foi possível salvar o estado:', e);
  }
}

/**
 * Carrega o estado do localStorage.
 * Mantém compatibilidade com a chave da versão anterior ('listaCompras').
 */
export function carregarEstado() {
  try {
    const raw =
      localStorage.getItem(CHAVE_LISTA) ||
      localStorage.getItem('listaCompras');

    if (raw) {
      const obj   = JSON.parse(raw);
      state.itens     = Array.isArray(obj.itens) ? obj.itens : [];
      state.temaAtual = typeof obj.temaAtual === 'string' ? obj.temaAtual : 'azul';
    }
  } catch (e) {
    console.warn('Erro ao carregar estado:', e);
  }
}

/**
 * Aplica um objeto externo (vindo do Firebase) no state local.
 * @param {Object} dados - { itens, temaAtual }
 */
export function aplicarEstadoExterno(dados) {
  if (Array.isArray(dados.itens))          state.itens     = dados.itens;
  if (typeof dados.temaAtual === 'string') state.temaAtual = dados.temaAtual;
  salvarEstado();
}

/* ============================================================
   HISTÓRICO
   ============================================================ */

/**
 * Retorna o array de compras salvas no histórico.
 * @returns {Array} até MAX_HISTORICO entradas
 */
export function carregarHistorico() {
  try {
    const raw = localStorage.getItem(CHAVE_HISTORICO);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista atual no histórico e limpa a lista corrente.
 * Mantém no máximo MAX_HISTORICO registros (remove o mais antigo).
 * @returns {boolean} false se a lista estiver vazia
 */
export function finalizarCompra() {
  if (!state.itens.length) return false;

  const historico = carregarHistorico();

  const entrada = {
    id:        Date.now(),
    data:      new Date().toISOString(),
    itens:     JSON.parse(JSON.stringify(state.itens)), // deep copy
    temaAtual: state.temaAtual,
  };

  // Insere no início e limita ao máximo
  historico.unshift(entrada);
  if (historico.length > MAX_HISTORICO) historico.length = MAX_HISTORICO;

  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  } catch (e) {
    console.warn('Erro ao salvar histórico:', e);
    return false;
  }

  // Limpa a lista atual
  state.itens = [];
  salvarEstado();
  return true;
}

/**
 * Remove uma entrada do histórico pelo id.
 * @param {number} id
 */
export function removerEntradaHistorico(id) {
  const historico = carregarHistorico().filter(e => e.id !== id);
  localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
}
