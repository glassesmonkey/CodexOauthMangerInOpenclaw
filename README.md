# CodexOauthMangerInOpenclaw

## Codex Auth Dashboard

A standalone local dashboard for managing `openai-codex` profiles stored in OpenClaw's JSON files.

## What it does

- Reads `auth-profiles.json` and `openclaw.json`
- Shows 5h / 7d Codex usage and reset times
- Recommends and writes `auth-profiles.json.order["openai-codex"]`
- Renames Codex profiles
- Adds new Codex OAuth accounts with a custom profile name
- Fills missing `openclaw.json.auth.profiles` and `openclaw.json.auth.order`

## Requirements

- Node 22.12+
- Existing OpenClaw state files, typically under `~/.openclaw`

## Run

```bash
npm install
npm run dev
```

By default the dashboard listens on `http://127.0.0.1:3001`.

The dashboard auto-detects:

- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/main/agent/auth-profiles.json` as the primary runtime file

When rebuilding or exporting runtime projections, the dashboard now syncs `auth-profiles.json`
across every existing agent under `~/.openclaw/agents/*/agent/`.
At the same time it clears auto-selected `openai-codex` session overrides in each synced
agent's `sessions/sessions.json`, while leaving session transcript `.jsonl` files untouched.

Override when needed:

```bash
node src/index.js --agent main --open
node src/index.js --state-dir /path/to/.openclaw --agent work
node src/index.js --config /path/to/openclaw.json --agent-dir /path/to/agent
node src/index.js --port 3100
```

## Usage request proxy

The dashboard can route the Codex usage request through a proxy from the UI:

- Toggle "获取额度时通过代理"
- Optionally set a custom proxy URL
- Leave the proxy URL empty to fall back to `HTTPS_PROXY` / `HTTP_PROXY`

## Copy to another machine

Copy this whole directory:

```bash
rsync -av codex-auth-dashboard user@host:~/tools/
```

On the target machine:

```bash
cd ~/tools/codex-auth-dashboard
npm install
npm start
```
