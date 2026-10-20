window.__ModuleLoader__.load({
	id: "dsh-tavily-web-search",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* `settings.tavily` namespace dictionaries.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"nav": "Tavily 搜索",
			"heading": "Tavily 搜索",
			"intro": "管理 Tavily 网页搜索凭据与搜索行为。",
			"name": "Tavily 网页搜索",
			"description": "通过 API Key 池管理 Tavily 搜索凭据；密钥存储在凭据服务中。",
			"expand": "展开设置",
			"collapse": "收起设置",
			"endpoint": "接口地址",
			"endpointHint": "留空则使用 Tavily 默认地址；自建代理填服务根地址或 /search 均可。",
			"searchDepth": "搜索深度",
			"searchDepthHint": "basic 或 advanced。",
			"maxResults": "最大结果数",
			"maxResultsHint": "每次搜索返回的最大结果数。",
			"readOnly": "本部署的设置为只读。",
			"save": "保存",
			"saving": "保存中…",
			"discard": "放弃修改",
			"unsaved": "未保存",
			"overridden": "已覆盖",
			"reset": "恢复默认",
			"saveFailed": "本部署没有接受这些值，已保留供你修改。",
			"invalidNumber": "请填数字；留空表示使用默认值。",
			"keysTitle": "API Key 池",
			"keysHint": "搜索按启用顺序轮询；密钥只写入凭据服务，不会回显。",
			"refreshAll": "刷新全部用量",
			"keyNamePlaceholder": "名称，例如：个人账号",
			"keyValuePlaceholder": "tvly-…",
			"addKey": "添加 Key",
			"adding": "添加中…",
			"keysEmpty": "尚未添加 API Key。添加至少一个并保持启用后才能搜索。",
			"configured": "已配置",
			"unconfigured": "未配置",
			"credits": "积分",
			"searchUsage": "搜索用量",
			"usageNotLoaded": "点击“查询用量”读取 Tavily 官方实时数据。",
			"replacePlaceholder": "输入新 Key（不会回显）",
			"replace": "替换",
			"refreshUsage": "查询用量",
			"loadingUsage": "查询中…",
			"delete": "删除",
			"deleteConfirm": "确定删除此 Key 及其凭据吗？"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"nav": "Tavily Search",
			"heading": "Tavily Search",
			"intro": "Manage the Tavily web-search credential and search behavior.",
			"name": "Tavily Web Search",
			"description": "Manage Tavily credentials exclusively through the API key pool.",
			"expand": "Show settings",
			"collapse": "Hide settings",
			"endpoint": "Endpoint",
			"endpointHint": "Leave blank for the Tavily default; a proxy root or /search both work.",
			"searchDepth": "Search depth",
			"searchDepthHint": "basic or advanced.",
			"maxResults": "Max results",
			"maxResultsHint": "Maximum number of results per search.",
			"readOnly": "This deployment stores settings read-only.",
			"save": "Save",
			"saving": "Saving…",
			"discard": "Discard",
			"unsaved": "Unsaved",
			"overridden": "Overridden",
			"reset": "Reset to default",
			"saveFailed": "The deployment did not accept these values; they were left for you to correct.",
			"invalidNumber": "Enter a number, or leave blank to use the default.",
			"keysTitle": "API key pool",
			"keysHint": "Searches rotate through enabled keys. Values are write-only credentials and are never echoed.",
			"refreshAll": "Refresh all usage",
			"keyNamePlaceholder": "Name, e.g. Personal",
			"keyValuePlaceholder": "tvly-…",
			"addKey": "Add key",
			"adding": "Adding…",
			"keysEmpty": "No API keys yet. Add and enable at least one key before searching.",
			"configured": "Configured",
			"unconfigured": "Not configured",
			"credits": "credits",
			"searchUsage": "Search usage",
			"usageNotLoaded": "Select “Check usage” to load live data from Tavily.",
			"replacePlaceholder": "New key (never echoed)",
			"replace": "Replace",
			"refreshUsage": "Check usage",
			"loadingUsage": "Loading…",
			"delete": "Delete",
			"deleteConfirm": "Delete this key and its stored credential?"
		};
		//#endregion
		//#region \0@oxc-project+runtime@0.151.0/helpers/esm/typeof.js
		function _typeof(o) {
			"@babel/helpers - typeof";
			return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
				return typeof o;
			} : function(o) {
				return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
			}, _typeof(o);
		}
		//#endregion
		//#region \0@oxc-project+runtime@0.151.0/helpers/esm/toPrimitive.js
		function toPrimitive(t, r) {
			if ("object" != _typeof(t) || !t) return t;
			var e = t[Symbol.toPrimitive];
			if (void 0 !== e) {
				var i = e.call(t, r || "default");
				if ("object" != _typeof(i)) return i;
				throw new TypeError("@@toPrimitive must return a primitive value.");
			}
			return ("string" === r ? String : Number)(t);
		}
		//#endregion
		//#region \0@oxc-project+runtime@0.151.0/helpers/esm/toPropertyKey.js
		function toPropertyKey(t) {
			var i = toPrimitive(t, "string");
			return "symbol" == _typeof(i) ? i : i + "";
		}
		//#endregion
		//#region \0@oxc-project+runtime@0.151.0/helpers/esm/defineProperty.js
		function _defineProperty(e, r, t) {
			return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
				value: t,
				enumerable: !0,
				configurable: !0,
				writable: !0
			}) : e[r] = t, e;
		}
		//#endregion
		//#region src/client/service.ts
		/** Profile entry id (the plugin's settings namespace) this section edits. */
		const TAVILY_NS = "web-search-tavily";
		/**
		* The section's controller: binds the shared configuration form of the
		* `web-search-tavily` profile entry, bridges the credentials domain, and
		* exposes the staged form's snapshot plus the key-pool actions.
		*/
		var TavilyTabController = class {
			constructor(scope, remote) {
				_defineProperty(this, "scope", void 0);
				_defineProperty(this, "remote", void 0);
				_defineProperty(this, "form", void 0);
				_defineProperty(this, "store", void 0);
				_defineProperty(this, "keyStates", /* @__PURE__ */ new Map());
				_defineProperty(this, "unsubscribe", void 0);
				this.scope = scope;
				this.remote = remote;
				this.form = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(scope, [
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("endpoint"),
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("searchDepth"),
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("maxResults")
				]);
				this.store = this.form.bind(() => this.projection());
				this.unsubscribe = scope.subscribe(() => {
					this.readKeys();
				});
				this.readKeys();
			}
			/** Release the form and scope subscriptions. */
			dispose() {
				this.unsubscribe();
				this.form.dispose();
			}
			projection() {
				return {
					...this.form.shell(),
					endpoint: this.form.field("endpoint"),
					searchDepth: this.form.field("searchDepth"),
					maxResults: this.form.field("maxResults"),
					keys: this.keys().map((row) => this.keyStates.get(row.id) ?? {
						...row,
						enabled: row.enabled !== false,
						configured: false,
						writable: true,
						loading: false
					})
				};
			}
			/** The face the section's slot registration injects. */
			inject() {
				return {
					hooks: { tavilyTab: this.store },
					...this.form.actions(),
					addKey: (name, value) => this.addKey(name, value),
					renameKey: (id, name) => this.renameKey(id, name),
					replaceKey: (id, value) => this.replaceKey(id, value),
					removeKey: (id) => this.removeKey(id),
					toggleKey: (id, enabled) => this.toggleKey(id, enabled),
					refreshUsage: (id) => this.refreshUsage(id),
					refreshAllUsage: () => this.refreshAllUsage()
				};
			}
			keys() {
				const rows = this.scope.getSnapshot().value?.keys;
				return Array.isArray(rows) ? rows : [];
			}
			/** Replace the whole public key pool in one revision-fenced write. */
			async storeKeys(keys) {
				await this.scope.mutate([{
					op: "set",
					path: ["keys"],
					value: keys
				}]);
				await this.readKeys();
			}
			async readKeys() {
				const rows = this.keys();
				if (rows.length === 0) {
					this.keyStates.clear();
					this.store.set(this.projection());
					return;
				}
				let response;
				try {
					response = await this.remote.describe(rows.map((row) => row.ref));
				} catch {
					return;
				}
				if (!response.ok) return;
				const views = response.value;
				const next = /* @__PURE__ */ new Map();
				for (const row of rows) {
					const previous = this.keyStates.get(row.id);
					const view = views[row.ref];
					next.set(row.id, {
						id: row.id,
						name: row.name,
						ref: row.ref,
						enabled: row.enabled !== false,
						configured: view?.configured ?? false,
						writable: view?.writable ?? true,
						loading: previous?.loading ?? false,
						...previous?.usage === void 0 ? {} : { usage: previous.usage },
						...previous?.error === void 0 ? {} : { error: previous.error }
					});
				}
				this.keyStates = next;
				this.store.set(this.projection());
			}
			async addKey(name, value) {
				const cleanName = name.trim();
				const cleanValue = value.trim();
				if (cleanName === "" || cleanValue === "") return false;
				const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
				const ref = `TAVILY_API_KEY_${id.toUpperCase()}`;
				if (!(await this.remote.set(ref, cleanValue)).ok) return false;
				await this.storeKeys([...this.keys(), {
					id,
					name: cleanName,
					ref,
					enabled: true
				}]);
				return true;
			}
			async renameKey(id, name) {
				const clean = name.trim();
				if (clean === "") return false;
				const rows = this.keys();
				await this.storeKeys(rows.map((row) => row.id === id ? {
					...row,
					name: clean
				} : row));
				return true;
			}
			async replaceKey(id, value) {
				const row = this.keys().find((item) => item.id === id);
				if (row === void 0 || value.trim() === "") return false;
				const response = await this.remote.set(row.ref, value.trim());
				await this.readKeys();
				return response.ok;
			}
			async removeKey(id) {
				const row = this.keys().find((item) => item.id === id);
				if (row === void 0) return false;
				if (!(await this.remote.unset(row.ref)).ok) return false;
				await this.storeKeys(this.keys().filter((item) => item.id !== id));
				return true;
			}
			async toggleKey(id, enabled) {
				await this.storeKeys(this.keys().map((row) => row.id === id ? {
					...row,
					enabled
				} : row));
				return true;
			}
			async refreshUsage(id) {
				const row = this.keys().find((item) => item.id === id);
				const state = this.keyStates.get(id);
				if (row === void 0 || state === void 0) return false;
				this.keyStates.set(id, {
					...state,
					loading: true,
					error: void 0
				});
				this.store.set(this.projection());
				let response;
				try {
					response = await fetch(`/api/tavily/usage?ref=${encodeURIComponent(row.ref)}`, { cache: "no-store" });
				} catch (error) {
					this.keyStates.set(id, {
						...state,
						loading: false,
						error: error instanceof Error ? error.message : String(error)
					});
					this.store.set(this.projection());
					return false;
				}
				const contentType = response.headers.get("content-type") ?? "";
				let body;
				let rawText = "";
				if (contentType.includes("application/json")) try {
					body = await response.json();
				} catch {
					body = void 0;
				}
				else try {
					rawText = (await response.text()).slice(0, 300);
				} catch {
					rawText = "";
				}
				this.keyStates.set(id, {
					...state,
					loading: false,
					...response.ok && body?.ok === true && body.usage !== void 0 ? {
						usage: body.usage,
						error: void 0
					} : { error: body?.message ?? (rawText !== "" ? rawText : `HTTP ${String(response.status)}`) }
				});
				this.store.set(this.projection());
				return this.keyStates.get(id)?.error === void 0;
			}
			async refreshAllUsage() {
				await Promise.all(this.keys().map((row) => this.refreshUsage(row.id)));
			}
		};
		//#endregion
		//#region \0dsh-css:D:\plugin\deepseek-harness\plugins\dsh-web-search-tavily\src\client\TavilyTab.module.css.mjs
		const css = ".b0f8Va_section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.b0f8Va_heading{margin:0;font-size:18px;font-weight:600}.b0f8Va_intro{color:var(--dsw-alias-label-tertiary);margin:0 0 2px;font-size:13px;line-height:1.5}.b0f8Va_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.b0f8Va_card:hover{border-color:var(--dsw-alias-label-dimmed)}.b0f8Va_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.b0f8Va_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.b0f8Va_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.b0f8Va_icon{color:var(--dsw-alias-label-tertiary);flex:none}.b0f8Va_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.b0f8Va_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.b0f8Va_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.b0f8Va_pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.b0f8Va_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.b0f8Va_chevronOpen{transform:rotate(180deg)}.b0f8Va_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.b0f8Va_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.b0f8Va_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.b0f8Va_field+.b0f8Va_field{border-top:1px solid var(--dsw-alias-border-l2)}.b0f8Va_head{align-items:center;gap:8px;display:flex}.b0f8Va_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.b0f8Va_badges{align-items:center;gap:8px;display:inline-flex}.b0f8Va_badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.b0f8Va_badgeMuted{white-space:nowrap;color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px}.b0f8Va_reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.b0f8Va_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.b0f8Va_reset:disabled{cursor:default}.b0f8Va_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.b0f8Va_input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.b0f8Va_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.b0f8Va_inputInvalid{border-color:var(--dsw-alias-label-error)}.b0f8Va_invalid{color:var(--dsw-alias-label-error);margin:0;font-size:12px;line-height:1.5}.b0f8Va_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.b0f8Va_keyManager{border-top:1px solid var(--dsw-alias-border-l2);padding:16px 0}.b0f8Va_keyManagerHead,.b0f8Va_keyTop,.b0f8Va_keyActions,.b0f8Va_usageMeta{align-items:center;gap:10px;display:flex}.b0f8Va_keyManagerHead{justify-content:space-between;margin-bottom:12px}.b0f8Va_subheading{margin:0 0 3px;font-size:14px;font-weight:600}.b0f8Va_addKeyRow{grid-template-columns:minmax(120px,.7fr) minmax(220px,1.4fr) auto;gap:8px;display:grid}.b0f8Va_keyList{gap:10px;margin-top:12px;display:grid}.b0f8Va_empty{color:var(--dsw-alias-label-tertiary);text-align:center;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:22px;font-size:13px}.b0f8Va_keyCard{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px}.b0f8Va_keyIdentity{flex:1;gap:3px;min-width:0;display:grid}.b0f8Va_nameInput{color:var(--dsw-alias-label-primary);font:inherit;background:0 0;border:0;outline:none;padding:0;font-size:13px;font-weight:600}.b0f8Va_ref{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;font-size:10px;overflow:hidden}.b0f8Va_switch,.b0f8Va_switchOn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;border-radius:999px;width:34px;height:20px;padding:2px}.b0f8Va_switch span,.b0f8Va_switchOn span{background:var(--dsw-alias-label-tertiary);border-radius:50%;width:14px;height:14px;transition:transform .15s;display:block}.b0f8Va_switchOn{background:var(--dsw-alias-brand-primary)}.b0f8Va_switchOn span{background:#fff;transform:translate(14px)}.b0f8Va_usage{margin:12px 0}.b0f8Va_usageNumbers{color:var(--dsw-alias-label-secondary);align-items:baseline;gap:4px;display:flex}.b0f8Va_usageNumbers strong{color:var(--dsw-alias-label-primary);font-size:20px}.b0f8Va_meter{background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:6px;margin:7px 0;overflow:hidden}.b0f8Va_meter span{background:var(--dsw-alias-brand-primary);border-radius:inherit;height:100%;display:block}.b0f8Va_usageMeta{color:var(--dsw-alias-label-tertiary);justify-content:space-between;font-size:11px}.b0f8Va_keyActions{flex-wrap:wrap;margin-top:10px}.b0f8Va_compactInput{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-width:150px;height:30px;color:var(--dsw-alias-label-primary);border-radius:7px;flex:1;padding:0 10px}.b0f8Va_danger{appearance:none;font:inherit;cursor:pointer;border:1px solid color-mix(in srgb,var(--dsw-alias-label-error) 35%,transparent);color:var(--dsw-alias-label-error);background:0 0;border-radius:8px;padding:5px 12px;font-size:12px}.b0f8Va_danger:disabled{opacity:.4;cursor:default}@media (width<=680px){.b0f8Va_addKeyRow{grid-template-columns:1fr}.b0f8Va_keyTop{align-items:flex-start}.b0f8Va_keyActions>*{width:100%}}.b0f8Va_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.b0f8Va_failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}.b0f8Va_discard,.b0f8Va_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.b0f8Va_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.b0f8Va_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.b0f8Va_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.b0f8Va_discard:disabled,.b0f8Va_save:disabled{opacity:.4;cursor:default}.b0f8Va_discard:focus-visible,.b0f8Va_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}";
		const tagId = "dsh-tavily-web-search/TavilyTab.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-tavily-web-search";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TavilyTab_module_css_default = {
			"chevron": "b0f8Va_chevron",
			"usageNumbers": "b0f8Va_usageNumbers",
			"ref": "b0f8Va_ref",
			"heading": "b0f8Va_heading",
			"switchOn": "b0f8Va_switchOn",
			"compactInput": "b0f8Va_compactInput",
			"inputInvalid": "b0f8Va_inputInvalid",
			"keyActions": "b0f8Va_keyActions",
			"addKeyRow": "b0f8Va_addKeyRow",
			"keyList": "b0f8Va_keyList",
			"empty": "b0f8Va_empty",
			"header": "b0f8Va_header",
			"chevronOpen": "b0f8Va_chevronOpen",
			"cardOpen": "b0f8Va_cardOpen",
			"headText": "b0f8Va_headText",
			"body": "b0f8Va_body",
			"label": "b0f8Va_label",
			"badge": "b0f8Va_badge",
			"field": "b0f8Va_field",
			"hint": "b0f8Va_hint",
			"usageMeta": "b0f8Va_usageMeta",
			"invalid": "b0f8Va_invalid",
			"badgeMuted": "b0f8Va_badgeMuted",
			"keyCard": "b0f8Va_keyCard",
			"keyIdentity": "b0f8Va_keyIdentity",
			"nameInput": "b0f8Va_nameInput",
			"meter": "b0f8Va_meter",
			"failed": "b0f8Va_failed",
			"save": "b0f8Va_save",
			"footer": "b0f8Va_footer",
			"badges": "b0f8Va_badges",
			"name": "b0f8Va_name",
			"discard": "b0f8Va_discard",
			"switch": "b0f8Va_switch",
			"danger": "b0f8Va_danger",
			"description": "b0f8Va_description",
			"readOnly": "b0f8Va_readOnly",
			"keyManager": "b0f8Va_keyManager",
			"usage": "b0f8Va_usage",
			"keyManagerHead": "b0f8Va_keyManagerHead",
			"section": "b0f8Va_section",
			"pending": "b0f8Va_pending",
			"keyTop": "b0f8Va_keyTop",
			"icon": "b0f8Va_icon",
			"input": "b0f8Va_input",
			"card": "b0f8Va_card",
			"head": "b0f8Va_head",
			"intro": "b0f8Va_intro",
			"reset": "b0f8Va_reset",
			"subheading": "b0f8Va_subheading"
		};
		//#endregion
		//#region src/client/TavilyTab.tsx
		/**
		* TavilyTab: the feature-owned Plugins settings tab rendering the Tavily
		* provider configuration inside a disclosure card styled exactly like the
		* shipped plugin cards (settings-plugins' PluginCard): a header with the
		* provider icon, title, description, pending badge and chevron; the write-only
		* API-key secret control plus endpoint / depth / result-count fields; and the
		* discard/save footer. All styling rides the `--dsw-alias-*` tokens, so the
		* tab follows the active theme.
		*/
		/** One labelled text control (mirrors settings-plugins' ValueField). */
		function ValueField(props) {
			const field = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavilyTab_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: TavilyTab_module_css_default.label,
							htmlFor: field.id,
							children: field.label
						}), field.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: TavilyTab_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavilyTab_module_css_default.badge,
								children: field.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavilyTab_module_css_default.reset,
								disabled: field.disabled,
								onClick: field.onReset,
								children: field.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: field.id,
						className: field.invalid ? TavilyTab_module_css_default.inputInvalid : TavilyTab_module_css_default.input,
						type: "text",
						...field.numeric === true ? { inputMode: "numeric" } : {},
						...field.invalid ? { "aria-invalid": true } : {},
						value: field.text,
						placeholder: field.placeholder ?? "",
						disabled: field.disabled,
						onChange: (event) => {
							field.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: field.invalid ? TavilyTab_module_css_default.invalid : TavilyTab_module_css_default.hint,
						children: field.invalid ? field.invalidLabel : field.hint
					})
				]
			});
		}
		/** Multi-key manager: public names in settings, write-only values in credentials. */
		function KeyManager(props) {
			const [name, setName] = (0, react.useState)("");
			const [secret, setSecret] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const add = async () => {
				setBusy(true);
				const ok = await props.addKey(name, secret);
				setBusy(false);
				if (ok) {
					setName("");
					setSecret("");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TavilyTab_module_css_default.keyManager,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.keyManagerHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: TavilyTab_module_css_default.subheading,
							children: props.t("keysTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: TavilyTab_module_css_default.hint,
							children: props.t("keysHint")
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: TavilyTab_module_css_default.discard,
							disabled: props.keys.length === 0,
							onClick: () => void props.refreshAllUsage(),
							children: props.t("refreshAll")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.addKeyRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: TavilyTab_module_css_default.input,
								value: name,
								placeholder: props.t("keyNamePlaceholder"),
								onChange: (event) => setName(event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: TavilyTab_module_css_default.input,
								type: "password",
								autoComplete: "off",
								value: secret,
								placeholder: props.t("keyValuePlaceholder"),
								onChange: (event) => setSecret(event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavilyTab_module_css_default.save,
								disabled: busy || name.trim() === "" || secret.trim() === "",
								onClick: () => void add(),
								children: props.t(busy ? "adding" : "addKey")
							})
						]
					}),
					props.keys.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: TavilyTab_module_css_default.empty,
						children: props.t("keysEmpty")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: TavilyTab_module_css_default.keyList,
						children: props.keys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyRow, {
							item: key,
							...props
						}, key.id))
					})
				]
			});
		}
		function KeyRow(props) {
			const { item } = props;
			const [name, setName] = (0, react.useState)(item.name);
			const [secret, setSecret] = (0, react.useState)("");
			const usage = item.usage;
			const account = usage?.account;
			const keyUsage = usage?.key;
			const used = account?.plan_usage ?? keyUsage?.usage ?? 0;
			const limit = account?.plan_limit ?? keyUsage?.limit ?? 0;
			const searchUsed = account?.search_usage ?? keyUsage?.search_usage ?? 0;
			const percent = limit > 0 ? Math.min(100, used / limit * 100) : 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: TavilyTab_module_css_default.keyCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.keyTop,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavilyTab_module_css_default.keyIdentity,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: TavilyTab_module_css_default.nameInput,
									value: name,
									onChange: (event) => setName(event.target.value),
									onBlur: () => {
										if (name.trim() !== item.name) props.renameKey(item.id, name);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
									className: TavilyTab_module_css_default.ref,
									children: item.ref
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: item.configured ? TavilyTab_module_css_default.badge : TavilyTab_module_css_default.badgeMuted,
								children: props.t(item.configured ? "configured" : "unconfigured")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "switch",
								"aria-checked": item.enabled,
								className: item.enabled ? TavilyTab_module_css_default.switchOn : TavilyTab_module_css_default.switch,
								onClick: () => void props.toggleKey(item.id, !item.enabled),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
							})
						]
					}),
					usage !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.usage,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavilyTab_module_css_default.usageNumbers,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: used }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									limit > 0 ? `/ ${limit}` : "",
									" ",
									props.t("credits")
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: TavilyTab_module_css_default.meter,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: `${percent}%` } })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavilyTab_module_css_default.usageMeta,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									props.t("searchUsage"),
									": ",
									searchUsed
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: item.usage?.account?.current_plan ?? "" })]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: TavilyTab_module_css_default.hint,
						children: item.error ?? props.t("usageNotLoaded")
					}),
					item.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: TavilyTab_module_css_default.invalid,
						children: item.error
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.keyActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: TavilyTab_module_css_default.compactInput,
								type: "password",
								autoComplete: "off",
								value: secret,
								placeholder: props.t("replacePlaceholder"),
								onChange: (event) => setSecret(event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavilyTab_module_css_default.discard,
								disabled: secret.trim() === "" || !item.writable,
								onClick: () => {
									props.replaceKey(item.id, secret).then((ok) => {
										if (ok) setSecret("");
									});
								},
								children: props.t("replace")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavilyTab_module_css_default.discard,
								disabled: item.loading || !item.configured,
								onClick: () => void props.refreshUsage(item.id),
								children: props.t(item.loading ? "loadingUsage" : "refreshUsage")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TavilyTab_module_css_default.danger,
								disabled: !item.writable,
								onClick: () => {
									if (window.confirm(props.t("deleteConfirm"))) props.removeKey(item.id);
								},
								children: props.t("delete")
							})
						]
					})
				]
			});
		}
		/**
		* Render the Tavily settings tab as a disclosure card.
		* @param props - the composed props: the controller's hooks seat (`useTavilyTab`),
		* form actions, and the standard locale `t`.
		* @returns the card, or nothing while the namespace is unavailable.
		*/
		function TavilyTab(props) {
			const { t } = props;
			const state = props.useTavilyTab((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			if (!state.available) return null;
			const disabled = !state.writable;
			const blocked = !state.dirty || state.invalid || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: TavilyTab_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: TavilyTab_module_css_default.heading,
					children: t("heading")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: TavilyTab_module_css_default.intro,
					children: t("intro")
				})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: TavilyTab_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TavilyTab_module_css_default.header,
						"aria-expanded": open,
						"aria-label": `${t(open ? "collapse" : "expand")}: ${t("name")}`,
						onClick: () => {
							setOpen(!open);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutlineRegular, {
								size: 14,
								className: TavilyTab_module_css_default.icon
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: TavilyTab_module_css_default.headText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavilyTab_module_css_default.name,
									children: t("name")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TavilyTab_module_css_default.description,
									children: t("description")
								})]
							}),
							state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TavilyTab_module_css_default.pending,
								children: t("unsaved")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
								size: 14,
								className: open ? `${TavilyTab_module_css_default.chevron} ${TavilyTab_module_css_default.chevronOpen}` : TavilyTab_module_css_default.chevron
							})
						]
					}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TavilyTab_module_css_default.body,
						children: [
							!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: TavilyTab_module_css_default.readOnly,
								role: "status",
								children: t("readOnly")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "tavily-config-endpoint",
								label: t("endpoint"),
								hint: t("endpointHint"),
								overriddenLabel: t("overridden"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								disabled,
								...state.endpoint,
								onEdit: (text) => {
									props.edit("endpoint", text);
								},
								onReset: () => {
									props.resetField("endpoint");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "tavily-config-search-depth",
								label: t("searchDepth"),
								hint: t("searchDepthHint"),
								overriddenLabel: t("overridden"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								disabled,
								...state.searchDepth,
								onEdit: (text) => {
									props.edit("searchDepth", text);
								},
								onReset: () => {
									props.resetField("searchDepth");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "tavily-config-max-results",
								label: t("maxResults"),
								hint: t("maxResultsHint"),
								overriddenLabel: t("overridden"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								disabled,
								...state.maxResults,
								onEdit: (text) => {
									props.edit("maxResults", text);
								},
								onReset: () => {
									props.resetField("maxResults");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyManager, {
								keys: state.keys,
								t,
								addKey: props.addKey,
								renameKey: props.renameKey,
								replaceKey: props.replaceKey,
								removeKey: props.removeKey,
								toggleKey: props.toggleKey,
								refreshUsage: props.refreshUsage,
								refreshAllUsage: props.refreshAllUsage
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: TavilyTab_module_css_default.footer,
								children: [
									state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: TavilyTab_module_css_default.failed,
										role: "status",
										children: t("saveFailed")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: TavilyTab_module_css_default.discard,
										disabled: !state.dirty || state.saving,
										onClick: props.discard,
										children: t("discard")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: TavilyTab_module_css_default.save,
										disabled: blocked,
										onClick: props.save,
										children: t(state.saving ? "saving" : "save")
									})
								]
							})
						]
					}) : null]
				})]
			});
		}
		const TavilySettingsSection = TavilyTab;
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.tavily";
		/** Required services: the slot registry, locale, the wire face, and the shared config forms. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"configForms"
		];
		/**
		* Client plugin body: register the section dictionaries, bind the plugin's
		* shared configuration form, and contribute the Tavily section into the
		* settings navigation while the Host serves the entry.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-tavily-web-search: dictionaries");
			const controller = new TavilyTabController(ctx.configForms.get(TAVILY_NS), ctx.remote.credentials);
			ctx.effect(() => () => {
				controller.dispose();
			}, "dsh-tavily-web-search: form subscription");
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", () => {
				controller.readKeys();
			}), "dsh-tavily-web-search: credential invalidations");
			ctx.effect(() => ctx.configForms.whileServed([TAVILY_NS], () => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "tavily-search",
				order: 25,
				label: () => t("nav"),
				locale: NS,
				inject: () => controller.inject()
			}, TavilySettingsSection))), "dsh-tavily-web-search: settings section");
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map