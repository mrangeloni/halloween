// ========================================
// SLOT HALLOWEEN — 1 ROLO, GIRO REAL COM LOOP
// Mantém layout/design/imagens. Reescrito para:
// - Loop contínuo (imagens não somem)
// - Ease-out real, parada centralizada
// - Vitória garantida ao menos 1x a cada 5 tentativas
// - Popups: "VOCÊ PERDEU" / "VOCÊ GANHOU 6 JOIAS GRÁTIS"
// ========================================

// --------- Config de símbolos (mantém suas imagens) ---------
const localSymbols = [
  'assets/symbols/abobora-sempremio.png',
  'assets/symbols/bruxa-sempremio.png',
  'assets/symbols/pote-5brindes.png',
  'assets/symbols/caveira-sempremio.png',
  'assets/symbols/morcegos-sempremio.png'
];

const fallbackSymbols = [
  'https://via.placeholder.com/200/ff8c00/ffffff?text=ABOBORA',
  'https://via.placeholder.com/200/8b4513/ffffff?text=BRUXA',
  'https://via.placeholder.com/200/2d1b4e/ffffff?text=5+BRINDES',
  'https://via.placeholder.com/200/1a0033/ffffff?text=CAVEIRA',
  'https://via.placeholder.com/200/ffa500/ffffff?text=MORCEGOS'
];

const symbols = localSymbols.slice();
const WIN_NAME = 'pote-5brindes'; // imagem que define vitória
const WIN_SYMBOL_SRC = 'assets/symbols/pote-5brindes.png';
// Deslocamento visual dos símbolos dentro da janela (sem mexer na moldura)
const IMAGE_OFFSET_X = 8; // esquerda 5px
const IMAGE_OFFSET_Y =  10; // baixo 5px

// Fallback final: SVG embutido para garantir que sempre haja algo visível
const FINAL_FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="%232d1b4e"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="18">SEM IMAGEM</text></svg>';

function setSymbolImage(img, index) {
  const candidates = [symbols[index], fallbackSymbols[index]];
  let tryIdx = 0;
  img.onerror = () => {
    tryIdx++;
    if (tryIdx < candidates.length) {
      img.src = candidates[tryIdx];
    } else {
      img.onerror = null;
      img.src = FINAL_FALLBACK;
    }
  };
  // Importante: registrar onerror ANTES do primeiro src
  img.src = candidates[0];
}

// --------- Sons (arquivos locais em assets/sounds) ---------
const SOUND_PATHS = {
  click: 'assets/sounds/click.mp3',
  spin:  'assets/sounds/spin.mp3',
  win:   'assets/sounds/win.mp3',
  lose:  'assets/sounds/lose.mp3',
  bg:    'assets/sounds/halloween.mp3'
};

const sounds = {
  click: new Audio(SOUND_PATHS.click), // clique curto
  spin:  new Audio(SOUND_PATHS.spin),  // rotação
  win:   new Audio(SOUND_PATHS.win),   // vitória
  lose:  new Audio(SOUND_PATHS.lose)   // derrota
};
Object.values(sounds).forEach(s => { s.volume = 0.35; s.preload = 'auto'; });

// Música de fundo (loop) — tentaremos tocar no load e, se bloqueado, na 1ª interação
const backgroundMusic = new Audio(SOUND_PATHS.bg);
backgroundMusic.loop = true;
backgroundMusic.volume = 0.18;
backgroundMusic.preload = 'auto';
let bgStarted = false;
let spinInstance = null; // instância clonada por tentativa
let allowWinSymbolRender = false; // só mostra o pote visualmente na 3ª tentativa

function ensureBackgroundMusic() {
  if (bgStarted) return;
  try {
    const p = backgroundMusic.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { bgStarted = true; }).catch(() => {});
    } else {
      bgStarted = true;
    }
  } catch (_) {}
}

// Helper para tocar SFX confiavelmente em todas as rodadas
function playSfx(baseAudio, opts = {}) {
  const { loop = false, volume = null } = opts;
  try {
    const inst = baseAudio.cloneNode();
    inst.loop = !!loop;
    if (volume !== null) inst.volume = volume;
    const p = inst.play();
    if (p && typeof p.then === 'function') {
      p.catch(async () => {
        ensureBackgroundMusic();
        try { await inst.play(); } catch (_) {}
      });
    }
    return inst;
  } catch (_) { return null; }
}

