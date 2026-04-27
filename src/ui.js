import { PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT } from "./constants.js";
import { buildQuotaBoardSummary } from "./quota-summary.js";

function buildSvgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const BRAND_SYMBOL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="cad-bg" x1="16" y1="14" x2="82" y2="84" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0E6B58" />
      <stop offset="1" stop-color="#BB6236" />
    </linearGradient>
    <radialGradient id="cad-glow" cx="0" cy="0" r="1" gradientTransform="translate(67 26) rotate(122.905) scale(48.6898)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFF4DE" stop-opacity="0.95" />
      <stop offset="1" stop-color="#FFF4DE" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="8" y="8" width="80" height="80" rx="24" fill="url(#cad-bg)" />
  <rect x="8" y="8" width="80" height="80" rx="24" fill="url(#cad-glow)" />
  <path d="M40 27C29.507 27 21 36.178 21 48C21 59.822 29.507 69 40 69C45.545 69 50.536 66.438 54.01 62.356" stroke="#FFF8EF" stroke-width="9" stroke-linecap="round" />
  <path d="M56.5 66L66.132 31.855C66.709 29.812 69.59 29.812 70.168 31.855L79.8 66" stroke="#FFF8EF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M61.5 52H74.8" stroke="#FFF8EF" stroke-width="8" stroke-linecap="round" />
  <circle cx="69.4" cy="25.2" r="5.4" fill="#FFD79B" />
  <path d="M69.4 18.8V31.6M62.999 25.2H75.8" stroke="#FFF8EF" stroke-width="2.8" stroke-linecap="round" opacity="0.9" />
</svg>
`.trim();

const HEADER_LOGO_SVG = `
<svg class="brand-symbol-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="cad-header-bg" x1="16" y1="14" x2="82" y2="84" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0E6B58" />
      <stop offset="1" stop-color="#BB6236" />
    </linearGradient>
    <radialGradient id="cad-header-glow" cx="0" cy="0" r="1" gradientTransform="translate(67 26) rotate(122.905) scale(48.6898)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFF4DE" stop-opacity="0.95" />
      <stop offset="1" stop-color="#FFF4DE" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="8" y="8" width="80" height="80" rx="24" fill="url(#cad-header-bg)" />
  <rect x="8" y="8" width="80" height="80" rx="24" fill="url(#cad-header-glow)" />
  <path d="M40 27C29.507 27 21 36.178 21 48C21 59.822 29.507 69 40 69C45.545 69 50.536 66.438 54.01 62.356" stroke="#FFF8EF" stroke-width="9" stroke-linecap="round" />
  <path d="M56.5 66L66.132 31.855C66.709 29.812 69.59 29.812 70.168 31.855L79.8 66" stroke="#FFF8EF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M61.5 52H74.8" stroke="#FFF8EF" stroke-width="8" stroke-linecap="round" />
  <circle cx="69.4" cy="25.2" r="5.4" fill="#FFD79B" />
  <path d="M69.4 18.8V31.6M62.999 25.2H75.8" stroke="#FFF8EF" stroke-width="2.8" stroke-linecap="round" opacity="0.9" />
