import { state, salvarEstado } from './storage.js';

export function atualizarLista() {
    const lista = document.getElementById('listaItens');
    lista.innerHTML = '';

    state.itens.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('item');
        if (!item.incluido) div.classList.add('excluido');

        div.innerHTML = `
            <div class="info-item">
                <strong>${item.nome}</strong>
                <div>R$ ${item.preco.toFixed(2)} x ${item.quantidade} un = R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
            </div>
            <div class="acoes-item">
                <i class="fas fa-check" data-id="${item.id}" style="color:${item.incluido ? 'green' : 'gray'}; font-size: 1.4em;"></i>
                <i class="fas fa-edit" data-id="${item.id}" style="font-size: 1.4em; margin-right: 8px;"></i>
                <i class="fas fa-trash" data-id="${item.id}" style="font-size: 1.4em;"></i>
            </div>
        `;
        lista.appendChild(div);
    });
}

export function calcularTotais() {
    const totalItens = state.itens.reduce((acc, i) => acc + (i.incluido ? i.quantidade : 0), 0);
    const totalCompra = state.itens.reduce((acc, i) => acc + (i.incluido ? i.preco * i.quantidade : 0), 0);
    document.getElementById('totalItens').textContent = totalItens;
    document.getElementById('totalCompra').textContent = `R$ ${totalCompra.toFixed(2)}`;
}

export function ordenarPorNome() {
    state.itens.sort((a, b) => a.nome.localeCompare(b.nome));
    atualizarLista();
    calcularTotais();
    salvarEstado();
}

export function ordenarPorData() {
    state.itens.sort((a, b) => b.id - a.id); // Mais recente primeiro
    atualizarLista();
    calcularTotais();
    salvarEstado();
}