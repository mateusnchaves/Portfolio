import { projectImage, ui } from '../config.js';
import { pad } from '../lib/format.js';
import { html } from '../lib/html.js';
import { isTodo } from '../lib/todo.js';
import { externalLink, filled, icon, tagList } from './ui.js';

const usable = (url) => (url && !isTodo(url) ? url : null);

function mediaLink(project, content) {
  const { repo, demo } = project.links ?? {};
  const href = usable(demo) ?? usable(repo);
  if (!href) return content;
  const label = usable(demo) ? ui.viewDemo : ui.viewCode;
  return html`<a class="media__link" href="${href}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-label="${label}: ${project.title} ${ui.newTab}" data-cursor-label="${label}">${content}</a>`;
}

function media(project, number) {
  const caption = html`<figcaption class="meta">${ui.figure} ${number} — ${project.title}</figcaption>`;

  if (project.image) {
    const { src, alt, width = projectImage.width, height = projectImage.height } = project.image;
    return html`
      <figure class="case__media media">
        ${mediaLink(project, html`
          <div class="media__frame">
            <img src="${src}" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async">
          </div>`)}
        ${caption}
      </figure>`;
  }

  return html`
    <figure class="case__media media">
      <div class="media__frame">
        <div class="media__canvas">
          <p class="media__note">
            <span class="placeholder__tag">${ui.pending}</span>
            <span class="media__note-title">${ui.screenshotPending}</span>
            <code>${projectImage.directory}/${project.id}.webp · ${projectImage.width} × ${projectImage.height}</code>
          </p>
        </div>
      </div>
      ${caption}
    </figure>`;
}

const metaRow = (label, value, render) => html`
  <div class="case__meta-row">
    <dt class="meta">${label}</dt>
    <dd>${filled(value, render)}</dd>
  </div>`;

function details(id, story) {
  return html`
    <div class="case__details" id="${id}-details">
      <div class="case__details-inner">
        <dl class="case__narrative">
          ${story.map(
            ([label, value], i) => html`
              <div>
                <dt class="meta">${pad(i + 1)} — ${label}</dt>
                <dd>${filled(value)}</dd>
              </div>`,
          )}
        </dl>
      </div>
    </div>`;
}

export function projectCase(project, index) {
  const number = pad(index + 1);
  const id = `case-${project.id}`;
  const { repo, demo } = project.links ?? {};
  const story = [
    [ui.problem, project.problem],
    [ui.solution, project.solution],
    [ui.result, project.result],
  ].filter(([, value]) => value);

  return html`
    <article class="case" aria-labelledby="${id}-title" data-reveal>
      <header class="case__head">
        <p class="case__index meta">${ui.case} ${number}</p>
        <h3 class="case__title" id="${id}-title">${project.title}</h3>
        ${project.featured && html`<p class="case__flag meta">${ui.featured}</p>`}
      </header>

      ${media(project, number)}

      <div class="case__info">
        <p class="case__summary">${filled(project.summary)}</p>
        <dl class="case__meta">
          ${metaRow(ui.category, project.category)}
          ${metaRow(ui.year, project.year)}
          ${metaRow(ui.stack, project.stack, tagList)}
          ${project.team && metaRow(ui.team, project.team, (names) => names.join(', '))}
        </dl>
        ${(repo || demo) &&
        html`<ul class="case__links">
          ${repo && html`<li>${filled(repo, (url) => externalLink(url, ui.repo))}</li>`}
          ${demo && html`<li>${filled(demo, (url) => externalLink(url, ui.demo))}</li>`}
        </ul>`}
        ${story.length > 0 &&
        html`<button
          class="case__toggle"
          type="button"
          aria-expanded="false"
          aria-controls="${id}-details"
          data-disclosure
          data-label-expanded="${ui.caseClose}"
          data-label-collapsed="${ui.caseOpen}"
        >
          <span data-disclosure-label>${ui.caseOpen}</span>${icon('plus')}
        </button>`}
      </div>

      ${story.length > 0 && details(id, story)}
    </article>`;
}