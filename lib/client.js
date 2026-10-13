window.__ModuleLoader__.load({
	id: "dsh-plugin-skill-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		//#region styles
		var css = [
			".dsm_root{box-sizing:border-box;width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);flex-direction:column;display:flex;overflow:hidden}",
			".dsm_toolbar{box-sizing:border-box;flex:none;align-items:center;gap:8px;width:100%;height:40px;border-bottom:1px solid var(--dsw-alias-border-l2);padding:0 16px;display:flex}",
			".dsm_title{color:var(--dsw-alias-label-primary);flex:none;font-size:14px;font-weight:600;line-height:20px}",
			".dsm_count{color:var(--dsw-alias-label-tertiary);flex:none;font:var(--dsw-font-xs-13)}",
			".dsm_search{box-sizing:border-box;flex:1;min-width:0;height:24px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;outline:none;padding:0 10px}",
			".dsm_search::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".dsm_search:focus{border-color:var(--dsw-alias-state-business-primary)}",
			".dsm_allBtn{box-sizing:border-box;flex:none;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;font:var(--dsw-font-xxs-12);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;align-items:center;gap:4px;padding:0 10px;display:inline-flex;white-space:nowrap}",
			".dsm_allBtn:hover:not(:disabled){color:var(--dsw-alias-label-primary)}",
			".dsm_allBtn:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
			".dsm_allBtn:disabled{opacity:.55;cursor:default}",
			".dsm_error{box-sizing:border-box;flex:none;width:100%;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);border-bottom:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xs-13);padding:6px 16px;line-height:1.4}",
			".dsm_list{flex:1;min-height:0;width:100%;overflow-y:auto}",
			".dsm_table{width:100%;border-collapse:collapse;table-layout:fixed}",
			".dsm_table th{text-align:left;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);font-weight:500;border-bottom:1px solid var(--dsw-alias-border-l2);padding:6px 16px;position:sticky;top:0;background:var(--dsw-alias-bg-layer-1)}",
			".dsm_table td{vertical-align:top;border-bottom:1px solid var(--dsw-alias-border-l1);padding:8px 16px;font:var(--dsw-font-xs-13)}",
			".dsm_name{color:var(--dsw-alias-label-primary);font-weight:600;word-break:break-all}",
			".dsm_desc{color:var(--dsw-alias-label-secondary);margin-top:2px;word-break:break-word}",
			".dsm_badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;font:var(--dsw-font-xxs-12);padding:2px 8px;flex:none;white-space:nowrap}",
			".dsm_badge[data-state=on]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}",
			".dsm_badge[data-state=off]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-interactive-bg-hover)}",
			".dsm_badge[data-state=readonly]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2)}",
			".dsm_dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}",
			".dsm_btn{box-sizing:border-box;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;font:var(--dsw-font-xxs-12);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;align-items:center;gap:4px;padding:0 10px;display:inline-flex;white-space:nowrap}",
			".dsm_btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".dsm_btn:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
			".dsm_btn:disabled{opacity:.55;cursor:default}",
			".dsm_btn[data-action=disable]:hover:not(:disabled){color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent)}",
			".dsm_btn[data-action=enable]{color:var(--dsw-alias-label-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent)}",
			".dsm_empty{box-sizing:border-box;width:100%;padding:48px 16px;text-align:center}",
			".dsm_emptyTitle{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-sm-14);font-weight:600}",
			".dsm_emptyHint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);margin-top:6px;line-height:1.5;white-space:pre-wrap}",
			".dsm_loading{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);padding:24px 16px;text-align:center}",
			".dsm_pkgHeader td{background:var(--dsw-alias-bg-layer-2)}",
			".dsm_pkgHeader:hover td{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsm_pkgBar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}",
			".dsm_pkgToggle{display:inline-flex;align-items:center;min-width:0;flex:1;cursor:pointer;user-select:none}",
			".dsm_pkgCaret{display:inline-block;width:14px;color:var(--dsw-alias-label-tertiary);font-size:10px;margin-right:4px}",
			".dsm_pkgName{color:var(--dsw-alias-label-primary);font-weight:600}",
			".dsm_pkgCount{color:var(--dsw-alias-label-tertiary);margin-left:8px;font:var(--dsw-font-xxs-12)}",
			".dsm_pkgBtn{flex:none}"
		].join("");
		var tagId = "dsh-plugin-skill-manager/SkillsView.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-plugin-skill-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region locales
		var NS = "skillManager";
		var zh = {
			"view.skills": "技能",
			"toolbar.summary": "共 {count} 个",
			"search.placeholder": "搜索技能…",
			"action.disableAll": "全部停用",
			"action.enableAll": "全部启用",
			"column.skill": "技能",
			"column.state": "状态",
			"column.action": "操作",
			"state.enabled": "已启用",
			"state.disabled": "已停用",
			"state.readonly": "内置（只读）",
			"action.readonly": "内置",
			"action.reload": "刷新",
			"tooltip.reload": "重新读取技能目录并刷新列表",
			"tooltip.readonly": "该技能由应用内置提供，没有可写的 SKILL.md；复制到 ~/.dsh/skills 下才能停用",
			"error.readonly": "内置技能不可停用",
			"action.disable": "停用",
			"action.enable": "启用",
			"action.busy": "处理中…",
			"loading": "正在加载技能列表…",
			"empty.title": "没有可用的技能",
			"empty.hint": "技能目录为空。\n在 ~/.dsh/skills 下创建 <技能名>/SKILL.md，\n或以 <包名>/skills/<技能名>/SKILL.md 的包结构安装，会自动出现在这里。",
			"empty.filtered": "没有匹配的技能",
			"error.load": "加载技能列表失败",
			"error.toggle": "操作失败",
			"group.skills": "{count} 个技能",
			"group.ungrouped": "未分组"
		};
		var en = {
			"view.skills": "Skills",
			"toolbar.summary": "{count} total",
			"search.placeholder": "Search skills…",
			"action.disableAll": "Disable all",
			"action.enableAll": "Enable all",
			"column.skill": "Skill",
			"column.state": "State",
			"column.action": "Action",
			"state.enabled": "Enabled",
			"state.disabled": "Disabled",
			"state.readonly": "Built-in (read-only)",
			"action.readonly": "Built-in",
			"action.reload": "Reload",
			"tooltip.reload": "Re-read the skill roots and refresh this list",
			"tooltip.readonly": "Provided by the application with no writable SKILL.md; copy it under ~/.dsh/skills to toggle it",
			"error.readonly": "Built-in skill cannot be toggled",
			"action.disable": "Disable",
			"action.enable": "Enable",
			"action.busy": "Working…",
			"loading": "Loading skills…",
			"empty.title": "No skills available",
			"empty.hint": "The skill directory is empty.\nCreate <name>/SKILL.md under ~/.dsh/skills,\nor install a package as <pkg>/skills/<name>/SKILL.md and it will show up here.",
			"empty.filtered": "No matching skills",
			"error.load": "Failed to load skills",
			"error.toggle": "Operation failed",
			"group.skills": "{count} skills",
			"group.ungrouped": "Ungrouped"
		};
		//#endregion

		//#region component
		/**
		 * Conversation-view tab listing every user-visible skill with a
		 * search box, a bulk enable/disable switch, and per-row toggles.
		 * Local state updates optimistically so the UI reacts on the first
		 * click; a delayed catalog refresh reconciles with the disk after the
		 * host watcher invalidates the registry cache.
		 *
		 * Each mount asks the host to drop its collected catalog first, and a
		 * small poll re-reads when the host reports that the skill roots
		 * changed, so a package installed while the app runs shows up without a
		 * restart.
		 *
		 * Skills the host cannot write (application-bundled skills such as the
		 * office set, and runtime-registered skills) are rendered read-only
		 * instead of offering a toggle that would fail.
		 * @param props - conversation.view standard kit + this plugin's inject face.
		 */
		function SkillsView(props) {
			var sessionId = props.sessionId;
			var skillsApi = props.skills;
			var t = props.t;
			var skillsRef = react.useRef(null);
			var busyRef = react.useRef({});
			var pkgBusyRef = react.useRef({});
			var searchRef = react.useRef("");
			var revisionRef = react.useRef(null);
			var reloadingRef = react.useRef(false);
			var [skills, setSkills] = react.useState(null);
			var [busy, setBusy] = react.useState({});
			var [pkgBusy, setPkgBusy] = react.useState({});
			var [query, setQuery] = react.useState("");
			var [error, setError] = react.useState(null);
			var [packages, setPackages] = react.useState([]);
			var [expanded, setExpanded] = react.useState({});
			var [reloading, setReloading] = react.useState(false);
			var [readOnly, setReadOnly] = react.useState({});

			/** POST one host route; resolves to the parsed body, or undefined. */
			function postHost(path, body) {
				return fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body === undefined ? {} : body)
				}).then(function (res) {
					return res.json().catch(function () { return undefined; });
				}).catch(function () { return undefined; });
			}

			/** Drop the host's collected catalog so the next list re-reads the disk. */
			function invalidateCatalog() {
				return postHost("/api/skill-manager/refresh", { sessionId: sessionId });
			}

			/** Read the catalog through the standard remote service. */
			function loadCatalog(signal) {
				return skillsApi.list({ sessionId: sessionId }, signal).then(function (out) {
					var payload = out && out.result !== undefined ? out.result : out;
					if (payload.ok !== true) throw new Error(payload.error ? payload.error.code : "unknown");
					skillsRef.current = payload.value.skills;
					setSkills(skillsRef.current);
				});
			}

			/** Read the package grouping and the host's read-only classification. */
			function loadPackages() {
				return postHost("/api/skill-manager/packages", { sessionId: sessionId }).then(function (pkgResp) {
					if (pkgResp === null || typeof pkgResp !== "object" || pkgResp.ok !== true) return;
					if (Array.isArray(pkgResp.packages)) setPackages(pkgResp.packages);
					if (Array.isArray(pkgResp.readOnlySkills)) {
						var next = {};
						for (var i = 0; i < pkgResp.readOnlySkills.length; i++) next[pkgResp.readOnlySkills[i]] = true;
						setReadOnly(next);
					}
				});
			}

			/** Re-read both halves without touching the host cache. */
			function refresh() {
				return Promise.all([loadCatalog(), loadPackages()]).then(function () { return undefined; });
			}

			/** Full reload: invalidate the host catalog, then re-read everything. */
			function reload() {
				if (reloadingRef.current) return Promise.resolve();
				reloadingRef.current = true;
				setReloading(true);
				setError(null);
				return invalidateCatalog().then(function (resp) {
					if (resp !== undefined && typeof resp.revision === "number") revisionRef.current = resp.revision;
					return refresh();
				}).catch(function (e) {
					setError(t("error.load") + ": " + String(e && e.message ? e.message : e));
				}).then(function () {
					reloadingRef.current = false;
					setReloading(false);
				});
			}

			/** Cheap revision poll: re-read only when the host structure changed. */
			function pollRevision() {
				if (reloadingRef.current) return;
				postHost("/api/skill-manager/status", {}).then(function (resp) {
					if (resp === null || typeof resp !== "object" || resp.ok !== true || typeof resp.revision !== "number") return;
					if (revisionRef.current === null) {
						revisionRef.current = resp.revision;
						return;
					}
					if (resp.revision !== revisionRef.current) {
						revisionRef.current = resp.revision;
						refresh();
					}
				});
			}

			/**
			 * Whether this row must be rendered without a toggle: the host
			 * classified it read-only, or the catalog carries no SKILL.md path
			 * for it (application-bundled and runtime-registered skills).
			 */
			function isReadOnly(skill) {
				if (readOnly[skill.name] === true) return true;
				return skill.path === undefined || skill.path === null;
			}

			react.useEffect(function () {
				var cancelled = false;
				var controller = new AbortController();
				skillsRef.current = null;
				busyRef.current = {};
				revisionRef.current = null;
				setSkills(null);
				setBusy({});
				setError(null);
				setReadOnly({});
				(async function () {
					try {
						await invalidateCatalog();
						if (cancelled) return;
						await loadCatalog(controller.signal);
					} catch (e) {
						if (!cancelled) setError(String(e && e.message ? e.message : e));
					}
				})();
				loadPackages();
				var timer = window.setInterval(function () {
					if (cancelled) return;
					if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
					pollRevision();
				}, 3000);
				return function () {
					cancelled = true;
					controller.abort();
					window.clearInterval(timer);
				};
			}, [skillsApi, sessionId, t]);

			/** Toggle one package group's expansion (click on its header row). */
			function togglePackage(name) {
				var next = Object.assign({}, expanded);
				if (next[name] === true) delete next[name];
				else next[name] = true;
				setExpanded(next);
			}

			/** Enable/disable every togglable skill of one package in one click. */
			function togglePackageAll(pkgName, enabled, skillNames) {
				var targets = skillNames.filter(function (name) { return readOnly[name] !== true; });
				if (targets.length === 0 || pkgBusyRef.current[pkgName] === true) return;
				var next = Object.assign({}, pkgBusyRef.current);
				next[pkgName] = true;
				pkgBusyRef.current = next;
				setPkgBusy(next);
				setError(null);
				for (var i = 0; i < targets.length; i++) applyLocal(targets[i], enabled);
				var promises = targets.map(function (n) { return callToggle(n, enabled); });
				Promise.all(promises).then(function () {
					window.setTimeout(refresh, 600);
				}, function (e) {
					markRefused(e, targets);
					setError(t("error.toggle") + ": " + String(e && e.message ? e.message : e));
				}).then(function () {
					var after = Object.assign({}, pkgBusyRef.current);
					delete after[pkgName];
					pkgBusyRef.current = after;
					setPkgBusy(after);
				});
			}

			/** Remember every skill the host refused so the row renders read-only. */
			function markRefused(failure, names) {
				if (failure === null || typeof failure !== "object" || failure.code !== "read-only-skill") return;
				var next = Object.assign({}, readOnly);
				for (var i = 0; i < names.length; i++) next[names[i]] = true;
				setReadOnly(next);
			}

			/** Optimistically flip one row's model-invocation state in place. */
			function applyLocal(name, modelInvocable) {
				if (skillsRef.current === null) return;
				skillsRef.current = skillsRef.current.map(function (s) {
					return s.name === name ? Object.assign({}, s, { modelInvocable: modelInvocable }) : s;
				});
				setSkills(skillsRef.current);
			}

			/** POST one toggle to the host route; resolves on `{ok:true}`. */
			function callToggle(name, enabled) {
				return fetch("/api/skill-manager/toggle", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: name, enabled: enabled, sessionId: sessionId })
				}).then(function (res) {
					return res.json().catch(function () { return {}; }).then(function (body) {
						if (!res.ok || body.ok !== true) {
							var failure = new Error((body && body.message) || ("HTTP " + res.status));
							failure.code = body && body.error ? body.error : "http-" + String(res.status);
							throw failure;
						}
					});
				});
			}

			/** Toggle one skill: optimistic flip, then reconcile after the watcher settles. */
			function toggle(skill) {
				if (isReadOnly(skill)) {
					setError(t("error.readonly") + ": " + skill.name);
					return;
				}
				var enabled = !skill.modelInvocable;
				if (busyRef.current[skill.name]) return;
				busyRef.current[skill.name] = true;
				setBusy(Object.assign({}, busyRef.current));
				setError(null);
				applyLocal(skill.name, enabled);
				callToggle(skill.name, enabled).then(function () {
					window.setTimeout(refresh, 600);
				}, function (e) {
					applyLocal(skill.name, !enabled);
					markRefused(e, [skill.name]);
					setError(t("error.toggle") + ": " + String(e && e.message ? e.message : e));
				}).then(function () {
					delete busyRef.current[skill.name];
					setBusy(Object.assign({}, busyRef.current));
				});
			}

			/** Skills matching the current search query (empty query = all). */
			function visibleSkills() {
				var list = skillsRef.current;
				if (list === null) return [];
				var q = searchRef.current.trim().toLowerCase();
				if (q === "") return list;
				return list.filter(function (s) {
					return s.name.toLowerCase().indexOf(q) !== -1 || s.description.toLowerCase().indexOf(q) !== -1;
				});
			}

			/** Bulk enable/disable every currently visible, togglable skill. */
			function toggleAll(enabled) {
				var targets = visibleSkills().filter(function (s) { return !isReadOnly(s); });
				if (targets.length === 0) return;
				for (var i = 0; i < targets.length; i++) busyRef.current[targets[i].name] = true;
				setBusy(Object.assign({}, busyRef.current));
				setError(null);
				for (var j = 0; j < targets.length; j++) applyLocal(targets[j].name, enabled);
				var promises = targets.map(function (s) { return callToggle(s.name, enabled); });
				Promise.all(promises).then(function () {
					window.setTimeout(refresh, 600);
				}, function (e) {
					markRefused(e, targets.map(function (s) { return s.name; }));
					setError(t("error.toggle") + ": " + String(e && e.message ? e.message : e));
				}).then(function () {
					for (var k = 0; k < targets.length; k++) delete busyRef.current[targets[k].name];
					setBusy(Object.assign({}, busyRef.current));
				});
			}

			var visible = visibleSkills();
			var togglable = visible.filter(function (s) { return !isReadOnly(s); });
			var allOn = togglable.length > 0 && togglable.every(function (s) { return s.modelInvocable !== false; });
			var anyBusy = togglable.some(function (s) { return busy[s.name] === true; });
			var searching = searchRef.current.trim() !== "";

			// Group the filtered rows by package (from the packages endpoint).
			var pkgIndex = {};
			for (var p0 = 0; p0 < packages.length; p0++) {
				var pkg0 = packages[p0];
				for (var p1 = 0; p1 < pkg0.skills.length; p1++) pkgIndex[pkg0.skills[p1]] = pkg0.name;
			}
			var groups = [];
			var ungrouped = [];
			for (var v = 0; v < visible.length; v++) {
				var sk = visible[v];
				var pn = pkgIndex[sk.name];
				if (pn !== undefined) {
					var g = null;
					for (var g1 = 0; g1 < groups.length; g1++) {
						if (groups[g1].name === pn) { g = groups[g1]; break; }
					}
					if (g === null) {
						g = { name: pn, skills: [] };
						groups.push(g);
					}
					g.skills.push(sk);
				} else {
					ungrouped.push(sk);
				}
			}
			// packages first (endpoint order = sorted by name), ungrouped last
			var ordered = [];
			for (var q = 0; q < packages.length; q++) {
				for (var q1 = 0; q1 < groups.length; q1++) {
					if (groups[q1].name === packages[q].name) { ordered.push(groups[q1]); break; }
				}
			}
			if (ungrouped.length > 0) ordered.push({ name: null, skills: ungrouped });

			var rows = [];
			/** One skill row: name + description cell, state badge, action button. */
			function skillRow(skill) {
				var ro = isReadOnly(skill);
				var on = skill.modelInvocable !== false;
				var badge = ro
					? react.createElement("span", { className: "dsm_badge", "data-state": "readonly", title: t("tooltip.readonly") },
						react.createElement("span", { className: "dsm_dot" }),
						t("state.readonly"))
					: react.createElement("span", { className: "dsm_badge", "data-state": on ? "on" : "off" },
						react.createElement("span", { className: "dsm_dot" }),
						on ? t("state.enabled") : t("state.disabled"));
				var label = ro
					? t("action.readonly")
					: (busy[skill.name] === true ? t("action.busy") : (on ? t("action.disable") : t("action.enable")));
				return react.createElement("tr", { key: skill.name },
					react.createElement("td", null,
						react.createElement("div", { className: "dsm_name" }, skill.name),
						react.createElement("div", { className: "dsm_desc" }, skill.description)
					),
					react.createElement("td", null, badge),
					react.createElement("td", null,
						react.createElement("button", {
							type: "button",
							className: "dsm_btn",
							"data-action": ro ? "readonly" : (on ? "disable" : "enable"),
							title: ro ? t("tooltip.readonly") : undefined,
							disabled: ro || busy[skill.name] === true,
							onClick: (function (s) { return function () { toggle(s); }; })(skill)
						}, label)
					)
				);
			}
			for (var gi = 0; gi < ordered.length; gi++) {
				var group = ordered[gi];
				if (group.name === null) {
					// Ungrouped skills: each is its own collapsible header named
					// after the skill (same structure as a package header), default
					// folded; clicking reveals that one skill's row.
					for (var u = 0; u < group.skills.length; u++) {
						var us = group.skills[u];
						var ukey = "skill:" + us.name;
						var uopen = searching || expanded[ukey] === true;
						var uro = isReadOnly(us);
						var uon = us.modelInvocable !== false;
						rows.push(react.createElement("tr", { key: "pkg:" + ukey, className: "dsm_pkgHeader" },
							react.createElement("td", { colSpan: 3 },
								react.createElement("div", { className: "dsm_pkgBar" },
									react.createElement("span", { className: "dsm_pkgToggle", onClick: (function (k) { return function () { togglePackage(k); }; })(ukey) },
										react.createElement("span", { className: "dsm_pkgCaret" }, uopen ? "\u25BE" : "\u25B8"),
										react.createElement("span", { className: "dsm_pkgName" }, us.name),
										uro ? react.createElement("span", { className: "dsm_pkgCount" }, t("state.readonly")) : null
									),
									react.createElement("button", {
										type: "button",
										className: "dsm_btn dsm_pkgBtn",
										"data-action": uro ? "readonly" : (uon ? "disable" : "enable"),
										title: uro ? t("tooltip.readonly") : undefined,
										disabled: uro || busy[us.name] === true,
										onClick: (function (s) { return function (e) { e.stopPropagation(); toggle(s); }; })(us)
									}, uro ? t("action.readonly") : (busy[us.name] === true ? t("action.busy") : (uon ? t("action.disable") : t("action.enable"))))
								)
							)
						));
						if (uopen) rows.push(skillRow(us));
					}
					continue;
				}
				var pkgSkills = group.skills;
				var pkgTogglable = pkgSkills.filter(function (s) { return !isReadOnly(s); });
				var pkgAllOff = pkgTogglable.length > 0 && pkgTogglable.every(function (s) { return s.modelInvocable === false; });
				var pkgSkillNames = [];
				for (var pn2 = 0; pn2 < pkgSkills.length; pn2++) pkgSkillNames.push(pkgSkills[pn2].name);
				var open = searching || expanded[group.name] === true;
				rows.push(react.createElement("tr", { key: "pkg:" + group.name, className: "dsm_pkgHeader" },
					react.createElement("td", { colSpan: 3 },
						react.createElement("div", { className: "dsm_pkgBar" },
							react.createElement("span", { className: "dsm_pkgToggle", onClick: (function (n) { return function () { togglePackage(n); }; })(group.name) },
								react.createElement("span", { className: "dsm_pkgCaret" }, open ? "\u25BE" : "\u25B8"),
								react.createElement("span", { className: "dsm_pkgName" }, group.name),
								react.createElement("span", { className: "dsm_pkgCount" }, t("group.skills").replace("{count}", String(group.skills.length)))
							),
							react.createElement("button", {
								type: "button",
								className: "dsm_btn dsm_pkgBtn",
								"data-action": pkgAllOff ? "enable" : "disable",
								disabled: pkgBusy[group.name] === true || pkgTogglable.length === 0,
								onClick: (function (n, en, names) { return function (e) { e.stopPropagation(); togglePackageAll(n, en, names); }; })(group.name, pkgAllOff, pkgSkillNames)
							}, pkgBusy[group.name] === true ? t("action.busy") : (pkgAllOff ? t("action.enable") : t("action.disable")))
						)
					)
				));
				if (open) {
					for (var i = 0; i < group.skills.length; i++) {
						rows.push(skillRow(group.skills[i]));
					}
				}
			}

			var body;
			if (skills === null && error === null) {
				body = react.createElement("div", { className: "dsm_loading" }, t("loading"));
			} else if (skills !== null && skills.length === 0) {
				body = react.createElement("div", { className: "dsm_empty" },
					react.createElement("div", { className: "dsm_emptyTitle" }, t("empty.title")),
					react.createElement("div", { className: "dsm_emptyHint" }, t("empty.hint"))
				);
			} else if (visible.length === 0) {
				body = react.createElement("div", { className: "dsm_empty" },
					react.createElement("div", { className: "dsm_emptyTitle" }, t("empty.filtered"))
				);
			} else {
				body = react.createElement("div", { className: "dsm_list" },
					react.createElement("table", { className: "dsm_table" },
						react.createElement("thead", null,
							react.createElement("tr", null,
								react.createElement("th", { style: { width: "38%" } }, t("column.skill")),
								react.createElement("th", { style: { width: "30%" } }, t("column.state")),
								react.createElement("th", { style: { width: "32%" } }, t("column.action"))
							)
						),
						react.createElement("tbody", null, rows)
					)
				);
			}

			return react.createElement("div", { className: "dsm_root" },
				react.createElement("div", { className: "dsm_toolbar" },
					react.createElement("span", { className: "dsm_title" }, t("view.skills")),
					skills !== null ? react.createElement("span", { className: "dsm_count" }, t("toolbar.summary").replace("{count}", String(visible.length))) : null,
					react.createElement("input", {
						type: "text",
						className: "dsm_search",
						placeholder: t("search.placeholder"),
						value: query,
						onChange: function (e) {
							searchRef.current = e.target.value;
							setQuery(e.target.value);
						}
					}),
					react.createElement("button", {
						type: "button",
						className: "dsm_allBtn",
						title: t("tooltip.reload"),
						disabled: reloading,
						onClick: function () { reload(); }
					}, reloading ? t("action.busy") : t("action.reload")),
					react.createElement("button", {
						type: "button",
						className: "dsm_allBtn",
						disabled: anyBusy || reloading || togglable.length === 0,
						onClick: function () { toggleAll(!allOn); }
					}, allOn ? t("action.disableAll") : t("action.enableAll"))
				),
				error !== null ? react.createElement("div", { className: "dsm_error" }, error) : null,
				body
			);
		}
		//#endregion

		//#region plugin
		/** Required services (cordis fiber inject). */
		var inject = ["slots", "remote", "remote.skills", "locale"];

		/**
		 * Client plugin body: register the Skills conversation-view tab and
		 * its dictionaries.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "skill-manager: dictionaries");
			var t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", function () {
				return ctx.slots.register({
					name: "conversation.view",
					id: "skills",
					order: 20,
					locale: NS,
					label: function () { return t("view.skills"); },
					inject: function () {
						return { skills: ctx.remote.skills };
					}
				}, SkillsView);
			});
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
