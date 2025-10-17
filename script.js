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

// --------- Sons ---------
const sounds = {
  spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  win:  new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
  lose: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3')
};
Object.values(sounds).forEach(s => s.volume = 0.35);

// --------- Estado do jogo ---------
let attemptsLeft = 5;
let currentAttempt = 0;
let isSpinning = false;

// Para garantir vitória 1x a cada 5 tentativas
let predeterminedWinAttempt = randInt(1, 5);

// --------- DOM ---------
const spinButton       = document.getElementById('spinButton');
const attemptsDisplay  = document.getElementById('attempts');
const encouragement    = document.getElementById('encouragement');

const prizeModal       = document.getElementById('prizeModal');
const rulesModal       = document.getElementById('rulesModal');
const nextRoundButton  = document.getElementById('nextRoundButton');
const rulesLink        = document.getElementById('rulesLink');
const closeRulesButton = document.getElementById('closeRulesButton');
const prizeBannerImg   = document.getElementById('prizeBannerImg');

// ÚNICO REEL (viewport -> reel)
const reelViewport = document.querySelector('.reel-viewport');
const reel         = document.getElementById('reel1');

// --------- Motor da bobina ---------
// Repetimos os símbolos para fazer loop contínuo
const LOOPS = 12; // quantas vezes repetir a sequência (grande o suficiente p/ 2s de giro rápido)
let repeated = [];        // vetor de índices base (0..4) repetidos
let itemEls = [];         // elementos DOM correspondentes
let symbolH = 0;          // altura (px) de um símbolo (igual à altura do viewport)
let totalH = 0;           // altura total da trilha
let offset = 0;           // deslocamento atual em px (0 = topo da trilha)
let rafId = null;

// --------- Inicialização ---------
function init() {
  buildReel();
  updateAttemptsDisplay();
  updateEncouragement();
}
document.addEventListener('DOMContentLoaded', init);

// Monta a trilha do rolo em loop contínuo
function buildReel() {
  reel.innerHTML = '';
  itemEls = [];
  repeated = [];

  // Altura 1:1 da janela já é definida via CSS; aqui medimos para usar em px
  symbolH = Math.round(reelViewport.clientHeight);
  if (symbolH === 0) {
    // fallback se ainda não renderizou
    symbolH = 260;
  }

  // Cria LOOPS vezes a sequência (0..4)
  for (let l = 0; l < LOOPS; l++) {
    for (let i = 0; i < symbols.length; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'symbol';
      wrap.style.height = `${symbolH}px`;

  const img = document.createElement('img');
      img.className = 'symbol-img';
      img.alt = `Símbolo ${i + 1}`;
  setSymbolImage(img, i);

      wrap.appendChild(img);
      reel.appendChild(wrap);

      repeated.push(i);
      itemEls.push(wrap);
    }
  }

  totalH = repeated.length * symbolH;
  offset = 0;
  applyTransform();
}

// --------- Girar ---------
spinButton.addEventListener('click', spin);

async function spin() {
  if (isSpinning || attemptsLeft <= 0) return;

  isSpinning = true;
  spinButton.disabled = true;

  currentAttempt++;
  attemptsLeft--;
  updateAttemptsDisplay();
  updateEncouragement();

  // Qual símbolo alvo?
  const wantWin = (currentAttempt === predeterminedWinAttempt);
  const winIdx  = getWinIndex(); // índice do símbolo com WIN_NAME na base (0..4)
  const targetBaseIndex = wantWin ? winIdx : getRandomNonWinIndex(winIdx);

  // Som de giro (contínuo durante a animação)
  try { sounds.spin.currentTime = 0; sounds.spin.play(); } catch (_) {}

  // Duração ~2s, adrenalina: começa MUITO rápido e desacelera
  const duration = 2000; // ms
  const start    = performance.now();
  const startOffset = offset;

  // Precisamos garantir diversas “passagens” antes de parar no alvo.
  // Vamos calcular um destino em pixels que:
  //  - Dá várias voltas (múltiplos de symbolH)
  //  - E finaliza com o alvo no centro do viewport
  const minTurns = 18; // pelo menos 18 símbolos percorridos (adrenalina)
  const endOffset = computeEndOffset(startOffset, targetBaseIndex, minTurns);

  // Animação easeOutCubic
  await new Promise(resolve => {
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);

      offset = lerp(startOffsetNorm(startOffset), endOffset, eased);
      normalizeOffset();
      applyTransform();

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    rafId = requestAnimationFrame(step);
  });

  // Termina som de giro
  try { sounds.spin.pause(); } catch (_) {}

  // Verifica vitória
  const isWin = (targetBaseIndex === winIdx);

  // Mostra modal correto
  showPrizeModal(isWin);

  isSpinning = false;
  if (attemptsLeft > 0) {
    spinButton.disabled = false;
  } else {
    spinButton.textContent = 'FIM DE JOGO';
  }
}

// Calcula o índice que corresponde ao símbolo vencedor na base (0..4)
function getWinIndex() {
  const idx = symbols.findIndex(src => typeof src === 'string' && src.includes(WIN_NAME));
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

// Aplica o transform conforme o offset atual
function applyTransform() {
  reel.style.transform = `translateY(${-offset}px)`;
}

// Mantém o offset dentro do intervalo [0, totalH)
function normalizeOffset() {
  if (totalH === 0) return;
  offset = ((offset % totalH) + totalH) % totalH;
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

function updateEncouragement() {
  const messages = [
    'Gire e ganhe!',
    'Boa sorte!',
    'Você consegue!',
    'Tente novamente!',
    'Última chance!'
  ];

  if (attemptsLeft === 0) {
    encouragement.textContent = 'Fim de jogo!';
  } else if (attemptsLeft === 1) {
    encouragement.textContent = messages[4];
  } else {
    encouragement.textContent = messages[Math.min(currentAttempt, messages.length - 1)];
  }
}

// --------- Modais ---------
function showPrizeModal(isWin) {
  try {
    if (isWin) { sounds.win.currentTime = 0; sounds.win.play(); }
    else       { sounds.lose.currentTime = 0; sounds.lose.play(); }
  } catch (_) {}

  // Gera banner dinâmico com texto certo (mantendo seu layout/modal)
  const text = isWin ? 'VOCÊ GANHOU 6 JOIAS GRÁTIS' : 'VOCÊ PERDEU';
  const bg   = isWin ? '#ffa500' : '#8b4513';
  prizeBannerImg.src = makeBannerDataURL(text, bg);
  prizeBannerImg.alt = text;

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
  closePrizeModal();
  if (attemptsLeft === 0) {
    // Reiniciar rodada completa
    attemptsLeft = 5;
    currentAttempt = 0;
    predeterminedWinAttempt = randInt(1, 5);
    spinButton.disabled = false;
    spinButton.textContent = 'GIRAR';
    updateAttemptsDisplay();
    updateEncouragement();
  }
});

rulesLink.addEventListener('click', (e) => {
  e.preventDefault();
  showRulesModal();
});
closeRulesButton.addEventListener('click', closeRulesModal);

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
