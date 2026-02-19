import { atualizarLista, calcularTotais } from './lista.js';
import { mostrarNotificacao } from './notificacao.js';
import { state, salvarEstado } from './storage.js';

// Recebe editandoId como parâmetro
export function manipularItem(e, editandoId) {
    e.preventDefault();
    console.log("Manipulando item...");
    const nome = document.getElementById('nome').value.trim();
    const precoStr = document.getElementById('preco').value;
    const qtdStr = document.getElementById('quantidade').value;

    if (!nome || precoStr === '' || qtdStr === '') {
        mostrarNotificacao("Preencha todos os campos!");
        return;
    }

    const preco = parseFloat(precoStr);
    const qtd = parseInt(qtdStr);

    if (isNaN(preco) || isNaN(qtd) || preco < 0 || qtd < 1) {
        mostrarNotificacao("Valores inválidos!");
        return;
    }

    // Verifica duplicidade, ignorando o item sendo editado
    const existe = state.itens.find(i =>
        i.nome.toLowerCase() === nome.toLowerCase() &&
        (editandoId === null || i.id !== editandoId)
    );
    if (existe) {
        mostrarNotificacao("Item já existe!");
        return;
    }

    if (editandoId) {
        const item = state.itens.find(i => i.id === editandoId);
        if (item) {
            item.nome = nome;
            item.preco = preco;
            item.quantidade = qtd;
        }
    } else {
        state.itens.push({ id: Date.now(), nome, preco, quantidade: qtd, incluido: true });
    }

    document.getElementById('formItem').reset();
    document.getElementById('botaoAcao').textContent = "Adicionar";
    document.getElementById('botaoCancelar').style.display = "none";

    atualizarLista();
    calcularTotais();
    salvarEstado();
}

export function toggleTodos() {
    const sel = !state.itens.every(i => i.incluido);
    state.itens.forEach(i => i.incluido = sel);
    atualizarLista();
    calcularTotais();
    salvarEstado();
}