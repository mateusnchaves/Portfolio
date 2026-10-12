const STORAGE_KEY = 'achievements';
/** Tempo que o aviso fica na tela, em ms. */
const VISIBLE_MS = 4500;

/** Título de cada tipo de aviso, como na versão em português do jogo. */
const KINDS = {
  task: 'Progresso feito!',
  goal: 'Objetivo alcançado!',
  challenge: 'Desafio completo!',
};

/**
 * Ícones em pixel art 16 × 16, desenhados à mão para o site.
 * Cada linha é uma fileira de pixels; cada caractere aponta uma cor da paleta ('.' = vazio).
 */
const ICONS = {
  scroll: {
    palette: { a: '#5c4a2a', b: '#e9dfb8', c: '#c9bb88', d: '#8a7a52', e: '#1f3fd1' },
    pixels: [
      '................',
      '..aaaaaaaaaaaa..',
      '.abbbbbbbbbbbba.',
      '.abcccccccccdba.',
      '..abbbbbbbbbba..',
      '..abddddddddba..',
      '..abbbbbbbbbba..',
      '..abddddddbbba..',
      '..abbbbbbbbbba..',
      '..abddddddddba..',
      '..abbbbbbbbbba..',
      '..abdddbbeeeba..',
      '..abbbbbbeeeba..',
      '.abcccccccccdba.',
      '.abbbbbbbbbbbba.',
      '..aaaaaaaaaaaa..',
    ],
  },
};

/** Conquistas do site. Para criar outra, adicione aqui e chame unlock('id') no gatilho. */
const ACHIEVEMENTS = {
  cv: { kind: 'goal', name: 'Currículo obtido', icon: 'scroll' },
};

let region;
const queue = [];
let showing = false;

/** Mostra a conquista uma única vez por visitante. */
export function unlock(id) {
  const achievement = ACHIEVEMENTS[id];
  if (!achievement) return;
  const done = load();
  if (done.includes(id)) return;
  save([...done, id]);
  queue.push(achievement);
  if (!showing) next();
}

export function initAchievements() {
  // Região única e permanente, para leitores de tela anunciarem sem roubar o foco.
  region = document.createElement('div');
  region.className = 'toasts';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.append(region);

  document.querySelectorAll('[data-achievement]').forEach((trigger) => {
    trigger.addEventListener('click', () => unlock(trigger.dataset.achievement));
  });
}

function next() {
  const achievement = queue.shift();
  if (!achievement || !region) {
    showing = false;
    return;
  }
  showing = true;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    ${pixelArt(ICONS[achievement.icon])}
    <div class="toast__text">
      <p class="toast__kind toast__kind--${achievement.kind}">${KINDS[achievement.kind]}</p>
      <p class="toast__name">${achievement.name}</p>
    </div>`;
  region.append(toast);
  requestAnimationFrame(() => toast.classList.add('is-in'));

  setTimeout(() => {
    toast.classList.remove('is-in');
    toast.classList.add('is-out');
    const remove = () => {
      toast.remove();
      next();
    };
    toast.addEventListener('transitionend', remove, { once: true });
    // Garante a saída mesmo sem transição (movimento reduzido).
    setTimeout(() => toast.isConnected && remove(), 600);
  }, VISIBLE_MS);
}

/** Converte o desenho em um SVG de retângulos nítidos (sem suavização). */
function pixelArt({ palette, pixels }) {
  const rects = pixels
    .flatMap((row, y) =>
      [...row].map((key, x) => (palette[key] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[key]}"/>` : '')),
    )
    .join('');
  return `<svg class="toast__icon" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Sem localStorage (navegação privada), a conquista pode voltar a aparecer em outra visita.
  }
}
