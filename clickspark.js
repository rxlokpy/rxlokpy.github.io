/**
 * ClickSpark — vanilla JS port of the React Bits component.
 * Mounts a full-page canvas and draws radiating spark lines on every click.
 */
(function () {
  // ── config (mirrors component props) ──────────────────────────────────────
  const CONFIG = {
    sparkColor:  '#c084fc',   // matches --purple-light
    sparkSize:   12,
    sparkRadius: 22,
    sparkCount:  8,
    duration:    500,
    easing:      'ease-out',  // 'linear' | 'ease-in' | 'ease-in-out' | 'ease-out'
    extraScale:  1.2,
  };

  // ── easing ─────────────────────────────────────────────────────────────────
  function ease(t) {
    switch (CONFIG.easing) {
      case 'linear':     return t;
      case 'ease-in':    return t * t;
      case 'ease-in-out':return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:           return t * (2 - t); // ease-out
    }
  }

  // ── canvas setup ───────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position:      'fixed',
    inset:         '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    userSelect:    'none',
    zIndex:        '9999',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ── spark state ────────────────────────────────────────────────────────────
  let sparks = [];

  // ── animation loop ─────────────────────────────────────────────────────────
  function draw(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sparks = sparks.filter(spark => {
      const elapsed  = timestamp - spark.startTime;
      if (elapsed >= CONFIG.duration) return false;

      const progress   = elapsed / CONFIG.duration;
      const eased      = ease(progress);
      const distance   = eased * CONFIG.sparkRadius * CONFIG.extraScale;
      const lineLength = CONFIG.sparkSize * (1 - eased);

      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      // fade out as the spark ages
      const alpha = 1 - eased;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = CONFIG.sparkColor;
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      return true;
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // ── click handler ──────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const now = performance.now();
    for (let i = 0; i < CONFIG.sparkCount; i++) {
      sparks.push({
        x:         e.clientX,
        y:         e.clientY,
        angle:     (2 * Math.PI * i) / CONFIG.sparkCount,
        startTime: now,
      });
    }
  });
})();
