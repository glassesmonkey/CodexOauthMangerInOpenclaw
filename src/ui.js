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
        --bg: #f6f0e6;
        --bg-deep: #ede1d0;
        --surface: rgba(255, 251, 245, 0.88);
        --surface-strong: rgba(255, 252, 248, 0.96);
        --surface-muted: rgba(255, 247, 239, 0.76);
        --line: rgba(67, 52, 38, 0.12);
        --line-strong: rgba(67, 52, 38, 0.2);
        --text: #241d18;
        --muted: #6d6259;
        --accent: #0f6d59;
        --accent-strong: #133f37;
        --accent-2: #b9643a;
        --accent-2-soft: rgba(185, 100, 58, 0.12);
        --ok: #1d6b4a;
        --warn: #9b6216;
        --danger: #a13633;
        --info: #385f8d;
        --shadow-soft: 0 22px 60px rgba(66, 46, 27, 0.12);
        --shadow-card: 0 24px 80px rgba(49, 36, 23, 0.12);
        --radius-xl: 28px;
        --radius-lg: 22px;
        --radius-md: 16px;
        --radius-sm: 12px;
        --mono: "SFMono-Regular", "JetBrains Mono", ui-monospace, monospace;
        --display: "Palatino Linotype", "Book Antiqua", "Source Han Serif SC", "Noto Serif SC", serif;
        --sans: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      }

      * { box-sizing: border-box; }

      html {
        background:
          radial-gradient(circle at top left, rgba(15, 109, 89, 0.16), transparent 34%),
          radial-gradient(circle at top right, rgba(185, 100, 58, 0.18), transparent 28%),
          linear-gradient(180deg, #fbf7f0 0%, var(--bg) 48%, var(--bg-deep) 100%);
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: var(--sans);
        background:
          radial-gradient(circle at 15% 20%, rgba(255, 220, 183, 0.3), transparent 24%),
          radial-gradient(circle at 85% 18%, rgba(76, 130, 111, 0.22), transparent 22%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0));
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(120deg, rgba(255, 255, 255, 0.14), transparent 26%),
          repeating-linear-gradient(
            90deg,
            rgba(67, 52, 38, 0.022) 0,
            rgba(67, 52, 38, 0.022) 1px,
            transparent 1px,
            transparent 72px
          );
        mix-blend-mode: multiply;
        opacity: 0.7;
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
        box-shadow: 0 0 0 3px rgba(15, 109, 89, 0.16);
      }

      .shell {
        position: relative;
        z-index: 1;
        max-width: 1480px;
        margin: 0 auto;
        padding: 28px 18px 44px;
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
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 28%);
      }

      .section-kicker {
        margin: 0 0 10px;
        font-size: 0.74rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      .masthead {
        padding: 26px;
        animation: rise 420ms ease;
      }

      .masthead-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
      }

      .brand-panel {
        display: grid;
        gap: 18px;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 104px;
        height: 104px;
        padding: 7px;
        border-radius: 30px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 248, 240, 0.72));
        border: 1px solid rgba(67, 52, 38, 0.08);
        box-shadow: 0 18px 44px rgba(84, 60, 36, 0.16);
      }

      .brand-symbol-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .eyebrow {
        margin: 0 0 10px;
        font-size: 0.82rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      h1,
      h2,
      h3 {
        margin: 0;
        font-family: var(--display);
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      h1 {
        font-size: clamp(2.4rem, 4.8vw, 4.2rem);
        line-height: 0.98;
      }

      h2 {
        font-size: clamp(1.45rem, 2.1vw, 2rem);
        line-height: 1.08;
      }

      .lede {
        max-width: 760px;
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.7;
      }

      .hero-note {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-top: 14px;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.74);
        color: var(--muted);
        font-size: 0.84rem;
      }

      .hero-note strong {
        color: var(--text);
      }

      .masthead-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
        align-content: start;
      }

      .button-primary,
      .button-secondary,
      .button-ghost,
      .button-danger {
        min-height: 44px;
        padding: 11px 16px;
        border-radius: 999px;
        transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease, background 140ms ease;
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
        color: #fff;
        background: linear-gradient(135deg, var(--accent-strong), var(--accent));
        box-shadow: 0 12px 28px rgba(15, 109, 89, 0.24);
      }

      .button-secondary {
        color: var(--text);
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid var(--line);
      }

      .button-ghost {
        color: var(--accent-strong);
        background: rgba(15, 109, 89, 0.08);
        border: 1px solid rgba(15, 109, 89, 0.12);
      }

      .button-danger {
        color: #fff;
        background: linear-gradient(135deg, #842622, var(--danger));
        box-shadow: 0 12px 24px rgba(161, 54, 51, 0.22);
      }

      .summary-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1.25fr) minmax(240px, 0.7fr) minmax(260px, 0.85fr);
        margin-top: 24px;
      }

      .summary-card,
      .spotlight-card {
        position: relative;
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: var(--surface-strong);
        box-shadow: var(--shadow-soft);
      }

      .spotlight-card {
        background:
          radial-gradient(circle at top right, rgba(255, 214, 170, 0.3), transparent 34%),
          linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(255, 247, 238, 0.92));
      }

      .spotlight-head {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: start;
      }

      .spotlight-rank {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        min-height: 48px;
        padding: 0 14px;
        border-radius: 999px;
        background: rgba(15, 109, 89, 0.1);
        border: 1px solid rgba(15, 109, 89, 0.12);
        color: var(--accent-strong);
        font-family: var(--mono);
        font-size: 0.86rem;
      }

      .spotlight-name {
        margin-top: 6px;
        font-size: clamp(1.5rem, 3vw, 2.3rem);
        line-height: 1.04;
      }

      .spotlight-id {
        margin-top: 8px;
        font-family: var(--mono);
        font-size: 0.86rem;
        color: var(--muted);
        word-break: break-all;
      }

      .spotlight-reason {
        margin: 14px 0 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--text);
      }

      .tag-row,
      .order-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag-row {
        margin-top: 14px;
      }

      .meta-tag,
      .order-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        padding: 6px 11px;
        border-radius: 999px;
        border: 1px solid rgba(67, 52, 38, 0.1);
        background: rgba(255, 255, 255, 0.78);
        color: var(--text);
        font-size: 0.82rem;
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
        gap: 10px;
        margin-top: 18px;
      }

      .summary-card h3 {
        font-size: 1.1rem;
        line-height: 1.2;
      }

      .summary-copy {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .stat-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .stat-box {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.74);
      }

      .stat-label {
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .stat-value {
        font-family: var(--display);
        font-size: 1.22rem;
        line-height: 1.1;
      }

      .snapshot-grid {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }

      .snapshot-item {
        padding-bottom: 12px;
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

      .flash-banner {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.82);
        box-shadow: var(--shadow-soft);
        font-size: 0.94rem;
        line-height: 1.5;
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

      .alert-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        margin-top: 16px;
      }

      .alert-card {
        padding: 16px 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: var(--surface-strong);
        box-shadow: var(--shadow-soft);
        animation: rise 320ms ease;
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

      .alert-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .alert-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid rgba(67, 52, 38, 0.08);
        font-size: 0.74rem;
        font-weight: 700;
      }

      .alert-title h3 {
        font-size: 1rem;
      }

      .alert-list {
        display: grid;
        gap: 8px;
      }

      .alert-item {
        padding-left: 14px;
        position: relative;
        color: var(--text);
        font-size: 0.9rem;
        line-height: 1.55;
      }

      .alert-item::before {
        content: "";
        position: absolute;
        top: 0.65em;
        left: 0;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.5;
      }

      .dashboard-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1.6fr) 360px;
        margin-top: 18px;
      }

      .content-stack,
      .sidebar-stack {
        display: grid;
        gap: 18px;
        align-content: start;
      }

      .panel {
        padding: 22px;
        animation: rise 460ms ease;
      }

      .panel-head {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 18px;
      }

      .panel-copy {
        max-width: 720px;
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.94rem;
        line-height: 1.6;
      }

      .order-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .order-card {
        padding: 16px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: var(--surface-muted);
      }

      .order-card h3 {
        font-size: 1rem;
        margin-bottom: 10px;
      }

      .order-card .panel-copy {
        margin-top: 6px;
        font-size: 0.86rem;
      }

      .order-pill-row {
        min-height: 36px;
      }

      .order-pill.is-primary {
        color: var(--accent-strong);
        border-color: rgba(15, 109, 89, 0.16);
        background: rgba(15, 109, 89, 0.1);
      }

      .settings-section + .settings-section {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid rgba(67, 52, 38, 0.08);
      }

      .field {
        display: grid;
        gap: 7px;
      }

      .field + .field {
        margin-top: 12px;
      }

      .field-label {
        font-size: 0.82rem;
        color: var(--muted);
      }

      .field-note {
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .input {
        width: 100%;
        min-height: 46px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(67, 52, 38, 0.14);
        background: rgba(255, 255, 255, 0.88);
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

      .profile-list {
        display: grid;
        gap: 14px;
      }

      .profile-card {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(250px, 0.82fr);
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(255, 247, 239, 0.9));
      }

      .profile-card.top {
        border-color: rgba(15, 109, 89, 0.16);
        box-shadow: 0 20px 48px rgba(15, 109, 89, 0.12);
      }

      .profile-card.problem {
        border-color: rgba(161, 54, 51, 0.16);
      }

      .profile-main {
        min-width: 0;
      }

      .profile-head {
        display: flex;
        gap: 12px;
        align-items: start;
      }

      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 42px;
        min-height: 42px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(15, 109, 89, 0.1);
        border: 1px solid rgba(15, 109, 89, 0.12);
        color: var(--accent-strong);
        font-family: var(--mono);
        font-size: 0.82rem;
      }

      .profile-name {
        font-family: var(--display);
        font-size: 1.22rem;
        line-height: 1.15;
      }

      .profile-id {
        margin-top: 8px;
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.83rem;
        line-height: 1.55;
        word-break: break-all;
      }

      .status-badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(67, 52, 38, 0.1);
        background: rgba(255, 255, 255, 0.72);
        font-size: 0.8rem;
        color: var(--text);
      }

      .metrics-column {
        display: grid;
        gap: 12px;
      }

      .metric-card {
        padding: 14px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.72);
      }

      .metric-title {
        margin: 0 0 10px;
        font-size: 0.76rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .metric {
        display: grid;
        gap: 8px;
      }

      .metric-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }

      .metric strong {
        font-size: 1.08rem;
      }

      .metric-label {
        font-size: 0.78rem;
        color: var(--muted);
      }

      .metric-bar {
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(67, 52, 38, 0.1);
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
        color: var(--muted);
      }

      .countdown {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(15, 109, 89, 0.08);
        color: var(--accent);
        font-family: var(--mono);
        font-size: 0.75rem;
      }

      .countdown.soon {
        color: var(--accent-2);
        background: rgba(185, 100, 58, 0.1);
      }

      .countdown.expired {
        color: var(--danger);
        background: rgba(161, 54, 51, 0.1);
      }

      .profile-side {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      .profile-insight {
        padding: 14px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.72);
      }

      .profile-insight h3 {
        font-size: 1rem;
        margin-bottom: 10px;
      }

      .profile-insight p {
        margin: 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .profile-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .error-text {
        margin-top: 10px;
        color: var(--danger);
        font-size: 0.86rem;
        line-height: 1.55;
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
        border: 1px solid rgba(67, 52, 38, 0.12);
        background:
          radial-gradient(circle at top right, rgba(255, 214, 170, 0.28), transparent 34%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(255, 247, 239, 0.96));
        box-shadow: 0 32px 80px rgba(50, 38, 25, 0.24);
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
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr);
        }

        .summary-grid > :last-child {
          grid-column: 1 / -1;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .masthead-grid {
          grid-template-columns: 1fr;
        }

        .masthead-actions {
          justify-content: flex-start;
        }

        .summary-grid,
        .order-grid {
          grid-template-columns: 1fr;
        }

        .profile-card {
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
          grid-template-columns: 1fr;
        }

        .brand-mark {
          width: 88px;
          height: 88px;
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
              <p class="eyebrow">OpenClaw / Codex 账户中枢</p>
              <h1>Codex Auth Dashboard</h1>
              <p class="lede">统一查看额度、推荐顺序和 OAuth 账号操作。这个面板专注在“下一步该用哪个账号”，把用量判断、排序写入和账号维护收束成一个更完整的产品界面。</p>
              <div class="hero-note"><strong>本地运行</strong><span>直接读取 OpenClaw JSON 文件，不依赖 OpenClaw 源码。</span></div>
            </div>
          </div>
          <div class="masthead-actions">
            <button id="refreshButton" class="button-secondary" type="button">刷新数据</button>
            <button id="applyButton" class="button-primary" type="button">应用推荐顺序</button>
            <button id="syncButton" class="button-secondary" type="button">补齐配置</button>
            <button id="addButton" class="button-ghost" type="button">新增账号</button>
          </div>
        </div>

        <div class="summary-grid">
          <section class="spotlight-card">
            <div class="section-kicker">当前建议</div>
            <div class="spotlight-head">
              <div>
                <h2 id="spotlightName" class="spotlight-name">等待加载</h2>
                <div id="spotlightProfileId" class="spotlight-id">-</div>
              </div>
              <div id="spotlightRank" class="spotlight-rank">Top</div>
            </div>
            <p id="spotlightReason" class="spotlight-reason">正在读取账号额度与排序信息。</p>
            <div id="spotlightTags" class="tag-row"></div>
            <div class="spotlight-actions">
              <button id="spotlightApplyButton" class="button-primary" type="button">一键置顶推荐账号</button>
              <button id="spotlightRefreshButton" class="button-secondary" type="button">重新检查额度</button>
            </div>
          </section>

          <section class="summary-card">
            <div class="section-kicker">运行概览</div>
            <h3>今天先看这里</h3>
            <p class="summary-copy">把决策性的数字单独拿出来，减少在列表里来回对比的成本。</p>
            <div class="stat-grid">
              <div class="stat-box">
                <div class="stat-label">账号数</div>
                <div id="profilesCountValue" class="stat-value">-</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">待处理告警</div>
                <div id="warningsCountValue" class="stat-value">-</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">下一次重置</div>
                <div id="nextResetValue" class="stat-value">-</div>
              </div>
            </div>
          </section>

          <section class="summary-card">
            <div class="section-kicker">环境快照</div>
            <h3>当前连接</h3>
            <p class="summary-copy">路径与 agent 保持可见，但不再挤占主决策区。</p>
            <div class="snapshot-grid">
              <div class="snapshot-item">
                <div class="stat-label">Agent</div>
                <div id="agentValue" class="snapshot-value">-</div>
              </div>
              <div class="snapshot-item">
                <div class="stat-label">Auth Store</div>
                <div id="authValue" class="snapshot-value">-</div>
              </div>
              <div class="snapshot-item">
                <div class="stat-label">Config</div>
                <div id="configValue" class="snapshot-value">-</div>
              </div>
              <div class="snapshot-item">
                <div class="stat-label">最近刷新</div>
                <div id="timeValue" class="snapshot-value">-</div>
              </div>
            </div>
          </section>
        </div>
      </header>

      <div id="flashBanner" class="flash-banner" hidden></div>
      <section id="alertsGrid" class="alert-grid"></section>

      <div class="dashboard-grid">
        <main class="content-stack">
          <section class="card panel">
            <div class="panel-head">
              <div>
                <div class="section-kicker">排序决策</div>
                <h2>运行顺序对比</h2>
                <p class="panel-copy">把当前生效顺序、推荐顺序和文件里保存的顺序并排展示，突出差异而不是只列原始值。</p>
              </div>
            </div>
            <div class="order-grid">
              <section class="order-card">
                <h3>当前生效顺序</h3>
                <div id="effectiveOrder" class="order-pill-row"></div>
                <p class="panel-copy">运行时实际会优先使用这个顺序。</p>
              </section>
              <section class="order-card">
                <h3>推荐顺序</h3>
                <div id="recommendedOrder" class="order-pill-row"></div>
                <p class="panel-copy">基于额度和重置时间计算出的建议排序。</p>
              </section>
              <section class="order-card">
                <h3>auth-profiles.json</h3>
                <div id="storedOrder" class="order-pill-row"></div>
                <p class="panel-copy">当前写入文件的顺序，用于核对是否已经落盘。</p>
              </section>
            </div>
          </section>

          <section class="card panel">
            <div class="panel-head">
              <div>
                <div class="section-kicker">账号列表</div>
                <h2>按推荐顺序排列的 Profiles</h2>
                <p class="panel-copy">每张卡片同时给出 7 天 / 5 小时额度窗口、当前排序位置、推荐原因和快捷操作，不再依赖宽表格横向对照。</p>
              </div>
            </div>
            <div id="profilesList" class="profile-list"></div>
            <div id="emptyState" class="empty" hidden>当前没有可展示的 openai-codex 账号。</div>
          </section>
        </main>

        <aside class="sidebar-stack">
          <section class="card panel">
            <div class="panel-head">
              <div>
                <div class="section-kicker">设置</div>
                <h2>自动化与网络</h2>
                <p class="panel-copy">把常改的行为开关集中在侧边栏，不再和主决策区混在一起。</p>
              </div>
            </div>

            <div class="settings-section">
              <label class="field">
                <span class="field-label">自动刷新间隔（秒）</span>
                <input id="refreshIntervalInput" class="input" type="number" min="0" step="1" value="0" />
                <span class="field-note">填 0 关闭自动刷新。推荐只在你持续观察额度时开启。</span>
              </label>

              <label class="toggle">
                <input id="autoApplyToggle" type="checkbox" />
                <span>
                  <strong>刷新后自动应用推荐顺序</strong>
                  <span class="field-note">只有推荐顺序和当前生效顺序不一致时才会写入。</span>
                </span>
              </label>
            </div>

            <div class="settings-section">
              <label class="field">
                <span class="field-label">额度请求代理 URL</span>
                <input id="usageProxyUrlInput" class="input" type="text" value="" placeholder="http://127.0.0.1:7890" />
                <span class="field-note">留空时回退到 HTTPS_PROXY / HTTP_PROXY。</span>
              </label>

              <label class="toggle">
                <input id="usageProxyToggle" type="checkbox" />
                <span>
                  <strong>获取额度时通过代理</strong>
                  <span class="field-note">只影响对 ChatGPT 用量接口的请求，不影响本地文件读写。</span>
                </span>
              </label>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <div id="addModal" class="modal-shell" hidden aria-hidden="true">
      <div class="modal-backdrop" data-modal-close="true"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="addModalTitle">
        <div class="modal-top">
          <div>
            <div class="modal-eyebrow">New Account</div>
            <h2 id="addModalTitle" class="modal-title">新增 openai-codex 账号</h2>
            <p class="modal-copy">前缀固定，只需要填写账号后缀。提交后会直接开始 OAuth 登录流程。</p>
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
            <span class="field-note">例如 <code>work</code>、<code>personal</code>、<code>team-a</code>。</span>
          </label>
          <div class="modal-detail-card">
            <strong>将要创建</strong>
            <p><code id="addProfilePreview">openai-codex:<span>...</span></code></p>
          </div>
          <div id="addModalError" class="error-line" hidden></div>
          <p class="modal-note">如果这个后缀已存在，会在写入凭证阶段直接报错，不会覆盖已有账号。</p>
          <div class="modal-actions">
            <button id="addModalCancelButton" class="button-secondary" type="button">取消</button>
            <button id="addModalSubmitButton" class="button-primary" type="submit">开始登录</button>
          </div>
        </form>
      </div>
    </div>

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
            <span class="field-label">新的 profileId</span>
            <input id="renameProfileIdInput" class="input" type="text" autocomplete="off" spellcheck="false" />
            <span class="field-note">会同时更新 auth-profiles.json 和 openclaw.json 中对应的 profileId。</span>
          </label>

          <div id="deleteField" class="modal-detail-card" hidden>
            <strong>删除确认</strong>
            <p>删除后会同时从 <code>auth-profiles.json</code> 和 <code>openclaw.json</code> 移除对应 auth 信息。</p>
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

    <script>
      const appState = {
        data: null,
        busy: false,
        flashMessage: "",
        flashTone: "info",
        loginTaskId: null,
        loginTask: null,
        popup: null,
        manualPromptShown: false,
        refreshTimer: null,
        refreshIntervalSeconds: 0,
        autoApplyRecommended: false,
        usageProxyEnabled: false,
        usageProxyUrl: "",
        manageMode: null,
        manageRow: null,
      };

      const REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.refresh-interval-seconds";
      const AUTO_APPLY_STORAGE_KEY = "codex-auth-dashboard.auto-apply-after-refresh";
      const USAGE_PROXY_ENABLED_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-enabled";
      const USAGE_PROXY_URL_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-url";
      const PROFILE_ID_PREFIX = "openai-codex:";

      const flashBanner = document.getElementById("flashBanner");
      const refreshButton = document.getElementById("refreshButton");
      const applyButton = document.getElementById("applyButton");
      const syncButton = document.getElementById("syncButton");
      const addButton = document.getElementById("addButton");
      const spotlightApplyButton = document.getElementById("spotlightApplyButton");
      const spotlightRefreshButton = document.getElementById("spotlightRefreshButton");
      const refreshIntervalInput = document.getElementById("refreshIntervalInput");
      const usageProxyUrlInput = document.getElementById("usageProxyUrlInput");
      const autoApplyToggle = document.getElementById("autoApplyToggle");
      const usageProxyToggle = document.getElementById("usageProxyToggle");
      const spotlightName = document.getElementById("spotlightName");
      const spotlightProfileId = document.getElementById("spotlightProfileId");
      const spotlightRank = document.getElementById("spotlightRank");
      const spotlightReason = document.getElementById("spotlightReason");
      const spotlightTags = document.getElementById("spotlightTags");
      const profilesCountValue = document.getElementById("profilesCountValue");
      const warningsCountValue = document.getElementById("warningsCountValue");
      const nextResetValue = document.getElementById("nextResetValue");
      const agentValue = document.getElementById("agentValue");
      const authValue = document.getElementById("authValue");
      const configValue = document.getElementById("configValue");
      const timeValue = document.getElementById("timeValue");
      const alertsGrid = document.getElementById("alertsGrid");
      const effectiveOrder = document.getElementById("effectiveOrder");
      const recommendedOrder = document.getElementById("recommendedOrder");
      const storedOrder = document.getElementById("storedOrder");
      const profilesList = document.getElementById("profilesList");
      const emptyState = document.getElementById("emptyState");

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

      function formatTime(ts) {
        if (!ts) return "-";
        const ms = ts > 10_000_000_000 ? ts : ts * 1000;
        return new Date(ms).toLocaleString("zh-CN", { hour12: false });
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

      function clearRefreshTimer() {
        if (appState.refreshTimer) {
          window.clearTimeout(appState.refreshTimer);
          appState.refreshTimer = null;
        }
      }

      function persistAutomationSettings() {
        try {
          window.localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, String(appState.refreshIntervalSeconds));
          window.localStorage.setItem(AUTO_APPLY_STORAGE_KEY, String(appState.autoApplyRecommended));
          window.localStorage.setItem(USAGE_PROXY_ENABLED_STORAGE_KEY, String(appState.usageProxyEnabled));
          window.localStorage.setItem(USAGE_PROXY_URL_STORAGE_KEY, appState.usageProxyUrl);
        } catch {
          // Ignore localStorage failures in restricted browsers.
        }
      }

      function syncAutomationControls() {
        refreshIntervalInput.value = String(appState.refreshIntervalSeconds);
        usageProxyUrlInput.value = appState.usageProxyUrl;
        autoApplyToggle.checked = appState.autoApplyRecommended;
        usageProxyToggle.checked = appState.usageProxyEnabled;
      }

      function loadAutomationSettings() {
        try {
          const storedInterval = Number(window.localStorage.getItem(REFRESH_INTERVAL_STORAGE_KEY));
          if (Number.isFinite(storedInterval) && storedInterval >= 0) {
            appState.refreshIntervalSeconds = Math.floor(storedInterval);
          }
          appState.autoApplyRecommended = window.localStorage.getItem(AUTO_APPLY_STORAGE_KEY) === "true";
          appState.usageProxyEnabled = window.localStorage.getItem(USAGE_PROXY_ENABLED_STORAGE_KEY) === "true";
          appState.usageProxyUrl = window.localStorage.getItem(USAGE_PROXY_URL_STORAGE_KEY) || "";
        } catch {
          appState.refreshIntervalSeconds = 0;
          appState.autoApplyRecommended = false;
          appState.usageProxyEnabled = false;
          appState.usageProxyUrl = "";
        }
        syncAutomationControls();
      }

      function scheduleAutoRefresh() {
        clearRefreshTimer();
        if (appState.refreshIntervalSeconds <= 0) {
          return;
        }
        appState.refreshTimer = window.setTimeout(() => {
          if (appState.busy) {
            scheduleAutoRefresh();
            return;
          }
          void refreshState("自动刷新完成");
        }, appState.refreshIntervalSeconds * 1000);
      }

      function shouldAutoApplyRecommendedOrder(data) {
        return Boolean(
          appState.autoApplyRecommended &&
          data &&
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

      function syncControlState() {
        const loginInProgress = Boolean(appState.loginTaskId);
        const disabled = appState.busy;
        refreshButton.disabled = disabled;
        applyButton.disabled = disabled;
        syncButton.disabled = disabled;
        addButton.disabled = disabled || loginInProgress;
        spotlightApplyButton.disabled = disabled;
        spotlightRefreshButton.disabled = disabled;
        addProfileSuffixInput.disabled = disabled || loginInProgress;
        addModalSubmitButton.disabled = disabled || loginInProgress;
        renameProfileIdInput.disabled = disabled || loginInProgress;
        manageModalSubmitButton.disabled = disabled || loginInProgress;
        document.querySelectorAll("[data-action-button]").forEach((button) => {
          button.disabled = disabled || loginInProgress;
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
        manageModalCopy.textContent = "统一修改 profileId，并同步更新 auth-profiles.json 与 openclaw.json。";
        manageProfileIdText.textContent = row.profileId;
        manageProfileHint.textContent = row.email || row.displayLabel || "这个账号的 profileId 将被整体替换。";
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

      function openDeleteModal(row) {
        appState.manageMode = "delete";
        appState.manageRow = row;
        manageModalEyebrow.textContent = "Delete Profile";
        manageModalTitle.textContent = "删除账号";
        manageModalCopy.textContent = "删除会同时影响 auth-profiles.json 和 openclaw.json，对应凭证信息会一起移除。";
        manageProfileIdText.textContent = row.profileId;
        manageProfileHint.textContent = row.email || row.displayLabel || "确认后将立即执行删除。";
        renameField.hidden = true;
        deleteField.hidden = false;
        manageModalSubmitButton.textContent = "确认删除";
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
        order.forEach((profileId, index) => {
          const node = document.createElement("span");
          let tone = "";
          if (currentLead && profileId === currentLead && index === 0) {
            tone = "ok";
          } else if (index === 0) {
            tone = "info";
          }
          node.className = "order-pill" + (tone ? " " + tone : "") + (index === 0 ? " is-primary" : "");
          node.textContent = String(index + 1) + ". " + profileId;
          target.appendChild(node);
        });
      }

      function renderMetric(windowData, title) {
        const wrapper = document.createElement("div");
        wrapper.className = "metric-card";

        const heading = document.createElement("div");
        heading.className = "metric-title";
        heading.textContent = title;
        wrapper.appendChild(heading);

        const metric = document.createElement("div");
        metric.className = "metric";

        const head = document.createElement("div");
        head.className = "metric-head";

        const strong = document.createElement("strong");
        strong.textContent = windowData.remainingPercent == null ? "未知" : windowData.remainingPercent + "% 剩余";
        const label = document.createElement("span");
        label.className = "metric-label";
        label.textContent = windowData.label || "quota";
        head.appendChild(strong);
        head.appendChild(label);
        metric.appendChild(head);

        const bar = document.createElement("div");
        const remaining = windowData.remainingPercent;
        const width = remaining == null ? 0 : Math.max(0, Math.min(100, remaining));
        const tone = remaining == null ? "unknown" : width >= 60 ? "high" : width >= 30 ? "medium" : "low";
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

      function buildSpotlightSummary(row) {
        if (!row) {
          return {
            title: "暂无可推荐账号",
            detail: "当前没有可用的 openai-codex 账号数据。",
            tone: "warn",
            tags: ["等待账号数据"],
          };
        }

        if (row.error) {
          return {
            title: "额度信息获取失败",
            detail: row.error,
            tone: "danger",
            tags: ["请检查凭证或网络后再排序"],
          };
        }

        const tags = [];
        if (row.primary?.remainingPercent != null) {
          tags.push("5h 剩余 " + row.primary.remainingPercent + "%");
        }
        if (row.secondary?.remainingPercent != null) {
          tags.push("7d 剩余 " + row.secondary.remainingPercent + "%");
        }
        if (row.plan) {
          tags.push("Plan: " + row.plan);
        }
        if (row.currentOrderIndex === 0) {
          tags.push("当前已在首位");
        } else if (row.currentOrderIndex < Number.MAX_SAFE_INTEGER) {
          tags.push("当前位于第 " + String(row.currentOrderIndex + 1) + " 位");
        } else {
          tags.push("当前未进入运行顺序");
        }

        const detailParts = [];
        if (row.primary?.remainingPercent != null) {
          detailParts.push("5 小时窗口剩余 " + row.primary.remainingPercent + "%");
        }
        if (row.secondary?.remainingPercent != null) {
          detailParts.push("7 天窗口剩余 " + row.secondary.remainingPercent + "%");
        }
        if (row.primary?.resetAt) {
          detailParts.push(formatCountdown(row.primary.resetAt).text.replace(/^倒计时 /, "") + "后重置主窗口");
        }

        return {
          title: row.currentOrderIndex === 0 ? "当前首位已是推荐账号" : "建议把这个账号置于首位",
          detail: detailParts.join("，") || "该账号在综合可用额度上排名第一。",
          tone: row.currentOrderIndex === 0 ? "ok" : "info",
          tags,
        };
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
          return row.error;
        }
        const parts = [];
        if (row.primary?.remainingPercent != null) {
          parts.push("5h 剩余 " + row.primary.remainingPercent + "%");
        }
        if (row.secondary?.remainingPercent != null) {
          parts.push("7d 剩余 " + row.secondary.remainingPercent + "%");
        }
        if (row.primary?.resetAt) {
          parts.push(formatCountdown(row.primary.resetAt).text);
        }
        return parts.join(" · ") || "额度数据暂不可用。";
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
        for (const item of items) {
          const line = document.createElement("div");
          line.className = "alert-item";
          line.textContent = item;
          list.appendChild(line);
        }
        card.appendChild(list);
        return card;
      }

      function renderAlerts(data) {
        alertsGrid.innerHTML = "";
        const cards = [];

        if (appState.loginTask) {
          const items = [
            "账号: " + appState.loginTask.profileId,
            "状态: " + appState.loginTask.status,
          ];
          if (appState.loginTask.instructions) {
            items.push(appState.loginTask.instructions);
          }
          if (appState.loginTask.error) {
            items.push(appState.loginTask.error);
          }
          cards.push(createAlertCard("OAuth 登录流程", appState.loginTask.status === "failed" ? "danger" : "info", items));
        }

        if (data?.warnings?.length) {
          cards.push(createAlertCard("需要处理的告警", "warn", data.warnings));
        }

        if (data?.notes?.length) {
          cards.push(createAlertCard("系统说明", "ok", data.notes));
        }

        if (!cards.length) {
          cards.push(createAlertCard("状态正常", "ok", ["当前没有额外告警。你可以继续按推荐顺序使用账号。"]));
        }

        const fragment = document.createDocumentFragment();
        cards.forEach((card) => fragment.appendChild(card));
        alertsGrid.appendChild(fragment);
      }

      function renderSpotlight(data) {
        const row = data?.rows?.[0] || null;
        const summary = buildSpotlightSummary(row);
        spotlightName.textContent = row ? row.displayLabel : "暂无推荐账号";
        spotlightProfileId.textContent = row ? row.profileId : "-";
        spotlightRank.textContent = row ? "Top 01" : "Top --";
        spotlightReason.textContent = summary.title + "。 " + summary.detail;
        spotlightTags.innerHTML = "";
        summary.tags.forEach((item) => {
          spotlightTags.appendChild(createTag(item, summary.tone));
        });
      }

      function renderOverviewStats(data) {
        profilesCountValue.textContent = String(data.rows.length);
        warningsCountValue.textContent = String(data.warnings.length);
        const nextReset = collectNextReset(data);
        nextResetValue.textContent = nextReset ? formatCountdown(nextReset).text.replace(/^倒计时 /, "") : "未知";
      }

      function renderProfileCards(data) {
        profilesList.innerHTML = "";
        emptyState.hidden = data.rows.length > 0;
        if (!data.rows.length) {
          return;
        }

        const fragment = document.createDocumentFragment();

        for (const row of data.rows) {
          const card = document.createElement("article");
          const isTop = row.recommendedOrderIndex === 0;
          card.className = "profile-card" + (isTop ? " top" : "") + (row.error ? " problem" : "");

          const main = document.createElement("div");
          main.className = "profile-main";

          const head = document.createElement("div");
          head.className = "profile-head";
          const rank = document.createElement("div");
          rank.className = "rank-badge";
          rank.textContent = row.recommendedOrderIndex >= 0 ? "#" + String(row.recommendedOrderIndex + 1) : "--";
          const headCopy = document.createElement("div");
          const name = document.createElement("div");
          name.className = "profile-name";
          name.textContent = row.displayLabel;
          const profileId = document.createElement("div");
          profileId.className = "profile-id";
          profileId.textContent = row.profileId;
          headCopy.appendChild(name);
          headCopy.appendChild(profileId);
          head.appendChild(rank);
          head.appendChild(headCopy);
          main.appendChild(head);

          const statusRow = document.createElement("div");
          statusRow.className = "status-badge-row";
          statusRow.appendChild(createStatusBadge("类型 " + row.type));
          statusRow.appendChild(createStatusBadge(buildOrderStatus(row), isTop ? "ok" : "info"));
          if (row.plan) statusRow.appendChild(createStatusBadge("Plan " + row.plan));
          if (row.email) statusRow.appendChild(createStatusBadge(row.email));
          if (row.accountId) statusRow.appendChild(createStatusBadge("accountId " + row.accountId));
          if (row.expiresAt) statusRow.appendChild(createStatusBadge("过期 " + formatTime(row.expiresAt), "warn"));
          main.appendChild(statusRow);

          const metrics = document.createElement("div");
          metrics.className = "metrics-column";
          metrics.appendChild(renderMetric(row.secondary, "7 天窗口"));
          metrics.appendChild(renderMetric(row.primary, "5 小时窗口"));

          const side = document.createElement("div");
          side.className = "profile-side";
          const insight = document.createElement("div");
          insight.className = "profile-insight";
          const insightTitle = document.createElement("h3");
          insightTitle.textContent = isTop ? "推荐理由" : "状态摘要";
          const insightText = document.createElement("p");
          insightText.textContent = buildProfileReason(row);
          insight.appendChild(insightTitle);
          insight.appendChild(insightText);
          if (row.error) {
            const errorText = document.createElement("div");
            errorText.className = "error-text";
            errorText.textContent = row.error;
            insight.appendChild(errorText);
          }

          const actions = document.createElement("div");
          actions.className = "profile-actions";

          const pinButton = document.createElement("button");
          pinButton.type = "button";
          pinButton.className = isTop ? "button-secondary" : "button-primary";
          pinButton.textContent = isTop ? "已是首选" : "设为首位";
          pinButton.disabled = isTop || appState.busy;
          pinButton.dataset.actionButton = "true";
          pinButton.addEventListener("click", () => {
            const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
            void applyCustomOrder([row.profileId, ...others]);
          });

          const lastButton = document.createElement("button");
          lastButton.type = "button";
          lastButton.className = "button-secondary";
          lastButton.textContent = "移到末位";
          lastButton.disabled = appState.busy;
          lastButton.dataset.actionButton = "true";
          lastButton.addEventListener("click", () => {
            const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
            void applyCustomOrder([...others, row.profileId]);
          });

          const renameButton = document.createElement("button");
          renameButton.type = "button";
          renameButton.className = "button-secondary";
          renameButton.textContent = "重命名";
          renameButton.disabled = appState.busy;
          renameButton.dataset.actionButton = "true";
          renameButton.addEventListener("click", () => {
            openRenameModal(row);
          });

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "button-ghost";
          deleteButton.textContent = "删除";
          deleteButton.disabled = appState.busy;
          deleteButton.dataset.actionButton = "true";
          deleteButton.addEventListener("click", () => {
            openDeleteModal(row);
          });

          actions.appendChild(pinButton);
          actions.appendChild(lastButton);
          actions.appendChild(renameButton);
          actions.appendChild(deleteButton);

          side.appendChild(insight);
          side.appendChild(actions);

          card.appendChild(main);
          card.appendChild(metrics);
          card.appendChild(side);
          fragment.appendChild(card);
        }

        profilesList.appendChild(fragment);
      }

      function render(data) {
        appState.data = data;
        renderSpotlight(data);
        renderOverviewStats(data);
        agentValue.textContent = data.context.agentId;
        authValue.textContent = data.context.authStorePath;
        configValue.textContent = data.context.configPath;
        timeValue.textContent = new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false });
        renderOrder(effectiveOrder, data.currentEffectiveOrder, data.recommendedOrder[0]);
        renderOrder(recommendedOrder, data.recommendedOrder, data.recommendedOrder[0]);
        renderOrder(storedOrder, data.storedOrder, data.recommendedOrder[0]);
        renderAlerts(data);
        renderProfileCards(data);
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

      async function refreshState(okMessage = "刷新完成") {
        clearRefreshTimer();
        setBusy(true, "正在刷新数据...", "info");
        try {
          const response = await fetch(buildStateUrl());
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "load failed");
          }
          render(data);
          if (shouldAutoApplyRecommendedOrder(data)) {
            setFlash("正在自动应用推荐顺序...", "info");
            const nextState = await postJson("/api/apply-order", { order: data.recommendedOrder });
            render(nextState);
            setBusy(false, okMessage === "自动刷新完成" ? "自动刷新后已应用推荐顺序" : "刷新后已应用推荐顺序", "success");
          } else {
            setBusy(false, okMessage, "success");
          }
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        } finally {
          scheduleAutoRefresh();
        }
      }

      async function applyCustomOrder(order) {
        setBusy(true, "正在写入顺序...", "info");
        try {
          const data = await postJson("/api/apply-order", { order });
          render(data);
          setBusy(false, "顺序已写入，并已触发 gateway 热重载", "success");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error), "danger");
        }
      }

      async function applyRecommendedOrder() {
        if (!appState.data?.recommendedOrder?.length) {
          setFlash("当前没有可应用的推荐顺序。", "warn");
          return;
        }
        await applyCustomOrder(appState.data.recommendedOrder);
      }

      async function syncConfig() {
        setBusy(true, "正在补齐 openclaw.json...", "info");
        try {
          const data = await postJson("/api/sync-config");
          render(data);
          setBusy(false, "openclaw.json 已补齐缺失项", "success");
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

      function renderLoginTask(task) {
        appState.loginTask = task;
        renderAlerts(appState.data);
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

            if (task.status === "awaiting_manual_code" && !appState.manualPromptShown) {
              appState.manualPromptShown = true;
              const code = window.prompt(task.promptMessage || "Paste authorization code or redirect URL");
              if (code && code.trim()) {
                await postJson("/api/login/manual-code", { taskId, code });
              }
            }

            if (task.status === "completed") {
              appState.loginTaskId = null;
              appState.loginTask = task;
              appState.manualPromptShown = false;
              if (appState.popup && !appState.popup.closed) {
                appState.popup.close();
              }
              appState.popup = null;
              syncControlState();
              renderLoginTask(task);
              await refreshState("新增账号完成");
              return;
            }

            if (task.status === "failed") {
              appState.loginTaskId = null;
              appState.manualPromptShown = false;
              if (appState.popup && !appState.popup.closed) {
                appState.popup.close();
              }
              appState.popup = null;
              syncControlState();
              setBusy(false, task.error || "新增账号失败", "danger");
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          appState.loginTaskId = null;
          appState.manualPromptShown = false;
          syncControlState();
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

        if (appState.popup && !appState.popup.closed) {
          appState.popup.close();
        }
        appState.popup = window.open("about:blank", "_blank");
        appState.manualPromptShown = false;
        setBusy(true, "正在启动 OAuth 登录...", "info");

        try {
          const task = await postJson("/api/login/start", { profileId });
          appState.loginTaskId = task.taskId;
          appState.loginTask = task;
          syncControlState();
          renderLoginTask(task);
          maybeNavigatePopup(task.authUrl);
          setBusy(false, "等待完成 OAuth 登录...", "info");
          void pollLogin(task.taskId);
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
            setManageModalError("新的 profileId 不能为空。");
            renameProfileIdInput.focus();
            return;
          }
          if (nextProfileId === appState.manageRow.profileId) {
            setManageModalError("新的 profileId 不能和当前值相同。");
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
          const profileId = appState.manageRow.profileId;
          closeManageModal();
          setBusy(true, "正在删除账号...", "info");
          try {
            const nextState = await postJson("/api/delete-profile", { profileId });
            render(nextState);
            setBusy(false, "账号已删除", "success");
          } catch (error) {
            setBusy(false, String(error instanceof Error ? error.message : error), "danger");
          }
        }
      }

      refreshIntervalInput.addEventListener("change", () => {
        const nextInterval = Math.max(0, Math.floor(Number(refreshIntervalInput.value) || 0));
        appState.refreshIntervalSeconds = nextInterval;
        syncAutomationControls();
        persistAutomationSettings();
        scheduleAutoRefresh();
        setFlash(nextInterval > 0 ? "已设置每 " + nextInterval + " 秒自动刷新" : "已关闭自动刷新", "info");
      });

      autoApplyToggle.addEventListener("change", () => {
        appState.autoApplyRecommended = autoApplyToggle.checked;
        persistAutomationSettings();
        setFlash(
          appState.autoApplyRecommended ? "已开启刷新后自动应用推荐顺序" : "已关闭刷新后自动应用推荐顺序",
          "info",
        );
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

      addModalCloseButton.addEventListener("click", closeAddAccountModal);
      addModalCancelButton.addEventListener("click", closeAddAccountModal);
      manageModalCloseButton.addEventListener("click", closeManageModal);
      manageModalCancelButton.addEventListener("click", closeManageModal);

      addModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void addAccount();
      });

      manageModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void submitManageModal();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!manageModal.hidden) {
          closeManageModal();
          return;
        }
        if (!addModal.hidden) {
          closeAddAccountModal();
        }
      });

      refreshButton.addEventListener("click", () => {
        void refreshState();
      });
      applyButton.addEventListener("click", () => {
        void applyRecommendedOrder();
      });
      syncButton.addEventListener("click", () => {
        void syncConfig();
      });
      addButton.addEventListener("click", openAddAccountModal);
      spotlightApplyButton.addEventListener("click", () => {
        void applyRecommendedOrder();
      });
      spotlightRefreshButton.addEventListener("click", () => {
        void refreshState();
      });

      loadAutomationSettings();
      refreshState();
      setInterval(updateCountdowns, 1000);
    </script>
  </body>
</html>`;
}
