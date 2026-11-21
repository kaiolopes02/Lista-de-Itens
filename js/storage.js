/* ============================================================
   STORAGE — Estado global, localStorage e histórico
   ============================================================ */
import { normalizarEstado, normalizarHistorico } from './validacao.js';

const CHAVE_LISTA     = 'listaCompras_v2';
const CHAVE_LEGADA    = 'listaCompras';
const CHAVE_BACKUP    = 'listaCompras_backup';
const CHAVE_HISTORICO = 'listaCompras_historico';
const MAX_HISTORICO   = 5;

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

function guardarBackup(conteudo) {
  if (!conteudo) return;
  try {
    localStorage.setItem(CHAVE_BACKUP, conteudo);
  } catch (e) {
    console.warn('Não foi possível guardar o backup:', e);
  }
}

/**
 * Carrega e valida o estado do localStorage.
 * Dados corrompidos são preservados em `listaCompras_backup` e ignorados.
 * @returns {boolean} false quando o conteúdo armazenado era inválido
 */
export function carregarEstado() {
  let raw;
  try {
    raw = localStorage.getItem(CHAVE_LISTA) || localStorage.getItem(CHAVE_LEGADA);
  } catch (e) {
    console.warn('Erro ao acessar o armazenamento:', e);
    return false;
  }
  if (!raw) return true;

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    guardarBackup(raw);
    console.warn('Estado local inválido preservado em backup:', e);
    return false;
  }

  const normalizado = normalizarEstado(obj);
  if (!normalizado) {
    guardarBackup(raw);
    console.warn(`Estado local inválido preservado em "${CHAVE_BACKUP}".`);
    return false;
  }

  state.itens     = normalizado.itens;
  state.temaAtual = normalizado.temaAtual;
  return true;
}

/**
 * Valida uma fonte externa (URL/Firebase) sem tocar no estado atual.
 * @returns {{itens: Array, temaAtual: string}|null}
 */
export function prepararEstadoExterno(dados, opcoes = {}) {
  return normalizarEstado(dados, opcoes);
}

/** Substitui o estado atual, guardando a lista anterior em backup. */
export function substituirEstado(normalizado) {
  if (state.itens.length) guardarBackup(JSON.stringify(state));
  state.itens     = normalizado.itens;
  state.temaAtual = normalizado.temaAtual;
  salvarEstado();
}

/**
 * Valida e aplica um objeto externo de forma atômica.
 * @returns {boolean} false quando o snapshot é inválido
 */
export function aplicarEstadoExterno(dados, opcoes = {}) {
  const normalizado = prepararEstadoExterno(dados, opcoes);
  if (!normalizado) return false;
  substituirEstado(normalizado);
  return true;
}

/* ============================================================
   HISTÓRICO
   ============================================================ */

/**
 * Retorna as compras válidas salvas no histórico.
 * @returns {Array} até MAX_HISTORICO entradas
 */
export function carregarHistorico() {
  try {
    const raw = localStorage.getItem(CHAVE_HISTORICO);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    const validas = normalizarHistorico(lista);
    if (!Array.isArray(lista) || validas.length !== lista.length) {
      localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(validas));
    }
    return validas.slice(0, MAX_HISTORICO);
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
    itens:     JSON.parse(JSON.stringify(state.itens)),
    temaAtual: state.temaAtual,
  };

  historico.unshift(entrada);
  while (historico.length > MAX_HISTORICO) historico.pop();

  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  } catch (e) {
    console.warn('Erro ao salvar histórico:', e);
    return false;
  }

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
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  } catch (e) {
    console.warn('Erro ao atualizar histórico:', e);
  }
}
