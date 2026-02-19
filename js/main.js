import { manipularItem, toggleTodos } from './itens.js';
import { atualizarLista, calcularTotais, ordenarPorNome, ordenarPorData } from './lista.js';
import { alternarTemas, carregarTema } from './tema.js';
import { mostrarNotificacao, fecharNotificacao } from './notificacao.js';
import { state, carregarEstado, salvarEstado } from './storage.js';

let editandoId = null;

window.onload = () => {
    // Verifica se há dados na URL (compartilhamento)
    const urlParams = new URLSearchParams(window.location.search);
    const dadosUrl = urlParams.get('data');

    if (dadosUrl) {
        try {
            const jsonDecodificado = decodeURIComponent(atob(dadosUrl));
            const estadoRecebido = JSON.parse(jsonDecodificado);
            if (Array.isArray(estadoRecebido.itens) && typeof estadoRecebido.temaAtual === 'string') {
                state.itens = estadoRecebido.itens;
                state.temaAtual = estadoRecebido.temaAtual;
                salvarEstado(); // opcional: persiste no localStorage também
            }
        } catch (e) {
            console.error('Erro ao carregar dados da URL:', e);
        }
    } else {
        carregarEstado();
    }

    carregarTema();
    atualizarLista();
    calcularTotais();

    document.getElementById('btnTema').addEventListener('click', () => {
        console.log("Botão tema clicado");
        alternarTemas();
    });

    document.getElementById('btnCompartilhar').addEventListener('click', async () => {
        console.log("Botão compartilhar clicado");
        try {
            const estadoParaCompartilhar = {
                itens: state.itens,
                temaAtual: state.temaAtual
            };
            const dadosCodificados = btoa(encodeURIComponent(JSON.stringify(estadoParaCompartilhar)));
            const urlCompartilhavel = `${window.location.origin}${window.location.pathname}?data=${dadosCodificados}`;

            await navigator.clipboard.writeText(urlCompartilhavel);
            mostrarNotificacao('Link copiado!');
        } catch (err) {
            mostrarNotificacao('Falha ao copiar link.');
            console.error('Erro ao copiar:', err);
        }
    });

    document.getElementById('btnToggleTodos').addEventListener('click', () => {
        console.log("Botão toggle todos clicado");
        toggleTodos();
    });

    document.getElementById('btnOrdenarNome').addEventListener('click', () => {
        console.log("Botão ordenar nome clicado");
        ordenarPorNome();
    });

    document.getElementById('btnOrdenarData').addEventListener('click', () => {
        console.log("Botão ordenar data clicado");
        ordenarPorData();
    });

    document.getElementById('formItem').addEventListener('submit', (e) => {
        console.log("Formulário enviado");
        manipularItem(e, editandoId);
        editandoId = null;
    });

    document.getElementById('botaoCancelar').addEventListener('click', () => {
        console.log("Botão cancelar clicado");
        editandoId = null;
        document.getElementById('formItem').reset();
        document.getElementById('botaoAcao').textContent = 'Adicionar';
        document.getElementById('botaoCancelar').style.display = 'none';
    });

    document.getElementById('btnFecharNotificacao').addEventListener('click', () => {
        console.log("Botão fechar notificação clicado");
        fecharNotificacao();
    });

    document.getElementById('listaItens').addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('fa-edit')) {
            console.log("Detectado clique no ícone de editar:", target);
            const id = parseInt(target.dataset.id);
            if (!id) {
                console.error("ID inválido no ícone de editar:", target);
                return;
            }

            const item = state.itens.find(i => i.id === id);
            if (!item) {
                console.error("Item não encontrado com ID:", id);
                return;
            }

            editandoId = id;
            document.getElementById('nome').value = item.nome;
            document.getElementById('preco').value = item.preco;
            document.getElementById('quantidade').value = item.quantidade;
            document.getElementById('botaoAcao').textContent = 'Salvar';
            document.getElementById('botaoCancelar').style.display = 'inline-block';
            document.getElementById('formItem').scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log("Formulário preenchido para edição do item ID:", id);
            return;
        }

        if (target.classList.contains('fa-trash')) {
            console.log("Detectado clique no ícone de lixeira:", target);
            const id = parseInt(target.dataset.id);
            if (!id) {
                console.error("ID inválido no ícone de lixeira:", target);
                return;
            }

            const item = state.itens.find(i => i.id === id);
            if (!item) {
                console.error("Item não encontrado com ID:", id);
                return;
            }

            const index = state.itens.indexOf(item);
            if (index > -1) {
                state.itens.splice(index, 1);
                atualizarLista();
                calcularTotais();
                salvarEstado();
            }
        }

        if (target.classList.contains('fa-check')) {
            console.log("Detectado clique no ícone de check:", target);
            const id = parseInt(target.dataset.id);
            if (!id) {
                console.error("ID inválido no ícone de check:", target);
                return;
            }

            const item = state.itens.find(i => i.id === id);
            if (!item) {
                console.error("Item não encontrado com ID:", id);
                return;
            }

            item.incluido = !item.incluido;
            atualizarLista();
            calcularTotais();
            salvarEstado();
        }
    });
};