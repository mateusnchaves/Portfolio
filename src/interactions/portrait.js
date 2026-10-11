const PHOTO = 'assets/retrato.jpg';
/** Densidade da retícula: colunas (e linhas) amostradas da foto. */
const COLUMNS = 72;
/** Alcance do mouse, em px: os quadrados dentro dele são empurrados para fora. */
const RADIUS = 90;
/** Mola de volta para o lugar e amortecimento do movimento. */
const SPRING = 0.06;
const DAMPING = 0.82;

/**
 * Retrato em retícula no hero: cada célula da foto vira um quadrado cobalto,
 * maior onde a foto é mais escura. Os quadrados chegam espalhados e se juntam;
 * com mouse, abrem espaço ao redor do cursor e voltam com efeito de mola.
 * Com movimento reduzido, o retrato aparece pronto e parado.
 */
export function initPortrait() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'hero__portrait';
  wrapper.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  wrapper.append(canvas);
  hero.prepend(wrapper);

  const image = new Image();
  image.decoding = 'async';
  image.src = PHOTO;
  image.addEventListener('load', () => start(image, hero, canvas));
}

function start(image, hero, canvas) {
  const root = document.documentElement;
  const ctx = canvas.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interactive = !still && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const tones = sampleTones(image);

  let color = cobalt();
  let dpr = 1;
  let dots = [];
  let pointer = null;
  let visible = true;
  let frame = 0;

  const layout = (scatter) => {
    const size = canvas.clientWidth;
    if (!size) return;
    dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvas.height = Math.round(size * dpr);
    const cell = size / COLUMNS;
    dots = tones.map((tone, i) => {
      const hx = (tone.col + 0.5) * cell;
      const hy = (tone.row + 0.5) * cell;
      // Ao redimensionar, cada quadrado continua de onde estava; na montagem, nasce espalhado.
      const previous = scatter ? null : dots[i];
      const spread = scatter ? size * 0.9 : 0;
      return {
        hx,
        hy,
        x: previous?.x ?? hx + (Math.random() - 0.5) * spread,
        y: previous?.y ?? hy + (Math.random() - 0.5) * spread,
        vx: 0,
        vy: 0,
        size: tone.dark * cell * 0.92,
      };
    });
  };

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    for (const dot of dots) ctx.fillRect(dot.x - dot.size / 2, dot.y - dot.size / 2, dot.size, dot.size);
  };

  /** Um passo da física; devolve true enquanto algum quadrado ainda está se mexendo. */
  const step = () => {
    let moving = false;
    for (const dot of dots) {
      let fx = (dot.hx - dot.x) * SPRING;
      let fy = (dot.hy - dot.y) * SPRING;
      if (pointer) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < RADIUS && dist > 0.01) {
          const push = (1 - dist / RADIUS) ** 2 * 6;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        }
      }
      dot.vx = (dot.vx + fx) * DAMPING;
      dot.vy = (dot.vy + fy) * DAMPING;
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (Math.abs(dot.vx) + Math.abs(dot.vy) > 0.02 || Math.abs(dot.hx - dot.x) + Math.abs(dot.hy - dot.y) > 0.1) moving = true;
    }
    return moving;
  };

  // Só roda quadros enquanto há movimento; parado, o canvas não gasta nada.
  const tick = () => {
    const moving = step();
    draw();
    frame = moving || pointer ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => {
    if (!frame && visible && !still) frame = requestAnimationFrame(tick);
  };

  // A cor acompanha o modo escuro.
  new MutationObserver(() => {
    color = cobalt();
    if (still || !frame) draw();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  new ResizeObserver(() => {
    layout(false);
    draw();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(hero);

  if (interactive) {
    // O retrato fica atrás do texto, então o mouse é lido no hero inteiro.
    hero.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      wake();
    });
    hero.addEventListener('pointerleave', () => (pointer = null));
  }

  if (still) {
    layout(false);
    draw();
    return;
  }

  // A montagem do rosto espera a tela de entrada sair, para ser vista.
  const assemble = () => {
    layout(true);
    draw();
    wake();
  };
  if (root.classList.contains('is-loading')) {
    const observer = new MutationObserver(() => {
      if (root.classList.contains('is-loading') && !root.classList.contains('is-revealing')) return;
      observer.disconnect();
      assemble();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  } else {
    assemble();
  }
}

/** Lê a foto numa grade COLUMNS × COLUMNS e devolve a "escuridão" (0–1) de cada célula que conta. */
function sampleTones(image) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = COLUMNS;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, COLUMNS, COLUMNS);
  const { data } = ctx.getImageData(0, 0, COLUMNS, COLUMNS);
  const lum = (col, row) => {
    const i = (row * COLUMNS + col) * 4;
    return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  };

  // Tom do fundo medido nos cantos de cima; o que for tão claro quanto ele some.
  const corners = [lum(1, 1), lum(COLUMNS - 2, 1), lum(1, 8), lum(COLUMNS - 2, 8)];
  const cut = corners.reduce((sum, value) => sum + value) / corners.length - 0.07;
  let darkest = 1;
  for (let row = 0; row < COLUMNS; row++) for (let col = 0; col < COLUMNS; col++) darkest = Math.min(darkest, lum(col, row));

  const tones = [];
  for (let row = 0; row < COLUMNS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      // Estica o contraste entre o fundo e o ponto mais escuro, para o rosto aparecer.
      const dark = Math.min(1, Math.max(0, (cut - lum(col, row)) / (cut - darkest))) ** 0.6;
      if (dark > 0.08) tones.push({ col, row, dark });
    }
  }
  return tones;
}

function cobalt() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-cobalt').trim();
}
