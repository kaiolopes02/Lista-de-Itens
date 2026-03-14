/* ============================================================
   TEMA — Paletas, modal de seleção e persistência
   ============================================================ */
import { state, salvarEstado } from './storage.js';
import { icone } from './icones.js';

/** Definição de todos os temas disponíveis */
export const TEMAS = [
  { id: 'azul',     nome: 'Azul',     cor: '#2196f3' },
  { id: 'verde',    nome: 'Verde',    cor: '#43a047' },
  { id: 'violeta',  nome: 'Violeta',  cor: '#8e24aa' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#e53935' },
  { id: 'laranja',  nome: 'Laranja',  cor: '#fb8c00' },
  { id: 'amarelo',  nome: 'Amarelo',  cor: '#f9a825' },
  { id: 'anil',     nome: 'Anil',     cor: '#3f51b5' },
  { id: 'rosa',     nome: 'Rosa',     cor: '#e91e8c' },
  { id: 'escuro',   nome: 'Escuro',   cor: '#37474f' },
];

/**
 * Aplica um tema ao <html> e persiste no estado.
 * @param {string} temaId
 */
export function aplicarTema(temaId) {
  state.temaAtual = temaId;
  document.documentElement.setAttribute('data-tema', temaId);
  salvarEstado();
}

/** Aplica o tema salvo no estado (usado na inicialização) */
export function carregarTema() {
  aplicarTema(state.temaAtual || 'azul');
}

/** Renderiza os botões de tema dentro do modal */
export function renderTemaGrade() {
  const grade = document.getElementById('temaGrade');
  if (!grade) return;
  grade.innerHTML = '';

  TEMAS.forEach(t => {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'tema-opcao' + (state.temaAtual === t.id ? ' selecionado' : '');
    btn.innerHTML = `
      <div class="tema-bolinha" style="background:${t.cor}"></div>
      ${t.nome}
    `;
    btn.addEventListener('click', () => {
      aplicarTema(t.id);
      renderTemaGrade();          // atualiza selecionado visualmente
      setTimeout(fecharModalTema, 250);
    });
    grade.appendChild(btn);
  });
}

/** Abre o modal de seleção de tema */
export function abrirModalTema() {
  renderTemaGrade();
  document.getElementById('temaOverlay')?.classList.add('aberto');
}

/** Fecha o modal de seleção de tema */
export function fecharModalTema() {
  document.getElementById('temaOverlay')?.classList.remove('aberto');
}