function stopSfx(inst) {
  try { if (inst) inst.pause(); } catch (_) {}
}

// Aguarda o início real do áudio para sincronizar com a animação
function waitForPlaying(audioEl, timeout = 200) {
  return new Promise((resolve) => {
    if (!audioEl) return resolve();
    if (!audioEl.paused && audioEl.readyState > 2) return resolve();
    let done = false;
    const onPlaying = () => { if (!done) { done = true; cleanup(); resolve(); } };
    const onTimeUpdate = () => { if (!done && !audioEl.paused) { done = true; cleanup(); resolve(); } };
    const tid = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(); } }, timeout);
    function cleanup() {
      clearTimeout(tid);
      audioEl.removeEventListener('playing', onPlaying);
      audioEl.removeEventListener('timeupdate', onTimeUpdate);
    }
    audioEl.addEventListener('playing', onPlaying, { once: true });
    audioEl.addEventListener('timeupdate', onTimeUpdate, { once: true });
  });
}

// --------- Estado do jogo ---------
let attemptsLeft = 5;
let currentAttempt = 0;
let isSpinning = false;

// Vitória fixa na 3ª tentativa de cada rodada
// (currentAttempt é reiniciado a cada nova rodada)

// --------- DOM ---------
const spinButton       = document.getElementById('spinButton');
const attemptsDisplay  = document.getElementById('attempts');

const prizeModal       = document.getElementById('prizeModal');
const rulesModal       = document.getElementById('rulesModal');
const nextRoundButton  = document.getElementById('nextRoundButton');
const rulesLink        = document.getElementById('rulesLink');
const closeRulesButton = document.getElementById('closeRulesButton');
const prizeBannerImg   = document.getElementById('prizeBannerImg');
const PRIZE_URL        = 'https://lp.vidajoias.com/halloween/';
let lastIsWin = false;
let backBlockerEnabled = false;

function disableBackNavigation() {
  if (backBlockerEnabled) return;
  backBlockerEnabled = true;
  try {
    history.pushState(null, '', location.href);
    const trap = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', trap);
  } catch (_) {
    // Em caso de ambientes que bloqueiam History API, silencie.
  }
}

// ÚNICO REEL (canvas renderer)
const reelViewport = document.querySelector('.reel-viewport');
const reelCanvas   = document.getElementById('reelCanvas');
const reelCtx      = reelCanvas ? reelCanvas.getContext('2d') : null;

// --------- Motor da bobina (Canvas) ---------
const LOOPS = 12; // repetições lógicas para cálculo
let repeated = [];         // vetor de índices base (0..4) repetidos
let symbolH = 0;           // altura (px) de um símbolo (igual à altura do viewport)
let symbolW = 0;           // largura do símbolo/viewport
let totalH = 0;            // altura total da trilha
let offset = 0;            // deslocamento atual em px (0 = topo da trilha)
let rafId = null;

// Imagens pré-carregadas para canvas
const loadedImages = new Array(localSymbols.length).fill(null);
const imageStatus  = new Array(localSymbols.length).fill('pending'); // 'ok' | 'fallback' | 'final'

function preloadImages() {
  localSymbols.forEach((_, idx) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    let tryIdx = 0;
    const candidates = [symbols[idx], fallbackSymbols[idx], FINAL_FALLBACK];
    img.onerror = () => {
      tryIdx++;
      if (tryIdx < candidates.length) {
        img.src = candidates[tryIdx];
      } else {
        imageStatus[idx] = 'final';
      }
    };
    img.onload = () => {
      imageStatus[idx] = tryIdx === 0 ? 'ok' : (tryIdx === 1 ? 'fallback' : 'final');
      loadedImages[idx] = img;
      // Redesenha se já temos dimensões
      if (symbolH > 0) drawCanvas();
    };
    img.src = candidates[0];
  });
}

