/* ============================================================
   LISTA — Renderização dos itens e cálculo de totais
   ============================================================ */
import { state, salvarEstado } from './storage.js';
import { icone }               from './icones.js';

function formatarMoeda(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata a quantidade conforme a unidade */
function formatarQtd(qtd, unidade) {
  if (unidade === 'kg') {
    if (qtd < 1) return `${Math.round(qtd * 1000)} g`;
    return `${qtd.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
  }
  return `${qtd} un`;
}

/** Formata o preço com a unidade correspondente */
function formatarPrecoUn(preco, unidade) {
  return `${formatarMoeda(preco)}/${unidade === 'kg' ? 'kg' : 'un'}`;
}

function criarBotaoAcao(acao, id, rotulo, classe, svg) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn-acao ${classe}`;
  btn.dataset.acao = acao;
  btn.dataset.id = String(id);
  btn.title = rotulo;
  btn.setAttribute('aria-label', rotulo);
  btn.innerHTML = svg;
  return btn;
}

export function atualizarLista() {
  const lista        = document.getElementById('listaItens');
  const badge        = document.getElementById('badgeContagem');
  const btnLimpar    = document.getElementById('btnLimparTodos');
  const btnFinalizar = document.getElementById('btnFinalizarCompra');
  if (!lista) return;

  badge.textContent = state.itens.length;
  btnLimpar.style.display = state.itens.length ? 'flex' : 'none';
  if (btnFinalizar) btnFinalizar.style.display = state.itens.length ? 'flex' : 'none';

  lista.textContent = '';

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
    const incluido = item.incluido;
    const unidade  = item.unidade;
    const subtotal = item.preco * item.quantidade;

    const div = document.createElement('div');
    div.className = `item ${incluido ? 'incluido' : 'excluido'}`;
    div.dataset.id = String(item.id);
    div.setAttribute('role', 'listitem');

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'item-check';
    check.dataset.acao = 'toggle';
    check.dataset.id = String(item.id);
    check.setAttribute('aria-pressed', String(incluido));
    check.setAttribute('aria-label', `${incluido ? 'Desmarcar' : 'Marcar'} ${item.nome}`);
    check.title = incluido ? 'Desmarcar' : 'Marcar';
    if (incluido) check.innerHTML = icone('check');

    const info = document.createElement('div');
    info.className = 'item-info';

    const nome = document.createElement('div');
    nome.className = 'item-nome';
    nome.textContent = item.nome;

    const detalhes = document.createElement('div');
    detalhes.className = 'item-detalhes';
    const precoTag = document.createElement('span');
    precoTag.className = 'item-detalhe-tag';
    precoTag.textContent = formatarPrecoUn(item.preco, unidade);
    const qtdTag = document.createElement('span');
    qtdTag.className = 'item-detalhe-tag';
    qtdTag.textContent = formatarQtd(item.quantidade, unidade);
    detalhes.append(precoTag, qtdTag);
    info.append(nome, detalhes);

    const total = document.createElement('div');
    total.className = 'item-total';
    total.textContent = formatarMoeda(subtotal);

    const acoes = document.createElement('div');
    acoes.className = 'item-acoes';
    acoes.append(
      criarBotaoAcao('editar', item.id, `Editar ${item.nome}`, 'editar', icone('editar')),
      criarBotaoAcao('excluir', item.id, `Excluir ${item.nome}`, 'excluir', icone('lixeira')),
    );

    div.append(check, info, total, acoes);
    lista.appendChild(div);
  });
}

export function calcularTotais() {
  const incluidos  = state.itens.filter(i => i.incluido);
  const totalUn    = incluidos.filter(i => i.unidade === 'un').reduce((a, i) => a + i.quantidade, 0);
  const totalKg    = incluidos.filter(i => i.unidade === 'kg').reduce((a, i) => a + i.quantidade, 0);
  const totalValor = Math.round(incluidos.reduce((a, i) => a + i.preco * i.quantidade * 100, 0)) / 100;
  const progPct    = state.itens.length ? (incluidos.length / state.itens.length) * 100 : 0;

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
