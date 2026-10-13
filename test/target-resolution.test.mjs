/**
 * Standalone test for the toggle-target resolution added to
 * dsh-plugin-skill-manager. Run from the web profile directory so the import
 * resolves @deepseek-ai/dsh-skill-filesystem via the profile node_modules:
 *
 *   copy test\target-resolution.test.mjs C:\Users\1\.dsh\profiles\<profile>\
 *   cd C:\Users\1\.dsh\profiles\<profile>
 *   node target-resolution.test.mjs
 *
 * Covers:
 * - writableSkillRoots() ordering and DSH_HOME / DSH_AGENTS_HOME resolution
 * - isWritableSkillPath() boundary checks (bundled and outside roots are not writable)
 * - listReadOnlySkills() classification from a registry without a path
 * - resolveSkillTarget() registry-first, disk-scan fallback, read-only, missing
 * - setModelInvocable() round-trip
 */
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	isWritableSkillPath,
	listReadOnlySkills,
	resolveSkillTarget,
	runtimeOptions,
	setModelInvocable,
	writableSkillRoots
} from "./node_modules/dsh-plugin-skill-manager/lib/index.js";

const FRONT = (name) => `---\nname: ${name}\ndescription: test skill ${name}\n---\n\n# ${name}\n\nbody\n`;

let failures = 0;
function check(label, cond, extra) {
	if (cond) {
		console.log("  ok   " + label);
	} else {
		failures += 1;
		console.log("  FAIL " + label + (extra === undefined ? "" : " :: " + extra));
	}
}

// ---- fixture ----
const base = await mkdtemp(join(tmpdir(), "skilltarget-"));
const dshHome = join(base, "dsh");
const agentsHome = join(base, "agents");
process.env.DSH_HOME = dshHome;
process.env.DSH_AGENTS_HOME = agentsHome;
delete process.env.DSH_BUNDLED_SKILL_DIR;

const pkgSkill = join(dshHome, "skills", "pkgA", "skills", "alpha", "SKILL.md");
const flatSkill = join(dshHome, "skills", "beta", "SKILL.md");
const agentsSkill = join(agentsHome, "skills", "gamma", "SKILL.md");
const bundledSkill = join(base, "runtime", "office-skills", "office-xlsx", "SKILL.md");
for (const file of [pkgSkill, flatSkill, agentsSkill, bundledSkill]) {
	await mkdir(join(file, ".."), { recursive: true });
	await writeFile(file, FRONT("x"));
}

const registryEntry = (name, path) => (path === undefined ? { name, description: name } : { name, description: name, path });
const ctxWith = (skills) => ({ skills: { list: async () => skills } });

// ---- roots ----
console.log("writableSkillRoots()");
const roots = await writableSkillRoots(undefined);
check("user-dsh then user-agents", roots.map((r) => r.source).join(",") === "user-dsh,user-agents", roots.map((r) => r.source).join(","));
check("dshHome from env", roots[0].path === join(dshHome, "skills"), roots[0].path);

console.log("isWritableSkillPath()");
check("package skill is writable", await isWritableSkillPath(pkgSkill, undefined));
check("agents skill is writable", await isWritableSkillPath(agentsSkill, undefined));
check("bundled skill is read-only", (await isWritableSkillPath(bundledSkill, undefined)) === false);
check("sibling prefix is not inside", (await isWritableSkillPath(join(dshHome, "skills-other", "x", "SKILL.md"), undefined)) === false);

// ---- registry classification ----
console.log("listReadOnlySkills()");
const readOnly = await listReadOnlySkills(ctxWith([
	registryEntry("alpha", pkgSkill),
	registryEntry("office-xlsx"),
	registryEntry("gamma", agentsSkill)
]), undefined);
check("bundled name is read-only", readOnly.includes("office-xlsx"), JSON.stringify(readOnly));
check("writable names are not read-only", !readOnly.includes("alpha") && !readOnly.includes("gamma"), JSON.stringify(readOnly));
check("no registry -> empty", (await listReadOnlySkills({}, undefined)).length === 0);

// ---- target resolution ----
console.log("resolveSkillTarget()");
const writable = await resolveSkillTarget(ctxWith([registryEntry("alpha", pkgSkill)]), "alpha", undefined);
check("registry path wins", writable.kind === "writable" && writable.file === pkgSkill, JSON.stringify(writable));

const bundled = await resolveSkillTarget(ctxWith([registryEntry("office-xlsx")]), "office-xlsx", undefined);
check("registry name without path is read-only", bundled.kind === "read-only", JSON.stringify(bundled));

const scanned = await resolveSkillTarget({ skills: { list: async () => { throw new Error("registry down"); } } }, "beta", undefined);
check("disk-scan fallback finds a flat skill", scanned.kind === "writable" && scanned.file === flatSkill, JSON.stringify(scanned));

const missing = await resolveSkillTarget(ctxWith([]), "nope", undefined);
check("unknown name is missing", missing.kind === "missing", JSON.stringify(missing));

const stalePath = await resolveSkillTarget(ctxWith([registryEntry("alpha", join(dshHome, "skills", "pkgA", "skills", "gone", "SKILL.md"))]), "alpha", undefined);
check("stale registry path falls back to read-only", stalePath.kind === "read-only", JSON.stringify(stalePath));

// ---- config + frontmatter ----
console.log("runtimeOptions() / setModelInvocable()");
check("watcher defaults on", runtimeOptions({}).watchPackageRoots === true);
check("watcher can be disabled", runtimeOptions({ watchPackageRoots: false }).watchPackageRoots === false);

const disabled = setModelInvocable(FRONT("alpha"), false);
check("disable adds the key", /disable-model-invocation: true/.test(disabled));
check("disable keeps the body", disabled.endsWith("# alpha\n\nbody\n"));
const reenabled = setModelInvocable(disabled, true);
check("enable removes the key", reenabled === FRONT("alpha"), JSON.stringify(reenabled));

await rm(base, { recursive: true, force: true });
console.log(failures === 0 ? "\nALL PASS" : `\n${String(failures)} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