// --------- Inicialização ---------
function init() {
  // tenta iniciar música de fundo (pode ser bloqueado até 1ª interação)
  ensureBackgroundMusic();
  setupCanvasSize();
  buildReel();
  preloadImages();
  updateAttemptsDisplay();
  // incentivo removido
}
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
  const oldH = symbolH || reelViewport.clientHeight || 264;
  setupCanvasSize();
  const newH = reelViewport.clientHeight || 264;
  const ratio = newH > 0 && oldH > 0 ? (newH / oldH) : 1;
  offset *= ratio; // preserva posição relativa
  buildReel();
  normalizeOffset();
  drawCanvas();
});

// Monta a trilha do rolo em loop contínuo
function buildReel() {
  repeated = [];
  // Altura e largura da janela 1:1 já definidas; usamos para desenhar
  symbolH = Math.round(reelViewport.clientHeight);
  symbolW = Math.round(reelViewport.clientWidth);
  if (symbolH === 0 || symbolW === 0) {
    symbolH = symbolW = 264; // fallback padrão
  }
  // repete a sequência base LOOPS vezes
  for (let l = 0; l < LOOPS; l++) {
    for (let i = 0; i < symbols.length; i++) {
      repeated.push(i);
    }
  }
  totalH = repeated.length * symbolH;
  offset = 0;
}

