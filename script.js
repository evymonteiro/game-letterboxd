const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Carregar imagens e áudio
const imgPlayer = new Image();
const imgObstacle = new Image();
const imgSlowdown = new Image();
const imgBackground = new Image();
const bgMusic = new Audio();
const collectSound = new Audio();

// Definir sources 
imgPlayer.src = 'player.png';      
imgObstacle.src = 'clt.png';
imgSlowdown.src = 'jones.png';
imgBackground.src = 'background.png';
bgMusic.src = 'music.mp3';
collectSound.src = 'collect.mp3';

// Configurações de áudio
bgMusic.loop = true;
bgMusic.volume = 0.5;
let gameStarted = false;
collectSound.volume = 0.7;

// Objetos do jogo / CLT
const player = {
  x: 280,
  y: 350,
  width: 80,
  height: 80,
  vx: 0,
  vy: 0,
  onGround: true
};

let gravity = 0.6;
let jumpStrength = -10;
let speed = 4;
let obstacles = [];
let slowdownItems = [];
let obstacleSpeed = 2;
let frame = 0;
let score = 0;
let gameOver = false;
let buffsCollected = 0;

//Balanceamento do bonus por probabilidade.
let obstacleSpawnRate = 1;
const initialDelay = 10 * 60;  //primeiro bonus
const cooldown = 20 * 60; // segundo bonus
const probPeriod = 30 * 60; //inicio dos bonus por probabilidade
const slowdownChance = 0.4; //chance de receber o bonus
const baseSpeed = 2;  
const growthFactor = 0.5;

let firstSlowdownGiven = false;
let secondSlowdownGiven = false;
let lastSlowdownTime = 0;
let currentProbWindowStart = initialDelay + cooldown; //inicio da janela de probabilidade
let slowdownGivenInThisWindow = false;

// Tela inicial: 

function showStartScreen() {  
  const startContainer = document.createElement('div');
  startContainer.style.position = 'fixed';
  startContainer.style.top = '0';
  startContainer.style.left = '0';
  startContainer.style.width = '100%';
  startContainer.style.height = '100%';
  startContainer.style.display = 'flex';
  startContainer.style.flexDirection = 'column';
  startContainer.style.justifyContent = 'center';
  startContainer.style.alignItems = 'center';
  startContainer.style.zIndex = '100';
  startContainer.style.background = 'rgba(0,0,0,0.6)';
  startContainer.style.backdropFilter = 'blur(3px)';
  startContainer.id = 'startContainer';

  // Título do jogo
  const title = document.createElement('h1');
  title.textContent = 'TRABALHAR NÃO DÁ REVIEW NO LETTERBOXD';
  title.style.color = '#fff';
  title.style.fontFamily = '"Arial Black", sans-serif';
  title.style.fontSize = '3rem';
  title.style.textShadow = '0 0 10px rgba(82, 5, 5, 0.8)';
  title.style.marginBottom = '2rem';
  title.style.letterSpacing = '2px';

  // Botão de start
  const startButton = document.createElement('button');
  startButton.textContent = 'Start!';
  startButton.style.padding = '15px 40px';
  startButton.style.fontSize = '1.5rem';
  startButton.style.fontWeight = 'bold';
  startButton.style.backgroundColor = 'rgb(108, 95, 95)';
  startButton.style.color = 'white';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '50px';
  startButton.style.cursor = 'pointer';
  startButton.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  startButton.style.transition = 'all 0.3s ease';
  startButton.style.position = 'relative';
  startButton.style.overflow = 'hidden';

  // Efeito hover no botão
  startButton.addEventListener('mouseover', () => {
    startButton.style.transform = 'translateY(-3px)';
    startButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
    startButton.style.backgroundColor = 'rgb(108, 95, 95)';
  });

  startButton.addEventListener('mouseout', () => {
    startButton.style.transform = 'translateY(0)';
    startButton.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    startButton.style.backgroundColor = 'rgb(108, 95, 95)';
  });

  // Efeito de clique
  startButton.addEventListener('mousedown', () => {
    startButton.style.transform = 'translateY(2px)';
  });

  startButton.addEventListener('mouseup', () => {
    startButton.style.transform = 'translateY(-3px)';
  });

  // Ao clicar no botão
  startButton.addEventListener('click', () => {
    bgMusic.play().then(() => {
      startContainer.style.opacity = '0';
      startContainer.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(startContainer);
        gameStarted = true;
        gameLoop();
      }, 500);
    }).catch(error => {
      console.error("Erro ao iniciar música:", error);
      startButton.textContent = 'CLIQUE NOVAMENTE';
      startButton.style.backgroundColor = 'rgb(108, 95, 95)';
    });
  });

  startContainer.appendChild(title);
  startContainer.appendChild(startButton);
  document.body.appendChild(startContainer);

  // Desenha o background 
  drawBackground();
}

