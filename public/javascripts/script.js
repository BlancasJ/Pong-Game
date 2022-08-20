const root = document.getElementById("root");
// Canvas Related 
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
const socket = io("/pong");
let isReferee = false;
let paddleIndex = 0;

let width = 500;
let height = 700;

// Paddle
let paddleHeight = 10;
let paddleWidth = 50;
let paddleDiff = 25;
let paddleX = [ 225, 225 ];
let trajectoryX = [ 0, 0 ];
let playerMoved = false;

// Ball
let ballX = 250;
let ballY = 350;
let ballRadius = 5;
let ballDirection = 1;

// Speed
let speedY = 2;
let speedX = 0;
let computerSpeed = 4;

// Score for Both Players
let score = [ 0, 0 ];

let animateId = null;

let canLeaveRoom = false;

// Create Canvas Element
function createCanvas() {
  canvas.id = 'canvas';
  canvas.width = width;
  canvas.height = height;
  root.appendChild(canvas);
  renderCanvas();
}

const resetVariables = () => {
  isReferee = false;
  paddleIndex = 0;

  width = 500;
  height = 700;

  // Paddle
  paddleHeight = 10;
  paddleWidth = 50;
  paddleDiff = 25;
  paddleX = [ 225, 225 ];
  trajectoryX = [ 0, 0 ];
  playerMoved = false;

  // Ball
  ballX = 250;
  ballY = 350;
  ballRadius = 5;
  ballDirection = 1;

  // Speed
  speedY = 2;
  speedX = 0;
  computerSpeed = 4;

  // Score for Both Players
  score = [ 0, 0 ];
  animateId = null;
  canLeaveRoom = false;
};

// Render Everything on Canvas
function renderCanvas() {
  // Canvas Background
  context.fillStyle = 'black';
  context.fillRect(0, 0, width, height);

  // Paddle Color
  context.fillStyle = 'white';

  // Bottom Paddle
  context.fillRect(paddleX[0], height - 20, paddleWidth, paddleHeight);

  // Top Paddle
  context.fillRect(paddleX[1], 10, paddleWidth, paddleHeight);

  // Dashed Center Line
  context.beginPath();
  context.setLineDash([4]);
  context.moveTo(0, 350);
  context.lineTo(500, 350);
  context.strokeStyle = 'grey';
  context.stroke();

  // Ball
  context.beginPath();
  context.arc(ballX, ballY, ballRadius, 2 * Math.PI, false);
  context.fillStyle = 'white';
  context.fill();

  // Score
  context.font = "32px Courier New";
  context.fillText(score[0], 20, (canvas.height / 2) + 50);
  context.fillText(score[1], 20, (canvas.height / 2) - 30);
}

const multiPlayerHandler = (e) => {
  playerMoved = true;
  paddleX[paddleIndex] = e.offsetX;
  if (paddleX[paddleIndex] < 0) {
    paddleX[paddleIndex] = 0;
  }
  if (paddleX[paddleIndex] > (width - paddleWidth)) {
    paddleX[paddleIndex] = width - paddleWidth;
  }

  socket.emit("paddleMove", {
    xPosition: paddleX[paddleIndex],
  });
  // Hide Cursor
  canvas.style.cursor = 'none';
};

const multiPlayerGame = () => {
  // Wait for Opponents
  function renderIntro() {
    // Canvas Background
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);
    // Intro Text
    context.fillStyle = 'white';
    context.font = "32px Courier New";
    context.fillText("Waiting for opponent...", 20, (canvas.height / 2) - 30);
  }

  // Reset Ball to Center
  function ballReset() {
    ballX = width / 2;
    ballY = height / 2;
    speedY = 3;

    socket.emit("ballMove", {
      ballX,
      ballY,
      score,
    });
  }

  // Adjust Ball Movement
  function ballMove() {
    // Vertical Speed
    ballY += speedY * ballDirection;
    // Horizontal Speed
    if (playerMoved) {
      ballX += speedX;
    }

    socket.emit("ballMove", {
      ballX,
      ballY,
      score,
    });
  }

  // Determine What Ball Bounces Off, Score Points, Reset Ball
  function ballBoundaries() {
    // Bounce off Left Wall
    if (ballX < 0 && speedX < 0) {
      speedX = -speedX;
    }
    // Bounce off Right Wall
    if (ballX > width && speedX > 0) {
      speedX = -speedX;
    }
    // Bounce off player paddle (bottom)
    if (ballY > height - paddleDiff) {
      if (ballX >= paddleX[0] && ballX <= paddleX[0] + paddleWidth) {
        // Add Speed on Hit
        if (playerMoved) {
          speedY += 1;
          // Max Speed
          if (speedY > 5) {
            speedY = 5;
          }
        }
        ballDirection = -ballDirection;
        trajectoryX[0] = ballX - (paddleX[0] + paddleDiff);
        speedX = trajectoryX[0] * 0.3;
      } else {
        // Reset Ball, add to Computer Score
        ballReset();
        score[1]++;
      }
    }
    // Bounce off computer paddle (top)
    if (ballY < paddleDiff) {
      if (ballX >= paddleX[1] && ballX <= paddleX[1] + paddleWidth) {
        // Add Speed on Hit
        if (playerMoved) {
          speedY += 1;
          // Max Speed
          if (speedY > 5) {
            speedY = 5;
          }
        }
        ballDirection = -ballDirection;
        trajectoryX[1] = ballX - (paddleX[1] + paddleDiff);
        speedX = trajectoryX[1] * 0.3;
      } else {
        ballReset();
        score[0]++;
      }
    }
  }

  // Called Every Frame
  function animate() {
    if (isReferee) {
      ballMove();
      ballBoundaries();
    }

    renderCanvas();
    animateId = window.requestAnimationFrame(animate);
  }

  // Load Game, Reset Everything
  function loadGame() {
    //createCanvas();
    renderIntro();
    socket.emit("ready");
  }

  function startGame() {
    paddleIndex = isReferee ? 0 : 1;
    window.requestAnimationFrame(animate);
    canvas.addEventListener('mousemove', multiPlayerHandler);
  }

  // On Load
  loadGame();

  socket.on("connect", () => {
    console.log("Connected as: ", socket.id);
  });

  socket.on("startGame", (refereeId) => {
    console.log("Referee is ", refereeId);
    isReferee = socket.id === refereeId;
    startGame();
  });

  socket.on("paddleMove", (paddleData) => {
    // Toggle 1 into 0, and 0 into 1
    const opponentPaddleIndex = 1 - paddleIndex;
    paddleX[opponentPaddleIndex] = paddleData.xPosition;
  });

  socket.on("ballMove", (ballData) => {
    ({ ballX, ballY, score } = ballData);
  });
}

