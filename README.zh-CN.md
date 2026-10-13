# dsh-plugin-skill-manager

[English](./README.md) | **简体中文**

一个 DeepSeek Harness (DSH) 插件，在 Web UI 的对话视图环（*对话* 与 *轨迹* 旁边）新增一个 **技能** 标签页。它列出所有可用技能，带实时搜索框、单个技能的 **启用 / 停用** 开关，以及一键 **全部启用 / 全部停用** 按钮。

停用某个技能时，会在该技能的 `SKILL.md` frontmatter 中写入 `disable-model-invocation: true`，使模型侧技能目录不再包含它，但用户侧界面仍保留——技能始终在列表中可见，可随时重新启用。

## 功能特性

- 🗂️ **技能标签页**：注册到 `conversation.view` 插槽，与"对话"和"轨迹"并列
- 🔍 **搜索框**：按技能名称或描述实时过滤
- 🔘 **批量开关**：一键启用或停用当前可见的所有技能
- 🔄 **列表实时刷新**：打开标签页时先让宿主丢弃已缓存的技能目录，可见期间每 3 秒轮询一次轻量的结构版本号，并提供 **刷新** 按钮
- 🔒 **只读技能**：没有可写 `SKILL.md` 的技能（应用内置的 `office-docx` / `office-pptx` / `office-xlsx`，以及运行时注册的技能）显示为 *内置* 标记且不提供开关，不再报 `skill "…" not found`

## 工作原理

插件在一个 npm 包内包含两个部分：

| 部分 | 入口 | 作用 |
|---|---|---|
| 宿主侧 | `lib/index.js` | 在 DSH Web 服务器上注册 `POST /api/skill-manager/toggle`、`…/packages`、`…/refresh`、`…/status` 路由；先经技能注册表、再扫描磁盘定位 `SKILL.md`（先项目根、后用户根）并改写其 frontmatter；同时监视用户技能根目录 |
| 客户端 | `lib/client.js` | 注册"技能"对话视图标签页，通过 `skills.list` RPC 渲染列表，并在切换、刷新、版本轮询时调用宿主路由 |

停用某个技能（`enabled: false`）会在技能 frontmatter 中加入：

```yaml
disable-model-invocation: true
```

文件系统技能提供方会监视技能目录，写入后目录自动失效刷新——目录本身无需重启（但**安装或更新插件后需要重启 DSH**）。

### 为什么需要刷新路由

核心文件系统提供方只扫描一层目录，而本插件的包提供方只监视它已知的容器目录，因此**在 DSH 运行期间**新装成 `<root>/<包名>/skills/<技能名>/SKILL.md` 的包不会被任何一侧的监视器看到，必须重启才会出现。为此宿主侧：

1. 递归监视 `$DSH_HOME/skills` 与 `$DSH_AGENTS_HOME/skills`，每批文件事件（400 ms 去抖）后使技能注册表缓存失效并递增版本号；
2. 提供 `POST /api/skill-manager/refresh`（按需失效）与 `POST /api/skill-manager/status`（读取版本号）；
3. 对无法执行的开关返回 `409 read-only-skill` 并附带说明，客户端据此把该行永久渲染为只读。

## 安装

需要 DSH profile（示例使用 `web` profile）：

```bash
# 从插件目录安装到 profile
dsh plugin --profile web add file:./dsh-plugin-skill-manager

# 或直接用 pnpm
pnpm --dir "$HOME/.dsh/profiles/web" add file:./dsh-plugin-skill-manager
```

然后将该包加入 profile 的 bundle 层。`~/.dsh/profiles/web/package.json` 中的 `dsh.profile.bundles` 应包含：

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

最后重启 DSH 并刷新 Web UI，*对话* 和 *轨迹* 旁边就会出现 **技能** 标签页。

> 注意：`file:` 依赖会被复制到 pnpm store。修改插件源码后，需重新执行 `pnpm --dir "$HOME/.dsh/profiles/web" remove dsh-plugin-skill-manager && pnpm --dir "$HOME/.dsh/profiles/web" add --force file:./dsh-plugin-skill-manager`，然后重启 DSH。

