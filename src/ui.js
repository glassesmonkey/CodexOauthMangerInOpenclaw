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
      .metric { display: grid; gap: 4px; }
      .metric strong { font-size: 1.05rem; }
      .metric small { color: var(--muted); }
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
          <div><div class="meta-label">openclaw.json 顺序</div><div id="configOrder" class="order-line"></div></div>
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
      };

      const statusText = document.getElementById("statusText");
      const refreshButton = document.getElementById("refreshButton");
      const applyButton = document.getElementById("applyButton");
      const syncButton = document.getElementById("syncButton");
      const addButton = document.getElementById("addButton");
      const agentValue = document.getElementById("agentValue");
      const authValue = document.getElementById("authValue");
      const configValue = document.getElementById("configValue");
      const timeValue = document.getElementById("timeValue");
      const effectiveOrder = document.getElementById("effectiveOrder");
      const recommendedOrder = document.getElementById("recommendedOrder");
      const storedOrder = document.getElementById("storedOrder");
      const configOrder = document.getElementById("configOrder");
      const warnings = document.getElementById("warnings");
      const notes = document.getElementById("notes");
      const rows = document.getElementById("rows");
      const emptyState = document.getElementById("emptyState");
      const loginStatus = document.getElementById("loginStatus");

      function formatTime(ts) {
        if (!ts) return "-";
        const ms = ts > 10_000_000_000 ? ts : ts * 1000;
        return new Date(ms).toLocaleString("zh-CN", { hour12: false });
      }

      function pill(label, tone = "") {
        const node = document.createElement("span");
        node.className = "pill" + (tone ? " " + tone : "");
        node.textContent = label;
        return node;
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
        const strong = document.createElement("strong");
        strong.textContent = windowData.remainingPercent == null ? "n/a" : windowData.remainingPercent + "%";
        const small = document.createElement("small");
        small.textContent = (windowData.label || "n/a") + " · reset " + formatTime(windowData.resetAt);
        wrapper.appendChild(strong);
        wrapper.appendChild(small);
        return wrapper;
      }

      async function postJson(url, payload) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload || {}),
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
        renderOrder(configOrder, data.configOrder);
        renderMessages(warnings, data.warnings, "warn");
        renderMessages(notes, data.notes, "ok");
        renderRows(data);
      }

      async function refreshState(okMessage = "刷新完成") {
        setBusy(true, "正在刷新...");
        try {
          const response = await fetch("/api/state");
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "load failed");
          render(data);
          setBusy(false, okMessage);
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
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

      async function pollLogin(taskId) {
        appState.loginTaskId = taskId;
        while (appState.loginTaskId === taskId) {
          const response = await fetch("/api/login-status?taskId=" + encodeURIComponent(taskId));
          const task = await response.json();
          if (!response.ok) {
            renderLoginTask({ profileId: "-", status: "failed", error: task.error || "login status failed" });
            appState.loginTaskId = null;
            return;
          }
          renderLoginTask(task);

          if (task.authUrl && appState.popup && !appState.popup.closed && appState.popup.location.href === "about:blank") {
            appState.popup.location = task.authUrl;
          }

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
          if (task.authUrl && appState.popup && !appState.popup.closed) {
            appState.popup.location = task.authUrl;
          }
          setBusy(false, "等待完成 OAuth 登录...");
          void pollLogin(task.taskId);
        } catch (error) {
          setBusy(false, String(error instanceof Error ? error.message : error));
        }
      }

      refreshButton.addEventListener("click", () => refreshState());
      applyButton.addEventListener("click", applyRecommendedOrder);
      syncButton.addEventListener("click", syncConfig);
      addButton.addEventListener("click", addAccount);
      refreshState();
    </script>
  </body>
</html>`;
}
