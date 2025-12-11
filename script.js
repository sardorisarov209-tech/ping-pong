// Simple Pong game
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Game size
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Paddle properties
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 100;
  const PADDLE_INSET = 12; // distance from sides

  // Ball properties
  const BALL_RADIUS = 8;
  const BALL_INITIAL_SPEED = 5;
  const BALL_SPEED_INCREMENT = 0.25;
  const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 degrees

  // Game state
  const state = {
    left: {
      x: PADDLE_INSET,
      y: (HEIGHT - PADDLE_HEIGHT) / 2,
      vy: 0,
      speed: 6
    },
    right: {
      x: WIDTH - PADDLE_INSET - PADDLE_WIDTH,
      y: (HEIGHT - PADDLE_HEIGHT) / 2,
      vy: 0,
      speed: 5 // AI max speed
    },
    ball: {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      speed: BALL_INITIAL_SPEED
    },
    scores: {
      left: 0,
      right: 0
    },
    paused: false
  };

  // Input state
  const input = {
    up: false,
    down: false,
    mouseY: null
  };

  // Initialize ball with a random direction towards the last scorer or random
  function resetBall(toRight = Math.random() >= 0.5) {
    state.ball.x = WIDTH / 2;
    state.ball.y = HEIGHT / 2;
    state.ball.speed = BALL_INITIAL_SPEED;
    const angle = (Math.random() * (Math.PI / 4)) - (Math.PI / 8); // small random angle
    const sign = toRight ? 1 : -1;
    state.ball.vx = sign * state.ball.speed * Math.cos(angle);
    state.ball.vy = state.ball.speed * Math.sin(angle);
  }

  // Start with ball to random side
  resetBall();

  // Draw helpers
  function drawNet() {
    const lineHeight = 12;
    const gap = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    let y = 0;
    while (y < HEIGHT) {
      ctx.fillRect((WIDTH / 2) - 1, y, 2, lineHeight);
      y += lineHeight + gap;
    }
  }

  function drawPaddle(x, y) {
    ctx.fillStyle = '#00e5a8';
    roundRect(ctx, x, y, PADDLE_WIDTH, PADDLE_HEIGHT, 6, true, false);
  }

  function drawBall() {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScores() {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '28px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(state.scores.left, WIDTH * 0.25, 40);
    ctx.fillText(state.scores.right, WIDTH * 0.75, 40);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.fillText('Player', WIDTH * 0.25, 60);
    ctx.fillText('Computer', WIDTH * 0.75, 60);
  }

  // Utility: rounded rectangle
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // Collision detection: circle vs rect (paddle)
  function ballHitsPaddle(ball, paddleX, paddleY) {
    const nearestX = Math.max(paddleX, Math.min(ball.x, paddleX + PADDLE_WIDTH));
    const nearestY = Math.max(paddleY, Math.min(ball.y, paddleY + PADDLE_HEIGHT));
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    return (dx * dx + dy * dy) <= (BALL_RADIUS * BALL_RADIUS);
  }

  function update(dt) {
    if (state.paused) return;

    // Update left paddle from keys
    if (input.up) {
      state.left.y -= state.left.speed;
    } else if (input.down) {
      state.left.y += state.left.speed;
    }

    // Update left paddle from mouse if provided (mouse overrides keys)
    if (input.mouseY !== null) {
      // translate page Y to canvas Y
      const rect = canvas.getBoundingClientRect();
      const y = input.mouseY - rect.top;
      state.left.y = y - PADDLE_HEIGHT / 2;
    }

    // Clamp paddles
    state.left.y = clamp(state.left.y, 0, HEIGHT - PADDLE_HEIGHT);

    // Simple AI for right paddle: follow ball with max speed
    const rightCenter = state.right.y + PADDLE_HEIGHT / 2;
    const delta = state.ball.y - rightCenter;
    const aiMax = state.right.speed;
    if (Math.abs(delta) > 4) {
      state.right.y += clamp(delta, -aiMax, aiMax);
    }
    state.right.y = clamp(state.right.y, 0, HEIGHT - PADDLE_HEIGHT);

    // Move ball
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Top/Bottom collision
    if (state.ball.y - BALL_RADIUS < 0) {
      state.ball.y = BALL_RADIUS;
      state.ball.vy *= -1;
    } else if (state.ball.y + BALL_RADIUS > HEIGHT) {
      state.ball.y = HEIGHT - BALL_RADIUS;
      state.ball.vy *= -1;
    }

    // Paddle collisions
    // Left paddle
    if (state.ball.x - BALL_RADIUS < state.left.x + PADDLE_WIDTH) {
      if (ballHitsPaddle(state.ball, state.left.x, state.left.y)) {
        handlePaddleBounce('left');
      }
    }
    // Right paddle
    if (state.ball.x + BALL_RADIUS > state.right.x) {
      if (ballHitsPaddle(state.ball, state.right.x, state.right.y)) {
        handlePaddleBounce('right');
      }
    }

    // Score: ball passed left or right edges
    if (state.ball.x + BALL_RADIUS < 0) {
      // right scores
      state.scores.right += 1;
      resetBall(true);
    } else if (state.ball.x - BALL_RADIUS > WIDTH) {
      // left scores
      state.scores.left += 1;
      resetBall(false);
    }
  }

  function handlePaddleBounce(side) {
    // Determine which paddle
    const paddle = side === 'left' ? state.left : state.right;
    const paddleCenter = paddle.y + (PADDLE_HEIGHT / 2);

    // Calculate relative intersect (-1 .. 1)
    const relativeY = (state.ball.y - paddleCenter) / (PADDLE_HEIGHT / 2);
    const bounceAngle = relativeY * MAX_BOUNCE_ANGLE;

    // Increase speed a little
    state.ball.speed = Math.min(12, state.ball.speed + BALL_SPEED_INCREMENT);

    // Set new velocity depending on side
    const direction = side === 'left' ? 1 : -1; // ball should move right after hitting left paddle
    state.ball.vx = direction * state.ball.speed * Math.cos(bounceAngle);
    state.ball.vy = state.ball.speed * Math.sin(bounceAngle);

    // Nudge ball out so it doesn't stick
    if (side === 'left') {
      state.ball.x = paddle.x + PADDLE_WIDTH + BALL_RADIUS + 0.5;
    } else {
      state.ball.x = paddle.x - BALL_RADIUS - 0.5;
    }
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function draw() {
    // background
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // net
    drawNet();

    // paddles
    drawPaddle(state.left.x, state.left.y);
    drawPaddle(state.right.x, state.right.y);

    // ball
    drawBall();

    // scores
    drawScores();

    // paused overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', WIDTH / 2, HEIGHT / 2);
    }
  }

  // Game loop
  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Input handlers
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      input.up = true;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      input.down = true;
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // toggle pause
      state.paused = !state.paused;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') {
      input.up = false;
    } else if (e.key === 'ArrowDown') {
      input.down = false;
    }
  });

  // Mouse controls: move left paddle with mouse on canvas
  canvas.addEventListener('mousemove', (e) => {
    input.mouseY = e.clientY;
  });

  // Remove mouse control when leaving canvas
  canvas.addEventListener('mouseleave', () => {
    input.mouseY = null;
  });

  // Buttons
  document.getElementById('resetBtn').addEventListener('click', () => {
    state.scores.left = 0;
    state.scores.right = 0;
    resetBall();
  });

  document.getElementById('pauseBtn').addEventListener('click', (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? 'Resume' : 'Pause';
  });

  // Prevent arrow keys from scrolling page when using them
  window.addEventListener('keydown', function(e) {
    if(['ArrowUp','ArrowDown',' '].indexOf(e.key) > -1) {
      e.preventDefault();
    }
  });

  // For touch devices: support simple touch movement
  canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (touch) {
      input.mouseY = touch.clientY;
      e.preventDefault();
    }
  }, {passive: false});

  // Expose a basic API to global for debugging
  window.__pong = {
    state,
    resetBall
  };
})();
