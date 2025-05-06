// 28개의 이미지 배열 생성
const images = [
    'images/face1.jpg',
    'images/face2.jpg',
    'images/face3.jpg',
    'images/face4.jpg',
    'images/face5.jpg',
    'images/face6.jpg',
    'images/face7.jpg',
    'images/face8.jpg',
    'images/face9.jpg',
    'images/face10.jpg',
    'images/face11.jpg',
    'images/face12.jpg',
    'images/face13.jpg',
    'images/face14.jpg',
    'images/face15.jpg',
    'images/face16.jpg',
    'images/face17.jpg',
    'images/face18.jpg',
    'images/face19.jpg',
    'images/face20.jpg',
    'images/face21.jpg',
    'images/face22.jpg',
    'images/face23.jpg',
    'images/face24.jpg',
    'images/face25.jpg',
    'images/face26.jpg',
    'images/face27.jpg',
    'images/face28.jpg'
];

// 효과음
const sounds = {
    match: new Audio('sounds/theatres.mp3'),
    wrong: new Audio('sounds/outdoor.mp3'),
    complete: new Audio('sounds/morse_code.mp3')
};

// 배경음악
const backgroundMusic = new Audio('sounds/rally_x.mp3');
backgroundMusic.loop = true;  // 반복 재생 설정
let isMusicPlaying = false;  // 음악 재생 상태 추적

// 모스코드 소리 설정
sounds.complete.loop = true;  // 모스코드 소리 반복 설정

// 게임 상태 변수
let cards = [];
let flippedCards = [];
let moves = 0;
let matchedPairs = 0;
let score = 0;
let hintCount = 0;
let hintAvailable = false;
let isPaused = false;
let isFirstClick = true;
let timeLeft = 300; // 5분 = 300초
let timerInterval = null;
let morseSound = null; // 모스코드 소리 객체 추가
let currentUserName = '';

// 초기 가상 순위 데이터
const initialRankings = [
    { name: "Master", score: 2800 },
    { name: "Pro", score: 2500 },
    { name: "Expert", score: 2200 },
    { name: "Ace", score: 2000 },
    { name: "Star", score: 1800 },
    { name: "Hero", score: 1600 },
    { name: "Champ", score: 1400 },
    { name: "Rookie", score: 1200 },
    { name: "Newbie", score: 1000 },
    { name: "Beginner", score: 800 }
];

// DOM 요소
const userForm = document.getElementById('user-form');
const gameContent = document.getElementById('game-content');
const userNameInput = document.getElementById('user-name');
const startGameButton = document.getElementById('start-game');
const rankingList = document.getElementById('ranking-list');
const gameBoard = document.getElementById('game-board');
const movesCount = document.getElementById('moves-count');
const scoreCount = document.getElementById('score-count');
const timeCount = document.getElementById('time-count');
const hintButton = document.getElementById('hint');
const pauseButton = document.getElementById('pause');
const resumeButton = document.getElementById('resume');
const pauseOverlay = document.getElementById('pause-overlay');
const restartButton = document.getElementById('restart');
const playAgainButton = document.getElementById('play-again');
const tryAgainButton = document.getElementById('try-again');
const gameComplete = document.getElementById('game-complete');
const gameFailure = document.getElementById('game-failure');
const finalMoves = document.getElementById('final-moves');
const finalScore = document.getElementById('final-score');

// 효과음 재생 함수
function playSound(soundName) {
    if (isPaused) return;
    
    try {
        const sound = sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.log('효과음 재생 실패:', error);
            });

            // 모스코드 소리를 제외한 효과음은 5초 후 자동 중지
            if (soundName !== 'complete') {
                setTimeout(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }, 5000);
            }
        }
    } catch (error) {
        console.log('효과음 처리 중 오류:', error);
    }
}

// 타이머 업데이트 함수
function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeCount.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 타이머 시작 함수
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 300;
    updateTimer();
    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleGameFailure();
            }
        }
    }, 1000);
}

// 순위 데이터 로드
function loadRankings() {
    let rankings = JSON.parse(localStorage.getItem('rankings')) || [];
    
    // 저장된 순위가 없으면 초기 가상 순위 데이터 사용
    if (rankings.length === 0) {
        rankings = initialRankings;
        localStorage.setItem('rankings', JSON.stringify(rankings));
    }
    
    updateRankingDisplay(rankings);
}

