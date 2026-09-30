//#region node_modules/@firebase/util/dist/postinstall.mjs
var e = () => void 0, t = function(e) {
	let t = [], n = 0;
	for (let r = 0; r < e.length; r++) {
		let i = e.charCodeAt(r);
		i < 128 ? t[n++] = i : i < 2048 ? (t[n++] = i >> 6 | 192, t[n++] = i & 63 | 128) : (i & 64512) == 55296 && r + 1 < e.length && (e.charCodeAt(r + 1) & 64512) == 56320 ? (i = 65536 + ((i & 1023) << 10) + (e.charCodeAt(++r) & 1023), t[n++] = i >> 18 | 240, t[n++] = i >> 12 & 63 | 128, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128) : (t[n++] = i >> 12 | 224, t[n++] = i >> 6 & 63 | 128, t[n++] = i & 63 | 128);
	}
	return t;
}, n = function(e) {
	let t = [], n = 0, r = 0;
	for (; n < e.length;) {
		let i = e[n++];
		if (i < 128) t[r++] = String.fromCharCode(i);
		else if (i > 191 && i < 224) {
			let a = e[n++];
			t[r++] = String.fromCharCode((i & 31) << 6 | a & 63);
		} else if (i > 239 && i < 365) {
			let a = e[n++], o = e[n++], s = e[n++], c = ((i & 7) << 18 | (a & 63) << 12 | (o & 63) << 6 | s & 63) - 65536;
			t[r++] = String.fromCharCode(55296 + (c >> 10)), t[r++] = String.fromCharCode(56320 + (c & 1023));
		} else {
			let a = e[n++], o = e[n++];
			t[r++] = String.fromCharCode((i & 15) << 12 | (a & 63) << 6 | o & 63);
		}
	}
	return t.join("");
}, r = {
	byteToCharMap_: null,
	charToByteMap_: null,
	byteToCharMapWebSafe_: null,
	charToByteMapWebSafe_: null,
	ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
	get ENCODED_VALS() {
		return this.ENCODED_VALS_BASE + "+/=";
	},
	get ENCODED_VALS_WEBSAFE() {
		return this.ENCODED_VALS_BASE + "-_.";
	},
	HAS_NATIVE_SUPPORT: typeof atob == "function",
	encodeByteArray(e, t) {
		if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
		this.init_();
		let n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, r = [];
		for (let t = 0; t < e.length; t += 3) {
			let i = e[t], a = t + 1 < e.length, o = a ? e[t + 1] : 0, s = t + 2 < e.length, c = s ? e[t + 2] : 0, l = i >> 2, u = (i & 3) << 4 | o >> 4, d = (o & 15) << 2 | c >> 6, f = c & 63;
			s || (f = 64, a || (d = 64)), r.push(n[l], n[u], n[d], n[f]);
		}
		return r.join("");
	},
	encodeString(e, n) {
		return this.HAS_NATIVE_SUPPORT && !n ? btoa(e) : this.encodeByteArray(t(e), n);
	},
	decodeString(e, t) {
		return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : n(this.decodeStringToByteArray(e, t));
	},
	decodeStringToByteArray(e, t) {
		this.init_();
		let n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, r = [];
		for (let t = 0; t < e.length;) {
			let a = n[e.charAt(t++)], o = t < e.length ? n[e.charAt(t)] : 0;
			++t;
			let s = t < e.length ? n[e.charAt(t)] : 64;
			++t;
			let c = t < e.length ? n[e.charAt(t)] : 64;
			if (++t, a == null || o == null || s == null || c == null) throw new i();
			let l = a << 2 | o >> 4;
			if (r.push(l), s !== 64) {
				let e = o << 4 & 240 | s >> 2;
				if (r.push(e), c !== 64) {
					let e = s << 6 & 192 | c;
					r.push(e);
				}
			}
		}
		return r;
	},
	init_() {
		if (!this.byteToCharMap_) {
			this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
			for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
		}
	}
}, i = class extends Error {
	constructor() {
		super(...arguments), this.name = "DecodeBase64StringError";
	}
}, a = function(e) {
	let n = t(e);
	return r.encodeByteArray(n, !0);
}, o = function(e) {
	return a(e).replace(/\./g, "");
}, s = function(e) {
	try {
		return r.decodeString(e, !0);
	} catch (e) {
		console.error("base64Decode failed: ", e);
	}
	return null;
};
function c() {
	if (typeof self < "u") return self;
	if (typeof window < "u") return window;
	if (typeof global < "u") return global;
	throw Error("Unable to locate global object.");
}
var l = () => c().__FIREBASE_DEFAULTS__, u = () => {
	if (typeof process > "u" || process.env === void 0) return;
	let e = process.env.__FIREBASE_DEFAULTS__;
	if (e) return JSON.parse(e);
}, d = () => {
	if (typeof document > "u") return;
	let e;
	try {
		e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
	} catch {
		return;
	}
	let t = e && s(e[1]);
	return t && JSON.parse(t);
}, f = () => {
	try {
		return e() || l() || u() || d();
	} catch (e) {
		console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
		return;
	}
}, p = (e) => f()?.emulatorHosts?.[e], m = (e) => {
	let t = p(e);
	if (!t) return;
	let n = t.lastIndexOf(":");
	if (n <= 0 || n + 1 === t.length) throw Error(`Invalid host ${t} with no separate hostname and port!`);
	let r = parseInt(t.substring(n + 1), 10);
	return t[0] === "[" ? [t.substring(1, n - 1), r] : [t.substring(0, n), r];
}, h = () => f()?.config, g = (e) => f()?.[`_${e}`], ee = class {
	constructor() {
		this.reject = () => {}, this.resolve = () => {}, this.promise = new Promise((e, t) => {
			this.resolve = e, this.reject = t;
		});
	}
	wrapCallback(e) {
		return (t, n) => {
			t ? this.reject(t) : this.resolve(n), typeof e == "function" && (this.promise.catch(() => {}), e.length === 1 ? e(t) : e(t, n));
		};
	}
};
function te(e, t) {
	if (e.uid) throw Error("The \"uid\" field is no longer supported by mockUserToken. Please use \"sub\" instead for Firebase Auth User ID.");
	let n = {
		alg: "none",
		type: "JWT"
	}, r = t || "demo-project", i = e.iat || 0, a = e.sub || e.user_id;
	if (!a) throw Error("mockUserToken must contain 'sub' or 'user_id' field!");
	let s = {
		iss: `https://securetoken.google.com/${r}`,
		aud: r,
		iat: i,
		exp: i + 3600,
		auth_time: i,
		sub: a,
		user_id: a,
		firebase: {
			sign_in_provider: "custom",
			identities: {}
		},
		...e
	};
	return [
		o(JSON.stringify(n)),
		o(JSON.stringify(s)),
		""
	].join(".");
}
function _() {
	return typeof navigator < "u" && typeof navigator.userAgent == "string" ? navigator.userAgent : "";
}
function ne() {
	return typeof window < "u" && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(_());
}
function re() {
	let e = f()?.forceEnvironment;
	if (e === "node") return !0;
	if (e === "browser") return !1;
	try {
		return Object.prototype.toString.call(global.process) === "[object process]";
	} catch {
		return !1;
	}
}
function ie() {
	return typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers";
}
function ae() {
	let e = typeof chrome == "object" ? chrome.runtime : typeof browser == "object" ? browser.runtime : void 0;
	return typeof e == "object" && e.id !== void 0;
}
function oe() {
	return typeof navigator == "object" && navigator.product === "ReactNative";
}
function se() {
	let e = _();
	return e.indexOf("MSIE ") >= 0 || e.indexOf("Trident/") >= 0;
}
function ce() {
	return !re() && !!navigator.userAgent && navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
}
function v() {
	try {
		return typeof indexedDB == "object";
	} catch {
		return !1;
	}
}
function le() {
	return new Promise((e, t) => {
		try {
			let n = !0, r = "validate-browser-context-for-indexeddb-analytics-module", i = self.indexedDB.open(r);
			i.onsuccess = () => {
				i.result.close(), n || self.indexedDB.deleteDatabase(r), e(!0);
			}, i.onupgradeneeded = () => {
				n = !1;
			}, i.onerror = () => {
				t(i.error?.message || "");
			};
		} catch (e) {
			t(e);
		}
	});
}
var ue = "FirebaseError", de = class e extends Error {
	constructor(t, n, r) {
		super(n), this.code = t, this.customData = r, this.name = ue, Object.setPrototypeOf(this, e.prototype), Error.captureStackTrace && Error.captureStackTrace(this, fe.prototype.create);
	}
}, fe = class {
	constructor(e, t, n) {
		this.service = e, this.serviceName = t, this.errors = n;
	}
	create(e, ...t) {
		let n = t[0] || {}, r = `${this.service}/${e}`, i = this.errors[e], a = i ? pe(i, n) : "Error";
		return new de(r, `${this.serviceName}: ${a} (${r}).`, n);
	}
};
function pe(e, t) {
	return e.replace(me, (e, n) => {
		let r = t[n];
		return r == null ? `<${n}?>` : String(r);
	});
}
var me = /\{\$([^}]+)}/g;
function he(e) {
	for (let t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
	return !0;
}
function ge(e, t) {
	if (e === t) return !0;
	let n = Object.keys(e), r = Object.keys(t);
	for (let i of n) {
		if (!r.includes(i)) return !1;
		let n = e[i], a = t[i];
		if (_e(n) && _e(a)) {
			if (!ge(n, a)) return !1;
		} else if (n !== a) return !1;
	}
	for (let e of r) if (!n.includes(e)) return !1;
	return !0;
}
function _e(e) {
	return typeof e == "object" && !!e;
}
function ve(e) {
	let t = [];
	for (let [n, r] of Object.entries(e)) Array.isArray(r) ? r.forEach((e) => {
		t.push(encodeURIComponent(n) + "=" + encodeURIComponent(e));
	}) : t.push(encodeURIComponent(n) + "=" + encodeURIComponent(r));
	return t.length ? "&" + t.join("&") : "";
}
function ye(e) {
	let t = {};
	return e.replace(/^\?/, "").split("&").forEach((e) => {
		if (e) {
			let [n, r] = e.split("=");
			t[decodeURIComponent(n)] = decodeURIComponent(r);
		}
	}), t;
}
function be(e) {
	let t = e.indexOf("?");
	if (!t) return "";
	let n = e.indexOf("#", t);
	return e.substring(t, n > 0 ? n : void 0);
}
function xe(e, t) {
	let n = new Se(e, t);
	return n.subscribe.bind(n);
}
var Se = class {
	constructor(e, t) {
		this.observers = [], this.unsubscribes = [], this.observerCount = 0, this.task = Promise.resolve(), this.finalized = !1, this.onNoObservers = t, this.task.then(() => {
			e(this);
		}).catch((e) => {
			this.error(e);
		});
	}
	next(e) {
		this.forEachObserver((t) => {
			t.next(e);
		});
	}
	error(e) {
		this.forEachObserver((t) => {
			t.error(e);
		}), this.close(e);
	}
	complete() {
		this.forEachObserver((e) => {
			e.complete();
		}), this.close();
	}
	subscribe(e, t, n) {
		let r;
		if (e === void 0 && t === void 0 && n === void 0) throw Error("Missing Observer.");
		r = Ce(e, [
			"next",
			"error",
			"complete"
		]) ? e : {
			next: e,
			error: t,
			complete: n
		}, r.next === void 0 && (r.next = we), r.error === void 0 && (r.error = we), r.complete === void 0 && (r.complete = we);
		let i = this.unsubscribeOne.bind(this, this.observers.length);
		return this.finalized && this.task.then(() => {
			try {
				this.finalError ? r.error(this.finalError) : r.complete();
			} catch {}
		}), this.observers.push(r), i;
	}
	unsubscribeOne(e) {
		this.observers === void 0 || this.observers[e] === void 0 || (delete this.observers[e], --this.observerCount, this.observerCount === 0 && this.onNoObservers !== void 0 && this.onNoObservers(this));
	}
	forEachObserver(e) {
		if (!this.finalized) for (let t = 0; t < this.observers.length; t++) this.sendOne(t, e);
	}
	sendOne(e, t) {
		this.task.then(() => {
			if (this.observers !== void 0 && this.observers[e] !== void 0) try {
				t(this.observers[e]);
			} catch (e) {
				typeof console < "u" && console.error && console.error(e);
			}
		});
	}
	close(e) {
		this.finalized || (this.finalized = !0, e !== void 0 && (this.finalError = e), this.task.then(() => {
			this.observers = void 0, this.onNoObservers = void 0;
		}));
	}
};
function Ce(e, t) {
	if (typeof e != "object" || !e) return !1;
	for (let n of t) if (n in e && typeof e[n] == "function") return !0;
	return !1;
}
function we() {}
function y(e) {
	return e && e._delegate ? e._delegate : e;
}
function Te(e) {
	try {
		return (e.startsWith("http://") || e.startsWith("https://") ? new URL(e).hostname : e).endsWith(".cloudworkstations.dev");
	} catch {
		return !1;
	}
}
async function Ee(e) {
	return (await fetch(e, { credentials: "include" })).ok;
}
//#endregion
//#region node_modules/@firebase/component/dist/esm/index.esm.js
var De = class {
	constructor(e, t, n) {
		this.name = e, this.instanceFactory = t, this.type = n, this.multipleInstances = !1, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
	}
	setInstantiationMode(e) {
		return this.instantiationMode = e, this;
	}
	setMultipleInstances(e) {
		return this.multipleInstances = e, this;
	}
	setServiceProps(e) {
		return this.serviceProps = e, this;
	}
	setInstanceCreatedCallback(e) {
		return this.onInstanceCreated = e, this;
	}
}, Oe = "[DEFAULT]", ke = class {
	constructor(e, t) {
		this.name = e, this.container = t, this.component = null, this.instances = /* @__PURE__ */ new Map(), this.instancesDeferred = /* @__PURE__ */ new Map(), this.instancesOptions = /* @__PURE__ */ new Map(), this.onInitCallbacks = /* @__PURE__ */ new Map();
	}
	get(e) {
		let t = this.normalizeInstanceIdentifier(e);
		if (!this.instancesDeferred.has(t)) {
			let e = new ee();
			if (this.instancesDeferred.set(t, e), this.isInitialized(t) || this.shouldAutoInitialize()) try {
				let n = this.getOrInitializeService({ instanceIdentifier: t });
				n && e.resolve(n);
			} catch {}
		}
		return this.instancesDeferred.get(t).promise;
	}
	getImmediate(e) {
		let t = this.normalizeInstanceIdentifier(e?.identifier), n = e?.optional ?? !1;
		if (this.isInitialized(t) || this.shouldAutoInitialize()) try {
			return this.getOrInitializeService({ instanceIdentifier: t });
		} catch (e) {
			if (n) return null;
			throw e;
		}
		else if (n) return null;
		else throw Error(`Service ${this.name} is not available`);
	}
	getComponent() {
		return this.component;
	}
	setComponent(e) {
		if (e.name !== this.name) throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);
		if (this.component) throw Error(`Component for ${this.name} has already been provided`);
		if (this.component = e, this.shouldAutoInitialize()) {
			if (je(e)) try {
				this.getOrInitializeService({ instanceIdentifier: Oe });
			} catch {}
			for (let [e, t] of this.instancesDeferred.entries()) {
				let n = this.normalizeInstanceIdentifier(e);
				try {
					let e = this.getOrInitializeService({ instanceIdentifier: n });
					t.resolve(e);
				} catch {}
			}
		}
	}
	clearInstance(e = Oe) {
		this.instancesDeferred.delete(e), this.instancesOptions.delete(e), this.instances.delete(e);
	}
	async delete() {
		let e = Array.from(this.instances.values());
		await Promise.all([...e.filter((e) => "INTERNAL" in e).map((e) => e.INTERNAL.delete()), ...e.filter((e) => "_delete" in e).map((e) => e._delete())]);
	}
	isComponentSet() {
		return this.component != null;
	}
	isInitialized(e = Oe) {
		return this.instances.has(e);
	}
	getOptions(e = Oe) {
		return this.instancesOptions.get(e) || {};
	}
	initialize(e = {}) {
		let { options: t = {} } = e, n = this.normalizeInstanceIdentifier(e.instanceIdentifier);
		if (this.isInitialized(n)) throw Error(`${this.name}(${n}) has already been initialized`);
		if (!this.isComponentSet()) throw Error(`Component ${this.name} has not been registered yet`);
		let r = this.getOrInitializeService({
			instanceIdentifier: n,
			options: t
		});
		for (let [e, t] of this.instancesDeferred.entries()) n === this.normalizeInstanceIdentifier(e) && t.resolve(r);
		return r;
	}
	onInit(e, t) {
		let n = this.normalizeInstanceIdentifier(t), r = this.onInitCallbacks.get(n) ?? /* @__PURE__ */ new Set();
		r.add(e), this.onInitCallbacks.set(n, r);
		let i = this.instances.get(n);
		return i && e(i, n), () => {
			r.delete(e);
		};
	}
	invokeOnInitCallbacks(e, t) {
		let n = this.onInitCallbacks.get(t);
		if (n) for (let r of n) try {
			r(e, t);
		} catch {}
	}
	getOrInitializeService({ instanceIdentifier: e, options: t = {} }) {
		let n = this.instances.get(e);
		if (!n && this.component && (n = this.component.instanceFactory(this.container, {
			instanceIdentifier: Ae(e),
			options: t
		}), this.instances.set(e, n), this.instancesOptions.set(e, t), this.invokeOnInitCallbacks(n, e), this.component.onInstanceCreated)) try {
			this.component.onInstanceCreated(this.container, e, n);
		} catch {}
		return n || null;
	}
	normalizeInstanceIdentifier(e = Oe) {
		return this.component ? this.component.multipleInstances ? e : Oe : e;
	}
	shouldAutoInitialize() {
		return !!this.component && this.component.instantiationMode !== "EXPLICIT";
	}
};
function Ae(e) {
	return e === Oe ? void 0 : e;
}
function je(e) {
	return e.instantiationMode === "EAGER";
}
var Me = class {
	constructor(e) {
		this.name = e, this.providers = /* @__PURE__ */ new Map();
	}
	addComponent(e) {
		let t = this.getProvider(e.name);
		if (t.isComponentSet()) throw Error(`Component ${e.name} has already been registered with ${this.name}`);
		t.setComponent(e);
	}
	addOrOverwriteComponent(e) {
		this.getProvider(e.name).isComponentSet() && this.providers.delete(e.name), this.addComponent(e);
	}
	getProvider(e) {
		if (this.providers.has(e)) return this.providers.get(e);
		let t = new ke(e, this);
		return this.providers.set(e, t), t;
	}
	getProviders() {
		return Array.from(this.providers.values());
	}
}, Ne = [], b;
(function(e) {
	e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
})(b || (b = {}));
var Pe = {
	debug: b.DEBUG,
	verbose: b.VERBOSE,
	info: b.INFO,
	warn: b.WARN,
	error: b.ERROR,
	silent: b.SILENT
}, x = b.INFO, S = {
	[b.DEBUG]: "log",
	[b.VERBOSE]: "log",
	[b.INFO]: "info",
	[b.WARN]: "warn",
	[b.ERROR]: "error"
}, Fe = (e, t, ...n) => {
	if (t < e.logLevel) return;
	let r = (/* @__PURE__ */ new Date()).toISOString(), i = S[t];
	if (i) console[i](`[${r}]  ${e.name}:`, ...n);
	else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`);
}, Ie = class {
	constructor(e) {
		this.name = e, this._logLevel = x, this._logHandler = Fe, this._userLogHandler = null, Ne.push(this);
	}
	get logLevel() {
		return this._logLevel;
	}
	set logLevel(e) {
		if (!(e in b)) throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
		this._logLevel = e;
	}
	setLogLevel(e) {
		this._logLevel = typeof e == "string" ? Pe[e] : e;
	}
	get logHandler() {
		return this._logHandler;
	}
	set logHandler(e) {
		if (typeof e != "function") throw TypeError("Value assigned to `logHandler` must be a function");
		this._logHandler = e;
	}
	get userLogHandler() {
		return this._userLogHandler;
	}
	set userLogHandler(e) {
		this._userLogHandler = e;
	}
	debug(...e) {
		this._userLogHandler && this._userLogHandler(this, b.DEBUG, ...e), this._logHandler(this, b.DEBUG, ...e);
	}
	log(...e) {
		this._userLogHandler && this._userLogHandler(this, b.VERBOSE, ...e), this._logHandler(this, b.VERBOSE, ...e);
	}
	info(...e) {
		this._userLogHandler && this._userLogHandler(this, b.INFO, ...e), this._logHandler(this, b.INFO, ...e);
	}
	warn(...e) {
		this._userLogHandler && this._userLogHandler(this, b.WARN, ...e), this._logHandler(this, b.WARN, ...e);
	}
	error(...e) {
		this._userLogHandler && this._userLogHandler(this, b.ERROR, ...e), this._logHandler(this, b.ERROR, ...e);
	}
}, Le = (e, t) => t.some((t) => e instanceof t), Re, ze;
function Be() {
	return Re || (Re = [
		IDBDatabase,
		IDBObjectStore,
		IDBIndex,
		IDBCursor,
		IDBTransaction
	]);
}
function Ve() {
	return ze || (ze = [
		IDBCursor.prototype.advance,
		IDBCursor.prototype.continue,
		IDBCursor.prototype.continuePrimaryKey
	]);
}
var He = /* @__PURE__ */ new WeakMap(), Ue = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), Ge = /* @__PURE__ */ new WeakMap(), Ke = /* @__PURE__ */ new WeakMap();
function qe(e) {
	let t = new Promise((t, n) => {
		let r = () => {
			e.removeEventListener("success", i), e.removeEventListener("error", a);
		}, i = () => {
			t($e(e.result)), r();
		}, a = () => {
			n(e.error), r();
		};
		e.addEventListener("success", i), e.addEventListener("error", a);
	});
	return t.then((t) => {
		t instanceof IDBCursor && He.set(t, e);
	}).catch(() => {}), Ke.set(t, e), t;
}
function Je(e) {
	if (Ue.has(e)) return;
	let t = new Promise((t, n) => {
		let r = () => {
			e.removeEventListener("complete", i), e.removeEventListener("error", a), e.removeEventListener("abort", a);
		}, i = () => {
			t(), r();
		}, a = () => {
			n(e.error || new DOMException("AbortError", "AbortError")), r();
		};
		e.addEventListener("complete", i), e.addEventListener("error", a), e.addEventListener("abort", a);
	});
	Ue.set(e, t);
}
var Ye = {
	get(e, t, n) {
		if (e instanceof IDBTransaction) {
			if (t === "done") return Ue.get(e);
			if (t === "objectStoreNames") return e.objectStoreNames || We.get(e);
			if (t === "store") return n.objectStoreNames[1] ? void 0 : n.objectStore(n.objectStoreNames[0]);
		}
		return $e(e[t]);
	},
	set(e, t, n) {
		return e[t] = n, !0;
	},
	has(e, t) {
		return e instanceof IDBTransaction && (t === "done" || t === "store") ? !0 : t in e;
	}
};
function Xe(e) {
	Ye = e(Ye);
}
function Ze(e) {
	return e === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype) ? function(t, ...n) {
		let r = e.call(et(this), t, ...n);
		return We.set(r, t.sort ? t.sort() : [t]), $e(r);
	} : Ve().includes(e) ? function(...t) {
		return e.apply(et(this), t), $e(He.get(this));
	} : function(...t) {
		return $e(e.apply(et(this), t));
	};
}
function Qe(e) {
	return typeof e == "function" ? Ze(e) : (e instanceof IDBTransaction && Je(e), Le(e, Be()) ? new Proxy(e, Ye) : e);
}
function $e(e) {
	if (e instanceof IDBRequest) return qe(e);
	if (Ge.has(e)) return Ge.get(e);
	let t = Qe(e);
	return t !== e && (Ge.set(e, t), Ke.set(t, e)), t;
}
var et = (e) => Ke.get(e);
//#endregion
//#region node_modules/idb/build/index.js
function tt(e, t, { blocked: n, upgrade: r, blocking: i, terminated: a } = {}) {
	let o = indexedDB.open(e, t), s = $e(o);
	return r && o.addEventListener("upgradeneeded", (e) => {
		r($e(o.result), e.oldVersion, e.newVersion, $e(o.transaction), e);
	}), n && o.addEventListener("blocked", (e) => n(e.oldVersion, e.newVersion, e)), s.then((e) => {
		a && e.addEventListener("close", () => a()), i && e.addEventListener("versionchange", (e) => i(e.oldVersion, e.newVersion, e));
	}).catch(() => {}), s;
}
var C = [
	"get",
	"getKey",
	"getAll",
	"getAllKeys",
	"count"
], nt = [
	"put",
	"add",
	"delete",
	"clear"
], rt = /* @__PURE__ */ new Map();
function it(e, t) {
	if (!(e instanceof IDBDatabase && !(t in e) && typeof t == "string")) return;
	if (rt.get(t)) return rt.get(t);
	let n = t.replace(/FromIndex$/, ""), r = t !== n, i = nt.includes(n);
	if (!(n in (r ? IDBIndex : IDBObjectStore).prototype) || !(i || C.includes(n))) return;
	let a = async function(e, ...t) {
		let a = this.transaction(e, i ? "readwrite" : "readonly"), o = a.store;
		return r && (o = o.index(t.shift())), (await Promise.all([o[n](...t), i && a.done]))[0];
	};
	return rt.set(t, a), a;
}
Xe((e) => ({
	...e,
	get: (t, n, r) => it(t, n) || e.get(t, n, r),
	has: (t, n) => !!it(t, n) || e.has(t, n)
}));
//#endregion
//#region node_modules/@firebase/app/dist/esm/index.esm.js
var at = class {
	constructor(e) {
		this.container = e;
	}
	getPlatformInfoString() {
		return this.container.getProviders().map((e) => {
			if (ot(e)) {
				let t = e.getImmediate();
				return `${t.library}/${t.version}`;
			} else return null;
		}).filter((e) => e).join(" ");
	}
};
function ot(e) {
	return e.getComponent()?.type === "VERSION";
}
var st = "@firebase/app", ct = "0.14.13", lt = new Ie("@firebase/app"), ut = "@firebase/app-compat", dt = "@firebase/analytics-compat", ft = "@firebase/analytics", pt = "@firebase/app-check-compat", mt = "@firebase/app-check", ht = "@firebase/auth", gt = "@firebase/auth-compat", _t = "@firebase/database", vt = "@firebase/data-connect", yt = "@firebase/database-compat", bt = "@firebase/functions", xt = "@firebase/functions-compat", St = "@firebase/installations", Ct = "@firebase/installations-compat", wt = "@firebase/messaging", Tt = "@firebase/messaging-compat", Et = "@firebase/performance", Dt = "@firebase/performance-compat", Ot = "@firebase/remote-config", kt = "@firebase/remote-config-compat", At = "@firebase/storage", jt = "@firebase/storage-compat", Mt = "@firebase/firestore", Nt = "@firebase/ai", Pt = "@firebase/firestore-compat", Ft = "firebase", It = "12.14.0", Lt = "[DEFAULT]", Rt = {
	[st]: "fire-core",
	[ut]: "fire-core-compat",
	[ft]: "fire-analytics",
	[dt]: "fire-analytics-compat",
	[mt]: "fire-app-check",
	[pt]: "fire-app-check-compat",
	[ht]: "fire-auth",
	[gt]: "fire-auth-compat",
	[_t]: "fire-rtdb",
	[vt]: "fire-data-connect",
	[yt]: "fire-rtdb-compat",
	[bt]: "fire-fn",
	[xt]: "fire-fn-compat",
	[St]: "fire-iid",
	[Ct]: "fire-iid-compat",
	[wt]: "fire-fcm",
	[Tt]: "fire-fcm-compat",
	[Et]: "fire-perf",
	[Dt]: "fire-perf-compat",
	[Ot]: "fire-rc",
	[kt]: "fire-rc-compat",
	[At]: "fire-gcs",
	[jt]: "fire-gcs-compat",
	[Mt]: "fire-fst",
	[Pt]: "fire-fst-compat",
	[Nt]: "fire-vertex",
	"fire-js": "fire-js",
	[Ft]: "fire-js-all"
}, zt = /* @__PURE__ */ new Map(), Bt = /* @__PURE__ */ new Map(), Vt = /* @__PURE__ */ new Map();
function Ht(e, t) {
	try {
		e.container.addComponent(t);
	} catch (n) {
		lt.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`, n);
	}
}
function Ut(e) {
	let t = e.name;
	if (Vt.has(t)) return lt.debug(`There were multiple attempts to register component ${t}.`), !1;
	Vt.set(t, e);
	for (let t of zt.values()) Ht(t, e);
	for (let t of Bt.values()) Ht(t, e);
	return !0;
}
function Wt(e, t) {
	let n = e.container.getProvider("heartbeat").getImmediate({ optional: !0 });
	return n && n.triggerHeartbeat(), e.container.getProvider(t);
}
function Gt(e) {
	return e == null ? !1 : e.settings !== void 0;
}
var w = new fe("app", "Firebase", {
	"no-app": "No Firebase App '{$appName}' has been created - call initializeApp() first",
	"bad-app-name": "Illegal App name: '{$appName}'",
	"duplicate-app": "Firebase App named '{$appName}' already exists with different options or config",
	"app-deleted": "Firebase App named '{$appName}' already deleted",
	"server-app-deleted": "Firebase Server App has been deleted",
	"no-options": "Need to provide options, when not being deployed to hosting via source.",
	"invalid-app-argument": "firebase.{$appName}() takes either no argument or a Firebase App instance.",
	"invalid-log-argument": "First argument to `onLog` must be null or a function.",
	"idb-open": "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
	"idb-get": "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
	"idb-set": "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
	"idb-delete": "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
	"finalization-registry-not-supported": "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
	"invalid-server-app-environment": "FirebaseServerApp is not for use in browser environments."
}), Kt = class {
	constructor(e, t, n) {
		this._isDeleted = !1, this._options = { ...e }, this._config = { ...t }, this._name = t.name, this._automaticDataCollectionEnabled = t.automaticDataCollectionEnabled, this._container = n, this.container.addComponent(new De("app", () => this, "PUBLIC"));
	}
	get automaticDataCollectionEnabled() {
		return this.checkDestroyed(), this._automaticDataCollectionEnabled;
	}
	set automaticDataCollectionEnabled(e) {
		this.checkDestroyed(), this._automaticDataCollectionEnabled = e;
	}
	get name() {
		return this.checkDestroyed(), this._name;
	}
	get options() {
		return this.checkDestroyed(), this._options;
	}
	get config() {
		return this.checkDestroyed(), this._config;
	}
	get container() {
		return this._container;
	}
	get isDeleted() {
		return this._isDeleted;
	}
	set isDeleted(e) {
		this._isDeleted = e;
	}
	checkDestroyed() {
		if (this.isDeleted) throw w.create("app-deleted", { appName: this._name });
	}
}, qt = It;
function Jt(e, t = {}) {
	let n = e;
	typeof t != "object" && (t = { name: t });
	let r = {
		name: Lt,
		automaticDataCollectionEnabled: !0,
		...t
	}, i = r.name;
	if (typeof i != "string" || !i) throw w.create("bad-app-name", { appName: String(i) });
	if (n || (n = h()), !n) throw w.create("no-options");
	let a = zt.get(i);
	if (a) {
		if (ge(n, a.options) && ge(r, a.config)) return a;
		throw w.create("duplicate-app", { appName: i });
	}
	let o = new Me(i);
	for (let e of Vt.values()) o.addComponent(e);
	let s = new Kt(n, r, o);
	return zt.set(i, s), s;
}
function Yt(e = Lt) {
	let t = zt.get(e);
	if (!t && e === "[DEFAULT]" && h()) return Jt();
	if (!t) throw w.create("no-app", { appName: e });
	return t;
}
function Xt() {
	return Array.from(zt.values());
}
function Zt(e, t, n) {
	let r = Rt[e] ?? e;
	n && (r += `-${n}`);
	let i = r.match(/\s|\//), a = t.match(/\s|\//);
	if (i || a) {
		let e = [`Unable to register library "${r}" with version "${t}":`];
		i && e.push(`library name "${r}" contains illegal characters (whitespace or "/")`), i && a && e.push("and"), a && e.push(`version name "${t}" contains illegal characters (whitespace or "/")`), lt.warn(e.join(" "));
		return;
	}
	Ut(new De(`${r}-version`, () => ({
		library: r,
		version: t
	}), "VERSION"));
}
var Qt = "firebase-heartbeat-database", $t = 1, en = "firebase-heartbeat-store", tn = null;
function nn() {
	return tn || (tn = tt(Qt, $t, { upgrade: (e, t) => {
		switch (t) {
			case 0: try {
				e.createObjectStore(en);
			} catch (e) {
				console.warn(e);
			}
		}
	} }).catch((e) => {
		throw w.create("idb-open", { originalErrorMessage: e.message });
	})), tn;
}
async function rn(e) {
	try {
		let t = (await nn()).transaction(en), n = await t.objectStore(en).get(on(e));
		return await t.done, n;
	} catch (e) {
		if (e instanceof de) lt.warn(e.message);
		else {
			let t = w.create("idb-get", { originalErrorMessage: e?.message });
			lt.warn(t.message);
		}
	}
}
async function an(e, t) {
	try {
		let n = (await nn()).transaction(en, "readwrite");
		await n.objectStore(en).put(t, on(e)), await n.done;
	} catch (e) {
		if (e instanceof de) lt.warn(e.message);
		else {
			let t = w.create("idb-set", { originalErrorMessage: e?.message });
			lt.warn(t.message);
		}
	}
}
function on(e) {
	return `${e.name}!${e.options.appId}`;
}
var sn = 1024, cn = 30, ln = class {
	constructor(e) {
		this.container = e, this._heartbeatsCache = null;
		let t = this.container.getProvider("app").getImmediate();
		this._storage = new fn(t), this._heartbeatsCachePromise = this._storage.read().then((e) => (this._heartbeatsCache = e, e));
	}
	async triggerHeartbeat() {
		try {
			let e = this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(), t = un();
			if (this._heartbeatsCache?.heartbeats == null && (this._heartbeatsCache = await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null) || this._heartbeatsCache.lastSentHeartbeatDate === t || this._heartbeatsCache.heartbeats.some((e) => e.date === t)) return;
			if (this._heartbeatsCache.heartbeats.push({
				date: t,
				agent: e
			}), this._heartbeatsCache.heartbeats.length > cn) {
				let e = mn(this._heartbeatsCache.heartbeats);
				this._heartbeatsCache.heartbeats.splice(e, 1);
			}
			return this._storage.overwrite(this._heartbeatsCache);
		} catch (e) {
			lt.warn(e);
		}
	}
	async getHeartbeatsHeader() {
		try {
			if (this._heartbeatsCache === null && await this._heartbeatsCachePromise, this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) return "";
			let e = un(), { heartbeatsToSend: t, unsentEntries: n } = dn(this._heartbeatsCache.heartbeats), r = o(JSON.stringify({
				version: 2,
				heartbeats: t
			}));
			return this._heartbeatsCache.lastSentHeartbeatDate = e, n.length > 0 ? (this._heartbeatsCache.heartbeats = n, await this._storage.overwrite(this._heartbeatsCache)) : (this._heartbeatsCache.heartbeats = [], this._storage.overwrite(this._heartbeatsCache)), r;
		} catch (e) {
			return lt.warn(e), "";
		}
	}
};
function un() {
	return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
}
function dn(e, t = sn) {
	let n = [], r = e.slice();
	for (let i of e) {
		let e = n.find((e) => e.agent === i.agent);
		if (!e) {
			if (n.push({
				agent: i.agent,
				dates: [i.date]
			}), pn(n) > t) {
				n.pop();
				break;
			}
		} else if (e.dates.push(i.date), pn(n) > t) {
			e.dates.pop();
			break;
		}
		r = r.slice(1);
	}
	return {
		heartbeatsToSend: n,
		unsentEntries: r
	};
}
var fn = class {
	constructor(e) {
		this.app = e, this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
	}
	async runIndexedDBEnvironmentCheck() {
		return v() ? le().then(() => !0).catch(() => !1) : !1;
	}
	async read() {
		if (await this._canUseIndexedDBPromise) {
			let e = await rn(this.app);
			return e?.heartbeats ? e : { heartbeats: [] };
		} else return { heartbeats: [] };
	}
	async overwrite(e) {
		if (await this._canUseIndexedDBPromise) {
			let t = await this.read();
			return an(this.app, {
				lastSentHeartbeatDate: e.lastSentHeartbeatDate ?? t.lastSentHeartbeatDate,
				heartbeats: e.heartbeats
			});
		} else return;
	}
	async add(e) {
		if (await this._canUseIndexedDBPromise) {
			let t = await this.read();
			return an(this.app, {
				lastSentHeartbeatDate: e.lastSentHeartbeatDate ?? t.lastSentHeartbeatDate,
				heartbeats: [...t.heartbeats, ...e.heartbeats]
			});
		} else return;
	}
};
function pn(e) {
	return o(JSON.stringify({
		version: 2,
		heartbeats: e
	})).length;
}
function mn(e) {
	if (e.length === 0) return -1;
	let t = 0, n = e[0].date;
	for (let r = 1; r < e.length; r++) e[r].date < n && (n = e[r].date, t = r);
	return t;
}
function hn(e) {
	Ut(new De("platform-logger", (e) => new at(e), "PRIVATE")), Ut(new De("heartbeat", (e) => new ln(e), "PRIVATE")), Zt(st, ct, e), Zt(st, ct, "esm2020"), Zt("fire-js", "");
}
//#endregion
//#region node_modules/firebase/app/dist/esm/index.esm.js
hn(""), Zt("firebase", "12.14.0", "app");
//#endregion
//#region node_modules/@capacitor/core/dist/index.js
var gn;
(function(e) {
	e.Unimplemented = "UNIMPLEMENTED", e.Unavailable = "UNAVAILABLE";
})(gn || (gn = {}));
var _n = class extends Error {
	constructor(e, t, n) {
		super(e), this.message = e, this.code = t, this.data = n;
	}
}, vn = (e) => e?.androidBridge ? "android" : e?.webkit?.messageHandlers?.bridge ? "ios" : "web", yn = (e) => {
	let t = e.CapacitorCustomPlatform || null, n = e.Capacitor || {}, r = n.Plugins = n.Plugins || {}, i = () => t === null ? vn(e) : t.name, a = () => i() !== "web", o = (e) => !!(l.get(e)?.platforms.has(i()) || s(e)), s = (e) => n.PluginHeaders?.find((t) => t.name === e), c = (t) => e.console.error(t), l = /* @__PURE__ */ new Map();
	return n.convertFileSrc || (n.convertFileSrc = (e) => e), n.getPlatform = i, n.handleError = c, n.isNativePlatform = a, n.isPluginAvailable = o, n.registerPlugin = (e, a = {}) => {
		let o = l.get(e);
		if (o) return console.warn(`Capacitor plugin "${e}" already registered. Cannot register plugins twice.`), o.proxy;
		let c = i(), u = s(e), d, f = async () => (!d && c in a ? d = d = typeof a[c] == "function" ? await a[c]() : a[c] : t !== null && !d && "web" in a && (d = d = typeof a.web == "function" ? await a.web() : a.web), d), p = (t, r) => {
			if (u) {
				let i = u?.methods.find((e) => r === e.name);
				if (i) return i.rtype === "promise" ? (t) => n.nativePromise(e, r.toString(), t) : (t, i) => n.nativeCallback(e, r.toString(), t, i);
				if (t) return t[r]?.bind(t);
			} else if (t) return t[r]?.bind(t);
			else throw new _n(`"${e}" plugin is not implemented on ${c}`, gn.Unimplemented);
		}, m = (t) => {
			let n, r = (...r) => {
				let i = f().then((i) => {
					let a = p(i, t);
					if (a) {
						let e = a(...r);
						return n = e?.remove, e;
					} else throw new _n(`"${e}.${t}()" is not implemented on ${c}`, gn.Unimplemented);
				});
				return t === "addListener" && (i.remove = async () => n()), i;
			};
			return r.toString = () => `${t.toString()}() { [capacitor code] }`, Object.defineProperty(r, "name", {
				value: t,
				writable: !1,
				configurable: !1
			}), r;
		}, h = m("addListener"), g = m("removeListener"), ee = (e, t) => {
			let n = h({ eventName: e }, t), r = async () => {
				g({
					eventName: e,
					callbackId: await n
				}, t);
			}, i = new Promise((e) => n.then(() => e({ remove: r })));
			return i.remove = async () => {
				console.warn("Using addListener() without 'await' is deprecated."), await r();
			}, i;
		}, te = new Proxy({}, { get(e, t) {
			switch (t) {
				case "$$typeof": return;
				case "toJSON": return () => ({});
				case "addListener": return u ? ee : h;
				case "removeListener": return g;
				default: return m(t);
			}
		} });
		return r[e] = te, l.set(e, {
			name: e,
			proxy: te,
			platforms: new Set([...Object.keys(a), ...u ? [c] : []])
		}), te;
	}, n.Exception = _n, n.DEBUG = !!n.DEBUG, n.isLoggingEnabled = !!n.isLoggingEnabled, n;
}, bn = /*#__PURE__*/ ((e) => e.Capacitor = yn(e))(typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {}), xn = bn.registerPlugin, T = class {
	constructor() {
		this.listeners = {}, this.retainedEventArguments = {}, this.windowListeners = {};
	}
	addListener(e, t) {
		let n = !1;
		this.listeners[e] || (this.listeners[e] = [], n = !0), this.listeners[e].push(t);
		let r = this.windowListeners[e];
		return r && !r.registered && this.addWindowListener(r), n && this.sendRetainedArgumentsForEvent(e), Promise.resolve({ remove: async () => this.removeListener(e, t) });
	}
	async removeAllListeners() {
		this.listeners = {};
		for (let e in this.windowListeners) this.removeWindowListener(this.windowListeners[e]);
		this.windowListeners = {};
	}
	notifyListeners(e, t, n) {
		let r = this.listeners[e];
		if (!r) {
			if (n) {
				let n = this.retainedEventArguments[e];
				n || (n = []), n.push(t), this.retainedEventArguments[e] = n;
			}
			return;
		}
		r.forEach((e) => e(t));
	}
	hasListeners(e) {
		return !!this.listeners[e]?.length;
	}
	registerWindowListener(e, t) {
		this.windowListeners[t] = {
			registered: !1,
			windowEventName: e,
			pluginEventName: t,
			handler: (e) => {
				this.notifyListeners(t, e);
			}
		};
	}
	unimplemented(e = "not implemented") {
		return new bn.Exception(e, gn.Unimplemented);
	}
	unavailable(e = "not available") {
		return new bn.Exception(e, gn.Unavailable);
	}
	async removeListener(e, t) {
		let n = this.listeners[e];
		if (!n) return;
		let r = n.indexOf(t);
		this.listeners[e].splice(r, 1), this.listeners[e].length || this.removeWindowListener(this.windowListeners[e]);
	}
	addWindowListener(e) {
		window.addEventListener(e.windowEventName, e.handler), e.registered = !0;
	}
	removeWindowListener(e) {
		e && (window.removeEventListener(e.windowEventName, e.handler), e.registered = !1);
	}
	sendRetainedArgumentsForEvent(e) {
		let t = this.retainedEventArguments[e];
		t && (delete this.retainedEventArguments[e], t.forEach((t) => {
			this.notifyListeners(e, t);
		}));
	}
}, Sn = (e) => encodeURIComponent(e).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape), Cn = (e) => e.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent), wn = class extends T {
	async getCookies() {
		let e = document.cookie, t = {};
		return e.split(";").forEach((e) => {
			if (e.length <= 0) return;
			let [n, r] = e.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
			n = Cn(n).trim(), r = Cn(r).trim(), t[n] = r;
		}), t;
	}
	async setCookie(e) {
		try {
			let t = Sn(e.key), n = Sn(e.value), r = e.expires ? `; expires=${e.expires.replace("expires=", "")}` : "", i = (e.path || "/").replace("path=", ""), a = e.url != null && e.url.length > 0 ? `domain=${e.url}` : "";
			document.cookie = `${t}=${n || ""}${r}; path=${i}; ${a};`;
		} catch (e) {
			return Promise.reject(e);
		}
	}
	async deleteCookie(e) {
		try {
			document.cookie = `${e.key}=; Max-Age=0`;
		} catch (e) {
			return Promise.reject(e);
		}
	}
	async clearCookies() {
		try {
			let e = document.cookie.split(";") || [];
			for (let t of e) document.cookie = t.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
		} catch (e) {
			return Promise.reject(e);
		}
	}
	async clearAllCookies() {
		try {
			await this.clearCookies();
		} catch (e) {
			return Promise.reject(e);
		}
	}
};
xn("CapacitorCookies", { web: () => new wn() });
var Tn = async (e) => new Promise((t, n) => {
	let r = new FileReader();
	r.onload = () => {
		let e = r.result;
		t(e.indexOf(",") >= 0 ? e.split(",")[1] : e);
	}, r.onerror = (e) => n(e), r.readAsDataURL(e);
}), En = (e = {}) => {
	let t = Object.keys(e);
	return Object.keys(e).map((e) => e.toLocaleLowerCase()).reduce((n, r, i) => (n[r] = e[t[i]], n), {});
}, Dn = (e, t = !0) => e ? Object.entries(e).reduce((e, n) => {
	let [r, i] = n, a, o;
	return Array.isArray(i) ? (o = "", i.forEach((e) => {
		a = t ? encodeURIComponent(e) : e, o += `${r}=${a}&`;
	}), o.slice(0, -1)) : (a = t ? encodeURIComponent(i) : i, o = `${r}=${a}`), `${e}&${o}`;
}, "").substr(1) : null, On = (e, t = {}) => {
	let n = Object.assign({
		method: e.method || "GET",
		headers: e.headers
	}, t), r = En(e.headers)["content-type"] || "";
	if (typeof e.data == "string") n.body = e.data;
	else if (r.includes("application/x-www-form-urlencoded")) {
		let t = new URLSearchParams();
		for (let [n, r] of Object.entries(e.data || {})) t.set(n, r);
		n.body = t.toString();
	} else if (r.includes("multipart/form-data") || e.data instanceof FormData) {
		let t = new FormData();
		if (e.data instanceof FormData) e.data.forEach((e, n) => {
			t.append(n, e);
		});
		else for (let n of Object.keys(e.data)) t.append(n, e.data[n]);
		n.body = t;
		let r = new Headers(n.headers);
		r.delete("content-type"), n.headers = r;
	} else (r.includes("application/json") || typeof e.data == "object") && (n.body = JSON.stringify(e.data));
	return n;
}, kn = class extends T {
	async request(e) {
		let t = On(e, e.webFetchExtra), n = Dn(e.params, e.shouldEncodeUrlParams), r = n ? `${e.url}?${n}` : e.url, i = await fetch(r, t), a = i.headers.get("content-type") || "", { responseType: o = "text" } = i.ok ? e : {};
		a.includes("application/json") && (o = "json");
		let s, c;
		switch (o) {
			case "arraybuffer":
			case "blob":
				c = await i.blob(), s = await Tn(c);
				break;
			case "json":
				s = await i.json();
				break;
			default: s = await i.text();
		}
		let l = {};
		return i.headers.forEach((e, t) => {
			l[t] = e;
		}), {
			data: s,
			headers: l,
			status: i.status,
			url: i.url
		};
	}
	async get(e) {
		return this.request(Object.assign(Object.assign({}, e), { method: "GET" }));
	}
	async post(e) {
		return this.request(Object.assign(Object.assign({}, e), { method: "POST" }));
	}
	async put(e) {
		return this.request(Object.assign(Object.assign({}, e), { method: "PUT" }));
	}
	async patch(e) {
		return this.request(Object.assign(Object.assign({}, e), { method: "PATCH" }));
	}
	async delete(e) {
		return this.request(Object.assign(Object.assign({}, e), { method: "DELETE" }));
	}
};
xn("CapacitorHttp", { web: () => new kn() });
var An;
(function(e) {
	e.Dark = "DARK", e.Light = "LIGHT", e.Default = "DEFAULT";
})(An || (An = {}));
var jn;
(function(e) {
	e.StatusBar = "StatusBar", e.NavigationBar = "NavigationBar";
})(jn || (jn = {}));
var Mn = class extends T {
	async setStyle() {
		this.unavailable("not available for web");
	}
	async setAnimation() {
		this.unavailable("not available for web");
	}
	async show() {
		this.unavailable("not available for web");
	}
	async hide() {
		this.unavailable("not available for web");
	}
};
xn("SystemBars", { web: () => new Mn() });
//#endregion
//#region node_modules/@firebase/auth/dist/esm/index-9d184c40.js
function Nn() {
	return { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." };
}
var Pn = Nn, Fn = new fe("auth", "Firebase", Nn()), In = new Ie("@firebase/auth");
function Ln(e, ...t) {
	In.logLevel <= b.WARN && In.warn(`Auth (${qt}): ${e}`, ...t);
}
function Rn(e, ...t) {
	In.logLevel <= b.ERROR && In.error(`Auth (${qt}): ${e}`, ...t);
}
function E(e, ...t) {
	throw Hn(e, ...t);
}
function zn(e, ...t) {
	return Hn(e, ...t);
}
function Bn(e, t, n) {
	return new fe("auth", "Firebase", {
		...Pn(),
		[t]: n
	}).create(t, { appName: e.name });
}
function Vn(e) {
	return Bn(e, "operation-not-supported-in-this-environment", "Operations that alter the current user are not supported in conjunction with FirebaseServerApp");
}
function Hn(e, ...t) {
	if (typeof e != "string") {
		let n = t[0], r = [...t.slice(1)];
		return r[0] && (r[0].appName = e.name), e._errorFactory.create(n, ...r);
	}
	return Fn.create(e, ...t);
}
function D(e, t, ...n) {
	if (!e) throw Hn(t, ...n);
}
function Un(e) {
	let t = "INTERNAL ASSERTION FAILED: " + e;
	throw Rn(t), Error(t);
}
function Wn(e, t) {
	e || Un(t);
}
function Gn() {
	return typeof self < "u" && self.location?.href || "";
}
function Kn() {
	return qn() === "http:" || qn() === "https:";
}
function qn() {
	return typeof self < "u" && self.location?.protocol || null;
}
function Jn() {
	return typeof navigator < "u" && navigator && "onLine" in navigator && typeof navigator.onLine == "boolean" && (Kn() || ae() || "connection" in navigator) ? navigator.onLine : !0;
}
function Yn() {
	if (typeof navigator > "u") return null;
	let e = navigator;
	return e.languages && e.languages[0] || e.language || null;
}
var Xn = class {
	constructor(e, t) {
		this.shortDelay = e, this.longDelay = t, Wn(t > e, "Short delay should be less than long delay!"), this.isMobile = ne() || oe();
	}
	get() {
		return Jn() ? this.isMobile ? this.longDelay : this.shortDelay : Math.min(5e3, this.shortDelay);
	}
};
function Zn(e, t) {
	Wn(e.emulator, "Emulator should always be set here");
	let { url: n } = e.emulator;
	return t ? `${n}${t.startsWith("/") ? t.slice(1) : t}` : n;
}
var Qn = class {
	static initialize(e, t, n) {
		this.fetchImpl = e, t && (this.headersImpl = t), n && (this.responseImpl = n);
	}
	static fetch() {
		if (this.fetchImpl) return this.fetchImpl;
		if (typeof self < "u" && "fetch" in self) return self.fetch;
		if (typeof globalThis < "u" && globalThis.fetch) return globalThis.fetch;
		if (typeof fetch < "u") return fetch;
		Un("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
	}
	static headers() {
		if (this.headersImpl) return this.headersImpl;
		if (typeof self < "u" && "Headers" in self) return self.Headers;
		if (typeof globalThis < "u" && globalThis.Headers) return globalThis.Headers;
		if (typeof Headers < "u") return Headers;
		Un("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
	}
	static response() {
		if (this.responseImpl) return this.responseImpl;
		if (typeof self < "u" && "Response" in self) return self.Response;
		if (typeof globalThis < "u" && globalThis.Response) return globalThis.Response;
		if (typeof Response < "u") return Response;
		Un("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
	}
}, $n = {
	CREDENTIAL_MISMATCH: "custom-token-mismatch",
	MISSING_CUSTOM_TOKEN: "internal-error",
	INVALID_IDENTIFIER: "invalid-email",
	MISSING_CONTINUE_URI: "internal-error",
	INVALID_PASSWORD: "wrong-password",
	MISSING_PASSWORD: "missing-password",
	INVALID_LOGIN_CREDENTIALS: "invalid-credential",
	EMAIL_EXISTS: "email-already-in-use",
	PASSWORD_LOGIN_DISABLED: "operation-not-allowed",
	INVALID_IDP_RESPONSE: "invalid-credential",
	INVALID_PENDING_TOKEN: "invalid-credential",
	FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use",
	MISSING_REQ_TYPE: "internal-error",
	EMAIL_NOT_FOUND: "user-not-found",
	RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests",
	EXPIRED_OOB_CODE: "expired-action-code",
	INVALID_OOB_CODE: "invalid-action-code",
	MISSING_OOB_CODE: "internal-error",
	CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login",
	INVALID_ID_TOKEN: "invalid-user-token",
	TOKEN_EXPIRED: "user-token-expired",
	USER_NOT_FOUND: "user-token-expired",
	TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests",
	PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements",
	INVALID_CODE: "invalid-verification-code",
	INVALID_SESSION_INFO: "invalid-verification-id",
	INVALID_TEMPORARY_PROOF: "invalid-credential",
	MISSING_SESSION_INFO: "missing-verification-id",
	SESSION_EXPIRED: "code-expired",
	MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name",
	UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri",
	INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id",
	ADMIN_ONLY_OPERATION: "admin-restricted-operation",
	INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session",
	MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found",
	MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info",
	MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session",
	SECOND_FACTOR_EXISTS: "second-factor-already-in-use",
	SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded",
	BLOCKING_FUNCTION_ERROR_RESPONSE: "internal-error",
	RECAPTCHA_NOT_ENABLED: "recaptcha-not-enabled",
	MISSING_RECAPTCHA_TOKEN: "missing-recaptcha-token",
	INVALID_RECAPTCHA_TOKEN: "invalid-recaptcha-token",
	INVALID_RECAPTCHA_ACTION: "invalid-recaptcha-action",
	MISSING_CLIENT_TYPE: "missing-client-type",
	MISSING_RECAPTCHA_VERSION: "missing-recaptcha-version",
	INVALID_RECAPTCHA_VERSION: "invalid-recaptcha-version",
	INVALID_REQ_TYPE: "invalid-req-type"
}, er = [
	"/v1/accounts:signInWithCustomToken",
	"/v1/accounts:signInWithEmailLink",
	"/v1/accounts:signInWithIdp",
	"/v1/accounts:signInWithPassword",
	"/v1/accounts:signInWithPhoneNumber",
	"/v1/token"
], tr = new Xn(3e4, 6e4);
function O(e, t) {
	return e.tenantId && !t.tenantId ? {
		...t,
		tenantId: e.tenantId
	} : t;
}
async function k(e, t, n, r, i = {}) {
	return nr(e, i, async () => {
		let i = {}, a = {};
		r && (t === "GET" ? a = r : i = { body: JSON.stringify(r) });
		let o = ve({
			key: e.config.apiKey,
			...a
		}).slice(1), s = await e._getAdditionalHeaders();
		s["Content-Type"] = "application/json", e.languageCode && (s["X-Firebase-Locale"] = e.languageCode);
		let c = {
			method: t,
			headers: s,
			...i
		};
		return ie() || (c.referrerPolicy = "no-referrer"), e.emulatorConfig && Te(e.emulatorConfig.host) && (c.credentials = "include"), Qn.fetch()(await ir(e, e.config.apiHost, n, o), c);
	});
}
async function nr(e, t, n) {
	e._canInitEmulator = !1;
	let r = {
		...$n,
		...t
	};
	try {
		let t = new or(e), i = await Promise.race([n(), t.promise]);
		t.clearNetworkTimeout();
		let a = await i.json();
		if ("needConfirmation" in a) throw sr(e, "account-exists-with-different-credential", a);
		if (i.ok && !("errorMessage" in a)) return a;
		{
			let [t, n] = (i.ok ? a.errorMessage : a.error.message).split(" : ");
			if (t === "FEDERATED_USER_ID_ALREADY_LINKED") throw sr(e, "credential-already-in-use", a);
			if (t === "EMAIL_EXISTS") throw sr(e, "email-already-in-use", a);
			if (t === "USER_DISABLED") throw sr(e, "user-disabled", a);
			let o = r[t] || t.toLowerCase().replace(/[_\s]+/g, "-");
			if (n) throw Bn(e, o, n);
			E(e, o);
		}
	} catch (t) {
		if (t instanceof de) throw t;
		E(e, "network-request-failed", { message: String(t) });
	}
}
async function rr(e, t, n, r, i = {}) {
	let a = await k(e, t, n, r, i);
	return "mfaPendingCredential" in a && E(e, "multi-factor-auth-required", { _serverResponse: a }), a;
}
async function ir(e, t, n, r) {
	let i = `${t}${n}?${r}`, a = e, o = a.config.emulator ? Zn(e.config, i) : `${e.config.apiScheme}://${i}`;
	return er.includes(n) && (await a._persistenceManagerAvailable, a._getPersistenceType() === "COOKIE") ? a._getPersistence()._getFinalTarget(o).toString() : o;
}
function ar(e) {
	switch (e) {
		case "ENFORCE": return "ENFORCE";
		case "AUDIT": return "AUDIT";
		case "OFF": return "OFF";
		default: return "ENFORCEMENT_STATE_UNSPECIFIED";
	}
}
var or = class {
	clearNetworkTimeout() {
		clearTimeout(this.timer);
	}
	constructor(e) {
		this.auth = e, this.timer = null, this.promise = new Promise((e, t) => {
			this.timer = setTimeout(() => t(zn(this.auth, "network-request-failed")), tr.get());
		});
	}
};
function sr(e, t, n) {
	let r = { appName: e.name };
	n.email && (r.email = n.email), n.phoneNumber && (r.phoneNumber = n.phoneNumber);
	let i = zn(e, t, r);
	return i.customData._tokenResponse = n, i;
}
function cr(e) {
	return e !== void 0 && e.enterprise !== void 0;
}
var lr = class {
	constructor(e) {
		if (this.siteKey = "", this.recaptchaEnforcementState = [], e.recaptchaKey === void 0) throw Error("recaptchaKey undefined");
		this.siteKey = e.recaptchaKey.split("/")[3], this.recaptchaEnforcementState = e.recaptchaEnforcementState;
	}
	getProviderEnforcementState(e) {
		if (!this.recaptchaEnforcementState || this.recaptchaEnforcementState.length === 0) return null;
		for (let t of this.recaptchaEnforcementState) if (t.provider && t.provider === e) return ar(t.enforcementState);
		return null;
	}
	isProviderEnabled(e) {
		return this.getProviderEnforcementState(e) === "ENFORCE" || this.getProviderEnforcementState(e) === "AUDIT";
	}
	isAnyProviderEnabled() {
		return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER") || this.isProviderEnabled("PHONE_PROVIDER");
	}
};
async function ur(e, t) {
	return k(e, "GET", "/v2/recaptchaConfig", O(e, t));
}
async function dr(e, t) {
	return k(e, "POST", "/v1/accounts:delete", t);
}
async function fr(e, t) {
	return k(e, "POST", "/v1/accounts:lookup", t);
}
function pr(e) {
	if (e) try {
		let t = new Date(Number(e));
		if (!isNaN(t.getTime())) return t.toUTCString();
	} catch {}
}
async function mr(e, t = !1) {
	let n = y(e), r = await n.getIdToken(t), i = gr(r);
	D(i && i.exp && i.auth_time && i.iat, n.auth, "internal-error");
	let a = typeof i.firebase == "object" ? i.firebase : void 0, o = a?.sign_in_provider;
	return {
		claims: i,
		token: r,
		authTime: pr(hr(i.auth_time)),
		issuedAtTime: pr(hr(i.iat)),
		expirationTime: pr(hr(i.exp)),
		signInProvider: o || null,
		signInSecondFactor: a?.sign_in_second_factor || null
	};
}
function hr(e) {
	return Number(e) * 1e3;
}
function gr(e) {
	let [t, n, r] = e.split(".");
	if (t === void 0 || n === void 0 || r === void 0) return Rn("JWT malformed, contained fewer than 3 sections"), null;
	try {
		let e = s(n);
		return e ? JSON.parse(e) : (Rn("Failed to decode base64 JWT payload"), null);
	} catch (e) {
		return Rn("Caught error parsing JWT payload as JSON", e?.toString()), null;
	}
}
function _r(e) {
	let t = gr(e);
	return D(t, "internal-error"), D(t.exp !== void 0, "internal-error"), D(t.iat !== void 0, "internal-error"), Number(t.exp) - Number(t.iat);
}
async function vr(e, t, n = !1) {
	if (n) return t;
	try {
		return await t;
	} catch (t) {
		throw t instanceof de && yr(t) && e.auth.currentUser === e && await e.auth.signOut(), t;
	}
}
function yr({ code: e }) {
	return e === "auth/user-disabled" || e === "auth/user-token-expired";
}
var br = class {
	constructor(e) {
		this.user = e, this.isRunning = !1, this.timerId = null, this.errorBackoff = 3e4;
	}
	_start() {
		this.isRunning || (this.isRunning = !0, this.schedule());
	}
	_stop() {
		this.isRunning && (this.isRunning = !1, this.timerId !== null && clearTimeout(this.timerId));
	}
	getInterval(e) {
		if (e) {
			let e = this.errorBackoff;
			return this.errorBackoff = Math.min(this.errorBackoff * 2, 96e4), e;
		} else {
			this.errorBackoff = 3e4;
			let e = (this.user.stsTokenManager.expirationTime ?? 0) - Date.now() - 3e5;
			return Math.max(0, e);
		}
	}
	schedule(e = !1) {
		if (!this.isRunning) return;
		let t = this.getInterval(e);
		this.timerId = setTimeout(async () => {
			await this.iteration();
		}, t);
	}
	async iteration() {
		try {
			await this.user.getIdToken(!0);
		} catch (e) {
			e?.code === "auth/network-request-failed" && this.schedule(!0);
			return;
		}
		this.schedule();
	}
}, xr = class {
	constructor(e, t) {
		this.createdAt = e, this.lastLoginAt = t, this._initializeTime();
	}
	_initializeTime() {
		this.lastSignInTime = pr(this.lastLoginAt), this.creationTime = pr(this.createdAt);
	}
	_copy(e) {
		this.createdAt = e.createdAt, this.lastLoginAt = e.lastLoginAt, this._initializeTime();
	}
	toJSON() {
		return {
			createdAt: this.createdAt,
			lastLoginAt: this.lastLoginAt
		};
	}
};
async function Sr(e) {
	let t = e.auth, n = await vr(e, fr(t, { idToken: await e.getIdToken() }));
	D(n?.users.length, t, "internal-error");
	let r = n.users[0];
	e._notifyReloadListener(r);
	let i = r.providerUserInfo?.length ? Tr(r.providerUserInfo) : [], a = wr(e.providerData, i), o = e.isAnonymous, s = !(e.email && r.passwordHash) && !a?.length, c = o ? s : !1, l = {
		uid: r.localId,
		displayName: r.displayName || null,
		photoURL: r.photoUrl || null,
		email: r.email || null,
		emailVerified: r.emailVerified || !1,
		phoneNumber: r.phoneNumber || null,
		tenantId: r.tenantId || null,
		providerData: a,
		metadata: new xr(r.createdAt, r.lastLoginAt),
		isAnonymous: c
	};
	Object.assign(e, l);
}
async function Cr(e) {
	let t = y(e);
	await Sr(t), await t.auth._persistUserIfCurrent(t), t.auth._notifyListenersIfCurrent(t);
}
function wr(e, t) {
	return [...e.filter((e) => !t.some((t) => t.providerId === e.providerId)), ...t];
}
function Tr(e) {
	return e.map(({ providerId: e, ...t }) => ({
		providerId: e,
		uid: t.rawId || "",
		displayName: t.displayName || null,
		email: t.email || null,
		phoneNumber: t.phoneNumber || null,
		photoURL: t.photoUrl || null
	}));
}
async function Er(e, t) {
	let n = await nr(e, {}, async () => {
		let n = ve({
			grant_type: "refresh_token",
			refresh_token: t
		}).slice(1), { tokenApiHost: r, apiKey: i } = e.config, a = await ir(e, r, "/v1/token", `key=${i}`), o = await e._getAdditionalHeaders();
		o["Content-Type"] = "application/x-www-form-urlencoded";
		let s = {
			method: "POST",
			headers: o,
			body: n
		};
		return e.emulatorConfig && Te(e.emulatorConfig.host) && (s.credentials = "include"), Qn.fetch()(a, s);
	});
	return {
		accessToken: n.access_token,
		expiresIn: n.expires_in,
		refreshToken: n.refresh_token
	};
}
async function Dr(e, t) {
	return k(e, "POST", "/v2/accounts:revokeToken", O(e, t));
}
var Or = class e {
	constructor() {
		this.refreshToken = null, this.accessToken = null, this.expirationTime = null;
	}
	get isExpired() {
		return !this.expirationTime || Date.now() > this.expirationTime - 3e4;
	}
	updateFromServerResponse(e) {
		D(e.idToken, "internal-error"), D(e.idToken !== void 0, "internal-error"), D(e.refreshToken !== void 0, "internal-error");
		let t = "expiresIn" in e && e.expiresIn !== void 0 ? Number(e.expiresIn) : _r(e.idToken);
		this.updateTokensAndExpiration(e.idToken, e.refreshToken, t);
	}
	updateFromIdToken(e) {
		D(e.length !== 0, "internal-error");
		let t = _r(e);
		this.updateTokensAndExpiration(e, null, t);
	}
	async getToken(e, t = !1) {
		return !t && this.accessToken && !this.isExpired ? this.accessToken : (D(this.refreshToken, e, "user-token-expired"), this.refreshToken ? (await this.refresh(e, this.refreshToken), this.accessToken) : null);
	}
	clearRefreshToken() {
		this.refreshToken = null;
	}
	async refresh(e, t) {
		let { accessToken: n, refreshToken: r, expiresIn: i } = await Er(e, t);
		this.updateTokensAndExpiration(n, r, Number(i));
	}
	updateTokensAndExpiration(e, t, n) {
		this.refreshToken = t || null, this.accessToken = e || null, this.expirationTime = Date.now() + n * 1e3;
	}
	static fromJSON(t, n) {
		let { refreshToken: r, accessToken: i, expirationTime: a } = n, o = new e();
		return r && (D(typeof r == "string", "internal-error", { appName: t }), o.refreshToken = r), i && (D(typeof i == "string", "internal-error", { appName: t }), o.accessToken = i), a && (D(typeof a == "number", "internal-error", { appName: t }), o.expirationTime = a), o;
	}
	toJSON() {
		return {
			refreshToken: this.refreshToken,
			accessToken: this.accessToken,
			expirationTime: this.expirationTime
		};
	}
	_assign(e) {
		this.accessToken = e.accessToken, this.refreshToken = e.refreshToken, this.expirationTime = e.expirationTime;
	}
	_clone() {
		return Object.assign(new e(), this.toJSON());
	}
	_performRefresh() {
		return Un("not implemented");
	}
};
function kr(e, t) {
	D(typeof e == "string" || e === void 0, "internal-error", { appName: t });
}
var Ar = class e {
	constructor({ uid: e, auth: t, stsTokenManager: n, ...r }) {
		this.providerId = "firebase", this.proactiveRefresh = new br(this), this.reloadUserInfo = null, this.reloadListener = null, this.uid = e, this.auth = t, this.stsTokenManager = n, this.accessToken = n.accessToken, this.displayName = r.displayName || null, this.email = r.email || null, this.emailVerified = r.emailVerified || !1, this.phoneNumber = r.phoneNumber || null, this.photoURL = r.photoURL || null, this.isAnonymous = r.isAnonymous || !1, this.tenantId = r.tenantId || null, this.providerData = r.providerData ? [...r.providerData] : [], this.metadata = new xr(r.createdAt || void 0, r.lastLoginAt || void 0);
	}
	async getIdToken(e) {
		let t = await vr(this, this.stsTokenManager.getToken(this.auth, e));
		return D(t, this.auth, "internal-error"), this.accessToken !== t && (this.accessToken = t, await this.auth._persistUserIfCurrent(this), this.auth._notifyListenersIfCurrent(this)), t;
	}
	getIdTokenResult(e) {
		return mr(this, e);
	}
	reload() {
		return Cr(this);
	}
	_assign(e) {
		this !== e && (D(this.uid === e.uid, this.auth, "internal-error"), this.displayName = e.displayName, this.photoURL = e.photoURL, this.email = e.email, this.emailVerified = e.emailVerified, this.phoneNumber = e.phoneNumber, this.isAnonymous = e.isAnonymous, this.tenantId = e.tenantId, this.providerData = e.providerData.map((e) => ({ ...e })), this.metadata._copy(e.metadata), this.stsTokenManager._assign(e.stsTokenManager));
	}
	_clone(t) {
		let n = new e({
			...this,
			auth: t,
			stsTokenManager: this.stsTokenManager._clone()
		});
		return n.metadata._copy(this.metadata), n;
	}
	_onReload(e) {
		D(!this.reloadListener, this.auth, "internal-error"), this.reloadListener = e, this.reloadUserInfo && (this._notifyReloadListener(this.reloadUserInfo), this.reloadUserInfo = null);
	}
	_notifyReloadListener(e) {
		this.reloadListener ? this.reloadListener(e) : this.reloadUserInfo = e;
	}
	_startProactiveRefresh() {
		this.proactiveRefresh._start();
	}
	_stopProactiveRefresh() {
		this.proactiveRefresh._stop();
	}
	async _updateTokensIfNecessary(e, t = !1) {
		let n = !1;
		e.idToken && e.idToken !== this.stsTokenManager.accessToken && (this.stsTokenManager.updateFromServerResponse(e), n = !0), t && await Sr(this), await this.auth._persistUserIfCurrent(this), n && this.auth._notifyListenersIfCurrent(this);
	}
	async delete() {
		if (Gt(this.auth.app)) return Promise.reject(Vn(this.auth));
		let e = await this.getIdToken();
		return await vr(this, dr(this.auth, { idToken: e })), this.stsTokenManager.clearRefreshToken(), this.auth.signOut();
	}
	toJSON() {
		return {
			uid: this.uid,
			email: this.email || void 0,
			emailVerified: this.emailVerified,
			displayName: this.displayName || void 0,
			isAnonymous: this.isAnonymous,
			photoURL: this.photoURL || void 0,
			phoneNumber: this.phoneNumber || void 0,
			tenantId: this.tenantId || void 0,
			providerData: this.providerData.map((e) => ({ ...e })),
			stsTokenManager: this.stsTokenManager.toJSON(),
			_redirectEventId: this._redirectEventId,
			...this.metadata.toJSON(),
			apiKey: this.auth.config.apiKey,
			appName: this.auth.name
		};
	}
	get refreshToken() {
		return this.stsTokenManager.refreshToken || "";
	}
	static _fromJSON(t, n) {
		let r = n.displayName ?? void 0, i = n.email ?? void 0, a = n.phoneNumber ?? void 0, o = n.photoURL ?? void 0, s = n.tenantId ?? void 0, c = n._redirectEventId ?? void 0, l = n.createdAt ?? void 0, u = n.lastLoginAt ?? void 0, { uid: d, emailVerified: f, isAnonymous: p, providerData: m, stsTokenManager: h } = n;
		D(d && h, t, "internal-error");
		let g = Or.fromJSON(this.name, h);
		D(typeof d == "string", t, "internal-error"), kr(r, t.name), kr(i, t.name), D(typeof f == "boolean", t, "internal-error"), D(typeof p == "boolean", t, "internal-error"), kr(a, t.name), kr(o, t.name), kr(s, t.name), kr(c, t.name), kr(l, t.name), kr(u, t.name);
		let ee = new e({
			uid: d,
			auth: t,
			email: i,
			emailVerified: f,
			displayName: r,
			isAnonymous: p,
			photoURL: o,
			phoneNumber: a,
			tenantId: s,
			stsTokenManager: g,
			createdAt: l,
			lastLoginAt: u
		});
		return m && Array.isArray(m) && (ee.providerData = m.map((e) => ({ ...e }))), c && (ee._redirectEventId = c), ee;
	}
	static async _fromIdTokenResponse(t, n, r = !1) {
		let i = new Or();
		i.updateFromServerResponse(n);
		let a = new e({
			uid: n.localId,
			auth: t,
			stsTokenManager: i,
			isAnonymous: r
		});
		return await Sr(a), a;
	}
	static async _fromGetAccountInfoResponse(t, n, r) {
		let i = n.users[0];
		D(i.localId !== void 0, "internal-error");
		let a = i.providerUserInfo === void 0 ? [] : Tr(i.providerUserInfo), o = !(i.email && i.passwordHash) && !a?.length, s = new Or();
		s.updateFromIdToken(r);
		let c = new e({
			uid: i.localId,
			auth: t,
			stsTokenManager: s,
			isAnonymous: o
		}), l = {
			uid: i.localId,
			displayName: i.displayName || null,
			photoURL: i.photoUrl || null,
			email: i.email || null,
			emailVerified: i.emailVerified || !1,
			phoneNumber: i.phoneNumber || null,
			tenantId: i.tenantId || null,
			providerData: a,
			metadata: new xr(i.createdAt, i.lastLoginAt),
			isAnonymous: !(i.email && i.passwordHash) && !a?.length
		};
		return Object.assign(c, l), c;
	}
}, jr = /* @__PURE__ */ new Map();
function Mr(e) {
	Wn(e instanceof Function, "Expected a class definition");
	let t = jr.get(e);
	return t ? (Wn(t instanceof e, "Instance stored in cache mismatched with class"), t) : (t = new e(), jr.set(e, t), t);
}
var Nr = class {
	constructor() {
		this.type = "NONE", this.storage = {};
	}
	async _isAvailable() {
		return !0;
	}
	async _set(e, t) {
		this.storage[e] = t;
	}
	async _get(e) {
		let t = this.storage[e];
		return t === void 0 ? null : t;
	}
	async _remove(e) {
		delete this.storage[e];
	}
	_addListener(e, t) {}
	_removeListener(e, t) {}
};
Nr.type = "NONE";
var Pr = Nr;
function Fr(e, t, n) {
	return `firebase:${e}:${t}:${n}`;
}
var Ir = class e {
	constructor(e, t, n) {
		this.persistence = e, this.auth = t, this.userKey = n;
		let { config: r, name: i } = this.auth;
		this.fullUserKey = Fr(this.userKey, r.apiKey, i), this.fullPersistenceKey = Fr("persistence", r.apiKey, i), this.boundEventHandler = t._onStorageEvent.bind(t), this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
	}
	setCurrentUser(e) {
		return this.persistence._set(this.fullUserKey, e.toJSON());
	}
	async getCurrentUser() {
		let e = await this.persistence._get(this.fullUserKey);
		if (!e) return null;
		if (typeof e == "string") {
			let t = await fr(this.auth, { idToken: e }).catch(() => void 0);
			return t ? Ar._fromGetAccountInfoResponse(this.auth, t, e) : null;
		}
		return Ar._fromJSON(this.auth, e);
	}
	removeCurrentUser() {
		return this.persistence._remove(this.fullUserKey);
	}
	savePersistenceForRedirect() {
		return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
	}
	async setPersistence(e) {
		if (this.persistence === e) return;
		let t = await this.getCurrentUser();
		if (await this.removeCurrentUser(), this.persistence = e, t) return this.setCurrentUser(t);
	}
	delete() {
		this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
	}
	static async create(t, n, r = "authUser") {
		if (!n.length) return new e(Mr(Pr), t, r);
		let i = (await Promise.all(n.map(async (e) => {
			if (await e._isAvailable()) return e;
		}))).filter((e) => e), a = i[0] || Mr(Pr), o = Fr(r, t.config.apiKey, t.name), s = null;
		for (let e of n) try {
			let n = await e._get(o);
			if (n) {
				let r;
				if (typeof n == "string") {
					let e = await fr(t, { idToken: n }).catch(() => void 0);
					if (!e) break;
					r = await Ar._fromGetAccountInfoResponse(t, e, n);
				} else r = Ar._fromJSON(t, n);
				e !== a && (s = r), a = e;
				break;
			}
		} catch {}
		let c = i.filter((e) => e._shouldAllowMigration);
		return !a._shouldAllowMigration || !c.length ? new e(a, t, r) : (a = c[0], s && await a._set(o, s.toJSON()), await Promise.all(n.map(async (e) => {
			if (e !== a) try {
				await e._remove(o);
			} catch {}
		})), new e(a, t, r));
	}
};
function Lr(e) {
	let t = e.toLowerCase();
	if (t.includes("opera/") || t.includes("opr/") || t.includes("opios/")) return "Opera";
	if (Vr(t)) return "IEMobile";
	if (t.includes("msie") || t.includes("trident/")) return "IE";
	if (t.includes("edge/")) return "Edge";
	if (Rr(t)) return "Firefox";
	if (t.includes("silk/")) return "Silk";
	if (Ur(t)) return "Blackberry";
	if (Wr(t)) return "Webos";
	if (zr(t)) return "Safari";
	if ((t.includes("chrome/") || Br(t)) && !t.includes("edge/")) return "Chrome";
	if (Hr(t)) return "Android";
	{
		let t = e.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/);
		if (t?.length === 2) return t[1];
	}
	return "Other";
}
function Rr(e = _()) {
	return /firefox\//i.test(e);
}
function zr(e = _()) {
	let t = e.toLowerCase();
	return t.includes("safari/") && !t.includes("chrome/") && !t.includes("crios/") && !t.includes("android");
}
function Br(e = _()) {
	return /crios\//i.test(e);
}
function Vr(e = _()) {
	return /iemobile/i.test(e);
}
function Hr(e = _()) {
	return /android/i.test(e);
}
function Ur(e = _()) {
	return /blackberry/i.test(e);
}
function Wr(e = _()) {
	return /webos/i.test(e);
}
function Gr(e = _()) {
	return /iphone|ipad|ipod/i.test(e) || /macintosh/i.test(e) && /mobile/i.test(e);
}
function Kr(e = _()) {
	return Gr(e) && !!window.navigator?.standalone;
}
function qr() {
	return se() && document.documentMode === 10;
}
function Jr(e = _()) {
	return Gr(e) || Hr(e) || Wr(e) || Ur(e) || /windows phone/i.test(e) || Vr(e);
}
function Yr(e, t = []) {
	let n;
	switch (e) {
		case "Browser":
			n = Lr(_());
			break;
		case "Worker":
			n = `${Lr(_())}-${e}`;
			break;
		default: n = e;
	}
	let r = t.length ? t.join(",") : "FirebaseCore-web";
	return `${n}/JsCore/${qt}/${r}`;
}
var Xr = class {
	constructor(e) {
		this.auth = e, this.queue = [];
	}
	pushCallback(e, t) {
		let n = (t) => new Promise((n, r) => {
			try {
				n(e(t));
			} catch (e) {
				r(e);
			}
		});
		n.onAbort = t, this.queue.push(n);
		let r = this.queue.length - 1;
		return () => {
			this.queue[r] = () => Promise.resolve();
		};
	}
	async runMiddleware(e) {
		if (this.auth.currentUser === e) return;
		let t = [];
		try {
			for (let n of this.queue) await n(e), n.onAbort && t.push(n.onAbort);
		} catch (e) {
			t.reverse();
			for (let e of t) try {
				e();
			} catch {}
			throw this.auth._errorFactory.create("login-blocked", { originalMessage: e?.message });
		}
	}
};
async function Zr(e, t = {}) {
	return k(e, "GET", "/v2/passwordPolicy", O(e, t));
}
var Qr = 6, $r = class {
	constructor(e) {
		let t = e.customStrengthOptions;
		this.customStrengthOptions = {}, this.customStrengthOptions.minPasswordLength = t.minPasswordLength ?? Qr, t.maxPasswordLength && (this.customStrengthOptions.maxPasswordLength = t.maxPasswordLength), t.containsLowercaseCharacter !== void 0 && (this.customStrengthOptions.containsLowercaseLetter = t.containsLowercaseCharacter), t.containsUppercaseCharacter !== void 0 && (this.customStrengthOptions.containsUppercaseLetter = t.containsUppercaseCharacter), t.containsNumericCharacter !== void 0 && (this.customStrengthOptions.containsNumericCharacter = t.containsNumericCharacter), t.containsNonAlphanumericCharacter !== void 0 && (this.customStrengthOptions.containsNonAlphanumericCharacter = t.containsNonAlphanumericCharacter), this.enforcementState = e.enforcementState, this.enforcementState === "ENFORCEMENT_STATE_UNSPECIFIED" && (this.enforcementState = "OFF"), this.allowedNonAlphanumericCharacters = e.allowedNonAlphanumericCharacters?.join("") ?? "", this.forceUpgradeOnSignin = e.forceUpgradeOnSignin ?? !1, this.schemaVersion = e.schemaVersion;
	}
	validatePassword(e) {
		let t = {
			isValid: !0,
			passwordPolicy: this
		};
		return this.validatePasswordLengthOptions(e, t), this.validatePasswordCharacterOptions(e, t), t.isValid && (t.isValid = t.meetsMinPasswordLength ?? !0), t.isValid && (t.isValid = t.meetsMaxPasswordLength ?? !0), t.isValid && (t.isValid = t.containsLowercaseLetter ?? !0), t.isValid && (t.isValid = t.containsUppercaseLetter ?? !0), t.isValid && (t.isValid = t.containsNumericCharacter ?? !0), t.isValid && (t.isValid = t.containsNonAlphanumericCharacter ?? !0), t;
	}
	validatePasswordLengthOptions(e, t) {
		let n = this.customStrengthOptions.minPasswordLength, r = this.customStrengthOptions.maxPasswordLength;
		n && (t.meetsMinPasswordLength = e.length >= n), r && (t.meetsMaxPasswordLength = e.length <= r);
	}
	validatePasswordCharacterOptions(e, t) {
		this.updatePasswordCharacterOptionsStatuses(t, !1, !1, !1, !1);
		let n;
		for (let r = 0; r < e.length; r++) n = e.charAt(r), this.updatePasswordCharacterOptionsStatuses(t, n >= "a" && n <= "z", n >= "A" && n <= "Z", n >= "0" && n <= "9", this.allowedNonAlphanumericCharacters.includes(n));
	}
	updatePasswordCharacterOptionsStatuses(e, t, n, r, i) {
		this.customStrengthOptions.containsLowercaseLetter && (e.containsLowercaseLetter || (e.containsLowercaseLetter = t)), this.customStrengthOptions.containsUppercaseLetter && (e.containsUppercaseLetter || (e.containsUppercaseLetter = n)), this.customStrengthOptions.containsNumericCharacter && (e.containsNumericCharacter || (e.containsNumericCharacter = r)), this.customStrengthOptions.containsNonAlphanumericCharacter && (e.containsNonAlphanumericCharacter || (e.containsNonAlphanumericCharacter = i));
	}
}, ei = class {
	constructor(e, t, n, r) {
		this.app = e, this.heartbeatServiceProvider = t, this.appCheckServiceProvider = n, this.config = r, this.currentUser = null, this.emulatorConfig = null, this.operations = Promise.resolve(), this.authStateSubscription = new ni(this), this.idTokenSubscription = new ni(this), this.beforeStateQueue = new Xr(this), this.redirectUser = null, this.isProactiveRefreshEnabled = !1, this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1, this._canInitEmulator = !0, this._isInitialized = !1, this._deleted = !1, this._initializationPromise = null, this._popupRedirectResolver = null, this._errorFactory = Fn, this._agentRecaptchaConfig = null, this._tenantRecaptchaConfigs = {}, this._projectPasswordPolicy = null, this._tenantPasswordPolicies = {}, this._resolvePersistenceManagerAvailable = void 0, this.lastNotifiedUid = void 0, this.languageCode = null, this.tenantId = null, this.settings = { appVerificationDisabledForTesting: !1 }, this.frameworks = [], this.name = e.name, this.clientVersion = r.sdkClientVersion, this._persistenceManagerAvailable = new Promise((e) => this._resolvePersistenceManagerAvailable = e);
	}
	_initializeWithPersistence(e, t) {
		return t && (this._popupRedirectResolver = Mr(t)), this._initializationPromise = this.queue(async () => {
			if (!this._deleted && (this.persistenceManager = await Ir.create(this, e), this._resolvePersistenceManagerAvailable?.(), !this._deleted)) {
				if (this._popupRedirectResolver?._shouldInitProactively) try {
					await this._popupRedirectResolver._initialize(this);
				} catch {}
				await this.initializeCurrentUser(t), this.lastNotifiedUid = this.currentUser?.uid || null, !this._deleted && (this._isInitialized = !0);
			}
		}), this._initializationPromise;
	}
	async _onStorageEvent() {
		if (this._deleted) return;
		let e = await this.assertedPersistence.getCurrentUser();
		if (!(!this.currentUser && !e)) {
			if (this.currentUser && e && this.currentUser.uid === e.uid) {
				this._currentUser._assign(e), await this.currentUser.getIdToken();
				return;
			}
			await this._updateCurrentUser(e, !0);
		}
	}
	async initializeCurrentUserFromIdToken(e) {
		try {
			let t = await fr(this, { idToken: e }), n = await Ar._fromGetAccountInfoResponse(this, t, e);
			await this.directlySetCurrentUser(n);
		} catch (e) {
			console.warn("FirebaseServerApp could not login user with provided authIdToken: ", e), await this.directlySetCurrentUser(null);
		}
	}
	async initializeCurrentUser(e) {
		if (Gt(this.app)) {
			let e = this.app.settings.authIdToken;
			return e ? new Promise((t) => {
				setTimeout(() => this.initializeCurrentUserFromIdToken(e).then(t, t));
			}) : this.directlySetCurrentUser(null);
		}
		let t = await this.assertedPersistence.getCurrentUser(), n = t, r = !1;
		if (e && this.config.authDomain) {
			await this.getOrInitRedirectPersistenceManager();
			let t = this.redirectUser?._redirectEventId, i = n?._redirectEventId, a = await this.tryRedirectSignIn(e);
			(!t || t === i) && a?.user && (n = a.user, r = !0);
		}
		if (!n) return this.directlySetCurrentUser(null);
		if (!n._redirectEventId) {
			if (r) try {
				await this.beforeStateQueue.runMiddleware(n);
			} catch (e) {
				n = t, this._popupRedirectResolver._overrideRedirectResult(this, () => Promise.reject(e));
			}
			return n ? this.reloadAndSetCurrentUserOrClear(n) : this.directlySetCurrentUser(null);
		}
		return D(this._popupRedirectResolver, this, "argument-error"), await this.getOrInitRedirectPersistenceManager(), this.redirectUser && this.redirectUser._redirectEventId === n._redirectEventId ? this.directlySetCurrentUser(n) : this.reloadAndSetCurrentUserOrClear(n);
	}
	async tryRedirectSignIn(e) {
		let t = null;
		try {
			t = await this._popupRedirectResolver._completeRedirectFn(this, e, !0);
		} catch {
			await this._setRedirectUser(null);
		}
		return t;
	}
	async reloadAndSetCurrentUserOrClear(e) {
		try {
			await Sr(e);
		} catch (e) {
			if (e?.code !== "auth/network-request-failed") return this.directlySetCurrentUser(null);
		}
		return this.directlySetCurrentUser(e);
	}
	useDeviceLanguage() {
		this.languageCode = Yn();
	}
	async _delete() {
		this._deleted = !0;
	}
	async updateCurrentUser(e) {
		if (Gt(this.app)) return Promise.reject(Vn(this));
		let t = e ? y(e) : null;
		return t && D(t.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"), this._updateCurrentUser(t && t._clone(this));
	}
	async _updateCurrentUser(e, t = !1) {
		if (!this._deleted) return e && D(this.tenantId === e.tenantId, this, "tenant-id-mismatch"), t || await this.beforeStateQueue.runMiddleware(e), this.queue(async () => {
			await this.directlySetCurrentUser(e), this.notifyAuthListeners();
		});
	}
	async signOut() {
		return Gt(this.app) ? Promise.reject(Vn(this)) : (await this.beforeStateQueue.runMiddleware(null), (this.redirectPersistenceManager || this._popupRedirectResolver) && await this._setRedirectUser(null), this._updateCurrentUser(null, !0));
	}
	setPersistence(e) {
		return Gt(this.app) ? Promise.reject(Vn(this)) : this.queue(async () => {
			await this.assertedPersistence.setPersistence(Mr(e));
		});
	}
	_getRecaptchaConfig() {
		return this.tenantId == null ? this._agentRecaptchaConfig : this._tenantRecaptchaConfigs[this.tenantId];
	}
	async validatePassword(e) {
		this._getPasswordPolicyInternal() || await this._updatePasswordPolicy();
		let t = this._getPasswordPolicyInternal();
		return t.schemaVersion === this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION ? t.validatePassword(e) : Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version", {}));
	}
	_getPasswordPolicyInternal() {
		return this.tenantId === null ? this._projectPasswordPolicy : this._tenantPasswordPolicies[this.tenantId];
	}
	async _updatePasswordPolicy() {
		let e = new $r(await Zr(this));
		this.tenantId === null ? this._projectPasswordPolicy = e : this._tenantPasswordPolicies[this.tenantId] = e;
	}
	_getPersistenceType() {
		return this.assertedPersistence.persistence.type;
	}
	_getPersistence() {
		return this.assertedPersistence.persistence;
	}
	_updateErrorMap(e) {
		this._errorFactory = new fe("auth", "Firebase", e());
	}
	onAuthStateChanged(e, t, n) {
		return this.registerStateListener(this.authStateSubscription, e, t, n);
	}
	beforeAuthStateChanged(e, t) {
		return this.beforeStateQueue.pushCallback(e, t);
	}
	onIdTokenChanged(e, t, n) {
		return this.registerStateListener(this.idTokenSubscription, e, t, n);
	}
	authStateReady() {
		return new Promise((e, t) => {
			if (this.currentUser) e();
			else {
				let n = this.onAuthStateChanged(() => {
					n(), e();
				}, t);
			}
		});
	}
	async revokeAccessToken(e) {
		if (this.currentUser) {
			let t = {
				providerId: "apple.com",
				tokenType: "ACCESS_TOKEN",
				token: e,
				idToken: await this.currentUser.getIdToken()
			};
			this.tenantId != null && (t.tenantId = this.tenantId), await Dr(this, t);
		}
	}
	toJSON() {
		return {
			apiKey: this.config.apiKey,
			authDomain: this.config.authDomain,
			appName: this.name,
			currentUser: this._currentUser?.toJSON()
		};
	}
	async _setRedirectUser(e, t) {
		let n = await this.getOrInitRedirectPersistenceManager(t);
		return e === null ? n.removeCurrentUser() : n.setCurrentUser(e);
	}
	async getOrInitRedirectPersistenceManager(e) {
		if (!this.redirectPersistenceManager) {
			let t = e && Mr(e) || this._popupRedirectResolver;
			D(t, this, "argument-error"), this.redirectPersistenceManager = await Ir.create(this, [Mr(t._redirectPersistence)], "redirectUser"), this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
		}
		return this.redirectPersistenceManager;
	}
	async _redirectUserForId(e) {
		return this._isInitialized && await this.queue(async () => {}), this._currentUser?._redirectEventId === e ? this._currentUser : this.redirectUser?._redirectEventId === e ? this.redirectUser : null;
	}
	async _persistUserIfCurrent(e) {
		if (e === this.currentUser) return this.queue(async () => this.directlySetCurrentUser(e));
	}
	_notifyListenersIfCurrent(e) {
		e === this.currentUser && this.notifyAuthListeners();
	}
	_key() {
		return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
	}
	_startProactiveRefresh() {
		this.isProactiveRefreshEnabled = !0, this.currentUser && this._currentUser._startProactiveRefresh();
	}
	_stopProactiveRefresh() {
		this.isProactiveRefreshEnabled = !1, this.currentUser && this._currentUser._stopProactiveRefresh();
	}
	get _currentUser() {
		return this.currentUser;
	}
	notifyAuthListeners() {
		if (!this._isInitialized) return;
		this.idTokenSubscription.next(this.currentUser);
		let e = this.currentUser?.uid ?? null;
		this.lastNotifiedUid !== e && (this.lastNotifiedUid = e, this.authStateSubscription.next(this.currentUser));
	}
	registerStateListener(e, t, n, r) {
		if (this._deleted) return () => {};
		let i = typeof t == "function" ? t : t.next.bind(t), a = !1, o = this._isInitialized ? Promise.resolve() : this._initializationPromise;
		if (D(o, this, "internal-error"), o.then(() => {
			a || i(this.currentUser);
		}), typeof t == "function") {
			let i = e.addObserver(t, n, r);
			return () => {
				a = !0, i();
			};
		} else {
			let n = e.addObserver(t);
			return () => {
				a = !0, n();
			};
		}
	}
	async directlySetCurrentUser(e) {
		this.currentUser && this.currentUser !== e && this._currentUser._stopProactiveRefresh(), e && this.isProactiveRefreshEnabled && e._startProactiveRefresh(), this.currentUser = e, e ? await this.assertedPersistence.setCurrentUser(e) : await this.assertedPersistence.removeCurrentUser();
	}
	queue(e) {
		return this.operations = this.operations.then(e, e), this.operations;
	}
	get assertedPersistence() {
		return D(this.persistenceManager, this, "internal-error"), this.persistenceManager;
	}
	_logFramework(e) {
		!e || this.frameworks.includes(e) || (this.frameworks.push(e), this.frameworks.sort(), this.clientVersion = Yr(this.config.clientPlatform, this._getFrameworks()));
	}
	_getFrameworks() {
		return this.frameworks;
	}
	async _getAdditionalHeaders() {
		let e = { "X-Client-Version": this.clientVersion };
		this.app.options.appId && (e["X-Firebase-gmpid"] = this.app.options.appId);
		let t = await this.heartbeatServiceProvider.getImmediate({ optional: !0 })?.getHeartbeatsHeader();
		t && (e["X-Firebase-Client"] = t);
		let n = await this._getAppCheckToken();
		return n && (e["X-Firebase-AppCheck"] = n), e;
	}
	async _getAppCheckToken() {
		if (Gt(this.app) && this.app.settings.appCheckToken) return this.app.settings.appCheckToken;
		let e = await this.appCheckServiceProvider.getImmediate({ optional: !0 })?.getToken();
		return e?.error && Ln(`Error while retrieving App Check token: ${e.error}`), e?.token;
	}
};
function ti(e) {
	return y(e);
}
var ni = class {
	constructor(e) {
		this.auth = e, this.observer = null, this.addObserver = xe((e) => this.observer = e);
	}
	get next() {
		return D(this.observer, this.auth, "internal-error"), this.observer.next.bind(this.observer);
	}
}, ri = {
	async loadJS() {
		throw Error("Unable to load external scripts");
	},
	recaptchaV2Script: "",
	recaptchaEnterpriseScript: "",
	gapiScript: ""
};
function ii(e) {
	ri = e;
}
function ai(e) {
	return ri.loadJS(e);
}
function oi() {
	return ri.recaptchaEnterpriseScript;
}
function si() {
	return ri.gapiScript;
}
function ci(e) {
	return `__${e}${Math.floor(Math.random() * 1e6)}`;
}
var li = class {
	constructor() {
		this.enterprise = new ui();
	}
	ready(e) {
		e();
	}
	execute(e, t) {
		return Promise.resolve("token");
	}
	render(e, t) {
		return "";
	}
}, ui = class {
	ready(e) {
		e();
	}
	execute(e, t) {
		return Promise.resolve("token");
	}
	render(e, t) {
		return "";
	}
}, di = "recaptcha-enterprise", fi = "NO_RECAPTCHA", pi = class {
	constructor(e) {
		this.type = di, this.auth = ti(e);
	}
	async verify(e = "verify", t = !1) {
		async function n(e) {
			if (!t) {
				if (e.tenantId == null && e._agentRecaptchaConfig != null) return e._agentRecaptchaConfig.siteKey;
				if (e.tenantId != null && e._tenantRecaptchaConfigs[e.tenantId] !== void 0) return e._tenantRecaptchaConfigs[e.tenantId].siteKey;
			}
			return new Promise(async (t, n) => {
				ur(e, {
					clientType: "CLIENT_TYPE_WEB",
					version: "RECAPTCHA_ENTERPRISE"
				}).then((r) => {
					if (r.recaptchaKey === void 0) n(/* @__PURE__ */ Error("recaptcha Enterprise site key undefined"));
					else {
						let n = new lr(r);
						return e.tenantId == null ? e._agentRecaptchaConfig = n : e._tenantRecaptchaConfigs[e.tenantId] = n, t(n.siteKey);
					}
				}).catch((e) => {
					n(e);
				});
			});
		}
		function r(t, n, r) {
			let i = window.grecaptcha;
			cr(i) ? i.enterprise.ready(() => {
				i.enterprise.execute(t, { action: e }).then((e) => {
					n(e);
				}).catch(() => {
					n(fi);
				});
			}) : r(Error("No reCAPTCHA enterprise script loaded."));
		}
		return this.auth.settings.appVerificationDisabledForTesting ? new li().execute("siteKey", { action: "verify" }) : new Promise((e, i) => {
			n(this.auth).then((n) => {
				if (!t && cr(window.grecaptcha)) r(n, e, i);
				else {
					if (typeof window > "u") {
						i(/* @__PURE__ */ Error("RecaptchaVerifier is only supported in browser"));
						return;
					}
					let t = oi();
					t.length !== 0 && (t += n), ai(t).then(() => {
						r(n, e, i);
					}).catch((e) => {
						i(e);
					});
				}
			}).catch((e) => {
				i(e);
			});
		});
	}
};
async function mi(e, t, n, r = !1, i = !1) {
	let a = new pi(e), o;
	if (i) o = fi;
	else try {
		o = await a.verify(n);
	} catch {
		o = await a.verify(n, !0);
	}
	let s = { ...t };
	if (n === "mfaSmsEnrollment" || n === "mfaSmsSignIn") {
		if ("phoneEnrollmentInfo" in s) {
			let e = s.phoneEnrollmentInfo.phoneNumber, t = s.phoneEnrollmentInfo.recaptchaToken;
			Object.assign(s, { phoneEnrollmentInfo: {
				phoneNumber: e,
				recaptchaToken: t,
				captchaResponse: o,
				clientType: "CLIENT_TYPE_WEB",
				recaptchaVersion: "RECAPTCHA_ENTERPRISE"
			} });
		} else if ("phoneSignInInfo" in s) {
			let e = s.phoneSignInInfo.recaptchaToken;
			Object.assign(s, { phoneSignInInfo: {
				recaptchaToken: e,
				captchaResponse: o,
				clientType: "CLIENT_TYPE_WEB",
				recaptchaVersion: "RECAPTCHA_ENTERPRISE"
			} });
		}
		return s;
	}
	return r ? Object.assign(s, { captchaResp: o }) : Object.assign(s, { captchaResponse: o }), Object.assign(s, { clientType: "CLIENT_TYPE_WEB" }), Object.assign(s, { recaptchaVersion: "RECAPTCHA_ENTERPRISE" }), s;
}
async function hi(e, t, n, r, i) {
	return i === "EMAIL_PASSWORD_PROVIDER" ? e._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER") ? r(e, await mi(e, t, n, n === "getOobCode")) : r(e, t).catch(async (i) => i.code === "auth/missing-recaptcha-token" ? (console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`), r(e, await mi(e, t, n, n === "getOobCode"))) : Promise.reject(i)) : i === "PHONE_PROVIDER" ? e._getRecaptchaConfig()?.isProviderEnabled("PHONE_PROVIDER") ? r(e, await mi(e, t, n)).catch(async (i) => e._getRecaptchaConfig()?.getProviderEnforcementState("PHONE_PROVIDER") === "AUDIT" && (i.code === "auth/missing-recaptcha-token" || i.code === "auth/invalid-app-credential") ? (console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${n} flow.`), r(e, await mi(e, t, n, !1, !0))) : Promise.reject(i)) : r(e, await mi(e, t, n, !1, !0)) : Promise.reject(i + " provider is not supported.");
}
async function gi(e) {
	let t = ti(e), n = new lr(await ur(t, {
		clientType: "CLIENT_TYPE_WEB",
		version: "RECAPTCHA_ENTERPRISE"
	}));
	t.tenantId == null ? t._agentRecaptchaConfig = n : t._tenantRecaptchaConfigs[t.tenantId] = n, n.isAnyProviderEnabled() && new pi(t).verify();
}
function _i(e, t) {
	let n = Wt(e, "auth");
	if (n.isInitialized()) {
		let e = n.getImmediate();
		if (ge(n.getOptions(), t ?? {})) return e;
		E(e, "already-initialized");
	}
	return n.initialize({ options: t });
}
function vi(e, t) {
	let n = t?.persistence || [], r = (Array.isArray(n) ? n : [n]).map(Mr);
	t?.errorMap && e._updateErrorMap(t.errorMap), e._initializeWithPersistence(r, t?.popupRedirectResolver);
}
function yi(e, t, n) {
	let r = ti(e);
	D(/^https?:\/\//.test(t), r, "invalid-emulator-scheme");
	let i = !!n?.disableWarnings, a = bi(t), { host: o, port: s } = xi(t), c = s === null ? "" : `:${s}`, l = { url: `${a}//${o}${c}/` }, u = Object.freeze({
		host: o,
		port: s,
		protocol: a.replace(":", ""),
		options: Object.freeze({ disableWarnings: i })
	});
	if (!r._canInitEmulator) {
		D(r.config.emulator && r.emulatorConfig, r, "emulator-config-failed"), D(ge(l, r.config.emulator) && ge(u, r.emulatorConfig), r, "emulator-config-failed");
		return;
	}
	r.config.emulator = l, r.emulatorConfig = u, r.settings.appVerificationDisabledForTesting = !0, Te(o) ? Ee(`${a}//${o}${c}`) : i || Ci();
}
function bi(e) {
	let t = e.indexOf(":");
	return t < 0 ? "" : e.substr(0, t + 1);
}
function xi(e) {
	let t = bi(e), n = /(\/\/)?([^?#/]+)/.exec(e.substr(t.length));
	if (!n) return {
		host: "",
		port: null
	};
	let r = n[2].split("@").pop() || "", i = /^(\[[^\]]+\])(:|$)/.exec(r);
	if (i) {
		let e = i[1];
		return {
			host: e,
			port: Si(r.substr(e.length + 1))
		};
	} else {
		let [e, t] = r.split(":");
		return {
			host: e,
			port: Si(t)
		};
	}
}
function Si(e) {
	if (!e) return null;
	let t = Number(e);
	return isNaN(t) ? null : t;
}
function Ci() {
	function e() {
		let e = document.createElement("p"), t = e.style;
		e.innerText = "Running in emulator mode. Do not use with production credentials.", t.position = "fixed", t.width = "100%", t.backgroundColor = "#ffffff", t.border = ".1em solid #000000", t.color = "#b50000", t.bottom = "0px", t.left = "0px", t.margin = "0px", t.zIndex = "10000", t.textAlign = "center", e.classList.add("firebase-emulator-warning"), document.body.appendChild(e);
	}
	typeof console < "u" && typeof console.info == "function" && console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."), typeof window < "u" && typeof document < "u" && (document.readyState === "loading" ? window.addEventListener("DOMContentLoaded", e) : e());
}
var wi = class {
	constructor(e, t) {
		this.providerId = e, this.signInMethod = t;
	}
	toJSON() {
		return Un("not implemented");
	}
	_getIdTokenResponse(e) {
		return Un("not implemented");
	}
	_linkToIdToken(e, t) {
		return Un("not implemented");
	}
	_getReauthenticationResolver(e) {
		return Un("not implemented");
	}
};
async function Ti(e, t) {
	return k(e, "POST", "/v1/accounts:signUp", t);
}
async function Ei(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithPassword", O(e, t));
}
async function Di(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithEmailLink", O(e, t));
}
async function Oi(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithEmailLink", O(e, t));
}
var ki = class e extends wi {
	constructor(e, t, n, r = null) {
		super("password", n), this._email = e, this._password = t, this._tenantId = r;
	}
	static _fromEmailAndPassword(t, n) {
		return new e(t, n, "password");
	}
	static _fromEmailAndCode(t, n, r = null) {
		return new e(t, n, "emailLink", r);
	}
	toJSON() {
		return {
			email: this._email,
			password: this._password,
			signInMethod: this.signInMethod,
			tenantId: this._tenantId
		};
	}
	static fromJSON(e) {
		let t = typeof e == "string" ? JSON.parse(e) : e;
		if (t?.email && t?.password) {
			if (t.signInMethod === "password") return this._fromEmailAndPassword(t.email, t.password);
			if (t.signInMethod === "emailLink") return this._fromEmailAndCode(t.email, t.password, t.tenantId);
		}
		return null;
	}
	async _getIdTokenResponse(e) {
		switch (this.signInMethod) {
			case "password": return hi(e, {
				returnSecureToken: !0,
				email: this._email,
				password: this._password,
				clientType: "CLIENT_TYPE_WEB"
			}, "signInWithPassword", Ei, "EMAIL_PASSWORD_PROVIDER");
			case "emailLink": return Di(e, {
				email: this._email,
				oobCode: this._password
			});
			default: E(e, "internal-error");
		}
	}
	async _linkToIdToken(e, t) {
		switch (this.signInMethod) {
			case "password": return hi(e, {
				idToken: t,
				returnSecureToken: !0,
				email: this._email,
				password: this._password,
				clientType: "CLIENT_TYPE_WEB"
			}, "signUpPassword", Ti, "EMAIL_PASSWORD_PROVIDER");
			case "emailLink": return Oi(e, {
				idToken: t,
				email: this._email,
				oobCode: this._password
			});
			default: E(e, "internal-error");
		}
	}
	_getReauthenticationResolver(e) {
		return this._getIdTokenResponse(e);
	}
};
async function Ai(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithIdp", O(e, t));
}
var ji = "http://localhost", Mi = class e extends wi {
	constructor() {
		super(...arguments), this.pendingToken = null;
	}
	static _fromParams(t) {
		let n = new e(t.providerId, t.signInMethod);
		return t.idToken || t.accessToken ? (t.idToken && (n.idToken = t.idToken), t.accessToken && (n.accessToken = t.accessToken), t.nonce && !t.pendingToken && (n.nonce = t.nonce), t.pendingToken && (n.pendingToken = t.pendingToken)) : t.oauthToken && t.oauthTokenSecret ? (n.accessToken = t.oauthToken, n.secret = t.oauthTokenSecret) : E("argument-error"), n;
	}
	toJSON() {
		return {
			idToken: this.idToken,
			accessToken: this.accessToken,
			secret: this.secret,
			nonce: this.nonce,
			pendingToken: this.pendingToken,
			providerId: this.providerId,
			signInMethod: this.signInMethod
		};
	}
	static fromJSON(t) {
		let { providerId: n, signInMethod: r, ...i } = typeof t == "string" ? JSON.parse(t) : t;
		if (!n || !r) return null;
		let a = new e(n, r);
		return a.idToken = i.idToken || void 0, a.accessToken = i.accessToken || void 0, a.secret = i.secret, a.nonce = i.nonce, a.pendingToken = i.pendingToken || null, a;
	}
	_getIdTokenResponse(e) {
		return Ai(e, this.buildRequest());
	}
	_linkToIdToken(e, t) {
		let n = this.buildRequest();
		return n.idToken = t, Ai(e, n);
	}
	_getReauthenticationResolver(e) {
		let t = this.buildRequest();
		return t.autoCreate = !1, Ai(e, t);
	}
	buildRequest() {
		let e = {
			requestUri: ji,
			returnSecureToken: !0
		};
		if (this.pendingToken) e.pendingToken = this.pendingToken;
		else {
			let t = {};
			this.idToken && (t.id_token = this.idToken), this.accessToken && (t.access_token = this.accessToken), this.secret && (t.oauth_token_secret = this.secret), t.providerId = this.providerId, this.nonce && !this.pendingToken && (t.nonce = this.nonce), e.postBody = ve(t);
		}
		return e;
	}
};
async function Ni(e, t) {
	return k(e, "POST", "/v1/accounts:sendVerificationCode", O(e, t));
}
async function Pi(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithPhoneNumber", O(e, t));
}
async function Fi(e, t) {
	let n = await rr(e, "POST", "/v1/accounts:signInWithPhoneNumber", O(e, t));
	if (n.temporaryProof) throw sr(e, "account-exists-with-different-credential", n);
	return n;
}
var Ii = { USER_NOT_FOUND: "user-not-found" };
async function Li(e, t) {
	return rr(e, "POST", "/v1/accounts:signInWithPhoneNumber", O(e, {
		...t,
		operation: "REAUTH"
	}), Ii);
}
var Ri = class e extends wi {
	constructor(e) {
		super("phone", "phone"), this.params = e;
	}
	static _fromVerification(t, n) {
		return new e({
			verificationId: t,
			verificationCode: n
		});
	}
	static _fromTokenResponse(t, n) {
		return new e({
			phoneNumber: t,
			temporaryProof: n
		});
	}
	_getIdTokenResponse(e) {
		return Pi(e, this._makeVerificationRequest());
	}
	_linkToIdToken(e, t) {
		return Fi(e, {
			idToken: t,
			...this._makeVerificationRequest()
		});
	}
	_getReauthenticationResolver(e) {
		return Li(e, this._makeVerificationRequest());
	}
	_makeVerificationRequest() {
		let { temporaryProof: e, phoneNumber: t, verificationId: n, verificationCode: r } = this.params;
		return e && t ? {
			temporaryProof: e,
			phoneNumber: t
		} : {
			sessionInfo: n,
			code: r
		};
	}
	toJSON() {
		let e = { providerId: this.providerId };
		return this.params.phoneNumber && (e.phoneNumber = this.params.phoneNumber), this.params.temporaryProof && (e.temporaryProof = this.params.temporaryProof), this.params.verificationCode && (e.verificationCode = this.params.verificationCode), this.params.verificationId && (e.verificationId = this.params.verificationId), e;
	}
	static fromJSON(t) {
		typeof t == "string" && (t = JSON.parse(t));
		let { verificationId: n, verificationCode: r, phoneNumber: i, temporaryProof: a } = t;
		return !r && !n && !i && !a ? null : new e({
			verificationId: n,
			verificationCode: r,
			phoneNumber: i,
			temporaryProof: a
		});
	}
};
function zi(e) {
	switch (e) {
		case "recoverEmail": return "RECOVER_EMAIL";
		case "resetPassword": return "PASSWORD_RESET";
		case "signIn": return "EMAIL_SIGNIN";
		case "verifyEmail": return "VERIFY_EMAIL";
		case "verifyAndChangeEmail": return "VERIFY_AND_CHANGE_EMAIL";
		case "revertSecondFactorAddition": return "REVERT_SECOND_FACTOR_ADDITION";
		default: return null;
	}
}
function Bi(e) {
	let t = ye(be(e)).link, n = t ? ye(be(t)).deep_link_id : null, r = ye(be(e)).deep_link_id;
	return (r ? ye(be(r)).link : null) || r || n || t || e;
}
var Vi = class e {
	constructor(e) {
		let t = ye(be(e)), n = t.apiKey ?? null, r = t.oobCode ?? null, i = zi(t.mode ?? null);
		D(n && r && i, "argument-error"), this.apiKey = n, this.operation = i, this.code = r, this.continueUrl = t.continueUrl ?? null, this.languageCode = t.lang ?? null, this.tenantId = t.tenantId ?? null;
	}
	static parseLink(t) {
		let n = Bi(t);
		try {
			return new e(n);
		} catch {
			return null;
		}
	}
}, Hi = class e {
	constructor() {
		this.providerId = e.PROVIDER_ID;
	}
	static credential(e, t) {
		return ki._fromEmailAndPassword(e, t);
	}
	static credentialWithLink(e, t) {
		let n = Vi.parseLink(t);
		return D(n, "argument-error"), ki._fromEmailAndCode(e, n.code, n.tenantId);
	}
};
Hi.PROVIDER_ID = "password", Hi.EMAIL_PASSWORD_SIGN_IN_METHOD = "password", Hi.EMAIL_LINK_SIGN_IN_METHOD = "emailLink";
var Ui = class {
	constructor(e) {
		this.providerId = e, this.defaultLanguageCode = null, this.customParameters = {};
	}
	setDefaultLanguage(e) {
		this.defaultLanguageCode = e;
	}
	setCustomParameters(e) {
		return this.customParameters = e, this;
	}
	getCustomParameters() {
		return this.customParameters;
	}
}, Wi = class extends Ui {
	constructor() {
		super(...arguments), this.scopes = [];
	}
	addScope(e) {
		return this.scopes.includes(e) || this.scopes.push(e), this;
	}
	getScopes() {
		return [...this.scopes];
	}
}, Gi = class e extends Wi {
	constructor() {
		super("facebook.com");
	}
	static credential(t) {
		return Mi._fromParams({
			providerId: e.PROVIDER_ID,
			signInMethod: e.FACEBOOK_SIGN_IN_METHOD,
			accessToken: t
		});
	}
	static credentialFromResult(t) {
		return e.credentialFromTaggedObject(t);
	}
	static credentialFromError(t) {
		return e.credentialFromTaggedObject(t.customData || {});
	}
	static credentialFromTaggedObject({ _tokenResponse: t }) {
		if (!t || !("oauthAccessToken" in t) || !t.oauthAccessToken) return null;
		try {
			return e.credential(t.oauthAccessToken);
		} catch {
			return null;
		}
	}
};
Gi.FACEBOOK_SIGN_IN_METHOD = "facebook.com", Gi.PROVIDER_ID = "facebook.com";
var Ki = class e extends Wi {
	constructor() {
		super("google.com"), this.addScope("profile");
	}
	static credential(t, n) {
		return Mi._fromParams({
			providerId: e.PROVIDER_ID,
			signInMethod: e.GOOGLE_SIGN_IN_METHOD,
			idToken: t,
			accessToken: n
		});
	}
	static credentialFromResult(t) {
		return e.credentialFromTaggedObject(t);
	}
	static credentialFromError(t) {
		return e.credentialFromTaggedObject(t.customData || {});
	}
	static credentialFromTaggedObject({ _tokenResponse: t }) {
		if (!t) return null;
		let { oauthIdToken: n, oauthAccessToken: r } = t;
		if (!n && !r) return null;
		try {
			return e.credential(n, r);
		} catch {
			return null;
		}
	}
};
Ki.GOOGLE_SIGN_IN_METHOD = "google.com", Ki.PROVIDER_ID = "google.com";
var qi = class e extends Wi {
	constructor() {
		super("github.com");
	}
	static credential(t) {
		return Mi._fromParams({
			providerId: e.PROVIDER_ID,
			signInMethod: e.GITHUB_SIGN_IN_METHOD,
			accessToken: t
		});
	}
	static credentialFromResult(t) {
		return e.credentialFromTaggedObject(t);
	}
	static credentialFromError(t) {
		return e.credentialFromTaggedObject(t.customData || {});
	}
	static credentialFromTaggedObject({ _tokenResponse: t }) {
		if (!t || !("oauthAccessToken" in t) || !t.oauthAccessToken) return null;
		try {
			return e.credential(t.oauthAccessToken);
		} catch {
			return null;
		}
	}
};
qi.GITHUB_SIGN_IN_METHOD = "github.com", qi.PROVIDER_ID = "github.com";
var Ji = class e extends Wi {
	constructor() {
		super("twitter.com");
	}
	static credential(t, n) {
		return Mi._fromParams({
			providerId: e.PROVIDER_ID,
			signInMethod: e.TWITTER_SIGN_IN_METHOD,
			oauthToken: t,
			oauthTokenSecret: n
		});
	}
	static credentialFromResult(t) {
		return e.credentialFromTaggedObject(t);
	}
	static credentialFromError(t) {
		return e.credentialFromTaggedObject(t.customData || {});
	}
	static credentialFromTaggedObject({ _tokenResponse: t }) {
		if (!t) return null;
		let { oauthAccessToken: n, oauthTokenSecret: r } = t;
		if (!n || !r) return null;
		try {
			return e.credential(n, r);
		} catch {
			return null;
		}
	}
};
Ji.TWITTER_SIGN_IN_METHOD = "twitter.com", Ji.PROVIDER_ID = "twitter.com";
async function Yi(e, t) {
	return rr(e, "POST", "/v1/accounts:signUp", O(e, t));
}
var Xi = class e {
	constructor(e) {
		this.user = e.user, this.providerId = e.providerId, this._tokenResponse = e._tokenResponse, this.operationType = e.operationType;
	}
	static async _fromIdTokenResponse(t, n, r, i = !1) {
		return new e({
			user: await Ar._fromIdTokenResponse(t, r, i),
			providerId: Zi(r),
			_tokenResponse: r,
			operationType: n
		});
	}
	static async _forOperation(t, n, r) {
		return await t._updateTokensIfNecessary(r, !0), new e({
			user: t,
			providerId: Zi(r),
			_tokenResponse: r,
			operationType: n
		});
	}
};
function Zi(e) {
	return e.providerId ? e.providerId : "phoneNumber" in e ? "phone" : null;
}
async function Qi(e) {
	if (Gt(e.app)) return Promise.reject(Vn(e));
	let t = ti(e);
	if (await t._initializationPromise, t.currentUser?.isAnonymous) return new Xi({
		user: t.currentUser,
		providerId: null,
		operationType: "signIn"
	});
	let n = await Yi(t, { returnSecureToken: !0 }), r = await Xi._fromIdTokenResponse(t, "signIn", n, !0);
	return await t._updateCurrentUser(r.user), r;
}
var $i = class e extends de {
	constructor(t, n, r, i) {
		super(n.code, n.message), this.operationType = r, this.user = i, Object.setPrototypeOf(this, e.prototype), this.customData = {
			appName: t.name,
			tenantId: t.tenantId ?? void 0,
			_serverResponse: n.customData._serverResponse,
			operationType: r
		};
	}
	static _fromErrorAndOperation(t, n, r, i) {
		return new e(t, n, r, i);
	}
};
function ea(e, t, n, r) {
	return (t === "reauthenticate" ? n._getReauthenticationResolver(e) : n._getIdTokenResponse(e)).catch((n) => {
		throw n.code === "auth/multi-factor-auth-required" ? $i._fromErrorAndOperation(e, n, t, r) : n;
	});
}
async function ta(e, t, n = !1) {
	let r = await vr(e, t._linkToIdToken(e.auth, await e.getIdToken()), n);
	return Xi._forOperation(e, "link", r);
}
async function na(e, t, n = !1) {
	let { auth: r } = e;
	if (Gt(r.app)) return Promise.reject(Vn(r));
	let i = "reauthenticate";
	try {
		let a = await vr(e, ea(r, i, t, e), n);
		D(a.idToken, r, "internal-error");
		let o = gr(a.idToken);
		D(o, r, "internal-error");
		let { sub: s } = o;
		return D(e.uid === s, r, "user-mismatch"), Xi._forOperation(e, i, a);
	} catch (e) {
		throw e?.code === "auth/user-not-found" && E(r, "user-mismatch"), e;
	}
}
async function ra(e, t, n = !1) {
	if (Gt(e.app)) return Promise.reject(Vn(e));
	let r = "signIn", i = await ea(e, r, t), a = await Xi._fromIdTokenResponse(e, r, i);
	return n || await e._updateCurrentUser(a.user), a;
}
function ia(e, t, n, r) {
	return y(e).onIdTokenChanged(t, n, r);
}
function aa(e, t, n) {
	return y(e).beforeAuthStateChanged(t, n);
}
function oa(e, t, n, r) {
	return y(e).onAuthStateChanged(t, n, r);
}
function sa(e, t) {
	return k(e, "POST", "/v2/accounts/mfaEnrollment:start", O(e, t));
}
function ca(e, t) {
	return k(e, "POST", "/v2/accounts/mfaEnrollment:finalize", O(e, t));
}
function la(e, t) {
	return k(e, "POST", "/v2/accounts/mfaEnrollment:start", O(e, t));
}
function ua(e, t) {
	return k(e, "POST", "/v2/accounts/mfaEnrollment:finalize", O(e, t));
}
var da = "__sak", fa = class {
	constructor(e, t) {
		this.storageRetriever = e, this.type = t;
	}
	_isAvailable() {
		try {
			return this.storage ? (this.storage.setItem(da, "1"), this.storage.removeItem(da), Promise.resolve(!0)) : Promise.resolve(!1);
		} catch {
			return Promise.resolve(!1);
		}
	}
	_set(e, t) {
		return this.storage.setItem(e, JSON.stringify(t)), Promise.resolve();
	}
	_get(e) {
		let t = this.storage.getItem(e);
		return Promise.resolve(t ? JSON.parse(t) : null);
	}
	_remove(e) {
		return this.storage.removeItem(e), Promise.resolve();
	}
	get storage() {
		return this.storageRetriever();
	}
}, pa = 1e3, ma = 10, ha = class extends fa {
	constructor() {
		super(() => window.localStorage, "LOCAL"), this.boundEventHandler = (e, t) => this.onStorageEvent(e, t), this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.fallbackToPolling = Jr(), this._shouldAllowMigration = !0;
	}
	forAllChangedKeys(e) {
		for (let t of Object.keys(this.listeners)) {
			let n = this.storage.getItem(t), r = this.localCache[t];
			n !== r && e(t, r, n);
		}
	}
	onStorageEvent(e, t = !1) {
		if (!e.key) {
			this.forAllChangedKeys((e, t, n) => {
				this.notifyListeners(e, n);
			});
			return;
		}
		let n = e.key;
		t ? this.detachListener() : this.stopPolling();
		let r = () => {
			let e = this.storage.getItem(n);
			!t && this.localCache[n] === e || this.notifyListeners(n, e);
		}, i = this.storage.getItem(n);
		qr() && i !== e.newValue && e.newValue !== e.oldValue ? setTimeout(r, ma) : r();
	}
	notifyListeners(e, t) {
		this.localCache[e] = t;
		let n = this.listeners[e];
		if (n) for (let e of Array.from(n)) e(t && JSON.parse(t));
	}
	startPolling() {
		this.stopPolling(), this.pollTimer = setInterval(() => {
			this.forAllChangedKeys((e, t, n) => {
				this.onStorageEvent(new StorageEvent("storage", {
					key: e,
					oldValue: t,
					newValue: n
				}), !0);
			});
		}, pa);
	}
	stopPolling() {
		this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
	}
	attachListener() {
		window.addEventListener("storage", this.boundEventHandler);
	}
	detachListener() {
		window.removeEventListener("storage", this.boundEventHandler);
	}
	_addListener(e, t) {
		Object.keys(this.listeners).length === 0 && (this.fallbackToPolling ? this.startPolling() : this.attachListener()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this.localCache[e] = this.storage.getItem(e)), this.listeners[e].add(t);
	}
	_removeListener(e, t) {
		this.listeners[e] && (this.listeners[e].delete(t), this.listeners[e].size === 0 && delete this.listeners[e]), Object.keys(this.listeners).length === 0 && (this.detachListener(), this.stopPolling());
	}
	async _set(e, t) {
		await super._set(e, t), this.localCache[e] = JSON.stringify(t);
	}
	async _get(e) {
		let t = await super._get(e);
		return this.localCache[e] = JSON.stringify(t), t;
	}
	async _remove(e) {
		await super._remove(e), delete this.localCache[e];
	}
};
ha.type = "LOCAL";
var ga = ha, _a = 1e3;
function va(e) {
	let t = e.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&"), n = RegExp(`${t}=([^;]+)`);
	return document.cookie.match(n)?.[1] ?? null;
}
function ya(e) {
	return `${window.location.protocol === "http:" ? "__dev_" : "__HOST-"}FIREBASE_${e.split(":")[3]}`;
}
var ba = class {
	constructor() {
		this.type = "COOKIE", this.listenerUnsubscribes = /* @__PURE__ */ new Map();
	}
	_getFinalTarget(e) {
		let t = new URL(`${window.location.origin}/__cookies__`);
		return t.searchParams.set("finalTarget", e), t;
	}
	async _isAvailable() {
		return typeof isSecureContext == "boolean" && !isSecureContext || typeof navigator > "u" || typeof document > "u" ? !1 : navigator.cookieEnabled ?? !0;
	}
	async _set(e, t) {}
	async _get(e) {
		if (!this._isAvailable()) return null;
		let t = ya(e);
		return window.cookieStore ? (await window.cookieStore.get(t))?.value : va(t);
	}
	async _remove(e) {
		if (!this._isAvailable() || !await this._get(e)) return;
		let t = ya(e);
		document.cookie = `${t}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`, await fetch("/__cookies__", { method: "DELETE" }).catch(() => void 0);
	}
	_addListener(e, t) {
		if (!this._isAvailable()) return;
		let n = ya(e);
		if (window.cookieStore) {
			let e = ((e) => {
				let r = e.changed.find((e) => e.name === n);
				r && t(r.value), e.deleted.find((e) => e.name === n) && t(null);
			});
			return this.listenerUnsubscribes.set(t, () => window.cookieStore.removeEventListener("change", e)), window.cookieStore.addEventListener("change", e);
		}
		let r = va(n), i = setInterval(() => {
			let e = va(n);
			e !== r && (t(e), r = e);
		}, _a);
		this.listenerUnsubscribes.set(t, () => clearInterval(i));
	}
	_removeListener(e, t) {
		let n = this.listenerUnsubscribes.get(t);
		n && (n(), this.listenerUnsubscribes.delete(t));
	}
};
ba.type = "COOKIE";
var xa = class extends fa {
	constructor() {
		super(() => window.sessionStorage, "SESSION");
	}
	_addListener(e, t) {}
	_removeListener(e, t) {}
};
xa.type = "SESSION";
var Sa = xa;
function Ca(e) {
	return Promise.all(e.map(async (e) => {
		try {
			return {
				fulfilled: !0,
				value: await e
			};
		} catch (e) {
			return {
				fulfilled: !1,
				reason: e
			};
		}
	}));
}
var wa = class e {
	constructor(e) {
		this.eventTarget = e, this.handlersMap = {}, this.boundEventHandler = this.handleEvent.bind(this);
	}
	static _getInstance(t) {
		let n = this.receivers.find((e) => e.isListeningto(t));
		if (n) return n;
		let r = new e(t);
		return this.receivers.push(r), r;
	}
	isListeningto(e) {
		return this.eventTarget === e;
	}
	async handleEvent(e) {
		let t = e, { eventId: n, eventType: r, data: i } = t.data, a = this.handlersMap[r];
		if (!a?.size) return;
		t.ports[0].postMessage({
			status: "ack",
			eventId: n,
			eventType: r
		});
		let o = await Ca(Array.from(a).map(async (e) => e(t.origin, i)));
		t.ports[0].postMessage({
			status: "done",
			eventId: n,
			eventType: r,
			response: o
		});
	}
	_subscribe(e, t) {
		Object.keys(this.handlersMap).length === 0 && this.eventTarget.addEventListener("message", this.boundEventHandler), this.handlersMap[e] || (this.handlersMap[e] = /* @__PURE__ */ new Set()), this.handlersMap[e].add(t);
	}
	_unsubscribe(e, t) {
		this.handlersMap[e] && t && this.handlersMap[e].delete(t), (!t || this.handlersMap[e].size === 0) && delete this.handlersMap[e], Object.keys(this.handlersMap).length === 0 && this.eventTarget.removeEventListener("message", this.boundEventHandler);
	}
};
wa.receivers = [];
function Ta(e = "", t = 10) {
	let n = "";
	for (let e = 0; e < t; e++) n += Math.floor(Math.random() * 10);
	return e + n;
}
var Ea = class {
	constructor(e) {
		this.target = e, this.handlers = /* @__PURE__ */ new Set();
	}
	removeMessageHandler(e) {
		e.messageChannel && (e.messageChannel.port1.removeEventListener("message", e.onMessage), e.messageChannel.port1.close()), this.handlers.delete(e);
	}
	async _send(e, t, n = 50) {
		let r = typeof MessageChannel < "u" ? new MessageChannel() : null;
		if (!r) throw Error("connection_unavailable");
		let i, a;
		return new Promise((o, s) => {
			let c = Ta("", 20);
			r.port1.start();
			let l = setTimeout(() => {
				s(/* @__PURE__ */ Error("unsupported_event"));
			}, n);
			a = {
				messageChannel: r,
				onMessage(e) {
					let t = e;
					if (t.data.eventId === c) switch (t.data.status) {
						case "ack":
							clearTimeout(l), i = setTimeout(() => {
								s(/* @__PURE__ */ Error("timeout"));
							}, 3e3);
							break;
						case "done":
							clearTimeout(i), o(t.data.response);
							break;
						default:
							clearTimeout(l), clearTimeout(i), s(/* @__PURE__ */ Error("invalid_response"));
							break;
					}
				}
			}, this.handlers.add(a), r.port1.addEventListener("message", a.onMessage), this.target.postMessage({
				eventType: e,
				eventId: c,
				data: t
			}, [r.port2]);
		}).finally(() => {
			a && this.removeMessageHandler(a);
		});
	}
};
function Da() {
	return window;
}
function Oa(e) {
	Da().location.href = e;
}
function ka() {
	return Da().WorkerGlobalScope !== void 0 && typeof Da().importScripts == "function";
}
async function Aa() {
	if (!navigator?.serviceWorker) return null;
	try {
		return (await navigator.serviceWorker.ready).active;
	} catch {
		return null;
	}
}
function ja() {
	return navigator?.serviceWorker?.controller || null;
}
function Ma() {
	return ka() ? self : null;
}
var Na = "firebaseLocalStorageDb", Pa = 1, Fa = "firebaseLocalStorage", Ia = "fbase_key", La = class {
	constructor(e) {
		this.request = e;
	}
	toPromise() {
		return new Promise((e, t) => {
			this.request.addEventListener("success", () => {
				e(this.request.result);
			}), this.request.addEventListener("error", () => {
				t(this.request.error);
			});
		});
	}
};
function Ra(e, t) {
	return e.transaction([Fa], t ? "readwrite" : "readonly").objectStore(Fa);
}
function za() {
	return new La(indexedDB.deleteDatabase(Na)).toPromise();
}
function Ba() {
	let e = indexedDB.open(Na, Pa);
	return new Promise((t, n) => {
		e.addEventListener("error", () => {
			n(e.error);
		}), e.addEventListener("upgradeneeded", () => {
			let t = e.result;
			try {
				t.createObjectStore(Fa, { keyPath: Ia });
			} catch (e) {
				n(e);
			}
		}), e.addEventListener("success", async () => {
			let n = e.result;
			n.objectStoreNames.contains(Fa) ? t(n) : (n.close(), await za(), t(await Ba()));
		});
	});
}
async function Va(e, t, n) {
	return new La(Ra(e, !0).put({
		[Ia]: t,
		value: n
	})).toPromise();
}
async function Ha(e, t) {
	let n = await new La(Ra(e, !1).get(t)).toPromise();
	return n === void 0 ? null : n.value;
}
function Ua(e, t) {
	return new La(Ra(e, !0).delete(t)).toPromise();
}
var Wa = 800, Ga = 3, Ka = class {
	constructor() {
		this.type = "LOCAL", this.dbPromise = null, this._shouldAllowMigration = !0, this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.pendingWrites = 0, this.receiver = null, this.sender = null, this.serviceWorkerReceiverAvailable = !1, this.activeServiceWorker = null, this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then(() => {}, () => {});
	}
	async _openDb() {
		return this.dbPromise ? this.dbPromise : (this.dbPromise = Ba(), this.dbPromise.catch(() => {
			this.dbPromise = null;
		}), this.dbPromise);
	}
	async _withRetries(e) {
		let t = 0;
		for (;;) try {
			return await e(await this._openDb());
		} catch (e) {
			if (t++ > Ga) throw e;
			this.dbPromise && ((await this.dbPromise).close(), this.dbPromise = null);
		}
	}
	async initializeServiceWorkerMessaging() {
		return ka() ? this.initializeReceiver() : this.initializeSender();
	}
	async initializeReceiver() {
		this.receiver = wa._getInstance(Ma()), this.receiver._subscribe("keyChanged", async (e, t) => ({ keyProcessed: (await this._poll()).includes(t.key) })), this.receiver._subscribe("ping", async (e, t) => ["keyChanged"]);
	}
	async initializeSender() {
		if (this.activeServiceWorker = await Aa(), !this.activeServiceWorker) return;
		this.sender = new Ea(this.activeServiceWorker);
		let e = await this.sender._send("ping", {}, 800);
		e && e[0]?.fulfilled && e[0]?.value.includes("keyChanged") && (this.serviceWorkerReceiverAvailable = !0);
	}
	async notifyServiceWorker(e) {
		if (!(!this.sender || !this.activeServiceWorker || ja() !== this.activeServiceWorker)) try {
			await this.sender._send("keyChanged", { key: e }, this.serviceWorkerReceiverAvailable ? 800 : 50);
		} catch {}
	}
	async _isAvailable() {
		try {
			return indexedDB ? (await this._withRetries(async (e) => {
				await Va(e, da, "1"), await Ua(e, da);
			}), !0) : !1;
		} catch {}
		return !1;
	}
	async _withPendingWrite(e) {
		this.pendingWrites++;
		try {
			await e();
		} finally {
			this.pendingWrites--;
		}
	}
	async _set(e, t) {
		return this._withPendingWrite(async () => (await this._withRetries((n) => Va(n, e, t)), this.localCache[e] = t, this.notifyServiceWorker(e)));
	}
	async _get(e) {
		let t = await this._withRetries((t) => Ha(t, e));
		return this.localCache[e] = t, t;
	}
	async _remove(e) {
		return this._withPendingWrite(async () => (await this._withRetries((t) => Ua(t, e)), delete this.localCache[e], this.notifyServiceWorker(e)));
	}
	async _poll() {
		let e = await this._withRetries((e) => new La(Ra(e, !1).getAll()).toPromise());
		if (!e || this.pendingWrites !== 0) return [];
		let t = [], n = /* @__PURE__ */ new Set();
		if (e.length !== 0) for (let { fbase_key: r, value: i } of e) n.add(r), JSON.stringify(this.localCache[r]) !== JSON.stringify(i) && (this.notifyListeners(r, i), t.push(r));
		for (let e of Object.keys(this.localCache)) this.localCache[e] && !n.has(e) && (this.notifyListeners(e, null), t.push(e));
		return t;
	}
	notifyListeners(e, t) {
		this.localCache[e] = t;
		let n = this.listeners[e];
		if (n) for (let e of Array.from(n)) e(t);
	}
	startPolling() {
		this.stopPolling(), this.pollTimer = setInterval(async () => this._poll(), Wa);
	}
	stopPolling() {
		this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
	}
	_addListener(e, t) {
		Object.keys(this.listeners).length === 0 && this.startPolling(), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this._get(e)), this.listeners[e].add(t);
	}
	_removeListener(e, t) {
		this.listeners[e] && (this.listeners[e].delete(t), this.listeners[e].size === 0 && delete this.listeners[e]), Object.keys(this.listeners).length === 0 && this.stopPolling();
	}
};
Ka.type = "LOCAL";
var qa = Ka;
function Ja(e, t) {
	return k(e, "POST", "/v2/accounts/mfaSignIn:start", O(e, t));
}
function Ya(e, t) {
	return k(e, "POST", "/v2/accounts/mfaSignIn:finalize", O(e, t));
}
function Xa(e, t) {
	return k(e, "POST", "/v2/accounts/mfaSignIn:finalize", O(e, t));
}
ci("rcb"), new Xn(3e4, 6e4);
var Za = "recaptcha";
async function Qa(e, t, n) {
	if (!e._getRecaptchaConfig()) try {
		await gi(e);
	} catch {
		console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.");
	}
	try {
		let r;
		if (r = typeof t == "string" ? { phoneNumber: t } : t, "session" in r) {
			let t = r.session;
			if ("phoneNumber" in r) return D(t.type === "enroll", e, "internal-error"), (await hi(e, {
				idToken: t.credential,
				phoneEnrollmentInfo: {
					phoneNumber: r.phoneNumber,
					clientType: "CLIENT_TYPE_WEB"
				}
			}, "mfaSmsEnrollment", async (e, t) => t.phoneEnrollmentInfo.captchaResponse === fi ? (D(n?.type === Za, e, "argument-error"), sa(e, await $a(e, t, n))) : sa(e, t), "PHONE_PROVIDER").catch((e) => Promise.reject(e))).phoneSessionInfo.sessionInfo;
			{
				D(t.type === "signin", e, "internal-error");
				let i = r.multiFactorHint?.uid || r.multiFactorUid;
				return D(i, e, "missing-multi-factor-info"), (await hi(e, {
					mfaPendingCredential: t.credential,
					mfaEnrollmentId: i,
					phoneSignInInfo: { clientType: "CLIENT_TYPE_WEB" }
				}, "mfaSmsSignIn", async (e, t) => t.phoneSignInInfo.captchaResponse === fi ? (D(n?.type === Za, e, "argument-error"), Ja(e, await $a(e, t, n))) : Ja(e, t), "PHONE_PROVIDER").catch((e) => Promise.reject(e))).phoneResponseInfo.sessionInfo;
			}
		} else return (await hi(e, {
			phoneNumber: r.phoneNumber,
			clientType: "CLIENT_TYPE_WEB"
		}, "sendVerificationCode", async (e, t) => t.captchaResponse === fi ? (D(n?.type === Za, e, "argument-error"), Ni(e, await $a(e, t, n))) : Ni(e, t), "PHONE_PROVIDER").catch((e) => Promise.reject(e))).sessionInfo;
	} finally {
		n?._reset();
	}
}
async function $a(e, t, n) {
	D(n.type === Za, e, "argument-error");
	let r = await n.verify();
	D(typeof r == "string", e, "argument-error");
	let i = { ...t };
	if ("phoneEnrollmentInfo" in i) {
		let e = i.phoneEnrollmentInfo.phoneNumber, t = i.phoneEnrollmentInfo.captchaResponse, n = i.phoneEnrollmentInfo.clientType, a = i.phoneEnrollmentInfo.recaptchaVersion;
		return Object.assign(i, { phoneEnrollmentInfo: {
			phoneNumber: e,
			recaptchaToken: r,
			captchaResponse: t,
			clientType: n,
			recaptchaVersion: a
		} }), i;
	} else if ("phoneSignInInfo" in i) {
		let e = i.phoneSignInInfo.captchaResponse, t = i.phoneSignInInfo.clientType, n = i.phoneSignInInfo.recaptchaVersion;
		return Object.assign(i, { phoneSignInInfo: {
			recaptchaToken: r,
			captchaResponse: e,
			clientType: t,
			recaptchaVersion: n
		} }), i;
	} else return Object.assign(i, { recaptchaToken: r }), i;
}
var eo = class e {
	constructor(t) {
		this.providerId = e.PROVIDER_ID, this.auth = ti(t);
	}
	verifyPhoneNumber(e, t) {
		return Qa(this.auth, e, y(t));
	}
	static credential(e, t) {
		return Ri._fromVerification(e, t);
	}
	static credentialFromResult(t) {
		let n = t;
		return e.credentialFromTaggedObject(n);
	}
	static credentialFromError(t) {
		return e.credentialFromTaggedObject(t.customData || {});
	}
	static credentialFromTaggedObject({ _tokenResponse: e }) {
		if (!e) return null;
		let { phoneNumber: t, temporaryProof: n } = e;
		return t && n ? Ri._fromTokenResponse(t, n) : null;
	}
};
eo.PROVIDER_ID = "phone", eo.PHONE_SIGN_IN_METHOD = "phone";
function to(e, t) {
	return t ? Mr(t) : (D(e._popupRedirectResolver, e, "argument-error"), e._popupRedirectResolver);
}
var no = class extends wi {
	constructor(e) {
		super("custom", "custom"), this.params = e;
	}
	_getIdTokenResponse(e) {
		return Ai(e, this._buildIdpRequest());
	}
	_linkToIdToken(e, t) {
		return Ai(e, this._buildIdpRequest(t));
	}
	_getReauthenticationResolver(e) {
		return Ai(e, this._buildIdpRequest());
	}
	_buildIdpRequest(e) {
		let t = {
			requestUri: this.params.requestUri,
			sessionId: this.params.sessionId,
			postBody: this.params.postBody,
			tenantId: this.params.tenantId,
			pendingToken: this.params.pendingToken,
			returnSecureToken: !0,
			returnIdpCredential: !0
		};
		return e && (t.idToken = e), t;
	}
};
function ro(e) {
	return ra(e.auth, new no(e), e.bypassAuthState);
}
function io(e) {
	let { auth: t, user: n } = e;
	return D(n, t, "internal-error"), na(n, new no(e), e.bypassAuthState);
}
async function ao(e) {
	let { auth: t, user: n } = e;
	return D(n, t, "internal-error"), ta(n, new no(e), e.bypassAuthState);
}
var oo = class {
	constructor(e, t, n, r, i = !1) {
		this.auth = e, this.resolver = n, this.user = r, this.bypassAuthState = i, this.pendingPromise = null, this.eventManager = null, this.filter = Array.isArray(t) ? t : [t];
	}
	execute() {
		return new Promise(async (e, t) => {
			this.pendingPromise = {
				resolve: e,
				reject: t
			};
			try {
				this.eventManager = await this.resolver._initialize(this.auth), await this.onExecution(), this.eventManager.registerConsumer(this);
			} catch (e) {
				this.reject(e);
			}
		});
	}
	async onAuthEvent(e) {
		let { urlResponse: t, sessionId: n, postBody: r, tenantId: i, error: a, type: o } = e;
		if (a) {
			this.reject(a);
			return;
		}
		let s = {
			auth: this.auth,
			requestUri: t,
			sessionId: n,
			tenantId: i || void 0,
			postBody: r || void 0,
			user: this.user,
			bypassAuthState: this.bypassAuthState
		};
		try {
			this.resolve(await this.getIdpTask(o)(s));
		} catch (e) {
			this.reject(e);
		}
	}
	onError(e) {
		this.reject(e);
	}
	getIdpTask(e) {
		switch (e) {
			case "signInViaPopup":
			case "signInViaRedirect": return ro;
			case "linkViaPopup":
			case "linkViaRedirect": return ao;
			case "reauthViaPopup":
			case "reauthViaRedirect": return io;
			default: E(this.auth, "internal-error");
		}
	}
	resolve(e) {
		Wn(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.resolve(e), this.unregisterAndCleanUp();
	}
	reject(e) {
		Wn(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.reject(e), this.unregisterAndCleanUp();
	}
	unregisterAndCleanUp() {
		this.eventManager && this.eventManager.unregisterConsumer(this), this.pendingPromise = null, this.cleanUp();
	}
}, so = new Xn(2e3, 1e4), co = class e extends oo {
	constructor(t, n, r, i, a) {
		super(t, n, i, a), this.provider = r, this.authWindow = null, this.pollId = null, e.currentPopupAction && e.currentPopupAction.cancel(), e.currentPopupAction = this;
	}
	async executeNotNull() {
		let e = await this.execute();
		return D(e, this.auth, "internal-error"), e;
	}
	async onExecution() {
		Wn(this.filter.length === 1, "Popup operations only handle one event");
		let e = Ta();
		this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0], e), this.authWindow.associatedEvent = e, this.resolver._originValidation(this.auth).catch((e) => {
			this.reject(e);
		}), this.resolver._isIframeWebStorageSupported(this.auth, (e) => {
			e || this.reject(zn(this.auth, "web-storage-unsupported"));
		}), this.pollUserCancellation();
	}
	get eventId() {
		return this.authWindow?.associatedEvent || null;
	}
	cancel() {
		this.reject(zn(this.auth, "cancelled-popup-request"));
	}
	cleanUp() {
		this.authWindow && this.authWindow.close(), this.pollId && window.clearTimeout(this.pollId), this.authWindow = null, this.pollId = null, e.currentPopupAction = null;
	}
	pollUserCancellation() {
		let e = () => {
			if (this.authWindow?.window?.closed) {
				this.pollId = window.setTimeout(() => {
					this.pollId = null, this.reject(zn(this.auth, "popup-closed-by-user"));
				}, 8e3);
				return;
			}
			this.pollId = window.setTimeout(e, so.get());
		};
		e();
	}
};
co.currentPopupAction = null;
var lo = "pendingRedirect", uo = /* @__PURE__ */ new Map(), fo = class extends oo {
	constructor(e, t, n = !1) {
		super(e, [
			"signInViaRedirect",
			"linkViaRedirect",
			"reauthViaRedirect",
			"unknown"
		], t, void 0, n), this.eventId = null;
	}
	async execute() {
		let e = uo.get(this.auth._key());
		if (!e) {
			try {
				let t = await po(this.resolver, this.auth) ? await super.execute() : null;
				e = () => Promise.resolve(t);
			} catch (t) {
				e = () => Promise.reject(t);
			}
			uo.set(this.auth._key(), e);
		}
		return this.bypassAuthState || uo.set(this.auth._key(), () => Promise.resolve(null)), e();
	}
	async onAuthEvent(e) {
		if (e.type === "signInViaRedirect") return super.onAuthEvent(e);
		if (e.type === "unknown") {
			this.resolve(null);
			return;
		}
		if (e.eventId) {
			let t = await this.auth._redirectUserForId(e.eventId);
			if (t) return this.user = t, super.onAuthEvent(e);
			this.resolve(null);
		}
	}
	async onExecution() {}
	cleanUp() {}
};
async function po(e, t) {
	let n = go(t), r = ho(e);
	if (!await r._isAvailable()) return !1;
	let i = await r._get(n) === "true";
	return await r._remove(n), i;
}
function mo(e, t) {
	uo.set(e._key(), t);
}
function ho(e) {
	return Mr(e._redirectPersistence);
}
function go(e) {
	return Fr(lo, e.config.apiKey, e.name);
}
async function _o(e, t, n = !1) {
	if (Gt(e.app)) return Promise.reject(Vn(e));
	let r = ti(e), i = await new fo(r, to(r, t), n).execute();
	return i && !n && (delete i.user._redirectEventId, await r._persistUserIfCurrent(i.user), await r._setRedirectUser(null, t)), i;
}
var vo = 600 * 1e3, yo = class {
	constructor(e) {
		this.auth = e, this.cachedEventUids = /* @__PURE__ */ new Set(), this.consumers = /* @__PURE__ */ new Set(), this.queuedRedirectEvent = null, this.hasHandledPotentialRedirect = !1, this.lastProcessedEventTime = Date.now();
	}
	registerConsumer(e) {
		this.consumers.add(e), this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, e) && (this.sendToConsumer(this.queuedRedirectEvent, e), this.saveEventToCache(this.queuedRedirectEvent), this.queuedRedirectEvent = null);
	}
	unregisterConsumer(e) {
		this.consumers.delete(e);
	}
	onEvent(e) {
		if (this.hasEventBeenHandled(e)) return !1;
		let t = !1;
		return this.consumers.forEach((n) => {
			this.isEventForConsumer(e, n) && (t = !0, this.sendToConsumer(e, n), this.saveEventToCache(e));
		}), this.hasHandledPotentialRedirect || !So(e) ? t : (this.hasHandledPotentialRedirect = !0, t || (this.queuedRedirectEvent = e, t = !0), t);
	}
	sendToConsumer(e, t) {
		if (e.error && !xo(e)) {
			let n = e.error.code?.split("auth/")[1] || "internal-error";
			t.onError(zn(this.auth, n));
		} else t.onAuthEvent(e);
	}
	isEventForConsumer(e, t) {
		let n = t.eventId === null || !!e.eventId && e.eventId === t.eventId;
		return t.filter.includes(e.type) && n;
	}
	hasEventBeenHandled(e) {
		return Date.now() - this.lastProcessedEventTime >= vo && this.cachedEventUids.clear(), this.cachedEventUids.has(bo(e));
	}
	saveEventToCache(e) {
		this.cachedEventUids.add(bo(e)), this.lastProcessedEventTime = Date.now();
	}
};
function bo(e) {
	return [
		e.type,
		e.eventId,
		e.sessionId,
		e.tenantId
	].filter((e) => e).join("-");
}
function xo({ type: e, error: t }) {
	return e === "unknown" && t?.code === "auth/no-auth-event";
}
function So(e) {
	switch (e.type) {
		case "signInViaRedirect":
		case "linkViaRedirect":
		case "reauthViaRedirect": return !0;
		case "unknown": return xo(e);
		default: return !1;
	}
}
async function Co(e, t = {}) {
	return k(e, "GET", "/v1/projects", t);
}
var wo = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, To = /^https?/;
async function Eo(e) {
	if (e.config.emulator) return;
	let { authorizedDomains: t } = await Co(e);
	for (let e of t) try {
		if (Do(e)) return;
	} catch {}
	E(e, "unauthorized-domain");
}
function Do(e) {
	let t = Gn(), { protocol: n, hostname: r } = new URL(t);
	if (e.startsWith("chrome-extension://")) {
		let i = new URL(e);
		return i.hostname === "" && r === "" ? n === "chrome-extension:" && e.replace("chrome-extension://", "") === t.replace("chrome-extension://", "") : n === "chrome-extension:" && i.hostname === r;
	}
	if (!To.test(n)) return !1;
	if (wo.test(e)) return r === e;
	let i = e.replace(/\./g, "\\.");
	return RegExp("^(.+\\." + i + "|" + i + ")$", "i").test(r);
}
var Oo = new Xn(3e4, 6e4);
function ko() {
	let e = Da().___jsl;
	if (e?.H) {
		for (let t of Object.keys(e.H)) if (e.H[t].r = e.H[t].r || [], e.H[t].L = e.H[t].L || [], e.H[t].r = [...e.H[t].L], e.CP) for (let t = 0; t < e.CP.length; t++) e.CP[t] = null;
	}
}
function Ao(e) {
	return new Promise((t, n) => {
		function r() {
			ko(), gapi.load("gapi.iframes", {
				callback: () => {
					t(gapi.iframes.getContext());
				},
				ontimeout: () => {
					ko(), n(zn(e, "network-request-failed"));
				},
				timeout: Oo.get()
			});
		}
		if (Da().gapi?.iframes?.Iframe) t(gapi.iframes.getContext());
		else if (Da().gapi?.load) r();
		else {
			let t = ci("iframefcb");
			return Da()[t] = () => {
				gapi.load ? r() : n(zn(e, "network-request-failed"));
			}, ai(`${si()}?onload=${t}`).catch((e) => n(e));
		}
	}).catch((e) => {
		throw jo = null, e;
	});
}
var jo = null;
function Mo(e) {
	return jo = jo || Ao(e), jo;
}
var No = new Xn(5e3, 15e3), Po = "__/auth/iframe", Fo = "emulator/auth/iframe", Io = {
	style: {
		position: "absolute",
		top: "-100px",
		width: "1px",
		height: "1px"
	},
	"aria-hidden": "true",
	tabindex: "-1"
}, Lo = new Map([
	["identitytoolkit.googleapis.com", "p"],
	["staging-identitytoolkit.sandbox.googleapis.com", "s"],
	["test-identitytoolkit.sandbox.googleapis.com", "t"]
]);
function Ro(e) {
	let t = e.config;
	D(t.authDomain, e, "auth-domain-config-required");
	let n = t.emulator ? Zn(t, Fo) : `https://${e.config.authDomain}/${Po}`, r = {
		apiKey: t.apiKey,
		appName: e.name,
		v: qt
	}, i = Lo.get(e.config.apiHost);
	i && (r.eid = i);
	let a = e._getFrameworks();
	return a.length && (r.fw = a.join(",")), `${n}?${ve(r).slice(1)}`;
}
async function zo(e) {
	let t = await Mo(e), n = Da().gapi;
	return D(n, e, "internal-error"), t.open({
		where: document.body,
		url: Ro(e),
		messageHandlersFilter: n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
		attributes: Io,
		dontclear: !0
	}, (t) => new Promise(async (n, r) => {
		await t.restyle({ setHideOnLeave: !1 });
		let i = zn(e, "network-request-failed"), a = Da().setTimeout(() => {
			r(i);
		}, No.get());
		function o() {
			Da().clearTimeout(a), n(t);
		}
		t.ping(o).then(o, () => {
			r(i);
		});
	}));
}
var Bo = {
	location: "yes",
	resizable: "yes",
	statusbar: "yes",
	toolbar: "no"
}, Vo = 500, Ho = 600, Uo = "_blank", Wo = "http://localhost", Go = class {
	constructor(e) {
		this.window = e, this.associatedEvent = null;
	}
	close() {
		if (this.window) try {
			this.window.close();
		} catch {}
	}
};
function Ko(e, t, n, r = Vo, i = Ho) {
	let a = Math.max((window.screen.availHeight - i) / 2, 0).toString(), o = Math.max((window.screen.availWidth - r) / 2, 0).toString(), s = "", c = {
		...Bo,
		width: r.toString(),
		height: i.toString(),
		top: a,
		left: o
	}, l = _().toLowerCase();
	n && (s = Br(l) ? Uo : n), Rr(l) && (t = t || Wo, c.scrollbars = "yes");
	let u = Object.entries(c).reduce((e, [t, n]) => `${e}${t}=${n},`, "");
	if (Kr(l) && s !== "_self") return qo(t || "", s), new Go(null);
	let d = window.open(t || "", s, u);
	D(d, e, "popup-blocked");
	try {
		d.focus();
	} catch {}
	return new Go(d);
}
function qo(e, t) {
	let n = document.createElement("a");
	n.href = e, n.target = t;
	let r = document.createEvent("MouseEvent");
	r.initMouseEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 1, null), n.dispatchEvent(r);
}
var Jo = "__/auth/handler", Yo = "emulator/auth/handler", Xo = "fac";
async function Zo(e, t, n, r, i, a) {
	D(e.config.authDomain, e, "auth-domain-config-required"), D(e.config.apiKey, e, "invalid-api-key");
	let o = {
		apiKey: e.config.apiKey,
		appName: e.name,
		authType: n,
		redirectUrl: r,
		v: qt,
		eventId: i
	};
	if (t instanceof Ui) {
		t.setDefaultLanguage(e.languageCode), o.providerId = t.providerId || "", he(t.getCustomParameters()) || (o.customParameters = JSON.stringify(t.getCustomParameters()));
		for (let [e, t] of Object.entries(a || {})) o[e] = t;
	}
	if (t instanceof Wi) {
		let e = t.getScopes().filter((e) => e !== "");
		e.length > 0 && (o.scopes = e.join(","));
	}
	e.tenantId && (o.tid = e.tenantId);
	let s = o;
	for (let e of Object.keys(s)) s[e] === void 0 && delete s[e];
	let c = await e._getAppCheckToken(), l = c ? `#${Xo}=${encodeURIComponent(c)}` : "";
	return `${Qo(e)}?${ve(s).slice(1)}${l}`;
}
function Qo({ config: e }) {
	return e.emulator ? Zn(e, Yo) : `https://${e.authDomain}/${Jo}`;
}
var $o = "webStorageSupport", es = class {
	constructor() {
		this.eventManagers = {}, this.iframes = {}, this.originValidationPromises = {}, this._redirectPersistence = Sa, this._completeRedirectFn = _o, this._overrideRedirectResult = mo;
	}
	async _openPopup(e, t, n, r) {
		return Wn(this.eventManagers[e._key()]?.manager, "_initialize() not called before _openPopup()"), Ko(e, await Zo(e, t, n, Gn(), r), Ta());
	}
	async _openRedirect(e, t, n, r) {
		return await this._originValidation(e), Oa(await Zo(e, t, n, Gn(), r)), new Promise(() => {});
	}
	_initialize(e) {
		let t = e._key();
		if (this.eventManagers[t]) {
			let { manager: e, promise: n } = this.eventManagers[t];
			return e ? Promise.resolve(e) : (Wn(n, "If manager is not set, promise should be"), n);
		}
		let n = this.initAndGetManager(e);
		return this.eventManagers[t] = { promise: n }, n.catch(() => {
			delete this.eventManagers[t];
		}), n;
	}
	async initAndGetManager(e) {
		let t = await zo(e), n = new yo(e);
		return t.register("authEvent", (t) => (D(t?.authEvent, e, "invalid-auth-event"), { status: n.onEvent(t.authEvent) ? "ACK" : "ERROR" }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER), this.eventManagers[e._key()] = { manager: n }, this.iframes[e._key()] = t, n;
	}
	_isIframeWebStorageSupported(e, t) {
		this.iframes[e._key()].send($o, { type: $o }, (n) => {
			let r = n?.[0]?.[$o];
			r !== void 0 && t(!!r), E(e, "internal-error");
		}, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
	}
	_originValidation(e) {
		let t = e._key();
		return this.originValidationPromises[t] || (this.originValidationPromises[t] = Eo(e)), this.originValidationPromises[t];
	}
	get _shouldInitProactively() {
		return Jr() || zr() || Gr();
	}
}, ts = class {
	constructor(e) {
		this.factorId = e;
	}
	_process(e, t, n) {
		switch (t.type) {
			case "enroll": return this._finalizeEnroll(e, t.credential, n);
			case "signin": return this._finalizeSignIn(e, t.credential);
			default: return Un("unexpected MultiFactorSessionType");
		}
	}
}, ns = class e extends ts {
	constructor(e) {
		super("phone"), this.credential = e;
	}
	static _fromCredential(t) {
		return new e(t);
	}
	_finalizeEnroll(e, t, n) {
		return ca(e, {
			idToken: t,
			displayName: n,
			phoneVerificationInfo: this.credential._makeVerificationRequest()
		});
	}
	_finalizeSignIn(e, t) {
		return Ya(e, {
			mfaPendingCredential: t,
			phoneVerificationInfo: this.credential._makeVerificationRequest()
		});
	}
}, rs = class {
	constructor() {}
	static assertion(e) {
		return ns._fromCredential(e);
	}
};
rs.FACTOR_ID = "phone";
var is = class {
	static assertionForEnrollment(e, t) {
		return as._fromSecret(e, t);
	}
	static assertionForSignIn(e, t) {
		return as._fromEnrollmentId(e, t);
	}
	static async generateSecret(e) {
		let t = e;
		D(t.user?.auth !== void 0, "internal-error");
		let n = await la(t.user.auth, {
			idToken: t.credential,
			totpEnrollmentInfo: {}
		});
		return os._fromStartTotpMfaEnrollmentResponse(n, t.user.auth);
	}
};
is.FACTOR_ID = "totp";
var as = class e extends ts {
	constructor(e, t, n) {
		super("totp"), this.otp = e, this.enrollmentId = t, this.secret = n;
	}
	static _fromSecret(t, n) {
		return new e(n, void 0, t);
	}
	static _fromEnrollmentId(t, n) {
		return new e(n, t);
	}
	async _finalizeEnroll(e, t, n) {
		return D(this.secret !== void 0, e, "argument-error"), ua(e, {
			idToken: t,
			displayName: n,
			totpVerificationInfo: this.secret._makeTotpVerificationInfo(this.otp)
		});
	}
	async _finalizeSignIn(e, t) {
		D(this.enrollmentId !== void 0 && this.otp !== void 0, e, "argument-error");
		let n = { verificationCode: this.otp };
		return Xa(e, {
			mfaPendingCredential: t,
			mfaEnrollmentId: this.enrollmentId,
			totpVerificationInfo: n
		});
	}
}, os = class e {
	constructor(e, t, n, r, i, a, o) {
		this.sessionInfo = a, this.auth = o, this.secretKey = e, this.hashingAlgorithm = t, this.codeLength = n, this.codeIntervalSeconds = r, this.enrollmentCompletionDeadline = i;
	}
	static _fromStartTotpMfaEnrollmentResponse(t, n) {
		return new e(t.totpSessionInfo.sharedSecretKey, t.totpSessionInfo.hashingAlgorithm, t.totpSessionInfo.verificationCodeLength, t.totpSessionInfo.periodSec, new Date(t.totpSessionInfo.finalizeEnrollmentTime).toUTCString(), t.totpSessionInfo.sessionInfo, n);
	}
	_makeTotpVerificationInfo(e) {
		return {
			sessionInfo: this.sessionInfo,
			verificationCode: e
		};
	}
	generateQrCodeUrl(e, t) {
		let n = !1;
		return (ss(e) || ss(t)) && (n = !0), n && (ss(e) && (e = this.auth.currentUser?.email || "unknownuser"), ss(t) && (t = this.auth.name)), `otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`;
	}
};
function ss(e) {
	return e === void 0 || e?.length === 0;
}
var cs = "@firebase/auth", ls = "1.13.2", us = class {
	constructor(e) {
		this.auth = e, this.internalListeners = /* @__PURE__ */ new Map();
	}
	getUid() {
		return this.assertAuthConfigured(), this.auth.currentUser?.uid || null;
	}
	async getToken(e) {
		return this.assertAuthConfigured(), await this.auth._initializationPromise, this.auth.currentUser ? { accessToken: await this.auth.currentUser.getIdToken(e) } : null;
	}
	addAuthTokenListener(e) {
		if (this.assertAuthConfigured(), this.internalListeners.has(e)) return;
		let t = this.auth.onIdTokenChanged((t) => {
			e(t?.stsTokenManager.accessToken || null);
		});
		this.internalListeners.set(e, t), this.updateProactiveRefresh();
	}
	removeAuthTokenListener(e) {
		this.assertAuthConfigured();
		let t = this.internalListeners.get(e);
		t && (this.internalListeners.delete(e), t(), this.updateProactiveRefresh());
	}
	assertAuthConfigured() {
		D(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth");
	}
	updateProactiveRefresh() {
		this.internalListeners.size > 0 ? this.auth._startProactiveRefresh() : this.auth._stopProactiveRefresh();
	}
};
function ds(e) {
	switch (e) {
		case "Node": return "node";
		case "ReactNative": return "rn";
		case "Worker": return "webworker";
		case "Cordova": return "cordova";
		case "WebExtension": return "web-extension";
		default: return;
	}
}
function fs(e) {
	Ut(new De("auth", (t, { options: n }) => {
		let r = t.getProvider("app").getImmediate(), i = t.getProvider("heartbeat"), a = t.getProvider("app-check-internal"), { apiKey: o, authDomain: s } = r.options;
		D(o && !o.includes(":"), "invalid-api-key", { appName: r.name });
		let c = new ei(r, i, a, {
			apiKey: o,
			authDomain: s,
			clientPlatform: e,
			apiHost: "identitytoolkit.googleapis.com",
			tokenApiHost: "securetoken.googleapis.com",
			apiScheme: "https",
			sdkClientVersion: Yr(e)
		});
		return vi(c, n), c;
	}, "PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e, t, n) => {
		e.getProvider("auth-internal").initialize();
	})), Ut(new De("auth-internal", (e) => ((e) => new us(e))(ti(e.getProvider("auth").getImmediate())), "PRIVATE").setInstantiationMode("EXPLICIT")), Zt(cs, ls, ds(e)), Zt(cs, ls, "esm2020");
}
var ps = g("authIdTokenMaxAge") || 300, ms = null, hs = (e) => async (t) => {
	let n = t && await t.getIdTokenResult(), r = n && ((/* @__PURE__ */ new Date()).getTime() - Date.parse(n.issuedAtTime)) / 1e3;
	if (r && r > ps) return;
	let i = n?.token;
	ms !== i && (ms = i, await fetch(e, {
		method: i ? "POST" : "DELETE",
		headers: i ? { Authorization: `Bearer ${i}` } : {}
	}));
};
function gs(e = Yt()) {
	let t = Wt(e, "auth");
	if (t.isInitialized()) return t.getImmediate();
	let n = _i(e, {
		popupRedirectResolver: es,
		persistence: [
			qa,
			ga,
			Sa
		]
	}), r = g("authTokenSyncURL");
	if (r && typeof isSecureContext == "boolean" && isSecureContext) {
		let e = new URL(r, location.origin);
		if (location.origin === e.origin) {
			let t = hs(e.toString());
			aa(n, t, () => t(n.currentUser)), ia(n, (e) => t(e));
		}
	}
	let i = p("auth");
	return i && yi(n, `http://${i}`), n;
}
function _s() {
	return document.getElementsByTagName("head")?.[0] ?? document;
}
ii({
	loadJS(e) {
		return new Promise((t, n) => {
			let r = document.createElement("script");
			r.setAttribute("src", e), r.onload = t, r.onerror = (e) => {
				let t = zn("internal-error");
				t.customData = e, n(t);
			}, r.type = "text/javascript", r.charset = "UTF-8", _s().appendChild(r);
		});
	},
	gapiScript: "https://apis.google.com/js/api.js",
	recaptchaV2Script: "https://www.google.com/recaptcha/api.js",
	recaptchaEnterpriseScript: "https://www.google.com/recaptcha/enterprise.js?render="
}), fs("Browser");
//#endregion
//#region node_modules/@firebase/functions/dist/esm/index.esm.js
var vs = "type.googleapis.com/google.protobuf.Int64Value", ys = "type.googleapis.com/google.protobuf.UInt64Value";
function bs(e, t) {
	let n = {};
	for (let r in e) e.hasOwnProperty(r) && (n[r] = t(e[r]));
	return n;
}
function xs(e) {
	if (e == null) return null;
	if (e instanceof Number && (e = e.valueOf()), typeof e == "number" && isFinite(e) || e === !0 || e === !1 || Object.prototype.toString.call(e) === "[object String]") return e;
	if (e instanceof Date) return e.toISOString();
	if (Array.isArray(e)) return e.map((e) => xs(e));
	if (typeof e == "function" || typeof e == "object") return bs(e, (e) => xs(e));
	throw Error("Data cannot be encoded in JSON: " + e);
}
function Ss(e) {
	if (e == null) return e;
	if (e["@type"]) switch (e["@type"]) {
		case vs:
		case ys: {
			let t = Number(e.value);
			if (isNaN(t)) throw Error("Data cannot be decoded from JSON: " + e);
			return t;
		}
		default: throw Error("Data cannot be decoded from JSON: " + e);
	}
	return Array.isArray(e) ? e.map((e) => Ss(e)) : typeof e == "function" || typeof e == "object" ? bs(e, (e) => Ss(e)) : e;
}
var Cs = "functions", ws = {
	OK: "ok",
	CANCELLED: "cancelled",
	UNKNOWN: "unknown",
	INVALID_ARGUMENT: "invalid-argument",
	DEADLINE_EXCEEDED: "deadline-exceeded",
	NOT_FOUND: "not-found",
	ALREADY_EXISTS: "already-exists",
	PERMISSION_DENIED: "permission-denied",
	UNAUTHENTICATED: "unauthenticated",
	RESOURCE_EXHAUSTED: "resource-exhausted",
	FAILED_PRECONDITION: "failed-precondition",
	ABORTED: "aborted",
	OUT_OF_RANGE: "out-of-range",
	UNIMPLEMENTED: "unimplemented",
	INTERNAL: "internal",
	UNAVAILABLE: "unavailable",
	DATA_LOSS: "data-loss"
}, Ts = class e extends de {
	constructor(t, n, r) {
		super(`${Cs}/${t}`, n || ""), this.details = r, Object.setPrototypeOf(this, e.prototype);
	}
};
function Es(e) {
	if (e >= 200 && e < 300) return "ok";
	switch (e) {
		case 0: return "internal";
		case 400: return "invalid-argument";
		case 401: return "unauthenticated";
		case 403: return "permission-denied";
		case 404: return "not-found";
		case 409: return "aborted";
		case 429: return "resource-exhausted";
		case 499: return "cancelled";
		case 500: return "internal";
		case 501: return "unimplemented";
		case 503: return "unavailable";
		case 504: return "deadline-exceeded";
	}
	return "unknown";
}
function Ds(e, t) {
	let n = Es(e), r = n, i;
	try {
		let e = t && t.error;
		if (e) {
			let t = e.status;
			if (typeof t == "string") {
				if (!ws[t]) return new Ts("internal", "internal");
				n = ws[t], r = t;
			}
			let a = e.message;
			typeof a == "string" && (r = a), i = e.details, i !== void 0 && (i = Ss(i));
		}
	} catch {}
	return n === "ok" ? null : new Ts(n, r, i);
}
var Os = class {
	constructor(e, t, n, r) {
		this.app = e, this.auth = null, this.messaging = null, this.appCheck = null, this.serverAppAppCheckToken = null, Gt(e) && e.settings.appCheckToken && (this.serverAppAppCheckToken = e.settings.appCheckToken), this.auth = t.getImmediate({ optional: !0 }), this.messaging = n.getImmediate({ optional: !0 }), this.auth || t.get().then((e) => this.auth = e, () => {}), this.messaging || n.get().then((e) => this.messaging = e, () => {}), this.appCheck || r?.get().then((e) => this.appCheck = e, () => {});
	}
	async getAuthToken() {
		if (this.auth) try {
			return (await this.auth.getToken())?.accessToken;
		} catch {
			return;
		}
	}
	async getMessagingToken() {
		if (!(!this.messaging || !("Notification" in self) || Notification.permission !== "granted")) try {
			return await this.messaging.getToken();
		} catch {
			return;
		}
	}
	async getAppCheckToken(e) {
		if (this.serverAppAppCheckToken) return this.serverAppAppCheckToken;
		if (this.appCheck) {
			let t = e ? await this.appCheck.getLimitedUseToken() : await this.appCheck.getToken();
			return t.error ? null : t.token;
		}
		return null;
	}
	async getContext(e) {
		return {
			authToken: await this.getAuthToken(),
			messagingToken: await this.getMessagingToken(),
			appCheckToken: await this.getAppCheckToken(e)
		};
	}
}, ks = "us-central1", As = /^data: (.*?)(?:\n|$)/;
function js(e) {
	let t = null;
	return {
		promise: new Promise((n, r) => {
			t = setTimeout(() => {
				r(new Ts("deadline-exceeded", "deadline-exceeded"));
			}, e);
		}),
		cancel: () => {
			t && clearTimeout(t);
		}
	};
}
var Ms = class {
	constructor(e, t, n, r, i = ks, a = (...e) => fetch(...e)) {
		this.app = e, this.fetchImpl = a, this.emulatorOrigin = null, this.contextProvider = new Os(e, t, n, r), this.cancelAllRequests = new Promise((e) => {
			this.deleteService = () => Promise.resolve(e());
		});
		try {
			let e = new URL(i);
			this.customDomain = e.origin + (e.pathname === "/" ? "" : e.pathname), this.region = ks;
		} catch {
			this.customDomain = null, this.region = i;
		}
	}
	_delete() {
		return this.deleteService();
	}
	_url(e) {
		let t = this.app.options.projectId;
		return this.emulatorOrigin === null ? this.customDomain === null ? `https://${this.region}-${t}.cloudfunctions.net/${e}` : `${this.customDomain}/${e}` : `${this.emulatorOrigin}/${t}/${this.region}/${e}`;
	}
};
function Ns(e, t, n) {
	let r = Te(t);
	e.emulatorOrigin = `http${r ? "s" : ""}://${t}:${n}`, r && Ee(e.emulatorOrigin + "/backends");
}
function Ps(e, t, n) {
	let r = (r) => Rs(e, t, r, n || {});
	return r.stream = (n, r) => Bs(e, t, n, r), r;
}
function Fs(e) {
	return e.emulatorOrigin && Te(e.emulatorOrigin) ? "include" : void 0;
}
async function Is(e, t, n, r, i) {
	n["Content-Type"] = "application/json";
	let a;
	try {
		a = await r(e, {
			method: "POST",
			body: JSON.stringify(t),
			headers: n,
			credentials: Fs(i)
		});
	} catch {
		return {
			status: 0,
			json: null
		};
	}
	let o = null;
	try {
		o = await a.json();
	} catch {}
	return {
		status: a.status,
		json: o
	};
}
async function Ls(e, t) {
	let n = {}, r = await e.contextProvider.getContext(t.limitedUseAppCheckTokens);
	return r.authToken && (n.Authorization = "Bearer " + r.authToken), r.messagingToken && (n["Firebase-Instance-ID-Token"] = r.messagingToken), r.appCheckToken !== null && (n["X-Firebase-AppCheck"] = r.appCheckToken), n;
}
function Rs(e, t, n, r) {
	return zs(e, e._url(t), n, r);
}
async function zs(e, t, n, r) {
	n = xs(n);
	let i = { data: n }, a = await Ls(e, r), o = js(r.timeout || 7e4), s = await Promise.race([
		Is(t, i, a, e.fetchImpl, e),
		o.promise,
		e.cancelAllRequests
	]);
	if (o.cancel(), !s) throw new Ts("cancelled", "Firebase Functions instance was deleted.");
	let c = Ds(s.status, s.json);
	if (c) throw c;
	if (!s.json) throw new Ts("internal", "Response is not valid JSON object.");
	let l = s.json.data;
	if (l === void 0 && (l = s.json.result), l === void 0) throw new Ts("internal", "Response is missing data field.");
	return { data: Ss(l) };
}
function Bs(e, t, n, r) {
	return Vs(e, e._url(t), n, r || {});
}
async function Vs(e, t, n, r) {
	n = xs(n);
	let i = { data: n }, a = await Ls(e, r);
	a["Content-Type"] = "application/json", a.Accept = "text/event-stream";
	let o;
	try {
		o = await e.fetchImpl(t, {
			method: "POST",
			body: JSON.stringify(i),
			headers: a,
			signal: r?.signal,
			credentials: Fs(e)
		});
	} catch (e) {
		if (e instanceof Error && e.name === "AbortError") {
			let e = new Ts("cancelled", "Request was cancelled.");
			return {
				data: Promise.reject(e),
				stream: { [Symbol.asyncIterator]() {
					return { next() {
						return Promise.reject(e);
					} };
				} }
			};
		}
		let t = Ds(0, null);
		return {
			data: Promise.reject(t),
			stream: { [Symbol.asyncIterator]() {
				return { next() {
					return Promise.reject(t);
				} };
			} }
		};
	}
	let s, c, l = new Promise((e, t) => {
		s = e, c = t;
	});
	r?.signal?.addEventListener("abort", () => {
		let e = new Ts("cancelled", "Request was cancelled.");
		c(e);
	});
	let u = Hs(o.body.getReader(), s, c, r?.signal);
	return {
		stream: { [Symbol.asyncIterator]() {
			let e = u.getReader();
			return {
				async next() {
					let { value: t, done: n } = await e.read();
					return {
						value: t,
						done: n
					};
				},
				async return() {
					return await e.cancel(), {
						done: !0,
						value: void 0
					};
				}
			};
		} },
		data: l
	};
}
function Hs(e, t, n, r) {
	let i = (e, r) => {
		let i = e.match(As);
		if (!i) return;
		let a = i[1];
		try {
			let e = JSON.parse(a);
			if ("result" in e) {
				t(Ss(e.result));
				return;
			}
			if ("message" in e) {
				r.enqueue(Ss(e.message));
				return;
			}
			if ("error" in e) {
				let t = Ds(0, e);
				r.error(t), n(t);
				return;
			}
		} catch (e) {
			if (e instanceof Ts) {
				r.error(e), n(e);
				return;
			}
		}
	}, a = new TextDecoder();
	return new ReadableStream({
		start(t) {
			let o = "";
			return s();
			async function s() {
				if (r?.aborted) {
					let e = new Ts("cancelled", "Request was cancelled");
					return t.error(e), n(e), Promise.resolve();
				}
				try {
					let { value: c, done: l } = await e.read();
					if (l) {
						o.trim() && i(o.trim(), t), t.close();
						return;
					}
					if (r?.aborted) {
						let r = new Ts("cancelled", "Request was cancelled");
						t.error(r), n(r), await e.cancel();
						return;
					}
					o += a.decode(c, { stream: !0 });
					let u = o.split("\n");
					o = u.pop() || "";
					for (let e of u) e.trim() && i(e.trim(), t);
					return s();
				} catch (e) {
					let r = e instanceof Ts ? e : Ds(0, null);
					t.error(r), n(r);
				}
			}
		},
		cancel() {
			return e.cancel();
		}
	});
}
var Us = "@firebase/functions", Ws = "0.13.5", Gs = "auth-internal", Ks = "app-check-internal", qs = "messaging-internal";
function Js(e) {
	Ut(new De(Cs, (e, { instanceIdentifier: t }) => new Ms(e.getProvider("app").getImmediate(), e.getProvider(Gs), e.getProvider(qs), e.getProvider(Ks), t), "PUBLIC").setMultipleInstances(!0)), Zt(Us, Ws, e), Zt(Us, Ws, "esm2020");
}
function Ys(e = Yt(), t = ks) {
	let n = Wt(y(e), Cs).getImmediate({ identifier: t }), r = m("functions");
	return r && Xs(n, ...r), n;
}
function Xs(e, t, n) {
	Ns(y(e), t, n);
}
function Zs(e, t, n) {
	return Ps(y(e), t, n);
}
Js();
//#endregion
//#region node_modules/@firebase/webchannel-wrapper/dist/bloom-blob/esm/bloom_blob_es2018.js
var Qs = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, $s = {}, ec, tc;
(function() {
	var e;
	function t(e, t) {
		function n() {}
		n.prototype = t.prototype, e.F = t.prototype, e.prototype = new n(), e.prototype.constructor = e, e.D = function(e, n, r) {
			for (var i = Array(arguments.length - 2), a = 2; a < arguments.length; a++) i[a - 2] = arguments[a];
			return t.prototype[n].apply(e, i);
		};
	}
	function n() {
		this.blockSize = -1;
	}
	function r() {
		this.blockSize = -1, this.blockSize = 64, this.g = [
			,
			,
			,
			,
		], this.C = Array(this.blockSize), this.o = this.h = 0, this.u();
	}
	t(r, n), r.prototype.u = function() {
		this.g[0] = 1732584193, this.g[1] = 4023233417, this.g[2] = 2562383102, this.g[3] = 271733878, this.o = this.h = 0;
	};
	function i(e, t, n) {
		n || (n = 0);
		let r = Array(16);
		if (typeof t == "string") for (var i = 0; i < 16; ++i) r[i] = t.charCodeAt(n++) | t.charCodeAt(n++) << 8 | t.charCodeAt(n++) << 16 | t.charCodeAt(n++) << 24;
		else for (i = 0; i < 16; ++i) r[i] = t[n++] | t[n++] << 8 | t[n++] << 16 | t[n++] << 24;
		t = e.g[0], n = e.g[1], i = e.g[2];
		let a = e.g[3], o;
		o = t + (a ^ n & (i ^ a)) + r[0] + 3614090360 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[1] + 3905402710 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[2] + 606105819 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[3] + 3250441966 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[4] + 4118548399 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[5] + 1200080426 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[6] + 2821735955 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[7] + 4249261313 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[8] + 1770035416 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[9] + 2336552879 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[10] + 4294925233 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[11] + 2304563134 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (a ^ n & (i ^ a)) + r[12] + 1804603682 & 4294967295, t = n + (o << 7 & 4294967295 | o >>> 25), o = a + (i ^ t & (n ^ i)) + r[13] + 4254626195 & 4294967295, a = t + (o << 12 & 4294967295 | o >>> 20), o = i + (n ^ a & (t ^ n)) + r[14] + 2792965006 & 4294967295, i = a + (o << 17 & 4294967295 | o >>> 15), o = n + (t ^ i & (a ^ t)) + r[15] + 1236535329 & 4294967295, n = i + (o << 22 & 4294967295 | o >>> 10), o = t + (i ^ a & (n ^ i)) + r[1] + 4129170786 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[6] + 3225465664 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[11] + 643717713 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[0] + 3921069994 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[5] + 3593408605 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[10] + 38016083 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[15] + 3634488961 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[4] + 3889429448 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[9] + 568446438 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[14] + 3275163606 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[3] + 4107603335 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[8] + 1163531501 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (i ^ a & (n ^ i)) + r[13] + 2850285829 & 4294967295, t = n + (o << 5 & 4294967295 | o >>> 27), o = a + (n ^ i & (t ^ n)) + r[2] + 4243563512 & 4294967295, a = t + (o << 9 & 4294967295 | o >>> 23), o = i + (t ^ n & (a ^ t)) + r[7] + 1735328473 & 4294967295, i = a + (o << 14 & 4294967295 | o >>> 18), o = n + (a ^ t & (i ^ a)) + r[12] + 2368359562 & 4294967295, n = i + (o << 20 & 4294967295 | o >>> 12), o = t + (n ^ i ^ a) + r[5] + 4294588738 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[8] + 2272392833 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[11] + 1839030562 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[14] + 4259657740 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[1] + 2763975236 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[4] + 1272893353 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[7] + 4139469664 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[10] + 3200236656 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[13] + 681279174 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[0] + 3936430074 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[3] + 3572445317 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[6] + 76029189 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (n ^ i ^ a) + r[9] + 3654602809 & 4294967295, t = n + (o << 4 & 4294967295 | o >>> 28), o = a + (t ^ n ^ i) + r[12] + 3873151461 & 4294967295, a = t + (o << 11 & 4294967295 | o >>> 21), o = i + (a ^ t ^ n) + r[15] + 530742520 & 4294967295, i = a + (o << 16 & 4294967295 | o >>> 16), o = n + (i ^ a ^ t) + r[2] + 3299628645 & 4294967295, n = i + (o << 23 & 4294967295 | o >>> 9), o = t + (i ^ (n | ~a)) + r[0] + 4096336452 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[7] + 1126891415 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[14] + 2878612391 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[5] + 4237533241 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[12] + 1700485571 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[3] + 2399980690 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[10] + 4293915773 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[1] + 2240044497 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[8] + 1873313359 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[15] + 4264355552 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[6] + 2734768916 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[13] + 1309151649 & 4294967295, n = i + (o << 21 & 4294967295 | o >>> 11), o = t + (i ^ (n | ~a)) + r[4] + 4149444226 & 4294967295, t = n + (o << 6 & 4294967295 | o >>> 26), o = a + (n ^ (t | ~i)) + r[11] + 3174756917 & 4294967295, a = t + (o << 10 & 4294967295 | o >>> 22), o = i + (t ^ (a | ~n)) + r[2] + 718787259 & 4294967295, i = a + (o << 15 & 4294967295 | o >>> 17), o = n + (a ^ (i | ~t)) + r[9] + 3951481745 & 4294967295, e.g[0] = e.g[0] + t & 4294967295, e.g[1] = e.g[1] + (i + (o << 21 & 4294967295 | o >>> 11)) & 4294967295, e.g[2] = e.g[2] + i & 4294967295, e.g[3] = e.g[3] + a & 4294967295;
	}
	r.prototype.v = function(e, t) {
		t === void 0 && (t = e.length);
		let n = t - this.blockSize, r = this.C, a = this.h, o = 0;
		for (; o < t;) {
			if (a == 0) for (; o <= n;) i(this, e, o), o += this.blockSize;
			if (typeof e == "string") {
				for (; o < t;) if (r[a++] = e.charCodeAt(o++), a == this.blockSize) {
					i(this, r), a = 0;
					break;
				}
			} else for (; o < t;) if (r[a++] = e[o++], a == this.blockSize) {
				i(this, r), a = 0;
				break;
			}
		}
		this.h = a, this.o += t;
	}, r.prototype.A = function() {
		var e = Array((this.h < 56 ? this.blockSize : this.blockSize * 2) - this.h);
		e[0] = 128;
		for (var t = 1; t < e.length - 8; ++t) e[t] = 0;
		t = this.o * 8;
		for (var n = e.length - 8; n < e.length; ++n) e[n] = t & 255, t /= 256;
		for (this.v(e), e = Array(16), t = 0, n = 0; n < 4; ++n) for (let r = 0; r < 32; r += 8) e[t++] = this.g[n] >>> r & 255;
		return e;
	};
	function a(e, t) {
		var n = s;
		return Object.prototype.hasOwnProperty.call(n, e) ? n[e] : n[e] = t(e);
	}
	function o(e, t) {
		this.h = t;
		let n = [], r = !0;
		for (let i = e.length - 1; i >= 0; i--) {
			let a = e[i] | 0;
			r && a == t || (n[i] = a, r = !1);
		}
		this.g = n;
	}
	var s = {};
	function c(e) {
		return -128 <= e && e < 128 ? a(e, function(e) {
			return new o([e | 0], e < 0 ? -1 : 0);
		}) : new o([e | 0], e < 0 ? -1 : 0);
	}
	function l(e) {
		if (isNaN(e) || !isFinite(e)) return d;
		if (e < 0) return g(l(-e));
		let t = [], n = 1;
		for (let r = 0; e >= n; r++) t[r] = e / n | 0, n *= 4294967296;
		return new o(t, 0);
	}
	function u(e, t) {
		if (e.length == 0) throw Error("number format error: empty string");
		if (t = t || 10, t < 2 || 36 < t) throw Error("radix out of range: " + t);
		if (e.charAt(0) == "-") return g(u(e.substring(1), t));
		if (e.indexOf("-") >= 0) throw Error("number format error: interior \"-\" character");
		let n = l(t ** 8), r = d;
		for (let a = 0; a < e.length; a += 8) {
			var i = Math.min(8, e.length - a);
			let o = parseInt(e.substring(a, a + i), t);
			i < 8 ? (i = l(t ** +i), r = r.j(i).add(l(o))) : (r = r.j(n), r = r.add(l(o)));
		}
		return r;
	}
	var d = c(0), f = c(1), p = c(16777216);
	e = o.prototype, e.m = function() {
		if (h(this)) return -g(this).m();
		let e = 0, t = 1;
		for (let n = 0; n < this.g.length; n++) {
			let r = this.i(n);
			e += (r >= 0 ? r : 4294967296 + r) * t, t *= 4294967296;
		}
		return e;
	}, e.toString = function(e) {
		if (e = e || 10, e < 2 || 36 < e) throw Error("radix out of range: " + e);
		if (m(this)) return "0";
		if (h(this)) return "-" + g(this).toString(e);
		let t = l(e ** 6);
		var n = this;
		let r = "";
		for (;;) {
			let i = ne(n, t).g;
			n = ee(n, i.j(t));
			let a = ((n.g.length > 0 ? n.g[0] : n.h) >>> 0).toString(e);
			if (n = i, m(n)) return a + r;
			for (; a.length < 6;) a = "0" + a;
			r = a + r;
		}
	}, e.i = function(e) {
		return e < 0 ? 0 : e < this.g.length ? this.g[e] : this.h;
	};
	function m(e) {
		if (e.h != 0) return !1;
		for (let t = 0; t < e.g.length; t++) if (e.g[t] != 0) return !1;
		return !0;
	}
	function h(e) {
		return e.h == -1;
	}
	e.l = function(e) {
		return e = ee(this, e), h(e) ? -1 : +!m(e);
	};
	function g(e) {
		let t = e.g.length, n = [];
		for (let r = 0; r < t; r++) n[r] = ~e.g[r];
		return new o(n, ~e.h).add(f);
	}
	e.abs = function() {
		return h(this) ? g(this) : this;
	}, e.add = function(e) {
		let t = Math.max(this.g.length, e.g.length), n = [], r = 0;
		for (let i = 0; i <= t; i++) {
			let t = r + (this.i(i) & 65535) + (e.i(i) & 65535), a = (t >>> 16) + (this.i(i) >>> 16) + (e.i(i) >>> 16);
			r = a >>> 16, t &= 65535, a &= 65535, n[i] = a << 16 | t;
		}
		return new o(n, n[n.length - 1] & -2147483648 ? -1 : 0);
	};
	function ee(e, t) {
		return e.add(g(t));
	}
	e.j = function(e) {
		if (m(this) || m(e)) return d;
		if (h(this)) return h(e) ? g(this).j(g(e)) : g(g(this).j(e));
		if (h(e)) return g(this.j(g(e)));
		if (this.l(p) < 0 && e.l(p) < 0) return l(this.m() * e.m());
		let t = this.g.length + e.g.length, n = [];
		for (var r = 0; r < 2 * t; r++) n[r] = 0;
		for (r = 0; r < this.g.length; r++) for (let t = 0; t < e.g.length; t++) {
			let i = this.i(r) >>> 16, a = this.i(r) & 65535, o = e.i(t) >>> 16, s = e.i(t) & 65535;
			n[2 * r + 2 * t] += a * s, te(n, 2 * r + 2 * t), n[2 * r + 2 * t + 1] += i * s, te(n, 2 * r + 2 * t + 1), n[2 * r + 2 * t + 1] += a * o, te(n, 2 * r + 2 * t + 1), n[2 * r + 2 * t + 2] += i * o, te(n, 2 * r + 2 * t + 2);
		}
		for (e = 0; e < t; e++) n[e] = n[2 * e + 1] << 16 | n[2 * e];
		for (e = t; e < 2 * t; e++) n[e] = 0;
		return new o(n, 0);
	};
	function te(e, t) {
		for (; (e[t] & 65535) != e[t];) e[t + 1] += e[t] >>> 16, e[t] &= 65535, t++;
	}
	function _(e, t) {
		this.g = e, this.h = t;
	}
	function ne(e, t) {
		if (m(t)) throw Error("division by zero");
		if (m(e)) return new _(d, d);
		if (h(e)) return t = ne(g(e), t), new _(g(t.g), g(t.h));
		if (h(t)) return t = ne(e, g(t)), new _(g(t.g), t.h);
		if (e.g.length > 30) {
			if (h(e) || h(t)) throw Error("slowDivide_ only works with positive integers.");
			for (var n = f, r = t; r.l(e) <= 0;) n = re(n), r = re(r);
			var i = ie(n, 1), a = ie(r, 1);
			for (r = ie(r, 2), n = ie(n, 2); !m(r);) {
				var o = a.add(r);
				o.l(e) <= 0 && (i = i.add(n), a = o), r = ie(r, 1), n = ie(n, 1);
			}
			return t = ee(e, i.j(t)), new _(i, t);
		}
		for (i = d; e.l(t) >= 0;) {
			for (n = Math.max(1, Math.floor(e.m() / t.m())), r = Math.ceil(Math.log(n) / Math.LN2), r = r <= 48 ? 1 : 2 ** (r - 48), a = l(n), o = a.j(t); h(o) || o.l(e) > 0;) n -= r, a = l(n), o = a.j(t);
			m(a) && (a = f), i = i.add(a), e = ee(e, o);
		}
		return new _(i, e);
	}
	e.B = function(e) {
		return ne(this, e).h;
	}, e.and = function(e) {
		let t = Math.max(this.g.length, e.g.length), n = [];
		for (let r = 0; r < t; r++) n[r] = this.i(r) & e.i(r);
		return new o(n, this.h & e.h);
	}, e.or = function(e) {
		let t = Math.max(this.g.length, e.g.length), n = [];
		for (let r = 0; r < t; r++) n[r] = this.i(r) | e.i(r);
		return new o(n, this.h | e.h);
	}, e.xor = function(e) {
		let t = Math.max(this.g.length, e.g.length), n = [];
		for (let r = 0; r < t; r++) n[r] = this.i(r) ^ e.i(r);
		return new o(n, this.h ^ e.h);
	};
	function re(e) {
		let t = e.g.length + 1, n = [];
		for (let r = 0; r < t; r++) n[r] = e.i(r) << 1 | e.i(r - 1) >>> 31;
		return new o(n, e.h);
	}
	function ie(e, t) {
		let n = t >> 5;
		t %= 32;
		let r = e.g.length - n, i = [];
		for (let a = 0; a < r; a++) i[a] = t > 0 ? e.i(a + n) >>> t | e.i(a + n + 1) << 32 - t : e.i(a + n);
		return new o(i, e.h);
	}
	r.prototype.digest = r.prototype.A, r.prototype.reset = r.prototype.u, r.prototype.update = r.prototype.v, tc = $s.Md5 = r, o.prototype.add = o.prototype.add, o.prototype.multiply = o.prototype.j, o.prototype.modulo = o.prototype.B, o.prototype.compare = o.prototype.l, o.prototype.toNumber = o.prototype.m, o.prototype.toString = o.prototype.toString, o.prototype.getBits = o.prototype.i, o.fromNumber = l, o.fromString = u, ec = $s.Integer = o;
}).apply(Qs === void 0 ? typeof self < "u" ? self : typeof window < "u" ? window : {} : Qs);
//#endregion
//#region node_modules/@firebase/webchannel-wrapper/dist/webchannel-blob/esm/webchannel_blob_es2018.js
var nc = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, rc = {}, ic, ac, oc, sc, cc, lc, uc, dc;
(function() {
	var e, t = Object.defineProperty;
	function n(e) {
		e = [
			typeof globalThis == "object" && globalThis,
			e,
			typeof window == "object" && window,
			typeof self == "object" && self,
			typeof nc == "object" && nc
		];
		for (var t = 0; t < e.length; ++t) {
			var n = e[t];
			if (n && n.Math == Math) return n;
		}
		throw Error("Cannot find global object");
	}
	var r = n(this);
	function i(e, n) {
		if (n) a: {
			var i = r;
			e = e.split(".");
			for (var a = 0; a < e.length - 1; a++) {
				var o = e[a];
				if (!(o in i)) break a;
				i = i[o];
			}
			e = e[e.length - 1], a = i[e], n = n(a), n != a && n != null && t(i, e, {
				configurable: !0,
				writable: !0,
				value: n
			});
		}
	}
	i("Symbol.dispose", function(e) {
		return e || Symbol("Symbol.dispose");
	}), i("Array.prototype.values", function(e) {
		return e || function() {
			return this[Symbol.iterator]();
		};
	}), i("Object.entries", function(e) {
		return e || function(e) {
			var t = [], n;
			for (n in e) Object.prototype.hasOwnProperty.call(e, n) && t.push([n, e[n]]);
			return t;
		};
	});
	var a = a || {}, o = this || self;
	function s(e) {
		var t = typeof e;
		return t == "object" && e != null || t == "function";
	}
	function c(e, t, n) {
		return e.call.apply(e.bind, arguments);
	}
	function l(e, t, n) {
		return l = c, l.apply(null, arguments);
	}
	function u(e, t) {
		var n = Array.prototype.slice.call(arguments, 1);
		return function() {
			var t = n.slice();
			return t.push.apply(t, arguments), e.apply(this, t);
		};
	}
	function d(e, t) {
		function n() {}
		n.prototype = t.prototype, e.Z = t.prototype, e.prototype = new n(), e.prototype.constructor = e, e.Ob = function(e, n, r) {
			for (var i = Array(arguments.length - 2), a = 2; a < arguments.length; a++) i[a - 2] = arguments[a];
			return t.prototype[n].apply(e, i);
		};
	}
	var f = typeof AsyncContext < "u" && typeof AsyncContext.Snapshot == "function" ? (e) => e && AsyncContext.Snapshot.wrap(e) : (e) => e;
	function p(e) {
		let t = e.length;
		if (t > 0) {
			let n = Array(t);
			for (let r = 0; r < t; r++) n[r] = e[r];
			return n;
		}
		return [];
	}
	function m(e, t) {
		for (let t = 1; t < arguments.length; t++) {
			let r = arguments[t];
			var n = typeof r;
			if (n = n == "object" ? r ? Array.isArray(r) ? "array" : n : "null" : n, n == "array" || n == "object" && typeof r.length == "number") {
				n = e.length || 0;
				let t = r.length || 0;
				e.length = n + t;
				for (let i = 0; i < t; i++) e[n + i] = r[i];
			} else e.push(r);
		}
	}
	class h {
		constructor(e, t) {
			this.i = e, this.j = t, this.h = 0, this.g = null;
		}
		get() {
			let e;
			return this.h > 0 ? (this.h--, e = this.g, this.g = e.next, e.next = null) : e = this.i(), e;
		}
	}
	function g(e) {
		o.setTimeout(() => {
			throw e;
		}, 0);
	}
	function ee() {
		var e = ae;
		let t = null;
		return e.g && (t = e.g, e.g = e.g.next, e.g || (e.h = null), t.next = null), t;
	}
	class te {
		constructor() {
			this.h = this.g = null;
		}
		add(e, t) {
			let n = _.get();
			n.set(e, t), this.h ? this.h.next = n : this.g = n, this.h = n;
		}
	}
	var _ = new h(() => new ne(), (e) => e.reset());
	class ne {
		constructor() {
			this.next = this.g = this.h = null;
		}
		set(e, t) {
			this.h = e, this.g = t, this.next = null;
		}
		reset() {
			this.next = this.g = this.h = null;
		}
	}
	let re, ie = !1, ae = new te(), oe = () => {
		let e = Promise.resolve(void 0);
		re = () => {
			e.then(se);
		};
	};
	function se() {
		for (var e; e = ee();) {
			try {
				e.h.call(e.g);
			} catch (e) {
				g(e);
			}
			var t = _;
			t.j(e), t.h < 100 && (t.h++, e.next = t.g, t.g = e);
		}
		ie = !1;
	}
	function ce() {
		this.u = this.u, this.C = this.C;
	}
	ce.prototype.u = !1, ce.prototype.dispose = function() {
		this.u || (this.u = !0, this.N());
	}, ce.prototype[Symbol.dispose] = function() {
		this.dispose();
	}, ce.prototype.N = function() {
		if (this.C) for (; this.C.length;) this.C.shift()();
	};
	function v(e, t) {
		this.type = e, this.g = this.target = t, this.defaultPrevented = !1;
	}
	v.prototype.h = function() {
		this.defaultPrevented = !0;
	};
	var le = function() {
		if (!o.addEventListener || !Object.defineProperty) return !1;
		var e = !1, t = Object.defineProperty({}, "passive", { get: function() {
			e = !0;
		} });
		try {
			let e = () => {};
			o.addEventListener("test", e, t), o.removeEventListener("test", e, t);
		} catch {}
		return e;
	}();
	function ue(e) {
		return /^[\s\xa0]*$/.test(e);
	}
	function de(e, t) {
		v.call(this, e ? e.type : ""), this.relatedTarget = this.g = this.target = null, this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0, this.key = "", this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1, this.state = null, this.pointerId = 0, this.pointerType = "", this.i = null, e && this.init(e, t);
	}
	d(de, v), de.prototype.init = function(e, t) {
		let n = this.type = e.type, r = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null;
		this.target = e.target || e.srcElement, this.g = t, t = e.relatedTarget, t || (n == "mouseover" ? t = e.fromElement : n == "mouseout" && (t = e.toElement)), this.relatedTarget = t, r ? (this.clientX = r.clientX === void 0 ? r.pageX : r.clientX, this.clientY = r.clientY === void 0 ? r.pageY : r.clientY, this.screenX = r.screenX || 0, this.screenY = r.screenY || 0) : (this.clientX = e.clientX === void 0 ? e.pageX : e.clientX, this.clientY = e.clientY === void 0 ? e.pageY : e.clientY, this.screenX = e.screenX || 0, this.screenY = e.screenY || 0), this.button = e.button, this.key = e.key || "", this.ctrlKey = e.ctrlKey, this.altKey = e.altKey, this.shiftKey = e.shiftKey, this.metaKey = e.metaKey, this.pointerId = e.pointerId || 0, this.pointerType = e.pointerType, this.state = e.state, this.i = e, e.defaultPrevented && de.Z.h.call(this);
	}, de.prototype.h = function() {
		de.Z.h.call(this);
		let e = this.i;
		e.preventDefault ? e.preventDefault() : e.returnValue = !1;
	};
	var fe = "closure_listenable_" + (Math.random() * 1e6 | 0), pe = 0;
	function me(e, t, n, r, i) {
		this.listener = e, this.proxy = null, this.src = t, this.type = n, this.capture = !!r, this.ha = i, this.key = ++pe, this.da = this.fa = !1;
	}
	function he(e) {
		e.da = !0, e.listener = null, e.proxy = null, e.src = null, e.ha = null;
	}
	function ge(e, t, n) {
		for (let r in e) t.call(n, e[r], r, e);
	}
	function _e(e, t) {
		for (let n in e) t.call(void 0, e[n], n, e);
	}
	function ve(e) {
		let t = {};
		for (let n in e) t[n] = e[n];
		return t;
	}
	let ye = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
	function be(e, t) {
		let n, r;
		for (let t = 1; t < arguments.length; t++) {
			for (n in r = arguments[t], r) e[n] = r[n];
			for (let t = 0; t < ye.length; t++) n = ye[t], Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
		}
	}
	function xe(e) {
		this.src = e, this.g = {}, this.h = 0;
	}
	xe.prototype.add = function(e, t, n, r, i) {
		let a = e.toString();
		e = this.g[a], e || (e = this.g[a] = [], this.h++);
		let o = Ce(e, t, r, i);
		return o > -1 ? (t = e[o], n || (t.fa = !1)) : (t = new me(t, this.src, a, !!r, i), t.fa = n, e.push(t)), t;
	};
	function Se(e, t) {
		let n = t.type;
		if (n in e.g) {
			var r = e.g[n], i = Array.prototype.indexOf.call(r, t, void 0), a;
			(a = i >= 0) && Array.prototype.splice.call(r, i, 1), a && (he(t), e.g[n].length == 0 && (delete e.g[n], e.h--));
		}
	}
	function Ce(e, t, n, r) {
		for (let i = 0; i < e.length; ++i) {
			let a = e[i];
			if (!a.da && a.listener == t && a.capture == !!n && a.ha == r) return i;
		}
		return -1;
	}
	var we = "closure_lm_" + (Math.random() * 1e6 | 0), y = {};
	function Te(e, t, n, r, i) {
		if (r && r.once) return Oe(e, t, n, r, i);
		if (Array.isArray(t)) {
			for (let a = 0; a < t.length; a++) Te(e, t[a], n, r, i);
			return null;
		}
		return n = Pe(n), e && e[fe] ? e.J(t, n, s(r) ? !!r.capture : !!r, i) : Ee(e, t, n, !1, r, i);
	}
	function Ee(e, t, n, r, i, a) {
		if (!t) throw Error("Invalid event type");
		let o = s(i) ? !!i.capture : !!i, c = Ne(e);
		if (c || (e[we] = c = new xe(e)), n = c.add(t, n, r, o, a), n.proxy) return n;
		if (r = De(), n.proxy = r, r.src = e, r.listener = n, e.addEventListener) le || (i = o), i === void 0 && (i = !1), e.addEventListener(t.toString(), r, i);
		else if (e.attachEvent) e.attachEvent(je(t.toString()), r);
		else if (e.addListener && e.removeListener) e.addListener(r);
		else throw Error("addEventListener and attachEvent are unavailable.");
		return n;
	}
	function De() {
		function e(n) {
			return t.call(e.src, e.listener, n);
		}
		let t = Me;
		return e;
	}
	function Oe(e, t, n, r, i) {
		if (Array.isArray(t)) {
			for (let a = 0; a < t.length; a++) Oe(e, t[a], n, r, i);
			return null;
		}
		return n = Pe(n), e && e[fe] ? e.K(t, n, s(r) ? !!r.capture : !!r, i) : Ee(e, t, n, !0, r, i);
	}
	function ke(e, t, n, r, i) {
		if (Array.isArray(t)) for (var a = 0; a < t.length; a++) ke(e, t[a], n, r, i);
		else r = s(r) ? !!r.capture : !!r, n = Pe(n), e && e[fe] ? (e = e.i, a = String(t).toString(), a in e.g && (t = e.g[a], n = Ce(t, n, r, i), n > -1 && (he(t[n]), Array.prototype.splice.call(t, n, 1), t.length == 0 && (delete e.g[a], e.h--)))) : e && (e = Ne(e)) && (t = e.g[t.toString()], e = -1, t && (e = Ce(t, n, r, i)), (n = e > -1 ? t[e] : null) && Ae(n));
	}
	function Ae(e) {
		if (typeof e != "number" && e && !e.da) {
			var t = e.src;
			if (t && t[fe]) Se(t.i, e);
			else {
				var n = e.type, r = e.proxy;
				t.removeEventListener ? t.removeEventListener(n, r, e.capture) : t.detachEvent ? t.detachEvent(je(n), r) : t.addListener && t.removeListener && t.removeListener(r), (n = Ne(t)) ? (Se(n, e), n.h == 0 && (n.src = null, t[we] = null)) : he(e);
			}
		}
	}
	function je(e) {
		return e in y ? y[e] : y[e] = "on" + e;
	}
	function Me(e, t) {
		if (e.da) e = !0;
		else {
			t = new de(t, this);
			let n = e.listener, r = e.ha || e.src;
			e.fa && Ae(e), e = n.call(r, t);
		}
		return e;
	}
	function Ne(e) {
		return e = e[we], e instanceof xe ? e : null;
	}
	var b = "__closure_events_fn_" + (Math.random() * 1e9 >>> 0);
	function Pe(e) {
		return typeof e == "function" ? e : (e[b] || (e[b] = function(t) {
			return e.handleEvent(t);
		}), e[b]);
	}
	function x() {
		ce.call(this), this.i = new xe(this), this.M = this, this.G = null;
	}
	d(x, ce), x.prototype[fe] = !0, x.prototype.removeEventListener = function(e, t, n, r) {
		ke(this, e, t, n, r);
	};
	function S(e, t) {
		var n, r = e.G;
		if (r) for (n = []; r; r = r.G) n.push(r);
		if (e = e.M, r = t.type || t, typeof t == "string") t = new v(t, e);
		else if (t instanceof v) t.target = t.target || e;
		else {
			var i = t;
			t = new v(r, e), be(t, i);
		}
		i = !0;
		let a, o;
		if (n) for (o = n.length - 1; o >= 0; o--) a = t.g = n[o], i = Fe(a, r, !0, t) && i;
		if (a = t.g = e, i = Fe(a, r, !0, t) && i, i = Fe(a, r, !1, t) && i, n) for (o = 0; o < n.length; o++) a = t.g = n[o], i = Fe(a, r, !1, t) && i;
	}
	x.prototype.N = function() {
		if (x.Z.N.call(this), this.i) {
			var e = this.i;
			for (let t in e.g) {
				let n = e.g[t];
				for (let e = 0; e < n.length; e++) he(n[e]);
				delete e.g[t], e.h--;
			}
		}
		this.G = null;
	}, x.prototype.J = function(e, t, n, r) {
		return this.i.add(String(e), t, !1, n, r);
	}, x.prototype.K = function(e, t, n, r) {
		return this.i.add(String(e), t, !0, n, r);
	};
	function Fe(e, t, n, r) {
		if (t = e.i.g[String(t)], !t) return !0;
		t = t.concat();
		let i = !0;
		for (let a = 0; a < t.length; ++a) {
			let o = t[a];
			if (o && !o.da && o.capture == n) {
				let t = o.listener, n = o.ha || o.src;
				o.fa && Se(e.i, o), i = t.call(n, r) !== !1 && i;
			}
		}
		return i && !r.defaultPrevented;
	}
	function Ie(e, t) {
		if (typeof e != "function") if (e && typeof e.handleEvent == "function") e = l(e.handleEvent, e);
		else throw Error("Invalid listener argument");
		return Number(t) > 2147483647 ? -1 : o.setTimeout(e, t || 0);
	}
	function Le(e) {
		e.g = Ie(() => {
			e.g = null, e.i && (e.i = !1, Le(e));
		}, e.l);
		let t = e.h;
		e.h = null, e.m.apply(null, t);
	}
	class Re extends ce {
		constructor(e, t) {
			super(), this.m = e, this.l = t, this.h = null, this.i = !1, this.g = null;
		}
		j(e) {
			this.h = arguments, this.g ? this.i = !0 : Le(this);
		}
		N() {
			super.N(), this.g && (o.clearTimeout(this.g), this.g = null, this.i = !1, this.h = null);
		}
	}
	function ze(e) {
		ce.call(this), this.h = e, this.g = {};
	}
	d(ze, ce);
	var Be = [];
	function Ve(e) {
		ge(e.g, function(e, t) {
			this.g.hasOwnProperty(t) && Ae(e);
		}, e), e.g = {};
	}
	ze.prototype.N = function() {
		ze.Z.N.call(this), Ve(this);
	}, ze.prototype.handleEvent = function() {
		throw Error("EventHandler.handleEvent not implemented");
	};
	var He = o.JSON.stringify, Ue = o.JSON.parse, We = class {
		stringify(e) {
			return o.JSON.stringify(e, void 0);
		}
		parse(e) {
			return o.JSON.parse(e, void 0);
		}
	};
	function Ge() {}
	function Ke() {}
	var qe = {
		OPEN: "a",
		hb: "b",
		ERROR: "c",
		tb: "d"
	};
	function Je() {
		v.call(this, "d");
	}
	d(Je, v);
	function Ye() {
		v.call(this, "c");
	}
	d(Ye, v);
	var Xe = {}, Ze = null;
	function Qe() {
		return Ze = Ze || new x();
	}
	Xe.Ia = "serverreachability";
	function $e(e) {
		v.call(this, Xe.Ia, e);
	}
	d($e, v);
	function et(e) {
		let t = Qe();
		S(t, new $e(t));
	}
	Xe.STAT_EVENT = "statevent";
	function tt(e, t) {
		v.call(this, Xe.STAT_EVENT, e), this.stat = t;
	}
	d(tt, v);
	function C(e) {
		let t = Qe();
		S(t, new tt(t, e));
	}
	Xe.Ja = "timingevent";
	function nt(e, t) {
		v.call(this, Xe.Ja, e), this.size = t;
	}
	d(nt, v);
	function rt(e, t) {
		if (typeof e != "function") throw Error("Fn must not be null and must be a function");
		return o.setTimeout(function() {
			e();
		}, t);
	}
	function it() {
		this.g = !0;
	}
	it.prototype.ua = function() {
		this.g = !1;
	};
	function at(e, t, n, r, i, a) {
		e.info(function() {
			if (e.g) if (a) {
				var o = "", s = a.split("&");
				for (let e = 0; e < s.length; e++) {
					var c = s[e].split("=");
					if (c.length > 1) {
						let e = c[0];
						c = c[1];
						let t = e.split("_");
						o = t.length >= 2 && t[1] == "type" ? o + (e + "=" + c + "&") : o + (e + "=redacted&");
					}
				}
			} else o = null;
			else o = a;
			return "XMLHTTP REQ (" + r + ") [attempt " + i + "]: " + t + "\n" + n + "\n" + o;
		});
	}
	function ot(e, t, n, r, i, a, o) {
		e.info(function() {
			return "XMLHTTP RESP (" + r + ") [ attempt " + i + "]: " + t + "\n" + n + "\n" + a + " " + o;
		});
	}
	function st(e, t, n, r) {
		e.info(function() {
			return "XMLHTTP TEXT (" + t + "): " + lt(e, n) + (r ? " " + r : "");
		});
	}
	function ct(e, t) {
		e.info(function() {
			return "TIMEOUT: " + t;
		});
	}
	it.prototype.info = function() {};
	function lt(e, t) {
		if (!e.g) return t;
		if (!t) return null;
		try {
			let a = JSON.parse(t);
			if (a) {
				for (e = 0; e < a.length; e++) if (Array.isArray(a[e])) {
					var n = a[e];
					if (!(n.length < 2)) {
						var r = n[1];
						if (Array.isArray(r) && !(r.length < 1)) {
							var i = r[0];
							if (i != "noop" && i != "stop" && i != "close") for (let e = 1; e < r.length; e++) r[e] = "";
						}
					}
				}
			}
			return He(a);
		} catch {
			return t;
		}
	}
	var ut = {
		NO_ERROR: 0,
		cb: 1,
		qb: 2,
		pb: 3,
		kb: 4,
		ob: 5,
		rb: 6,
		Ga: 7,
		TIMEOUT: 8,
		ub: 9
	}, dt = {
		ib: "complete",
		Fb: "success",
		ERROR: "error",
		Ga: "abort",
		xb: "ready",
		yb: "readystatechange",
		TIMEOUT: "timeout",
		sb: "incrementaldata",
		wb: "progress",
		lb: "downloadprogress",
		Nb: "uploadprogress"
	}, ft;
	function pt() {}
	d(pt, Ge), pt.prototype.g = function() {
		return new XMLHttpRequest();
	}, ft = new pt();
	function mt(e) {
		return encodeURIComponent(String(e));
	}
	function ht(e) {
		var t = 1;
		e = e.split(":");
		let n = [];
		for (; t > 0 && e.length;) n.push(e.shift()), t--;
		return e.length && n.push(e.join(":")), n;
	}
	function gt(e, t, n, r) {
		this.j = e, this.i = t, this.l = n, this.S = r || 1, this.V = new ze(this), this.H = 45e3, this.J = null, this.o = !1, this.u = this.B = this.A = this.M = this.F = this.T = this.D = null, this.G = [], this.g = null, this.C = 0, this.m = this.v = null, this.X = -1, this.K = !1, this.P = 0, this.O = null, this.W = this.L = this.U = this.R = !1, this.h = new _t();
	}
	function _t() {
		this.i = null, this.g = "", this.h = !1;
	}
	var vt = {}, yt = {};
	function bt(e, t, n) {
		e.M = 1, e.A = Kt(Ht(t)), e.u = n, e.R = !0, xt(e, null);
	}
	function xt(e, t) {
		e.F = Date.now(), Tt(e), e.B = Ht(e.A);
		var n = e.B, r = e.S;
		Array.isArray(r) || (r = [String(r)]), sn(n.i, "t", r), e.C = 0, n = e.j.L, e.h = new _t(), e.g = Yn(e.j, n ? t : null, !e.u), e.P > 0 && (e.O = new Re(l(e.Y, e, e.g), e.P)), t = e.V, n = e.g, r = e.ba;
		var i = "readystatechange";
		Array.isArray(i) || (i && (Be[0] = i.toString()), i = Be);
		for (let e = 0; e < i.length; e++) {
			let a = Te(n, i[e], r || t.handleEvent, !1, t.h || t);
			if (!a) break;
			t.g[a.key] = a;
		}
		t = e.J ? ve(e.J) : {}, e.u ? (e.v || (e.v = "POST"), t["Content-Type"] = "application/x-www-form-urlencoded", e.g.ea(e.B, e.v, e.u, t)) : (e.v = "GET", e.g.ea(e.B, e.v, null, t)), et(), at(e.i, e.v, e.B, e.l, e.S, e.u);
	}
	gt.prototype.ba = function(e) {
		e = e.target;
		let t = this.O;
		t && On(e) == 3 ? t.j() : this.Y(e);
	}, gt.prototype.Y = function(e) {
		try {
			if (e == this.g) a: {
				let s = On(this.g), c = this.g.ya(), l = this.g.ca();
				if (!(s < 3) && (s != 3 || this.g && (this.h.h || this.g.la() || kn(this.g)))) {
					this.K || s != 4 || c == 7 || et(c == 8 || l <= 0 ? 3 : 2), Dt(this);
					var t = this.g.ca();
					this.X = t;
					var n = St(this);
					if (this.o = t == 200, ot(this.i, this.v, this.B, this.l, this.S, s, t), this.o) {
						if (this.U && !this.L) {
							b: {
								if (this.g) {
									var r, i = this.g;
									if ((r = i.g ? i.g.getResponseHeader("X-HTTP-Initial-Response") : null) && !ue(r)) {
										var a = r;
										break b;
									}
								}
								a = null;
							}
							if (e = a) st(this.i, this.l, e, "Initial handshake response via X-HTTP-Initial-Response"), this.L = !0, At(this, e);
							else {
								this.o = !1, this.m = 3, C(12), kt(this), Ot(this);
								break a;
							}
						}
						if (this.R) {
							e = !0;
							let t;
							for (; !this.K && this.C < n.length;) if (t = wt(this, n), t == yt) {
								s == 4 && (this.m = 4, C(14), e = !1), st(this.i, this.l, null, "[Incomplete Response]");
								break;
							} else if (t == vt) {
								this.m = 4, C(15), st(this.i, this.l, n, "[Invalid Chunk]"), e = !1;
								break;
							} else st(this.i, this.l, t, null), At(this, t);
							if (Ct(this) && this.C != 0 && (this.h.g = this.h.g.slice(this.C), this.C = 0), s != 4 || n.length != 0 || this.h.h || (this.m = 1, C(16), e = !1), this.o = this.o && e, !e) st(this.i, this.l, n, "[Invalid Chunked Response]"), kt(this), Ot(this);
							else if (n.length > 0 && !this.W) {
								this.W = !0;
								var o = this.j;
								o.g == this && o.aa && !o.P && (o.j.info("Great, no buffering proxy detected. Bytes received: " + n.length), Hn(o), o.P = !0, C(11));
							}
						} else st(this.i, this.l, n, null), At(this, n);
						s == 4 && kt(this), this.o && !this.K && (s == 4 ? Wn(this.j, this) : (this.o = !1, Tt(this)));
					} else An(this.g), t == 400 && n.indexOf("Unknown SID") > 0 ? (this.m = 3, C(12)) : (this.m = 0, C(13)), kt(this), Ot(this);
				}
			}
		} catch {}
	};
	function St(e) {
		if (!Ct(e)) return e.g.la();
		let t = kn(e.g);
		if (t === "") return "";
		let n = "", r = t.length, i = On(e.g) == 4;
		if (!e.h.i) {
			if (typeof TextDecoder > "u") return kt(e), Ot(e), "";
			e.h.i = new o.TextDecoder();
		}
		for (let a = 0; a < r; a++) e.h.h = !0, n += e.h.i.decode(t[a], { stream: !(i && a == r - 1) });
		return t.length = 0, e.h.g += n, e.C = 0, e.h.g;
	}
	function Ct(e) {
		return e.g ? e.v == "GET" && e.M != 2 && e.j.Aa : !1;
	}
	function wt(e, t) {
		var n = e.C, r = t.indexOf("\n", n);
		return r == -1 ? yt : (n = Number(t.substring(n, r)), isNaN(n) ? vt : (r += 1, r + n > t.length ? yt : (t = t.slice(r, r + n), e.C = r + n, t)));
	}
	gt.prototype.cancel = function() {
		this.K = !0, kt(this);
	};
	function Tt(e) {
		e.T = Date.now() + e.H, Et(e, e.H);
	}
	function Et(e, t) {
		if (e.D != null) throw Error("WatchDog timer not null");
		e.D = rt(l(e.aa, e), t);
	}
	function Dt(e) {
		e.D && (o.clearTimeout(e.D), e.D = null);
	}
	gt.prototype.aa = function() {
		this.D = null;
		let e = Date.now();
		e - this.T >= 0 ? (ct(this.i, this.B), this.M != 2 && (et(), C(17)), kt(this), this.m = 2, Ot(this)) : Et(this, this.T - e);
	};
	function Ot(e) {
		e.j.I == 0 || e.K || Wn(e.j, e);
	}
	function kt(e) {
		Dt(e);
		var t = e.O;
		t && typeof t.dispose == "function" && t.dispose(), e.O = null, Ve(e.V), e.g && (t = e.g, e.g = null, t.abort(), t.dispose());
	}
	function At(e, t) {
		try {
			var n = e.j;
			if (n.I != 0 && (n.g == e || Ft(n.h, e))) {
				if (!e.L && Ft(n.h, e) && n.I == 3) {
					try {
						var r = n.Ba.g.parse(t);
					} catch {
						r = null;
					}
					if (Array.isArray(r) && r.length == 3) {
						var i = r;
						if (i[0] == 0) {
							a: if (!n.v) {
								if (n.g) if (n.g.F + 3e3 < e.F) Un(n), Pn(n);
								else break a;
								Vn(n), C(18);
							}
						} else n.xa = i[1], 0 < n.xa - n.K && i[2] < 37500 && n.F && n.A == 0 && !n.C && (n.C = rt(l(n.Va, n), 6e3));
						Pt(n.h) <= 1 && n.ta && (n.ta = void 0);
					} else Kn(n, 11);
				} else if ((e.L || n.g == e) && Un(n), !ue(t)) for (i = n.Ba.g.parse(t), t = 0; t < i.length; t++) {
					let l = i[t], u = l[0];
					if (!(u <= n.K)) if (n.K = u, l = l[1], n.I == 2) if (l[0] == "c") {
						n.M = l[1], n.ba = l[2];
						let t = l[3];
						t != null && (n.ka = t, n.j.info("VER=" + n.ka));
						let i = l[4];
						i != null && (n.za = i, n.j.info("SVER=" + n.za));
						let u = l[5];
						u != null && typeof u == "number" && u > 0 && (r = 1.5 * u, n.O = r, n.j.info("backChannelRequestTimeoutMs_=" + r)), r = n;
						let d = e.g;
						if (d) {
							let e = d.g ? d.g.getResponseHeader("X-Client-Wire-Protocol") : null;
							if (e) {
								var a = r.h;
								a.g || e.indexOf("spdy") == -1 && e.indexOf("quic") == -1 && e.indexOf("h2") == -1 || (a.j = a.l, a.g = /* @__PURE__ */ new Set(), a.h && (It(a, a.h), a.h = null));
							}
							if (r.G) {
								let e = d.g ? d.g.getResponseHeader("X-HTTP-Session-Id") : null;
								e && (r.wa = e, w(r.J, r.G, e));
							}
						}
						n.I = 3, n.l && n.l.ra(), n.aa && (n.T = Date.now() - e.F, n.j.info("Handshake RTT: " + n.T + "ms")), r = n;
						var o = e;
						if (r.na = Jn(r, r.L ? r.ba : null, r.W), o.L) {
							Lt(r.h, o);
							var s = o, c = r.O;
							c && (s.H = c), s.D && (Dt(s), Tt(s)), r.g = o;
						} else Bn(r);
						n.i.length > 0 && In(n);
					} else l[0] != "stop" && l[0] != "close" || Kn(n, 7);
					else n.I == 3 && (l[0] == "stop" || l[0] == "close" ? l[0] == "stop" ? Kn(n, 7) : Nn(n) : l[0] != "noop" && n.l && n.l.qa(l), n.A = 0);
				}
			}
			et(4);
		} catch {}
	}
	var jt = class {
		constructor(e, t) {
			this.g = e, this.map = t;
		}
	};
	function Mt(e) {
		this.l = e || 10, o.PerformanceNavigationTiming ? (e = o.performance.getEntriesByType("navigation"), e = e.length > 0 && (e[0].nextHopProtocol == "hq" || e[0].nextHopProtocol == "h2")) : e = !!(o.chrome && o.chrome.loadTimes && o.chrome.loadTimes() && o.chrome.loadTimes().wasFetchedViaSpdy), this.j = e ? this.l : 1, this.g = null, this.j > 1 && (this.g = /* @__PURE__ */ new Set()), this.h = null, this.i = [];
	}
	function Nt(e) {
		return e.h ? !0 : e.g ? e.g.size >= e.j : !1;
	}
	function Pt(e) {
		return e.h ? 1 : e.g ? e.g.size : 0;
	}
	function Ft(e, t) {
		return e.h ? e.h == t : e.g ? e.g.has(t) : !1;
	}
	function It(e, t) {
		e.g ? e.g.add(t) : e.h = t;
	}
	function Lt(e, t) {
		e.h && e.h == t ? e.h = null : e.g && e.g.has(t) && e.g.delete(t);
	}
	Mt.prototype.cancel = function() {
		if (this.i = Rt(this), this.h) this.h.cancel(), this.h = null;
		else if (this.g && this.g.size !== 0) {
			for (let e of this.g.values()) e.cancel();
			this.g.clear();
		}
	};
	function Rt(e) {
		if (e.h != null) return e.i.concat(e.h.G);
		if (e.g != null && e.g.size !== 0) {
			let t = e.i;
			for (let n of e.g.values()) t = t.concat(n.G);
			return t;
		}
		return p(e.i);
	}
	var zt = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");
	function Bt(e, t) {
		if (e) {
			e = e.split("&");
			for (let n = 0; n < e.length; n++) {
				let r = e[n].indexOf("="), i, a = null;
				r >= 0 ? (i = e[n].substring(0, r), a = e[n].substring(r + 1)) : i = e[n], t(i, a ? decodeURIComponent(a.replace(/\+/g, " ")) : "");
			}
		}
	}
	function Vt(e) {
		this.g = this.o = this.j = "", this.u = null, this.m = this.h = "", this.l = !1;
		let t;
		e instanceof Vt ? (this.l = e.l, Ut(this, e.j), this.o = e.o, this.g = e.g, Wt(this, e.u), this.h = e.h, Gt(this, cn(e.i)), this.m = e.m) : e && (t = String(e).match(zt)) ? (this.l = !1, Ut(this, t[1] || "", !0), this.o = qt(t[2] || ""), this.g = qt(t[3] || "", !0), Wt(this, t[4]), this.h = qt(t[5] || "", !0), Gt(this, t[6] || "", !0), this.m = qt(t[7] || "")) : (this.l = !1, this.i = new tn(null, this.l));
	}
	Vt.prototype.toString = function() {
		let e = [];
		var t = this.j;
		t && e.push(Jt(t, Xt, !0), ":");
		var n = this.g;
		return (n || t == "file") && (e.push("//"), (t = this.o) && e.push(Jt(t, Xt, !0), "@"), e.push(mt(n).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), n = this.u, n != null && e.push(":", String(n))), (n = this.h) && (this.g && n.charAt(0) != "/" && e.push("/"), e.push(Jt(n, n.charAt(0) == "/" ? Qt : Zt, !0))), (n = this.i.toString()) && e.push("?", n), (n = this.m) && e.push("#", Jt(n, en)), e.join("");
	}, Vt.prototype.resolve = function(e) {
		let t = Ht(this), n = !!e.j;
		n ? Ut(t, e.j) : n = !!e.o, n ? t.o = e.o : n = !!e.g, n ? t.g = e.g : n = e.u != null;
		var r = e.h;
		if (n) Wt(t, e.u);
		else if (n = !!e.h) {
			if (r.charAt(0) != "/") if (this.g && !this.h) r = "/" + r;
			else {
				var i = t.h.lastIndexOf("/");
				i != -1 && (r = t.h.slice(0, i + 1) + r);
			}
			if (i = r, i == ".." || i == ".") r = "";
			else if (i.indexOf("./") != -1 || i.indexOf("/.") != -1) {
				r = i.lastIndexOf("/", 0) == 0, i = i.split("/");
				let e = [];
				for (let t = 0; t < i.length;) {
					let n = i[t++];
					n == "." ? r && t == i.length && e.push("") : n == ".." ? ((e.length > 1 || e.length == 1 && e[0] != "") && e.pop(), r && t == i.length && e.push("")) : (e.push(n), r = !0);
				}
				r = e.join("/");
			} else r = i;
		}
		return n ? t.h = r : n = e.i.toString() !== "", n ? Gt(t, cn(e.i)) : n = !!e.m, n && (t.m = e.m), t;
	};
	function Ht(e) {
		return new Vt(e);
	}
	function Ut(e, t, n) {
		e.j = n ? qt(t, !0) : t, e.j && (e.j = e.j.replace(/:$/, ""));
	}
	function Wt(e, t) {
		if (t) {
			if (t = Number(t), isNaN(t) || t < 0) throw Error("Bad port number " + t);
			e.u = t;
		} else e.u = null;
	}
	function Gt(e, t, n) {
		t instanceof tn ? (e.i = t, un(e.i, e.l)) : (n || (t = Jt(t, $t)), e.i = new tn(t, e.l));
	}
	function w(e, t, n) {
		e.i.set(t, n);
	}
	function Kt(e) {
		return w(e, "zx", Math.floor(Math.random() * 2147483648).toString(36) + Math.abs(Math.floor(Math.random() * 2147483648) ^ Date.now()).toString(36)), e;
	}
	function qt(e, t) {
		return e ? t ? decodeURI(e.replace(/%25/g, "%2525")) : decodeURIComponent(e) : "";
	}
	function Jt(e, t, n) {
		return typeof e == "string" ? (e = encodeURI(e).replace(t, Yt), n && (e = e.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), e) : null;
	}
	function Yt(e) {
		return e = e.charCodeAt(0), "%" + (e >> 4 & 15).toString(16) + (e & 15).toString(16);
	}
	var Xt = /[#\/\?@]/g, Zt = /[#\?:]/g, Qt = /[#\?]/g, $t = /[#\?@]/g, en = /#/g;
	function tn(e, t) {
		this.h = this.g = null, this.i = e || null, this.j = !!t;
	}
	function nn(e) {
		e.g || (e.g = /* @__PURE__ */ new Map(), e.h = 0, e.i && Bt(e.i, function(t, n) {
			e.add(decodeURIComponent(t.replace(/\+/g, " ")), n);
		}));
	}
	e = tn.prototype, e.add = function(e, t) {
		nn(this), this.i = null, e = ln(this, e);
		let n = this.g.get(e);
		return n || this.g.set(e, n = []), n.push(t), this.h += 1, this;
	};
	function rn(e, t) {
		nn(e), t = ln(e, t), e.g.has(t) && (e.i = null, e.h -= e.g.get(t).length, e.g.delete(t));
	}
	function an(e, t) {
		return nn(e), t = ln(e, t), e.g.has(t);
	}
	e.forEach = function(e, t) {
		nn(this), this.g.forEach(function(n, r) {
			n.forEach(function(n) {
				e.call(t, n, r, this);
			}, this);
		}, this);
	};
	function on(e, t) {
		nn(e);
		let n = [];
		if (typeof t == "string") an(e, t) && (n = n.concat(e.g.get(ln(e, t))));
		else for (e = Array.from(e.g.values()), t = 0; t < e.length; t++) n = n.concat(e[t]);
		return n;
	}
	e.set = function(e, t) {
		return nn(this), this.i = null, e = ln(this, e), an(this, e) && (this.h -= this.g.get(e).length), this.g.set(e, [t]), this.h += 1, this;
	}, e.get = function(e, t) {
		return e ? (e = on(this, e), e.length > 0 ? String(e[0]) : t) : t;
	};
	function sn(e, t, n) {
		rn(e, t), n.length > 0 && (e.i = null, e.g.set(ln(e, t), p(n)), e.h += n.length);
	}
	e.toString = function() {
		if (this.i) return this.i;
		if (!this.g) return "";
		let e = [], t = Array.from(this.g.keys());
		for (let r = 0; r < t.length; r++) {
			var n = t[r];
			let i = mt(n);
			n = on(this, n);
			for (let t = 0; t < n.length; t++) {
				let r = i;
				n[t] !== "" && (r += "=" + mt(n[t])), e.push(r);
			}
		}
		return this.i = e.join("&");
	};
	function cn(e) {
		let t = new tn();
		return t.i = e.i, e.g && (t.g = new Map(e.g), t.h = e.h), t;
	}
	function ln(e, t) {
		return t = String(t), e.j && (t = t.toLowerCase()), t;
	}
	function un(e, t) {
		t && !e.j && (nn(e), e.i = null, e.g.forEach(function(e, t) {
			let n = t.toLowerCase();
			t != n && (rn(this, t), sn(this, n, e));
		}, e)), e.j = t;
	}
	function dn(e, t) {
		let n = new it();
		if (o.Image) {
			let r = new Image();
			r.onload = u(pn, n, "TestLoadImage: loaded", !0, t, r), r.onerror = u(pn, n, "TestLoadImage: error", !1, t, r), r.onabort = u(pn, n, "TestLoadImage: abort", !1, t, r), r.ontimeout = u(pn, n, "TestLoadImage: timeout", !1, t, r), o.setTimeout(function() {
				r.ontimeout && r.ontimeout();
			}, 1e4), r.src = e;
		} else t(!1);
	}
	function fn(e, t) {
		let n = new it(), r = new AbortController(), i = setTimeout(() => {
			r.abort(), pn(n, "TestPingServer: timeout", !1, t);
		}, 1e4);
		fetch(e, { signal: r.signal }).then((e) => {
			clearTimeout(i), e.ok ? pn(n, "TestPingServer: ok", !0, t) : pn(n, "TestPingServer: server error", !1, t);
		}).catch(() => {
			clearTimeout(i), pn(n, "TestPingServer: error", !1, t);
		});
	}
	function pn(e, t, n, r, i) {
		try {
			i && (i.onload = null, i.onerror = null, i.onabort = null, i.ontimeout = null), r(n);
		} catch {}
	}
	function mn() {
		this.g = new We();
	}
	function hn(e) {
		this.i = e.Sb || null, this.h = e.ab || !1;
	}
	d(hn, Ge), hn.prototype.g = function() {
		return new gn(this.i, this.h);
	};
	function gn(e, t) {
		x.call(this), this.H = e, this.o = t, this.m = void 0, this.status = this.readyState = 0, this.responseType = this.responseText = this.response = this.statusText = "", this.onreadystatechange = null, this.A = new Headers(), this.h = null, this.F = "GET", this.D = "", this.g = !1, this.B = this.j = this.l = null, this.v = new AbortController();
	}
	d(gn, x), e = gn.prototype, e.open = function(e, t) {
		if (this.readyState != 0) throw this.abort(), Error("Error reopening a connection");
		this.F = e, this.D = t, this.readyState = 1, yn(this);
	}, e.send = function(e) {
		if (this.readyState != 1) throw this.abort(), Error("need to call open() first. ");
		if (this.v.signal.aborted) throw this.abort(), Error("Request was aborted.");
		this.g = !0;
		let t = {
			headers: this.A,
			method: this.F,
			credentials: this.m,
			cache: void 0,
			signal: this.v.signal
		};
		e && (t.body = e), (this.H || o).fetch(new Request(this.D, t)).then(this.Pa.bind(this), this.ga.bind(this));
	}, e.abort = function() {
		this.response = this.responseText = "", this.A = new Headers(), this.status = 0, this.v.abort(), this.j && this.j.cancel("Request was aborted.").catch(() => {}), this.readyState >= 1 && this.g && this.readyState != 4 && (this.g = !1, vn(this)), this.readyState = 0;
	}, e.Pa = function(e) {
		if (this.g && (this.l = e, this.h || (this.status = this.l.status, this.statusText = this.l.statusText, this.h = e.headers, this.readyState = 2, yn(this)), this.g && (this.readyState = 3, yn(this), this.g))) if (this.responseType === "arraybuffer") e.arrayBuffer().then(this.Na.bind(this), this.ga.bind(this));
		else if (o.ReadableStream !== void 0 && "body" in e) {
			if (this.j = e.body.getReader(), this.o) {
				if (this.responseType) throw Error("responseType must be empty for \"streamBinaryChunks\" mode responses.");
				this.response = [];
			} else this.response = this.responseText = "", this.B = new TextDecoder();
			_n(this);
		} else e.text().then(this.Oa.bind(this), this.ga.bind(this));
	};
	function _n(e) {
		e.j.read().then(e.Ma.bind(e)).catch(e.ga.bind(e));
	}
	e.Ma = function(e) {
		if (this.g) {
			if (this.o && e.value) this.response.push(e.value);
			else if (!this.o) {
				var t = e.value ? e.value : new Uint8Array();
				(t = this.B.decode(t, { stream: !e.done })) && (this.response = this.responseText += t);
			}
			e.done ? vn(this) : yn(this), this.readyState == 3 && _n(this);
		}
	}, e.Oa = function(e) {
		this.g && (this.response = this.responseText = e, vn(this));
	}, e.Na = function(e) {
		this.g && (this.response = e, vn(this));
	}, e.ga = function() {
		this.g && vn(this);
	};
	function vn(e) {
		e.readyState = 4, e.l = null, e.j = null, e.B = null, yn(e);
	}
	e.setRequestHeader = function(e, t) {
		this.A.append(e, t);
	}, e.getResponseHeader = function(e) {
		return this.h && this.h.get(e.toLowerCase()) || "";
	}, e.getAllResponseHeaders = function() {
		if (!this.h) return "";
		let e = [], t = this.h.entries();
		for (var n = t.next(); !n.done;) n = n.value, e.push(n[0] + ": " + n[1]), n = t.next();
		return e.join("\r\n");
	};
	function yn(e) {
		e.onreadystatechange && e.onreadystatechange.call(e);
	}
	Object.defineProperty(gn.prototype, "withCredentials", {
		get: function() {
			return this.m === "include";
		},
		set: function(e) {
			this.m = e ? "include" : "same-origin";
		}
	});
	function bn(e) {
		let t = "";
		return ge(e, function(e, n) {
			t += n, t += ":", t += e, t += "\r\n";
		}), t;
	}
	function xn(e, t, n) {
		a: {
			for (r in n) {
				var r = !1;
				break a;
			}
			r = !0;
		}
		r || (n = bn(n), typeof e == "string" || w(e, t, n));
	}
	function T(e) {
		x.call(this), this.headers = /* @__PURE__ */ new Map(), this.L = e || null, this.h = !1, this.g = null, this.D = "", this.o = 0, this.l = "", this.j = this.B = this.v = this.A = !1, this.m = null, this.F = "", this.H = !1;
	}
	d(T, x);
	var Sn = /^https?$/i, Cn = ["POST", "PUT"];
	e = T.prototype, e.Fa = function(e) {
		this.H = e;
	}, e.ea = function(e, t, n, r) {
		if (this.g) throw Error("[goog.net.XhrIo] Object is active with another request=" + this.D + "; newUri=" + e);
		t = t ? t.toUpperCase() : "GET", this.D = e, this.l = "", this.o = 0, this.A = !1, this.h = !0, this.g = this.L ? this.L.g() : ft.g(), this.g.onreadystatechange = f(l(this.Ca, this));
		try {
			this.B = !0, this.g.open(t, String(e), !0), this.B = !1;
		} catch (e) {
			wn(this, e);
			return;
		}
		if (e = n || "", n = new Map(this.headers), r) if (Object.getPrototypeOf(r) === Object.prototype) for (var i in r) n.set(i, r[i]);
		else if (typeof r.keys == "function" && typeof r.get == "function") for (let e of r.keys()) n.set(e, r.get(e));
		else throw Error("Unknown input type for opt_headers: " + String(r));
		r = Array.from(n.keys()).find((e) => e.toLowerCase() == "content-type"), i = o.FormData && e instanceof o.FormData, !(Array.prototype.indexOf.call(Cn, t, void 0) >= 0) || r || i || n.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
		for (let [e, t] of n) this.g.setRequestHeader(e, t);
		this.F && (this.g.responseType = this.F), "withCredentials" in this.g && this.g.withCredentials !== this.H && (this.g.withCredentials = this.H);
		try {
			this.m && (clearTimeout(this.m), this.m = null), this.v = !0, this.g.send(e), this.v = !1;
		} catch (e) {
			wn(this, e);
		}
	};
	function wn(e, t) {
		e.h = !1, e.g && (e.j = !0, e.g.abort(), e.j = !1), e.l = t, e.o = 5, Tn(e), Dn(e);
	}
	function Tn(e) {
		e.A || (e.A = !0, S(e, "complete"), S(e, "error"));
	}
	e.abort = function(e) {
		this.g && this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1, this.o = e || 7, S(this, "complete"), S(this, "abort"), Dn(this));
	}, e.N = function() {
		this.g && (this.h && (this.h = !1, this.j = !0, this.g.abort(), this.j = !1), Dn(this, !0)), T.Z.N.call(this);
	}, e.Ca = function() {
		this.u || (this.B || this.v || this.j ? En(this) : this.Xa());
	}, e.Xa = function() {
		En(this);
	};
	function En(e) {
		if (e.h && a !== void 0) {
			if (e.v && On(e) == 4) setTimeout(e.Ca.bind(e), 0);
			else if (S(e, "readystatechange"), On(e) == 4) {
				e.h = !1;
				try {
					let a = e.ca();
					a: switch (a) {
						case 200:
						case 201:
						case 202:
						case 204:
						case 206:
						case 304:
						case 1223:
							var t = !0;
							break a;
						default: t = !1;
					}
					var n;
					if (!(n = t)) {
						var r;
						if (r = a === 0) {
							let t = String(e.D).match(zt)[1] || null;
							!t && o.self && o.self.location && (t = o.self.location.protocol.slice(0, -1)), r = !Sn.test(t ? t.toLowerCase() : "");
						}
						n = r;
					}
					if (n) S(e, "complete"), S(e, "success");
					else {
						e.o = 6;
						try {
							var i = On(e) > 2 ? e.g.statusText : "";
						} catch {
							i = "";
						}
						e.l = i + " [" + e.ca() + "]", Tn(e);
					}
				} finally {
					Dn(e);
				}
			}
		}
	}
	function Dn(e, t) {
		if (e.g) {
			e.m && (clearTimeout(e.m), e.m = null);
			let n = e.g;
			e.g = null, t || S(e, "ready");
			try {
				n.onreadystatechange = null;
			} catch {}
		}
	}
	e.isActive = function() {
		return !!this.g;
	};
	function On(e) {
		return e.g ? e.g.readyState : 0;
	}
	e.ca = function() {
		try {
			return On(this) > 2 ? this.g.status : -1;
		} catch {
			return -1;
		}
	}, e.la = function() {
		try {
			return this.g ? this.g.responseText : "";
		} catch {
			return "";
		}
	}, e.La = function(e) {
		if (this.g) {
			var t = this.g.responseText;
			return e && t.indexOf(e) == 0 && (t = t.substring(e.length)), Ue(t);
		}
	};
	function kn(e) {
		try {
			if (!e.g) return null;
			if ("response" in e.g) return e.g.response;
			switch (e.F) {
				case "":
				case "text": return e.g.responseText;
				case "arraybuffer": if ("mozResponseArrayBuffer" in e.g) return e.g.mozResponseArrayBuffer;
			}
			return null;
		} catch {
			return null;
		}
	}
	function An(e) {
		let t = {};
		e = (e.g && On(e) >= 2 && e.g.getAllResponseHeaders() || "").split("\r\n");
		for (let r = 0; r < e.length; r++) {
			if (ue(e[r])) continue;
			var n = ht(e[r]);
			let i = n[0];
			if (n = n[1], typeof n != "string") continue;
			n = n.trim();
			let a = t[i] || [];
			t[i] = a, a.push(n);
		}
		_e(t, function(e) {
			return e.join(", ");
		});
	}
	e.ya = function() {
		return this.o;
	}, e.Ha = function() {
		return typeof this.l == "string" ? this.l : String(this.l);
	};
	function jn(e, t, n) {
		return n && n.internalChannelParams && n.internalChannelParams[e] || t;
	}
	function Mn(e) {
		this.za = 0, this.i = [], this.j = new it(), this.ba = this.na = this.J = this.W = this.g = this.wa = this.G = this.H = this.u = this.U = this.o = null, this.Ya = this.V = 0, this.Sa = jn("failFast", !1, e), this.F = this.C = this.v = this.m = this.l = null, this.X = !0, this.xa = this.K = -1, this.Y = this.A = this.D = 0, this.Qa = jn("baseRetryDelayMs", 5e3, e), this.Za = jn("retryDelaySeedMs", 1e4, e), this.Ta = jn("forwardChannelMaxRetries", 2, e), this.va = jn("forwardChannelRequestTimeoutMs", 2e4, e), this.ma = e && e.xmlHttpFactory || void 0, this.Ua = e && e.Rb || void 0, this.Aa = e && e.useFetchStreams || !1, this.O = void 0, this.L = e && e.supportsCrossDomainXhr || !1, this.M = "", this.h = new Mt(e && e.concurrentRequestLimit), this.Ba = new mn(), this.S = e && e.fastHandshake || !1, this.R = e && e.encodeInitMessageHeaders || !1, this.S && this.R && (this.R = !1), this.Ra = e && e.Pb || !1, e && e.ua && this.j.ua(), e && e.forceLongPolling && (this.X = !1), this.aa = !this.S && this.X && e && e.detectBufferingProxy || !1, this.ia = void 0, e && e.longPollingTimeout && e.longPollingTimeout > 0 && (this.ia = e.longPollingTimeout), this.ta = void 0, this.T = 0, this.P = !1, this.ja = this.B = null;
	}
	e = Mn.prototype, e.ka = 8, e.I = 1, e.connect = function(e, t, n, r) {
		C(0), this.W = e, this.H = t || {}, n && r !== void 0 && (this.H.OSID = n, this.H.OAID = r), this.F = this.X, this.J = Jn(this, null, this.W), In(this);
	};
	function Nn(e) {
		if (Fn(e), e.I == 3) {
			var t = e.V++, n = Ht(e.J);
			if (w(n, "SID", e.M), w(n, "RID", t), w(n, "TYPE", "terminate"), E(e, n), t = new gt(e, e.j, t), t.M = 2, t.A = Kt(Ht(n)), n = !1, o.navigator && o.navigator.sendBeacon) try {
				n = o.navigator.sendBeacon(t.A.toString(), "");
			} catch {}
			!n && o.Image && (new Image().src = t.A, n = !0), n || (t.g = Yn(t.j, null), t.g.ea(t.A)), t.F = Date.now(), Tt(t);
		}
		qn(e);
	}
	function Pn(e) {
		e.g && (Hn(e), e.g.cancel(), e.g = null);
	}
	function Fn(e) {
		Pn(e), e.v && (o.clearTimeout(e.v), e.v = null), Un(e), e.h.cancel(), e.m && (typeof e.m == "number" && o.clearTimeout(e.m), e.m = null);
	}
	function In(e) {
		if (!Nt(e.h) && !e.m) {
			e.m = !0;
			var t = e.Ea;
			re || oe(), ie || (re(), ie = !0), ae.add(t, e), e.D = 0;
		}
	}
	function Ln(e, t) {
		return Pt(e.h) >= e.h.j - +!!e.m ? !1 : e.m ? (e.i = t.G.concat(e.i), !0) : e.I == 1 || e.I == 2 || e.D >= (e.Sa ? 0 : e.Ta) ? !1 : (e.m = rt(l(e.Ea, e, t), Gn(e, e.D)), e.D++, !0);
	}
	e.Ea = function(e) {
		if (this.m) if (this.m = null, this.I == 1) {
			if (!e) {
				this.V = Math.floor(Math.random() * 1e5), e = this.V++;
				let i = new gt(this, this.j, e), a = this.o;
				if (this.U && (a ? (a = ve(a), be(a, this.U)) : a = this.U), this.u !== null || this.R || (i.J = a, a = null), this.S) a: {
					for (var t = 0, n = 0; n < this.i.length; n++) {
						b: {
							var r = this.i[n];
							if ("__data__" in r.map && (r = r.map.__data__, typeof r == "string")) {
								r = r.length;
								break b;
							}
							r = void 0;
						}
						if (r === void 0) break;
						if (t += r, t > 4096) {
							t = n;
							break a;
						}
						if (t === 4096 || n === this.i.length - 1) {
							t = n + 1;
							break a;
						}
					}
					t = 1e3;
				}
				else t = 1e3;
				t = zn(this, i, t), n = Ht(this.J), w(n, "RID", e), w(n, "CVER", 22), this.G && w(n, "X-HTTP-Session-Id", this.G), E(this, n), a && (this.R ? t = "headers=" + mt(bn(a)) + "&" + t : this.u && xn(n, this.u, a)), It(this.h, i), this.Ra && w(n, "TYPE", "init"), this.S ? (w(n, "$req", t), w(n, "SID", "null"), i.U = !0, bt(i, n, null)) : bt(i, n, t), this.I = 2;
			}
		} else this.I == 3 && (e ? Rn(this, e) : this.i.length == 0 || Nt(this.h) || Rn(this));
	};
	function Rn(e, t) {
		var n = t ? t.l : e.V++;
		let r = Ht(e.J);
		w(r, "SID", e.M), w(r, "RID", n), w(r, "AID", e.K), E(e, r), e.u && e.o && xn(r, e.u, e.o), n = new gt(e, e.j, n, e.D + 1), e.u === null && (n.J = e.o), t && (e.i = t.G.concat(e.i)), t = zn(e, n, 1e3), n.H = Math.round(e.va * .5) + Math.round(e.va * .5 * Math.random()), It(e.h, n), bt(n, r, t);
	}
	function E(e, t) {
		e.H && ge(e.H, function(e, n) {
			w(t, n, e);
		}), e.l && ge({}, function(e, n) {
			w(t, n, e);
		});
	}
	function zn(e, t, n) {
		n = Math.min(e.i.length, n);
		let r = e.l ? l(e.l.Ka, e.l, e) : null;
		a: {
			var i = e.i;
			let t = -1;
			for (;;) {
				let e = ["count=" + n];
				t == -1 ? n > 0 ? (t = i[0].g, e.push("ofs=" + t)) : t = 0 : e.push("ofs=" + t);
				let c = !0;
				for (let l = 0; l < n; l++) {
					var a = i[l].g;
					let n = i[l].map;
					if (a -= t, a < 0) t = Math.max(0, i[l].g - 100), c = !1;
					else try {
						a = "req" + a + "_" || "";
						try {
							var o = n instanceof Map ? n : Object.entries(n);
							for (let [t, n] of o) {
								let r = n;
								s(n) && (r = He(n)), e.push(a + t + "=" + encodeURIComponent(r));
							}
						} catch (t) {
							throw e.push(a + "type=_badmap"), t;
						}
					} catch {
						r && r(n);
					}
				}
				if (c) {
					o = e.join("&");
					break a;
				}
			}
			o = void 0;
		}
		return e = e.i.splice(0, n), t.G = e, o;
	}
	function Bn(e) {
		if (!e.g && !e.v) {
			e.Y = 1;
			var t = e.Da;
			re || oe(), ie || (re(), ie = !0), ae.add(t, e), e.A = 0;
		}
	}
	function Vn(e) {
		return e.g || e.v || e.A >= 3 ? !1 : (e.Y++, e.v = rt(l(e.Da, e), Gn(e, e.A)), e.A++, !0);
	}
	e.Da = function() {
		if (this.v = null, D(this), this.aa && !(this.P || this.g == null || this.T <= 0)) {
			var e = 4 * this.T;
			this.j.info("BP detection timer enabled: " + e), this.B = rt(l(this.Wa, this), e);
		}
	}, e.Wa = function() {
		this.B && (this.B = null, this.j.info("BP detection timeout reached."), this.j.info("Buffering proxy detected and switch to long-polling!"), this.F = !1, this.P = !0, C(10), Pn(this), D(this));
	};
	function Hn(e) {
		e.B != null && (o.clearTimeout(e.B), e.B = null);
	}
	function D(e) {
		e.g = new gt(e, e.j, "rpc", e.Y), e.u === null && (e.g.J = e.o), e.g.P = 0;
		var t = Ht(e.na);
		w(t, "RID", "rpc"), w(t, "SID", e.M), w(t, "AID", e.K), w(t, "CI", e.F ? "0" : "1"), !e.F && e.ia && w(t, "TO", e.ia), w(t, "TYPE", "xmlhttp"), E(e, t), e.u && e.o && xn(t, e.u, e.o), e.O && (e.g.H = e.O);
		var n = e.g;
		e = e.ba, n.M = 1, n.A = Kt(Ht(t)), n.u = null, n.R = !0, xt(n, e);
	}
	e.Va = function() {
		this.C != null && (this.C = null, Pn(this), Vn(this), C(19));
	};
	function Un(e) {
		e.C != null && (o.clearTimeout(e.C), e.C = null);
	}
	function Wn(e, t) {
		var n = null;
		if (e.g == t) {
			Un(e), Hn(e), e.g = null;
			var r = 2;
		} else if (Ft(e.h, t)) n = t.G, Lt(e.h, t), r = 1;
		else return;
		if (e.I != 0) {
			if (t.o) if (r == 1) {
				n = t.u ? t.u.length : 0, t = Date.now() - t.F;
				var i = e.D;
				r = Qe(), S(r, new nt(r, n)), In(e);
			} else Bn(e);
			else if (i = t.m, i == 3 || i == 0 && t.X > 0 || !(r == 1 && Ln(e, t) || r == 2 && Vn(e))) switch (n && n.length > 0 && (t = e.h, t.i = t.i.concat(n)), i) {
				case 1:
					Kn(e, 5);
					break;
				case 4:
					Kn(e, 10);
					break;
				case 3:
					Kn(e, 6);
					break;
				default: Kn(e, 2);
			}
		}
	}
	function Gn(e, t) {
		let n = e.Qa + Math.floor(Math.random() * e.Za);
		return e.isActive() || (n *= 2), n * t;
	}
	function Kn(e, t) {
		if (e.j.info("Error code " + t), t == 2) {
			var n = l(e.bb, e), r = e.Ua;
			let t = !r;
			r = new Vt(r || "//www.google.com/images/cleardot.gif"), o.location && o.location.protocol == "http" || Ut(r, "https"), Kt(r), t ? dn(r.toString(), n) : fn(r.toString(), n);
		} else C(2);
		e.I = 0, e.l && e.l.pa(t), qn(e), Fn(e);
	}
	e.bb = function(e) {
		e ? (this.j.info("Successfully pinged google.com"), C(2)) : (this.j.info("Failed to ping google.com"), C(1));
	};
	function qn(e) {
		if (e.I = 0, e.ja = [], e.l) {
			let t = Rt(e.h);
			(t.length != 0 || e.i.length != 0) && (m(e.ja, t), m(e.ja, e.i), e.h.i.length = 0, p(e.i), e.i.length = 0), e.l.oa();
		}
	}
	function Jn(e, t, n) {
		var r = n instanceof Vt ? Ht(n) : new Vt(n);
		if (r.g != "") t && (r.g = t + "." + r.g), Wt(r, r.u);
		else {
			var i = o.location;
			r = i.protocol, t = t ? t + "." + i.hostname : i.hostname, i = +i.port;
			let e = new Vt(null);
			r && Ut(e, r), t && (e.g = t), i && Wt(e, i), n && (e.h = n), r = e;
		}
		return n = e.G, t = e.wa, n && t && w(r, n, t), w(r, "VER", e.ka), E(e, r), r;
	}
	function Yn(e, t, n) {
		if (t && !e.L) throw Error("Can't create secondary domain capable XhrIo object.");
		return t = e.Aa && !e.ma ? new T(new hn({ ab: n })) : new T(e.ma), t.Fa(e.L), t;
	}
	e.isActive = function() {
		return !!this.l && this.l.isActive(this);
	};
	function Xn() {}
	e = Xn.prototype, e.ra = function() {}, e.qa = function() {}, e.pa = function() {}, e.oa = function() {}, e.isActive = function() {
		return !0;
	}, e.Ka = function() {};
	function Zn() {}
	Zn.prototype.g = function(e, t) {
		return new Qn(e, t);
	};
	function Qn(e, t) {
		x.call(this), this.g = new Mn(t), this.l = e, this.h = t && t.messageUrlParams || null, e = t && t.messageHeaders || null, t && t.clientProtocolHeaderRequired && (e ? e["X-Client-Protocol"] = "webchannel" : e = { "X-Client-Protocol": "webchannel" }), this.g.o = e, e = t && t.initMessageHeaders || null, t && t.messageContentType && (e ? e["X-WebChannel-Content-Type"] = t.messageContentType : e = { "X-WebChannel-Content-Type": t.messageContentType }), t && t.sa && (e ? e["X-WebChannel-Client-Profile"] = t.sa : e = { "X-WebChannel-Client-Profile": t.sa }), this.g.U = e, (e = t && t.Qb) && !ue(e) && (this.g.u = e), this.A = t && t.supportsCrossDomainXhr || !1, this.v = t && t.sendRawJson || !1, (t = t && t.httpSessionIdParam) && !ue(t) && (this.g.G = t, e = this.h, e !== null && t in e && (e = this.h, t in e && delete e[t])), this.j = new tr(this);
	}
	d(Qn, x), Qn.prototype.m = function() {
		this.g.l = this.j, this.A && (this.g.L = !0), this.g.connect(this.l, this.h || void 0);
	}, Qn.prototype.close = function() {
		Nn(this.g);
	}, Qn.prototype.o = function(e) {
		var t = this.g;
		if (typeof e == "string") {
			var n = {};
			n.__data__ = e, e = n;
		} else this.v && (n = {}, n.__data__ = He(e), e = n);
		t.i.push(new jt(t.Ya++, e)), t.I == 3 && In(t);
	}, Qn.prototype.N = function() {
		this.g.l = null, delete this.j, Nn(this.g), delete this.g, Qn.Z.N.call(this);
	};
	function $n(e) {
		Je.call(this), e.__headers__ && (this.headers = e.__headers__, this.statusCode = e.__status__, delete e.__headers__, delete e.__status__);
		var t = e.__sm__;
		if (t) {
			a: {
				for (let n in t) {
					e = n;
					break a;
				}
				e = void 0;
			}
			(this.i = e) && (e = this.i, t = t !== null && e in t ? t[e] : void 0), this.data = t;
		} else this.data = e;
	}
	d($n, Je);
	function er() {
		Ye.call(this), this.status = 1;
	}
	d(er, Ye);
	function tr(e) {
		this.g = e;
	}
	d(tr, Xn), tr.prototype.ra = function() {
		S(this.g, "a");
	}, tr.prototype.qa = function(e) {
		S(this.g, new $n(e));
	}, tr.prototype.pa = function(e) {
		S(this.g, new er());
	}, tr.prototype.oa = function() {
		S(this.g, "b");
	}, Zn.prototype.createWebChannel = Zn.prototype.g, Qn.prototype.send = Qn.prototype.o, Qn.prototype.open = Qn.prototype.m, Qn.prototype.close = Qn.prototype.close, dc = rc.createWebChannelTransport = function() {
		return new Zn();
	}, uc = rc.getStatEventTarget = function() {
		return Qe();
	}, lc = rc.Event = Xe, cc = rc.Stat = {
		jb: 0,
		mb: 1,
		nb: 2,
		Hb: 3,
		Mb: 4,
		Jb: 5,
		Kb: 6,
		Ib: 7,
		Gb: 8,
		Lb: 9,
		PROXY: 10,
		NOPROXY: 11,
		Eb: 12,
		Ab: 13,
		Bb: 14,
		zb: 15,
		Cb: 16,
		Db: 17,
		fb: 18,
		eb: 19,
		gb: 20
	}, ut.NO_ERROR = 0, ut.TIMEOUT = 8, ut.HTTP_ERROR = 6, sc = rc.ErrorCode = ut, dt.COMPLETE = "complete", oc = rc.EventType = dt, Ke.EventType = qe, qe.OPEN = "a", qe.CLOSE = "b", qe.ERROR = "c", qe.MESSAGE = "d", x.prototype.listen = x.prototype.J, ac = rc.WebChannel = Ke, rc.FetchXmlHttpFactory = hn, T.prototype.listenOnce = T.prototype.K, T.prototype.getLastError = T.prototype.Ha, T.prototype.getLastErrorCode = T.prototype.ya, T.prototype.getStatus = T.prototype.ca, T.prototype.getResponseJson = T.prototype.La, T.prototype.getResponseText = T.prototype.la, T.prototype.send = T.prototype.ea, T.prototype.setWithCredentials = T.prototype.Fa, ic = rc.XhrIo = T;
}).apply(nc === void 0 ? typeof self < "u" ? self : typeof window < "u" ? window : {} : nc);
//#endregion
//#region node_modules/@firebase/firestore/dist/common-b3e8012f.esm.js
var A = class {
	constructor(e) {
		this.uid = e;
	}
	isAuthenticated() {
		return this.uid != null;
	}
	toKey() {
		return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
	}
	isEqual(e) {
		return e.uid === this.uid;
	}
};
A.UNAUTHENTICATED = new A(null), A.GOOGLE_CREDENTIALS = new A("google-credentials-uid"), A.FIRST_PARTY = new A("first-party-uid"), A.MOCK_USER = new A("mock-user");
var fc = "12.14.0";
function pc(e) {
	fc = e;
}
var mc = new Ie("@firebase/firestore");
function hc() {
	return mc.logLevel;
}
function j(e, ...t) {
	if (mc.logLevel <= b.DEBUG) {
		let n = t.map(vc);
		mc.debug(`Firestore (${fc}): ${e}`, ...n);
	}
}
function gc(e, ...t) {
	if (mc.logLevel <= b.ERROR) {
		let n = t.map(vc);
		mc.error(`Firestore (${fc}): ${e}`, ...n);
	}
}
function _c(e, ...t) {
	if (mc.logLevel <= b.WARN) {
		let n = t.map(vc);
		mc.warn(`Firestore (${fc}): ${e}`, ...n);
	}
}
function vc(e) {
	if (typeof e == "string") return e;
	try {
		return function(e) {
			return JSON.stringify(e);
		}(e);
	} catch {
		return e;
	}
}
function M(e, t, n) {
	let r = "Unexpected state";
	typeof t == "string" ? r = t : n = t, yc(e, r, n);
}
function yc(e, t, n) {
	let r = `FIRESTORE (${fc}) INTERNAL ASSERTION FAILED: ${t} (ID: ${e.toString(16)})`;
	if (n !== void 0) try {
		r += " CONTEXT: " + JSON.stringify(n);
	} catch {
		r += " CONTEXT: " + n;
	}
	throw gc(r), Error(r);
}
function N(e, t, n, r) {
	let i = "Unexpected state";
	typeof n == "string" ? i = n : r = n, e || yc(t, i, r);
}
function P(e, t) {
	return e;
}
var F = {
	OK: "ok",
	CANCELLED: "cancelled",
	UNKNOWN: "unknown",
	INVALID_ARGUMENT: "invalid-argument",
	DEADLINE_EXCEEDED: "deadline-exceeded",
	NOT_FOUND: "not-found",
	ALREADY_EXISTS: "already-exists",
	PERMISSION_DENIED: "permission-denied",
	UNAUTHENTICATED: "unauthenticated",
	RESOURCE_EXHAUSTED: "resource-exhausted",
	FAILED_PRECONDITION: "failed-precondition",
	ABORTED: "aborted",
	OUT_OF_RANGE: "out-of-range",
	UNIMPLEMENTED: "unimplemented",
	INTERNAL: "internal",
	UNAVAILABLE: "unavailable",
	DATA_LOSS: "data-loss"
}, I = class extends de {
	constructor(e, t) {
		super(e, t), this.code = e, this.message = t, this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
	}
}, bc = class {
	constructor() {
		this.promise = new Promise(((e, t) => {
			this.resolve = e, this.reject = t;
		}));
	}
}, xc = class {
	constructor(e, t) {
		this.user = t, this.type = "OAuth", this.headers = /* @__PURE__ */ new Map(), this.headers.set("Authorization", `Bearer ${e}`);
	}
}, Sc = class {
	getToken() {
		return Promise.resolve(null);
	}
	invalidateToken() {}
	start(e, t) {
		e.enqueueRetryable((() => t(A.UNAUTHENTICATED)));
	}
	shutdown() {}
}, Cc = class {
	constructor(e) {
		this.token = e, this.changeListener = null;
	}
	getToken() {
		return Promise.resolve(this.token);
	}
	invalidateToken() {}
	start(e, t) {
		this.changeListener = t, e.enqueueRetryable((() => t(this.token.user)));
	}
	shutdown() {
		this.changeListener = null;
	}
}, wc = class {
	constructor(e) {
		this.t = e, this.currentUser = A.UNAUTHENTICATED, this.i = 0, this.forceRefresh = !1, this.auth = null;
	}
	start(e, t) {
		N(this.o === void 0, 42304);
		let n = this.i, r = (e) => this.i === n ? Promise.resolve() : (n = this.i, t(e)), i = new bc();
		this.o = () => {
			this.i++, this.currentUser = this.u(), i.resolve(), i = new bc(), e.enqueueRetryable((() => r(this.currentUser)));
		};
		let a = () => {
			let t = i;
			e.enqueueRetryable((async () => {
				await t.promise, await r(this.currentUser);
			}));
		}, o = (e) => {
			j("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = e, this.o && (this.auth.addAuthTokenListener(this.o), a());
		};
		this.t.onInit(((e) => o(e))), setTimeout((() => {
			if (!this.auth) {
				let e = this.t.getImmediate({ optional: !0 });
				e ? o(e) : (j("FirebaseAuthCredentialsProvider", "Auth not yet detected"), i.resolve(), i = new bc());
			}
		}), 0), a();
	}
	getToken() {
		let e = this.i, t = this.forceRefresh;
		return this.forceRefresh = !1, this.auth ? this.auth.getToken(t).then(((t) => this.i === e ? t ? (N(typeof t.accessToken == "string", 31837, { l: t }), new xc(t.accessToken, this.currentUser)) : null : (j("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), this.getToken()))) : Promise.resolve(null);
	}
	invalidateToken() {
		this.forceRefresh = !0;
	}
	shutdown() {
		this.auth && this.o && this.auth.removeAuthTokenListener(this.o), this.o = void 0;
	}
	u() {
		let e = this.auth && this.auth.getUid();
		return N(e === null || typeof e == "string", 2055, { h: e }), new A(e);
	}
}, Tc = class {
	constructor(e, t, n) {
		this.P = e, this.T = t, this.I = n, this.type = "FirstParty", this.user = A.FIRST_PARTY, this.R = /* @__PURE__ */ new Map();
	}
	A() {
		return this.I ? this.I() : null;
	}
	get headers() {
		this.R.set("X-Goog-AuthUser", this.P);
		let e = this.A();
		return e && this.R.set("Authorization", e), this.T && this.R.set("X-Goog-Iam-Authorization-Token", this.T), this.R;
	}
}, Ec = class {
	constructor(e, t, n) {
		this.P = e, this.T = t, this.I = n;
	}
	getToken() {
		return Promise.resolve(new Tc(this.P, this.T, this.I));
	}
	start(e, t) {
		e.enqueueRetryable((() => t(A.FIRST_PARTY)));
	}
	shutdown() {}
	invalidateToken() {}
}, Dc = class {
	constructor(e) {
		this.value = e, this.type = "AppCheck", this.headers = /* @__PURE__ */ new Map(), e && e.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
	}
}, Oc = class {
	constructor(e, t) {
		this.V = t, this.forceRefresh = !1, this.appCheck = null, this.m = null, this.p = null, Gt(e) && e.settings.appCheckToken && (this.p = e.settings.appCheckToken);
	}
	start(e, t) {
		N(this.o === void 0, 3512);
		let n = (e) => {
			e.error != null && j("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${e.error.message}`);
			let n = e.token !== this.m;
			return this.m = e.token, j("FirebaseAppCheckTokenProvider", `Received ${n ? "new" : "existing"} token.`), n ? t(e.token) : Promise.resolve();
		};
		this.o = (t) => {
			e.enqueueRetryable((() => n(t)));
		};
		let r = (e) => {
			j("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = e, this.o && this.appCheck.addTokenListener(this.o);
		};
		this.V.onInit(((e) => r(e))), setTimeout((() => {
			if (!this.appCheck) {
				let e = this.V.getImmediate({ optional: !0 });
				e ? r(e) : j("FirebaseAppCheckTokenProvider", "AppCheck not yet detected");
			}
		}), 0);
	}
	getToken() {
		if (this.p) return Promise.resolve(new Dc(this.p));
		let e = this.forceRefresh;
		return this.forceRefresh = !1, this.appCheck ? this.appCheck.getToken(e).then(((e) => e ? (N(typeof e.token == "string", 44558, { tokenResult: e }), this.m = e.token, new Dc(e.token)) : null)) : Promise.resolve(null);
	}
	invalidateToken() {
		this.forceRefresh = !0;
	}
	shutdown() {
		this.appCheck && this.o && this.appCheck.removeTokenListener(this.o), this.o = void 0;
	}
};
function kc(e) {
	let t = typeof self < "u" && (self.crypto || self.msCrypto), n = new Uint8Array(e);
	if (t && typeof t.getRandomValues == "function") t.getRandomValues(n);
	else for (let t = 0; t < e; t++) n[t] = Math.floor(256 * Math.random());
	return n;
}
var Ac = class {
	static newId() {
		let e = "";
		for (; e.length < 20;) {
			let t = kc(40);
			for (let n = 0; n < t.length; ++n) e.length < 20 && t[n] < 248 && (e += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(t[n] % 62));
		}
		return e;
	}
};
function L(e, t) {
	return e < t ? -1 : +(e > t);
}
function jc(e, t) {
	let n = Math.min(e.length, t.length);
	for (let r = 0; r < n; r++) {
		let n = e.charAt(r), i = t.charAt(r);
		if (n !== i) return Pc(n) === Pc(i) ? L(n, i) : Pc(n) ? 1 : -1;
	}
	return L(e.length, t.length);
}
var Mc = 55296, Nc = 57343;
function Pc(e) {
	let t = e.charCodeAt(0);
	return t >= Mc && t <= Nc;
}
function Fc(e, t, n) {
	return e.length === t.length && e.every(((e, r) => n(e, t[r])));
}
var Ic = "__name__", Lc = class e {
	constructor(e, t, n) {
		t === void 0 ? t = 0 : t > e.length && M(637, {
			offset: t,
			range: e.length
		}), n === void 0 ? n = e.length - t : n > e.length - t && M(1746, {
			length: n,
			range: e.length - t
		}), this.segments = e, this.offset = t, this.len = n;
	}
	get length() {
		return this.len;
	}
	isEqual(t) {
		return e.comparator(this, t) === 0;
	}
	child(t) {
		let n = this.segments.slice(this.offset, this.limit());
		return t instanceof e ? t.forEach(((e) => {
			n.push(e);
		})) : n.push(t), this.construct(n);
	}
	limit() {
		return this.offset + this.length;
	}
	popFirst(e) {
		return e = e === void 0 ? 1 : e, this.construct(this.segments, this.offset + e, this.length - e);
	}
	popLast() {
		return this.construct(this.segments, this.offset, this.length - 1);
	}
	firstSegment() {
		return this.segments[this.offset];
	}
	lastSegment() {
		return this.get(this.length - 1);
	}
	get(e) {
		return this.segments[this.offset + e];
	}
	isEmpty() {
		return this.length === 0;
	}
	isPrefixOf(e) {
		if (e.length < this.length) return !1;
		for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
		return !0;
	}
	isImmediateParentOf(e) {
		if (this.length + 1 !== e.length) return !1;
		for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return !1;
		return !0;
	}
	forEach(e) {
		for (let t = this.offset, n = this.limit(); t < n; t++) e(this.segments[t]);
	}
	toArray() {
		return this.segments.slice(this.offset, this.limit());
	}
	static comparator(t, n) {
		let r = Math.min(t.length, n.length);
		for (let i = 0; i < r; i++) {
			let r = e.compareSegments(t.get(i), n.get(i));
			if (r !== 0) return r;
		}
		return L(t.length, n.length);
	}
	static compareSegments(t, n) {
		let r = e.isNumericId(t), i = e.isNumericId(n);
		return r && !i ? -1 : !r && i ? 1 : r && i ? e.extractNumericId(t).compare(e.extractNumericId(n)) : jc(t, n);
	}
	static isNumericId(e) {
		return e.startsWith("__id") && e.endsWith("__");
	}
	static extractNumericId(e) {
		return ec.fromString(e.substring(4, e.length - 2));
	}
}, R = class e extends Lc {
	construct(t, n, r) {
		return new e(t, n, r);
	}
	canonicalString() {
		return this.toArray().join("/");
	}
	toString() {
		return this.canonicalString();
	}
	toUriEncodedString() {
		return this.toArray().map(encodeURIComponent).join("/");
	}
	static fromString(...t) {
		let n = [];
		for (let e of t) {
			if (e.indexOf("//") >= 0) throw new I(F.INVALID_ARGUMENT, `Invalid segment (${e}). Paths must not contain // in them.`);
			n.push(...e.split("/").filter(((e) => e.length > 0)));
		}
		return new e(n);
	}
	static emptyPath() {
		return new e([]);
	}
}, Rc = /^[_a-zA-Z][_a-zA-Z0-9]*$/, zc = class e extends Lc {
	construct(t, n, r) {
		return new e(t, n, r);
	}
	static isValidIdentifier(e) {
		return Rc.test(e);
	}
	canonicalString() {
		return this.toArray().map(((t) => (t = t.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), e.isValidIdentifier(t) || (t = "`" + t + "`"), t))).join(".");
	}
	toString() {
		return this.canonicalString();
	}
	isKeyField() {
		return this.length === 1 && this.get(0) === "__name__";
	}
	static keyField() {
		return new e([Ic]);
	}
	static fromServerFormat(t) {
		let n = [], r = "", i = 0, a = () => {
			if (r.length === 0) throw new I(F.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
			n.push(r), r = "";
		}, o = !1;
		for (; i < t.length;) {
			let e = t[i];
			if (e === "\\") {
				if (i + 1 === t.length) throw new I(F.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
				let e = t[i + 1];
				if (e !== "\\" && e !== "." && e !== "`") throw new I(F.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
				r += e, i += 2;
			} else e === "`" ? (o = !o, i++) : e !== "." || o ? (r += e, i++) : (a(), i++);
		}
		if (a(), o) throw new I(F.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
		return new e(n);
	}
	static emptyPath() {
		return new e([]);
	}
}, z = class e {
	constructor(e) {
		this.path = e;
	}
	static fromPath(t) {
		return new e(R.fromString(t));
	}
	static fromName(t) {
		return new e(R.fromString(t).popFirst(5));
	}
	static empty() {
		return new e(R.emptyPath());
	}
	get collectionGroup() {
		return this.path.popLast().lastSegment();
	}
	hasCollectionId(e) {
		return this.path.length >= 2 && this.path.get(this.path.length - 2) === e;
	}
	getCollectionGroup() {
		return this.path.get(this.path.length - 2);
	}
	getCollectionPath() {
		return this.path.popLast();
	}
	isEqual(e) {
		return e !== null && R.comparator(this.path, e.path) === 0;
	}
	toString() {
		return this.path.toString();
	}
	static comparator(e, t) {
		return R.comparator(e.path, t.path);
	}
	static isDocumentKey(e) {
		return e.length % 2 == 0;
	}
	static fromSegments(t) {
		return new e(new R(t.slice()));
	}
};
function Bc(e, t, n) {
	if (!n) throw new I(F.INVALID_ARGUMENT, `Function ${e}() cannot be called with an empty ${t}.`);
}
function Vc(e, t, n, r) {
	if (!0 === t && !0 === r) throw new I(F.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
}
function Hc(e) {
	if (!z.isDocumentKey(e)) throw new I(F.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`);
}
function Uc(e) {
	return typeof e == "object" && !!e && (Object.getPrototypeOf(e) === Object.prototype || Object.getPrototypeOf(e) === null);
}
function Wc(e) {
	if (e === void 0) return "undefined";
	if (e === null) return "null";
	if (typeof e == "string") return e.length > 20 && (e = `${e.substring(0, 20)}...`), JSON.stringify(e);
	if (typeof e == "number" || typeof e == "boolean") return "" + e;
	if (typeof e == "object") {
		if (e instanceof Array) return "an array";
		{
			let t = function(e) {
				return e.constructor ? e.constructor.name : null;
			}(e);
			return t ? `a custom ${t} object` : "an object";
		}
	}
	return typeof e == "function" ? "a function" : M(12329, { type: typeof e });
}
function Gc(e, t) {
	if ("_delegate" in e && (e = e._delegate), !(e instanceof t)) {
		if (t.name === e.constructor.name) throw new I(F.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
		{
			let n = Wc(e);
			throw new I(F.INVALID_ARGUMENT, `Expected type '${t.name}', but it was: ${n}`);
		}
	}
	return e;
}
function B(e, t) {
	let n = { typeString: e };
	return t && (n.value = t), n;
}
function Kc(e, t) {
	if (!Uc(e)) throw new I(F.INVALID_ARGUMENT, "JSON must be an object");
	let n;
	for (let r in t) if (t[r]) {
		let i = t[r].typeString, a = "value" in t[r] ? { value: t[r].value } : void 0;
		if (!(r in e)) {
			n = `JSON missing required field: '${r}'`;
			break;
		}
		let o = e[r];
		if (i && typeof o !== i) {
			n = `JSON field '${r}' must be a ${i}.`;
			break;
		}
		if (a !== void 0 && o !== a.value) {
			n = `Expected '${r}' field to equal '${a.value}'`;
			break;
		}
	}
	if (n) throw new I(F.INVALID_ARGUMENT, n);
	return !0;
}
var qc = -62135596800, Jc = 1e6, V = class e {
	static now() {
		return e.fromMillis(Date.now());
	}
	static fromDate(t) {
		return e.fromMillis(t.getTime());
	}
	static fromMillis(t) {
		let n = Math.floor(t / 1e3);
		return new e(n, Math.floor((t - 1e3 * n) * Jc));
	}
	constructor(e, t) {
		if (this.seconds = e, this.nanoseconds = t, t < 0 || t >= 1e9) throw new I(F.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
		if (e < qc || e >= 253402300800) throw new I(F.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
	}
	toDate() {
		return new Date(this.toMillis());
	}
	toMillis() {
		return 1e3 * this.seconds + this.nanoseconds / Jc;
	}
	_compareTo(e) {
		return this.seconds === e.seconds ? L(this.nanoseconds, e.nanoseconds) : L(this.seconds, e.seconds);
	}
	isEqual(e) {
		return e.seconds === this.seconds && e.nanoseconds === this.nanoseconds;
	}
	toString() {
		return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
	}
	toJSON() {
		return {
			type: e._jsonSchemaVersion,
			seconds: this.seconds,
			nanoseconds: this.nanoseconds
		};
	}
	static fromJSON(t) {
		if (Kc(t, e._jsonSchema)) return new e(t.seconds, t.nanoseconds);
	}
	valueOf() {
		let e = this.seconds - qc;
		return String(e).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
	}
};
V._jsonSchemaVersion = "firestore/timestamp/1.0", V._jsonSchema = {
	type: B("string", V._jsonSchemaVersion),
	seconds: B("number"),
	nanoseconds: B("number")
};
var H = class e {
	static fromTimestamp(t) {
		return new e(t);
	}
	static min() {
		return new e(new V(0, 0));
	}
	static max() {
		return new e(new V(253402300799, 999999999));
	}
	constructor(e) {
		this.timestamp = e;
	}
	compareTo(e) {
		return this.timestamp._compareTo(e.timestamp);
	}
	isEqual(e) {
		return this.timestamp.isEqual(e.timestamp);
	}
	toMicroseconds() {
		return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
	}
	toString() {
		return "SnapshotVersion(" + this.timestamp.toString() + ")";
	}
	toTimestamp() {
		return this.timestamp;
	}
}, Yc = -1, Xc = class {
	constructor(e, t, n, r) {
		this.indexId = e, this.collectionGroup = t, this.fields = n, this.indexState = r;
	}
};
Xc.UNKNOWN_ID = -1;
function Zc(e, t) {
	let n = e.toTimestamp().seconds, r = e.toTimestamp().nanoseconds + 1;
	return new $c(H.fromTimestamp(r === 1e9 ? new V(n + 1, 0) : new V(n, r)), z.empty(), t);
}
function Qc(e) {
	return new $c(e.readTime, e.key, Yc);
}
var $c = class e {
	constructor(e, t, n) {
		this.readTime = e, this.documentKey = t, this.largestBatchId = n;
	}
	static min() {
		return new e(H.min(), z.empty(), Yc);
	}
	static max() {
		return new e(H.max(), z.empty(), Yc);
	}
};
function el(e, t) {
	let n = e.readTime.compareTo(t.readTime);
	return n === 0 ? (n = z.comparator(e.documentKey, t.documentKey), n === 0 ? L(e.largestBatchId, t.largestBatchId) : n) : n;
}
var tl = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.", nl = class {
	constructor() {
		this.onCommittedListeners = [];
	}
	addOnCommittedListener(e) {
		this.onCommittedListeners.push(e);
	}
	raiseOnCommittedEvent() {
		this.onCommittedListeners.forEach(((e) => e()));
	}
};
async function rl(e) {
	if (e.code !== F.FAILED_PRECONDITION || e.message !== tl) throw e;
	j("LocalStore", "Unexpectedly lost primary lease");
}
var U = class e {
	constructor(e) {
		this.nextCallback = null, this.catchCallback = null, this.result = void 0, this.error = void 0, this.isDone = !1, this.callbackAttached = !1, e(((e) => {
			this.isDone = !0, this.result = e, this.nextCallback && this.nextCallback(e);
		}), ((e) => {
			this.isDone = !0, this.error = e, this.catchCallback && this.catchCallback(e);
		}));
	}
	catch(e) {
		return this.next(void 0, e);
	}
	next(t, n) {
		return this.callbackAttached && M(59440), this.callbackAttached = !0, this.isDone ? this.error ? this.wrapFailure(n, this.error) : this.wrapSuccess(t, this.result) : new e(((e, r) => {
			this.nextCallback = (n) => {
				this.wrapSuccess(t, n).next(e, r);
			}, this.catchCallback = (t) => {
				this.wrapFailure(n, t).next(e, r);
			};
		}));
	}
	toPromise() {
		return new Promise(((e, t) => {
			this.next(e, t);
		}));
	}
	wrapUserFunction(t) {
		try {
			let n = t();
			return n instanceof e ? n : e.resolve(n);
		} catch (t) {
			return e.reject(t);
		}
	}
	wrapSuccess(t, n) {
		return t ? this.wrapUserFunction((() => t(n))) : e.resolve(n);
	}
	wrapFailure(t, n) {
		return t ? this.wrapUserFunction((() => t(n))) : e.reject(n);
	}
	static resolve(t) {
		return new e(((e, n) => {
			e(t);
		}));
	}
	static reject(t) {
		return new e(((e, n) => {
			n(t);
		}));
	}
	static waitFor(t) {
		return new e(((e, n) => {
			let r = 0, i = 0, a = !1;
			t.forEach(((t) => {
				++r, t.next((() => {
					++i, a && i === r && e();
				}), ((e) => n(e)));
			})), a = !0, i === r && e();
		}));
	}
	static or(t) {
		let n = e.resolve(!1);
		for (let r of t) n = n.next(((t) => t ? e.resolve(t) : r()));
		return n;
	}
	static forEach(e, t) {
		let n = [];
		return e.forEach(((e, r) => {
			n.push(t.call(this, e, r));
		})), this.waitFor(n);
	}
	static mapArray(t, n) {
		return new e(((e, r) => {
			let i = t.length, a = Array(i), o = 0;
			for (let s = 0; s < i; s++) {
				let c = s;
				n(t[c]).next(((t) => {
					a[c] = t, ++o, o === i && e(a);
				}), ((e) => r(e)));
			}
		}));
	}
	static doWhile(t, n) {
		return new e(((e, r) => {
			let i = () => {
				!0 === t() ? n().next((() => {
					i();
				}), r) : e();
			};
			i();
		}));
	}
};
function il(e) {
	let t = e.match(/Android ([\d.]+)/i), n = t ? t[1].split(".").slice(0, 2).join(".") : "-1";
	return Number(n);
}
function al(e) {
	return e.name === "IndexedDbTransactionError";
}
var ol = class {
	constructor(e, t) {
		this.previousValue = e, t && (t.sequenceNumberHandler = (e) => this.ae(e), this.ue = (e) => t.writeSequenceNumber(e));
	}
	ae(e) {
		return this.previousValue = Math.max(e, this.previousValue), this.previousValue;
	}
	next() {
		let e = ++this.previousValue;
		return this.ue && this.ue(e), e;
	}
};
ol.ce = -1;
var sl = -1;
function cl(e) {
	return e == null;
}
function ll(e) {
	return e === 0 && 1 / e == -Infinity;
}
function ul(e) {
	return typeof e == "number" && Number.isInteger(e) && !ll(e) && e <= 2 ** 53 - 1 && e >= -(2 ** 53 - 1);
}
var dl = "";
function fl(e) {
	let t = "";
	for (let n = 0; n < e.length; n++) t.length > 0 && (t = ml(t)), t = pl(e.get(n), t);
	return ml(t);
}
function pl(e, t) {
	let n = t, r = e.length;
	for (let t = 0; t < r; t++) {
		let r = e.charAt(t);
		switch (r) {
			case "\0":
				n += "";
				break;
			case dl:
				n += "";
				break;
			default: n += r;
		}
	}
	return n;
}
function ml(e) {
	return e + "";
}
function hl(e) {
	let t = 0;
	for (let n in e) Object.prototype.hasOwnProperty.call(e, n) && t++;
	return t;
}
function gl(e, t) {
	for (let n in e) Object.prototype.hasOwnProperty.call(e, n) && t(n, e[n]);
}
function _l(e) {
	for (let t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return !1;
	return !0;
}
var W = class e {
	constructor(e, t) {
		this.comparator = e, this.root = t || yl.EMPTY;
	}
	insert(t, n) {
		return new e(this.comparator, this.root.insert(t, n, this.comparator).copy(null, null, yl.BLACK, null, null));
	}
	remove(t) {
		return new e(this.comparator, this.root.remove(t, this.comparator).copy(null, null, yl.BLACK, null, null));
	}
	get(e) {
		let t = this.root;
		for (; !t.isEmpty();) {
			let n = this.comparator(e, t.key);
			if (n === 0) return t.value;
			n < 0 ? t = t.left : n > 0 && (t = t.right);
		}
		return null;
	}
	indexOf(e) {
		let t = 0, n = this.root;
		for (; !n.isEmpty();) {
			let r = this.comparator(e, n.key);
			if (r === 0) return t + n.left.size;
			r < 0 ? n = n.left : (t += n.left.size + 1, n = n.right);
		}
		return -1;
	}
	isEmpty() {
		return this.root.isEmpty();
	}
	get size() {
		return this.root.size;
	}
	minKey() {
		return this.root.minKey();
	}
	maxKey() {
		return this.root.maxKey();
	}
	inorderTraversal(e) {
		return this.root.inorderTraversal(e);
	}
	forEach(e) {
		this.inorderTraversal(((t, n) => (e(t, n), !1)));
	}
	toString() {
		let e = [];
		return this.inorderTraversal(((t, n) => (e.push(`${t}:${n}`), !1))), `{${e.join(", ")}}`;
	}
	reverseTraversal(e) {
		return this.root.reverseTraversal(e);
	}
	getIterator() {
		return new vl(this.root, null, this.comparator, !1);
	}
	getIteratorFrom(e) {
		return new vl(this.root, e, this.comparator, !1);
	}
	getReverseIterator() {
		return new vl(this.root, null, this.comparator, !0);
	}
	getReverseIteratorFrom(e) {
		return new vl(this.root, e, this.comparator, !0);
	}
}, vl = class {
	constructor(e, t, n, r) {
		this.isReverse = r, this.nodeStack = [];
		let i = 1;
		for (; !e.isEmpty();) if (i = t ? n(e.key, t) : 1, t && r && (i *= -1), i < 0) e = this.isReverse ? e.left : e.right;
		else {
			if (i === 0) {
				this.nodeStack.push(e);
				break;
			}
			this.nodeStack.push(e), e = this.isReverse ? e.right : e.left;
		}
	}
	getNext() {
		let e = this.nodeStack.pop(), t = {
			key: e.key,
			value: e.value
		};
		if (this.isReverse) for (e = e.left; !e.isEmpty();) this.nodeStack.push(e), e = e.right;
		else for (e = e.right; !e.isEmpty();) this.nodeStack.push(e), e = e.left;
		return t;
	}
	hasNext() {
		return this.nodeStack.length > 0;
	}
	peek() {
		if (this.nodeStack.length === 0) return null;
		let e = this.nodeStack[this.nodeStack.length - 1];
		return {
			key: e.key,
			value: e.value
		};
	}
}, yl = class e {
	constructor(t, n, r, i, a) {
		this.key = t, this.value = n, this.color = r ?? e.RED, this.left = i ?? e.EMPTY, this.right = a ?? e.EMPTY, this.size = this.left.size + 1 + this.right.size;
	}
	copy(t, n, r, i, a) {
		return new e(t ?? this.key, n ?? this.value, r ?? this.color, i ?? this.left, a ?? this.right);
	}
	isEmpty() {
		return !1;
	}
	inorderTraversal(e) {
		return this.left.inorderTraversal(e) || e(this.key, this.value) || this.right.inorderTraversal(e);
	}
	reverseTraversal(e) {
		return this.right.reverseTraversal(e) || e(this.key, this.value) || this.left.reverseTraversal(e);
	}
	min() {
		return this.left.isEmpty() ? this : this.left.min();
	}
	minKey() {
		return this.min().key;
	}
	maxKey() {
		return this.right.isEmpty() ? this.key : this.right.maxKey();
	}
	insert(e, t, n) {
		let r = this, i = n(e, r.key);
		return r = i < 0 ? r.copy(null, null, null, r.left.insert(e, t, n), null) : i === 0 ? r.copy(null, t, null, null, null) : r.copy(null, null, null, null, r.right.insert(e, t, n)), r.fixUp();
	}
	removeMin() {
		if (this.left.isEmpty()) return e.EMPTY;
		let t = this;
		return t.left.isRed() || t.left.left.isRed() || (t = t.moveRedLeft()), t = t.copy(null, null, null, t.left.removeMin(), null), t.fixUp();
	}
	remove(t, n) {
		let r, i = this;
		if (n(t, i.key) < 0) i.left.isEmpty() || i.left.isRed() || i.left.left.isRed() || (i = i.moveRedLeft()), i = i.copy(null, null, null, i.left.remove(t, n), null);
		else {
			if (i.left.isRed() && (i = i.rotateRight()), i.right.isEmpty() || i.right.isRed() || i.right.left.isRed() || (i = i.moveRedRight()), n(t, i.key) === 0) {
				if (i.right.isEmpty()) return e.EMPTY;
				r = i.right.min(), i = i.copy(r.key, r.value, null, null, i.right.removeMin());
			}
			i = i.copy(null, null, null, null, i.right.remove(t, n));
		}
		return i.fixUp();
	}
	isRed() {
		return this.color;
	}
	fixUp() {
		let e = this;
		return e.right.isRed() && !e.left.isRed() && (e = e.rotateLeft()), e.left.isRed() && e.left.left.isRed() && (e = e.rotateRight()), e.left.isRed() && e.right.isRed() && (e = e.colorFlip()), e;
	}
	moveRedLeft() {
		let e = this.colorFlip();
		return e.right.left.isRed() && (e = e.copy(null, null, null, null, e.right.rotateRight()), e = e.rotateLeft(), e = e.colorFlip()), e;
	}
	moveRedRight() {
		let e = this.colorFlip();
		return e.left.left.isRed() && (e = e.rotateRight(), e = e.colorFlip()), e;
	}
	rotateLeft() {
		let t = this.copy(null, null, e.RED, null, this.right.left);
		return this.right.copy(null, null, this.color, t, null);
	}
	rotateRight() {
		let t = this.copy(null, null, e.RED, this.left.right, null);
		return this.left.copy(null, null, this.color, null, t);
	}
	colorFlip() {
		let e = this.left.copy(null, null, !this.left.color, null, null), t = this.right.copy(null, null, !this.right.color, null, null);
		return this.copy(null, null, !this.color, e, t);
	}
	checkMaxDepth() {
		return 2 ** this.check() <= this.size + 1;
	}
	check() {
		if (this.isRed() && this.left.isRed()) throw M(43730, {
			key: this.key,
			value: this.value
		});
		if (this.right.isRed()) throw M(14113, {
			key: this.key,
			value: this.value
		});
		let e = this.left.check();
		if (e !== this.right.check()) throw M(27949);
		return e + +!this.isRed();
	}
};
yl.EMPTY = null, yl.RED = !0, yl.BLACK = !1, yl.EMPTY = new class {
	constructor() {
		this.size = 0;
	}
	get key() {
		throw M(57766);
	}
	get value() {
		throw M(16141);
	}
	get color() {
		throw M(16727);
	}
	get left() {
		throw M(29726);
	}
	get right() {
		throw M(36894);
	}
	copy(e, t, n, r, i) {
		return this;
	}
	insert(e, t, n) {
		return new yl(e, t);
	}
	remove(e, t) {
		return this;
	}
	isEmpty() {
		return !0;
	}
	inorderTraversal(e) {
		return !1;
	}
	reverseTraversal(e) {
		return !1;
	}
	minKey() {
		return null;
	}
	maxKey() {
		return null;
	}
	isRed() {
		return !1;
	}
	checkMaxDepth() {
		return !0;
	}
	check() {
		return 0;
	}
}();
var G = class e {
	constructor(e) {
		this.comparator = e, this.data = new W(this.comparator);
	}
	has(e) {
		return this.data.get(e) !== null;
	}
	first() {
		return this.data.minKey();
	}
	last() {
		return this.data.maxKey();
	}
	get size() {
		return this.data.size;
	}
	indexOf(e) {
		return this.data.indexOf(e);
	}
	forEach(e) {
		this.data.inorderTraversal(((t, n) => (e(t), !1)));
	}
	forEachInRange(e, t) {
		let n = this.data.getIteratorFrom(e[0]);
		for (; n.hasNext();) {
			let r = n.getNext();
			if (this.comparator(r.key, e[1]) >= 0) return;
			t(r.key);
		}
	}
	forEachWhile(e, t) {
		let n;
		for (n = t === void 0 ? this.data.getIterator() : this.data.getIteratorFrom(t); n.hasNext();) if (!e(n.getNext().key)) return;
	}
	firstAfterOrEqual(e) {
		let t = this.data.getIteratorFrom(e);
		return t.hasNext() ? t.getNext().key : null;
	}
	getIterator() {
		return new bl(this.data.getIterator());
	}
	getIteratorFrom(e) {
		return new bl(this.data.getIteratorFrom(e));
	}
	add(e) {
		return this.copy(this.data.remove(e).insert(e, !0));
	}
	delete(e) {
		return this.has(e) ? this.copy(this.data.remove(e)) : this;
	}
	isEmpty() {
		return this.data.isEmpty();
	}
	unionWith(e) {
		let t = this;
		return t.size < e.size && (t = e, e = this), e.forEach(((e) => {
			t = t.add(e);
		})), t;
	}
	isEqual(t) {
		if (!(t instanceof e) || this.size !== t.size) return !1;
		let n = this.data.getIterator(), r = t.data.getIterator();
		for (; n.hasNext();) {
			let e = n.getNext().key, t = r.getNext().key;
			if (this.comparator(e, t) !== 0) return !1;
		}
		return !0;
	}
	toArray() {
		let e = [];
		return this.forEach(((t) => {
			e.push(t);
		})), e;
	}
	toString() {
		let e = [];
		return this.forEach(((t) => e.push(t))), "SortedSet(" + e.toString() + ")";
	}
	copy(t) {
		let n = new e(this.comparator);
		return n.data = t, n;
	}
}, bl = class {
	constructor(e) {
		this.iter = e;
	}
	getNext() {
		return this.iter.getNext().key;
	}
	hasNext() {
		return this.iter.hasNext();
	}
}, xl = class e {
	constructor(e) {
		this.fields = e, e.sort(zc.comparator);
	}
	static empty() {
		return new e([]);
	}
	unionWith(t) {
		let n = new G(zc.comparator);
		for (let e of this.fields) n = n.add(e);
		for (let e of t) n = n.add(e);
		return new e(n.toArray());
	}
	covers(e) {
		for (let t of this.fields) if (t.isPrefixOf(e)) return !0;
		return !1;
	}
	isEqual(e) {
		return Fc(this.fields, e.fields, ((e, t) => e.isEqual(t)));
	}
}, Sl = class extends Error {
	constructor() {
		super(...arguments), this.name = "Base64DecodeError";
	}
}, Cl = class e {
	constructor(e) {
		this.binaryString = e;
	}
	static fromBase64String(t) {
		return new e(function(e) {
			try {
				return atob(e);
			} catch (e) {
				throw typeof DOMException < "u" && e instanceof DOMException ? new Sl("Invalid base64 string: " + e) : e;
			}
		}(t));
	}
	static fromUint8Array(t) {
		return new e(function(e) {
			let t = "";
			for (let n = 0; n < e.length; ++n) t += String.fromCharCode(e[n]);
			return t;
		}(t));
	}
	[Symbol.iterator]() {
		let e = 0;
		return { next: () => e < this.binaryString.length ? {
			value: this.binaryString.charCodeAt(e++),
			done: !1
		} : {
			value: void 0,
			done: !0
		} };
	}
	toBase64() {
		return function(e) {
			return btoa(e);
		}(this.binaryString);
	}
	toUint8Array() {
		return function(e) {
			let t = new Uint8Array(e.length);
			for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
			return t;
		}(this.binaryString);
	}
	approximateByteSize() {
		return 2 * this.binaryString.length;
	}
	compareTo(e) {
		return L(this.binaryString, e.binaryString);
	}
	isEqual(e) {
		return this.binaryString === e.binaryString;
	}
};
Cl.EMPTY_BYTE_STRING = new Cl("");
var wl = /* @__PURE__ */ new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);
function Tl(e) {
	if (N(!!e, 39018), typeof e == "string") {
		let t = 0, n = wl.exec(e);
		if (N(!!n, 46558, { timestamp: e }), n[1]) {
			let e = n[1];
			e = (e + "000000000").substr(0, 9), t = Number(e);
		}
		let r = new Date(e);
		return {
			seconds: Math.floor(r.getTime() / 1e3),
			nanos: t
		};
	}
	return {
		seconds: K(e.seconds),
		nanos: K(e.nanos)
	};
}
function K(e) {
	return typeof e == "number" ? e : typeof e == "string" ? Number(e) : 0;
}
function El(e) {
	return typeof e == "string" ? Cl.fromBase64String(e) : Cl.fromUint8Array(e);
}
var Dl = "server_timestamp", Ol = "__type__", kl = "__previous_value__", Al = "__local_write_time__";
function jl(e) {
	return (e?.mapValue?.fields || {})[Ol]?.stringValue === Dl;
}
function Ml(e) {
	let t = e.mapValue.fields[kl];
	return jl(t) ? Ml(t) : t;
}
function Nl(e) {
	let t = Tl(e.mapValue.fields[Al].timestampValue);
	return new V(t.seconds, t.nanos);
}
var Pl = class {
	constructor(e, t, n, r, i, a, o, s, c, l, u) {
		this.databaseId = e, this.appId = t, this.persistenceKey = n, this.host = r, this.ssl = i, this.forceLongPolling = a, this.autoDetectLongPolling = o, this.longPollingOptions = s, this.useFetchStreams = c, this.isUsingEmulator = l, this.apiKey = u;
	}
}, Fl = "(default)", Il = class e {
	constructor(e, t) {
		this.projectId = e, this.database = t || Fl;
	}
	static empty() {
		return new e("", "");
	}
	get isDefaultDatabase() {
		return this.database === Fl;
	}
	isEqual(t) {
		return t instanceof e && t.projectId === this.projectId && t.database === this.database;
	}
};
function Ll(e, t) {
	if (!Object.prototype.hasOwnProperty.apply(e.options, ["projectId"])) throw new I(F.INVALID_ARGUMENT, "\"projectId\" not provided in firebase.initializeApp.");
	return new Il(e.options.projectId, t);
}
var Rl = "__type__", zl = "__max__", Bl = { mapValue: { fields: { __type__: { stringValue: zl } } } }, Vl = "__vector__", Hl = "value";
function Ul(e) {
	return "nullValue" in e ? 0 : "booleanValue" in e ? 1 : "integerValue" in e || "doubleValue" in e ? 2 : "timestampValue" in e ? 3 : "stringValue" in e ? 5 : "bytesValue" in e ? 6 : "referenceValue" in e ? 7 : "geoPointValue" in e ? 8 : "arrayValue" in e ? 9 : "mapValue" in e ? jl(e) ? 4 : ou(e) ? 9007199254740991 : iu(e) ? 10 : 11 : M(28295, { value: e });
}
function Wl(e, t) {
	if (e === t) return !0;
	let n = Ul(e);
	if (n !== Ul(t)) return !1;
	switch (n) {
		case 0:
		case 9007199254740991: return !0;
		case 1: return e.booleanValue === t.booleanValue;
		case 4: return Nl(e).isEqual(Nl(t));
		case 3: return function(e, t) {
			if (typeof e.timestampValue == "string" && typeof t.timestampValue == "string" && e.timestampValue.length === t.timestampValue.length) return e.timestampValue === t.timestampValue;
			let n = Tl(e.timestampValue), r = Tl(t.timestampValue);
			return n.seconds === r.seconds && n.nanos === r.nanos;
		}(e, t);
		case 5: return e.stringValue === t.stringValue;
		case 6: return function(e, t) {
			return El(e.bytesValue).isEqual(El(t.bytesValue));
		}(e, t);
		case 7: return e.referenceValue === t.referenceValue;
		case 8: return function(e, t) {
			return K(e.geoPointValue.latitude) === K(t.geoPointValue.latitude) && K(e.geoPointValue.longitude) === K(t.geoPointValue.longitude);
		}(e, t);
		case 2: return function(e, t) {
			if ("integerValue" in e && "integerValue" in t) return K(e.integerValue) === K(t.integerValue);
			if ("doubleValue" in e && "doubleValue" in t) {
				let n = K(e.doubleValue), r = K(t.doubleValue);
				return n === r ? ll(n) === ll(r) : isNaN(n) && isNaN(r);
			}
			return !1;
		}(e, t);
		case 9: return Fc(e.arrayValue.values || [], t.arrayValue.values || [], Wl);
		case 10:
		case 11: return function(e, t) {
			let n = e.mapValue.fields || {}, r = t.mapValue.fields || {};
			if (hl(n) !== hl(r)) return !1;
			for (let e in n) if (n.hasOwnProperty(e) && (r[e] === void 0 || !Wl(n[e], r[e]))) return !1;
			return !0;
		}(e, t);
		default: return M(52216, { left: e });
	}
}
function Gl(e, t) {
	return (e.values || []).find(((e) => Wl(e, t))) !== void 0;
}
function Kl(e, t) {
	if (e === t) return 0;
	let n = Ul(e), r = Ul(t);
	if (n !== r) return L(n, r);
	switch (n) {
		case 0:
		case 9007199254740991: return 0;
		case 1: return L(e.booleanValue, t.booleanValue);
		case 2: return function(e, t) {
			let n = K(e.integerValue || e.doubleValue), r = K(t.integerValue || t.doubleValue);
			return n < r ? -1 : n > r ? 1 : n === r ? 0 : isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
		}(e, t);
		case 3: return ql(e.timestampValue, t.timestampValue);
		case 4: return ql(Nl(e), Nl(t));
		case 5: return jc(e.stringValue, t.stringValue);
		case 6: return function(e, t) {
			let n = El(e), r = El(t);
			return n.compareTo(r);
		}(e.bytesValue, t.bytesValue);
		case 7: return function(e, t) {
			let n = e.split("/"), r = t.split("/");
			for (let e = 0; e < n.length && e < r.length; e++) {
				let t = L(n[e], r[e]);
				if (t !== 0) return t;
			}
			return L(n.length, r.length);
		}(e.referenceValue, t.referenceValue);
		case 8: return function(e, t) {
			let n = L(K(e.latitude), K(t.latitude));
			return n === 0 ? L(K(e.longitude), K(t.longitude)) : n;
		}(e.geoPointValue, t.geoPointValue);
		case 9: return Jl(e.arrayValue, t.arrayValue);
		case 10: return function(e, t) {
			let n = e.fields || {}, r = t.fields || {}, i = n[Hl]?.arrayValue, a = r[Hl]?.arrayValue, o = L(i?.values?.length || 0, a?.values?.length || 0);
			return o === 0 ? Jl(i, a) : o;
		}(e.mapValue, t.mapValue);
		case 11: return function(e, t) {
			if (e === Bl.mapValue && t === Bl.mapValue) return 0;
			if (e === Bl.mapValue) return 1;
			if (t === Bl.mapValue) return -1;
			let n = e.fields || {}, r = Object.keys(n), i = t.fields || {}, a = Object.keys(i);
			r.sort(), a.sort();
			for (let e = 0; e < r.length && e < a.length; ++e) {
				let t = jc(r[e], a[e]);
				if (t !== 0) return t;
				let o = Kl(n[r[e]], i[a[e]]);
				if (o !== 0) return o;
			}
			return L(r.length, a.length);
		}(e.mapValue, t.mapValue);
		default: throw M(23264, { he: n });
	}
}
function ql(e, t) {
	if (typeof e == "string" && typeof t == "string" && e.length === t.length) return L(e, t);
	let n = Tl(e), r = Tl(t), i = L(n.seconds, r.seconds);
	return i === 0 ? L(n.nanos, r.nanos) : i;
}
function Jl(e, t) {
	let n = e.values || [], r = t.values || [];
	for (let e = 0; e < n.length && e < r.length; ++e) {
		let t = Kl(n[e], r[e]);
		if (t) return t;
	}
	return L(n.length, r.length);
}
function Yl(e) {
	return Xl(e);
}
function Xl(e) {
	return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function(e) {
		let t = Tl(e);
		return `time(${t.seconds},${t.nanos})`;
	}(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? function(e) {
		return El(e).toBase64();
	}(e.bytesValue) : "referenceValue" in e ? function(e) {
		return z.fromName(e).toString();
	}(e.referenceValue) : "geoPointValue" in e ? function(e) {
		return `geo(${e.latitude},${e.longitude})`;
	}(e.geoPointValue) : "arrayValue" in e ? function(e) {
		let t = "[", n = !0;
		for (let r of e.values || []) n ? n = !1 : t += ",", t += Xl(r);
		return t + "]";
	}(e.arrayValue) : "mapValue" in e ? function(e) {
		let t = Object.keys(e.fields || {}).sort(), n = "{", r = !0;
		for (let i of t) r ? r = !1 : n += ",", n += `${i}:${Xl(e.fields[i])}`;
		return n + "}";
	}(e.mapValue) : M(61005, { value: e });
}
function Zl(e) {
	switch (Ul(e)) {
		case 0:
		case 1: return 4;
		case 2: return 8;
		case 3:
		case 8: return 16;
		case 4:
			let t = Ml(e);
			return t ? 16 + Zl(t) : 16;
		case 5: return 2 * e.stringValue.length;
		case 6: return El(e.bytesValue).approximateByteSize();
		case 7: return e.referenceValue.length;
		case 9: return function(e) {
			return (e.values || []).reduce(((e, t) => e + Zl(t)), 0);
		}(e.arrayValue);
		case 10:
		case 11: return function(e) {
			let t = 0;
			return gl(e.fields, ((e, n) => {
				t += e.length + Zl(n);
			})), t;
		}(e.mapValue);
		default: throw M(13486, { value: e });
	}
}
function Ql(e) {
	return !!e && "integerValue" in e;
}
function $l(e) {
	return Ql(e) || function(e) {
		return !!e && "doubleValue" in e;
	}(e);
}
function eu(e) {
	return !!e && "arrayValue" in e;
}
function tu(e) {
	return !!e && "nullValue" in e;
}
function nu(e) {
	return !!e && "doubleValue" in e && isNaN(Number(e.doubleValue));
}
function ru(e) {
	return !!e && "mapValue" in e;
}
function iu(e) {
	return (e?.mapValue?.fields || {})[Rl]?.stringValue === Vl;
}
function au(e) {
	if (e.geoPointValue) return { geoPointValue: { ...e.geoPointValue } };
	if (e.timestampValue && typeof e.timestampValue == "object") return { timestampValue: { ...e.timestampValue } };
	if (e.mapValue) {
		let t = { mapValue: { fields: {} } };
		return gl(e.mapValue.fields, ((e, n) => t.mapValue.fields[e] = au(n))), t;
	}
	if (e.arrayValue) {
		let t = { arrayValue: { values: [] } };
		for (let n = 0; n < (e.arrayValue.values || []).length; ++n) t.arrayValue.values[n] = au(e.arrayValue.values[n]);
		return t;
	}
	return { ...e };
}
function ou(e) {
	return (((e.mapValue || {}).fields || {}).__type__ || {}).stringValue === zl;
}
var su = class e {
	constructor(e) {
		this.value = e;
	}
	static empty() {
		return new e({ mapValue: {} });
	}
	field(e) {
		if (e.isEmpty()) return this.value;
		{
			let t = this.value;
			for (let n = 0; n < e.length - 1; ++n) if (t = (t.mapValue.fields || {})[e.get(n)], !ru(t)) return null;
			return t = (t.mapValue.fields || {})[e.lastSegment()], t || null;
		}
	}
	set(e, t) {
		this.getFieldsMap(e.popLast())[e.lastSegment()] = au(t);
	}
	setAll(e) {
		let t = zc.emptyPath(), n = {}, r = [];
		e.forEach(((e, i) => {
			if (!t.isImmediateParentOf(i)) {
				let e = this.getFieldsMap(t);
				this.applyChanges(e, n, r), n = {}, r = [], t = i.popLast();
			}
			e ? n[i.lastSegment()] = au(e) : r.push(i.lastSegment());
		}));
		let i = this.getFieldsMap(t);
		this.applyChanges(i, n, r);
	}
	delete(e) {
		let t = this.field(e.popLast());
		ru(t) && t.mapValue.fields && delete t.mapValue.fields[e.lastSegment()];
	}
	isEqual(e) {
		return Wl(this.value, e.value);
	}
	getFieldsMap(e) {
		let t = this.value;
		t.mapValue.fields || (t.mapValue = { fields: {} });
		for (let n = 0; n < e.length; ++n) {
			let r = t.mapValue.fields[e.get(n)];
			ru(r) && r.mapValue.fields || (r = { mapValue: { fields: {} } }, t.mapValue.fields[e.get(n)] = r), t = r;
		}
		return t.mapValue.fields;
	}
	applyChanges(e, t, n) {
		gl(t, ((t, n) => e[t] = n));
		for (let t of n) delete e[t];
	}
	clone() {
		return new e(au(this.value));
	}
};
function cu(e) {
	let t = [];
	return gl(e.fields, ((e, n) => {
		let r = new zc([e]);
		if (ru(n)) {
			let e = cu(n.mapValue).fields;
			if (e.length === 0) t.push(r);
			else for (let n of e) t.push(r.child(n));
		} else t.push(r);
	})), new xl(t);
}
var lu = class e {
	constructor(e, t, n, r, i, a, o) {
		this.key = e, this.documentType = t, this.version = n, this.readTime = r, this.createTime = i, this.data = a, this.documentState = o;
	}
	static newInvalidDocument(t) {
		return new e(t, 0, H.min(), H.min(), H.min(), su.empty(), 0);
	}
	static newFoundDocument(t, n, r, i) {
		return new e(t, 1, n, H.min(), r, i, 0);
	}
	static newNoDocument(t, n) {
		return new e(t, 2, n, H.min(), H.min(), su.empty(), 0);
	}
	static newUnknownDocument(t, n) {
		return new e(t, 3, n, H.min(), H.min(), su.empty(), 2);
	}
	convertToFoundDocument(e, t) {
		return !this.createTime.isEqual(H.min()) || this.documentType !== 2 && this.documentType !== 0 || (this.createTime = e), this.version = e, this.documentType = 1, this.data = t, this.documentState = 0, this;
	}
	convertToNoDocument(e) {
		return this.version = e, this.documentType = 2, this.data = su.empty(), this.documentState = 0, this;
	}
	convertToUnknownDocument(e) {
		return this.version = e, this.documentType = 3, this.data = su.empty(), this.documentState = 2, this;
	}
	setHasCommittedMutations() {
		return this.documentState = 2, this;
	}
	setHasLocalMutations() {
		return this.documentState = 1, this.version = H.min(), this;
	}
	setReadTime(e) {
		return this.readTime = e, this;
	}
	get hasLocalMutations() {
		return this.documentState === 1;
	}
	get hasCommittedMutations() {
		return this.documentState === 2;
	}
	get hasPendingWrites() {
		return this.hasLocalMutations || this.hasCommittedMutations;
	}
	isValidDocument() {
		return this.documentType !== 0;
	}
	isFoundDocument() {
		return this.documentType === 1;
	}
	isNoDocument() {
		return this.documentType === 2;
	}
	isUnknownDocument() {
		return this.documentType === 3;
	}
	isEqual(t) {
		return t instanceof e && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.documentType === t.documentType && this.documentState === t.documentState && this.data.isEqual(t.data);
	}
	mutableCopy() {
		return new e(this.key, this.documentType, this.version, this.readTime, this.createTime, this.data.clone(), this.documentState);
	}
	toString() {
		return `Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`;
	}
}, uu = class {
	constructor(e, t) {
		this.position = e, this.inclusive = t;
	}
};
function du(e, t, n) {
	let r = 0;
	for (let i = 0; i < e.position.length; i++) {
		let a = t[i], o = e.position[i];
		if (r = a.field.isKeyField() ? z.comparator(z.fromName(o.referenceValue), n.key) : Kl(o, n.data.field(a.field)), a.dir === "desc" && (r *= -1), r !== 0) break;
	}
	return r;
}
function fu(e, t) {
	if (e === null) return t === null;
	if (t === null || e.inclusive !== t.inclusive || e.position.length !== t.position.length) return !1;
	for (let n = 0; n < e.position.length; n++) if (!Wl(e.position[n], t.position[n])) return !1;
	return !0;
}
var pu = class {
	constructor(e, t = "asc") {
		this.field = e, this.dir = t;
	}
};
function mu(e, t) {
	return e.dir === t.dir && e.field.isEqual(t.field);
}
var hu = class {}, q = class e extends hu {
	constructor(e, t, n) {
		super(), this.field = e, this.op = t, this.value = n;
	}
	static create(t, n, r) {
		return t.isKeyField() ? n === "in" || n === "not-in" ? this.createKeyFieldInFilter(t, n, r) : new Cu(t, n, r) : n === "array-contains" ? new Du(t, r) : n === "in" ? new Ou(t, r) : n === "not-in" ? new ku(t, r) : n === "array-contains-any" ? new Au(t, r) : new e(t, n, r);
	}
	static createKeyFieldInFilter(e, t, n) {
		return t === "in" ? new wu(e, n) : new Tu(e, n);
	}
	matches(e) {
		let t = e.data.field(this.field);
		return this.op === "!=" ? t !== null && t.nullValue === void 0 && this.matchesComparison(Kl(t, this.value)) : t !== null && Ul(this.value) === Ul(t) && this.matchesComparison(Kl(t, this.value));
	}
	matchesComparison(e) {
		switch (this.op) {
			case "<": return e < 0;
			case "<=": return e <= 0;
			case "==": return e === 0;
			case "!=": return e !== 0;
			case ">": return e > 0;
			case ">=": return e >= 0;
			default: return M(47266, { operator: this.op });
		}
	}
	isInequality() {
		return [
			"<",
			"<=",
			">",
			">=",
			"!=",
			"not-in"
		].indexOf(this.op) >= 0;
	}
	getFlattenedFilters() {
		return [this];
	}
	getFilters() {
		return [this];
	}
}, gu = class e extends hu {
	constructor(e, t) {
		super(), this.filters = e, this.op = t, this.Pe = null;
	}
	static create(t, n) {
		return new e(t, n);
	}
	matches(e) {
		return _u(this) ? this.filters.find(((t) => !t.matches(e))) === void 0 : this.filters.find(((t) => t.matches(e))) !== void 0;
	}
	getFlattenedFilters() {
		return this.Pe !== null || (this.Pe = this.filters.reduce(((e, t) => e.concat(t.getFlattenedFilters())), [])), this.Pe;
	}
	getFilters() {
		return Object.assign([], this.filters);
	}
};
function _u(e) {
	return e.op === "and";
}
function vu(e) {
	return yu(e) && _u(e);
}
function yu(e) {
	for (let t of e.filters) if (t instanceof gu) return !1;
	return !0;
}
function bu(e) {
	if (e instanceof q) return e.field.canonicalString() + e.op.toString() + Yl(e.value);
	if (vu(e)) return e.filters.map(((e) => bu(e))).join(",");
	{
		let t = e.filters.map(((e) => bu(e))).join(",");
		return `${e.op}(${t})`;
	}
}
function xu(e, t) {
	return e instanceof q ? function(e, t) {
		return t instanceof q && e.op === t.op && e.field.isEqual(t.field) && Wl(e.value, t.value);
	}(e, t) : e instanceof gu ? function(e, t) {
		return t instanceof gu && e.op === t.op && e.filters.length === t.filters.length ? e.filters.reduce(((e, n, r) => e && xu(n, t.filters[r])), !0) : !1;
	}(e, t) : void M(19439);
}
function Su(e) {
	return e instanceof q ? function(e) {
		return `${e.field.canonicalString()} ${e.op} ${Yl(e.value)}`;
	}(e) : e instanceof gu ? function(e) {
		return e.op.toString() + " {" + e.getFilters().map(Su).join(" ,") + "}";
	}(e) : "Filter";
}
var Cu = class extends q {
	constructor(e, t, n) {
		super(e, t, n), this.key = z.fromName(n.referenceValue);
	}
	matches(e) {
		let t = z.comparator(e.key, this.key);
		return this.matchesComparison(t);
	}
}, wu = class extends q {
	constructor(e, t) {
		super(e, "in", t), this.keys = Eu("in", t);
	}
	matches(e) {
		return this.keys.some(((t) => t.isEqual(e.key)));
	}
}, Tu = class extends q {
	constructor(e, t) {
		super(e, "not-in", t), this.keys = Eu("not-in", t);
	}
	matches(e) {
		return !this.keys.some(((t) => t.isEqual(e.key)));
	}
};
function Eu(e, t) {
	return (t.arrayValue?.values || []).map(((e) => z.fromName(e.referenceValue)));
}
var Du = class extends q {
	constructor(e, t) {
		super(e, "array-contains", t);
	}
	matches(e) {
		let t = e.data.field(this.field);
		return eu(t) && Gl(t.arrayValue, this.value);
	}
}, Ou = class extends q {
	constructor(e, t) {
		super(e, "in", t);
	}
	matches(e) {
		let t = e.data.field(this.field);
		return t !== null && Gl(this.value.arrayValue, t);
	}
}, ku = class extends q {
	constructor(e, t) {
		super(e, "not-in", t);
	}
	matches(e) {
		if (Gl(this.value.arrayValue, { nullValue: "NULL_VALUE" })) return !1;
		let t = e.data.field(this.field);
		return t !== null && t.nullValue === void 0 && !Gl(this.value.arrayValue, t);
	}
}, Au = class extends q {
	constructor(e, t) {
		super(e, "array-contains-any", t);
	}
	matches(e) {
		let t = e.data.field(this.field);
		return !(!eu(t) || !t.arrayValue.values) && t.arrayValue.values.some(((e) => Gl(this.value.arrayValue, e)));
	}
}, ju = class {
	constructor(e, t = null, n = [], r = [], i = null, a = null, o = null) {
		this.path = e, this.collectionGroup = t, this.orderBy = n, this.filters = r, this.limit = i, this.startAt = a, this.endAt = o, this.Te = null;
	}
};
function Mu(e, t = null, n = [], r = [], i = null, a = null, o = null) {
	return new ju(e, t, n, r, i, a, o);
}
function Nu(e) {
	let t = P(e);
	if (t.Te === null) {
		let e = t.path.canonicalString();
		t.collectionGroup !== null && (e += "|cg:" + t.collectionGroup), e += "|f:", e += t.filters.map(((e) => bu(e))).join(","), e += "|ob:", e += t.orderBy.map(((e) => function(e) {
			return e.field.canonicalString() + e.dir;
		}(e))).join(","), cl(t.limit) || (e += "|l:", e += t.limit), t.startAt && (e += "|lb:", e += t.startAt.inclusive ? "b:" : "a:", e += t.startAt.position.map(((e) => Yl(e))).join(",")), t.endAt && (e += "|ub:", e += t.endAt.inclusive ? "a:" : "b:", e += t.endAt.position.map(((e) => Yl(e))).join(",")), t.Te = e;
	}
	return t.Te;
}
function Pu(e, t) {
	if (e.limit !== t.limit || e.orderBy.length !== t.orderBy.length) return !1;
	for (let n = 0; n < e.orderBy.length; n++) if (!mu(e.orderBy[n], t.orderBy[n])) return !1;
	if (e.filters.length !== t.filters.length) return !1;
	for (let n = 0; n < e.filters.length; n++) if (!xu(e.filters[n], t.filters[n])) return !1;
	return e.collectionGroup === t.collectionGroup && !!e.path.isEqual(t.path) && !!fu(e.startAt, t.startAt) && fu(e.endAt, t.endAt);
}
function Fu(e) {
	return z.isDocumentKey(e.path) && e.collectionGroup === null && e.filters.length === 0;
}
var Iu = class {
	constructor(e, t = null, n = [], r = [], i = null, a = "F", o = null, s = null) {
		this.path = e, this.collectionGroup = t, this.explicitOrderBy = n, this.filters = r, this.limit = i, this.limitType = a, this.startAt = o, this.endAt = s, this.Ie = null, this.Ee = null, this.Re = null, this.startAt, this.endAt;
	}
};
function Lu(e, t, n, r, i, a, o, s) {
	return new Iu(e, t, n, r, i, a, o, s);
}
function Ru(e) {
	return new Iu(e);
}
function zu(e) {
	return e.filters.length === 0 && e.limit === null && e.startAt == null && e.endAt == null && (e.explicitOrderBy.length === 0 || e.explicitOrderBy.length === 1 && e.explicitOrderBy[0].field.isKeyField());
}
function Bu(e) {
	return z.isDocumentKey(e.path) && e.collectionGroup === null && e.filters.length === 0;
}
function Vu(e) {
	return e.collectionGroup !== null;
}
function Hu(e) {
	let t = P(e);
	if (t.Ie === null) {
		t.Ie = [];
		let e = /* @__PURE__ */ new Set();
		for (let n of t.explicitOrderBy) t.Ie.push(n), e.add(n.field.canonicalString());
		let n = t.explicitOrderBy.length > 0 ? t.explicitOrderBy[t.explicitOrderBy.length - 1].dir : "asc";
		(function(e) {
			let t = new G(zc.comparator);
			return e.filters.forEach(((e) => {
				e.getFlattenedFilters().forEach(((e) => {
					e.isInequality() && (t = t.add(e.field));
				}));
			})), t;
		})(t).forEach(((r) => {
			e.has(r.canonicalString()) || r.isKeyField() || t.Ie.push(new pu(r, n));
		})), e.has(zc.keyField().canonicalString()) || t.Ie.push(new pu(zc.keyField(), n));
	}
	return t.Ie;
}
function Uu(e) {
	let t = P(e);
	return t.Ee || (t.Ee = Wu(t, Hu(e))), t.Ee;
}
function Wu(e, t) {
	if (e.limitType === "F") return Mu(e.path, e.collectionGroup, t, e.filters, e.limit, e.startAt, e.endAt);
	{
		t = t.map(((e) => {
			let t = e.dir === "desc" ? "asc" : "desc";
			return new pu(e.field, t);
		}));
		let n = e.endAt ? new uu(e.endAt.position, e.endAt.inclusive) : null, r = e.startAt ? new uu(e.startAt.position, e.startAt.inclusive) : null;
		return Mu(e.path, e.collectionGroup, t, e.filters, e.limit, n, r);
	}
}
function Gu(e, t, n) {
	return new Iu(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), t, n, e.startAt, e.endAt);
}
function Ku(e, t) {
	return Pu(Uu(e), Uu(t)) && e.limitType === t.limitType;
}
function qu(e) {
	return `${Nu(Uu(e))}|lt:${e.limitType}`;
}
function Ju(e) {
	return `Query(target=${function(e) {
		let t = e.path.canonicalString();
		return e.collectionGroup !== null && (t += " collectionGroup=" + e.collectionGroup), e.filters.length > 0 && (t += `, filters: [${e.filters.map(((e) => Su(e))).join(", ")}]`), cl(e.limit) || (t += ", limit: " + e.limit), e.orderBy.length > 0 && (t += `, orderBy: [${e.orderBy.map(((e) => function(e) {
			return `${e.field.canonicalString()} (${e.dir})`;
		}(e))).join(", ")}]`), e.startAt && (t += ", startAt: ", t += e.startAt.inclusive ? "b:" : "a:", t += e.startAt.position.map(((e) => Yl(e))).join(",")), e.endAt && (t += ", endAt: ", t += e.endAt.inclusive ? "a:" : "b:", t += e.endAt.position.map(((e) => Yl(e))).join(",")), `Target(${t})`;
	}(Uu(e))}; limitType=${e.limitType})`;
}
function Yu(e, t) {
	return t.isFoundDocument() && function(e, t) {
		let n = t.key.path;
		return e.collectionGroup === null ? z.isDocumentKey(e.path) ? e.path.isEqual(n) : e.path.isImmediateParentOf(n) : t.key.hasCollectionId(e.collectionGroup) && e.path.isPrefixOf(n);
	}(e, t) && function(e, t) {
		for (let n of Hu(e)) if (!n.field.isKeyField() && t.data.field(n.field) === null) return !1;
		return !0;
	}(e, t) && function(e, t) {
		for (let n of e.filters) if (!n.matches(t)) return !1;
		return !0;
	}(e, t) && function(e, t) {
		return !(e.startAt && !function(e, t, n) {
			let r = du(e, t, n);
			return e.inclusive ? r <= 0 : r < 0;
		}(e.startAt, Hu(e), t) || e.endAt && !function(e, t, n) {
			let r = du(e, t, n);
			return e.inclusive ? r >= 0 : r > 0;
		}(e.endAt, Hu(e), t));
	}(e, t);
}
function Xu(e) {
	return e.collectionGroup || (e.path.length % 2 == 1 ? e.path.lastSegment() : e.path.get(e.path.length - 2));
}
function Zu(e) {
	return (t, n) => {
		let r = !1;
		for (let i of Hu(e)) {
			let e = Qu(i, t, n);
			if (e !== 0) return e;
			r = r || i.field.isKeyField();
		}
		return 0;
	};
}
function Qu(e, t, n) {
	let r = e.field.isKeyField() ? z.comparator(t.key, n.key) : function(e, t, n) {
		let r = t.data.field(e), i = n.data.field(e);
		return r !== null && i !== null ? Kl(r, i) : M(42886);
	}(e.field, t, n);
	switch (e.dir) {
		case "asc": return r;
		case "desc": return -1 * r;
		default: return M(19790, { direction: e.dir });
	}
}
var $u = class {
	constructor(e, t) {
		this.mapKeyFn = e, this.equalsFn = t, this.inner = {}, this.innerSize = 0;
	}
	get(e) {
		let t = this.mapKeyFn(e), n = this.inner[t];
		if (n !== void 0) {
			for (let [t, r] of n) if (this.equalsFn(t, e)) return r;
		}
	}
	has(e) {
		return this.get(e) !== void 0;
	}
	set(e, t) {
		let n = this.mapKeyFn(e), r = this.inner[n];
		if (r === void 0) return this.inner[n] = [[e, t]], void this.innerSize++;
		for (let n = 0; n < r.length; n++) if (this.equalsFn(r[n][0], e)) return void (r[n] = [e, t]);
		r.push([e, t]), this.innerSize++;
	}
	delete(e) {
		let t = this.mapKeyFn(e), n = this.inner[t];
		if (n === void 0) return !1;
		for (let r = 0; r < n.length; r++) if (this.equalsFn(n[r][0], e)) return n.length === 1 ? delete this.inner[t] : n.splice(r, 1), this.innerSize--, !0;
		return !1;
	}
	forEach(e) {
		gl(this.inner, ((t, n) => {
			for (let [t, r] of n) e(t, r);
		}));
	}
	isEmpty() {
		return _l(this.inner);
	}
	size() {
		return this.innerSize;
	}
}, ed = new W(z.comparator);
function td() {
	return ed;
}
var nd = new W(z.comparator);
function rd(...e) {
	let t = nd;
	for (let n of e) t = t.insert(n.key, n);
	return t;
}
function id(e) {
	let t = nd;
	return e.forEach(((e, n) => t = t.insert(e, n.overlayedDocument))), t;
}
function ad() {
	return sd();
}
function od() {
	return sd();
}
function sd() {
	return new $u(((e) => e.toString()), ((e, t) => e.isEqual(t)));
}
var cd = new W(z.comparator), ld = new G(z.comparator);
function J(...e) {
	let t = ld;
	for (let n of e) t = t.add(n);
	return t;
}
var ud = new G(L);
function dd() {
	return ud;
}
function fd(e, t) {
	if (e.useProto3Json) {
		if (isNaN(t)) return { doubleValue: "NaN" };
		if (t === Infinity) return { doubleValue: "Infinity" };
		if (t === -Infinity) return { doubleValue: "-Infinity" };
	}
	return { doubleValue: ll(t) ? "-0" : t };
}
function pd(e) {
	return { integerValue: "" + e };
}
function md(e, t) {
	return ul(t) ? pd(t) : fd(e, t);
}
var hd = class {
	constructor() {
		this._ = void 0;
	}
};
function gd(e, t, n) {
	return e instanceof yd ? function(e, t) {
		let n = { fields: {
			[Ol]: { stringValue: Dl },
			[Al]: { timestampValue: {
				seconds: e.seconds,
				nanos: e.nanoseconds
			} }
		} };
		return t && jl(t) && (t = Ml(t)), t && (n.fields[kl] = t), { mapValue: n };
	}(n, t) : e instanceof bd ? xd(e, t) : e instanceof Sd ? Cd(e, t) : e instanceof Td ? function(e, t) {
		let n = vd(e, t), r = kd(n) + kd(e.Ae);
		return Ql(n) && Ql(e.Ae) ? pd(r) : fd(e.serializer, r);
	}(e, t) : e instanceof Ed ? function(e, t) {
		return Od(e, t, Math.min);
	}(e, t) : e instanceof Dd ? function(e, t) {
		return Od(e, t, Math.max);
	}(e, t) : void 0;
}
function _d(e, t, n) {
	return e instanceof bd ? xd(e, t) : e instanceof Sd ? Cd(e, t) : n;
}
function vd(e, t) {
	return e instanceof Td ? $l(t) ? t : { integerValue: 0 } : null;
}
var yd = class extends hd {}, bd = class extends hd {
	constructor(e) {
		super(), this.elements = e;
	}
};
function xd(e, t) {
	let n = Ad(t);
	for (let t of e.elements) n.some(((e) => Wl(e, t))) || n.push(t);
	return { arrayValue: { values: n } };
}
var Sd = class extends hd {
	constructor(e) {
		super(), this.elements = e;
	}
};
function Cd(e, t) {
	let n = Ad(t);
	for (let t of e.elements) n = n.filter(((e) => !Wl(e, t)));
	return { arrayValue: { values: n } };
}
var wd = class extends hd {
	constructor(e, t) {
		super(), this.serializer = e, this.Ae = t;
	}
}, Td = class extends wd {}, Ed = class extends wd {}, Dd = class extends wd {};
function Od(e, t, n) {
	if (!$l(t)) return e.Ae;
	let r = n(kd(t), kd(e.Ae));
	return Ql(t) && Ql(e.Ae) ? pd(r) : fd(e.serializer, r);
}
function kd(e) {
	return K(e.integerValue || e.doubleValue);
}
function Ad(e) {
	return eu(e) && e.arrayValue.values ? e.arrayValue.values.slice() : [];
}
var jd = class {
	constructor(e, t) {
		this.field = e, this.transform = t;
	}
};
function Md(e, t) {
	return e.field.isEqual(t.field) && function(e, t) {
		return e instanceof bd && t instanceof bd || e instanceof Sd && t instanceof Sd ? Fc(e.elements, t.elements, Wl) : e instanceof Td && t instanceof Td || e instanceof Ed && t instanceof Ed || e instanceof Dd && t instanceof Dd ? Wl(e.Ae, t.Ae) : e instanceof yd && t instanceof yd;
	}(e.transform, t.transform);
}
var Nd = class {
	constructor(e, t) {
		this.version = e, this.transformResults = t;
	}
}, Pd = class e {
	constructor(e, t) {
		this.updateTime = e, this.exists = t;
	}
	static none() {
		return new e();
	}
	static exists(t) {
		return new e(void 0, t);
	}
	static updateTime(t) {
		return new e(t);
	}
	get isNone() {
		return this.updateTime === void 0 && this.exists === void 0;
	}
	isEqual(e) {
		return this.exists === e.exists && (this.updateTime ? !!e.updateTime && this.updateTime.isEqual(e.updateTime) : !e.updateTime);
	}
};
function Fd(e, t) {
	return e.updateTime === void 0 ? e.exists === void 0 || e.exists === t.isFoundDocument() : t.isFoundDocument() && t.version.isEqual(e.updateTime);
}
var Id = class {};
function Ld(e, t) {
	if (!e.hasLocalMutations || t && t.fields.length === 0) return null;
	if (t === null) return e.isNoDocument() ? new qd(e.key, Pd.none()) : new Hd(e.key, e.data, Pd.none());
	{
		let n = e.data, r = su.empty(), i = new G(zc.comparator);
		for (let e of t.fields) if (!i.has(e)) {
			let t = n.field(e);
			t === null && e.length > 1 && (e = e.popLast(), t = n.field(e)), t === null ? r.delete(e) : r.set(e, t), i = i.add(e);
		}
		return new Ud(e.key, r, new xl(i.toArray()), Pd.none());
	}
}
function Rd(e, t, n) {
	e instanceof Hd ? function(e, t, n) {
		let r = e.value.clone(), i = Gd(e.fieldTransforms, t, n.transformResults);
		r.setAll(i), t.convertToFoundDocument(n.version, r).setHasCommittedMutations();
	}(e, t, n) : e instanceof Ud ? function(e, t, n) {
		if (!Fd(e.precondition, t)) return void t.convertToUnknownDocument(n.version);
		let r = Gd(e.fieldTransforms, t, n.transformResults), i = t.data;
		i.setAll(Wd(e)), i.setAll(r), t.convertToFoundDocument(n.version, i).setHasCommittedMutations();
	}(e, t, n) : function(e, t, n) {
		t.convertToNoDocument(n.version).setHasCommittedMutations();
	}(0, t, n);
}
function zd(e, t, n, r) {
	return e instanceof Hd ? function(e, t, n, r) {
		if (!Fd(e.precondition, t)) return n;
		let i = e.value.clone(), a = Kd(e.fieldTransforms, r, t);
		return i.setAll(a), t.convertToFoundDocument(t.version, i).setHasLocalMutations(), null;
	}(e, t, n, r) : e instanceof Ud ? function(e, t, n, r) {
		if (!Fd(e.precondition, t)) return n;
		let i = Kd(e.fieldTransforms, r, t), a = t.data;
		return a.setAll(Wd(e)), a.setAll(i), t.convertToFoundDocument(t.version, a).setHasLocalMutations(), n === null ? null : n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map(((e) => e.field)));
	}(e, t, n, r) : function(e, t, n) {
		return Fd(e.precondition, t) ? (t.convertToNoDocument(t.version).setHasLocalMutations(), null) : n;
	}(e, t, n);
}
function Bd(e, t) {
	let n = null;
	for (let r of e.fieldTransforms) {
		let e = t.data.field(r.field), i = vd(r.transform, e || null);
		i != null && (n === null && (n = su.empty()), n.set(r.field, i));
	}
	return n || null;
}
function Vd(e, t) {
	return e.type === t.type && !!e.key.isEqual(t.key) && !!e.precondition.isEqual(t.precondition) && !!function(e, t) {
		return e === void 0 && t === void 0 || !(!e || !t) && Fc(e, t, ((e, t) => Md(e, t)));
	}(e.fieldTransforms, t.fieldTransforms) && (e.type === 0 ? e.value.isEqual(t.value) : e.type !== 1 || e.data.isEqual(t.data) && e.fieldMask.isEqual(t.fieldMask));
}
var Hd = class extends Id {
	constructor(e, t, n, r = []) {
		super(), this.key = e, this.value = t, this.precondition = n, this.fieldTransforms = r, this.type = 0;
	}
	getFieldMask() {
		return null;
	}
}, Ud = class extends Id {
	constructor(e, t, n, r, i = []) {
		super(), this.key = e, this.data = t, this.fieldMask = n, this.precondition = r, this.fieldTransforms = i, this.type = 1;
	}
	getFieldMask() {
		return this.fieldMask;
	}
};
function Wd(e) {
	let t = /* @__PURE__ */ new Map();
	return e.fieldMask.fields.forEach(((n) => {
		if (!n.isEmpty()) {
			let r = e.data.field(n);
			t.set(n, r);
		}
	})), t;
}
function Gd(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	N(e.length === n.length, 32656, {
		Ve: n.length,
		de: e.length
	});
	for (let i = 0; i < n.length; i++) {
		let a = e[i], o = a.transform, s = t.data.field(a.field);
		r.set(a.field, _d(o, s, n[i]));
	}
	return r;
}
function Kd(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = i.transform, a = n.data.field(i.field);
		r.set(i.field, gd(e, a, t));
	}
	return r;
}
var qd = class extends Id {
	constructor(e, t) {
		super(), this.key = e, this.precondition = t, this.type = 2, this.fieldTransforms = [];
	}
	getFieldMask() {
		return null;
	}
}, Jd = class extends Id {
	constructor(e, t) {
		super(), this.key = e, this.precondition = t, this.type = 3, this.fieldTransforms = [];
	}
	getFieldMask() {
		return null;
	}
}, Yd = class {
	constructor(e, t, n, r) {
		this.batchId = e, this.localWriteTime = t, this.baseMutations = n, this.mutations = r;
	}
	applyToRemoteDocument(e, t) {
		let n = t.mutationResults;
		for (let t = 0; t < this.mutations.length; t++) {
			let r = this.mutations[t];
			r.key.isEqual(e.key) && Rd(r, e, n[t]);
		}
	}
	applyToLocalView(e, t) {
		for (let n of this.baseMutations) n.key.isEqual(e.key) && (t = zd(n, e, t, this.localWriteTime));
		for (let n of this.mutations) n.key.isEqual(e.key) && (t = zd(n, e, t, this.localWriteTime));
		return t;
	}
	applyToLocalDocumentSet(e, t) {
		let n = od();
		return this.mutations.forEach(((r) => {
			let i = e.get(r.key), a = i.overlayedDocument, o = this.applyToLocalView(a, i.mutatedFields);
			o = t.has(r.key) ? null : o;
			let s = Ld(a, o);
			s !== null && n.set(r.key, s), a.isValidDocument() || a.convertToNoDocument(H.min());
		})), n;
	}
	keys() {
		return this.mutations.reduce(((e, t) => e.add(t.key)), J());
	}
	isEqual(e) {
		return this.batchId === e.batchId && Fc(this.mutations, e.mutations, ((e, t) => Vd(e, t))) && Fc(this.baseMutations, e.baseMutations, ((e, t) => Vd(e, t)));
	}
}, Xd = class e {
	constructor(e, t, n, r) {
		this.batch = e, this.commitVersion = t, this.mutationResults = n, this.docVersions = r;
	}
	static from(t, n, r) {
		N(t.mutations.length === r.length, 58842, {
			me: t.mutations.length,
			fe: r.length
		});
		let i = function() {
			return cd;
		}(), a = t.mutations;
		for (let e = 0; e < a.length; e++) i = i.insert(a[e].key, r[e].version);
		return new e(t, n, r, i);
	}
}, Zd = class {
	constructor(e, t) {
		this.largestBatchId = e, this.mutation = t;
	}
	getKey() {
		return this.mutation.key;
	}
	isEqual(e) {
		return e !== null && this.mutation === e.mutation;
	}
	toString() {
		return `Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`;
	}
}, Qd = class {
	constructor(e, t) {
		this.count = e, this.unchangedNames = t;
	}
}, Y, X;
function $d(e) {
	switch (e) {
		case F.OK: return M(64938);
		case F.CANCELLED:
		case F.UNKNOWN:
		case F.DEADLINE_EXCEEDED:
		case F.RESOURCE_EXHAUSTED:
		case F.INTERNAL:
		case F.UNAVAILABLE:
		case F.UNAUTHENTICATED: return !1;
		case F.INVALID_ARGUMENT:
		case F.NOT_FOUND:
		case F.ALREADY_EXISTS:
		case F.PERMISSION_DENIED:
		case F.FAILED_PRECONDITION:
		case F.ABORTED:
		case F.OUT_OF_RANGE:
		case F.UNIMPLEMENTED:
		case F.DATA_LOSS: return !0;
		default: return M(15467, { code: e });
	}
}
function ef(e) {
	if (e === void 0) return gc("GRPC error has no .code"), F.UNKNOWN;
	switch (e) {
		case Y.OK: return F.OK;
		case Y.CANCELLED: return F.CANCELLED;
		case Y.UNKNOWN: return F.UNKNOWN;
		case Y.DEADLINE_EXCEEDED: return F.DEADLINE_EXCEEDED;
		case Y.RESOURCE_EXHAUSTED: return F.RESOURCE_EXHAUSTED;
		case Y.INTERNAL: return F.INTERNAL;
		case Y.UNAVAILABLE: return F.UNAVAILABLE;
		case Y.UNAUTHENTICATED: return F.UNAUTHENTICATED;
		case Y.INVALID_ARGUMENT: return F.INVALID_ARGUMENT;
		case Y.NOT_FOUND: return F.NOT_FOUND;
		case Y.ALREADY_EXISTS: return F.ALREADY_EXISTS;
		case Y.PERMISSION_DENIED: return F.PERMISSION_DENIED;
		case Y.FAILED_PRECONDITION: return F.FAILED_PRECONDITION;
		case Y.ABORTED: return F.ABORTED;
		case Y.OUT_OF_RANGE: return F.OUT_OF_RANGE;
		case Y.UNIMPLEMENTED: return F.UNIMPLEMENTED;
		case Y.DATA_LOSS: return F.DATA_LOSS;
		default: return M(39323, { code: e });
	}
}
(X = Y || (Y = {}))[X.OK = 0] = "OK", X[X.CANCELLED = 1] = "CANCELLED", X[X.UNKNOWN = 2] = "UNKNOWN", X[X.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", X[X.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", X[X.NOT_FOUND = 5] = "NOT_FOUND", X[X.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", X[X.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", X[X.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", X[X.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", X[X.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", X[X.ABORTED = 10] = "ABORTED", X[X.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", X[X.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", X[X.INTERNAL = 13] = "INTERNAL", X[X.UNAVAILABLE = 14] = "UNAVAILABLE", X[X.DATA_LOSS = 15] = "DATA_LOSS";
var tf = null;
function nf() {
	return new TextEncoder();
}
var rf = new ec([4294967295, 4294967295], 0);
function af(e) {
	let t = nf().encode(e), n = new tc();
	return n.update(t), new Uint8Array(n.digest());
}
function of(e) {
	let t = new DataView(e.buffer), n = t.getUint32(0, !0), r = t.getUint32(4, !0), i = t.getUint32(8, !0), a = t.getUint32(12, !0);
	return [new ec([n, r], 0), new ec([i, a], 0)];
}
var sf = class e {
	constructor(e, t, n) {
		if (this.bitmap = e, this.padding = t, this.hashCount = n, t < 0 || t >= 8) throw new cf(`Invalid padding: ${t}`);
		if (n < 0 || e.length > 0 && this.hashCount === 0) throw new cf(`Invalid hash count: ${n}`);
		if (e.length === 0 && t !== 0) throw new cf(`Invalid padding when bitmap length is 0: ${t}`);
		this.ge = 8 * e.length - t, this.pe = ec.fromNumber(this.ge);
	}
	ye(e, t, n) {
		let r = e.add(t.multiply(ec.fromNumber(n)));
		return r.compare(rf) === 1 && (r = new ec([r.getBits(0), r.getBits(1)], 0)), r.modulo(this.pe).toNumber();
	}
	we(e) {
		return !!(this.bitmap[Math.floor(e / 8)] & 1 << e % 8);
	}
	mightContain(e) {
		if (this.ge === 0) return !1;
		let [t, n] = of(af(e));
		for (let e = 0; e < this.hashCount; e++) {
			let r = this.ye(t, n, e);
			if (!this.we(r)) return !1;
		}
		return !0;
	}
	static create(t, n, r) {
		let i = t % 8 == 0 ? 0 : 8 - t % 8, a = new e(new Uint8Array(Math.ceil(t / 8)), i, n);
		return r.forEach(((e) => a.insert(e))), a;
	}
	insert(e) {
		if (this.ge === 0) return;
		let [t, n] = of(af(e));
		for (let e = 0; e < this.hashCount; e++) {
			let r = this.ye(t, n, e);
			this.Se(r);
		}
	}
	Se(e) {
		let t = Math.floor(e / 8), n = e % 8;
		this.bitmap[t] |= 1 << n;
	}
}, cf = class extends Error {
	constructor() {
		super(...arguments), this.name = "BloomFilterError";
	}
}, lf = class e {
	constructor(e, t, n, r, i) {
		this.snapshotVersion = e, this.targetChanges = t, this.targetMismatches = n, this.documentUpdates = r, this.resolvedLimboDocuments = i;
	}
	static createSynthesizedRemoteEventForCurrentChange(t, n, r) {
		let i = /* @__PURE__ */ new Map();
		return i.set(t, uf.createSynthesizedTargetChangeForCurrentChange(t, n, r)), new e(H.min(), i, new W(L), td(), J());
	}
}, uf = class e {
	constructor(e, t, n, r, i) {
		this.resumeToken = e, this.current = t, this.addedDocuments = n, this.modifiedDocuments = r, this.removedDocuments = i;
	}
	static createSynthesizedTargetChangeForCurrentChange(t, n, r) {
		return new e(r, n, J(), J(), J());
	}
}, df = class {
	constructor(e, t, n, r) {
		this.be = e, this.removedTargetIds = t, this.key = n, this.De = r;
	}
}, ff = class {
	constructor(e, t) {
		this.targetId = e, this.Ce = t;
	}
}, pf = class {
	constructor(e, t, n = Cl.EMPTY_BYTE_STRING, r = null) {
		this.state = e, this.targetIds = t, this.resumeToken = n, this.cause = r;
	}
}, mf = class {
	constructor(e) {
		this.targetId = e, this.ve = 0, this.Fe = vf(), this.Me = Cl.EMPTY_BYTE_STRING, this.xe = !1, this.Oe = !0;
	}
	get current() {
		return this.xe;
	}
	get resumeToken() {
		return this.Me;
	}
	get Ne() {
		return this.ve !== 0;
	}
	get Be() {
		return this.Oe;
	}
	Le(e) {
		e.approximateByteSize() > 0 && (this.Oe = !0, this.Me = e);
	}
	ke() {
		let e = J(), t = J(), n = J();
		return this.Fe.forEach(((r, i) => {
			switch (i) {
				case 0:
					e = e.add(r);
					break;
				case 2:
					t = t.add(r);
					break;
				case 1:
					n = n.add(r);
					break;
				default: M(38017, { changeType: i });
			}
		})), new uf(this.Me, this.xe, e, t, n);
	}
	qe() {
		this.Oe = !1, this.Fe = vf();
	}
	Ke(e, t) {
		this.Oe = !0, this.Fe = this.Fe.insert(e, t);
	}
	Ue(e) {
		this.Oe = !0, this.Fe = this.Fe.remove(e);
	}
	$e() {
		this.ve += 1;
	}
	We() {
		--this.ve, N(this.ve >= 0, 3241, {
			ve: this.ve,
			targetId: this.targetId
		});
	}
	Qe() {
		this.Oe = !0, this.xe = !0;
	}
}, hf = "WatchChangeAggregator", gf = class {
	constructor(e) {
		this.Ge = e, this.ze = /* @__PURE__ */ new Map(), this.je = td(), this.Je = _f(), this.He = _f(), this.Ze = new W(L);
	}
	Xe(e) {
		for (let t of e.be) e.De && e.De.isFoundDocument() ? this.Ye(t, e.De) : this.et(t, e.key, e.De);
		for (let t of e.removedTargetIds) this.et(t, e.key, e.De);
	}
	tt(e) {
		this.forEachTarget(e, ((t) => {
			let n = this.ze.get(t);
			if (n) switch (e.state) {
				case 0:
					this.nt(t) && n.Le(e.resumeToken);
					break;
				case 1:
					n.We(), n.Ne || n.qe(), n.Le(e.resumeToken);
					break;
				case 2:
					n.We(), n.Ne || this.removeTarget(t);
					break;
				case 3:
					this.nt(t) && (n.Qe(), n.Le(e.resumeToken));
					break;
				case 4:
					this.nt(t) && (this.rt(t), n.Le(e.resumeToken));
					break;
				default: M(56790, { state: e.state });
			}
			else j(hf, `handleTargetChange received targetChange for untracked target ID (${t}) with state (${e.state})`);
		}));
	}
	forEachTarget(e, t) {
		e.targetIds.length > 0 ? e.targetIds.forEach(t) : this.ze.forEach(((e, n) => {
			this.nt(n) && t(n);
		}));
	}
	it(e) {
		let t = e.targetId, n = e.Ce.count, r = this.st(t);
		if (r) {
			let i = r.target;
			if (Fu(i)) if (n === 0) {
				let e = new z(i.path);
				this.et(t, e, lu.newNoDocument(e, H.min()));
			} else N(n === 1, 20013, { expectedCount: n });
			else {
				let r = this.ot(t);
				if (r !== n) {
					let n = this._t(e), i = n ? this.ut(n, e, r) : 1;
					if (i !== 0) {
						this.rt(t);
						let e = i === 2 ? "TargetPurposeExistenceFilterMismatchBloom" : "TargetPurposeExistenceFilterMismatch";
						this.Ze = this.Ze.insert(t, e);
					}
					tf?.o(function(e, t, n, r, i) {
						let a = {
							localCacheCount: e,
							existenceFilterCount: t.count,
							databaseId: n.database,
							projectId: n.projectId
						}, o = t.unchangedNames;
						return o && (a.bloomFilter = {
							applied: i === 0,
							hashCount: o?.hashCount ?? 0,
							bitmapLength: o?.bits?.bitmap?.length ?? 0,
							padding: o?.bits?.padding ?? 0,
							mightContain: (e) => r?.mightContain(e) ?? !1
						}), a;
					}(r, e.Ce, this.Ge.lt(), n, i));
				}
			}
		}
	}
	_t(e) {
		let t = e.Ce.unchangedNames;
		if (!t || !t.bits) return null;
		let { bits: { bitmap: n = "", padding: r = 0 }, hashCount: i = 0 } = t, a, o;
		try {
			a = El(n).toUint8Array();
		} catch (e) {
			if (e instanceof Sl) return _c("Decoding the base64 bloom filter in existence filter failed (" + e.message + "); ignoring the bloom filter and falling back to full re-query."), null;
			throw e;
		}
		try {
			o = new sf(a, r, i);
		} catch (e) {
			return _c(e instanceof cf ? "BloomFilter error: " : "Applying bloom filter failed: ", e), null;
		}
		return o.ge === 0 ? null : o;
	}
	ut(e, t, n) {
		return t.Ce.count === n - this.ht(e, t.targetId) ? 0 : 2;
	}
	ht(e, t) {
		let n = this.Ge.getRemoteKeysForTarget(t), r = 0;
		return n.forEach(((n) => {
			let i = this.Ge.lt(), a = `projects/${i.projectId}/databases/${i.database}/documents/${n.path.canonicalString()}`;
			e.mightContain(a) || (this.et(t, n, null), r++);
		})), r;
	}
	Pt(e) {
		let t = /* @__PURE__ */ new Map();
		this.ze.forEach(((n, r) => {
			let i = this.st(r);
			if (i) {
				if (n.current && Fu(i.target)) {
					let t = new z(i.target.path);
					this.Tt(t).has(r) || this.It(r, t) || this.et(r, t, lu.newNoDocument(t, e));
				}
				n.Be && (t.set(r, n.ke()), n.qe());
			}
		}));
		let n = J();
		this.He.forEach(((e, t) => {
			let r = !0;
			t.forEachWhile(((e) => {
				let t = this.st(e);
				return !t || t.purpose === "TargetPurposeLimboResolution" || (r = !1, !1);
			})), r && (n = n.add(e));
		})), this.je.forEach(((t, n) => n.setReadTime(e)));
		let r = new lf(e, t, this.Ze, this.je, n);
		return this.je = td(), this.Je = _f(), this.He = _f(), this.Ze = new W(L), r;
	}
	Ye(e, t) {
		let n = this.ze.get(e);
		if (!n || !this.nt(e)) return void j(hf, `addDocumentToTarget received document for unknown inactive target (${e})`);
		let r = this.It(e, t.key) ? 2 : 0;
		n.Ke(t.key, r), this.je = this.je.insert(t.key, t), this.Je = this.Je.insert(t.key, this.Tt(t.key).add(e)), this.He = this.He.insert(t.key, this.Et(t.key).add(e));
	}
	et(e, t, n) {
		let r = this.ze.get(e);
		r && this.nt(e) ? (this.It(e, t) ? r.Ke(t, 1) : r.Ue(t), this.He = this.He.insert(t, this.Et(t).delete(e)), this.He = this.He.insert(t, this.Et(t).add(e)), n && (this.je = this.je.insert(t, n))) : j(hf, `removeDocumentFromTarget received document for unknown or inactive target (${e})`);
	}
	removeTarget(e) {
		this.ze.delete(e);
	}
	ot(e) {
		let t = this.ze.get(e);
		if (!t) return 0;
		let n = t.ke();
		return this.Ge.getRemoteKeysForTarget(e).size + n.addedDocuments.size - n.removedDocuments.size;
	}
	$e(e) {
		let t = this.ze.get(e);
		t || (j(hf, `recordPendingTargetRequest set up tracking for target ID ${e}`), t = new mf(e), this.ze.set(e, t)), t.$e();
	}
	Et(e) {
		let t = this.He.get(e);
		return t || (t = new G(L), this.He = this.He.insert(e, t)), t;
	}
	Tt(e) {
		let t = this.Je.get(e);
		return t || (t = new G(L), this.Je = this.Je.insert(e, t)), t;
	}
	nt(e) {
		let t = this.st(e) !== null;
		return t || j(hf, "Detected inactive target", e), t;
	}
	st(e) {
		let t = this.ze.get(e);
		return t === void 0 || t.Ne ? null : this.Ge.Rt(e);
	}
	rt(e) {
		this.ze.set(e, new mf(e)), this.Ge.getRemoteKeysForTarget(e).forEach(((t) => {
			this.et(e, t, null);
		}));
	}
	It(e, t) {
		return this.Ge.getRemoteKeysForTarget(e).has(t);
	}
};
function _f() {
	return new W(z.comparator);
}
function vf() {
	return new W(z.comparator);
}
var yf = {
	asc: "ASCENDING",
	desc: "DESCENDING"
}, bf = {
	"<": "LESS_THAN",
	"<=": "LESS_THAN_OR_EQUAL",
	">": "GREATER_THAN",
	">=": "GREATER_THAN_OR_EQUAL",
	"==": "EQUAL",
	"!=": "NOT_EQUAL",
	"array-contains": "ARRAY_CONTAINS",
	in: "IN",
	"not-in": "NOT_IN",
	"array-contains-any": "ARRAY_CONTAINS_ANY"
}, xf = {
	and: "AND",
	or: "OR"
}, Sf = class {
	constructor(e, t) {
		this.databaseId = e, this.useProto3Json = t;
	}
};
function Cf(e, t) {
	return e.useProto3Json || cl(t) ? t : { value: t };
}
function wf(e, t) {
	return e.useProto3Json ? `${(/* @__PURE__ */ new Date(1e3 * t.seconds)).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + t.nanoseconds).slice(-9)}Z` : {
		seconds: "" + t.seconds,
		nanos: t.nanoseconds
	};
}
function Tf(e, t) {
	return e.useProto3Json ? t.toBase64() : t.toUint8Array();
}
function Ef(e, t) {
	return wf(e, t.toTimestamp());
}
function Df(e) {
	return N(!!e, 49232), H.fromTimestamp(function(e) {
		let t = Tl(e);
		return new V(t.seconds, t.nanos);
	}(e));
}
function Of(e, t) {
	return kf(e, t).canonicalString();
}
function kf(e, t) {
	let n = function(e) {
		return new R([
			"projects",
			e.projectId,
			"databases",
			e.database
		]);
	}(e).child("documents");
	return t === void 0 ? n : n.child(t);
}
function Af(e) {
	let t = R.fromString(e);
	return N($f(t), 10190, { key: t.toString() }), t;
}
function jf(e, t) {
	return Of(e.databaseId, t.path);
}
function Mf(e, t) {
	let n = Af(t);
	if (n.get(1) !== e.databaseId.projectId) throw new I(F.INVALID_ARGUMENT, "Tried to deserialize key from different project: " + n.get(1) + " vs " + e.databaseId.projectId);
	if (n.get(3) !== e.databaseId.database) throw new I(F.INVALID_ARGUMENT, "Tried to deserialize key from different database: " + n.get(3) + " vs " + e.databaseId.database);
	return new z(If(n));
}
function Nf(e, t) {
	return Of(e.databaseId, t);
}
function Pf(e) {
	let t = Af(e);
	return t.length === 4 ? R.emptyPath() : If(t);
}
function Ff(e) {
	return new R([
		"projects",
		e.databaseId.projectId,
		"databases",
		e.databaseId.database
	]).canonicalString();
}
function If(e) {
	return N(e.length > 4 && e.get(4) === "documents", 29091, { key: e.toString() }), e.popFirst(5);
}
function Lf(e, t, n) {
	return {
		name: jf(e, t),
		fields: n.value.mapValue.fields
	};
}
function Rf(e, t) {
	let n;
	if ("targetChange" in t) {
		t.targetChange;
		let r = function(e) {
			return e === "NO_CHANGE" ? 0 : e === "ADD" ? 1 : e === "REMOVE" ? 2 : e === "CURRENT" ? 3 : e === "RESET" ? 4 : M(39313, { state: e });
		}(t.targetChange.targetChangeType || "NO_CHANGE"), i = t.targetChange.targetIds || [], a = function(e, t) {
			return e.useProto3Json ? (N(t === void 0 || typeof t == "string", 58123), Cl.fromBase64String(t || "")) : (N(t === void 0 || t instanceof Buffer || t instanceof Uint8Array, 16193), Cl.fromUint8Array(t || new Uint8Array()));
		}(e, t.targetChange.resumeToken), o = t.targetChange.cause;
		n = new pf(r, i, a, o && function(e) {
			return new I(e.code === void 0 ? F.UNKNOWN : ef(e.code), e.message || "");
		}(o) || null);
	} else if ("documentChange" in t) {
		t.documentChange;
		let r = t.documentChange;
		r.document, r.document.name, r.document.updateTime;
		let i = Mf(e, r.document.name), a = Df(r.document.updateTime), o = r.document.createTime ? Df(r.document.createTime) : H.min(), s = new su({ mapValue: { fields: r.document.fields } }), c = lu.newFoundDocument(i, a, o, s);
		n = new df(r.targetIds || [], r.removedTargetIds || [], c.key, c);
	} else if ("documentDelete" in t) {
		t.documentDelete;
		let r = t.documentDelete;
		r.document;
		let i = Mf(e, r.document), a = r.readTime ? Df(r.readTime) : H.min(), o = lu.newNoDocument(i, a);
		n = new df([], r.removedTargetIds || [], o.key, o);
	} else if ("documentRemove" in t) {
		t.documentRemove;
		let r = t.documentRemove;
		r.document;
		let i = Mf(e, r.document);
		n = new df([], r.removedTargetIds || [], i, null);
	} else {
		if (!("filter" in t)) return M(11601, { At: t });
		{
			t.filter;
			let e = t.filter;
			e.targetId;
			let { count: r = 0, unchangedNames: i } = e, a = new Qd(r, i), o = e.targetId;
			n = new ff(o, a);
		}
	}
	return n;
}
function zf(e, t) {
	let n;
	if (t instanceof Hd) n = { update: Lf(e, t.key, t.value) };
	else if (t instanceof qd) n = { delete: jf(e, t.key) };
	else if (t instanceof Ud) n = {
		update: Lf(e, t.key, t.data),
		updateMask: Qf(t.fieldMask)
	};
	else {
		if (!(t instanceof Jd)) return M(16599, { Vt: t.type });
		n = { verify: jf(e, t.key) };
	}
	return t.fieldTransforms.length > 0 && (n.updateTransforms = t.fieldTransforms.map(((e) => function(e, t) {
		let n = t.transform;
		if (n instanceof yd) return {
			fieldPath: t.field.canonicalString(),
			setToServerValue: "REQUEST_TIME"
		};
		if (n instanceof bd) return {
			fieldPath: t.field.canonicalString(),
			appendMissingElements: { values: n.elements }
		};
		if (n instanceof Sd) return {
			fieldPath: t.field.canonicalString(),
			removeAllFromArray: { values: n.elements }
		};
		if (n instanceof Td) return {
			fieldPath: t.field.canonicalString(),
			increment: n.Ae
		};
		if (n instanceof Ed) return {
			fieldPath: t.field.canonicalString(),
			minimum: n.Ae
		};
		if (n instanceof Dd) return {
			fieldPath: t.field.canonicalString(),
			maximum: n.Ae
		};
		throw M(20930, { transform: t.transform });
	}(0, e)))), t.precondition.isNone || (n.currentDocument = function(e, t) {
		return t.updateTime === void 0 ? t.exists === void 0 ? M(27497) : { exists: t.exists } : { updateTime: Ef(e, t.updateTime) };
	}(e, t.precondition)), n;
}
function Bf(e, t) {
	return e && e.length > 0 ? (N(t !== void 0, 14353), e.map(((e) => function(e, t) {
		let n = e.updateTime ? Df(e.updateTime) : Df(t);
		return n.isEqual(H.min()) && (n = Df(t)), new Nd(n, e.transformResults || []);
	}(e, t)))) : [];
}
function Vf(e, t) {
	return { documents: [Nf(e, t.path)] };
}
function Hf(e, t) {
	let n = { structuredQuery: {} }, r = t.path, i;
	t.collectionGroup === null ? (i = r.popLast(), n.structuredQuery.from = [{ collectionId: r.lastSegment() }]) : (i = r, n.structuredQuery.from = [{
		collectionId: t.collectionGroup,
		allDescendants: !0
	}]), n.parent = Nf(e, i);
	let a = function(e) {
		if (e.length !== 0) return Zf(gu.create(e, "and"));
	}(t.filters);
	a && (n.structuredQuery.where = a);
	let o = function(e) {
		if (e.length !== 0) return e.map(((e) => function(e) {
			return {
				field: Yf(e.field),
				direction: Kf(e.dir)
			};
		}(e)));
	}(t.orderBy);
	o && (n.structuredQuery.orderBy = o);
	let s = Cf(e, t.limit);
	return s !== null && (n.structuredQuery.limit = s), t.startAt && (n.structuredQuery.startAt = function(e) {
		return {
			before: e.inclusive,
			values: e.position
		};
	}(t.startAt)), t.endAt && (n.structuredQuery.endAt = function(e) {
		return {
			before: !e.inclusive,
			values: e.position
		};
	}(t.endAt)), {
		dt: n,
		parent: i
	};
}
function Uf(e) {
	let t = Pf(e.parent), n = e.structuredQuery, r = n.from ? n.from.length : 0, i = null;
	if (r > 0) {
		N(r === 1, 65062);
		let e = n.from[0];
		e.allDescendants ? i = e.collectionId : t = t.child(e.collectionId);
	}
	let a = [];
	n.where && (a = function(e) {
		let t = Gf(e);
		return t instanceof gu && vu(t) ? t.getFilters() : [t];
	}(n.where));
	let o = [];
	n.orderBy && (o = function(e) {
		return e.map(((e) => function(e) {
			return new pu(Xf(e.field), function(e) {
				switch (e) {
					case "ASCENDING": return "asc";
					case "DESCENDING": return "desc";
					default: return;
				}
			}(e.direction));
		}(e)));
	}(n.orderBy));
	let s = null;
	n.limit && (s = function(e) {
		let t;
		return t = typeof e == "object" ? e.value : e, cl(t) ? null : t;
	}(n.limit));
	let c = null;
	n.startAt && (c = function(e) {
		let t = !!e.before;
		return new uu(e.values || [], t);
	}(n.startAt));
	let l = null;
	return n.endAt && (l = function(e) {
		let t = !e.before;
		return new uu(e.values || [], t);
	}(n.endAt)), Lu(t, i, o, a, s, "F", c, l);
}
function Wf(e, t) {
	let n = function(e) {
		switch (e) {
			case "TargetPurposeListen": return null;
			case "TargetPurposeExistenceFilterMismatch": return "existence-filter-mismatch";
			case "TargetPurposeExistenceFilterMismatchBloom": return "existence-filter-mismatch-bloom";
			case "TargetPurposeLimboResolution": return "limbo-document";
			default: return M(28987, { purpose: e });
		}
	}(t.purpose);
	return n == null ? null : { "goog-listen-tags": n };
}
function Gf(e) {
	return e.unaryFilter === void 0 ? e.fieldFilter === void 0 ? e.compositeFilter === void 0 ? M(30097, { filter: e }) : function(e) {
		return gu.create(e.compositeFilter.filters.map(((e) => Gf(e))), function(e) {
			switch (e) {
				case "AND": return "and";
				case "OR": return "or";
				default: return M(1026);
			}
		}(e.compositeFilter.op));
	}(e) : function(e) {
		return q.create(Xf(e.fieldFilter.field), function(e) {
			switch (e) {
				case "EQUAL": return "==";
				case "NOT_EQUAL": return "!=";
				case "GREATER_THAN": return ">";
				case "GREATER_THAN_OR_EQUAL": return ">=";
				case "LESS_THAN": return "<";
				case "LESS_THAN_OR_EQUAL": return "<=";
				case "ARRAY_CONTAINS": return "array-contains";
				case "IN": return "in";
				case "NOT_IN": return "not-in";
				case "ARRAY_CONTAINS_ANY": return "array-contains-any";
				case "OPERATOR_UNSPECIFIED": return M(58110);
				default: return M(50506);
			}
		}(e.fieldFilter.op), e.fieldFilter.value);
	}(e) : function(e) {
		switch (e.unaryFilter.op) {
			case "IS_NAN":
				let t = Xf(e.unaryFilter.field);
				return q.create(t, "==", { doubleValue: NaN });
			case "IS_NULL":
				let n = Xf(e.unaryFilter.field);
				return q.create(n, "==", { nullValue: "NULL_VALUE" });
			case "IS_NOT_NAN":
				let r = Xf(e.unaryFilter.field);
				return q.create(r, "!=", { doubleValue: NaN });
			case "IS_NOT_NULL":
				let i = Xf(e.unaryFilter.field);
				return q.create(i, "!=", { nullValue: "NULL_VALUE" });
			case "OPERATOR_UNSPECIFIED": return M(61313);
			default: return M(60726);
		}
	}(e);
}
function Kf(e) {
	return yf[e];
}
function qf(e) {
	return bf[e];
}
function Jf(e) {
	return xf[e];
}
function Yf(e) {
	return { fieldPath: e.canonicalString() };
}
function Xf(e) {
	return zc.fromServerFormat(e.fieldPath);
}
function Zf(e) {
	return e instanceof q ? function(e) {
		if (e.op === "==") {
			if (nu(e.value)) return { unaryFilter: {
				field: Yf(e.field),
				op: "IS_NAN"
			} };
			if (tu(e.value)) return { unaryFilter: {
				field: Yf(e.field),
				op: "IS_NULL"
			} };
		} else if (e.op === "!=") {
			if (nu(e.value)) return { unaryFilter: {
				field: Yf(e.field),
				op: "IS_NOT_NAN"
			} };
			if (tu(e.value)) return { unaryFilter: {
				field: Yf(e.field),
				op: "IS_NOT_NULL"
			} };
		}
		return { fieldFilter: {
			field: Yf(e.field),
			op: qf(e.op),
			value: e.value
		} };
	}(e) : e instanceof gu ? function(e) {
		let t = e.getFilters().map(((e) => Zf(e)));
		return t.length === 1 ? t[0] : { compositeFilter: {
			op: Jf(e.op),
			filters: t
		} };
	}(e) : M(54877, { filter: e });
}
function Qf(e) {
	let t = [];
	return e.fields.forEach(((e) => t.push(e.canonicalString()))), { fieldPaths: t };
}
function $f(e) {
	return e.length >= 4 && e.get(0) === "projects" && e.get(2) === "databases";
}
function ep(e) {
	return !!e && typeof e._toProto == "function" && e._protoValueType === "ProtoValue";
}
var tp = class e {
	constructor(e, t, n, r, i = H.min(), a = H.min(), o = Cl.EMPTY_BYTE_STRING, s = null) {
		this.target = e, this.targetId = t, this.purpose = n, this.sequenceNumber = r, this.snapshotVersion = i, this.lastLimboFreeSnapshotVersion = a, this.resumeToken = o, this.expectedCount = s;
	}
	withSequenceNumber(t) {
		return new e(this.target, this.targetId, this.purpose, t, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, this.expectedCount);
	}
	withResumeToken(t, n) {
		return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, n, this.lastLimboFreeSnapshotVersion, t, null);
	}
	withExpectedCount(t) {
		return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken, t);
	}
	withLastLimboFreeSnapshotVersion(t) {
		return new e(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, t, this.resumeToken, this.expectedCount);
	}
}, np = class {
	constructor(e) {
		this.gt = e;
	}
};
function rp(e) {
	let t = Uf({
		parent: e.parent,
		structuredQuery: e.structuredQuery
	});
	return e.limitType === "LAST" ? Gu(t, t.limit, "L") : t;
}
var ip = class {
	constructor() {}
	bt(e, t) {
		this.Dt(e, t), t.Ct();
	}
	Dt(e, t) {
		if ("nullValue" in e) this.vt(t, 5);
		else if ("booleanValue" in e) this.vt(t, 10), t.Ft(+!!e.booleanValue);
		else if ("integerValue" in e) this.vt(t, 15), t.Ft(K(e.integerValue));
		else if ("doubleValue" in e) {
			let n = K(e.doubleValue);
			isNaN(n) ? this.vt(t, 13) : (this.vt(t, 15), ll(n) ? t.Ft(0) : t.Ft(n));
		} else if ("timestampValue" in e) {
			let n = e.timestampValue;
			this.vt(t, 20), typeof n == "string" && (n = Tl(n)), t.Mt(`${n.seconds || ""}`), t.Ft(n.nanos || 0);
		} else if ("stringValue" in e) this.xt(e.stringValue, t), this.Ot(t);
		else if ("bytesValue" in e) this.vt(t, 30), t.Nt(El(e.bytesValue)), this.Ot(t);
		else if ("referenceValue" in e) this.Bt(e.referenceValue, t);
		else if ("geoPointValue" in e) {
			let n = e.geoPointValue;
			this.vt(t, 45), t.Ft(n.latitude || 0), t.Ft(n.longitude || 0);
		} else "mapValue" in e ? ou(e) ? this.vt(t, 2 ** 53 - 1) : iu(e) ? this.Lt(e.mapValue, t) : (this.kt(e.mapValue, t), this.Ot(t)) : "arrayValue" in e ? (this.qt(e.arrayValue, t), this.Ot(t)) : M(19022, { Kt: e });
	}
	xt(e, t) {
		this.vt(t, 25), this.Ut(e, t);
	}
	Ut(e, t) {
		t.Mt(e);
	}
	kt(e, t) {
		let n = e.fields || {};
		this.vt(t, 55);
		for (let e of Object.keys(n)) this.xt(e, t), this.Dt(n[e], t);
	}
	Lt(e, t) {
		let n = e.fields || {};
		this.vt(t, 53);
		let r = Hl, i = n[r].arrayValue?.values?.length || 0;
		this.vt(t, 15), t.Ft(K(i)), this.xt(r, t), this.Dt(n[r], t);
	}
	qt(e, t) {
		let n = e.values || [];
		this.vt(t, 50);
		for (let e of n) this.Dt(e, t);
	}
	Bt(e, t) {
		this.vt(t, 37), z.fromName(e).path.forEach(((e) => {
			this.vt(t, 60), this.Ut(e, t);
		}));
	}
	vt(e, t) {
		e.Ft(t);
	}
	Ot(e) {
		e.Ft(2);
	}
};
ip.$t = new ip();
var ap = class {
	constructor() {
		this.Sn = new op();
	}
	addToCollectionParentIndex(e, t) {
		return this.Sn.add(t), U.resolve();
	}
	getCollectionParents(e, t) {
		return U.resolve(this.Sn.getEntries(t));
	}
	addFieldIndex(e, t) {
		return U.resolve();
	}
	deleteFieldIndex(e, t) {
		return U.resolve();
	}
	deleteAllFieldIndexes(e) {
		return U.resolve();
	}
	createTargetIndexes(e, t) {
		return U.resolve();
	}
	getDocumentsMatchingTarget(e, t) {
		return U.resolve(null);
	}
	getIndexType(e, t) {
		return U.resolve(0);
	}
	getFieldIndexes(e, t) {
		return U.resolve([]);
	}
	getNextCollectionGroupToUpdate(e) {
		return U.resolve(null);
	}
	getMinOffset(e, t) {
		return U.resolve($c.min());
	}
	getMinOffsetFromCollectionGroup(e, t) {
		return U.resolve($c.min());
	}
	updateCollectionGroup(e, t, n) {
		return U.resolve();
	}
	updateIndexEntries(e, t) {
		return U.resolve();
	}
}, op = class {
	constructor() {
		this.index = {};
	}
	add(e) {
		let t = e.lastSegment(), n = e.popLast(), r = this.index[t] || new G(R.comparator), i = !r.has(n);
		return this.index[t] = r.add(n), i;
	}
	has(e) {
		let t = e.lastSegment(), n = e.popLast(), r = this.index[t];
		return r && r.has(n);
	}
	getEntries(e) {
		return (this.index[e] || new G(R.comparator)).toArray();
	}
}, sp = {
	didRun: !1,
	sequenceNumbersCollected: 0,
	targetsRemoved: 0,
	documentsRemoved: 0
}, cp = 41943040, lp = class e {
	static withCacheSize(t) {
		return new e(t, e.DEFAULT_COLLECTION_PERCENTILE, e.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
	}
	constructor(e, t, n) {
		this.cacheSizeCollectionThreshold = e, this.percentileToCollect = t, this.maximumSequenceNumbersToCollect = n;
	}
};
lp.DEFAULT_COLLECTION_PERCENTILE = 10, lp.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1e3, lp.DEFAULT = new lp(cp, lp.DEFAULT_COLLECTION_PERCENTILE, lp.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT), lp.DISABLED = new lp(-1, 0, 0);
var up = class e {
	constructor(e) {
		this.ir = e;
	}
	next() {
		return this.ir += 2, this.ir;
	}
	static sr() {
		return new e(0);
	}
	static _r() {
		return new e(-1);
	}
}, dp = "LruGarbageCollector", fp = 1048576;
function pp([e, t], [n, r]) {
	let i = L(e, n);
	return i === 0 ? L(t, r) : i;
}
var mp = class {
	constructor(e) {
		this.hr = e, this.buffer = new G(pp), this.Pr = 0;
	}
	Tr() {
		return ++this.Pr;
	}
	Ir(e) {
		let t = [e, this.Tr()];
		if (this.buffer.size < this.hr) this.buffer = this.buffer.add(t);
		else {
			let e = this.buffer.last();
			pp(t, e) < 0 && (this.buffer = this.buffer.delete(e).add(t));
		}
	}
	get maxValue() {
		return this.buffer.last()[0];
	}
}, hp = class {
	constructor(e, t, n) {
		this.garbageCollector = e, this.asyncQueue = t, this.localStore = n, this.Er = null;
	}
	start() {
		this.garbageCollector.params.cacheSizeCollectionThreshold !== -1 && this.Rr(6e4);
	}
	stop() {
		this.Er && (this.Er.cancel(), this.Er = null);
	}
	get started() {
		return this.Er !== null;
	}
	Rr(e) {
		j(dp, `Garbage collection scheduled in ${e}ms`), this.Er = this.asyncQueue.enqueueAfterDelay("lru_garbage_collection", e, (async () => {
			this.Er = null;
			try {
				await this.localStore.collectGarbage(this.garbageCollector);
			} catch (e) {
				al(e) ? j(dp, "Ignoring IndexedDB error during garbage collection: ", e) : await rl(e);
			}
			await this.Rr(3e5);
		}));
	}
}, gp = class {
	constructor(e, t) {
		this.Ar = e, this.params = t;
	}
	calculateTargetCount(e, t) {
		return this.Ar.Vr(e).next(((e) => Math.floor(t / 100 * e)));
	}
	nthSequenceNumber(e, t) {
		if (t === 0) return U.resolve(ol.ce);
		let n = new mp(t);
		return this.Ar.forEachTarget(e, ((e) => n.Ir(e.sequenceNumber))).next((() => this.Ar.dr(e, ((e) => n.Ir(e))))).next((() => n.maxValue));
	}
	removeTargets(e, t, n) {
		return this.Ar.removeTargets(e, t, n);
	}
	removeOrphanedDocuments(e, t) {
		return this.Ar.removeOrphanedDocuments(e, t);
	}
	collect(e, t) {
		return this.params.cacheSizeCollectionThreshold === -1 ? (j("LruGarbageCollector", "Garbage collection skipped; disabled"), U.resolve(sp)) : this.getCacheSize(e).next(((n) => n < this.params.cacheSizeCollectionThreshold ? (j("LruGarbageCollector", `Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`), sp) : this.mr(e, t)));
	}
	getCacheSize(e) {
		return this.Ar.getCacheSize(e);
	}
	mr(e, t) {
		let n, r, i, a, o, s, c, l = Date.now();
		return this.calculateTargetCount(e, this.params.percentileToCollect).next(((t) => (t > this.params.maximumSequenceNumbersToCollect ? (j("LruGarbageCollector", `Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${t}`), r = this.params.maximumSequenceNumbersToCollect) : r = t, a = Date.now(), this.nthSequenceNumber(e, r)))).next(((r) => (n = r, o = Date.now(), this.removeTargets(e, n, t)))).next(((t) => (i = t, s = Date.now(), this.removeOrphanedDocuments(e, n)))).next(((e) => (c = Date.now(), hc() <= b.DEBUG && j("LruGarbageCollector", `LRU Garbage Collection\n\tCounted targets in ${a - l}ms\n\tDetermined least recently used ${r} in ` + (o - a) + `ms
\tRemoved ${i} targets in ` + (s - o) + `ms
\tRemoved ${e} documents in ` + (c - s) + `ms
Total Duration: ${c - l}ms`), U.resolve({
			didRun: !0,
			sequenceNumbersCollected: r,
			targetsRemoved: i,
			documentsRemoved: e
		}))));
	}
};
function _p(e, t) {
	return new gp(e, t);
}
var vp = class {
	constructor() {
		this.changes = new $u(((e) => e.toString()), ((e, t) => e.isEqual(t))), this.changesApplied = !1;
	}
	addEntry(e) {
		this.assertNotApplied(), this.changes.set(e.key, e);
	}
	removeEntry(e, t) {
		this.assertNotApplied(), this.changes.set(e, lu.newInvalidDocument(e).setReadTime(t));
	}
	getEntry(e, t) {
		this.assertNotApplied();
		let n = this.changes.get(t);
		return n === void 0 ? this.getFromCache(e, t) : U.resolve(n);
	}
	getEntries(e, t) {
		return this.getAllFromCache(e, t);
	}
	apply(e) {
		return this.assertNotApplied(), this.changesApplied = !0, this.applyChanges(e);
	}
	assertNotApplied() {}
}, yp = class {
	constructor(e, t) {
		this.overlayedDocument = e, this.mutatedFields = t;
	}
}, bp = class {
	constructor(e, t, n, r) {
		this.remoteDocumentCache = e, this.mutationQueue = t, this.documentOverlayCache = n, this.indexManager = r;
	}
	getDocument(e, t) {
		let n = null;
		return this.documentOverlayCache.getOverlay(e, t).next(((r) => (n = r, this.remoteDocumentCache.getEntry(e, t)))).next(((e) => (n !== null && zd(n.mutation, e, xl.empty(), V.now()), e)));
	}
	getDocuments(e, t) {
		return this.remoteDocumentCache.getEntries(e, t).next(((t) => this.getLocalViewOfDocuments(e, t, J()).next((() => t))));
	}
	getLocalViewOfDocuments(e, t, n = J()) {
		let r = ad();
		return this.populateOverlays(e, r, t).next((() => this.computeViews(e, t, r, n).next(((e) => {
			let t = rd();
			return e.forEach(((e, n) => {
				t = t.insert(e, n.overlayedDocument);
			})), t;
		}))));
	}
	getOverlayedDocuments(e, t) {
		let n = ad();
		return this.populateOverlays(e, n, t).next((() => this.computeViews(e, t, n, J())));
	}
	populateOverlays(e, t, n) {
		let r = [];
		return n.forEach(((e) => {
			t.has(e) || r.push(e);
		})), this.documentOverlayCache.getOverlays(e, r).next(((e) => {
			e.forEach(((e, n) => {
				t.set(e, n);
			}));
		}));
	}
	computeViews(e, t, n, r) {
		let i = td(), a = sd(), o = function() {
			return sd();
		}();
		return t.forEach(((e, t) => {
			let o = n.get(t.key);
			r.has(t.key) && (o === void 0 || o.mutation instanceof Ud) ? i = i.insert(t.key, t) : o === void 0 ? a.set(t.key, xl.empty()) : (a.set(t.key, o.mutation.getFieldMask()), zd(o.mutation, t, o.mutation.getFieldMask(), V.now()));
		})), this.recalculateAndSaveOverlays(e, i).next(((e) => (e.forEach(((e, t) => a.set(e, t))), t.forEach(((e, t) => o.set(e, new yp(t, a.get(e) ?? null)))), o)));
	}
	recalculateAndSaveOverlays(e, t) {
		let n = sd(), r = new W(((e, t) => e - t)), i = J();
		return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e, t).next(((e) => {
			for (let i of e) i.keys().forEach(((e) => {
				let a = t.get(e);
				if (a === null) return;
				let o = n.get(e) || xl.empty();
				o = i.applyToLocalView(a, o), n.set(e, o);
				let s = (r.get(i.batchId) || J()).add(e);
				r = r.insert(i.batchId, s);
			}));
		})).next((() => {
			let a = [], o = r.getReverseIterator();
			for (; o.hasNext();) {
				let r = o.getNext(), s = r.key, c = r.value, l = od();
				c.forEach(((e) => {
					if (!i.has(e)) {
						let r = Ld(t.get(e), n.get(e));
						r !== null && l.set(e, r), i = i.add(e);
					}
				})), a.push(this.documentOverlayCache.saveOverlays(e, s, l));
			}
			return U.waitFor(a);
		})).next((() => n));
	}
	recalculateAndSaveOverlaysForDocumentKeys(e, t) {
		return this.remoteDocumentCache.getEntries(e, t).next(((t) => this.recalculateAndSaveOverlays(e, t)));
	}
	getDocumentsMatchingQuery(e, t, n, r) {
		return Bu(t) ? this.getDocumentsMatchingDocumentQuery(e, t.path) : Vu(t) ? this.getDocumentsMatchingCollectionGroupQuery(e, t, n, r) : this.getDocumentsMatchingCollectionQuery(e, t, n, r);
	}
	getNextDocuments(e, t, n, r) {
		return this.remoteDocumentCache.getAllFromCollectionGroup(e, t, n, r).next(((i) => {
			let a = r - i.size > 0 ? this.documentOverlayCache.getOverlaysForCollectionGroup(e, t, n.largestBatchId, r - i.size) : U.resolve(ad()), o = Yc, s = i;
			return a.next(((t) => U.forEach(t, ((t, n) => (o < n.largestBatchId && (o = n.largestBatchId), i.get(t) ? U.resolve() : this.remoteDocumentCache.getEntry(e, t).next(((e) => {
				s = s.insert(t, e);
			}))))).next((() => this.populateOverlays(e, t, i))).next((() => this.computeViews(e, s, t, J()))).next(((e) => ({
				batchId: o,
				changes: id(e)
			})))));
		}));
	}
	getDocumentsMatchingDocumentQuery(e, t) {
		return this.getDocument(e, new z(t)).next(((e) => {
			let t = rd();
			return e.isFoundDocument() && (t = t.insert(e.key, e)), t;
		}));
	}
	getDocumentsMatchingCollectionGroupQuery(e, t, n, r) {
		let i = t.collectionGroup, a = rd();
		return this.indexManager.getCollectionParents(e, i).next(((o) => U.forEach(o, ((o) => {
			let s = function(e, t) {
				return new Iu(t, null, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, e.startAt, e.endAt);
			}(t, o.child(i));
			return this.getDocumentsMatchingCollectionQuery(e, s, n, r).next(((e) => {
				e.forEach(((e, t) => {
					a = a.insert(e, t);
				}));
			}));
		})).next((() => a))));
	}
	getDocumentsMatchingCollectionQuery(e, t, n, r) {
		let i;
		return this.documentOverlayCache.getOverlaysForCollection(e, t.path, n.largestBatchId).next(((a) => (i = a, this.remoteDocumentCache.getDocumentsMatchingQuery(e, t, n, i, r)))).next(((e) => {
			i.forEach(((t, n) => {
				let r = n.getKey();
				e.get(r) === null && (e = e.insert(r, lu.newInvalidDocument(r)));
			}));
			let n = rd();
			return e.forEach(((e, r) => {
				let a = i.get(e);
				a !== void 0 && zd(a.mutation, r, xl.empty(), V.now()), Yu(t, r) && (n = n.insert(e, r));
			})), n;
		}));
	}
}, xp = class {
	constructor(e) {
		this.serializer = e, this.Or = /* @__PURE__ */ new Map(), this.Nr = /* @__PURE__ */ new Map();
	}
	getBundleMetadata(e, t) {
		return U.resolve(this.Or.get(t));
	}
	saveBundleMetadata(e, t) {
		return this.Or.set(t.id, function(e) {
			return {
				id: e.id,
				version: e.version,
				createTime: Df(e.createTime)
			};
		}(t)), U.resolve();
	}
	getNamedQuery(e, t) {
		return U.resolve(this.Nr.get(t));
	}
	saveNamedQuery(e, t) {
		return this.Nr.set(t.name, function(e) {
			return {
				name: e.name,
				query: rp(e.bundledQuery),
				readTime: Df(e.readTime)
			};
		}(t)), U.resolve();
	}
}, Sp = class {
	constructor() {
		this.overlays = new W(z.comparator), this.Br = /* @__PURE__ */ new Map();
	}
	getOverlay(e, t) {
		return U.resolve(this.overlays.get(t));
	}
	getOverlays(e, t) {
		let n = ad();
		return U.forEach(t, ((t) => this.getOverlay(e, t).next(((e) => {
			e !== null && n.set(t, e);
		})))).next((() => n));
	}
	saveOverlays(e, t, n) {
		return n.forEach(((n, r) => {
			this.wt(e, t, r);
		})), U.resolve();
	}
	removeOverlaysForBatchId(e, t, n) {
		let r = this.Br.get(n);
		return r !== void 0 && (r.forEach(((e) => this.overlays = this.overlays.remove(e))), this.Br.delete(n)), U.resolve();
	}
	getOverlaysForCollection(e, t, n) {
		let r = ad(), i = t.length + 1, a = new z(t.child("")), o = this.overlays.getIteratorFrom(a);
		for (; o.hasNext();) {
			let e = o.getNext().value, a = e.getKey();
			if (!t.isPrefixOf(a.path)) break;
			a.path.length === i && e.largestBatchId > n && r.set(e.getKey(), e);
		}
		return U.resolve(r);
	}
	getOverlaysForCollectionGroup(e, t, n, r) {
		let i = new W(((e, t) => e - t)), a = this.overlays.getIterator();
		for (; a.hasNext();) {
			let e = a.getNext().value;
			if (e.getKey().getCollectionGroup() === t && e.largestBatchId > n) {
				let t = i.get(e.largestBatchId);
				t === null && (t = ad(), i = i.insert(e.largestBatchId, t)), t.set(e.getKey(), e);
			}
		}
		let o = ad(), s = i.getIterator();
		for (; s.hasNext() && (s.getNext().value.forEach(((e, t) => o.set(e, t))), !(o.size() >= r)););
		return U.resolve(o);
	}
	wt(e, t, n) {
		let r = this.overlays.get(n.key);
		if (r !== null) {
			let e = this.Br.get(r.largestBatchId).delete(n.key);
			this.Br.set(r.largestBatchId, e);
		}
		this.overlays = this.overlays.insert(n.key, new Zd(t, n));
		let i = this.Br.get(t);
		i === void 0 && (i = J(), this.Br.set(t, i)), this.Br.set(t, i.add(n.key));
	}
}, Cp = class {
	constructor() {
		this.sessionToken = Cl.EMPTY_BYTE_STRING;
	}
	getSessionToken(e) {
		return U.resolve(this.sessionToken);
	}
	setSessionToken(e, t) {
		return this.sessionToken = t, U.resolve();
	}
}, wp = class {
	constructor() {
		this.Lr = new G(Z.kr), this.qr = new G(Z.Kr);
	}
	isEmpty() {
		return this.Lr.isEmpty();
	}
	addReference(e, t) {
		let n = new Z(e, t);
		this.Lr = this.Lr.add(n), this.qr = this.qr.add(n);
	}
	Ur(e, t) {
		e.forEach(((e) => this.addReference(e, t)));
	}
	removeReference(e, t) {
		this.$r(new Z(e, t));
	}
	Wr(e, t) {
		e.forEach(((e) => this.removeReference(e, t)));
	}
	Qr(e) {
		let t = new z(new R([])), n = new Z(t, e), r = new Z(t, e + 1), i = [];
		return this.qr.forEachInRange([n, r], ((e) => {
			this.$r(e), i.push(e.key);
		})), i;
	}
	Gr() {
		this.Lr.forEach(((e) => this.$r(e)));
	}
	$r(e) {
		this.Lr = this.Lr.delete(e), this.qr = this.qr.delete(e);
	}
	zr(e) {
		let t = new z(new R([])), n = new Z(t, e), r = new Z(t, e + 1), i = J();
		return this.qr.forEachInRange([n, r], ((e) => {
			i = i.add(e.key);
		})), i;
	}
	containsKey(e) {
		let t = new Z(e, 0), n = this.Lr.firstAfterOrEqual(t);
		return n !== null && e.isEqual(n.key);
	}
}, Z = class {
	constructor(e, t) {
		this.key = e, this.jr = t;
	}
	static kr(e, t) {
		return z.comparator(e.key, t.key) || L(e.jr, t.jr);
	}
	static Kr(e, t) {
		return L(e.jr, t.jr) || z.comparator(e.key, t.key);
	}
}, Tp = class {
	constructor(e, t) {
		this.indexManager = e, this.referenceDelegate = t, this.mutationQueue = [], this.Xn = 1, this.Jr = new G(Z.kr);
	}
	checkEmpty(e) {
		return U.resolve(this.mutationQueue.length === 0);
	}
	addMutationBatch(e, t, n, r) {
		let i = this.Xn;
		this.Xn++, this.mutationQueue.length > 0 && this.mutationQueue[this.mutationQueue.length - 1];
		let a = new Yd(i, t, n, r);
		this.mutationQueue.push(a);
		for (let t of r) this.Jr = this.Jr.add(new Z(t.key, i)), this.indexManager.addToCollectionParentIndex(e, t.key.path.popLast());
		return U.resolve(a);
	}
	lookupMutationBatch(e, t) {
		return U.resolve(this.Hr(t));
	}
	getNextMutationBatchAfterBatchId(e, t) {
		let n = t + 1, r = this.Zr(n), i = r < 0 ? 0 : r;
		return U.resolve(this.mutationQueue.length > i ? this.mutationQueue[i] : null);
	}
	getHighestUnacknowledgedBatchId() {
		return U.resolve(this.mutationQueue.length === 0 ? sl : this.Xn - 1);
	}
	getAllMutationBatches(e) {
		return U.resolve(this.mutationQueue.slice());
	}
	getAllMutationBatchesAffectingDocumentKey(e, t) {
		let n = new Z(t, 0), r = new Z(t, Infinity), i = [];
		return this.Jr.forEachInRange([n, r], ((e) => {
			let t = this.Hr(e.jr);
			i.push(t);
		})), U.resolve(i);
	}
	getAllMutationBatchesAffectingDocumentKeys(e, t) {
		let n = new G(L);
		return t.forEach(((e) => {
			let t = new Z(e, 0), r = new Z(e, Infinity);
			this.Jr.forEachInRange([t, r], ((e) => {
				n = n.add(e.jr);
			}));
		})), U.resolve(this.Xr(n));
	}
	getAllMutationBatchesAffectingQuery(e, t) {
		let n = t.path, r = n.length + 1, i = n;
		z.isDocumentKey(i) || (i = i.child(""));
		let a = new Z(new z(i), 0), o = new G(L);
		return this.Jr.forEachWhile(((e) => {
			let t = e.key.path;
			return !!n.isPrefixOf(t) && (t.length === r && (o = o.add(e.jr)), !0);
		}), a), U.resolve(this.Xr(o));
	}
	Xr(e) {
		let t = [];
		return e.forEach(((e) => {
			let n = this.Hr(e);
			n !== null && t.push(n);
		})), t;
	}
	removeMutationBatch(e, t) {
		N(this.Yr(t.batchId, "removed") === 0, 55003), this.mutationQueue.shift();
		let n = this.Jr;
		return U.forEach(t.mutations, ((r) => {
			let i = new Z(r.key, t.batchId);
			return n = n.delete(i), this.referenceDelegate.markPotentiallyOrphaned(e, r.key);
		})).next((() => {
			this.Jr = n;
		}));
	}
	tr(e) {}
	containsKey(e, t) {
		let n = new Z(t, 0), r = this.Jr.firstAfterOrEqual(n);
		return U.resolve(t.isEqual(r && r.key));
	}
	performConsistencyCheck(e) {
		return this.mutationQueue.length, U.resolve();
	}
	Yr(e, t) {
		return this.Zr(e);
	}
	Zr(e) {
		return this.mutationQueue.length === 0 ? 0 : e - this.mutationQueue[0].batchId;
	}
	Hr(e) {
		let t = this.Zr(e);
		return t < 0 || t >= this.mutationQueue.length ? null : this.mutationQueue[t];
	}
}, Ep = class {
	constructor(e) {
		this.ei = e, this.docs = function() {
			return new W(z.comparator);
		}(), this.size = 0;
	}
	setIndexManager(e) {
		this.indexManager = e;
	}
	addEntry(e, t) {
		let n = t.key, r = this.docs.get(n), i = r ? r.size : 0, a = this.ei(t);
		return this.docs = this.docs.insert(n, {
			document: t.mutableCopy(),
			size: a
		}), this.size += a - i, this.indexManager.addToCollectionParentIndex(e, n.path.popLast());
	}
	removeEntry(e) {
		let t = this.docs.get(e);
		t && (this.docs = this.docs.remove(e), this.size -= t.size);
	}
	getEntry(e, t) {
		let n = this.docs.get(t);
		return U.resolve(n ? n.document.mutableCopy() : lu.newInvalidDocument(t));
	}
	getEntries(e, t) {
		let n = td();
		return t.forEach(((e) => {
			let t = this.docs.get(e);
			n = n.insert(e, t ? t.document.mutableCopy() : lu.newInvalidDocument(e));
		})), U.resolve(n);
	}
	getDocumentsMatchingQuery(e, t, n, r) {
		let i = td(), a = t.path, o = new z(a.child("__id-9223372036854775808__")), s = this.docs.getIteratorFrom(o);
		for (; s.hasNext();) {
			let { key: e, value: { document: o } } = s.getNext();
			if (!a.isPrefixOf(e.path)) break;
			e.path.length > a.length + 1 || el(Qc(o), n) <= 0 || (r.has(o.key) || Yu(t, o)) && (i = i.insert(o.key, o.mutableCopy()));
		}
		return U.resolve(i);
	}
	getAllFromCollectionGroup(e, t, n, r) {
		M(9500);
	}
	ti(e, t) {
		return U.forEach(this.docs, ((e) => t(e)));
	}
	newChangeBuffer(e) {
		return new Dp(this);
	}
	getSize(e) {
		return U.resolve(this.size);
	}
}, Dp = class extends vp {
	constructor(e) {
		super(), this.Fr = e;
	}
	applyChanges(e) {
		let t = [];
		return this.changes.forEach(((n, r) => {
			r.isValidDocument() ? t.push(this.Fr.addEntry(e, r)) : this.Fr.removeEntry(n);
		})), U.waitFor(t);
	}
	getFromCache(e, t) {
		return this.Fr.getEntry(e, t);
	}
	getAllFromCache(e, t) {
		return this.Fr.getEntries(e, t);
	}
}, Op = class {
	constructor(e) {
		this.persistence = e, this.ni = new $u(((e) => Nu(e)), Pu), this.lastRemoteSnapshotVersion = H.min(), this.highestTargetId = 0, this.ri = 0, this.ii = new wp(), this.targetCount = 0, this.si = up.sr();
	}
	forEachTarget(e, t) {
		return this.ni.forEach(((e, n) => t(n))), U.resolve();
	}
	getLastRemoteSnapshotVersion(e) {
		return U.resolve(this.lastRemoteSnapshotVersion);
	}
	getHighestSequenceNumber(e) {
		return U.resolve(this.ri);
	}
	allocateTargetId(e) {
		return this.highestTargetId = this.si.next(), U.resolve(this.highestTargetId);
	}
	setTargetsMetadata(e, t, n) {
		return n && (this.lastRemoteSnapshotVersion = n), t > this.ri && (this.ri = t), U.resolve();
	}
	cr(e) {
		this.ni.set(e.target, e);
		let t = e.targetId;
		t > this.highestTargetId && (this.si = new up(t), this.highestTargetId = t), e.sequenceNumber > this.ri && (this.ri = e.sequenceNumber);
	}
	addTargetData(e, t) {
		return this.cr(t), this.targetCount += 1, U.resolve();
	}
	updateTargetData(e, t) {
		return this.cr(t), U.resolve();
	}
	removeTargetData(e, t) {
		return this.ni.delete(t.target), this.ii.Qr(t.targetId), --this.targetCount, U.resolve();
	}
	removeTargets(e, t, n) {
		let r = 0, i = [];
		return this.ni.forEach(((a, o) => {
			o.sequenceNumber <= t && n.get(o.targetId) === null && (this.ni.delete(a), i.push(this.removeMatchingKeysForTargetId(e, o.targetId)), r++);
		})), U.waitFor(i).next((() => r));
	}
	getTargetCount(e) {
		return U.resolve(this.targetCount);
	}
	getTargetData(e, t) {
		let n = this.ni.get(t) || null;
		return U.resolve(n);
	}
	addMatchingKeys(e, t, n) {
		return this.ii.Ur(t, n), U.resolve();
	}
	removeMatchingKeys(e, t, n) {
		this.ii.Wr(t, n);
		let r = this.persistence.referenceDelegate, i = [];
		return r && t.forEach(((t) => {
			i.push(r.markPotentiallyOrphaned(e, t));
		})), U.waitFor(i);
	}
	removeMatchingKeysForTargetId(e, t) {
		return this.ii.Qr(t), U.resolve();
	}
	getMatchingKeysForTargetId(e, t) {
		let n = this.ii.zr(t);
		return U.resolve(n);
	}
	containsKey(e, t) {
		return U.resolve(this.ii.containsKey(t));
	}
}, kp = class {
	constructor(e, t) {
		this.oi = {}, this.overlays = {}, this._i = new ol(0), this.ai = !1, this.ai = !0, this.ui = new Cp(), this.referenceDelegate = e(this), this.ci = new Op(this), this.indexManager = new ap(), this.remoteDocumentCache = function(e) {
			return new Ep(e);
		}(((e) => this.referenceDelegate.li(e))), this.serializer = new np(t), this.hi = new xp(this.serializer);
	}
	start() {
		return Promise.resolve();
	}
	shutdown() {
		return this.ai = !1, Promise.resolve();
	}
	get started() {
		return this.ai;
	}
	setDatabaseDeletedListener() {}
	setNetworkEnabled() {}
	getIndexManager(e) {
		return this.indexManager;
	}
	getDocumentOverlayCache(e) {
		let t = this.overlays[e.toKey()];
		return t || (t = new Sp(), this.overlays[e.toKey()] = t), t;
	}
	getMutationQueue(e, t) {
		let n = this.oi[e.toKey()];
		return n || (n = new Tp(t, this.referenceDelegate), this.oi[e.toKey()] = n), n;
	}
	getGlobalsCache() {
		return this.ui;
	}
	getTargetCache() {
		return this.ci;
	}
	getRemoteDocumentCache() {
		return this.remoteDocumentCache;
	}
	getBundleCache() {
		return this.hi;
	}
	runTransaction(e, t, n) {
		j("MemoryPersistence", "Starting transaction:", e);
		let r = new Ap(this._i.next());
		return this.referenceDelegate.Pi(), n(r).next(((e) => this.referenceDelegate.Ti(r).next((() => e)))).toPromise().then(((e) => (r.raiseOnCommittedEvent(), e)));
	}
	Ii(e, t) {
		return U.or(Object.values(this.oi).map(((n) => () => n.containsKey(e, t))));
	}
}, Ap = class extends nl {
	constructor(e) {
		super(), this.currentSequenceNumber = e;
	}
}, jp = class e {
	constructor(e) {
		this.persistence = e, this.Ei = new wp(), this.Ri = null;
	}
	static Ai(t) {
		return new e(t);
	}
	get Vi() {
		if (this.Ri) return this.Ri;
		throw M(60996);
	}
	addReference(e, t, n) {
		return this.Ei.addReference(n, t), this.Vi.delete(n.toString()), U.resolve();
	}
	removeReference(e, t, n) {
		return this.Ei.removeReference(n, t), this.Vi.add(n.toString()), U.resolve();
	}
	markPotentiallyOrphaned(e, t) {
		return this.Vi.add(t.toString()), U.resolve();
	}
	removeTarget(e, t) {
		this.Ei.Qr(t.targetId).forEach(((e) => this.Vi.add(e.toString())));
		let n = this.persistence.getTargetCache();
		return n.getMatchingKeysForTargetId(e, t.targetId).next(((e) => {
			e.forEach(((e) => this.Vi.add(e.toString())));
		})).next((() => n.removeTargetData(e, t)));
	}
	Pi() {
		this.Ri = /* @__PURE__ */ new Set();
	}
	Ti(e) {
		let t = this.persistence.getRemoteDocumentCache().newChangeBuffer();
		return U.forEach(this.Vi, ((n) => {
			let r = z.fromPath(n);
			return this.di(e, r).next(((e) => {
				e || t.removeEntry(r, H.min());
			}));
		})).next((() => (this.Ri = null, t.apply(e))));
	}
	updateLimboDocument(e, t) {
		return this.di(e, t).next(((e) => {
			e ? this.Vi.delete(t.toString()) : this.Vi.add(t.toString());
		}));
	}
	li(e) {
		return 0;
	}
	di(e, t) {
		return U.or([
			() => U.resolve(this.Ei.containsKey(t)),
			() => this.persistence.getTargetCache().containsKey(e, t),
			() => this.persistence.Ii(e, t)
		]);
	}
}, Mp = class e {
	constructor(e, t) {
		this.persistence = e, this.mi = new $u(((e) => fl(e.path)), ((e, t) => e.isEqual(t))), this.garbageCollector = _p(this, t);
	}
	static Ai(t, n) {
		return new e(t, n);
	}
	Pi() {}
	Ti(e) {
		return U.resolve();
	}
	forEachTarget(e, t) {
		return this.persistence.getTargetCache().forEachTarget(e, t);
	}
	Vr(e) {
		let t = this.gr(e);
		return this.persistence.getTargetCache().getTargetCount(e).next(((e) => t.next(((t) => e + t))));
	}
	gr(e) {
		let t = 0;
		return this.dr(e, ((e) => {
			t++;
		})).next((() => t));
	}
	dr(e, t) {
		return U.forEach(this.mi, ((n, r) => this.yr(e, n, r).next(((e) => e ? U.resolve() : t(r)))));
	}
	removeTargets(e, t, n) {
		return this.persistence.getTargetCache().removeTargets(e, t, n);
	}
	removeOrphanedDocuments(e, t) {
		let n = 0, r = this.persistence.getRemoteDocumentCache(), i = r.newChangeBuffer();
		return r.ti(e, ((r) => this.yr(e, r, t).next(((e) => {
			e || (n++, i.removeEntry(r, H.min()));
		})))).next((() => i.apply(e))).next((() => n));
	}
	markPotentiallyOrphaned(e, t) {
		return this.mi.set(t, e.currentSequenceNumber), U.resolve();
	}
	removeTarget(e, t) {
		let n = t.withSequenceNumber(e.currentSequenceNumber);
		return this.persistence.getTargetCache().updateTargetData(e, n);
	}
	addReference(e, t, n) {
		return this.mi.set(n, e.currentSequenceNumber), U.resolve();
	}
	removeReference(e, t, n) {
		return this.mi.set(n, e.currentSequenceNumber), U.resolve();
	}
	updateLimboDocument(e, t) {
		return this.mi.set(t, e.currentSequenceNumber), U.resolve();
	}
	li(e) {
		let t = e.key.toString().length;
		return e.isFoundDocument() && (t += Zl(e.data.value)), t;
	}
	yr(e, t, n) {
		return U.or([
			() => this.persistence.Ii(e, t),
			() => this.persistence.getTargetCache().containsKey(e, t),
			() => {
				let e = this.mi.get(t);
				return U.resolve(e !== void 0 && e > n);
			}
		]);
	}
	getCacheSize(e) {
		return this.persistence.getRemoteDocumentCache().getSize(e);
	}
}, Np = class e {
	constructor(e, t, n, r) {
		this.targetId = e, this.fromCache = t, this.Ps = n, this.Ts = r;
	}
	static Is(t, n) {
		let r = J(), i = J();
		for (let e of n.docChanges) switch (e.type) {
			case 0:
				r = r.add(e.doc.key);
				break;
			case 1: i = i.add(e.doc.key);
		}
		return new e(t, n.fromCache, r, i);
	}
}, Pp = class {
	constructor() {
		this._documentReadCount = 0;
	}
	get documentReadCount() {
		return this._documentReadCount;
	}
	incrementDocumentReadCount(e) {
		this._documentReadCount += e;
	}
}, Fp = class {
	constructor() {
		this.Es = !1, this.Rs = !1, this.As = 100, this.Vs = function() {
			return ce() ? 8 : il(_()) > 0 ? 6 : 4;
		}();
	}
	initialize(e, t) {
		this.ds = e, this.indexManager = t, this.Es = !0;
	}
	getDocumentsMatchingQuery(e, t, n, r) {
		let i = { result: null };
		return this.fs(e, t).next(((e) => {
			i.result = e;
		})).next((() => {
			if (!i.result) return this.gs(e, t, r, n).next(((e) => {
				i.result = e;
			}));
		})).next((() => {
			if (i.result) return;
			let n = new Pp();
			return this.ps(e, t, n).next(((r) => {
				if (i.result = r, this.Rs) return this.ys(e, t, n, r.size);
			}));
		})).next((() => i.result));
	}
	ys(e, t, n, r) {
		return n.documentReadCount < this.As ? (hc() <= b.DEBUG && j("QueryEngine", "SDK will not create cache indexes for query:", Ju(t), "since it only creates cache indexes for collection contains", "more than or equal to", this.As, "documents"), U.resolve()) : (hc() <= b.DEBUG && j("QueryEngine", "Query:", Ju(t), "scans", n.documentReadCount, "local documents and returns", r, "documents as results."), n.documentReadCount > this.Vs * r ? (hc() <= b.DEBUG && j("QueryEngine", "The SDK decides to create cache indexes for query:", Ju(t), "as using cache indexes may help improve performance."), this.indexManager.createTargetIndexes(e, Uu(t))) : U.resolve());
	}
	fs(e, t) {
		if (zu(t)) return U.resolve(null);
		let n = Uu(t);
		return this.indexManager.getIndexType(e, n).next(((r) => r === 0 ? null : (t.limit !== null && r === 1 && (t = Gu(t, null, "F"), n = Uu(t)), this.indexManager.getDocumentsMatchingTarget(e, n).next(((r) => {
			let i = J(...r);
			return this.ds.getDocuments(e, i).next(((r) => this.indexManager.getMinOffset(e, n).next(((n) => {
				let a = this.ws(t, r);
				return this.Ss(t, a, i, n.readTime) ? this.fs(e, Gu(t, null, "F")) : this.bs(e, a, t, n);
			}))));
		})))));
	}
	gs(e, t, n, r) {
		return zu(t) || r.isEqual(H.min()) ? U.resolve(null) : this.ds.getDocuments(e, n).next(((i) => {
			let a = this.ws(t, i);
			return this.Ss(t, a, n, r) ? U.resolve(null) : (hc() <= b.DEBUG && j("QueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), Ju(t)), this.bs(e, a, t, Zc(r, Yc)).next(((e) => e)));
		}));
	}
	ws(e, t) {
		let n = new G(Zu(e));
		return t.forEach(((t, r) => {
			Yu(e, r) && (n = n.add(r));
		})), n;
	}
	Ss(e, t, n, r) {
		if (e.limit === null) return !1;
		if (n.size !== t.size) return !0;
		let i = e.limitType === "F" ? t.last() : t.first();
		return !!i && (i.hasPendingWrites || i.version.compareTo(r) > 0);
	}
	ps(e, t, n) {
		return hc() <= b.DEBUG && j("QueryEngine", "Using full collection scan to execute query:", Ju(t)), this.ds.getDocumentsMatchingQuery(e, t, $c.min(), n);
	}
	bs(e, t, n, r) {
		return this.ds.getDocumentsMatchingQuery(e, n, r).next(((e) => (t.forEach(((t) => {
			e = e.insert(t.key, t);
		})), e)));
	}
}, Ip = "LocalStore", Lp = 3e8, Rp = class {
	constructor(e, t, n, r) {
		this.persistence = e, this.Ds = t, this.serializer = r, this.Cs = new W(L), this.vs = new $u(((e) => Nu(e)), Pu), this.Fs = /* @__PURE__ */ new Map(), this.Ms = e.getRemoteDocumentCache(), this.ci = e.getTargetCache(), this.hi = e.getBundleCache(), this.xs(n);
	}
	xs(e) {
		this.documentOverlayCache = this.persistence.getDocumentOverlayCache(e), this.indexManager = this.persistence.getIndexManager(e), this.mutationQueue = this.persistence.getMutationQueue(e, this.indexManager), this.localDocuments = new bp(this.Ms, this.mutationQueue, this.documentOverlayCache, this.indexManager), this.Ms.setIndexManager(this.indexManager), this.Ds.initialize(this.localDocuments, this.indexManager);
	}
	collectGarbage(e) {
		return this.persistence.runTransaction("Collect garbage", "readwrite-primary", ((t) => e.collect(t, this.Cs)));
	}
};
function zp(e, t, n, r) {
	return new Rp(e, t, n, r);
}
async function Bp(e, t) {
	let n = P(e);
	return await n.persistence.runTransaction("Handle user change", "readonly", ((e) => {
		let r;
		return n.mutationQueue.getAllMutationBatches(e).next(((i) => (r = i, n.xs(t), n.mutationQueue.getAllMutationBatches(e)))).next(((t) => {
			let i = [], a = [], o = J();
			for (let e of r) {
				i.push(e.batchId);
				for (let t of e.mutations) o = o.add(t.key);
			}
			for (let e of t) {
				a.push(e.batchId);
				for (let t of e.mutations) o = o.add(t.key);
			}
			return n.localDocuments.getDocuments(e, o).next(((e) => ({
				Os: e,
				removedBatchIds: i,
				addedBatchIds: a
			})));
		}));
	}));
}
function Vp(e, t) {
	let n = P(e);
	return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", ((e) => {
		let r = t.batch.keys(), i = n.Ms.newChangeBuffer({ trackRemovals: !0 });
		return function(e, t, n, r) {
			let i = n.batch, a = i.keys(), o = U.resolve();
			return a.forEach(((e) => {
				o = o.next((() => r.getEntry(t, e))).next(((t) => {
					let a = n.docVersions.get(e);
					N(a !== null, 48541), t.version.compareTo(a) < 0 && (i.applyToRemoteDocument(t, n), t.isValidDocument() && (t.setReadTime(n.commitVersion), r.addEntry(t)));
				}));
			})), o.next((() => e.mutationQueue.removeMutationBatch(t, i)));
		}(n, e, t, i).next((() => i.apply(e))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t.batch.batchId))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, function(e) {
			let t = J();
			for (let n = 0; n < e.mutationResults.length; ++n) e.mutationResults[n].transformResults.length > 0 && (t = t.add(e.batch.mutations[n].key));
			return t;
		}(t)))).next((() => n.localDocuments.getDocuments(e, r)));
	}));
}
function Hp(e) {
	let t = P(e);
	return t.persistence.runTransaction("Get last remote snapshot version", "readonly", ((e) => t.ci.getLastRemoteSnapshotVersion(e)));
}
function Up(e, t) {
	let n = P(e), r = t.snapshotVersion, i = n.Cs;
	return n.persistence.runTransaction("Apply remote event", "readwrite-primary", ((e) => {
		let a = n.Ms.newChangeBuffer({ trackRemovals: !0 });
		i = n.Cs;
		let o = [];
		t.targetChanges.forEach(((a, s) => {
			let c = i.get(s);
			if (!c) return;
			o.push(n.ci.removeMatchingKeys(e, a.removedDocuments, s).next((() => n.ci.addMatchingKeys(e, a.addedDocuments, s))));
			let l = c.withSequenceNumber(e.currentSequenceNumber);
			t.targetMismatches.get(s) === null ? a.resumeToken.approximateByteSize() > 0 && (l = l.withResumeToken(a.resumeToken, r)) : l = l.withResumeToken(Cl.EMPTY_BYTE_STRING, H.min()).withLastLimboFreeSnapshotVersion(H.min()), i = i.insert(s, l), function(e, t, n) {
				return e.resumeToken.approximateByteSize() === 0 || t.snapshotVersion.toMicroseconds() - e.snapshotVersion.toMicroseconds() >= Lp ? !0 : n.addedDocuments.size + n.modifiedDocuments.size + n.removedDocuments.size > 0;
			}(c, l, a) && o.push(n.ci.updateTargetData(e, l));
		}));
		let s = td(), c = J();
		if (t.documentUpdates.forEach(((r) => {
			t.resolvedLimboDocuments.has(r) && o.push(n.persistence.referenceDelegate.updateLimboDocument(e, r));
		})), o.push(Wp(e, a, t.documentUpdates).next(((e) => {
			s = e.Ns, c = e.Bs;
		}))), !r.isEqual(H.min())) {
			let t = n.ci.getLastRemoteSnapshotVersion(e).next(((t) => n.ci.setTargetsMetadata(e, e.currentSequenceNumber, r)));
			o.push(t);
		}
		return U.waitFor(o).next((() => a.apply(e))).next((() => n.localDocuments.getLocalViewOfDocuments(e, s, c))).next((() => s));
	})).then(((e) => (n.Cs = i, e)));
}
function Wp(e, t, n) {
	let r = J(), i = J();
	return n.forEach(((e) => r = r.add(e))), t.getEntries(e, r).next(((e) => {
		let r = td();
		return n.forEach(((n, a) => {
			let o = e.get(n);
			a.isFoundDocument() !== o.isFoundDocument() && (i = i.add(n)), a.isNoDocument() && a.version.isEqual(H.min()) ? (t.removeEntry(n, a.readTime), r = r.insert(n, a)) : !o.isValidDocument() || a.version.compareTo(o.version) > 0 || a.version.compareTo(o.version) === 0 && o.hasPendingWrites ? (t.addEntry(a), r = r.insert(n, a)) : j(Ip, "Ignoring outdated watch update for ", n, ". Current version:", o.version, " Watch version:", a.version);
		})), {
			Ns: r,
			Bs: i
		};
	}));
}
function Gp(e, t) {
	let n = P(e);
	return n.persistence.runTransaction("Get next mutation batch", "readonly", ((e) => (t === void 0 && (t = sl), n.mutationQueue.getNextMutationBatchAfterBatchId(e, t))));
}
function Kp(e, t) {
	let n = P(e);
	return n.persistence.runTransaction("Allocate target", "readwrite", ((e) => {
		let r;
		return n.ci.getTargetData(e, t).next(((i) => i ? (r = i, U.resolve(r)) : n.ci.allocateTargetId(e).next(((i) => (r = new tp(t, i, "TargetPurposeListen", e.currentSequenceNumber), n.ci.addTargetData(e, r).next((() => r)))))));
	})).then(((e) => {
		let r = n.Cs.get(e.targetId);
		return (r === null || e.snapshotVersion.compareTo(r.snapshotVersion) > 0) && (n.Cs = n.Cs.insert(e.targetId, e), n.vs.set(t, e.targetId)), e;
	}));
}
async function qp(e, t, n) {
	let r = P(e), i = r.Cs.get(t), a = n ? "readwrite" : "readwrite-primary";
	try {
		n || await r.persistence.runTransaction("Release target", a, ((e) => r.persistence.referenceDelegate.removeTarget(e, i)));
	} catch (e) {
		if (!al(e)) throw e;
		j(Ip, `Failed to update sequence numbers for target ${t}: ${e}`);
	}
	r.Cs = r.Cs.remove(t), r.vs.delete(i.target);
}
function Jp(e, t, n) {
	let r = P(e), i = H.min(), a = J();
	return r.persistence.runTransaction("Execute query", "readwrite", ((e) => function(e, t, n) {
		let r = P(e), i = r.vs.get(n);
		return i === void 0 ? r.ci.getTargetData(t, n) : U.resolve(r.Cs.get(i));
	}(r, e, Uu(t)).next(((t) => {
		if (t) return i = t.lastLimboFreeSnapshotVersion, r.ci.getMatchingKeysForTargetId(e, t.targetId).next(((e) => {
			a = e;
		}));
	})).next((() => r.Ds.getDocumentsMatchingQuery(e, t, n ? i : H.min(), n ? a : J()))).next(((e) => (Yp(r, Xu(t), e), {
		documents: e,
		Ls: a
	})))));
}
function Yp(e, t, n) {
	let r = e.Fs.get(t) || H.min();
	n.forEach(((e, t) => {
		t.readTime.compareTo(r) > 0 && (r = t.readTime);
	})), e.Fs.set(t, r);
}
var Xp = class {
	constructor() {
		this.activeTargetIds = dd();
	}
	Ws(e) {
		this.activeTargetIds = this.activeTargetIds.add(e);
	}
	Qs(e) {
		this.activeTargetIds = this.activeTargetIds.delete(e);
	}
	$s() {
		let e = {
			activeTargetIds: this.activeTargetIds.toArray(),
			updateTimeMs: Date.now()
		};
		return JSON.stringify(e);
	}
}, Zp = class {
	constructor() {
		this.Co = new Xp(), this.vo = {}, this.onlineStateHandler = null, this.sequenceNumberHandler = null;
	}
	addPendingMutation(e) {}
	updateMutationState(e, t, n) {}
	addLocalQueryTarget(e, t = !0) {
		return t && this.Co.Ws(e), this.vo[e] || "not-current";
	}
	updateQueryState(e, t, n) {
		this.vo[e] = t;
	}
	removeLocalQueryTarget(e) {
		this.Co.Qs(e);
	}
	isLocalQueryTarget(e) {
		return this.Co.activeTargetIds.has(e);
	}
	clearQueryState(e) {
		delete this.vo[e];
	}
	getAllActiveQueryTargets() {
		return this.Co.activeTargetIds;
	}
	isActiveQueryTarget(e) {
		return this.Co.activeTargetIds.has(e);
	}
	start() {
		return this.Co = new Xp(), Promise.resolve();
	}
	handleUserChange(e, t, n) {}
	setOnlineState(e) {}
	shutdown() {}
	writeSequenceNumber(e) {}
	notifyBundleLoaded(e) {}
}, Qp = class {
	Fo(e) {}
	shutdown() {}
}, $p = "ConnectivityMonitor", em = class {
	constructor() {
		this.Mo = () => this.xo(), this.Oo = () => this.No(), this.Bo = [], this.Lo();
	}
	Fo(e) {
		this.Bo.push(e);
	}
	shutdown() {
		window.removeEventListener("online", this.Mo), window.removeEventListener("offline", this.Oo);
	}
	Lo() {
		window.addEventListener("online", this.Mo), window.addEventListener("offline", this.Oo);
	}
	xo() {
		j($p, "Network connectivity changed: AVAILABLE");
		for (let e of this.Bo) e(0);
	}
	No() {
		j($p, "Network connectivity changed: UNAVAILABLE");
		for (let e of this.Bo) e(1);
	}
	static v() {
		return typeof window < "u" && window.addEventListener !== void 0 && window.removeEventListener !== void 0;
	}
}, tm = null;
function nm() {
	return tm === null ? tm = function() {
		return 268435456 + Math.round(2147483648 * Math.random());
	}() : tm++, "0x" + tm.toString(16);
}
var rm = "RestConnection", im = {
	BatchGetDocuments: "batchGet",
	Commit: "commit",
	RunQuery: "runQuery",
	RunAggregationQuery: "runAggregationQuery",
	ExecutePipeline: "executePipeline"
}, am = class {
	get ko() {
		return !1;
	}
	constructor(e) {
		this.databaseInfo = e, this.databaseId = e.databaseId;
		let t = e.ssl ? "https" : "http", n = encodeURIComponent(this.databaseId.projectId), r = encodeURIComponent(this.databaseId.database);
		this.qo = t + "://" + e.host, this.Ko = `projects/${n}/databases/${r}`, this.Uo = this.databaseId.database === Fl ? `project_id=${n}` : `project_id=${n}&database_id=${r}`;
	}
	$o(e, t, n, r, i) {
		let a = nm(), o = this.Wo(e, t.toUriEncodedString());
		j(rm, `Sending RPC '${e}' ${a}:`, o, n);
		let s = {
			"google-cloud-resource-prefix": this.Ko,
			"x-goog-request-params": this.Uo
		};
		this.Qo(s, r, i);
		let { host: c } = new URL(o), l = Te(c);
		return this.Go(e, o, s, n, l).then(((t) => (j(rm, `Received RPC '${e}' ${a}: `, t), t)), ((t) => {
			throw _c(rm, `RPC '${e}' ${a} failed with error: `, t, "url: ", o, "request:", n), t;
		}));
	}
	zo(e, t, n, r, i, a) {
		return this.$o(e, t, n, r, i);
	}
	Qo(e, t, n) {
		e["X-Goog-Api-Client"] = function() {
			return "gl-js/ fire/" + fc;
		}(), e["Content-Type"] = "text/plain", this.databaseInfo.appId && (e["X-Firebase-GMPID"] = this.databaseInfo.appId), t && t.headers.forEach(((t, n) => e[n] = t)), n && n.headers.forEach(((t, n) => e[n] = t));
	}
	Wo(e, t) {
		let n = im[e], r = `${this.qo}/v1/${t}:${n}`;
		return this.databaseInfo.apiKey && (r = `${r}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`), r;
	}
	terminate() {}
}, om = class {
	constructor(e) {
		this.jo = e.jo, this.Jo = e.Jo;
	}
	Ho(e) {
		this.Zo = e;
	}
	Xo(e) {
		this.Yo = e;
	}
	e_(e) {
		this.t_ = e;
	}
	onMessage(e) {
		this.n_ = e;
	}
	close() {
		this.Jo();
	}
	send(e) {
		this.jo(e);
	}
	r_() {
		this.Zo();
	}
	i_() {
		this.Yo();
	}
	s_(e) {
		this.t_(e);
	}
	o_(e) {
		this.n_(e);
	}
}, sm = "WebChannelConnection", cm = (e, t, n) => {
	e.listen(t, ((e) => {
		try {
			n(e);
		} catch (e) {
			setTimeout((() => {
				throw e;
			}), 0);
		}
	}));
}, lm = class e extends am {
	constructor(e) {
		super(e), this.__ = [], this.forceLongPolling = e.forceLongPolling, this.autoDetectLongPolling = e.autoDetectLongPolling, this.useFetchStreams = e.useFetchStreams, this.longPollingOptions = e.longPollingOptions;
	}
	static a_() {
		e.u_ || (cm(uc(), lc.STAT_EVENT, ((e) => {
			e.stat === cc.PROXY ? j(sm, "STAT_EVENT: detected buffering proxy") : e.stat === cc.NOPROXY && j(sm, "STAT_EVENT: detected no buffering proxy");
		})), e.u_ = !0);
	}
	Go(e, t, n, r, i) {
		let a = nm();
		return new Promise(((i, o) => {
			let s = new ic();
			s.setWithCredentials(!0), s.listenOnce(oc.COMPLETE, (() => {
				try {
					switch (s.getLastErrorCode()) {
						case sc.NO_ERROR:
							let t = s.getResponseJson();
							j(sm, `XHR for RPC '${e}' ${a} received:`, JSON.stringify(t)), i(t);
							break;
						case sc.TIMEOUT:
							j(sm, `RPC '${e}' ${a} timed out`), o(new I(F.DEADLINE_EXCEEDED, "Request time out"));
							break;
						case sc.HTTP_ERROR:
							let n = s.getStatus();
							if (j(sm, `RPC '${e}' ${a} failed with status:`, n, "response text:", s.getResponseText()), n > 0) {
								let e = s.getResponseJson();
								Array.isArray(e) && (e = e[0]);
								let t = e?.error;
								t && t.status && t.message ? o(new I(function(e) {
									let t = e.toLowerCase().replace(/_/g, "-");
									return Object.values(F).indexOf(t) >= 0 ? t : F.UNKNOWN;
								}(t.status), t.message)) : o(new I(F.UNKNOWN, "Server responded with status " + s.getStatus()));
							} else o(new I(F.UNAVAILABLE, "Connection failed."));
							break;
						default: M(9055, {
							c_: e,
							streamId: a,
							l_: s.getLastErrorCode(),
							h_: s.getLastError()
						});
					}
				} finally {
					j(sm, `RPC '${e}' ${a} completed.`);
				}
			}));
			let c = JSON.stringify(r);
			j(sm, `RPC '${e}' ${a} sending request:`, r), s.send(t, "POST", c, n, 15);
		}));
	}
	P_(t, n, r) {
		let i = nm(), a = [
			this.qo,
			"/",
			"google.firestore.v1.Firestore",
			"/",
			t,
			"/channel"
		], o = this.createWebChannelTransport(), s = {
			httpSessionIdParam: "gsessionid",
			initMessageHeaders: {},
			messageUrlParams: { database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}` },
			sendRawJson: !0,
			supportsCrossDomainXhr: !0,
			internalChannelParams: { forwardChannelRequestTimeoutMs: 6e5 },
			forceLongPolling: this.forceLongPolling,
			detectBufferingProxy: this.autoDetectLongPolling
		}, c = this.longPollingOptions.timeoutSeconds;
		c !== void 0 && (s.longPollingTimeout = Math.round(1e3 * c)), this.useFetchStreams && (s.useFetchStreams = !0), this.Qo(s.initMessageHeaders, n, r), s.encodeInitMessageHeaders = !0;
		let l = a.join("");
		j(sm, `Creating RPC '${t}' stream ${i}: ${l}`, s);
		let u = o.createWebChannel(l, s);
		this.T_(u);
		let d = !1, f = !1, p = new om({
			jo: (e) => {
				f ? j(sm, `Not sending because RPC '${t}' stream ${i} is closed:`, e) : (d || (j(sm, `Opening RPC '${t}' stream ${i} transport.`), u.open(), d = !0), j(sm, `RPC '${t}' stream ${i} sending:`, e), u.send(e));
			},
			Jo: () => u.close()
		});
		return cm(u, ac.EventType.OPEN, (() => {
			f || (j(sm, `RPC '${t}' stream ${i} transport opened.`), p.r_());
		})), cm(u, ac.EventType.CLOSE, (() => {
			f || (f = !0, j(sm, `RPC '${t}' stream ${i} transport closed`), p.s_(), this.I_(u));
		})), cm(u, ac.EventType.ERROR, ((e) => {
			f || (f = !0, _c(sm, `RPC '${t}' stream ${i} transport errored. Name:`, e.name, "Message:", e.message), p.s_(new I(F.UNAVAILABLE, "The operation could not be completed")));
		})), cm(u, ac.EventType.MESSAGE, ((e) => {
			if (!f) {
				let n = e.data[0];
				N(!!n, 16349);
				let r = n, a = r?.error || r[0]?.error;
				if (a) {
					j(sm, `RPC '${t}' stream ${i} received error:`, a);
					let e = a.status, n = function(e) {
						let t = Y[e];
						if (t !== void 0) return ef(t);
					}(e), r = a.message;
					e === "NOT_FOUND" && r.includes("database") && r.includes("does not exist") && r.includes(this.databaseId.database) && _c(`Database '${this.databaseId.database}' not found. Please check your project configuration.`), n === void 0 && (n = F.INTERNAL, r = "Unknown error status: " + e + " with message " + a.message), f = !0, p.s_(new I(n, r)), u.close();
				} else j(sm, `RPC '${t}' stream ${i} received:`, n), p.o_(n);
			}
		})), e.a_(), setTimeout((() => {
			p.i_();
		}), 0), p;
	}
	terminate() {
		this.__.forEach(((e) => e.close())), this.__ = [];
	}
	T_(e) {
		this.__.push(e);
	}
	I_(e) {
		this.__ = this.__.filter(((t) => t === e));
	}
	Qo(e, t, n) {
		super.Qo(e, t, n), this.databaseInfo.apiKey && (e["x-goog-api-key"] = this.databaseInfo.apiKey);
	}
	createWebChannelTransport() {
		return dc();
	}
};
function um(e) {
	return new lm(e);
}
function dm() {
	return typeof document < "u" ? document : null;
}
function fm(e) {
	return new Sf(e, !0);
}
lm.u_ = !1;
var pm = class {
	constructor(e, t, n = 1e3, r = 1.5, i = 6e4) {
		this.Di = e, this.timerId = t, this.E_ = n, this.R_ = r, this.A_ = i, this.V_ = 0, this.d_ = null, this.m_ = Date.now(), this.reset();
	}
	reset() {
		this.V_ = 0;
	}
	f_() {
		this.V_ = this.A_;
	}
	g_(e) {
		this.cancel();
		let t = Math.floor(this.V_ + this.p_()), n = Math.max(0, Date.now() - this.m_), r = Math.max(0, t - n);
		r > 0 && j("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`), this.d_ = this.Di.enqueueAfterDelay(this.timerId, r, (() => (this.m_ = Date.now(), e()))), this.V_ *= this.R_, this.V_ < this.E_ && (this.V_ = this.E_), this.V_ > this.A_ && (this.V_ = this.A_);
	}
	y_() {
		this.d_ !== null && (this.d_.skipDelay(), this.d_ = null);
	}
	cancel() {
		this.d_ !== null && (this.d_.cancel(), this.d_ = null);
	}
	p_() {
		return (Math.random() - .5) * this.V_;
	}
}, mm = "PersistentStream", hm = class {
	constructor(e, t, n, r, i, a, o, s) {
		this.Di = e, this.w_ = n, this.S_ = r, this.connection = i, this.authCredentialsProvider = a, this.appCheckCredentialsProvider = o, this.listener = s, this.state = 0, this.b_ = 0, this.D_ = null, this.C_ = null, this.stream = null, this.v_ = 0, this.F_ = new pm(e, t);
	}
	M_() {
		return this.state === 1 || this.state === 5 || this.x_();
	}
	x_() {
		return this.state === 2 || this.state === 3;
	}
	start() {
		this.v_ = 0, this.state === 4 ? this.O_() : this.auth();
	}
	async stop() {
		this.M_() && await this.close(0);
	}
	N_() {
		this.state = 0, this.F_.reset();
	}
	B_() {
		this.x_() && this.D_ === null && (this.D_ = this.Di.enqueueAfterDelay(this.w_, 6e4, (() => this.L_())));
	}
	k_(e) {
		this.q_(), this.stream.send(e);
	}
	async L_() {
		if (this.x_()) return this.close(0);
	}
	q_() {
		this.D_ && (this.D_.cancel(), this.D_ = null);
	}
	K_() {
		this.C_ && (this.C_.cancel(), this.C_ = null);
	}
	async close(e, t) {
		this.q_(), this.K_(), this.F_.cancel(), this.b_++, e === 4 ? t && t.code === F.RESOURCE_EXHAUSTED ? (gc(t.toString()), gc("Using maximum backoff delay to prevent overloading the backend."), this.F_.f_()) : t && t.code === F.UNAUTHENTICATED && this.state !== 3 && (this.authCredentialsProvider.invalidateToken(), this.appCheckCredentialsProvider.invalidateToken()) : this.F_.reset(), this.stream !== null && (this.U_(), this.stream.close(), this.stream = null), this.state = e, await this.listener.e_(t);
	}
	U_() {}
	auth() {
		this.state = 1;
		let e = this.W_(this.b_), t = this.b_;
		Promise.all([this.authCredentialsProvider.getToken(), this.appCheckCredentialsProvider.getToken()]).then((([e, n]) => {
			this.b_ === t && this.Q_(e, n);
		}), ((t) => {
			e((() => {
				let e = new I(F.UNKNOWN, "Fetching auth token failed: " + t.message);
				return this.G_(e);
			}));
		}));
	}
	Q_(e, t) {
		let n = this.W_(this.b_);
		this.stream = this.z_(e, t), this.stream.Ho((() => {
			n((() => this.listener.Ho()));
		})), this.stream.Xo((() => {
			n((() => (this.state = 2, this.C_ = this.Di.enqueueAfterDelay(this.S_, 1e4, (() => (this.x_() && (this.state = 3), Promise.resolve()))), this.listener.Xo())));
		})), this.stream.e_(((e) => {
			n((() => this.G_(e)));
		})), this.stream.onMessage(((e) => {
			n((() => ++this.v_ == 1 ? this.j_(e) : this.onNext(e)));
		}));
	}
	O_() {
		this.state = 5, this.F_.g_((async () => {
			this.state = 0, this.start();
		}));
	}
	G_(e) {
		return j(mm, `close with error: ${e}`), this.stream = null, this.close(4, e);
	}
	W_(e) {
		return (t) => {
			this.Di.enqueueAndForget((() => this.b_ === e ? t() : (j(mm, "stream callback skipped by getCloseGuardedDispatcher."), Promise.resolve())));
		};
	}
}, gm = class extends hm {
	constructor(e, t, n, r, i, a) {
		super(e, "listen_stream_connection_backoff", "listen_stream_idle", "health_check_timeout", t, n, r, a), this.serializer = i;
	}
	z_(e, t) {
		return this.connection.P_("Listen", e, t);
	}
	j_(e) {
		return this.onNext(e);
	}
	onNext(e) {
		this.F_.reset();
		let t = Rf(this.serializer, e), n = function(e) {
			if (!("targetChange" in e)) return H.min();
			let t = e.targetChange;
			return t.targetIds && t.targetIds.length ? H.min() : t.readTime ? Df(t.readTime) : H.min();
		}(e);
		return this.listener.J_(t, n);
	}
	H_(e) {
		let t = {};
		t.database = Ff(this.serializer), t.addTarget = function(e, t) {
			let n, r = t.target;
			if (n = Fu(r) ? { documents: Vf(e, r) } : { query: Hf(e, r).dt }, n.targetId = t.targetId, t.resumeToken.approximateByteSize() > 0) {
				n.resumeToken = Tf(e, t.resumeToken);
				let r = Cf(e, t.expectedCount);
				r !== null && (n.expectedCount = r);
			} else if (t.snapshotVersion.compareTo(H.min()) > 0) {
				n.readTime = wf(e, t.snapshotVersion.toTimestamp());
				let r = Cf(e, t.expectedCount);
				r !== null && (n.expectedCount = r);
			}
			return n;
		}(this.serializer, e);
		let n = Wf(this.serializer, e);
		n && (t.labels = n), this.k_(t);
	}
	Z_(e) {
		let t = {};
		t.database = Ff(this.serializer), t.removeTarget = e, this.k_(t);
	}
}, _m = class extends hm {
	constructor(e, t, n, r, i, a) {
		super(e, "write_stream_connection_backoff", "write_stream_idle", "health_check_timeout", t, n, r, a), this.serializer = i;
	}
	get X_() {
		return this.v_ > 0;
	}
	start() {
		this.lastStreamToken = void 0, super.start();
	}
	U_() {
		this.X_ && this.Y_([]);
	}
	z_(e, t) {
		return this.connection.P_("Write", e, t);
	}
	j_(e) {
		return N(!!e.streamToken, 31322), this.lastStreamToken = e.streamToken, N(!e.writeResults || e.writeResults.length === 0, 55816), this.listener.ea();
	}
	onNext(e) {
		N(!!e.streamToken, 12678), this.lastStreamToken = e.streamToken, this.F_.reset();
		let t = Bf(e.writeResults, e.commitTime), n = Df(e.commitTime);
		return this.listener.ta(n, t);
	}
	na() {
		let e = {};
		e.database = Ff(this.serializer), this.k_(e);
	}
	Y_(e) {
		let t = {
			streamToken: this.lastStreamToken,
			writes: e.map(((e) => zf(this.serializer, e)))
		};
		this.k_(t);
	}
}, vm = class {}, ym = class extends vm {
	constructor(e, t, n, r) {
		super(), this.authCredentials = e, this.appCheckCredentials = t, this.connection = n, this.serializer = r, this.ra = !1;
	}
	ia() {
		if (this.ra) throw new I(F.FAILED_PRECONDITION, "The client has already been terminated.");
	}
	$o(e, t, n, r) {
		return this.ia(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then((([i, a]) => this.connection.$o(e, kf(t, n), r, i, a))).catch(((e) => {
			throw e.name === "FirebaseError" ? (e.code === F.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e) : new I(F.UNKNOWN, e.toString());
		}));
	}
	zo(e, t, n, r, i) {
		return this.ia(), Promise.all([this.authCredentials.getToken(), this.appCheckCredentials.getToken()]).then((([a, o]) => this.connection.zo(e, kf(t, n), r, a, o, i))).catch(((e) => {
			throw e.name === "FirebaseError" ? (e.code === F.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), this.appCheckCredentials.invalidateToken()), e) : new I(F.UNKNOWN, e.toString());
		}));
	}
	terminate() {
		this.ra = !0, this.connection.terminate();
	}
};
function bm(e, t, n, r) {
	return new ym(e, t, n, r);
}
var xm = class {
	constructor(e, t) {
		this.asyncQueue = e, this.onlineStateHandler = t, this.state = "Unknown", this.sa = 0, this.oa = null, this._a = !0;
	}
	aa() {
		this.sa === 0 && (this.ua("Unknown"), this.oa = this.asyncQueue.enqueueAfterDelay("online_state_timeout", 1e4, (() => (this.oa = null, this.ca("Backend didn't respond within 10 seconds."), this.ua("Offline"), Promise.resolve()))));
	}
	la(e) {
		this.state === "Online" ? this.ua("Unknown") : (this.sa++, this.sa >= 1 && (this.ha(), this.ca(`Connection failed 1 times. Most recent error: ${e.toString()}`), this.ua("Offline")));
	}
	set(e) {
		this.ha(), this.sa = 0, e === "Online" && (this._a = !1), this.ua(e);
	}
	ua(e) {
		e !== this.state && (this.state = e, this.onlineStateHandler(e));
	}
	ca(e) {
		let t = `Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
		this._a ? (gc(t), this._a = !1) : j("OnlineStateTracker", t);
	}
	ha() {
		this.oa !== null && (this.oa.cancel(), this.oa = null);
	}
}, Sm = "RemoteStore", Cm = class {
	constructor(e, t, n, r, i) {
		this.localStore = e, this.datastore = t, this.asyncQueue = n, this.remoteSyncer = {}, this.Pa = [], this.Ta = /* @__PURE__ */ new Map(), this.Ia = /* @__PURE__ */ new Map(), this.Ea = /* @__PURE__ */ new Map(), this.Ra = new up(1e3), this.Aa = new up(1001), this.Va = /* @__PURE__ */ new Set(), this.da = [], this.ma = i, this.ma.Fo(((e) => {
			n.enqueueAndForget((async () => {
				Nm(this) && (j(Sm, "Restarting streams for network reachability change."), await async function(e) {
					let t = P(e);
					t.Va.add(4), await Tm(t), t.fa.set("Unknown"), t.Va.delete(4), await wm(t);
				}(this));
			}));
		})), this.fa = new xm(n, r);
	}
};
async function wm(e) {
	if (Nm(e)) for (let t of e.da) await t(!0);
}
async function Tm(e) {
	for (let t of e.da) await t(!1);
}
function Em(e, t) {
	return e.Ia.get(t) || void 0;
}
function Dm(e, t) {
	let n = P(e), r = Em(n, t.targetId);
	if (r !== void 0 && n.Ta.has(r)) return;
	let i = function(e, t) {
		let n = Em(e, t);
		n !== void 0 && e.Ea.delete(n);
		let r = function(e, t) {
			return t % 2 == 0 ? e.Ra.next() : e.Aa.next();
		}(e, t);
		return e.Ia.set(t, r), e.Ea.set(r, t), r;
	}(n, t.targetId);
	j(Sm, "remoteStoreListen mapping SDK target ID to remote", t.targetId, i);
	let a = new tp(t.target, i, t.purpose, t.sequenceNumber, t.snapshotVersion, t.lastLimboFreeSnapshotVersion, t.resumeToken);
	n.Ta.set(i, a), Mm(n) ? jm(n) : Qm(n).x_() && km(n, a);
}
function Om(e, t) {
	let n = P(e), r = Qm(n), i = Em(n, t);
	j(Sm, "remoteStoreUnlisten removing mapping of SDK target ID to remote", t, i), n.Ta.delete(i), n.Ia.delete(t), n.Ea.delete(i), r.x_() && Am(n, i), n.Ta.size === 0 && (r.x_() ? r.B_() : Nm(n) && n.fa.set("Unknown"));
}
function km(e, t) {
	if (e.ga.$e(t.targetId), t.resumeToken.approximateByteSize() > 0 || t.snapshotVersion.compareTo(H.min()) > 0) {
		let n = e.Ea.get(t.targetId);
		if (n === void 0) return void j(Sm, "SDK target ID not found for remote ID: " + t.targetId);
		let r = e.remoteSyncer.getRemoteKeysForTarget(n).size;
		t = t.withExpectedCount(r);
	}
	Qm(e).H_(t);
}
function Am(e, t) {
	e.ga.$e(t), Qm(e).Z_(t);
}
function jm(e) {
	e.ga = new gf({
		getRemoteKeysForTarget: (t) => {
			let n = e.Ea.get(t);
			return n === void 0 ? J() : e.remoteSyncer.getRemoteKeysForTarget(n);
		},
		Rt: (t) => e.Ta.get(t) || null,
		lt: () => e.datastore.serializer.databaseId
	}), Qm(e).start(), e.fa.aa();
}
function Mm(e) {
	return Nm(e) && !Qm(e).M_() && e.Ta.size > 0;
}
function Nm(e) {
	return P(e).Va.size === 0;
}
function Pm(e) {
	e.ga = void 0;
}
async function Fm(e) {
	e.fa.set("Online");
}
async function Im(e) {
	e.Ta.forEach(((t, n) => {
		km(e, t);
	}));
}
async function Lm(e, t) {
	Pm(e), Mm(e) ? (e.fa.la(t), jm(e)) : e.fa.set("Unknown");
}
async function Rm(e, t, n) {
	if (e.fa.set("Online"), t instanceof pf && t.state === 2 && t.cause) try {
		await async function(e, t) {
			let n = t.cause;
			for (let r of t.targetIds) {
				if (e.Ta.has(r)) {
					let t = e.Ea.get(r);
					t !== void 0 && (await e.remoteSyncer.rejectListen(t, n), e.Ia.delete(t), e.Ea.delete(r)), e.Ta.delete(r);
				}
				e.ga.removeTarget(r);
			}
		}(e, t);
	} catch (n) {
		j(Sm, "Failed to remove targets %s: %s ", t.targetIds.join(","), n), await zm(e, n);
	}
	else if (t instanceof df ? e.ga.Xe(t) : t instanceof ff ? e.ga.it(t) : e.ga.tt(t), !n.isEqual(H.min())) try {
		let t = await Hp(e.localStore);
		n.compareTo(t) >= 0 && await function(e, t) {
			let n = e.ga.Pt(t);
			n.targetChanges.forEach(((n, r) => {
				if (n.resumeToken.approximateByteSize() > 0) {
					let i = e.Ta.get(r);
					i && e.Ta.set(r, i.withResumeToken(n.resumeToken, t));
				}
			})), n.targetMismatches.forEach(((t, n) => {
				let r = e.Ta.get(t);
				r && (e.Ta.set(t, r.withResumeToken(Cl.EMPTY_BYTE_STRING, r.snapshotVersion)), Am(e, t), km(e, new tp(r.target, t, n, r.sequenceNumber)));
			}));
			let r = function(e, t) {
				let n = /* @__PURE__ */ new Map();
				t.targetChanges.forEach(((t, r) => {
					let i = e.Ea.get(r);
					i !== void 0 && n.set(i, t);
				}));
				let r = new W(L);
				return t.targetMismatches.forEach(((t, n) => {
					let i = e.Ea.get(t);
					i !== void 0 && (r = r.insert(i, n));
				})), new lf(t.snapshotVersion, n, r, t.documentUpdates, t.resolvedLimboDocuments);
			}(e, n);
			return e.remoteSyncer.applyRemoteEvent(r);
		}(e, n);
	} catch (t) {
		j(Sm, "Failed to raise snapshot:", t), await zm(e, t);
	}
}
async function zm(e, t, n) {
	if (!al(t)) throw t;
	e.Va.add(1), await Tm(e), e.fa.set("Offline"), n || (n = () => Hp(e.localStore)), e.asyncQueue.enqueueRetryable((async () => {
		j(Sm, "Retrying IndexedDB access"), await n(), e.Va.delete(1), await wm(e);
	}));
}
function Bm(e, t) {
	return t().catch(((n) => zm(e, n, t)));
}
async function Vm(e) {
	let t = P(e), n = $m(t), r = t.Pa.length > 0 ? t.Pa[t.Pa.length - 1].batchId : sl;
	for (; Hm(t);) try {
		let e = await Gp(t.localStore, r);
		if (e === null) {
			t.Pa.length === 0 && n.B_();
			break;
		}
		r = e.batchId, Um(t, e);
	} catch (e) {
		await zm(t, e);
	}
	Wm(t) && Gm(t);
}
function Hm(e) {
	return Nm(e) && e.Pa.length < 10;
}
function Um(e, t) {
	e.Pa.push(t);
	let n = $m(e);
	n.x_() && n.X_ && n.Y_(t.mutations);
}
function Wm(e) {
	return Nm(e) && !$m(e).M_() && e.Pa.length > 0;
}
function Gm(e) {
	$m(e).start();
}
async function Km(e) {
	$m(e).na();
}
async function qm(e) {
	let t = $m(e);
	for (let n of e.Pa) t.Y_(n.mutations);
}
async function Jm(e, t, n) {
	let r = e.Pa.shift(), i = Xd.from(r, t, n);
	await Bm(e, (() => e.remoteSyncer.applySuccessfulWrite(i))), await Vm(e);
}
async function Ym(e, t) {
	t && $m(e).X_ && await async function(e, t) {
		if (function(e) {
			return $d(e) && e !== F.ABORTED;
		}(t.code)) {
			let n = e.Pa.shift();
			$m(e).N_(), await Bm(e, (() => e.remoteSyncer.rejectFailedWrite(n.batchId, t))), await Vm(e);
		}
	}(e, t), Wm(e) && Gm(e);
}
async function Xm(e, t) {
	let n = P(e);
	n.asyncQueue.verifyOperationInProgress(), j(Sm, "RemoteStore received new credentials");
	let r = Nm(n);
	n.Va.add(3), await Tm(n), r && n.fa.set("Unknown"), await n.remoteSyncer.handleCredentialChange(t), n.Va.delete(3), await wm(n);
}
async function Zm(e, t) {
	let n = P(e);
	t ? (n.Va.delete(2), await wm(n)) : t || (n.Va.add(2), await Tm(n), n.fa.set("Unknown"));
}
function Qm(e) {
	return e.pa || (e.pa = function(e, t, n) {
		let r = P(e);
		return r.ia(), new gm(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
	}(e.datastore, e.asyncQueue, {
		Ho: Fm.bind(null, e),
		Xo: Im.bind(null, e),
		e_: Lm.bind(null, e),
		J_: Rm.bind(null, e)
	}), e.da.push((async (t) => {
		t ? (e.pa.N_(), Mm(e) ? jm(e) : e.fa.set("Unknown")) : (await e.pa.stop(), Pm(e));
	}))), e.pa;
}
function $m(e) {
	return e.ya || (e.ya = function(e, t, n) {
		let r = P(e);
		return r.ia(), new _m(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
	}(e.datastore, e.asyncQueue, {
		Ho: () => Promise.resolve(),
		Xo: Km.bind(null, e),
		e_: Ym.bind(null, e),
		ea: qm.bind(null, e),
		ta: Jm.bind(null, e)
	}), e.da.push((async (t) => {
		t ? (e.ya.N_(), await Vm(e)) : (await e.ya.stop(), e.Pa.length > 0 && (j(Sm, `Stopping write stream with ${e.Pa.length} pending writes`), e.Pa = []));
	}))), e.ya;
}
var eh = class e {
	constructor(e, t, n, r, i) {
		this.asyncQueue = e, this.timerId = t, this.targetTimeMs = n, this.op = r, this.removalCallback = i, this.deferred = new bc(), this.then = this.deferred.promise.then.bind(this.deferred.promise), this.deferred.promise.catch(((e) => {}));
	}
	get promise() {
		return this.deferred.promise;
	}
	static createAndSchedule(t, n, r, i, a) {
		let o = new e(t, n, Date.now() + r, i, a);
		return o.start(r), o;
	}
	start(e) {
		this.timerHandle = setTimeout((() => this.handleDelayElapsed()), e);
	}
	skipDelay() {
		return this.handleDelayElapsed();
	}
	cancel(e) {
		this.timerHandle !== null && (this.clearTimeout(), this.deferred.reject(new I(F.CANCELLED, "Operation cancelled" + (e ? ": " + e : ""))));
	}
	handleDelayElapsed() {
		this.asyncQueue.enqueueAndForget((() => this.timerHandle === null ? Promise.resolve() : (this.clearTimeout(), this.op().then(((e) => this.deferred.resolve(e))))));
	}
	clearTimeout() {
		this.timerHandle !== null && (this.removalCallback(this), clearTimeout(this.timerHandle), this.timerHandle = null);
	}
};
function th(e, t) {
	if (gc("AsyncQueue", `${t}: ${e}`), al(e)) return new I(F.UNAVAILABLE, `${t}: ${e}`);
	throw e;
}
var nh = class e {
	static emptySet(t) {
		return new e(t.comparator);
	}
	constructor(e) {
		this.comparator = e ? (t, n) => e(t, n) || z.comparator(t.key, n.key) : (e, t) => z.comparator(e.key, t.key), this.keyedMap = rd(), this.sortedSet = new W(this.comparator);
	}
	has(e) {
		return this.keyedMap.get(e) != null;
	}
	get(e) {
		return this.keyedMap.get(e);
	}
	first() {
		return this.sortedSet.minKey();
	}
	last() {
		return this.sortedSet.maxKey();
	}
	isEmpty() {
		return this.sortedSet.isEmpty();
	}
	indexOf(e) {
		let t = this.keyedMap.get(e);
		return t ? this.sortedSet.indexOf(t) : -1;
	}
	get size() {
		return this.sortedSet.size;
	}
	forEach(e) {
		this.sortedSet.inorderTraversal(((t, n) => (e(t), !1)));
	}
	add(e) {
		let t = this.delete(e.key);
		return t.copy(t.keyedMap.insert(e.key, e), t.sortedSet.insert(e, null));
	}
	delete(e) {
		let t = this.get(e);
		return t ? this.copy(this.keyedMap.remove(e), this.sortedSet.remove(t)) : this;
	}
	isEqual(t) {
		if (!(t instanceof e) || this.size !== t.size) return !1;
		let n = this.sortedSet.getIterator(), r = t.sortedSet.getIterator();
		for (; n.hasNext();) {
			let e = n.getNext().key, t = r.getNext().key;
			if (!e.isEqual(t)) return !1;
		}
		return !0;
	}
	toString() {
		let e = [];
		return this.forEach(((t) => {
			e.push(t.toString());
		})), e.length === 0 ? "DocumentSet ()" : "DocumentSet (\n  " + e.join("  \n") + "\n)";
	}
	copy(t, n) {
		let r = new e();
		return r.comparator = this.comparator, r.keyedMap = t, r.sortedSet = n, r;
	}
}, rh = class {
	constructor() {
		this.wa = new W(z.comparator);
	}
	track(e) {
		let t = e.doc.key, n = this.wa.get(t);
		n ? e.type !== 0 && n.type === 3 ? this.wa = this.wa.insert(t, e) : e.type === 3 && n.type !== 1 ? this.wa = this.wa.insert(t, {
			type: n.type,
			doc: e.doc
		}) : e.type === 2 && n.type === 2 ? this.wa = this.wa.insert(t, {
			type: 2,
			doc: e.doc
		}) : e.type === 2 && n.type === 0 ? this.wa = this.wa.insert(t, {
			type: 0,
			doc: e.doc
		}) : e.type === 1 && n.type === 0 ? this.wa = this.wa.remove(t) : e.type === 1 && n.type === 2 ? this.wa = this.wa.insert(t, {
			type: 1,
			doc: n.doc
		}) : e.type === 0 && n.type === 1 ? this.wa = this.wa.insert(t, {
			type: 2,
			doc: e.doc
		}) : M(63341, {
			At: e,
			Sa: n
		}) : this.wa = this.wa.insert(t, e);
	}
	ba() {
		let e = [];
		return this.wa.inorderTraversal(((t, n) => {
			e.push(n);
		})), e;
	}
}, ih = class e {
	constructor(e, t, n, r, i, a, o, s, c) {
		this.query = e, this.docs = t, this.oldDocs = n, this.docChanges = r, this.mutatedKeys = i, this.fromCache = a, this.syncStateChanged = o, this.excludesMetadataChanges = s, this.hasCachedResults = c;
	}
	static fromInitialDocuments(t, n, r, i, a) {
		let o = [];
		return n.forEach(((e) => {
			o.push({
				type: 0,
				doc: e
			});
		})), new e(t, n, nh.emptySet(n), o, r, i, !0, !1, a);
	}
	get hasPendingWrites() {
		return !this.mutatedKeys.isEmpty();
	}
	isEqual(e) {
		if (!(this.fromCache === e.fromCache && this.hasCachedResults === e.hasCachedResults && this.syncStateChanged === e.syncStateChanged && this.mutatedKeys.isEqual(e.mutatedKeys) && Ku(this.query, e.query) && this.docs.isEqual(e.docs) && this.oldDocs.isEqual(e.oldDocs))) return !1;
		let t = this.docChanges, n = e.docChanges;
		if (t.length !== n.length) return !1;
		for (let e = 0; e < t.length; e++) if (t[e].type !== n[e].type || !t[e].doc.isEqual(n[e].doc)) return !1;
		return !0;
	}
}, ah = class {
	constructor() {
		this.Da = void 0, this.Ca = [];
	}
	va() {
		return this.Ca.some(((e) => e.Fa()));
	}
}, oh = class {
	constructor() {
		this.queries = sh(), this.onlineState = "Unknown", this.Ma = /* @__PURE__ */ new Set();
	}
	terminate() {
		(function(e, t) {
			let n = P(e), r = n.queries;
			n.queries = sh(), r.forEach(((e, n) => {
				for (let e of n.Ca) e.onError(t);
			}));
		})(this, new I(F.ABORTED, "Firestore shutting down"));
	}
};
function sh() {
	return new $u(((e) => qu(e)), Ku);
}
async function ch(e, t) {
	let n = P(e), r = 3, i = t.query, a = n.queries.get(i);
	a ? !a.va() && t.Fa() && (r = 2) : (a = new ah(), r = +!t.Fa());
	try {
		switch (r) {
			case 0:
				a.Da = await n.onListen(i, !0);
				break;
			case 1:
				a.Da = await n.onListen(i, !1);
				break;
			case 2: await n.onFirstRemoteStoreListen(i);
		}
	} catch (e) {
		let n = th(e, `Initialization of query '${Ju(t.query)}' failed`);
		t.onError(n);
		return;
	}
	n.queries.set(i, a), a.Ca.push(t), t.xa(n.onlineState), a.Da && t.Oa(a.Da) && fh(n);
}
async function lh(e, t) {
	let n = P(e), r = t.query, i = 3, a = n.queries.get(r);
	if (a) {
		let e = a.Ca.indexOf(t);
		e >= 0 && (a.Ca.splice(e, 1), a.Ca.length === 0 ? i = +!t.Fa() : !a.va() && t.Fa() && (i = 2));
	}
	switch (i) {
		case 0: return n.queries.delete(r), n.onUnlisten(r, !0);
		case 1: return n.queries.delete(r), n.onUnlisten(r, !1);
		case 2: return n.onLastRemoteStoreUnlisten(r);
		default: return;
	}
}
function uh(e, t) {
	let n = P(e), r = !1;
	for (let e of t) {
		let t = e.query, i = n.queries.get(t);
		if (i) {
			for (let t of i.Ca) t.Oa(e) && (r = !0);
			i.Da = e;
		}
	}
	r && fh(n);
}
function dh(e, t, n) {
	let r = P(e), i = r.queries.get(t);
	if (i) for (let e of i.Ca) e.onError(n);
	r.queries.delete(t);
}
function fh(e) {
	e.Ma.forEach(((e) => {
		e.next();
	}));
}
var ph, mh;
(mh = ph || (ph = {})).Na = "default", mh.Cache = "cache";
var hh = class {
	constructor(e, t, n) {
		this.query = e, this.Ba = t, this.La = !1, this.ka = null, this.onlineState = "Unknown", this.options = n || {};
	}
	Oa(e) {
		if (!this.options.includeMetadataChanges) {
			let t = [];
			for (let n of e.docChanges) n.type !== 3 && t.push(n);
			e = new ih(e.query, e.docs, e.oldDocs, t, e.mutatedKeys, e.fromCache, e.syncStateChanged, !0, e.hasCachedResults);
		}
		let t = !1;
		return this.La ? this.qa(e) && (this.Ba.next(e), t = !0) : this.Ka(e, this.onlineState) && (this.Ua(e), t = !0), this.ka = e, t;
	}
	onError(e) {
		this.Ba.error(e);
	}
	xa(e) {
		this.onlineState = e;
		let t = !1;
		return this.ka && !this.La && this.Ka(this.ka, e) && (this.Ua(this.ka), t = !0), t;
	}
	Ka(e, t) {
		if (!e.fromCache || !this.Fa()) return !0;
		let n = t !== "Offline";
		return (!this.options.$a || !n) && (!e.docs.isEmpty() || e.hasCachedResults || t === "Offline");
	}
	qa(e) {
		if (e.docChanges.length > 0) return !0;
		let t = this.ka && this.ka.hasPendingWrites !== e.hasPendingWrites;
		return !(!e.syncStateChanged && !t) && !0 === this.options.includeMetadataChanges;
	}
	Ua(e) {
		e = ih.fromInitialDocuments(e.query, e.docs, e.mutatedKeys, e.fromCache, e.hasCachedResults), this.La = !0, this.Ba.next(e);
	}
	Fa() {
		return this.options.source !== ph.Cache;
	}
}, gh = class {
	constructor(e) {
		this.key = e;
	}
}, _h = class {
	constructor(e) {
		this.key = e;
	}
}, vh = class {
	constructor(e, t) {
		this.query = e, this.eu = t, this.tu = null, this.hasCachedResults = !1, this.current = !1, this.nu = J(), this.mutatedKeys = J(), this.ru = Zu(e), this.iu = new nh(this.ru);
	}
	get su() {
		return this.eu;
	}
	ou(e, t) {
		let n = t ? t._u : new rh(), r = t ? t.iu : this.iu, i = t ? t.mutatedKeys : this.mutatedKeys, a = r, o = !1, s = this.query.limitType === "F" && r.size === this.query.limit ? r.last() : null, c = this.query.limitType === "L" && r.size === this.query.limit ? r.first() : null;
		if (e.inorderTraversal(((e, t) => {
			let l = r.get(e), u = Yu(this.query, t) ? t : null, d = !!l && this.mutatedKeys.has(l.key), f = !!u && (u.hasLocalMutations || this.mutatedKeys.has(u.key) && u.hasCommittedMutations), p = !1;
			l && u ? l.data.isEqual(u.data) ? d !== f && (n.track({
				type: 3,
				doc: u
			}), p = !0) : this.au(l, u) || (n.track({
				type: 2,
				doc: u
			}), p = !0, (s && this.ru(u, s) > 0 || c && this.ru(u, c) < 0) && (o = !0)) : !l && u ? (n.track({
				type: 0,
				doc: u
			}), p = !0) : l && !u && (n.track({
				type: 1,
				doc: l
			}), p = !0, (s || c) && (o = !0)), p && (u ? (a = a.add(u), i = f ? i.add(e) : i.delete(e)) : (a = a.delete(e), i = i.delete(e)));
		})), this.query.limit !== null) for (; a.size > this.query.limit;) {
			let e = this.query.limitType === "F" ? a.last() : a.first();
			a = a.delete(e.key), i = i.delete(e.key), n.track({
				type: 1,
				doc: e
			});
		}
		return {
			iu: a,
			_u: n,
			Ss: o,
			mutatedKeys: i
		};
	}
	au(e, t) {
		return e.hasLocalMutations && t.hasCommittedMutations && !t.hasLocalMutations;
	}
	applyChanges(e, t, n, r) {
		let i = this.iu;
		this.iu = e.iu, this.mutatedKeys = e.mutatedKeys;
		let a = e._u.ba();
		a.sort(((e, t) => function(e, t) {
			let n = (e) => {
				switch (e) {
					case 0: return 1;
					case 2:
					case 3: return 2;
					case 1: return 0;
					default: return M(20277, { At: e });
				}
			};
			return n(e) - n(t);
		}(e.type, t.type) || this.ru(e.doc, t.doc))), this.uu(n), r = r ?? !1;
		let o = t && !r ? this.cu() : [], s = this.nu.size === 0 && this.current && !r ? 1 : 0, c = s !== this.tu;
		return this.tu = s, a.length !== 0 || c ? {
			snapshot: new ih(this.query, e.iu, i, a, e.mutatedKeys, s === 0, c, !1, !!n && n.resumeToken.approximateByteSize() > 0),
			lu: o
		} : { lu: o };
	}
	xa(e) {
		return this.current && e === "Offline" ? (this.current = !1, this.applyChanges({
			iu: this.iu,
			_u: new rh(),
			mutatedKeys: this.mutatedKeys,
			Ss: !1
		}, !1)) : { lu: [] };
	}
	hu(e) {
		return !this.eu.has(e) && !!this.iu.has(e) && !this.iu.get(e).hasLocalMutations;
	}
	uu(e) {
		e && (e.addedDocuments.forEach(((e) => this.eu = this.eu.add(e))), e.modifiedDocuments.forEach(((e) => {})), e.removedDocuments.forEach(((e) => this.eu = this.eu.delete(e))), this.current = e.current);
	}
	cu() {
		if (!this.current) return [];
		let e = this.nu;
		this.nu = J(), this.iu.forEach(((e) => {
			this.hu(e.key) && (this.nu = this.nu.add(e.key));
		}));
		let t = [];
		return e.forEach(((e) => {
			this.nu.has(e) || t.push(new _h(e));
		})), this.nu.forEach(((n) => {
			e.has(n) || t.push(new gh(n));
		})), t;
	}
	Pu(e) {
		this.eu = e.Ls, this.nu = J();
		let t = this.ou(e.documents);
		return this.applyChanges(t, !0);
	}
	Tu() {
		return ih.fromInitialDocuments(this.query, this.iu, this.mutatedKeys, this.tu === 0, this.hasCachedResults);
	}
}, yh = "SyncEngine", bh = class {
	constructor(e, t, n) {
		this.query = e, this.targetId = t, this.view = n;
	}
}, xh = class {
	constructor(e) {
		this.key = e, this.Iu = !1;
	}
}, Sh = class {
	constructor(e, t, n, r, i, a) {
		this.localStore = e, this.remoteStore = t, this.eventManager = n, this.sharedClientState = r, this.currentUser = i, this.maxConcurrentLimboResolutions = a, this.Eu = {}, this.Ru = new $u(((e) => qu(e)), Ku), this.Au = /* @__PURE__ */ new Map(), this.Vu = /* @__PURE__ */ new Set(), this.du = new W(z.comparator), this.mu = /* @__PURE__ */ new Map(), this.fu = new wp(), this.gu = {}, this.pu = /* @__PURE__ */ new Map(), this.yu = up._r(), this.onlineState = "Unknown", this.wu = void 0;
	}
	get isPrimaryClient() {
		return !0 === this.wu;
	}
};
async function Ch(e, t, n = !0) {
	let r = Gh(e), i, a = r.Ru.get(t);
	return a ? (r.sharedClientState.addLocalQueryTarget(a.targetId), i = a.view.Tu()) : i = await Th(r, t, n, !0), i;
}
async function wh(e, t) {
	await Th(Gh(e), t, !0, !1);
}
async function Th(e, t, n, r) {
	let i = await Kp(e.localStore, Uu(t)), a = i.targetId, o = e.sharedClientState.addLocalQueryTarget(a, n), s;
	return r && (s = await Eh(e, t, a, o === "current", i.resumeToken)), e.isPrimaryClient && n && Dm(e.remoteStore, i), s;
}
async function Eh(e, t, n, r, i) {
	e.Su = (t, n, r) => async function(e, t, n, r) {
		let i = t.view.ou(n);
		i.Ss && (i = await Jp(e.localStore, t.query, !1).then((({ documents: e }) => t.view.ou(e, i))));
		let a = r && r.targetChanges.get(t.targetId), o = r && r.targetMismatches.get(t.targetId) != null, s = t.view.applyChanges(i, e.isPrimaryClient, a, o);
		return zh(e, t.targetId, s.lu), s.snapshot;
	}(e, t, n, r);
	let a = await Jp(e.localStore, t, !0), o = new vh(t, a.Ls), s = o.ou(a.documents), c = uf.createSynthesizedTargetChangeForCurrentChange(n, r && e.onlineState !== "Offline", i), l = o.applyChanges(s, e.isPrimaryClient, c);
	zh(e, n, l.lu);
	let u = new bh(t, n, o);
	return e.Ru.set(t, u), e.Au.has(n) ? e.Au.get(n).push(t) : e.Au.set(n, [t]), l.snapshot;
}
async function Dh(e, t, n) {
	let r = P(e), i = r.Ru.get(t), a = r.Au.get(i.targetId);
	if (a.length > 1) return r.Au.set(i.targetId, a.filter(((e) => !Ku(e, t)))), void r.Ru.delete(t);
	r.isPrimaryClient ? (r.sharedClientState.removeLocalQueryTarget(i.targetId), r.sharedClientState.isActiveQueryTarget(i.targetId) || await qp(r.localStore, i.targetId, !1).then((() => {
		r.sharedClientState.clearQueryState(i.targetId), n && Om(r.remoteStore, i.targetId), Lh(r, i.targetId);
	})).catch(rl)) : (Lh(r, i.targetId), await qp(r.localStore, i.targetId, !0));
}
async function Oh(e, t) {
	let n = P(e), r = n.Ru.get(t), i = n.Au.get(r.targetId);
	n.isPrimaryClient && i.length === 1 && (n.sharedClientState.removeLocalQueryTarget(r.targetId), Om(n.remoteStore, r.targetId));
}
async function kh(e, t, n) {
	let r = Kh(e);
	try {
		let e = await function(e, t) {
			let n = P(e), r = V.now(), i = t.reduce(((e, t) => e.add(t.key)), J()), a, o;
			return n.persistence.runTransaction("Locally write mutations", "readwrite", ((e) => {
				let s = td(), c = J();
				return n.Ms.getEntries(e, i).next(((e) => {
					s = e, s.forEach(((e, t) => {
						t.isValidDocument() || (c = c.add(e));
					}));
				})).next((() => n.localDocuments.getOverlayedDocuments(e, s))).next(((i) => {
					a = i;
					let o = [];
					for (let e of t) {
						let t = Bd(e, a.get(e.key).overlayedDocument);
						t != null && o.push(new Ud(e.key, t, cu(t.value.mapValue), Pd.exists(!0)));
					}
					return n.mutationQueue.addMutationBatch(e, r, o, t);
				})).next(((t) => {
					o = t;
					let r = t.applyToLocalDocumentSet(a, c);
					return n.documentOverlayCache.saveOverlays(e, t.batchId, r);
				}));
			})).then((() => ({
				batchId: o.batchId,
				changes: id(a)
			})));
		}(r.localStore, t);
		r.sharedClientState.addPendingMutation(e.batchId), function(e, t, n) {
			let r = e.gu[e.currentUser.toKey()];
			r || (r = new W(L)), r = r.insert(t, n), e.gu[e.currentUser.toKey()] = r;
		}(r, e.batchId, n), await Hh(r, e.changes), await Vm(r.remoteStore);
	} catch (e) {
		let t = th(e, "Failed to persist write");
		n.reject(t);
	}
}
async function Ah(e, t) {
	let n = P(e);
	try {
		let e = await Up(n.localStore, t);
		t.targetChanges.forEach(((e, t) => {
			let r = n.mu.get(t);
			r && (N(e.addedDocuments.size + e.modifiedDocuments.size + e.removedDocuments.size <= 1, 22616), e.addedDocuments.size > 0 ? r.Iu = !0 : e.modifiedDocuments.size > 0 ? N(r.Iu, 14607) : e.removedDocuments.size > 0 && (N(r.Iu, 42227), r.Iu = !1));
		})), await Hh(n, e, t);
	} catch (e) {
		await rl(e);
	}
}
function jh(e, t, n) {
	let r = P(e);
	if (r.isPrimaryClient && n === 0 || !r.isPrimaryClient && n === 1) {
		let e = [];
		r.Ru.forEach(((n, r) => {
			let i = r.view.xa(t);
			i.snapshot && e.push(i.snapshot);
		})), function(e, t) {
			let n = P(e);
			n.onlineState = t;
			let r = !1;
			n.queries.forEach(((e, n) => {
				for (let e of n.Ca) e.xa(t) && (r = !0);
			})), r && fh(n);
		}(r.eventManager, t), e.length && r.Eu.J_(e), r.onlineState = t, r.isPrimaryClient && r.sharedClientState.setOnlineState(t);
	}
}
async function Mh(e, t, n) {
	let r = P(e);
	r.sharedClientState.updateQueryState(t, "rejected", n);
	let i = r.mu.get(t), a = i && i.key;
	if (a) {
		let e = new W(z.comparator);
		e = e.insert(a, lu.newNoDocument(a, H.min()));
		let n = J().add(a);
		await Ah(r, new lf(H.min(), /* @__PURE__ */ new Map(), new W(L), e, n)), r.du = r.du.remove(a), r.mu.delete(t), Vh(r);
	} else await qp(r.localStore, t, !1).then((() => Lh(r, t, n))).catch(rl);
}
async function Nh(e, t) {
	let n = P(e), r = t.batch.batchId;
	try {
		let e = await Vp(n.localStore, t);
		Ih(n, r, null), Fh(n, r), n.sharedClientState.updateMutationState(r, "acknowledged"), await Hh(n, e);
	} catch (e) {
		await rl(e);
	}
}
async function Ph(e, t, n) {
	let r = P(e);
	try {
		let e = await function(e, t) {
			let n = P(e);
			return n.persistence.runTransaction("Reject batch", "readwrite-primary", ((e) => {
				let r;
				return n.mutationQueue.lookupMutationBatch(e, t).next(((t) => (N(t !== null, 37113), r = t.keys(), n.mutationQueue.removeMutationBatch(e, t)))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, r))).next((() => n.localDocuments.getDocuments(e, r)));
			}));
		}(r.localStore, t);
		Ih(r, t, n), Fh(r, t), r.sharedClientState.updateMutationState(t, "rejected", n), await Hh(r, e);
	} catch (e) {
		await rl(e);
	}
}
function Fh(e, t) {
	(e.pu.get(t) || []).forEach(((e) => {
		e.resolve();
	})), e.pu.delete(t);
}
function Ih(e, t, n) {
	let r = P(e), i = r.gu[r.currentUser.toKey()];
	if (i) {
		let e = i.get(t);
		e && (n ? e.reject(n) : e.resolve(), i = i.remove(t)), r.gu[r.currentUser.toKey()] = i;
	}
}
function Lh(e, t, n = null) {
	e.sharedClientState.removeLocalQueryTarget(t);
	for (let r of e.Au.get(t)) e.Ru.delete(r), n && e.Eu.bu(r, n);
	e.Au.delete(t), e.isPrimaryClient && e.fu.Qr(t).forEach(((t) => {
		e.fu.containsKey(t) || Rh(e, t);
	}));
}
function Rh(e, t) {
	e.Vu.delete(t.path.canonicalString());
	let n = e.du.get(t);
	n !== null && (Om(e.remoteStore, n), e.du = e.du.remove(t), e.mu.delete(n), Vh(e));
}
function zh(e, t, n) {
	for (let r of n) r instanceof gh ? (e.fu.addReference(r.key, t), Bh(e, r)) : r instanceof _h ? (j(yh, "Document no longer in limbo: " + r.key), e.fu.removeReference(r.key, t), e.fu.containsKey(r.key) || Rh(e, r.key)) : M(19791, { Du: r });
}
function Bh(e, t) {
	let n = t.key, r = n.path.canonicalString();
	e.du.get(n) || e.Vu.has(r) || (j(yh, "New document in limbo: " + n), e.Vu.add(r), Vh(e));
}
function Vh(e) {
	for (; e.Vu.size > 0 && e.du.size < e.maxConcurrentLimboResolutions;) {
		let t = e.Vu.values().next().value;
		e.Vu.delete(t);
		let n = new z(R.fromString(t)), r = e.yu.next();
		e.mu.set(r, new xh(n)), e.du = e.du.insert(n, r), Dm(e.remoteStore, new tp(Uu(Ru(n.path)), r, "TargetPurposeLimboResolution", ol.ce));
	}
}
async function Hh(e, t, n) {
	let r = P(e), i = [], a = [], o = [];
	r.Ru.isEmpty() || (r.Ru.forEach(((e, s) => {
		o.push(r.Su(s, t, n).then(((e) => {
			if ((e || n) && r.isPrimaryClient) {
				let t = e ? !e.fromCache : n?.targetChanges.get(s.targetId)?.current;
				r.sharedClientState.updateQueryState(s.targetId, t ? "current" : "not-current");
			}
			if (e) {
				i.push(e);
				let t = Np.Is(s.targetId, e);
				a.push(t);
			}
		})));
	})), await Promise.all(o), r.Eu.J_(i), await async function(e, t) {
		let n = P(e);
		try {
			await n.persistence.runTransaction("notifyLocalViewChanges", "readwrite", ((e) => U.forEach(t, ((t) => U.forEach(t.Ps, ((r) => n.persistence.referenceDelegate.addReference(e, t.targetId, r))).next((() => U.forEach(t.Ts, ((r) => n.persistence.referenceDelegate.removeReference(e, t.targetId, r)))))))));
		} catch (e) {
			if (!al(e)) throw e;
			j(Ip, "Failed to update sequence numbers: " + e);
		}
		for (let e of t) {
			let t = e.targetId;
			if (!e.fromCache) {
				let e = n.Cs.get(t), r = e.snapshotVersion, i = e.withLastLimboFreeSnapshotVersion(r);
				n.Cs = n.Cs.insert(t, i);
			}
		}
	}(r.localStore, a));
}
async function Uh(e, t) {
	let n = P(e);
	if (!n.currentUser.isEqual(t)) {
		j(yh, "User change. New user:", t.toKey());
		let e = await Bp(n.localStore, t);
		n.currentUser = t, function(e, t) {
			e.pu.forEach(((e) => {
				e.forEach(((e) => {
					e.reject(new I(F.CANCELLED, t));
				}));
			})), e.pu.clear();
		}(n, "'waitForPendingWrites' promise is rejected due to a user change."), n.sharedClientState.handleUserChange(t, e.removedBatchIds, e.addedBatchIds), await Hh(n, e.Os);
	}
}
function Wh(e, t) {
	let n = P(e), r = n.mu.get(t);
	if (r && r.Iu) return J().add(r.key);
	{
		let e = J(), r = n.Au.get(t);
		if (!r) return e;
		for (let t of r) {
			let r = n.Ru.get(t);
			e = e.unionWith(r.view.su);
		}
		return e;
	}
}
function Gh(e) {
	let t = P(e);
	return t.remoteStore.remoteSyncer.applyRemoteEvent = Ah.bind(null, t), t.remoteStore.remoteSyncer.getRemoteKeysForTarget = Wh.bind(null, t), t.remoteStore.remoteSyncer.rejectListen = Mh.bind(null, t), t.Eu.J_ = uh.bind(null, t.eventManager), t.Eu.bu = dh.bind(null, t.eventManager), t;
}
function Kh(e) {
	let t = P(e);
	return t.remoteStore.remoteSyncer.applySuccessfulWrite = Nh.bind(null, t), t.remoteStore.remoteSyncer.rejectFailedWrite = Ph.bind(null, t), t;
}
var qh = class {
	constructor() {
		this.kind = "memory", this.synchronizeTabs = !1;
	}
	async initialize(e) {
		this.serializer = fm(e.databaseInfo.databaseId), this.sharedClientState = this.Fu(e), this.persistence = this.Mu(e), await this.persistence.start(), this.localStore = this.xu(e), this.gcScheduler = this.Ou(e, this.localStore), this.indexBackfillerScheduler = this.Nu(e, this.localStore);
	}
	Ou(e, t) {
		return null;
	}
	Nu(e, t) {
		return null;
	}
	xu(e) {
		return zp(this.persistence, new Fp(), e.initialUser, this.serializer);
	}
	Mu(e) {
		return new kp(jp.Ai, this.serializer);
	}
	Fu(e) {
		return new Zp();
	}
	async terminate() {
		this.gcScheduler?.stop(), this.indexBackfillerScheduler?.stop(), this.sharedClientState.shutdown(), await this.persistence.shutdown();
	}
};
qh.provider = { build: () => new qh() };
var Jh = class extends qh {
	constructor(e) {
		super(), this.cacheSizeBytes = e;
	}
	Ou(e, t) {
		N(this.persistence.referenceDelegate instanceof Mp, 46915);
		let n = this.persistence.referenceDelegate.garbageCollector;
		return new hp(n, e.asyncQueue, t);
	}
	Mu(e) {
		let t = this.cacheSizeBytes === void 0 ? lp.DEFAULT : lp.withCacheSize(this.cacheSizeBytes);
		return new kp(((e) => Mp.Ai(e, t)), this.serializer);
	}
}, Yh = class {
	async initialize(e, t) {
		this.localStore || (this.localStore = e.localStore, this.sharedClientState = e.sharedClientState, this.datastore = this.createDatastore(t), this.remoteStore = this.createRemoteStore(t), this.eventManager = this.createEventManager(t), this.syncEngine = this.createSyncEngine(t, !e.synchronizeTabs), this.sharedClientState.onlineStateHandler = (e) => jh(this.syncEngine, e, 1), this.remoteStore.remoteSyncer.handleCredentialChange = Uh.bind(null, this.syncEngine), await Zm(this.remoteStore, this.syncEngine.isPrimaryClient));
	}
	createEventManager(e) {
		return function() {
			return new oh();
		}();
	}
	createDatastore(e) {
		let t = fm(e.databaseInfo.databaseId), n = um(e.databaseInfo);
		return bm(e.authCredentials, e.appCheckCredentials, n, t);
	}
	createRemoteStore(e) {
		return function(e, t, n, r, i) {
			return new Cm(e, t, n, r, i);
		}(this.localStore, this.datastore, e.asyncQueue, ((e) => jh(this.syncEngine, e, 0)), function() {
			return em.v() ? new em() : new Qp();
		}());
	}
	createSyncEngine(e, t) {
		return function(e, t, n, r, i, a, o) {
			let s = new Sh(e, t, n, r, i, a);
			return o && (s.wu = !0), s;
		}(this.localStore, this.remoteStore, this.eventManager, this.sharedClientState, e.initialUser, e.maxConcurrentLimboResolutions, t);
	}
	async terminate() {
		await async function(e) {
			let t = P(e);
			j(Sm, "RemoteStore shutting down."), t.Va.add(5), await Tm(t), t.ma.shutdown(), t.fa.set("Unknown");
		}(this.remoteStore), this.datastore?.terminate(), this.eventManager?.terminate();
	}
};
Yh.provider = { build: () => new Yh() };
var Xh = class {
	constructor(e) {
		this.observer = e, this.muted = !1;
	}
	next(e) {
		this.muted || this.observer.next && this.Lu(this.observer.next, e);
	}
	error(e) {
		this.muted || (this.observer.error ? this.Lu(this.observer.error, e) : gc("Uncaught Error in snapshot listener:", e.toString()));
	}
	ku() {
		this.muted = !0;
	}
	Lu(e, t) {
		setTimeout((() => {
			this.muted || e(t);
		}), 0);
	}
}, Zh = "FirestoreClient", Qh = class {
	constructor(e, t, n, r, i) {
		this.authCredentials = e, this.appCheckCredentials = t, this.asyncQueue = n, this._databaseInfo = r, this.user = A.UNAUTHENTICATED, this.clientId = Ac.newId(), this.authCredentialListener = () => Promise.resolve(), this.appCheckCredentialListener = () => Promise.resolve(), this._uninitializedComponentsProvider = i, this.authCredentials.start(n, (async (e) => {
			j(Zh, "Received user=", e.uid), await this.authCredentialListener(e), this.user = e;
		})), this.appCheckCredentials.start(n, ((e) => (j(Zh, "Received new app check token=", e), this.appCheckCredentialListener(e, this.user))));
	}
	get configuration() {
		return {
			asyncQueue: this.asyncQueue,
			databaseInfo: this._databaseInfo,
			clientId: this.clientId,
			authCredentials: this.authCredentials,
			appCheckCredentials: this.appCheckCredentials,
			initialUser: this.user,
			maxConcurrentLimboResolutions: 100
		};
	}
	setCredentialChangeListener(e) {
		this.authCredentialListener = e;
	}
	setAppCheckTokenChangeListener(e) {
		this.appCheckCredentialListener = e;
	}
	terminate() {
		this.asyncQueue.enterRestrictedMode();
		let e = new bc();
		return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async () => {
			try {
				this._onlineComponents && await this._onlineComponents.terminate(), this._offlineComponents && await this._offlineComponents.terminate(), this.authCredentials.shutdown(), this.appCheckCredentials.shutdown(), e.resolve();
			} catch (t) {
				let n = th(t, "Failed to shutdown persistence");
				e.reject(n);
			}
		})), e.promise;
	}
};
async function $h(e, t) {
	e.asyncQueue.verifyOperationInProgress(), j(Zh, "Initializing OfflineComponentProvider");
	let n = e.configuration;
	await t.initialize(n);
	let r = n.initialUser;
	e.setCredentialChangeListener((async (e) => {
		r.isEqual(e) || (await Bp(t.localStore, e), r = e);
	})), t.persistence.setDatabaseDeletedListener((() => e.terminate())), e._offlineComponents = t;
}
async function eg(e, t) {
	e.asyncQueue.verifyOperationInProgress();
	let n = await tg(e);
	j(Zh, "Initializing OnlineComponentProvider"), await t.initialize(n, e.configuration), e.setCredentialChangeListener(((e) => Xm(t.remoteStore, e))), e.setAppCheckTokenChangeListener(((e, n) => Xm(t.remoteStore, n))), e._onlineComponents = t;
}
async function tg(e) {
	if (!e._offlineComponents) if (e._uninitializedComponentsProvider) {
		j(Zh, "Using user provided OfflineComponentProvider");
		try {
			await $h(e, e._uninitializedComponentsProvider._offline);
		} catch (t) {
			let n = t;
			if (!function(e) {
				return e.name === "FirebaseError" ? e.code === F.FAILED_PRECONDITION || e.code === F.UNIMPLEMENTED : !(typeof DOMException < "u" && e instanceof DOMException) || e.code === 22 || e.code === 20 || e.code === 11;
			}(n)) throw n;
			_c("Error using user provided cache. Falling back to memory cache: " + n), await $h(e, new qh());
		}
	} else j(Zh, "Using default OfflineComponentProvider"), await $h(e, new Jh(void 0));
	return e._offlineComponents;
}
async function ng(e) {
	return e._onlineComponents || (e._uninitializedComponentsProvider ? (j(Zh, "Using user provided OnlineComponentProvider"), await eg(e, e._uninitializedComponentsProvider._online)) : (j(Zh, "Using default OnlineComponentProvider"), await eg(e, new Yh()))), e._onlineComponents;
}
function rg(e) {
	return ng(e).then(((e) => e.syncEngine));
}
async function ig(e) {
	let t = await ng(e), n = t.eventManager;
	return n.onListen = Ch.bind(null, t.syncEngine), n.onUnlisten = Dh.bind(null, t.syncEngine), n.onFirstRemoteStoreListen = wh.bind(null, t.syncEngine), n.onLastRemoteStoreUnlisten = Oh.bind(null, t.syncEngine), n;
}
function ag(e, t, n, r) {
	let i = new Xh(r), a = new hh(t, i, n);
	return e.asyncQueue.enqueueAndForget((async () => ch(await ig(e), a))), () => {
		i.ku(), e.asyncQueue.enqueueAndForget((async () => lh(await ig(e), a)));
	};
}
function og(e, t, n = {}) {
	let r = new bc();
	return e.asyncQueue.enqueueAndForget((async () => function(e, t, n, r, i) {
		let a = new Xh({
			next: (s) => {
				a.ku(), t.enqueueAndForget((() => lh(e, o)));
				let c = s.docs.has(n);
				!c && s.fromCache ? i.reject(new I(F.UNAVAILABLE, "Failed to get document because the client is offline.")) : c && s.fromCache && r && r.source === "server" ? i.reject(new I(F.UNAVAILABLE, "Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to \"server\" to retrieve the cached document.)")) : i.resolve(s);
			},
			error: (e) => i.reject(e)
		}), o = new hh(Ru(n.path), a, {
			includeMetadataChanges: !0,
			$a: !0
		});
		return ch(e, o);
	}(await ig(e), e.asyncQueue, t, n, r))), r.promise;
}
function sg(e, t) {
	let n = new bc();
	return e.asyncQueue.enqueueAndForget((async () => kh(await rg(e), t, n))), n.promise;
}
function cg(e) {
	let t = {};
	return e.timeoutSeconds !== void 0 && (t.timeoutSeconds = e.timeoutSeconds), t;
}
var lg = "ComponentProvider", ug = /* @__PURE__ */ new Map();
function dg(e, t, n, r, i) {
	return new Pl(e, t, n, i.host, i.ssl, i.experimentalForceLongPolling, i.experimentalAutoDetectLongPolling, cg(i.experimentalLongPollingOptions), i.useFetchStreams, i.isUsingEmulator, r);
}
var fg = "firestore.googleapis.com", pg = !0, mg = class {
	constructor(e) {
		if (e.host === void 0) {
			if (e.ssl !== void 0) throw new I(F.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
			this.host = fg, this.ssl = pg;
		} else this.host = e.host, this.ssl = e.ssl ?? pg;
		if (this.isUsingEmulator = e.emulatorOptions !== void 0, this.credentials = e.credentials, this.ignoreUndefinedProperties = !!e.ignoreUndefinedProperties, this.localCache = e.localCache, e.cacheSizeBytes === void 0) this.cacheSizeBytes = cp;
		else {
			if (e.cacheSizeBytes !== -1 && e.cacheSizeBytes < fp) throw new I(F.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
			this.cacheSizeBytes = e.cacheSizeBytes;
		}
		Vc("experimentalForceLongPolling", e.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", e.experimentalAutoDetectLongPolling), this.experimentalForceLongPolling = !!e.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = !1 : e.experimentalAutoDetectLongPolling === void 0 ? this.experimentalAutoDetectLongPolling = !0 : this.experimentalAutoDetectLongPolling = !!e.experimentalAutoDetectLongPolling, this.experimentalLongPollingOptions = cg(e.experimentalLongPollingOptions ?? {}), function(e) {
			if (e.timeoutSeconds !== void 0) {
				if (isNaN(e.timeoutSeconds)) throw new I(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);
				if (e.timeoutSeconds < 5) throw new I(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);
				if (e.timeoutSeconds > 30) throw new I(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`);
			}
		}(this.experimentalLongPollingOptions), this.useFetchStreams = !!e.useFetchStreams;
	}
	isEqual(e) {
		return this.host === e.host && this.ssl === e.ssl && this.credentials === e.credentials && this.cacheSizeBytes === e.cacheSizeBytes && this.experimentalForceLongPolling === e.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === e.experimentalAutoDetectLongPolling && function(e, t) {
			return e.timeoutSeconds === t.timeoutSeconds;
		}(this.experimentalLongPollingOptions, e.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === e.ignoreUndefinedProperties && this.useFetchStreams === e.useFetchStreams;
	}
}, hg = class {
	constructor(e, t, n, r) {
		this._authCredentials = e, this._appCheckCredentials = t, this._databaseId = n, this._app = r, this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new mg({}), this._settingsFrozen = !1, this._emulatorOptions = {}, this._terminateTask = "notTerminated";
	}
	get app() {
		if (!this._app) throw new I(F.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
		return this._app;
	}
	get _initialized() {
		return this._settingsFrozen;
	}
	get _terminated() {
		return this._terminateTask !== "notTerminated";
	}
	_setSettings(e) {
		if (this._settingsFrozen) throw new I(F.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
		this._settings = new mg(e), this._emulatorOptions = e.emulatorOptions || {}, e.credentials !== void 0 && (this._authCredentials = function(e) {
			if (!e) return new Sc();
			switch (e.type) {
				case "firstParty": return new Ec(e.sessionIndex || "0", e.iamToken || null, e.authTokenFactory || null);
				case "provider": return e.client;
				default: throw new I(F.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
			}
		}(e.credentials));
	}
	_getSettings() {
		return this._settings;
	}
	_getEmulatorOptions() {
		return this._emulatorOptions;
	}
	_freezeSettings() {
		return this._settingsFrozen = !0, this._settings;
	}
	_delete() {
		return this._terminateTask === "notTerminated" && (this._terminateTask = this._terminate()), this._terminateTask;
	}
	async _restart() {
		this._terminateTask === "notTerminated" ? await this._terminate() : this._terminateTask = "notTerminated";
	}
	toJSON() {
		return {
			app: this._app,
			databaseId: this._databaseId,
			settings: this._settings
		};
	}
	_terminate() {
		return function(e) {
			let t = ug.get(e);
			t && (j(lg, "Removing Datastore"), ug.delete(e), t.terminate());
		}(this), Promise.resolve();
	}
};
function gg(e, t, n, r = {}) {
	e = Gc(e, hg);
	let i = Te(t), a = e._getSettings(), o = {
		...a,
		emulatorOptions: e._getEmulatorOptions()
	}, s = `${t}:${n}`;
	i && Ee(`https://${s}`), a.host !== fg && a.host !== s && _c("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");
	let c = {
		...a,
		host: s,
		ssl: i,
		emulatorOptions: r
	};
	if (!ge(c, o) && (e._setSettings(c), r.mockUserToken)) {
		let t, n;
		if (typeof r.mockUserToken == "string") t = r.mockUserToken, n = A.MOCK_USER;
		else {
			t = te(r.mockUserToken, e._app?.options.projectId);
			let i = r.mockUserToken.sub || r.mockUserToken.user_id;
			if (!i) throw new I(F.INVALID_ARGUMENT, "mockUserToken must contain 'sub' or 'user_id' field!");
			n = new A(i);
		}
		e._authCredentials = new Cc(new xc(t, n));
	}
}
var _g = class e {
	constructor(e, t, n) {
		this.converter = t, this._query = n, this.type = "query", this.firestore = e;
	}
	withConverter(t) {
		return new e(this.firestore, t, this._query);
	}
}, vg = class e {
	constructor(e, t, n) {
		this.converter = t, this._key = n, this.type = "document", this.firestore = e;
	}
	get _path() {
		return this._key.path;
	}
	get id() {
		return this._key.path.lastSegment();
	}
	get path() {
		return this._key.path.canonicalString();
	}
	get parent() {
		return new yg(this.firestore, this.converter, this._key.path.popLast());
	}
	withConverter(t) {
		return new e(this.firestore, t, this._key);
	}
	toJSON() {
		return {
			type: e._jsonSchemaVersion,
			referencePath: this._key.toString()
		};
	}
	static fromJSON(t, n, r) {
		if (Kc(n, e._jsonSchema)) return new e(t, r || null, new z(R.fromString(n.referencePath)));
	}
};
vg._jsonSchemaVersion = "firestore/documentReference/1.0", vg._jsonSchema = {
	type: B("string", vg._jsonSchemaVersion),
	referencePath: B("string")
};
var yg = class e extends _g {
	constructor(e, t, n) {
		super(e, t, Ru(n)), this._path = n, this.type = "collection";
	}
	get id() {
		return this._query.path.lastSegment();
	}
	get path() {
		return this._query.path.canonicalString();
	}
	get parent() {
		let e = this._path.popLast();
		return e.isEmpty() ? null : new vg(this.firestore, null, new z(e));
	}
	withConverter(t) {
		return new e(this.firestore, t, this._path);
	}
};
function bg(e, t, ...n) {
	if (e = y(e), arguments.length === 1 && (t = Ac.newId()), Bc("doc", "path", t), e instanceof hg) {
		let r = R.fromString(t, ...n);
		return Hc(r), new vg(e, null, new z(r));
	}
	{
		if (!(e instanceof vg || e instanceof yg)) throw new I(F.INVALID_ARGUMENT, "Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
		let r = e._path.child(R.fromString(t, ...n));
		return Hc(r), new vg(e.firestore, e instanceof yg ? e.converter : null, new z(r));
	}
}
var xg = "AsyncQueue", Sg = class {
	constructor(e = Promise.resolve()) {
		this.nc = [], this.rc = !1, this.sc = [], this.oc = null, this._c = !1, this.ac = !1, this.uc = [], this.F_ = new pm(this, "async_queue_retry"), this.cc = () => {
			let e = dm();
			e && j(xg, "Visibility state changed to " + e.visibilityState), this.F_.y_();
		}, this.lc = e;
		let t = dm();
		t && typeof t.addEventListener == "function" && t.addEventListener("visibilitychange", this.cc);
	}
	get isShuttingDown() {
		return this.rc;
	}
	enqueueAndForget(e) {
		this.enqueue(e);
	}
	enqueueAndForgetEvenWhileRestricted(e) {
		this.hc(), this.Pc(e);
	}
	enterRestrictedMode(e) {
		if (!this.rc) {
			this.rc = !0, this.ac = e || !1;
			let t = dm();
			t && typeof t.removeEventListener == "function" && t.removeEventListener("visibilitychange", this.cc);
		}
	}
	enqueue(e) {
		if (this.hc(), this.rc) return new Promise((() => {}));
		let t = new bc();
		return this.Pc((() => this.rc && this.ac ? Promise.resolve() : (e().then(t.resolve, t.reject), t.promise))).then((() => t.promise));
	}
	enqueueRetryable(e) {
		this.enqueueAndForget((() => (this.nc.push(e), this.Tc())));
	}
	async Tc() {
		if (this.nc.length !== 0) {
			try {
				await this.nc[0](), this.nc.shift(), this.F_.reset();
			} catch (e) {
				if (!al(e)) throw e;
				j(xg, "Operation failed with retryable error: " + e);
			}
			this.nc.length > 0 && this.F_.g_((() => this.Tc()));
		}
	}
	Pc(e) {
		let t = this.lc.then((() => (this._c = !0, e().catch(((e) => {
			throw this.oc = e, this._c = !1, gc("INTERNAL UNHANDLED ERROR: ", Cg(e)), e;
		})).then(((e) => (this._c = !1, e))))));
		return this.lc = t, t;
	}
	enqueueAfterDelay(e, t, n) {
		this.hc(), this.uc.indexOf(e) > -1 && (t = 0);
		let r = eh.createAndSchedule(this, e, t, n, ((e) => this.Ic(e)));
		return this.sc.push(r), r;
	}
	hc() {
		this.oc && M(47125, { Ec: Cg(this.oc) });
	}
	verifyOperationInProgress() {}
	async Rc() {
		let e;
		do
			e = this.lc, await e;
		while (e !== this.lc);
	}
	Ac(e) {
		for (let t of this.sc) if (t.timerId === e) return !0;
		return !1;
	}
	Vc(e) {
		return this.Rc().then((() => {
			this.sc.sort(((e, t) => e.targetTimeMs - t.targetTimeMs));
			for (let t of this.sc) if (t.skipDelay(), e !== "all" && t.timerId === e) break;
			return this.Rc();
		}));
	}
	dc(e) {
		this.uc.push(e);
	}
	Ic(e) {
		let t = this.sc.indexOf(e);
		this.sc.splice(t, 1);
	}
};
function Cg(e) {
	let t = e.message || "";
	return e.stack && (t = e.stack.includes(e.message) ? e.stack : e.message + "\n" + e.stack), t;
}
var wg = class extends hg {
	constructor(e, t, n, r) {
		super(e, t, n, r), this.type = "firestore", this._queue = new Sg(), this._persistenceKey = r?.name || "[DEFAULT]";
	}
	async _terminate() {
		if (this._firestoreClient) {
			let e = this._firestoreClient.terminate();
			this._queue = new Sg(e), this._firestoreClient = void 0, await e;
		}
	}
};
function Tg(e, t, n) {
	n || (n = Fl);
	let r = Wt(e, "firestore");
	if (r.isInitialized(n)) {
		let e = r.getImmediate({ identifier: n });
		if (ge(r.getOptions(n), t)) return e;
		throw new I(F.FAILED_PRECONDITION, "initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.");
	}
	if (t.cacheSizeBytes !== void 0 && t.localCache !== void 0) throw new I(F.INVALID_ARGUMENT, "cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");
	if (t.cacheSizeBytes !== void 0 && t.cacheSizeBytes !== -1 && t.cacheSizeBytes < fp) throw new I(F.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
	return t.host && Te(t.host) && Ee(t.host), r.initialize({
		options: t,
		instanceIdentifier: n
	});
}
function Eg(e, t) {
	let n = typeof e == "object" ? e : Yt(), r = typeof e == "string" ? e : t || Fl, i = Wt(n, "firestore").getImmediate({ identifier: r });
	if (!i._initialized) {
		let e = m("firestore");
		e && gg(i, ...e);
	}
	return i;
}
function Dg(e) {
	if (e._terminated) throw new I(F.FAILED_PRECONDITION, "The client has already been terminated.");
	return e._firestoreClient || Og(e), e._firestoreClient;
}
function Og(e) {
	let t = e._freezeSettings(), n = dg(e._databaseId, e._app?.options.appId || "", e._persistenceKey, e._app?.options.apiKey, t);
	e._componentsProvider || t.localCache?._offlineComponentProvider && t.localCache?._onlineComponentProvider && (e._componentsProvider = {
		_offline: t.localCache._offlineComponentProvider,
		_online: t.localCache._onlineComponentProvider
	}), e._firestoreClient = new Qh(e._authCredentials, e._appCheckCredentials, e._queue, n, e._componentsProvider && function(e) {
		let t = e?._online.build();
		return {
			_offline: e?._offline.build(t),
			_online: t
		};
	}(e._componentsProvider));
}
var kg = class e {
	constructor(e) {
		this._byteString = e;
	}
	static fromBase64String(t) {
		try {
			return new e(Cl.fromBase64String(t));
		} catch (e) {
			throw new I(F.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + e);
		}
	}
	static fromUint8Array(t) {
		return new e(Cl.fromUint8Array(t));
	}
	toBase64() {
		return this._byteString.toBase64();
	}
	toUint8Array() {
		return this._byteString.toUint8Array();
	}
	toString() {
		return "Bytes(base64: " + this.toBase64() + ")";
	}
	isEqual(e) {
		return this._byteString.isEqual(e._byteString);
	}
	toJSON() {
		return {
			type: e._jsonSchemaVersion,
			bytes: this.toBase64()
		};
	}
	static fromJSON(t) {
		if (Kc(t, e._jsonSchema)) return e.fromBase64String(t.bytes);
	}
};
kg._jsonSchemaVersion = "firestore/bytes/1.0", kg._jsonSchema = {
	type: B("string", kg._jsonSchemaVersion),
	bytes: B("string")
};
var Ag = class {
	constructor(...e) {
		for (let t = 0; t < e.length; ++t) if (e[t].length === 0) throw new I(F.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
		this._internalPath = new zc(e);
	}
	isEqual(e) {
		return this._internalPath.isEqual(e._internalPath);
	}
}, jg = class {
	constructor(e) {
		this._methodName = e;
	}
}, Mg = class e {
	constructor(e, t) {
		if (!isFinite(e) || e < -90 || e > 90) throw new I(F.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + e);
		if (!isFinite(t) || t < -180 || t > 180) throw new I(F.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + t);
		this._lat = e, this._long = t;
	}
	get latitude() {
		return this._lat;
	}
	get longitude() {
		return this._long;
	}
	isEqual(e) {
		return this._lat === e._lat && this._long === e._long;
	}
	_compareTo(e) {
		return L(this._lat, e._lat) || L(this._long, e._long);
	}
	toJSON() {
		return {
			latitude: this._lat,
			longitude: this._long,
			type: e._jsonSchemaVersion
		};
	}
	static fromJSON(t) {
		if (Kc(t, e._jsonSchema)) return new e(t.latitude, t.longitude);
	}
};
Mg._jsonSchemaVersion = "firestore/geoPoint/1.0", Mg._jsonSchema = {
	type: B("string", Mg._jsonSchemaVersion),
	latitude: B("number"),
	longitude: B("number")
};
var Ng = class e {
	constructor(e) {
		this._values = (e || []).map(((e) => e));
	}
	toArray() {
		return this._values.map(((e) => e));
	}
	isEqual(e) {
		return function(e, t) {
			if (e.length !== t.length) return !1;
			for (let n = 0; n < e.length; ++n) if (e[n] !== t[n]) return !1;
			return !0;
		}(this._values, e._values);
	}
	toJSON() {
		return {
			type: e._jsonSchemaVersion,
			vectorValues: this._values
		};
	}
	static fromJSON(t) {
		if (Kc(t, e._jsonSchema)) {
			if (Array.isArray(t.vectorValues) && t.vectorValues.every(((e) => typeof e == "number"))) return new e(t.vectorValues);
			throw new I(F.INVALID_ARGUMENT, "Expected 'vectorValues' field to be a number array");
		}
	}
};
Ng._jsonSchemaVersion = "firestore/vectorValue/1.0", Ng._jsonSchema = {
	type: B("string", Ng._jsonSchemaVersion),
	vectorValues: B("object")
};
var Pg = /^__.*__$/, Fg = class {
	constructor(e, t, n) {
		this.data = e, this.fieldMask = t, this.fieldTransforms = n;
	}
	toMutation(e, t) {
		return this.fieldMask === null ? new Hd(e, this.data, t, this.fieldTransforms) : new Ud(e, this.data, this.fieldMask, t, this.fieldTransforms);
	}
}, Ig = class {
	constructor(e, t, n) {
		this.data = e, this.fieldMask = t, this.fieldTransforms = n;
	}
	toMutation(e, t) {
		return new Ud(e, this.data, this.fieldMask, t, this.fieldTransforms);
	}
};
function Lg(e) {
	switch (e) {
		case 0:
		case 2:
		case 1: return !0;
		case 3:
		case 4: return !1;
		default: throw M(40011, { dataSource: e });
	}
}
var Rg = class e {
	constructor(e, t, n, r, i, a) {
		this.settings = e, this.databaseId = t, this.serializer = n, this.ignoreUndefinedProperties = r, i === void 0 && this.mc(), this.fieldTransforms = i || [], this.fieldMask = a || [];
	}
	get path() {
		return this.settings.path;
	}
	get dataSource() {
		return this.settings.dataSource;
	}
	i(t) {
		return new e({
			...this.settings,
			...t
		}, this.databaseId, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.fieldMask);
	}
	gc(e) {
		let t = this.path?.child(e), n = this.i({
			path: t,
			arrayElement: !1
		});
		return n.yc(e), n;
	}
	wc(e) {
		let t = this.path?.child(e), n = this.i({
			path: t,
			arrayElement: !1
		});
		return n.mc(), n;
	}
	Sc(e) {
		return this.i({
			path: void 0,
			arrayElement: !0
		});
	}
	bc(e) {
		return $g(e, this.settings.methodName, this.settings.hasConverter || !1, this.path, this.settings.targetDoc);
	}
	contains(e) {
		return this.fieldMask.find(((t) => e.isPrefixOf(t))) !== void 0 || this.fieldTransforms.find(((t) => e.isPrefixOf(t.field))) !== void 0;
	}
	mc() {
		if (this.path) for (let e = 0; e < this.path.length; e++) this.yc(this.path.get(e));
	}
	yc(e) {
		if (e.length === 0) throw this.bc("Document fields must not be empty");
		if (Lg(this.dataSource) && Pg.test(e)) throw this.bc("Document fields cannot begin and end with \"__\"");
	}
}, zg = class {
	constructor(e, t, n) {
		this.databaseId = e, this.ignoreUndefinedProperties = t, this.serializer = n || fm(e);
	}
	V(e, t, n, r = !1) {
		return new Rg({
			dataSource: e,
			methodName: t,
			targetDoc: n,
			path: zc.emptyPath(),
			arrayElement: !1,
			hasConverter: r
		}, this.databaseId, this.serializer, this.ignoreUndefinedProperties);
	}
};
function Bg(e) {
	let t = e._freezeSettings(), n = fm(e._databaseId);
	return new zg(e._databaseId, !!t.ignoreUndefinedProperties, n);
}
function Vg(e, t, n, r, i, a = {}) {
	let o = e.V(a.merge || a.mergeFields ? 2 : 0, t, n, i);
	Yg("Data must be an object, but it was:", o, r);
	let s = qg(r, o), c, l;
	if (a.merge) c = new xl(o.fieldMask), l = o.fieldTransforms;
	else if (a.mergeFields) {
		let e = [];
		for (let r of a.mergeFields) {
			let i = Xg(t, r, n);
			if (!o.contains(i)) throw new I(F.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
			e_(e, i) || e.push(i);
		}
		c = new xl(e), l = o.fieldTransforms.filter(((e) => c.covers(e.field)));
	} else c = null, l = o.fieldTransforms;
	return new Fg(new su(s), c, l);
}
var Hg = class e extends jg {
	_toFieldTransform(e) {
		if (e.dataSource !== 2) throw e.dataSource === 1 ? e.bc(`${this._methodName}() can only appear at the top level of your update data`) : e.bc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);
		return e.fieldMask.push(e.path), null;
	}
	isEqual(t) {
		return t instanceof e;
	}
}, Ug = class e extends jg {
	_toFieldTransform(e) {
		return new jd(e.path, new yd());
	}
	isEqual(t) {
		return t instanceof e;
	}
};
function Wg(e, t, n, r) {
	let i = e.V(1, t, n);
	Yg("Data must be an object, but it was:", i, r);
	let a = [], o = su.empty();
	return gl(r, ((e, r) => {
		let s = Qg(t, e, n);
		r = y(r);
		let c = i.wc(s);
		if (r instanceof Hg) a.push(s);
		else {
			let e = Kg(r, c);
			e != null && (a.push(s), o.set(s, e));
		}
	})), new Ig(o, new xl(a), i.fieldTransforms);
}
function Gg(e, t, n, r, i, a) {
	let o = e.V(1, t, n), s = [Xg(t, r, n)], c = [i];
	if (a.length % 2 != 0) throw new I(F.INVALID_ARGUMENT, `Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);
	for (let e = 0; e < a.length; e += 2) s.push(Xg(t, a[e])), c.push(a[e + 1]);
	let l = [], u = su.empty();
	for (let e = s.length - 1; e >= 0; --e) if (!e_(l, s[e])) {
		let t = s[e], n = c[e];
		n = y(n);
		let r = o.wc(t);
		if (n instanceof Hg) l.push(t);
		else {
			let e = Kg(n, r);
			e != null && (l.push(t), u.set(t, e));
		}
	}
	return new Ig(u, new xl(l), o.fieldTransforms);
}
function Kg(e, t) {
	if (Jg(e = y(e))) return Yg("Unsupported field value:", t, e), qg(e, t);
	if (e instanceof jg) return function(e, t) {
		if (!Lg(t.dataSource)) throw t.bc(`${e._methodName}() can only be used with update() and set()`);
		if (!t.path) throw t.bc(`${e._methodName}() is not currently supported inside arrays`);
		let n = e._toFieldTransform(t);
		n && t.fieldTransforms.push(n);
	}(e, t), null;
	if (e === void 0 && t.ignoreUndefinedProperties) return null;
	if (t.path && t.fieldMask.push(t.path), e instanceof Array) {
		if (t.settings.arrayElement && t.dataSource !== 4) throw t.bc("Nested arrays are not supported");
		return function(e, t) {
			let n = [], r = 0;
			for (let i of e) {
				let e = Kg(i, t.Sc(r));
				e ?? (e = { nullValue: "NULL_VALUE" }), n.push(e), r++;
			}
			return { arrayValue: { values: n } };
		}(e, t);
	}
	return function(e, t) {
		if ((e = y(e)) === null) return { nullValue: "NULL_VALUE" };
		if (typeof e == "number") return md(t.serializer, e);
		if (typeof e == "boolean") return { booleanValue: e };
		if (typeof e == "string") return { stringValue: e };
		if (e instanceof Date) {
			let n = V.fromDate(e);
			return { timestampValue: wf(t.serializer, n) };
		}
		if (e instanceof V) {
			let n = new V(e.seconds, 1e3 * Math.floor(e.nanoseconds / 1e3));
			return { timestampValue: wf(t.serializer, n) };
		}
		if (e instanceof Mg) return { geoPointValue: {
			latitude: e.latitude,
			longitude: e.longitude
		} };
		if (e instanceof kg) return { bytesValue: Tf(t.serializer, e._byteString) };
		if (e instanceof vg) {
			let n = t.databaseId, r = e.firestore._databaseId;
			if (!r.isEqual(n)) throw t.bc(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);
			return { referenceValue: Of(e.firestore._databaseId || t.databaseId, e._key.path) };
		}
		if (e instanceof Ng) return function(e, t) {
			let n = e instanceof Ng ? e.toArray() : e;
			return { mapValue: { fields: {
				[Rl]: { stringValue: Vl },
				[Hl]: { arrayValue: { values: n.map(((e) => {
					if (typeof e != "number") throw t.bc("VectorValues must only contain numeric values.");
					return fd(t.serializer, e);
				})) } }
			} } };
		}(e, t);
		if (ep(e)) return e._toProto(t.serializer);
		throw t.bc(`Unsupported field value: ${Wc(e)}`);
	}(e, t);
}
function qg(e, t) {
	let n = {};
	return _l(e) ? t.path && t.path.length > 0 && t.fieldMask.push(t.path) : gl(e, ((e, r) => {
		let i = Kg(r, t.gc(e));
		i != null && (n[e] = i);
	})), { mapValue: { fields: n } };
}
function Jg(e) {
	return !(typeof e != "object" || !e || e instanceof Array || e instanceof Date || e instanceof V || e instanceof Mg || e instanceof kg || e instanceof vg || e instanceof jg || e instanceof Ng || ep(e));
}
function Yg(e, t, n) {
	if (!Jg(n) || !Uc(n)) {
		let r = Wc(n);
		throw r === "an object" ? t.bc(e + " a custom object") : t.bc(e + " " + r);
	}
}
function Xg(e, t, n) {
	if ((t = y(t)) instanceof Ag) return t._internalPath;
	if (typeof t == "string") return Qg(e, t);
	throw $g("Field path arguments must be of type string or ", e, !1, void 0, n);
}
var Zg = /* @__PURE__ */ RegExp("[~\\*/\\[\\]]");
function Qg(e, t, n) {
	if (t.search(Zg) >= 0) throw $g(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`, e, !1, void 0, n);
	try {
		return new Ag(...t.split("."))._internalPath;
	} catch {
		throw $g(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`, e, !1, void 0, n);
	}
}
function $g(e, t, n, r, i) {
	let a = r && !r.isEmpty(), o = i !== void 0, s = `Function ${t}() called with invalid data`;
	n && (s += " (via `toFirestore()`)"), s += ". ";
	let c = "";
	return (a || o) && (c += " (found", a && (c += ` in field ${r}`), o && (c += ` in document ${i}`), c += ")"), new I(F.INVALID_ARGUMENT, s + e + c);
}
function e_(e, t) {
	return e.some(((e) => e.isEqual(t)));
}
var t_ = class {
	convertValue(e, t = "none") {
		switch (Ul(e)) {
			case 0: return null;
			case 1: return e.booleanValue;
			case 2: return K(e.integerValue || e.doubleValue);
			case 3: return this.convertTimestamp(e.timestampValue);
			case 4: return this.convertServerTimestamp(e, t);
			case 5: return e.stringValue;
			case 6: return this.convertBytes(El(e.bytesValue));
			case 7: return this.convertReference(e.referenceValue);
			case 8: return this.convertGeoPoint(e.geoPointValue);
			case 9: return this.convertArray(e.arrayValue, t);
			case 11: return this.convertObject(e.mapValue, t);
			case 10: return this.convertVectorValue(e.mapValue);
			default: throw M(62114, { value: e });
		}
	}
	convertObject(e, t) {
		return this.convertObjectMap(e.fields, t);
	}
	convertObjectMap(e, t = "none") {
		let n = {};
		return gl(e, ((e, r) => {
			n[e] = this.convertValue(r, t);
		})), n;
	}
	convertVectorValue(e) {
		let t = e.fields?.[Hl].arrayValue?.values?.map(((e) => K(e.doubleValue)));
		return new Ng(t);
	}
	convertGeoPoint(e) {
		return new Mg(K(e.latitude), K(e.longitude));
	}
	convertArray(e, t) {
		return (e.values || []).map(((e) => this.convertValue(e, t)));
	}
	convertServerTimestamp(e, t) {
		switch (t) {
			case "previous":
				let n = Ml(e);
				return n == null ? null : this.convertValue(n, t);
			case "estimate": return this.convertTimestamp(Nl(e));
			default: return null;
		}
	}
	convertTimestamp(e) {
		let t = Tl(e);
		return new V(t.seconds, t.nanos);
	}
	convertDocumentKey(e, t) {
		let n = R.fromString(e);
		N($f(n), 9688, { name: e });
		let r = new Il(n.get(1), n.get(3)), i = new z(n.popFirst(5));
		return r.isEqual(t) || gc(`Document ${i} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`), i;
	}
}, n_ = class extends t_ {
	constructor(e) {
		super(), this.firestore = e;
	}
	convertBytes(e) {
		return new kg(e);
	}
	convertReference(e) {
		let t = this.convertDocumentKey(e, this.firestore._databaseId);
		return new vg(this.firestore, null, t);
	}
};
function r_() {
	return new Ug("serverTimestamp");
}
//#endregion
//#region node_modules/@firebase/firestore/dist/index.esm.js
var i_ = "@firebase/firestore", a_ = "4.15.0";
function o_(e) {
	return function(e, t) {
		if (typeof e != "object" || !e) return !1;
		let n = e;
		for (let e of t) if (e in n && typeof n[e] == "function") return !0;
		return !1;
	}(e, [
		"next",
		"error",
		"complete"
	]);
}
var s_ = class {
	constructor(e, t, n, r, i) {
		this._firestore = e, this._userDataWriter = t, this._key = n, this._document = r, this._converter = i;
	}
	get id() {
		return this._key.path.lastSegment();
	}
	get ref() {
		return new vg(this._firestore, this._converter, this._key);
	}
	exists() {
		return this._document !== null;
	}
	data() {
		if (this._document) {
			if (this._converter) {
				let e = new c_(this._firestore, this._userDataWriter, this._key, this._document, null);
				return this._converter.fromFirestore(e);
			}
			return this._userDataWriter.convertValue(this._document.data.value);
		}
	}
	_fieldsProto() {
		return this._document?.data.clone().value.mapValue.fields ?? void 0;
	}
	get(e) {
		if (this._document) {
			let t = this._document.data.field(Xg("DocumentSnapshot.get", e));
			if (t !== null) return this._userDataWriter.convertValue(t);
		}
	}
}, c_ = class extends s_ {
	data() {
		return super.data();
	}
};
function l_(e) {
	if (e.limitType === "L" && e.explicitOrderBy.length === 0) throw new I(F.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}
function u_(e, t, n) {
	let r;
	return r = e ? n && (n.merge || n.mergeFields) ? e.toFirestore(t, n) : e.toFirestore(t) : t, r;
}
var d_ = class {
	constructor(e) {
		this.kind = "memory", this._onlineComponentProvider = Yh.provider, this._offlineComponentProvider = e?.garbageCollector ? e.garbageCollector._offlineComponentProvider : { build: () => new Jh(void 0) };
	}
	toJSON() {
		return { kind: this.kind };
	}
};
function f_(e) {
	return new d_(e);
}
var p_ = class {
	constructor(e, t) {
		this.hasPendingWrites = e, this.fromCache = t;
	}
	isEqual(e) {
		return this.hasPendingWrites === e.hasPendingWrites && this.fromCache === e.fromCache;
	}
}, m_ = class e extends s_ {
	constructor(e, t, n, r, i, a) {
		super(e, t, n, r, a), this._firestore = e, this._firestoreImpl = e, this.metadata = i;
	}
	exists() {
		return super.exists();
	}
	data(e = {}) {
		if (this._document) {
			if (this._converter) {
				let t = new h_(this._firestore, this._userDataWriter, this._key, this._document, this.metadata, null);
				return this._converter.fromFirestore(t, e);
			}
			return this._userDataWriter.convertValue(this._document.data.value, e.serverTimestamps);
		}
	}
	get(e, t = {}) {
		if (this._document) {
			let n = this._document.data.field(Xg("DocumentSnapshot.get", e));
			if (n !== null) return this._userDataWriter.convertValue(n, t.serverTimestamps);
		}
	}
	toJSON() {
		if (this.metadata.hasPendingWrites) throw new I(F.FAILED_PRECONDITION, "DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");
		let t = this._document, n = {};
		return n.type = e._jsonSchemaVersion, n.bundle = "", n.bundleSource = "DocumentSnapshot", n.bundleName = this._key.toString(), !t || !t.isValidDocument() || !t.isFoundDocument() ? n : (this._userDataWriter.convertObjectMap(t.data.value.mapValue.fields, "previous"), n.bundle = (this._firestore, this.ref.path, "NOT SUPPORTED"), n);
	}
};
m_._jsonSchemaVersion = "firestore/documentSnapshot/1.0", m_._jsonSchema = {
	type: B("string", m_._jsonSchemaVersion),
	bundleSource: B("string", "DocumentSnapshot"),
	bundleName: B("string"),
	bundle: B("string")
};
var h_ = class extends m_ {
	data(e = {}) {
		return super.data(e);
	}
}, g_ = class e {
	constructor(e, t, n, r) {
		this._firestore = e, this._userDataWriter = t, this._snapshot = r, this.metadata = new p_(r.hasPendingWrites, r.fromCache), this.query = n;
	}
	get docs() {
		let e = [];
		return this.forEach(((t) => e.push(t))), e;
	}
	get size() {
		return this._snapshot.docs.size;
	}
	get empty() {
		return this.size === 0;
	}
	forEach(e, t) {
		this._snapshot.docs.forEach(((n) => {
			e.call(t, new h_(this._firestore, this._userDataWriter, n.key, n, new p_(this._snapshot.mutatedKeys.has(n.key), this._snapshot.fromCache), this.query.converter));
		}));
	}
	docChanges(e = {}) {
		let t = !!e.includeMetadataChanges;
		if (t && this._snapshot.excludesMetadataChanges) throw new I(F.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
		return this._cachedChanges && this._cachedChangesIncludeMetadataChanges === t || (this._cachedChanges = function(e, t) {
			if (e._snapshot.oldDocs.isEmpty()) {
				let t = 0;
				return e._snapshot.docChanges.map(((n) => {
					let r = new h_(e._firestore, e._userDataWriter, n.doc.key, n.doc, new p_(e._snapshot.mutatedKeys.has(n.doc.key), e._snapshot.fromCache), e.query.converter);
					return n.doc, {
						type: "added",
						doc: r,
						oldIndex: -1,
						newIndex: t++
					};
				}));
			}
			{
				let n = e._snapshot.oldDocs;
				return e._snapshot.docChanges.filter(((e) => t || e.type !== 3)).map(((t) => {
					let r = new h_(e._firestore, e._userDataWriter, t.doc.key, t.doc, new p_(e._snapshot.mutatedKeys.has(t.doc.key), e._snapshot.fromCache), e.query.converter), i = -1, a = -1;
					return t.type !== 0 && (i = n.indexOf(t.doc.key), n = n.delete(t.doc.key)), t.type !== 1 && (n = n.add(t.doc), a = n.indexOf(t.doc.key)), {
						type: __(t.type),
						doc: r,
						oldIndex: i,
						newIndex: a
					};
				}));
			}
		}(this, t), this._cachedChangesIncludeMetadataChanges = t), this._cachedChanges;
	}
	toJSON() {
		if (this.metadata.hasPendingWrites) throw new I(F.FAILED_PRECONDITION, "QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");
		let t = {};
		t.type = e._jsonSchemaVersion, t.bundleSource = "QuerySnapshot", t.bundleName = Ac.newId(), this._firestore._databaseId.database, this._firestore._databaseId.projectId;
		let n = [], r = [], i = [];
		return this.docs.forEach(((e) => {
			e._document !== null && (n.push(e._document), r.push(this._userDataWriter.convertObjectMap(e._document.data.value.mapValue.fields, "previous")), i.push(e.ref.path));
		})), t.bundle = (this._firestore, this.query._query, t.bundleName, "NOT SUPPORTED"), t;
	}
};
function __(e) {
	switch (e) {
		case 0: return "added";
		case 2:
		case 3: return "modified";
		case 1: return "removed";
		default: return M(61501, { type: e });
	}
}
g_._jsonSchemaVersion = "firestore/querySnapshot/1.0", g_._jsonSchema = {
	type: B("string", g_._jsonSchemaVersion),
	bundleSource: B("string", "QuerySnapshot"),
	bundleName: B("string"),
	bundle: B("string")
};
function v_(e) {
	e = Gc(e, vg);
	let t = Gc(e.firestore, wg);
	return og(Dg(t), e._key).then(((n) => C_(t, e, n)));
}
function y_(e, t, n) {
	e = Gc(e, vg);
	let r = Gc(e.firestore, wg), i = u_(e.converter, t, n);
	return S_(r, [Vg(Bg(r), "setDoc", e._key, i, e.converter !== null, n).toMutation(e._key, Pd.none())]);
}
function b_(e, t, n, ...r) {
	e = Gc(e, vg);
	let i = Gc(e.firestore, wg), a = Bg(i), o;
	return o = typeof (t = y(t)) == "string" || t instanceof Ag ? Gg(a, "updateDoc", e._key, t, n, r) : Wg(a, "updateDoc", e._key, t), S_(i, [o.toMutation(e._key, Pd.exists(!0))]);
}
function x_(e, ...t) {
	e = y(e);
	let n = {
		includeMetadataChanges: !1,
		source: "default"
	}, r = 0;
	typeof t[r] != "object" || o_(t[r]) || (n = t[r++]);
	let i = {
		includeMetadataChanges: n.includeMetadataChanges,
		source: n.source
	};
	if (o_(t[r])) {
		let e = t[r];
		t[r] = e.next?.bind(e), t[r + 1] = e.error?.bind(e), t[r + 2] = e.complete?.bind(e);
	}
	let a, o, s;
	if (e instanceof vg) o = Gc(e.firestore, wg), s = Ru(e._key.path), a = {
		next: (n) => {
			t[r] && t[r](C_(o, e, n));
		},
		error: t[r + 1],
		complete: t[r + 2]
	};
	else {
		let n = Gc(e, _g);
		o = Gc(n.firestore, wg), s = n._query;
		let i = new n_(o);
		a = {
			next: (e) => {
				t[r] && t[r](new g_(o, i, n, e));
			},
			error: t[r + 1],
			complete: t[r + 2]
		}, l_(e._query);
	}
	return ag(Dg(o), s, i, a);
}
function S_(e, t) {
	return sg(Dg(e), t);
}
function C_(e, t, n) {
	let r = n.docs.get(t._key);
	return new m_(e, new n_(e), t._key, r, new p_(n.hasPendingWrites, n.fromCache), t.converter);
}
(function(e, t = !0) {
	pc(qt), Ut(new De("firestore", ((e, { instanceIdentifier: n, options: r }) => {
		let i = e.getProvider("app").getImmediate(), a = new wg(new wc(e.getProvider("auth-internal")), new Oc(i, e.getProvider("app-check-internal")), Ll(i, n), i);
		return r = {
			useFetchStreams: t,
			...r
		}, a._setSettings(r), a;
	}), "PUBLIC").setMultipleInstances(!0)), Zt(i_, a_, e), Zt(i_, a_, "esm2020");
})();
//#endregion
//#region sealed-telemetry/perf-diag/observer-core.js
var w_ = "totempark-sealed-telemetry-2a2c";
function T_(e) {
	let t = String(e || "").trim();
	if (!t) return "UNKNOWN";
	if (/^(file|content|capacitor):\/\//i.test(t) || t.startsWith("/_capacitor_file_/")) return "CACHE_LOCAL";
	try {
		let e = new URL(t);
		if (e.pathname.startsWith("/_capacitor_file_/")) return "CACHE_LOCAL";
		if (/^https?:$/i.test(e.protocol)) return "INTERNET_FALLBACK";
	} catch {}
	return "UNKNOWN";
}
function E_(e, t) {
	return !!(e?.enabled === !0 && (e.screenIds?.includes(t.screenId) || e.clientIds?.includes(t.clientId) || e.deviceIds?.includes(t.deviceId)));
}
function D_(e, t) {
	return {
		schemaVersion: 1,
		session: {
			...e,
			sessionId: globalThis.crypto?.randomUUID?.() || `${t}-${Math.random().toString(16).slice(2)}`,
			startedAt: new Date(t).toISOString(),
			lastActivityAt: new Date(t).toISOString(),
			lastHeartbeatAt: null,
			sequence: 0,
			appVersion: "1.0-player-2a2-c-sidecar-perf-diag",
			platform: "ANDROID"
		},
		current: {
			mediaSource: "UNKNOWN",
			mediaType: "UNKNOWN",
			currentSrc: "",
			connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
			playbackActive: !1,
			lastPlayerEvent: "SESSION_START",
			lastError: null,
			lastErrorAt: null
		},
		counters: {
			localPlaybackCount: 0,
			remotePlaybackCount: 0,
			waitingCount: 0,
			stalledCount: 0,
			playbackErrors: 0,
			displayTimeMs: 0
		},
		lastPlayerEvents: [],
		transitions: [],
		outbox: [],
		lastQueuedAtMs: 0,
		lastSyncedSequence: 0
	};
}
function O_({ documentRef: e = document, storage: t = localStorage, now: n = Date.now, onCheckpoint: r = () => {}, onTrace: i = () => {} } = {}) {
	let a = /* @__PURE__ */ new WeakSet(), o = /* @__PURE__ */ new WeakMap(), s = 0, c = !1, l = null, u = null, d = null, f = 0, p = !1, m = null, h = null, g = !1;
	function ee() {
		if (!l) return;
		let e = performance.now();
		i("SERIALIZE_START");
		let r = JSON.stringify(l);
		for (; r.length > 524288 && l.lastPlayerEvents.length > 5;) l.lastPlayerEvents.shift(), r = JSON.stringify(l);
		for (; r.length > 524288 && l.outbox.length > 1;) l.outbox.shift(), r = JSON.stringify(l);
		i("SERIALIZE_END", {
			durationMs: performance.now() - e,
			chars: r.length,
			approximateBytes: r.length * 2
		});
		let a = performance.now();
		i("LOCALSTORAGE_WRITE_START", { approximateBytes: r.length * 2 });
		let o = !0;
		try {
			t.setItem(w_, r);
		} catch {
			o = !1;
		}
		i("LOCALSTORAGE_WRITE_END", {
			durationMs: performance.now() - a,
			approximateBytes: r.length * 2,
			success: o
		}), f = n();
	}
	function te(e = !1) {
		if (!l || !e && n() - f < 1e3) return;
		if (e) {
			ee();
			return;
		}
		if (p) return;
		p = !0, i("EVENT_PERSIST_SCHEDULED");
		let t = () => {
			p = !1, ee();
		};
		typeof globalThis.requestIdleCallback == "function" ? globalThis.requestIdleCallback(t, { timeout: 2e3 }) : setTimeout(t, 50);
	}
	function _(e, t) {
		let r = e.currentSrc || e.src || "";
		return {
			timestamp: new Date(n()).toISOString(),
			event: t,
			mediaSource: T_(r),
			mediaType: e.tagName?.toLowerCase() === "video" ? "VIDEO" : "IMAGE",
			currentTime: Number.isFinite(e.currentTime) ? e.currentTime : null,
			readyState: Number.isFinite(e.readyState) ? e.readyState : null,
			networkState: Number.isFinite(e.networkState) ? e.networkState : null,
			errorCode: e.error?.code || null,
			nodeId: o.get(e)
		};
	}
	function ne(e, t) {
		if (!c || !l) return;
		let n = _(e, t), r = l.current, i = n.nodeId;
		(t === "playing" || t === "load") && m !== null && m !== i && (l.transitions.push({
			fromNodeId: m,
			toNodeId: i,
			fromMediaSource: h?.mediaSource || "UNKNOWN",
			toMediaSource: n.mediaSource,
			observedAt: n.timestamp,
			result: "OBSERVED"
		}), l.transitions = l.transitions.slice(-20)), (t === "playing" || t === "load") && ((!r.playbackActive || r.nodeId !== i || r.currentSrc !== (e.currentSrc || e.src || "")) && (n.mediaSource === "CACHE_LOCAL" && (l.counters.localPlaybackCount += 1), n.mediaSource === "INTERNET_FALLBACK" && (l.counters.remotePlaybackCount += 1)), r.playbackActive = !0, m = i, h = n), [
			"ended",
			"error",
			"abort",
			"emptied"
		].includes(t) && (r.playbackActive = !1), t === "waiting" && (l.counters.waitingCount += 1), t === "stalled" && (l.counters.stalledCount += 1), t === "error" && (l.counters.playbackErrors += 1, r.lastError = n.errorCode === 3 ? "MEDIA_ERR_DECODE" : "MEDIA_ERROR", r.lastErrorAt = n.timestamp), Object.assign(r, {
			mediaSource: n.mediaSource,
			mediaType: n.mediaType,
			currentSrc: e.currentSrc || e.src || "",
			nodeId: i,
			lastPlayerEvent: t
		}), l.session.lastActivityAt = n.timestamp, l.lastPlayerEvents.push(n), l.lastPlayerEvents = l.lastPlayerEvents.slice(-40), te();
	}
	function re(e) {
		if (a.has(e)) return;
		a.add(e), o.set(e, ++s);
		let t = e.tagName?.toLowerCase() === "video" ? [
			"play",
			"playing",
			"pause",
			"waiting",
			"stalled",
			"canplay",
			"ended",
			"error",
			"emptied",
			"abort"
		] : [
			"load",
			"error",
			"abort"
		];
		for (let n of t) e.addEventListener(n, () => {
			[
				"error",
				"waiting",
				"playing",
				"stalled"
			].includes(n) && i(`MEDIA_${n.toUpperCase()}`, {
				errorCode: e.error?.code || null,
				currentSrc: String(e.currentSrc || e.src || "").split(/[?#]/, 1)[0],
				currentTime: Number.isFinite(e.currentTime) ? e.currentTime : null,
				readyState: Number.isFinite(e.readyState) ? e.readyState : null,
				networkState: Number.isFinite(e.networkState) ? e.networkState : null,
				mediaId: e.dataset?.mediaId || null,
				nodeId: o.get(e)
			}), ne(e, n);
		}, { passive: !0 });
		e.tagName?.toLowerCase() === "video" && e.addEventListener("loadstart", () => i("MEDIA_LOADSTART", {
			currentSrc: String(e.currentSrc || e.src || "").split(/[?#]/, 1)[0],
			nodeId: o.get(e)
		}), { passive: !0 });
	}
	function ie(e) {
		e?.matches?.("video,img") && re(e), e?.querySelectorAll?.("video,img").forEach(re);
	}
	function ae() {
		if (!c || !l) return;
		let e = n();
		if (l.current.connectionStatus = navigator.onLine ? "ONLINE" : "OFFLINE", l.session.lastHeartbeatAt = new Date(e).toISOString(), l.counters.displayTimeMs = Math.max(0, e - Date.parse(l.session.startedAt)), e - l.lastQueuedAtMs < 3e5) return;
		let t = performance.now();
		i("CHECKPOINT_BUILD_START"), l.session.sequence += 1, l.lastQueuedAtMs = e;
		let a = {
			schemaVersion: 1,
			session: { ...l.session },
			current: { ...l.current },
			counters: { ...l.counters },
			lastPlayerEvents: l.lastPlayerEvents.slice(-4),
			transitions: l.transitions.slice(-2)
		}, o = JSON.stringify(a).length * 2;
		i("CHECKPOINT_BUILD_END", {
			durationMs: performance.now() - t,
			approximateBytes: o,
			sequence: l.session.sequence
		}), l.outbox.push({
			sessionId: l.session.sessionId,
			sequence: l.session.sequence,
			payload: a
		}), l.outbox = l.outbox.slice(-12), te(!0), r(l.outbox.at(-1));
	}
	return {
		start(r) {
			if (u) return;
			let i = null;
			try {
				i = JSON.parse(t.getItem("totempark-sealed-telemetry-2a2c") || "null");
			} catch {}
			l = D_(r, n()), Array.isArray(i?.outbox) && (l.outbox = i.outbox.slice(-12)), ie(e), u = new MutationObserver((e) => {
				for (let t of e) for (let e of t.addedNodes) ie(e);
			}), u.observe(e.documentElement, {
				childList: !0,
				subtree: !0
			}), d = setInterval(ae, 15e3), te(!0);
		},
		setEnabled(e) {
			let t = !!e;
			(!g || c !== t) && i(t ? "TELEMETRY_ENABLED" : "TELEMETRY_DISABLED"), g = !0, c = t;
		},
		checkpoint: ae,
		pending: () => l?.outbox.slice() || [],
		acknowledge(e, t) {
			l && (e === l.session.sessionId && (l.lastSyncedSequence = Math.max(l.lastSyncedSequence, Number(t))), l.outbox = l.outbox.filter((n) => n.payload?.session?.sessionId !== e || n.sequence > Number(t)), te(!0));
		},
		report: () => l && JSON.parse(JSON.stringify(l)),
		stop() {
			c = !1, u?.disconnect(), clearInterval(d), u = null, d = null;
		}
	};
}
function k_(e) {
	return String(e || "").split(/[?#]/, 1)[0];
}
function A_({ clock: e = () => performance.now(), wallClock: t = () => (/* @__PURE__ */ new Date()).toISOString(), limit: n = 100 } = {}) {
	let r = [], i = 0;
	return {
		record(a, o = {}) {
			let s = {
				sequence: ++i,
				type: a,
				monotonicMs: e(),
				timestamp: t(),
				...o
			};
			return r.length === n && r.shift(), r.push(s), s;
		},
		snapshot() {
			return r.map((e) => ({ ...e }));
		}
	};
}
function j_(e, t = globalThis.PerformanceObserver) {
	if (!t?.supportedEntryTypes?.includes("longtask")) return e.record("LONG_TASK_API_UNAVAILABLE"), null;
	try {
		let n = new t((t) => {
			for (let n of t.getEntries()) e.record("LONG_TASK", {
				startTimeMs: n.startTime,
				durationMs: n.duration
			});
		});
		return n.observe({ entryTypes: ["longtask"] }), n;
	} catch {
		return e.record("LONG_TASK_API_UNAVAILABLE"), null;
	}
}
//#endregion
//#region sealed-telemetry/perf-diag/telemetry-observer.js
var M_ = "br.com.parksolutions.totempark.player.telemetryperfdiag", N_ = "1.0-player-2a2-c-sidecar-perf-diag", P_ = "E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB", F_ = xn("DiagnosticExport"), I_ = A_(), L_ = (e, t) => I_.record(e, t);
j_(I_);
var R_ = Xt()[0] || Jt({
	apiKey: "AIzaSyBk775KTH959oIIEqnWiJRFW7Fo-1AX5AY",
	authDomain: "totem-park.firebaseapp.com",
	projectId: "totem-park",
	storageBucket: "totem-park.firebasestorage.app",
	messagingSenderId: "442546117681",
	appId: "1:442546117681:web:10106346df8cd91d198910"
}), z_ = gs(R_), B_;
try {
	B_ = Tg(R_, { localCache: f_() });
} catch {
	B_ = Eg(R_);
}
var V_ = Ys(R_), H_ = Zs(V_, "validatePlayerBinding"), U_ = Zs(V_, "claimPlayerBinding"), W_ = "totempark-sealed-telemetry-config", G_ = "totempark-sealed-telemetry-history-at";
function K_() {
	try {
		return Number(localStorage.getItem(G_)) || 0;
	} catch {
		return 0;
	}
}
var Q, $, q_ = !1, J_ = "", Y_ = !1, X_ = K_(), Z_ = !1, Q_, $_, ev = "", tv = !1, nv = "";
function rv() {
	try {
		let e = JSON.parse(localStorage.getItem("totempark-tv-connection") || "null"), t = localStorage.getItem("totempark-device-id");
		return !e?.clientId || !e?.code || !t || e.deviceId !== t ? null : {
			...e,
			deviceId: t
		};
	} catch {
		return null;
	}
}
function iv(e) {
	let t = performance.now();
	L_("SERIALIZE_START", { purpose: "checkpoint-sanitize" });
	let n = JSON.stringify(e), r = JSON.parse(n);
	L_("SERIALIZE_END", {
		purpose: "checkpoint-sanitize",
		durationMs: performance.now() - t,
		approximateBytes: n.length * 2
	});
	let i = r.current.currentSrc;
	try {
		let e = new URL(i);
		e.search = "", e.hash = "", r.current.currentSrc = e.href;
	} catch {
		r.current.currentSrc = "";
	}
	return r;
}
async function av() {
	if (Z_ || !q_ || !Y_ || !navigator.onLine || !Q) return;
	let e = Q.pending();
	if (e.length) {
		Z_ = !0;
		try {
			let t = e.at(-1), n = iv(t.payload), r = bg(B_, "clients", $.clientId, "screens", $.screenId), i = `${n.session.sessionId}:${t.sequence}`;
			if (i !== ev) {
				let e = performance.now();
				L_("FIRESTORE_UPDATE_START", { sequence: t.sequence });
				try {
					await b_(r, {
						telemetry: n,
						telemetryUpdatedAt: r_()
					}), L_("FIRESTORE_UPDATE_END", {
						sequence: t.sequence,
						durationMs: performance.now() - e,
						success: !0
					});
				} catch (n) {
					throw L_("FIRESTORE_UPDATE_END", {
						sequence: t.sequence,
						durationMs: performance.now() - e,
						success: !1,
						errorCode: n?.code || null
					}), n;
				}
				ev = i;
			}
			if (Date.now() - X_ >= 9e5) {
				let r = e.find((e) => e.payload?.session?.sessionId !== n.session.sessionId), i = r ? e.filter((e) => e.payload?.session?.sessionId === r.payload.session.sessionId).at(-1) : t, a = iv(i.payload), o = bg(B_, "clients", $.clientId, "screens", $.screenId, "telemetrySessions", a.session.sessionId), s = performance.now();
				L_("HISTORY_WRITE_START", { sequence: i.sequence });
				try {
					await y_(o, {
						...a,
						sequence: i.sequence,
						updatedAt: r_()
					}, { merge: !0 }), L_("HISTORY_WRITE_END", {
						sequence: i.sequence,
						durationMs: performance.now() - s,
						success: !0
					});
				} catch (e) {
					throw L_("HISTORY_WRITE_END", {
						sequence: i.sequence,
						durationMs: performance.now() - s,
						success: !1,
						errorCode: e?.code || null
					}), e;
				}
				Q.acknowledge(a.session.sessionId, i.sequence), X_ = Date.now();
				try {
					localStorage.setItem(G_, String(X_));
				} catch {}
			}
		} catch (e) {
			console.warn("[SealedTelemetry] checkpoint deferred:", e?.code || e?.message || e);
		} finally {
			Z_ = !1;
		}
	}
}
function ov() {
	Q_?.(), Q_ = x_(bg(B_, "settings", "telemetry2a2c"), (e) => {
		let t = e.exists() ? e.data() : { enabled: !1 }, n = E_(t, $);
		Y_ = n && !e.metadata.fromCache && navigator.onLine, Q.setEnabled(n), tv = n;
		try {
			localStorage.setItem(W_, JSON.stringify(t));
		} catch {}
		Y_ && av();
	}, (e) => {
		Y_ = !1, e?.code === "permission-denied" && (Q.setEnabled(!1), tv = !1);
	});
}
async function sv() {
	let e = rv();
	if (!e || !navigator.onLine || $?.clientId === e.clientId && $?.deviceId === e.deviceId && q_ && J_ === z_.currentUser?.uid) return;
	let t = z_.currentUser;
	t || (t = (await Qi(z_)).user);
	let n;
	try {
		n = (await H_()).data;
	} catch (r) {
		if (r?.code !== "functions/permission-denied") throw r;
		if ((await v_(bg(B_, "playerDeviceBindings", t.uid))).exists()) throw Error("Existing binding is not active; explicit re-pairing required", { cause: r });
		n = (await U_({
			code: e.code,
			deviceId: e.deviceId,
			appVersion: N_
		})).data;
	}
	if (n?.status !== "ACTIVE" || n.clientId !== e.clientId || n.deviceId !== e.deviceId || e.screenId && n.screenId !== e.screenId) throw Error("Binding does not match the local Player connection");
	let r = {
		clientId: n.clientId,
		screenId: n.screenId,
		deviceId: n.deviceId
	};
	$ && ($.clientId !== r.clientId || $.screenId !== r.screenId || $.deviceId !== r.deviceId) && (Q?.stop(), Q = null, q_ = !1), $ = r, Q || (Q = O_({
		onCheckpoint: av,
		onTrace: L_
	}), Q.start($)), q_ = !0, J_ = t.uid, ov();
}
function cv() {
	$_ || ($_ = sv().catch((e) => {
		q_ = !1, J_ = "", Y_ = !1, (e?.message?.includes("not active") || e?.message?.includes("does not match")) && (Q?.setEnabled(!1), tv = !1), console.warn("[SealedTelemetry] identity unavailable:", e?.code || e?.message || e);
	}).finally(() => {
		$_ = null;
	}));
}
function lv() {
	let e = rv();
	if (!(!e?.screenId || Q)) {
		$ = {
			clientId: e.clientId,
			screenId: e.screenId,
			deviceId: e.deviceId
		}, Q = O_({
			onCheckpoint: av,
			onTrace: L_
		}), Q.start($);
		try {
			tv = E_(JSON.parse(localStorage.getItem(W_) || "null"), $), Q.setEnabled(tv);
		} catch {
			Q.setEnabled(!1), tv = !1;
		}
	}
}
async function uv(e, t) {
	if (nv) {
		await F_.shareLast();
		return;
	}
	let n = Q?.report(), r = $?.screenId || rv()?.screenId;
	if (!n?.session?.sessionId || !r) throw Error("Sessão ou tela ainda indisponível");
	let i = /* @__PURE__ */ new Date(), a = `totempark-sidecar-perf-${i.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")}.json`;
	L_("EXPORT_REQUESTED");
	let o = {
		appVersion: N_,
		packageName: M_,
		sessionId: n.session.sessionId,
		screenId: r,
		exportedAt: i.toISOString(),
		telemetryEnabled: tv,
		playerBundleSha256: P_,
		performanceTimeOrigin: performance.timeOrigin,
		current: {
			...n.current,
			currentSrc: k_(n.current?.currentSrc)
		},
		counters: n.counters,
		events: I_.snapshot()
	}, s = await F_.save({
		fileName: a,
		data: JSON.stringify(o, null, 2)
	});
	if (s.folder !== "Documents/TotemPark/" || s.fileName !== a || s.packageName !== M_) throw Error("A exportação pública não corresponde ao pacote ou caminho esperado");
	nv = a, e.textContent = `Salvo: ${a}`, t.textContent = "Compartilhar PERF";
}
function dv() {
	if (document.getElementById("totempark-sidecar-perf-export")) return;
	let e = document.createElement("div");
	e.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:48vw";
	let t = document.createElement("button");
	t.id = "totempark-sidecar-perf-export", t.type = "button", t.textContent = "Exportar PERF", t.style.cssText = "padding:10px 16px;border:2px solid white;border-radius:10px;background:#10358a;color:white;font:700 17px Arial,sans-serif";
	let n = document.createElement("span");
	n.style.cssText = "color:white;background:#10234d;padding:3px 6px;font:12px Arial,sans-serif;overflow-wrap:anywhere", t.addEventListener("click", async () => {
		t.disabled = !0, n.textContent = nv ? "Abrindo compartilhamento…" : "Salvando diagnóstico…";
		try {
			await uv(n, t);
		} catch (e) {
			n.textContent = `Falha: ${e?.message || e}`;
		} finally {
			t.disabled = !1;
		}
	}), e.append(t, n), document.body.append(e);
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", dv, { once: !0 }) : dv(), lv(), oa(z_, cv), window.addEventListener("online", () => {
	cv(), av();
}, { passive: !0 }), window.addEventListener("offline", () => {
	q_ = !1, J_ = "", Y_ = !1;
}, { passive: !0 }), setInterval(cv, 15e3), cv();
//#endregion
