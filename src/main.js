import { plurals, ui } from './config.js';
import { capabilities } from './data/capabilities.js';
import { currently } from './data/currently.js';
import { experience } from './data/experience.js';
import { projects } from './data/projects.js';
import { capabilityItem } from './components/capability-item.js';
import { currentlyItem } from './components/currently-item.js';
import { experienceEntry } from './components/experience-entry.js';
import { projectCase } from './components/project-case.js';
import { countLabel, formatMonth, tenure } from './lib/format.js';
import { mount, setText } from './lib/dom.js';
import { html } from './lib/html.js';
import { findTodos } from './lib/todo.js';
import { initContactGlobe } from './interactions/contact-globe.js';
import { initCopy } from './interactions/copy.js';
import { initCursorLabel } from './interactions/cursor-label.js';
import { initDisclosures } from './interactions/disclosure.js';
import { initGridOverlay } from './interactions/grid-overlay.js';
import { initHeroName } from './interactions/hero-name.js';
import { initMotion } from './interactions/motion.js';
import { initNavigation } from './interactions/navigation.js';
import { initPortrait } from './interactions/portrait.js';
import { initReveal } from './interactions/reveal.js';
import { initTheme } from './interactions/theme.js';
import { initTimeline } from './interactions/timeline.js';

function render() {
  mount('projects', html`<ol class="cases">${projects.map((project, i) => html`<li>${projectCase(project, i)}</li>`)}</ol>`);
  mount('experience', html`<div class="experience">${experience.map(experienceEntry)}</div>`);
  mount('capabilities', html`<ol class="capabilities">${capabilities.map(capabilityItem)}</ol>`);
  mount('currently', html`<ul class="now">${currently.items.map(currentlyItem)}</ul>`);

  const allRoles = experience.flatMap((entry) => entry.roles);
  setText('[data-meta="projects"]', countLabel(projects.length, plurals.project));
  setText('[data-meta="experience"]', `${ui.since} ${formatMonth(tenure(allRoles).start)}`);
  setText('[data-meta="capabilities"]', countLabel(capabilities.length, plurals.area));
  setText('[data-meta="currently"]', `${ui.updated} ${formatMonth(currently.updated)}`);
  setText('[data-year]', String(new Date().getFullYear()));
}

/** Durante o desenvolvimento local, lista no console o que ainda está pendente. */
function reportPendingContent() {
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
  const pending = findTodos({ projects, experience, capabilities, currently });
  if (pending.length === 0) return;
  console.info(`[portfolio] ${pending.length} campos pendentes em src/data:`);
  console.table(pending);
}

render();
initTheme();
initNavigation();
initReveal();
initDisclosures();
initTimeline();
initCopy();
initCursorLabel();
initGridOverlay();
initPortrait();
initHeroName();
initContactGlobe();
initMotion();
reportPendingContent();
