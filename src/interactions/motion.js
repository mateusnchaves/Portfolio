const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/+esm';
const GSAP_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
const SCROLL_TRIGGER_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

// O título do contato fica de fora: as linhas dele já são spans em bloco.
const TITLES = '.section-head__title:not(.contact__title), .case__title';

/**
 * Camada de movimento opcional: rolagem suave (Lenis), títulos revelados
 * palavra por palavra e um parallax leve nos prints (GSAP + ScrollTrigger).
 * Com movimento reduzido, ou se as bibliotecas não carregarem, nada muda.
 */
export async function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let libs;
  try {
    libs = await Promise.all([import(LENIS_URL), import(GSAP_URL), import(SCROLL_TRIGGER_URL)]);
  } catch {
    return;
  }
  const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = libs;
  gsap.registerPlugin(ScrollTrigger);

  const lenis = smoothScroll(Lenis, gsap, ScrollTrigger);
  revealTitles(gsap);
  parallaxMedia(gsap);
  keepTriggersInSync(ScrollTrigger, lenis);
}

function smoothScroll(Lenis, gsap, ScrollTrigger) {
  const root = document.documentElement;
  const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-height')) * 16 || 56;
  const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -header } });

  // O GSAP comanda o relógio, para rolagem e animações andarem no mesmo quadro.
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Trava a rolagem enquanto a tela de entrada ou o menu do celular estão abertos.
  const sync = () => {
    const locked = root.classList.contains('is-loading') || root.classList.contains('is-menu-open');
    if (locked) lenis.stop();
    else lenis.start();
  };
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  sync();

  return lenis;
}

/** Quebra o título em palavras mascaradas; cada palavra sobe quando o título entra na tela. */
function revealTitles(gsap) {
  document.querySelectorAll(TITLES).forEach((title) => {
    const words = title.textContent.trim().split(/\s+/);
    title.setAttribute('aria-label', words.join(' '));
    title.innerHTML = words
      .map((word) => `<span class="word" aria-hidden="true"><span class="word__inner">${escapeText(word)}</span></span>`)
      .join(' ');

    gsap.from(title.querySelectorAll('.word__inner'), {
      yPercent: 110,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: title, start: 'top 88%', once: true },
    });
  });
}

/** No desktop, o print desliza um pouco mais devagar que o texto ao lado. */
function parallaxMedia(gsap) {
  gsap.matchMedia().add('(min-width: 64em)', () => {
    document.querySelectorAll('.case__media').forEach((media) => {
      gsap.fromTo(
        media,
        { y: 48 },
        { y: -48, ease: 'none', scrollTrigger: { trigger: media.closest('.case'), start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    });
  });
}

/** Abrir um case muda a altura da página; recalcula os gatilhos quando isso acontece. */
function keepTriggersInSync(ScrollTrigger, lenis) {
  let timer;
  new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    }, 150);
  }).observe(document.body);
}

function escapeText(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML;
}
