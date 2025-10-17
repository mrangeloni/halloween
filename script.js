// ========================================
// CONFIGURAÇÃO DE IMAGENS
// ========================================

/*
INSTRUÇÕES PARA CONFIGURAR OS SÍMBOLOS:
Substitua as URLs abaixo pelas URLs das suas imagens de Halloween.
Tamanho recomendado: 200x200px (quadrado)
Formato: PNG com fundo transparente

Símbolos sugeridos:
1. Abóbora (pumpkin)
2. Bruxa (witch)
3. Caldeirão (cauldron)
4. Morcego (bat)
5. Pote de prêmio (prize pot)
*/

// Caminhos locais esperados (adicione seus arquivos em assets/symbols/)
const localSymbols = [
    'assets/symbols/abobora-sempremio.png',   // Símbolo 1 - Abóbora sem prêmio
    'assets/symbols/bruxa-sempremio.png',     // Símbolo 2 - Bruxa sem prêmio
    'assets/symbols/pote-5brindes.png',       // Símbolo 3 - Pote de 5 brindes
    'assets/symbols/caveira-sempremio.png',   // Símbolo 4 - Caveira sem prêmio
    'assets/symbols/morcegos-sempremio.png'   // Símbolo 5 - Morcegos sem prêmio
];

// Placeholders usados como fallback caso a imagem local não exista
const fallbackSymbols = [
    'https://via.placeholder.com/200/ff8c00/ffffff?text=🎃',  // Abóbora
    'https://via.placeholder.com/200/8b4513/ffffff?text=🧙',  // Bruxa
    'https://via.placeholder.com/200/2d1b4e/ffffff?text=🍯',  // Caldeirão
    'https://via.placeholder.com/200/1a0033/ffffff?text=🦇',  // Morcego
    'https://via.placeholder.com/200/ffa500/ffffff?text=💰'   // Pote de prêmio
];

// Array efetivo de símbolos que o jogo usa
const symbols = localSymbols;

/*
 * Para garantir que pelo menos uma das 5 tentativas resulte em vitória,
 * escolhemos uma rodada específica de forma aleatória durante a
 * inicialização. Nessa tentativa, o símbolo sorteado será sempre o
 * recipiente premiado definido por WIN_NAME. Se você preferir que a
 * vitória ocorra em uma rodada fixa (por exemplo, sempre na 4ª),
 * defina o valor de predeterminedWinAttempt manualmente.
 */
let predeterminedWinAttempt = Math.floor(Math.random() * 5) + 1; // 1 a 5
// Guardamos o índice que corresponde ao símbolo vencedor para uso posterior
function getWinIndex() {
    const idx = symbols.findIndex(src => typeof src === 'string' && src.includes(WIN_NAME));
    return idx >= 0 ? idx : 0;
}

function pickTargetIndex(attemptNumber) {
    // Se estivermos na rodada premiada, retornamos sempre o índice do símbolo vencedor
    if (attemptNumber === predeterminedWinAttempt) return getWinIndex();
    // Caso contrário, sorteamos uniformemente entre todos os símbolos
    return Math.floor(Math.random() * symbols.length);
}

/*
INSTRUÇÕES PARA CONFIGURAR O BANNER DE PRÊMIO:
Edite o arquivo index.html e substitua a URL na tag img com id="prizeBannerImg"
Tamanho recomendado: 600x300px (proporção 2:1)
Formato: PNG com fundo transparente ou JPG
*/

// ========================================
// CONFIGURAÇÃO DE SONS
// ========================================

// URLs dos sons (você pode substituir por seus próprios arquivos de áudio)
const sounds = {
    spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'), // Som de girar
    win: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),  // Som de vitória
    lose: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3')  // Som de derrota
};

// Configurar volume dos sons
Object.values(sounds).forEach(sound => {
    sound.volume = 0.3;
});

// ========================================
// BANNERS DE PRÊMIO
// ========================================

