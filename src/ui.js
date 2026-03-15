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
    <meta name="theme-color" content="#0e6b58" />
    <title>Codex Auth Dashboard</title>
    <link rel="icon" href="${FAVICON_DATA_URI}" type="image/svg+xml" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe7;
        --card: rgba(255, 252, 247, 0.92);
        --line: rgba(67, 52, 38, 0.14);
        --text: #2b241f;
        --muted: #6b6158;
        --accent: #0e6b58;
        --accent-2: #bb6236;
        --warn: #9d6116;
        --danger: #a02f2f;
        --ok: #1e6b49;
        --shadow: 0 24px 60px rgba(84, 60, 36, 0.12);
        --radius: 18px;
        --mono: "SFMono-Regular", "JetBrains Mono", ui-monospace, monospace;
        --sans: "Iowan Old Style", "Source Han Serif SC", "Noto Serif SC", serif;
      }

      * { box-sizing: border-box; }
      html { background: #f3efe7; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--sans);
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(255, 211, 153, 0.42), transparent 30%),
          radial-gradient(circle at bottom left, rgba(72, 132, 112, 0.22), transparent 28%),
          linear-gradient(180deg, #faf6ee 0%, var(--bg) 100%);
      }
      .shell { max-width: 1400px; margin: 0 auto; padding: 28px 16px 40px; }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .hero {
        position: relative;
        overflow: hidden;
      }
      .hero::after {
        content: "";
        position: absolute;
        top: -80px;
        right: -40px;
        width: 260px;
        height: 260px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(187, 98, 54, 0.2), rgba(187, 98, 54, 0));
        pointer-events: none;
      }
      .hero, .section { padding: 20px; margin-bottom: 16px; }
      .hero-head {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .brand-mark {
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        width: 96px;
        height: 96px;
        padding: 6px;
        border-radius: 28px;
        background: rgba(255, 252, 247, 0.88);
        border: 1px solid rgba(67, 52, 38, 0.1);
        box-shadow: 0 18px 40px rgba(84, 60, 36, 0.14);
      }
      .brand-symbol-svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .brand-copy { min-width: 0; }
      .eyebrow {
        margin: 0 0 8px;
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent-2);
      }
      h1 {
        margin: 0;
        font-size: clamp(1.9rem, 4vw, 3.1rem);
        line-height: 1.05;
      }
      .sub {
        margin: 10px 0 0;
        color: var(--muted);
      }
      .brand-tagline {
        margin: 12px 0 0;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.72);
        color: var(--muted);
        font-size: 0.84rem;
      }
      .brand-tagline strong {
        color: var(--text);
        letter-spacing: 0.02em;
      }
      .controls {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      .automation-panel {
        position: relative;
        z-index: 1;
        margin-top: 18px;
        padding: 14px 16px;
        border: 1px solid rgba(67, 52, 38, 0.1);
        background: rgba(255,255,255,0.52);
        border-radius: 14px;
      }
      .automation-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .field {
        display: grid;
        gap: 6px;
      }
      .field-label {
        font-size: 0.82rem;
        color: var(--muted);
      }
      .field-note {
        font-size: 0.78rem;
        color: var(--muted);
      }
      .input {
        width: 100%;
        appearance: none;
        border: 1px solid rgba(67, 52, 38, 0.14);
        border-radius: 12px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.9);
        color: var(--text);
        font: inherit;
      }
      .toggle {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding-top: 6px;
      }
      .toggle input {
        margin: 3px 0 0;
        width: 16px;
        height: 16px;
        accent-color: var(--accent);
      }
      .toggle-text {
        display: grid;
        gap: 4px;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
        transition: transform 120ms ease, opacity 120ms ease;
      }
      button:hover:not(:disabled) { transform: translateY(-1px); }
      button:disabled { opacity: 0.55; cursor: wait; }
      .button-primary { background: linear-gradient(135deg, var(--accent), #1b8a6f); color: #fff; }
      .button-secondary { background: rgba(255,255,255,0.9); border: 1px solid var(--line); color: var(--text); }
      .meta-grid {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-top: 18px;
      }
      .meta-box {
        border: 1px solid rgba(67, 52, 38, 0.1);
        background: rgba(255,255,255,0.52);
        border-radius: 14px;
        padding: 14px 16px;
      }
      .meta-label {
        font-size: 0.76rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }
      .meta-value { font-family: var(--mono); font-size: 0.88rem; word-break: break-all; }
      .status { min-height: 1.3em; margin-top: 14px; color: var(--muted); }
      .order-line, .message-list, .login-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(67, 52, 38, 0.1);
        background: rgba(255,255,255,0.72);
        font-size: 0.82rem;
      }
      .pill.warn { color: var(--warn); }
      .pill.danger { color: var(--danger); }
      .pill.ok { color: var(--ok); }
      .table-wrap { overflow: auto; }
      table { width: 100%; min-width: 1120px; border-collapse: collapse; }
      th, td {
        padding: 14px 12px;
        text-align: left;
        border-bottom: 1px solid rgba(67, 52, 38, 0.08);
        vertical-align: top;
      }
      th {
        position: sticky;
        top: 0;
        background: rgba(255, 252, 247, 0.98);
        font-size: 0.8rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .profile-id { font-family: var(--mono); font-size: 0.86rem; margin-top: 6px; }
      .profile-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .metric { display: grid; gap: 6px; min-width: 180px; }
      .metric-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .metric strong { font-size: 1.05rem; }
      .metric-label {
        font-size: 0.78rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .metric-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .metric-bar {
        position: relative;
        overflow: hidden;
        height: 10px;
        border-radius: 999px;
        background: rgba(67, 52, 38, 0.12);
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
            rgba(255, 255, 255, 0.35) 8px,
            rgba(255, 255, 255, 0.35) 16px
          );
      }
      .metric small { color: var(--muted); }
      .countdown {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(14, 107, 88, 0.08);
        color: var(--accent);
        font-size: 0.76rem;
        font-family: var(--mono);
      }
      .countdown.soon {
        background: rgba(187, 98, 54, 0.1);
        color: var(--accent-2);
      }
      .countdown.expired {
        background: rgba(160, 47, 47, 0.1);
        color: var(--danger);
      }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .error-text { color: var(--danger); font-size: 0.88rem; margin-top: 6px; }
      .empty { color: var(--muted); padding-top: 12px; }
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
        background: rgba(43, 36, 31, 0.42);
        backdrop-filter: blur(10px);
      }
      .modal-card {
        position: relative;
        width: min(560px, 100%);
        padding: 26px;
        border-radius: 26px;
        border: 1px solid rgba(67, 52, 38, 0.12);
        background:
          radial-gradient(circle at top right, rgba(255, 214, 170, 0.34), transparent 34%),
          linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(255, 247, 239, 0.96));
        box-shadow: 0 32px 80px rgba(50, 38, 25, 0.22);
      }
      .modal-top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .modal-title {
        margin: 4px 0 0;
        font-size: clamp(1.45rem, 3vw, 2rem);
        line-height: 1.08;
      }
      .modal-copy {
        margin: 10px 0 0;
        color: var(--muted);
      }
      .icon-button {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(67, 52, 38, 0.1);
        color: var(--muted);
        font-size: 1.2rem;
        line-height: 1;
      }
      .modal-form {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }
      .profile-id-input {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        overflow: hidden;
        border-radius: 16px;
        border: 1px solid rgba(67, 52, 38, 0.14);
        background: rgba(255, 255, 255, 0.86);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
      }
      .profile-id-prefix {
        display: inline-flex;
        align-items: center;
        min-height: 54px;
        padding: 0 14px 0 16px;
        font-family: var(--mono);
        font-size: 0.92rem;
        color: var(--accent);
        background: rgba(14, 107, 88, 0.08);
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
      .profile-id-suffix:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.96);
      }
      .profile-preview {
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid rgba(67, 52, 38, 0.08);
        background: rgba(255, 255, 255, 0.56);
      }
      .profile-preview strong {
        display: block;
        margin-bottom: 8px;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .profile-preview code {
        display: block;
        font-family: var(--mono);
        font-size: 0.92rem;
        color: var(--text);
        word-break: break-all;
      }
      .profile-preview-empty { color: rgba(107, 97, 88, 0.72); }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .modal-note {
        margin: 0;
        color: var(--muted);
        font-size: 0.82rem;
      }
      @media (max-width: 860px) {
        .shell { padding: 18px 12px 28px; }
        .hero, .section { padding: 16px; }
        .hero-head {
          align-items: flex-start;
          gap: 14px;
        }
        .brand-mark {
          width: 78px;
          height: 78px;
          border-radius: 24px;
        }
        .modal-card { padding: 20px; border-radius: 22px; }
        .profile-id-input { grid-template-columns: 1fr; }
        .profile-id-prefix {
          min-height: auto;
          padding: 12px 14px 0;
          border-right: 0;
          background: transparent;
        }
        .profile-id-suffix { padding-top: 8px; }
        .modal-actions { flex-direction: column-reverse; }
        .modal-actions button { width: 100%; }
      }
      @media (max-width: 560px) {
        .hero-head { flex-direction: column; }
        .brand-tagline {
          width: 100%;
          justify-content: center;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="card hero">
        <div class="hero-head">
          <div class="brand-mark">${HEADER_LOGO_SVG}</div>
          <div class="brand-copy">
            <p class="eyebrow">Standalone / Codex</p>
            <h1>Codex Auth Dashboard</h1>
            <p class="sub">不依赖 OpenClaw 源码，只读取它的 JSON 文件。看用量、加账号、改顺序、补配置都在这里完成。</p>
            <div class="brand-tagline"><strong>CA</strong><span>统一用于浏览器标签页和站点头部的主徽记</span></div>
          </div>
        </div>
        <div class="controls">
          <button id="refreshButton" class="button-secondary" type="button">刷新</button>
          <button id="applyButton" class="button-primary" type="button">应用推荐顺序</button>
          <button id="syncButton" class="button-secondary" type="button">补齐 openclaw.json</button>
          <button id="addButton" class="button-secondary" type="button">新增账号</button>
        </div>
        <div class="automation-panel">
          <div class="meta-label">自动化</div>
          <div class="automation-grid">
            <label class="field">
              <span class="field-label">自动刷新间隔（秒）</span>
              <input id="refreshIntervalInput" class="input" type="number" min="0" step="1" value="0" />
              <span class="field-note">填 0 关闭自动刷新。</span>
            </label>
            <label class="field">
              <span class="field-label">额度请求代理 URL</span>
              <input id="usageProxyUrlInput" class="input" type="text" value="" placeholder="http://127.0.0.1:7890" />
              <span class="field-note">留空时走 HTTPS_PROXY / HTTP_PROXY。</span>
            </label>
            <label class="toggle">
              <input id="autoApplyToggle" type="checkbox" />
              <span class="toggle-text">
                <strong>刷新后自动应用推荐顺序</strong>
                <span class="field-note">只有推荐顺序和当前生效顺序不一致时才会写入。</span>
              </span>
            </label>
            <label class="toggle">
              <input id="usageProxyToggle" type="checkbox" />
              <span class="toggle-text">
                <strong>获取额度时通过代理</strong>
                <span class="field-note">只影响对 ChatGPT 用量接口的请求，不影响本地文件读写。</span>
              </span>
            </label>
          </div>
        </div>
        <div class="meta-grid">
          <div class="meta-box"><div class="meta-label">Agent</div><div id="agentValue" class="meta-value">-</div></div>
          <div class="meta-box"><div class="meta-label">Auth Store</div><div id="authValue" class="meta-value">-</div></div>
          <div class="meta-box"><div class="meta-label">Config</div><div id="configValue" class="meta-value">-</div></div>
          <div class="meta-box"><div class="meta-label">Last Refresh</div><div id="timeValue" class="meta-value">-</div></div>
        </div>
        <div id="statusText" class="status"></div>
      </section>

      <section class="card section">
        <div class="meta-label">顺序</div>
        <div style="display:grid; gap:12px;">
          <div><div class="meta-label">当前生效顺序</div><div id="effectiveOrder" class="order-line"></div></div>
          <div><div class="meta-label">推荐顺序</div><div id="recommendedOrder" class="order-line"></div></div>
          <div><div class="meta-label">auth-profiles.json 顺序</div><div id="storedOrder" class="order-line"></div></div>
        </div>
      </section>

      <section class="card section">
        <div class="meta-label">告警与提示</div>
        <div id="warnings" class="message-list"></div>
        <div id="notes" class="message-list" style="margin-top:10px;"></div>
        <div id="loginStatus" class="login-list" style="margin-top:10px;"></div>
      </section>

      <section class="card section">
        <div class="meta-label">Profiles</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>7d / Secondary</th>
                <th>5h / Primary</th>
                <th>Current</th>
                <th>Recommended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <div id="emptyState" class="empty" hidden>当前没有可展示的 openai-codex profiles。</div>
      </section>
    </div>

    <div id="addModal" class="modal-shell" hidden aria-hidden="true">
      <div class="modal-backdrop" data-modal-close="true"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="addModalTitle">
        <div class="modal-top">
          <div>
            <div class="eyebrow">New Account</div>
            <h2 id="addModalTitle" class="modal-title">新增 openai-codex 账号</h2>
            <p class="modal-copy">前缀固定，用户只需要填写自己的账号后缀。提交后会直接进入 OAuth 登录流程。</p>
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
            <span class="field-note">例如 <code>work</code>、<code>personal</code>、<code>team-a</code>。最终会保存成完整的 profileId。</span>
          </label>
          <div class="profile-preview">
            <strong>将要创建</strong>
            <code id="addProfilePreview">openai-codex:<span class="profile-preview-empty">...</span></code>
          </div>
          <div id="addModalError" class="error-text" hidden></div>
          <p class="modal-note">如果这个后缀已存在，会在写入凭证阶段直接报错，不会覆盖已有账号。</p>
          <div class="modal-actions">
            <button id="addModalCancelButton" class="button-secondary" type="button">取消</button>
            <button id="addModalSubmitButton" class="button-primary" type="submit">开始登录</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const appState = {
        data: null,
        busy: false,
        loginTaskId: null,
        popup: null,
        manualPromptShown: false,
        refreshTimer: null,
        refreshIntervalSeconds: 0,
        autoApplyRecommended: false,
        usageProxyEnabled: false,
        usageProxyUrl: "",
      };

      const statusText = document.getElementById("statusText");
      const refreshButton = document.getElementById("refreshButton");
      const applyButton = document.getElementById("applyButton");
      const syncButton = document.getElementById("syncButton");
      const addButton = document.getElementById("addButton");
      const refreshIntervalInput = document.getElementById("refreshIntervalInput");
      const usageProxyUrlInput = document.getElementById("usageProxyUrlInput");
      const autoApplyToggle = document.getElementById("autoApplyToggle");
      const usageProxyToggle = document.getElementById("usageProxyToggle");
      const agentValue = document.getElementById("agentValue");
      const authValue = document.getElementById("authValue");
      const configValue = document.getElementById("configValue");
      const timeValue = document.getElementById("timeValue");
      const effectiveOrder = document.getElementById("effectiveOrder");
      const recommendedOrder = document.getElementById("recommendedOrder");
      const storedOrder = document.getElementById("storedOrder");
      const warnings = document.getElementById("warnings");
      const notes = document.getElementById("notes");
      const rows = document.getElementById("rows");
      const emptyState = document.getElementById("emptyState");
      const loginStatus = document.getElementById("loginStatus");
      const addModal = document.getElementById("addModal");
      const addModalForm = document.getElementById("addModalForm");
      const addModalCloseButton = document.getElementById("addModalCloseButton");
      const addModalCancelButton = document.getElementById("addModalCancelButton");
      const addProfileSuffixInput = document.getElementById("addProfileSuffixInput");
      const addProfilePreview = document.getElementById("addProfilePreview");
      const addModalError = document.getElementById("addModalError");
      const addModalSubmitButton = document.getElementById("addModalSubmitButton");
      const REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.refresh-interval-seconds";
      const AUTO_APPLY_STORAGE_KEY = "codex-auth-dashboard.auto-apply-after-refresh";
      const USAGE_PROXY_ENABLED_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-enabled";
      const USAGE_PROXY_URL_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-url";
      const PROFILE_ID_PREFIX = "openai-codex:";

      function formatTime(ts) {
        if (!ts) return "-";
        const ms = ts > 10_000_000_000 ? ts : ts * 1000;
        return new Date(ms).toLocaleString("zh-CN", { hour12: false });
      }

      function formatCountdown(ts) {
        if (!ts) {
          return { text: "countdown n/a", tone: "" };
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

      function pill(label, tone = "") {
        const node = document.createElement("span");
        node.className = "pill" + (tone ? " " + tone : "");
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
        addProfileSuffixInput.disabled = disabled || loginInProgress;
        addModalSubmitButton.disabled = disabled || loginInProgress;
        rows.querySelectorAll("button").forEach((button) => {
          button.disabled = disabled || loginInProgress;
        });
      }

      function setBusy(busy, text) {
        appState.busy = busy;
        syncControlState();
        statusText.textContent = text || "";
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
          addProfilePreview.innerHTML = PROFILE_ID_PREFIX + '<span class="profile-preview-empty">...</span>';
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

      function renderOrder(target, order) {
        target.innerHTML = "";
        if (!order || !order.length) {
          target.appendChild(pill("无"));
          return;
        }
        order.forEach((profileId, index) => {
          target.appendChild(pill((index + 1) + ". " + profileId));
        });
      }

      function renderMessages(target, items, tone) {
        target.innerHTML = "";
        if (!items || !items.length) {
          target.appendChild(pill("无", tone === "warn" ? "" : "ok"));
          return;
        }
        for (const item of items) {
          target.appendChild(pill(item, tone));
        }
      }

      function renderMetric(windowData) {
        const wrapper = document.createElement("div");
        wrapper.className = "metric";
        const head = document.createElement("div");
        head.className = "metric-head";
        const strong = document.createElement("strong");
        strong.textContent = windowData.remainingPercent == null ? "n/a" : windowData.remainingPercent + "% left";
        const label = document.createElement("span");
        label.className = "metric-label";
        label.textContent = windowData.label || "n/a";
        head.appendChild(strong);
        head.appendChild(label);

        const bar = document.createElement("div");
        const remaining = windowData.remainingPercent;
        const width = remaining == null ? 0 : Math.max(0, Math.min(100, remaining));
        const tone = remaining == null ? "unknown" : width >= 60 ? "high" : width >= 30 ? "medium" : "low";
        bar.className = "metric-bar " + tone;
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-label", (windowData.label || "usage") + " remaining quota");
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", String(width));
        const fill = document.createElement("div");
        fill.className = "metric-bar-fill";
        fill.style.width = width + "%";
        bar.appendChild(fill);

        const meta = document.createElement("div");
        meta.className = "metric-meta";
        const small = document.createElement("small");
        small.textContent = "reset " + formatTime(windowData.resetAt);
        const countdown = document.createElement("span");
        countdown.setAttribute("data-reset-at", windowData.resetAt == null ? "" : String(windowData.resetAt));
        const countdownState = formatCountdown(windowData.resetAt);
        countdown.className = "countdown" + (countdownState.tone ? " " + countdownState.tone : "");
        countdown.textContent = countdownState.text;
        meta.appendChild(small);
        meta.appendChild(countdown);
        wrapper.appendChild(head);
        wrapper.appendChild(bar);
        wrapper.appendChild(meta);
        return wrapper;
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

      function renderRows(data) {
        rows.innerHTML = "";
        emptyState.hidden = data.rows.length > 0;

        for (const row of data.rows) {
          const tr = document.createElement("tr");

          const profileCell = document.createElement("td");
          const title = document.createElement("div");
          title.textContent = row.displayLabel;
          const profileId = document.createElement("div");
          profileId.className = "profile-id";
          profileId.textContent = row.profileId;
          const meta = document.createElement("div");
          meta.className = "profile-meta";
          meta.appendChild(pill("type: " + row.type));
          if (row.email) meta.appendChild(pill("email: " + row.email));
          if (row.accountId) meta.appendChild(pill("accountId: " + row.accountId));
          if (row.plan) meta.appendChild(pill("plan: " + row.plan));
          if (row.expiresAt) meta.appendChild(pill("expires: " + formatTime(row.expiresAt)));
          profileCell.appendChild(title);
          profileCell.appendChild(profileId);
          profileCell.appendChild(meta);

          const secondaryCell = document.createElement("td");
          secondaryCell.appendChild(renderMetric(row.secondary));

          const primaryCell = document.createElement("td");
          primaryCell.appendChild(renderMetric(row.primary));
          if (row.error) {
            const errorText = document.createElement("div");
            errorText.className = "error-text";
            errorText.textContent = row.error;
            primaryCell.appendChild(errorText);
          }

          const currentCell = document.createElement("td");
          currentCell.textContent = row.currentOrderIndex >= 1_000_000 ? "-" : String(row.currentOrderIndex + 1);

          const recommendedCell = document.createElement("td");
          recommendedCell.textContent = row.recommendedOrderIndex >= 0 ? String(row.recommendedOrderIndex + 1) : "-";

          const actionCell = document.createElement("td");
          const actionRow = document.createElement("div");
          actionRow.className = "actions";

          const renameButton = document.createElement("button");
          renameButton.type = "button";
          renameButton.className = "button-secondary";
          renameButton.textContent = "Rename";
          renameButton.disabled = appState.busy;
          renameButton.addEventListener("click", async () => {
            const nextProfileId = window.prompt("新的 profileId", row.profileId.replace(/:default$/, ":work"));
            if (!nextProfileId || nextProfileId === row.profileId) return;
            setBusy(true, "正在重命名...");
            try {
              const nextState = await postJson("/api/rename-profile", {
                profileId: row.profileId,
                nextProfileId,
              });
              render(nextState);
              setBusy(false, "重命名完成");
            } catch (error) {
              setBusy(false, String(error instanceof Error ? error.message : error));
            }
          });

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "button-secondary";
          deleteButton.textContent = "Delete";
          deleteButton.disabled = appState.busy;
          deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(
              "确认删除 " + row.profileId + " 吗？这会同时从 auth-profiles.json 和 openclaw.json 删除对应 auth 信息。",
            );
            if (!confirmed) return;
            setBusy(true, "正在删除账号...");
            try {
              const nextState = await postJson("/api/delete-profile", {
                profileId: row.profileId,
              });
              render(nextState);
              setBusy(false, "账号已删除");
            } catch (error) {
              setBusy(false, String(error instanceof Error ? error.message : error));
            }
          });

          const firstButton = document.createElement("button");
          firstButton.type = "button";
          firstButton.className = "button-secondary";
          firstButton.textContent = "置顶";
          firstButton.disabled = appState.busy;
          firstButton.addEventListener("click", () => {
            const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
            applyCustomOrder([row.profileId, ...others]);
          });

          const lastButton = document.createElement("button");
          lastButton.type = "button";
          lastButton.className = "button-secondary";
          lastButton.textContent = "置底";
          lastButton.disabled = appState.busy;
          lastButton.addEventListener("click", () => {
            const others = appState.data.currentEffectiveOrder.filter((entry) => entry !== row.profileId);
            applyCustomOrder([...others, row.profileId]);
          });

          actionRow.appendChild(renameButton);
          actionRow.appendChild(deleteButton);
          actionRow.appendChild(firstButton);
          actionRow.appendChild(lastButton);
          actionCell.appendChild(actionRow);

          tr.appendChild(profileCell);
          tr.appendChild(secondaryCell);
          tr.appendChild(primaryCell);
          tr.appendChild(currentCell);
          tr.appendChild(recommendedCell);
          tr.appendChild(actionCell);
          rows.appendChild(tr);
        }
      }

      function renderLoginTask(task) {
        loginStatus.innerHTML = "";
        if (!task) return;
        loginStatus.appendChild(pill("login: " + task.profileId));
        loginStatus.appendChild(pill("status: " + task.status, task.status === "failed" ? "danger" : "ok"));
        if (task.error) loginStatus.appendChild(pill(task.error, "danger"));
        if (task.instructions) loginStatus.appendChild(pill(task.instructions));
      }

      function render(data) {
        appState.data = data;
        agentValue.textContent = data.context.agentId;
        authValue.textContent = data.context.authStorePath;
        configValue.textContent = data.context.configPath;
        timeValue.textContent = new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false });
        renderOrder(effectiveOrder, data.currentEffectiveOrder);
        renderOrder(recommendedOrder, data.recommendedOrder);
        renderOrder(storedOrder, data.storedOrder);
        renderMessages(warnings, data.warnings, "warn");
        renderMessages(notes, data.notes, "ok");
        renderRows(data);
      }

      async function refreshState(okMessage = "刷新完成") {
        clearRefreshTimer();
        setBusy(true, "正在刷新...");
        try {
          const response = await fetch(buildStateUrl());
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "load failed");
          render(data);
          if (shouldAutoApplyRecommendedOrder(data)) {
            statusText.textContent = "正在自动应用推荐顺序...";
            const nextState = await postJson("/api/apply-order", { order: data.recommendedOrder });
            render(nextState);
            setBusy(false, okMessage === "自动刷新完成" ? "自动刷新后已应用推荐顺序" : "刷新后已应用推荐顺序");
          } else {
            setBusy(false, okMessage);
          }
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
        } finally {
          scheduleAutoRefresh();
        }
      }

      async function applyCustomOrder(order) {
        setBusy(true, "正在写入顺序...");
        try {
          const data = await postJson("/api/apply-order", { order });
          render(data);
          setBusy(false, "顺序已写入，并已触发 gateway 热重载");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
        }
      }

      async function applyRecommendedOrder() {
        if (!appState.data) return;
        await applyCustomOrder(appState.data.recommendedOrder);
      }

      async function syncConfig() {
        setBusy(true, "正在补齐 openclaw.json...");
        try {
          const data = await postJson("/api/sync-config");
          render(data);
          setBusy(false, "openclaw.json 已补齐缺失项");
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
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
              setBusy(false, task.error || "新增账号失败");
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          appState.loginTaskId = null;
          appState.manualPromptShown = false;
          syncControlState();
          setBusy(false, String(error instanceof Error ? error.message : error));
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
        setBusy(true, "正在启动 OAuth 登录...");

        try {
          const task = await postJson("/api/login/start", { profileId });
          appState.loginTaskId = task.taskId;
          syncControlState();
          renderLoginTask(task);
          maybeNavigatePopup(task.authUrl);
          setBusy(false, "等待完成 OAuth 登录...");
          void pollLogin(task.taskId);
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
        }
      }

      refreshIntervalInput.addEventListener("change", () => {
        const nextInterval = Math.max(0, Math.floor(Number(refreshIntervalInput.value) || 0));
        appState.refreshIntervalSeconds = nextInterval;
        syncAutomationControls();
        persistAutomationSettings();
        scheduleAutoRefresh();
        statusText.textContent = nextInterval > 0 ? "已设置每 " + nextInterval + " 秒自动刷新" : "已关闭自动刷新";
      });

      autoApplyToggle.addEventListener("change", () => {
        appState.autoApplyRecommended = autoApplyToggle.checked;
        persistAutomationSettings();
        statusText.textContent = appState.autoApplyRecommended
          ? "已开启刷新后自动应用推荐顺序"
          : "已关闭刷新后自动应用推荐顺序";
      });

      usageProxyUrlInput.addEventListener("change", () => {
        appState.usageProxyUrl = usageProxyUrlInput.value.trim();
        syncAutomationControls();
        persistAutomationSettings();
        statusText.textContent = appState.usageProxyUrl
          ? "已更新额度请求代理 URL"
          : "已清空额度请求代理 URL，将回退到环境变量代理";
      });

      usageProxyToggle.addEventListener("change", () => {
        appState.usageProxyEnabled = usageProxyToggle.checked;
        persistAutomationSettings();
        statusText.textContent = appState.usageProxyEnabled
          ? "已开启额度请求代理"
          : "已关闭额度请求代理";
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

      addModalCloseButton.addEventListener("click", closeAddAccountModal);
      addModalCancelButton.addEventListener("click", closeAddAccountModal);
      addModalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void addAccount();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !addModal.hidden) {
          closeAddAccountModal();
        }
      });

      refreshButton.addEventListener("click", () => refreshState());
      applyButton.addEventListener("click", applyRecommendedOrder);
      syncButton.addEventListener("click", syncConfig);
      addButton.addEventListener("click", openAddAccountModal);
      loadAutomationSettings();
      refreshState();
      setInterval(updateCountdowns, 1000);
    </script>
  </body>
</html>`;
}
