/**
 * dsh-plugin-skill-manager — host half.
 *
 * A tiny cordis plugin that exposes one custom HTTP route on the DSH web
 * server:
 *
 *   POST /api/skill-manager/toggle  { name, enabled, sessionId? }
 *
 * `enabled: false` writes `disable-model-invocation: true` into the skill's
 * SKILL.md frontmatter, so the model-facing skill catalog drops it while the
 * user-facing surface (and this plugin's UI list) keeps it — the skill can be
 * re-enabled at any time. `enabled: true` removes that line.
 *
 * The skill file is located by scanning the standard skill roots directly on
 * disk (project roots from the session cwd, then the user roots), including
 * *package* layouts — `<root>/<pkg>/skills/...` — where the level-1 directory
 * is an installed skill-package name and the level-2 `skills` directory holds
 * the skill bundles. A package is recognised either by a manifest
 * (`.claude-plugin/plugin.json` or `dsh-plugin.json`, whose `skills` array is
 * the authoritative list) or, without one, by a bounded walk of its `skills/`
 * subtree. The filesystem skill provider watches those roots, so the catalog
 * invalidates automatically after the write.
 *
 * The host half also registers a `packages` skill provider: a
 * `FileSystemSkillProvider` subclass whose `roots()` expands every package
 * container under the project/custom/user roots into scan roots ranked
 * slightly ahead of the same root's flat skills. Packaged skills therefore
 * join the registry (model catalog + UI list) and win name collisions against
 * flat skills of the same root. The core filesystem provider is untouched.
 *
 * Two more routes keep the UI honest about what actually exists right now:
 *
 *   POST /api/skill-manager/refresh  {}
 *   POST /api/skill-manager/status   {}
 *
 * `refresh` drops the registry's collected catalog so the next list re-reads
 * every provider, and `status` reports a monotonic structure revision the
 * browser polls. A package installed *after* startup is not observed by any
 * provider watcher - the core filesystem provider only watches one level deep
 * and the package provider only watches containers it already knows - so a
 * new `<pkg>/skills/<name>/SKILL.md` tree would otherwise stay invisible until
 * a DSH restart. The host half therefore watches the user skill roots itself
 * and bumps that revision (plus invalidating the registry) after each burst of
 * filesystem changes.
 */