/**
 * Gera uma imagem base64 usando canvas com fundo personalizado e texto
 * centralizado. Essa abordagem evita depender de recursos externos e
 * permite que as mensagens de vitória/derrota sigam o tema visual do jogo.
 *
 * @param {string} text Texto que será exibido. Quebras de linha podem ser
 *                      inseridas com "\n" para dividir em linhas.
 * @returns {string} URL de dados (data:image/png;base64,...) para uso em img.src
 */
function createBanner(text) {
    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 300;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // Fundo em gradiente vertical seguindo as cores base do jogo
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#2d1b4e');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    // Moldura
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    // Texto
    ctx.fillStyle = '#ffa500';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Ajuste de fonte: tamanho diminui em dispositivos menores
    let fontSize = 36;
    ctx.font = `bold ${fontSize}px Arial`;
    const lines = text.split('\n');
    const lineHeight = 44;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });
    return canvas.toDataURL('image/png');
}

// Pré-cria os banners de vitória e derrota
const bannerWin = createBanner('VOCÊ GANHOU\n6 JOIAS GRÁTIS');
const bannerLose = createBanner('VOCÊ PERDEU');

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================

let attemptsLeft = 5;
let currentAttempt = 0;
let isSpinning = false;
// Vitória quando a imagem selecionada for o pote de 5 brindes
const WIN_NAME = 'pote-5brindes';

// As funções getWinIndex e pickTargetIndex são definidas acima, junto com a
// seleção da rodada vencedora (predeterminedWinAttempt).
// ========================================
// ELEMENTOS DOM
// ========================================

const spinButton = document.getElementById('spinButton');
const attemptsDisplay = document.getElementById('attempts');
const encouragement = document.getElementById('encouragement');
const prizeModal = document.getElementById('prizeModal');
const rulesModal = document.getElementById('rulesModal');
const nextRoundButton = document.getElementById('nextRoundButton');
const rulesLink = document.getElementById('rulesLink');
const closeRulesButton = document.getElementById('closeRulesButton');
const prizeBannerImg = document.getElementById('prizeBannerImg');
const reels = [
    document.getElementById('reel1')
];

// ========================================
// INICIALIZAÇÃO
// ========================================

// Carregar símbolos nas bobinas
function loadSymbols() {
    reels.forEach(reel => {
        const symbolElements = reel.querySelectorAll('.symbol-img');
        symbolElements.forEach((img, index) => {
            img.onerror = () => { img.src = fallbackSymbols[index]; };
            img.src = symbols[index];
        });
    });
}

// Inicializar o jogo
function init() {
    loadSymbols();
    updateAttemptsDisplay();
    updateEncouragement();
}

// ========================================
// FUNÇÕES DE ATUALIZAÇÃO DE UI
// ========================================

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
    } else if (currentAttempt === 3) {
        encouragement.textContent = 'Próxima rodada é especial! 🎁';
    } else {
        encouragement.textContent = messages[Math.min(currentAttempt, messages.length - 1)];
    }
}

// ========================================
// FUNÇÃO PRINCIPAL DE GIRAR
// ========================================

