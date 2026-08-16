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
 * disk (project roots from the session cwd, then the user roots), rather than
 * through `ctx.skills.get()` — the registry can resolve to a different layer
 * than the one the browser catalog lists, and the file is the source of truth
 * anyway. The filesystem skill provider watches those roots, so the catalog
 * invalidates automatically after the write.
 */
import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";

const name = "skill-manager";

/** Services this plugin needs on `ctx` (cordis fiber inject). */
const inject = ["webServer", "sessions"];

const ROUTE_PATH = "/api/skill-manager/toggle";
const DISABLE_KEY = "disable-model-invocation";

/**
 * Cordis plugin body.
 * @param ctx - host root context.
 */
function apply(ctx) {
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: ROUTE_PATH,
			handler: async (req, res) => {
				try {
					const body = await readJson(req);
					const skillName = body?.name;
					const enabled = body?.enabled;
					const sessionId = typeof body?.sessionId === "string" && body.sessionId !== "" ? body.sessionId : undefined;
					if (typeof skillName !== "string" || skillName === "" || typeof enabled !== "boolean") {
						return json(res, 400, { ok: false, error: "bad-request", message: "expected { name: string, enabled: boolean }" });
					}
					let cwd;
					if (sessionId !== undefined) {
						const session = ctx.sessions.get(sessionId);
						cwd = session?.header.cwd;
					}
					const file = await locateSkillFile(ctx, skillName, cwd);
					if (file === undefined) {
						return json(res, 404, { ok: false, error: "skill-not-found", message: `skill "${skillName}" not found` });
					}
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
					return json(res, 200, { ok: true, name: skillName, enabled, file });
				} catch (error) {
					ctx.logger?.warn?.(`[skill-manager] toggle failed: ${String(error)}`);
					return json(res, 500, { ok: false, error: "internal", message: String(error) });
				}
			},
		});
		return dispose;
	}, "skill-manager: toggle route");
}

/**
 * Locate the editable skill file on disk across the standard skill roots.
 * Project roots are resolved from the session cwd (nearest `.git` ancestor);
 * the user roots always participate.
 * @param ctx - host context (unused today, kept for future root sources).
 * @param skillName - kebab-case skill name.
 * @param cwd - session project cwd, when the client supplied a session id.
 * @returns the absolute SKILL.md path, or undefined when no root holds it.
 */
async function locateSkillFile(ctx, skillName, cwd) {
	const home = homedir();
	const dshHome = process.env.DSH_HOME ?? join(home, ".dsh");
	const agentsHome = process.env.DSH_AGENTS_HOME ?? join(home, ".agents");
	const roots = [];
	if (typeof cwd === "string" && cwd !== "") {
		const projectRoot = await findGitAncestor(cwd);
		roots.push(join(projectRoot, ".dsh/skills"), join(projectRoot, ".agents/skills"));
	}
	roots.push(join(dshHome, "skills"), join(agentsHome, "skills"));
	for (const root of roots) {
		for (const rel of [join(skillName, "SKILL.md"), `${skillName}.md`]) {
			const candidate = join(root, rel);
			if (await exists(candidate)) return candidate;
		}
	}
	return undefined;
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

export { apply, inject, name };