</svg>
`.trim();

const FAVICON_DATA_URI = buildSvgDataUri(BRAND_SYMBOL_SVG);

export function renderHtml() {
  return String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#133f37" />
    <title>Codex Auth Dashboard</title>
    <link rel="icon" href="${FAVICON_DATA_URI}" type="image/svg+xml" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --bg-deep: #e8dfd2;
        --surface: rgba(252, 248, 241, 0.82);
        --surface-strong: rgba(255, 251, 245, 0.92);
        --surface-muted: rgba(246, 239, 229, 0.9);
        --line: rgba(78, 56, 34, 0.14);
        --line-strong: rgba(78, 56, 34, 0.26);
        --text: #20160f;
        --muted: #715c4a;
        --accent: #8e3b25;
        --accent-strong: #612414;
        --accent-2: #1c5a56;
        --accent-2-soft: rgba(28, 90, 86, 0.08);
        --ok: #21674d;
        --warn: #b96d1e;
        --danger: #a23d31;
        --info: #345a87;
        --shadow-soft: 0 14px 34px rgba(63, 35, 12, 0.08);
        --shadow-card: 0 28px 70px rgba(63, 35, 12, 0.11);
        --radius-xl: 34px;
        --radius-lg: 26px;
        --radius-md: 18px;
        --radius-sm: 12px;
        --mono: "IBM Plex Mono", "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace;
        --display: "Iowan Old Style", "Palatino Linotype", "Songti SC", "STSong", serif;
        --sans: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
      }

      * { box-sizing: border-box; }

      html {
        background:
          radial-gradient(circle at top left, rgba(28, 90, 86, 0.16), transparent 28%),
          radial-gradient(circle at 85% 12%, rgba(142, 59, 37, 0.18), transparent 26%),
          linear-gradient(180deg, #f7f0e6 0%, var(--bg) 100%);
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: var(--sans);
        background:
          linear-gradient(180deg, rgba(255, 251, 245, 0.68), rgba(255, 251, 245, 0.22)),
          repeating-linear-gradient(
            90deg,
            rgba(84, 62, 40, 0.035) 0,
            rgba(84, 62, 40, 0.035) 1px,
            transparent 1px,
            transparent 84px
          );
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: auto;
        pointer-events: none;
        z-index: 0;
      }

      body::before {
        top: 0;
        right: 0;
        width: 38vw;
        height: 38vw;
        background: radial-gradient(circle, rgba(142, 59, 37, 0.14), transparent 68%);
        filter: blur(18px);
      }

      body::after {
        left: -8vw;
        bottom: -8vw;
        width: 34vw;
        height: 34vw;
        background: radial-gradient(circle, rgba(28, 90, 86, 0.12), transparent 70%);
        filter: blur(20px);
      }

      button,
      input {
        font: inherit;
      }

      button {
        appearance: none;
        border: 0;
        cursor: pointer;
      }

      button,
      input {
        outline: none;
      }

      button:focus-visible,
      input:focus-visible {
        box-shadow: 0 0 0 3px rgba(142, 59, 37, 0.16);
      }

      .shell {
        position: relative;
        z-index: 1;
        max-width: 1480px;
        margin: 0 auto;
        padding: 24px 24px 44px;
      }

      .card {
        position: relative;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        backdrop-filter: blur(16px);
      }

      .card::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 1px solid rgba(255, 255, 255, 0.45);
        pointer-events: none;
      }

      .section-kicker {
        margin: 0 0 8px;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .masthead {
        overflow: visible;
        padding: 24px;
        background:
          linear-gradient(140deg, rgba(37, 24, 18, 0.95), rgba(55, 33, 23, 0.88)),
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
        color: #f8efe3;
        animation: rise 420ms ease;
      }

      .masthead-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
        align-items: start;
      }

      .masthead::before {
        content: "CONTROL ROOM";
        position: absolute;
        right: 28px;
        top: 12px;
        font-family: var(--display);
        font-size: clamp(2.4rem, 8vw, 5.4rem);
        line-height: 0.9;
        letter-spacing: 0.04em;
        color: rgba(255, 245, 234, 0.045);
        pointer-events: none;
      }

      .brand-panel {
        display: grid;
        gap: 14px;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 56px;
        height: 56px;
        padding: 7px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255, 248, 238, 0.16), rgba(255, 248, 238, 0.04));
        border: 1px solid rgba(255, 244, 227, 0.2);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .brand-symbol-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .eyebrow {
        margin: 0 0 4px;
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(248, 239, 227, 0.72);
      }

      h1,
      h2,
      h3 {
        margin: 0;
        font-family: var(--display);
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      h1 {
        font-size: clamp(2rem, 3.6vw, 3.4rem);
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0;
      }

      h2 {
        font-size: clamp(1.45rem, 2.1vw, 2rem);
        line-height: 1.08;
      }

      .lede {
        max-width: 560px;
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.98rem;
        line-height: 1.55;
      }

      .hero-note {
        display: block;
        align-items: center;
        margin-top: 5px;
        padding: 0;
        border: 0;
        background: transparent;
        color: rgba(248, 239, 227, 0.54);
        font-size: 0.72rem;
      }

      .hero-note strong {
        color: inherit;
        font-weight: 600;
      }

      .toolbar-panel {
        position: relative;
        z-index: 4;
        display: grid;
        gap: 0;
        justify-items: stretch;
      }

      .masthead-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: flex-start;
      }

      .button-primary,
      .button-secondary,
      .button-ghost,
      .button-danger {
        min-height: 36px;
        padding: 9px 13px;
        border-radius: 12px;
        border: 1px solid transparent;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 0.72rem;
        font-weight: 700;
        transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease, background 140ms ease, border-color 140ms ease, color 140ms ease;
      }

      .masthead-actions > .button-primary,
      .masthead-actions > .button-secondary,
      .masthead-actions > .button-ghost,
      .masthead-actions > .toolbar-menu {
        flex: 0 0 auto;
      }

      .button-primary:hover:not(:disabled),
      .button-secondary:hover:not(:disabled),
      .button-ghost:hover:not(:disabled),
      .button-danger:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .button-primary:disabled,
      .button-secondary:disabled,
      .button-ghost:disabled,
      .button-danger:disabled {
        opacity: 0.56;
        cursor: wait;
      }

      .button-primary {
        color: #fff6ed;
        background: linear-gradient(180deg, #a14528, #7a2c17);
        border-color: rgba(255, 215, 187, 0.18);
        box-shadow: 0 12px 24px rgba(122, 44, 23, 0.22);
      }

      .button-secondary {
        color: var(--text);
        background: rgba(255, 247, 237, 0.9);
        border: 1px solid rgba(101, 72, 45, 0.16);
      }

      .button-ghost {
        color: #f8efe3;
        background: rgba(255, 244, 231, 0.06);
        border: 1px solid rgba(255, 235, 215, 0.12);
      }

      .button-danger {
        color: #fff6f4;
        background: linear-gradient(180deg, #c35746, var(--danger));
        box-shadow: 0 12px 24px rgba(162, 61, 49, 0.18);
      }

      .toolbar-inline-hint {
        display: none;
        min-height: 40px;
        padding: 10px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 236, 213, 0.12);
        background: rgba(255, 245, 230, 0.05);
        color: rgba(248, 239, 227, 0.76);
        font-size: 0.8rem;
        line-height: 1.45;
      }

      .toolbar-help-card {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 20;
        width: min(460px, calc(100vw - 48px));
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
        gap: 4px 10px;
        padding: 10px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255, 236, 213, 0.12);
        background:
          linear-gradient(180deg, rgba(255, 249, 239, 0.08), rgba(255, 249, 239, 0.02)),
          rgba(255, 247, 236, 0.04);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-4px);
        transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
        visibility: hidden;
      }

      .toolbar-panel:hover .toolbar-help-card,
      .toolbar-panel:focus-within .toolbar-help-card {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
        visibility: visible;
      }

      .toolbar-help-eyebrow {
        display: none;
        font-size: 0.66rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(248, 239, 227, 0.54);
      }

      .toolbar-help-title {
        color: #fff3e6;
        font-size: 0.92rem;
        line-height: 1.25;
        white-space: nowrap;
      }

      .toolbar-help-copy {
        margin: 0;
        color: rgba(248, 239, 227, 0.82);
        font-size: 0.76rem;
        line-height: 1.35;
      }

      .toolbar-help-meta {
        display: flex;
        flex-wrap: wrap;
        grid-column: 1 / -1;
        gap: 4px 12px;
      }

      .toolbar-help-meta-item {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
      }

      .toolbar-help-meta-label {
        font-size: 0.64rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(248, 239, 227, 0.54);
        white-space: nowrap;
      }

      .toolbar-help-meta-value {
        color: rgba(248, 239, 227, 0.88);
        max-width: 210px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.72rem;
        line-height: 1.3;
      }

      .toolbar-menu {
        position: relative;
        flex: 0 0 auto;
        z-index: 6;
      }

      .toolbar-menu summary {
        list-style: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .toolbar-menu summary::-webkit-details-marker {
        display: none;
      }

      .toolbar-menu.is-disabled summary {
        pointer-events: none;
        opacity: 0.56;
      }

      .toolbar-menu-trigger {
        min-width: 118px;
      }

      .toolbar-menu[open] .toolbar-menu-trigger {
        background: rgba(255, 252, 247, 0.98);
        box-shadow: 0 12px 24px rgba(63, 35, 12, 0.08);
      }

      .toolbar-menu-panel {
        position: absolute;
        right: 0;
        top: calc(100% + 10px);
        z-index: 24;
        width: min(360px, calc(100vw - 32px));
        display: grid;
        gap: 14px;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(95, 68, 42, 0.18);
        background:
          radial-gradient(circle at top right, rgba(28, 90, 86, 0.1), transparent 28%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.99), rgba(245, 236, 224, 0.98));
        box-shadow: 0 26px 50px rgba(34, 22, 13, 0.22);
      }

      .toolbar-menu[data-vertical="up"] .toolbar-menu-panel {
        top: auto;
        bottom: calc(100% + 10px);
      }

      .toolbar-menu[data-horizontal="left"] .toolbar-menu-panel {
        right: auto;
        left: 0;
      }

      .toolbar-menu-group {
        display: grid;
        gap: 8px;
      }

      .toolbar-menu-group + .toolbar-menu-group {
        padding-top: 12px;
        border-top: 1px solid rgba(95, 68, 42, 0.12);
      }

      .toolbar-menu-group-label {
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .toolbar-menu-button {
        display: grid;
        gap: 4px;
        width: 100%;
        padding: 12px 13px;
        border-radius: 14px;
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 251, 245, 0.74);
        color: var(--text);
        text-align: left;
        transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
      }

      .toolbar-menu-button:hover:not(:disabled),
      .toolbar-menu-button:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(142, 59, 37, 0.2);
        background: rgba(255, 252, 247, 0.98);
        box-shadow: 0 12px 24px rgba(63, 35, 12, 0.08);
      }

      .toolbar-menu-button:disabled {
        opacity: 0.56;
        cursor: wait;
      }

      .toolbar-menu-button-title {
        font-size: 0.84rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .toolbar-menu-button-copy {
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.45;
      }

      .summary-grid {
        position: relative;
        z-index: 0;
        display: grid;
        align-items: start;
        gap: 14px;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.82fr);
        margin-top: 18px;
      }

      .summary-card,
      .spotlight-card {
        position: relative;
        padding: 18px;
        border-radius: 20px;
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: var(--surface-strong);
        box-shadow: var(--shadow-soft);
        color: var(--text);
      }

      .summary-card {
        height: fit-content;
      }

      .spotlight-card {
        background:
          radial-gradient(circle at top right, rgba(28, 90, 86, 0.16), transparent 32%),
          linear-gradient(180deg, rgba(255, 251, 245, 0.98), rgba(246, 237, 224, 0.94));
      }

      .spotlight-head {
        display: grid;
        gap: 8px;
      }

      .spotlight-name {
        margin-top: 3px;
        font-size: clamp(1.25rem, 2vw, 1.7rem);
        line-height: 1.1;
        letter-spacing: 0;
        color: #3e2819;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.38);
      }

      .spotlight-id {
        margin-top: 6px;
        font-family: var(--mono);
        font-size: 0.78rem;
        color: var(--muted);
        word-break: break-all;
      }

      .spotlight-reason {
        margin: 0;
        font-size: 0.82rem;
        line-height: 1.4;
        color: var(--muted);
      }

      .tag-row,
      .order-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .tag-row {
        margin-top: 10px;
      }

      .spotlight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .quota-board-window {
        display: grid;
        gap: 8px;
        padding: 13px 14px;
        border-radius: 16px;
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 255, 255, 0.48);
      }

      .quota-board-window-head {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: baseline;
      }

      .quota-board-window-label {
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .quota-board-window-value {
        font-size: clamp(1rem, 1.5vw, 1.25rem);
        font-weight: 700;
        color: #3e2819;
      }

      .quota-board-bar {
        position: relative;
        overflow: hidden;
        display: flex;
        width: 100%;
        min-height: 14px;
        border-radius: 999px;
        background: rgba(32, 22, 15, 0.08);
        border: 1px solid rgba(95, 68, 42, 0.1);
      }

      .quota-board-bar[data-empty="true"] {
        background:
          repeating-linear-gradient(
            135deg,
            rgba(113, 92, 74, 0.12) 0,
            rgba(113, 92, 74, 0.12) 8px,
            rgba(255, 255, 255, 0.16) 8px,
            rgba(255, 255, 255, 0.16) 16px
          );
      }

      .quota-board-segment {
        min-width: 0;
        height: 100%;
      }

      .quota-board-segment.high {
        background: linear-gradient(90deg, #2b7f60, #34a853);
      }

      .quota-board-segment.medium {
        background: linear-gradient(90deg, #d48a24, #ffb347);
      }

      .quota-board-segment.low {
        background: linear-gradient(90deg, #c95f40, #ff7b5a);
      }

      .quota-board-segment.unknown {
        background: rgba(113, 92, 74, 0.18);
      }

      .quota-board-meta {
        margin-top: 2px;
      }

      .quota-board-details {
        margin-top: 0;
        border-top: 1px dashed rgba(95, 68, 42, 0.14);
        padding-top: 8px;
      }

      .quota-board-details summary {
        cursor: pointer;
        list-style: none;
        color: var(--info);
        font-size: 0.76rem;
        font-weight: 600;
      }

      .quota-board-details summary::-webkit-details-marker {
        display: none;
      }

      .quota-board-details summary::before {
        content: "▸";
        display: inline-block;
        margin-right: 6px;
        transition: transform 140ms ease;
      }

      .quota-board-details[open] summary::before {
        transform: rotate(90deg);
      }

      .quota-board-detail-list {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }

      .quota-board-detail-row {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.52);
        border: 1px solid rgba(95, 68, 42, 0.1);
      }

      .quota-board-detail-label {
        min-width: 0;
        font-size: 0.82rem;
        font-weight: 600;
        color: #3e2819;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .quota-board-detail-values {
        display: inline-flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }

      .quota-board-detail-empty {
        color: var(--muted);
        font-size: 0.78rem;
      }

      .meta-tag,
      .order-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: rgba(255, 247, 236, 0.86);
        color: var(--text);
        font-size: 0.76rem;
      }

      .meta-tag.ok,
      .status-badge.ok,
      .order-pill.ok {
        color: var(--ok);
        border-color: rgba(29, 107, 74, 0.16);
        background: rgba(29, 107, 74, 0.08);
      }

      .meta-tag.warn,
      .status-badge.warn,
      .order-pill.warn {
        color: var(--warn);
        border-color: rgba(155, 98, 22, 0.18);
        background: rgba(155, 98, 22, 0.08);
      }

      .meta-tag.danger,
      .status-badge.danger,
      .order-pill.danger {
        color: var(--danger);
        border-color: rgba(161, 54, 51, 0.18);
        background: rgba(161, 54, 51, 0.08);
      }

      .meta-tag.info,
      .status-badge.info,
      .order-pill.info {
        color: var(--info);
        border-color: rgba(56, 95, 141, 0.18);
        background: rgba(56, 95, 141, 0.08);
      }

      .spotlight-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }

      .summary-card h3 {
        font-size: 1rem;
        line-height: 1.18;
        color: #3e2819;
      }

      .summary-copy {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .stat-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .stat-grid.compact {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .stat-box {
        display: grid;
        gap: 2px;
        padding: 14px 14px 13px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 251, 245, 0.82);
      }

      .stat-label {
        font-size: 0.74rem;
        letter-spacing: 0.02em;
        color: var(--muted);
      }

      .stat-value {
        font-family: var(--display);
        font-size: 1.12rem;
        line-height: 1.1;
        color: #392515;
      }

      .stat-box.emphasis {
        padding: 14px 15px;
        gap: 6px;
      }

      .stat-box.emphasis .stat-value {
        font-size: clamp(1.45rem, 2.6vw, 2rem);
      }

      .stat-box.available {
        background: linear-gradient(180deg, rgba(242, 250, 245, 0.98), rgba(229, 244, 236, 0.92));
        border-color: rgba(33, 103, 77, 0.14);
      }

      .stat-box.depleted {
        background: linear-gradient(180deg, rgba(255, 246, 237, 0.98), rgba(248, 232, 219, 0.94));
        border-color: rgba(185, 109, 30, 0.16);
      }

      .stat-box.total {
        background: linear-gradient(180deg, rgba(255, 251, 245, 0.98), rgba(244, 237, 227, 0.92));
      }

      .summary-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .summary-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(250, 242, 232, 0.92);
      }

      .summary-meta-value {
        font-family: var(--mono);
        font-size: 0.8rem;
        line-height: 1;
        color: var(--text);
      }

      .snapshot-grid {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .snapshot-item {
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(67, 52, 38, 0.08);
      }

      .snapshot-item:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }

      .snapshot-item .stat-label {
        margin-bottom: 6px;
      }

      .snapshot-value {
        color: var(--text);
        font-family: var(--mono);
        font-size: 0.83rem;
        line-height: 1.6;
        word-break: break-all;
      }

      .snapshot-value[data-multiline="true"] {
        white-space: pre-wrap;
      }

      .flash-banner {
        margin-top: 16px;
        padding: 13px 16px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(95, 68, 42, 0.16);
        background: rgba(255, 250, 243, 0.9);
        box-shadow: var(--shadow-soft);
        font-size: 0.86rem;
        line-height: 1.4;
        animation: rise 220ms ease;
      }

      .flash-banner[hidden] {
        display: none;
      }

      .flash-banner.info {
        color: var(--info);
        border-color: rgba(56, 95, 141, 0.16);
        background: rgba(244, 248, 255, 0.88);
      }

      .flash-banner.success {
        color: var(--ok);
        border-color: rgba(29, 107, 74, 0.16);
        background: rgba(242, 251, 245, 0.88);
      }

      .flash-banner.warn {
        color: var(--warn);
        border-color: rgba(155, 98, 22, 0.16);
        background: rgba(255, 249, 238, 0.9);
      }

      .flash-banner.danger {
        color: var(--danger);
        border-color: rgba(161, 54, 51, 0.16);
        background: rgba(255, 245, 244, 0.9);
      }

      .overview-rail {
        margin-top: 14px;
      }

      .alert-grid {
        display: flex;
        gap: 8px;
        padding: 0;
        overflow-x: auto;
        scroll-snap-type: x proximity;
      }

      .alert-grid::-webkit-scrollbar {
        height: 8px;
      }

      .alert-grid::-webkit-scrollbar-thumb {
        background: rgba(67, 52, 38, 0.18);
        border-radius: 999px;
      }

      .alert-card {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: rgba(255, 249, 241, 0.92);
        box-shadow: none;
        animation: rise 240ms ease;
        scroll-snap-align: start;
      }

      .alert-card.warn {
        background: linear-gradient(180deg, rgba(255, 250, 242, 0.98), rgba(255, 246, 234, 0.92));
      }

      .alert-card.info {
        background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(242, 246, 252, 0.9));
      }

      .alert-card.ok {
        background: linear-gradient(180deg, rgba(247, 252, 249, 0.98), rgba(241, 249, 245, 0.92));
      }

      .alert-card.danger {
        background: linear-gradient(180deg, rgba(255, 248, 247, 0.98), rgba(255, 242, 241, 0.92));
      }

      .login-alert-card {
        align-items: stretch;
        min-width: min(540px, calc(100vw - 40px));
        padding: 16px;
        border-radius: 22px;
      }

      .login-alert-shell {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .login-alert-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .login-alert-status {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(29, 29, 31, 0.08);
        color: var(--text);
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .login-alert-copy {
        display: grid;
        gap: 6px;
      }

      .login-alert-copy p {
        margin: 0;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.5;
      }

      .login-alert-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .login-alert-manual {
        display: grid;
        gap: 10px;
        padding-top: 2px;
      }

      .login-alert-manual-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .login-alert-manual-top strong {
        font-size: 0.86rem;
      }

      .login-alert-note {
        margin: 0;
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.45;
      }

      .login-alert-form {
        display: grid;
        gap: 10px;
      }

      .login-alert-form-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .login-alert-form-row .input {
        flex: 1 1 320px;
      }

      .login-alert-form-row .button-primary {
        min-width: 148px;
      }

      .alert-title { display: contents; }

      .alert-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        border: 0;
        font-size: 0;
      }

      .alert-title h3 {
        font-size: 0.82rem;
        font-weight: 600;
      }

      .alert-list {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-height: none;
        overflow: visible;
      }

      .alert-item {
        padding-left: 0;
        position: static;
        color: var(--muted);
        font-size: 0.8rem;
        line-height: 1;
        white-space: nowrap;
      }

      .workspace {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }

      .tabbar-card {
        padding: 8px;
        border-radius: 20px;
        background: rgba(248, 240, 230, 0.86);
      }

      .tabbar {
        display: flex;
        gap: 10px;
        align-items: center;
        overflow-x: auto;
      }

      .tab-button {
        flex: 0 0 auto;
        min-height: 38px;
        padding: 8px 18px;
        border-radius: 14px;
        border: 1px solid rgba(95, 68, 42, 0.06);
        background: transparent;
        color: var(--muted);
        transition: transform 140ms ease, background 140ms ease, color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      }

      .tab-button:hover:not([aria-selected="true"]) {
        transform: translateY(-1px);
        color: var(--text);
      }

      .tab-button[aria-selected="true"] {
        color: var(--text);
        border-color: rgba(95, 68, 42, 0.12);
        background: rgba(255, 252, 247, 0.98);
        box-shadow: 0 10px 22px rgba(63, 35, 12, 0.08);
      }

      .tab-button-label {
        display: block;
        font-weight: 600;
      }

      .tab-button-copy { display: none; }

      .tab-panels {
        display: grid;
        gap: 18px;
      }

      .tab-panel[hidden] {
        display: none !important;
      }

      .settings-layout {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
      }

      .panel-span-full {
        grid-column: 1 / -1;
      }

      .panel {
        padding: 26px;
        animation: rise 460ms ease;
      }

      .panel[data-tab-panel="accounts"] {
        overflow: visible;
      }

      .panel-head {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 14px;
      }

      .account-bulk-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 12px;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 14px 16px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: linear-gradient(180deg, rgba(255, 251, 245, 0.94), rgba(242, 234, 223, 0.9));
      }

      .account-bulk-summary {
        display: grid;
        gap: 4px;
      }

      .account-bulk-summary strong {
        font-size: 0.92rem;
        color: #3e2819;
      }

      .account-bulk-summary span {
        color: var(--muted);
        font-size: 0.78rem;
      }

      .account-bulk-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      .panel-copy {
        max-width: 560px;
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .view-switch {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(248, 240, 230, 0.86);
      }

      .view-switch-button {
        min-height: 34px;
        padding: 8px 14px;
        border-radius: 999px;
        background: transparent;
        color: var(--muted);
        font-size: 0.8rem;
        transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
      }

      .view-switch-button.active {
        background: rgba(255, 252, 247, 0.98);
        color: var(--text);
        box-shadow: 0 10px 22px rgba(63, 35, 12, 0.08);
      }

      .order-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .order-card {
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: var(--surface-muted);
      }

      .order-card h3 {
        font-size: 0.96rem;
        margin-bottom: 0;
      }

      .order-card .panel-copy { display: none; }

      .order-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .order-entry {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 251, 245, 0.9);
      }

      .order-entry-head {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }

      .order-entry-rank {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: rgba(32, 22, 15, 0.08);
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.76rem;
      }

      .order-entry-name {
        min-width: 0;
      }

      .order-entry-name strong {
        display: block;
        font-size: 0.9rem;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .order-entry-name span {
        display: block;
        margin-top: 2px;
        font-family: var(--mono);
        font-size: 0.68rem;
        line-height: 1.3;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .order-entry-meta {
        font-family: var(--mono);
        font-size: 0.72rem;
        color: var(--muted);
      }

      .micro-meter {
        height: 6px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(29, 29, 31, 0.08);
      }

      .micro-meter-fill {
        height: 100%;
        border-radius: inherit;
      }

      .micro-meter.high .micro-meter-fill {
        background: linear-gradient(90deg, #1f7a57, #43b581);
      }

      .micro-meter.medium .micro-meter-fill {
        background: linear-gradient(90deg, #b97728, #e3aa58);
      }

      .micro-meter.low .micro-meter-fill {
        background: linear-gradient(90deg, #a94739, #d96a5b);
      }

      .micro-meter.unknown {
        background:
          repeating-linear-gradient(
            135deg,
            rgba(67, 52, 38, 0.08),
            rgba(67, 52, 38, 0.08) 6px,
            rgba(255, 255, 255, 0.36) 6px,
            rgba(255, 255, 255, 0.36) 12px
          );
      }

      .order-entry-foot {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-items: center;
      }

      .order-entry-foot span {
        font-size: 0.72rem;
        color: var(--muted);
      }

      .order-pill.is-primary {
        color: var(--accent-strong);
        border-color: rgba(15, 109, 89, 0.16);
        background: rgba(15, 109, 89, 0.1);
      }

      .settings-section + .settings-section {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(95, 68, 42, 0.12);
      }

      .field {
        display: grid;
        gap: 7px;
      }

      .field + .field {
        margin-top: 12px;
      }

      .field-label {
        font-size: 0.8rem;
        color: var(--muted);
      }

      .field-note {
        color: var(--muted);
        font-size: 0.74rem;
        line-height: 1.4;
      }

      .input {
        width: 100%;
        min-height: 44px;
        padding: 11px 14px;
        border-radius: 14px;
        border: 1px solid rgba(95, 68, 42, 0.16);
        background: rgba(255, 251, 245, 0.96);
        color: var(--text);
      }

      .toggle {
        display: flex;
        gap: 12px;
        align-items: start;
        padding: 12px 0 0;
      }

      .toggle input {
        width: 17px;
        height: 17px;
        margin-top: 3px;
        accent-color: var(--accent);
      }

      .toggle strong {
        display: block;
        margin-bottom: 4px;
        font-size: 0.92rem;
      }

      .radio-list {
        display: grid;
        gap: 8px;
      }

      .profile-list {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .profile-group-list {
        display: grid;
        gap: 16px;
      }

      .profile-group {
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: linear-gradient(180deg, rgba(255, 251, 245, 0.98), rgba(242, 234, 223, 0.94));
      }

      .profile-group-head {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 14px;
      }

      .profile-group-title {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .profile-group-title strong {
        font-family: var(--display);
        font-size: 1rem;
        font-weight: 600;
      }

      .profile-group-note {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.45;
      }

      .profile-card {
        position: relative;
        display: grid;
        gap: 12px;
        padding: 18px 18px 16px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(95, 68, 42, 0.14);
        background:
          radial-gradient(circle at top right, rgba(142, 59, 37, 0.07), transparent 28%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(244, 236, 226, 0.95));
        box-shadow: 0 18px 36px rgba(63, 35, 12, 0.08);
      }

      .profile-card.top {
        border-color: rgba(142, 59, 37, 0.22);
        box-shadow: 0 20px 42px rgba(122, 44, 23, 0.14);
      }

      .profile-card.top::before {
        content: "";
        position: absolute;
        left: 18px;
        right: 18px;
        top: 0;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(161, 69, 40, 0.94), rgba(227, 170, 88, 0.72));
      }

      .profile-card.problem {
        border-color: rgba(162, 61, 49, 0.26);
      }

      .profile-card.selected {
        border-color: rgba(28, 90, 86, 0.34);
        box-shadow: 0 22px 48px rgba(28, 90, 86, 0.14);
      }

      .profile-card.selected::after {
        content: "";
        position: absolute;
        inset: 12px;
        border-radius: calc(var(--radius-lg) - 8px);
        border: 1px solid rgba(28, 90, 86, 0.16);
        pointer-events: none;
      }

      .profile-head {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        justify-content: space-between;
      }

      .profile-select-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        padding: 0 2px 0 0;
        color: var(--muted);
        font-size: 0.76rem;
        user-select: none;
      }

      .profile-select-toggle input {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: var(--accent-2);
      }

      .profile-main {
        min-width: 0;
        display: grid;
        gap: 6px;
      }

      .profile-header-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: space-between;
      }

      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        min-height: 36px;
        padding: 0 12px;
        border-radius: 14px;
        background: rgba(32, 22, 15, 0.92);
        border: 1px solid rgba(255, 228, 201, 0.12);
        color: #f7eadb;
        font-family: var(--mono);
        font-size: 0.76rem;
      }

      .profile-topline {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        align-items: baseline;
      }

      .profile-identity {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 12px;
        align-items: baseline;
        min-width: 0;
      }

      .profile-name {
        font-family: var(--display);
        font-size: clamp(1.08rem, 1.6vw, 1.42rem);
        line-height: 1.02;
        font-weight: 600;
        color: #352114;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .profile-subline {
        margin-top: 0;
        padding-top: 2px;
        color: rgba(96, 73, 51, 0.84);
        font-family: var(--mono);
        font-size: 0.7rem;
        line-height: 1.2;
      }

      .profile-state-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.1);
        background: rgba(255, 251, 245, 0.66);
        color: rgba(84, 63, 43, 0.9);
        font-size: 0.73rem;
        white-space: nowrap;
      }

      .state-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        flex: 0 0 auto;
      }

      .state-dot.high { color: var(--ok); }
      .state-dot.medium { color: var(--warn); }
      .state-dot.low { color: var(--danger); }
      .state-dot.unknown { color: var(--muted); }

      .profile-main-window {
        min-width: 0;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 4px 9px;
        border-radius: 999px;
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: rgba(252, 246, 236, 0.92);
        font-size: 0.74rem;
        color: var(--text);
      }

      .profile-secondary-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 10px;
        align-items: center;
        min-width: 0;
        color: rgba(96, 73, 51, 0.84);
        font-size: 0.74rem;
        line-height: 1.35;
      }

      .profile-secondary-row .order-pill {
        min-height: 24px;
        padding: 4px 10px;
        font-size: 0.74rem;
      }

      .profile-inline-note {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        color: rgba(79, 58, 39, 0.86);
        white-space: nowrap;
      }

      .profile-inline-note.strong {
        font-weight: 600;
      }

      .metric-card {
        padding: 12px 14px 11px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 251, 245, 0.88);
      }

      .metric-card.primary-window {
        background: linear-gradient(180deg, rgba(239, 248, 242, 0.98), rgba(227, 242, 233, 0.92));
        border-color: rgba(33, 103, 77, 0.14);
      }

      .metric-card.primary-window .metric strong {
        font-size: 1.16rem;
      }

      .metric-card.secondary-window {
        background: rgba(255, 248, 239, 0.84);
      }

      .metric-title {
        margin: 0 0 6px;
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(95, 72, 50, 0.76);
      }

      .metric {
        display: grid;
        gap: 6px;
      }

      .metric-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }

      .metric strong {
        font-size: 1.02rem;
        line-height: 1;
      }

      .metric-label {
        display: none;
      }

      .metric-bar {
        height: 7px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(73, 48, 27, 0.1);
      }

      .metric-bar-fill {
        height: 100%;
        border-radius: inherit;
        transition: width 180ms ease;
      }

      .metric-bar.high .metric-bar-fill {
        background: linear-gradient(90deg, #1f7a57, #43b581);
      }

      .metric-bar.medium .metric-bar-fill {
        background: linear-gradient(90deg, #b97728, #e3aa58);
      }

      .metric-bar.low .metric-bar-fill {
        background: linear-gradient(90deg, #a94739, #d96a5b);
      }

      .metric-bar.unknown {
        background:
          repeating-linear-gradient(
            135deg,
            rgba(67, 52, 38, 0.08),
            rgba(67, 52, 38, 0.08) 8px,
            rgba(255, 255, 255, 0.38) 8px,
            rgba(255, 255, 255, 0.38) 16px
          );
      }

      .metric-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .metric-meta small {
        color: rgba(95, 72, 50, 0.8);
        font-size: 0.71rem;
      }

      .countdown {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(255, 245, 232, 0.94);
        color: var(--text);
        font-family: var(--mono);
        font-size: 0.72rem;
      }

      .countdown.soon {
        color: var(--accent-2);
        background: rgba(185, 100, 58, 0.1);
      }

      .countdown.expired {
        color: var(--danger);
        background: rgba(161, 54, 51, 0.1);
      }

      .profile-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex: 0 0 auto;
      }

      .profile-actions .button-primary,
      .profile-actions .button-secondary,
      .profile-actions .button-ghost {
        min-height: 36px;
        padding: 9px 13px;
      }

      .profile-footer {
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }

      .profile-menu {
        position: relative;
      }

      .profile-menu summary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 36px;
        padding: 0 12px;
        border-radius: 14px;
        border: 1px solid rgba(95, 68, 42, 0.12);
        background: rgba(255, 247, 236, 0.92);
        color: var(--text);
        cursor: pointer;
        list-style: none;
      }

      .profile-menu summary::-webkit-details-marker { display: none; }

      .profile-menu[open] summary {
        background: rgba(255, 252, 247, 0.98);
        box-shadow: 0 14px 28px rgba(63, 35, 12, 0.1);
      }

      .profile-menu-list {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        z-index: 4;
        display: grid;
        gap: 6px;
        min-width: 112px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(95, 68, 42, 0.14);
        background: rgba(255, 252, 247, 0.98);
        box-shadow: 0 18px 34px rgba(63, 35, 12, 0.14);
      }

      .profile-menu[data-vertical="up"] .profile-menu-list {
        top: auto;
        bottom: calc(100% + 8px);
      }

      .profile-menu[data-horizontal="left"] .profile-menu-list {
        right: auto;
        left: 0;
      }

      .profile-menu-button {
        min-height: 34px;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(250, 242, 232, 0.9);
        color: var(--text);
        text-align: left;
      }

      .profile-menu-button.danger {
        color: var(--danger);
      }

      .error-text {
        margin-top: 2px;
        color: var(--danger);
        font-size: 0.76rem;
        line-height: 1.4;
      }

      .empty {
        padding: 18px 0 2px;
        color: var(--muted);
      }

      .empty[hidden] {
        display: none;
      }

      .modal-shell {
        position: fixed;
        inset: 0;
        z-index: 40;
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .modal-shell[hidden] {
        display: none;
      }

      .modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(29, 23, 18, 0.42);
        backdrop-filter: blur(10px);
      }

      .modal-card {
        position: relative;
        width: min(560px, 100%);
        padding: 24px;
        border-radius: 28px;
        border: 1px solid rgba(67, 52, 38, 0.16);
        background:
          radial-gradient(circle at top right, rgba(28, 90, 86, 0.18), transparent 34%),
          radial-gradient(circle at bottom left, rgba(142, 59, 37, 0.18), transparent 28%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.99), rgba(252, 243, 233, 0.97));
        box-shadow: 0 34px 90px rgba(50, 38, 25, 0.26);
      }

      .modal-top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: start;
      }

      .modal-eyebrow {
        margin: 0 0 8px;
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      .modal-title {
        font-size: clamp(1.5rem, 3vw, 2rem);
        line-height: 1.06;
      }

      .modal-copy {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .icon-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        color: var(--muted);
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(67, 52, 38, 0.1);
        font-size: 1.2rem;
      }

      .modal-form {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }

      .modal-card code {
        font-family: var(--mono);
        font-size: 0.92rem;
      }

      .profile-id-input {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        overflow: hidden;
        border-radius: 16px;
        border: 1px solid rgba(67, 52, 38, 0.14);
        background: rgba(255, 255, 255, 0.86);
      }

      .profile-id-prefix {
        display: inline-flex;
        align-items: center;
        min-height: 54px;
        padding: 0 14px 0 16px;
        color: var(--accent);
        font-family: var(--mono);
        font-size: 0.92rem;
        background: rgba(15, 109, 89, 0.08);
        border-right: 1px solid rgba(67, 52, 38, 0.1);
      }

      .profile-id-suffix {
        min-width: 0;
        border: 0;
        border-radius: 0;
        padding: 16px 16px 16px 14px;
        background: transparent;
        font-family: var(--mono);
        font-size: 0.96rem;
      }

      .modal-detail-card {
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.64);
      }

      .modal-detail-card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .modal-detail-card p {
        margin: 0;
        color: var(--text);
        line-height: 1.6;
      }

      .modal-detail-card p + p {
        margin-top: 8px;
      }

      .modal-note {
        margin: 0;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.55;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .modal-actions button {
        min-width: 118px;
      }

      .error-line {
        color: var(--danger);
        font-size: 0.88rem;
        line-height: 1.55;
      }

      [hidden] {
        display: none !important;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1200px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }

        .settings-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .masthead-grid {
          grid-template-columns: 1fr;
        }

        .toolbar-panel {
          width: 100%;
        }

        .masthead-actions {
          width: 100%;
        }

        .summary-grid,
        .order-grid {
          grid-template-columns: 1fr;
        }

        .spotlight-grid {
          grid-template-columns: 1fr;
        }

        .spotlight-visual {
          justify-items: start;
        }

        .profile-head,
        .profile-footer {
          display: grid;
          grid-template-columns: 1fr;
        }

        .profile-header-meta {
          justify-content: flex-start;
        }

        .stat-grid.compact,
        .summary-meta,
        .profile-list,
        .metrics-column {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .shell {
          padding: 16px 12px 28px;
        }

        .masthead,
        .panel {
          padding: 18px;
        }

        .brand-panel {
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .masthead::before {
          right: 14px;
          top: 14px;
          font-size: 3.1rem;
        }

        .brand-mark {
          width: 48px;
          height: 48px;
        }

        .profile-list,
        .stat-grid.compact,
        .summary-meta,
        .metrics-column {
          grid-template-columns: 1fr;
        }

        .masthead-actions {
          gap: 8px;
        }

        .masthead-actions > .button-primary,
        .masthead-actions > .button-secondary,
        .masthead-actions > .button-ghost,
        .masthead-actions > .toolbar-menu {
          width: 100%;
        }

        .toolbar-help-card {
          display: none;
        }

        .toolbar-inline-hint {
          display: block;
        }

        .profile-card {
          padding: 16px;
        }

        .profile-card.top::before {
          left: 16px;
          right: 16px;
        }

        .profile-topline,
        .profile-identity,
        .profile-secondary-row {
          row-gap: 6px;
        }

        .profile-actions {
          width: 100%;
          justify-content: space-between;
        }

        .toolbar-menu-panel {
          right: 0;
          left: 0;
          width: min(100%, calc(100vw - 24px));
        }

        .panel-head,
        .profile-group-head,
        .account-bulk-bar {
          flex-direction: column;
        }

        .view-switch {
          width: 100%;
        }

        .view-switch-button {
          flex: 1 1 0;
        }

        .account-bulk-actions {
          width: 100%;
          justify-content: stretch;
        }

        .account-bulk-actions .button-secondary,
        .account-bulk-actions .button-danger {
          flex: 1 1 0;
        }

        .profile-id-input {
          grid-template-columns: 1fr;
        }

        .profile-id-prefix {
          min-height: auto;
          padding: 12px 14px 0;
          background: transparent;
          border-right: 0;
        }

        .profile-id-suffix {
          padding-top: 8px;
        }

        .modal-card {
          padding: 20px;
        }

        .modal-actions {
          flex-direction: column-reverse;
        }

        .modal-actions button {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="card masthead">
        <div class="masthead-grid">
          <div class="brand-panel">
            <div class="brand-mark">${HEADER_LOGO_SVG}</div>
            <div>
              <p class="eyebrow">Codex Accounts</p>
              <h1>一眼看清哪个账号还能用</h1>
              <div class="hero-note"><strong>仅本地</strong></div>
            </div>
          </div>
          <div class="toolbar-panel">
            <div class="masthead-actions" role="toolbar" aria-label="主要操作">
              <button id="refreshButton" class="button-secondary" type="button" data-toolbar-action="refresh">刷新额度</button>
              <button id="applyButton" class="button-primary" type="button" data-toolbar-action="apply">应用推荐</button>
              <button id="bootstrapButton" class="button-secondary" type="button" data-toolbar-action="bootstrap">初始化本地库</button>
              <button id="importPrimaryButton" class="button-secondary" type="button" data-toolbar-action="import">导入号池</button>
              <button id="addButton" class="button-ghost" type="button" data-toolbar-action="add">新增账号</button>
              <details id="toolsMenu" class="toolbar-menu" hidden>
                <summary id="toolsMenuButton" class="button-secondary toolbar-menu-trigger" data-toolbar-action="moreTools">更多工具</summary>
                <div id="toolsMenuPanel" class="toolbar-menu-panel">
                  <section class="toolbar-menu-group">
                    <div class="toolbar-menu-group-label">运行维护</div>
                    <button id="syncButton" class="toolbar-menu-button" type="button" data-toolbar-action="sync">
                      <span class="toolbar-menu-button-title">同步配置</span>
                      <span class="toolbar-menu-button-copy">把本地号池补到 openclaw.json，不切换当前账号</span>
                    </button>
                    <button id="rebuildRuntimeButton" class="toolbar-menu-button" type="button" data-toolbar-action="rebuild">
                      <span class="toolbar-menu-button-title">重建运行文件</span>
                      <span class="toolbar-menu-button-copy">按本地号池重写 OpenClaw、Hermes 以及兼容的 Codex 运行投影</span>
                    </button>
                    <button id="cleanupDuplicatesButton" class="toolbar-menu-button" type="button" data-toolbar-action="cleanupDuplicates">
                      <span class="toolbar-menu-button-title">清理重复账号</span>
                      <span class="toolbar-menu-button-copy">按同一 OpenAI 用户自动合并重复 profile，并重建运行投影</span>
                    </button>
                    <button id="absorbRuntimeButton" class="toolbar-menu-button" type="button" data-toolbar-action="absorb">
                      <span class="toolbar-menu-button-title">吸收运行数据</span>
                      <span class="toolbar-menu-button-copy">把当前 OpenClaw runtime 状态显式吸收到本地号池</span>
                    </button>
                  </section>
                  <section class="toolbar-menu-group">
                    <div class="toolbar-menu-group-label">迁移备份</div>
                    <button id="exportButton" class="toolbar-menu-button" type="button" data-toolbar-action="export">
                      <span class="toolbar-menu-button-title">导出号池</span>
                      <span class="toolbar-menu-button-copy">导出加密 bundle，方便在其他电脑恢复登录状态</span>
                    </button>
                    <button id="importButton" class="toolbar-menu-button" type="button" data-toolbar-action="import">
                      <span class="toolbar-menu-button-title">导入号池</span>
                      <span class="toolbar-menu-button-copy">先预览再合并导入，不直接覆盖现有本地号池</span>
                    </button>
                  </section>
                </div>
              </details>
            </div>
            <div id="toolbarInlineHint" class="toolbar-inline-hint" aria-live="polite">高频动作留在这里，低频维护操作收进“更多工具”。</div>
            <section id="toolbarHelpCard" class="toolbar-help-card" aria-live="polite">
              <div class="toolbar-help-eyebrow">Action Guide</div>
              <h3 id="toolbarHelpTitle" class="toolbar-help-title">刷新额度</h3>
              <p id="toolbarHelpDescription" class="toolbar-help-copy">重新读取本地号池与运行文件，拉取额度并重算推荐顺序。</p>
              <div class="toolbar-help-meta">
                <div class="toolbar-help-meta-item">
                  <span class="toolbar-help-meta-label">会改哪里</span>
                  <span id="toolbarHelpMutates" class="toolbar-help-meta-value">不改动文件，只重新读取状态</span>
                </div>
                <div class="toolbar-help-meta-item">
                  <span class="toolbar-help-meta-label">不会做什么</span>
                  <span id="toolbarHelpSafe" class="toolbar-help-meta-value">不会切换当前账号，也不会写回配置</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="summary-grid">
          <section class="spotlight-card">
            <div class="spotlight-head">
              <div>
                <div class="toolbar-help-eyebrow">Quota Overview</div>
                <h2 id="quotaBoardTitle" class="spotlight-name">全局可用额度</h2>
                <p id="quotaBoardDescription" class="spotlight-reason">按成功读取额度的账号汇总 7d 与 5h 总剩余额度。</p>
              </div>
              <div id="quotaBoardTags" class="tag-row"></div>
            </div>
            <div class="spotlight-grid">
              <section class="quota-board-window">
                <div class="quota-board-window-head">
                  <div class="quota-board-window-label">7d 总剩余</div>
                  <div id="quotaBoardSecondaryValue" class="quota-board-window-value">--% / --%</div>
                </div>
                <div id="quotaBoardSecondaryBar" class="quota-board-bar" role="progressbar" aria-label="7d total remaining quota" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
                <div id="quotaBoardSecondaryMeta" class="tag-row quota-board-meta"></div>
                <details id="quotaBoardSecondaryDetails" class="quota-board-details">
                  <summary id="quotaBoardSecondaryDetailsSummary">查看可读账号明细</summary>
                  <div id="quotaBoardSecondaryDetailsList" class="quota-board-detail-list"></div>
                </details>
              </section>
              <section class="quota-board-window">
                <div class="quota-board-window-head">
                  <div class="quota-board-window-label">5h 总剩余</div>
                  <div id="quotaBoardPrimaryValue" class="quota-board-window-value">--% / --%</div>
                </div>
                <div id="quotaBoardPrimaryBar" class="quota-board-bar" role="progressbar" aria-label="5h total remaining quota" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
                <div id="quotaBoardPrimaryMeta" class="tag-row quota-board-meta"></div>
                <details id="quotaBoardPrimaryDetails" class="quota-board-details">
                  <summary id="quotaBoardPrimaryDetailsSummary">查看可用账号明细</summary>
                  <div id="quotaBoardPrimaryDetailsList" class="quota-board-detail-list"></div>
                </details>
              </section>
            </div>
          </section>

          <section class="summary-card">
            <h3>概览</h3>
            <div class="stat-grid compact">
              <div class="stat-box emphasis total">
                <div class="stat-label">账号数</div>
                <div id="profilesCountValue" class="stat-value">-</div>
              </div>
              <div class="stat-box emphasis depleted">
                <div class="stat-label">7 天已耗尽</div>
                <div id="depletedProfilesValue" class="stat-value">-</div>
              </div>
              <div class="stat-box emphasis available">
                <div class="stat-label">7 天还有额度</div>
                <div id="availableProfilesValue" class="stat-value">-</div>
              </div>
            </div>
            <div class="summary-meta">
              <div class="summary-meta-item">
                <div class="stat-label">待处理提醒</div>
                <div id="warningsCountValue" class="summary-meta-value">-</div>
              </div>
              <div class="summary-meta-item">
                <div class="stat-label">下一次重置</div>
                <div id="nextResetValue" class="summary-meta-value">-</div>
              </div>
            </div>
          </section>
        </div>
      </header>

      <div id="flashBanner" class="flash-banner" hidden></div>
      <section class="overview-rail">
        <div id="alertsGrid" class="alert-grid"></div>
      </section>

      <div class="workspace">
        <section class="card tabbar-card">
          <nav class="tabbar" aria-label="主导航">
            <button id="tabAccounts" class="tab-button" type="button" data-tab="accounts" aria-selected="true">
              <span class="tab-button-label">账号</span>
            </button>
            <button id="tabOrder" class="tab-button" type="button" data-tab="order" aria-selected="false">
              <span class="tab-button-label">顺序</span>
            </button>
            <button id="tabTokenRefresh" class="tab-button" type="button" data-tab="token-refresh" aria-selected="false">
              <span class="tab-button-label">刷新 Token</span>
            </button>
            <button id="tabSettings" class="tab-button" type="button" data-tab="settings" aria-selected="false">
              <span class="tab-button-label">设置</span>
            </button>
          </nav>
        </section>

        <div class="tab-panels">
          <section id="accountsPanel" class="card panel tab-panel" data-tab-panel="accounts">
            <div class="panel-head">
              <div>
                <h2>账号</h2>
              </div>
              <div class="view-switch" role="group" aria-label="账号展示方式">
                <button
                  id="accountsViewQuota"
                  class="view-switch-button active"
                  type="button"
                  data-accounts-view="quota"
                  aria-pressed="true"
                >额度顺序</button>
                <button
                  id="accountsViewGrouped"
                  class="view-switch-button"
                  type="button"
                  data-accounts-view="grouped"
                  aria-pressed="false"
                >邮箱后缀分组</button>
              </div>
            </div>
            <div id="accountsBulkBar" class="account-bulk-bar" hidden>
              <div class="account-bulk-summary">
                <strong id="accountsBulkCount">已选 0 个账号</strong>
                <span id="accountsBulkHint">可多选后一起删除。</span>
              </div>
              <div class="account-bulk-actions">
                <button id="accountsSelectAllButton" class="button-secondary" type="button">全选</button>
                <button id="accountsClearSelectionButton" class="button-secondary" type="button">清空</button>
                <button id="accountsDeleteSelectedButton" class="button-danger" type="button">删除所选</button>
              </div>
            </div>
            <div id="profilesList" class="profile-list"></div>
            <div id="emptyState" class="empty" hidden>还没有账号</div>
          </section>

          <section id="orderPanel" class="card panel tab-panel" data-tab-panel="order" hidden>
            <div class="panel-head">
              <div>
                <h2>运行顺序</h2>
              </div>
            </div>
            <div class="order-grid">
              <section class="order-card">
                <h3>当前</h3>
                <div id="effectiveOrder" class="order-list"></div>
              </section>
              <section class="order-card">
                <h3>推荐</h3>
                <div id="recommendedOrder" class="order-list"></div>
              </section>
            </div>
          </section>

          <section id="tokenRefreshPanel" class="tab-panel" data-tab-panel="token-refresh" hidden>
            <div class="settings-layout">
              <section class="card panel">
                <div class="panel-head">
                  <div>
                    <h2>Token 保活</h2>
                  </div>
                </div>

                <div class="settings-section">
                  <button id="tokenRefreshButton" class="button-primary" type="button">立即刷新 Token</button>
                  <p class="field-note">只检查并刷新需要续期的 OAuth token，不会自动改推荐顺序。</p>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">Token 定时刷新（秒）</span>
                    <input id="tokenRefreshIntervalInput" class="input" type="number" min="0" step="1" value="0" />
                    <span class="field-note">0 关闭，其余最小 300 秒。只有页面开着时才会执行。</span>
                  </label>
                </div>
              </section>

              <section class="card panel">
                <div class="panel-head">
                  <div>
                    <h2>保活状态</h2>
                  </div>
                </div>
                <div class="snapshot-grid">
                  <div class="snapshot-item">
                    <div class="stat-label">上次尝试</div>
                    <div id="tokenLastAttemptValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">上次完成</div>
                    <div id="tokenLastSuccessValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">最近变更</div>
                    <div id="tokenChangedProfilesValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">下一次计划</div>
                    <div id="tokenNextRunValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">最近错误</div>
                    <div id="tokenLastErrorValue" class="snapshot-value">-</div>
                  </div>
                </div>
              </section>

              <section class="card panel panel-span-full">
                <div class="panel-head">
                  <div>
                    <h2>到期提醒</h2>
                    <p class="panel-copy">提醒只检查账号到期时间，不会自动刷新 Token。进入提醒窗口后会在页面里持续显示，进入紧急窗口时只弹一次。</p>
                  </div>
                </div>

                <div class="settings-section">
                  <label class="toggle">
                    <input id="tokenReminderEnabledToggle" type="checkbox" />
                    <span>
                      <strong>开启到期提醒</strong>
                      <span class="field-note">页面首次打开、重新切回前台时会立刻检查；页面保持打开时按间隔自动检查。</span>
                    </span>
                  </label>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">自动检查间隔（分钟）</span>
                    <input id="tokenReminderIntervalInput" class="input" type="number" min="1" step="1" value="30" />
                    <span class="field-note">默认 30 分钟。值越小越及时，但检查频率更高。</span>
                  </label>

                  <label class="field">
                    <span class="field-label">到期几天前提醒</span>
                    <input id="tokenReminderWarnDaysInput" class="input" type="number" min="0" step="1" value="1" />
                    <span class="field-note">进入这个窗口后，会在页面顶部持续显示提醒卡片。</span>
                  </label>

                  <label class="field">
                    <span class="field-label">到期几小时前弹窗</span>
                    <input id="tokenReminderModalHoursInput" class="input" type="number" min="0" step="1" value="6" />
                    <span class="field-note">同一账号在同一次到期时间下，只会弹一次紧急提醒。</span>
                  </label>
                </div>

                <div class="settings-section">
                  <div class="snapshot-grid">
                    <div class="snapshot-item">
                      <div class="stat-label">最近检查</div>
                      <div id="tokenReminderLastCheckedValue" class="snapshot-value">-</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">下一次检查</div>
                      <div id="tokenReminderNextRunValue" class="snapshot-value">-</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">页内提醒</div>
                      <div id="tokenReminderWarnCountValue" class="snapshot-value">0 个账号</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">紧急弹窗</div>
                      <div id="tokenReminderModalCountValue" class="snapshot-value">0 个账号</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">最早到期</div>
                      <div id="tokenReminderEarliestValue" class="snapshot-value">-</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section id="settingsPanel" class="tab-panel" data-tab-panel="settings" hidden>
            <div class="settings-layout">
              <section class="card panel">
                <div class="panel-head">
                  <div>
                    <h2>额度自动化</h2>
                  </div>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">额度自动刷新（秒）</span>
                    <input id="quotaRefreshIntervalInput" class="input" type="number" min="0" step="1" value="0" />
                    <span class="field-note">0 关闭。会刷新额度并重算推荐顺序。</span>
                  </label>

                  <label class="toggle">
                    <input id="autoApplyToggle" type="checkbox" />
                    <span>
                      <strong>额度刷新后自动应用推荐</strong>
                      <span class="field-note">只在推荐顺序变化时调整</span>
                    </span>
                  </label>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">Codex 自动化模式</span>
                    <div class="radio-list" role="radiogroup" aria-label="Codex 自动化模式">
                      <label class="toggle">
                        <input id="codexAutomationShared" type="radio" name="codexAutomationMode" value="shared" />
                        <span>
                          <strong>共享模式</strong>
                          <span class="field-note">自动应用推荐时，Codex 跟 OpenClaw 一起切换。</span>
                        </span>
                      </label>
                      <label class="toggle">
                        <input id="codexAutomationIndependent" type="radio" name="codexAutomationMode" value="independent-low-quota" />
                        <span>
                          <strong>独立避让</strong>
                          <span class="field-note">Codex 避开 OpenClaw 第一名，只有当前 Codex 额度偏低时才自动切换。</span>
                        </span>
                      </label>
                      <label class="toggle">
                        <input id="codexAutomationManual" type="radio" name="codexAutomationMode" value="manual" />
                        <span>
                          <strong>仅手动</strong>
                          <span class="field-note">展示 Codex 推荐，但不自动改写 <code>~/.codex/auth.json</code>。</span>
                        </span>
                      </label>
                    </div>
                  </label>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">代理 URL</span>
                    <input id="usageProxyUrlInput" class="input" type="text" value="" placeholder="http://127.0.0.1:7890" />
                    <span class="field-note">留空则沿用系统代理</span>
                  </label>

                  <label class="toggle">
                    <input id="usageProxyToggle" type="checkbox" />
                    <span>
                      <strong>查询额度时使用代理</strong>
                    </span>
                  </label>
                </div>
              </section>

              <section class="card panel panel-span-full" id="cloudSyncPanel">
                <div class="panel-head">
                  <div>
                    <h2>存储模式 · 云端同步</h2>
                    <p class="panel-copy">默认离线模式：所有账号数据只存本机。切换到云端模式后，canonical 数据会写入你自己的 Cloudflare D1，多设备之间共享并为 refresh 加分布式互斥。</p>
                  </div>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">存储模式</span>
                    <div class="radio-list" role="radiogroup" aria-label="存储模式">
                      <label class="toggle">
                        <input id="storeModeOffline" type="radio" name="storeMode" value="offline" />
                        <span>
                          <strong>离线模式</strong>
                          <span class="field-note">默认，不需要任何配置，仅使用本机 <code>.local/auth-store.json</code>。刷新 Token 完全本地执行。</span>
                        </span>
                      </label>
                      <label class="toggle">
                        <input id="storeModeCloud" type="radio" name="storeMode" value="cloud" />
                        <span>
                          <strong>云端模式（Cloudflare D1）</strong>
                          <span class="field-note">canonical store 同步到 D1；刷新 Token 时先从 D1 拉取、加 per-profile 互斥锁，再写回 D1。</span>
                        </span>
                      </label>
                    </div>
                  </label>
                </div>

                <div id="cloudSyncFields" class="settings-section" hidden>
                  <label class="field">
                    <span class="field-label">Cloudflare Account ID</span>
                    <input id="cloudAccountIdInput" class="input" type="text" autocomplete="off" spellcheck="false" placeholder="留空则保留当前配置；例如 your-account-id" />
                    <span id="cloudAccountIdStatus" class="field-note">通过 <code>wrangler whoami</code> 可以看到。</span>
                  </label>
                  <label class="field">
                    <span class="field-label">D1 Database ID</span>
                    <input id="cloudDatabaseIdInput" class="input" type="text" autocomplete="off" spellcheck="false" placeholder="留空则保留当前配置；例如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                    <span id="cloudDatabaseIdStatus" class="field-note">运行 <code>wrangler d1 create codex-auth-dashboard</code> 时会打印。</span>
                  </label>
                  <label class="field">
                    <span class="field-label">Cloudflare API Token</span>
                    <input id="cloudApiTokenInput" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="输入后保存即写入本机 .local/dashboard-config.json（0600）" />
                    <span id="cloudApiTokenStatus" class="field-note">未配置。需要 D1 Edit 权限。</span>
                  </label>
                  <label class="field">
                    <span class="field-label">加密 Passphrase（可选）</span>
                    <input id="cloudPassphraseInput" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="留空则 D1 中明文存 credential" />
                    <span id="cloudPassphraseStatus" class="field-note">设置后 credential blob 使用 AES-256-GCM + scrypt 加密。</span>
                  </label>
                  <div class="snapshot-grid">
                    <div class="snapshot-item">
                      <div class="stat-label">Device ID</div>
                      <div id="cloudDeviceIdValue" class="snapshot-value">-</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">D1 连通性</div>
                      <div id="cloudHealthValue" class="snapshot-value">未检测</div>
                    </div>
                    <div class="snapshot-item">
                      <div class="stat-label">最近同步错误</div>
                      <div id="cloudSyncErrorValue" class="snapshot-value" data-multiline="true">-</div>
                    </div>
                  </div>
                </div>

                <div class="settings-section">
                  <div class="modal-actions">
                    <button id="cloudConfigSaveButton" class="button-primary" type="button">保存配置</button>
                    <button id="cloudHealthCheckButton" class="button-secondary" type="button">测试连接</button>
                    <button id="cloudBootstrapButton" class="button-danger" type="button">用本地快照强制覆盖 D1（危险）</button>
                    <button id="cloudPullButton" class="button-secondary" type="button">从 D1 合并到本地（保留本地 meta）</button>
                  </div>
                  <p class="field-note">平日的增删改 / 刷新会自动同步。左边会清空 D1 后用本机快照整库重写；右边只把 D1 的账号和较新的 token 合并回本地，默认保留本机的 order / lastGood / usageStats / maintenance。</p>
                  <div id="cloudConfigStatus" class="field-note">-</div>
                </div>
              </section>

              <section class="card panel">
                <div class="panel-head">
                  <div>
                    <h2>连接</h2>
                  </div>
                </div>
                <div class="snapshot-grid">
                  <div class="snapshot-item">
                    <div class="stat-label">Agent</div>
                    <div id="agentValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">本地号池位置</div>
                    <div id="authValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">主读取 OpenClaw auth</div>
                    <div id="runtimeAuthValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">同步到的 OpenClaw auth</div>
                    <div id="runtimeAuthTargetsValue" class="snapshot-value" data-multiline="true">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">自动会话覆盖</div>
                    <div id="sessionOverridesValue" class="snapshot-value" data-multiline="true">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">Codex auth 位置</div>
                    <div id="codexValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">Hermes auth 位置</div>
                    <div id="hermesValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">配置文件位置</div>
                    <div id="configValue" class="snapshot-value">-</div>
                  </div>
                  <div class="snapshot-item">
                    <div class="stat-label">最近刷新</div>
                    <div id="timeValue" class="snapshot-value">-</div>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div id="addModal" class="modal-shell" hidden aria-hidden="true">
      <div class="modal-backdrop" data-modal-close="true"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="addModalTitle">
        <div class="modal-top">
          <div>
            <div class="modal-eyebrow">New Account</div>
            <h2 id="addModalTitle" class="modal-title">新增 openai-codex 账号</h2>
            <p class="modal-copy">填写后缀后开始登录。</p>
          </div>
          <button id="addModalCloseButton" class="icon-button" type="button" aria-label="关闭">×</button>
        </div>
        <form id="addModalForm" class="modal-form">
          <label class="field" for="addProfileSuffixInput">
            <span class="field-label">账号标识后缀</span>
            <div class="profile-id-input">
              <span class="profile-id-prefix">openai-codex:</span>
              <input
                id="addProfileSuffixInput"
                class="input profile-id-suffix"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="work"
              />
            </div>
            <span class="field-note">例如 <code>work</code></span>
          </label>
          <div class="modal-detail-card">
            <strong>将要创建</strong>
            <p><code id="addProfilePreview">openai-codex:<span>...</span></code></p>
          </div>
          <div id="addModalError" class="error-line" hidden></div>
          <p class="modal-note">重名时不会覆盖。</p>
          <div class="modal-actions">
            <button id="addModalCancelButton" class="button-secondary" type="button">取消</button>
            <button id="addModalSubmitButton" class="button-primary" type="submit">开始登录</button>
          </div>
        </form>
      </div>
    </div>

    <input id="importBundleInput" type="file" accept="application/json,.json" hidden />

    <div id="manageModal" class="modal-shell" hidden aria-hidden="true">
      <div class="modal-backdrop" data-manage-modal-close="true"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="manageModalTitle">
        <div class="modal-top">
          <div>
            <div id="manageModalEyebrow" class="modal-eyebrow">Manage Profile</div>
            <h2 id="manageModalTitle" class="modal-title">管理账号</h2>
            <p id="manageModalCopy" class="modal-copy">-</p>
          </div>
          <button id="manageModalCloseButton" class="icon-button" type="button" aria-label="关闭">×</button>
        </div>
        <form id="manageModalForm" class="modal-form">
          <div id="manageSummaryCard" class="modal-detail-card">
            <strong>当前账号</strong>
            <p><code id="manageProfileIdText">-</code></p>
            <p id="manageProfileHint">-</p>
          </div>

          <label id="renameField" class="field" for="renameProfileIdInput" hidden>
            <span class="field-label">新的账号名称</span>
            <input id="renameProfileIdInput" class="input" type="text" autocomplete="off" spellcheck="false" />
            <span class="field-note">保存后立即生效</span>
          </label>

          <div id="deleteField" class="modal-detail-card" hidden>
            <strong>删除确认</strong>
            <p>删除后会一起移除。</p>
            <p>这个操作不可撤销。</p>
          </div>

          <div id="manageModalError" class="error-line" hidden></div>

          <div class="modal-actions">
            <button id="manageModalCancelButton" class="button-secondary" type="button">取消</button>
            <button id="manageModalSubmitButton" class="button-primary" type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>

    <div id="tokenReminderModal" class="modal-shell" hidden aria-hidden="true">
      <div class="modal-backdrop" data-token-reminder-modal-close="true"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="tokenReminderModalTitle">
        <div class="modal-top">
          <div>
            <div class="modal-eyebrow">Token Reminder</div>
            <h2 id="tokenReminderModalTitle" class="modal-title">这些账号快到期了</h2>
            <p id="tokenReminderModalCopy" class="modal-copy">-</p>
          </div>
          <button id="tokenReminderModalCloseButton" class="icon-button" type="button" aria-label="关闭">×</button>
        </div>
        <div class="modal-form">
          <div class="modal-detail-card">
            <strong>需要你手动处理</strong>
            <div id="tokenReminderModalList" class="alert-list"></div>
          </div>
          <div class="modal-actions">
            <button id="tokenReminderModalDismissButton" class="button-secondary" type="button">知道了</button>
            <button id="tokenReminderModalFocusButton" class="button-primary" type="button">查看 Token 页</button>
          </div>
        </div>
      </div>
    </div>

    <script>
      const appState = {
        data: null,
        busy: false,
        flashMessage: "",
        flashTone: "info",
        loginTaskId: null,
        loginTask: null,
        popup: null,
        manualCodeDraft: "",
        manualCodeError: "",
        manualCodeSubmitting: false,
        loginTaskRenderKey: "",
        loginCompletionMessage: "新增账号完成",
        quotaRefreshTimer: null,
        quotaRefreshIntervalSeconds: 0,
        tokenRefreshTimer: null,
        tokenRefreshIntervalSeconds: 0,
        tokenRefreshNextRunAt: null,
        tokenReminderEnabled: true,
        tokenReminderTimer: null,
        tokenReminderCheckIntervalMinutes: 30,
        tokenReminderWarnDays: 1,
        tokenReminderModalHours: 6,
        tokenReminderNextRunAt: null,
        tokenReminderSnapshot: null,
        tokenReminderLastCheckedAt: null,
        tokenReminderWarnProfiles: [],
        tokenReminderModalProfiles: [],
        tokenReminderPendingModalProfiles: [],
        tokenReminderSeen: {},
        autoApplyRecommended: false,
        codexAutomationMode: "shared",
        codexRestartRequired: false,
        codexRestartMessage: "",
        usageProxyEnabled: false,
        usageProxyUrl: "",
        activeTab: "accounts",
        accountsView: "quota",
        selectedProfileIds: [],
        manageMode: null,
        manageRow: null,
        manageRows: [],
        toolbarActionKey: "refresh",
      };

      const QUOTA_REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.quota-refresh-interval-seconds";
      const LEGACY_REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.refresh-interval-seconds";
      const TOKEN_REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.token-refresh-interval-seconds";
      const TOKEN_REMINDER_ENABLED_STORAGE_KEY = "codex-auth-dashboard.token-reminder-enabled";
      const TOKEN_REMINDER_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.token-reminder-check-minutes";
      const TOKEN_REMINDER_WARN_DAYS_STORAGE_KEY = "codex-auth-dashboard.token-reminder-warn-days";
      const TOKEN_REMINDER_MODAL_HOURS_STORAGE_KEY = "codex-auth-dashboard.token-reminder-modal-hours";
      const TOKEN_REMINDER_SEEN_STORAGE_KEY = "codex-auth-dashboard.token-reminder-seen";
      const AUTO_APPLY_STORAGE_KEY = "codex-auth-dashboard.auto-apply-after-refresh";
      const CODEX_AUTOMATION_MODE_STORAGE_KEY = "codex-auth-dashboard.codex-automation-mode";
      const USAGE_PROXY_ENABLED_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-enabled";
      const USAGE_PROXY_URL_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-url";
      const ACTIVE_TAB_STORAGE_KEY = "codex-auth-dashboard.active-tab";
      const ACCOUNTS_VIEW_STORAGE_KEY = "codex-auth-dashboard.accounts-view";
      const PROFILE_ID_PREFIX = "openai-codex:";
      const MIN_TOKEN_REFRESH_INTERVAL_SECONDS = 300;

      const flashBanner = document.getElementById("flashBanner");
      const refreshButton = document.getElementById("refreshButton");
      const applyButton = document.getElementById("applyButton");
      const bootstrapButton = document.getElementById("bootstrapButton");
      const importPrimaryButton = document.getElementById("importPrimaryButton");
      const syncButton = document.getElementById("syncButton");
      const rebuildRuntimeButton = document.getElementById("rebuildRuntimeButton");
      const cleanupDuplicatesButton = document.getElementById("cleanupDuplicatesButton");
      const absorbRuntimeButton = document.getElementById("absorbRuntimeButton");
      const exportButton = document.getElementById("exportButton");
      const importButton = document.getElementById("importButton");
      const addButton = document.getElementById("addButton");
      const toolsMenu = document.getElementById("toolsMenu");
      const toolsMenuButton = document.getElementById("toolsMenuButton");
      const toolsMenuPanel = document.getElementById("toolsMenuPanel");
      const toolbarInlineHint = document.getElementById("toolbarInlineHint");
      const toolbarHelpTitle = document.getElementById("toolbarHelpTitle");
      const toolbarHelpDescription = document.getElementById("toolbarHelpDescription");
      const toolbarHelpMutates = document.getElementById("toolbarHelpMutates");
      const toolbarHelpSafe = document.getElementById("toolbarHelpSafe");
      const quotaRefreshIntervalInput = document.getElementById("quotaRefreshIntervalInput");
      const tokenRefreshButton = document.getElementById("tokenRefreshButton");
      const tokenRefreshIntervalInput = document.getElementById("tokenRefreshIntervalInput");
      const tokenLastAttemptValue = document.getElementById("tokenLastAttemptValue");
      const tokenLastSuccessValue = document.getElementById("tokenLastSuccessValue");
      const tokenChangedProfilesValue = document.getElementById("tokenChangedProfilesValue");
      const tokenNextRunValue = document.getElementById("tokenNextRunValue");
      const tokenLastErrorValue = document.getElementById("tokenLastErrorValue");
      const tokenReminderEnabledToggle = document.getElementById("tokenReminderEnabledToggle");
      const tokenReminderIntervalInput = document.getElementById("tokenReminderIntervalInput");
      const tokenReminderWarnDaysInput = document.getElementById("tokenReminderWarnDaysInput");
      const tokenReminderModalHoursInput = document.getElementById("tokenReminderModalHoursInput");
      const tokenReminderLastCheckedValue = document.getElementById("tokenReminderLastCheckedValue");
      const tokenReminderNextRunValue = document.getElementById("tokenReminderNextRunValue");
      const tokenReminderWarnCountValue = document.getElementById("tokenReminderWarnCountValue");
      const tokenReminderModalCountValue = document.getElementById("tokenReminderModalCountValue");
      const tokenReminderEarliestValue = document.getElementById("tokenReminderEarliestValue");
      const usageProxyUrlInput = document.getElementById("usageProxyUrlInput");
      const autoApplyToggle = document.getElementById("autoApplyToggle");
      const codexAutomationModeInputs = Array.from(document.querySelectorAll('input[name="codexAutomationMode"]'));
      const usageProxyToggle = document.getElementById("usageProxyToggle");
      const quotaBoardTitle = document.getElementById("quotaBoardTitle");
      const quotaBoardDescription = document.getElementById("quotaBoardDescription");
      const quotaBoardTags = document.getElementById("quotaBoardTags");
      const quotaBoardSecondaryValue = document.getElementById("quotaBoardSecondaryValue");
      const quotaBoardSecondaryBar = document.getElementById("quotaBoardSecondaryBar");
      const quotaBoardSecondaryMeta = document.getElementById("quotaBoardSecondaryMeta");
      const quotaBoardSecondaryDetails = document.getElementById("quotaBoardSecondaryDetails");
      const quotaBoardSecondaryDetailsSummary = document.getElementById("quotaBoardSecondaryDetailsSummary");
      const quotaBoardSecondaryDetailsList = document.getElementById("quotaBoardSecondaryDetailsList");
      const quotaBoardPrimaryValue = document.getElementById("quotaBoardPrimaryValue");
      const quotaBoardPrimaryBar = document.getElementById("quotaBoardPrimaryBar");
      const quotaBoardPrimaryMeta = document.getElementById("quotaBoardPrimaryMeta");
      const quotaBoardPrimaryDetails = document.getElementById("quotaBoardPrimaryDetails");
      const quotaBoardPrimaryDetailsSummary = document.getElementById("quotaBoardPrimaryDetailsSummary");
      const quotaBoardPrimaryDetailsList = document.getElementById("quotaBoardPrimaryDetailsList");
      const profilesCountValue = document.getElementById("profilesCountValue");
      const depletedProfilesValue = document.getElementById("depletedProfilesValue");
      const availableProfilesValue = document.getElementById("availableProfilesValue");
      const warningsCountValue = document.getElementById("warningsCountValue");
      const nextResetValue = document.getElementById("nextResetValue");
      const agentValue = document.getElementById("agentValue");
      const authValue = document.getElementById("authValue");
      const runtimeAuthValue = document.getElementById("runtimeAuthValue");
      const runtimeAuthTargetsValue = document.getElementById("runtimeAuthTargetsValue");
      const sessionOverridesValue = document.getElementById("sessionOverridesValue");
      const codexValue = document.getElementById("codexValue");
      const hermesValue = document.getElementById("hermesValue");
      const configValue = document.getElementById("configValue");
      const timeValue = document.getElementById("timeValue");
      const importBundleInput = document.getElementById("importBundleInput");
      const alertsGrid = document.getElementById("alertsGrid");
      const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
      const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const effectiveOrder = document.getElementById("effectiveOrder");
      const recommendedOrder = document.getElementById("recommendedOrder");
      const profilesList = document.getElementById("profilesList");
      const emptyState = document.getElementById("emptyState");
      const accountsBulkBar = document.getElementById("accountsBulkBar");
      const accountsBulkCount = document.getElementById("accountsBulkCount");
      const accountsBulkHint = document.getElementById("accountsBulkHint");
      const accountsSelectAllButton = document.getElementById("accountsSelectAllButton");
      const accountsClearSelectionButton = document.getElementById("accountsClearSelectionButton");
      const accountsDeleteSelectedButton = document.getElementById("accountsDeleteSelectedButton");
      const accountsViewQuotaButton = document.getElementById("accountsViewQuota");
      const accountsViewGroupedButton = document.getElementById("accountsViewGrouped");

      const addModal = document.getElementById("addModal");
      const addModalForm = document.getElementById("addModalForm");
      const addModalCloseButton = document.getElementById("addModalCloseButton");
      const addModalCancelButton = document.getElementById("addModalCancelButton");
      const addProfileSuffixInput = document.getElementById("addProfileSuffixInput");
      const addProfilePreview = document.getElementById("addProfilePreview");
      const addModalError = document.getElementById("addModalError");
      const addModalSubmitButton = document.getElementById("addModalSubmitButton");

      const manageModal = document.getElementById("manageModal");
      const manageModalForm = document.getElementById("manageModalForm");
      const manageModalEyebrow = document.getElementById("manageModalEyebrow");
      const manageModalTitle = document.getElementById("manageModalTitle");
      const manageModalCopy = document.getElementById("manageModalCopy");
      const manageModalCloseButton = document.getElementById("manageModalCloseButton");
      const manageModalCancelButton = document.getElementById("manageModalCancelButton");
      const manageModalSubmitButton = document.getElementById("manageModalSubmitButton");
      const manageProfileIdText = document.getElementById("manageProfileIdText");
      const manageProfileHint = document.getElementById("manageProfileHint");
      const renameField = document.getElementById("renameField");
      const renameProfileIdInput = document.getElementById("renameProfileIdInput");
      const deleteField = document.getElementById("deleteField");
      const manageModalError = document.getElementById("manageModalError");
      const tokenReminderModal = document.getElementById("tokenReminderModal");
      const tokenReminderModalCopy = document.getElementById("tokenReminderModalCopy");
      const tokenReminderModalList = document.getElementById("tokenReminderModalList");
      const tokenReminderModalCloseButton = document.getElementById("tokenReminderModalCloseButton");
      const tokenReminderModalDismissButton = document.getElementById("tokenReminderModalDismissButton");
      const tokenReminderModalFocusButton = document.getElementById("tokenReminderModalFocusButton");

      function normalizeTokenRefreshIntervalSeconds(value) {
        const nextInterval = Math.floor(Number(value) || 0);
        if (!Number.isFinite(nextInterval) || nextInterval <= 0) {
          return 0;
        }
        return Math.max(MIN_TOKEN_REFRESH_INTERVAL_SECONDS, nextInterval);
      }

      const PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT = ${JSON.stringify(PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT)};
      ${buildQuotaBoardSummary.toString()}

      const TOOLBAR_ACTIONS = {
        refresh: {
          label: "刷新额度",
          description: "重新拉取额度、读取当前状态，并重算推荐顺序；手动刷新时若发现重复账号，会提示是否清理。",
          mutates: "不会刷新 token，只会重新读取状态与额度",
          safe: "只有你确认后才会执行重复账号清理",
        },
        apply: {
          label: "应用推荐",
          description: "把推荐顺序写回本地号池，并刷新 OpenClaw 与 Hermes 的 openai-codex 投影。",
          mutates: "会更新本地顺序，并写回 OpenClaw 与 Hermes；共享模式下也可能同步 Codex",
          safe: "独立避让和仅手动模式不会自动切换 Codex 当前账号",
        },
        add: {
          label: "新增账号",
          description: "启动新的 OAuth 登录流程，把一个账号加入本地号池。",
          mutates: "会新增本地 profile，并同步 OpenClaw、Hermes 和兼容的 Codex 投影",
          safe: "不会覆盖同名账号",
        },
        bootstrap: {
          label: "初始化本地库",
          description: "第一次使用时，把现有 OpenClaw、Hermes 与 Codex sidecar 状态导入到项目本地号池。",
          mutates: "会创建 ./.local/auth-store.json",
          safe: "不会偷偷覆盖已经存在的本地号池",
        },
        import: {
          label: "导入号池",
          description: "导入加密 bundle，先预览再合并到本地号池。",
          mutates: "会更新本地号池，并同步 OpenClaw、Hermes 和兼容的 Codex 投影",
          safe: "不会直接无提示覆盖现有号池",
        },
        sync: {
          label: "同步配置",
          description: "把本地号池里的 profile 和顺序补到 openclaw.json。",
          mutates: "会写 openclaw.json",
          safe: "不会切换当前账号，也不会改 Codex auth",
        },
        rebuild: {
          label: "重建运行文件",
          description: "按本地号池重建 OpenClaw、Hermes 和兼容的 Codex 运行投影。",
          mutates: "会更新所有 agent 的 auth-profiles.json、清理自动会话覆盖、更新 Hermes auth.json，并在兼容时重写 ~/.codex/auth.json",
          safe: "不会改动本地号池内容",
        },
        cleanupDuplicates: {
          label: "清理重复账号",
          description: "按同一 OpenAI 用户合并重复 profile，修正导入历史留下的重复账号。",
          mutates: "会更新本地号池、重写顺序与引用，并刷新 OpenClaw、Hermes 和兼容的 Codex 投影",
          safe: "不会把同 team 的不同用户错误合并成一个账号",
        },
        absorb: {
          label: "吸收运行数据",
          description: "把当前 OpenClaw runtime 的账号、顺序和统计显式吸收到本地号池。",
          mutates: "会更新本地号池",
          safe: "不会自动发生，必须手动点",
        },
        export: {
          label: "导出号池",
          description: "把本地号池导出成一个加密 bundle，方便带到别的电脑导入。",
          mutates: "不会改动当前号池，只会生成导出文件",
          safe: "不会把口令保存在本地",
        },
        moreTools: {
          label: "更多工具",
          description: "低频维护和迁移操作都收在这里，避免主操作区堆满按钮。",
          mutates: "这里只是展开工具面板",
          safe: "不会直接执行任何实际操作",
        },
      };

      function formatTime(ts) {
        if (!ts) return "-";
        if (typeof ts === "string") {
          const parsed = Date.parse(ts);
          return Number.isFinite(parsed) ? new Date(parsed).toLocaleString("zh-CN", { hour12: false }) : "-";
        }
        const ms = ts > 10_000_000_000 ? ts : ts * 1000;
        return new Date(ms).toLocaleString("zh-CN", { hour12: false });
      }

      function normalizeReminderSeenMap(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return {};
        }
        const normalized = {};
        Object.entries(value).forEach(([key, storedAt]) => {
          if (typeof key === "string" && key && typeof storedAt === "string" && storedAt) {
            normalized[key] = storedAt;
          }
        });
        return normalized;
      }

      function toTimestampMs(ts) {
        if (typeof ts !== "number" || !Number.isFinite(ts)) {
          return null;
        }
        return ts > 10_000_000_000 ? ts : ts * 1000;
      }

      function formatRelativeDuration(diffMs) {
        if (!Number.isFinite(diffMs)) {
          return "时间未知";
        }

        const absoluteMs = Math.abs(diffMs);
        const totalMinutes = Math.floor(absoluteMs / 60_000);
        const totalHours = Math.floor(absoluteMs / 3_600_000);
        const totalDays = Math.floor(absoluteMs / 86_400_000);

        let text = "";
        if (totalDays > 0) {
          const hours = Math.floor((absoluteMs % 86_400_000) / 3_600_000);
          text = totalDays + "天" + (hours > 0 ? " " + hours + "小时" : "");
        } else if (totalHours > 0) {
          const minutes = Math.floor((absoluteMs % 3_600_000) / 60_000);
          text = totalHours + "小时" + (minutes > 0 ? " " + minutes + "分钟" : "");
        } else {
          text = Math.max(1, totalMinutes) + "分钟";
        }

        return diffMs <= 0 ? "已过期 " + text : "还有 " + text;
      }

      function describeTokenExpiry(profile) {
        const expiresAtMs = toTimestampMs(profile?.expiresAt);
        if (!expiresAtMs) {
          return "到期时间未知";
        }
        return formatRelativeDuration(expiresAtMs - Date.now()) + "（" + formatTime(expiresAtMs) + "）";
      }

      function buildTokenReminderSnapshotFromDashboardState(data) {
        const localStorePath = data?.localStore?.path || "";
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const profiles = rows
          .filter((row) => row?.type === "oauth" && typeof row?.expiresAt === "number" && Number.isFinite(row.expiresAt))
          .map((row) => ({
            profileId: row.profileId,
            displayLabel: row.displayLabel || row.profileId,
            email: row.email || null,
            expiresAt: row.expiresAt,
          }))
          .toSorted((left, right) => left.expiresAt - right.expiresAt);

        return {
          generatedAt: data?.generatedAt || Date.now(),
          localStore: {
            exists: Boolean(data?.localStore?.exists),
            path: localStorePath,
          },
          profiles,
        };
      }

      function getTokenReminderSeenKey(profile, stage) {
        return [profile?.profileId || "", String(profile?.expiresAt || ""), stage || ""].join("|");
      }

      function pruneTokenReminderSeen(snapshot) {
        const profiles = Array.isArray(snapshot?.profiles) ? snapshot.profiles : [];
        const activeKeys = new Set();
        profiles.forEach((profile) => {
          activeKeys.add(getTokenReminderSeenKey(profile, "warn"));
          activeKeys.add(getTokenReminderSeenKey(profile, "modal"));
        });

        const nextSeen = {};
        Object.entries(appState.tokenReminderSeen).forEach(([key, storedAt]) => {
          if (activeKeys.has(key)) {
            nextSeen[key] = storedAt;
          }
        });
        appState.tokenReminderSeen = nextSeen;
      }

      function persistTokenReminderSeen() {
        try {
          window.localStorage.setItem(
            TOKEN_REMINDER_SEEN_STORAGE_KEY,
            JSON.stringify(normalizeReminderSeenMap(appState.tokenReminderSeen)),
          );
        } catch {
          // Ignore localStorage failures in restricted browsers.
        }
      }

      function buildTokenReminderEvaluation(snapshot) {
        const profiles = Array.isArray(snapshot?.profiles) ? snapshot.profiles : [];
        const modalWindowMs = Math.max(0, appState.tokenReminderModalHours) * 3_600_000;
        const warnWindowMs = Math.max(Math.max(0, appState.tokenReminderWarnDays) * 86_400_000, modalWindowMs);
        const warnProfiles = [];
        const modalProfiles = [];

        profiles.forEach((profile) => {
          const expiresAtMs = toTimestampMs(profile.expiresAt);
          if (!expiresAtMs) {
            return;
          }

          const expiresInMs = expiresAtMs - Date.now();
          const enriched = {
            ...profile,
            expiresAt: expiresAtMs,
            expiresInMs,
          };

          if (expiresInMs <= warnWindowMs) {
            warnProfiles.push(enriched);
          }
          if (expiresInMs <= modalWindowMs) {
            modalProfiles.push(enriched);
          }
        });

        return {
          warnProfiles,
          modalProfiles,
          earliestProfile: warnProfiles[0] || profiles[0] || null,
        };
      }

      function formatCountdown(ts) {
        if (!ts) {
          return { text: "倒计时未知", tone: "" };
        }

        const targetMs = ts > 10_000_000_000 ? ts : ts * 1000;
        const diffMs = targetMs - Date.now();
        if (diffMs <= 0) {
          return { text: "已到重置时间", tone: "expired" };
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let text = "";
        if (days > 0) {
          text = days + "天 " + String(hours).padStart(2, "0") + "小时";
        } else if (hours > 0) {
          text = hours + "小时 " + String(minutes).padStart(2, "0") + "分钟";
        } else if (minutes > 0) {
          text = minutes + "分钟 " + String(seconds).padStart(2, "0") + "秒";
        } else {
          text = seconds + "秒";
        }

        return {
          text: "倒计时 " + text,
          tone: diffMs <= 6 * 3600 * 1000 ? "soon" : "",
        };
      }

      function updateCountdowns() {
        document.querySelectorAll("[data-reset-at]").forEach((node) => {
          const resetAt = Number(node.getAttribute("data-reset-at"));
          const countdown = formatCountdown(Number.isFinite(resetAt) ? resetAt : null);
          node.textContent = countdown.text;
          node.className = "countdown" + (countdown.tone ? " " + countdown.tone : "");
        });
      }

      function closeFloatingMenus(exceptMenu = null) {
        document.querySelectorAll(".profile-menu[open], .toolbar-menu[open]").forEach((menu) => {
          if (menu !== exceptMenu) {
            menu.removeAttribute("open");
          }
        });
      }

      function positionFloatingMenu(menu, menuList) {
        if (!(menu instanceof HTMLElement) || !(menuList instanceof HTMLElement)) return;

        // Reset to the default direction before measuring, then flip only when space is not enough.
        menu.dataset.vertical = "down";
        menu.dataset.horizontal = "right";

        const summary = menu.querySelector("summary");
        if (!(summary instanceof HTMLElement)) return;

        const summaryRect = summary.getBoundingClientRect();
        const menuHeight = menuList.offsetHeight;
        const menuWidth = menuList.offsetWidth;
        const gap = 8;

        const spaceBelow = window.innerHeight - summaryRect.bottom;
        const spaceAbove = summaryRect.top;
        const spaceRight = window.innerWidth - summaryRect.right;
        const spaceLeft = summaryRect.left;

        if (spaceBelow < menuHeight + gap && spaceAbove > spaceBelow) {
          menu.dataset.vertical = "up";
        }

        if (spaceRight < menuWidth && spaceLeft > spaceRight) {
          menu.dataset.horizontal = "left";
        }
      }

      function getToolbarActionMeta(actionKey) {
        return TOOLBAR_ACTIONS[actionKey] || TOOLBAR_ACTIONS.refresh;
      }

      function updateToolbarHelp(actionKey) {
        const meta = getToolbarActionMeta(actionKey);
        appState.toolbarActionKey = actionKey;
        toolbarHelpTitle.textContent = meta.label;
        toolbarHelpDescription.textContent = meta.description;
        toolbarHelpMutates.textContent = meta.mutates;
        toolbarHelpSafe.textContent = meta.safe;
        toolbarInlineHint.textContent = meta.description;
      }

      function bindToolbarActionHints(target) {
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const actionKey = target.dataset.toolbarAction;
        if (!actionKey) {
          return;
        }
        const show = () => updateToolbarHelp(actionKey);
        target.addEventListener("mouseenter", show);
        target.addEventListener("focus", show);
        target.addEventListener("click", show);
      }

      function getRemainingPercent(windowData) {
        return typeof windowData?.remainingPercent === "number" && Number.isFinite(windowData.remainingPercent)
          ? Math.max(0, Math.min(100, windowData.remainingPercent))
          : null;
      }

      function formatQuotaBoardValue(windowSummary) {
        return windowSummary.totalCapacity > 0
          ? Math.round(windowSummary.totalRemaining) + "% / " + windowSummary.totalCapacity + "%"
          : "--% / --%";
      }

      function getQuotaTone(remaining) {
        if (remaining == null) {
          return "unknown";
        }
        if (remaining >= 60) {
          return "high";
        }
        if (remaining >= 30) {
          return "medium";
        }
        return "low";
      }

      function summarizeSecondaryWindow(rows) {
        let depleted = 0;
        let available = 0;
        for (const row of rows || []) {
          const remaining = getRemainingPercent(row.secondary);
          if (remaining == null) continue;
          if (remaining <= 0) {
            depleted += 1;
          } else {
            available += 1;
          }
        }
        return { depleted, available };
      }

      function renderQuotaBoardBar(container, windowSummary, title) {
        container.innerHTML = "";
        container.setAttribute("aria-valuemin", "0");
        container.setAttribute("aria-valuemax", String(windowSummary.totalCapacity || 100));
        container.setAttribute("aria-valuenow", String(Math.round(windowSummary.totalRemaining || 0)));

        if (!windowSummary.totalCapacity || !windowSummary.segments.length) {
          container.dataset.empty = "true";
          const placeholder = document.createElement("div");
          placeholder.className = "quota-board-segment unknown";
          placeholder.style.width = "100%";
          placeholder.title = title + " 暂无可读额度";
          container.appendChild(placeholder);
          return;
        }

        delete container.dataset.empty;
        const fragment = document.createDocumentFragment();
        windowSummary.segments.forEach((segment) => {
          const node = document.createElement("div");
          node.className = "quota-board-segment " + getQuotaTone(segment.remainingPercent);
          node.style.width = String(segment.sharePercent) + "%";
          node.title = segment.displayLabel + " · " + segment.remainingPercent + "%";
          fragment.appendChild(node);
        });
        container.appendChild(fragment);
      }

      function createTag(label, tone = "") {
        const node = document.createElement("span");
        node.className = "meta-tag" + (tone ? " " + tone : "");
        node.textContent = label;
        return node;
      }

      function createStatusBadge(label, tone = "") {
        const node = document.createElement("span");
        node.className = "status-badge" + (tone ? " " + tone : "");
        node.textContent = label;
        return node;
      }

      function createInfoPill(label, tone = "") {
        const node = document.createElement("span");
        node.className = "order-pill" + (tone ? " " + tone : "");
        node.textContent = label;
        return node;
      }

      function renderQuotaDetails(detailsNode, summaryNode, listNode, windowSummary, options = {}) {
        if (!(listNode instanceof HTMLElement) || !(detailsNode instanceof HTMLElement)) {
          return;
        }

        const title = typeof options.title === "string" && options.title ? options.title : "查看账号明细";
        const emptyText = typeof options.emptyText === "string" && options.emptyText ? options.emptyText : "当前没有可展示的账号。";
        const primaryLabel = typeof options.primaryLabel === "string" && options.primaryLabel ? options.primaryLabel : "5h";
        const secondaryLabel = typeof options.secondaryLabel === "string" && options.secondaryLabel ? options.secondaryLabel : "7d";

        listNode.innerHTML = "";
        const count = Array.isArray(windowSummary?.segments) ? windowSummary.segments.length : 0;
        if (summaryNode instanceof HTMLElement) {
          summaryNode.textContent = count ? title + "（" + count + "）" : title;
        }

        if (!count) {
          detailsNode.open = false;
          const empty = document.createElement("div");
          empty.className = "quota-board-detail-empty";
          empty.textContent = emptyText;
          listNode.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        windowSummary.segments.forEach((segment) => {
          const row = document.createElement("div");
          row.className = "quota-board-detail-row";

          const label = document.createElement("div");
          label.className = "quota-board-detail-label";
          label.textContent = segment.displayLabel || segment.profileId || "-";
          label.title = segment.displayLabel || segment.profileId || "-";
          row.appendChild(label);

          const values = document.createElement("div");
          values.className = "quota-board-detail-values";
          values.appendChild(
            createInfoPill(
              primaryLabel + " " + (segment.primaryRemainingPercent == null ? "未知" : segment.primaryRemainingPercent + "%"),
              getQuotaBadgeTone(segment.primaryRemainingPercent),
            ),
          );
          values.appendChild(
            createInfoPill(
              secondaryLabel + " " + (segment.secondaryRemainingPercent == null ? "未知" : segment.secondaryRemainingPercent + "%"),
              getQuotaBadgeTone(segment.secondaryRemainingPercent),
            ),
          );
          row.appendChild(values);

          fragment.appendChild(row);
        });
        listNode.appendChild(fragment);
      }

      function renderPrimaryQuotaDetails(windowSummary) {
        renderQuotaDetails(
          quotaBoardPrimaryDetails,
          quotaBoardPrimaryDetailsSummary,
          quotaBoardPrimaryDetailsList,
          windowSummary,
          {
            title: "查看可用账号明细",
            emptyText: "当前没有纳入 5h 总剩余的账号。",
            primaryLabel: "5h",
            secondaryLabel: "7d",
          },
        );
      }

      function renderSecondaryQuotaDetails(windowSummary) {
        renderQuotaDetails(
          quotaBoardSecondaryDetails,
          quotaBoardSecondaryDetailsSummary,
          quotaBoardSecondaryDetailsList,
          windowSummary,
          {
            title: "查看可读账号明细",
            emptyText: "当前没有纳入 7d 总剩余的账号。",
            primaryLabel: "5h",
            secondaryLabel: "7d",
          },
        );
      }

      function getQuotaBadgeTone(remaining) {
        const tone = getQuotaTone(remaining);
        if (tone === "high") return "ok";
        if (tone === "medium") return "warn";
        if (tone === "low") return "danger";
        return "info";
      }

      function getOpenClawCurrentRow(data = appState.data) {
        if (!Array.isArray(data?.rows)) {
          return null;
        }
        return data.rows.find((row) => row.openClawCurrent) || null;
      }

      function getCodexCurrentRow(data = appState.data) {
        if (!Array.isArray(data?.rows)) {
          return null;
        }
        return data.rows.find((row) => row.codexCurrent) || null;
      }

      function getCodexRecommendedRow(data = appState.data) {
        if (!data?.codexRecommendedProfileId || !Array.isArray(data.rows)) {
          return null;
        }
        return data.rows.find((row) => row.profileId === data.codexRecommendedProfileId) || null;
      }

      function isSharedCodexAutomationMode() {
        return appState.codexAutomationMode === "shared";
      }

      function isIndependentCodexAutomationMode() {
        return appState.codexAutomationMode === "independent-low-quota";
      }

      function needsCodexRestartBanner() {
        return Boolean(appState.codexRestartRequired && appState.codexRestartMessage);
      }

      function getProfileAvailability(row) {
        const primaryRemaining = getRemainingPercent(row?.primary);
        const secondaryRemaining = getRemainingPercent(row?.secondary);

        if (row?.error) {
          return {
            leadLabel: "异常",
            leadTone: "danger",
            stateText: "额度异常",
            stateTone: "low",
          };
        }

        if (secondaryRemaining != null && secondaryRemaining <= 0) {
          return {
            leadLabel: "7天耗尽",
            leadTone: "danger",
            stateText: "7天已耗尽",
            stateTone: "low",
          };
        }

        if (primaryRemaining != null && primaryRemaining <= 0) {
          return {
            leadLabel: "5h耗尽",
            leadTone: "danger",
            stateText: row?.primary?.resetAt ? "等待 5h 重置" : "5h 已耗尽",
            stateTone: "low",
          };
        }

        if (row?.recommendationEligible === false) {
          return {
            leadLabel: "暂不推荐",
            leadTone: "warn",
            stateText: "5h 余量过低，不参与自动推荐",
            stateTone: "low",
          };
        }

        if (secondaryRemaining == null && primaryRemaining == null) {
          return {
            leadLabel: "待确认",
            leadTone: "warn",
            stateText: "额度未知",
            stateTone: "unknown",
          };
        }

        if (row?.currentOrderIndex === 0) {
          return {
            leadLabel: "正在用",
            leadTone: "ok",
            stateText: "当前可用",
            stateTone: getQuotaTone(primaryRemaining != null ? primaryRemaining : secondaryRemaining),
          };
        }

        return {
          leadLabel: "可切换",
          leadTone: "info",
          stateText: "可立即切换",
          stateTone: getQuotaTone(
            primaryRemaining != null && secondaryRemaining != null
              ? Math.min(primaryRemaining, secondaryRemaining)
              : primaryRemaining != null
                ? primaryRemaining
                : secondaryRemaining,
          ),
        };
      }

      function arraysEqual(left, right) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
          return false;
        }
        for (let index = 0; index < left.length; index += 1) {
          if (left[index] !== right[index]) {
            return false;
          }
        }
        return true;
      }

      function setFlash(message = "", tone = "info") {
        appState.flashMessage = message;
        appState.flashTone = tone;
        flashBanner.hidden = !message;
        flashBanner.className = "flash-banner" + (message ? " " + tone : "");
        flashBanner.textContent = message;
      }

      function clearQuotaRefreshTimer() {
        if (appState.quotaRefreshTimer) {
          window.clearTimeout(appState.quotaRefreshTimer);
          appState.quotaRefreshTimer = null;
        }
      }

      function clearTokenRefreshTimer() {
        if (appState.tokenRefreshTimer) {
          window.clearTimeout(appState.tokenRefreshTimer);
          appState.tokenRefreshTimer = null;
        }
        appState.tokenRefreshNextRunAt = null;
      }

      function clearTokenReminderTimer() {
        if (appState.tokenReminderTimer) {
          window.clearTimeout(appState.tokenReminderTimer);
          appState.tokenReminderTimer = null;
        }
        appState.tokenReminderNextRunAt = null;
      }

      function markTokenReminderStageSeen(profiles, stage) {
        const nowIso = new Date().toISOString();
        profiles.forEach((profile) => {
          appState.tokenReminderSeen[getTokenReminderSeenKey(profile, stage)] = nowIso;
        });
        persistTokenReminderSeen();
      }

      function closeTokenReminderModal() {
        tokenReminderModal.hidden = true;
        tokenReminderModal.setAttribute("aria-hidden", "true");
      }

      function openTokenReminderModal(profiles) {
        if (!Array.isArray(profiles) || profiles.length === 0) {
          closeTokenReminderModal();
          return;
        }

        tokenReminderModalCopy.textContent = profiles.length === 1
          ? "这个账号已经进入紧急窗口，请尽快手动刷新或重新登录。"
          : "这些账号已经进入紧急窗口，请尽快手动刷新或重新登录。";
        tokenReminderModalList.innerHTML = "";
        profiles.slice(0, 6).forEach((profile) => {
          const line = document.createElement("div");
          line.className = "alert-item";
          line.textContent = (profile.displayLabel || profile.profileId) + " · " + describeTokenExpiry(profile);
          tokenReminderModalList.appendChild(line);
        });
        if (profiles.length > 6) {
          const overflow = document.createElement("div");
          overflow.className = "alert-item";
          overflow.textContent = "还有 " + String(profiles.length - 6) + " 个账号也已进入紧急窗口。";
          tokenReminderModalList.appendChild(overflow);
        }

        tokenReminderModal.hidden = false;
        tokenReminderModal.setAttribute("aria-hidden", "false");
      }

      function presentTokenReminderModal(profiles) {
        if (!Array.isArray(profiles) || profiles.length === 0) {
          return;
        }
        markTokenReminderStageSeen(profiles, "modal");
        appState.tokenReminderPendingModalProfiles = [];
        openTokenReminderModal(profiles);
      }

      function renderTokenReminderStatus() {
        const evaluation = buildTokenReminderEvaluation(appState.tokenReminderSnapshot);
        appState.tokenReminderWarnProfiles = evaluation.warnProfiles;
        appState.tokenReminderModalProfiles = evaluation.modalProfiles;

        tokenReminderEnabledToggle.checked = appState.tokenReminderEnabled;
        tokenReminderIntervalInput.value = String(appState.tokenReminderCheckIntervalMinutes);
        tokenReminderWarnDaysInput.value = String(appState.tokenReminderWarnDays);
        tokenReminderModalHoursInput.value = String(appState.tokenReminderModalHours);
        tokenReminderLastCheckedValue.textContent = formatTime(appState.tokenReminderLastCheckedAt);
        tokenReminderNextRunValue.textContent = appState.tokenReminderEnabled && appState.tokenReminderNextRunAt
          ? formatTime(appState.tokenReminderNextRunAt)
          : appState.tokenReminderEnabled
            ? "等待下次检查"
            : "已关闭";
        tokenReminderWarnCountValue.textContent = evaluation.warnProfiles.length + " 个账号";
        tokenReminderModalCountValue.textContent = evaluation.modalProfiles.length + " 个账号";
        tokenReminderEarliestValue.textContent = evaluation.earliestProfile
          ? (evaluation.earliestProfile.displayLabel || evaluation.earliestProfile.profileId) + " · " + describeTokenExpiry(evaluation.earliestProfile)
          : "暂无临近账号";
      }

      function applyTokenReminderSnapshot(snapshot, options = {}) {
        appState.tokenReminderSnapshot = snapshot;
        appState.tokenReminderLastCheckedAt = snapshot?.generatedAt || Date.now();
        pruneTokenReminderSeen(snapshot);
        persistTokenReminderSeen();
        renderTokenReminderStatus();
        if (appState.data) {
          renderOverviewStats(appState.data);
          renderAlerts(appState.data);
        }

        if (!options.allowModal || !appState.tokenReminderEnabled) {
          return;
        }

        const unseenModalProfiles = appState.tokenReminderModalProfiles.filter(
          (profile) => !appState.tokenReminderSeen[getTokenReminderSeenKey(profile, "modal")],
        );

        if (unseenModalProfiles.length === 0) {
          appState.tokenReminderPendingModalProfiles = [];
          return;
        }

        if (document.hidden) {
          appState.tokenReminderPendingModalProfiles = unseenModalProfiles;
          return;
        }

        presentTokenReminderModal(unseenModalProfiles);
      }

      function renderTokenRefreshStatus(data = appState.data) {
        const maintenance = data?.maintenance || {};
        tokenLastAttemptValue.textContent = formatTime(maintenance.lastAttemptAt);
        tokenLastSuccessValue.textContent = formatTime(maintenance.lastSuccessAt);
        tokenChangedProfilesValue.textContent = Array.isArray(maintenance.lastChangedProfileIds) && maintenance.lastChangedProfileIds.length > 0
          ? maintenance.lastChangedProfileIds.length + " 个账号"
          : "0 个账号";
        tokenLastErrorValue.textContent = maintenance.lastError || "无";
        tokenNextRunValue.textContent = appState.tokenRefreshIntervalSeconds > 0 && appState.tokenRefreshNextRunAt
          ? new Date(appState.tokenRefreshNextRunAt).toLocaleString("zh-CN", { hour12: false })
          : "已关闭";
        renderTokenReminderStatus();
      }

      function persistAutomationSettings() {
        try {
          window.localStorage.setItem(QUOTA_REFRESH_INTERVAL_STORAGE_KEY, String(appState.quotaRefreshIntervalSeconds));
          window.localStorage.setItem(TOKEN_REFRESH_INTERVAL_STORAGE_KEY, String(appState.tokenRefreshIntervalSeconds));
          window.localStorage.setItem(TOKEN_REMINDER_ENABLED_STORAGE_KEY, String(appState.tokenReminderEnabled));
          window.localStorage.setItem(TOKEN_REMINDER_INTERVAL_STORAGE_KEY, String(appState.tokenReminderCheckIntervalMinutes));
          window.localStorage.setItem(TOKEN_REMINDER_WARN_DAYS_STORAGE_KEY, String(appState.tokenReminderWarnDays));
          window.localStorage.setItem(TOKEN_REMINDER_MODAL_HOURS_STORAGE_KEY, String(appState.tokenReminderModalHours));
          window.localStorage.setItem(AUTO_APPLY_STORAGE_KEY, String(appState.autoApplyRecommended));
          window.localStorage.setItem(CODEX_AUTOMATION_MODE_STORAGE_KEY, appState.codexAutomationMode);
          window.localStorage.setItem(USAGE_PROXY_ENABLED_STORAGE_KEY, String(appState.usageProxyEnabled));
          window.localStorage.setItem(USAGE_PROXY_URL_STORAGE_KEY, appState.usageProxyUrl);
          window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, appState.activeTab);
          window.localStorage.setItem(ACCOUNTS_VIEW_STORAGE_KEY, appState.accountsView);
        } catch {
          // Ignore localStorage failures in restricted browsers.
        }
      }

      function syncAutomationControls() {
        quotaRefreshIntervalInput.value = String(appState.quotaRefreshIntervalSeconds);
        tokenRefreshIntervalInput.value = String(appState.tokenRefreshIntervalSeconds);
        tokenReminderEnabledToggle.checked = appState.tokenReminderEnabled;
        tokenReminderIntervalInput.value = String(appState.tokenReminderCheckIntervalMinutes);
        tokenReminderWarnDaysInput.value = String(appState.tokenReminderWarnDays);
        tokenReminderModalHoursInput.value = String(appState.tokenReminderModalHours);
        usageProxyUrlInput.value = appState.usageProxyUrl;
        autoApplyToggle.checked = appState.autoApplyRecommended;
        codexAutomationModeInputs.forEach((input) => {
          input.checked = input.value === appState.codexAutomationMode;
        });
        usageProxyToggle.checked = appState.usageProxyEnabled;
        renderTokenRefreshStatus();
      }

      function loadAutomationSettings() {
        try {
          const storedQuotaInterval = Number(
            window.localStorage.getItem(QUOTA_REFRESH_INTERVAL_STORAGE_KEY) || window.localStorage.getItem(LEGACY_REFRESH_INTERVAL_STORAGE_KEY),
          );
          if (Number.isFinite(storedQuotaInterval) && storedQuotaInterval >= 0) {
            appState.quotaRefreshIntervalSeconds = Math.floor(storedQuotaInterval);
          }
          const storedTokenInterval = Number(window.localStorage.getItem(TOKEN_REFRESH_INTERVAL_STORAGE_KEY));
          if (Number.isFinite(storedTokenInterval) && storedTokenInterval >= 0) {
            appState.tokenRefreshIntervalSeconds = normalizeTokenRefreshIntervalSeconds(storedTokenInterval);
          }
          const storedReminderInterval = Number(window.localStorage.getItem(TOKEN_REMINDER_INTERVAL_STORAGE_KEY));
          if (Number.isFinite(storedReminderInterval) && storedReminderInterval >= 1) {
            appState.tokenReminderCheckIntervalMinutes = Math.floor(storedReminderInterval);
          }
          const storedReminderWarnDays = Number(window.localStorage.getItem(TOKEN_REMINDER_WARN_DAYS_STORAGE_KEY));
          if (Number.isFinite(storedReminderWarnDays) && storedReminderWarnDays >= 0) {
            appState.tokenReminderWarnDays = Math.floor(storedReminderWarnDays);
          }
          const storedReminderModalHours = Number(window.localStorage.getItem(TOKEN_REMINDER_MODAL_HOURS_STORAGE_KEY));
          if (Number.isFinite(storedReminderModalHours) && storedReminderModalHours >= 0) {
            appState.tokenReminderModalHours = Math.floor(storedReminderModalHours);
          }
          const storedReminderSeen = window.localStorage.getItem(TOKEN_REMINDER_SEEN_STORAGE_KEY);
          appState.tokenReminderSeen = storedReminderSeen
            ? normalizeReminderSeenMap(JSON.parse(storedReminderSeen))
            : {};
          const storedReminderEnabled = window.localStorage.getItem(TOKEN_REMINDER_ENABLED_STORAGE_KEY);
          appState.tokenReminderEnabled = storedReminderEnabled !== "false";
          appState.autoApplyRecommended = window.localStorage.getItem(AUTO_APPLY_STORAGE_KEY) === "true";
          const storedCodexAutomationMode = window.localStorage.getItem(CODEX_AUTOMATION_MODE_STORAGE_KEY);
          if (storedCodexAutomationMode === "shared" || storedCodexAutomationMode === "independent-low-quota" || storedCodexAutomationMode === "manual") {
            appState.codexAutomationMode = storedCodexAutomationMode;
          }
          appState.usageProxyEnabled = window.localStorage.getItem(USAGE_PROXY_ENABLED_STORAGE_KEY) === "true";
          appState.usageProxyUrl = window.localStorage.getItem(USAGE_PROXY_URL_STORAGE_KEY) || "";
          const activeTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
          if (activeTab === "accounts" || activeTab === "order" || activeTab === "token-refresh" || activeTab === "settings") {
            appState.activeTab = activeTab;
          }
          const accountsView = window.localStorage.getItem(ACCOUNTS_VIEW_STORAGE_KEY);
          if (accountsView === "quota" || accountsView === "grouped") {
            appState.accountsView = accountsView;
          }
        } catch {
          appState.quotaRefreshIntervalSeconds = 0;
          appState.tokenRefreshIntervalSeconds = 0;
          appState.tokenReminderEnabled = true;
          appState.tokenReminderCheckIntervalMinutes = 30;
          appState.tokenReminderWarnDays = 1;
          appState.tokenReminderModalHours = 6;
          appState.tokenReminderSeen = {};
          appState.autoApplyRecommended = false;
          appState.codexAutomationMode = "shared";
          appState.usageProxyEnabled = false;
          appState.usageProxyUrl = "";
          appState.activeTab = "accounts";
          appState.accountsView = "quota";
        }
        syncAutomationControls();
        syncAccountsViewControls();
      }

      function syncTabState() {
        tabButtons.forEach((button) => {
          button.setAttribute("aria-selected", button.dataset.tab === appState.activeTab ? "true" : "false");
        });
        tabPanels.forEach((panel) => {
          panel.hidden = panel.dataset.tabPanel !== appState.activeTab;
        });
      }

      function setActiveTab(tab) {
        if (tab !== "accounts" && tab !== "order" && tab !== "token-refresh" && tab !== "settings") {
          return;
        }
        appState.activeTab = tab;
        syncTabState();
        persistAutomationSettings();
      }

      function syncAccountsViewControls() {
        const buttons = [
          [accountsViewQuotaButton, "quota"],
          [accountsViewGroupedButton, "grouped"],
        ];
        buttons.forEach(([button, view]) => {
          const active = appState.accountsView === view;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
      }

      function setAccountsView(view) {
        if (view !== "quota" && view !== "grouped") {
          return;
        }
        if (appState.accountsView === view) {
          return;
        }
        appState.accountsView = view;
        syncAccountsViewControls();
        persistAutomationSettings();
        if (appState.data) {
          renderProfileCards(appState.data);
        }
      }

      function scheduleQuotaRefresh() {
        clearQuotaRefreshTimer();
        if (appState.quotaRefreshIntervalSeconds <= 0) {
          return;
        }
        appState.quotaRefreshTimer = window.setTimeout(() => {
          if (appState.busy) {
            scheduleQuotaRefresh();
            return;
          }
          void refreshState({ okMessage: "额度自动刷新完成" });
        }, appState.quotaRefreshIntervalSeconds * 1000);
      }

      function scheduleTokenRefresh() {
        clearTokenRefreshTimer();
        if (appState.tokenRefreshIntervalSeconds <= 0 || !appState.data?.localStore?.exists) {
          renderTokenRefreshStatus();
          return;
        }
        appState.tokenRefreshNextRunAt = Date.now() + appState.tokenRefreshIntervalSeconds * 1000;
        renderTokenRefreshStatus();
        appState.tokenRefreshTimer = window.setTimeout(() => {
          if (appState.busy) {
            scheduleTokenRefresh();
            return;
          }
          void refreshTokenSessions({
            trigger: "scheduled",
            okMessage: "Token 定时检查完成",
            intervalSeconds: appState.tokenRefreshIntervalSeconds,
          });
        }, appState.tokenRefreshIntervalSeconds * 1000);
      }

      function scheduleTokenReminderCheck() {
        clearTokenReminderTimer();
        if (!appState.tokenReminderEnabled || !appState.data?.localStore?.exists) {
          renderTokenReminderStatus();
          return;
        }

        appState.tokenReminderNextRunAt = Date.now() + appState.tokenReminderCheckIntervalMinutes * 60_000;
        renderTokenReminderStatus();
        appState.tokenReminderTimer = window.setTimeout(() => {
          if (appState.busy) {
            scheduleTokenReminderCheck();
            return;
          }
          void refreshTokenExpirySnapshot();
        }, appState.tokenReminderCheckIntervalMinutes * 60_000);
      }

      function shouldAutoApplyRecommendedOrder(data) {
        return Boolean(
          appState.autoApplyRecommended &&
          data &&
          data.recommendedSelectionProfileId &&
          Array.isArray(data.recommendedOrder) &&
          data.recommendedOrder.length > 0 &&
          !arraysEqual(data.recommendedOrder, data.currentEffectiveOrder),
        );
      }

      function buildUsageProxySettings() {
        return {
          usageProxyEnabled: appState.usageProxyEnabled,
          usageProxyUrl: appState.usageProxyUrl.trim(),
        };
      }

      function buildStateUrl() {
        const params = new URLSearchParams();
        if (appState.usageProxyEnabled) {
          params.set("usageProxyEnabled", "1");
        }
        if (appState.usageProxyUrl.trim()) {
          params.set("usageProxyUrl", appState.usageProxyUrl.trim());
        }
        const query = params.toString();
        return query ? "/api/state?" + query : "/api/state";
      }

      function buildTokenReminderUrl() {
        return "/api/token-expiry";
      }

      function setToolbarButtonText(button, actionKey) {
        if (!(button instanceof HTMLElement)) {
          return;
        }
        const meta = getToolbarActionMeta(actionKey);
        const title = button.querySelector(".toolbar-menu-button-title");
        const copy = button.querySelector(".toolbar-menu-button-copy");
        if (title && copy) {
          title.textContent = meta.label;
          return;
        }
        button.textContent = meta.label;
      }

      function renderToolbarState(data) {
        const storeReady = Boolean(data?.localStore?.exists);
        document.querySelectorAll("[data-toolbar-action]").forEach((node) => {
          const actionKey = node instanceof HTMLElement ? node.dataset.toolbarAction : "";
          if (!actionKey) {
            return;
          }
          const meta = getToolbarActionMeta(actionKey);
          node.setAttribute("title", meta.description);
          node.setAttribute("aria-label", meta.label);
        });
        applyButton.hidden = !storeReady;
        addButton.hidden = !storeReady;
        bootstrapButton.hidden = storeReady;
        importPrimaryButton.hidden = storeReady;
        toolsMenu.hidden = !storeReady;

        setToolbarButtonText(refreshButton, "refresh");
        setToolbarButtonText(applyButton, "apply");
        setToolbarButtonText(addButton, "add");
        setToolbarButtonText(bootstrapButton, "bootstrap");
        setToolbarButtonText(importPrimaryButton, "import");
        setToolbarButtonText(syncButton, "sync");
        setToolbarButtonText(rebuildRuntimeButton, "rebuild");
        setToolbarButtonText(cleanupDuplicatesButton, "cleanupDuplicates");
        setToolbarButtonText(absorbRuntimeButton, "absorb");
        setToolbarButtonText(exportButton, "export");
        setToolbarButtonText(importButton, "import");
        setToolbarButtonText(toolsMenuButton, "moreTools");

        if (!storeReady && appState.toolbarActionKey !== "bootstrap" && appState.toolbarActionKey !== "import") {
          updateToolbarHelp("bootstrap");
        }
        if (storeReady && appState.toolbarActionKey === "bootstrap") {
          updateToolbarHelp("add");
        }
      }

      function syncControlState() {
        const loginInProgress = Boolean(appState.loginTaskId);
        const disabled = appState.busy;
        const storeReady = Boolean(appState.data?.localStore?.exists);
        refreshButton.disabled = disabled;
        tokenRefreshButton.disabled = disabled || !storeReady;
        applyButton.disabled = disabled || !storeReady;
        bootstrapButton.disabled = disabled || storeReady;
        importPrimaryButton.disabled = disabled;
        syncButton.disabled = disabled || !storeReady;
        rebuildRuntimeButton.disabled = disabled || !storeReady;
        cleanupDuplicatesButton.disabled = disabled || !storeReady || !appState.data?.actions?.canCleanupDuplicates;
        absorbRuntimeButton.disabled = disabled || !storeReady || !appState.data?.actions?.canAbsorbRuntime;
        exportButton.disabled = disabled || !storeReady;
        importButton.disabled = disabled;
        addButton.disabled = disabled || loginInProgress || !storeReady;
        toolsMenu.classList.toggle("is-disabled", disabled || !storeReady);
        if (disabled || !storeReady) {
          toolsMenu.removeAttribute("open");
        }
        quotaRefreshIntervalInput.disabled = disabled;
        tokenRefreshIntervalInput.disabled = disabled || !storeReady;
        tokenReminderEnabledToggle.disabled = disabled || !storeReady;
        tokenReminderIntervalInput.disabled = disabled || !storeReady || !appState.tokenReminderEnabled;
        tokenReminderWarnDaysInput.disabled = disabled || !storeReady || !appState.tokenReminderEnabled;
        tokenReminderModalHoursInput.disabled = disabled || !storeReady || !appState.tokenReminderEnabled;
        autoApplyToggle.disabled = disabled;
        codexAutomationModeInputs.forEach((input) => {
          input.disabled = disabled;
        });
        usageProxyToggle.disabled = disabled;
        usageProxyUrlInput.disabled = disabled;
        addProfileSuffixInput.disabled = disabled || loginInProgress;
        addModalSubmitButton.disabled = disabled || loginInProgress;
        renameProfileIdInput.disabled = disabled || loginInProgress;
        manageModalSubmitButton.disabled = disabled || loginInProgress;
        tokenReminderModalFocusButton.disabled = disabled;
        tokenReminderModalDismissButton.disabled = disabled;
        accountsSelectAllButton.disabled = disabled || !storeReady || getSelectableProfileIds().length === 0 || getSelectedProfileIds().length === getSelectableProfileIds().length;
        accountsClearSelectionButton.disabled = disabled || !storeReady || getSelectedProfileIds().length === 0;
        accountsDeleteSelectedButton.disabled = disabled || !storeReady || getSelectedProfileIds().length === 0;
        document.querySelectorAll("[data-action-button]").forEach((button) => {
          button.disabled = button.dataset.lockedDisabled === "true" || disabled || loginInProgress || !storeReady;
        });
        document.querySelectorAll("[data-profile-select]").forEach((input) => {
          input.disabled = disabled || loginInProgress || !storeReady;
        });
      }

      function setBusy(busy, text, tone = busy ? "info" : "success") {
        appState.busy = busy;
        syncControlState();
        if (text) {
          setFlash(text, tone);
        }
      }

      function normalizeProfileSuffix(value) {
        let suffix = (value || "").trim();
        if (suffix.startsWith(PROFILE_ID_PREFIX)) {
          suffix = suffix.slice(PROFILE_ID_PREFIX.length);
        }
        return suffix.replace(/^:+/, "").trim();
      }

      function buildProfileIdFromSuffix(value) {
        const suffix = normalizeProfileSuffix(value);
        return suffix ? PROFILE_ID_PREFIX + suffix : "";
      }

      function suggestProfileSuffix() {
        const existing = new Set((appState.data?.rows || []).map((row) => row.profileId));
        const preferred = ["work", "personal", "backup"];
        for (const suffix of preferred) {
          if (!existing.has(PROFILE_ID_PREFIX + suffix)) {
            return suffix;
          }
        }
        let index = existing.size + 1;
        while (existing.has(PROFILE_ID_PREFIX + "account-" + index)) {
          index += 1;
        }
        return "account-" + index;
      }

      function renderAddAccountPreview() {
        const suffix = normalizeProfileSuffix(addProfileSuffixInput.value);
        if (!suffix) {
          addProfilePreview.innerHTML = PROFILE_ID_PREFIX + "<span>...</span>";
          return;
        }
        addProfilePreview.textContent = PROFILE_ID_PREFIX + suffix;
      }

      function setAddModalError(message = "") {
        addModalError.hidden = !message;
        addModalError.textContent = message;
      }

      function openAddAccountModal() {
        addProfileSuffixInput.value = suggestProfileSuffix();
        setAddModalError("");
        renderAddAccountPreview();
        addModal.hidden = false;
        addModal.setAttribute("aria-hidden", "false");
        window.requestAnimationFrame(() => {
          addProfileSuffixInput.focus();
          addProfileSuffixInput.select();
        });
      }

      function closeAddAccountModal() {
        addModal.hidden = true;
        addModal.setAttribute("aria-hidden", "true");
        setAddModalError("");
      }

      function setManageModalError(message = "") {
        manageModalError.hidden = !message;
        manageModalError.textContent = message;
      }

      function closeManageModal() {
        appState.manageMode = null;
        appState.manageRow = null;
        appState.manageRows = [];
        setManageModalError("");
        manageModal.hidden = true;
        manageModal.setAttribute("aria-hidden", "true");
      }

      function openManageModal() {
        manageModal.hidden = false;
        manageModal.setAttribute("aria-hidden", "false");
      }

      function openRenameModal(row) {
        appState.manageMode = "rename";
        appState.manageRow = row;
        manageModalEyebrow.textContent = "Rename Profile";
        manageModalTitle.textContent = "重命名账号";
        manageModalCopy.textContent = "修改这个账号的名称，现有登录信息会跟着一起更新。";
        manageProfileIdText.textContent = row.profileId;
        manageProfileHint.textContent = row.email || row.displayLabel || "保存后生效";
        renameField.hidden = false;
        deleteField.hidden = true;
        renameProfileIdInput.value = row.profileId.replace(/:default$/, ":work");
        manageModalSubmitButton.textContent = "保存新名称";
        manageModalSubmitButton.className = "button-primary";
        setManageModalError("");
        openManageModal();
        window.requestAnimationFrame(() => {
          renameProfileIdInput.focus();
          renameProfileIdInput.select();
        });
      }

      function openDeleteModal(rowOrRows) {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        const validRows = rows.filter(Boolean);
        if (!validRows.length) {
          return;
        }
        const count = validRows.length;
        const summaryText = count === 1
          ? validRows[0].profileId
          : "共 " + count + " 个账号";
        const hintText = count === 1
          ? (validRows[0].email || validRows[0].displayLabel || "确认后删除")
          : validRows
            .slice(0, 3)
            .map((row) => row.email || row.displayLabel || row.profileId)
            .join(" / ") + (count > 3 ? " 等" : "");
        appState.manageMode = "delete";
        appState.manageRow = validRows[0];
        appState.manageRows = validRows;
        manageModalEyebrow.textContent = "Delete Profile";
        manageModalTitle.textContent = count === 1 ? "删除账号" : "批量删除账号";
        manageModalCopy.textContent = count === 1 ? "删除后会一起移除" : "删除后会一起移除所选账号";
        manageProfileIdText.textContent = summaryText;
        manageProfileHint.textContent = hintText;
        renameField.hidden = true;
        deleteField.hidden = false;
        manageModalSubmitButton.textContent = count === 1 ? "确认删除" : "确认批量删除";
        manageModalSubmitButton.className = "button-danger";
        setManageModalError("");
        openManageModal();
      }

      function appendTagList(target, items, tone = "") {
        target.innerHTML = "";
        if (!items || !items.length) {
          target.appendChild(createTag("无", tone === "warn" ? "" : "ok"));
          return;
        }
        for (const item of items) {
          target.appendChild(createTag(item, tone));
        }
      }

      function renderOrder(target, order, currentLead) {
        target.innerHTML = "";
        if (!order || !order.length) {
          target.appendChild(createTag("无"));
          return;
        }
        const rowsById = new Map((appState.data?.rows || []).map((row) => [row.profileId, row]));
        order.forEach((profileId, index) => {
          const row = rowsById.get(profileId);
          const remaining = getRemainingPercent(row?.secondary);

          const entry = document.createElement("div");
          entry.className = "order-entry";

          const head = document.createElement("div");
          head.className = "order-entry-head";

          const rank = document.createElement("div");
          rank.className = "order-entry-rank";
          rank.textContent = String(index + 1);

          const name = document.createElement("div");
          name.className = "order-entry-name";
          const strong = document.createElement("strong");
          strong.textContent = row?.displayLabel || profileId;
          const sub = document.createElement("span");
          sub.textContent = profileId;
          name.appendChild(strong);
          name.appendChild(sub);

          const meta = document.createElement("div");
          meta.className = "order-entry-meta";
          meta.textContent = remaining == null ? "7 天未知" : "7 天 " + remaining + "%";

          head.appendChild(rank);
          head.appendChild(name);
          head.appendChild(meta);
          entry.appendChild(head);

          const meter = document.createElement("div");
          meter.className = "micro-meter " + getQuotaTone(remaining);
          const fill = document.createElement("div");
          fill.className = "micro-meter-fill";
          fill.style.width = String(remaining == null ? 0 : remaining) + "%";
          meter.appendChild(fill);
          entry.appendChild(meter);

          const foot = document.createElement("div");
          foot.className = "order-entry-foot";
          const reset = document.createElement("span");
          reset.textContent = row?.secondary?.resetAt
            ? formatCountdown(row.secondary.resetAt).text.replace(/^倒计时 /, "")
            : "重置时间未知";
          foot.appendChild(reset);
          entry.appendChild(foot);

          target.appendChild(entry);
        });
      }

      function renderMetric(windowData, title, variant = "") {
        const wrapper = document.createElement("div");
        wrapper.className = "metric-card" + (variant ? " " + variant : "");

        const heading = document.createElement("div");
        heading.className = "metric-title";
        heading.textContent = title;
        wrapper.appendChild(heading);

        const metric = document.createElement("div");
        metric.className = "metric";

        const head = document.createElement("div");
        head.className = "metric-head";

        const strong = document.createElement("strong");
        const remaining = getRemainingPercent(windowData);
        strong.textContent = remaining == null ? "未知" : remaining + "% 剩余";
        const label = document.createElement("span");
        label.className = "metric-label";
        label.textContent = windowData.label || "quota";
        head.appendChild(strong);
        head.appendChild(label);
        metric.appendChild(head);

        const bar = document.createElement("div");
        const width = remaining == null ? 0 : remaining;
        const tone = getQuotaTone(remaining);
        bar.className = "metric-bar " + tone;
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-label", title + " remaining quota");
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", String(width));
        const fill = document.createElement("div");
        fill.className = "metric-bar-fill";
        fill.style.width = width + "%";
        bar.appendChild(fill);
        metric.appendChild(bar);

        const meta = document.createElement("div");
        meta.className = "metric-meta";
        const small = document.createElement("small");
        small.textContent = "重置于 " + formatTime(windowData.resetAt);
        const countdown = document.createElement("span");
        countdown.setAttribute("data-reset-at", windowData.resetAt == null ? "" : String(windowData.resetAt));
        const countdownState = formatCountdown(windowData.resetAt);
        countdown.className = "countdown" + (countdownState.tone ? " " + countdownState.tone : "");
        countdown.textContent = countdownState.text;
        meta.appendChild(small);
        meta.appendChild(countdown);
        metric.appendChild(meta);

        wrapper.appendChild(metric);
        return wrapper;
      }

      function collectNextReset(data) {
        if (!data || !Array.isArray(data.rows)) {
          return null;
        }
        let nextReset = null;
        for (const row of data.rows) {
          for (const windowData of [row.primary, row.secondary]) {
            if (!windowData?.resetAt) continue;
            const ts = windowData.resetAt > 10_000_000_000 ? windowData.resetAt : windowData.resetAt * 1000;
            if (ts <= Date.now()) continue;
            if (nextReset == null || ts < nextReset) {
              nextReset = ts;
            }
          }
        }
        return nextReset;
      }

      function buildOrderStatus(row) {
        const items = [];
        if (row.recommendedOrderIndex >= 0) {
          items.push("推荐第 " + String(row.recommendedOrderIndex + 1) + " 位");
        }
        if (row.currentOrderIndex < Number.MAX_SAFE_INTEGER) {
          items.push("当前第 " + String(row.currentOrderIndex + 1) + " 位");
        } else {
          items.push("当前未在运行顺序中");
        }
        return items.join(" · ");
      }

      function buildProfileReason(row) {
        if (row.error) {
          return "额度异常，建议重新检查";
        }
        const parts = [];
        if (row.secondary?.remainingPercent != null) {
          parts.push("7d " + row.secondary.remainingPercent + "%");
        }
        if (row.primary?.remainingPercent != null) {
          parts.push("5h " + row.primary.remainingPercent + "%");
        }
        if (row.primary?.resetAt) {
          parts.push(formatCountdown(row.primary.resetAt).text.replace(/^倒计时 /, ""));
        }
        return parts.join(" · ") || "额度未知";
      }

      function humanizeSystemNote(note) {
        if (!note) {
          return "";
        }
        if (note.includes("Applying order updates")) {
          return "应用推荐会更新 OpenClaw 和 Hermes 投影；只有显式要求同步时才会改写 Codex 当前账号。";
        }
        if (note.includes("Setting a profile as current")) {
          return "“设为当前”会切换 OpenClaw 当前账号，并在兼容时同步 Hermes 和 Codex。";
        }
        if (note.includes("project-local store is the canonical source of truth")) {
          return "项目本地号池是真源，OpenClaw、Hermes 和 Codex 文件都只是导出结果。";
        }
        return note;
      }

      function humanizeWarning(note) {
        if (!note) {
          return "";
        }
        if (note.includes("Local auth store was not found")) {
          return "还没初始化项目本地号池。可以从当前 OpenClaw、Hermes 或 Codex sidecar 初始化，或者直接导入加密 bundle。";
        }
        if (note.includes("Local auth store is not initialized yet")) {
          return "本地号池还没初始化，当前不会自动把 OpenClaw、Hermes 或 Codex sidecar 回灌为真源。";
        }
        if (note.includes("openclaw.json was not found")) {
          return "还没找到 OpenClaw 配置，补齐配置功能暂时不可用。";
        }
        if (note.includes("No openai-codex profiles were found")) {
          return "当前还没有可用的 Codex 账号。";
        }
        if (note.includes("openclaw.json auth.profiles is missing")) {
          return "配置里缺少这些账号，请补齐后再使用: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("openclaw.json auth.order omits")) {
          return "当前顺序里缺少这些账号，建议补齐配置: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("openclaw.json auth.order references unknown profiles")) {
          return "顺序里有无法识别的账号，请检查配置: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("Local auth store order omits")) {
          return "本地号池顺序里缺少这些账号，建议重新同步: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("openclaw.json auth.order differs from the local auth store order")) {
          return "OpenClaw 配置顺序和本地号池顺序不一致，建议重建运行文件。";
        }
        if (note.includes("Profiles still using :default should be renamed")) {
          return "这些账号名称还比较临时，建议改成更容易识别的名字: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("OpenClaw runtime auth-profiles.json managed openai-codex entries have drifted")) {
          return "OpenClaw runtime 里的 codex 配置已经偏离本地号池，建议重建运行文件。";
        }
        if (note.includes("Hermes auth.json managed openai-codex projection has drifted")) {
          return "Hermes 里的 openai-codex 投影已经偏离本地号池，建议重建运行文件。";
        }
        if (note.includes("Current Hermes openai-codex provider state does not match any stored profile")) {
          return "当前 Hermes 选中的 openai-codex 账号还没有纳入本地号池。";
        }
        if (note.includes("Current Hermes openai-codex provider state matches multiple stored profiles")) {
          return "当前 Hermes 选中的 openai-codex 账号和多个本地账号重复，系统无法安全自动关联。";
        }
        if (note.includes("Current ~/.codex/auth.json does not match any stored profile")) {
          return "当前 Codex 登录还没有纳入这个仓库，所以暂时不能统一切换。";
        }
        if (note.includes("Current ~/.codex/auth.json matches multiple stored profiles")) {
          return "当前 Codex 登录和多个仓库账号重复，系统无法安全自动关联。";
        }
        if (note.includes("Current ~/.codex/auth.json has drifted")) {
          return "当前 Codex auth 和它关联的仓库账号内容不一致，建议重新同步 Codex 或重建运行文件。";
        }
        if (note.includes("Failed to read ~/.codex/auth.json")) {
          return "读取 Codex 当前登录失败: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("Failed to read OpenClaw auth-profiles.json")) {
          return "读取 OpenClaw runtime auth-profiles 失败: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("Failed to read Hermes auth.json")) {
          return "读取 Hermes auth.json 失败: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("Failed to read OpenClaw session store for agent")) {
          return "读取会话覆盖状态失败: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("OpenClaw session auto auth profile overrides can ignore the configured order")) {
          return "有会话被自动挑选的账号锁住了，可能暂时不按当前顺序走；重建运行文件后会自动清掉这些 auto override。";
        }
        return note;
      }

      function humanizeCodexStatusReason(reason) {
        if (!reason) {
          return "";
        }
        if (reason.includes("需要重新登录升级为 OAuth 账号")) {
          return "需要重新登录升级";
        }
        if (reason.includes("缺少 Codex id_token")) {
          return "缺少 Codex 专属字段";
        }
        if (reason.includes("缺少 access token")) {
          return "缺少 access token";
        }
        if (reason.includes("缺少 refresh token")) {
          return "缺少 refresh token";
        }
        if (reason.includes("缺少 accountId")) {
          return "缺少 accountId";
        }
        return reason;
      }

      function humanizeLoginStatus(status) {
        switch (status) {
          case "starting":
            return "正在启动";
          case "awaiting_auth":
            return "等待浏览器回调";
          case "awaiting_manual_code":
            return "等待手动回调";
          case "saving":
            return "正在保存账号";
          case "completed":
            return "登录完成";
          case "failed":
            return "登录失败";
          default:
            return status || "未知";
        }
      }

      function buildLoginTaskRenderKey(task) {
        if (!task) {
          return "";
        }
        return JSON.stringify({
          taskId: task.taskId,
          status: task.status,
          authUrl: task.authUrl,
          instructions: task.instructions,
          promptMessage: task.promptMessage,
          manualEntryAvailable: Boolean(task.manualEntryAvailable),
          manualEntryRequired: Boolean(task.manualEntryRequired),
          manualCodeSubmitted: Boolean(task.manualCodeSubmitted),
          manualHint: task.manualHint,
          error: task.error,
        });
      }

      function createAlertCard(title, tone, items) {
        const card = document.createElement("section");
        card.className = "alert-card " + tone;

        const titleRow = document.createElement("div");
        titleRow.className = "alert-title";
        const icon = document.createElement("span");
        icon.className = "alert-icon";
        icon.textContent = tone === "warn" ? "!" : tone === "danger" ? "×" : tone === "ok" ? "✓" : "i";
        const heading = document.createElement("h3");
        heading.textContent = title;
        titleRow.appendChild(icon);
        titleRow.appendChild(heading);
        card.appendChild(titleRow);

        const list = document.createElement("div");
        list.className = "alert-list";
        for (const item of items.slice(0, 2)) {
          const line = document.createElement("div");
          line.className = "alert-item";
          line.textContent = item;
          list.appendChild(line);
        }
        card.appendChild(list);
        return card;
      }

      function createTokenReminderAlertCard() {
        const modalCount = appState.tokenReminderModalProfiles.length;
        const warnCount = appState.tokenReminderWarnProfiles.length;
        if (!appState.tokenReminderEnabled || warnCount === 0) {
          return null;
        }

        const tone = modalCount > 0 ? "danger" : "warn";
        const items = [];
        const earliest = appState.tokenReminderWarnProfiles[0];
        items.push((modalCount > 0 ? "紧急 " : "临近 ") + warnCount + " 个账号需要留意");
        if (earliest) {
          items.push((earliest.displayLabel || earliest.profileId) + " · " + describeTokenExpiry(earliest));
        }
        return createAlertCard("Token 到期提醒", tone, items);
      }

      function createSelectionStatusAlertCard(data) {
        const openClawCurrent = getOpenClawCurrentRow(data);
        const codexCurrent = getCodexCurrentRow(data);
        const tone = data?.codexWouldDivergeFromOpenClaw ? "warn" : "ok";
        return createAlertCard("当前账号", tone, [
          openClawCurrent
            ? "OpenClaw · " + (openClawCurrent.displayLabel || openClawCurrent.profileId)
            : "OpenClaw · 暂无当前账号",
          codexCurrent
            ? "Codex · " + (codexCurrent.displayLabel || codexCurrent.profileId)
            : "Codex · 当前未关联到本地号池",
        ]);
      }

      function createCodexRecommendationAlertCard(data) {
        const row = getCodexRecommendedRow(data);
        if (!row) {
          if (!data?.codexRecommendedBlockedReason) {
            return null;
          }
          return createAlertCard("Codex 推荐", "warn", [
            data.codexRecommendedBlockedReason,
            "当前不会自动切换 Codex",
          ]);
        }

        const tone = data?.codexAutoSwitchSuggested
          ? "warn"
          : data?.codexWouldDivergeFromOpenClaw
            ? "info"
            : "ok";
        const detail = data?.codexAutoSwitchReason
          || (data?.codexWouldDivergeFromOpenClaw
            ? "已与 OpenClaw 推荐拆开，给 Codex 预留独立账号。"
            : "当前 Codex 推荐与 OpenClaw 一致。");
        return createAlertCard("Codex 推荐", tone, [
          (row.displayLabel || row.profileId) + " · " + row.profileId,
          detail,
        ]);
      }

      function createCodexRestartAlertCard() {
        if (!needsCodexRestartBanner()) {
          return null;
        }
        return createAlertCard("Codex 重启提示", "warn", [
          appState.codexRestartMessage,
          "如果 Codex 已在运行，请关闭后重新启动。",
        ]);
      }

      function createLoginAlertCard(task) {
        const tone = task.status === "failed" ? "danger" : task.status === "completed" ? "ok" : "info";
        const card = document.createElement("section");
        card.className = "alert-card login-alert-card " + tone;

        const shell = document.createElement("div");
        shell.className = "login-alert-shell";

        const head = document.createElement("div");
        head.className = "login-alert-head";
        const titleRow = document.createElement("div");
        titleRow.className = "alert-title";
        const icon = document.createElement("span");
        icon.className = "alert-icon";
        icon.textContent = tone === "danger" ? "×" : tone === "ok" ? "✓" : "i";
        const heading = document.createElement("h3");
        heading.textContent = "登录";
        titleRow.appendChild(icon);
        titleRow.appendChild(heading);

        const status = document.createElement("div");
        status.className = "login-alert-status";
        status.textContent = humanizeLoginStatus(task.status);

        head.appendChild(titleRow);
        head.appendChild(status);
        shell.appendChild(head);

        const copy = document.createElement("div");
        copy.className = "login-alert-copy";
        const primary = document.createElement("p");
        primary.textContent = task.instructions || task.error || "OAuth 登录进行中";
        copy.appendChild(primary);
        if (task.manualHint) {
          const secondary = document.createElement("p");
          secondary.textContent = task.manualHint;
          copy.appendChild(secondary);
        }
        shell.appendChild(copy);

        if ((task.status === "awaiting_auth" || task.status === "awaiting_manual_code") && task.authUrl) {
          const actions = document.createElement("div");
          actions.className = "login-alert-actions";
          const openButton = document.createElement("button");
          openButton.type = "button";
          openButton.className = "button-secondary";
          openButton.textContent = "打开授权页";
          openButton.addEventListener("click", () => {
            if (appState.popup && !appState.popup.closed) {
              try {
                appState.popup.focus();
              } catch {
                // Ignore focus errors from popup blockers.
              }
            }
            const popup = window.open(task.authUrl, "_blank");
            if (popup) {
              appState.popup = popup;
            }
          });
          actions.appendChild(openButton);
          shell.appendChild(actions);
        }

        if (task.manualEntryAvailable) {
          const manual = document.createElement("div");
          manual.className = "login-alert-manual";

          const manualTop = document.createElement("div");
          manualTop.className = "login-alert-manual-top";
          const manualTitle = document.createElement("strong");
          manualTitle.textContent = task.manualEntryRequired ? "手动回调必填" : "手动回调兜底";
          manualTop.appendChild(manualTitle);
          manual.appendChild(manualTop);

          const note = document.createElement("p");
          note.className = "login-alert-note";
          note.textContent = task.manualEntryRequired
            ? "自动回调没有完成。把浏览器跳回的 localhost 链接整条粘过来，或者只粘贴 code。"
            : "如果浏览器回调没被捕获，可以提前把 localhost 回调链接粘进来备用。";
          manual.appendChild(note);

          const form = document.createElement("div");
          form.className = "login-alert-form";
          const row = document.createElement("div");
          row.className = "login-alert-form-row";

          const input = document.createElement("input");
          input.className = "input";
          input.type = "text";
          input.autocomplete = "off";
          input.spellcheck = false;
          input.placeholder = "粘贴 http://localhost:1455/auth/callback?... 或授权 code";
          input.value = appState.manualCodeDraft;

          const submit = document.createElement("button");
          submit.type = "button";
          submit.className = "button-primary";
          submit.textContent = appState.manualCodeSubmitting ? "提交中..." : "提交回调链接";
          submit.disabled = appState.manualCodeSubmitting || !input.value.trim() || !appState.loginTaskId;

          input.addEventListener("input", () => {
            appState.manualCodeDraft = input.value;
            if (appState.manualCodeError) {
              appState.manualCodeError = "";
              errorLine.hidden = true;
              errorLine.textContent = "";
            }
            submit.disabled = appState.manualCodeSubmitting || !input.value.trim() || !appState.loginTaskId;
          });

          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!submit.disabled) {
                void submitManualCodeEntry();
              }
            }
          });

          submit.addEventListener("click", () => {
            void submitManualCodeEntry();
          });

          row.appendChild(input);
          row.appendChild(submit);
          form.appendChild(row);

          const errorLine = document.createElement("div");
          errorLine.className = "error-line";
          errorLine.hidden = !appState.manualCodeError;
          errorLine.textContent = appState.manualCodeError;
          form.appendChild(errorLine);

          if (task.manualCodeSubmitted && !appState.manualCodeError) {
            const submitted = document.createElement("p");
            submitted.className = "login-alert-note";
            submitted.textContent = task.manualEntryRequired
              ? "手动回调已提交，正在继续登录。"
              : "手动回调已保存，自动回调失败时会自动使用。";
            form.appendChild(submitted);
          }

          manual.appendChild(form);
          shell.appendChild(manual);
        }

        card.appendChild(shell);
        return card;
      }

      function renderAlerts(data) {
        alertsGrid.innerHTML = "";
        const cards = [];

        if (appState.loginTask) {
          cards.push(createLoginAlertCard(appState.loginTask));
        }

        cards.push(createSelectionStatusAlertCard(data));

        const codexRecommendationCard = createCodexRecommendationAlertCard(data);
        if (codexRecommendationCard) {
          cards.push(codexRecommendationCard);
        }

        const tokenReminderCard = createTokenReminderAlertCard();
        if (tokenReminderCard) {
          cards.push(tokenReminderCard);
        }

        const codexRestartCard = createCodexRestartAlertCard();
        if (codexRestartCard) {
          cards.push(codexRestartCard);
        }

        if (data?.warnings?.length) {
          cards.push(createAlertCard("提醒", "warn", [String(data.warnings.length) + " 项待处理"]));
        }

        if (data?.notes?.length) {
          cards.push(createAlertCard("说明", "ok", [humanizeSystemNote(data.notes[0])]));
        }

        if (!cards.length) {
          cards.push(createAlertCard("状态", "ok", ["一切正常"]));
        }

        const fragment = document.createDocumentFragment();
        cards.forEach((card) => fragment.appendChild(card));
        alertsGrid.appendChild(fragment);
      }

      function renderSpotlight(data) {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const summary = buildQuotaBoardSummary(rows, PRIMARY_RECOMMENDATION_MIN_REMAINING_PERCENT);
        const windows = [
          {
            title: "7d",
            valueNode: quotaBoardSecondaryValue,
            barNode: quotaBoardSecondaryBar,
            metaNode: quotaBoardSecondaryMeta,
            summary: summary.secondary,
          },
          {
            title: "5h",
            valueNode: quotaBoardPrimaryValue,
            barNode: quotaBoardPrimaryBar,
            metaNode: quotaBoardPrimaryMeta,
            summary: summary.primary,
          },
        ];

        quotaBoardTitle.textContent = "全局可用额度";
        quotaBoardDescription.textContent = rows.length
          ? "7d 总剩余按可读账号汇总；5h 总剩余只统计 7d 未耗尽且 5h 大于 5% 的账号。"
          : "等待读取账号额度后汇总 7d 与 5h 总剩余额度。";

        quotaBoardTags.innerHTML = "";
        quotaBoardTags.appendChild(createTag("账号数 " + summary.totalAccounts, "info"));
        quotaBoardTags.appendChild(createTag("7d 可读 " + summary.secondary.readableCount, summary.secondary.readableCount ? "ok" : "warn"));
        quotaBoardTags.appendChild(createTag("5h 可用 " + summary.primary.readableCount, summary.primary.readableCount ? "ok" : "warn"));
        const nextReset = collectNextReset(data);
        quotaBoardTags.appendChild(
          createTag(
            nextReset ? "下次重置 " + formatCountdown(nextReset).text.replace(/^倒计时 /, "") : "下次重置 未知",
            nextReset ? "info" : "warn",
          ),
        );

        windows.forEach(({ title, valueNode, barNode, metaNode, summary: windowSummary }) => {
          valueNode.textContent = formatQuotaBoardValue(windowSummary);
          renderQuotaBoardBar(barNode, windowSummary, title);
          metaNode.innerHTML = "";
          metaNode.appendChild(
            createInfoPill(
              (title === "5h" ? "可用 " : "可读 ") + windowSummary.readableCount + "/" + summary.totalAccounts,
              windowSummary.readableCount ? "info" : "warn",
            ),
          );
          metaNode.appendChild(
            createInfoPill(
              windowSummary.nextResetAt
                ? "下次重置 " + formatCountdown(windowSummary.nextResetAt).text.replace(/^倒计时 /, "")
                : "重置未知",
              windowSummary.nextResetAt ? "info" : "warn",
            ),
          );
        });
        renderSecondaryQuotaDetails(summary.secondary);
        renderPrimaryQuotaDetails(summary.primary);
      }

      function renderOverviewStats(data) {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        profilesCountValue.textContent = String(rows.length);
        const summary = summarizeSecondaryWindow(rows);
        depletedProfilesValue.textContent = String(summary.depleted);
        availableProfilesValue.textContent = String(summary.available);
        const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
        warningsCountValue.textContent = String(warnings.length + (appState.tokenReminderEnabled ? appState.tokenReminderWarnProfiles.length : 0));
        const nextReset = collectNextReset(data);
        nextResetValue.textContent = nextReset ? formatCountdown(nextReset).text.replace(/^倒计时 /, "") : "未知";
      }

      function resolveEmailSuffix(email) {
        if (typeof email !== "string") {
          return null;
        }
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf("@");
        if (atIndex < 0 || atIndex === trimmed.length - 1) {
          return null;
        }
        const suffix = trimmed.slice(atIndex + 1).trim().toLowerCase();
        return suffix || null;
      }

      function groupRowsByEmailSuffix(rows) {
        const groups = new Map();
        for (const row of rows) {
          const suffix = resolveEmailSuffix(row.email);
          const key = suffix || "__missing__";
          if (!groups.has(key)) {
            groups.set(key, {
              key,
              title: suffix ? "@" + suffix : "未识别邮箱后缀",
              note: suffix ? "组内仍按额度推荐顺序排列" : "没有邮箱地址的账号会归到这里",
              rows: [],
            });
          }
          groups.get(key).rows.push(row);
        }
        return Array.from(groups.values());
      }

      function getSelectableProfileIds(data = appState.data) {
        return Array.isArray(data?.rows) ? data.rows.map((row) => row.profileId) : [];
      }

      function getSelectedProfileIds() {
        return Array.isArray(appState.selectedProfileIds) ? appState.selectedProfileIds : [];
      }

      function isProfileSelected(profileId) {
        return getSelectedProfileIds().includes(profileId);
      }

      function setSelectedProfiles(profileIds) {
        const allowed = new Set(getSelectableProfileIds());
        const next = [];
        for (const profileId of Array.isArray(profileIds) ? profileIds : []) {
          if (typeof profileId !== "string" || !allowed.has(profileId) || next.includes(profileId)) {
            continue;
          }
          next.push(profileId);
        }
        appState.selectedProfileIds = next;
      }

      function toggleSelectedProfile(profileId, checked) {
        const next = new Set(getSelectedProfileIds());
        if (checked) {
          next.add(profileId);
        } else {
          next.delete(profileId);
        }
        setSelectedProfiles(Array.from(next));
      }

      function getRowsByProfileId() {
        return new Map((appState.data?.rows || []).map((row) => [row.profileId, row]));
      }

      function renderBulkSelectionState() {
        const total = getSelectableProfileIds().length;
        const selected = getSelectedProfileIds().length;
        accountsBulkBar.hidden = total === 0;
        accountsBulkCount.textContent = "已选 " + selected + " 个账号";
        if (selected > 0) {
          accountsBulkHint.textContent = selected === total
            ? "当前列表已全选，可以一起删除。"
            : "确认后会一次删除所选账号。";
        } else {
          accountsBulkHint.textContent = "可多选后一起删除。";
        }
        accountsSelectAllButton.textContent = selected === total && total > 0 ? "已全选" : "全选";
        accountsSelectAllButton.disabled = appState.busy || total === 0 || selected === total;
        accountsClearSelectionButton.disabled = appState.busy || selected === 0;
        accountsDeleteSelectedButton.disabled = appState.busy || selected === 0;
      }

      function createProfileCard(row) {
        const card = document.createElement("article");
        const isTop = row.recommendedOrderIndex === 0;
        const selected = isProfileSelected(row.profileId);
        card.className = "profile-card"
          + (isTop ? " top" : "")
          + (row.error ? " problem" : "")
          + (selected ? " selected" : "");
        const primaryRemaining = getRemainingPercent(row.primary);
        const availability = getProfileAvailability(row);

        const head = document.createElement("div");
        head.className = "profile-head";
        const main = document.createElement("div");
        main.className = "profile-main";
        const topline = document.createElement("div");
        topline.className = "profile-topline";
        const rank = document.createElement("div");
        rank.className = "rank-badge";
        rank.textContent = row.recommendedOrderIndex >= 0 ? "#" + String(row.recommendedOrderIndex + 1) : "--";
        const identity = document.createElement("div");
        identity.className = "profile-identity";
        const name = document.createElement("div");
        name.className = "profile-name";
        name.textContent = row.displayLabel;
        const subline = document.createElement("div");
        subline.className = "profile-subline";
        subline.textContent = row.profileId;
        topline.appendChild(rank);
        identity.appendChild(name);
        identity.appendChild(subline);
        topline.appendChild(identity);
        main.appendChild(topline);

        const headerMeta = document.createElement("div");
        headerMeta.className = "profile-header-meta";
        const leadTag = document.createElement("div");
        const leadTone = isTop && availability.leadLabel === "可切换" ? "ok" : availability.leadTone;
        leadTag.className = "meta-tag " + leadTone;
        leadTag.textContent = isTop && availability.leadLabel === "可切换" ? "推荐" : availability.leadLabel;

        const stateRow = document.createElement("div");
        stateRow.className = "profile-state-row";
        const dot = document.createElement("span");
        dot.className = "state-dot " + availability.stateTone;
        const stateText = document.createElement("span");
        stateText.textContent = availability.stateText;
        stateRow.appendChild(dot);
        stateRow.appendChild(stateText);

        headerMeta.appendChild(leadTag);
        headerMeta.appendChild(stateRow);

        const selectLabel = document.createElement("label");
        selectLabel.className = "profile-select-toggle";
        const selectInput = document.createElement("input");
        selectInput.type = "checkbox";
        selectInput.checked = selected;
        selectInput.dataset.profileSelect = "true";
        selectInput.disabled = appState.busy;
        selectInput.addEventListener("change", () => {
          toggleSelectedProfile(row.profileId, selectInput.checked);
          card.classList.toggle("selected", selectInput.checked);
          renderBulkSelectionState();
        });
        const selectText = document.createElement("span");
        selectText.textContent = "选择";
        selectLabel.appendChild(selectInput);
        selectLabel.appendChild(selectText);
        headerMeta.appendChild(selectLabel);

        head.appendChild(main);
        head.appendChild(headerMeta);
        card.appendChild(head);

        const mainMetric = renderMetric(row.secondary, "7 天额度", "primary-window profile-main-window");
        card.appendChild(mainMetric);

        const footer = document.createElement("div");
        footer.className = "profile-footer";

        const secondaryRow = document.createElement("div");
        secondaryRow.className = "profile-secondary-row";
        const shortWindow = createInfoPill(
          primaryRemaining == null
            ? "5h 未知"
            : primaryRemaining <= 0
              ? "5h 已耗尽"
              : "5h " + primaryRemaining + "%",
          getQuotaBadgeTone(primaryRemaining),
        );
        secondaryRow.appendChild(shortWindow);
        if (row.primary?.resetAt) {
          const shortReset = createInfoPill(
            formatCountdown(row.primary.resetAt).text.replace(/^倒计时 /, ""),
            primaryRemaining != null && primaryRemaining <= 0 ? "danger" : "info",
          );
          secondaryRow.appendChild(shortReset);
        }
        if (row.plan) {
          const plan = document.createElement("span");
          plan.className = "profile-inline-note";
          plan.textContent = row.plan;
          secondaryRow.appendChild(plan);
        }
        if (row.openClawCurrent) {
          secondaryRow.appendChild(createInfoPill("OpenClaw 当前", "info"));
        }
        const codexPillLabel = row.canLinkCurrentCodex
          ? "可吸收当前 Codex"
          : row.codexCompatible
            ? row.codexCurrent
              ? "Codex 当前"
              : "Codex 兼容"
            : "Codex 需升级";
        const codexPillTone = row.canLinkCurrentCodex ? "warn" : row.codexCompatible ? "ok" : "info";
        secondaryRow.appendChild(createInfoPill(codexPillLabel, codexPillTone));
        if (row.codexRecommended && !row.codexCurrent) {
          secondaryRow.appendChild(createInfoPill("Codex 推荐", "warn"));
        }
        if (row.expiresAt) {
          const expiry = document.createElement("span");
          expiry.className = "profile-inline-note strong";
          expiry.textContent = "到期 " + formatTime(row.expiresAt);
          secondaryRow.appendChild(expiry);
        }

        if (row.error) {
          const errorText = document.createElement("div");
          errorText.className = "error-text";
          errorText.textContent = row.error;
          card.appendChild(errorText);
        }
        if (!row.error && row.recommendationEligible === false && row.recommendationBlockedReason) {
          const recommendationHint = document.createElement("div");
          recommendationHint.className = "error-text";
          recommendationHint.textContent = row.recommendationBlockedReason;
          card.appendChild(recommendationHint);
        }
        if (!row.codexCompatible && row.codexStatusReason) {
          const codexHint = document.createElement("div");
          codexHint.className = "error-text";
          codexHint.textContent = "Codex 切换不可用：" + humanizeCodexStatusReason(row.codexStatusReason);
          card.appendChild(codexHint);
        }

        const actions = document.createElement("div");
        actions.className = "profile-actions";

        const primaryButton = document.createElement("button");
        primaryButton.type = "button";
        primaryButton.className = row.isSelectedEverywhere ? "button-secondary" : "button-primary";
        primaryButton.dataset.actionButton = "true";

        if (row.canLinkCurrentCodex) {
          primaryButton.textContent = "吸收当前 Codex";
          primaryButton.disabled = appState.busy;
          primaryButton.addEventListener("click", () => {
            void linkCurrentCodex(row);
          });
        } else if (!row.codexCompatible) {
          primaryButton.textContent = "升级登录";
          primaryButton.disabled = appState.busy;
          primaryButton.addEventListener("click", () => {
            void upgradeProfile(row);
          });
        } else if (row.isSelectedEverywhere) {
          primaryButton.textContent = "当前账号";
          primaryButton.disabled = true;
          primaryButton.dataset.lockedDisabled = "true";
        } else {
          primaryButton.textContent = "设为当前";
          primaryButton.disabled = appState.busy;
          primaryButton.addEventListener("click", () => {
            void switchCurrentProfile(row);
          });
        }

        actions.appendChild(primaryButton);

        const menu = document.createElement("details");
        menu.className = "profile-menu";
        menu.dataset.vertical = "down";
        menu.dataset.horizontal = "right";

        const summary = document.createElement("summary");
        summary.textContent = "···";
        menu.appendChild(summary);

        const menuList = document.createElement("div");
        menuList.className = "profile-menu-list";

        const lastButton = document.createElement("button");
        lastButton.type = "button";
        lastButton.className = "profile-menu-button";
        lastButton.textContent = "末位";
        lastButton.disabled = appState.busy;
        lastButton.dataset.actionButton = "true";
        lastButton.addEventListener("click", () => {
          menu.removeAttribute("open");
          const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
          void applyCustomOrder([...others, row.profileId]);
        });

        if (row.codexCompatible && !row.codexCurrent) {
          const codexOnlyButton = document.createElement("button");
          codexOnlyButton.type = "button";
          codexOnlyButton.className = "profile-menu-button";
          codexOnlyButton.textContent = "仅切 Codex";
          codexOnlyButton.disabled = appState.busy;
          codexOnlyButton.dataset.actionButton = "true";
          codexOnlyButton.addEventListener("click", () => {
            menu.removeAttribute("open");
            void switchCodexOnly(row);
          });
          menuList.appendChild(codexOnlyButton);
        }

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "profile-menu-button";
        renameButton.textContent = "改名";
        renameButton.disabled = appState.busy;
        renameButton.dataset.actionButton = "true";
        renameButton.addEventListener("click", () => {
          menu.removeAttribute("open");
          openRenameModal(row);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "profile-menu-button danger";
        deleteButton.textContent = "删除";
        deleteButton.disabled = appState.busy;
        deleteButton.dataset.actionButton = "true";
        deleteButton.addEventListener("click", () => {
          menu.removeAttribute("open");
          openDeleteModal(row);
        });

        menuList.appendChild(lastButton);
        menuList.appendChild(renameButton);
        menuList.appendChild(deleteButton);
        menu.appendChild(menuList);
        menu.addEventListener("toggle", () => {
          if (!menu.open) return;
          closeFloatingMenus(menu);
          window.requestAnimationFrame(() => {
            positionFloatingMenu(menu, menuList);
          });
        });
        actions.appendChild(menu);

        footer.appendChild(secondaryRow);
        footer.appendChild(actions);
        card.appendChild(footer);
        return card;
      }

      function renderProfileCards(data) {
        profilesList.innerHTML = "";
        emptyState.hidden = data.rows.length > 0;
        if (!data.rows.length) {
          renderBulkSelectionState();
          return;
        }

        if (appState.accountsView === "grouped") {
          profilesList.className = "profile-group-list";
          const fragment = document.createDocumentFragment();
          const groups = groupRowsByEmailSuffix(data.rows);
          groups.forEach((group) => {
            const section = document.createElement("section");
            section.className = "profile-group";

            const head = document.createElement("div");
            head.className = "profile-group-head";

            const intro = document.createElement("div");
            const title = document.createElement("div");
            title.className = "profile-group-title";
            const strong = document.createElement("strong");
            strong.textContent = group.title;
            title.appendChild(strong);
            title.appendChild(createTag(group.rows.length + " 个账号", "info"));
            intro.appendChild(title);

            const note = document.createElement("p");
            note.className = "profile-group-note";
            note.textContent = group.note;
            intro.appendChild(note);

            const lead = group.rows[0];
            const summary = document.createElement("div");
            summary.className = "profile-group-title";
            summary.appendChild(createInfoPill("最高优先级 #" + String(lead.recommendedOrderIndex + 1), "ok"));

            head.appendChild(intro);
            head.appendChild(summary);
            section.appendChild(head);

            const list = document.createElement("div");
            list.className = "profile-list";
            group.rows.forEach((row) => {
              list.appendChild(createProfileCard(row));
            });
            section.appendChild(list);
            fragment.appendChild(section);
          });

          profilesList.appendChild(fragment);
          renderBulkSelectionState();
          return;
        }

        profilesList.className = "profile-list";
        const fragment = document.createDocumentFragment();
        data.rows.forEach((row) => {
          fragment.appendChild(createProfileCard(row));
        });
        profilesList.appendChild(fragment);
        renderBulkSelectionState();
      }

      function formatRuntimeAuthTargets(context) {
        const targetAgentIds = Array.isArray(context?.runtimeAuthTargetAgentIds)
          ? context.runtimeAuthTargetAgentIds.filter((entry) => typeof entry === "string" && entry)
          : [];
        const targetPaths = Array.isArray(context?.runtimeAuthTargetPaths)
          ? context.runtimeAuthTargetPaths.filter((entry) => typeof entry === "string" && entry)
          : [];

        if (!targetPaths.length) {
          return context?.runtimeAuthStorePath || "-";
        }

        const heading = targetAgentIds.length
          ? "共 " + targetPaths.length + " 个 agent: " + targetAgentIds.join(", ")
          : "共 " + targetPaths.length + " 个目标";

        return [heading, ...targetPaths].join("\n");
      }

      function formatSessionOverrides(summary) {
        const targets = Array.isArray(summary?.targets) ? summary.targets : [];
        const total = Number.isFinite(summary?.totalAutoOverrideCount) ? summary.totalAutoOverrideCount : 0;
        const affectedAgents = Number.isFinite(summary?.affectedAgentCount) ? summary.affectedAgentCount : 0;
        const recent = summary?.mostRecentAutoOverride || null;
        const withOverrides = targets
          .filter((target) => Number.isFinite(target?.autoOverrideCount) && target.autoOverrideCount > 0)
          .map((target) => target.agentId + " " + target.autoOverrideCount + " 个");

        if (!targets.length) {
          return "没有可检查的 session store";
        }
        if (total === 0) {
          return "当前没有 openai-codex 的 auto override";
        }

        const lines = ["共 " + total + " 个 auto override，分布在 " + affectedAgents + " 个 agent"];
        if (withOverrides.length) {
          lines.push("按 agent: " + withOverrides.join(", "));
        }
        if (recent?.profileId) {
          const timeText = recent.updatedAt
            ? new Date(recent.updatedAt).toLocaleString("zh-CN", { hour12: false })
            : "时间未知";
          lines.push("最近: " + recent.agentId + " -> " + recent.profileId + " (" + timeText + ")");
        }
        return lines.join("\n");
      }

      function render(data) {
        appState.data = data;
        setSelectedProfiles(getSelectedProfileIds());
        applyTokenReminderSnapshot(buildTokenReminderSnapshotFromDashboardState(data));
        renderToolbarState(data);
        renderSpotlight(data);
        renderOverviewStats(data);
        const runtimeAuthTargetsText = formatRuntimeAuthTargets(data.context);
        const sessionOverridesText = formatSessionOverrides(data.sessionOverrides);
        agentValue.textContent = data.context.agentId;
        authValue.textContent = data.context.localAuthStorePath;
        runtimeAuthValue.textContent = data.context.runtimeAuthStorePath;
        runtimeAuthTargetsValue.textContent = runtimeAuthTargetsText;
        runtimeAuthTargetsValue.title = runtimeAuthTargetsText;
        sessionOverridesValue.textContent = sessionOverridesText;
        sessionOverridesValue.title = sessionOverridesText;
        codexValue.textContent = data.context.codexAuthPath;
        hermesValue.textContent = data.context.hermesAuthPath;
        configValue.textContent = data.context.configPath;
        timeValue.textContent = new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false });
        renderOrder(effectiveOrder, data.currentEffectiveOrder, data.recommendedOrder[0]);
        renderOrder(recommendedOrder, data.recommendedOrder, data.recommendedOrder[0]);
        syncAccountsViewControls();
        renderProfileCards(data);
        renderTokenRefreshStatus(data);
        renderAlerts(data);
        scheduleTokenRefresh();
        scheduleTokenReminderCheck();
        syncTabState();
        syncControlState();
      }

      async function postJson(url, payload) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(payload || {}),
            ...buildUsageProxySettings(),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "request failed");
        }
        return data;
      }

      async function loadStateData() {
        const response = await fetch(buildStateUrl());
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "load failed");
        }
        return data;
      }

      async function loadTokenExpiryData() {
        const response = await fetch(buildTokenReminderUrl());
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "load failed");
        }
        return data;
      }

      function markCodexRestartRequired(message) {
        appState.codexRestartRequired = true;
        appState.codexRestartMessage = message;
        if (appState.data) {
          renderAlerts(appState.data);
        }
      }

      async function maybeApplyIndependentCodexSwitch(data) {
        if (!isIndependentCodexAutomationMode() || !data?.codexAutoSwitchSuggested || !data?.codexRecommendedProfileId) {
          return { data, switched: false };
        }

        const nextState = await postJson("/api/switch-codex-profile", {
          profileId: data.codexRecommendedProfileId,
        });
        render(nextState);
        markCodexRestartRequired("Codex 凭据已按独立推荐更新，重启 Codex 后生效。");
        return { data: nextState, switched: true };
      }

      async function refreshTokenExpirySnapshot() {
        clearTokenReminderTimer();
        try {
          const snapshot = await loadTokenExpiryData();
          applyTokenReminderSnapshot(snapshot);
        } catch {
          renderTokenReminderStatus();
        } finally {
          scheduleTokenReminderCheck();
        }
      }

      function normalizeRefreshStateOptions(options = "额度刷新完成") {
        if (typeof options === "string") {
          return {
            okMessage: options,
            promptDuplicateCleanup: false,
          };
        }

        return {
          okMessage: typeof options?.okMessage === "string" && options.okMessage.trim()
            ? options.okMessage.trim()
            : "额度刷新完成",
          promptDuplicateCleanup: Boolean(options?.promptDuplicateCleanup),
        };
      }

      function joinStatusMessages(parts) {
        return parts.filter((part) => typeof part === "string" && part.trim()).join("，");
      }

      async function maybeCleanupDuplicatesAfterRefresh(data, options) {
        const duplicateCount = Number(data?.duplicateProfiles?.duplicateProfileCount || 0);
        if (!duplicateCount || !options.promptDuplicateCleanup) {
          return {
            data,
            message: "",
            tone: "success",
          };
        }

        const confirmed = window.confirm(
          "检测到 " + duplicateCount + " 个重复 profile。现在合并并重建运行投影吗？",
        );
        if (!confirmed) {
          return {
            data,
            message: "检测到 " + duplicateCount + " 个重复 profile，已跳过自动清理",
            tone: "warn",
          };
        }

        const result = await postJson("/api/cleanup-duplicates");
        const nextState = result.state || await loadStateData();
        render(nextState);
        const mergedCount = Array.isArray(result.actions) ? result.actions.length : duplicateCount;
        return {
          data: nextState,
          message: "检测到重复账号，已清理 " + mergedCount + " 个 profile",
          tone: "success",
        };
      }

      async function refreshState(options = "额度刷新完成") {
        const refreshOptions = normalizeRefreshStateOptions(options);
        const okMessage = refreshOptions.okMessage;
        clearQuotaRefreshTimer();
        setBusy(true, "正在刷新额度与排序...", "info");
        try {
          const data = await loadStateData();
          render(data);
          const cleanupResult = await maybeCleanupDuplicatesAfterRefresh(data, refreshOptions);
          let finalState = cleanupResult.data;
          let message = null;
          let tone = cleanupResult.tone;

          if (shouldAutoApplyRecommendedOrder(finalState)) {
            setFlash("正在自动应用推荐顺序...", "info");
            const nextState = await postJson("/api/apply-order", {
              order: finalState.recommendedOrder,
              syncCodexSelection: isSharedCodexAutomationMode(),
            });
            finalState = nextState;
            render(finalState);
            const fallbackMessage = okMessage === "额度自动刷新完成"
              ? "额度自动刷新后已应用推荐顺序"
              : "额度刷新后已应用推荐顺序";
            if (isSharedCodexAutomationMode() && nextState.applyResult?.codexSelectionUpdated) {
              markCodexRestartRequired("Codex 当前账号已同步到共享推荐，重启 Codex 后生效。");
            }
            message = getApplyResultMessage(nextState.applyResult, fallbackMessage, {
              updatedMessage: okMessage === "额度自动刷新完成"
                ? "额度自动刷新后已应用推荐顺序，Codex 当前账号已同步，重启 Codex 后生效"
                : "额度刷新后已应用推荐顺序，Codex 当前账号已同步，重启 Codex 后生效",
              skippedPrefix: fallbackMessage,
            });
          } else {
            const blockedReason = finalState?.recommendedSelectionBlockedReason;
            message = blockedReason ? okMessage + "，" + blockedReason : okMessage;
            if (blockedReason) {
              tone = "warn";
            }
          }

          const codexSwitch = await maybeApplyIndependentCodexSwitch(finalState);
          finalState = codexSwitch.data;
          if (codexSwitch.switched) {
            message = (message || okMessage) + "，Codex 已切到独立推荐账号，重启 Codex 后生效";
          }
          const finalMessage = joinStatusMessages([cleanupResult.message, message || okMessage]);
          setBusy(false, formatRefreshSuccessMessage(finalState, finalMessage), tone);
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        } finally {
          scheduleQuotaRefresh();
        }
      }

      function formatTokenRefreshOutcome(result, okMessage) {
        const checkedCount = Number.isFinite(result?.checkedCount) ? result.checkedCount : 0;
        const refreshedCount = Number.isFinite(result?.refreshedCount) ? result.refreshedCount : 0;
        const skippedTooEarlyCount = Number.isFinite(result?.skippedTooEarlyCount) ? result.skippedTooEarlyCount : 0;
        const skippedCooldownCount = Number.isFinite(result?.skippedCooldownCount) ? result.skippedCooldownCount : 0;
        const failedCount = Number.isFinite(result?.failedCount)
          ? result.failedCount
          : Array.isArray(result?.failedProfiles)
            ? result.failedProfiles.length
            : 0;

        const details = [
          "已检查 " + checkedCount + " 个账号",
          "刷新 " + refreshedCount + " 个",
        ];
        if (skippedTooEarlyCount > 0) {
          details.push(skippedTooEarlyCount + " 个未进入刷新窗口");
        }
        if (skippedCooldownCount > 0) {
          details.push(skippedCooldownCount + " 个冷却中");
        }
        if (failedCount > 0) {
          details.push(failedCount + " 个失败");
        }
        return okMessage + "：" + details.join("，");
      }

      async function refreshTokenSessions(options = {}) {
        const trigger = options.trigger === "scheduled" ? "scheduled" : "manual";
        const okMessage = typeof options.okMessage === "string" && options.okMessage.trim()
          ? options.okMessage.trim()
          : trigger === "scheduled"
            ? "Token 定时检查完成"
            : "Token 检查完成";
        clearTokenRefreshTimer();
        setBusy(true, "正在检查 Token 有效期...", "info");
        try {
          const result = await postJson("/api/keepalive/run", {
            trigger,
            intervalSeconds: trigger === "scheduled"
              ? normalizeTokenRefreshIntervalSeconds(options.intervalSeconds || appState.tokenRefreshIntervalSeconds)
              : undefined,
          });
          if (result.state) {
            render(result.state);
          } else {
            render(await loadStateData());
          }
          const failedCount = Number.isFinite(result.failedCount)
            ? result.failedCount
            : Array.isArray(result.failedProfiles)
              ? result.failedProfiles.length
              : 0;
          if (failedCount > 0) {
            setBusy(false, formatTokenRefreshOutcome(result, okMessage), "warn");
          } else if ((result?.refreshedCount || 0) > 0) {
            setBusy(false, formatTokenRefreshOutcome(result, okMessage), "success");
          } else {
            setBusy(false, formatTokenRefreshOutcome(result, okMessage), "info");
          }
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        } finally {
          scheduleTokenRefresh();
        }
      }

      function getApplyResultMessage(result, fallbackMessage, options = {}) {
        if (!result || !result.codexSelectionAttempted) {
          return fallbackMessage;
        }
        if (result.codexSelectionUpdated) {
          return options.updatedMessage || "推荐顺序已应用，Codex 当前账号已同步";
        }
        const suffix = result.codexSelectionSkippedReason ? "，但 Codex 未同步：" + result.codexSelectionSkippedReason : "";
        return (options.skippedPrefix || fallbackMessage) + suffix;
      }

      function formatUsageRefreshMetrics(metrics) {
        if (!metrics || !Number.isFinite(metrics.durationMs)) {
          return "";
        }

        const seconds = (metrics.durationMs / 1000).toFixed(metrics.durationMs >= 10_000 ? 0 : 1);
        const parts = [seconds + "s"];
        if (Number.isFinite(metrics.remoteFetchCount)) {
          parts.push("远端 " + metrics.remoteFetchCount);
        }
        if (Number.isFinite(metrics.cacheHitCount)) {
          parts.push("缓存 " + metrics.cacheHitCount);
        }
        return parts.length > 0 ? "（" + parts.join(" / ") + "）" : "";
      }

      function formatRefreshSuccessMessage(data, message) {
        const suffix = formatUsageRefreshMetrics(data?.usageRefreshMetrics);
        return suffix ? message + suffix : message;
      }

      async function applyCustomOrder(order) {
        setBusy(true, "正在写入顺序...", "info");
        try {
          const data = await postJson("/api/apply-order", { order });
          render(data);
          setBusy(false, "顺序已更新，OpenClaw 与 Hermes 投影已刷新", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function applyRecommendedOrder() {
        if (!appState.data?.recommendedOrder?.length || !appState.data?.recommendedSelectionProfileId) {
          setFlash(appState.data?.recommendedSelectionBlockedReason || "当前没有可应用的推荐顺序。", "warn");
          return;
        }
        setBusy(true, "正在应用推荐顺序...", "info");
        try {
          let data = await postJson("/api/apply-order", {
            order: appState.data.recommendedOrder,
            syncCodexSelection: isSharedCodexAutomationMode(),
          });
          const applyResult = data.applyResult;
          render(data);
          if (isSharedCodexAutomationMode() && applyResult?.codexSelectionUpdated) {
            markCodexRestartRequired("Codex 当前账号已同步到共享推荐，重启 Codex 后生效。");
          }
          const codexSwitch = await maybeApplyIndependentCodexSwitch(data);
          data = codexSwitch.data;
          let message = getApplyResultMessage(applyResult, "推荐顺序已应用", {
            updatedMessage: "推荐顺序已应用，Codex 当前账号已同步，重启 Codex 后生效",
            skippedPrefix: "推荐顺序已应用",
          });
          if (codexSwitch.switched) {
            message += "，Codex 已切到独立推荐账号，重启 Codex 后生效";
          }
          setBusy(false, message, "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function syncConfig() {
        setBusy(true, "正在补齐缺失配置...", "info");
        try {
          const data = await postJson("/api/sync-config");
          render(data);
          setBusy(false, "缺失配置已补齐", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      function downloadJsonFile(fileName, value) {
        const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      function readTextFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("读取文件失败"));
          reader.readAsText(file);
        });
      }

      async function bootstrapLocalStore() {
        setBusy(true, "正在初始化本地号池...", "info");
        try {
          const data = await postJson("/api/bootstrap-local-store");
          render(data);
          setBusy(false, "本地号池已初始化", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function rebuildRuntimeFiles() {
        setBusy(true, "正在重建 OpenClaw、Hermes 与兼容的 Codex 运行投影...", "info");
        try {
          const data = await postJson("/api/rebuild-runtime");
          render(data);
          setBusy(false, "运行投影已按本地号池重建", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function cleanupDuplicateProfiles() {
        const duplicateCount = Number(appState.data?.duplicateProfiles?.duplicateProfileCount || 0);
        if (!duplicateCount) {
          setFlash("当前没有可清理的重复账号。", "ok");
          return;
        }

        if (!window.confirm("将清理 " + duplicateCount + " 个重复 profile，并重建运行投影。确认继续？")) {
          setFlash("已取消清理重复账号。", "warn");
          return;
        }

        setBusy(true, "正在清理重复账号并重建运行投影...", "info");
        try {
          const result = await postJson("/api/cleanup-duplicates");
          if (result.state) {
            render(result.state);
          }
          const mergedCount = Array.isArray(result.actions) ? result.actions.length : duplicateCount;
          setBusy(false, "重复账号已清理，合并 " + mergedCount + " 个 profile", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function absorbOpenClawRuntime() {
        setBusy(true, "正在吸收 OpenClaw runtime...", "info");
        try {
          const data = await postJson("/api/absorb-openclaw-runtime");
          render(data);
          setBusy(false, "OpenClaw runtime 已吸收到本地号池", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function exportBundleData() {
        const passphrase = window.prompt("输入导出口令。这个口令不会保存在本地，只用于加密导出包。", "");
        if (passphrase == null) {
          return;
        }

        setBusy(true, "正在导出加密号池...", "info");
        try {
          const data = await postJson("/api/export-bundle", { passphrase });
          downloadJsonFile(data.fileName || "codex-auth-bundle.json", data.bundle);
          if (data.state) {
            render(data.state);
          }
          setBusy(false, "加密号池已导出", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function importBundleData(file) {
        const bundle = await readTextFile(file);
        const passphrase = window.prompt("输入导入包口令。", "");
        if (passphrase == null) {
          return;
        }

        setBusy(true, "正在预览导入结果...", "info");
        try {
          const previewResponse = await postJson("/api/import-bundle/preview", { bundle, passphrase });
          if (previewResponse.state) {
            render(previewResponse.state);
          }

          const summary = previewResponse.preview?.summary || {};
          const actions = Array.isArray(previewResponse.preview?.actions) ? previewResponse.preview.actions : [];
          const lines = [
            "将导入 " + String(summary.total || 0) + " 个账号动作",
            "新增: " + String(summary.add || 0),
            "更新: " + String(summary.update || 0),
            "改名导入: " + String(summary["renamed-import"] || 0),
            "清理重复: " + String(summary["cleanup-duplicate"] || 0),
            "跳过: " + String(summary.skip || 0),
          ];
          actions.slice(0, 12).forEach((action) => {
            lines.push(action.type + ": " + action.sourceProfileId + " -> " + action.targetProfileId);
          });
          if (actions.length > 12) {
            lines.push("… 其余 " + String(actions.length - 12) + " 项请按汇总理解");
          }

          if (!window.confirm(lines.join("\n") + "\n\n确认执行导入？")) {
            setBusy(false, "已取消导入", "warn");
            return;
          }

          setBusy(true, "正在导入加密号池...", "info");
          const data = await postJson("/api/import-bundle/commit", { bundle, passphrase });
          render(data);
          setBusy(false, "号池导入完成", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        } finally {
          importBundleInput.value = "";
        }
      }

      async function switchCurrentProfile(row) {
        setBusy(true, "正在切换当前账号并刷新运行投影...", "info");
        try {
          const data = await postJson("/api/switch-profile", { profileId: row.profileId });
          render(data);
          const targets = ["OpenClaw"];
          if (row.hermesCompatible) {
            targets.push("Hermes");
          }
          if (row.codexCompatible) {
            targets.push("Codex");
            markCodexRestartRequired("Codex 当前账号已同步到当前选择，重启 Codex 后生效。");
          }
          setBusy(
            false,
            row.codexCompatible
              ? targets.join("、") + " 当前账号已更新，重启 Codex 后生效"
              : targets.join("、") + " 当前账号已更新",
            "success",
          );
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function switchCodexOnly(row) {
        setBusy(true, "正在切换 Codex 当前账号...", "info");
        try {
          const data = await postJson("/api/switch-codex-profile", { profileId: row.profileId });
          render(data);
          markCodexRestartRequired("Codex 当前账号已单独切换，重启 Codex 后生效。");
          setBusy(false, "Codex 当前账号已切换，重启 Codex 后生效", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function linkCurrentCodex(row) {
        setBusy(true, "正在吸收当前 Codex 凭据...", "info");
        try {
          const data = await postJson("/api/link-current-codex", { profileId: row.profileId });
          render(data);
          setBusy(false, "当前 Codex 凭据已吸收", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      function maybeNavigatePopup(url) {
        if (!url || !appState.popup || appState.popup.closed) return;
        try {
          if (appState.popup.location.href === "about:blank") {
            appState.popup.location = url;
          }
        } catch {
          // Ignore cross-origin popup access errors while OAuth is in progress.
        }
      }

      function renderLoginTask(task, force = false) {
        appState.loginTask = task;
        const nextKey = buildLoginTaskRenderKey(task);
        if (!force && nextKey === appState.loginTaskRenderKey) {
          return;
        }
        appState.loginTaskRenderKey = nextKey;
        renderAlerts(appState.data);
      }

      async function submitManualCodeEntry() {
        if (!appState.loginTaskId) {
          return;
        }

        const taskId = appState.loginTaskId;
        const code = appState.manualCodeDraft.trim();
        if (!code) {
          appState.manualCodeError = "请粘贴 localhost 回调链接或授权 code。";
          renderLoginTask(appState.loginTask, true);
          return;
        }

        appState.manualCodeSubmitting = true;
        appState.manualCodeError = "";
        renderLoginTask(appState.loginTask, true);

        try {
          const task = await postJson("/api/login/manual-code", { taskId, code });
          appState.manualCodeDraft = "";
          appState.manualCodeSubmitting = false;
          renderLoginTask(task, true);
          setFlash(
            task.manualEntryRequired ? "手动回调已提交，正在继续登录..." : "手动回调已保存，自动回调失败时会自动使用。",
            "info",
          );
        } catch (error) {
          appState.manualCodeSubmitting = false;
          appState.manualCodeError = String(error instanceof Error ? error.message : error);
          renderLoginTask(appState.loginTask, true);
        }
      }

      async function pollLogin(taskId) {
        appState.loginTaskId = taskId;
        syncControlState();
        try {
          while (appState.loginTaskId === taskId) {
            const response = await fetch("/api/login-status?taskId=" + encodeURIComponent(taskId));
            const task = await response.json();
            if (!response.ok) {
              renderLoginTask({ profileId: "-", status: "failed", error: task.error || "login status failed" });
              appState.loginTaskId = null;
              syncControlState();
              return;
            }

            renderLoginTask(task);
            maybeNavigatePopup(task.authUrl);

            if (task.status === "completed") {
              appState.loginTaskId = null;
              appState.loginTask = task;
              appState.manualCodeDraft = "";
              appState.manualCodeError = "";
              appState.manualCodeSubmitting = false;
              if (appState.popup && !appState.popup.closed) {
                appState.popup.close();
              }
              appState.popup = null;
              syncControlState();
              renderLoginTask(task);
              await refreshState(appState.loginCompletionMessage || "新增账号完成");
              return;
            }

            if (task.status === "failed") {
              appState.loginTaskId = null;
              appState.manualCodeError = "";
              appState.manualCodeSubmitting = false;
              if (appState.popup && !appState.popup.closed) {
                appState.popup.close();
              }
              appState.popup = null;
              syncControlState();
              setBusy(false, task.error || "OAuth 登录失败", "danger");
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          appState.loginTaskId = null;
          appState.manualCodeSubmitting = false;
          syncControlState();
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function startLogin(profileId, intent, messages) {
        if (appState.loginTaskId) {
          throw new Error("当前已有一个 OAuth 登录流程在进行中，请先完成它。");
        }

        if (appState.popup && !appState.popup.closed) {
          appState.popup.close();
        }
        appState.popup = window.open("about:blank", "_blank");
        appState.manualCodeDraft = "";
        appState.manualCodeError = "";
        appState.manualCodeSubmitting = false;
        appState.loginTaskRenderKey = "";
        appState.loginCompletionMessage = messages.success;
        setBusy(true, messages.start, "info");

        try {
          const task = await postJson("/api/login/start", { profileId, intent });
          appState.loginTaskId = task.taskId;
          appState.loginTask = task;
          syncControlState();
          renderLoginTask(task);
          maybeNavigatePopup(task.authUrl);
          setBusy(false, messages.waiting, "info");
          void pollLogin(task.taskId);
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function addAccount() {
        if (appState.loginTaskId) {
          setAddModalError("当前已有一个 OAuth 登录流程在进行中，请先完成它。");
          return;
        }

        const profileId = buildProfileIdFromSuffix(addProfileSuffixInput.value);
        if (!profileId) {
          setAddModalError("请至少填写一个账号后缀。");
          addProfileSuffixInput.focus();
          return;
        }

        closeAddAccountModal();
        await startLogin(profileId, "create", {
          start: "正在启动 OAuth 登录...",
          waiting: "等待完成 OAuth 登录...",
          success: "新增账号完成",
        });
      }

      async function upgradeProfile(row) {
        try {
          await startLogin(row.profileId, "upgrade", {
            start: "正在启动账号升级...",
            waiting: "等待完成账号升级...",
            success: "账号升级完成",
          });
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function submitManageModal() {
        if (!appState.manageRow || !appState.manageMode) {
          closeManageModal();
          return;
        }

        if (appState.manageMode === "rename") {
          const nextProfileId = renameProfileIdInput.value.trim();
          if (!nextProfileId) {
            setManageModalError("新的账号名称不能为空。");
            renameProfileIdInput.focus();
            return;
          }
          if (nextProfileId === appState.manageRow.profileId) {
            setManageModalError("新的账号名称不能和当前值相同。");
            renameProfileIdInput.focus();
            return;
          }

          closeManageModal();
          setBusy(true, "正在重命名账号...", "info");
          try {
            const nextState = await postJson("/api/rename-profile", {
              profileId: appState.manageRow.profileId,
              nextProfileId,
            });
            render(nextState);
            setBusy(false, "重命名完成", "success");
          } catch (error) {
            setBusy(false, String(error instanceof Error ? error.message : error), "danger");
          }
          return;
        }

        if (appState.manageMode === "delete") {
          const profileIds = (appState.manageRows || [])
            .map((row) => row?.profileId)
            .filter((profileId) => typeof profileId === "string" && profileId);
          const isBatchDelete = profileIds.length > 1;
          const profileId = profileIds[0];
          closeManageModal();
          setBusy(true, isBatchDelete ? "正在删除所选账号..." : "正在删除账号...", "info");
          try {
            const nextState = isBatchDelete
              ? await postJson("/api/delete-profiles", { profileIds })
              : await postJson("/api/delete-profile", { profileId });
            if (isBatchDelete) {
              setSelectedProfiles(getSelectedProfileIds().filter((entry) => !profileIds.includes(entry)));
            }
            render(nextState);
            setBusy(false, isBatchDelete ? "所选账号已删除" : "账号已删除", "success");
          } catch (error) {
            setBusy(false, String(error instanceof Error ? error.message : error), "danger");
          }
        }
      }

      quotaRefreshIntervalInput.addEventListener("change", () => {
        const nextInterval = Math.max(0, Math.floor(Number(quotaRefreshIntervalInput.value) || 0));
        appState.quotaRefreshIntervalSeconds = nextInterval;
        syncAutomationControls();
        persistAutomationSettings();
        scheduleQuotaRefresh();
        setFlash(nextInterval > 0 ? "已设置每 " + nextInterval + " 秒自动刷新额度" : "已关闭额度自动刷新", "info");
      });

      tokenRefreshIntervalInput.addEventListener("change", () => {
        const nextInterval = normalizeTokenRefreshIntervalSeconds(tokenRefreshIntervalInput.value);
        appState.tokenRefreshIntervalSeconds = nextInterval;
        syncAutomationControls();
        persistAutomationSettings();
        scheduleTokenRefresh();
        setFlash(nextInterval > 0 ? "已设置每 " + nextInterval + " 秒定时检查 Token" : "已关闭 Token 定时刷新", "info");
      });

      tokenReminderEnabledToggle.addEventListener("change", () => {
        appState.tokenReminderEnabled = tokenReminderEnabledToggle.checked;
        if (!appState.tokenReminderEnabled) {
          appState.tokenReminderPendingModalProfiles = [];
          closeTokenReminderModal();
        } else if (appState.data?.localStore?.exists) {
          void refreshTokenExpirySnapshot();
        }
        renderAlerts(appState.data);
        renderOverviewStats(appState.data);
        syncAutomationControls();
        persistAutomationSettings();
        scheduleTokenReminderCheck();
        setFlash(appState.tokenReminderEnabled ? "已开启 Token 到期提醒" : "已关闭 Token 到期提醒", "info");
      });

      tokenReminderIntervalInput.addEventListener("change", () => {
        const nextInterval = Math.max(1, Math.floor(Number(tokenReminderIntervalInput.value) || 30));
        appState.tokenReminderCheckIntervalMinutes = nextInterval;
        syncAutomationControls();
        persistAutomationSettings();
        scheduleTokenReminderCheck();
        setFlash("已设置每 " + nextInterval + " 分钟检查一次 Token 到期时间", "info");
      });

      tokenReminderWarnDaysInput.addEventListener("change", () => {
        const nextDays = Math.max(0, Math.floor(Number(tokenReminderWarnDaysInput.value) || 0));
        appState.tokenReminderWarnDays = nextDays;
        applyTokenReminderSnapshot(appState.tokenReminderSnapshot);
        persistAutomationSettings();
        setFlash("已设置在到期前 " + nextDays + " 天开始页内提醒", "info");
      });

      tokenReminderModalHoursInput.addEventListener("change", () => {
        const nextHours = Math.max(0, Math.floor(Number(tokenReminderModalHoursInput.value) || 0));
        appState.tokenReminderModalHours = nextHours;
        applyTokenReminderSnapshot(appState.tokenReminderSnapshot);
        persistAutomationSettings();
        setFlash("已设置在到期前 " + nextHours + " 小时弹出紧急提醒", "info");
      });

      autoApplyToggle.addEventListener("change", () => {
        appState.autoApplyRecommended = autoApplyToggle.checked;
        persistAutomationSettings();
        setFlash(
          appState.autoApplyRecommended ? "已开启额度刷新后自动应用推荐顺序" : "已关闭额度刷新后自动应用推荐顺序",
          "info",
        );
      });

      codexAutomationModeInputs.forEach((input) => {
        input.addEventListener("change", () => {
          if (!input.checked) {
            return;
          }
          appState.codexAutomationMode = input.value;
          persistAutomationSettings();
          const label = input.value === "shared"
            ? "Codex 已切换到共享模式"
            : input.value === "independent-low-quota"
              ? "Codex 已切换到独立避让模式"
              : "Codex 已切换到仅手动模式";
          renderAlerts(appState.data);
          setFlash(label, "info");
        });
      });

      usageProxyUrlInput.addEventListener("change", () => {
        appState.usageProxyUrl = usageProxyUrlInput.value.trim();
        syncAutomationControls();
        persistAutomationSettings();
        setFlash(
          appState.usageProxyUrl ? "已更新额度请求代理 URL" : "已清空额度请求代理 URL，将回退到环境变量代理",
          "info",
        );
      });

      usageProxyToggle.addEventListener("change", () => {
        appState.usageProxyEnabled = usageProxyToggle.checked;
        persistAutomationSettings();
        setFlash(appState.usageProxyEnabled ? "已开启额度请求代理" : "已关闭额度请求代理", "info");
      });

      // ===== Cloud sync settings (D1) =====
      const storeModeOfflineRadio = document.getElementById("storeModeOffline");
      const storeModeCloudRadio = document.getElementById("storeModeCloud");
      const cloudSyncFields = document.getElementById("cloudSyncFields");
      const cloudAccountIdInput = document.getElementById("cloudAccountIdInput");
      const cloudDatabaseIdInput = document.getElementById("cloudDatabaseIdInput");
      const cloudAccountIdStatus = document.getElementById("cloudAccountIdStatus");
      const cloudDatabaseIdStatus = document.getElementById("cloudDatabaseIdStatus");
      const cloudApiTokenInput = document.getElementById("cloudApiTokenInput");
      const cloudApiTokenStatus = document.getElementById("cloudApiTokenStatus");
      const cloudPassphraseInput = document.getElementById("cloudPassphraseInput");
      const cloudPassphraseStatus = document.getElementById("cloudPassphraseStatus");
      const cloudDeviceIdValue = document.getElementById("cloudDeviceIdValue");
      const cloudHealthValue = document.getElementById("cloudHealthValue");
      const cloudSyncErrorValue = document.getElementById("cloudSyncErrorValue");
      const cloudConfigSaveButton = document.getElementById("cloudConfigSaveButton");
      const cloudHealthCheckButton = document.getElementById("cloudHealthCheckButton");
      const cloudBootstrapButton = document.getElementById("cloudBootstrapButton");
      const cloudPullButton = document.getElementById("cloudPullButton");
      const cloudConfigStatus = document.getElementById("cloudConfigStatus");

      function setCloudStatus(text, tone) {
        if (!cloudConfigStatus) return;
        cloudConfigStatus.textContent = text || "-";
        cloudConfigStatus.dataset.tone = tone || "";
      }

      function applyCloudConfigSnapshot(config) {
        if (!config) return;
        const mode = config.storeMode === "cloud" ? "cloud" : "offline";
        if (storeModeOfflineRadio) storeModeOfflineRadio.checked = mode === "offline";
        if (storeModeCloudRadio) storeModeCloudRadio.checked = mode === "cloud";
        if (cloudSyncFields) cloudSyncFields.hidden = mode !== "cloud";
        const d1 = config.d1 || {};
        if (cloudAccountIdInput) cloudAccountIdInput.value = "";
        if (cloudDatabaseIdInput) cloudDatabaseIdInput.value = "";
        if (cloudAccountIdStatus) {
          cloudAccountIdStatus.textContent = d1.hasAccountId
            ? "已配置（前端不回显；需要更换时重新填入）。"
            : "通过 wrangler whoami 可以看到。";
        }
        if (cloudDatabaseIdStatus) {
          cloudDatabaseIdStatus.textContent = d1.hasDatabaseId
            ? "已配置（前端不回显；需要更换时重新填入）。"
            : "运行 wrangler d1 create codex-auth-dashboard 时会打印。";
        }
        if (cloudApiTokenInput) cloudApiTokenInput.value = "";
        if (cloudApiTokenStatus) {
          cloudApiTokenStatus.textContent = d1.hasApiToken
            ? "已配置（保存后后端不回显，需要更换则重新填入）。"
            : "未配置。需要 D1 Edit 权限。";
        }
        if (cloudPassphraseInput) cloudPassphraseInput.value = "";
        if (cloudPassphraseStatus) {
          cloudPassphraseStatus.textContent = config.hasPassphrase
            ? "已设置；credential blob 使用 AES-256-GCM + scrypt 加密存储。"
            : "设置后 credential blob 使用 AES-256-GCM + scrypt 加密。当前 D1 中存明文。";
        }
        if (cloudDeviceIdValue) cloudDeviceIdValue.textContent = config.deviceId || "-";
        if (cloudSyncErrorValue) {
          cloudSyncErrorValue.textContent = config.lastCloudSyncError
            ? "" + (config.lastCloudSyncError.at || "") + " · " + (config.lastCloudSyncError.error || "")
            : "-";
        }
      }

      async function loadCloudConfig() {
        try {
          const response = await fetch("/api/config/store", { cache: "no-store" });
          if (!response.ok) {
            throw new Error("HTTP " + response.status);
          }
          const json = await response.json();
          applyCloudConfigSnapshot(json);
        } catch (error) {
          setCloudStatus("读取存储配置失败: " + (error instanceof Error ? error.message : String(error)), "error");
        }
      }

      async function saveCloudConfig() {
        if (!storeModeOfflineRadio || !storeModeCloudRadio) return;
        const storeMode = storeModeCloudRadio.checked ? "cloud" : "offline";
        const payload = {
          storeMode,
          d1: {
            // Only send apiToken when the user typed something; empty means "keep existing".
          },
        };
        if (cloudAccountIdInput && cloudAccountIdInput.value.trim()) {
          payload.d1.accountId = cloudAccountIdInput.value.trim();
        }
        if (cloudDatabaseIdInput && cloudDatabaseIdInput.value.trim()) {
          payload.d1.databaseId = cloudDatabaseIdInput.value.trim();
        }
        if (cloudApiTokenInput && cloudApiTokenInput.value.trim()) {
          payload.d1.apiToken = cloudApiTokenInput.value.trim();
        }
        if (cloudPassphraseInput && cloudPassphraseInput.value.length > 0) {
          payload.storePassphrase = cloudPassphraseInput.value;
        }

        try {
          const response = await fetch("/api/config/store", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await response.json();
          if (!response.ok) {
            throw new Error(json.error || ("HTTP " + response.status));
          }
          applyCloudConfigSnapshot(json);
          setCloudStatus(storeMode === "cloud" ? "已保存云端配置" : "已切换为离线模式", "success");
          setFlash(storeMode === "cloud" ? "已开启云端同步" : "已切换为离线模式", "info");
        } catch (error) {
          setCloudStatus("保存失败: " + (error instanceof Error ? error.message : String(error)), "error");
        }
      }

      async function checkCloudHealth() {
        if (!cloudHealthValue) return;
        cloudHealthValue.textContent = "检测中…";
        try {
          const response = await fetch("/api/d1/health", { cache: "no-store" });
          const json = await response.json();
          if (json.ok) {
            cloudHealthValue.textContent = "✓ 连通" + (json.schemaVersion != null ? "，schema v" + json.schemaVersion : "");
            setCloudStatus("D1 连通正常", "success");
          } else {
            cloudHealthValue.textContent = "✗ " + (json.reason || "不可用");
            setCloudStatus("D1 不可用: " + (json.reason || "unknown"), "error");
          }
        } catch (error) {
          cloudHealthValue.textContent = "✗ 检测失败";
          setCloudStatus("检测失败: " + (error instanceof Error ? error.message : String(error)), "error");
        }
      }

      async function bootstrapCloud() {
        const confirmMessage = [
          "即将用本机快照强制覆盖 D1：",
          "· D1 上所有 profile / order / lastGood / usageStats / maintenance 会先被删光，然后写入本地当前的内容。",
          "· 其它设备在本机上次同步后推到 D1 的改动会被覆盖掉。",
          "",
          "仅在你确定本机的快照才是可信的一份时使用。继续吗？",
        ].join("\n");
        if (!window.confirm(confirmMessage)) {
          setCloudStatus("已取消强制覆盖", "info");
          return;
        }
        try {
          setCloudStatus("正在用本地快照强制覆盖 D1…", "info");
          const response = await fetch("/api/d1/bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
          applyCloudConfigSnapshot(json.config);
          setCloudStatus("已用本地快照强制覆盖 D1 · " + (json.statementCount || 0) + " 条 SQL", "success");
        } catch (error) {
          setCloudStatus("强制覆盖失败: " + (error instanceof Error ? error.message : String(error)), "error");
        }
      }

      async function pullCloud() {
        const confirmMessage = [
          "即将把 D1 snapshot 合并回本地：",
          "· profile 会按“expires 更晚的一边赢”合并，D1 上的新账号也会并入本机。",
          "· 本机的 order / lastGood / usageStats / maintenance 默认保留，不会因为这次拉取被 D1 硬覆盖。",
          "· 这次操作只更新本机，不会把本地内容反向回写到 D1。",
          "",
          "继续吗？",
        ].join("\n");
        if (!window.confirm(confirmMessage)) {
          setCloudStatus("已取消合并", "info");
          return;
        }
        try {
          setCloudStatus("正在从 D1 合并到本地…", "info");
          const response = await fetch("/api/d1/pull", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
          applyCloudConfigSnapshot(json.config);
          setCloudStatus("已从 D1 合并 " + (json.pulledProfileCount || 0) + " 条 profile；本地 order/meta 已保留。", "success");
          void refreshState();
        } catch (error) {
          setCloudStatus("合并失败: " + (error instanceof Error ? error.message : String(error)), "error");
        }
      }

      function handleStoreModeChange() {
        const cloud = storeModeCloudRadio && storeModeCloudRadio.checked;
        if (cloudSyncFields) cloudSyncFields.hidden = !cloud;
        setCloudStatus(cloud ? "填完 Cloudflare Account ID / Database ID / API Token 后点保存" : "切回离线模式后点保存即可生效", "info");
      }

      if (storeModeOfflineRadio) storeModeOfflineRadio.addEventListener("change", handleStoreModeChange);
      if (storeModeCloudRadio) storeModeCloudRadio.addEventListener("change", handleStoreModeChange);
      if (cloudConfigSaveButton) cloudConfigSaveButton.addEventListener("click", () => { void saveCloudConfig(); });
      if (cloudHealthCheckButton) cloudHealthCheckButton.addEventListener("click", () => { void checkCloudHealth(); });
      if (cloudBootstrapButton) cloudBootstrapButton.addEventListener("click", () => { void bootstrapCloud(); });
      if (cloudPullButton) cloudPullButton.addEventListener("click", () => { void pullCloud(); });

      void loadCloudConfig();

      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          setActiveTab(button.dataset.tab || "accounts");
        });
      });

      accountsSelectAllButton.addEventListener("click", () => {
        setSelectedProfiles(getSelectableProfileIds());
        renderProfileCards(appState.data || { rows: [] });
        syncControlState();
      });

      accountsClearSelectionButton.addEventListener("click", () => {
        setSelectedProfiles([]);
        renderProfileCards(appState.data || { rows: [] });
        syncControlState();
      });

      accountsDeleteSelectedButton.addEventListener("click", () => {
        const rowsByProfileId = getRowsByProfileId();
        const rows = getSelectedProfileIds()
          .map((profileId) => rowsByProfileId.get(profileId))
          .filter(Boolean);
        if (!rows.length) {
          return;
        }
        openDeleteModal(rows);
      });

      addProfileSuffixInput.addEventListener("input", () => {
        renderAddAccountPreview();
        if (!addModalError.hidden) {
          setAddModalError("");
        }
      });

      addModal.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.modalClose === "true") {
          closeAddAccountModal();
        }
      });

      manageModal.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.manageModalClose === "true") {
          closeManageModal();
        }
      });

      tokenReminderModal.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.tokenReminderModalClose === "true") {
          closeTokenReminderModal();
        }
      });

      addModalCloseButton.addEventListener("click", closeAddAccountModal);
      addModalCancelButton.addEventListener("click", closeAddAccountModal);
      manageModalCloseButton.addEventListener("click", closeManageModal);
      manageModalCancelButton.addEventListener("click", closeManageModal);
      tokenReminderModalCloseButton.addEventListener("click", closeTokenReminderModal);
      tokenReminderModalDismissButton.addEventListener("click", closeTokenReminderModal);
      tokenReminderModalFocusButton.addEventListener("click", () => {
        closeTokenReminderModal();
        setActiveTab("token-refresh");
      });

      addModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void addAccount();
      });

      manageModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void submitManageModal();
      });

      toolsMenu.addEventListener("toggle", () => {
        if (!toolsMenu.open) {
          return;
        }
        closeFloatingMenus(toolsMenu);
        window.requestAnimationFrame(() => {
          positionFloatingMenu(toolsMenu, toolsMenuPanel);
        });
      });

      toolsMenuButton.addEventListener("click", (event) => {
        if (toolsMenu.classList.contains("is-disabled")) {
          event.preventDefault();
        }
      });

      document.querySelectorAll("[data-toolbar-action]").forEach((node) => {
        bindToolbarActionHints(node);
      });

      document.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".profile-menu, .toolbar-menu")) {
          return;
        }
        closeFloatingMenus();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeFloatingMenus();
        if (!manageModal.hidden) {
          closeManageModal();
          return;
        }
        if (!tokenReminderModal.hidden) {
          closeTokenReminderModal();
          return;
        }
        if (!addModal.hidden) {
          closeAddAccountModal();
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden || !appState.tokenReminderEnabled || !appState.data?.localStore?.exists) {
          return;
        }
        if (appState.tokenReminderPendingModalProfiles.length > 0) {
          presentTokenReminderModal(appState.tokenReminderPendingModalProfiles);
          return;
        }
        void refreshTokenExpirySnapshot();
      });

      refreshButton.addEventListener("click", () => {
        void refreshState({ promptDuplicateCleanup: true });
      });
      tokenRefreshButton.addEventListener("click", () => {
        void refreshTokenSessions({ trigger: "manual", okMessage: "Token 检查完成" });
      });
      applyButton.addEventListener("click", () => {
        void applyRecommendedOrder();
      });
      bootstrapButton.addEventListener("click", () => {
        void bootstrapLocalStore();
      });
      importPrimaryButton.addEventListener("click", () => {
        importBundleInput.click();
      });
      syncButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        void syncConfig();
      });
      rebuildRuntimeButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        void rebuildRuntimeFiles();
      });
      cleanupDuplicatesButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        void cleanupDuplicateProfiles();
      });
      absorbRuntimeButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        void absorbOpenClawRuntime();
      });
      exportButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        void exportBundleData();
      });
      importButton.addEventListener("click", () => {
        toolsMenu.removeAttribute("open");
        importBundleInput.click();
      });
      addButton.addEventListener("click", openAddAccountModal);
      accountsViewQuotaButton.addEventListener("click", () => {
        setAccountsView("quota");
      });
      accountsViewGroupedButton.addEventListener("click", () => {
        setAccountsView("grouped");
      });
      importBundleInput.addEventListener("change", (event) => {
        const file = event.target instanceof HTMLInputElement ? event.target.files?.[0] : null;
        if (file) {
          void importBundleData(file);
        }
      });

      loadAutomationSettings();
      updateToolbarHelp(appState.toolbarActionKey);
      syncTabState();
      refreshState();
      setInterval(updateCountdowns, 1000);
    </script>
  </body>
</html>`;
}
