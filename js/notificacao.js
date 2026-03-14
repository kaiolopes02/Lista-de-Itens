/* ============================================================
   NOTIFICAÇÃO — Toast flutuante tipado
   ============================================================ */
import { icone } from './icones.js';

const TIPOS = {
  sucesso: { cls:'sucesso', ico:'checkCirculo' },
  erro:    { cls:'erro',    ico:'erroCirculo'  },
  info:    { cls:'info',    ico:'infoCirculo'  },
};

export function mostrarNotificacao(msg, tipo = 'info') {
  const area  = document.getElementById('notificacao');
  const texto = document.getElementById('notificacaoTexto');
  const el    = document.getElementById('notifIcone');
  if (!area || !texto || !el) return;

  const cfg = TIPOS[tipo] ?? TIPOS.info;
  texto.textContent = msg;
  el.className      = `notif-icone ${cfg.cls}`;
  el.innerHTML      = icone(cfg.ico);

  area.classList.add('mostrar');
  clearTimeout(area._timeout);
  area._timeout = setTimeout(() => area.classList.remove('mostrar'), 3200);
}

export function fecharNotificacao() {
  const area = document.getElementById('notificacao');
  if (!area) return;
  clearTimeout(area._timeout);
  area.classList.remove('mostrar');
}
