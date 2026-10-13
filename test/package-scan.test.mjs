/**
 * Standalone test for the package-aware skill scanning added to
 * dsh-plugin-skill-manager. Run from the web profile directory so the import
 * resolves @deepseek-ai/dsh-skill-filesystem via the profile node_modules:
 *
 *   cd C:\Users\1\.dsh\profiles\web && node skill-pkg-test.mjs
 *
 * Builds a temp fixture skill root with manifest-driven, fallback, grouped,
 * depth-limited, hidden, and flat entries; asserts container expansion, rank
 * offsets, skill-file location, and the provider's full roots()/list()
 * pipeline.
 */
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expandPackageContainers, findSkillInRoot, packageContainers, PackageSkillProvider } from "./node_modules/dsh-plugin-skill-manager/lib/index.js";

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

// ---- build fixture ----
const base = await mkdtemp(join(tmpdir(), "skillpkg-"));
const root = join(base, "skills"); // provider's user root = <dshHome>/skills

await mkdir(join(root, "pkgA", ".claude-plugin"), { recursive: true });
await mkdir(join(root, "pkgA", "skills", "engineering", "code-review"), { recursive: true });
await mkdir(join(root, "pkgA", "skills", "engineering", "tdd"), { recursive: true });
await mkdir(join(root, "pkgA", "skills", "productivity", "grill-me"), { recursive: true });
await writeFile(join(root, "pkgA", ".claude-plugin", "plugin.json"), JSON.stringify({
	name: "pkg-a", version: "1.0.0",
	skills: ["./skills/engineering/code-review", "./skills/engineering/tdd", "./skills/productivity/grill-me"]
}));
for (const p of ["skills/engineering/code-review", "skills/engineering/tdd", "skills/productivity/grill-me"]) {
	await writeFile(join(root, "pkgA", p, "SKILL.md"), FRONT(p.split("/").pop()));
}

await mkdir(join(root, "pkgB", "skills", "skill-b1"), { recursive: true });
await mkdir(join(root, "pkgB", "skills", "skill-b2"), { recursive: true });
await writeFile(join(root, "pkgB", "skills", "skill-b1", "SKILL.md"), FRONT("skill-b1"));
await writeFile(join(root, "pkgB", "skills", "skill-b2", "SKILL.md"), FRONT("skill-b2"));

await mkdir(join(root, "pkgC", "skills", "groups", "g1", "s1"), { recursive: true });
await mkdir(join(root, "pkgC", "skills", "groups", "g2", "s2"), { recursive: true });
await writeFile(join(root, "pkgC", "skills", "groups", "g1", "s1", "SKILL.md"), FRONT("s1"));
await writeFile(join(root, "pkgC", "skills", "groups", "g2", "s2", "SKILL.md"), FRONT("s2"));

await mkdir(join(root, "pkgD", ".claude-plugin"), { recursive: true });
await mkdir(join(root, "pkgD", "skills", "skill-d"), { recursive: true });
await writeFile(join(root, "pkgD", ".claude-plugin", "plugin.json"), JSON.stringify({ name: "pkg-d" }));
await writeFile(join(root, "pkgD", "skills", "skill-d", "SKILL.md"), FRONT("skill-d"));

await mkdir(join(root, "pkgE"), { recursive: true });

await mkdir(join(root, ".hidden", "skills", "h"), { recursive: true });
await writeFile(join(root, ".hidden", "skills", "h", "SKILL.md"), FRONT("h"));

await mkdir(join(root, "flat-skill"), { recursive: true });
await writeFile(join(root, "flat-skill", "SKILL.md"), FRONT("flat-skill"));

await mkdir(join(root, "pkgF", "skills", "a", "b", "c", "d", "s"), { recursive: true });
await writeFile(join(root, "pkgF", "skills", "a", "b", "c", "d", "s", "SKILL.md"), FRONT("deep-s"));

const rootRow = { path: root, source: "user-dsh", rank: 400 };
const opts = {
	enablePackages: true,
	manifestFiles: [".claude-plugin/plugin.json", "dsh-plugin.json"],
	maxNestingDepth: 4,
	packageRankOffset: 10,
	includeRoots: ["user-dsh"]
};
const rel = (p) => p.slice(root.length + 1).replaceAll("\\", "/");

