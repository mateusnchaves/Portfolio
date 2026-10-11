const REST_WEIGHT = 800;
const MIN_WEIGHT = 400;
/** Raio de influência do cursor, em múltiplos da altura da letra. */
const RADIUS = 1.4;
/** Fração do caminho até o alvo percorrida a cada quadro (suaviza entrada e saída). */
const EASE = 0.14;

const canHover = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * As letras do nome no hero afinam (peso 800 → 400) e puxam para o cobalto
 * conforme o cursor se aproxima. Cada letra ocupa a largura que tem em repouso,
 * então a linha não se mexe enquanto o peso muda.
 */
export function initHeroName() {
  const title = document.querySelector('.hero__title');
  if (!title || !canHover()) return;

  const letters = [];
  title.querySelectorAll('.hero__line').forEach((line) => {
    const text = line.textContent.trim();
    line.innerHTML = '';
    line.append(Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: text }));

    const glyphs = document.createElement('span');
    glyphs.setAttribute('aria-hidden', 'true');
    [...text].forEach((char) => {
      const span = Object.assign(document.createElement('span'), { className: 'hero__letter', textContent: char });
      glyphs.append(span);
      letters.push({ el: span, value: 0, target: 0 });
    });
    line.append(glyphs);
  });

  const lockWidths = () => {
    letters.forEach(({ el }) => (el.style.width = ''));
    letters.forEach(({ el }) => (el.style.width = `${el.getBoundingClientRect().width}px`));
  };
  document.fonts.ready.then(lockWidths);
  window.addEventListener('resize', lockWidths);

  let pointer = null;
  let frame = 0;

  const tick = () => {
    let moving = false;
    letters.forEach((letter) => {
      if (pointer) {
        const rect = letter.el.getBoundingClientRect();
        const dx = pointer.x - (rect.left + rect.width / 2);
        const dy = pointer.y - (rect.top + rect.height / 2);
        const reach = rect.height * RADIUS;
        letter.target = Math.max(0, 1 - Math.hypot(dx, dy) / reach) ** 2;
      } else {
        letter.target = 0;
      }

      letter.value += (letter.target - letter.value) * EASE;
      if (Math.abs(letter.target - letter.value) < 0.001) letter.value = letter.target;
      if (letter.value > 0 || letter.target > 0) moving = true;

      letter.el.style.fontWeight = String(Math.round(REST_WEIGHT - (REST_WEIGHT - MIN_WEIGHT) * letter.value));
      letter.el.style.setProperty('--pull', `${Math.round(letter.value * 100)}%`);
    });
    // Para quando tudo voltou ao repouso; o próximo pointermove reinicia.
    frame = moving ? requestAnimationFrame(tick) : 0;
  };

  const start = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    start();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null;
    start();
  });
}
