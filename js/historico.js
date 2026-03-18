/* ============================================================
   HISTÓRICO — Modal de compras anteriores
   ============================================================ */
import { carregarHistorico, removerEntradaHistorico } from './storage.js';
import { icone }                                       from './icones.js';

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Abre o modal e renderiza o histórico */
export function abrirHistorico() {
  renderizarHistorico();
  document.getElementById('histOverlay').classList.add('aberto');
}

/** Fecha o modal */
export function fecharHistorico() {
  document.getElementById('histOverlay').classList.remove('aberto');
}

/** Renderiza as entradas do histórico no modal */
function renderizarHistorico() {
  const conteudo  = document.getElementById('histConteudo');
  const historico = carregarHistorico();

  if (!historico.length) {
    conteudo.innerHTML = `
      <div class="hist-vazio">
        ${icone('relogio')}
        <strong>Nenhuma compra finalizada ainda</strong>
        <p>Quando você finalizar uma compra, ela aparecerá aqui por até 5 registros.</p>
      </div>`;
    return;
  }

  conteudo.innerHTML = '';

  historico.forEach((entrada) => {
    const incluidos  = entrada.itens.filter(i => i.incluido !== false);
    const totalItens = incluidos.reduce((a, i) => a + i.quantidade, 0);
    const totalValor = incluidos.reduce((a, i) => a + i.preco * i.quantidade, 0);

    const card = document.createElement('div');
    card.className = 'hist-entrada';

    const linhasItens = entrada.itens.map(item => {
      const marcado  = item.incluido !== false;
      const subtotal = item.preco * item.quantidade;
      return `
        <div class="hist-item ${marcado ? '' : 'hist-item-desmarcado'}">
          <span class="hist-item-check">${marcado ? icone('check') : ''}</span>
          <span class="hist-item-nome">${escHtml(item.nome)}</span>
          <span class="hist-item-detalhe">${item.quantidade} un × ${fmt(item.preco)}</span>
          <span class="hist-item-subtotal">${fmt(subtotal)}</span>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="hist-entrada-header">
        <div class="hist-entrada-data">
          <span class="hist-icone-data">${icone('relogio')}</span>
          ${formatarData(entrada.data)}
        </div>
        <button class="btn-acao excluir hist-btn-excluir"
                data-hist-id="${entrada.id}"
                title="Remover do histórico">
          ${icone('lixeira')}
        </button>
      </div>

      <div class="hist-itens">${linhasItens}</div>

      <div class="hist-entrada-totais">
        <span>${icone('cesto')} ${totalItens} iten${totalItens !== 1 ? 's' : ''}</span>
        <strong>${fmt(totalValor)}</strong>
      </div>`;

    conteudo.appendChild(card);
  });

  // Evento de excluir entrada
  conteudo.querySelectorAll('.hist-btn-excluir').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.histId);
      removerEntradaHistorico(id);
      renderizarHistorico();
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
