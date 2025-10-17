// ========================================
// CONFIGURAÇÃO DE IMAGENS
// ========================================

// Caminhos locais esperados (adicione seus arquivos em assets/symbols/)
const localSymbols = [
    'assets/symbols/abobora-sempremio.png',   // Símbolo 1 - Abóbora sem prêmio
    'assets/symbols/bruxa-sempremio.png',     // Símbolo 2 - Bruxa sem prêmio
    'assets/symbols/caveira-sempremio.png',   // Símbolo 3 - Caveira sem prêmio
    'assets/symbols/morcegos-sempremio.png',  // Símbolo 4 - Morcegos sem prêmio
    'assets/symbols/pote-5brindes.png'        // Símbolo 5 - Pote de 5 brindes (IMAGEM VENCEDORA)
];

// Placeholders usados como fallback caso a imagem local não exista
const fallbackSymbols = [
    'https://via.placeholder.com/200/ff8c00/ffffff?text=🎃',  // Abóbora
    'https://via.placeholder.com/200/8b4513/ffffff?text=🧙',  // Bruxa
    'https://via.placeholder.com/200/2d1b4e/ffffff?text=💀',  // Caveira
    'https://via.placeholder.com/200/1a0033/ffffff?text=🦇',  // Morcego
    'https://via.placeholder.com/200/ffa500/ffffff?text=💰'   // Pote de prêmio
];

// Array efetivo de símbolos que o jogo usa
const symbols = localSymbols;
const WIN_SYMBOL_INDEX = symbols.findIndex(src => src.includes('pote-5brindes'));

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
let currentSpinCount = 0;
let isSpinning = false;
let hasWonInCurrentSet = false; // Garante que a vitória aconteça uma vez a cada 5 tentativas

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
const prizeModalText = document.getElementById('prizeModalText'); // Novo elemento para o texto do popup

const reelsContainer = document.querySelector('.reels-container');
const numReels = 3; // Número de rolos
let symbolPixelHeight; // Altura de cada símbolo em pixels, será definida dinamicamente

// ========================================
// INICIALIZAÇÃO
// ========================================

function createReels() {
    reelsContainer.innerHTML = ''; // Limpar rolos existentes
    for (let i = 0; i < numReels; i++) {
        const reelViewport = document.createElement('div');
        reelViewport.classList.add('reel-viewport');

        const reel = document.createElement('div');
        reel.classList.add('reel');
        reel.id = `reel${i + 1}`;

        // Adicionar símbolos ao rolo (repetir para criar o efeito de bobina)
        // Adicionamos 3 conjuntos de símbolos para garantir que o giro seja suave
        for (let j = 0; j < 3; j++) { 
            symbols.forEach((src, idx) => {
                const symbolDiv = document.createElement('div');
                symbolDiv.classList.add('symbol');
                const img = document.createElement('img');
                img.src = src;
                img.alt = `Símbolo ${idx + 1}`;
                img.classList.add('symbol-img');
                img.onerror = () => { img.src = fallbackSymbols[idx]; };
                symbolDiv.appendChild(img);
                reel.appendChild(symbolDiv);
            });
        }
        reelViewport.appendChild(reel);
        reelsContainer.appendChild(reelViewport);
    }
    // Após a criação, calcula a altura de um símbolo
    const firstSymbol = document.querySelector('.reel-viewport .symbol');
    if (firstSymbol) {
        symbolPixelHeight = firstSymbol.offsetHeight; // Obtém a altura renderizada
    }
}

function init() {
    createReels();
    updateAttemptsDisplay();
    updateEncouragement();
    hasWonInCurrentSet = false; // Resetar estado de vitória ao iniciar/reiniciar o jogo
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
    } else {
        encouragement.textContent = messages[Math.min(currentSpinCount, messages.length - 1)];
    }
}

// ========================================
// FUNÇÃO PRINCIPAL DE GIRAR
// ========================================

