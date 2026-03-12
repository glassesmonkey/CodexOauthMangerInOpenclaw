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

The dashboard auto-detects:

- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/main/agent/auth-profiles.json`

Override when needed:

```bash
node src/index.js --agent main --open
node src/index.js --state-dir /path/to/.openclaw --agent work
node src/index.js --config /path/to/openclaw.json --agent-dir /path/to/agent
```

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