// 순위 데이터 저장
function saveRanking(name, score) {
    let rankings = JSON.parse(localStorage.getItem('rankings')) || initialRankings;
    const timeUsed = 300 - timeLeft; // 사용한 시간 계산 (초 단위)
    const minutes = Math.floor(timeUsed / 60);
    const seconds = timeUsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    rankings.push({ 
        name, 
        score,
        time: timeString,
        timeInSeconds: timeUsed // 정렬을 위한 시간 정보
    });
    
    // 점수가 같을 경우 시간이 빠른 순으로 정렬
    rankings.sort((a, b) => {
        if (b.score === a.score) {
            return (a.timeInSeconds || Infinity) - (b.timeInSeconds || Infinity);
        }
        return b.score - a.score;
    });
    
    rankings = rankings.slice(0, 10); // 상위 10개만 유지
    localStorage.setItem('rankings', JSON.stringify(rankings));
    updateRankingDisplay(rankings);
}

// 순위 표시 업데이트
function updateRankingDisplay(rankings) {
    rankingList.innerHTML = '';
    rankings.forEach((rank, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.innerHTML = `
            <span class="ranking-rank">${index + 1}</span>
            <span class="ranking-name">${rank.name}</span>
            <span class="ranking-score">${rank.score}</span>
            ${rank.time ? `<span class="ranking-time">${rank.time}</span>` : ''}
        `;
        rankingList.appendChild(item);
    });
}

// 배경음악 재생 함수
function playBackgroundMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.volume = 0.5; // 볼륨 조절
        backgroundMusic.play()
            .then(() => {
                isMusicPlaying = true;
                console.log('배경음악 재생 시작');
            })
            .catch(error => {
                console.log('배경음악 재생 실패:', error);
                // 사용자 상호작용 후 재시도
                document.addEventListener('click', () => {
                    if (!isMusicPlaying) {
                        playBackgroundMusic();
                    }
                }, { once: true });
            });
    }
}

// 배경음악 중지 함수
function stopBackgroundMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        isMusicPlaying = false;
        console.log('배경음악 중지');
    }
}

// 게임 시작 처리
function startGame() {
    const name = userNameInput.value.trim();
    if (name === '') {
        alert('이름을 입력해주세요!');
        return;
    }
    currentUserName = name;
    userForm.style.display = 'none';
    gameContent.style.display = 'block';
    stopBackgroundMusic();  // 배경음악 중지
    sounds.complete.play();  // 모스코드 소리 시작
    initializeGame();
}

// 게임 초기화
function initializeGame() {
    stopBackgroundMusic();  // 배경음악 중지
    isFirstClick = true;
    morseSound = null;
    startTimer();

    cards = [...images, ...images]
        .sort(() => Math.random() - 0.5)
        .map((image, index) => ({
            id: index,
            image,
            isFlipped: false,
            isMatched: false
        }));

    gameBoard.innerHTML = '';
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = 'Face';
        cardFront.appendChild(img);
        
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        cardElement.appendChild(cardFront);
        cardElement.appendChild(cardBack);
        
        cardElement.addEventListener('click', () => flipCard(card.id));
        gameBoard.appendChild(cardElement);
    });

    flippedCards = [];
    moves = 0;
    matchedPairs = 0;
    score = 0;
    hintCount = 0;
    hintAvailable = false;
    isPaused = false;
    movesCount.textContent = moves;
    scoreCount.textContent = score;
    hintButton.disabled = true;
    pauseButton.textContent = 'Pause';
    pauseOverlay.classList.remove('show');
    gameComplete.classList.remove('show');
    gameFailure.classList.remove('show');
}