function setupCanvasSize() {
  if (!reelCanvas) return;
  // Ajusta o canvas em pixel ratio para nitidez
  const rect = reelViewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  reelCanvas.width  = Math.max(1, Math.floor(rect.width * dpr));
  reelCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  reelCanvas.style.width  = `${Math.floor(rect.width)}px`;
  reelCanvas.style.height = `${Math.floor(rect.height)}px`;
  if (reelCtx) reelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCanvas() {
  if (!reelCtx) return;
  // Fundo + moldura interna igual ao CSS
  reelCtx.clearRect(0, 0, reelCanvas.width, reelCanvas.height);

  const w = reelCanvas.clientWidth;
  const h = reelCanvas.clientHeight;

  // fundo já é via CSS, aqui só clipamos a janela
  reelCtx.save();
  reelCtx.beginPath();
  reelCtx.rect(0, 0, w, h);
  reelCtx.clip();

  // quantas linhas precisamos desenhar para cobrir a janela? (+1 margem)
  const firstRow = Math.floor(offset / symbolH);
  const yStart = - (offset - firstRow * symbolH);
  // desenha de yStart até cobrir altura
  let y = yStart;
  let row = firstRow;
  while (y < h + symbolH) {
    let baseIdx = repeated[(row % repeated.length + repeated.length) % repeated.length];
    // Em tentativas que não são a 3ª, substitui visualmente o pote por outro símbolo
    if (!allowWinSymbolRender) {
      const wIdx = getWinIndex();
      if (baseIdx === wIdx) {
        baseIdx = (wIdx + 1) % symbols.length; // próximo símbolo não vencedor
      }
    }
    const img = loadedImages[baseIdx];
    // desenha imagem centralizada
    if (img) {
      // calcula tamanho mantendo aspect-ratio, cabendo em 90% do quadrado
      const pad = Math.floor(Math.min(w, h) * 0.05);
      const boxW = w - pad * 2;
      const boxH = symbolH - pad * 2;
      const iw = img.naturalWidth || 200;
      const ih = img.naturalHeight || 200;
      const scale = Math.min(boxW / iw, boxH / ih);
      const dw = Math.floor(iw * scale);
      const dh = Math.floor(ih * scale);
  const dx = Math.floor((w - dw) / 2) + IMAGE_OFFSET_X;
  const dy = Math.floor(y + (symbolH - dh) / 2) + IMAGE_OFFSET_Y;
  reelCtx.drawImage(img, dx, dy, dw, dh);
    }

    // opcional: leve linha separadora
    // reelCtx.strokeStyle = 'rgba(0,0,0,0.25)';
    // reelCtx.beginPath();
    // reelCtx.moveTo(0, Math.floor(y + symbolH) + 0.5);
    // reelCtx.lineTo(w, Math.floor(y + symbolH) + 0.5);
    // reelCtx.stroke();

    y += symbolH;
    row += 1;
  }

  reelCtx.restore();
}

// --------- Girar ---------
spinButton.addEventListener('click', spin);
// Clique/Toque: som de clique + garantir música de fundo
spinButton.addEventListener('pointerdown', () => {
  playSfx(sounds.click, { volume: sounds.click.volume });
  ensureBackgroundMusic();
}, { passive: true });

async function spin() {
  if (isSpinning || attemptsLeft <= 0) return;

  isSpinning = true;
  spinButton.disabled = true;

  currentAttempt++;
  attemptsLeft--;
  updateAttemptsDisplay();
  // incentivo removido

  // Delay de 0,5s após o clique antes de iniciar o giro
  await sleep(500);
  // Alinha o offset para a borda de linha mais próxima para padronizar o início visual
  if (symbolH > 0) {
    offset = Math.round(offset / symbolH) * symbolH;
    normalizeOffset();
    drawCanvas();
  }
  // Qual símbolo alvo? — 3ª tentativa sempre vence
  const wantWin = (currentAttempt === 3);
  allowWinSymbolRender = wantWin;
  const winIdx  = getWinIndex(); // índice do símbolo com WIN_NAME na base (0..4)
  const targetBaseIndex = wantWin ? winIdx : getFixedNonWinIndex(winIdx);

  // Som de giro (contínuo durante a animação) — prepara e sincroniza com o início da animação
  try {
    stopSfx(spinInstance);
    spinInstance = playSfx(sounds.spin, { loop: true, volume: sounds.spin.volume });
  } catch (_) {}
  ensureBackgroundMusic();

  // Duração ~4s, começa rápido e desacelera (ease-out)
  const duration = 4000; // ms
  const startOffset = offset;

  // Precisamos garantir diversas “passagens” antes de parar no alvo.
  // Vamos calcular um destino em pixels que:
  //  - Dá várias voltas (múltiplos de symbolH)
  //  - E finaliza com o alvo no centro do viewport
  const minTurns = 20; // passo fixo para padronizar o giro
  const endOffset = computeEndOffset(startOffset, targetBaseIndex, minTurns);

  // Aguarda o áudio realmente entrar em 'playing' para iniciar a animação ao mesmo tempo
  await waitForPlaying(spinInstance, 200);

  // Animação easeOutCubic
  await new Promise(resolve => {
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const start    = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);

      offset = lerp(startOffsetNorm(startOffset), endOffset, eased);
      normalizeOffset();
      drawCanvas();

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    rafId = requestAnimationFrame(step);
  });

  // Termina som de giro
  try { if (spinInstance) { stopSfx(spinInstance); spinInstance = null; } } catch (_) {}
  // Se prometemos vitória e por arredondamento não caiu no alvo, força encaixe no pote
  if (wantWin) {
    const winIdx = getWinIndex();
    const centerRow = Math.round(offset / symbolH);
    const bestRow = findClosestRowForBaseIndex(winIdx, centerRow);
    if (bestRow != null) {
      offset = bestRow * symbolH;
      normalizeOffset();
      drawCanvas();
    }
  }
  allowWinSymbolRender = false;

  // Verifica símbolo central ao terminar e vitória
  const landedBaseIndex = getCenterBaseIndex(offset);
  const isWin = wantWin ? true : (landedBaseIndex === getWinIndex());

  // Mostra modal com imagem coerente do prêmio/símbolo
  showPrizeModal(isWin, landedBaseIndex);

  isSpinning = false;
  if (attemptsLeft > 0) {
    spinButton.disabled = false;
  } else {
    spinButton.textContent = 'FIM DE JOGO';
  }
}

// Calcula o índice que corresponde ao símbolo vencedor na base (0..4)
function getWinIndex() {
  // Prioriza correspondência exata com o caminho local
  let idx = symbols.findIndex(src => src === WIN_SYMBOL_SRC);
  if (idx >= 0) return idx;
  // Alternativa: busca por nome parcial
  idx = symbols.findIndex(src => typeof src === 'string' && src.includes(WIN_NAME));
  return idx >= 0 ? idx : 0;
}

// Retorna um índice base aleatório que NÃO seja o vencedor
function getRandomNonWinIndex(winIdx) {
  let idx;
  do {
    idx = randInt(0, symbols.length - 1);
  } while (idx === winIdx);
  return idx;
}