import { readFile, writeFile, access, readdir, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { join, dirname, relative, resolve, sep, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { FileSystemSkillProvider } from "@deepseek-ai/dsh-skill-filesystem";

const name = "skill-manager";

/** Services this plugin needs on `ctx` (cordis fiber inject). */
const inject = ["webServer", "sessions", "skills"];

const ROUTE_PATH = "/api/skill-manager/toggle";
const PACKAGES_ROUTE_PATH = "/api/skill-manager/packages";
const REFRESH_ROUTE_PATH = "/api/skill-manager/refresh";
const STATUS_ROUTE_PATH = "/api/skill-manager/status";
const DISABLE_KEY = "disable-model-invocation";
/** Quiet window that collapses one burst of filesystem events into one invalidation. */
const WATCH_DEBOUNCE_MS = 400;

const PACKAGE_DEFAULTS = {
	enablePackages: true,
	manifestFiles: [".claude-plugin/plugin.json", "dsh-plugin.json"],
	maxNestingDepth: 4,
	packageRankOffset: 10,
	includeRoots: ["project-dsh", "project-agents", "custom", "user-dsh", "user-agents"]
};

/** Runtime knobs that are not part of the package scan itself. */
const RUNTIME_DEFAULTS = {
	watchPackageRoots: true
};

/** Merge cordis config over the runtime defaults. */
function runtimeOptions(config = {}) {
	return {
		watchPackageRoots: config.watchPackageRoots ?? RUNTIME_DEFAULTS.watchPackageRoots
	};
}

/** Merge cordis config over the package-scan defaults. */
function packageOptions(config = {}) {
	return {
		enablePackages: config.enablePackages ?? PACKAGE_DEFAULTS.enablePackages,
		manifestFiles: Array.isArray(config.manifestFiles) && config.manifestFiles.length > 0 ? config.manifestFiles : PACKAGE_DEFAULTS.manifestFiles,
		maxNestingDepth: Number.isInteger(config.maxNestingDepth) && config.maxNestingDepth > 0 ? config.maxNestingDepth : PACKAGE_DEFAULTS.maxNestingDepth,
		packageRankOffset: Number.isInteger(config.packageRankOffset) ? config.packageRankOffset : PACKAGE_DEFAULTS.packageRankOffset,
		includeRoots: Array.isArray(config.includeRoots) && config.includeRoots.length > 0 ? config.includeRoots : PACKAGE_DEFAULTS.includeRoots
	};
}

/**
 * Package-aware skill provider.
 *
 * Extends the core filesystem provider so a skill root may contain package
 * directories. Only `roots()` is overridden: it expands each package into its
 * *container roots* (directories whose direct children are skill bundles or
 * flat skill files) and returns those instead of the flat root — everything
 * else (per-root discovery, watchers, frontmatter parsing, load) is inherited.
 */
class PackageSkillProvider extends FileSystemSkillProvider {
	constructor(ctx, control, config = {}) {
		const home = homedir();
		const opts = packageOptions(config);
		super(ctx, control, {
			providerName: "packages",
			dshHome: config.dshHome ?? process.env.DSH_HOME ?? join(home, ".dsh"),
			agentsHome: config.agentsHome ?? process.env.DSH_AGENTS_HOME ?? join(home, ".agents"),
			customSkillDirs: config.customSkillDirs ?? [],
			watch: config.watch ?? true,
			watchUsePolling: config.watchUsePolling ?? false,
			watchStabilityThresholdMs: config.watchStabilityThresholdMs,
			watchPollIntervalMs: config.watchPollIntervalMs,
			watchMaxProjects: config.watchMaxProjects,
			watchFollowSymlinks: config.watchFollowSymlinks ?? true,
			includeDefaultRoots: config.includeDefaultRoots ?? true,
			bundledSkillDir: config.bundledSkillDir ?? (config.includeDefaultRoots === false ? void 0 : process.env.DSH_BUNDLED_SKILL_DIR)
		});
		this.enablePackages = opts.enablePackages;
		this.manifestFiles = opts.manifestFiles;
		this.maxNestingDepth = opts.maxNestingDepth;
		this.packageRankOffset = opts.packageRankOffset;
		this.includeRoots = opts.includeRoots;
	}

	async roots(cwd) {
		if (!this.enablePackages) return [];
		const base = await super.roots(cwd);
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		for (const root of base) {
			if (!this.includeRoots.includes(root.source)) continue;
			const containers = await expandPackageContainers(root, this.manifestFiles, this.maxNestingDepth, this.packageRankOffset, this.ctx);
			for (const container of containers) {
				if (seen.has(container.path)) continue;
				seen.add(container.path);
				out.push(container);
			}
		}
		return out;
	}
}

/**
 * Expand one skill root into the container roots contributed by packages.
 * A package is a level-1 directory under the root. Containers are ranked
 * `root.rank - rankOffset` so packaged skills beat flat skills of the same
 * root (lower rank wins).
 * @param root - base root row ({path, source, rank, projectRoot?}).
 * @param manifestFiles - manifest file names to honour, in priority order.
 * @param maxNestingDepth - fallback walk depth cap under `<pkg>/skills`.
 * @param rankOffset - rank delta applied to every container.
 * @param ctx - optional host context (for warnings).
 * @returns container root rows for the registry watcher/discovery.
 */
async function expandPackageContainers(root, manifestFiles, maxNestingDepth, rankOffset, ctx) {
	const containers = [];
	let entries;
	try {
		entries = await readdir(root.path, { withFileTypes: true });
	} catch {
		return containers;
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (entry.name.startsWith(".") || entry.name === ".system") continue;
		const pkgDir = join(root.path, entry.name);
		const dirs = await packageContainers(pkgDir, manifestFiles, maxNestingDepth, ctx);
		for (const dir of dirs) {
			containers.push({
				path: dir,
				source: root.source,
				rank: root.rank - rankOffset,
				projectRoot: root.projectRoot
			});
		}
	}
	return containers;
}

/**
 * Resolve the skill-container directories of one package directory.
 *
 * Manifest-first: the first manifest file that exists and carries a `skills`
 * array is authoritative. Each string entry is a path relative to the package
 * root; an entry pointing at a skill bundle contributes its parent directory
 * as a container, an entry pointing at a container directory contributes
 * itself. Fallback: a bounded walk of `<pkg>/skills` stops at the first
 * directory whose children look like skill bundles or flat skill files.
 */
async function packageContainers(pkgDir, manifestFiles, maxNestingDepth, ctx) {
	for (const manifestFile of manifestFiles) {
		const manifestPath = join(pkgDir, manifestFile);
		let raw;
		try {
			raw = await readFile(manifestPath, "utf8");
		} catch {
			continue;
		}
		let manifest;
		try {
			manifest = JSON.parse(raw);
		} catch (error) {
			ctx?.logger?.warn?.(`[skill-manager] package manifest ${manifestPath} ignored: invalid JSON: ${String(error)}`);
			continue;
		}
		if (!Array.isArray(manifest.skills)) continue;
		const containers = /* @__PURE__ */ new Set();
		for (const rel of manifest.skills) {
			if (typeof rel !== "string" || rel === "") continue;
			const target = resolve(pkgDir, rel);
			if (await containsSkillFile(target)) {
				containers.add(dirname(target));
			} else if (await isDirectory(target)) {
				containers.add(target);
			} else {
				ctx?.logger?.warn?.(`[skill-manager] manifest entry "${rel}" of package ${pkgDir} skipped: not found`);
			}
		}
		return [...containers];
	}
	const skillsRoot = join(pkgDir, "skills");
	if (!(await isDirectory(skillsRoot))) return [];
	const queue = [{ dir: skillsRoot, depth: 0 }];
	const visited = /* @__PURE__ */ new Set();
	const containers = /* @__PURE__ */ new Set();
	while (queue.length > 0) {
		const { dir, depth } = queue.shift();
		if (visited.has(dir)) continue;
		visited.add(dir);
		if (await isContainer(dir)) {
			containers.add(dir);
			continue;
		}
		if (depth >= maxNestingDepth) continue;
		let children;
		try {
			children = await readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const child of children) {
			if (!child.isDirectory()) continue;
			if (child.name.startsWith(".") || child.name === ".system") continue;
			queue.push({ dir: join(dir, child.name), depth: depth + 1 });
		}
	}
	return [...containers];
}

/** Whether a directory's direct children include a skill (bundle dir or flat .md). */
async function isContainer(dir) {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return false;
	}
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".md")) return true;
		if (entry.isDirectory() && (await containsSkillFile(join(dir, entry.name)))) return true;
	}
	return false;
}

