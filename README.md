# dsh-plugin-skill-manager

**English** | [简体中文](./README.zh-CN.md)

A DeepSeek Harness (DSH) plugin that adds a **Skills** tab to the web UI conversation view ring (next to *Chat* and *Trajectory*). It lists every available skill with a live search box and a per-skill **enable / disable** switch, plus a bulk **enable-all / disable-all** toggle.

Disabling a skill writes `disable-model-invocation: true` into the skill's `SKILL.md` frontmatter, so the model-facing skill catalog drops it while the user-facing surface keeps it — the skill stays visible in the list and can be re-enabled at any time.

## Features

- 🗂️ **Skills tab** registered into the `conversation.view` slot, alongside Chat and Trajectory
- 🔍 **Search box** filtering by skill name or description
- 🔘 **Bulk switch**: enable or disable every visible skill at once

## How it works

The plugin ships two halves in one npm package:

| Half | Entry | What it does |
|---|---|---|
| Host | `lib/index.js` | Registers `POST /api/skill-manager/toggle` on the DSH web server, locates the skill's `SKILL.md` on disk (project roots first, then user roots), and rewrites its frontmatter |
| Client | `lib/client.js` | Registers the Skills conversation-view tab, renders the list from the `skill.list` RPC, and calls the host route on toggle |

Disabling one skill (`enabled: false`) adds:

```yaml
disable-model-invocation: true
```

to the skill frontmatter. The filesystem skill provider watches the skill roots, so the catalog invalidates automatically after the write — no restart needed for the catalog itself (a restart *is* required after installing or updating the plugin).

## Installation

Requires a DSH profile (the example uses the `web` profile):

```bash
# from the plugin checkout, install into the profile
dsh plugin --profile web add file:./dsh-plugin-skill-manager

# or directly with pnpm
pnpm --dir "$HOME/.dsh/profiles/web" add file:./dsh-plugin-skill-manager
```

Then add the package to the profile's bundle layers. `dsh.profile.bundles` in `~/.dsh/profiles/web/package.json` should include:

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-plugin-marketplace",
        "dsh-plugin-skill-manager"
      ]
    }
  }
}
```

Finally restart DSH and refresh the web UI. A **Skills** tab appears next to Chat and Trajectory.

> Note: `file:` dependencies are copied into the pnpm store. After editing the plugin sources, re-run `pnpm --dir "$HOME/.dsh/profiles/web" remove dsh-plugin-skill-manager && pnpm --dir "$HOME/.dsh/profiles/web" add --force file:./dsh-plugin-skill-manager` and restart DSH.

## Uninstall

```bash
pnpm --dir "$HOME/.dsh/profiles/web" remove dsh-plugin-skill-manager
```

Remove `dsh-plugin-skill-manager` from `dsh.profile.bundles` in `~/.dsh/profiles/web/package.json`, then restart DSH. Skills disabled by the plugin keep their frontmatter; re-enable them with the plugin, or delete the `disable-model-invocation` line manually.

## Development

```bash
# syntax-check both halves
node --check lib/index.js
node --check lib/client.js

# verify the composed profile tree includes the plugin
dsh --profile web --dump-config | grep -A2 skill-manager
```

### Package layout

```
dsh-plugin-skill-manager/
├── package.json        # dsh.bundle.patch + dsh.client declarations
├── cordis.patch.yml    # loader row mounting the host plugin
└── lib/
    ├── index.js        # host half: /api/skill-manager/toggle route
    └── client.js       # client half: Skills tab (__ModuleLoader__ bundle)
```

## License

[MIT](./LICENSE)
