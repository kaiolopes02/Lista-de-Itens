/* ============================================================
   MAIN — Inicialização e wiring de eventos
   ============================================================ */
import { state, carregarEstado, prepararEstadoExterno,
         substituirEstado, finalizarCompra }        from './storage.js';
import { atualizarLista, calcularTotais,
         ordenarPorNome, ordenarPorData }           from './lista.js';
import { manipularItem, entrarModoEdicao,
         sairModoEdicao, toggleItem,
         excluirItem, toggleTodos,
         limparTodos, atualizarLabelsUnidade }      from './itens.js';
import { aplicarTema, carregarTema,
         abrirModalTema, fecharModalTema }          from './tema.js';
import { mostrarNotificacao,
         fecharNotificacao }                        from './notificacao.js';
import { icone }                                    from './icones.js';
import { inicializarFirebase, criarSala,
         entrarSala, publicarEstado,
         getSalaId, firebaseConfigurado }           from './sync.js';
import { abrirHistorico, fecharHistorico }          from './historico.js';
import { codificarSnapshot, decodificarSnapshot }   from './validacao.js';

/* ── Estado de edição ─────────────────────────────────────── */
let editandoId = null;
let avisoFalhaSync = false;

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
  set('logoIcone',            'carrinho');
  set('btnTema',              'paleta');
  set('btnHistorico',         'relogio');
  set('btnCompartilhar',      'compartilhar');
  set('btnOrdenarNome',       'ordenarNome');
  set('btnOrdenarData',       'ordenarNum');
  set('btnToggleTodos',       'marcarTodos');
  set('btnLimparTodos',       'lixeira');
  set('btnFinalizarCompra',   'arquivo');
  set('iconeCesto',           'cesto');
  set('iconeEtiqueta',        'etiqueta');
  set('iconeRecibo',          'recibo');
  set('iconeNome',            'etiqueta');
  set('iconeUnidade',         'etiqueta');
  set('iconePreco',           'moedas');
  set('iconeQtd',             'hashtag');
  set('editBadgeIcone',       'editar');
  set('btnFecharNotificacao', 'fechar');
  set('btnFecharHistorico',   'fechar');
  const temaTitulo = document.getElementById('temaTitulo');
  if (temaTitulo) temaTitulo.innerHTML = icone('paleta') + ' Escolha um tema';
  const histTitulo = document.getElementById('histTitulo');
  if (histTitulo) histTitulo.innerHTML = icone('relogio') + ' Histórico de Compras';
  atualizarBotaoForm(false);
}

/* ── Sincronização Firebase ───────────────────────────────── */
function aoReceberAtualizacaoRemota(dados) {
  const normalizado = prepararEstadoExterno(dados, { itensOpcionais: true });
  if (!normalizado) return;
  substituirEstado(normalizado);
  aplicarTema(state.temaAtual);
  atualizarLista();
  calcularTotais();
}

export function sincronizarSeNecessario() {
  if (!getSalaId()) return;
  publicarEstado(state).then(ok => {
    if (ok || avisoFalhaSync) return;
    avisoFalhaSync = true;
    mostrarNotificacao('Sem conexão com a sala: a alteração ficou só neste dispositivo.', 'erro');
  });
}

function mostrarIndicadorSala(salaId) {
  let badge = document.getElementById('salaIndicador');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'salaIndicador';
    badge.className = 'sala-indicador';

    const ponto = document.createElement('span');
    ponto.className = 'sala-ponto';
    ponto.setAttribute('aria-hidden', 'true');

    const rotulo = document.createElement('span');
    rotulo.append(document.createTextNode('Sala: '));
    const forte = document.createElement('strong');
    rotulo.appendChild(forte);

    badge.append(ponto, rotulo);
    document.body.appendChild(badge);
  }
  badge.querySelector('strong').textContent = salaId;
  badge.setAttribute('aria-label', `Conectado à sala ${salaId}`);
}

