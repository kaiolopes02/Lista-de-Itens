import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarItem, normalizarEstado, normalizarHistorico,
  proximoId, codificarSnapshot, decodificarSnapshot,
} from '../js/validacao.js';

const item = (extra = {}) => ({
  id: 1,
  nome: 'Arroz',
  preco: 5.5,
  quantidade: 2,
  unidade: 'un',
  incluido: true,
  ...extra,
});

test('aceita item completo e remove espaços do nome', () => {
  assert.equal(validarItem(item()), true);
  const estado = normalizarEstado({ itens: [item({ nome: '  Arroz  ' })], temaAtual: 'verde' });
  assert.deepEqual(estado.itens[0].nome, 'Arroz');
  assert.equal(estado.temaAtual, 'verde');
});

test('rejeita campo ausente, extra ou de tipo errado', () => {
  for (const campo of ['id', 'nome', 'preco', 'quantidade', 'unidade', 'incluido']) {
    const incompleto = item();
    delete incompleto[campo];
    assert.equal(validarItem(incompleto), false, `sem ${campo}`);
  }
  assert.equal(validarItem(item({ extra: 'x' })), false);
  assert.equal(validarItem(item({ nome: '   ' })), false);
  assert.equal(validarItem(item({ nome: 'x'.repeat(121) })), false);
  assert.equal(validarItem(item({ unidade: 'g' })), false);
  assert.equal(validarItem(item({ incluido: 'true' })), false);
});

test('rejeita números não finitos e fora do domínio', () => {
  assert.equal(validarItem(item({ preco: Infinity })), false);
  assert.equal(validarItem(item({ preco: NaN })), false);
  assert.equal(validarItem(item({ preco: -1 })), false);
  assert.equal(validarItem(item({ quantidade: Infinity })), false);
  assert.equal(validarItem(item({ quantidade: 0 })), false);
  assert.equal(validarItem(item({ id: 0 })), false);
  assert.equal(validarItem(item({ id: -2 })), false);
  assert.equal(validarItem(item({ id: 1.5 })), false);
  assert.equal(validarItem(item({ id: '1' })), false);
});

test('rejeita IDs duplicados no mesmo snapshot', () => {
  assert.equal(normalizarEstado({ itens: [item(), item({ nome: 'Feijão' })] }), null);
});

test('snapshot vazio é válido e ausência de itens depende da opção', () => {
  assert.deepEqual(normalizarEstado({ itens: [] }), { itens: [], temaAtual: 'azul' });
  assert.equal(normalizarEstado({ temaAtual: 'azul' }), null);
  assert.deepEqual(
    normalizarEstado({ temaAtual: 'azul' }, { itensOpcionais: true }),
    { itens: [], temaAtual: 'azul' },
  );
});

test('tema desconhecido cai para o padrão', () => {
  assert.equal(normalizarEstado({ itens: [], temaAtual: '"><script>' }).temaAtual, 'azul');
});

test('histórico descarta entradas inválidas e mantém as boas', () => {
  const valida = { id: 10, data: new Date().toISOString(), itens: [item()], temaAtual: 'azul' };
  const invalida = { id: 11, data: 'não é data', itens: [item()], temaAtual: 'azul' };
  const historico = normalizarHistorico([valida, invalida, null, { id: 12 }]);
  assert.equal(historico.length, 1);
  assert.equal(historico[0].id, 10);
});

test('próximo id é único e maior que os existentes', () => {
  const maior = Date.now() + 1000;
  const id = proximoId([item({ id: maior }), item({ id: 2, nome: 'Feijão' })]);
  assert.equal(Number.isSafeInteger(id), true);
  assert.equal(id, maior + 1);
});

test('snapshot codificado em base64url volta igual, com unicode', () => {
  const original = { itens: [item({ nome: 'Açúcar 100% — 1/2' })], temaAtual: 'rosa' };
  const codificado = codificarSnapshot(original);
  assert.doesNotMatch(codificado, /[+/=]/);
  assert.deepEqual(decodificarSnapshot(codificado), original);
});

test('decodifica snapshot legado em base64 comum', () => {
  const original = { itens: [item()], temaAtual: 'azul' };
  const legado = btoa(encodeURIComponent(JSON.stringify(original)));
  assert.deepEqual(decodificarSnapshot(legado), original);
  assert.deepEqual(decodificarSnapshot(legado.replace(/\+/g, ' ')), original);
});

test('payload inválido não lança e retorna null', () => {
  for (const entrada of ['', '!!!', btoa('não é json'), 'abc', null, 42]) {
    assert.equal(decodificarSnapshot(entrada), null);
  }
});
