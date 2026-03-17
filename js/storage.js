/* ============================================================
   STORAGE — Estado global e persistência (localStorage)
   ============================================================ */

/** Estado em memória da aplicação */
export const state = {
  itens: [],
  temaAtual: 'azul',
};

/** Persiste o estado no localStorage */
export function salvarEstado() {
  try {
    localStorage.setItem('listaCompras_v2', JSON.stringify(state));
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
      localStorage.getItem('listaCompras_v2') ||
      localStorage.getItem('listaCompras');

    if (raw) {
      const obj = JSON.parse(raw);
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