/** Whether a directory holds SKILL.md directly. */
async function containsSkillFile(dir) {
	try {
		await access(join(dir, "SKILL.md"));
		return true;
	} catch {
		return false;
	}
}

/** Directory existence probe. */
async function isDirectory(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Cordis plugin body.
 * @param ctx - host root context.
 * @param config - cordis plugin config (package-scan knobs, see packageOptions).
 */
function apply(ctx, config = {}) {
	const runtime = runtimeOptions(config);
	const state = {
		/** Registry invalidation captured from the package provider's control. */
		invalidate: undefined,
		/** Monotonic structure revision the browser polls. */
		revision: 0,
		/** Pending debounced invalidation timer. */
		timer: undefined
	};
	/** Drop the registry's collected catalog so the next list re-reads every provider. */
	const invalidateCatalog = () => {
		state.revision += 1;
		state.invalidate?.();
	};
	/** Collapse one burst of filesystem events into a single invalidation. */
	const scheduleInvalidation = () => {
		if (state.timer !== undefined) clearTimeout(state.timer);
		state.timer = setTimeout(() => {
			state.timer = undefined;
			invalidateCatalog();
		}, WATCH_DEBOUNCE_MS);
		state.timer.unref?.();
	};
	/** Session cwd for the client's session id, when it supplied one. */
	const sessionCwd = (body) => {
		const sessionId = typeof body?.sessionId === "string" && body.sessionId !== "" ? body.sessionId : undefined;
		if (sessionId === undefined) return undefined;
		return ctx.sessions.get(sessionId)?.header.cwd;
	};

	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: ROUTE_PATH,
			handler: async (req, res) => {
				try {
					const body = await readJson(req);
					const skillName = body?.name;
					const enabled = body?.enabled;
					if (typeof skillName !== "string" || skillName === "" || typeof enabled !== "boolean") {
						return json(res, 400, { ok: false, error: "bad-request", message: "expected { name: string, enabled: boolean }" });
					}
					const cwd = sessionCwd(body);
					const target = await resolveSkillTarget(ctx, skillName, cwd);
					if (target.kind === "missing") {
						return json(res, 404, { ok: false, error: "skill-not-found", message: `skill "${skillName}" not found` });
					}
					if (target.kind === "read-only") {
						const origin = target.path === undefined ? undefined : bundledSkillDirs().find((dir) => isInside(dir, target.path));
						const where = origin !== undefined
							? `is bundled with the application (${origin})`
							: target.path === undefined ? "is supplied by a runtime provider" : `has no writable SKILL.md (${target.path})`;
						return json(res, 409, {
							ok: false,
							error: "read-only-skill",
							message: `skill "${skillName}" ${where} and cannot be toggled here; copy it under ${join(dshHomePath(), "skills")} to own a togglable copy`
						});
					}
					const file = target.file;
					let content;
					try {
						content = await readFile(file, "utf8");
					} catch (error) {
						return json(res, 500, { ok: false, error: "read-failed", message: String(error) });
					}
					const next = setModelInvocable(content, enabled);
					if (next !== content) {
						try {
							await writeFile(file, next, "utf8");
						} catch (error) {
							return json(res, 500, { ok: false, error: "write-failed", message: String(error) });
						}
					}
					// The written frontmatter changes catalog membership; make the
					// next list reflect it even when the watcher has not settled.
					invalidateCatalog();
					return json(res, 200, { ok: true, name: skillName, enabled, file, revision: state.revision });
				} catch (error) {
					ctx.logger?.warn?.(`[skill-manager] toggle failed: ${String(error)}`);
					return json(res, 500, { ok: false, error: "internal", message: String(error) });
				}
			},
		});
		return dispose;
	}, "skill-manager: toggle route");

	// Package catalog route: { name, dir, skills[] } per installed package plus
	// the catalog names this plugin cannot toggle (bundled or runtime skills).
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: PACKAGES_ROUTE_PATH,
			handler: async (req, res) => {
				try {
					const body = await readJson(req);
					const cwd = sessionCwd(body);
					const packages = await listPackages(ctx, cwd);
					const readOnlySkills = await listReadOnlySkills(ctx, cwd);
					return json(res, 200, { ok: true, packages, readOnlySkills });
				} catch (error) {
					ctx.logger?.warn?.(`[skill-manager] packages failed: ${String(error)}`);
					return json(res, 500, { ok: false, error: "internal", message: String(error) });
				}
			},
		});
		return dispose;
	}, "skill-manager: packages route");

	// Explicit catalog refresh: the client calls this before listing so a package
	// installed while the app was running is visible without a restart.
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: REFRESH_ROUTE_PATH,
			handler: async (req, res) => {
				try {
					await readJson(req).catch(() => ({}));
					invalidateCatalog();
					return json(res, 200, { ok: true, revision: state.revision });
				} catch (error) {
					ctx.logger?.warn?.(`[skill-manager] refresh failed: ${String(error)}`);
					return json(res, 500, { ok: false, error: "internal", message: String(error) });
				}
			},
		});
		return dispose;
	}, "skill-manager: refresh route");

	// Cheap structure revision: the browser polls this instead of re-listing.
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: STATUS_ROUTE_PATH,
			handler: async (req, res) => {
				try {
					await readJson(req).catch(() => ({}));
					return json(res, 200, { ok: true, revision: state.revision });
				} catch (error) {
					ctx.logger?.warn?.(`[skill-manager] status failed: ${String(error)}`);
					return json(res, 500, { ok: false, error: "internal", message: String(error) });
				}
			},
		});
		return dispose;
	}, "skill-manager: status route");

	// Package-aware skill provider: packaged skills join the registry (model
	// catalog + UI list). Mirrors the core filesystem provider's wiring: the
	// provider factory, a first-party write/edit fast-path invalidation, and
	// effect-teardown disposal (base constructor also disposes on abort).
	ctx.effect(() => {
		let provider;
		ctx.skills.registerProvider((control) => {
			state.invalidate = () => {
				control.invalidate();
			};
			provider = new PackageSkillProvider(ctx, control, config);
			return provider;
		});
		const onFsObserved = (target, _observation, actor) => {
			if (provider === undefined) return;
			if (actor === undefined || !("name" in actor)) return;
			if (actor.name !== "edit" && actor.name !== "write") return;
			provider.observeHostMutation(target.displayPath);
		};
		ctx.on("fs/observed", onFsObserved);
		return () => {
			ctx.off("fs/observed", onFsObserved);
			state.invalidate = undefined;
			if (provider !== undefined) provider.dispose();
		};
	}, "skill-manager: package skill provider");

	// Structure watcher: no provider observes a package directory that appears
	// after startup, so watch the user roots here and invalidate on change.
	if (runtime.watchPackageRoots) {
		ctx.effect(() => {
			const closers = watchSkillRoots(scheduleInvalidation, ctx);
			return () => {
				for (const close of closers) close();
				if (state.timer !== undefined) {
					clearTimeout(state.timer);
					state.timer = undefined;
				}
			};
		}, "skill-manager: package root watcher");
	}
}

