export function mostrarNotificacao(msg) {
    const area = document.getElementById('notificacao');
    const texto = document.getElementById('notificacaoTexto');
    if (!area || !texto) return;

    texto.textContent = msg;

    area.classList.add('mostrar');

    clearTimeout(area._timeout);

    area._timeout = setTimeout(() => {
        area.classList.remove('mostrar');
    }, 3000);
}

export function fecharNotificacao() {
    const area = document.getElementById('notificacao');
    if (!area) return;
    clearTimeout(area._timeout);
    area.classList.remove('mostrar');
}