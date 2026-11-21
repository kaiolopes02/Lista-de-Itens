/* ============================================================
   TEMA — Paletas, modal de seleção e persistência
   ============================================================ */
import { state, salvarEstado } from './storage.js';
import { TEMAS_VALIDOS, TEMA_PADRAO } from './validacao.js';
import { icone } from './icones.js';

/** Definição de todos os temas disponíveis */
export const TEMAS = [
  { id: 'azul',     nome: 'Azul',     cor: '#1565c0' },
  { id: 'verde',    nome: 'Verde',    cor: '#2e7d32' },
  { id: 'violeta',  nome: 'Violeta',  cor: '#6a1b9a' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#c62828' },
  { id: 'laranja',  nome: 'Laranja',  cor: '#b45309' },
  { id: 'amarelo',  nome: 'Amarelo',  cor: '#7a5c00' },
  { id: 'anil',     nome: 'Anil',     cor: '#303f9f' },
  { id: 'rosa',     nome: 'Rosa',     cor: '#ad1457' },
  { id: 'escuro',   nome: 'Escuro',   cor: '#64b5f6' },
];

/**
 * Aplica um tema ao <html> e persiste no estado.
 * @param {string} temaId
 */
export function aplicarTema(temaId) {
  const id = TEMAS_VALIDOS.includes(temaId) ? temaId : TEMA_PADRAO;
  state.temaAtual = id;
  document.documentElement.setAttribute('data-tema', id);
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
      fecharModalTema();
    });
    grade.appendChild(btn);
  });
}

/** Abre o modal de seleção de tema */
export function abrirModalTema() {
  renderTemaGrade();
  const dialog = document.getElementById('temaDialog');
  if (dialog && !dialog.open) dialog.showModal();
}

/** Fecha o modal de seleção de tema */
export function fecharModalTema() {
  document.getElementById('temaDialog')?.close();
}