/** Resolved DSH home (`$DSH_HOME` or `~/.dsh`). */
function dshHomePath() {
	return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}

/** Resolved shared agents home (`$DSH_AGENTS_HOME` or `~/.agents`). */
function agentsHomePath() {
	return process.env.DSH_AGENTS_HOME ?? join(homedir(), ".agents");
}

/**
 * Skill roots this plugin may write to: project roots when the session cwd is
 * known, then the two user roots. Deliberately excludes the bundled
 * `$DSH_BUNDLED_SKILL_DIR` / `resources/runtime/office-skills` roots, which
 * belong to the application and are replaced on update.
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns writable root rows in scan order.
 */
async function writableSkillRoots(cwd) {
	const roots = [];
	if (typeof cwd === "string" && cwd !== "") {
		const projectRoot = await findGitAncestor(cwd);
		roots.push({ path: join(projectRoot, ".dsh/skills"), source: "project-dsh" }, { path: join(projectRoot, ".agents/skills"), source: "project-agents" });
	}
	roots.push({ path: join(dshHomePath(), "skills"), source: "user-dsh" }, { path: join(agentsHomePath(), "skills"), source: "user-agents" });
	return roots;
}

/** Application-supplied skill roots, used only to explain a read-only refusal. */
function bundledSkillDirs() {
	const dirs = [];
	const explicit = process.env.DSH_BUNDLED_SKILL_DIR;
	if (typeof explicit === "string" && explicit !== "") dirs.push(resolve(explicit));
	for (const key of ["DSH_PRIMARY_RUNTIME", "DSH_BUNDLED_PRIMARY_RUNTIME"]) {
		const runtimePath = process.env[key];
		if (typeof runtimePath === "string" && runtimePath !== "") dirs.push(resolve(runtimePath, "..", "office-skills"));
	}
	if (typeof process.resourcesPath === "string" && process.resourcesPath !== "") dirs.push(join(process.resourcesPath, "runtime", "office-skills"));
	return dirs;
}

