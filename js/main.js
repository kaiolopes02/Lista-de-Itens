/* ============================================================
   MAIN — Inicialização e wiring de eventos
   ============================================================ */
import { state, carregarEstado, salvarEstado }  from './storage.js';
import { atualizarLista, calcularTotais,
         ordenarPorNome, ordenarPorData }        from './lista.js';
import { manipularItem, entrarModoEdicao,
         sairModoEdicao, toggleItem, excluirItem,
         toggleTodos, limparTodos }              from './itens.js';
import { aplicarTema, carregarTema,
         abrirModalTema, fecharModalTema }        from './tema.js';
import { mostrarNotificacao, fecharNotificacao } from './notificacao.js';
import { icone }                                 from './icones.js';

/* ── Estado de edição ─────────────────────────────────────── */
let editandoId = null;

function iniciarEdicao(item) {
  editandoId = item.id;
  entrarModoEdicao(item);
  atualizarBotaoForm(true);
}

function cancelarEdicao() {
  editandoId = null;
  sairModoEdicao();
  atualizarBotaoForm(false);
}

/* ── Atualiza botão do formulário ─────────────────────────── */
function atualizarBotaoForm(modoEdicao) {
  const btn = document.getElementById('botaoAcao');
  const btnC = document.getElementById('botaoCancelar');
  if (btn)  btn.innerHTML  = modoEdicao
    ? icone('salvar')  + ' Salvar'
    : icone('mais')    + ' Adicionar';
  if (btnC) btnC.innerHTML = icone('fechar') + ' Cancelar';
}

/* ── Injeta todos os ícones SVG no DOM ────────────────────── */
function injetarIcones() {
  const set = (id, nome) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icone(nome);
  };
  set('logoIcone',          'carrinho');
  set('btnTema',            'paleta');
  set('btnCompartilhar',    'compartilhar');
  set('btnOrdenarNome',     'ordenarNome');
  set('btnOrdenarData',     'ordenarNum');
  set('btnToggleTodos',     'marcarTodos');
  set('btnLimparTodos',     'lixeira');
  set('iconeCesto',         'cesto');
  set('iconeEtiqueta',      'etiqueta');
  set('iconeRecibo',        'recibo');
  set('iconeNome',          'etiqueta');
  set('iconePreco',         'moedas');
  set('iconeQtd',           'hashtag');
  set('editBadgeIcone',     'editar');
  set('btnFecharNotificacao','fechar');
  const temaTitulo = document.getElementById('temaTitulo');
  if (temaTitulo) temaTitulo.innerHTML = icone('paleta') + ' Escolha um tema';
  atualizarBotaoForm(false);
}

/* ── Compartilhamento ─────────────────────────────────────── */
function gerarTextoLista() {
  if (!state.itens.length) return null;

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const incluidos = state.itens.filter(i => i.incluido !== false);

  const linhas = ['🛒 LISTA DE COMPRAS', ''];

  state.itens.forEach((item, idx) => {
    const marcado   = item.incluido !== false;
    const subtotal  = item.preco * item.quantidade;
    const prefixo   = marcado ? '✅' : '⬜';
    linhas.push(`${prefixo} ${idx + 1}. ${item.nome}`);
    linhas.push(`   Qtd: ${item.quantidade}  |  Preço unit.: ${fmt(item.preco)}  |  Subtotal: ${fmt(subtotal)}`);
  });

  const totalItens = incluidos.reduce((a, i) => a + i.quantidade, 0);
  const totalValor = incluidos.reduce((a, i) => a + i.preco * i.quantidade, 0);

  linhas.push('');
  linhas.push('─'.repeat(36));
  linhas.push(`📦 Total de itens (marcados): ${totalItens}`);
  linhas.push(`💰 Valor total da compra:     ${fmt(totalValor)}`);

  return linhas.join('\n');
}

function gerarLink() {
  const payload = btoa(encodeURIComponent(JSON.stringify({
    itens: state.itens,
    temaAtual: state.temaAtual,
  })));
  return `${location.origin}${location.pathname}?data=${payload}`;
}

async function compartilhar() {
  const texto = gerarTextoLista();
  if (!texto) {
    mostrarNotificacao('Adicione itens antes de compartilhar.', 'erro');
    return;
  }

  const link = gerarLink();
  const textoCompleto = `${texto}\n\n🔗 Acesse e edite a lista:\n${link}`;

  // Web Share API — abre o menu nativo do sistema (WhatsApp, Telegram, e-mail…)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Lista de Compras',
        text:  textoCompleto,
        url:   link,
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: copia texto + link para a área de transferência
  try {
    await navigator.clipboard.writeText(textoCompleto);
    mostrarNotificacao('Lista e link copiados! (compartilhamento não suportado neste browser)', 'info');
  } catch {
    mostrarNotificacao('Não foi possível compartilhar.', 'erro');
  }
}

/* ── Carrega dados da URL ─────────────────────────────────── */
function carregarDadosUrl() {
  const dadosUrl = new URLSearchParams(location.search).get('data');
  if (!dadosUrl) return false;
  try {
    const obj = JSON.parse(decodeURIComponent(atob(dadosUrl)));
    if (Array.isArray(obj.itens)) {
      state.itens     = obj.itens;
      state.temaAtual = typeof obj.temaAtual === 'string' ? obj.temaAtual : 'azul';
      salvarEstado();
      mostrarNotificacao('Lista carregada do link compartilhado!', 'sucesso');
      return true;
    }
  } catch(e) { console.warn(e); }
  return false;
}

/* ── Inicialização ────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  injetarIcones();
  if (!carregarDadosUrl()) carregarEstado();
  carregarTema();
  atualizarLista();
  calcularTotais();

  document.getElementById('btnTema').addEventListener('click', abrirModalTema);
  document.getElementById('btnCompartilhar').addEventListener('click', compartilhar);
  document.getElementById('btnOrdenarNome').addEventListener('click', () => {
    ordenarPorNome(); mostrarNotificacao('Ordenado por nome.', 'info');
  });
  document.getElementById('btnOrdenarData').addEventListener('click', () => {
    ordenarPorData(); mostrarNotificacao('Ordenado por data (recente).', 'info');
  });
  document.getElementById('btnToggleTodos').addEventListener('click', toggleTodos);
  document.getElementById('btnLimparTodos').addEventListener('click', () => {
    limparTodos(); cancelarEdicao();
  });

  document.getElementById('formItem').addEventListener('submit', e => {
    const sucesso = manipularItem(e, editandoId);
    if (sucesso) cancelarEdicao();
  });
  document.getElementById('botaoCancelar').addEventListener('click', cancelarEdicao);
  document.getElementById('btnFecharNotificacao').addEventListener('click', fecharNotificacao);

  document.getElementById('temaOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModalTema();
  });

  document.getElementById('listaItens').addEventListener('click', e => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const acao = btn.dataset.acao;
    if (!id || !acao) return;
    if (acao === 'toggle')  { toggleItem(id); return; }
    if (acao === 'excluir') { if (editandoId === id) cancelarEdicao(); excluirItem(id); return; }
    if (acao === 'editar')  { const item = state.itens.find(i => i.id === id); if (item) iniciarEdicao(item); }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('temaOverlay').classList.contains('aberto')) { fecharModalTema(); return; }
    if (editandoId !== null) cancelarEdicao();
  });
});