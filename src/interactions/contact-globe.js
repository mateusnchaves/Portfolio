const COBE_URL = 'https://cdn.jsdelivr.net/npm/cobe@0.6.3/+esm';

/** Itu, SP — o mesmo lugar citado no hero. */
const HOME = { lat: -23.264, lon: -47.299 };
/** Velocidade da rotação sozinha, em radianos por quadro. */
const SPIN = 0.0025;

/**
 * Globo de pontos na seção de contato, com um marcador em Itu. Gira devagar
 * e, com mouse, dá para arrastar (com inércia). Pausa fora da tela; com
 * movimento reduzido fica parado com o Brasil de frente.
 */
export async function initContactGlobe() {
  const wrapper = document.querySelector('[data-globe]');
  const canvas = wrapper?.querySelector('canvas');
  if (!canvas) return;

  let createGlobe;
  try {
    ({ default: createGlobe } = await import(COBE_URL));
  } catch {
    return;
  }

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio, 2);
  // Ângulos que deixam Itu de frente para a câmera, com o globo levemente inclinado para o sul.
  const homePhi = Math.PI - ((HOME.lon * Math.PI) / 180 - Math.PI / 2);
  const homeTheta = -0.32;

  let phi = homePhi;
  let velocity = 0;
  let drag = null;
  let visible = false;
  let size = canvas.offsetWidth;

  const globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: size * dpr,
    height: size * dpr,
    phi,
    theta: homeTheta,
    // Esfera no tom do cobalto do fundo; os continentes aparecem como pontos claros.
    dark: 0,
    diffuse: 1.1,
    mapSamples: 18000,
    mapBrightness: 5,
    mapBaseBrightness: 0,
    baseColor: [0.2, 0.3, 0.86],
    markerColor: [0.96, 0.95, 0.94],
    glowColor: [0.24, 0.34, 0.9],
    opacity: 0.95,
    markers: [{ location: [HOME.lat, HOME.lon], size: 0.07 }],
    onRender: (state) => {
      if (!still && visible) {
        if (drag) {
          velocity *= 0.85;
        } else {
          // Inércia do arremesso que volta, aos poucos, para a rotação constante.
          velocity += (SPIN - velocity) * 0.04;
          phi += velocity;
        }
      }
      state.phi = phi;
      state.width = size * dpr;
      state.height = size * dpr;
    },
  });

  new ResizeObserver(() => (size = canvas.offsetWidth)).observe(canvas);
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

  if (!still && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    canvas.addEventListener('pointerdown', (event) => {
      drag = { x: event.clientX, phi };
      canvas.setPointerCapture(event.pointerId);
      wrapper.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const next = drag.phi + ((event.clientX - drag.x) / size) * Math.PI;
      velocity = next - phi;
      phi = next;
    });
    const release = () => {
      drag = null;
      wrapper.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  requestAnimationFrame(() => wrapper.classList.add('is-visible'));
  return globe;
}