// Índice de derrota fixo para tornar o giro repetível nas tentativas 1 e 2
function getFixedNonWinIndex(winIdx) {
  // Escolhe, por exemplo, o símbolo imediatamente após o vencedor (cíclico)
  return (winIdx + 1) % symbols.length;
}

// Dado o offset atual (px) e o índice alvo na base (0..4), calcula um destino que
// faz várias voltas e para com o alvo centralizado.
function computeEndOffset(startOffset, targetBaseIndex, minTurns = 12) {
  // Descobrir qual símbolo está no centro agora
  const currentCenterIndex = getCenterBaseIndex(startOffset);

  // Quantos “passos” (símbolos) até chegar ao target a partir do atual
  let stepsToTarget = (targetBaseIndex - currentCenterIndex);
  while (stepsToTarget < 0) stepsToTarget += symbols.length;

  // Adiciona voltas para dar adrenalina
  const totalSteps = stepsToTarget + minTurns;

  // Cada passo = +symbolH px (vamos mover “para cima”, ou seja, aumentar offset)
  const targetOffset = startOffset + totalSteps * symbolH;

  // Alinhamento perfeito do alvo no centro:
  // O centro corresponde a um faixa de offset tal que remainder(symbolH) ~ 0
  // Como o startOffset pode não estar em borda exata, o cálculo acima já garante
  // que após ‘totalSteps’ inteiros estaremos exatamente no centro do alvo.
  return targetOffset;
}

// Retorna qual índice base (0..4) está visível no centro para um dado offset (px)
function getCenterBaseIndex(offPx) {
  // Qual item “inteiro” está centralizado?
  const centerRow = Math.round(offPx / symbolH) % repeated.length;
  const idx = (centerRow + repeated.length) % repeated.length;
  return repeated[idx] % symbols.length;
}

// DOM reel não é mais usado; mantido como fallback

// Mantém o offset dentro do intervalo [0, totalH)
function normalizeOffset() {
  if (totalH === 0) return;
  offset = ((offset % totalH) + totalH) % totalH;
}

// Encontra a linha mais próxima (row) cujo símbolo base corresponde ao targetBaseIdx
function findClosestRowForBaseIndex(targetBaseIdx, aroundRow) {
  if (!repeated.length) return null;
  const N = repeated.length;
  let best = null;
  let bestDist = Infinity;
  for (let k = -N; k <= N; k++) {
    const r = ((aroundRow + k) % N + N) % N;
    const base = repeated[r] % symbols.length;
    if (base === targetBaseIdx) {
      const d = Math.abs(k);
      if (d < bestDist) { bestDist = d; best = r; }
    }
  }
  return best;
}

