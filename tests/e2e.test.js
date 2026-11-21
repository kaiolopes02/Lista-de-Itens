import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { codificarSnapshot } from '../js/validacao.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function acharChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean).find(existsSync) ?? null;
}

const CHROME = acharChrome();

function iniciarServidor() {
  return new Promise(resolve => {
    const servidor = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const caminho = url.pathname === '/'
        ? path.join(RAIZ, 'index.html')
        : path.join(RAIZ, decodeURIComponent(url.pathname));
      if (!caminho.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
      try {
        const corpo = await readFile(caminho);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(caminho)] ?? 'application/octet-stream' });
        res.end(corpo);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    servidor.listen(0, '127.0.0.1', () => resolve(servidor));
  });
}

function dumpDom(url, perfil) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME, [
      '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${perfil}`, '--virtual-time-budget=4000', '--dump-dom', url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    proc.stdout.on('data', dados => { saida += dados; });
    proc.stderr.on('data', () => {});
    const timer = setTimeout(() => proc.kill(), 25000);
    proc.on('error', reject);
    proc.on('close', () => { clearTimeout(timer); resolve(saida); });
  });
}

const item = (extra = {}) => ({
  id: 1, nome: 'Arroz', preco: 5.5, quantidade: 2, unidade: 'un', incluido: true, ...extra,
});

test('render, XSS e persistência no Chrome headless', { skip: !CHROME && 'Chrome não encontrado' }, async () => {
  const servidor = await iniciarServidor();
  const base = `http://127.0.0.1:${servidor.address().port}/`;
  const perfil = path.join(os.tmpdir(), `lista-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    const vazio = await dumpDom(base, perfil);
    assert.match(vazio, /<title>Lista de Compras<\/title>/);
    assert.match(vazio, /Lista vazia!/);

    const xss = codificarSnapshot({ itens: [item({ preco: '<img src=x onerror=alert(1)>' })], temaAtual: 'azul' });
    const rejeitado = await dumpDom(`${base}#data=${xss}`, perfil);
    assert.match(rejeitado, /Lista vazia!/, 'snapshot com preço textual deve ser rejeitado');
    assert.doesNotMatch(rejeitado, /<img src="x"/, 'não deve criar elemento img');

    const nomeMalicioso = '<img src=x onerror=alert(2)>';
    const valido = codificarSnapshot({ itens: [item({ nome: nomeMalicioso })], temaAtual: 'azul' });
    const renderizado = await dumpDom(`${base}#data=${valido}`, perfil);
    assert.match(renderizado, /&lt;img src=x onerror=alert\(2\)&gt;/, 'nome deve aparecer como texto escapado');
    assert.doesNotMatch(renderizado, /<img src="x"/, 'nome não deve virar elemento');
    assert.match(renderizado, /R\$&nbsp;11,00|R\$ 11,00/, 'totais devem renderizar sem crash');

    const recarregado = await dumpDom(base, perfil);
    assert.match(recarregado, /&lt;img src=x onerror=alert\(2\)&gt;/, 'estado deve persistir após reload');
    assert.doesNotMatch(recarregado, /<img src="x"/, 'persistência não deve virar elemento');

    const vazioSnapshot = codificarSnapshot({ itens: [], temaAtual: 'azul' });
    const protegido = await dumpDom(`${base}#data=${vazioSnapshot}`, perfil);
    assert.match(protegido, /&lt;img src=x onerror=alert\(2\)&gt;/, 'lista local não vazia não pode ser apagada sem confirmação');
    assert.match(protegido, /id="confirmDialog"[^>]*open/, 'confirmação deve ser exibida antes de substituir');
    assert.match(protegido, /Manter minha lista/, 'opção de manter a lista deve existir');

    const perfilLegado = path.join(os.tmpdir(), `lista-e2e-legado-${Date.now()}`);
    try {
      const legado = Buffer.from(
        encodeURIComponent(JSON.stringify({ itens: [item({ nome: 'Legado' })], temaAtual: 'azul' })),
      ).toString('base64');
      const domLegado = await dumpDom(`${base}?data=${legado}`, perfilLegado);
      assert.match(domLegado, /Legado/, 'link legado ?data= deve continuar funcionando');

      const domInvalido = await dumpDom(`${base}#data=!!!`, perfilLegado);
      assert.match(domInvalido, /Legado/, 'payload inválido não pode apagar a lista local');
      assert.match(domInvalido, /Link inválido/, 'payload inválido deve avisar o usuário');
    } finally {
      rmSync(perfilLegado, { recursive: true, force: true });
    }
  } finally {
    servidor.close();
    rmSync(perfil, { recursive: true, force: true });
  }
});