/* ── Compartilhamento ─────────────────────────────────────── */
function gerarTextoLista() {
  if (!state.itens.length) return null;
  const fmt       = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const incluidos = state.itens.filter(i => i.incluido);
  const linhas    = ['🛒 LISTA DE COMPRAS', ''];
  state.itens.forEach((item, idx) => {
    const subtotal = item.preco * item.quantidade;
    linhas.push(`${item.incluido ? '✅' : '⬜'} ${idx + 1}. ${item.nome}`);
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
  if (!texto) { mostrarNotificacao('Adicione itens antes de compartilhar.', 'erro'); return; }

  let link;
  if (firebaseConfigurado()) {
    let salaId = getSalaId();
    if (!salaId) {
      mostrarNotificacao('Criando sala compartilhada...', 'info');
      salaId = await criarSala(state, aoReceberAtualizacaoRemota);
      if (!salaId) {
        mostrarNotificacao('Não foi possível criar a sala. Tente novamente.', 'erro');
        return;
      }
      mostrarIndicadorSala(salaId);
    }
    link = `${location.origin}${location.pathname}#sala=${salaId}`;
  } else {
    const payload = codificarSnapshot({ itens: state.itens, temaAtual: state.temaAtual });
    link = `${location.origin}${location.pathname}#data=${payload}`;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lista de Compras', text: texto + '\n\n🔗 Acesse e edite a lista:', url: link });
      return;
    } catch (err) {
      if (err.name === 'AbortError') { mostrarNotificacao('Compartilhamento cancelado.', 'info'); return; }
    }
  }
  try {
    await navigator.clipboard.writeText(`${texto}\n\n🔗 Acesse e edite a lista:\n${link}`);
    mostrarNotificacao('Lista e link copiados!', 'info');
  } catch { mostrarNotificacao('Não foi possível compartilhar.', 'erro'); }
}

/* ── Finalizar compra ─────────────────────────────────────── */
function handleFinalizarCompra() {
  if (!state.itens.length) {
    mostrarNotificacao('A lista está vazia.', 'erro');
    return;
  }
  if (!confirm('Finalizar compra? A lista será salva no histórico e apagada.')) return;

  const ok = finalizarCompra();
  if (ok) {
    cancelarEdicao();
    sincronizarSeNecessario();
    atualizarLista();
    calcularTotais();
    mostrarNotificacao('Compra finalizada e salva no histórico!', 'sucesso');
  }
}

/* ── Carrega dados da URL (fragmento novo, query legada) ──── */
function confirmarSubstituicao(mensagem) {
  const dialog = document.getElementById('confirmDialog');
  document.getElementById('confirmTexto').textContent = mensagem;

  return new Promise(resolve => {
    const aceitar = document.getElementById('confirmAceitar');
    const cancelar = document.getElementById('confirmCancelar');

    const limpar = () => {
      aceitar.removeEventListener('click', aoAceitar);
      cancelar.removeEventListener('click', aoCancelar);
      dialog.removeEventListener('cancel', aoCancelar);
      dialog.removeEventListener('click', aoClicarFora);
    };
    const aoAceitar = () => { limpar(); dialog.close(); resolve(true); };
    const aoCancelar = () => { limpar(); dialog.close(); resolve(false); };
    const aoClicarFora = (e) => { if (e.target === dialog) aoCancelar(); };

    aceitar.addEventListener('click', aoAceitar);
    cancelar.addEventListener('click', aoCancelar);
    dialog.addEventListener('cancel', aoCancelar);
    dialog.addEventListener('click', aoClicarFora);
    dialog.showModal();
  });
}

function parametrosUrl() {
  const hash  = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const pegar = (chave) => hash.get(chave) || query.get(chave);
  return { sala: pegar('sala'), data: pegar('data') };
}

async function carregarDadosUrl() {
  const { sala, data } = parametrosUrl();

  if (sala && firebaseConfigurado()) {
    mostrarNotificacao('Conectando à lista compartilhada...', 'info');
    let recusado = false;
    const ok = await entrarSala(sala, aoReceberAtualizacaoRemota, async () => {
      if (!state.itens.length) return true;
      recusado = !(await confirmarSubstituicao(
        'Sua lista atual será guardada em backup e substituída pela lista compartilhada.',
      ));
      return !recusado;
    });
    if (ok) {
      mostrarNotificacao('Conectado à lista compartilhada!', 'sucesso');
      mostrarIndicadorSala(sala);
      return true;
    }
    if (recusado) {
      mostrarNotificacao('Entrada cancelada. Sua lista local foi mantida.', 'info');
      return false;
    }
    mostrarNotificacao('Sala não encontrada ou indisponível. Sua lista local foi mantida.', 'erro');
  }

  if (data) {
    const obj = decodificarSnapshot(data);
    const normalizado = obj ? prepararEstadoExterno(obj) : null;
    if (!normalizado) {
      mostrarNotificacao('Link inválido: a lista não foi alterada.', 'erro');
      return false;
    }
    if (state.itens.length &&
        !(await confirmarSubstituicao(
          'Sua lista atual será guardada em backup e substituída pela lista do link.',
        ))) {
      mostrarNotificacao('Importação cancelada. Sua lista foi mantida.', 'info');
      return false;
    }
    substituirEstado(normalizado);
    aplicarTema(state.temaAtual);
    atualizarLista();
    calcularTotais();
    mostrarNotificacao('Lista carregada do link!', 'sucesso');
    return true;
  }

  return false;
}

/* ── Registro de eventos ──────────────────────────────────── */
function registrarEventos() {
  /* Cabeçalho */
  document.getElementById('btnTema').addEventListener('click', abrirModalTema);
  document.getElementById('btnHistorico').addEventListener('click', abrirHistorico);
  document.getElementById('btnCompartilhar').addEventListener('click', compartilhar);
  document.getElementById('btnOrdenarNome').addEventListener('click', () => {
    ordenarPorNome(); sincronizarSeNecessario(); mostrarNotificacao('Ordenado por nome.', 'info');
  });
  document.getElementById('btnOrdenarData').addEventListener('click', () => {
    ordenarPorData(); sincronizarSeNecessario(); mostrarNotificacao('Ordenado por data (recente).', 'info');
  });
  document.getElementById('btnToggleTodos').addEventListener('click', () => {
    toggleTodos(); sincronizarSeNecessario();
  });

  /* Lista */
  document.getElementById('btnFinalizarCompra').addEventListener('click', handleFinalizarCompra);
  document.getElementById('btnLimparTodos').addEventListener('click', () => {
    limparTodos(); cancelarEdicao(); sincronizarSeNecessario();
  });

  /* Formulário */
  document.getElementById('formItem').addEventListener('submit', e => {
    const sucesso = manipularItem(e, editandoId);
    if (sucesso) { cancelarEdicao(); sincronizarSeNecessario(); }
  });
  document.getElementById('botaoCancelar').addEventListener('click', cancelarEdicao);
  document.getElementById('unidade').addEventListener('change', atualizarLabelsUnidade);

  /* Notificação */
  document.getElementById('btnFecharNotificacao').addEventListener('click', fecharNotificacao);

  /* Modais nativos */
  const temaDialog = document.getElementById('temaDialog');
  temaDialog.addEventListener('click', e => { if (e.target === temaDialog) fecharModalTema(); });

  const histDialog = document.getElementById('histDialog');
  document.getElementById('btnFecharHistorico').addEventListener('click', fecharHistorico);
  histDialog.addEventListener('click', e => { if (e.target === histDialog) fecharHistorico(); });

  /* Itens da lista */
  document.getElementById('listaItens').addEventListener('click', e => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const id   = Number(btn.dataset.id);
    const acao = btn.dataset.acao;
    if (!Number.isSafeInteger(id) || id <= 0 || !acao) return;
    if (acao === 'toggle')  { toggleItem(id); sincronizarSeNecessario(); return; }
    if (acao === 'excluir') { if (editandoId === id) cancelarEdicao(); excluirItem(id, sincronizarSeNecessario); return; }
    if (acao === 'editar')  { const item = state.itens.find(i => i.id === id); if (item) iniciarEdicao(item); }
  });

  /* Escape: diálogos tratam o próprio fechamento */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || editandoId === null) return;
    if (document.querySelector('dialog[open]')) return;
    cancelarEdicao();
  });

  /* Sincronização entre abas */
  window.addEventListener('storage', e => {
    if (e.key !== 'listaCompras_v2' && e.key !== 'listaCompras') return;
    carregarEstado();
    aplicarTema(state.temaAtual);
    atualizarLista();
    calcularTotais();
  });
}

/* ── Inicialização ────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  injetarIcones();
  if (firebaseConfigurado()) inicializarFirebase();

  // O estado local é sempre carregado antes de qualquer link.
  carregarEstado();
  carregarTema();
  atualizarLista();
  calcularTotais();
  registrarEventos();

  await carregarDadosUrl();
});
