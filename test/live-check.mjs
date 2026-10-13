/**
 * Live smoke check for a *running* DSH web server: proves the Skills tab's host
 * routes exist and behave after the plugin loads.
 *
 * It reads the browser-session signing secret from `~/.dsh/.credentials.yaml`,
 * mints the same signed cookie the browser holds, and drives the public API.
 * Nothing is written: the toggle probes only a skill the host must refuse.
 *
 * Usage (from anywhere; `DSH_WEB_URL` and `DSH_SESSION_ID` come from the
 * harness environment):
 *
 *   node live-check.mjs http://127.0.0.1:19387
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = process.argv[2] ?? process.env.DSH_WEB_URL ?? "http://127.0.0.1:19387";
const authority = new URL(base).host;
const sessionId = process.env.DSH_SESSION_ID;

let failures = 0;
const check = (label, cond, extra) => {
	if (cond) console.log("  ok   " + label);
	else {
		failures += 1;
		console.log("  FAIL " + label + (extra === undefined ? "" : " :: " + extra));
	}
};

/** Signed browser-session cookie from the durable credential secret. */
function browserCookie() {
	const raw = fs.readFileSync(path.join(os.homedir(), ".dsh", ".credentials.yaml"), "utf8");
	const match = /client-connection\/browser-session:[\s\S]*?secret:\s*(\S+)/.exec(raw);
	if (match === null) throw new Error("no browser-session secret in ~/.dsh/.credentials.yaml");
	const secret = Buffer.from(match[1].replaceAll("-", "+").replaceAll("_", "/"), "base64");
	const b64u = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
	const name = "dsh-auth-" + b64u(crypto.createHash("sha256").update(authority).digest());
	const issuedAt = Date.now();
	const body = b64u(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt: issuedAt + 86400000 }), "utf8"));
	return `${name}=v1.${body}.${b64u(crypto.createHmac("sha256", secret).update(body).digest())}`;
}

const cookie = browserCookie();

/** POST one plugin route. */
async function post(pathname, body) {
	const response = await fetch(`${base}${pathname}`, {
		method: "POST",
		headers: { "content-type": "application/json", cookie },
		body: JSON.stringify(body ?? {})
	});
	const text = await response.text();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = { raw: text.slice(0, 200) };
	}
	return { status: response.status, body: parsed };
}

/** Read the live catalog through the standard remote endpoint. */
async function listSkills() {
	const endpoint = "skills/list";
	const response = await fetch(`${base}/api/${endpoint}`, {
		method: "POST",
		headers: { "content-type": "application/json", cookie },
		body: JSON.stringify({ type: "client-request", rpcId: crypto.randomUUID(), method: endpoint, payload: { args: { request: { sessionId } } } })
	});
	const payload = await response.json();
	if (payload?.result?.ok !== true) throw new Error(JSON.stringify(payload?.result?.error ?? payload));
	return payload.result.value.skills;
}

console.log(`live check against ${base}`);
const status = await post("/api/skill-manager/status");
check("status route exists", status.status === 200 && status.body.ok === true, JSON.stringify(status));
const before = status.body.revision;

const refresh = await post("/api/skill-manager/refresh", { sessionId });
check("refresh route exists", refresh.status === 200 && refresh.body.ok === true, JSON.stringify(refresh));
check("refresh bumps the revision", typeof refresh.body.revision === "number" && refresh.body.revision > before, `${String(before)} -> ${String(refresh.body.revision)}`);

const skills = await listSkills();
const names = skills.map((skill) => skill.name);
console.log(`  catalog: ${String(names.length)} skills`);
check("newly installed agent-figure-gallery is listed", names.includes("agent-figure-gallery"), names.filter((n) => n.includes("figure")).join(","));
check("newly installed research-to-diagram is listed", names.includes("research-to-diagram"), names.filter((n) => n.includes("diagram")).join(","));
check("office-xlsx still listed (read-only, not removed)", names.includes("office-xlsx"));

const packages = await post("/api/skill-manager/packages", { sessionId });
check("packages route reports readOnlySkills", packages.status === 200 && Array.isArray(packages.body.readOnlySkills), JSON.stringify(packages).slice(0, 200));
check("office-* classified read-only", ["office-docx", "office-pptx", "office-xlsx"].every((n) => packages.body.readOnlySkills?.includes(n)), JSON.stringify(packages.body.readOnlySkills));

const refused = await post("/api/skill-manager/toggle", { name: "office-xlsx", enabled: false, sessionId });
check("bundled skill is refused with read-only-skill (was: skill-not-found)", refused.status === 409 && refused.body.error === "read-only-skill", JSON.stringify(refused));

const missing = await post("/api/skill-manager/toggle", { name: "definitely-not-a-skill", enabled: false, sessionId });
check("unknown skill still reports skill-not-found", missing.status === 404 && missing.body.error === "skill-not-found", JSON.stringify(missing));

console.log(failures === 0 ? "\nALL PASS" : `\n${String(failures)} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
