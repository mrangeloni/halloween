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

const symbols = [
    'https://via.placeholder.com/200/ff8c00/ffffff?text=🎃',  // Símbolo 1 - Abóbora
    'https://via.placeholder.com/200/8b4513/ffffff?text=🧙',  // Símbolo 2 - Bruxa
    'https://via.placeholder.com/200/2d1b4e/ffffff?text=🍯',  // Símbolo 3 - Caldeirão
    'https://via.placeholder.com/200/1a0033/ffffff?text=🦇',  // Símbolo 4 - Morcego
    'https://via.placeholder.com/200/ffa500/ffffff?text=💰'   // Símbolo 5 - Pote de prêmio
];

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
// VARIÁVEIS GLOBAIS
// ========================================

let attemptsLeft = 5;
let currentAttempt = 0;
let isSpinning = false;

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
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

// ========================================
// INICIALIZAÇÃO
// ========================================

// Carregar símbolos nas bobinas
function loadSymbols() {
    reels.forEach(reel => {
        const symbolElements = reel.querySelectorAll('.symbol-img');
        symbolElements.forEach((img, index) => {
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
    reels.forEach(reel => {
        reel.classList.add('spinning');
    });
    
    // Simular tempo de giro
    await sleep(2000);
    
    // Parar as bobinas uma por uma
    for (let i = 0; i < reels.length; i++) {
        await sleep(300);
        reels[i].classList.remove('spinning');
        
        // Definir símbolo final aleatório
        const randomSymbol = Math.floor(Math.random() * symbols.length);
        const symbolImg = reels[i].querySelector('.symbol-img');
        symbolImg.src = symbols[randomSymbol];
    }
    
    // Aguardar um pouco antes de mostrar o resultado
    await sleep(500);
    
    // Verificar se é a 4ª tentativa (mega prêmio)
    const isMegaPrize = currentAttempt === 4;
    
    // Mostrar modal de prêmio
    showPrizeModal(isMegaPrize);
    
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

function showPrizeModal(isMegaPrize) {
    // Tocar som apropriado
    try {
        if (isMegaPrize) {
            sounds.win.currentTime = 0;
            sounds.win.play().catch(e => console.log('Erro ao tocar som:', e));
        } else {
            sounds.lose.currentTime = 0;
            sounds.lose.play().catch(e => console.log('Erro ao tocar som:', e));
        }
    } catch (e) {
        console.log('Erro ao tocar som:', e);
    }
    
    // Configurar banner de prêmio
    // NOTA: Você deve configurar diferentes banners para cada tipo de prêmio
    // Por enquanto, usamos um placeholder
    if (isMegaPrize) {
        prizeBannerImg.src = 'https://via.placeholder.com/600x300/ffa500/ffffff?text=MEGA+PRÊMIO!+🎁';
        prizeBannerImg.alt = 'Mega Prêmio!';
    } else {
        const prizeMessages = [
            'Você ganhou um brinde! 🎃',
            'Parabéns! Prêmio especial! 🎁',
            'Você ganhou um desconto! 💰',
            'Prêmio surpresa! 🎉'
        ];
        const randomPrize = prizeMessages[Math.floor(Math.random() * prizeMessages.length)];
        prizeBannerImg.src = `https://via.placeholder.com/600x300/8b4513/ffffff?text=${encodeURIComponent(randomPrize)}`;
        prizeBannerImg.alt = randomPrize;
    }
    
    // Mostrar modal
    prizeModal.classList.add('show');
    
    // Configurar texto do botão
    if (attemptsLeft > 0) {
        nextRoundButton.textContent = 'Próxima rodada';
    } else {
        nextRoundButton.textContent = 'Fechar';
    }
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