async function spin() {
    if (isSpinning || attemptsLeft === 0) return;
    
    isSpinning = true;
    spinButton.disabled = true;
    currentSpinCount++;
    attemptsLeft--;
    
    // Tocar som de girar
    try {
        sounds.spin.currentTime = 0;
        sounds.spin.play().catch(e => console.log('Erro ao tocar som:', e));
    } catch (e) {
        console.log('Erro ao tocar som:', e);
    }
    
    const reels = document.querySelectorAll('.reel');
    let finalSymbols = [];
    let currentRoundWin = false;

    // Lógica para garantir uma vitória a cada 5 tentativas
    // A vitória é garantida na 4ª tentativa se ainda não tiver ocorrido
    if (currentSpinCount === 4 && !hasWonInCurrentSet) {
        finalSymbols = Array(numReels).fill(WIN_SYMBOL_INDEX); // Força vitória
        currentRoundWin = true;
        hasWonInCurrentSet = true;
    } else {
        // Se já ganhou nesta rodada de 5, as próximas são derrotas até o reset
        if (hasWonInCurrentSet) {
            currentRoundWin = false;
            for (let i = 0; i < numReels; i++) {
                let symbolIndex = Math.floor(Math.random() * symbols.length);
                // Garante que não será o símbolo de vitória
                while (symbolIndex === WIN_SYMBOL_INDEX) {
                    symbolIndex = Math.floor(Math.random() * symbols.length);
                }
                finalSymbols.push(symbolIndex);
            }
        } else {
            // 20% de chance de vitória em outras tentativas (se ainda não ganhou)
            if (Math.random() < 0.2) {
                currentRoundWin = true;
                hasWonInCurrentSet = true;
                finalSymbols = Array(numReels).fill(WIN_SYMBOL_INDEX);
            } else {
                currentRoundWin = false;
                for (let i = 0; i < numReels; i++) {
                    let symbolIndex = Math.floor(Math.random() * symbols.length);
                    // Garante que não será o símbolo de vitória
                    while (symbolIndex === WIN_SYMBOL_INDEX) {
                        symbolIndex = Math.floor(Math.random() * symbols.length);
                    }
                    finalSymbols.push(symbolIndex);
                }
            }
        }
    }
    
    // Iniciar animação de giro para todos os rolos
    reels.forEach(reel => {
        reel.style.transition = 'none';
        reel.style.transform = `translateY(0)`;
        void reel.offsetHeight; // Força reflow para resetar a transição
        reel.classList.add('spinning');
    });

    // Parar os rolos sequencialmente
    for (let i = 0; i < numReels; i++) {
        await sleep(i * 300); // Pequeno atraso entre a parada de cada rolo
        const reel = reels[i];
        reel.classList.remove('spinning');

        // Calcular a posição final para o símbolo alvo
        // Cada rolo tem 3 conjuntos de símbolos. Paramos no segundo conjunto para evitar bordas.
        const targetSymbolOffset = (symbols.length * 1) + finalSymbols[i]; // Posição do símbolo no segundo conjunto
        const stopPosition = -targetSymbolOffset * symbolPixelHeight; // Multiplica pela altura em pixels

        reel.style.transition = 'transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Curva de desaceleração
        reel.style.transform = `translateY(${stopPosition}px)`; 
    }

    await sleep(2000); // Tempo para os rolos pararem completamente
    
    showResultModal(currentRoundWin);
    
    updateAttemptsDisplay();
    updateEncouragement();
    
    isSpinning = false;
    
    // Reabilitar botão se ainda houver tentativas
    if (attemptsLeft > 0) {
        spinButton.disabled = false;
    } else {
        spinButton.textContent = 'FIM DE JOGO';
        spinButton.classList.add('game-over');
    }
}

// ========================================
// FUNÇÕES DE MODAL
// ========================================

function showResultModal(isWin) {
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
    
    // Configurar modal de acordo com vitória ou derrota
    if (isWin) {
        prizeModalText.textContent = 'VOCÊ GANHOU 6 JOIAS GRÁTIS';
        prizeBannerImg.src = 'assets/symbols/pote-5brindes.png'; // Usar a imagem do pote como banner de vitória
        prizeBannerImg.alt = 'Você ganhou 6 joias grátis!';
        nextRoundButton.textContent = 'VER MEU PRÊMIO';
        nextRoundButton.onclick = () => {
            // Ação para ver o prêmio (pode ser um link, etc.)
            alert('Parabéns! Seu prêmio está a caminho!');
            closePrizeModal();
            resetGameIfNoAttempts();
        };
    } else {
        prizeModalText.textContent = 'VOCÊ PERDEU';
        prizeBannerImg.src = 'https://via.placeholder.com/600x300/8b4513/ffffff?text=VOC%C3%8A+PERDEU'; // Placeholder para derrota
        prizeBannerImg.alt = 'Você perdeu!';
        nextRoundButton.textContent = 'TENTAR NOVAMENTE';
        nextRoundButton.onclick = () => {
            closePrizeModal();
            resetGameIfNoAttempts();
        };
    }
    
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

function resetGameIfNoAttempts() {
    if (attemptsLeft === 0) {
        attemptsLeft = 5;
        currentSpinCount = 0;
        hasWonInCurrentSet = false;
        spinButton.disabled = false;
        spinButton.textContent = 'GIRAR';
        spinButton.classList.remove('game-over');
        updateAttemptsDisplay();
        updateEncouragement();
        createReels(); // Recria os rolos para resetar visualmente
    }
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

rulesLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRulesModal();
});

closeRulesButton.addEventListener('click', closeRulesModal);

// Fechar modais ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target === prizeModal) {
        closePrizeModal();
        resetGameIfNoAttempts();
    }
    if (e.target === rulesModal) {
        closeRulesModal();
    }
});

// ========================================
// INICIAR JOGO
// ========================================

init();

