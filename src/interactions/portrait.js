const PHOTO = 'assets/retrato.jpg';
/** Mapa de profundidade da foto, em tons de cinza: branco = perto da câmera, preto = longe. */
const DEPTH_MAP = 'assets/retrato-profundidade.jpg';
/** Densidade da retícula: colunas (e linhas) amostradas da foto. */
const COLUMNS = 92;
/** Quanto o relevo "salta" (fração da largura do retrato). */
const DEPTH = 0.23;
/** Giro máximo com o mouse, em radianos: lados (yaw) e cima/baixo (pitch). */
const MAX_YAW = 0.34;
const MAX_PITCH = 0.19;
/** Distância da câmera: menor = perspectiva mais forte. */
const CAMERA = 2.4;

/**
 * Retrato 3D em retícula no hero. Cada célula da foto vira um quadrado cobalto
 * (maior onde a foto é mais escura) posicionado na profundidade real do rosto.
 * O rosto vira na direção do mouse; sem mouse, balança devagar sozinho.
 * Com movimento reduzido, aparece parado e de frente.
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

  Promise.all([loadImage(PHOTO), loadImage(DEPTH_MAP)])
    .then(([photo, depth]) => start(buildPoints(photo, depth), hero, canvas))
    .catch(() => wrapper.remove());
}

function start(points, hero, canvas) {
  const root = document.documentElement;
  const ctx = canvas.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interactive = !still && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let color = cobalt();
  let visible = true;
  let frame = 0;
  let born = 0;
  const target = { yaw: 0, pitch: 0, follow: false };
  const view = { yaw: 0, pitch: 0 };

  const draw = (time) => {
    const size = canvas.clientWidth;
    if (!size) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const pixels = Math.round(size * dpr);
    if (canvas.width !== pixels) canvas.width = canvas.height = pixels;

    const t = (time - born) / 1000;
    if (!still) {
      // Sem mouse, um vai-e-vem lento mantém o relevo visível.
      const yaw = target.follow ? target.yaw : Math.sin(t * 0.5) * MAX_YAW * 0.4;
      const pitch = target.follow ? target.pitch : Math.sin(t * 0.37) * MAX_PITCH * 0.15;
      view.yaw += (yaw - view.yaw) * 0.08;
      view.pitch += (pitch - view.pitch) * 0.08;
    }

    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch);
    const sp = Math.sin(view.pitch);
    const cell = size / COLUMNS;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color;

    for (const p of points) {
      // Entrada: cada quadrado vem de trás e chega no lugar, em tempos diferentes.
      const arrive = still ? 1 : Math.min(1, Math.max(0, (t - p.delay * 0.8) / 1.2));
      if (arrive === 0) continue;
      const ease = 1 - (1 - arrive) ** 3;
      const z = p.z * DEPTH - (1 - ease) * 2.5;

      // Gira em torno do eixo vertical (yaw) e depois do horizontal (pitch), e projeta em perspectiva.
      const x1 = p.x * cy + z * sy;
      const z1 = -p.x * sy + z * cy;
      const y2 = p.y * cp - z1 * sp;
      const z2 = p.y * sp + z1 * cp;
      const scale = CAMERA / (CAMERA - z2);
      const s = p.dark * cell * 0.92 * scale;

      // Quadrados mais à frente um pouco mais fortes: reforça a leitura do relevo.
      ctx.globalAlpha = Math.min(1, (0.55 + (z2 / DEPTH + 0.5) * 0.45) * ease);
      ctx.fillRect(size / 2 + x1 * size * scale - s / 2, size / 2 + y2 * size * scale - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };

  const tick = (time) => {
    draw(time);
    frame = visible && !still ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => {
    if (!frame && visible && !still) frame = requestAnimationFrame(tick);
  };

  // A cor acompanha o modo escuro.
  new MutationObserver(() => {
    color = cobalt();
    if (!frame) draw(performance.now());
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  new ResizeObserver(() => {
    if (!frame) draw(performance.now());
  }).observe(canvas);

  // Fora da tela, para de desenhar.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(hero);

  if (interactive) {
    // O rosto vira na direção do mouse, em qualquer ponto da página.
    window.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
      const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));
      target.yaw = nx * MAX_YAW;
      target.pitch = -ny * MAX_PITCH;
      target.follow = true;
    });
    document.documentElement.addEventListener('pointerleave', () => (target.follow = false));
  }

  if (still) {
    draw(performance.now());
    return;
  }

  // A montagem do rosto espera a tela de entrada sair, para ser vista.
  const assemble = () => {
    born = performance.now();
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

/**
 * Lê a foto e o mapa numa grade COLUMNS × COLUMNS. Cada célula escura o
 * bastante vira um ponto com posição (x, y de -0.5 a 0.5), profundidade z
 * (-0.5 atrás a 0.5 à frente) e "escuridão" (tamanho do quadrado).
 */
function buildPoints(photo, depth) {
  const tone = sample(photo);
  const near = sample(depth);
  const lum = (i) => (0.299 * tone[i] + 0.587 * tone[i + 1] + 0.114 * tone[i + 2]) / 255;
  const at = (col, row) => (row * COLUMNS + col) * 4;

  // Tom do fundo medido nos cantos de cima; o que for tão claro quanto ele some.
  const corners = [at(1, 1), at(COLUMNS - 2, 1), at(1, 8), at(COLUMNS - 2, 8)].map(lum);
  const cut = corners.reduce((sum, value) => sum + value) / corners.length - 0.07;
  let darkest = 1;
  for (let i = 0; i < tone.length; i += 4) darkest = Math.min(darkest, lum(i));

  const points = [];
  for (let row = 0; row < COLUMNS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const i = at(col, row);
      // Estica o contraste entre o fundo e o ponto mais escuro, para o rosto aparecer.
      const dark = Math.min(1, Math.max(0, (cut - lum(i)) / (cut - darkest))) ** 0.6;
      const closeness = near[i] / 255;
      if (dark <= 0.08 || closeness < 0.25) continue; // claro demais ou fundo
      points.push({ x: (col + 0.5) / COLUMNS - 0.5, y: (row + 0.5) / COLUMNS - 0.5, closeness, dark, delay: Math.random() });
    }
  }

  // Normaliza a profundidade só entre os pontos que sobraram (rosto, cabelo, ombros).
  let min = 1;
  let max = 0;
  for (const p of points) {
    min = Math.min(min, p.closeness);
    max = Math.max(max, p.closeness);
  }
  for (const p of points) p.z = (p.closeness - min) / (max - min || 1) - 0.5;
  return points;
}

/** Reduz a imagem para COLUMNS × COLUMNS em alta qualidade e devolve os pixels RGBA. */
function sample(image) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = COLUMNS;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, COLUMNS, COLUMNS);
  return ctx.getImageData(0, 0, COLUMNS, COLUMNS).data;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const clamp = (value) => Math.max(-1, Math.min(1, value));

function cobalt() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-cobalt').trim();
}
