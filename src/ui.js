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
        --bg: #f5f5f7;
        --bg-deep: #ececf0;
        --surface: rgba(255, 255, 255, 0.82);
        --surface-strong: rgba(255, 255, 255, 0.92);
        --surface-muted: rgba(248, 248, 250, 0.94);
        --line: rgba(29, 29, 31, 0.08);
        --line-strong: rgba(29, 29, 31, 0.16);
        --text: #1d1d1f;
        --muted: #6e6e73;
        --accent: #0071e3;
        --accent-strong: #0055cc;
        --accent-2: #8e8e93;
        --accent-2-soft: rgba(110, 110, 115, 0.08);
        --ok: #34a853;
        --warn: #ff9f0a;
        --danger: #ff453a;
        --info: #5ac8fa;
        --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.04);
        --shadow-card: 0 10px 32px rgba(0, 0, 0, 0.05);
        --radius-xl: 30px;
        --radius-lg: 24px;
        --radius-md: 18px;
        --radius-sm: 12px;
        --mono: "SF Mono", "SFMono-Regular", "JetBrains Mono", ui-monospace, monospace;
        --display: "SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        --sans: "SF Pro Text", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      }

      * { box-sizing: border-box; }

      html { background: linear-gradient(180deg, #fafafc 0%, var(--bg) 100%); }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: var(--sans);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0));
      }

      body::before { content: none; }

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
        max-width: 1320px;
        margin: 0 auto;
        padding: 28px 20px 48px;
      }

      .card {
        position: relative;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        backdrop-filter: blur(18px);
      }

      .card::after { content: none; }

      .section-kicker {
        margin: 0 0 8px;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .masthead {
        padding: 28px;
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
        gap: 16px;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 72px;
        height: 72px;
        padding: 8px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(29, 29, 31, 0.06);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
      }

      .brand-symbol-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .eyebrow {
        margin: 0 0 6px;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
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
        font-size: clamp(2rem, 4vw, 3.25rem);
        line-height: 1;
        font-weight: 700;
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
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(29, 29, 31, 0.08);
        background: rgba(255, 255, 255, 0.7);
        color: var(--muted);
        font-size: 0.8rem;
      }

      .hero-note strong {
        color: var(--text);
      }

      .masthead-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
        align-content: start;
      }

      .button-primary,
      .button-secondary,
      .button-ghost,
      .button-danger {
        min-height: 40px;
        padding: 10px 14px;
        border-radius: 999px;
        transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease, background 140ms ease, border-color 140ms ease;
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
        background: linear-gradient(180deg, #1b1b1d, #0f0f10);
        box-shadow: none;
      }

      .button-secondary {
        color: var(--text);
        background: rgba(255, 255, 255, 0.68);
        border: 1px solid var(--line);
      }

      .button-ghost {
        color: var(--text);
        background: rgba(242, 242, 247, 0.92);
        border: 1px solid rgba(29, 29, 31, 0.06);
      }

      .button-danger {
        color: #fff;
        background: linear-gradient(180deg, #ff6a61, var(--danger));
        box-shadow: none;
      }

      .summary-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.82fr);
        margin-top: 24px;
      }

      .summary-card,
      .spotlight-card {
        position: relative;
        padding: 22px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: var(--surface-strong);
        box-shadow: var(--shadow-soft);
      }

      .spotlight-card {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 250, 252, 0.94));
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
        min-width: 42px;
        min-height: 42px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(242, 242, 247, 0.96);
        border: 1px solid rgba(29, 29, 31, 0.06);
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.8rem;
      }

      .spotlight-name {
        margin-top: 4px;
        font-size: clamp(1.4rem, 2.6vw, 2rem);
        line-height: 1.08;
      }

      .spotlight-id {
        margin-top: 6px;
        font-family: var(--mono);
        font-size: 0.78rem;
        color: var(--muted);
        word-break: break-all;
      }

      .spotlight-reason {
        margin: 10px 0 0;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--muted);
      }

      .tag-row,
      .order-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .tag-row {
        margin-top: 12px;
      }

      .spotlight-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(0, 1fr) 128px;
        align-items: center;
      }

      .spotlight-visual {
        display: grid;
        gap: 10px;
        justify-items: center;
      }

      .quota-ring {
        --ring-progress: 0;
        --ring-color: var(--accent);
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background:
          radial-gradient(circle at center, rgba(255, 255, 255, 0.98) 0 56%, transparent 57%),
          conic-gradient(var(--ring-color) calc(var(--ring-progress) * 1%), rgba(29, 29, 31, 0.08) 0);
        display: grid;
        place-items: center;
      }

      .quota-ring-core {
        display: grid;
        gap: 2px;
        place-items: center;
        text-align: center;
      }

      .quota-ring-value {
        font-size: 1.55rem;
        font-weight: 600;
        line-height: 1;
      }

      .quota-ring-label {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .spotlight-capsule {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(242, 242, 247, 0.96);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(242, 242, 247, 0.92);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.82);
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
      }

      .stat-box.emphasis {
        padding: 14px 15px;
        gap: 6px;
      }

      .stat-box.emphasis .stat-value {
        font-size: clamp(1.45rem, 2.6vw, 2rem);
      }

      .stat-box.available {
        background: linear-gradient(180deg, rgba(245, 251, 247, 0.98), rgba(239, 249, 243, 0.92));
        border-color: rgba(52, 168, 83, 0.12);
      }

      .stat-box.depleted {
        background: linear-gradient(180deg, rgba(255, 249, 240, 0.98), rgba(255, 244, 234, 0.92));
        border-color: rgba(255, 159, 10, 0.14);
      }

      .stat-box.total {
        background: linear-gradient(180deg, rgba(250, 250, 252, 0.98), rgba(245, 245, 247, 0.92));
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(242, 242, 247, 0.9);
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

      .flash-banner {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.82);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.82);
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
        padding: 6px;
        border-radius: 999px;
        background: rgba(242, 242, 247, 0.92);
      }

      .tabbar {
        display: flex;
        gap: 10px;
        align-items: center;
        overflow-x: auto;
      }

      .tab-button {
        flex: 0 0 auto;
        min-height: 36px;
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid transparent;
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
        border-color: rgba(29, 29, 31, 0.04);
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

      .panel {
        padding: 24px;
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(242, 242, 247, 0.86);
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
        background: rgba(255, 255, 255, 0.98);
        color: var(--text);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      }

      .order-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .order-card {
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(29, 29, 31, 0.06);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.86);
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
        background: rgba(242, 242, 247, 0.96);
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
        border-top: 1px solid rgba(29, 29, 31, 0.06);
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
        border: 1px solid rgba(29, 29, 31, 0.08);
        background: rgba(255, 255, 255, 0.96);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 246, 249, 0.94));
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
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: var(--radius-lg);
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 248, 250, 0.94));
      }

      .profile-card.top {
        border-color: rgba(0, 113, 227, 0.12);
        box-shadow: 0 10px 30px rgba(0, 113, 227, 0.08);
      }

      .profile-card.problem {
        border-color: rgba(161, 54, 51, 0.16);
      }

      .profile-head {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }

      .profile-main {
        min-width: 0;
      }

      .profile-header-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
      }

      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        min-height: 36px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(242, 242, 247, 0.96);
        border: 1px solid rgba(29, 29, 31, 0.05);
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.76rem;
      }

      .profile-topline {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .profile-name {
        font-family: var(--display);
        font-size: 1.08rem;
        line-height: 1.12;
        font-weight: 600;
      }

      .profile-subline {
        margin-top: 4px;
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.35;
      }

      .profile-state-row {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: 0.74rem;
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(242, 242, 247, 0.92);
        font-size: 0.74rem;
        color: var(--text);
      }

      .profile-secondary-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        align-items: center;
        color: var(--muted);
        font-size: 0.76rem;
      }

      .profile-secondary-row .order-pill {
        min-height: 24px;
        padding: 4px 10px;
        font-size: 0.74rem;
      }

      .metric-card {
        padding: 14px 14px 12px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.88);
      }

      .metric-card.primary-window {
        background: linear-gradient(180deg, rgba(246, 252, 248, 0.98), rgba(240, 249, 244, 0.92));
        border-color: rgba(52, 168, 83, 0.1);
      }

      .metric-card.primary-window .metric strong {
        font-size: 1.16rem;
      }

      .metric-card.secondary-window {
        background: rgba(255, 255, 255, 0.82);
      }

      .metric-title {
        margin: 0 0 8px;
        font-size: 0.72rem;
        letter-spacing: 0.04em;
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
        font-size: 0.98rem;
      }

      .metric-label {
        display: none;
      }

      .metric-bar {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(29, 29, 31, 0.08);
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
        font-size: 0.72rem;
      }

      .countdown {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 3px 8px;
        border-radius: 999px;
        background: rgba(242, 242, 247, 0.96);
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
        justify-content: space-between;
        gap: 6px;
      }

      .profile-actions .button-primary,
      .profile-actions .button-secondary,
      .profile-actions .button-ghost {
        min-height: 38px;
        padding: 9px 13px;
      }

      .profile-menu {
        position: relative;
      }

      .profile-menu summary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 38px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(242, 242, 247, 0.92);
        color: var(--text);
        cursor: pointer;
        list-style: none;
      }

      .profile-menu summary::-webkit-details-marker { display: none; }

      .profile-menu[open] summary {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
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
        border: 1px solid rgba(29, 29, 31, 0.06);
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
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
        background: rgba(242, 242, 247, 0.86);
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

        .masthead-actions {
          justify-content: flex-start;
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
          grid-template-columns: 1fr;
        }

        .brand-mark {
          width: 64px;
          height: 64px;
        }

        .panel-head,
        .profile-group-head {
          flex-direction: column;
        }

        .view-switch {
          width: 100%;
        }

        .view-switch-button {
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
          <div class="masthead-actions">
            <button id="refreshButton" class="button-secondary" type="button">刷新数据</button>
            <button id="applyButton" class="button-primary" type="button">应用推荐顺序</button>
            <button id="syncButton" class="button-secondary" type="button">补齐配置</button>
            <button id="addButton" class="button-ghost" type="button">新增账号</button>
          </div>
        </div>

        <div class="summary-grid">
          <section class="spotlight-card">
            <div class="spotlight-head">
              <div>
                <h2 id="spotlightName" class="spotlight-name">等待加载</h2>
                <div id="spotlightProfileId" class="spotlight-id">-</div>
              </div>
              <div id="spotlightRank" class="spotlight-rank">01</div>
            </div>
            <div class="spotlight-grid">
              <div>
                <p id="spotlightReason" class="spotlight-reason">正在读取</p>
                <div id="spotlightTags" class="tag-row"></div>
              </div>
              <div class="spotlight-visual">
                <div id="spotlightQuotaRing" class="quota-ring">
                  <div class="quota-ring-core">
                    <div id="spotlightQuotaValue" class="quota-ring-value">--%</div>
                    <div class="quota-ring-label">7天</div>
                  </div>
                </div>
                <div id="spotlightWindowCapsule" class="spotlight-capsule">重置未知</div>
              </div>
            </div>
            <div class="spotlight-actions">
              <button id="spotlightApplyButton" class="button-primary" type="button">置顶</button>
              <button id="spotlightRefreshButton" class="button-secondary" type="button">刷新</button>
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

          <section id="settingsPanel" class="tab-panel" data-tab-panel="settings" hidden>
            <div class="settings-layout">
              <section class="card panel">
                <div class="panel-head">
                  <div>
                    <h2>自动化</h2>
                  </div>
                </div>

                <div class="settings-section">
                  <label class="field">
                    <span class="field-label">自动刷新（秒）</span>
                    <input id="refreshIntervalInput" class="input" type="number" min="0" step="1" value="0" />
                    <span class="field-note">0 关闭</span>
                  </label>

                  <label class="toggle">
                    <input id="autoApplyToggle" type="checkbox" />
                    <span>
                      <strong>自动应用推荐</strong>
                      <span class="field-note">顺序变化时才调整</span>
                    </span>
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
                    <div class="stat-label">账号数据位置</div>
                    <div id="authValue" class="snapshot-value">-</div>
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
        refreshTimer: null,
        refreshIntervalSeconds: 0,
        autoApplyRecommended: false,
        usageProxyEnabled: false,
        usageProxyUrl: "",
        activeTab: "accounts",
        accountsView: "quota",
        manageMode: null,
        manageRow: null,
      };

      const REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.refresh-interval-seconds";
      const AUTO_APPLY_STORAGE_KEY = "codex-auth-dashboard.auto-apply-after-refresh";
      const USAGE_PROXY_ENABLED_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-enabled";
      const USAGE_PROXY_URL_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-url";
      const ACTIVE_TAB_STORAGE_KEY = "codex-auth-dashboard.active-tab";
      const ACCOUNTS_VIEW_STORAGE_KEY = "codex-auth-dashboard.accounts-view";
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
      const spotlightQuotaRing = document.getElementById("spotlightQuotaRing");
      const spotlightQuotaValue = document.getElementById("spotlightQuotaValue");
      const spotlightWindowCapsule = document.getElementById("spotlightWindowCapsule");
      const profilesCountValue = document.getElementById("profilesCountValue");
      const depletedProfilesValue = document.getElementById("depletedProfilesValue");
      const availableProfilesValue = document.getElementById("availableProfilesValue");
      const warningsCountValue = document.getElementById("warningsCountValue");
      const nextResetValue = document.getElementById("nextResetValue");
      const agentValue = document.getElementById("agentValue");
      const authValue = document.getElementById("authValue");
      const configValue = document.getElementById("configValue");
      const timeValue = document.getElementById("timeValue");
      const alertsGrid = document.getElementById("alertsGrid");
      const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
      const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const effectiveOrder = document.getElementById("effectiveOrder");
      const recommendedOrder = document.getElementById("recommendedOrder");
      const profilesList = document.getElementById("profilesList");
      const emptyState = document.getElementById("emptyState");
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

      function closeAllProfileMenus(exceptMenu = null) {
        document.querySelectorAll(".profile-menu[open]").forEach((menu) => {
          if (menu !== exceptMenu) {
            menu.removeAttribute("open");
          }
        });
      }

      function positionProfileMenu(menu, menuList) {
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

      function getRemainingPercent(windowData) {
        return typeof windowData?.remainingPercent === "number" && Number.isFinite(windowData.remainingPercent)
          ? Math.max(0, Math.min(100, windowData.remainingPercent))
          : null;
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

      function getQuotaColor(remaining) {
        if (remaining == null) {
          return "rgba(29, 29, 31, 0.16)";
        }
        if (remaining >= 60) {
          return "#34a853";
        }
        if (remaining >= 30) {
          return "#ff9f0a";
        }
        return "#ff453a";
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

      function getQuotaBadgeTone(remaining) {
        const tone = getQuotaTone(remaining);
        if (tone === "high") return "ok";
        if (tone === "medium") return "warn";
        if (tone === "low") return "danger";
        return "info";
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
          window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, appState.activeTab);
          window.localStorage.setItem(ACCOUNTS_VIEW_STORAGE_KEY, appState.accountsView);
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
          const activeTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
          if (activeTab === "accounts" || activeTab === "order" || activeTab === "settings") {
            appState.activeTab = activeTab;
          }
          const accountsView = window.localStorage.getItem(ACCOUNTS_VIEW_STORAGE_KEY);
          if (accountsView === "quota" || accountsView === "grouped") {
            appState.accountsView = accountsView;
          }
        } catch {
          appState.refreshIntervalSeconds = 0;
          appState.autoApplyRecommended = false;
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
        if (tab !== "accounts" && tab !== "order" && tab !== "settings") {
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

      function openDeleteModal(row) {
        appState.manageMode = "delete";
        appState.manageRow = row;
        manageModalEyebrow.textContent = "Delete Profile";
        manageModalTitle.textContent = "删除账号";
        manageModalCopy.textContent = "删除后会一起移除";
        manageProfileIdText.textContent = row.profileId;
        manageProfileHint.textContent = row.email || row.displayLabel || "确认后删除";
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

      function buildSpotlightSummary(row) {
        if (!row) {
          return {
            title: "暂无可推荐账号",
            detail: "等待账号数据",
            tone: "warn",
            tags: ["尚未读取"],
          };
        }

        if (row.error) {
          return {
            title: "额度读取失败",
            detail: "检查网络或重新登录",
            tone: "danger",
            tags: ["需要处理"],
          };
        }

        const tags = [];
        if (row.primary?.remainingPercent != null) {
          tags.push("5h " + row.primary.remainingPercent + "%");
        }
        if (row.secondary?.remainingPercent != null) {
          tags.push("7d " + row.secondary.remainingPercent + "%");
        }
        if (row.plan) {
          tags.push("套餐 " + row.plan);
        }
        if (row.currentOrderIndex === 0) {
          tags.push("已在首位");
        } else if (row.currentOrderIndex < Number.MAX_SAFE_INTEGER) {
          tags.push("当前 " + String(row.currentOrderIndex + 1));
        } else {
          tags.push("未进顺序");
        }

        return {
          title: row.currentOrderIndex === 0 ? "现在就用它" : "下一位建议用它",
          detail: row.secondary?.resetAt
            ? "7天窗口 " + formatCountdown(row.secondary.resetAt).text.replace(/^倒计时 /, "")
            : "7天窗口可用",
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
          return "应用推荐顺序后，系统会立即按新的账号顺序继续工作。";
        }
        if (note.includes("Only auto-selected Codex session overrides")) {
          return "你手动指定的账号不会被自动改掉。";
        }
        if (note.includes("This tool is standalone")) {
          return "这个面板可以独立查看和管理账号。";
        }
        return note;
      }

      function humanizeWarning(note) {
        if (!note) {
          return "";
        }
        if (note.includes("auth-profiles.json was not found")) {
          return "还没找到账号数据，暂时无法读取账号列表。";
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
        if (note.includes("auth-profiles.json order omits")) {
          return "账号顺序里缺少这些账号，建议重新同步: " + note.split(": ").slice(1).join(": ");
        }
        if (note.includes("openclaw.json auth.order differs from auth-profiles.json order")) {
          return "当前实际顺序和配置里看到的顺序不一致，建议同步一次。";
        }
        if (note.includes("Profiles still using :default should be renamed")) {
          return "这些账号名称还比较临时，建议改成更容易识别的名字: " + note.split(": ").slice(1).join(": ");
        }
        return note;
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
        const row = data?.rows?.[0] || null;
        const summary = buildSpotlightSummary(row);
        const remaining = getRemainingPercent(row?.secondary);
        spotlightName.textContent = row ? row.displayLabel : "暂无推荐账号";
        spotlightProfileId.textContent = row ? row.profileId : "-";
        spotlightRank.textContent = row ? "01" : "--";
        spotlightReason.textContent = summary.title + " · " + summary.detail;
        spotlightTags.innerHTML = "";
        summary.tags.forEach((item) => {
          spotlightTags.appendChild(createTag(item, summary.tone));
        });
        spotlightQuotaValue.textContent = remaining == null ? "--%" : remaining + "%";
        spotlightQuotaRing.style.setProperty("--ring-progress", String(remaining == null ? 0 : remaining));
        spotlightQuotaRing.style.setProperty("--ring-color", getQuotaColor(remaining));
        spotlightWindowCapsule.textContent = row?.secondary?.resetAt
          ? formatCountdown(row.secondary.resetAt).text.replace(/^倒计时 /, "")
          : "重置未知";
      }

      function renderOverviewStats(data) {
        profilesCountValue.textContent = String(data.rows.length);
        const summary = summarizeSecondaryWindow(data.rows);
        depletedProfilesValue.textContent = String(summary.depleted);
        availableProfilesValue.textContent = String(summary.available);
        warningsCountValue.textContent = String(data.warnings.length);
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

      function createProfileCard(row) {
        const card = document.createElement("article");
        const isTop = row.recommendedOrderIndex === 0;
        card.className = "profile-card" + (isTop ? " top" : "") + (row.error ? " problem" : "");
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
        const name = document.createElement("div");
        name.className = "profile-name";
        name.textContent = row.displayLabel;
        topline.appendChild(rank);
        topline.appendChild(name);
        main.appendChild(topline);

        const subline = document.createElement("div");
        subline.className = "profile-subline";
        subline.textContent = row.profileId;
        main.appendChild(subline);

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

        head.appendChild(main);
        head.appendChild(headerMeta);
        card.appendChild(head);

        const mainMetric = renderMetric(row.secondary, "7 天额度", "primary-window profile-main-window");
        card.appendChild(mainMetric);

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
          plan.textContent = row.plan;
          secondaryRow.appendChild(plan);
        }
        if (row.expiresAt) {
          const expiry = document.createElement("span");
          expiry.textContent = "到期 " + formatTime(row.expiresAt);
          secondaryRow.appendChild(expiry);
        }
        card.appendChild(secondaryRow);

        if (row.error) {
          const errorText = document.createElement("div");
          errorText.className = "error-text";
          errorText.textContent = row.error;
          card.appendChild(errorText);
        }

        const actions = document.createElement("div");
        actions.className = "profile-actions";

        const pinButton = document.createElement("button");
        pinButton.type = "button";
        pinButton.className = isTop ? "button-secondary" : "button-primary";
        pinButton.textContent = isTop ? "已置顶" : "置顶";
        pinButton.disabled = isTop || appState.busy;
        pinButton.dataset.actionButton = "true";
        pinButton.addEventListener("click", () => {
          const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
          void applyCustomOrder([row.profileId, ...others]);
        });
        actions.appendChild(pinButton);

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
          closeAllProfileMenus(menu);
          window.requestAnimationFrame(() => {
            positionProfileMenu(menu, menuList);
          });
        });
        actions.appendChild(menu);

        card.appendChild(actions);
        return card;
      }

      function renderProfileCards(data) {
        profilesList.innerHTML = "";
        emptyState.hidden = data.rows.length > 0;
        if (!data.rows.length) {
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
          return;
        }

        profilesList.className = "profile-list";
        const fragment = document.createDocumentFragment();
        data.rows.forEach((row) => {
          fragment.appendChild(createProfileCard(row));
        });
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
        renderAlerts(data);
        syncAccountsViewControls();
        renderProfileCards(data);
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
          setBusy(false, "顺序已更新，推荐结果已经生效", "success");
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
        setBusy(true, "正在补齐缺失配置...", "info");
        try {
          const data = await postJson("/api/sync-config");
          render(data);
          setBusy(false, "缺失配置已补齐", "success");
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
              await refreshState("新增账号完成");
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
              setBusy(false, task.error || "新增账号失败", "danger");
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
        appState.manualCodeDraft = "";
        appState.manualCodeError = "";
        appState.manualCodeSubmitting = false;
        appState.loginTaskRenderKey = "";
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

      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          setActiveTab(button.dataset.tab || "accounts");
        });
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

      document.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".profile-menu")) {
          return;
        }
        closeAllProfileMenus();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeAllProfileMenus();
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
      accountsViewQuotaButton.addEventListener("click", () => {
        setAccountsView("quota");
      });
      accountsViewGroupedButton.addEventListener("click", () => {
        setAccountsView("grouped");
      });

      loadAutomationSettings();
      syncTabState();
      refreshState();
      setInterval(updateCountdowns, 1000);
    </script>
  </body>
</html>`;
}
