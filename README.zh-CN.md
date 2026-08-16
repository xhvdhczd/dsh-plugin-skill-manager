# dsh-plugin-skill-manager

[English](./README.md) | **简体中文**

一个 DeepSeek Harness (DSH) 插件，在 Web UI 的对话视图环（*对话* 与 *轨迹* 旁边）新增一个 **技能** 标签页。它列出所有可用技能，带实时搜索框、单个技能的 **启用 / 停用** 开关，以及一键 **全部启用 / 全部停用** 按钮。

停用某个技能时，会在该技能的 `SKILL.md` frontmatter 中写入 `disable-model-invocation: true`，使模型侧技能目录不再包含它，但用户侧界面仍保留——技能始终在列表中可见，可随时重新启用。

## 功能特性

- 🗂️ **技能标签页**：注册到 `conversation.view` 插槽，与"对话"和"轨迹"并列
- 🔍 **搜索框**：按技能名称或描述实时过滤
- ⚡ **单技能开关**：乐观 UI 更新（无需点两次）
- 🔘 **批量开关**：一键启用或停用当前可见的所有技能
- 🌐 **双语界面**（简体中文 / English），跟随宿主语言环境

## 工作原理

插件在一个 npm 包内包含两个部分：

| 部分 | 入口 | 作用 |
|---|---|---|
| 宿主侧 | `lib/index.js` | 在 DSH Web 服务器上注册 `POST /api/skill-manager/toggle` 路由，在磁盘上定位技能的 `SKILL.md`（先项目根、后用户根），并改写其 frontmatter |
| 客户端 | `lib/client.js` | 注册"技能"对话视图标签页，通过 `skill.list` RPC 渲染列表，切换时调用宿主路由 |

停用某个技能（`enabled: false`）会在技能 frontmatter 中加入：

```yaml
disable-model-invocation: true
```

文件系统技能提供方会监视技能目录，写入后目录自动失效刷新——目录本身无需重启（但**安装或更新插件后需要重启 DSH**）。

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

### 包结构

```
dsh-plugin-skill-manager/
├── package.json        # dsh.bundle.patch + dsh.client 声明
├── cordis.patch.yml    # 挂载宿主插件的 loader 条目
└── lib/
    ├── index.js        # 宿主侧：/api/skill-manager/toggle 路由
    └── client.js       # 客户端侧：技能标签页（__ModuleLoader__ bundle）
```

## 许可证

[MIT](./LICENSE)
