import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemoriaLocal {
  constructor() { this.mapa = new Map(); }
  getItem(chave) { return this.mapa.has(chave) ? this.mapa.get(chave) : null; }
  setItem(chave, valor) { this.mapa.set(chave, String(valor)); }
  removeItem(chave) { this.mapa.delete(chave); }
  clear() { this.mapa.clear(); }
}

globalThis.localStorage = new MemoriaLocal();

const {
  state, carregarEstado, salvarEstado, prepararEstadoExterno,
  substituirEstado, aplicarEstadoExterno, carregarHistorico, finalizarCompra,
} = await import('../js/storage.js');

const item = (extra = {}) => ({
  id: 1, nome: 'Arroz', preco: 5.5, quantidade: 2, unidade: 'un', incluido: true, ...extra,
});

beforeEach(() => {
  localStorage.clear();
  state.itens = [];
  state.temaAtual = 'azul';
});

test('carrega estado válido', () => {
  localStorage.setItem('listaCompras_v2', JSON.stringify({ itens: [item()], temaAtual: 'verde' }));
  assert.equal(carregarEstado(), true);
  assert.equal(state.itens.length, 1);
  assert.equal(state.temaAtual, 'verde');
});

test('JSON corrompido não derruba o app e vai para backup', () => {
  localStorage.setItem('listaCompras_v2', '{quebrado');
  assert.equal(carregarEstado(), false);
  assert.equal(localStorage.getItem('listaCompras_backup'), '{quebrado');
  assert.deepEqual(state.itens, []);
});

test('item incompleto no localStorage é rejeitado e preservado', () => {
  const raw = JSON.stringify({ itens: [{ id: 1, nome: 'incompleto' }], temaAtual: 'azul' });
  localStorage.setItem('listaCompras_v2', raw);
  assert.equal(carregarEstado(), false);
  assert.equal(localStorage.getItem('listaCompras_backup'), raw);
  assert.deepEqual(state.itens, []);
});

test('estado externo inválido é rejeitado por inteiro', () => {
  assert.equal(prepararEstadoExterno({ itens: [item({ preco: '<img onerror=1>' })] }), null);
  assert.equal(prepararEstadoExterno({ itens: [item()], temaAtual: 'azul' }).itens.length, 1);
  assert.equal(aplicarEstadoExterno({ itens: [item(), item()] }), false);
  assert.deepEqual(state.itens, []);
});

test('substituir estado guarda a lista anterior em backup', () => {
  state.itens = [item()];
  const normalizado = prepararEstadoExterno({ itens: [], temaAtual: 'azul' });
  substituirEstado(normalizado);
  assert.deepEqual(state.itens, []);
  assert.match(localStorage.getItem('listaCompras_backup'), /Arroz/);
  assert.equal(JSON.parse(localStorage.getItem('listaCompras_v2')).itens.length, 0);
});

test('histórico inválido é filtrado e a limpeza é persistida', () => {
  const valida = { id: 1, data: new Date().toISOString(), itens: [item()], temaAtual: 'azul' };
  const invalida = { id: 2, data: new Date().toISOString(), itens: [{ id: 3 }], temaAtual: 'azul' };
  localStorage.setItem('listaCompras_historico', JSON.stringify([valida, invalida]));
  const historico = carregarHistorico();
  assert.equal(historico.length, 1);
  assert.equal(historico[0].id, 1);
  assert.equal(JSON.parse(localStorage.getItem('listaCompras_historico')).length, 1);
});

test('finalizar compra salva no histórico e limpa a lista', () => {
  state.itens = [item()];
  salvarEstado();
  assert.equal(finalizarCompra(), true);
  assert.deepEqual(state.itens, []);
  assert.equal(carregarHistorico().length, 1);
  assert.equal(carregarHistorico()[0].itens[0].nome, 'Arroz');
});
