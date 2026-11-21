/* ============================================================
   SYNC — Sincronização em tempo real via Firebase
   ============================================================
   PASSO OBRIGATÓRIO: substitua o objeto FIREBASE_CONFIG abaixo
   pelas credenciais do seu projeto Firebase.
   Veja o arquivo GUIA_FIREBASE.md para instruções completas.
   ============================================================ */

import { state } from './storage.js';
import { normalizarEstado } from './validacao.js';
import { initializeApp }                    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, set, onValue,
         off }                              from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

/* ── ⚙️  COLE AQUI AS SUAS CREDENCIAIS DO FIREBASE ───────── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCtd3bxAukEUxrjI0ZUZefRTl6egTbDNjY",
  authDomain:        "lista-de-itens-2a16b.firebaseapp.com",
  databaseURL:       "https://lista-de-itens-2a16b-default-rtdb.firebaseio.com",
  projectId:         "lista-de-itens-2a16b",
  storageBucket:     "lista-de-itens-2a16b.firebasestorage.app",
  messagingSenderId: "892949603134",
  appId:             "1:892949603134:web:f387ebee8ec85d5c65026f",
};
/* ─────────────────────────────────────────────────────────── */

const TEMPO_LIMITE_SALA = 8000;

let _app      = null;
let _db       = null;
let _salaId   = null;
let _salaRef  = null;


/** Inicializa o Firebase (chamado uma vez na startup) */
export function inicializarFirebase() {
  try {
    _app = initializeApp(FIREBASE_CONFIG);
    _db  = getDatabase(_app);
    return true;
  } catch (e) {
    console.error('Erro ao inicializar Firebase:', e);
    return false;
  }
}

/** Retorna o ID da sala ativa, ou null se não estiver em nenhuma */
export function getSalaId() {
  return _salaId;
}

/** Verifica se o Firebase está configurado (credenciais preenchidas) */
export function firebaseConfigurado() {
  return FIREBASE_CONFIG.apiKey !== 'COLE_AQUI';
}

/** Gera uma capability de 128 bits em base64url (22 caracteres). */
export function gerarIdSala() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Cria uma sala com o estado atual. Só devolve o id depois de a escrita
 * inicial ser aceita pelo Firebase.
 * @returns {Promise<string|null>}
 */
export async function criarSala(estado, onUpdate) {
  if (!_db) return null;

  _salaId  = gerarIdSala();
  _salaRef = ref(_db, `listas/${_salaId}`);

  try {
    await set(_salaRef, {
      itens:     estado.itens,
      temaAtual: estado.temaAtual,
      ts:        Date.now(),
    });
  } catch (e) {
    console.error('Erro ao criar sala:', e);
    sairSala();
    return null;
  }

  _conectarSala(onUpdate);
  return _salaId;
}

/**
 * Entra em uma sala existente. Resolve somente após o primeiro snapshot
 * válido; sala inexistente, inválida ou sem resposta resolve false.
 * @param {string}   salaId
 * @param {Function} onUpdate        - recebe o estado normalizado
 * @param {Function} aceitarPrimeiro - decide se o primeiro snapshot substitui o estado local
 * @returns {Promise<boolean>}
 */
export async function entrarSala(salaId, onUpdate, aceitarPrimeiro = () => true) {
  if (!_db) return false;
  if (typeof salaId !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(salaId)) return false;

  if (_salaRef) off(_salaRef);
  _salaId  = salaId;
  _salaRef = ref(_db, `listas/${_salaId}`);

  return new Promise(resolve => {
    let concluido = false;
    let processando = false;
    let timer;
    const finalizar = (ok) => {
      if (concluido) return;
      concluido = true;
      clearTimeout(timer);
      if (!ok) sairSala();
      resolve(ok);
    };
    timer = setTimeout(() => finalizar(false), TEMPO_LIMITE_SALA);

    onValue(_salaRef, async snapshot => {
      const normalizado = normalizarEstado(snapshot.val(), { itensOpcionais: true });

      if (concluido) {
        if (!normalizado) {
          console.warn('Snapshot remoto inválido ignorado.');
          return;
        }
        if (mesmoEstado(normalizado)) return;
        onUpdate(normalizado);
        return;
      }

      if (processando) return;
      processando = true;
      clearTimeout(timer);

      if (!normalizado) {
        finalizar(false);
        return;
      }

      let aceito = false;
      try {
        aceito = await aceitarPrimeiro(normalizado);
      } catch (e) {
        console.error('Erro ao confirmar a entrada na sala:', e);
      }

      if (!aceito) {
        processando = false;
        finalizar(false);
        return;
      }

      onUpdate(normalizado);
      processando = false;
      finalizar(true);
    }, erro => {
      console.error('Erro ao ouvir a sala:', erro);
      finalizar(false);
    });
  });
}

/** Desconecta da sala atual */
export function sairSala() {
  if (_salaRef) {
    off(_salaRef);
    _salaRef = null;
  }
  _salaId = null;
}

/**
 * Publica o estado atual no Firebase.
 * @returns {Promise<boolean>} false quando a escrita não foi aceita
 */
export async function publicarEstado(estado) {
  if (!_db || !_salaRef) return false;
  try {
    await set(_salaRef, {
      itens:     estado.itens,
      temaAtual: estado.temaAtual,
      ts:        Date.now(),
    });
    return true;
  } catch (e) {
    console.error('Erro ao publicar estado:', e);
    return false;
  }
}

/* ── Interno ──────────────────────────────────────────────── */

function mesmoEstado(normalizado) {
  return JSON.stringify(normalizado.itens) === JSON.stringify(state.itens) &&
         normalizado.temaAtual === state.temaAtual;
}

function _conectarSala(onUpdate) {
  if (!_salaRef) return;
  onValue(_salaRef, snapshot => {
    const normalizado = normalizarEstado(snapshot.val(), { itensOpcionais: true });
    if (!normalizado) {
      console.warn('Snapshot remoto inválido ignorado.');
      return;
    }
    if (mesmoEstado(normalizado)) return;
    onUpdate(normalizado);
  }, erro => console.error('Erro ao ouvir a sala:', erro));
}
