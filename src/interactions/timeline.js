/** Linha da tela (fração da altura) que "pinta" a timeline ao passar por ela. */
const LINE = 0.6;

/**
 * Experiência: a linha da timeline se pinta de cobalto conforme a rolagem, e
 * as tecnologias ficam ligadas ao texto — passar o mouse numa tag acende os
 * trechos que falam dela, e passar num trecho acende a tag.
 */
export function initTimeline() {
  const timelines = [...document.querySelectorAll('[data-timeline]')];
  if (timelines.length === 0) return;

  fillOnScroll(timelines);
  linkSkills();
}

function fillOnScroll(timelines) {
  // Com movimento reduzido, a linha já aparece inteira (--progress padrão = 1).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const line = window.innerHeight * LINE;
    timelines.forEach((timeline) => {
      const rect = timeline.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
      timeline.style.setProperty('--progress', progress.toFixed(4));
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

function linkSkills() {
  const light = (scope, skills, on) => {
    skills.forEach((skill) => {
      scope.querySelectorAll(`[data-skill="${skill}"]`).forEach((tag) => tag.classList.toggle('is-lit', on));
      scope.querySelectorAll('[data-skills]').forEach((mark) => {
        if (mark.dataset.skills.split(' ').includes(skill)) mark.classList.toggle('is-lit', on);
      });
    });
  };

  const skillsOf = (element) =>
    element.dataset.skill ? [element.dataset.skill] : element.dataset.skills.split(' ');

  const handle = (on) => (event) => {
    const target = event.target.closest?.('[data-skill], [data-skills]');
    const scope = target?.closest('[data-skill-scope]');
    // Ignora o movimento entre filhos do mesmo elemento.
    if (!target || !scope || target.contains(event.relatedTarget)) return;
    light(scope, skillsOf(target), on);
  };

  document.addEventListener('mouseover', handle(true));
  document.addEventListener('mouseout', handle(false));
}
