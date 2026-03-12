import http from "node:http";
import { LoginManager, applyOrder, loadDashboardState, renameProfile, syncConfig } from "./state.js";
import { renderHtml } from "./ui.js";

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendHtml(response, html) {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(html);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

export async function startDashboardServer(options = {}) {
  const html = renderHtml();
  const loginManager = new LoginManager();

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/") {
        sendHtml(response, html);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/state") {
        sendJson(response, 200, await loadDashboardState(options));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/apply-order") {
        const body = await readBody(request);
        const order = Array.isArray(body.order) ? body.order.filter((entry) => typeof entry === "string") : [];
        sendJson(response, 200, await applyOrder(options, order));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/sync-config") {
        sendJson(response, 200, await syncConfig(options));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/rename-profile") {
        const body = await readBody(request);
        const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
        const nextProfileId = typeof body.nextProfileId === "string" ? body.nextProfileId.trim() : "";
        if (!profileId || !nextProfileId) {
          sendJson(response, 400, { error: "Both profileId and nextProfileId are required." });
          return;
        }
        sendJson(response, 200, await renameProfile(options, profileId, nextProfileId));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/login/start") {
        const body = await readBody(request);
        const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
        if (!profileId) {
          sendJson(response, 400, { error: "profileId is required." });
          return;
        }
        const task = loginManager.start(options, profileId);
        // Give onAuth a brief chance to populate the URL before responding.
        await new Promise((resolve) => setTimeout(resolve, 150));
        sendJson(response, 200, loginManager.getTask(task.taskId) || task);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/login-status") {
        const taskId = url.searchParams.get("taskId") || "";
        const task = loginManager.getTask(taskId);
        if (!task) {
          sendJson(response, 404, { error: "Login task not found." });
          return;
        }
        sendJson(response, 200, task);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/login/manual-code") {
        const body = await readBody(request);
        const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
        const code = typeof body.code === "string" ? body.code.trim() : "";
        sendJson(response, 200, loginManager.submitManualCode(taskId, code));
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port || 0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve listening address.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}