// ---- expandPackageContainers ----
const containers = await expandPackageContainers(rootRow, opts.manifestFiles, opts.maxNestingDepth, opts.packageRankOffset, undefined);
const paths = new Set(containers.map((c) => c.path));
const rels = [...paths].map(rel).sort();
check("manifest 容器（engineering+productivity）",
	paths.has(join(root, "pkgA/skills/engineering")) && paths.has(join(root, "pkgA/skills/productivity")), rels.join(","));
check("fallback 直接容器 pkgB/skills", paths.has(join(root, "pkgB/skills")), rels.join(","));
check("fallback 组容器 pkgC/groups/g1+g2",
	paths.has(join(root, "pkgC/skills/groups/g1")) && paths.has(join(root, "pkgC/skills/groups/g2")), rels.join(","));
check("manifest 无 skills 数组→兜底 pkgD/skills", paths.has(join(root, "pkgD/skills")), rels.join(","));
check("无技能包 pkgE 被忽略", !paths.has(join(root, "pkgE")), rels.join(","));
check("隐藏目录被忽略", !rels.some((r) => r.includes(".hidden")), rels.join(","));
check("扁平技能目录不是包", !paths.has(join(root, "flat-skill")), rels.join(","));
check("深度上限 4 内找到 pkgF 容器", paths.has(join(root, "pkgF/skills/a/b/c/d")), rels.join(","));
check("rank 偏移 = 400-10=390", containers.every((c) => c.rank === 390), containers.map((c) => c.rank).join(","));
check("source 保留 user-dsh", containers.every((c) => c.source === "user-dsh"));

// ---- depth limit ----
const shallow = await packageContainers(join(root, "pkgF"), opts.manifestFiles, 2, undefined);
check("深度上限 2 截断（不产生容器）", shallow.length === 0, shallow.map(rel).join(","));

// ---- findSkillInRoot ----
check("定位包内技能 code-review",
	(await findSkillInRoot(rootRow, "code-review", opts)) === join(root, "pkgA", "skills", "engineering", "code-review", "SKILL.md"));
check("定位扁平技能 flat-skill",
	(await findSkillInRoot(rootRow, "flat-skill", opts)) === join(root, "flat-skill", "SKILL.md"));
check("缺失技能返回 undefined", (await findSkillInRoot(rootRow, "nope", opts)) === undefined);

// ---- PackageSkillProvider.roots() full chain ----
const control = { invalidate() {}, signal: new AbortController().signal };
const ctxStub = { get() { return undefined; }, logger: { warn() {} }, on() {}, off() {} };
const provider = new PackageSkillProvider(ctxStub, control, { dshHome: base, agentsHome: base, customSkillDirs: [], includeDefaultRoots: true, watch: false });
const providerRoots = await provider.roots(base);
const relRoots = providerRoots.map((c) => c.path.slice(root.length + 1).replaceAll("\\", "/")).sort();
const expectedRoots = ["pkgA/skills/engineering", "pkgA/skills/productivity", "pkgB/skills", "pkgC/skills/groups/g1", "pkgC/skills/groups/g2", "pkgD/skills", "pkgF/skills/a/b/c/d"].sort();
check("provider.roots() 展开全部包容器", relRoots.join("|") === expectedRoots.join("|"), relRoots.join("|"));
check("provider.roots() rank=390", providerRoots.every((c) => c.rank === 390));
await provider.dispose();

// ---- PackageSkillProvider.list() full discovery pipeline ----
const provider2 = new PackageSkillProvider(ctxStub, control, { dshHome: base, agentsHome: base, customSkillDirs: [], includeDefaultRoots: true, watch: false });
const list = await provider2.list({ cwd: base, signal: new AbortController().signal });
const names = list.map((c) => c.name).sort();
const expectedNames = ["code-review", "deep-s", "grill-me", "s1", "s2", "skill-b1", "skill-b2", "skill-d", "tdd"].sort();
check("list() 发现全部包内技能", names.join(",") === expectedNames.join(","), names.join(","));
check("list() 每项 rank=390/source=user-dsh", list.every((c) => c.rank === 390 && c.source === "user-dsh"), JSON.stringify(list.map((c) => ({ n: c.name, r: c.rank, s: c.source }))));
await provider2.dispose();

// ---- disabled ----
const provider3 = new PackageSkillProvider(ctxStub, control, { dshHome: base, agentsHome: base, customSkillDirs: [], includeDefaultRoots: true, watch: false, enablePackages: false });
const none = await provider3.roots(base);
check("enablePackages:false → 无包容器", none.length === 0);
await provider3.dispose();

await rm(base, { recursive: true, force: true });
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
