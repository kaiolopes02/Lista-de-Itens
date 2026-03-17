/* ============================================================
   MAIN — Inicialização e wiring de eventos
   ============================================================ */
import { state, carregarEstado, salvarEstado,
         aplicarEstadoExterno }              from './storage.js';
import { atualizarLista, calcularTotais,
         ordenarPorNome, ordenarPorData }    from './lista.js';
import { manipularItem, entrarModoEdicao,
         sairModoEdicao, toggleItem,
         excluirItem, toggleTodos,
         limparTodos }                       from './itens.js';
import { aplicarTema, carregarTema,
         abrirModalTema, fecharModalTema }   from './tema.js';
import { mostrarNotificacao,
         fecharNotificacao }                 from './notificacao.js';
import { icone }                             from './icones.js';
import { inicializarFirebase, criarSala,
         entrarSala, publicarEstado,
         getSalaId, firebaseConfigurado }    from './sync.js';

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
  const btn  = document.getElementById('botaoAcao');
  const btnC = document.getElementById('botaoCancelar');
  if (btn)  btn.innerHTML  = modoEdicao ? icone('salvar') + ' Salvar' : icone('mais') + ' Adicionar';
  if (btnC) btnC.innerHTML = icone('fechar') + ' Cancelar';
}

/* ── Injeta todos os ícones SVG no DOM ────────────────────── */
function injetarIcones() {
  const set = (id, nome) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icone(nome);
  };
  set('logoIcone',           'carrinho');
  set('btnTema',             'paleta');
  set('btnCompartilhar',     'compartilhar');
  set('btnOrdenarNome',      'ordenarNome');
  set('btnOrdenarData',      'ordenarNum');
  set('btnToggleTodos',      'marcarTodos');
  set('btnLimparTodos',      'lixeira');
  set('iconeCesto',          'cesto');
  set('iconeEtiqueta',       'etiqueta');
  set('iconeRecibo',         'recibo');
  set('iconeNome',           'etiqueta');
  set('iconePreco',          'moedas');
  set('iconeQtd',            'hashtag');
  set('editBadgeIcone',      'editar');
  set('btnFecharNotificacao','fechar');
  const temaTitulo = document.getElementById('temaTitulo');
  if (temaTitulo) temaTitulo.innerHTML = icone('paleta') + ' Escolha um tema';
  atualizarBotaoForm(false);
}

/* ── Sincronização Firebase ───────────────────────────────── */

/**
 * Chamado sempre que o Firebase recebe uma atualização remota.
 * Aplica os dados no state e re-renderiza sem publicar de volta.
 */
function aoReceberAtualizacaoRemota(dados) {
  aplicarEstadoExterno(dados);
  aplicarTema(state.temaAtual);
  atualizarLista();
  calcularTotais();
}

/**
 * Chama publicarEstado após qualquer alteração local,
 * mas só se houver uma sala ativa.
 */
export function sincronizarSeNecessario() {
  if (getSalaId()) {
    publicarEstado(state);
  }
}

/* ── Indicador visual de sala ativa ──────────────────────── */
function mostrarIndicadorSala(salaId) {
  let badge = document.getElementById('salaIndicador');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'salaIndicador';
    badge.style.cssText = `
      position: fixed; bottom: 16px; right: 16px;
      background: var(--cor-primaria); color: #fff;
      padding: 8px 14px; border-radius: 999px;
      font-size: 0.78rem; font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 100; display: flex; align-items: center; gap: 6px;
      font-family: var(--fonte);
    `;
    document.body.appendChild(badge);
  }
  badge.innerHTML = `
    <span style="width:8px;height:8px;background:#4eff91;border-radius:50%;
      display:inline-block;box-shadow:0 0 6px #4eff91;animation:piscar 1.5s infinite"></span>
    Sala: <strong>${salaId}</strong>
  `;
  // Adiciona animação de piscar se ainda não existir
  if (!document.getElementById('estiloPiscar')) {
    const s = document.createElement('style');
    s.id = 'estiloPiscar';
    s.textContent = `@keyframes piscar{0%,100%{opacity:1}50%{opacity:.4}}`;
    document.head.appendChild(s);
  }
}

/* ── Compartilhamento ─────────────────────────────────────── */
function gerarTextoLista() {
  if (!state.itens.length) return null;

  const fmt       = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const incluidos = state.itens.filter(i => i.incluido !== false);
  const linhas    = ['🛒 LISTA DE COMPRAS', ''];

  state.itens.forEach((item, idx) => {
    const marcado  = item.incluido !== false;
    const subtotal = item.preco * item.quantidade;
    linhas.push(`${marcado ? '✅' : '⬜'} ${idx + 1}. ${item.nome}`);
    linhas.push(`   Qtd: ${item.quantidade}  |  Unit.: ${fmt(item.preco)}  |  Subtotal: ${fmt(subtotal)}`);
  });

  const totalItens = incluidos.reduce((a, i) => a + i.quantidade, 0);
  const totalValor = incluidos.reduce((a, i) => a + i.preco * i.quantidade, 0);

  linhas.push('');
  linhas.push('─'.repeat(36));
  linhas.push(`📦 Total de itens (marcados): ${totalItens}`);
  linhas.push(`💰 Valor total da compra:     ${fmt(totalValor)}`);

  return linhas.join('\n');
}