/** Whether `target` is a strict descendant of `root`. */
function isInside(root, target) {
	const rel = relative(resolve(root), resolve(target));
	return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Resolve the SKILL.md a toggle should edit.
 *
 * The registry is asked first, because a summary carries the authoritative
 * path for every writable skill; a skill the registry knows without a path
 * (bundled or runtime-registered) is reported as read-only instead of being
 * reported missing. The disk scan stays as the fallback for a skill the
 * registry has not listed for this cwd.
 * @param ctx - host context carrying the skill registry.
 * @param skillName - kebab-case skill name.
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns `{ kind: "writable", file }`, `{ kind: "read-only", path }`, or `{ kind: "missing" }`.
 */
async function resolveSkillTarget(ctx, skillName, cwd) {
	const known = await registrySummary(ctx, skillName, cwd);
	if (known !== undefined && typeof known.path === "string" && known.path !== "") {
		const file = resolve(known.path);
		if ((await isWritableSkillPath(file, cwd)) && await exists(file)) return { kind: "writable", file };
		return { kind: "read-only", path: file };
	}
	const located = await locateSkillFile(ctx, skillName, cwd);
	if (located !== undefined && await isWritableSkillPath(located, cwd)) return { kind: "writable", file: located };
	if (located !== undefined) return { kind: "read-only", path: located };
	if (known !== undefined) return { kind: "read-only", path: undefined };
	return { kind: "missing" };
}

/** One registry summary by name, or undefined when the registry cannot answer. */
async function registrySummary(ctx, skillName, cwd) {
	if (typeof ctx?.skills?.list !== "function") return undefined;
	try {
		const skills = await ctx.skills.list({ cwd });
		return skills.find((skill) => skill.name === skillName);
	} catch {
		return undefined;
	}
}

/** Whether a SKILL.md path sits under a root this plugin owns. */
async function isWritableSkillPath(file, cwd) {
	const roots = await writableSkillRoots(cwd);
	return roots.some((root) => isInside(root.path, file));
}

/**
 * Catalog names this plugin must not offer a toggle for: anything the registry
 * lists without a writable SKILL.md behind it (application-bundled skills such
 * as the office set, and runtime-registered skills).
 * @param ctx - host context carrying the skill registry.
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns sorted read-only skill names; empty when the registry cannot answer.
 */
async function listReadOnlySkills(ctx, cwd) {
	if (typeof ctx?.skills?.list !== "function") return [];
	let skills;
	try {
		skills = await ctx.skills.list({ cwd });
	} catch {
		return [];
	}
	const readOnly = [];
	for (const skill of skills) {
		if (typeof skill?.name !== "string") continue;
		const path = typeof skill.path === "string" && skill.path !== "" ? resolve(skill.path) : undefined;
		const writable = path !== undefined && await isWritableSkillPath(path, cwd) && await exists(path);
		if (!writable) readOnly.push(skill.name);
	}
	return readOnly.sort();
}

/**
 * Watch the user skill roots so a package installed while the app is running
 * becomes visible. Native recursive watching is used (Windows and macOS support
 * it); events are coalesced by the caller.
 * @param notify - called for every filesystem event batch.
 * @param ctx - host context for warnings.
 * @returns disposers, one per attached watcher.
 */
function watchSkillRoots(notify, ctx) {
	const closers = [];
	for (const path of [join(dshHomePath(), "skills"), join(agentsHomePath(), "skills")]) {
		let watcher;
		try {
			watcher = watch(path, { recursive: true, persistent: true }, () => notify());
		} catch (error) {
			ctx?.logger?.warn?.(`[skill-manager] cannot watch ${path}: ${String(error)}`);
			continue;
		}
		watcher.on("error", (error) => ctx?.logger?.warn?.(`[skill-manager] watch error on ${path}: ${String(error)}`));
		closers.push(() => {
			try {
				watcher.close();
			} catch {
				// Already closed; nothing to release.
			}
		});
	}
	return closers;
}

/**
 * Locate the editable skill file on disk across the standard skill roots,
 * flat entries first and package containers second.
 * Project roots are resolved from the session cwd (nearest `.git` ancestor);
 * the user roots always participate.
 * @param ctx - host context (unused today, kept for future root sources).
 * @param skillName - kebab-case skill name.
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns the absolute SKILL.md path, or undefined when no root holds it.
 */
async function locateSkillFile(ctx, skillName, cwd) {
	const roots = await writableSkillRoots(cwd);
	const opts = packageOptions();
	for (const root of roots) {
		const found = await findSkillInRoot(root, skillName, opts);
		if (found !== undefined) return found;
	}
	return undefined;
}

/** Flat entries first, then package containers, inside one skill root. */
async function findSkillInRoot(root, skillName, opts) {
	for (const rel of [join(skillName, "SKILL.md"), `${skillName}.md`]) {
		const candidate = join(root.path, rel);
		if (await exists(candidate)) return candidate;
	}
	if (!opts.enablePackages) return undefined;
	const containers = await expandPackageContainers(root, opts.manifestFiles, opts.maxNestingDepth, 0, void 0);
	for (const container of containers) {
		for (const rel of [join(skillName, "SKILL.md"), `${skillName}.md`]) {
			const candidate = join(container.path, rel);
			if (await exists(candidate)) return candidate;
		}
	}
	return undefined;
}

/**
 * Enumerate installed skill packages across the standard skill roots and the
 * skill names each package provides, using the same package-recognition rules
 * as the provider (manifest-first, `skills/` fallback). Project roots are
 * resolved from the session cwd; the user roots always participate.
 * @param ctx - host context (for warnings).
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns [{ name, dir, skills }] sorted by package name.
 */
async function listPackages(ctx, cwd) {
	const roots = await writableSkillRoots(cwd);
	const opts = packageOptions();
	const byDir = /* @__PURE__ */ new Map();
	for (const root of roots) {
		const containers = await expandPackageContainers(root, opts.manifestFiles, opts.maxNestingDepth, 0, ctx);
		for (const container of containers) {
			const segments = relative(root.path, container.path).split(sep);
			const pkgName = segments[0];
			if (pkgName === undefined || pkgName === "") continue;
			const pkgDir = join(root.path, pkgName);
			let entry = byDir.get(pkgDir);
			if (entry === undefined) {
				entry = { name: pkgName, dir: pkgDir, skills: /* @__PURE__ */ new Set() };
				byDir.set(pkgDir, entry);
			}
			for (const skillName of await listContainerSkills(container.path)) entry.skills.add(skillName);
		}
	}
	return [...byDir.values()]
		.map((entry) => ({ name: entry.name, dir: entry.dir, skills: [...entry.skills].sort() }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/** Skill names directly inside one container directory (bundle dirs + flat .md files). */
async function listContainerSkills(container) {
	const names = [];
	let entries;
	try {
		entries = await readdir(container, { withFileTypes: true });
	} catch {
		return names;
	}
	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (await containsSkillFile(join(container, entry.name))) names.push(entry.name);
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			names.push(entry.name.slice(0, -3));
		}
	}
	return names;
}

/** Nearest ancestor holding a `.git` directory; falls back to the cwd itself. */
async function findGitAncestor(cwd) {
	let current = resolve(cwd);
	while (true) {
		if (await exists(join(current, ".git"))) return current;
		const parent = dirname(current);
		if (parent === current) return cwd;
		current = parent;
	}
}

/**
 * Toggle the `disable-model-invocation` frontmatter key of a SKILL.md body.
 * Preserves every other frontmatter line, the separator style, and the body
 * verbatim.
 * @param content - current file content.
 * @param enabled - true removes the key; false adds `disable-model-invocation: true`.
 * @returns the next content (identical when no change is needed).
 */
function setModelInvocable(content, enabled) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
	const sep = content.includes("\r\n") ? "\r\n" : "\n";
	if (match === null) {
		if (enabled) return content;
		return `---${sep}${DISABLE_KEY}: true${sep}---${sep}${sep}${content}`;
	}
	const kept = match[1].split(/\r?\n/).filter((line) => !/^\s*disable-model-invocation\s*:\s*/.test(line));
	if (!enabled) kept.push(`${DISABLE_KEY}: true`);
	const rest = content.slice(match[0].length);
	return `---${sep}${kept.join(sep)}${sep}---${sep}${rest}`;
}

/** Read a small JSON request body. */
function readJson(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => {
			try {
				resolve(data.length === 0 ? {} : JSON.parse(data));
			} catch (error) {
				reject(error);
			}
		});
		req.on("error", reject);
	});
}

/** Write a JSON response. */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** Path existence probe. */
function exists(path) {
	return access(path).then(() => true, () => false);
}

export { PackageSkillProvider, apply, bundledSkillDirs, expandPackageContainers, findSkillInRoot, inject, isWritableSkillPath, listPackages, listReadOnlySkills, locateSkillFile, name, packageContainers, resolveSkillTarget, runtimeOptions, setModelInvocable, watchSkillRoots, writableSkillRoots };