async function spin() {
    if (isSpinning || attemptsLeft === 0) return;
    
    isSpinning = true;
    spinButton.disabled = true;
    currentAttempt++;
    attemptsLeft--;
    
    // Tocar som de girar
    try {
        sounds.spin.currentTime = 0;
        sounds.spin.play().catch(e => console.log('Erro ao tocar som:', e));
    } catch (e) {
        console.log('Erro ao tocar som:', e);
    }
    
    // Adicionar classe de animação
    // Preparar rotação: animar a tira do reel (compatível desktop/mobile)
    reels.forEach(reel => {
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
        void reel.offsetHeight; // reflow
        reel.classList.add('spinning');
        const img = reel.querySelector('.symbol-img');
        if (img) img.classList.add('spinning');
    });
    
    // Simular tempo de giro
    await sleep(2000);
    
    // Parar as bobinas uma por uma
    let isWin = false;
    for (let i = 0; i < reels.length; i++) {
        await sleep(300);
        const reel = reels[i];
        reel.classList.remove('spinning');
        const img = reel.querySelector('.symbol-img');
        if (img) img.classList.remove('spinning');
        // Determinar o símbolo final usando a lógica de rodada premiada
        const targetIndex = pickTargetIndex(currentAttempt);
        // Parar suavemente no símbolo escolhido (cada símbolo = 20% da altura do reel)
        const stopPct = -targetIndex * 20; // -20%, -40%, ...
        reel.style.transition = 'transform 300ms ease-out';
        reel.style.transform = `translateY(${stopPct}%)`;
        if (targetIndex === getWinIndex()) {
            isWin = true;
        }
    }
    
    // Aguardar um pouco antes de mostrar o resultado
    await sleep(500);
    
    // Mostrar resultado baseado no símbolo sorteado (1 vencedor, 4 perdas)
    showPrizeModal(isWin);
    
    // Atualizar displays
    updateAttemptsDisplay();
    updateEncouragement();
    
    isSpinning = false;
    
    // Reabilitar botão se ainda houver tentativas
    if (attemptsLeft > 0) {
        spinButton.disabled = false;
    } else {
        spinButton.textContent = 'FIM DE JOGO';
    }
}

// ========================================
// FUNÇÕES DE MODAL
// ========================================

function showPrizeModal(isWin) {
    // Tocar som apropriado
    try {
        if (isWin) {
            sounds.win.currentTime = 0;
            sounds.win.play().catch(e => console.log('Erro ao tocar som:', e));
        } else {
            sounds.lose.currentTime = 0;
            sounds.lose.play().catch(e => console.log('Erro ao tocar som:', e));
        }
    } catch (e) {
        console.log('Erro ao tocar som:', e);
    }
    
    // Configurar banner e texto do botão de acordo com vitória/derrota
    if (isWin) {
        prizeBannerImg.src = bannerWin;
        prizeBannerImg.alt = 'VOCÊ GANHOU 6 JOIAS GRÁTIS';
        // Se ainda houver tentativas, o usuário pode visualizar o prêmio e continuar
        nextRoundButton.textContent = attemptsLeft > 0 ? 'VER MEU PRÊMIO' : 'Fechar';
    } else {
        prizeBannerImg.src = bannerLose;
        prizeBannerImg.alt = 'VOCÊ PERDEU';
        nextRoundButton.textContent = attemptsLeft > 0 ? 'TENTAR NOVAMENTE' : 'Fechar';
    }
    
    // Mostrar modal
    prizeModal.classList.add('show');
}

function closePrizeModal() {
    prizeModal.classList.remove('show');
}

function showRulesModal() {
    rulesModal.classList.add('show');
}

function closeRulesModal() {
    rulesModal.classList.remove('show');
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// EVENT LISTENERS
// ========================================

spinButton.addEventListener('click', spin);

nextRoundButton.addEventListener('click', () => {
    closePrizeModal();
    if (attemptsLeft === 0) {
        // Reiniciar jogo
        attemptsLeft = 5;
        currentAttempt = 0;
        spinButton.disabled = false;
        spinButton.textContent = 'GIRAR';
        // Sortear nova rodada vencedora
        predeterminedWinAttempt = Math.floor(Math.random() * 5) + 1;
        updateAttemptsDisplay();
        updateEncouragement();
    }
});

rulesLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRulesModal();
});

closeRulesButton.addEventListener('click', closeRulesModal);

// Fechar modais ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target === prizeModal) {
        closePrizeModal();
    }
    if (e.target === rulesModal) {
        closeRulesModal();
    }
});

// ========================================
// INICIAR JOGO
// ========================================

init();

