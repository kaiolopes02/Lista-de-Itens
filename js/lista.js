/* ============================================================
   LISTA — Renderização dos itens e cálculo de totais
   ============================================================ */
import { state, salvarEstado } from './storage.js';
import { icone }               from './icones.js';

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatarMoeda(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata a quantidade conforme a unidade */
function formatarQtd(qtd, unidade) {
  if (unidade === 'kg') {
    // Exibe em gramas se < 1kg, em kg caso contrário
    if (qtd < 1) {
      return `${Math.round(qtd * 1000)} g`;
    }
    return `${qtd.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
  }
  return `${qtd} un`;
}

/** Formata o preço com a unidade correspondente */
function formatarPrecoUn(preco, unidade) {
  return `${formatarMoeda(preco)}/${unidade === 'kg' ? 'kg' : 'un'}`;
}

export function atualizarLista() {
  const lista      = document.getElementById('listaItens');
  const badge      = document.getElementById('badgeContagem');
  const btnLimpar  = document.getElementById('btnLimparTodos');
  const btnFinalizar = document.getElementById('btnFinalizarCompra');
  if (!lista) return;

  badge.textContent       = state.itens.length;
  btnLimpar.style.display   = state.itens.length ? 'flex' : 'none';
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
    const incluido  = item.incluido !== false;
    const unidade   = item.unidade || 'un';
    const subtotal  = item.preco * item.quantidade;

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
          <span class="item-detalhe-tag">${formatarPrecoUn(item.preco, unidade)}</span>
          <span class="item-detalhe-tag">${formatarQtd(item.quantidade, unidade)}</span>
        </div>
      </div>
      <div class="item-total">${formatarMoeda(subtotal)}</div>
      <div class="item-acoes">
        <button class="btn-acao editar"  data-acao="editar"  data-id="${item.id}" title="Editar">${icone('editar')}</button>
        <button class="btn-acao excluir" data-acao="excluir" data-id="${item.id}" title="Excluir">${icone('lixeira')}</button>
      </div>`;

    lista.appendChild(div);
  });
}

export function calcularTotais() {
  const incluidos  = state.itens.filter(i => i.incluido !== false);
  // Para "Total de itens": soma unidades inteiras + soma pesos em kg (mostra separado se misto)
  const totalUn    = incluidos.filter(i => (i.unidade || 'un') === 'un').reduce((a, i) => a + i.quantidade, 0);
  const totalKg    = incluidos.filter(i => i.unidade === 'kg').reduce((a, i) => a + i.quantidade, 0);
  const totalValor = incluidos.reduce((a, i) => a + i.preco * i.quantidade, 0);
  const progPct    = state.itens.length ? (incluidos.length / state.itens.length) * 100 : 0;

  // Monta texto do total de itens
  const partes = [];
  if (totalUn > 0) partes.push(`${totalUn} un`);
  if (totalKg > 0) partes.push(`${totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`);
  document.getElementById('totalItens').textContent    = partes.length ? partes.join(' + ') : '0';
  document.getElementById('totalMarcados').textContent = `${incluidos.length}/${state.itens.length}`;
  document.getElementById('totalCompra').textContent   = formatarMoeda(totalValor);
  document.getElementById('progresso').style.width     = progPct + '%';
}

export function ordenarPorNome() {
  state.itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  atualizarLista(); calcularTotais(); salvarEstado();
}

export function ordenarPorData() {
  state.itens.sort((a, b) => b.id - a.id);
  atualizarLista(); calcularTotais(); salvarEstado();
}
