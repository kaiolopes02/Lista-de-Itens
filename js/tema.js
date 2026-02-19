import { state, salvarEstado } from './storage.js';

const temas = ["claro","escuro","vermelho","laranja","amarelo","verde","azul","anil","violeta"];
let indice = 0;

export function alternarTemas() {
    indice = (indice + 1) % temas.length;
    state.temaAtual = temas[indice];
    document.body.setAttribute('data-tema', state.temaAtual);
    salvarEstado();
}

export function carregarTema() {
    const t = state.temaAtual || 'azul';
    document.body.setAttribute('data-tema', t);
    indice = temas.indexOf(t);
}