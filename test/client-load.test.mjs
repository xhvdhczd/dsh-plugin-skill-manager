/**
 * Standalone smoke test for the browser half of dsh-plugin-skill-manager.
 *
 * The bundle is a `window.__ModuleLoader__.load({ id, factory })` script, so
 * this test installs a loader stub, runs the module body, and drives the
 * plugin's `apply(ctx)` against a fake client context. It proves the bundle
 * parses, requires only "react", registers the Skills view slot, and registers
 * its dictionaries.
 *
 * Run from the web profile directory:
 *
 *   copy test\client-load.test.mjs C:\Users\1\.dsh\profiles\<profile>\
 *   cd C:\Users\1\.dsh\profiles\<profile>
 *   node client-load.test.mjs
 */
let failures = 0;
function check(label, cond, extra) {
	if (cond) {
		console.log("  ok   " + label);
	} else {
		failures += 1;
		console.log("  FAIL " + label + (extra === undefined ? "" : " :: " + extra));
	}
}

const entries = [];
globalThis.window = {
	__ModuleLoader__: { load: (entry) => entries.push(entry) },
	setInterval: () => 0,
	clearInterval: () => {}
};

await import("./node_modules/dsh-plugin-skill-manager/lib/client.js");

check("exactly one module entry", entries.length === 1, String(entries.length));
const entry = entries[0];
check("id matches the package", entry?.id === "dsh-plugin-skill-manager", String(entry?.id));
check("factory is a function", typeof entry?.factory === "function");

const reactCalls = [];
const reactStub = {
	useRef: (value) => {
		reactCalls.push("useRef");
		return { current: value };
	},
	useState: (value) => {
		reactCalls.push("useState");
		return [value, () => {}];
	},
	useEffect: () => {
		reactCalls.push("useEffect");
	},
	createElement: (type, props, ...children) => ({ type, props, children })
};

const requiredModules = [];
const exportsOfBundle = entry.factory((name) => {
	requiredModules.push(name);
	if (name === "react") return reactStub;
	throw new Error("unexpected require: " + name);
});

check("only react is required", requiredModules.join(",") === "react", requiredModules.join(","));
check("apply exported", typeof exportsOfBundle.apply === "function");
check("inject declared", Array.isArray(exportsOfBundle.inject) && exportsOfBundle.inject.includes("slots"), JSON.stringify(exportsOfBundle.inject));

const slots = [];
const dictionaries = [];
const effects = [];
const ctx = {
	effect: (fn, label) => {
		effects.push(label);
		const disposer = fn();
		return disposer;
	},
	locale: {
		register: (ns, values) => {
			dictionaries.push({ ns, keys: Object.keys(values.zh).length + Object.keys(values.en).length });
		},
		bind: () => (key) => key
	},
	slots: {
		inject: (name, run) => {
			slots.push(name);
			run();
		},
		register: (meta) => {
			slots.push(meta.name + "#" + meta.id + "@" + String(meta.order));
			return { meta };
		}
	}
};

exportsOfBundle.apply(ctx);

check("dictionaries registered", dictionaries.length === 1 && dictionaries[0].ns === "skillManager", JSON.stringify(dictionaries));
check("locale keys present", dictionaries[0].keys > 20, String(dictionaries[0]?.keys));
check("view slot injected", slots[0] === "conversation.view", String(slots[0]));
check("view slot registered with the skills id", slots.includes("conversation.view#skills@20"), JSON.stringify(slots));
check("effect labels recorded", effects.includes("skill-manager: dictionaries"), JSON.stringify(effects));

console.log(failures === 0 ? "\nALL PASS" : `\n${String(failures)} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
