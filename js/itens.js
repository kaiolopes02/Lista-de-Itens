/* ============================================================
   ITENS — CRUD da lista
   ============================================================ */
import { state, salvarEstado }            from './storage.js';
import { atualizarLista, calcularTotais } from './lista.js';
import { mostrarNotificacao }             from './notificacao.js';
import { icone }                          from './icones.js';

/* ── Labels dinâmicos conforme unidade selecionada ─────────── */
export function atualizarLabelsUnidade() {
  const unidade     = document.getElementById('unidade')?.value || 'un';
  const labelPreco  = document.getElementById('labelPreco');
  const labelQtd    = document.getElementById('labelQtd');
  const inputQtd    = document.getElementById('quantidade');

  if (unidade === 'kg') {
    if (labelPreco) labelPreco.textContent = 'Preço / kg';
    if (labelQtd)   labelQtd.textContent   = 'Quantidade (kg)';
    if (inputQtd) {
      inputQtd.placeholder = '0,800';
      inputQtd.step        = '0.001';
      inputQtd.min         = '0.001';
    }
  } else {
    if (labelPreco) labelPreco.textContent = 'Preço / un';
    if (labelQtd)   labelQtd.textContent   = 'Quantidade';
    if (inputQtd) {
      inputQtd.placeholder = '1';
      inputQtd.step        = '1';
      inputQtd.min         = '1';
    }
  }
}

export function entrarModoEdicao(item) {
  document.getElementById('nome').value       = item.nome;
  document.getElementById('preco').value      = item.preco;
  document.getElementById('quantidade').value = item.quantidade;

  const sel = document.getElementById('unidade');
  if (sel) sel.value = item.unidade || 'un';
  atualizarLabelsUnidade();

  document.getElementById('botaoCancelar').style.display = 'inline-flex';
  document.getElementById('editNomeLabel').textContent   = item.nome;
  document.getElementById('formCard').classList.add('editando');
  document.getElementById('nome').focus();
  document.getElementById('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function sairModoEdicao() {
  document.getElementById('formItem').reset();
  document.getElementById('botaoCancelar').style.display = 'none';
  document.getElementById('formCard').classList.remove('editando');
  atualizarLabelsUnidade(); // reset dos labels ao limpar
}

export function manipularItem(e, editandoId) {
  e.preventDefault();

  const nome    = document.getElementById('nome').value.trim();
  const preco   = parseFloat(document.getElementById('preco').value);
  const qtd     = parseFloat(document.getElementById('quantidade').value);
  const unidade = document.getElementById('unidade')?.value || 'un';

  if (!nome)                     { mostrarNotificacao('Informe o nome do item.', 'erro');  return false; }
  if (isNaN(preco) || preco < 0) { mostrarNotificacao('Preço inválido.', 'erro');          return false; }
  if (isNaN(qtd)   || qtd <= 0)  { mostrarNotificacao('Quantidade deve ser maior que 0.', 'erro'); return false; }

  const duplicado = state.itens.find(
    i => i.nome.toLowerCase() === nome.toLowerCase() && i.id !== editandoId
  );
  if (duplicado) { mostrarNotificacao('Já existe um item com esse nome!', 'erro'); return false; }

  if (editandoId !== null) {
    const item = state.itens.find(i => i.id === editandoId);
    if (item) { item.nome = nome; item.preco = preco; item.quantidade = qtd; item.unidade = unidade; }
    mostrarNotificacao(`"${nome}" atualizado!`, 'sucesso');
  } else {
    state.itens.push({ id: Date.now(), nome, preco, quantidade: qtd, unidade, incluido: true });
    mostrarNotificacao(`"${nome}" adicionado!`, 'sucesso');
  }

  atualizarLista(); calcularTotais(); salvarEstado();
  return true;
}

export function toggleItem(id) {
  const item = state.itens.find(i => i.id === id);
  if (!item) return;
  item.incluido = item.incluido === false;
  atualizarLista(); calcularTotais(); salvarEstado();
}

export function excluirItem(id, aoConcluir) {
  const el = document.querySelector(`.item[data-id="${id}"]`);
  const remover = () => {
    state.itens = state.itens.filter(i => i.id !== id);
    atualizarLista(); calcularTotais(); salvarEstado();
    if (aoConcluir) aoConcluir();
  };
  if (el) { el.classList.add('saindo'); el.addEventListener('animationend', remover, { once: true }); }
  else remover();
}

export function toggleTodos() {
  const todosIncluidos = state.itens.every(i => i.incluido !== false);
  state.itens.forEach(i => (i.incluido = !todosIncluidos));
  atualizarLista(); calcularTotais(); salvarEstado();
  mostrarNotificacao(todosIncluidos ? 'Todos desmarcados.' : 'Todos marcados.', 'info');
}

export function limparTodos() {
  if (!state.itens.length) return;
  if (!confirm('Tem certeza que deseja limpar toda a lista?')) return;
  state.itens = [];
  atualizarLista(); calcularTotais(); salvarEstado();
  mostrarNotificacao('Lista limpa!', 'info');
}
