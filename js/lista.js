/* ============================================================
   LISTA — Renderização dos itens e cálculo de totais
   ============================================================ */
import { state, salvarEstado } from './storage.js';
import { icone }               from './icones.js';

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatarMoeda(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

export function atualizarLista() {
  const lista     = document.getElementById('listaItens');
  const badge     = document.getElementById('badgeContagem');
  const btnLimpar = document.getElementById('btnLimparTodos');
  if (!lista) return;

  const btnFinalizar = document.getElementById('btnFinalizarCompra');
  badge.textContent       = state.itens.length;
  btnLimpar.style.display  = state.itens.length ? 'flex' : 'none';
  if (btnFinalizar) btnFinalizar.style.display = state.itens.length ? 'flex' : 'none';
  lista.innerHTML = '';

  if (!state.itens.length) {
    lista.innerHTML = `
      <div class="estado-vazio">
        <div class="vazio-icone">${icone('carrinhoMais')}</div>
        <div>
          <strong>Lista vazia!</strong>
          <p>Adicione itens acima para começar sua lista de compras.</p>
        </div>
      </div>`;
    return;
  }

  state.itens.forEach(item => {
    const incluido = item.incluido !== false;
    const div = document.createElement('div');
    div.classList.add('item', incluido ? 'incluido' : 'excluido');
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="item-check" data-acao="toggle" data-id="${item.id}" title="${incluido ? 'Desmarcar' : 'Marcar'}">
        ${incluido ? icone('check') : ''}
      </div>
      <div class="item-info">
        <div class="item-nome">${escHtml(item.nome)}</div>
        <div class="item-detalhes">
          <span class="item-detalhe-tag">${formatarMoeda(item.preco)} / un</span>
          <span class="item-detalhe-tag">${item.quantidade} un</span>
        </div>
      </div>
      <div class="item-total">${formatarMoeda(item.preco * item.quantidade)}</div>
      <div class="item-acoes">
        <button class="btn-acao editar"  data-acao="editar"  data-id="${item.id}" title="Editar">${icone('editar')}</button>
        <button class="btn-acao excluir" data-acao="excluir" data-id="${item.id}" title="Excluir">${icone('lixeira')}</button>
      </div>`;
    lista.appendChild(div);
  });
}

export function calcularTotais() {
  const incluidos  = state.itens.filter(i => i.incluido !== false);
  const totalItens = incluidos.reduce((a,i) => a + i.quantidade, 0);
  const totalValor = incluidos.reduce((a,i) => a + i.preco * i.quantidade, 0);
  const progPct    = state.itens.length ? (incluidos.length / state.itens.length) * 100 : 0;
  document.getElementById('totalItens').textContent    = totalItens;
  document.getElementById('totalMarcados').textContent = `${incluidos.length}/${state.itens.length}`;
  document.getElementById('totalCompra').textContent   = formatarMoeda(totalValor);
  document.getElementById('progresso').style.width     = progPct + '%';
}

export function ordenarPorNome() {
  state.itens.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  atualizarLista(); calcularTotais(); salvarEstado();
}

export function ordenarPorData() {
  state.itens.sort((a,b) => b.id - a.id);
  atualizarLista(); calcularTotais(); salvarEstado();
}
