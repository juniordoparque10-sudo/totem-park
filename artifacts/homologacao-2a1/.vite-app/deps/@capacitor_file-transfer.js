import { registerPlugin } from "./@capacitor_core.js";
//#region node_modules/@capacitor/file-transfer/dist/plugin.mjs
function s(n) {
	n.CapacitorUtils.Synapse = new Proxy({}, { get(a, o) {
		return new Proxy({}, { get(d, i) {
			return (w, c, r) => {
				const t = n.Capacitor.Plugins[o];
				if (t === void 0) {
					r(/* @__PURE__ */ new Error(`Capacitor plugin ${o} not found`));
					return;
				}
				if (typeof t[i] != "function") {
					r(/* @__PURE__ */ new Error(`Method ${i} not found in Capacitor plugin ${o}`));
					return;
				}
				(async () => {
					try {
						c(await t[i](w));
					} catch (e) {
						r(e);
					}
				})();
			};
		} });
	} });
}
function u(n) {
	n.CapacitorUtils.Synapse = new Proxy({}, { get(a, o) {
		return n.cordova.plugins[o];
	} });
}
function f(n = !1) {
	typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !n ? s(window) : window.cordova !== void 0 && u(window));
}
var g = registerPlugin("FileTransfer", { web: () => import("./web-BjKL51lK-DzFq92c9.js").then((n) => new n.FileTransferWeb()) });
f();
//#endregion
export { g as FileTransfer };

//# sourceMappingURL=@capacitor_file-transfer.js.map