async function compartilhar() {
  const texto = gerarTextoLista();
  if (!texto) {
    mostrarNotificacao('Adicione itens antes de compartilhar.', 'erro');
    return;
  }

  let link;

  // Se Firebase está configurado, cria/reutiliza sala para sync em tempo real
  if (firebaseConfigurado()) {
    let salaId = getSalaId();

    if (!salaId) {
      mostrarNotificacao('Criando sala compartilhada...', 'info');
      salaId = await criarSala(state, aoReceberAtualizacaoRemota);
      if (!salaId) {
        mostrarNotificacao('Erro ao criar sala. Verifique as credenciais do Firebase.', 'erro');
        return;
      }
      mostrarIndicadorSala(salaId);
    }

    link = `${location.origin}${location.pathname}?sala=${salaId}`;
  } else {
    // Fallback: link estático com dados na URL (sem sync)
    const payload = btoa(encodeURIComponent(JSON.stringify({
      itens: state.itens, temaAtual: state.temaAtual,
    })));
    link = `${location.origin}${location.pathname}?data=${payload}`;
  }

  // Web Share API — abre menu nativo
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Lista de Compras',
        text:  texto + '\n\n🔗 Acesse e edite a lista:',
        url:   link,
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: copia para área de transferência
  try {
    await navigator.clipboard.writeText(`${texto}\n\n🔗 Acesse e edite a lista:\n${link}`);
    mostrarNotificacao('Lista e link copiados!', 'info');
  } catch {
    mostrarNotificacao('Não foi possível compartilhar.', 'erro');
  }
}

/* ── Carrega dados da URL ─────────────────────────────────── */
async function carregarDadosUrl() {
  const params = new URLSearchParams(location.search);

  // Modo sala (sync em tempo real)
  const salaId = params.get('sala');
  if (salaId && firebaseConfigurado()) {
    const ok = await entrarSala(salaId, aoReceberAtualizacaoRemota);
    if (ok) {
      mostrarNotificacao('Conectado à lista compartilhada!', 'sucesso');
      mostrarIndicadorSala(salaId);
      return true;
    }
  }

  // Modo estático (link com dados na URL — fallback)
  const dadosUrl = params.get('data');
  if (dadosUrl) {
    try {
      const obj = JSON.parse(decodeURIComponent(atob(dadosUrl)));
      if (Array.isArray(obj.itens)) {
        state.itens     = obj.itens;
        state.temaAtual = typeof obj.temaAtual === 'string' ? obj.temaAtual : 'azul';
        salvarEstado();
        mostrarNotificacao('Lista carregada do link!', 'sucesso');
        return true;
      }
    } catch(e) { console.warn(e); }
  }

  return false;
}

/* ── Inicialização ────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  injetarIcones();

  // Inicia Firebase (não bloqueia se não estiver configurado)
  if (firebaseConfigurado()) inicializarFirebase();

  // Carrega dados
  const carregouUrl = await carregarDadosUrl();
  if (!carregouUrl) carregarEstado();

  carregarTema();
  atualizarLista();
  calcularTotais();

  /* ── Eventos ──────────────────────────────────────────── */
  document.getElementById('btnTema').addEventListener('click', abrirModalTema);
  document.getElementById('btnCompartilhar').addEventListener('click', compartilhar);

  document.getElementById('btnOrdenarNome').addEventListener('click', () => {
    ordenarPorNome();
    sincronizarSeNecessario();
    mostrarNotificacao('Ordenado por nome.', 'info');
  });
  document.getElementById('btnOrdenarData').addEventListener('click', () => {
    ordenarPorData();
    sincronizarSeNecessario();
    mostrarNotificacao('Ordenado por data (recente).', 'info');
  });

  document.getElementById('btnToggleTodos').addEventListener('click', () => {
    toggleTodos();
    sincronizarSeNecessario();
  });
  document.getElementById('btnLimparTodos').addEventListener('click', () => {
    limparTodos();
    cancelarEdicao();
    sincronizarSeNecessario();
  });

  document.getElementById('formItem').addEventListener('submit', e => {
    const sucesso = manipularItem(e, editandoId);
    if (sucesso) {
      cancelarEdicao();
      sincronizarSeNecessario();
    }
  });
  document.getElementById('botaoCancelar').addEventListener('click', cancelarEdicao);
  document.getElementById('btnFecharNotificacao').addEventListener('click', fecharNotificacao);

  document.getElementById('temaOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModalTema();
  });

  document.getElementById('listaItens').addEventListener('click', e => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const id   = parseInt(btn.dataset.id);
    const acao = btn.dataset.acao;
    if (!id || !acao) return;

    if (acao === 'toggle') {
      toggleItem(id);
      sincronizarSeNecessario();
      return;
    }
    if (acao === 'excluir') {
      if (editandoId === id) cancelarEdicao();
      // sincronizar só APÓS a animação terminar e o item sair do state
      excluirItem(id, sincronizarSeNecessario);
      return;
    }
    if (acao === 'editar') {
      const item = state.itens.find(i => i.id === id);
      if (item) iniciarEdicao(item);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('temaOverlay').classList.contains('aberto')) {
      fecharModalTema(); return;
    }
    if (editandoId !== null) cancelarEdicao();
  });
});
