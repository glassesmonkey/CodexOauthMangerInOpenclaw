export function renderHtml() {
  return String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Codex Auth Dashboard</title>
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
      .hero, .section { padding: 20px; margin-bottom: 16px; }
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
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      .automation-panel {
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
      @media (max-width: 860px) {
        .shell { padding: 18px 12px 28px; }
        .hero, .section { padding: 16px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="card hero">
        <p class="eyebrow">Standalone / Codex</p>
        <h1>Codex Auth Dashboard</h1>
        <p class="sub">不依赖 OpenClaw 源码，只读取它的 JSON 文件。看用量、加账号、改顺序、补配置都在这里完成。</p>
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
      const REFRESH_INTERVAL_STORAGE_KEY = "codex-auth-dashboard.refresh-interval-seconds";
      const AUTO_APPLY_STORAGE_KEY = "codex-auth-dashboard.auto-apply-after-refresh";
      const USAGE_PROXY_ENABLED_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-enabled";
      const USAGE_PROXY_URL_STORAGE_KEY = "codex-auth-dashboard.usage-proxy-url";

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

      function setBusy(busy, text) {
        appState.busy = busy;
        refreshButton.disabled = busy;
        applyButton.disabled = busy;
        syncButton.disabled = busy;
        addButton.disabled = busy;
        statusText.textContent = text || "";
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
          setBusy(false, "顺序已写入 auth-profiles.json");
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
        try {
          while (appState.loginTaskId === taskId) {
            const response = await fetch("/api/login-status?taskId=" + encodeURIComponent(taskId));
            const task = await response.json();
            if (!response.ok) {
              renderLoginTask({ profileId: "-", status: "failed", error: task.error || "login status failed" });
              appState.loginTaskId = null;
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
              renderLoginTask(task);
              await refreshState("新增账号完成");
              return;
            }

            if (task.status === "failed") {
              appState.loginTaskId = null;
              appState.manualPromptShown = false;
              setBusy(false, task.error || "新增账号失败");
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          appState.loginTaskId = null;
          appState.manualPromptShown = false;
          setBusy(false, String(error instanceof Error ? error.message : error));
        }
      }

      async function addAccount() {
        const profileId = window.prompt("新的 profileId", "openai-codex:work");
        if (!profileId) return;

        appState.popup = window.open("about:blank", "_blank");
        appState.manualPromptShown = false;
        setBusy(true, "正在启动 OAuth 登录...");

        try {
          const task = await postJson("/api/login/start", { profileId });
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

      refreshButton.addEventListener("click", () => refreshState());
      applyButton.addEventListener("click", applyRecommendedOrder);
      syncButton.addEventListener("click", syncConfig);
      addButton.addEventListener("click", addAccount);
      loadAutomationSettings();
      refreshState();
      setInterval(updateCountdowns, 1000);
    </script>
  </body>
</html>`;
}