// Desenhar background 
function drawBackground() {
  ctx.drawImage(imgBackground, 0, 0, canvas.width, canvas.height);
}

// Mostrar tela inicial assim que a página carregar
window.addEventListener('load', () => {
  showStartScreen();
});

// Controles
document.addEventListener("keydown", (e) => {
  if (!gameStarted || gameOver) return;
  
  if (e.key === "ArrowLeft") player.vx = -speed;
  if (e.key === "ArrowRight") player.vx = speed;
  if (e.key === "ArrowUp" && player.onGround) {
    player.vy = jumpStrength;
    player.onGround = false;
  }
});

document.addEventListener("keyup", () => player.vx = 0);

// Obstáculos 
function spawnObstacle() {
  obstacles.push({
    x: Math.random() * (canvas.width - 60),
    y: 0,
    width: 50,
    height: 50,
  });
}

function spawnSlowdown() {
  slowdownItems.push({
    x: Math.random() * (canvas.width - 60),
    y: 0,
    width: 70,
    height: 70,
  });
}

// MELHORIA DA HITBOX 

function checkCollision(a, b, scale = 1) {
  const ax = a.x + (1 - scale) * a.width / 2;
  const ay = a.y + (1 - scale) * a.height / 2;
  const aw = a.width * scale;
  const ah = a.height * scale;

  const bx = b.x + (1 - scale) * b.width / 2;
  const by = b.y + (1 - scale) * b.height / 2;
  const bw = b.width * scale;
  const bh = b.height * scale;

  return ax < bx + bw &&
         ax + aw > bx &&
         ay < by + bh &&
         ay + ah > by;
}

// Atualizações que acontecem dentro do game / gameplay
function update() {
  if (gameOver || !gameStarted) return;

  frame++;
  score++;

 // Queda dos obstáculos: 

  if (frame % Math.floor(60 / obstacleSpawnRate) === 0) {
    spawnObstacle();
  }

  if (frame % 120 === 0) {
    obstacleSpawnRate = 2 + 0.5 * Math.sqrt(frame / 180);
  }
// Aumento da velocidade em que os obstáculos caem, função da raiz quadrada. 
  obstacleSpeed = baseSpeed + growthFactor * Math.sqrt(frame / 60);

  //Buffs - Diminui a velocidade: 

  if (!firstSlowdownGiven && frame >= initialDelay) {
    spawnSlowdown();
    firstSlowdownGiven = true;
    lastSlowdownTime = frame;
  } else if (!secondSlowdownGiven && frame >= initialDelay + cooldown) {
    spawnSlowdown();
    secondSlowdownGiven = true;
    lastSlowdownTime = frame;
    currentProbWindowStart = frame;
    slowdownGivenInThisWindow = false;
  } else {
    if (frame >= currentProbWindowStart + probPeriod) {
      currentProbWindowStart = frame;
      slowdownGivenInThisWindow = false;
    }
    if (!slowdownGivenInThisWindow && frame >= currentProbWindowStart) {
      if (Math.random() < slowdownChance) {
        spawnSlowdown();
        slowdownGivenInThisWindow = true;
        lastSlowdownTime = frame;
      }
    }
  }
  player.x += player.vx;
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

  player.y += player.vy;
  player.vy += gravity;

  if (player.y + player.height >= canvas.height) {
    player.y = canvas.height - player.height;
    player.vy = 0;
    player.onGround = true;
  }
// ajuste da hitbox - favorecendo o player
 for (let o of obstacles) {
  o.y += obstacleSpeed;
  if (checkCollision(player, o, 0.7)) {
    gameOver = true;
    bgMusic.pause();
    showGameOver();
  }
}
 // hitbox mantidade 1:1 - favorecendo o player. 
  for (let i = slowdownItems.length - 1; i >= 0; i--) {
  let item = slowdownItems[i];
  item.y += 2;
  if (checkCollision(player, item, 1)) {
    obstacleSpeed = Math.max(1, obstacleSpeed * 0.9);
    slowdownItems.splice(i, 1);
    buffsCollected++;
    collectSound.play();
  }
}

}

