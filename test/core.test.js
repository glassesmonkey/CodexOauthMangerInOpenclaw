import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { applyOrderToAuthStore, renameProfileInAuthStore } from "../src/auth-store.js";
import { syncCodexIntoConfig } from "../src/config-store.js";
import { openBrowser, parseArgs } from "../src/index.js";
import { recommendProfileOrder } from "../src/order.js";

test("recommendProfileOrder prefers earlier secondary reset time", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 1,
      primary: { remainingPercent: 90, resetAt: 200 },
      secondary: { remainingPercent: 40, resetAt: 350 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 0,
      primary: { remainingPercent: 55, resetAt: 150 },
      secondary: { remainingPercent: 95, resetAt: 500 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:alpha", "openai-codex:beta"]);
});

test("recommendProfileOrder uses secondary remaining percent when resets match", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:alpha",
      currentOrderIndex: 1,
      primary: { remainingPercent: 90, resetAt: 200 },
      secondary: { remainingPercent: 40, resetAt: 400 },
      error: null,
    },
    {
      profileId: "openai-codex:beta",
      currentOrderIndex: 0,
      primary: { remainingPercent: 55, resetAt: 150 },
      secondary: { remainingPercent: 95, resetAt: 400 },
      error: null,
    },
  ]);

  assert.deepEqual(order, ["openai-codex:beta", "openai-codex:alpha"]);
});

test("recommendProfileOrder pushes errors to the end", () => {
  const order = recommendProfileOrder([
    {
      profileId: "openai-codex:ok",
      currentOrderIndex: 0,
      primary: { remainingPercent: 80, resetAt: 200 },
      secondary: { remainingPercent: 80, resetAt: 300 },
      error: null,
    },
    {
      profileId: "openai-codex:bad",
      currentOrderIndex: 1,
      primary: { remainingPercent: null, resetAt: null },
      secondary: { remainingPercent: null, resetAt: null },
      error: "Token expired",
    },
  ]);

  assert.deepEqual(order, ["openai-codex:ok", "openai-codex:bad"]);
});

test("renameProfileInAuthStore updates related references", () => {
  const store = {
    version: 1,
    profiles: {
      "openai-codex:default": {
        type: "oauth",
        provider: "openai-codex",
        access: "access",
        refresh: "refresh",
        expires: Date.now() + 1000,
      },
    },
    order: {
      "openai-codex": ["openai-codex:default"],
    },
    lastGood: {
      "openai-codex": "openai-codex:default",
    },
    usageStats: {
      "openai-codex:default": { lastUsed: 1 },
    },
  };

  const renamed = renameProfileInAuthStore(store, "openai-codex:default", "openai-codex:work");

  assert.equal(renamed.profiles["openai-codex:default"], undefined);
  assert.ok(renamed.profiles["openai-codex:work"]);
  assert.deepEqual(renamed.order["openai-codex"], ["openai-codex:work"]);
  assert.equal(renamed.lastGood["openai-codex"], "openai-codex:work");
  assert.deepEqual(renamed.usageStats["openai-codex:work"], { lastUsed: 1 });
});

test("applyOrderToAuthStore de-duplicates order values", () => {
  const store = {
    version: 1,
    profiles: {},
  };
  const updated = applyOrderToAuthStore(store, [
    "openai-codex:b",
    "openai-codex:a",
    "openai-codex:b",
  ]);

  assert.deepEqual(updated.order["openai-codex"], ["openai-codex:b", "openai-codex:a"]);
});

test("syncCodexIntoConfig adds missing profiles and order entries", () => {
  const config = {
    auth: {
      profiles: {
        "openai-codex:work": {
          provider: "openai-codex",
          mode: "oauth",
        },
      },
      order: {
        "openai-codex": ["openai-codex:work"],
      },
    },
  };

  const synced = syncCodexIntoConfig(
    config,
    ["openai-codex:work", "openai-codex:personal"],
    ["openai-codex:personal", "openai-codex:work"],
  );

  assert.deepEqual(synced.auth.profiles["openai-codex:personal"], {
    provider: "openai-codex",
    mode: "oauth",
  });
  assert.deepEqual(synced.auth.order["openai-codex"], [
    "openai-codex:work",
    "openai-codex:personal",
  ]);
});

test("openBrowser tolerates missing open command", async () => {
  const warnings = [];

  await openBrowser("http://127.0.0.1:3000", {
    logger: {
      warn(message) {
        warnings.push(message);
      },
    },
    spawn() {
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => {
        const error = new Error("spawn xdg-open ENOENT");
        error.code = "ENOENT";
        child.emit("error", error);
      });
      return child;
    },
  });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Could not open browser automatically/);
  assert.match(warnings[0], /ENOENT/);
});

test("parseArgs defaults to port 3001", () => {
  const args = parseArgs(["node", "src/index.js"]);

  assert.equal(args.port, 3001);
  assert.equal(args.open, false);
});

test("parseArgs accepts explicit port override", () => {
  const args = parseArgs(["node", "src/index.js", "--port", "3100", "--open"]);

  assert.equal(args.port, 3100);
  assert.equal(args.open, true);
});
