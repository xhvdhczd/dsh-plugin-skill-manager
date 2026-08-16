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
			".dsm_loading{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);padding:24px 16px;text-align:center}"
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
			"action.disable": "停用",
			"action.enable": "启用",
			"action.busy": "处理中…",
			"loading": "正在加载技能列表…",
			"empty.title": "没有可用的技能",
			"empty.hint": "技能目录为空。\n在 ~/.agents/skills 下创建 <技能名>/SKILL.md 后会自动出现在这里。",
			"empty.filtered": "没有匹配的技能",
			"error.load": "加载技能列表失败",
			"error.toggle": "操作失败"
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
			"action.disable": "Disable",
			"action.enable": "Enable",
			"action.busy": "Working…",
			"loading": "Loading skills…",
			"empty.title": "No skills available",
			"empty.hint": "The skill directory is empty.\nCreate <name>/SKILL.md under ~/.agents/skills and it will show up here.",
			"empty.filtered": "No matching skills",
			"error.load": "Failed to load skills",
			"error.toggle": "Operation failed"
		};
		//#endregion

		//#region component
		/**
		 * Conversation-view tab listing every user-visible skill with a
		 * search box, a bulk enable/disable switch, and per-row toggles.
		 * Local state updates optimistically so the UI reacts on the first
		 * click; a delayed catalog refresh reconciles with the disk after the
		 * host watcher invalidates the registry cache.
		 * @param props - conversation.view standard kit + this plugin's inject face.
		 */
		function SkillsView(props) {
			var sessionId = props.sessionId;
			var connection = props.connection;
			var t = props.t;
			var skillsRef = react.useRef(null);
			var busyRef = react.useRef({});
			var searchRef = react.useRef("");
			var [skills, setSkills] = react.useState(null);
			var [busy, setBusy] = react.useState({});
			var [query, setQuery] = react.useState("");
			var [error, setError] = react.useState(null);

			react.useEffect(function () {
				var cancelled = false;
				var controller = new AbortController();
				skillsRef.current = null;
				busyRef.current = {};
				setSkills(null);
				setBusy({});
				setError(null);
				(async function () {
					try {
						var out = await connection.api.skills.list({ sessionId: sessionId }, controller.signal);
						if (cancelled) return;
						if (!out.result.ok) {
							setError(t("error.load") + ": " + out.result.error.code);
							return;
						}
						skillsRef.current = out.result.value.skills;
						setSkills(skillsRef.current);
					} catch (e) {
						if (!cancelled) setError(String(e && e.message ? e.message : e));
					}
				})();
				return function () {
					cancelled = true;
					controller.abort();
				};
			}, [connection, sessionId, t]);

			/** Full catalog refetch; used as a delayed reconciliation pass. */
			function refresh() {
				return connection.api.skills.list({ sessionId: sessionId }).then(function (out) {
					if (out.result.ok) {
						skillsRef.current = out.result.value.skills;
						setSkills(skillsRef.current);
					}
				});
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
							throw new Error((body && body.message) || ("HTTP " + res.status));
						}
					});
				});
			}

			/** Toggle one skill: optimistic flip, then reconcile after the watcher settles. */
			function toggle(skill) {
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

			/** Bulk enable/disable every currently visible skill. */
			function toggleAll(enabled) {
				var targets = visibleSkills();
				if (targets.length === 0) return;
				for (var i = 0; i < targets.length; i++) busyRef.current[targets[i].name] = true;
				setBusy(Object.assign({}, busyRef.current));
				setError(null);
				for (var j = 0; j < targets.length; j++) applyLocal(targets[j].name, enabled);
				var promises = targets.map(function (s) { return callToggle(s.name, enabled); });
				Promise.all(promises).then(function () {
					window.setTimeout(refresh, 600);
				}, function (e) {
					setError(t("error.toggle") + ": " + String(e && e.message ? e.message : e));
				}).then(function () {
					for (var k = 0; k < targets.length; k++) delete busyRef.current[targets[k].name];
					setBusy(Object.assign({}, busyRef.current));
				});
			}

			var visible = visibleSkills();
			var allOn = visible.length > 0 && visible.every(function (s) { return s.modelInvocable !== false; });
			var anyBusy = visible.some(function (s) { return busy[s.name] === true; });

			var rows = [];
			for (var i = 0; i < visible.length; i++) {
				var skill = visible[i];
				var on = skill.modelInvocable !== false;
				rows.push(react.createElement("tr", { key: skill.name },
					react.createElement("td", null,
						react.createElement("div", { className: "dsm_name" }, skill.name),
						react.createElement("div", { className: "dsm_desc" }, skill.description)
					),
					react.createElement("td", null,
						react.createElement("span", { className: "dsm_badge", "data-state": on ? "on" : "off" },
							react.createElement("span", { className: "dsm_dot" }),
							on ? t("state.enabled") : t("state.disabled")
						)
					),
					react.createElement("td", null,
						react.createElement("button", {
							type: "button",
							className: "dsm_btn",
							"data-action": on ? "disable" : "enable",
							disabled: busy[skill.name] === true,
							onClick: (function (s) { return function () { toggle(s); }; })(skill)
						}, busy[skill.name] === true ? t("action.busy") : (on ? t("action.disable") : t("action.enable")))
					)
				));
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
						disabled: anyBusy || visible.length === 0,
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
		var inject = ["slots", "connection", "locale"];

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
						return { connection: ctx.get("connection") };
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