const singlePlayerHandler = (e) => {
  playerMoved = true;
  paddleX[paddleIndex] = e.offsetX;
  if (paddleX[paddleIndex] < 0) {
    paddleX[paddleIndex] = 0;
  }
  if (paddleX[paddleIndex] > (width - paddleWidth)) {
    paddleX[paddleIndex] = width - paddleWidth;
  }
  // Hide Cursor
  canvas.style.cursor = 'none';
}

const singlePlayerGame = () => {
  // Reset Ball to Center
  function ballReset() {
    ballX = width / 2;
    ballY = height / 2;
    speedY = 3;
  }

  // Adjust Ball Movement
  function ballMove() {
    // Vertical Speed
    ballY += speedY * ballDirection;
    // Horizontal Speed
    if (playerMoved) {
      ballX += speedX;
    }
  }

  // Determine What Ball Bounces Off, Score Points, Reset Ball
  function ballBoundaries() {
    // Bounce off Left Wall
    if (ballX < 0 && speedX < 0) {
      speedX = -speedX;
    }
    // Bounce off Right Wall
    if (ballX > width && speedX > 0) {
      speedX = -speedX;
    }
    // Bounce off player paddle (bottom)
    if (ballY > height - paddleDiff) {
      if (ballX >= paddleX[0] && ballX <= paddleX[0] + paddleWidth) {
        // Add Speed on Hit
        if (playerMoved) {
          speedY += 1;
          // Max Speed
          if (speedY > 5) {
            speedY = 5;
          }
        }
        ballDirection = -ballDirection;
        trajectoryX[0] = ballX - (paddleX[0] + paddleDiff);
        speedX = trajectoryX[0] * 0.3;
      } else {
        // Reset Ball, add to Computer Score
        ballReset();
        score[1]++;
      }
    }
    // Bounce off computer paddle (top)
    if (ballY < paddleDiff) {
      if (ballX >= paddleX[1] && ballX <= paddleX[1] + paddleWidth) {
        // Add Speed on Hit
        if (playerMoved) {
          speedY += 1;
          // Max Speed
          if (speedY > 5) {
            speedY = 5;
          }
        }
        ballDirection = -ballDirection;
        trajectoryX[1] = ballX - (paddleX[1] + paddleDiff);
        speedX = trajectoryX[1] * 0.3;
      } else {
        // Reset Ball, Increase Computer Difficulty, add to Player Score
        if (computerSpeed < 6) {
          computerSpeed += 0.5;
        }
        ballReset();
        score[0]++;
      }
    }
  }

  // Computer Movement
  function computerAI() {
    if (playerMoved) {
      if (paddleX[1] + paddleDiff < ballX) {
        paddleX[1] += computerSpeed;
      } else {
        paddleX[1] -= computerSpeed;
      }
      if (paddleX[1] < 0) {
        paddleX[1] = 0;
      } else if (paddleX[1] > (width - paddleWidth)) {
        paddleX[1] = width - paddleWidth;
      }
    }
  }

  // Called Every Frame
  function animate() {
    computerAI();
    ballMove();
    renderCanvas();
    ballBoundaries();
    animateId = window.requestAnimationFrame(animate);
  }

  // Start Game, Reset Everything
  function startGame() {
    //createCanvas();
    // renderIntro();
    
    paddleIndex = 0;
    window.requestAnimationFrame(animate);
    canvas.addEventListener('mousemove', singlePlayerHandler);
  }

  // On Load
  startGame();
}

const cleanState = () => {
  canvas.removeEventListener("mousemove", singlePlayerHandler);
  canvas.removeEventListener("mousemove", multiPlayerHandler);
  window.cancelAnimationFrame(animateId);
  if (canLeaveRoom) {
    socket.emit('restart');
  }
  resetVariables();
}

const singleButton = document.createElement('button');
singleButton.width = width;
singleButton.innerText = 'Single Player';
root.appendChild(singleButton);

const multiButton = document.createElement('button');
multiButton.width = width;
multiButton.innerText = 'Multi Player';
root.appendChild(multiButton);

createCanvas();
// Canvas Background
context.fillStyle = 'black';
context.fillRect(0, 0, width, height);
// Intro Text
context.fillStyle = 'white';
context.font = "32px Courier New";
context.fillText("Select play mode", 20, (canvas.height / 2) - 30);

singleButton.addEventListener('click', () => {
  cleanState();
  canLeaveRoom = false;
  singlePlayerGame();
});

multiButton.addEventListener('click', () => {
  cleanState();
  canLeaveRoom = true;
  socket.connect();
  multiPlayerGame();
})

socket.on("loadGame", () => {
  cleanState();
  canLeaveRoom = true;
  multiPlayerGame();
});
