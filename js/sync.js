/* ============================================================
   SYNC — Sincronização em tempo real via Firebase
   ============================================================
   PASSO OBRIGATÓRIO: substitua o objeto FIREBASE_CONFIG abaixo
   pelas credenciais do seu projeto Firebase.
   Veja o arquivo GUIA_FIREBASE.md para instruções completas.
   ============================================================ */

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

let _app      = null;
let _db       = null;
let _salaId   = null;
let _salaRef  = null;
let _ignorarProximaAtualizacao = false; // evita loop ao publicar localmente

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

/**
 * Cria uma nova sala no Firebase com o estado atual e começa a ouvir mudanças.
 * @param {Object}   estado    - state atual da aplicação
 * @param {Function} onUpdate  - callback chamado quando o Firebase atualiza a lista
 * @returns {string} salaId gerado
 */
export async function criarSala(estado, onUpdate) {
  if (!_db) return null;

  // Gera ID de sala curto e legível (ex: "x7k2m9")
  _salaId = Math.random().toString(36).slice(2, 8);

  await _conectarSala(onUpdate);
  await publicarEstado(estado);

  return _salaId;
}

/**
 * Entra em uma sala existente e começa a ouvir mudanças.
 * @param {string}   salaId
 * @param {Function} onUpdate - callback chamado quando o Firebase atualiza a lista
 */
export async function entrarSala(salaId, onUpdate) {
  if (!_db) return false;
  _salaId = salaId;
  await _conectarSala(onUpdate);
  return true;
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
 * Deve ser chamado após qualquer alteração local na lista.
 * @param {Object} estado - state atual
 */
export async function publicarEstado(estado) {
  if (!_db || !_salaId) return;

  // Sinaliza que a próxima atualização recebida é nossa — não re-renderiza
  _ignorarProximaAtualizacao = true;

  try {
    await set(_salaRef, {
      itens:     estado.itens,
      temaAtual: estado.temaAtual,
      ts:        Date.now(), // timestamp para desempate
    });
  } catch (e) {
    console.error('Erro ao publicar estado:', e);
    _ignorarProximaAtualizacao = false;
  }
}

/* ── Interno ──────────────────────────────────────────────── */

async function _conectarSala(onUpdate) {
  if (_salaRef) off(_salaRef); // desconecta sala anterior se existir

  _salaRef = ref(_db, `listas/${_salaId}`);

  onValue(_salaRef, (snapshot) => {
    if (_ignorarProximaAtualizacao) {
      _ignorarProximaAtualizacao = false;
      return;
    }

    const dados = snapshot.val();
    if (dados && Array.isArray(dados.itens)) {
      onUpdate(dados); // repassa para o main.js aplicar no state e re-renderizar
    }
  });
}
