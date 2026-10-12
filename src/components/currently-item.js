import { html } from '../lib/html.js';

/** Linha de disponibilidade que fecha a seção, logo antes do contato. */
export const availability = ({ status, details }) => html`
  <div class="availability" data-reveal>
    <p class="status meta"><span class="status__dot" aria-hidden="true"></span>${status}</p>
    <ul class="availability__details">
      ${details.map((detail) => html`<li>${detail}</li>`)}
    </ul>
  </div>`;

export const currentlyItem = (item) => html`
  <li class="now__item" data-reveal>
    <h3 class="now__label meta" lang="en">${item.label}</h3>
    <p class="now__text">${item.text}</p>
  </li>`;
