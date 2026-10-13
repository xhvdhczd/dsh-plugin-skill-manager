# dsh-plugin-skill-manager

**English** | [简体中文](./README.zh-CN.md)

A DeepSeek Harness (DSH) plugin that adds a **Skills** tab to the web UI conversation view ring (next to *Chat* and *Trajectory*). It lists every available skill with a live search box and a per-skill **enable / disable** switch, plus a bulk **enable-all / disable-all** toggle.

Disabling a skill writes `disable-model-invocation: true` into the skill's `SKILL.md` frontmatter, so the model-facing skill catalog drops it while the user-facing surface keeps it — the skill stays visible in the list and can be re-enabled at any time.

## Features

- 🗂️ **Skills tab** registered into the `conversation.view` slot, alongside Chat and Trajectory
- 🔍 **Search box** filtering by skill name or description
- 🔘 **Bulk switch**: enable or disable every visible skill at once
- 🔄 **Live list**: the tab drops the host's cached catalog on open, polls a cheap structure revision every 3 s while visible, and offers a **Reload** button
- 🔒 **Read-only rows**: skills with no writable `SKILL.md` (application-bundled skills such as `office-docx` / `office-pptx` / `office-xlsx`, and runtime-registered skills) render with a *Built-in* badge and no toggle, instead of failing with `skill "…" not found`

## How it works

The plugin ships two halves in one npm package:

| Half | Entry | What it does |
|---|---|---|
| Host | `lib/index.js` | Registers `POST /api/skill-manager/toggle`, `…/packages`, `…/refresh`, and `…/status` on the DSH web server, resolves the skill's `SKILL.md` through the registry and the disk (project roots first, then user roots), rewrites its frontmatter, and watches the user skill roots for new packages |
| Client | `lib/client.js` | Registers the Skills conversation-view tab, renders the list from the `skills.list` RPC, and calls the host routes on toggle, reload, and revision poll |

Disabling one skill (`enabled: false`) adds:

```yaml
disable-model-invocation: true
```

to the skill frontmatter. The filesystem skill provider watches the skill roots, so the catalog invalidates automatically after the write — no restart needed for the catalog itself (a restart *is* required after installing or updating the plugin).

### Why the refresh routes exist

The core filesystem provider discovers one level deep, and this plugin's package
provider only watches containers it already knows, so a package installed as
`<root>/<pkg>/skills/<name>/SKILL.md` *while DSH is running* is observed by
neither watcher and would stay invisible until a restart. The host half
therefore:

1. watches `$DSH_HOME/skills` and `$DSH_AGENTS_HOME/skills` recursively and
   invalidates the registry (plus bumps a revision) after each burst of events
   (400 ms debounce);
2. exposes `POST /api/skill-manager/refresh` to invalidate on demand and
   `POST /api/skill-manager/status` to read the revision; and
3. refuses a toggle it cannot perform with `409 read-only-skill` and an
   explanatory message, which the client turns into a permanent read-only row.

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

### Tests

The three suites import the plugin through the profile's `node_modules`, so copy
them next to the profile and run them from there:

```bash
cp test/*.test.mjs "$HOME/.dsh/profiles/web/"
cd "$HOME/.dsh/profiles/web"
node package-scan.test.mjs         # package containers, ranks, provider roots()/list()
node target-resolution.test.mjs    # writable roots, read-only classification, toggle targets
node client-load.test.mjs          # browser bundle loads and registers the Skills view
```

### Package layout

```
dsh-plugin-skill-manager/
├── package.json        # dsh.bundle.patch + dsh.client declarations
├── cordis.patch.yml    # loader row mounting the host plugin
├── test/               # standalone suites (see Tests)
└── lib/
    ├── index.js        # host half: toggle/packages/refresh/status routes + root watcher
    └── client.js       # client half: Skills tab (__ModuleLoader__ bundle)
```

## Skill packages (two-level layout)

The host half also understands *skill packages*: a skill root may contain
package directories where the level-1 name is the installed skill-package name
and the level-2 `skills` directory holds the skill bundles:

```
~/.dsh/skills/
├── my-package/                       # level 1: skill-package name
│   ├── .claude-plugin/plugin.json    # optional manifest (Claude Code compatible)
│   └── skills/                       # level 2: skills
│       ├── group/                    # optional grouping layer (bounded depth)
│       │   └── some-skill/SKILL.md
│       └── other-skill/SKILL.md
└── flat-skill/SKILL.md               # original flat layout keeps working
```

**Recognition.** A package is identified by its manifest first —
`.claude-plugin/plugin.json` or `dsh-plugin.json` — whose `skills` array is the
authoritative list of skill directories; without a manifest, a package with a
`skills/` subtree is discovered by a bounded walk (depth ≤ `maxNestingDepth`).
Flat `<root>/<skill>/SKILL.md` layouts are untouched.

**Effects.** The host registers a `packages` skill provider (a
`FileSystemSkillProvider` subclass) whose scan roots are the package
containers, ranked `root.rank - packageRankOffset` — packaged skills join the
model catalog and the Skills tab, and win name collisions against flat skills
of the same root. The toggle route locates packaged skills too.

**UI.** The Skills tab groups rows under their package: a collapsible package
header (`mattpocock ▸`) that expands to the package's skills, backed by
`POST /api/skill-manager/packages`; skills outside any package render
ungrouped. Searching auto-expands every group so matches stay visible.

**Config** (cordis plugin config, e.g. via the loader patch row):

| Key | Default | Meaning |
|---|---|---|
| `enablePackages` | `true` | Master switch for package scanning |
| `manifestFiles` | `['.claude-plugin/plugin.json','dsh-plugin.json']` | Manifest file names, in priority order |
| `maxNestingDepth` | `4` | Fallback walk depth under `<pkg>/skills` |
| `packageRankOffset` | `10` | Rank delta so packaged skills beat flat skills of the same root |
| `includeRoots` | `['project-dsh','project-agents','custom','user-dsh','user-agents']` | Which base roots participate |

A DSH restart is required after updating the plugin; the packaged skills then
appear without further setup. The package-scan helpers are exported from
`lib/index.js` and covered by a standalone test (run from the profile dir:
`node skill-pkg-test.mjs`).

## License

[MIT](./LICENSE)
