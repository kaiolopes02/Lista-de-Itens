/* ============================================================
   HISTÓRICO — Modal de compras anteriores
   ============================================================ */
import { carregarHistorico, removerEntradaHistorico } from './storage.js';
import { icone } from './icones.js';

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function abrirHistorico() {
  renderizarHistorico();
  document.getElementById('histOverlay').classList.add('aberto');
}

export function fecharHistorico() {
  document.getElementById('histOverlay').classList.remove('aberto');
}

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

    const card = document.createElement('div');
    card.className = 'hist-entrada';
    card.innerHTML = `
      <div class="hist-entrada-header">
        <div class="hist-entrada-data">
          ${icone('relogio')}
          <span>${formatarData(entrada.data)}</span>
        </div>
        <button class="btn-acao excluir hist-btn-excluir"
                data-hist-id="${entrada.id}"
                title="Remover do histórico"
                type="button">
          ${icone('lixeira')}
        </button>
      </div>
      <div class="hist-itens">${linhasItens}</div>
      <div class="hist-entrada-totais">
        <span>${icone('cesto')} ${totalItens} iten${totalItens !== 1 ? 's' : ''} marcados</span>
        <strong>${fmt(totalValor)}</strong>
      </div>`;

    card.querySelector('.hist-btn-excluir').addEventListener('click', () => {
      removerEntradaHistorico(entrada.id);
      renderizarHistorico();
    });

    conteudo.appendChild(card);
  });
}
