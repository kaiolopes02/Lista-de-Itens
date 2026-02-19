export const state = {
    itens: [],
    temaAtual: 'azul'
};

export function salvarEstado() {
    localStorage.setItem('listaCompras', JSON.stringify(state));
}

export function carregarEstado() {
    const data = localStorage.getItem('listaCompras');
    if (data) {
        const obj = JSON.parse(data);
        state.itens = obj.itens || [];
        state.temaAtual = obj.temaAtual || 'azul';
    }
}