// Mostrar tela de game over
function showGameOver() {
  const gameOverScreen = document.createElement('div');
  gameOverScreen.style.position = 'fixed';
  gameOverScreen.style.top = '0';
  gameOverScreen.style.left = '0';
  gameOverScreen.style.width = '100%';
  gameOverScreen.style.height = '100%';
  gameOverScreen.style.display = 'flex';
  gameOverScreen.style.flexDirection = 'column';
  gameOverScreen.style.justifyContent = 'center';
  gameOverScreen.style.alignItems = 'center';
  gameOverScreen.style.zIndex = '100';
  gameOverScreen.style.background = 'rgba(0,0,0,0.8)';
  gameOverScreen.style.backdropFilter = 'blur(5px)';
  gameOverScreen.style.color = 'white';
  gameOverScreen.style.fontFamily = 'Arial, sans-serif';

  const gameOverText = document.createElement('h1');
  gameOverText.textContent = 'GAME OVER';
  gameOverText.style.fontSize = '4rem';
  gameOverText.style.color = '#ff5555';
  gameOverText.style.textShadow = '0 0 10pxrgb(169, 9, 9)';
  gameOverText.style.marginBottom = '1rem';

  const scoreText = document.createElement('div');
  scoreText.textContent = `Pontuação: ${score}`;
  scoreText.style.fontSize = '2rem';
  scoreText.style.marginBottom = '2rem';

  const restartButton = document.createElement('button');
  restartButton.textContent = 'JOGAR NOVAMENTE';
  restartButton.style.padding = '15px 40px';
  restartButton.style.fontSize = '1.2rem';
  restartButton.style.fontWeight = 'bold';
  restartButton.style.backgroundColor = 'rgb(108, 95, 95)';
  restartButton.style.color = 'white';
  restartButton.style.border = 'none';
  restartButton.style.borderRadius = '50px';
  restartButton.style.cursor = 'pointer';
  restartButton.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  restartButton.style.transition = 'all 0.3s ease';

  restartButton.addEventListener('mouseover', () => {
    restartButton.style.transform = 'translateY(-3px)';
    restartButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
    restartButton.style.backgroundColor = 'rgb(125, 97, 97)';
  });

  restartButton.addEventListener('mouseout', () => {
    restartButton.style.transform = 'translateY(0)';
    restartButton.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    restartButton.style.backgroundColor = '#4CAF50';
  });

  restartButton.addEventListener('click', () => {
    location.reload();
  });

  gameOverScreen.appendChild(gameOverText);
  gameOverScreen.appendChild(scoreText);
  gameOverScreen.appendChild(restartButton);
  document.body.appendChild(gameOverScreen);
}

// Desenho
function draw() {
  ctx.drawImage(imgBackground, 0, 0, canvas.width, canvas.height);
  
  if (gameStarted && !gameOver) {
    ctx.drawImage(imgPlayer, player.x, player.y, player.width, player.height);

    for (let o of obstacles) {
      ctx.drawImage(imgObstacle, o.x, o.y, o.width, o.height);
    }

    for (let item of slowdownItems) {
      ctx.drawImage(imgSlowdown, item.x, item.y, item.width, item.height);
    }

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Pontos: " + score, 20, 40);
    ctx.fillText("Tempo: " + Math.floor(frame / 60) + "s", 20, 70);
    ctx.fillText("Absolutes Cinema: " + buffsCollected, 20, 100);
  }
}

// Loop principal
function gameLoop() {
  update();
  draw();
  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}
