/* ============================================================
   HISTÓRICO — Modal de compras anteriores
   ============================================================ */
import { carregarHistorico, removerEntradaHistorico } from './storage.js';
import { icone } from './icones.js';

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function abrirHistorico() {
  renderizarHistorico();
  const dialog = document.getElementById('histDialog');
  if (dialog && !dialog.open) dialog.showModal();
}

export function fecharHistorico() {
  document.getElementById('histDialog')?.close();
}

function renderizarHistorico() {
  const conteudo  = document.getElementById('histConteudo');
  const historico = carregarHistorico();
  conteudo.textContent = '';

  if (!historico.length) {
    conteudo.innerHTML = `
      <div class="hist-vazio">
        ${icone('relogio')}
        <strong>Nenhuma compra finalizada ainda</strong>
        <p>Quando você finalizar uma compra, ela aparecerá aqui por até 5 registros.</p>
      </div>`;
    return;
  }

  historico.forEach((entrada) => {
    const incluidos    = entrada.itens.filter(i => i.incluido);
    const totalUn      = incluidos.filter(i => i.unidade === 'un').reduce((a, i) => a + i.quantidade, 0);
    const totalKg      = incluidos.filter(i => i.unidade === 'kg').reduce((a, i) => a + i.quantidade, 0);
    const partesItens  = [];
    if (totalUn > 0) partesItens.push(totalUn + ' un');
    if (totalKg > 0) partesItens.push(totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' kg');
    const totalItensTexto = partesItens.length ? partesItens.join(' + ') : '0';
    const totalValor      = incluidos.reduce((a, i) => a + i.preco * i.quantidade, 0);

    const card = elemento('div', 'hist-entrada');

    const header = elemento('div', 'hist-entrada-header');
    const dataDiv = elemento('div', 'hist-entrada-data');
    dataDiv.innerHTML = icone('relogio');
    dataDiv.appendChild(elemento('span', null, formatarData(entrada.data)));

    const btnExcluir = elemento('button', 'btn-acao excluir hist-btn-excluir');
    btnExcluir.type = 'button';
    btnExcluir.title = 'Remover do histórico';
    btnExcluir.setAttribute('aria-label', `Remover compra de ${formatarData(entrada.data)} do histórico`);
    btnExcluir.innerHTML = icone('lixeira');
    btnExcluir.addEventListener('click', () => {
      removerEntradaHistorico(entrada.id);
      renderizarHistorico();
    });
    header.append(dataDiv, btnExcluir);

    const itensDiv = elemento('div', 'hist-itens');
    entrada.itens.forEach(item => {
      const marcado = item.incluido;
      const linha = elemento('div', `hist-item ${marcado ? '' : 'hist-item-desmarcado'}`);
      linha.setAttribute('role', 'listitem');

      const check = elemento('span', 'hist-item-check');
      check.innerHTML = marcado ? icone('check') : '';
      const rotulo = elemento('span', 'sr-only', marcado ? 'Incluído: ' : 'Não incluído: ');
      const nome = elemento('span', 'hist-item-nome', item.nome);
      const detalhe = elemento('span', 'hist-item-detalhe', `${item.quantidade} ${item.unidade} × ${fmt(item.preco)}`);
      const subtotal = elemento('span', 'hist-item-subtotal', fmt(item.preco * item.quantidade));

      linha.append(check, rotulo, nome, detalhe, subtotal);
      itensDiv.appendChild(linha);
    });

    const totais = elemento('div', 'hist-entrada-totais');
    const resumo = elemento('span');
    resumo.innerHTML = icone('cesto');
    resumo.appendChild(document.createTextNode(
      ` ${totalItensTexto} marcado${partesItens.length === 1 && (totalUn === 1 || totalKg === 1) ? '' : 's'}`,
    ));
    totais.append(resumo, elemento('strong', null, fmt(totalValor)));

    card.append(header, itensDiv, totais);
    conteudo.appendChild(card);
  });
}
