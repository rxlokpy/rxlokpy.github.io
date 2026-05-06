/**
 * TargetCursor — vanilla JS port of the React Bits component.
 * Requires GSAP to be loaded before this script.
 *
 * Config mirrors the component props:
 *   targetSelector  — CSS selector for hover targets
 *   spinDuration    — seconds per full rotation when idle
 *   hideDefaultCursor
 *   hoverDuration   — seconds to snap corners onto a target
 *   parallaxOn      — subtle corner parallax while hovering
 */
(function () {
  // ── skip on touch / mobile ─────────────────────────────────────────────────
  const isMobile =
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.innerWidth <= 768;
  if (isMobile) return;

  // ── config ─────────────────────────────────────────────────────────────────
  const CONFIG = {
    targetSelector:    '.cursor-target',
    spinDuration:      5,
    hideDefaultCursor: true,
    hoverDuration:     0.45,
    parallaxOn:        false,
  };

  const BORDER_WIDTH  = 3;
  const CORNER_SIZE   = 12;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const cursor  = document.getElementById('target-cursor');
  const dot     = cursor.querySelector('.target-cursor-dot');
  const corners = Array.from(cursor.querySelectorAll('.target-cursor-corner'));

  if (!cursor) return;

  // ── hide default cursor ────────────────────────────────────────────────────
  if (CONFIG.hideDefaultCursor) document.body.classList.add('cursor-active');

  // ── initial position (centre of viewport) ─────────────────────────────────
  gsap.set(cursor, {
    xPercent: -50,
    yPercent: -50,
    x: window.innerWidth  / 2,
    y: window.innerHeight / 2,
  });

  // ── idle spin timeline ─────────────────────────────────────────────────────
  let spinTl = gsap.timeline({ repeat: -1 })
    .to(cursor, { rotation: '+=360', duration: CONFIG.spinDuration, ease: 'none' });

  // ── state ──────────────────────────────────────────────────────────────────
  let activeTarget          = null;
  let currentLeaveHandler   = null;
  let resumeTimeout         = null;
  let targetCornerPositions = null;
  const activeStrength      = { current: 0 };

  // ── parallax ticker ────────────────────────────────────────────────────────
  function tickerFn() {
    if (!targetCornerPositions) return;
    const strength = activeStrength.current;
    if (strength === 0) return;

    const cursorX = gsap.getProperty(cursor, 'x');
    const cursorY = gsap.getProperty(cursor, 'y');

    corners.forEach((corner, i) => {
      const currentX = gsap.getProperty(corner, 'x');
      const currentY = gsap.getProperty(corner, 'y');
      const targetX  = targetCornerPositions[i].x - cursorX;
      const targetY  = targetCornerPositions[i].y - cursorY;
      const finalX   = currentX + (targetX - currentX) * strength;
      const finalY   = currentY + (targetY - currentY) * strength;
      const dur      = strength >= 0.99 ? (CONFIG.parallaxOn ? 0.2 : 0) : 0.05;

      gsap.to(corner, {
        x: finalX, y: finalY,
        duration: dur,
        ease: dur === 0 ? 'none' : 'power1.out',
        overwrite: 'auto',
      });
    });
  }

  // ── move cursor ────────────────────────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power3.out' });
  });

  // ── click scale pulse ──────────────────────────────────────────────────────
  window.addEventListener('mousedown', () => {
    gsap.to(dot,    { scale: 0.7, duration: 0.3 });
    gsap.to(cursor, { scale: 0.9, duration: 0.2 });
  });
  window.addEventListener('mouseup', () => {
    gsap.to(dot,    { scale: 1, duration: 0.3 });
    gsap.to(cursor, { scale: 1, duration: 0.2 });
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  function detachLeave(target) {
    if (currentLeaveHandler) target.removeEventListener('mouseleave', currentLeaveHandler);
    currentLeaveHandler = null;
  }

  function resetCorners() {
    gsap.killTweensOf(corners);
    const positions = [
      { x: -CORNER_SIZE * 1.5, y: -CORNER_SIZE * 1.5 },
      { x:  CORNER_SIZE * 0.5, y: -CORNER_SIZE * 1.5 },
      { x:  CORNER_SIZE * 0.5, y:  CORNER_SIZE * 0.5 },
      { x: -CORNER_SIZE * 1.5, y:  CORNER_SIZE * 0.5 },
    ];
    const tl = gsap.timeline();
    corners.forEach((corner, i) => {
      tl.to(corner, { x: positions[i].x, y: positions[i].y, duration: 0.3, ease: 'power3.out' }, 0);
    });
  }

  function resumeSpin() {
    if (activeTarget || !spinTl) return;
    const cur        = gsap.getProperty(cursor, 'rotation') % 360;
    const remaining  = (360 - cur) / 360;
    spinTl.kill();
    spinTl = gsap.timeline({ repeat: -1 })
      .to(cursor, { rotation: '+=360', duration: CONFIG.spinDuration, ease: 'none' });
    gsap.to(cursor, {
      rotation: cur + 360,
      duration: CONFIG.spinDuration * remaining,
      ease: 'none',
      onComplete: () => spinTl.restart(),
    });
  }

  // ── hover enter ────────────────────────────────────────────────────────────
  window.addEventListener('mouseover', e => {
    // walk up to find the closest matching target
    let el = e.target;
    let target = null;
    while (el && el !== document.body) {
      if (el.matches(CONFIG.targetSelector)) { target = el; break; }
      el = el.parentElement;
    }
    if (!target || target === activeTarget) return;

    // clean up previous
    if (activeTarget) detachLeave(activeTarget);
    if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

    activeTarget = target;
    corners.forEach(c => gsap.killTweensOf(c));
    gsap.killTweensOf(cursor, 'rotation');
    spinTl.pause();
    gsap.set(cursor, { rotation: 0 });

    const rect    = target.getBoundingClientRect();
    const cursorX = gsap.getProperty(cursor, 'x');
    const cursorY = gsap.getProperty(cursor, 'y');

    targetCornerPositions = [
      { x: rect.left  - BORDER_WIDTH,                  y: rect.top    - BORDER_WIDTH },
      { x: rect.right + BORDER_WIDTH - CORNER_SIZE,    y: rect.top    - BORDER_WIDTH },
      { x: rect.right + BORDER_WIDTH - CORNER_SIZE,    y: rect.bottom + BORDER_WIDTH - CORNER_SIZE },
      { x: rect.left  - BORDER_WIDTH,                  y: rect.bottom + BORDER_WIDTH - CORNER_SIZE },
    ];

    gsap.to(activeStrength, { current: 1, duration: CONFIG.hoverDuration, ease: 'power2.out' });
    gsap.ticker.add(tickerFn);

    corners.forEach((corner, i) => {
      gsap.to(corner, {
        x: targetCornerPositions[i].x - cursorX,
        y: targetCornerPositions[i].y - cursorY,
        duration: CONFIG.hoverDuration,
        ease: 'power2.out',
      });
    });

    // ── hover leave ──────────────────────────────────────────────────────────
    const leaveHandler = () => {
      gsap.ticker.remove(tickerFn);
      targetCornerPositions = null;
      gsap.set(activeStrength, { current: 0, overwrite: true });
      activeTarget = null;
      resetCorners();
      resumeTimeout = setTimeout(() => { resumeSpin(); resumeTimeout = null; }, 50);
      detachLeave(target);
    };

    currentLeaveHandler = leaveHandler;
    target.addEventListener('mouseleave', leaveHandler);
  }, { passive: true });

  // ── scroll: re-check if still over target ─────────────────────────────────
  window.addEventListener('scroll', () => {
    if (!activeTarget) return;
    const mx = gsap.getProperty(cursor, 'x');
    const my = gsap.getProperty(cursor, 'y');
    const under = document.elementFromPoint(mx, my);
    const stillOver = under && (under === activeTarget || under.closest(CONFIG.targetSelector) === activeTarget);
    if (!stillOver && currentLeaveHandler) currentLeaveHandler();
  }, { passive: true });
})();