// 카드 뒤집기
function flipCard(cardId) {
    if (isPaused) return;
    
    // 첫 카드 클릭 시 모스코드 소리 재생 부분 제거
    if (isFirstClick) {
        isFirstClick = false;
    }
    
    const card = cards[cardId];
    const cardElement = document.querySelector(`[data-id="${cardId}"]`);
    
    // 이미 뒤집혀있거나 매칭된 카드는 무시
    if (card.isFlipped || card.isMatched || flippedCards.length >= 2) return;
    
    // 카드 뒤집기
    card.isFlipped = true;
    cardElement.classList.add('flipped');
    flippedCards.push(cardId);
    
    // 두 장의 카드가 뒤집혔을 때
    if (flippedCards.length === 2) {
        moves++;
        movesCount.textContent = moves;
        
        const [first, second] = flippedCards;
        if (cards[first].image === cards[second].image) {
            // 매칭 성공
            cards[first].isMatched = true;
            cards[second].isMatched = true;
            matchedPairs++;
            score += 100;
            playSound('match');
            
            document.querySelector(`[data-id="${first}"]`).classList.add('matched');
            document.querySelector(`[data-id="${second}"]`).classList.add('matched');
            
            flippedCards = [];
            scoreCount.textContent = score;
            
            if (matchedPairs % 3 === 0) {
                hintCount++;
                hintAvailable = true;
                hintButton.disabled = false;
            }
            
            if (matchedPairs === 28) {
                clearInterval(timerInterval); // 타이머 중지
                setTimeout(() => {
                    playSound('complete');
                    finalMoves.textContent = moves;
                    finalScore.textContent = score;
                    gameComplete.classList.add('show');
                    saveRanking(currentUserName, score);
                }, 500);
            }
        } else {
            // 매칭 실패
            score = Math.max(0, score - 10);
            playSound('wrong');
            scoreCount.textContent = score;
            
            setTimeout(() => {
                cards[first].isFlipped = false;
                cards[second].isFlipped = false;
                document.querySelector(`[data-id="${first}"]`).classList.remove('flipped');
                document.querySelector(`[data-id="${second}"]`).classList.remove('flipped');
                flippedCards = [];
            }, 1000);
        }
    }
}

// 힌트 사용
function useHint() {
    if (!hintAvailable || hintCount <= 0) return;
    
    // 아직 매칭되지 않은 카드들 중에서 랜덤하게 한 쌍을 보여줌
    const unmatchedCards = cards.filter(card => !card.isMatched);
    if (unmatchedCards.length >= 2) {
        const randomIndex = Math.floor(Math.random() * (unmatchedCards.length / 2)) * 2;
        const card1 = unmatchedCards[randomIndex];
        const card2 = unmatchedCards[randomIndex + 1];
        
        // 카드 잠시 보여주기
        const card1Element = document.querySelector(`[data-id="${card1.id}"]`);
        const card2Element = document.querySelector(`[data-id="${card2.id}"]`);
        
        card1Element.classList.add('flipped');
        card2Element.classList.add('flipped');
        
        setTimeout(() => {
            card1Element.classList.remove('flipped');
            card2Element.classList.remove('flipped');
        }, 1000);
        
        hintCount--;
        hintAvailable = hintCount > 0;
        hintButton.disabled = !hintAvailable;
    }
}

// 게임 일시정지
function togglePause() {
    isPaused = !isPaused;
    pauseOverlay.classList.toggle('show');
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    
    // 일시정지 시 모든 소리 중지
    if (isPaused) {
        // 모스코드 소리 중지
        sounds.complete.pause();
        // 다른 효과음들 중지
        Object.keys(sounds).forEach(key => {
            if (key !== 'complete') {
                sounds[key].pause();
                sounds[key].currentTime = 0;
            }
        });
    } else {
        // 재개 시 모스코드 소리 다시 재생
        sounds.complete.play().catch(error => {
            console.log('모스코드 소리 재생 실패:', error);
        });
    }
}

// 게임 실패 처리
function handleGameFailure() {
    clearInterval(timerInterval);
    gameContent.style.display = 'none';
    gameFailure.style.display = 'block';
    sounds.complete.pause();  // 모스코드 소리 중지
    stopBackgroundMusic();
}

// 이벤트 리스너
startGameButton.addEventListener('click', startGame);
restartButton.addEventListener('click', () => {
    userForm.style.display = 'block';
    gameContent.style.display = 'none';
    playBackgroundMusic();  // 배경음악 재생
});

playAgainButton.addEventListener('click', () => {
    gameComplete.classList.remove('show');
    gameContent.style.display = 'block';
    sounds.complete.play();  // 모스코드 소리 시작
    initializeGame();
});

tryAgainButton.addEventListener('click', () => {
    gameFailure.style.display = 'none';
    gameContent.style.display = 'block';
    sounds.complete.play();  // 모스코드 소리 다시 시작
    initializeGame();
});

hintButton.addEventListener('click', useHint);
pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', togglePause);

// 초기 순위 로드
loadRankings();

// 게임 시작
initializeGame();

// 페이지 로드 시 배경음악 재생 시도
window.addEventListener('load', () => {
    // 배경음악 미리 로드
    backgroundMusic.load();
    // 즉시 자동 재생 시도
    playBackgroundMusic();
});

// 페이지 언로드 시 배경음악 정리
window.addEventListener('beforeunload', () => {
    stopBackgroundMusic();
}); 