## 卸载

```bash
pnpm --dir "$HOME/.dsh/profiles/web" remove dsh-plugin-skill-manager
```

同时从 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 中移除 `dsh-plugin-skill-manager`，然后重启 DSH。被插件停用的技能会保留其 frontmatter；可用插件重新启用，或手动删除 `disable-model-invocation` 行。

## 开发

```bash
# 语法检查两个部分
node --check lib/index.js
node --check lib/client.js

# 验证组合后的 profile 树包含插件
dsh --profile web --dump-config | grep -A2 skill-manager
```

### 测试

三个测试套件都通过 profile 的 `node_modules` 导入插件，因此先复制到 profile 目录再运行：

```bash
cp test/*.test.mjs "$HOME/.dsh/profiles/web/"
cd "$HOME/.dsh/profiles/web"
node package-scan.test.mjs         # 包容器、rank、provider roots()/list()
node target-resolution.test.mjs    # 可写根、只读判定、toggle 目标解析
node client-load.test.mjs          # 浏览器 bundle 加载并注册技能视图
```

### 包结构

```
dsh-plugin-skill-manager/
├── package.json        # dsh.bundle.patch + dsh.client 声明
├── cordis.patch.yml    # 挂载宿主插件的 loader 条目
├── test/               # 独立测试套件（见上）
└── lib/
    ├── index.js        # 宿主侧：toggle/packages/refresh/status 路由 + 根目录监视
    └── client.js       # 客户端侧：技能标签页（__ModuleLoader__ bundle）
```

## 技能包（二级目录布局）

宿主侧同时支持 *技能包*：技能根目录下可以包含包目录——一级目录为安装技能时的技能包名称，二级目录 `skills` 存放技能束：

```
~/.dsh/skills/
├── my-package/                       # 一级：技能包名称
│   ├── .claude-plugin/plugin.json    # 可选清单（兼容 Claude Code）
│   └── skills/                       # 二级：skills
│       ├── group/                    # 可选分组层（深度受 maxNestingDepth 限制）
│       │   └── some-skill/SKILL.md
│       └── other-skill/SKILL.md
└── flat-skill/SKILL.md               # 原有扁平布局保持不变
```

**识别规则。** 优先按清单识别包——`.claude-plugin/plugin.json` 或
`dsh-plugin.json` 的 `skills` 数组是权威的技能目录清单；无清单时，含
`skills/` 子树的包按有界遍历发现（深度 ≤ `maxNestingDepth`）。原有
`<根>/<skill>/SKILL.md` 扁平布局不受影响。

**效果。** 宿主注册一个 `packages` 技能 provider（`FileSystemSkillProvider`
子类），其扫描根为各包容器，rank = 所在根 − `packageRankOffset`——包内技能
进入模型目录和技能标签页，并与同根扁平技能重名时优先。toggle 路由同样
支持定位包内技能。

**UI。** 技能标签页按包分组展示：可折叠的包分组头（`mattpocock ▸`），点击
展开该包全部技能，数据来自 `POST /api/skill-manager/packages`；未归属任何包
的技能平铺显示。搜索时自动展开所有分组，保证命中项可见。

**配置**（cordis 插件配置，例如在 loader patch 条目中）：

| 键 | 默认 | 含义 |
|---|---|---|
| `enablePackages` | `true` | 包扫描总开关 |
| `manifestFiles` | `['.claude-plugin/plugin.json','dsh-plugin.json']` | 清单文件名（按优先级） |
| `maxNestingDepth` | `4` | `<pkg>/skills` 下兜底遍历深度上限 |
| `packageRankOffset` | `10` | rank 偏移，使包内技能优先于同根扁平技能 |
| `includeRoots` | `['project-dsh','project-agents','custom','user-dsh','user-agents']` | 参与包展开的基础根 |

更新插件后需重启 DSH，包内技能即可出现，无需额外设置。包扫描辅助函数从
`lib/index.js` 导出，并有独立测试覆盖（在 profile 目录执行：
`node skill-pkg-test.mjs`）。

## 许可证

[MIT](./LICENSE)
