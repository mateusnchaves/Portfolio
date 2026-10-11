/** Fração do caminho até o cursor percorrida a cada quadro (o rótulo "persegue" o mouse). */
const EASE = 0.22;

/**
 * Sobre os prints dos projetos, o cursor vira um rótulo ("Ver demo ↗",
 * "Ver código ↗") que segue o mouse. Só com mouse; no toque o print é um
 * link comum.
 */
export function initCursorLabel() {
  const targets = document.querySelectorAll('[data-cursor-label]');
  if (targets.length === 0 || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = document.createElement('div');
  label.className = 'cursor-label meta';
  label.setAttribute('aria-hidden', 'true');
  label.innerHTML = '<span class="cursor-label__inner"></span>';
  const text = label.firstElementChild;
  document.body.append(label);
  document.documentElement.classList.add('has-cursor-label');

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let frame = 0;

  const place = () => {
    label.style.translate = `${current.x}px ${current.y}px`;
  };

  const tick = () => {
    current.x += (target.x - current.x) * EASE;
    current.y += (target.y - current.y) * EASE;
    place();
    const settled = Math.abs(target.x - current.x) < 0.1 && Math.abs(target.y - current.y) < 0.1;
    frame = settled ? 0 : requestAnimationFrame(tick);
  };

  targets.forEach((element) => {
    element.addEventListener('pointerenter', (event) => {
      text.textContent = `${element.dataset.cursorLabel} ↗`;
      // Entra já na posição do mouse, sem "voar" do último ponto.
      target.x = current.x = event.clientX;
      target.y = current.y = event.clientY;
      place();
      label.classList.add('is-visible');
    });

    element.addEventListener('pointermove', (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!smooth) {
        current.x = target.x;
        current.y = target.y;
        place();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    });

    element.addEventListener('pointerleave', () => label.classList.remove('is-visible'));
  });
}
