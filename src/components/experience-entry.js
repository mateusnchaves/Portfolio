import { plurals, ui } from '../config.js';
import { countLabel, formatDuration, formatMonth, monthsBetween, tenure } from '../lib/format.js';
import { html } from '../lib/html.js';

const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const range = ({ start, end }) => html`
  <time datetime="${start}">${formatMonth(start)}</time> —
  ${end ? html`<time datetime="${end}">${formatMonth(end)}</time>` : html`<span class="timeline__now">${ui.present}</span>`}`;

/**
 * Termos que ligam cada tecnologia ao texto: o próprio nome, as partes de
 * nomes compostos ("Service / Telecontrol") e os sinônimos em `aliases`.
 */
const skillTerms = (skill, aliases = {}) => [skill, ...skill.split(' / '), ...(aliases[skill] ?? [])];

/**
 * Marca no texto os trechos que correspondem a cada tecnologia do cargo.
 * Trechos mais longos têm prioridade; sobreposições são ignoradas.
 */
function linkSkills(text, skills, aliases) {
  const found = [];
  const lower = text.toLocaleLowerCase('pt-BR');
  skills.forEach((skill) => {
    new Set(skillTerms(skill, aliases)).forEach((term) => {
      const needle = term.toLocaleLowerCase('pt-BR');
      for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, at + 1)) {
        found.push({ start: at, end: at + term.length, skill: slug(skill) });
      }
    });
  });

  // O mesmo trecho pode servir a várias tecnologias ("Dashboard web": HTML, CSS e JavaScript).
  const spans = [];
  found
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
    .forEach((match) => {
      const same = spans.find((span) => span.start === match.start && span.end === match.end);
      if (same) same.skills.add(match.skill);
      else if (!spans.some((span) => match.start < span.end && match.end > span.start)) {
        spans.push({ start: match.start, end: match.end, skills: new Set([match.skill]) });
      }
    });
  spans.sort((a, b) => a.start - b.start);

  const parts = [];
  let cursor = 0;
  spans.forEach((span) => {
    parts.push(text.slice(cursor, span.start));
    parts.push(html`<mark class="skill-mark" data-skills="${[...span.skills].join(' ')}">${text.slice(span.start, span.end)}</mark>`);
    cursor = span.end;
  });
  parts.push(text.slice(cursor));
  return { parts, linked: new Set(spans.flatMap((span) => [...span.skills])) };
}

const role = (item) => {
  const skills = item.skills ?? [];
  const highlights = item.highlights.map((text) => linkSkills(text, skills, item.aliases));
  const linked = new Set(highlights.flatMap((highlight) => [...highlight.linked]));

  return html`
    <li class="timeline__item${item.end ? '' : ' is-current'}" data-reveal>
      <p class="timeline__period meta">
        <span>${range(item)}</span>
        <span>${formatDuration(monthsBetween(item.start, item.end))}</span>
      </p>
      <div class="timeline__content" data-skill-scope>
        <h4 class="timeline__role">${item.title}</h4>
        <ul class="timeline__highlights">
          ${highlights.map(({ parts }) => html`<li>${parts}</li>`)}
        </ul>
        ${skills.length > 0 &&
        html`<ul class="tags">
          ${skills.map((skill) =>
            linked.has(slug(skill))
              ? html`<li class="tag tag--linked" data-skill="${slug(skill)}">${skill}</li>`
              : html`<li class="tag">${skill}</li>`,
          )}
        </ul>`}
      </div>
    </li>`;
};

/** Barra com o período na empresa, dividida nos cargos na proporção da duração de cada um. */
const span = (entry) => {
  const roles = [...entry.roles].sort((a, b) => a.start.localeCompare(b.start));
  const { start, end } = tenure(entry.roles);
  return html`
    <div class="org__span" aria-hidden="true">
      <div class="org__bar">
        ${roles.map(
          (item, i) =>
            html`<span class="org__segment${item.end ? '' : ' is-current'}" style="flex-grow: ${monthsBetween(item.start, item.end)}; --i: ${i}"></span>`,
        )}
      </div>
      <p class="org__ticks meta">
        <span>${formatMonth(start)}</span>
        <span>${end ? formatMonth(end) : ui.today}</span>
      </p>
    </div>`;
};

export function experienceEntry(entry) {
  const id = `org-${slug(entry.company)}`;

  return html`
    <article class="org" aria-labelledby="${id}">
      <header class="org__aside" data-reveal>
        <h3 class="org__name" id="${id}">${entry.company}</h3>
        <p class="meta">${range(tenure(entry.roles))}</p>
        <p class="meta">${countLabel(entry.roles.length, plurals.role)}</p>
        ${span(entry)}
      </header>
      <ol class="timeline" data-timeline>
        ${entry.roles.map(role)}
      </ol>
    </article>`;
}
