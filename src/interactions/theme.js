const STORAGE_KEY = 'theme';

/**
 * Botão [data-theme-toggle] alterna entre claro e escuro. O claro é o padrão;
 * o escuro só liga pelo botão. A escolha fica no localStorage e o script do
 * <head> a aplica antes da primeira pintura.
 */
export function initTheme() {
  // Há dois botões: um no header (desktop) e um dentro do menu (celular).
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  if (toggles.length === 0) return;

  const root = document.documentElement;
  const isDark = () => root.dataset.theme === 'dark';

  // O rótulo fixo é "Modo escuro"; aria-pressed diz se ele está ligado.
  const sync = () => toggles.forEach((toggle) => toggle.setAttribute('aria-pressed', String(isDark())));

  const flip = () => {
    const next = isDark() ? 'light' : 'dark';
    if (next === 'dark') root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem localStorage (navegação privada), o tema vale só para esta visita.
    }
    sync();
  };

  toggles.forEach((toggle) => toggle.addEventListener('click', flip));
  sync();
}
