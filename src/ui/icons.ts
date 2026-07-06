/** Minimal hand-drawn inline SVG icons (24×24 grid, stroke-based). */

const svg = (body: string, viewBox = '0 0 24 24'): string =>
  `<svg viewBox="${viewBox}" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  gear: svg(
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>'
  ),
  eye: svg('<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.3 1.3 1.5 2.2h4.2c.2-.9.7-1.6 1.5-2.2A6 6 0 0 0 12 3z"/>'),
  restart: svg('<path d="M4 10a8 8 0 1 1 1.5 7"/><path d="M4 4v6h6"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.8 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z"/>'),
  starFill:
    `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.8 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z"/></svg>`,
  lock: svg('<rect x="5.5" y="11" width="13" height="9" rx="2"/><path d="M8.5 11V7.8a3.5 3.5 0 0 1 7 0V11"/>'),
  flame: svg('<path d="M12 3s5.5 4.2 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.6 2.8-6 .3 1.3 1 2.2 2 2.7C11.2 7.6 11.6 5.2 12 3z"/>'),
  infinity: svg('<path d="M8 12c-1.5-2-4.5-2-5.5 0s1 4.5 3 3.5S9.5 12 12 12s4-4.5 6.5-3.5 3 4.5 1 5.5-4-1-5.5-3"/>'),
  play: `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M7 4.5l12 7.5-12 7.5z"/></svg>`,
  check: svg('<path d="M4.5 12.5l5 5 10-11"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>'),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 2.8V6M16 2.8V6"/>')
} as const;

export type IconName = keyof typeof icons;