// Pequenas ajudas
function lerp(a, b, t) { return a + (b - a) * t; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Corrige o início caso o startOffset não estivesse normalizado
function startOffsetNorm(x) {
  if (totalH === 0) return x;
  return ((x % totalH) + totalH) % totalH;
}

// --------- UI auxiliares ---------
function updateAttemptsDisplay() {
  attemptsDisplay.textContent = attemptsLeft;
}

// incentivo removido

// --------- Modais ---------
function showPrizeModal(isWin, landedIndex) {
  lastIsWin = isWin;
  try {
    if (isWin) { playSfx(sounds.win,  { volume: sounds.win.volume }); }
    else       { playSfx(sounds.lose, { volume: sounds.lose.volume }); }
  } catch (_) {}

  if (isWin) {
    // Bloqueia voltar à página anterior até recarregar
    disableBackNavigation();
  }

  // Imagem coerente com o símbolo que parou no centro
  const imgSrc = isWin ? WIN_SYMBOL_SRC : getPrizeImageSrc(landedIndex);
  const altTxt = getSymbolName(landedIndex, isWin);
  prizeBannerImg.src = imgSrc;
  prizeBannerImg.alt = altTxt;

  // Mostra modal
  prizeModal.classList.add('show');

  // Texto do botão conforme pedido
  nextRoundButton.textContent = isWin ? 'VER MEU PRÊMIO' : 'TENTAR NOVAMENTE';
}

function closePrizeModal() {
  prizeModal.classList.remove('show');
}

function showRulesModal()  { rulesModal.classList.add('show'); }
function closeRulesModal() { rulesModal.classList.remove('show'); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --------- Eventos dos botões ---------
nextRoundButton.addEventListener('click', () => {
  if (lastIsWin) {
    // Redireciona para a página do prêmio
    window.location.replace(PRIZE_URL);
    return;
  }
  // Caso de derrota: fecha modal e segue fluxo normal
  closePrizeModal();
  if (attemptsLeft === 0) {
    // Reiniciar rodada completa
    attemptsLeft = 5;
    currentAttempt = 0;
    spinButton.disabled = false;
    spinButton.textContent = 'GIRAR';
    updateAttemptsDisplay();
    // incentivo removido
  }
});

rulesLink.addEventListener('click', (e) => {
  e.preventDefault();
  showRulesModal();
  ensureBackgroundMusic();
});
closeRulesButton.addEventListener('click', closeRulesModal);
closeRulesButton.addEventListener('pointerdown', ensureBackgroundMusic, { passive: true });
closeRulesButton.addEventListener('pointerdown', () => playSfx(sounds.click, { volume: sounds.click.volume }), { passive: true });

// Fecha modais ao clicar fora
window.addEventListener('click', (e) => {
  if (e.target === prizeModal) closePrizeModal();
  if (e.target === rulesModal) closeRulesModal();
});

// --------- Banner: gera uma imagem com o texto solicitado ---------
function makeBannerDataURL(text, bg) {
  const w = 800, h = 360;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // Fundo
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, shadeColor(bg, -30));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Moldura
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 16;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Texto
  ctx.fillStyle = '#2d1b4e';
  ctx.font = 'bold 44px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Quebra em 2 linhas se necessário
  const parts = splitText(text, 24);
  const baseY = h / 2 - ((parts.length - 1) * 46) / 2;
  parts.forEach((line, i) => {
    ctx.fillText(line, w / 2, baseY + i * 46);
  });

  return c.toDataURL('image/png');
}

function splitText(t, max) {
  const words = t.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryLine = cur ? cur + ' ' + w : w;
    if (tryLine.length <= max) cur = tryLine;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function shadeColor(col, amt) {
  // col #rrggbb ; amt -100..+100
  const f = parseInt(col.slice(1),16);
  let r = (f>>16) + amt, g = (f>>8 & 0x00FF) + amt, b = (f & 0x0000FF) + amt;
  r = Math.max(Math.min(255,r),0);
  g = Math.max(Math.min(255,g),0);
  b = Math.max(Math.min(255,b),0);
  return `#${(r<<16 | g<<8 | b).toString(16).padStart(6,'0')}`;
}

// --------- Helpers: imagem coerente no popup ---------
function getPrizeImageSrc(index) {
  // Tenta na ordem: imagem carregada -> URL local -> placeholder -> banner gerado
  const img = loadedImages[index];
  if (img && img.src) return img.src;

  const local = symbols[index];
  if (typeof local === 'string') return local;

  const placeholder = fallbackSymbols[index] || null;
  if (placeholder) return placeholder;

  const isWin = getSymbolBaseName(index).includes(WIN_NAME);
  return makeBannerDataURL(isWin ? 'VOCÊ GANHOU 6 JOIAS GRÁTIS' : 'VOCÊ PERDEU', isWin ? '#ffa500' : '#8b4513');
}

function getSymbolName(index, isWin) {
  const base = getSymbolBaseName(index);
  if (isWin) return 'Prêmio: 6 Joias Grátis';
  // nome amigável por heurística do arquivo
  if (base.includes('abobora')) return 'Abóbora';
  if (base.includes('bruxa')) return 'Bruxa';
  if (base.includes('caveira')) return 'Caveira';
  if (base.includes('morcegos')) return 'Morcegos';
  if (base.includes('pote')) return 'Prêmio';
  return 'Símbolo';
}

function getSymbolBaseName(index) {
  const src = symbols[index] || '';
  const last = typeof src === 'string' ? src.split('/').pop() : '';
  return (last || '').toLowerCase();
}
