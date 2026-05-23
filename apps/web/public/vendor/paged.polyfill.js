/**
 * @license Paged.js v0.4.3 | MIT | https://gitlab.coko.foundation/pagedjs/pagedjs
 */

((global, factory) => {
	typeof exports === "object" && typeof module !== "undefined"
		? (module.exports = factory())
		: typeof define === "function" && define.amd
			? define(factory)
			: ((global = typeof globalThis !== "undefined" ? globalThis : global || self),
				(global.PagedPolyfill = factory()));
})(this, () => {
	function getDefaultExportFromCjs(x) {
		return x?.__esModule && Object.hasOwn(x, "default") ? x.default : x;
	}

	var eventEmitter = { exports: {} };

	var d$2 = { exports: {} };

	var isImplemented$6 = () => {
		var assign = Object.assign;
		var obj;
		if (typeof assign !== "function") return false;
		obj = { foo: "raz" };
		assign(obj, { bar: "dwa" }, { trzy: "trzy" });
		return obj.foo + obj.bar + obj.trzy === "razdwatrzy";
	};

	var isImplemented$5;
	var hasRequiredIsImplemented$1;

	function requireIsImplemented$1() {
		if (hasRequiredIsImplemented$1) return isImplemented$5;
		hasRequiredIsImplemented$1 = 1;

		isImplemented$5 = () => {
			try {
				Object.keys("primitive");
				return true;
			} catch (_e) {
				return false;
			}
		};
		return isImplemented$5;
	}

	// eslint-disable-next-line no-empty-function
	var noop$4 = () => {};

	var _undefined = noop$4(); // Support ES3 engines

	var isValue$3 = (val) => val !== _undefined && val !== null;

	var shim$5;
	var hasRequiredShim$5;

	function requireShim$5() {
		if (hasRequiredShim$5) return shim$5;
		hasRequiredShim$5 = 1;

		var isValue = isValue$3;

		var keys = Object.keys;

		shim$5 = (object) => keys(isValue(object) ? Object(object) : object);
		return shim$5;
	}

	var keys;
	var hasRequiredKeys;

	function requireKeys() {
		if (hasRequiredKeys) return keys;
		hasRequiredKeys = 1;

		keys = requireIsImplemented$1()() ? Object.keys : requireShim$5();
		return keys;
	}

	var isValue$2 = isValue$3;

	var validValue = (value) => {
		if (!isValue$2(value)) throw new TypeError("Cannot use null or undefined");
		return value;
	};

	var shim$4;
	var hasRequiredShim$4;

	function requireShim$4() {
		if (hasRequiredShim$4) return shim$4;
		hasRequiredShim$4 = 1;

		var keys = requireKeys();
		var value = validValue;
		var max = Math.max;

		shim$4 = function (dest, src /*, …srcn*/) {
			var error;
			var i;
			var length = max(arguments.length, 2);
			var assign;
			dest = Object(value(dest));
			assign = (key) => {
				try {
					dest[key] = src[key];
				} catch (e) {
					if (!error) error = e;
				}
			};
			for (i = 1; i < length; ++i) {
				src = arguments[i];
				keys(src).forEach(assign);
			}
			if (error !== undefined) throw error;
			return dest;
		};
		return shim$4;
	}

	var assign$2 = isImplemented$6() ? Object.assign : requireShim$4();

	var isValue$1 = isValue$3;

	var forEach$1 = Array.prototype.forEach;
	var create$5 = Object.create;

	var process = (src, obj) => {
		var key;
		for (key in src) obj[key] = src[key];
	};

	// eslint-disable-next-line no-unused-vars
	var normalizeOptions = function (_opts1 /*, …options*/) {
		var result = create$5(null);
		forEach$1.call(arguments, (options) => {
			if (!isValue$1(options)) return;
			process(Object(options), result);
		});
		return result;
	};

	var isCallable$1 = (obj) => typeof obj === "function";

	var str = "razdwatrzy";

	var isImplemented$4 = () => {
		if (typeof str.contains !== "function") return false;
		return str.contains("dwa") === true && str.contains("foo") === false;
	};

	var shim$3;
	var hasRequiredShim$3;

	function requireShim$3() {
		if (hasRequiredShim$3) return shim$3;
		hasRequiredShim$3 = 1;

		var indexOf = String.prototype.indexOf;

		shim$3 = function (searchString /*, position*/) {
			return indexOf.call(this, searchString, arguments[1]) > -1;
		};
		return shim$3;
	}

	var contains$1 = isImplemented$4() ? String.prototype.contains : requireShim$3();

	var assign$1 = assign$2;
	var normalizeOpts = normalizeOptions;
	var isCallable = isCallable$1;
	var contains = contains$1;
	var d$1;

	d$1 = d$2.exports = function (dscr, value /*, options*/) {
		var c;
		var e;
		var w;
		var options;
		var desc;
		if (arguments.length < 2 || typeof dscr !== "string") {
			options = value;
			value = dscr;
			dscr = null;
		} else {
			options = arguments[2];
		}
		if (dscr == null) {
			c = w = true;
			e = false;
		} else {
			c = contains.call(dscr, "c");
			e = contains.call(dscr, "e");
			w = contains.call(dscr, "w");
		}

		desc = { value: value, configurable: c, enumerable: e, writable: w };
		return !options ? desc : assign$1(normalizeOpts(options), desc);
	};

	d$1.gs = function (dscr, get, set /*, options*/) {
		var c;
		var e;
		var options;
		var desc;
		if (typeof dscr !== "string") {
			options = set;
			set = get;
			get = dscr;
			dscr = null;
		} else {
			options = arguments[3];
		}
		if (get == null) {
			get = undefined;
		} else if (!isCallable(get)) {
			options = get;
			get = set = undefined;
		} else if (set == null) {
			set = undefined;
		} else if (!isCallable(set)) {
			options = set;
			set = undefined;
		}
		if (dscr == null) {
			c = true;
			e = false;
		} else {
			c = contains.call(dscr, "c");
			e = contains.call(dscr, "e");
		}

		desc = { get: get, set: set, configurable: c, enumerable: e };
		return !options ? desc : assign$1(normalizeOpts(options), desc);
	};

	var dExports = d$2.exports;

	var validCallable = (fn) => {
		if (typeof fn !== "function") throw new TypeError(`${fn} is not a function`);
		return fn;
	};

	((module, exports) => {
		var d = dExports;
		var callable = validCallable;
		var apply = Function.prototype.apply;
		var call = Function.prototype.call;
		var create = Object.create;
		var defineProperty = Object.defineProperty;
		var defineProperties = Object.defineProperties;
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		var descriptor = { configurable: true, enumerable: false, writable: true };
		var on;
		var once;
		var off;
		var emit;
		var methods;
		var descriptors;
		var base;

		on = function (type, listener) {
			var data;

			callable(listener);

			if (!hasOwnProperty.call(this, "__ee__")) {
				data = descriptor.value = create(null);
				defineProperty(this, "__ee__", descriptor);
				descriptor.value = null;
			} else {
				data = this.__ee__;
			}
			if (!data[type]) data[type] = listener;
			else if (typeof data[type] === "object") data[type].push(listener);
			else data[type] = [data[type], listener];

			return this;
		};

		once = function (type, listener) {
			var once;
			var self;

			callable(listener);
			self = this;
			on.call(
				this,
				type,
				(once = function () {
					off.call(self, type, once);
					apply.call(listener, this, arguments);
				}),
			);

			once.__eeOnceListener__ = listener;
			return this;
		};

		off = function (type, listener) {
			var data;
			var listeners;
			var candidate;
			var i;

			callable(listener);

			if (!hasOwnProperty.call(this, "__ee__")) return this;
			data = this.__ee__;
			if (!data[type]) return this;
			listeners = data[type];

			if (typeof listeners === "object") {
				for (i = 0; (candidate = listeners[i]); ++i) {
					if (candidate === listener || candidate.__eeOnceListener__ === listener) {
						if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
						else listeners.splice(i, 1);
					}
				}
			} else {
				if (listeners === listener || listeners.__eeOnceListener__ === listener) {
					delete data[type];
				}
			}

			return this;
		};

		emit = function (type) {
			var i;
			var l;
			var listener;
			var listeners;
			var args;

			if (!hasOwnProperty.call(this, "__ee__")) return;
			listeners = this.__ee__[type];
			if (!listeners) return;

			if (typeof listeners === "object") {
				l = arguments.length;
				args = new Array(l - 1);
				for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

				listeners = listeners.slice();
				for (i = 0; (listener = listeners[i]); ++i) {
					apply.call(listener, this, args);
				}
			} else {
				switch (arguments.length) {
					case 1:
						call.call(listeners, this);
						break;
					case 2:
						call.call(listeners, this, arguments[1]);
						break;
					case 3:
						call.call(listeners, this, arguments[1], arguments[2]);
						break;
					default:
						l = arguments.length;
						args = new Array(l - 1);
						for (i = 1; i < l; ++i) {
							args[i - 1] = arguments[i];
						}
						apply.call(listeners, this, args);
				}
			}
		};

		methods = {
			on: on,
			once: once,
			off: off,
			emit: emit,
		};

		descriptors = {
			on: d(on),
			once: d(once),
			off: d(off),
			emit: d(emit),
		};

		base = defineProperties({}, descriptors);

		module.exports = exports = (o) => (o == null ? create(base) : defineProperties(Object(o), descriptors));
		exports.methods = methods;
	})(eventEmitter, eventEmitter.exports);

	var eventEmitterExports = eventEmitter.exports;
	var EventEmitter = /*@__PURE__*/ getDefaultExportFromCjs(eventEmitterExports);

	/**
	 * Hooks allow for injecting functions that must all complete in order before finishing
	 * They will execute in parallel but all must finish before continuing
	 * Functions may return a promise if they are asycn.
	 * From epubjs/src/utils/hooks
	 * @param {any} context scope of this
	 * @example this.content = new Hook(this);
	 */
	class Hook {
		constructor(context) {
			this.context = context || this;
			this.hooks = [];
		}

		/**
		 * Adds a function to be run before a hook completes
		 * @example this.content.register(function(){...});
		 * @return {undefined} void
		 */
		register() {
			for (var i = 0; i < arguments.length; ++i) {
				if (typeof arguments[i] === "function") {
					this.hooks.push(arguments[i]);
				} else {
					// unpack array
					for (var j = 0; j < arguments[i].length; ++j) {
						this.hooks.push(arguments[i][j]);
					}
				}
			}
		}

		/**
		 * Triggers a hook to run all functions
		 * @example this.content.trigger(args).then(function(){...});
		 * @return {Promise} results
		 */
		trigger() {
			var args = arguments;
			var context = this.context;
			var promises = [];

			this.hooks.forEach((task) => {
				var executing = task.apply(context, args);

				if (executing && typeof executing.then === "function") {
					// Task is a function that returns a promise
					promises.push(executing);
				} else {
					// Otherwise Task resolves immediately, add resolved promise with result
					promises.push(
						new Promise((resolve, _reject) => {
							resolve(executing);
						}),
					);
				}
			});

			return Promise.all(promises);
		}

		/**
		 * Triggers a hook to run all functions synchronously
		 * @example this.content.trigger(args).then(function(){...});
		 * @return {Array} results
		 */
		triggerSync() {
			var args = arguments;
			var context = this.context;
			var results = [];

			this.hooks.forEach((task) => {
				var executing = task.apply(context, args);

				results.push(executing);
			});

			return results;
		}

		// Adds a function to be run before a hook completes
		list() {
			return this.hooks;
		}

		clear() {
			return (this.hooks = []);
		}
	}

	function getBoundingClientRect(element) {
		if (!element) {
			return;
		}
		let rect;
		if (typeof element.getBoundingClientRect !== "undefined") {
			rect = element.getBoundingClientRect();
		} else {
			const range = document.createRange();
			range.selectNode(element);
			rect = range.getBoundingClientRect();
		}
		return rect;
	}

	function getClientRects(element) {
		if (!element) {
			return;
		}
		let rect;
		if (typeof element.getClientRects !== "undefined") {
			rect = element.getClientRects();
		} else {
			const range = document.createRange();
			range.selectNode(element);
			rect = range.getClientRects();
		}
		return rect;
	}

	/**
	 * Generates a UUID
	 * based on: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
	 * @returns {string} uuid
	 */
	function UUID() {
		var d = Date.now();
		if (typeof performance !== "undefined" && typeof performance.now === "function") {
			d += performance.now(); //use high-precision timer if available
		}
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			var r = ((d + Math.random() * 16) % 16) | 0;
			d = Math.floor(d / 16);
			return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
		});
	}

	function attr(element, attributes) {
		for (var i = 0; i < attributes.length; i++) {
			if (element.hasAttribute(attributes[i])) {
				return element.getAttribute(attributes[i]);
			}
		}
	}

	/* Based on by https://mths.be/cssescape v1.5.1 by @mathias | MIT license
	 * Allows # and .
	 */
	function querySelectorEscape(value) {
		if (arguments.length === 0) {
			throw new TypeError("`CSS.escape` requires an argument.");
		}
		var string = String(value);

		var length = string.length;
		var index = -1;
		var codeUnit;
		var result = "";
		var firstCodeUnit = string.charCodeAt(0);
		while (++index < length) {
			codeUnit = string.charCodeAt(index);

			// Note: there’s no need to special-case astral symbols, surrogate
			// pairs, or lone surrogates.

			// If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
			// (U+FFFD).
			if (codeUnit === 0x0000) {
				result += "\uFFFD";
				continue;
			}

			if (
				// If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
				// U+007F, […]
				(codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
				codeUnit === 0x007f ||
				// If the character is the first character and is in the range [0-9]
				// (U+0030 to U+0039), […]
				(index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
				// If the character is the second character and is in the range [0-9]
				// (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
				(index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
			) {
				// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
				result += `\\${codeUnit.toString(16)} `;
				continue;
			}

			if (
				// If the character is the first character and is a `-` (U+002D), and
				// there is no second character, […]
				index === 0 &&
				length === 1 &&
				codeUnit === 0x002d
			) {
				result += `\\${string.charAt(index)}`;
				continue;
			}

			// support for period character in id
			if (codeUnit === 0x002e) {
				if (string.charAt(0) === "#") {
					result += "\\.";
					continue;
				}
			}

			// If the character is not handled by one of the above rules and is
			// greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
			// is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
			// U+005A), or [a-z] (U+0061 to U+007A), […]
			if (
				codeUnit >= 0x0080 ||
				codeUnit === 0x002d ||
				codeUnit === 0x005f ||
				codeUnit === 35 || // Allow #
				codeUnit === 46 || // Allow .
				(codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
				(codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
				(codeUnit >= 0x0061 && codeUnit <= 0x007a)
			) {
				// the character itself
				result += string.charAt(index);
				continue;
			}

			// Otherwise, the escaped character.
			// https://drafts.csswg.org/cssom/#escape-a-character
			result += `\\${string.charAt(index)}`;
		}
		return result;
	}

	/**
	 * Creates a new pending promise and provides methods to resolve or reject it.
	 * From: https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred#backwards_forwards_compatible
	 * @returns {object} defered
	 */
	function defer() {
		this.resolve = null;

		this.reject = null;

		this.id = UUID();

		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
		Object.freeze(this);
	}

	const requestIdleCallback =
		typeof window !== "undefined" &&
		("requestIdleCallback" in window ? window.requestIdleCallback : window.requestAnimationFrame);

	function CSSValueToString(obj) {
		return obj.value + (obj.unit || "");
	}

	function isElement(node) {
		return node && node.nodeType === 1;
	}

	function isText(node) {
		return node && node.nodeType === 3;
	}

	function* walk$2(start, limiter) {
		let node = start;

		while (node) {
			yield node;

			if (node.childNodes.length) {
				node = node.firstChild;
			} else if (node.nextSibling) {
				if (limiter && node === limiter) {
					node = undefined;
					break;
				}
				node = node.nextSibling;
			} else {
				while (node) {
					node = node.parentNode;
					if (limiter && node === limiter) {
						node = undefined;
						break;
					}
					if (node?.nextSibling) {
						node = node.nextSibling;
						break;
					}
				}
			}
		}
	}

	function nodeAfter(node, limiter) {
		if (limiter && node === limiter) {
			return;
		}
		let significantNode = nextSignificantNode(node);
		if (significantNode) {
			return significantNode;
		}
		if (node.parentNode) {
			while ((node = node.parentNode)) {
				if (limiter && node === limiter) {
					return;
				}
				significantNode = nextSignificantNode(node);
				if (significantNode) {
					return significantNode;
				}
			}
		}
	}

	function nodeBefore(node, limiter) {
		if (limiter && node === limiter) {
			return;
		}
		let significantNode = previousSignificantNode(node);
		if (significantNode) {
			return significantNode;
		}
		if (node.parentNode) {
			while ((node = node.parentNode)) {
				if (limiter && node === limiter) {
					return;
				}
				significantNode = previousSignificantNode(node);
				if (significantNode) {
					return significantNode;
				}
			}
		}
	}

	function elementAfter(node, limiter) {
		let after = nodeAfter(node, limiter);

		while (after && after.nodeType !== 1) {
			after = nodeAfter(after, limiter);
		}

		return after;
	}

	function elementBefore(node, limiter) {
		let before = nodeBefore(node, limiter);

		while (before && before.nodeType !== 1) {
			before = nodeBefore(before, limiter);
		}

		return before;
	}

	function displayedElementAfter(node, limiter) {
		let after = elementAfter(node, limiter);

		while (after?.dataset.undisplayed) {
			after = elementAfter(after, limiter);
		}

		return after;
	}

	function displayedElementBefore(node, limiter) {
		let before = elementBefore(node, limiter);

		while (before?.dataset.undisplayed) {
			before = elementBefore(before, limiter);
		}

		return before;
	}

	function rebuildAncestors(node) {
		let parent;
		let ancestor;
		const ancestors = [];
		let added = [];

		const fragment = document.createDocumentFragment();

		// Handle rowspan on table
		if (node.nodeName === "TR") {
			let previousRow = node.previousElementSibling;
			let previousRowDistance = 1;
			while (previousRow) {
				// previous row has more columns, might indicate a rowspan.
				if (previousRow.childElementCount > node.childElementCount) {
					const initialColumns = Array.from(node.children);
					while (node.firstChild) {
						node.firstChild.remove();
					}
					let k = 0;
					for (let j = 0; j < previousRow.children.length; j++) {
						const column = previousRow.children[j];
						if (column.rowSpan && column.rowSpan > previousRowDistance) {
							const duplicatedColumn = column.cloneNode(true);
							// Adjust rowspan value
							duplicatedColumn.rowSpan = column.rowSpan - previousRowDistance;
							// Add the column to the row
							node.appendChild(duplicatedColumn);
						} else {
							// Fill the gap with the initial columns (if exists)
							const initialColumn = initialColumns[k++];
							// The initial column can be undefined if the newly created table has less columns than the original table
							if (initialColumn) {
								node.appendChild(initialColumn);
							}
						}
					}
				}
				previousRow = previousRow.previousElementSibling;
				previousRowDistance++;
			}
		}

		// Gather all ancestors
		let element = node;
		while (element.parentNode && element.parentNode.nodeType === 1) {
			ancestors.unshift(element.parentNode);
			element = element.parentNode;
		}

		for (var i = 0; i < ancestors.length; i++) {
			ancestor = ancestors[i];
			parent = ancestor.cloneNode(false);

			parent.setAttribute("data-split-from", parent.getAttribute("data-ref"));
			// ancestor.setAttribute("data-split-to", parent.getAttribute("data-ref"));

			if (parent.hasAttribute("id")) {
				const dataID = parent.getAttribute("id");
				parent.setAttribute("data-id", dataID);
				parent.removeAttribute("id");
			}

			// This is handled by css :not, but also tidied up here
			if (parent.hasAttribute("data-break-before")) {
				parent.removeAttribute("data-break-before");
			}

			if (parent.hasAttribute("data-previous-break-after")) {
				parent.removeAttribute("data-previous-break-after");
			}

			if (added.length) {
				const container = added[added.length - 1];
				container.appendChild(parent);
			} else {
				fragment.appendChild(parent);
			}
			added.push(parent);

			// rebuild table rows
			if (parent.nodeName === "TD" && ancestor.parentElement.contains(ancestor)) {
				let td = ancestor;
				let prev = parent;
				while ((td = td.previousElementSibling)) {
					const sib = td.cloneNode(false);
					parent.parentElement.insertBefore(sib, prev);
					prev = sib;
				}
			}
		}

		added = undefined;
		return fragment;
	}
	/*
	export function split(bound, cutElement, breakAfter) {
			let needsRemoval = [];
			let index = indexOf(cutElement);

			if (!breakAfter && index === 0) {
				return;
			}

			if (breakAfter && index === (cutElement.parentNode.children.length - 1)) {
				return;
			}

			// Create a fragment with rebuilt ancestors
			let fragment = rebuildAncestors(cutElement);

			// Clone cut
			if (!breakAfter) {
				let clone = cutElement.cloneNode(true);
				let ref = cutElement.parentNode.getAttribute('data-ref');
				let parent = fragment.querySelector("[data-ref='" + ref + "']");
				parent.appendChild(clone);
				needsRemoval.push(cutElement);
			}

			// Remove all after cut
			let next = nodeAfter(cutElement, bound);
			while (next) {
				let clone = next.cloneNode(true);
				let ref = next.parentNode.getAttribute('data-ref');
				let parent = fragment.querySelector("[data-ref='" + ref + "']");
				parent.appendChild(clone);
				needsRemoval.push(next);
				next = nodeAfter(next, bound);
			}

			// Remove originals
			needsRemoval.forEach((node) => {
				if (node) {
					node.remove();
				}
			});

			// Insert after bounds
			bound.parentNode.insertBefore(fragment, bound.nextSibling);
			return [bound, bound.nextSibling];
	}
	*/

	function needsBreakBefore(node) {
		if (
			typeof node !== "undefined" &&
			typeof node.dataset !== "undefined" &&
			typeof node.dataset.breakBefore !== "undefined" &&
			(node.dataset.breakBefore === "always" ||
				node.dataset.breakBefore === "page" ||
				node.dataset.breakBefore === "left" ||
				node.dataset.breakBefore === "right" ||
				node.dataset.breakBefore === "recto" ||
				node.dataset.breakBefore === "verso")
		) {
			return true;
		}

		return false;
	}

	function needsPreviousBreakAfter(node) {
		if (
			typeof node !== "undefined" &&
			typeof node.dataset !== "undefined" &&
			typeof node.dataset.previousBreakAfter !== "undefined" &&
			(node.dataset.previousBreakAfter === "always" ||
				node.dataset.previousBreakAfter === "page" ||
				node.dataset.previousBreakAfter === "left" ||
				node.dataset.previousBreakAfter === "right" ||
				node.dataset.previousBreakAfter === "recto" ||
				node.dataset.previousBreakAfter === "verso")
		) {
			return true;
		}

		return false;
	}

	function needsPageBreak(node, previousSignificantNode) {
		if (typeof node === "undefined" || !previousSignificantNode || isIgnorable(node)) {
			return false;
		}
		if (node.dataset?.undisplayed) {
			return false;
		}
		let previousSignificantNodePage = previousSignificantNode.dataset
			? previousSignificantNode.dataset.page
			: undefined;
		if (typeof previousSignificantNodePage === "undefined") {
			const nodeWithNamedPage = getNodeWithNamedPage(previousSignificantNode);
			if (nodeWithNamedPage) {
				previousSignificantNodePage = nodeWithNamedPage.dataset.page;
			}
		}
		let currentNodePage = node.dataset ? node.dataset.page : undefined;
		if (typeof currentNodePage === "undefined") {
			const nodeWithNamedPage = getNodeWithNamedPage(node, previousSignificantNode);
			if (nodeWithNamedPage) {
				currentNodePage = nodeWithNamedPage.dataset.page;
			}
		}
		return currentNodePage !== previousSignificantNodePage;
	}

	function* words(node) {
		const currentText = node.nodeValue;
		const max = currentText.length;
		let currentOffset = 0;
		let currentLetter;

		let range;
		const significantWhitespaces = node.parentElement && node.parentElement.nodeName === "PRE";

		while (currentOffset < max) {
			currentLetter = currentText[currentOffset];
			if (/^[\S\u202F\u00A0]$/.test(currentLetter) || significantWhitespaces) {
				if (!range) {
					range = document.createRange();
					range.setStart(node, currentOffset);
				}
			} else {
				if (range) {
					range.setEnd(node, currentOffset);
					yield range;
					range = undefined;
				}
			}

			currentOffset += 1;
		}

		if (range) {
			range.setEnd(node, currentOffset);
			yield range;
		}
	}

	function* letters(wordRange) {
		const currentText = wordRange.startContainer;
		const max = currentText.length;
		let currentOffset = wordRange.startOffset;
		// let currentLetter;

		let range;

		while (currentOffset < max) {
			// currentLetter = currentText[currentOffset];
			range = document.createRange();
			range.setStart(currentText, currentOffset);
			range.setEnd(currentText, currentOffset + 1);

			yield range;

			currentOffset += 1;
		}
	}

	function isContainer(node) {
		let container;

		if (typeof node.tagName === "undefined") {
			return true;
		}

		if (node.style && node.style.display === "none") {
			return false;
		}

		switch (node.tagName) {
			// Inline
			case "A":
			case "ABBR":
			case "ACRONYM":
			case "B":
			case "BDO":
			case "BIG":
			case "BR":
			case "BUTTON":
			case "CITE":
			case "CODE":
			case "DFN":
			case "EM":
			case "I":
			case "IMG":
			case "INPUT":
			case "KBD":
			case "LABEL":
			case "MAP":
			case "OBJECT":
			case "Q":
			case "SAMP":
			case "SCRIPT":
			case "SELECT":
			case "SMALL":
			case "SPAN":
			case "STRONG":
			case "SUB":
			case "SUP":
			case "TEXTAREA":
			case "TIME":
			case "TT":
			case "VAR":
			case "P":
			case "H1":
			case "H2":
			case "H3":
			case "H4":
			case "H5":
			case "H6":
			case "FIGCAPTION":
			case "BLOCKQUOTE":
			case "PRE":
			case "LI":
			case "TD":
			case "DT":
			case "DD":
			case "VIDEO":
			case "CANVAS":
				container = false;
				break;
			default:
				container = true;
		}

		return container;
	}

	function cloneNode(n, deep = false) {
		return n.cloneNode(deep);
	}

	function findElement(node, doc, forceQuery) {
		const ref = node.getAttribute("data-ref");
		return findRef(ref, doc, forceQuery);
	}

	function findRef(ref, doc, forceQuery) {
		if (!forceQuery && doc.indexOfRefs && doc.indexOfRefs[ref]) {
			return doc.indexOfRefs[ref];
		}
		return doc.querySelector(`[data-ref='${ref}']`);
	}

	function validNode(node) {
		if (isText(node)) {
			return true;
		}

		if (isElement(node) && node.dataset.ref) {
			return true;
		}

		return false;
	}

	function prevValidNode(node) {
		while (!validNode(node)) {
			if (node.previousSibling) {
				node = node.previousSibling;
			} else {
				node = node.parentNode;
			}

			if (!node) {
				break;
			}
		}

		return node;
	}

	function indexOf$2(node) {
		const parent = node.parentNode;
		if (!parent) {
			return 0;
		}
		return Array.prototype.indexOf.call(parent.childNodes, node);
	}

	function child(node, index) {
		return node.childNodes[index];
	}

	function hasContent(node) {
		if (isElement(node)) {
			return true;
		}
		if (isText(node) && node.textContent.trim().length) {
			return true;
		}
		return false;
	}

	function indexOfTextNode(node, parent) {
		if (!isText(node)) {
			return -1;
		}
		const nodeTextContent = node.textContent;
		let child;
		let index = -1;
		for (var i = 0; i < parent.childNodes.length; i++) {
			child = parent.childNodes[i];
			if (child.nodeType === 3) {
				const text = parent.childNodes[i].textContent;
				if (text.includes(nodeTextContent)) {
					index = i;
					break;
				}
			}
		}

		return index;
	}

	/**
	 * Throughout, whitespace is defined as one of the characters
	 *  "\t" TAB \u0009
	 *  "\n" LF  \u000A
	 *  "\r" CR  \u000D
	 *  " "  SPC \u0020
	 *
	 * This does not use Javascript's "\s" because that includes non-breaking
	 * spaces (and also some other characters).
	 */

	/**
	 * Determine if a node should be ignored by the iterator functions.
	 * taken from https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#Whitespace_helper_functions
	 *
	 * @param {Node} node An object implementing the DOM1 |Node| interface.
	 * @return {boolean} true if the node is:
	 *  1) A |Text| node that is all whitespace
	 *  2) A |Comment| node
	 *  and otherwise false.
	 */
	function isIgnorable(node) {
		return (
			node.nodeType === 8 || // A comment node
			(node.nodeType === 3 && isAllWhitespace(node))
		); // a text node, all whitespace
	}

	/**
	 * Determine whether a node's text content is entirely whitespace.
	 *
	 * @param {Node} node  A node implementing the |CharacterData| interface (i.e., a |Text|, |Comment|, or |CDATASection| node
	 * @return {boolean} true if all of the text content of |nod| is whitespace, otherwise false.
	 */
	function isAllWhitespace(node) {
		return !/[^\t\n\r ]/.test(node.textContent);
	}

	/**
	 * Version of |previousSibling| that skips nodes that are entirely
	 * whitespace or comments.  (Normally |previousSibling| is a property
	 * of all DOM nodes that gives the sibling node, the node that is
	 * a child of the same parent, that occurs immediately before the
	 * reference node.)
	 *
	 * @param {ChildNode} sib  The reference node.
	 * @return {Node|null} Either:
	 *  1) The closest previous sibling to |sib| that is not ignorable according to |is_ignorable|, or
	 *  2) null if no such node exists.
	 */
	function previousSignificantNode(sib) {
		while ((sib = sib.previousSibling)) {
			if (!isIgnorable(sib)) return sib;
		}
		return null;
	}

	function getNodeWithNamedPage(node, limiter) {
		if (node?.dataset?.page) {
			return node;
		}
		if (node.parentNode) {
			while ((node = node.parentNode)) {
				if (limiter && node === limiter) {
					return;
				}
				if (node.dataset?.page) {
					return node;
				}
			}
		}
		return null;
	}

	function breakInsideAvoidParentNode(node) {
		while ((node = node.parentNode)) {
			if (node?.dataset && node.dataset.breakInside === "avoid") {
				return node;
			}
		}
		return null;
	}

	/**
	 * Find a parent with a given node name.
	 * @param {Node} node - initial Node
	 * @param {string} nodeName - node name (eg. "TD", "TABLE", "STRONG"...)
	 * @param {Node} limiter - go up to the parent until there's no more parent or the current node is equals to the limiter
	 * @returns {Node|undefined} - Either:
	 *  1) The closest parent for a the given node name, or
	 *  2) undefined if no such node exists.
	 */
	function parentOf(node, nodeName, limiter) {
		if (limiter && node === limiter) {
			return;
		}
		if (node.parentNode) {
			while ((node = node.parentNode)) {
				if (limiter && node === limiter) {
					return;
				}
				if (node.nodeName === nodeName) {
					return node;
				}
			}
		}
	}

	/**
	 * Version of |nextSibling| that skips nodes that are entirely
	 * whitespace or comments.
	 *
	 * @param {ChildNode} sib  The reference node.
	 * @return {Node|null} Either:
	 *  1) The closest next sibling to |sib| that is not ignorable according to |is_ignorable|, or
	 *  2) null if no such node exists.
	 */
	function nextSignificantNode(sib) {
		while ((sib = sib.nextSibling)) {
			if (!isIgnorable(sib)) return sib;
		}
		return null;
	}

	function filterTree(content, func, what) {
		const treeWalker = document.createTreeWalker(
			content || this.dom,
			what || NodeFilter.SHOW_ALL,
			func ? { acceptNode: func } : null,
			false,
		);

		let node;
		let current;
		node = treeWalker.nextNode();
		while (node) {
			current = node;
			node = treeWalker.nextNode();
			current.parentNode.removeChild(current);
		}
	}

	/**
	 * BreakToken
	 * @class
	 */
	class BreakToken {
		constructor(node, offset) {
			this.node = node;
			this.offset = offset;
		}

		equals(otherBreakToken) {
			if (!otherBreakToken) {
				return false;
			}
			if (this.node && otherBreakToken.node && this.node !== otherBreakToken.node) {
				return false;
			}
			if (this.offset && otherBreakToken.offset && this.offset !== otherBreakToken.offset) {
				return false;
			}
			return true;
		}

		toJSON(hash) {
			let node;
			let index = 0;
			if (!this.node) {
				return {};
			}
			if (isElement(this.node) && this.node.dataset.ref) {
				node = this.node.dataset.ref;
			} else if (hash) {
				node = this.node.parentElement.dataset.ref;
			}

			if (this.node.parentElement) {
				const children = Array.from(this.node.parentElement.childNodes);
				index = children.indexOf(this.node);
			}

			return JSON.stringify({
				node: node,
				index: index,
				offset: this.offset,
			});
		}
	}

	/**
	 * Render result.
	 * @class
	 */
	class RenderResult {
		constructor(breakToken, error) {
			this.breakToken = breakToken;
			this.error = error;
		}
	}

	class OverflowContentError extends Error {
		constructor(message, items) {
			super(message);
			this.items = items;
		}
	}

	const MAX_CHARS_PER_BREAK = 1500;

	/**
	 * Layout
	 * @class
	 */
	class Layout {
		constructor(element, hooks, options) {
			this.element = element;

			this.bounds = this.element.getBoundingClientRect();
			this.parentBounds = this.element.offsetParent.getBoundingClientRect();
			const gap = Number.parseFloat(window.getComputedStyle(this.element).columnGap);

			if (gap) {
				const leftMargin = this.bounds.left - this.parentBounds.left;
				this.gap = gap - leftMargin;
			} else {
				this.gap = 0;
			}

			if (hooks) {
				this.hooks = hooks;
			} else {
				this.hooks = {};
				this.hooks.onPageLayout = new Hook();
				this.hooks.layout = new Hook();
				this.hooks.renderNode = new Hook();
				this.hooks.layoutNode = new Hook();
				this.hooks.beforeOverflow = new Hook();
				this.hooks.onOverflow = new Hook();
				this.hooks.afterOverflowRemoved = new Hook();
				this.hooks.onBreakToken = new Hook();
				this.hooks.beforeRenderResult = new Hook();
			}

			this.settings = options || {};

			this.maxChars = this.settings.maxChars || MAX_CHARS_PER_BREAK;
			this.forceRenderBreak = false;
		}

		async renderTo(wrapper, source, breakToken, bounds = this.bounds) {
			const start = this.getStart(source, breakToken);
			let walker = walk$2(start, source);

			let node;
			let prevNode;
			let done;
			let next;

			let hasRenderedContent = false;
			let newBreakToken;

			let length = 0;

			const prevBreakToken = breakToken || new BreakToken(start);

			this.hooks?.onPageLayout.trigger(wrapper, prevBreakToken, this);

			while (!done && !newBreakToken) {
				next = walker.next();
				prevNode = node;
				node = next.value;
				done = next.done;

				if (!node) {
					this.hooks?.layout.trigger(wrapper, this);

					const imgs = wrapper.querySelectorAll("img");
					if (imgs.length) {
						await this.waitForImages(imgs);
					}

					newBreakToken = this.findBreakToken(wrapper, source, bounds, prevBreakToken);

					if (newBreakToken?.equals(prevBreakToken)) {
						console.warn("Unable to layout item: ", prevNode);
						this.hooks?.beforeRenderResult.trigger(undefined, wrapper, this);
						return new RenderResult(undefined, new OverflowContentError("Unable to layout item", [prevNode]));
					}

					this.rebuildTableFromBreakToken(newBreakToken, wrapper);

					this.hooks?.beforeRenderResult.trigger(newBreakToken, wrapper, this);
					return new RenderResult(newBreakToken);
				}

				this.hooks?.layoutNode.trigger(node);

				// Check if the rendered element has a break set
				if (hasRenderedContent && this.shouldBreak(node, start)) {
					this.hooks?.layout.trigger(wrapper, this);

					const imgs = wrapper.querySelectorAll("img");
					if (imgs.length) {
						await this.waitForImages(imgs);
					}

					newBreakToken = this.findBreakToken(wrapper, source, bounds, prevBreakToken);

					if (!newBreakToken) {
						newBreakToken = this.breakAt(node);
					} else {
						this.rebuildTableFromBreakToken(newBreakToken, wrapper);
					}

					if (newBreakToken?.equals(prevBreakToken)) {
						console.warn("Unable to layout item: ", node);
						const after = newBreakToken.node && nodeAfter(newBreakToken.node);
						if (after) {
							newBreakToken = new BreakToken(after);
						} else {
							return new RenderResult(undefined, new OverflowContentError("Unable to layout item", [node]));
						}
					}

					length = 0;

					break;
				}

				if (node.dataset?.page) {
					const named = node.dataset.page;
					const page = this.element.closest(".pagedjs_page");
					page.classList.add("pagedjs_named_page");
					page.classList.add(`pagedjs_${named}_page`);

					if (!node.dataset.splitFrom) {
						page.classList.add(`pagedjs_${named}_first_page`);
					}
				}

				// Should the Node be a shallow or deep clone
				const shallow = isContainer(node);

				const rendered = this.append(node, wrapper, breakToken, shallow);

				length += rendered.textContent.length;

				// Check if layout has content yet
				if (!hasRenderedContent) {
					hasRenderedContent = hasContent(node);
				}

				// Skip to the next node if a deep clone was rendered
				if (!shallow) {
					walker = walk$2(nodeAfter(node, source), source);
				}

				if (this.forceRenderBreak) {
					this.hooks?.layout.trigger(wrapper, this);

					newBreakToken = this.findBreakToken(wrapper, source, bounds, prevBreakToken);

					if (!newBreakToken) {
						newBreakToken = this.breakAt(node);
					} else {
						this.rebuildTableFromBreakToken(newBreakToken, wrapper);
					}

					length = 0;
					this.forceRenderBreak = false;

					break;
				}

				// Only check x characters
				if (length >= this.maxChars) {
					this.hooks?.layout.trigger(wrapper, this);

					const imgs = wrapper.querySelectorAll("img");
					if (imgs.length) {
						await this.waitForImages(imgs);
					}

					newBreakToken = this.findBreakToken(wrapper, source, bounds, prevBreakToken);

					if (newBreakToken) {
						length = 0;
						this.rebuildTableFromBreakToken(newBreakToken, wrapper);
					}

					if (newBreakToken?.equals(prevBreakToken)) {
						console.warn("Unable to layout item: ", node);
						const after = newBreakToken.node && nodeAfter(newBreakToken.node);
						if (after) {
							newBreakToken = new BreakToken(after);
						} else {
							this.hooks?.beforeRenderResult.trigger(undefined, wrapper, this);
							return new RenderResult(undefined, new OverflowContentError("Unable to layout item", [node]));
						}
					}
				}
			}

			this.hooks?.beforeRenderResult.trigger(newBreakToken, wrapper, this);
			return new RenderResult(newBreakToken);
		}

		breakAt(node, offset = 0) {
			let newBreakToken = new BreakToken(node, offset);
			const breakHooks = this.hooks.onBreakToken.triggerSync(newBreakToken, undefined, node, this);
			breakHooks.forEach((newToken) => {
				if (typeof newToken !== "undefined") {
					newBreakToken = newToken;
				}
			});

			return newBreakToken;
		}

		shouldBreak(node, limiter) {
			const previousNode = nodeBefore(node, limiter);
			const parentNode = node.parentNode;
			const parentBreakBefore = needsBreakBefore(node) && parentNode && !previousNode && needsBreakBefore(parentNode);
			let doubleBreakBefore;

			if (parentBreakBefore) {
				doubleBreakBefore = node.dataset.breakBefore === parentNode.dataset.breakBefore;
			}

			return (
				(!doubleBreakBefore && needsBreakBefore(node)) ||
				needsPreviousBreakAfter(node) ||
				needsPageBreak(node, previousNode)
			);
		}

		forceBreak() {
			this.forceRenderBreak = true;
		}

		getStart(source, breakToken) {
			let start;
			const node = breakToken?.node;

			if (node) {
				start = node;
			} else {
				start = source.firstChild;
			}

			return start;
		}

		append(node, dest, breakToken, shallow = true, rebuild = true) {
			let clone = cloneNode(node, !shallow);

			if (node.parentNode && isElement(node.parentNode)) {
				let parent = findElement(node.parentNode, dest);
				// Rebuild chain
				if (parent) {
					parent.appendChild(clone);
				} else if (rebuild) {
					const fragment = rebuildAncestors(node);
					parent = findElement(node.parentNode, fragment);
					if (!parent) {
						dest.appendChild(clone);
					} else if (breakToken && isText(breakToken.node) && breakToken.offset > 0) {
						clone.textContent = clone.textContent.substring(breakToken.offset);
						parent.appendChild(clone);
					} else {
						parent.appendChild(clone);
					}

					dest.appendChild(fragment);
				} else {
					dest.appendChild(clone);
				}
			} else {
				dest.appendChild(clone);
			}

			if (clone.dataset?.ref) {
				if (!dest.indexOfRefs) {
					dest.indexOfRefs = {};
				}
				dest.indexOfRefs[clone.dataset.ref] = clone;
			}

			const nodeHooks = this.hooks.renderNode.triggerSync(clone, node, this);
			nodeHooks.forEach((newNode) => {
				if (typeof newNode !== "undefined") {
					clone = newNode;
				}
			});

			return clone;
		}

		rebuildTableFromBreakToken(breakToken, dest) {
			if (!breakToken?.node) {
				return;
			}
			const node = breakToken.node;
			let td = isElement(node) ? node.closest("td") : node.parentElement.closest("td");
			if (td) {
				const rendered = findElement(td, dest, true);
				if (!rendered) {
					return;
				}
				while ((td = td.nextElementSibling)) {
					this.append(td, dest, null, true);
				}
			}
		}

		async waitForImages(imgs) {
			const results = Array.from(imgs).map(async (img) => {
				return this.awaitImageLoaded(img);
			});
			await Promise.all(results);
		}

		async awaitImageLoaded(image) {
			return new Promise((resolve) => {
				if (image.complete !== true) {
					image.onload = () => {
						const { width, height } = window.getComputedStyle(image);
						resolve(width, height);
					};
					image.onerror = (e) => {
						const { width, height } = window.getComputedStyle(image);
						resolve(width, height, e);
					};
				} else {
					const { width, height } = window.getComputedStyle(image);
					resolve(width, height);
				}
			});
		}

		avoidBreakInside(node, limiter) {
			let breakNode;

			if (node === limiter) {
				return;
			}

			while (node.parentNode) {
				node = node.parentNode;

				if (node === limiter) {
					break;
				}

				if (window.getComputedStyle(node)["break-inside"] === "avoid") {
					breakNode = node;
					break;
				}
			}
			return breakNode;
		}

		createBreakToken(overflow, rendered, source) {
			const container = overflow.startContainer;
			let offset = overflow.startOffset;
			let node;
			let renderedNode;
			let parent;
			let index;
			let temp;

			if (isElement(container)) {
				temp = child(container, offset);

				if (isElement(temp)) {
					renderedNode = findElement(temp, rendered);

					if (!renderedNode) {
						// Find closest element with data-ref
						let prevNode = prevValidNode(temp);
						if (!isElement(prevNode)) {
							prevNode = prevNode.parentElement;
						}
						renderedNode = findElement(prevNode, rendered);
						// Check if temp is the last rendered node at its level.
						if (!temp.nextSibling) {
							// We need to ensure that the previous sibling of temp is fully rendered.
							const renderedNodeFromSource = findElement(renderedNode, source);
							const walker = document.createTreeWalker(renderedNodeFromSource, NodeFilter.SHOW_ELEMENT);
							const lastChildOfRenderedNodeFromSource = walker.lastChild();
							const lastChildOfRenderedNodeMatchingFromRendered = findElement(
								lastChildOfRenderedNodeFromSource,
								rendered,
							);
							// Check if we found that the last child in source
							if (!lastChildOfRenderedNodeMatchingFromRendered) {
								// Pending content to be rendered before virtual break token
								return;
							}
							// Otherwise we will return a break token as per below
						}
						// renderedNode is actually the last unbroken box that does not overflow.
						// Break Token is therefore the next sibling of renderedNode within source node.
						node = findElement(renderedNode, source).nextSibling;
						offset = 0;
					} else {
						node = findElement(renderedNode, source);
						offset = 0;
					}
				} else {
					renderedNode = findElement(container, rendered);

					if (!renderedNode) {
						renderedNode = findElement(prevValidNode(container), rendered);
					}

					parent = findElement(renderedNode, source);
					index = indexOfTextNode(temp, parent);
					// No seperatation for the first textNode of an element
					if (index === 0) {
						node = parent;
						offset = 0;
					} else {
						node = child(parent, index);
						offset = 0;
					}
				}
			} else {
				renderedNode = findElement(container.parentNode, rendered);

				if (!renderedNode) {
					renderedNode = findElement(prevValidNode(container.parentNode), rendered);
				}

				parent = findElement(renderedNode, source);
				index = indexOfTextNode(container, parent);

				if (index === -1) {
					return;
				}

				node = child(parent, index);

				offset += node.textContent.indexOf(container.textContent);
			}

			if (!node) {
				return;
			}

			return new BreakToken(node, offset);
		}

		findBreakToken(rendered, source, bounds, prevBreakToken, extract = true) {
			let overflow = this.findOverflow(rendered, bounds);
			let breakToken;
			let breakLetter;

			const overflowHooks = this.hooks.onOverflow.triggerSync(overflow, rendered, bounds, this);
			overflowHooks.forEach((newOverflow) => {
				if (typeof newOverflow !== "undefined") {
					overflow = newOverflow;
				}
			});

			if (overflow) {
				breakToken = this.createBreakToken(overflow, rendered, source);
				// breakToken is nullable
				const breakHooks = this.hooks.onBreakToken.triggerSync(breakToken, overflow, rendered, this);
				breakHooks.forEach((newToken) => {
					if (typeof newToken !== "undefined") {
						breakToken = newToken;
					}
				});

				// Stop removal if we are in a loop
				if (breakToken?.equals(prevBreakToken)) {
					return breakToken;
				}

				if (breakToken?.node && breakToken.offset && breakToken.node.textContent) {
					breakLetter = breakToken.node.textContent.charAt(breakToken.offset);
				} else {
					breakLetter = undefined;
				}

				if (breakToken?.node && extract) {
					const removed = this.removeOverflow(overflow, breakLetter);
					this.hooks?.afterOverflowRemoved.trigger(removed, rendered, this);
				}
			}
			return breakToken;
		}

		hasOverflow(element, bounds = this.bounds) {
			const constrainingElement = element?.parentNode; // this gets the element, instead of the wrapper for the width workaround
			const { width, height } = element.getBoundingClientRect();
			const scrollWidth = constrainingElement ? constrainingElement.scrollWidth : 0;
			const scrollHeight = constrainingElement ? constrainingElement.scrollHeight : 0;
			return (
				Math.max(Math.floor(width), scrollWidth) > Math.round(bounds.width) ||
				Math.max(Math.floor(height), scrollHeight) > Math.round(bounds.height)
			);
		}

		findOverflow(rendered, bounds = this.bounds, gap = this.gap) {
			if (!this.hasOverflow(rendered, bounds)) return;

			const start = Math.floor(bounds.left);
			const end = Math.round(bounds.right + gap);
			const vStart = Math.round(bounds.top);
			const vEnd = Math.round(bounds.bottom);
			let range;

			let walker = walk$2(rendered.firstChild, rendered);

			// Find Start
			let next;
			let done;
			let node;
			let offset;
			let skip;
			let breakAvoid;
			let prev;
			let br;
			while (!done) {
				next = walker.next();
				done = next.done;
				node = next.value;
				skip = false;
				breakAvoid = false;
				prev = undefined;
				br = undefined;

				if (node) {
					const pos = getBoundingClientRect(node);
					let left = Math.round(pos.left);
					const right = Math.floor(pos.right);
					let top = Math.round(pos.top);
					const bottom = Math.floor(pos.bottom);

					if (!range && (left >= end || top >= vEnd)) {
						// Check if it is a float
						let isFloat = false;

						// Check if the node is inside a break-inside: avoid table cell
						const insideTableCell = parentOf(node, "TD", rendered);
						if (insideTableCell && window.getComputedStyle(insideTableCell)["break-inside"] === "avoid") {
							// breaking inside a table cell produces unexpected result, as a workaround, we forcibly avoid break inside in a cell.
							// But we take the whole row, not just the cell that is causing the break.
							prev = insideTableCell.parentElement;
						} else if (isElement(node)) {
							const styles = window.getComputedStyle(node);
							isFloat = styles.getPropertyValue("float") !== "none";
							skip = styles.getPropertyValue("break-inside") === "avoid";
							breakAvoid = node.dataset.breakBefore === "avoid" || node.dataset.previousBreakAfter === "avoid";
							prev = breakAvoid && nodeBefore(node, rendered);
							br = node.tagName === "BR" || node.tagName === "WBR";
						}

						let tableRow;
						if (node.nodeName === "TR") {
							tableRow = node;
						} else {
							tableRow = parentOf(node, "TR", rendered);
						}
						if (tableRow) {
							// honor break-inside="avoid" in parent tbody/thead
							const container = tableRow.parentElement;
							if (["TBODY", "THEAD"].includes(container.nodeName)) {
								const styles = window.getComputedStyle(container);
								if (styles.getPropertyValue("break-inside") === "avoid") prev = container;
							}

							// Check if the node is inside a row with a rowspan
							const table = parentOf(tableRow, "TABLE", rendered);
							const rowspan = table.querySelector("[colspan]");
							if (table && rowspan) {
								let columnCount = 0;
								for (const cell of Array.from(table.rows[0].cells)) {
									columnCount += Number.parseInt(cell.getAttribute("colspan") || "1", 10);
								}
								if (tableRow.cells.length !== columnCount) {
									let previousRow = tableRow.previousElementSibling;
									let previousRowColumnCount;
									while (previousRow !== null) {
										previousRowColumnCount = 0;
										for (const cell of Array.from(previousRow.cells)) {
											previousRowColumnCount += Number.parseInt(cell.getAttribute("colspan") || "1", 10);
										}
										if (previousRowColumnCount === columnCount) {
											break;
										}
										previousRow = previousRow.previousElementSibling;
									}
									if (previousRowColumnCount === columnCount) {
										prev = previousRow;
									}
								}
							}
						}

						if (prev) {
							range = document.createRange();
							range.selectNode(prev);
							break;
						}

						if (!br && !isFloat && isElement(node)) {
							range = document.createRange();
							range.selectNode(node);
							break;
						}

						if (isText(node) && node.textContent.trim().length) {
							range = document.createRange();
							range.selectNode(node);
							break;
						}
					}

					if (
						!range &&
						isText(node) &&
						node.textContent.trim().length &&
						!breakInsideAvoidParentNode(node.parentNode)
					) {
						const rects = getClientRects(node);
						let rect;
						left = 0;
						top = 0;
						for (var i = 0; i !== rects.length; i++) {
							rect = rects[i];
							if (rect.width > 0 && (!left || rect.left > left)) {
								left = rect.left;
							}
							if (rect.height > 0 && (!top || rect.top > top)) {
								top = rect.top;
							}
						}

						if (left >= end || top >= vEnd) {
							range = document.createRange();
							offset = this.textBreak(node, start, end, vStart, vEnd);
							if (!offset) {
								range = undefined;
							} else {
								range.setStart(node, offset);
							}
							break;
						}
					}

					// Skip children
					if (skip || (right <= end && bottom <= vEnd)) {
						next = nodeAfter(node, rendered);
						if (next) {
							walker = walk$2(next, rendered);
						}
					}
				}
			}

			// Find End
			if (range) {
				range.setEndAfter(rendered.lastChild);
				return range;
			}
		}

		findEndToken(rendered, source) {
			if (rendered.childNodes.length === 0) {
				return;
			}

			let lastChild = rendered.lastChild;

			let lastNodeIndex;
			while (lastChild?.lastChild) {
				if (!validNode(lastChild)) {
					// Only get elements with refs
					lastChild = lastChild.previousSibling;
				} else if (!validNode(lastChild.lastChild)) {
					// Deal with invalid dom items
					lastChild = prevValidNode(lastChild.lastChild);
					break;
				} else {
					lastChild = lastChild.lastChild;
				}
			}

			if (isText(lastChild)) {
				if (lastChild.parentNode.dataset.ref) {
					lastNodeIndex = indexOf$2(lastChild);
					lastChild = lastChild.parentNode;
				} else {
					lastChild = lastChild.previousSibling;
				}
			}

			let original = findElement(lastChild, source);

			if (lastNodeIndex) {
				original = original.childNodes[lastNodeIndex];
			}

			const after = nodeAfter(original);

			return this.breakAt(after);
		}

		textBreak(node, _start, end, _vStart, vEnd) {
			const wordwalker = words(node);
			let left = 0;
			let right = 0;
			let top = 0;
			let bottom = 0;
			let word;
			let next;
			let done;
			let pos;
			let offset;
			while (!done) {
				next = wordwalker.next();
				word = next.value;
				done = next.done;

				if (!word) {
					break;
				}

				pos = getBoundingClientRect(word);

				left = Math.floor(pos.left);
				right = Math.floor(pos.right);
				top = Math.floor(pos.top);
				bottom = Math.floor(pos.bottom);

				if (left >= end || top >= vEnd) {
					offset = word.startOffset;
					break;
				}

				if (right > end || bottom > vEnd) {
					const letterwalker = letters(word);
					let letter;
					let nextLetter;
					let doneLetter;

					while (!doneLetter) {
						nextLetter = letterwalker.next();
						letter = nextLetter.value;
						doneLetter = nextLetter.done;

						if (!letter) {
							break;
						}

						pos = getBoundingClientRect(letter);
						left = Math.floor(pos.left);
						top = Math.floor(pos.top);

						if (left >= end || top >= vEnd) {
							offset = letter.startOffset;
							done = true;

							break;
						}
					}
				}
			}

			return offset;
		}

		removeOverflow(overflow, breakLetter) {
			const { startContainer } = overflow;
			const extracted = overflow.extractContents();

			this.hyphenateAtBreak(startContainer, breakLetter);

			return extracted;
		}

		hyphenateAtBreak(startContainer, breakLetter) {
			if (isText(startContainer)) {
				const startText = startContainer.textContent;
				const prevLetter = startText[startText.length - 1];

				// Add a hyphen if previous character is a letter or soft hyphen
				if (
					(breakLetter && /^\w|\u00AD$/.test(prevLetter) && /^\w|\u00AD$/.test(breakLetter)) ||
					(!breakLetter && /^\w|\u00AD$/.test(prevLetter))
				) {
					startContainer.parentNode.classList.add("pagedjs_hyphen");
					startContainer.textContent += this.settings.hyphenGlyph || "\u2011";
				}
			}
		}

		equalTokens(a, b) {
			if (!a || !b) {
				return false;
			}
			if (a.node && b.node && a.node !== b.node) {
				return false;
			}
			if (a.offset && b.offset && a.offset !== b.offset) {
				return false;
			}
			return true;
		}
	}

	EventEmitter(Layout.prototype);

	/**
	 * Render a page
	 * @class
	 */
	class Page {
		constructor(pagesArea, pageTemplate, blank, hooks, options) {
			this.pagesArea = pagesArea;
			this.pageTemplate = pageTemplate;
			this.blank = blank;

			this.width = undefined;
			this.height = undefined;

			this.hooks = hooks;

			this.settings = options || {};

			// this.element = this.create(this.pageTemplate);
		}

		create(_template, after) {
			//let documentFragment = document.createRange().createContextualFragment( TEMPLATE );
			//let page = documentFragment.children[0];
			const clone = document.importNode(this.pageTemplate.content, true);

			let page;
			let index;
			if (after) {
				this.pagesArea.insertBefore(clone, after.nextElementSibling);
				index = Array.prototype.indexOf.call(this.pagesArea.children, after.nextElementSibling);
				page = this.pagesArea.children[index];
			} else {
				this.pagesArea.appendChild(clone);
				page = this.pagesArea.lastChild;
			}

			const pagebox = page.querySelector(".pagedjs_pagebox");
			const area = page.querySelector(".pagedjs_page_content");
			const footnotesArea = page.querySelector(".pagedjs_footnote_area");

			const size = area.getBoundingClientRect();

			area.style.columnWidth = `${Math.round(size.width)}px`;
			area.style.columnGap =
				"calc(var(--pagedjs-margin-right) + var(--pagedjs-margin-left) + var(--pagedjs-bleed-right) + var(--pagedjs-bleed-left) + var(--pagedjs-column-gap-offset))";
			// area.style.overflow = "scroll";

			this.width = Math.round(size.width);
			this.height = Math.round(size.height);

			this.element = page;
			this.pagebox = pagebox;
			this.area = area;
			this.footnotesArea = footnotesArea;

			return page;
		}

		createWrapper() {
			const wrapper = document.createElement("div");

			this.area.appendChild(wrapper);

			this.wrapper = wrapper;

			return wrapper;
		}

		index(pgnum) {
			this.position = pgnum;

			const page = this.element;
			// let pagebox = this.pagebox;

			const index = pgnum + 1;

			const id = `page-${index}`;

			this.id = id;

			// page.dataset.pageNumber = index;

			page.dataset.pageNumber = index;
			page.setAttribute("id", id);

			if (this.name) {
				page.classList.add(`pagedjs_${this.name}_page`);
			}

			if (this.blank) {
				page.classList.add("pagedjs_blank_page");
			}

			if (pgnum === 0) {
				page.classList.add("pagedjs_first_page");
			}

			if (pgnum % 2 !== 1) {
				page.classList.remove("pagedjs_left_page");
				page.classList.add("pagedjs_right_page");
			} else {
				page.classList.remove("pagedjs_right_page");
				page.classList.add("pagedjs_left_page");
			}
		}

		/*
		size(width, height) {
			if (width === this.width && height === this.height) {
				return;
			}
			this.width = width;
			this.height = height;

			this.element.style.width = Math.round(width) + "px";
			this.element.style.height = Math.round(height) + "px";
			this.element.style.columnWidth = Math.round(width) + "px";
		}
		*/

		async layout(contents, breakToken, maxChars) {
			this.clear();

			this.startToken = breakToken;

			const settings = this.settings;
			if (!settings.maxChars && maxChars) {
				settings.maxChars = maxChars;
			}

			this.layoutMethod = new Layout(this.area, this.hooks, settings);

			const renderResult = await this.layoutMethod.renderTo(this.wrapper, contents, breakToken);
			const newBreakToken = renderResult.breakToken;

			this.addListeners(contents);

			this.endToken = newBreakToken;

			return newBreakToken;
		}

		async append(contents, breakToken) {
			if (!this.layoutMethod) {
				return this.layout(contents, breakToken);
			}

			const renderResult = await this.layoutMethod.renderTo(this.wrapper, contents, breakToken);
			const newBreakToken = renderResult.breakToken;

			this.endToken = newBreakToken;

			return newBreakToken;
		}

		getByParent(ref, entries) {
			let e;
			for (var i = 0; i < entries.length; i++) {
				e = entries[i];
				if (e.dataset.ref === ref) {
					return e;
				}
			}
		}

		onOverflow(func) {
			this._onOverflow = func;
		}

		onUnderflow(func) {
			this._onUnderflow = func;
		}

		clear() {
			this.removeListeners();
			this.wrapper?.remove();
			this.createWrapper();
		}

		addListeners(contents) {
			if (typeof ResizeObserver !== "undefined") {
				this.addResizeObserver(contents);
			} else {
				this._checkOverflowAfterResize = this.checkOverflowAfterResize.bind(this, contents);
				this.element.addEventListener("overflow", this._checkOverflowAfterResize, false);
				this.element.addEventListener("underflow", this._checkOverflowAfterResize, false);
			}
			// TODO: fall back to mutation observer?

			this._onScroll = function () {
				if (this.listening) {
					this.element.scrollLeft = 0;
				}
			}.bind(this);

			// Keep scroll left from changing
			this.element.addEventListener("scroll", this._onScroll);

			this.listening = true;

			return true;
		}

		removeListeners() {
			this.listening = false;

			if (typeof ResizeObserver !== "undefined" && this.ro) {
				this.ro.disconnect();
			} else if (this.element) {
				this.element.removeEventListener("overflow", this._checkOverflowAfterResize, false);
				this.element.removeEventListener("underflow", this._checkOverflowAfterResize, false);
			}

			this.element?.removeEventListener("scroll", this._onScroll);
		}

		addResizeObserver(contents) {
			const wrapper = this.wrapper;
			let prevHeight = wrapper.getBoundingClientRect().height;
			this.ro = new ResizeObserver((entries) => {
				if (!this.listening) {
					return;
				}
				requestAnimationFrame(() => {
					for (const entry of entries) {
						const cr = entry.contentRect;

						if (cr.height > prevHeight) {
							this.checkOverflowAfterResize(contents);
							prevHeight = wrapper.getBoundingClientRect().height;
						} else if (cr.height < prevHeight) {
							// TODO: calc line height && (prevHeight - cr.height) >= 22
							this.checkUnderflowAfterResize(contents);
							prevHeight = cr.height;
						}
					}
				});
			});

			this.ro.observe(wrapper);
		}

		checkOverflowAfterResize(contents) {
			if (!this.listening || !this.layoutMethod) {
				return;
			}

			const newBreakToken = this.layoutMethod.findBreakToken(this.wrapper, contents, this.startToken);

			if (newBreakToken) {
				this.endToken = newBreakToken;
				this._onOverflow?.(newBreakToken);
			}
		}

		checkUnderflowAfterResize(contents) {
			if (!this.listening || !this.layoutMethod) {
				return;
			}

			const endToken = this.layoutMethod.findEndToken(this.wrapper, contents);

			if (endToken) {
				this._onUnderflow?.(endToken);
			}
		}

		destroy() {
			this.removeListeners();

			this.element.remove();

			this.element = undefined;
			this.wrapper = undefined;
		}
	}

	EventEmitter(Page.prototype);

	/**
	 * Render a flow of text offscreen
	 * @class
	 */
	class ContentParser {
		constructor(content, _cb) {
			if (content?.nodeType) {
				// handle dom
				this.dom = this.add(content);
			} else if (typeof content === "string") {
				this.dom = this.parse(content);
			}

			return this.dom;
		}

		parse(markup, _mime) {
			const range = document.createRange();
			const fragment = range.createContextualFragment(markup);

			this.addRefs(fragment);

			return fragment;
		}

		add(contents) {
			// let fragment = document.createDocumentFragment();
			//
			// let children = [...contents.childNodes];
			// for (let child of children) {
			// 	let clone = child.cloneNode(true);
			// 	fragment.appendChild(clone);
			// }

			this.addRefs(contents);

			return contents;
		}

		addRefs(content) {
			var treeWalker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT, null, false);

			let node = treeWalker.nextNode();
			while (node) {
				if (!node.hasAttribute("data-ref")) {
					const uuid = UUID();
					node.setAttribute("data-ref", uuid);
				}

				if (node.id) {
					node.setAttribute("data-id", node.id);
				}

				// node.setAttribute("data-children", node.childNodes.length);

				// node.setAttribute("data-text", node.textContent.trim().length);
				node = treeWalker.nextNode();
			}
		}

		find(ref) {
			return this.refs[ref];
		}

		destroy() {
			this.refs = undefined;
			this.dom = undefined;
		}
	}

	/**
	 * Queue for handling tasks one at a time
	 * @class
	 * @param {scope} context what this will resolve to in the tasks
	 */
	class Queue {
		constructor(context) {
			this._q = [];
			this.context = context;
			this.tick = requestAnimationFrame;
			this.running = false;
			this.paused = false;
		}

		/**
		 * Add an item to the queue
		 * @return {Promise} enqueued
		 */
		enqueue() {
			var deferred;
			var promise;
			var queued;
			var task = [].shift.call(arguments);
			var args = arguments;

			// Handle single args without context
			// if(args && !Array.isArray(args)) {
			//   args = [args];
			// }
			if (!task) {
				throw new Error("No Task Provided");
			}

			if (typeof task === "function") {
				deferred = new defer();
				promise = deferred.promise;

				queued = {
					task: task,
					args: args,
					//"context"  : context,
					deferred: deferred,
					promise: promise,
				};
			} else {
				// Task is a promise
				queued = {
					promise: task,
				};
			}

			this._q.push(queued);

			// Wait to start queue flush
			if (this.paused === false && !this.running) {
				this.run();
			}

			return queued.promise;
		}

		/**
		 * Run one item
		 * @return {Promise} dequeued
		 */
		dequeue() {
			var inwait;
			var task;
			var result;

			if (this._q.length && !this.paused) {
				inwait = this._q.shift();
				task = inwait.task;
				if (task) {
					// console.log(task)

					result = task.apply(this.context, inwait.args);

					if (result && typeof result.then === "function") {
						// Task is a function that returns a promise
						return result.then(
							function () {
								inwait.deferred.resolve.apply(this.context, arguments);
							}.bind(this),
							function () {
								inwait.deferred.reject.apply(this.context, arguments);
							}.bind(this),
						);
					}
					// Task resolves immediately
					inwait.deferred.resolve.apply(this.context, result);
					return inwait.promise;
				}
				if (inwait.promise) {
					// Task is a promise
					return inwait.promise;
				}
			} else {
				inwait = new defer();
				inwait.deferred.resolve();
				return inwait.promise;
			}
		}

		// Run All Immediately
		dump() {
			while (this._q.length) {
				this.dequeue();
			}
		}

		/**
		 * Run all tasks sequentially, at convince
		 * @return {Promise} all run
		 */
		run() {
			if (!this.running) {
				this.running = true;
				this.defered = new defer();
			}

			this.tick.call(window, () => {
				if (this._q.length) {
					this.dequeue().then(
						function () {
							this.run();
						}.bind(this),
					);
				} else {
					this.defered.resolve();
					this.running = undefined;
				}
			});

			// Unpause
			if (this.paused === true) {
				this.paused = false;
			}

			return this.defered.promise;
		}

		/**
		 * Flush all, as quickly as possible
		 * @return {Promise} ran
		 */
		flush() {
			if (this.running) {
				return this.running;
			}

			if (this._q.length) {
				this.running = this.dequeue().then(
					function () {
						this.running = undefined;
						return this.flush();
					}.bind(this),
				);

				return this.running;
			}
		}

		/**
		 * Clear all items in wait
		 * @return {void}
		 */
		clear() {
			this._q = [];
		}

		/**
		 * Get the number of tasks in the queue
		 * @return {number} tasks
		 */
		length() {
			return this._q.length;
		}

		/**
		 * Pause a running queue
		 * @return {void}
		 */
		pause() {
			this.paused = true;
		}

		/**
		 * End the queue
		 * @return {void}
		 */
		stop() {
			this._q = [];
			this.running = false;
			this.paused = true;
		}
	}

	const TEMPLATE = `
<div class="pagedjs_page">
	<div class="pagedjs_sheet">
		<div class="pagedjs_bleed pagedjs_bleed-top">
			<div class="pagedjs_marks-crop"></div>
			<div class="pagedjs_marks-middle">
				<div class="pagedjs_marks-cross"></div>
			</div>
			<div class="pagedjs_marks-crop"></div>
		</div>
		<div class="pagedjs_bleed pagedjs_bleed-bottom">
			<div class="pagedjs_marks-crop"></div>
			<div class="pagedjs_marks-middle">
				<div class="pagedjs_marks-cross"></div>
			</div>		<div class="pagedjs_marks-crop"></div>
		</div>
		<div class="pagedjs_bleed pagedjs_bleed-left">
			<div class="pagedjs_marks-crop"></div>
			<div class="pagedjs_marks-middle">
				<div class="pagedjs_marks-cross"></div>
			</div>		<div class="pagedjs_marks-crop"></div>
		</div>
		<div class="pagedjs_bleed pagedjs_bleed-right">
			<div class="pagedjs_marks-crop"></div>
			<div class="pagedjs_marks-middle">
				<div class="pagedjs_marks-cross"></div>
			</div>
			<div class="pagedjs_marks-crop"></div>
		</div>
		<div class="pagedjs_pagebox">
			<div class="pagedjs_margin-top-left-corner-holder">
				<div class="pagedjs_margin pagedjs_margin-top-left-corner"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-top">
				<div class="pagedjs_margin pagedjs_margin-top-left"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-top-center"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-top-right"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-top-right-corner-holder">
				<div class="pagedjs_margin pagedjs_margin-top-right-corner"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-right">
				<div class="pagedjs_margin pagedjs_margin-right-top"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-right-middle"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-right-bottom"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-left">
				<div class="pagedjs_margin pagedjs_margin-left-top"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-left-middle"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-left-bottom"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-bottom-left-corner-holder">
				<div class="pagedjs_margin pagedjs_margin-bottom-left-corner"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-bottom">
				<div class="pagedjs_margin pagedjs_margin-bottom-left"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-bottom-center"><div class="pagedjs_margin-content"></div></div>
				<div class="pagedjs_margin pagedjs_margin-bottom-right"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_margin-bottom-right-corner-holder">
				<div class="pagedjs_margin pagedjs_margin-bottom-right-corner"><div class="pagedjs_margin-content"></div></div>
			</div>
			<div class="pagedjs_area">
				<div class="pagedjs_page_content"></div>
				<div class="pagedjs_footnote_area">
					<div class="pagedjs_footnote_content pagedjs_footnote_empty">
						<div class="pagedjs_footnote_inner_content"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>`;

	/**
	 * Chop up text into flows
	 * @class
	 */
	class Chunker {
		constructor(content, renderTo, options) {
			// this.preview = preview;

			this.settings = options || {};

			this.hooks = {};
			this.hooks.beforeParsed = new Hook(this);
			this.hooks.filter = new Hook(this);
			this.hooks.afterParsed = new Hook(this);
			this.hooks.beforePageLayout = new Hook(this);
			this.hooks.onPageLayout = new Hook(this);
			this.hooks.layout = new Hook(this);
			this.hooks.renderNode = new Hook(this);
			this.hooks.layoutNode = new Hook(this);
			this.hooks.onOverflow = new Hook(this);
			this.hooks.afterOverflowRemoved = new Hook(this);
			this.hooks.onBreakToken = new Hook();
			this.hooks.beforeRenderResult = new Hook(this);
			this.hooks.afterPageLayout = new Hook(this);
			this.hooks.finalizePage = new Hook(this);
			this.hooks.afterRendered = new Hook(this);

			this.pages = [];
			this.total = 0;

			this.q = new Queue(this);
			this.stopped = false;
			this.rendered = false;

			this.content = content;

			this.charsPerBreak = [];
			this.maxChars;

			if (content) {
				this.flow(content, renderTo);
			}
		}

		setup(renderTo) {
			this.pagesArea = document.createElement("div");
			this.pagesArea.classList.add("pagedjs_pages");

			if (renderTo) {
				renderTo.appendChild(this.pagesArea);
			} else {
				document.querySelector("body").appendChild(this.pagesArea);
			}

			this.pageTemplate = document.createElement("template");
			this.pageTemplate.innerHTML = TEMPLATE;
		}

		async flow(content, renderTo) {
			let parsed;

			await this.hooks.beforeParsed.trigger(content, this);

			parsed = new ContentParser(content);

			this.hooks.filter.triggerSync(parsed);

			this.source = parsed;
			this.breakToken = undefined;

			if (this.pagesArea && this.pageTemplate) {
				this.q.clear();
				this.removePages();
			} else {
				this.setup(renderTo);
			}

			this.emit("rendering", parsed);

			await this.hooks.afterParsed.trigger(parsed, this);

			await this.loadFonts();

			let rendered = await this.render(parsed, this.breakToken);
			while (rendered.canceled) {
				this.start();
				rendered = await this.render(parsed, this.breakToken);
			}

			this.rendered = true;
			this.pagesArea.style.setProperty("--pagedjs-page-count", this.total);

			await this.hooks.afterRendered.trigger(this.pages, this);

			this.emit("rendered", this.pages);

			return this;
		}

		// oversetPages() {
		// 	let overset = [];
		// 	for (let i = 0; i < this.pages.length; i++) {
		// 		let page = this.pages[i];
		// 		if (page.overset) {
		// 			overset.push(page);
		// 			// page.overset = false;
		// 		}
		// 	}
		// 	return overset;
		// }
		//
		// async handleOverset(parsed) {
		// 	let overset = this.oversetPages();
		// 	if (overset.length) {
		// 		console.log("overset", overset);
		// 		let index = this.pages.indexOf(overset[0]) + 1;
		// 		console.log("INDEX", index);
		//
		// 		// Remove pages
		// 		// this.removePages(index);
		//
		// 		// await this.render(parsed, overset[0].overset);
		//
		// 		// return this.handleOverset(parsed);
		// 	}
		// }

		async render(parsed, startAt) {
			const renderer = this.layout(parsed, startAt);

			let done = false;
			let result;
			while (!done) {
				result = await this.q.enqueue(() => {
					return this.renderAsync(renderer);
				});
				done = result.done;
			}

			return result;
		}

		start() {
			this.rendered = false;
			this.stopped = false;
		}

		stop() {
			this.stopped = true;
			// this.q.clear();
		}

		renderOnIdle(renderer) {
			return new Promise((resolve) => {
				requestIdleCallback(async () => {
					if (this.stopped) {
						return resolve({ done: true, canceled: true });
					}
					const result = await renderer.next();
					if (this.stopped) {
						resolve({ done: true, canceled: true });
					} else {
						resolve(result);
					}
				});
			});
		}

		async renderAsync(renderer) {
			if (this.stopped) {
				return { done: true, canceled: true };
			}
			const result = await renderer.next();
			if (this.stopped) {
				return { done: true, canceled: true };
			}
			return result;
		}

		async handleBreaks(node, force) {
			const currentPage = this.total + 1;
			const currentPosition = currentPage % 2 === 0 ? "left" : "right";
			// TODO: Recto and Verso should reverse for rtl languages
			const currentSide = currentPage % 2 === 0 ? "verso" : "recto";
			let previousBreakAfter;
			let breakBefore;
			let page;

			if (currentPage === 1) {
				return;
			}

			if (node && typeof node.dataset !== "undefined" && typeof node.dataset.previousBreakAfter !== "undefined") {
				previousBreakAfter = node.dataset.previousBreakAfter;
			}

			if (node && typeof node.dataset !== "undefined" && typeof node.dataset.breakBefore !== "undefined") {
				breakBefore = node.dataset.breakBefore;
			}

			if (force) {
				page = this.addPage(true);
			} else if (
				previousBreakAfter &&
				(previousBreakAfter === "left" || previousBreakAfter === "right") &&
				previousBreakAfter !== currentPosition
			) {
				page = this.addPage(true);
			} else if (
				previousBreakAfter &&
				(previousBreakAfter === "verso" || previousBreakAfter === "recto") &&
				previousBreakAfter !== currentSide
			) {
				page = this.addPage(true);
			} else if (
				breakBefore &&
				(breakBefore === "left" || breakBefore === "right") &&
				breakBefore !== currentPosition
			) {
				page = this.addPage(true);
			} else if (breakBefore && (breakBefore === "verso" || breakBefore === "recto") && breakBefore !== currentSide) {
				page = this.addPage(true);
			}

			if (page) {
				await this.hooks.beforePageLayout.trigger(page, undefined, undefined, this);
				this.emit("page", page);
				// await this.hooks.layout.trigger(page.element, page, undefined, this);
				await this.hooks.afterPageLayout.trigger(page.element, page, undefined, this);
				await this.hooks.finalizePage.trigger(page.element, page, undefined, this);
				this.emit("renderedPage", page);
			}
		}

		async *layout(content, startAt) {
			let breakToken = startAt || false;
			const tokens = [];

			while (breakToken !== undefined && true) {
				if (breakToken?.node) {
					await this.handleBreaks(breakToken.node);
				} else {
					await this.handleBreaks(content.firstChild);
				}

				const page = this.addPage();

				await this.hooks.beforePageLayout.trigger(page, content, breakToken, this);
				this.emit("page", page);

				// Layout content in the page, starting from the breakToken
				breakToken = await page.layout(content, breakToken, this.maxChars);

				if (breakToken) {
					const newToken = breakToken.toJSON(true);
					if (tokens.lastIndexOf(newToken) > -1) {
						// loop
						const err = new OverflowContentError("Layout repeated", [breakToken.node]);
						console.error("Layout repeated at: ", breakToken.node);
						return err;
					}
					tokens.push(newToken);
				}

				await this.hooks.afterPageLayout.trigger(page.element, page, breakToken, this);
				await this.hooks.finalizePage.trigger(page.element, page, undefined, this);
				this.emit("renderedPage", page);

				this.recoredCharLength(page.wrapper.textContent.length);

				yield breakToken;

				// Stop if we get undefined, showing we have reached the end of the content
			}
		}

		recoredCharLength(length) {
			if (length === 0) {
				return;
			}

			this.charsPerBreak.push(length);

			// Keep the length of the last few breaks
			if (this.charsPerBreak.length > 4) {
				this.charsPerBreak.shift();
			}

			this.maxChars = this.charsPerBreak.reduce((a, b) => a + b, 0) / this.charsPerBreak.length;
		}

		removePages(fromIndex = 0) {
			if (fromIndex >= this.pages.length) {
				return;
			}

			// Remove pages
			for (let i = fromIndex; i < this.pages.length; i++) {
				this.pages[i].destroy();
			}

			if (fromIndex > 0) {
				this.pages.splice(fromIndex);
			} else {
				this.pages = [];
			}

			this.total = this.pages.length;
		}

		addPage(blank) {
			const lastPage = this.pages[this.pages.length - 1];
			// Create a new page from the template
			const page = new Page(this.pagesArea, this.pageTemplate, blank, this.hooks, this.settings);

			this.pages.push(page);

			// Create the pages
			page.create(undefined, lastPage?.element);

			page.index(this.total);

			if (!blank) {
				// Listen for page overflow
				page.onOverflow((overflowToken) => {
					console.warn("overflow on", page.id, overflowToken);

					// Only reflow while rendering
					if (this.rendered) {
						return;
					}

					const index = this.pages.indexOf(page) + 1;

					// Stop the rendering
					this.stop();

					// Set the breakToken to resume at
					this.breakToken = overflowToken;

					// Remove pages
					this.removePages(index);

					if (this.rendered === true) {
						this.rendered = false;

						this.q.enqueue(async () => {
							this.start();

							await this.render(this.source, this.breakToken);

							this.rendered = true;
						});
					}
				});

				page.onUnderflow((_overflowToken) => {
					// console.log("underflow on", page.id, overflowToken);
					// page.append(this.source, overflowToken);
				});
			}

			this.total = this.pages.length;

			return page;
		}
		/*
		insertPage(index, blank) {
			let lastPage = this.pages[index];
			// Create a new page from the template
			let page = new Page(this.pagesArea, this.pageTemplate, blank, this.hooks);

			let total = this.pages.splice(index, 0, page);

			// Create the pages
			page.create(undefined, lastPage && lastPage.element);

			page.index(index + 1);

			for (let i = index + 2; i < this.pages.length; i++) {
				this.pages[i].index(i);
			}

			if (!blank) {
				// Listen for page overflow
				page.onOverflow((overflowToken) => {
					if (total < this.pages.length) {
						this.pages[total].layout(this.source, overflowToken);
					} else {
						let newPage = this.addPage();
						newPage.layout(this.source, overflowToken);
					}
				});

				page.onUnderflow(() => {
					// console.log("underflow on", page.id);
				});
			}

			this.total += 1;

			return page;
		}
		*/

		async clonePage(originalPage) {
			const lastPage = this.pages[this.pages.length - 1];

			const page = new Page(this.pagesArea, this.pageTemplate, false, this.hooks);

			this.pages.push(page);

			// Create the pages
			page.create(undefined, lastPage?.element);

			page.index(this.total);

			await this.hooks.beforePageLayout.trigger(page, undefined, undefined, this);
			this.emit("page", page);

			for (const className of originalPage.element.classList) {
				if (className !== "pagedjs_left_page" && className !== "pagedjs_right_page") {
					page.element.classList.add(className);
				}
			}

			await this.hooks.afterPageLayout.trigger(page.element, page, undefined, this);
			await this.hooks.finalizePage.trigger(page.element, page, undefined, this);
			this.emit("renderedPage", page);
		}

		loadFonts() {
			const fontPromises = [];
			(document.fonts || []).forEach((fontFace) => {
				if (fontFace.status !== "loaded") {
					const fontLoaded = fontFace.load().then(
						(_r) => {
							return fontFace.family;
						},
						(_r) => {
							console.warn("Failed to preload font-family:", fontFace.family);
							return fontFace.family;
						},
					);
					fontPromises.push(fontLoaded);
				}
			});
			return Promise.all(fontPromises).catch((err) => {
				console.warn(err);
			});
		}

		destroy() {
			this.pagesArea.remove();
			this.pageTemplate.remove();
		}
	}

	EventEmitter(Chunker.prototype);

	var syntax = { exports: {} };

	var create$4 = {};

	//
	//                              list
	//                            ┌──────┐
	//             ┌──────────────┼─head │
	//             │              │ tail─┼──────────────┐
	//             │              └──────┘              │
	//             ▼                                    ▼
	//            item        item        item        item
	//          ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
	//  null ◀──┼─prev │◀───┼─prev │◀───┼─prev │◀───┼─prev │
	//          │ next─┼───▶│ next─┼───▶│ next─┼───▶│ next─┼──▶ null
	//          ├──────┤    ├──────┤    ├──────┤    ├──────┤
	//          │ data │    │ data │    │ data │    │ data │
	//          └──────┘    └──────┘    └──────┘    └──────┘
	//

	function createItem(data) {
		return {
			prev: null,
			next: null,
			data: data,
		};
	}

	function allocateCursor(node, prev, next) {
		var cursor;

		if (cursors !== null) {
			cursor = cursors;
			cursors = cursors.cursor;
			cursor.prev = prev;
			cursor.next = next;
			cursor.cursor = node.cursor;
		} else {
			cursor = {
				prev: prev,
				next: next,
				cursor: node.cursor,
			};
		}

		node.cursor = cursor;

		return cursor;
	}

	function releaseCursor(node) {
		var cursor = node.cursor;

		node.cursor = cursor.cursor;
		cursor.prev = null;
		cursor.next = null;
		cursor.cursor = cursors;
		cursors = cursor;
	}

	var cursors = null;
	var List$6 = function () {
		this.cursor = null;
		this.head = null;
		this.tail = null;
	};

	List$6.createItem = createItem;
	List$6.prototype.createItem = createItem;

	List$6.prototype.updateCursors = function (prevOld, prevNew, nextOld, nextNew) {
		var cursor = this.cursor;

		while (cursor !== null) {
			if (cursor.prev === prevOld) {
				cursor.prev = prevNew;
			}

			if (cursor.next === nextOld) {
				cursor.next = nextNew;
			}

			cursor = cursor.cursor;
		}
	};

	List$6.prototype.getSize = function () {
		var size = 0;
		var cursor = this.head;

		while (cursor) {
			size++;
			cursor = cursor.next;
		}

		return size;
	};

	List$6.prototype.fromArray = function (array) {
		var cursor = null;

		this.head = null;

		for (var i = 0; i < array.length; i++) {
			var item = createItem(array[i]);

			if (cursor !== null) {
				cursor.next = item;
			} else {
				this.head = item;
			}

			item.prev = cursor;
			cursor = item;
		}

		this.tail = cursor;

		return this;
	};

	List$6.prototype.toArray = function () {
		var cursor = this.head;
		var result = [];

		while (cursor) {
			result.push(cursor.data);
			cursor = cursor.next;
		}

		return result;
	};

	List$6.prototype.toJSON = List$6.prototype.toArray;

	List$6.prototype.isEmpty = function () {
		return this.head === null;
	};

	List$6.prototype.first = function () {
		return this.head?.data;
	};

	List$6.prototype.last = function () {
		return this.tail?.data;
	};

	List$6.prototype.each = function (fn, context) {
		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, null, this.head);

		while (cursor.next !== null) {
			item = cursor.next;
			cursor.next = item.next;

			fn.call(context, item.data, item, this);
		}

		// pop cursor
		releaseCursor(this);
	};

	List$6.prototype.forEach = List$6.prototype.each;

	List$6.prototype.eachRight = function (fn, context) {
		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, this.tail, null);

		while (cursor.prev !== null) {
			item = cursor.prev;
			cursor.prev = item.prev;

			fn.call(context, item.data, item, this);
		}

		// pop cursor
		releaseCursor(this);
	};

	List$6.prototype.forEachRight = List$6.prototype.eachRight;

	List$6.prototype.reduce = function (fn, initialValue, context) {
		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, null, this.head);
		var acc = initialValue;

		while (cursor.next !== null) {
			item = cursor.next;
			cursor.next = item.next;

			acc = fn.call(context, acc, item.data, item, this);
		}

		// pop cursor
		releaseCursor(this);

		return acc;
	};

	List$6.prototype.reduceRight = function (fn, initialValue, context) {
		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, this.tail, null);
		var acc = initialValue;

		while (cursor.prev !== null) {
			item = cursor.prev;
			cursor.prev = item.prev;

			acc = fn.call(context, acc, item.data, item, this);
		}

		// pop cursor
		releaseCursor(this);

		return acc;
	};

	List$6.prototype.nextUntil = function (start, fn, context) {
		if (start === null) {
			return;
		}

		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, null, start);

		while (cursor.next !== null) {
			item = cursor.next;
			cursor.next = item.next;

			if (fn.call(context, item.data, item, this)) {
				break;
			}
		}

		// pop cursor
		releaseCursor(this);
	};

	List$6.prototype.prevUntil = function (start, fn, context) {
		if (start === null) {
			return;
		}

		var item;

		if (context === undefined) {
			context = this;
		}

		// push cursor
		var cursor = allocateCursor(this, start, null);

		while (cursor.prev !== null) {
			item = cursor.prev;
			cursor.prev = item.prev;

			if (fn.call(context, item.data, item, this)) {
				break;
			}
		}

		// pop cursor
		releaseCursor(this);
	};

	List$6.prototype.some = function (fn, context) {
		var cursor = this.head;

		if (context === undefined) {
			context = this;
		}

		while (cursor !== null) {
			if (fn.call(context, cursor.data, cursor, this)) {
				return true;
			}

			cursor = cursor.next;
		}

		return false;
	};

	List$6.prototype.map = function (fn, context) {
		var result = new List$6();
		var cursor = this.head;

		if (context === undefined) {
			context = this;
		}

		while (cursor !== null) {
			result.appendData(fn.call(context, cursor.data, cursor, this));
			cursor = cursor.next;
		}

		return result;
	};

	List$6.prototype.filter = function (fn, context) {
		var result = new List$6();
		var cursor = this.head;

		if (context === undefined) {
			context = this;
		}

		while (cursor !== null) {
			if (fn.call(context, cursor.data, cursor, this)) {
				result.appendData(cursor.data);
			}
			cursor = cursor.next;
		}

		return result;
	};

	List$6.prototype.clear = function () {
		this.head = null;
		this.tail = null;
	};

	List$6.prototype.copy = function () {
		var result = new List$6();
		var cursor = this.head;

		while (cursor !== null) {
			result.insert(createItem(cursor.data));
			cursor = cursor.next;
		}

		return result;
	};

	List$6.prototype.prepend = function (item) {
		//      head
		//    ^
		// item
		this.updateCursors(null, item, this.head, item);

		// insert to the beginning of the list
		if (this.head !== null) {
			// new item <- first item
			this.head.prev = item;

			// new item -> first item
			item.next = this.head;
		} else {
			// if list has no head, then it also has no tail
			// in this case tail points to the new item
			this.tail = item;
		}

		// head always points to new item
		this.head = item;

		return this;
	};

	List$6.prototype.prependData = function (data) {
		return this.prepend(createItem(data));
	};

	List$6.prototype.append = function (item) {
		return this.insert(item);
	};

	List$6.prototype.appendData = function (data) {
		return this.insert(createItem(data));
	};

	List$6.prototype.insert = function (item, before) {
		if (before !== undefined && before !== null) {
			// prev   before
			//      ^
			//     item
			this.updateCursors(before.prev, item, before, item);

			if (before.prev === null) {
				// insert to the beginning of list
				if (this.head !== before) {
					throw new Error("before doesn't belong to list");
				}

				// since head points to before therefore list doesn't empty
				// no need to check tail
				this.head = item;
				before.prev = item;
				item.next = before;

				this.updateCursors(null, item);
			} else {
				// insert between two items
				before.prev.next = item;
				item.prev = before.prev;

				before.prev = item;
				item.next = before;
			}
		} else {
			// tail
			//      ^
			//      item
			this.updateCursors(this.tail, item, null, item);

			// insert to the ending of the list
			if (this.tail !== null) {
				// last item -> new item
				this.tail.next = item;

				// last item <- new item
				item.prev = this.tail;
			} else {
				// if list has no tail, then it also has no head
				// in this case head points to new item
				this.head = item;
			}

			// tail always points to new item
			this.tail = item;
		}

		return this;
	};

	List$6.prototype.insertData = function (data, before) {
		return this.insert(createItem(data), before);
	};

	List$6.prototype.remove = function (item) {
		//      item
		//       ^
		// prev     next
		this.updateCursors(item, item.prev, item, item.next);

		if (item.prev !== null) {
			item.prev.next = item.next;
		} else {
			if (this.head !== item) {
				throw new Error("item doesn't belong to list");
			}

			this.head = item.next;
		}

		if (item.next !== null) {
			item.next.prev = item.prev;
		} else {
			if (this.tail !== item) {
				throw new Error("item doesn't belong to list");
			}

			this.tail = item.prev;
		}

		item.prev = null;
		item.next = null;

		return item;
	};

	List$6.prototype.push = function (data) {
		this.insert(createItem(data));
	};

	List$6.prototype.pop = function () {
		if (this.tail !== null) {
			return this.remove(this.tail);
		}
	};

	List$6.prototype.unshift = function (data) {
		this.prepend(createItem(data));
	};

	List$6.prototype.shift = function () {
		if (this.head !== null) {
			return this.remove(this.head);
		}
	};

	List$6.prototype.prependList = function (list) {
		return this.insertList(list, this.head);
	};

	List$6.prototype.appendList = function (list) {
		return this.insertList(list);
	};

	List$6.prototype.insertList = function (list, before) {
		// ignore empty lists
		if (list.head === null) {
			return this;
		}

		if (before !== undefined && before !== null) {
			this.updateCursors(before.prev, list.tail, before, list.head);

			// insert in the middle of dist list
			if (before.prev !== null) {
				// before.prev <-> list.head
				before.prev.next = list.head;
				list.head.prev = before.prev;
			} else {
				this.head = list.head;
			}

			before.prev = list.tail;
			list.tail.next = before;
		} else {
			this.updateCursors(this.tail, list.tail, null, list.head);

			// insert to end of the list
			if (this.tail !== null) {
				// if destination list has a tail, then it also has a head,
				// but head doesn't change

				// dest tail -> source head
				this.tail.next = list.head;

				// dest tail <- source head
				list.head.prev = this.tail;
			} else {
				// if list has no a tail, then it also has no a head
				// in this case points head to new item
				this.head = list.head;
			}

			// tail always start point to new item
			this.tail = list.tail;
		}

		list.head = null;
		list.tail = null;

		return this;
	};

	List$6.prototype.replace = function (oldItem, newItemOrList) {
		if ("head" in newItemOrList) {
			this.insertList(newItemOrList, oldItem);
		} else {
			this.insert(newItemOrList, oldItem);
		}

		this.remove(oldItem);
	};

	var List_1 = List$6;

	var createCustomError$3 = function createCustomError(name, message) {
		// use Object.create(), because some VMs prevent setting line/column otherwise
		// (iOS Safari 10 even throws an exception)
		var error = Object.create(SyntaxError.prototype);
		var errorStack = new Error();

		error.name = name;
		error.message = message;

		Object.defineProperty(error, "stack", {
			get: () => (errorStack.stack || "").replace(/^(.+\n){1,3}/, `${name}: ${message}\n`),
		});

		return error;
	};

	var createCustomError$2 = createCustomError$3;
	var MAX_LINE_LENGTH = 100;
	var OFFSET_CORRECTION = 60;
	var TAB_REPLACEMENT = "    ";

	function sourceFragment(error, extraLines) {
		function processLines(start, end) {
			return lines
				.slice(start, end)
				.map((line, idx) => {
					var num = String(start + idx + 1);

					while (num.length < maxNumLength) {
						num = ` ${num}`;
					}

					return `${num} |${line}`;
				})
				.join("\n");
		}

		var lines = error.source.split(/\r\n?|\n|\f/);
		var line = error.line;
		var column = error.column;
		var startLine = Math.max(1, line - extraLines) - 1;
		var endLine = Math.min(line + extraLines, lines.length + 1);
		var maxNumLength = Math.max(4, String(endLine).length) + 1;
		var cutLeft = 0;

		// column correction according to replaced tab before column
		column += (TAB_REPLACEMENT.length - 1) * (lines[line - 1].substr(0, column - 1).match(/\t/g) || []).length;

		if (column > MAX_LINE_LENGTH) {
			cutLeft = column - OFFSET_CORRECTION + 3;
			column = OFFSET_CORRECTION - 2;
		}

		for (var i = startLine; i <= endLine; i++) {
			if (i >= 0 && i < lines.length) {
				lines[i] = lines[i].replace(/\t/g, TAB_REPLACEMENT);
				lines[i] =
					(cutLeft > 0 && lines[i].length > cutLeft ? "\u2026" : "") +
					lines[i].substr(cutLeft, MAX_LINE_LENGTH - 2) +
					(lines[i].length > cutLeft + MAX_LINE_LENGTH - 1 ? "\u2026" : "");
			}
		}

		return [
			processLines(startLine, line),
			`${new Array(column + maxNumLength + 2).join("-")}^`,
			processLines(line, endLine),
		]
			.filter(Boolean)
			.join("\n");
	}

	var SyntaxError$4 = (message, source, offset, line, column) => {
		var error = createCustomError$2("SyntaxError", message);

		error.source = source;
		error.offset = offset;
		error.line = line;
		error.column = column;

		error.sourceFragment = (extraLines) => sourceFragment(error, Number.isNaN(extraLines) ? 0 : extraLines);
		Object.defineProperty(error, "formattedMessage", {
			get: () => "Parse error: " + error.message + "\n" + sourceFragment(error, 2),
		});

		// for backward capability
		error.parseError = {
			offset: offset,
			line: line,
			column: column,
		};

		return error;
	};

	var _SyntaxError$1 = SyntaxError$4;

	// CSS Syntax Module Level 3
	// https://www.w3.org/TR/css-syntax-3/
	var TYPE$H = {
		EOF: 0, // <EOF-token>
		Ident: 1, // <ident-token>
		Function: 2, // <function-token>
		AtKeyword: 3, // <at-keyword-token>
		Hash: 4, // <hash-token>
		String: 5, // <string-token>
		BadString: 6, // <bad-string-token>
		Url: 7, // <url-token>
		BadUrl: 8, // <bad-url-token>
		Delim: 9, // <delim-token>
		Number: 10, // <number-token>
		Percentage: 11, // <percentage-token>
		Dimension: 12, // <dimension-token>
		WhiteSpace: 13, // <whitespace-token>
		CDO: 14, // <CDO-token>
		CDC: 15, // <CDC-token>
		Colon: 16, // <colon-token>     :
		Semicolon: 17, // <semicolon-token> ;
		Comma: 18, // <comma-token>     ,
		LeftSquareBracket: 19, // <[-token>
		RightSquareBracket: 20, // <]-token>
		LeftParenthesis: 21, // <(-token>
		RightParenthesis: 22, // <)-token>
		LeftCurlyBracket: 23, // <{-token>
		RightCurlyBracket: 24, // <}-token>
		Comment: 25,
	};

	var NAME$3 = Object.keys(TYPE$H).reduce((result, key) => {
		result[TYPE$H[key]] = key;
		return result;
	}, {});

	var _const = {
		TYPE: TYPE$H,
		NAME: NAME$3,
	};

	var EOF$1 = 0;

	// https://drafts.csswg.org/css-syntax-3/
	// § 4.2. Definitions

	// digit
	// A code point between U+0030 DIGIT ZERO (0) and U+0039 DIGIT NINE (9).
	function isDigit$5(code) {
		return code >= 0x0030 && code <= 0x0039;
	}

	// hex digit
	// A digit, or a code point between U+0041 LATIN CAPITAL LETTER A (A) and U+0046 LATIN CAPITAL LETTER F (F),
	// or a code point between U+0061 LATIN SMALL LETTER A (a) and U+0066 LATIN SMALL LETTER F (f).
	function isHexDigit$4(code) {
		return (
			isDigit$5(code) || // 0 .. 9
			(code >= 0x0041 && code <= 0x0046) || // A .. F
			(code >= 0x0061 && code <= 0x0066) // a .. f
		);
	}

	// uppercase letter
	// A code point between U+0041 LATIN CAPITAL LETTER A (A) and U+005A LATIN CAPITAL LETTER Z (Z).
	function isUppercaseLetter$1(code) {
		return code >= 0x0041 && code <= 0x005a;
	}

	// lowercase letter
	// A code point between U+0061 LATIN SMALL LETTER A (a) and U+007A LATIN SMALL LETTER Z (z).
	function isLowercaseLetter(code) {
		return code >= 0x0061 && code <= 0x007a;
	}

	// letter
	// An uppercase letter or a lowercase letter.
	function isLetter(code) {
		return isUppercaseLetter$1(code) || isLowercaseLetter(code);
	}

	// non-ASCII code point
	// A code point with a value equal to or greater than U+0080 <control>.
	function isNonAscii(code) {
		return code >= 0x0080;
	}

	// name-start code point
	// A letter, a non-ASCII code point, or U+005F LOW LINE (_).
	function isNameStart(code) {
		return isLetter(code) || isNonAscii(code) || code === 0x005f;
	}

	// name code point
	// A name-start code point, a digit, or U+002D HYPHEN-MINUS (-).
	function isName$2(code) {
		return isNameStart(code) || isDigit$5(code) || code === 0x002d;
	}

	// non-printable code point
	// A code point between U+0000 NULL and U+0008 BACKSPACE, or U+000B LINE TABULATION,
	// or a code point between U+000E SHIFT OUT and U+001F INFORMATION SEPARATOR ONE, or U+007F DELETE.
	function isNonPrintable(code) {
		return (
			(code >= 0x0000 && code <= 0x0008) || code === 0x000b || (code >= 0x000e && code <= 0x001f) || code === 0x007f
		);
	}

	// newline
	// U+000A LINE FEED. Note that U+000D CARRIAGE RETURN and U+000C FORM FEED are not included in this definition,
	// as they are converted to U+000A LINE FEED during preprocessing.
	// TODO: we doesn't do a preprocessing, so check a code point for U+000D CARRIAGE RETURN and U+000C FORM FEED
	function isNewline$1(code) {
		return code === 0x000a || code === 0x000d || code === 0x000c;
	}

	// whitespace
	// A newline, U+0009 CHARACTER TABULATION, or U+0020 SPACE.
	function isWhiteSpace$2(code) {
		return isNewline$1(code) || code === 0x0020 || code === 0x0009;
	}

	// § 4.3.8. Check if two code points are a valid escape
	function isValidEscape$2(first, second) {
		// If the first code point is not U+005C REVERSE SOLIDUS (\), return false.
		if (first !== 0x005c) {
			return false;
		}

		// Otherwise, if the second code point is a newline or EOF, return false.
		if (isNewline$1(second) || second === EOF$1) {
			return false;
		}

		// Otherwise, return true.
		return true;
	}

	// § 4.3.9. Check if three code points would start an identifier
	function isIdentifierStart$2(first, second, third) {
		// Look at the first code point:

		// U+002D HYPHEN-MINUS
		if (first === 0x002d) {
			// If the second code point is a name-start code point or a U+002D HYPHEN-MINUS,
			// or the second and third code points are a valid escape, return true. Otherwise, return false.
			return isNameStart(second) || second === 0x002d || isValidEscape$2(second, third);
		}

		// name-start code point
		if (isNameStart(first)) {
			// Return true.
			return true;
		}

		// U+005C REVERSE SOLIDUS (\)
		if (first === 0x005c) {
			// If the first and second code points are a valid escape, return true. Otherwise, return false.
			return isValidEscape$2(first, second);
		}

		// anything else
		// Return false.
		return false;
	}

	// § 4.3.10. Check if three code points would start a number
	function isNumberStart$1(first, second, third) {
		// Look at the first code point:

		// U+002B PLUS SIGN (+)
		// U+002D HYPHEN-MINUS (-)
		if (first === 0x002b || first === 0x002d) {
			// If the second code point is a digit, return true.
			if (isDigit$5(second)) {
				return 2;
			}

			// Otherwise, if the second code point is a U+002E FULL STOP (.)
			// and the third code point is a digit, return true.
			// Otherwise, return false.
			return second === 0x002e && isDigit$5(third) ? 3 : 0;
		}

		// U+002E FULL STOP (.)
		if (first === 0x002e) {
			// If the second code point is a digit, return true. Otherwise, return false.
			return isDigit$5(second) ? 2 : 0;
		}

		// digit
		if (isDigit$5(first)) {
			// Return true.
			return 1;
		}

		// anything else
		// Return false.
		return 0;
	}

	//
	// Misc
	//

	// detect BOM (https://en.wikipedia.org/wiki/Byte_order_mark)
	function isBOM$2(code) {
		// UTF-16BE
		if (code === 0xfeff) {
			return 1;
		}

		// UTF-16LE
		if (code === 0xfffe) {
			return 1;
		}

		return 0;
	}

	// Fast code category
	//
	// https://drafts.csswg.org/css-syntax/#tokenizer-definitions
	// > non-ASCII code point
	// >   A code point with a value equal to or greater than U+0080 <control>
	// > name-start code point
	// >   A letter, a non-ASCII code point, or U+005F LOW LINE (_).
	// > name code point
	// >   A name-start code point, a digit, or U+002D HYPHEN-MINUS (-)
	// That means only ASCII code points has a special meaning and we define a maps for 0..127 codes only
	var CATEGORY = new Array(0x80);
	charCodeCategory$1.Eof = 0x80;
	charCodeCategory$1.WhiteSpace = 0x82;
	charCodeCategory$1.Digit = 0x83;
	charCodeCategory$1.NameStart = 0x84;
	charCodeCategory$1.NonPrintable = 0x85;

	for (var i = 0; i < CATEGORY.length; i++) {
		switch (true) {
			case isWhiteSpace$2(i):
				CATEGORY[i] = charCodeCategory$1.WhiteSpace;
				break;

			case isDigit$5(i):
				CATEGORY[i] = charCodeCategory$1.Digit;
				break;

			case isNameStart(i):
				CATEGORY[i] = charCodeCategory$1.NameStart;
				break;

			case isNonPrintable(i):
				CATEGORY[i] = charCodeCategory$1.NonPrintable;
				break;

			default:
				CATEGORY[i] = i || charCodeCategory$1.Eof;
		}
	}

	function charCodeCategory$1(code) {
		return code < 0x80 ? CATEGORY[code] : charCodeCategory$1.NameStart;
	}
	var charCodeDefinitions$1 = {
		isDigit: isDigit$5,
		isHexDigit: isHexDigit$4,
		isUppercaseLetter: isUppercaseLetter$1,
		isLowercaseLetter: isLowercaseLetter,
		isLetter: isLetter,
		isNonAscii: isNonAscii,
		isNameStart: isNameStart,
		isName: isName$2,
		isNonPrintable: isNonPrintable,
		isNewline: isNewline$1,
		isWhiteSpace: isWhiteSpace$2,
		isValidEscape: isValidEscape$2,
		isIdentifierStart: isIdentifierStart$2,
		isNumberStart: isNumberStart$1,

		isBOM: isBOM$2,
		charCodeCategory: charCodeCategory$1,
	};

	var charCodeDef = charCodeDefinitions$1;
	var isDigit$4 = charCodeDef.isDigit;
	var isHexDigit$3 = charCodeDef.isHexDigit;
	var isUppercaseLetter = charCodeDef.isUppercaseLetter;
	var isName$1 = charCodeDef.isName;
	var isWhiteSpace$1 = charCodeDef.isWhiteSpace;
	var isValidEscape$1 = charCodeDef.isValidEscape;

	function getCharCode(source, offset) {
		return offset < source.length ? source.charCodeAt(offset) : 0;
	}

	function getNewlineLength$1(source, offset, code) {
		if (code === 13 /* \r */ && getCharCode(source, offset + 1) === 10 /* \n */) {
			return 2;
		}

		return 1;
	}

	function cmpChar$5(testStr, offset, referenceCode) {
		var code = testStr.charCodeAt(offset);

		// code.toLowerCase() for A..Z
		if (isUppercaseLetter(code)) {
			code = code | 32;
		}

		return code === referenceCode;
	}

	function cmpStr$6(testStr, start, end, referenceStr) {
		if (end - start !== referenceStr.length) {
			return false;
		}

		if (start < 0 || end > testStr.length) {
			return false;
		}

		for (var i = start; i < end; i++) {
			var testCode = testStr.charCodeAt(i);
			var referenceCode = referenceStr.charCodeAt(i - start);

			// testCode.toLowerCase() for A..Z
			if (isUppercaseLetter(testCode)) {
				testCode = testCode | 32;
			}

			if (testCode !== referenceCode) {
				return false;
			}
		}

		return true;
	}

	function findWhiteSpaceStart$1(source, offset) {
		for (; offset >= 0; offset--) {
			if (!isWhiteSpace$1(source.charCodeAt(offset))) {
				break;
			}
		}

		return offset + 1;
	}

	function findWhiteSpaceEnd$1(source, offset) {
		for (; offset < source.length; offset++) {
			if (!isWhiteSpace$1(source.charCodeAt(offset))) {
				break;
			}
		}

		return offset;
	}

	function findDecimalNumberEnd(source, offset) {
		for (; offset < source.length; offset++) {
			if (!isDigit$4(source.charCodeAt(offset))) {
				break;
			}
		}

		return offset;
	}

	// § 4.3.7. Consume an escaped code point
	function consumeEscaped$1(source, offset) {
		// It assumes that the U+005C REVERSE SOLIDUS (\) has already been consumed and
		// that the next input code point has already been verified to be part of a valid escape.
		offset += 2;

		// hex digit
		if (isHexDigit$3(getCharCode(source, offset - 1))) {
			// Consume as many hex digits as possible, but no more than 5.
			// Note that this means 1-6 hex digits have been consumed in total.
			for (var maxOffset = Math.min(source.length, offset + 5); offset < maxOffset; offset++) {
				if (!isHexDigit$3(getCharCode(source, offset))) {
					break;
				}
			}

			// If the next input code point is whitespace, consume it as well.
			var code = getCharCode(source, offset);
			if (isWhiteSpace$1(code)) {
				offset += getNewlineLength$1(source, offset, code);
			}
		}

		return offset;
	}

	// §4.3.11. Consume a name
	// Note: This algorithm does not do the verification of the first few code points that are necessary
	// to ensure the returned code points would constitute an <ident-token>. If that is the intended use,
	// ensure that the stream starts with an identifier before calling this algorithm.
	function consumeName$1(source, offset) {
		// Let result initially be an empty string.
		// Repeatedly consume the next input code point from the stream:
		for (; offset < source.length; offset++) {
			var code = source.charCodeAt(offset);

			// name code point
			if (isName$1(code)) {
				// Append the code point to result.
				continue;
			}

			// the stream starts with a valid escape
			if (isValidEscape$1(code, getCharCode(source, offset + 1))) {
				// Consume an escaped code point. Append the returned code point to result.
				offset = consumeEscaped$1(source, offset) - 1;
				continue;
			}

			// anything else
			// Reconsume the current input code point. Return result.
			break;
		}

		return offset;
	}

	// §4.3.12. Consume a number
	function consumeNumber$5(source, offset) {
		var code = source.charCodeAt(offset);

		// 2. If the next input code point is U+002B PLUS SIGN (+) or U+002D HYPHEN-MINUS (-),
		// consume it and append it to repr.
		if (code === 0x002b || code === 0x002d) {
			code = source.charCodeAt((offset += 1));
		}

		// 3. While the next input code point is a digit, consume it and append it to repr.
		if (isDigit$4(code)) {
			offset = findDecimalNumberEnd(source, offset + 1);
			code = source.charCodeAt(offset);
		}

		// 4. If the next 2 input code points are U+002E FULL STOP (.) followed by a digit, then:
		if (code === 0x002e && isDigit$4(source.charCodeAt(offset + 1))) {
			// 4.1 Consume them.
			// 4.2 Append them to repr.
			code = source.charCodeAt((offset += 2));

			// 4.3 Set type to "number".
			// TODO

			// 4.4 While the next input code point is a digit, consume it and append it to repr.

			offset = findDecimalNumberEnd(source, offset);
		}

		// 5. If the next 2 or 3 input code points are U+0045 LATIN CAPITAL LETTER E (E)
		// or U+0065 LATIN SMALL LETTER E (e), ... , followed by a digit, then:
		if (cmpChar$5(source, offset, 101 /* e */)) {
			var sign = 0;
			code = source.charCodeAt(offset + 1);

			// ... optionally followed by U+002D HYPHEN-MINUS (-) or U+002B PLUS SIGN (+) ...
			if (code === 0x002d || code === 0x002b) {
				sign = 1;
				code = source.charCodeAt(offset + 2);
			}

			// ... followed by a digit
			if (isDigit$4(code)) {
				// 5.1 Consume them.
				// 5.2 Append them to repr.

				// 5.3 Set type to "number".
				// TODO

				// 5.4 While the next input code point is a digit, consume it and append it to repr.
				offset = findDecimalNumberEnd(source, offset + 1 + sign + 1);
			}
		}

		return offset;
	}

	// § 4.3.14. Consume the remnants of a bad url
	// ... its sole use is to consume enough of the input stream to reach a recovery point
	// where normal tokenizing can resume.
	function consumeBadUrlRemnants$1(source, offset) {
		// Repeatedly consume the next input code point from the stream:
		for (; offset < source.length; offset++) {
			var code = source.charCodeAt(offset);

			// U+0029 RIGHT PARENTHESIS ())
			// EOF
			if (code === 0x0029) {
				// Return.
				offset++;
				break;
			}

			if (isValidEscape$1(code, getCharCode(source, offset + 1))) {
				// Consume an escaped code point.
				// Note: This allows an escaped right parenthesis ("\)") to be encountered
				// without ending the <bad-url-token>. This is otherwise identical to
				// the "anything else" clause.
				offset = consumeEscaped$1(source, offset);
			}
		}

		return offset;
	}

	var utils$2 = {
		consumeEscaped: consumeEscaped$1,
		consumeName: consumeName$1,
		consumeNumber: consumeNumber$5,
		consumeBadUrlRemnants: consumeBadUrlRemnants$1,

		cmpChar: cmpChar$5,
		cmpStr: cmpStr$6,

		getNewlineLength: getNewlineLength$1,
		findWhiteSpaceStart: findWhiteSpaceStart$1,
		findWhiteSpaceEnd: findWhiteSpaceEnd$1,
	};

	var constants$2 = _const;
	var TYPE$G = constants$2.TYPE;
	var NAME$2 = constants$2.NAME;

	var utils$1 = utils$2;
	var cmpStr$5 = utils$1.cmpStr;

	var EOF = TYPE$G.EOF;
	var WHITESPACE$c = TYPE$G.WhiteSpace;
	var COMMENT$a = TYPE$G.Comment;

	var OFFSET_MASK$1 = 0x00ffffff;
	var TYPE_SHIFT$1 = 24;

	var TokenStream$4 = function () {
		this.offsetAndType = null;
		this.balance = null;

		this.reset();
	};

	TokenStream$4.prototype = {
		reset: function () {
			this.eof = false;
			this.tokenIndex = -1;
			this.tokenType = 0;
			this.tokenStart = this.firstCharOffset;
			this.tokenEnd = this.firstCharOffset;
		},

		lookupType: function (offset) {
			offset += this.tokenIndex;

			if (offset < this.tokenCount) {
				return this.offsetAndType[offset] >> TYPE_SHIFT$1;
			}

			return EOF;
		},
		lookupOffset: function (offset) {
			offset += this.tokenIndex;

			if (offset < this.tokenCount) {
				return this.offsetAndType[offset - 1] & OFFSET_MASK$1;
			}

			return this.source.length;
		},
		lookupValue: function (offset, referenceStr) {
			offset += this.tokenIndex;

			if (offset < this.tokenCount) {
				return cmpStr$5(
					this.source,
					this.offsetAndType[offset - 1] & OFFSET_MASK$1,
					this.offsetAndType[offset] & OFFSET_MASK$1,
					referenceStr,
				);
			}

			return false;
		},
		getTokenStart: function (tokenIndex) {
			if (tokenIndex === this.tokenIndex) {
				return this.tokenStart;
			}

			if (tokenIndex > 0) {
				return tokenIndex < this.tokenCount
					? this.offsetAndType[tokenIndex - 1] & OFFSET_MASK$1
					: this.offsetAndType[this.tokenCount] & OFFSET_MASK$1;
			}

			return this.firstCharOffset;
		},

		// TODO: -> skipUntilBalanced
		getRawLength: function (startToken, mode) {
			var cursor = startToken;
			var balanceEnd;
			var offset = this.offsetAndType[Math.max(cursor - 1, 0)] & OFFSET_MASK$1;
			var type;

			loop: for (; cursor < this.tokenCount; cursor++) {
				balanceEnd = this.balance[cursor];

				// stop scanning on balance edge that points to offset before start token
				if (balanceEnd < startToken) {
					break;
				}

				type = this.offsetAndType[cursor] >> TYPE_SHIFT$1;

				// check token is stop type
				switch (mode(type, this.source, offset)) {
					case 1:
						break loop;

					case 2:
						cursor++;
						break loop;

					default:
						// fast forward to the end of balanced block
						if (this.balance[balanceEnd] === cursor) {
							cursor = balanceEnd;
						}

						offset = this.offsetAndType[cursor] & OFFSET_MASK$1;
				}
			}

			return cursor - this.tokenIndex;
		},
		isBalanceEdge: function (pos) {
			return this.balance[this.tokenIndex] < pos;
		},
		isDelim: function (code, offset) {
			if (offset) {
				return this.lookupType(offset) === TYPE$G.Delim && this.source.charCodeAt(this.lookupOffset(offset)) === code;
			}

			return this.tokenType === TYPE$G.Delim && this.source.charCodeAt(this.tokenStart) === code;
		},

		getTokenValue: function () {
			return this.source.substring(this.tokenStart, this.tokenEnd);
		},
		getTokenLength: function () {
			return this.tokenEnd - this.tokenStart;
		},
		substrToCursor: function (start) {
			return this.source.substring(start, this.tokenStart);
		},

		skipWS: function () {
			for (var i = this.tokenIndex, skipTokenCount = 0; i < this.tokenCount; i++, skipTokenCount++) {
				if (this.offsetAndType[i] >> TYPE_SHIFT$1 !== WHITESPACE$c) {
					break;
				}
			}

			if (skipTokenCount > 0) {
				this.skip(skipTokenCount);
			}
		},
		skipSC: function () {
			while (this.tokenType === WHITESPACE$c || this.tokenType === COMMENT$a) {
				this.next();
			}
		},
		skip: function (tokenCount) {
			var next = this.tokenIndex + tokenCount;

			if (next < this.tokenCount) {
				this.tokenIndex = next;
				this.tokenStart = this.offsetAndType[next - 1] & OFFSET_MASK$1;
				next = this.offsetAndType[next];
				this.tokenType = next >> TYPE_SHIFT$1;
				this.tokenEnd = next & OFFSET_MASK$1;
			} else {
				this.tokenIndex = this.tokenCount;
				this.next();
			}
		},
		next: function () {
			var next = this.tokenIndex + 1;

			if (next < this.tokenCount) {
				this.tokenIndex = next;
				this.tokenStart = this.tokenEnd;
				next = this.offsetAndType[next];
				this.tokenType = next >> TYPE_SHIFT$1;
				this.tokenEnd = next & OFFSET_MASK$1;
			} else {
				this.tokenIndex = this.tokenCount;
				this.eof = true;
				this.tokenType = EOF;
				this.tokenStart = this.tokenEnd = this.source.length;
			}
		},

		forEachToken(fn) {
			for (var i = 0, offset = this.firstCharOffset; i < this.tokenCount; i++) {
				var start = offset;
				var item = this.offsetAndType[i];
				var end = item & OFFSET_MASK$1;
				var type = item >> TYPE_SHIFT$1;

				offset = end;

				fn(type, start, end, i);
			}
		},

		dump() {
			var tokens = new Array(this.tokenCount);

			this.forEachToken((type, start, end, index) => {
				tokens[index] = {
					idx: index,
					type: NAME$2[type],
					chunk: this.source.substring(start, end),
					balance: this.balance[index],
				};
			});

			return tokens;
		},
	};

	var TokenStream_1 = TokenStream$4;

	function noop$3(value) {
		return value;
	}

	function generateMultiplier(multiplier) {
		if (multiplier.min === 0 && multiplier.max === 0) {
			return "*";
		}

		if (multiplier.min === 0 && multiplier.max === 1) {
			return "?";
		}

		if (multiplier.min === 1 && multiplier.max === 0) {
			return multiplier.comma ? "#" : "+";
		}

		if (multiplier.min === 1 && multiplier.max === 1) {
			return "";
		}

		return (
			(multiplier.comma ? "#" : "") +
			(multiplier.min === multiplier.max
				? `{${multiplier.min}}`
				: `{${multiplier.min},${multiplier.max !== 0 ? multiplier.max : ""}}`)
		);
	}

	function generateTypeOpts(node) {
		switch (node.type) {
			case "Range":
				return " [" + (node.min === null ? "-∞" : node.min) + "," + (node.max === null ? "∞" : node.max) + "]";

			default:
				throw new Error(`Unknown node type \`${node.type}\``);
		}
	}

	function generateSequence(node, decorate, forceBraces, compact) {
		var combinator = node.combinator === " " || compact ? node.combinator : ` ${node.combinator} `;
		var result = node.terms.map((term) => generate$2(term, decorate, forceBraces, compact)).join(combinator);

		if (node.explicit || forceBraces) {
			result = (compact || result[0] === "," ? "[" : "[ ") + result + (compact ? "]" : " ]");
		}

		return result;
	}

	function generate$2(node, decorate, forceBraces, compact) {
		var result;

		switch (node.type) {
			case "Group":
				result = generateSequence(node, decorate, forceBraces, compact) + (node.disallowEmpty ? "!" : "");
				break;

			case "Multiplier":
				// return since node is a composition
				return generate$2(node.term, decorate, forceBraces, compact) + decorate(generateMultiplier(node), node);

			case "Type":
				result = `<${node.name}${node.opts ? decorate(generateTypeOpts(node.opts), node.opts) : ""}>`;
				break;

			case "Property":
				result = `<'${node.name}'>`;
				break;

			case "Keyword":
				result = node.name;
				break;

			case "AtKeyword":
				result = `@${node.name}`;
				break;

			case "Function":
				result = `${node.name}(`;
				break;

			case "String":
			case "Token":
				result = node.value;
				break;

			case "Comma":
				result = ",";
				break;

			default:
				throw new Error(`Unknown node type \`${node.type}\``);
		}

		return decorate(result, node);
	}

	var generate_1 = (node, options) => {
		var decorate = noop$3;
		var forceBraces = false;
		var compact = false;

		if (typeof options === "function") {
			decorate = options;
		} else if (options) {
			forceBraces = Boolean(options.forceBraces);
			compact = Boolean(options.compact);
			if (typeof options.decorate === "function") {
				decorate = options.decorate;
			}
		}

		return generate$2(node, decorate, forceBraces, compact);
	};

	const createCustomError$1 = createCustomError$3;
	const generate$1 = generate_1;
	const defaultLoc = { offset: 0, line: 1, column: 1 };

	function locateMismatch(matchResult, node) {
		const tokens = matchResult.tokens;
		const longestMatch = matchResult.longestMatch;
		const mismatchNode = longestMatch < tokens.length ? tokens[longestMatch].node || null : null;
		const badNode = mismatchNode !== node ? mismatchNode : null;
		let mismatchOffset = 0;
		let mismatchLength = 0;
		let entries = 0;
		let css = "";
		let start;
		let end;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i].value;

			if (i === longestMatch) {
				mismatchLength = token.length;
				mismatchOffset = css.length;
			}

			if (badNode !== null && tokens[i].node === badNode) {
				if (i <= longestMatch) {
					entries++;
				} else {
					entries = 0;
				}
			}

			css += token;
		}

		if (longestMatch === tokens.length || entries > 1) {
			// last
			start = fromLoc(badNode || node, "end") || buildLoc(defaultLoc, css);
			end = buildLoc(start);
		} else {
			start = fromLoc(badNode, "start") || buildLoc(fromLoc(node, "start") || defaultLoc, css.slice(0, mismatchOffset));
			end = fromLoc(badNode, "end") || buildLoc(start, css.substr(mismatchOffset, mismatchLength));
		}

		return {
			css,
			mismatchOffset,
			mismatchLength,
			start,
			end,
		};
	}

	function fromLoc(node, point) {
		const value = node?.loc?.[point];

		if (value) {
			return "line" in value ? buildLoc(value) : value;
		}

		return null;
	}

	function buildLoc({ offset, line, column }, extra) {
		const loc = {
			offset,
			line,
			column,
		};

		if (extra) {
			const lines = extra.split(/\n|\r\n?|\f/);

			loc.offset += extra.length;
			loc.line += lines.length - 1;
			loc.column = lines.length === 1 ? loc.column + extra.length : lines.pop().length + 1;
		}

		return loc;
	}

	const SyntaxReferenceError$1 = (type, referenceName) => {
		const error = createCustomError$1("SyntaxReferenceError", type + (referenceName ? ` \`${referenceName}\`` : ""));

		error.reference = referenceName;

		return error;
	};

	const SyntaxMatchError$1 = (message, syntax, node, matchResult) => {
		const error = createCustomError$1("SyntaxMatchError", message);
		const { css, mismatchOffset, mismatchLength, start, end } = locateMismatch(matchResult, node);

		error.rawMessage = message;
		error.syntax = syntax ? generate$1(syntax) : "<generic>";
		error.css = css;
		error.mismatchOffset = mismatchOffset;
		error.mismatchLength = mismatchLength;
		error.message =
			message +
			"\n" +
			"  syntax: " +
			error.syntax +
			"\n" +
			"   value: " +
			(css || "<empty string>") +
			"\n" +
			"  --------" +
			new Array(error.mismatchOffset + 1).join("-") +
			"^";

		Object.assign(error, start);
		error.loc = {
			source: node?.loc?.source || "<unknown>",
			start,
			end,
		};

		return error;
	};

	var error = {
		SyntaxReferenceError: SyntaxReferenceError$1,
		SyntaxMatchError: SyntaxMatchError$1,
	};

	var hasOwnProperty$7 = Object.prototype.hasOwnProperty;
	var keywords$1 = Object.create(null);
	var properties$1 = Object.create(null);
	var HYPHENMINUS$5 = 45; // '-'.charCodeAt()

	function isCustomProperty$1(str, offset) {
		offset = offset || 0;

		return (
			str.length - offset >= 2 &&
			str.charCodeAt(offset) === HYPHENMINUS$5 &&
			str.charCodeAt(offset + 1) === HYPHENMINUS$5
		);
	}

	function getVendorPrefix(str, offset) {
		offset = offset || 0;

		// verdor prefix should be at least 3 chars length
		if (str.length - offset >= 3) {
			// vendor prefix starts with hyper minus following non-hyper minus
			if (str.charCodeAt(offset) === HYPHENMINUS$5 && str.charCodeAt(offset + 1) !== HYPHENMINUS$5) {
				// vendor prefix should contain a hyper minus at the ending
				var secondDashIndex = str.indexOf("-", offset + 2);

				if (secondDashIndex !== -1) {
					return str.substring(offset, secondDashIndex + 1);
				}
			}
		}

		return "";
	}

	function getKeywordDescriptor(keyword) {
		if (hasOwnProperty$7.call(keywords$1, keyword)) {
			return keywords$1[keyword];
		}

		var name = keyword.toLowerCase();

		if (hasOwnProperty$7.call(keywords$1, name)) {
			return (keywords$1[keyword] = keywords$1[name]);
		}

		var custom = isCustomProperty$1(name, 0);
		var vendor = !custom ? getVendorPrefix(name, 0) : "";

		return (keywords$1[keyword] = Object.freeze({
			basename: name.substr(vendor.length),
			name: name,
			vendor: vendor,
			prefix: vendor,
			custom: custom,
		}));
	}

	function getPropertyDescriptor(property) {
		if (hasOwnProperty$7.call(properties$1, property)) {
			return properties$1[property];
		}

		var name = property;
		var hack = property[0];

		if (hack === "/") {
			hack = property[1] === "/" ? "//" : "/";
		} else if (hack !== "_" && hack !== "*" && hack !== "$" && hack !== "#" && hack !== "+" && hack !== "&") {
			hack = "";
		}

		var custom = isCustomProperty$1(name, hack.length);

		// re-use result when possible (the same as for lower case)
		if (!custom) {
			name = name.toLowerCase();
			if (hasOwnProperty$7.call(properties$1, name)) {
				return (properties$1[property] = properties$1[name]);
			}
		}

		var vendor = !custom ? getVendorPrefix(name, hack.length) : "";
		var prefix = name.substr(0, hack.length + vendor.length);

		return (properties$1[property] = Object.freeze({
			basename: name.substr(prefix.length),
			name: name.substr(hack.length),
			hack: hack,
			vendor: vendor,
			prefix: prefix,
			custom: custom,
		}));
	}

	var names$2 = {
		keyword: getKeywordDescriptor,
		property: getPropertyDescriptor,
		isCustomProperty: isCustomProperty$1,
		vendorPrefix: getVendorPrefix,
	};

	var MIN_SIZE = 16 * 1024;
	var SafeUint32Array = typeof Uint32Array !== "undefined" ? Uint32Array : Array; // fallback on Array when TypedArray is not supported

	var adoptBuffer$2 = function adoptBuffer(buffer, size) {
		if (buffer === null || buffer.length < size) {
			return new SafeUint32Array(Math.max(size + 1024, MIN_SIZE));
		}

		return buffer;
	};

	var TokenStream$3 = TokenStream_1;
	var adoptBuffer$1 = adoptBuffer$2;

	var constants$1 = _const;
	var TYPE$F = constants$1.TYPE;

	var charCodeDefinitions = charCodeDefinitions$1;
	var isNewline = charCodeDefinitions.isNewline;
	var isName = charCodeDefinitions.isName;
	var isValidEscape = charCodeDefinitions.isValidEscape;
	var isNumberStart = charCodeDefinitions.isNumberStart;
	var isIdentifierStart$1 = charCodeDefinitions.isIdentifierStart;
	var charCodeCategory = charCodeDefinitions.charCodeCategory;
	var isBOM$1 = charCodeDefinitions.isBOM;

	var utils = utils$2;
	var cmpStr$4 = utils.cmpStr;
	var getNewlineLength = utils.getNewlineLength;
	var findWhiteSpaceEnd = utils.findWhiteSpaceEnd;
	var consumeEscaped = utils.consumeEscaped;
	var consumeName = utils.consumeName;
	var consumeNumber$4 = utils.consumeNumber;
	var consumeBadUrlRemnants = utils.consumeBadUrlRemnants;

	var OFFSET_MASK = 0x00ffffff;
	var TYPE_SHIFT = 24;

	function tokenize$3(source, stream) {
		function getCharCode(offset) {
			return offset < sourceLength ? source.charCodeAt(offset) : 0;
		}

		// § 4.3.3. Consume a numeric token
		function consumeNumericToken() {
			// Consume a number and let number be the result.
			offset = consumeNumber$4(source, offset);

			// If the next 3 input code points would start an identifier, then:
			if (isIdentifierStart$1(getCharCode(offset), getCharCode(offset + 1), getCharCode(offset + 2))) {
				// Create a <dimension-token> with the same value and type flag as number, and a unit set initially to the empty string.
				// Consume a name. Set the <dimension-token>’s unit to the returned value.
				// Return the <dimension-token>.
				type = TYPE$F.Dimension;
				offset = consumeName(source, offset);
				return;
			}

			// Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%), consume it.
			if (getCharCode(offset) === 0x0025) {
				// Create a <percentage-token> with the same value as number, and return it.
				type = TYPE$F.Percentage;
				offset++;
				return;
			}

			// Otherwise, create a <number-token> with the same value and type flag as number, and return it.
			type = TYPE$F.Number;
		}

		// § 4.3.4. Consume an ident-like token
		function consumeIdentLikeToken() {
			const nameStartOffset = offset;

			// Consume a name, and let string be the result.
			offset = consumeName(source, offset);

			// If string’s value is an ASCII case-insensitive match for "url",
			// and the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
			if (cmpStr$4(source, nameStartOffset, offset, "url") && getCharCode(offset) === 0x0028) {
				// While the next two input code points are whitespace, consume the next input code point.
				offset = findWhiteSpaceEnd(source, offset + 1);

				// If the next one or two input code points are U+0022 QUOTATION MARK ("), U+0027 APOSTROPHE ('),
				// or whitespace followed by U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE ('),
				// then create a <function-token> with its value set to string and return it.
				if (getCharCode(offset) === 0x0022 || getCharCode(offset) === 0x0027) {
					type = TYPE$F.Function;
					offset = nameStartOffset + 4;
					return;
				}

				// Otherwise, consume a url token, and return it.
				consumeUrlToken();
				return;
			}

			// Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
			// Create a <function-token> with its value set to string and return it.
			if (getCharCode(offset) === 0x0028) {
				type = TYPE$F.Function;
				offset++;
				return;
			}

			// Otherwise, create an <ident-token> with its value set to string and return it.
			type = TYPE$F.Ident;
		}

		// § 4.3.5. Consume a string token
		function consumeStringToken(endingCodePoint) {
			// This algorithm may be called with an ending code point, which denotes the code point
			// that ends the string. If an ending code point is not specified,
			// the current input code point is used.
			if (!endingCodePoint) {
				endingCodePoint = getCharCode(offset++);
			}

			// Initially create a <string-token> with its value set to the empty string.
			type = TYPE$F.String;

			// Repeatedly consume the next input code point from the stream:
			for (; offset < source.length; offset++) {
				var code = source.charCodeAt(offset);

				switch (charCodeCategory(code)) {
					// ending code point
					case endingCodePoint:
						// Return the <string-token>.
						offset++;
						return;

					// EOF
					case charCodeCategory.Eof:
						// This is a parse error. Return the <string-token>.
						return;

					// newline
					case charCodeCategory.WhiteSpace:
						if (isNewline(code)) {
							// This is a parse error. Reconsume the current input code point,
							// create a <bad-string-token>, and return it.
							offset += getNewlineLength(source, offset, code);
							type = TYPE$F.BadString;
							return;
						}
						break;

					// U+005C REVERSE SOLIDUS (\)
					case 0x005c: {
						// If the next input code point is EOF, do nothing.
						if (offset === source.length - 1) {
							break;
						}

						var nextCode = getCharCode(offset + 1);

						// Otherwise, if the next input code point is a newline, consume it.
						if (isNewline(nextCode)) {
							offset += getNewlineLength(source, offset + 1, nextCode);
						} else if (isValidEscape(code, nextCode)) {
							// Otherwise, (the stream starts with a valid escape) consume
							// an escaped code point and append the returned code point to
							// the <string-token>’s value.
							offset = consumeEscaped(source, offset) - 1;
						}
						break;
					}

					// anything else
					// Append the current input code point to the <string-token>’s value.
				}
			}
		}

		// § 4.3.6. Consume a url token
		// Note: This algorithm assumes that the initial "url(" has already been consumed.
		// This algorithm also assumes that it’s being called to consume an "unquoted" value, like url(foo).
		// A quoted value, like url("foo"), is parsed as a <function-token>. Consume an ident-like token
		// automatically handles this distinction; this algorithm shouldn’t be called directly otherwise.
		function consumeUrlToken() {
			// Initially create a <url-token> with its value set to the empty string.
			type = TYPE$F.Url;

			// Consume as much whitespace as possible.
			offset = findWhiteSpaceEnd(source, offset);

			// Repeatedly consume the next input code point from the stream:
			for (; offset < source.length; offset++) {
				var code = source.charCodeAt(offset);

				switch (charCodeCategory(code)) {
					// U+0029 RIGHT PARENTHESIS ())
					case 0x0029:
						// Return the <url-token>.
						offset++;
						return;

					// EOF
					case charCodeCategory.Eof:
						// This is a parse error. Return the <url-token>.
						return;

					// whitespace
					case charCodeCategory.WhiteSpace:
						// Consume as much whitespace as possible.
						offset = findWhiteSpaceEnd(source, offset);

						// If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
						// consume it and return the <url-token>
						// (if EOF was encountered, this is a parse error);
						if (getCharCode(offset) === 0x0029 || offset >= source.length) {
							if (offset < source.length) {
								offset++;
							}
							return;
						}

						// otherwise, consume the remnants of a bad url, create a <bad-url-token>,
						// and return it.
						offset = consumeBadUrlRemnants(source, offset);
						type = TYPE$F.BadUrl;
						return;

					// U+0022 QUOTATION MARK (")
					// U+0027 APOSTROPHE (')
					// U+0028 LEFT PARENTHESIS (()
					// non-printable code point
					case 0x0022:
					case 0x0027:
					case 0x0028:
					case charCodeCategory.NonPrintable:
						// This is a parse error. Consume the remnants of a bad url,
						// create a <bad-url-token>, and return it.
						offset = consumeBadUrlRemnants(source, offset);
						type = TYPE$F.BadUrl;
						return;

					// U+005C REVERSE SOLIDUS (\)
					case 0x005c:
						// If the stream starts with a valid escape, consume an escaped code point and
						// append the returned code point to the <url-token>’s value.
						if (isValidEscape(code, getCharCode(offset + 1))) {
							offset = consumeEscaped(source, offset) - 1;
							break;
						}

						// Otherwise, this is a parse error. Consume the remnants of a bad url,
						// create a <bad-url-token>, and return it.
						offset = consumeBadUrlRemnants(source, offset);
						type = TYPE$F.BadUrl;
						return;

					// anything else
					// Append the current input code point to the <url-token>’s value.
				}
			}
		}

		if (!stream) {
			stream = new TokenStream$3();
		}

		// ensure source is a string
		source = String(source || "");

		var sourceLength = source.length;
		var offsetAndType = adoptBuffer$1(stream.offsetAndType, sourceLength + 1); // +1 because of eof-token
		var balance = adoptBuffer$1(stream.balance, sourceLength + 1);
		var tokenCount = 0;
		var start = isBOM$1(getCharCode(0));
		var offset = start;
		var balanceCloseType = 0;
		var balanceStart = 0;
		var balancePrev = 0;

		// https://drafts.csswg.org/css-syntax-3/#consume-token
		// § 4.3.1. Consume a token
		while (offset < sourceLength) {
			var code = source.charCodeAt(offset);
			var type = 0;

			balance[tokenCount] = sourceLength;

			switch (charCodeCategory(code)) {
				// whitespace
				case charCodeCategory.WhiteSpace:
					// Consume as much whitespace as possible. Return a <whitespace-token>.
					type = TYPE$F.WhiteSpace;
					offset = findWhiteSpaceEnd(source, offset + 1);
					break;

				// U+0022 QUOTATION MARK (")
				case 0x0022:
					// Consume a string token and return it.
					consumeStringToken();
					break;

				// U+0023 NUMBER SIGN (#)
				case 0x0023:
					// If the next input code point is a name code point or the next two input code points are a valid escape, then:
					if (isName(getCharCode(offset + 1)) || isValidEscape(getCharCode(offset + 1), getCharCode(offset + 2))) {
						// Create a <hash-token>.
						type = TYPE$F.Hash;

						// If the next 3 input code points would start an identifier, set the <hash-token>’s type flag to "id".
						// if (isIdentifierStart(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
						//     // TODO: set id flag
						// }

						// Consume a name, and set the <hash-token>’s value to the returned string.
						offset = consumeName(source, offset + 1);

						// Return the <hash-token>.
					} else {
						// Otherwise, return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}

					break;

				// U+0027 APOSTROPHE (')
				case 0x0027:
					// Consume a string token and return it.
					consumeStringToken();
					break;

				// U+0028 LEFT PARENTHESIS (()
				case 0x0028:
					// Return a <(-token>.
					type = TYPE$F.LeftParenthesis;
					offset++;
					break;

				// U+0029 RIGHT PARENTHESIS ())
				case 0x0029:
					// Return a <)-token>.
					type = TYPE$F.RightParenthesis;
					offset++;
					break;

				// U+002B PLUS SIGN (+)
				case 0x002b:
					// If the input stream starts with a number, ...
					if (isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
						// ... reconsume the current input code point, consume a numeric token, and return it.
						consumeNumericToken();
					} else {
						// Otherwise, return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}
					break;

				// U+002C COMMA (,)
				case 0x002c:
					// Return a <comma-token>.
					type = TYPE$F.Comma;
					offset++;
					break;

				// U+002D HYPHEN-MINUS (-)
				case 0x002d:
					// If the input stream starts with a number, reconsume the current input code point, consume a numeric token, and return it.
					if (isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
						consumeNumericToken();
					} else {
						// Otherwise, if the next 2 input code points are U+002D HYPHEN-MINUS U+003E GREATER-THAN SIGN (->), consume them and return a <CDC-token>.
						if (getCharCode(offset + 1) === 0x002d && getCharCode(offset + 2) === 0x003e) {
							type = TYPE$F.CDC;
							offset = offset + 3;
						} else {
							// Otherwise, if the input stream starts with an identifier, ...
							if (isIdentifierStart$1(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
								// ... reconsume the current input code point, consume an ident-like token, and return it.
								consumeIdentLikeToken();
							} else {
								// Otherwise, return a <delim-token> with its value set to the current input code point.
								type = TYPE$F.Delim;
								offset++;
							}
						}
					}
					break;

				// U+002E FULL STOP (.)
				case 0x002e:
					// If the input stream starts with a number, ...
					if (isNumberStart(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
						// ... reconsume the current input code point, consume a numeric token, and return it.
						consumeNumericToken();
					} else {
						// Otherwise, return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}

					break;

				// U+002F SOLIDUS (/)
				case 0x002f:
					// If the next two input code point are U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*),
					if (getCharCode(offset + 1) === 0x002a) {
						// ... consume them and all following code points up to and including the first U+002A ASTERISK (*)
						// followed by a U+002F SOLIDUS (/), or up to an EOF code point.
						type = TYPE$F.Comment;
						offset = source.indexOf("*/", offset + 2) + 2;
						if (offset === 1) {
							offset = source.length;
						}
					} else {
						type = TYPE$F.Delim;
						offset++;
					}
					break;

				// U+003A COLON (:)
				case 0x003a:
					// Return a <colon-token>.
					type = TYPE$F.Colon;
					offset++;
					break;

				// U+003B SEMICOLON (;)
				case 0x003b:
					// Return a <semicolon-token>.
					type = TYPE$F.Semicolon;
					offset++;
					break;

				// U+003C LESS-THAN SIGN (<)
				case 0x003c:
					// If the next 3 input code points are U+0021 EXCLAMATION MARK U+002D HYPHEN-MINUS U+002D HYPHEN-MINUS (!--), ...
					if (
						getCharCode(offset + 1) === 0x0021 &&
						getCharCode(offset + 2) === 0x002d &&
						getCharCode(offset + 3) === 0x002d
					) {
						// ... consume them and return a <CDO-token>.
						type = TYPE$F.CDO;
						offset = offset + 4;
					} else {
						// Otherwise, return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}

					break;

				// U+0040 COMMERCIAL AT (@)
				case 0x0040:
					// If the next 3 input code points would start an identifier, ...
					if (isIdentifierStart$1(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
						// ... consume a name, create an <at-keyword-token> with its value set to the returned value, and return it.
						type = TYPE$F.AtKeyword;
						offset = consumeName(source, offset + 1);
					} else {
						// Otherwise, return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}

					break;

				// U+005B LEFT SQUARE BRACKET ([)
				case 0x005b:
					// Return a <[-token>.
					type = TYPE$F.LeftSquareBracket;
					offset++;
					break;

				// U+005C REVERSE SOLIDUS (\)
				case 0x005c:
					// If the input stream starts with a valid escape, ...
					if (isValidEscape(code, getCharCode(offset + 1))) {
						// ... reconsume the current input code point, consume an ident-like token, and return it.
						consumeIdentLikeToken();
					} else {
						// Otherwise, this is a parse error. Return a <delim-token> with its value set to the current input code point.
						type = TYPE$F.Delim;
						offset++;
					}
					break;

				// U+005D RIGHT SQUARE BRACKET (])
				case 0x005d:
					// Return a <]-token>.
					type = TYPE$F.RightSquareBracket;
					offset++;
					break;

				// U+007B LEFT CURLY BRACKET ({)
				case 0x007b:
					// Return a <{-token>.
					type = TYPE$F.LeftCurlyBracket;
					offset++;
					break;

				// U+007D RIGHT CURLY BRACKET (})
				case 0x007d:
					// Return a <}-token>.
					type = TYPE$F.RightCurlyBracket;
					offset++;
					break;

				// digit
				case charCodeCategory.Digit:
					// Reconsume the current input code point, consume a numeric token, and return it.
					consumeNumericToken();
					break;

				// name-start code point
				case charCodeCategory.NameStart:
					// Reconsume the current input code point, consume an ident-like token, and return it.
					consumeIdentLikeToken();
					break;

				// EOF
				case charCodeCategory.Eof:
					// Return an <EOF-token>.
					break;

				// anything else
				default:
					// Return a <delim-token> with its value set to the current input code point.
					type = TYPE$F.Delim;
					offset++;
			}

			switch (type) {
				case balanceCloseType:
					balancePrev = balanceStart & OFFSET_MASK;
					balanceStart = balance[balancePrev];
					balanceCloseType = balanceStart >> TYPE_SHIFT;
					balance[tokenCount] = balancePrev;
					balance[balancePrev++] = tokenCount;
					for (; balancePrev < tokenCount; balancePrev++) {
						if (balance[balancePrev] === sourceLength) {
							balance[balancePrev] = tokenCount;
						}
					}
					break;

				case TYPE$F.LeftParenthesis:
				case TYPE$F.Function:
					balance[tokenCount] = balanceStart;
					balanceCloseType = TYPE$F.RightParenthesis;
					balanceStart = (balanceCloseType << TYPE_SHIFT) | tokenCount;
					break;

				case TYPE$F.LeftSquareBracket:
					balance[tokenCount] = balanceStart;
					balanceCloseType = TYPE$F.RightSquareBracket;
					balanceStart = (balanceCloseType << TYPE_SHIFT) | tokenCount;
					break;

				case TYPE$F.LeftCurlyBracket:
					balance[tokenCount] = balanceStart;
					balanceCloseType = TYPE$F.RightCurlyBracket;
					balanceStart = (balanceCloseType << TYPE_SHIFT) | tokenCount;
					break;
			}

			offsetAndType[tokenCount++] = (type << TYPE_SHIFT) | offset;
		}

		// finalize buffers
		offsetAndType[tokenCount] = (TYPE$F.EOF << TYPE_SHIFT) | offset; // <EOF-token>
		balance[tokenCount] = sourceLength;
		balance[sourceLength] = sourceLength; // prevents false positive balance match with any token
		while (balanceStart !== 0) {
			balancePrev = balanceStart & OFFSET_MASK;
			balanceStart = balance[balancePrev];
			balance[balancePrev] = sourceLength;
		}

		// update stream
		stream.source = source;
		stream.firstCharOffset = start;
		stream.offsetAndType = offsetAndType;
		stream.tokenCount = tokenCount;
		stream.balance = balance;
		stream.reset();
		stream.next();

		return stream;
	}

	// extend tokenizer with constants
	Object.keys(constants$1).forEach((key) => {
		tokenize$3[key] = constants$1[key];
	});

	// extend tokenizer with static methods from utils
	Object.keys(charCodeDefinitions).forEach((key) => {
		tokenize$3[key] = charCodeDefinitions[key];
	});
	Object.keys(utils).forEach((key) => {
		tokenize$3[key] = utils[key];
	});

	var tokenizer$3 = tokenize$3;

	var isDigit$3 = tokenizer$3.isDigit;
	var cmpChar$4 = tokenizer$3.cmpChar;
	var TYPE$E = tokenizer$3.TYPE;

	var DELIM$6 = TYPE$E.Delim;
	var WHITESPACE$b = TYPE$E.WhiteSpace;
	var COMMENT$9 = TYPE$E.Comment;
	var IDENT$i = TYPE$E.Ident;
	var NUMBER$9 = TYPE$E.Number;
	var DIMENSION$7 = TYPE$E.Dimension;
	var PLUSSIGN$8 = 0x002b; // U+002B PLUS SIGN (+)
	var HYPHENMINUS$4 = 0x002d; // U+002D HYPHEN-MINUS (-)
	var N$4 = 0x006e; // U+006E LATIN SMALL LETTER N (n)
	var DISALLOW_SIGN$1 = true;
	var ALLOW_SIGN$1 = false;

	function isDelim$1(token, code) {
		return token !== null && token.type === DELIM$6 && token.value.charCodeAt(0) === code;
	}

	function skipSC(token, offset, getNextToken) {
		while (token !== null && (token.type === WHITESPACE$b || token.type === COMMENT$9)) {
			token = getNextToken(++offset);
		}

		return offset;
	}

	function checkInteger$1(token, valueOffset, disallowSign, offset) {
		if (!token) {
			return 0;
		}

		var code = token.value.charCodeAt(valueOffset);

		if (code === PLUSSIGN$8 || code === HYPHENMINUS$4) {
			if (disallowSign) {
				// Number sign is not allowed
				return 0;
			}
			valueOffset++;
		}

		for (; valueOffset < token.value.length; valueOffset++) {
			if (!isDigit$3(token.value.charCodeAt(valueOffset))) {
				// Integer is expected
				return 0;
			}
		}

		return offset + 1;
	}

	// ... <signed-integer>
	// ... ['+' | '-'] <signless-integer>
	function consumeB$1(token, offset_, getNextToken) {
		var sign = false;
		var offset = skipSC(token, offset_, getNextToken);

		token = getNextToken(offset);

		if (token === null) {
			return offset_;
		}

		if (token.type !== NUMBER$9) {
			if (isDelim$1(token, PLUSSIGN$8) || isDelim$1(token, HYPHENMINUS$4)) {
				sign = true;
				offset = skipSC(getNextToken(++offset), offset, getNextToken);
				token = getNextToken(offset);

				if (token === null && token.type !== NUMBER$9) {
					return 0;
				}
			} else {
				return offset_;
			}
		}

		if (!sign) {
			var code = token.value.charCodeAt(0);
			if (code !== PLUSSIGN$8 && code !== HYPHENMINUS$4) {
				// Number sign is expected
				return 0;
			}
		}

		return checkInteger$1(token, sign ? 0 : 1, sign, offset);
	}

	// An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
	var genericAnPlusB = function anPlusB(token, getNextToken) {
		/* eslint-disable brace-style*/
		var offset = 0;

		if (!token) {
			return 0;
		}

		// <integer>
		if (token.type === NUMBER$9) {
			return checkInteger$1(token, 0, ALLOW_SIGN$1, offset); // b
		}
		// -n
		// -n <signed-integer>
		// -n ['+' | '-'] <signless-integer>
		// -n- <signless-integer>
		// <dashndashdigit-ident>
		if (token.type === IDENT$i && token.value.charCodeAt(0) === HYPHENMINUS$4) {
			// expect 1st char is N
			if (!cmpChar$4(token.value, 1, N$4)) {
				return 0;
			}

			switch (token.value.length) {
				// -n
				// -n <signed-integer>
				// -n ['+' | '-'] <signless-integer>
				case 2:
					return consumeB$1(getNextToken(++offset), offset, getNextToken);

				// -n- <signless-integer>
				case 3:
					if (token.value.charCodeAt(2) !== HYPHENMINUS$4) {
						return 0;
					}

					offset = skipSC(getNextToken(++offset), offset, getNextToken);
					token = getNextToken(offset);

					return checkInteger$1(token, 0, DISALLOW_SIGN$1, offset);

				// <dashndashdigit-ident>
				default:
					if (token.value.charCodeAt(2) !== HYPHENMINUS$4) {
						return 0;
					}

					return checkInteger$1(token, 3, DISALLOW_SIGN$1, offset);
			}
		}
		// '+'? n
		// '+'? n <signed-integer>
		// '+'? n ['+' | '-'] <signless-integer>
		// '+'? n- <signless-integer>
		// '+'? <ndashdigit-ident>
		if (token.type === IDENT$i || (isDelim$1(token, PLUSSIGN$8) && getNextToken(offset + 1).type === IDENT$i)) {
			// just ignore a plus
			if (token.type !== IDENT$i) {
				token = getNextToken(++offset);
			}

			if (token === null || !cmpChar$4(token.value, 0, N$4)) {
				return 0;
			}

			switch (token.value.length) {
				// '+'? n
				// '+'? n <signed-integer>
				// '+'? n ['+' | '-'] <signless-integer>
				case 1:
					return consumeB$1(getNextToken(++offset), offset, getNextToken);

				// '+'? n- <signless-integer>
				case 2:
					if (token.value.charCodeAt(1) !== HYPHENMINUS$4) {
						return 0;
					}

					offset = skipSC(getNextToken(++offset), offset, getNextToken);
					token = getNextToken(offset);

					return checkInteger$1(token, 0, DISALLOW_SIGN$1, offset);

				// '+'? <ndashdigit-ident>
				default:
					if (token.value.charCodeAt(1) !== HYPHENMINUS$4) {
						return 0;
					}

					return checkInteger$1(token, 2, DISALLOW_SIGN$1, offset);
			}
		}
		// <ndashdigit-dimension>
		// <ndash-dimension> <signless-integer>
		// <n-dimension>
		// <n-dimension> <signed-integer>
		// <n-dimension> ['+' | '-'] <signless-integer>
		if (token.type === DIMENSION$7) {
			var code = token.value.charCodeAt(0);
			var sign = code === PLUSSIGN$8 || code === HYPHENMINUS$4 ? 1 : 0;

			for (var i = sign; i < token.value.length; i++) {
				if (!isDigit$3(token.value.charCodeAt(i))) {
					break;
				}
			}

			if (i === sign) {
				// Integer is expected
				return 0;
			}

			if (!cmpChar$4(token.value, i, N$4)) {
				return 0;
			}

			// <n-dimension>
			// <n-dimension> <signed-integer>
			// <n-dimension> ['+' | '-'] <signless-integer>
			if (i + 1 === token.value.length) {
				return consumeB$1(getNextToken(++offset), offset, getNextToken);
			}
			if (token.value.charCodeAt(i + 1) !== HYPHENMINUS$4) {
				return 0;
			}

			// <ndash-dimension> <signless-integer>
			if (i + 2 === token.value.length) {
				offset = skipSC(getNextToken(++offset), offset, getNextToken);
				token = getNextToken(offset);

				return checkInteger$1(token, 0, DISALLOW_SIGN$1, offset);
			}
			// <ndashdigit-dimension>

			return checkInteger$1(token, i + 2, DISALLOW_SIGN$1, offset);
		}

		return 0;
	};

	var isHexDigit$2 = tokenizer$3.isHexDigit;
	var cmpChar$3 = tokenizer$3.cmpChar;
	var TYPE$D = tokenizer$3.TYPE;

	var IDENT$h = TYPE$D.Ident;
	var DELIM$5 = TYPE$D.Delim;
	var NUMBER$8 = TYPE$D.Number;
	var DIMENSION$6 = TYPE$D.Dimension;
	var PLUSSIGN$7 = 0x002b; // U+002B PLUS SIGN (+)
	var HYPHENMINUS$3 = 0x002d; // U+002D HYPHEN-MINUS (-)
	var QUESTIONMARK$2 = 0x003f; // U+003F QUESTION MARK (?)
	var U$2 = 0x0075; // U+0075 LATIN SMALL LETTER U (u)

	function isDelim(token, code) {
		return token !== null && token.type === DELIM$5 && token.value.charCodeAt(0) === code;
	}

	function startsWith$1(token, code) {
		return token.value.charCodeAt(0) === code;
	}

	function hexSequence(token, offset, allowDash) {
		for (var pos = offset, hexlen = 0; pos < token.value.length; pos++) {
			var code = token.value.charCodeAt(pos);

			if (code === HYPHENMINUS$3 && allowDash && hexlen !== 0) {
				if (hexSequence(token, offset + hexlen + 1, false) > 0) {
					return 6; // dissallow following question marks
				}

				return 0; // dash at the ending of a hex sequence is not allowed
			}

			if (!isHexDigit$2(code)) {
				return 0; // not a hex digit
			}

			if (++hexlen > 6) {
				return 0; // too many hex digits
			}
		}

		return hexlen;
	}

	function withQuestionMarkSequence(consumed, length, getNextToken) {
		if (!consumed) {
			return 0; // nothing consumed
		}

		while (isDelim(getNextToken(length), QUESTIONMARK$2)) {
			if (++consumed > 6) {
				return 0; // too many question marks
			}

			length++;
		}

		return length;
	}

	// https://drafts.csswg.org/css-syntax/#urange
	// Informally, the <urange> production has three forms:
	// U+0001
	//      Defines a range consisting of a single code point, in this case the code point "1".
	// U+0001-00ff
	//      Defines a range of codepoints between the first and the second value, in this case
	//      the range between "1" and "ff" (255 in decimal) inclusive.
	// U+00??
	//      Defines a range of codepoints where the "?" characters range over all hex digits,
	//      in this case defining the same as the value U+0000-00ff.
	// In each form, a maximum of 6 digits is allowed for each hexadecimal number (if you treat "?" as a hexadecimal digit).
	//
	// <urange> =
	//   u '+' <ident-token> '?'* |
	//   u <dimension-token> '?'* |
	//   u <number-token> '?'* |
	//   u <number-token> <dimension-token> |
	//   u <number-token> <number-token> |
	//   u '+' '?'+
	var genericUrange = function urange(token, getNextToken) {
		var length = 0;

		// should start with `u` or `U`
		if (token === null || token.type !== IDENT$h || !cmpChar$3(token.value, 0, U$2)) {
			return 0;
		}

		token = getNextToken(++length);
		if (token === null) {
			return 0;
		}

		// u '+' <ident-token> '?'*
		// u '+' '?'+
		if (isDelim(token, PLUSSIGN$7)) {
			token = getNextToken(++length);
			if (token === null) {
				return 0;
			}

			if (token.type === IDENT$h) {
				// u '+' <ident-token> '?'*
				return withQuestionMarkSequence(hexSequence(token, 0, true), ++length, getNextToken);
			}

			if (isDelim(token, QUESTIONMARK$2)) {
				// u '+' '?'+
				return withQuestionMarkSequence(1, ++length, getNextToken);
			}

			// Hex digit or question mark is expected
			return 0;
		}

		// u <number-token> '?'*
		// u <number-token> <dimension-token>
		// u <number-token> <number-token>
		if (token.type === NUMBER$8) {
			if (!startsWith$1(token, PLUSSIGN$7)) {
				return 0;
			}

			var consumedHexLength = hexSequence(token, 1, true);
			if (consumedHexLength === 0) {
				return 0;
			}

			token = getNextToken(++length);
			if (token === null) {
				// u <number-token> <eof>
				return length;
			}

			if (token.type === DIMENSION$6 || token.type === NUMBER$8) {
				// u <number-token> <dimension-token>
				// u <number-token> <number-token>
				if (!startsWith$1(token, HYPHENMINUS$3) || !hexSequence(token, 1, false)) {
					return 0;
				}

				return length + 1;
			}

			// u <number-token> '?'*
			return withQuestionMarkSequence(consumedHexLength, length, getNextToken);
		}

		// u <dimension-token> '?'*
		if (token.type === DIMENSION$6) {
			if (!startsWith$1(token, PLUSSIGN$7)) {
				return 0;
			}

			return withQuestionMarkSequence(hexSequence(token, 1, true), ++length, getNextToken);
		}

		return 0;
	};

	var tokenizer$2 = tokenizer$3;
	var isIdentifierStart = tokenizer$2.isIdentifierStart;
	var isHexDigit$1 = tokenizer$2.isHexDigit;
	var isDigit$2 = tokenizer$2.isDigit;
	var cmpStr$3 = tokenizer$2.cmpStr;
	var consumeNumber$3 = tokenizer$2.consumeNumber;
	var TYPE$C = tokenizer$2.TYPE;
	var anPlusB = genericAnPlusB;
	var urange = genericUrange;

	var cssWideKeywords$1 = ["unset", "initial", "inherit"];
	var calcFunctionNames = ["calc(", "-moz-calc(", "-webkit-calc("];

	// https://www.w3.org/TR/css-values-3/#lengths
	var LENGTH = {
		// absolute length units
		px: true,
		mm: true,
		cm: true,
		in: true,
		pt: true,
		pc: true,
		q: true,

		// relative length units
		em: true,
		ex: true,
		ch: true,
		rem: true,

		// viewport-percentage lengths
		vh: true,
		vw: true,
		vmin: true,
		vmax: true,
		vm: true,
	};

	var ANGLE = {
		deg: true,
		grad: true,
		rad: true,
		turn: true,
	};

	var TIME = {
		s: true,
		ms: true,
	};

	var FREQUENCY = {
		hz: true,
		khz: true,
	};

	// https://www.w3.org/TR/css-values-3/#resolution (https://drafts.csswg.org/css-values/#resolution)
	var RESOLUTION = {
		dpi: true,
		dpcm: true,
		dppx: true,
		x: true, // https://github.com/w3c/csswg-drafts/issues/461
	};

	// https://drafts.csswg.org/css-grid/#fr-unit
	var FLEX = {
		fr: true,
	};

	// https://www.w3.org/TR/css3-speech/#mixing-props-voice-volume
	var DECIBEL = {
		db: true,
	};

	// https://www.w3.org/TR/css3-speech/#voice-props-voice-pitch
	var SEMITONES = {
		st: true,
	};

	// safe char code getter
	function charCode(str, index) {
		return index < str.length ? str.charCodeAt(index) : 0;
	}

	function eqStr(actual, expected) {
		return cmpStr$3(actual, 0, actual.length, expected);
	}

	function eqStrAny(actual, expected) {
		for (var i = 0; i < expected.length; i++) {
			if (eqStr(actual, expected[i])) {
				return true;
			}
		}

		return false;
	}

	// IE postfix hack, i.e. 123\0 or 123px\9
	function isPostfixIeHack(str, offset) {
		if (offset !== str.length - 2) {
			return false;
		}

		return (
			str.charCodeAt(offset) === 0x005c && // U+005C REVERSE SOLIDUS (\)
			isDigit$2(str.charCodeAt(offset + 1))
		);
	}

	function outOfRange(opts, value, numEnd) {
		if (opts && opts.type === "Range") {
			var num = Number(numEnd !== undefined && numEnd !== value.length ? value.substr(0, numEnd) : value);

			if (Number.isNaN(num)) {
				return true;
			}

			if (opts.min !== null && num < opts.min) {
				return true;
			}

			if (opts.max !== null && num > opts.max) {
				return true;
			}
		}

		return false;
	}

	function consumeFunction(token, getNextToken) {
		var startIdx = token.index;
		var length = 0;

		// balanced token consuming
		do {
			length++;

			if (token.balance <= startIdx) {
				break;
			}
		} while ((token = getNextToken(length)));

		return length;
	}

	// TODO: implement
	// can be used wherever <length>, <frequency>, <angle>, <time>, <percentage>, <number>, or <integer> values are allowed
	// https://drafts.csswg.org/css-values/#calc-notation
	function calc(next) {
		return (token, getNextToken, opts) => {
			if (token === null) {
				return 0;
			}

			if (token.type === TYPE$C.Function && eqStrAny(token.value, calcFunctionNames)) {
				return consumeFunction(token, getNextToken);
			}

			return next(token, getNextToken, opts);
		};
	}

	function tokenType(expectedTokenType) {
		return (token) => {
			if (token === null || token.type !== expectedTokenType) {
				return 0;
			}

			return 1;
		};
	}

	function func(name) {
		name = `${name}(`;

		return (token, getNextToken) => {
			if (token !== null && eqStr(token.value, name)) {
				return consumeFunction(token, getNextToken);
			}

			return 0;
		};
	}

	// =========================
	// Complex types
	//

	// https://drafts.csswg.org/css-values-4/#custom-idents
	// 4.2. Author-defined Identifiers: the <custom-ident> type
	// Some properties accept arbitrary author-defined identifiers as a component value.
	// This generic data type is denoted by <custom-ident>, and represents any valid CSS identifier
	// that would not be misinterpreted as a pre-defined keyword in that property’s value definition.
	//
	// See also: https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident
	function customIdent(token) {
		if (token === null || token.type !== TYPE$C.Ident) {
			return 0;
		}

		var name = token.value.toLowerCase();

		// The CSS-wide keywords are not valid <custom-ident>s
		if (eqStrAny(name, cssWideKeywords$1)) {
			return 0;
		}

		// The default keyword is reserved and is also not a valid <custom-ident>
		if (eqStr(name, "default")) {
			return 0;
		}

		// TODO: ignore property specific keywords (as described https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident)
		// Specifications using <custom-ident> must specify clearly what other keywords
		// are excluded from <custom-ident>, if any—for example by saying that any pre-defined keywords
		// in that property’s value definition are excluded. Excluded keywords are excluded
		// in all ASCII case permutations.

		return 1;
	}

	// https://drafts.csswg.org/css-variables/#typedef-custom-property-name
	// A custom property is any property whose name starts with two dashes (U+002D HYPHEN-MINUS), like --foo.
	// The <custom-property-name> production corresponds to this: it’s defined as any valid identifier
	// that starts with two dashes, except -- itself, which is reserved for future use by CSS.
	// NOTE: Current implementation treat `--` as a valid name since most (all?) major browsers treat it as valid.
	function customPropertyName(token) {
		// ... defined as any valid identifier
		if (token === null || token.type !== TYPE$C.Ident) {
			return 0;
		}

		// ... that starts with two dashes (U+002D HYPHEN-MINUS)
		if (charCode(token.value, 0) !== 0x002d || charCode(token.value, 1) !== 0x002d) {
			return 0;
		}

		return 1;
	}

	// https://drafts.csswg.org/css-color-4/#hex-notation
	// The syntax of a <hex-color> is a <hash-token> token whose value consists of 3, 4, 6, or 8 hexadecimal digits.
	// In other words, a hex color is written as a hash character, "#", followed by some number of digits 0-9 or
	// letters a-f (the case of the letters doesn’t matter - #00ff00 is identical to #00FF00).
	function hexColor(token) {
		if (token === null || token.type !== TYPE$C.Hash) {
			return 0;
		}

		var length = token.value.length;

		// valid values (length): #rgb (4), #rgba (5), #rrggbb (7), #rrggbbaa (9)
		if (length !== 4 && length !== 5 && length !== 7 && length !== 9) {
			return 0;
		}

		for (var i = 1; i < length; i++) {
			if (!isHexDigit$1(token.value.charCodeAt(i))) {
				return 0;
			}
		}

		return 1;
	}

	function idSelector(token) {
		if (token === null || token.type !== TYPE$C.Hash) {
			return 0;
		}

		if (!isIdentifierStart(charCode(token.value, 1), charCode(token.value, 2), charCode(token.value, 3))) {
			return 0;
		}

		return 1;
	}

	// https://drafts.csswg.org/css-syntax/#any-value
	// It represents the entirety of what a valid declaration can have as its value.
	function declarationValue(token, getNextToken) {
		if (!token) {
			return 0;
		}

		var length = 0;
		var level = 0;
		var startIdx = token.index;

		// The <declaration-value> production matches any sequence of one or more tokens,
		// so long as the sequence ...
		scan: do {
			switch (token.type) {
				// ... does not contain <bad-string-token>, <bad-url-token>,
				case TYPE$C.BadString:
				case TYPE$C.BadUrl:
					break scan;

				// ... unmatched <)-token>, <]-token>, or <}-token>,
				case TYPE$C.RightCurlyBracket:
				case TYPE$C.RightParenthesis:
				case TYPE$C.RightSquareBracket:
					if (token.balance > token.index || token.balance < startIdx) {
						break scan;
					}

					level--;
					break;

				// ... or top-level <semicolon-token> tokens
				case TYPE$C.Semicolon:
					if (level === 0) {
						break scan;
					}

					break;

				// ... or <delim-token> tokens with a value of "!"
				case TYPE$C.Delim:
					if (token.value === "!" && level === 0) {
						break scan;
					}

					break;

				case TYPE$C.Function:
				case TYPE$C.LeftParenthesis:
				case TYPE$C.LeftSquareBracket:
				case TYPE$C.LeftCurlyBracket:
					level++;
					break;
			}

			length++;

			// until balance closing
			if (token.balance <= startIdx) {
				break;
			}
		} while ((token = getNextToken(length)));

		return length;
	}

	// https://drafts.csswg.org/css-syntax/#any-value
	// The <any-value> production is identical to <declaration-value>, but also
	// allows top-level <semicolon-token> tokens and <delim-token> tokens
	// with a value of "!". It represents the entirety of what valid CSS can be in any context.
	function anyValue(token, getNextToken) {
		if (!token) {
			return 0;
		}

		var startIdx = token.index;
		var length = 0;

		// The <any-value> production matches any sequence of one or more tokens,
		// so long as the sequence ...
		scan: do {
			switch (token.type) {
				// ... does not contain <bad-string-token>, <bad-url-token>,
				case TYPE$C.BadString:
				case TYPE$C.BadUrl:
					break scan;

				// ... unmatched <)-token>, <]-token>, or <}-token>,
				case TYPE$C.RightCurlyBracket:
				case TYPE$C.RightParenthesis:
				case TYPE$C.RightSquareBracket:
					if (token.balance > token.index || token.balance < startIdx) {
						break scan;
					}

					break;
			}

			length++;

			// until balance closing
			if (token.balance <= startIdx) {
				break;
			}
		} while ((token = getNextToken(length)));

		return length;
	}

	// =========================
	// Dimensions
	//

	function dimension(type) {
		return (token, _getNextToken, opts) => {
			if (token === null || token.type !== TYPE$C.Dimension) {
				return 0;
			}

			var numberEnd = consumeNumber$3(token.value, 0);

			// check unit
			if (type !== null) {
				// check for IE postfix hack, i.e. 123px\0 or 123px\9
				var reverseSolidusOffset = token.value.indexOf("\\", numberEnd);
				var unit =
					reverseSolidusOffset === -1 || !isPostfixIeHack(token.value, reverseSolidusOffset)
						? token.value.substr(numberEnd)
						: token.value.substring(numberEnd, reverseSolidusOffset);

				if (Object.hasOwn(type, unit.toLowerCase()) === false) {
					return 0;
				}
			}

			// check range if specified
			if (outOfRange(opts, token.value, numberEnd)) {
				return 0;
			}

			return 1;
		};
	}

	// =========================
	// Percentage
	//

	// §5.5. Percentages: the <percentage> type
	// https://drafts.csswg.org/css-values-4/#percentages
	function percentage(token, _getNextToken, opts) {
		// ... corresponds to the <percentage-token> production
		if (token === null || token.type !== TYPE$C.Percentage) {
			return 0;
		}

		// check range if specified
		if (outOfRange(opts, token.value, token.value.length - 1)) {
			return 0;
		}

		return 1;
	}

	// =========================
	// Numeric
	//

	// https://drafts.csswg.org/css-values-4/#numbers
	// The value <zero> represents a literal number with the value 0. Expressions that merely
	// evaluate to a <number> with the value 0 (for example, calc(0)) do not match <zero>;
	// only literal <number-token>s do.
	function zero(next) {
		if (typeof next !== "function") {
			next = () => 0;
		}

		return (token, getNextToken, opts) => {
			if (token !== null && token.type === TYPE$C.Number) {
				if (Number(token.value) === 0) {
					return 1;
				}
			}

			return next(token, getNextToken, opts);
		};
	}

	// § 5.3. Real Numbers: the <number> type
	// https://drafts.csswg.org/css-values-4/#numbers
	// Number values are denoted by <number>, and represent real numbers, possibly with a fractional component.
	// ... It corresponds to the <number-token> production
	function number(token, _getNextToken, opts) {
		if (token === null) {
			return 0;
		}

		var numberEnd = consumeNumber$3(token.value, 0);
		var isNumber = numberEnd === token.value.length;
		if (!isNumber && !isPostfixIeHack(token.value, numberEnd)) {
			return 0;
		}

		// check range if specified
		if (outOfRange(opts, token.value, numberEnd)) {
			return 0;
		}

		return 1;
	}

	// §5.2. Integers: the <integer> type
	// https://drafts.csswg.org/css-values-4/#integers
	function integer(token, _getNextToken, opts) {
		// ... corresponds to a subset of the <number-token> production
		if (token === null || token.type !== TYPE$C.Number) {
			return 0;
		}

		// The first digit of an integer may be immediately preceded by `-` or `+` to indicate the integer’s sign.
		var i =
			token.value.charCodeAt(0) === 0x002b || // U+002B PLUS SIGN (+)
			token.value.charCodeAt(0) === 0x002d
				? 1
				: 0; // U+002D HYPHEN-MINUS (-)

		// When written literally, an integer is one or more decimal digits 0 through 9 ...
		for (; i < token.value.length; i++) {
			if (!isDigit$2(token.value.charCodeAt(i))) {
				return 0;
			}
		}

		// check range if specified
		if (outOfRange(opts, token.value, i)) {
			return 0;
		}

		return 1;
	}

	var generic$1 = {
		// token types
		"ident-token": tokenType(TYPE$C.Ident),
		"function-token": tokenType(TYPE$C.Function),
		"at-keyword-token": tokenType(TYPE$C.AtKeyword),
		"hash-token": tokenType(TYPE$C.Hash),
		"string-token": tokenType(TYPE$C.String),
		"bad-string-token": tokenType(TYPE$C.BadString),
		"url-token": tokenType(TYPE$C.Url),
		"bad-url-token": tokenType(TYPE$C.BadUrl),
		"delim-token": tokenType(TYPE$C.Delim),
		"number-token": tokenType(TYPE$C.Number),
		"percentage-token": tokenType(TYPE$C.Percentage),
		"dimension-token": tokenType(TYPE$C.Dimension),
		"whitespace-token": tokenType(TYPE$C.WhiteSpace),
		"CDO-token": tokenType(TYPE$C.CDO),
		"CDC-token": tokenType(TYPE$C.CDC),
		"colon-token": tokenType(TYPE$C.Colon),
		"semicolon-token": tokenType(TYPE$C.Semicolon),
		"comma-token": tokenType(TYPE$C.Comma),
		"[-token": tokenType(TYPE$C.LeftSquareBracket),
		"]-token": tokenType(TYPE$C.RightSquareBracket),
		"(-token": tokenType(TYPE$C.LeftParenthesis),
		")-token": tokenType(TYPE$C.RightParenthesis),
		"{-token": tokenType(TYPE$C.LeftCurlyBracket),
		"}-token": tokenType(TYPE$C.RightCurlyBracket),

		// token type aliases
		string: tokenType(TYPE$C.String),
		ident: tokenType(TYPE$C.Ident),

		// complex types
		"custom-ident": customIdent,
		"custom-property-name": customPropertyName,
		"hex-color": hexColor,
		"id-selector": idSelector, // element( <id-selector> )
		"an-plus-b": anPlusB,
		urange: urange,
		"declaration-value": declarationValue,
		"any-value": anyValue,

		// dimensions
		dimension: calc(dimension(null)),
		angle: calc(dimension(ANGLE)),
		decibel: calc(dimension(DECIBEL)),
		frequency: calc(dimension(FREQUENCY)),
		flex: calc(dimension(FLEX)),
		length: calc(zero(dimension(LENGTH))),
		resolution: calc(dimension(RESOLUTION)),
		semitones: calc(dimension(SEMITONES)),
		time: calc(dimension(TIME)),

		// percentage
		percentage: calc(percentage),

		// numeric
		zero: zero(),
		number: calc(number),
		integer: calc(integer),

		// old IE stuff
		"-ms-legacy-expression": func("expression"),
	};

	var createCustomError = createCustomError$3;

	var _SyntaxError = function SyntaxError(message, input, offset) {
		var error = createCustomError("SyntaxError", message);

		error.input = input;
		error.offset = offset;
		error.rawMessage = message;
		error.message =
			error.rawMessage +
			"\n" +
			"  " +
			error.input +
			"\n" +
			"--" +
			new Array((error.offset || error.input.length) + 1).join("-") +
			"^";

		return error;
	};

	var SyntaxError$3 = _SyntaxError;

	var TAB$1 = 9;
	var N$3 = 10;
	var F$2 = 12;
	var R$2 = 13;
	var SPACE$2 = 32;

	var Tokenizer$1 = function (str) {
		this.str = str;
		this.pos = 0;
	};

	Tokenizer$1.prototype = {
		charCodeAt: function (pos) {
			return pos < this.str.length ? this.str.charCodeAt(pos) : 0;
		},
		charCode: function () {
			return this.charCodeAt(this.pos);
		},
		nextCharCode: function () {
			return this.charCodeAt(this.pos + 1);
		},
		nextNonWsCode: function (pos) {
			return this.charCodeAt(this.findWsEnd(pos));
		},
		findWsEnd: function (pos) {
			for (; pos < this.str.length; pos++) {
				var code = this.str.charCodeAt(pos);
				if (code !== R$2 && code !== N$3 && code !== F$2 && code !== SPACE$2 && code !== TAB$1) {
					break;
				}
			}

			return pos;
		},
		substringToPos: function (end) {
			return this.str.substring(this.pos, (this.pos = end));
		},
		eat: function (code) {
			if (this.charCode() !== code) {
				this.error(`Expect \`${String.fromCharCode(code)}\``);
			}

			this.pos++;
		},
		peek: function () {
			return this.pos < this.str.length ? this.str.charAt(this.pos++) : "";
		},
		error: function (message) {
			throw new SyntaxError$3(message, this.str, this.pos);
		},
	};

	var tokenizer$1 = Tokenizer$1;

	var Tokenizer = tokenizer$1;
	var TAB = 9;
	var N$2 = 10;
	var F$1 = 12;
	var R$1 = 13;
	var SPACE$1 = 32;
	var EXCLAMATIONMARK$3 = 33; // !
	var NUMBERSIGN$4 = 35; // #
	var AMPERSAND$1 = 38; // &
	var APOSTROPHE = 39; // '
	var LEFTPARENTHESIS$7 = 40; // (
	var RIGHTPARENTHESIS$7 = 41; // )
	var ASTERISK$6 = 42; // *
	var PLUSSIGN$6 = 43; // +
	var COMMA$4 = 44; // ,
	var HYPERMINUS = 45; // -
	var LESSTHANSIGN = 60; // <
	var GREATERTHANSIGN$2 = 62; // >
	var QUESTIONMARK$1 = 63; // ?
	var COMMERCIALAT = 64; // @
	var LEFTSQUAREBRACKET$4 = 91; // [
	var RIGHTSQUAREBRACKET$2 = 93; // ]
	var LEFTCURLYBRACKET$4 = 123; // {
	var VERTICALLINE$3 = 124; // |
	var RIGHTCURLYBRACKET$2 = 125; // }
	var INFINITY = 8734; // ∞
	var NAME_CHAR = createCharMap((ch) => /[a-zA-Z0-9-]/.test(ch));
	var COMBINATOR_PRECEDENCE = {
		" ": 1,
		"&&": 2,
		"||": 3,
		"|": 4,
	};

	function createCharMap(fn) {
		var array = typeof Uint32Array === "function" ? new Uint32Array(128) : new Array(128);
		for (var i = 0; i < 128; i++) {
			array[i] = fn(String.fromCharCode(i)) ? 1 : 0;
		}
		return array;
	}

	function scanSpaces(tokenizer) {
		return tokenizer.substringToPos(tokenizer.findWsEnd(tokenizer.pos));
	}

	function scanWord(tokenizer) {
		var end = tokenizer.pos;

		for (; end < tokenizer.str.length; end++) {
			var code = tokenizer.str.charCodeAt(end);
			if (code >= 128 || NAME_CHAR[code] === 0) {
				break;
			}
		}

		if (tokenizer.pos === end) {
			tokenizer.error("Expect a keyword");
		}

		return tokenizer.substringToPos(end);
	}

	function scanNumber(tokenizer) {
		var end = tokenizer.pos;

		for (; end < tokenizer.str.length; end++) {
			var code = tokenizer.str.charCodeAt(end);
			if (code < 48 || code > 57) {
				break;
			}
		}

		if (tokenizer.pos === end) {
			tokenizer.error("Expect a number");
		}

		return tokenizer.substringToPos(end);
	}

	function scanString(tokenizer) {
		var end = tokenizer.str.indexOf("'", tokenizer.pos + 1);

		if (end === -1) {
			tokenizer.pos = tokenizer.str.length;
			tokenizer.error("Expect an apostrophe");
		}

		return tokenizer.substringToPos(end + 1);
	}

	function readMultiplierRange(tokenizer) {
		var min = null;
		var max = null;

		tokenizer.eat(LEFTCURLYBRACKET$4);

		min = scanNumber(tokenizer);

		if (tokenizer.charCode() === COMMA$4) {
			tokenizer.pos++;
			if (tokenizer.charCode() !== RIGHTCURLYBRACKET$2) {
				max = scanNumber(tokenizer);
			}
		} else {
			max = min;
		}

		tokenizer.eat(RIGHTCURLYBRACKET$2);

		return {
			min: Number(min),
			max: max ? Number(max) : 0,
		};
	}

	function readMultiplier(tokenizer) {
		var range = null;
		var comma = false;

		switch (tokenizer.charCode()) {
			case ASTERISK$6:
				tokenizer.pos++;

				range = {
					min: 0,
					max: 0,
				};

				break;

			case PLUSSIGN$6:
				tokenizer.pos++;

				range = {
					min: 1,
					max: 0,
				};

				break;

			case QUESTIONMARK$1:
				tokenizer.pos++;

				range = {
					min: 0,
					max: 1,
				};

				break;

			case NUMBERSIGN$4:
				tokenizer.pos++;

				comma = true;

				if (tokenizer.charCode() === LEFTCURLYBRACKET$4) {
					range = readMultiplierRange(tokenizer);
				} else {
					range = {
						min: 1,
						max: 0,
					};
				}

				break;

			case LEFTCURLYBRACKET$4:
				range = readMultiplierRange(tokenizer);
				break;

			default:
				return null;
		}

		return {
			type: "Multiplier",
			comma: comma,
			min: range.min,
			max: range.max,
			term: null,
		};
	}

	function maybeMultiplied(tokenizer, node) {
		var multiplier = readMultiplier(tokenizer);

		if (multiplier !== null) {
			multiplier.term = node;
			return multiplier;
		}

		return node;
	}

	function maybeToken(tokenizer) {
		var ch = tokenizer.peek();

		if (ch === "") {
			return null;
		}

		return {
			type: "Token",
			value: ch,
		};
	}

	function readProperty$1(tokenizer) {
		var name;

		tokenizer.eat(LESSTHANSIGN);
		tokenizer.eat(APOSTROPHE);

		name = scanWord(tokenizer);

		tokenizer.eat(APOSTROPHE);
		tokenizer.eat(GREATERTHANSIGN$2);

		return maybeMultiplied(tokenizer, {
			type: "Property",
			name: name,
		});
	}

	// https://drafts.csswg.org/css-values-3/#numeric-ranges
	// 4.1. Range Restrictions and Range Definition Notation
	//
	// Range restrictions can be annotated in the numeric type notation using CSS bracketed
	// range notation—[min,max]—within the angle brackets, after the identifying keyword,
	// indicating a closed range between (and including) min and max.
	// For example, <integer [0, 10]> indicates an integer between 0 and 10, inclusive.
	function readTypeRange(tokenizer) {
		// use null for Infinity to make AST format JSON serializable/deserializable
		var min = null; // -Infinity
		var max = null; // Infinity
		var sign = 1;

		tokenizer.eat(LEFTSQUAREBRACKET$4);

		if (tokenizer.charCode() === HYPERMINUS) {
			tokenizer.peek();
			sign = -1;
		}

		if (sign === -1 && tokenizer.charCode() === INFINITY) {
			tokenizer.peek();
		} else {
			min = sign * Number(scanNumber(tokenizer));
		}

		scanSpaces(tokenizer);
		tokenizer.eat(COMMA$4);
		scanSpaces(tokenizer);

		if (tokenizer.charCode() === INFINITY) {
			tokenizer.peek();
		} else {
			sign = 1;

			if (tokenizer.charCode() === HYPERMINUS) {
				tokenizer.peek();
				sign = -1;
			}

			max = sign * Number(scanNumber(tokenizer));
		}

		tokenizer.eat(RIGHTSQUAREBRACKET$2);

		// If no range is indicated, either by using the bracketed range notation
		// or in the property description, then [−∞,∞] is assumed.
		if (min === null && max === null) {
			return null;
		}

		return {
			type: "Range",
			min: min,
			max: max,
		};
	}

	function readType(tokenizer) {
		var name;
		var opts = null;

		tokenizer.eat(LESSTHANSIGN);
		name = scanWord(tokenizer);

		if (tokenizer.charCode() === LEFTPARENTHESIS$7 && tokenizer.nextCharCode() === RIGHTPARENTHESIS$7) {
			tokenizer.pos += 2;
			name += "()";
		}

		if (tokenizer.charCodeAt(tokenizer.findWsEnd(tokenizer.pos)) === LEFTSQUAREBRACKET$4) {
			scanSpaces(tokenizer);
			opts = readTypeRange(tokenizer);
		}

		tokenizer.eat(GREATERTHANSIGN$2);

		return maybeMultiplied(tokenizer, {
			type: "Type",
			name: name,
			opts: opts,
		});
	}

	function readKeywordOrFunction(tokenizer) {
		var name;

		name = scanWord(tokenizer);

		if (tokenizer.charCode() === LEFTPARENTHESIS$7) {
			tokenizer.pos++;

			return {
				type: "Function",
				name: name,
			};
		}

		return maybeMultiplied(tokenizer, {
			type: "Keyword",
			name: name,
		});
	}

	function regroupTerms(terms, combinators) {
		function createGroup(terms, combinator) {
			return {
				type: "Group",
				terms: terms,
				combinator: combinator,
				disallowEmpty: false,
				explicit: false,
			};
		}

		combinators = Object.keys(combinators).sort((a, b) => COMBINATOR_PRECEDENCE[a] - COMBINATOR_PRECEDENCE[b]);

		while (combinators.length > 0) {
			var combinator = combinators.shift();
			for (var i = 0, subgroupStart = 0; i < terms.length; i++) {
				var term = terms[i];
				if (term.type === "Combinator") {
					if (term.value === combinator) {
						if (subgroupStart === -1) {
							subgroupStart = i - 1;
						}
						terms.splice(i, 1);
						i--;
					} else {
						if (subgroupStart !== -1 && i - subgroupStart > 1) {
							terms.splice(subgroupStart, i - subgroupStart, createGroup(terms.slice(subgroupStart, i), combinator));
							i = subgroupStart + 1;
						}
						subgroupStart = -1;
					}
				}
			}

			if (subgroupStart !== -1 && combinators.length) {
				terms.splice(subgroupStart, i - subgroupStart, createGroup(terms.slice(subgroupStart, i), combinator));
			}
		}

		return combinator;
	}

	function readImplicitGroup(tokenizer) {
		var terms = [];
		var combinators = {};
		var token;
		var prevToken = null;
		var prevTokenPos = tokenizer.pos;

		while ((token = peek(tokenizer))) {
			if (token.type !== "Spaces") {
				if (token.type === "Combinator") {
					// check for combinator in group beginning and double combinator sequence
					if (prevToken === null || prevToken.type === "Combinator") {
						tokenizer.pos = prevTokenPos;
						tokenizer.error("Unexpected combinator");
					}

					combinators[token.value] = true;
				} else if (prevToken !== null && prevToken.type !== "Combinator") {
					combinators[" "] = true; // a b
					terms.push({
						type: "Combinator",
						value: " ",
					});
				}

				terms.push(token);
				prevToken = token;
				prevTokenPos = tokenizer.pos;
			}
		}

		// check for combinator in group ending
		if (prevToken !== null && prevToken.type === "Combinator") {
			tokenizer.pos -= prevTokenPos;
			tokenizer.error("Unexpected combinator");
		}

		return {
			type: "Group",
			terms: terms,
			combinator: regroupTerms(terms, combinators) || " ",
			disallowEmpty: false,
			explicit: false,
		};
	}

	function readGroup(tokenizer) {
		var result;

		tokenizer.eat(LEFTSQUAREBRACKET$4);
		result = readImplicitGroup(tokenizer);
		tokenizer.eat(RIGHTSQUAREBRACKET$2);

		result.explicit = true;

		if (tokenizer.charCode() === EXCLAMATIONMARK$3) {
			tokenizer.pos++;
			result.disallowEmpty = true;
		}

		return result;
	}

	function peek(tokenizer) {
		var code = tokenizer.charCode();

		if (code < 128 && NAME_CHAR[code] === 1) {
			return readKeywordOrFunction(tokenizer);
		}

		switch (code) {
			case RIGHTSQUAREBRACKET$2:
				// don't eat, stop scan a group
				break;

			case LEFTSQUAREBRACKET$4:
				return maybeMultiplied(tokenizer, readGroup(tokenizer));

			case LESSTHANSIGN:
				return tokenizer.nextCharCode() === APOSTROPHE ? readProperty$1(tokenizer) : readType(tokenizer);

			case VERTICALLINE$3:
				return {
					type: "Combinator",
					value: tokenizer.substringToPos(
						tokenizer.nextCharCode() === VERTICALLINE$3 ? tokenizer.pos + 2 : tokenizer.pos + 1,
					),
				};

			case AMPERSAND$1:
				tokenizer.pos++;
				tokenizer.eat(AMPERSAND$1);

				return {
					type: "Combinator",
					value: "&&",
				};

			case COMMA$4:
				tokenizer.pos++;
				return {
					type: "Comma",
				};

			case APOSTROPHE:
				return maybeMultiplied(tokenizer, {
					type: "String",
					value: scanString(tokenizer),
				});

			case SPACE$1:
			case TAB:
			case N$2:
			case R$1:
			case F$1:
				return {
					type: "Spaces",
					value: scanSpaces(tokenizer),
				};

			case COMMERCIALAT:
				code = tokenizer.nextCharCode();

				if (code < 128 && NAME_CHAR[code] === 1) {
					tokenizer.pos++;
					return {
						type: "AtKeyword",
						name: scanWord(tokenizer),
					};
				}

				return maybeToken(tokenizer);

			case ASTERISK$6:
			case PLUSSIGN$6:
			case QUESTIONMARK$1:
			case NUMBERSIGN$4:
			case EXCLAMATIONMARK$3:
				// prohibited tokens (used as a multiplier start)
				break;

			case LEFTCURLYBRACKET$4:
				// LEFTCURLYBRACKET is allowed since mdn/data uses it w/o quoting
				// check next char isn't a number, because it's likely a disjoined multiplier
				code = tokenizer.nextCharCode();

				if (code < 48 || code > 57) {
					return maybeToken(tokenizer);
				}

				break;

			default:
				return maybeToken(tokenizer);
		}
	}

	function parse$2(source) {
		var tokenizer = new Tokenizer(source);
		var result = readImplicitGroup(tokenizer);

		if (tokenizer.pos !== source.length) {
			tokenizer.error("Unexpected input");
		}

		// reduce redundant groups with single group term
		if (result.terms.length === 1 && result.terms[0].type === "Group") {
			result = result.terms[0];
		}

		return result;
	}

	// warm up parse to elimitate code branches that never execute
	// fix soft deoptimizations (insufficient type feedback)
	parse$2("[a&&<b>#|<'c'>*||e() f{2} /,(% g#{1,2} h{2,})]!");

	var parse_1 = parse$2;

	var noop$2 = () => {};

	function ensureFunction$1(value) {
		return typeof value === "function" ? value : noop$2;
	}

	var walk$1 = (node, options, context) => {
		function walk(node) {
			enter.call(context, node);

			switch (node.type) {
				case "Group":
					node.terms.forEach(walk);
					break;

				case "Multiplier":
					walk(node.term);
					break;

				case "Type":
				case "Property":
				case "Keyword":
				case "AtKeyword":
				case "Function":
				case "String":
				case "Token":
				case "Comma":
					break;

				default:
					throw new Error(`Unknown type: ${node.type}`);
			}

			leave.call(context, node);
		}

		var enter = noop$2;
		var leave = noop$2;

		if (typeof options === "function") {
			enter = options;
		} else if (options) {
			enter = ensureFunction$1(options.enter);
			leave = ensureFunction$1(options.leave);
		}

		if (enter === noop$2 && leave === noop$2) {
			throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
		}

		walk(node);
	};

	var tokenize$2 = tokenizer$3;
	var TokenStream$2 = TokenStream_1;
	var tokenStream = new TokenStream$2();
	var astToTokens = {
		decorator: (handlers) => {
			var curNode = null;
			var prev = { len: 0, node: null };
			var nodes = [prev];
			var buffer = "";

			return {
				children: handlers.children,
				node: function (node) {
					var tmp = curNode;
					curNode = node;
					handlers.node.call(this, node);
					curNode = tmp;
				},
				chunk: (chunk) => {
					buffer += chunk;
					if (prev.node !== curNode) {
						nodes.push({
							len: chunk.length,
							node: curNode,
						});
					} else {
						prev.len += chunk.length;
					}
				},
				result: () => prepareTokens$1(buffer, nodes),
			};
		},
	};

	function prepareTokens$1(str, nodes) {
		var tokens = [];
		var nodesOffset = 0;
		var nodesIndex = 0;
		var currentNode = nodes ? nodes[nodesIndex].node : null;

		tokenize$2(str, tokenStream);

		while (!tokenStream.eof) {
			if (nodes) {
				while (nodesIndex < nodes.length && nodesOffset + nodes[nodesIndex].len <= tokenStream.tokenStart) {
					nodesOffset += nodes[nodesIndex++].len;
					currentNode = nodes[nodesIndex].node;
				}
			}

			tokens.push({
				type: tokenStream.tokenType,
				value: tokenStream.getTokenValue(),
				index: tokenStream.tokenIndex, // TODO: remove it, temporary solution
				balance: tokenStream.balance[tokenStream.tokenIndex], // TODO: remove it, temporary solution
				node: currentNode,
			});
			tokenStream.next();
			// console.log({ ...tokens[tokens.length - 1], node: undefined });
		}

		return tokens;
	}

	var prepareTokens_1 = (value, syntax) => {
		if (typeof value === "string") {
			return prepareTokens$1(value, null);
		}

		return syntax.generate(value, astToTokens);
	};

	var parse$1 = parse_1;

	var MATCH$1 = { type: "Match" };
	var MISMATCH$1 = { type: "Mismatch" };
	var DISALLOW_EMPTY$1 = { type: "DisallowEmpty" };
	var LEFTPARENTHESIS$6 = 40; // (
	var RIGHTPARENTHESIS$6 = 41; // )

	function createCondition(match, thenBranch, elseBranch) {
		// reduce node count
		if (thenBranch === MATCH$1 && elseBranch === MISMATCH$1) {
			return match;
		}

		if (match === MATCH$1 && thenBranch === MATCH$1 && elseBranch === MATCH$1) {
			return match;
		}

		if (match.type === "If" && match.else === MISMATCH$1 && thenBranch === MATCH$1) {
			thenBranch = match.then;
			match = match.match;
		}

		return {
			type: "If",
			match: match,
			then: thenBranch,
			else: elseBranch,
		};
	}

	function isFunctionType(name) {
		return (
			name.length > 2 &&
			name.charCodeAt(name.length - 2) === LEFTPARENTHESIS$6 &&
			name.charCodeAt(name.length - 1) === RIGHTPARENTHESIS$6
		);
	}

	function isEnumCapatible(term) {
		return (
			term.type === "Keyword" ||
			term.type === "AtKeyword" ||
			term.type === "Function" ||
			(term.type === "Type" && isFunctionType(term.name))
		);
	}

	function buildGroupMatchGraph(combinator, terms, atLeastOneTermMatched) {
		switch (combinator) {
			case " ": {
				// Juxtaposing components means that all of them must occur, in the given order.
				//
				// a b c
				// =
				// match a
				//   then match b
				//     then match c
				//       then MATCH
				//       else MISMATCH
				//     else MISMATCH
				//   else MISMATCH
				var result = MATCH$1;

				for (var i = terms.length - 1; i >= 0; i--) {
					var term = terms[i];

					result = createCondition(term, result, MISMATCH$1);
				}
				return result;
			}

			case "|": {
				// A bar (|) separates two or more alternatives: exactly one of them must occur.
				//
				// a | b | c
				// =
				// match a
				//   then MATCH
				//   else match b
				//     then MATCH
				//     else match c
				//       then MATCH
				//       else MISMATCH

				var result = MISMATCH$1;
				var map = null;

				for (var i = terms.length - 1; i >= 0; i--) {
					var term = terms[i];

					// reduce sequence of keywords into a Enum
					if (isEnumCapatible(term)) {
						if (map === null && i > 0 && isEnumCapatible(terms[i - 1])) {
							map = Object.create(null);
							result = createCondition(
								{
									type: "Enum",
									map: map,
								},
								MATCH$1,
								result,
							);
						}

						if (map !== null) {
							var key = (isFunctionType(term.name) ? term.name.slice(0, -1) : term.name).toLowerCase();
							if (key in map === false) {
								map[key] = term;
								continue;
							}
						}
					}

					map = null;

					// create a new conditonal node
					result = createCondition(term, MATCH$1, result);
				}
				return result;
			}

			case "&&": {
				// A double ampersand (&&) separates two or more components,
				// all of which must occur, in any order.

				// Use MatchOnce for groups with a large number of terms,
				// since &&-groups produces at least N!-node trees
				if (terms.length > 5) {
					return {
						type: "MatchOnce",
						terms: terms,
						all: true,
					};
				}

				// Use a combination tree for groups with small number of terms
				//
				// a && b && c
				// =
				// match a
				//   then [b && c]
				//   else match b
				//     then [a && c]
				//     else match c
				//       then [a && b]
				//       else MISMATCH
				//
				// a && b
				// =
				// match a
				//   then match b
				//     then MATCH
				//     else MISMATCH
				//   else match b
				//     then match a
				//       then MATCH
				//       else MISMATCH
				//     else MISMATCH
				var result = MISMATCH$1;

				for (var i = terms.length - 1; i >= 0; i--) {
					var term = terms[i];
					var thenClause;

					if (terms.length > 1) {
						thenClause = buildGroupMatchGraph(
							combinator,
							terms.filter((newGroupTerm) => newGroupTerm !== term),
							false,
						);
					} else {
						thenClause = MATCH$1;
					}

					result = createCondition(term, thenClause, result);
				}
				return result;
			}

			case "||": {
				// A double bar (||) separates two or more options:
				// one or more of them must occur, in any order.

				// Use MatchOnce for groups with a large number of terms,
				// since ||-groups produces at least N!-node trees
				if (terms.length > 5) {
					return {
						type: "MatchOnce",
						terms: terms,
						all: false,
					};
				}

				// Use a combination tree for groups with small number of terms
				//
				// a || b || c
				// =
				// match a
				//   then [b || c]
				//   else match b
				//     then [a || c]
				//     else match c
				//       then [a || b]
				//       else MISMATCH
				//
				// a || b
				// =
				// match a
				//   then match b
				//     then MATCH
				//     else MATCH
				//   else match b
				//     then match a
				//       then MATCH
				//       else MATCH
				//     else MISMATCH
				var result = atLeastOneTermMatched ? MATCH$1 : MISMATCH$1;

				for (var i = terms.length - 1; i >= 0; i--) {
					var term = terms[i];
					var thenClause;

					if (terms.length > 1) {
						thenClause = buildGroupMatchGraph(
							combinator,
							terms.filter((newGroupTerm) => newGroupTerm !== term),
							true,
						);
					} else {
						thenClause = MATCH$1;
					}

					result = createCondition(term, thenClause, result);
				}
				return result;
			}
		}
	}

	function buildMultiplierMatchGraph(node) {
		var result = MATCH$1;
		var matchTerm = buildMatchGraph$1(node.term);

		if (node.max === 0) {
			// disable repeating of empty match to prevent infinite loop
			matchTerm = createCondition(matchTerm, DISALLOW_EMPTY$1, MISMATCH$1);

			// an occurrence count is not limited, make a cycle;
			// to collect more terms on each following matching mismatch
			result = createCondition(
				matchTerm,
				null, // will be a loop
				MISMATCH$1,
			);

			result.then = createCondition(
				MATCH$1,
				MATCH$1,
				result, // make a loop
			);

			if (node.comma) {
				result.then.else = createCondition({ type: "Comma", syntax: node }, result, MISMATCH$1);
			}
		} else {
			// create a match node chain for [min .. max] interval with optional matches
			for (var i = node.min || 1; i <= node.max; i++) {
				if (node.comma && result !== MATCH$1) {
					result = createCondition({ type: "Comma", syntax: node }, result, MISMATCH$1);
				}

				result = createCondition(matchTerm, createCondition(MATCH$1, MATCH$1, result), MISMATCH$1);
			}
		}

		if (node.min === 0) {
			// allow zero match
			result = createCondition(MATCH$1, MATCH$1, result);
		} else {
			// create a match node chain to collect [0 ... min - 1] required matches
			for (var i = 0; i < node.min - 1; i++) {
				if (node.comma && result !== MATCH$1) {
					result = createCondition({ type: "Comma", syntax: node }, result, MISMATCH$1);
				}

				result = createCondition(matchTerm, result, MISMATCH$1);
			}
		}

		return result;
	}

	function buildMatchGraph$1(node) {
		if (typeof node === "function") {
			return {
				type: "Generic",
				fn: node,
			};
		}

		switch (node.type) {
			case "Group": {
				var result = buildGroupMatchGraph(node.combinator, node.terms.map(buildMatchGraph$1), false);

				if (node.disallowEmpty) {
					result = createCondition(result, DISALLOW_EMPTY$1, MISMATCH$1);
				}

				return result;
			}

			case "Multiplier":
				return buildMultiplierMatchGraph(node);

			case "Type":
			case "Property":
				return {
					type: node.type,
					name: node.name,
					syntax: node,
				};

			case "Keyword":
				return {
					type: node.type,
					name: node.name.toLowerCase(),
					syntax: node,
				};

			case "AtKeyword":
				return {
					type: node.type,
					name: `@${node.name.toLowerCase()}`,
					syntax: node,
				};

			case "Function":
				return {
					type: node.type,
					name: `${node.name.toLowerCase()}(`,
					syntax: node,
				};

			case "String":
				// convert a one char length String to a Token
				if (node.value.length === 3) {
					return {
						type: "Token",
						value: node.value.charAt(1),
						syntax: node,
					};
				}

				// otherwise use it as is
				return {
					type: node.type,
					value: node.value.substr(1, node.value.length - 2).replace(/\\'/g, "'"),
					syntax: node,
				};

			case "Token":
				return {
					type: node.type,
					value: node.value,
					syntax: node,
				};

			case "Comma":
				return {
					type: node.type,
					syntax: node,
				};

			default:
				throw new Error("Unknown node type:", node.type);
		}
	}

	var matchGraph$1 = {
		MATCH: MATCH$1,
		MISMATCH: MISMATCH$1,
		DISALLOW_EMPTY: DISALLOW_EMPTY$1,
		buildMatchGraph: (syntaxTree, ref) => {
			if (typeof syntaxTree === "string") {
				syntaxTree = parse$1(syntaxTree);
			}

			return {
				type: "MatchGraph",
				match: buildMatchGraph$1(syntaxTree),
				syntax: ref || null,
				source: syntaxTree,
			};
		},
	};

	var hasOwnProperty$6 = Object.prototype.hasOwnProperty;
	var matchGraph = matchGraph$1;
	var MATCH = matchGraph.MATCH;
	var MISMATCH = matchGraph.MISMATCH;
	var DISALLOW_EMPTY = matchGraph.DISALLOW_EMPTY;
	var TYPE$B = _const.TYPE;

	var STUB = 0;
	var TOKEN = 1;
	var OPEN_SYNTAX = 2;
	var CLOSE_SYNTAX = 3;

	var EXIT_REASON_MATCH = "Match";
	var EXIT_REASON_MISMATCH = "Mismatch";
	var EXIT_REASON_ITERATION_LIMIT =
		"Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)";

	var ITERATION_LIMIT = 15000;
	var totalIterationCount = 0;

	function reverseList(list) {
		var prev = null;
		var next = null;
		var item = list;

		while (item !== null) {
			next = item.prev;
			item.prev = prev;
			prev = item;
			item = next;
		}

		return prev;
	}

	function areStringsEqualCaseInsensitive(testStr, referenceStr) {
		if (testStr.length !== referenceStr.length) {
			return false;
		}

		for (var i = 0; i < testStr.length; i++) {
			var testCode = testStr.charCodeAt(i);
			var referenceCode = referenceStr.charCodeAt(i);

			// testCode.toLowerCase() for U+0041 LATIN CAPITAL LETTER A (A) .. U+005A LATIN CAPITAL LETTER Z (Z).
			if (testCode >= 0x0041 && testCode <= 0x005a) {
				testCode = testCode | 32;
			}

			if (testCode !== referenceCode) {
				return false;
			}
		}

		return true;
	}

	function isContextEdgeDelim(token) {
		if (token.type !== TYPE$B.Delim) {
			return false;
		}

		// Fix matching for unicode-range: U+30??, U+FF00-FF9F
		// Probably we need to check out previous match instead
		return token.value !== "?";
	}

	function isCommaContextStart(token) {
		if (token === null) {
			return true;
		}

		return (
			token.type === TYPE$B.Comma ||
			token.type === TYPE$B.Function ||
			token.type === TYPE$B.LeftParenthesis ||
			token.type === TYPE$B.LeftSquareBracket ||
			token.type === TYPE$B.LeftCurlyBracket ||
			isContextEdgeDelim(token)
		);
	}

	function isCommaContextEnd(token) {
		if (token === null) {
			return true;
		}

		return (
			token.type === TYPE$B.RightParenthesis ||
			token.type === TYPE$B.RightSquareBracket ||
			token.type === TYPE$B.RightCurlyBracket ||
			token.type === TYPE$B.Delim
		);
	}

	function internalMatch(tokens, state, syntaxes) {
		function moveToNextToken() {
			do {
				tokenIndex++;
				token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;
			} while (token !== null && (token.type === TYPE$B.WhiteSpace || token.type === TYPE$B.Comment));
		}

		function getNextToken(offset) {
			var nextIndex = tokenIndex + offset;

			return nextIndex < tokens.length ? tokens[nextIndex] : null;
		}

		function stateSnapshotFromSyntax(nextState, prev) {
			return {
				nextState: nextState,
				matchStack: matchStack,
				syntaxStack: syntaxStack,
				thenStack: thenStack,
				tokenIndex: tokenIndex,
				prev: prev,
			};
		}

		function pushThenStack(nextState) {
			thenStack = {
				nextState: nextState,
				matchStack: matchStack,
				syntaxStack: syntaxStack,
				prev: thenStack,
			};
		}

		function pushElseStack(nextState) {
			elseStack = stateSnapshotFromSyntax(nextState, elseStack);
		}

		function addTokenToMatch() {
			matchStack = {
				type: TOKEN,
				syntax: state.syntax,
				token: token,
				prev: matchStack,
			};

			moveToNextToken();
			syntaxStash = null;

			if (tokenIndex > longestMatch) {
				longestMatch = tokenIndex;
			}
		}

		function openSyntax() {
			syntaxStack = {
				syntax: state.syntax,
				opts: state.syntax.opts || syntaxStack?.opts || null,
				prev: syntaxStack,
			};

			matchStack = {
				type: OPEN_SYNTAX,
				syntax: state.syntax,
				token: matchStack.token,
				prev: matchStack,
			};
		}

		function closeSyntax() {
			if (matchStack.type === OPEN_SYNTAX) {
				matchStack = matchStack.prev;
			} else {
				matchStack = {
					type: CLOSE_SYNTAX,
					syntax: syntaxStack.syntax,
					token: matchStack.token,
					prev: matchStack,
				};
			}

			syntaxStack = syntaxStack.prev;
		}

		var syntaxStack = null;
		var thenStack = null;
		var elseStack = null;

		// null – stashing allowed, nothing stashed
		// false – stashing disabled, nothing stashed
		// anithing else – fail stashable syntaxes, some syntax stashed
		var syntaxStash = null;

		var iterationCount = 0; // count iterations and prevent infinite loop
		var exitReason = null;

		var token = null;
		var tokenIndex = -1;
		var longestMatch = 0;
		var matchStack = {
			type: STUB,
			syntax: null,
			token: null,
			prev: null,
		};

		moveToNextToken();

		while (exitReason === null && ++iterationCount < ITERATION_LIMIT) {
			// function mapList(list, fn) {
			//     var result = [];
			//     while (list) {
			//         result.unshift(fn(list));
			//         list = list.prev;
			//     }
			//     return result;
			// }
			// console.log('--\n',
			//     '#' + iterationCount,
			//     require('util').inspect({
			//         match: mapList(matchStack, x => x.type === TOKEN ? x.token && x.token.value : x.syntax ? ({ [OPEN_SYNTAX]: '<', [CLOSE_SYNTAX]: '</' }[x.type] || x.type) + '!' + x.syntax.name : null),
			//         token: token && token.value,
			//         tokenIndex,
			//         syntax: syntax.type + (syntax.id ? ' #' + syntax.id : '')
			//     }, { depth: null })
			// );
			switch (state.type) {
				case "Match":
					if (thenStack === null) {
						// turn to MISMATCH when some tokens left unmatched
						if (token !== null) {
							// doesn't mismatch if just one token left and it's an IE hack
							if (tokenIndex !== tokens.length - 1 || (token.value !== "\\0" && token.value !== "\\9")) {
								state = MISMATCH;
								break;
							}
						}

						// break the main loop, return a result - MATCH
						exitReason = EXIT_REASON_MATCH;
						break;
					}

					// go to next syntax (`then` branch)
					state = thenStack.nextState;

					// check match is not empty
					if (state === DISALLOW_EMPTY) {
						if (thenStack.matchStack === matchStack) {
							state = MISMATCH;
							break;
						}
						state = MATCH;
					}

					// close syntax if needed
					while (thenStack.syntaxStack !== syntaxStack) {
						closeSyntax();
					}

					// pop stack
					thenStack = thenStack.prev;
					break;

				case "Mismatch":
					// when some syntax is stashed
					if (syntaxStash !== null && syntaxStash !== false) {
						// there is no else branches or a branch reduce match stack
						if (elseStack === null || tokenIndex > elseStack.tokenIndex) {
							// restore state from the stash
							elseStack = syntaxStash;
							syntaxStash = false; // disable stashing
						}
					} else if (elseStack === null) {
						// no else branches -> break the main loop
						// return a result - MISMATCH
						exitReason = EXIT_REASON_MISMATCH;
						break;
					}

					// go to next syntax (`else` branch)
					state = elseStack.nextState;

					// restore all the rest stack states
					thenStack = elseStack.thenStack;
					syntaxStack = elseStack.syntaxStack;
					matchStack = elseStack.matchStack;
					tokenIndex = elseStack.tokenIndex;
					token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;

					// pop stack
					elseStack = elseStack.prev;
					break;

				case "MatchGraph":
					state = state.match;
					break;

				case "If":
					// IMPORTANT: else stack push must go first,
					// since it stores the state of thenStack before changes
					if (state.else !== MISMATCH) {
						pushElseStack(state.else);
					}

					if (state.then !== MATCH) {
						pushThenStack(state.then);
					}

					state = state.match;
					break;

				case "MatchOnce":
					state = {
						type: "MatchOnceBuffer",
						syntax: state,
						index: 0,
						mask: 0,
					};
					break;

				case "MatchOnceBuffer": {
					var terms = state.syntax.terms;

					if (state.index === terms.length) {
						// no matches at all or it's required all terms to be matched
						if (state.mask === 0 || state.syntax.all) {
							state = MISMATCH;
							break;
						}

						// a partial match is ok
						state = MATCH;
						break;
					}

					// all terms are matched
					if (state.mask === (1 << terms.length) - 1) {
						state = MATCH;
						break;
					}

					for (; state.index < terms.length; state.index++) {
						var matchFlag = 1 << state.index;

						if ((state.mask & matchFlag) === 0) {
							// IMPORTANT: else stack push must go first,
							// since it stores the state of thenStack before changes
							pushElseStack(state);
							pushThenStack({
								type: "AddMatchOnce",
								syntax: state.syntax,
								mask: state.mask | matchFlag,
							});

							// match
							state = terms[state.index++];
							break;
						}
					}
					break;
				}

				case "AddMatchOnce":
					state = {
						type: "MatchOnceBuffer",
						syntax: state.syntax,
						index: 0,
						mask: state.mask,
					};
					break;

				case "Enum":
					if (token !== null) {
						var name = token.value.toLowerCase();

						// drop \0 and \9 hack from keyword name
						if (name.indexOf("\\") !== -1) {
							name = name.replace(/\\[09].*$/, "");
						}

						if (hasOwnProperty$6.call(state.map, name)) {
							state = state.map[name];
							break;
						}
					}

					state = MISMATCH;
					break;

				case "Generic": {
					var opts = syntaxStack !== null ? syntaxStack.opts : null;
					var lastTokenIndex = tokenIndex + Math.floor(state.fn(token, getNextToken, opts));

					if (!Number.isNaN(lastTokenIndex) && lastTokenIndex > tokenIndex) {
						while (tokenIndex < lastTokenIndex) {
							addTokenToMatch();
						}

						state = MATCH;
					} else {
						state = MISMATCH;
					}

					break;
				}

				case "Type":
				case "Property": {
					var syntaxDict = state.type === "Type" ? "types" : "properties";
					var dictSyntax = hasOwnProperty$6.call(syntaxes, syntaxDict) ? syntaxes[syntaxDict][state.name] : null;

					if (!dictSyntax?.match) {
						throw new Error(
							"Bad syntax reference: " + (state.type === "Type" ? `<${state.name}>` : `<'${state.name}'>`),
						);
					}

					// stash a syntax for types with low priority
					if (syntaxStash !== false && token !== null && state.type === "Type") {
						var lowPriorityMatching =
							// https://drafts.csswg.org/css-values-4/#custom-idents
							// When parsing positionally-ambiguous keywords in a property value, a <custom-ident> production
							// can only claim the keyword if no other unfulfilled production can claim it.
							(state.name === "custom-ident" && token.type === TYPE$B.Ident) ||
							// https://drafts.csswg.org/css-values-4/#lengths
							// ... if a `0` could be parsed as either a <number> or a <length> in a property (such as line-height),
							// it must parse as a <number>
							(state.name === "length" && token.value === "0");

						if (lowPriorityMatching) {
							if (syntaxStash === null) {
								syntaxStash = stateSnapshotFromSyntax(state, elseStack);
							}

							state = MISMATCH;
							break;
						}
					}

					openSyntax();
					state = dictSyntax.match;
					break;
				}

				case "Keyword": {
					var name = state.name;

					if (token !== null) {
						var keywordName = token.value;

						// drop \0 and \9 hack from keyword name
						if (keywordName.indexOf("\\") !== -1) {
							keywordName = keywordName.replace(/\\[09].*$/, "");
						}

						if (areStringsEqualCaseInsensitive(keywordName, name)) {
							addTokenToMatch();
							state = MATCH;
							break;
						}
					}

					state = MISMATCH;
					break;
				}

				case "AtKeyword":
				case "Function":
					if (token !== null && areStringsEqualCaseInsensitive(token.value, state.name)) {
						addTokenToMatch();
						state = MATCH;
						break;
					}

					state = MISMATCH;
					break;

				case "Token":
					if (token !== null && token.value === state.value) {
						addTokenToMatch();
						state = MATCH;
						break;
					}

					state = MISMATCH;
					break;

				case "Comma":
					if (token !== null && token.type === TYPE$B.Comma) {
						if (isCommaContextStart(matchStack.token)) {
							state = MISMATCH;
						} else {
							addTokenToMatch();
							state = isCommaContextEnd(token) ? MISMATCH : MATCH;
						}
					} else {
						state = isCommaContextStart(matchStack.token) || isCommaContextEnd(token) ? MATCH : MISMATCH;
					}

					break;

				case "String": {
					var string = "";

					for (
						var lastTokenIndex = tokenIndex;
						lastTokenIndex < tokens.length && string.length < state.value.length;
						lastTokenIndex++
					) {
						string += tokens[lastTokenIndex].value;
					}

					if (areStringsEqualCaseInsensitive(string, state.value)) {
						while (tokenIndex < lastTokenIndex) {
							addTokenToMatch();
						}

						state = MATCH;
					} else {
						state = MISMATCH;
					}

					break;
				}

				default:
					throw new Error(`Unknown node type: ${state.type}`);
			}
		}

		totalIterationCount += iterationCount;

		switch (exitReason) {
			case null:
				console.warn(`[csstree-match] BREAK after ${ITERATION_LIMIT} iterations`);
				exitReason = EXIT_REASON_ITERATION_LIMIT;
				matchStack = null;
				break;

			case EXIT_REASON_MATCH:
				while (syntaxStack !== null) {
					closeSyntax();
				}
				break;

			default:
				matchStack = null;
		}

		return {
			tokens: tokens,
			reason: exitReason,
			iterations: iterationCount,
			match: matchStack,
			longestMatch: longestMatch,
		};
	}

	function matchAsList(tokens, matchGraph, syntaxes) {
		var matchResult = internalMatch(tokens, matchGraph, syntaxes || {});

		if (matchResult.match !== null) {
			var item = reverseList(matchResult.match).prev;

			matchResult.match = [];

			while (item !== null) {
				switch (item.type) {
					case STUB:
						break;

					case OPEN_SYNTAX:
					case CLOSE_SYNTAX:
						matchResult.match.push({
							type: item.type,
							syntax: item.syntax,
						});
						break;

					default:
						matchResult.match.push({
							token: item.token.value,
							node: item.token.node,
						});
						break;
				}

				item = item.prev;
			}
		}

		return matchResult;
	}

	function matchAsTree$1(tokens, matchGraph, syntaxes) {
		var matchResult = internalMatch(tokens, matchGraph, syntaxes || {});

		if (matchResult.match === null) {
			return matchResult;
		}

		var item = matchResult.match;
		var host = (matchResult.match = {
			syntax: matchGraph.syntax || null,
			match: [],
		});
		var hostStack = [host];

		// revert a list and start with 2nd item since 1st is a stub item
		item = reverseList(item).prev;

		// build a tree
		while (item !== null) {
			switch (item.type) {
				case OPEN_SYNTAX:
					host.match.push(
						(host = {
							syntax: item.syntax,
							match: [],
						}),
					);
					hostStack.push(host);
					break;

				case CLOSE_SYNTAX:
					hostStack.pop();
					host = hostStack[hostStack.length - 1];
					break;

				default:
					host.match.push({
						syntax: item.syntax || null,
						token: item.token.value,
						node: item.token.node,
					});
			}

			item = item.prev;
		}

		return matchResult;
	}

	var match = {
		matchAsList: matchAsList,
		matchAsTree: matchAsTree$1,
		getTotalIterationCount: () => totalIterationCount,
	};

	function getTrace(node) {
		function shouldPutToTrace(syntax) {
			if (syntax === null) {
				return false;
			}

			return syntax.type === "Type" || syntax.type === "Property" || syntax.type === "Keyword";
		}

		function hasMatch(matchNode) {
			if (Array.isArray(matchNode.match)) {
				// use for-loop for better perfomance
				for (var i = 0; i < matchNode.match.length; i++) {
					if (hasMatch(matchNode.match[i])) {
						if (shouldPutToTrace(matchNode.syntax)) {
							result.unshift(matchNode.syntax);
						}

						return true;
					}
				}
			} else if (matchNode.node === node) {
				result = shouldPutToTrace(matchNode.syntax) ? [matchNode.syntax] : [];

				return true;
			}

			return false;
		}

		var result = null;

		if (this.matched !== null) {
			hasMatch(this.matched);
		}

		return result;
	}

	function testNode(match, node, fn) {
		var trace = getTrace.call(match, node);

		if (trace === null) {
			return false;
		}

		return trace.some(fn);
	}

	function isType(node, type) {
		return testNode(this, node, (matchNode) => matchNode.type === "Type" && matchNode.name === type);
	}

	function isProperty(node, property) {
		return testNode(this, node, (matchNode) => matchNode.type === "Property" && matchNode.name === property);
	}

	function isKeyword(node) {
		return testNode(this, node, (matchNode) => matchNode.type === "Keyword");
	}

	var trace$1 = {
		getTrace: getTrace,
		isType: isType,
		isProperty: isProperty,
		isKeyword: isKeyword,
	};

	var List$5 = List_1;

	function getFirstMatchNode(matchNode) {
		if ("node" in matchNode) {
			return matchNode.node;
		}

		return getFirstMatchNode(matchNode.match[0]);
	}

	function getLastMatchNode(matchNode) {
		if ("node" in matchNode) {
			return matchNode.node;
		}

		return getLastMatchNode(matchNode.match[matchNode.match.length - 1]);
	}

	function matchFragments(lexer, ast, match, type, name) {
		function findFragments(matchNode) {
			if (matchNode.syntax !== null && matchNode.syntax.type === type && matchNode.syntax.name === name) {
				var start = getFirstMatchNode(matchNode);
				var end = getLastMatchNode(matchNode);

				lexer.syntax.walk(ast, (node, item, list) => {
					if (node === start) {
						var nodes = new List$5();

						do {
							nodes.appendData(item.data);

							if (item.data === end) {
								break;
							}

							item = item.next;
						} while (item !== null);

						fragments.push({
							parent: list,
							nodes: nodes,
						});
					}
				});
			}

			if (Array.isArray(matchNode.match)) {
				matchNode.match.forEach(findFragments);
			}
		}

		var fragments = [];

		if (match.matched !== null) {
			findFragments(match.matched);
		}

		return fragments;
	}

	var search$1 = {
		matchFragments: matchFragments,
	};

	var List$4 = List_1;
	var hasOwnProperty$5 = Object.prototype.hasOwnProperty;

	function isValidNumber(value) {
		// Number.isInteger(value) && value >= 0
		return typeof value === "number" && Number.isFinite(value) && Math.floor(value) === value && value >= 0;
	}

	function isValidLocation(loc) {
		return Boolean(loc) && isValidNumber(loc.offset) && isValidNumber(loc.line) && isValidNumber(loc.column);
	}

	function createNodeStructureChecker(type, fields) {
		return function checkNode(node, warn) {
			if (!node || node.constructor !== Object) {
				return warn(node, "Type of node should be an Object");
			}

			for (var key in node) {
				var _valid = true;

				if (hasOwnProperty$5.call(node, key) === false) {
					continue;
				}

				if (key === "type") {
					if (node.type !== type) {
						warn(node, `Wrong node type \`${node.type}\`, expected \`${type}\``);
					}
				} else if (key === "loc") {
					if (node.loc === null) {
						continue;
					}
					if (node.loc && node.loc.constructor === Object) {
						if (typeof node.loc.source !== "string") {
							key += ".source";
						} else if (!isValidLocation(node.loc.start)) {
							key += ".start";
						} else if (!isValidLocation(node.loc.end)) {
							key += ".end";
						} else {
							continue;
						}
					}

					_valid = false;
				} else if (Object.hasOwn(fields, key)) {
					for (var i = 0, valid = false; !valid && i < fields[key].length; i++) {
						var fieldType = fields[key][i];

						switch (fieldType) {
							case String:
								valid = typeof node[key] === "string";
								break;

							case Boolean:
								valid = typeof node[key] === "boolean";
								break;

							case null:
								valid = node[key] === null;
								break;

							default:
								if (typeof fieldType === "string") {
									valid = node[key] && node[key].type === fieldType;
								} else if (Array.isArray(fieldType)) {
									valid = node[key] instanceof List$4;
								}
						}
					}
				} else {
					warn(node, `Unknown field \`${key}\` for ${type} node type`);
				}

				if (!valid) {
					warn(node, `Bad value for \`${type}.${key}\``);
				}
			}

			for (var key in fields) {
				if (hasOwnProperty$5.call(fields, key) && hasOwnProperty$5.call(node, key) === false) {
					warn(node, `Field \`${type}.${key}\` is missed`);
				}
			}
		};
	}

	function processStructure(name, nodeType) {
		var structure = nodeType.structure;
		var fields = {
			type: String,
			loc: true,
		};
		var docs = {
			type: `"${name}"`,
		};

		for (var key in structure) {
			if (hasOwnProperty$5.call(structure, key) === false) {
				continue;
			}

			var docsTypes = [];
			var fieldTypes = (fields[key] = Array.isArray(structure[key]) ? structure[key].slice() : [structure[key]]);

			for (var i = 0; i < fieldTypes.length; i++) {
				var fieldType = fieldTypes[i];
				if (fieldType === String || fieldType === Boolean) {
					docsTypes.push(fieldType.name);
				} else if (fieldType === null) {
					docsTypes.push("null");
				} else if (typeof fieldType === "string") {
					docsTypes.push(`<${fieldType}>`);
				} else if (Array.isArray(fieldType)) {
					docsTypes.push("List"); // TODO: use type enum
				} else {
					throw new Error(`Wrong value \`${fieldType}\` in \`${name}.${key}\` structure definition`);
				}
			}

			docs[key] = docsTypes.join(" | ");
		}

		return {
			docs: docs,
			check: createNodeStructureChecker(name, fields),
		};
	}

	var structure = {
		getStructureFromConfig: (config) => {
			var structure = {};

			if (config.node) {
				for (var name in config.node) {
					if (hasOwnProperty$5.call(config.node, name)) {
						var nodeType = config.node[name];

						if (nodeType.structure) {
							structure[name] = processStructure(name, nodeType);
						} else {
							throw new Error(`Missed \`structure\` field in \`${name}\` node type definition`);
						}
					}
				}
			}

			return structure;
		},
	};

	var SyntaxReferenceError = error.SyntaxReferenceError;
	var SyntaxMatchError = error.SyntaxMatchError;
	var names$1 = names$2;
	var generic = generic$1;
	var parse = parse_1;
	var generate = generate_1;
	var walk = walk$1;
	var prepareTokens = prepareTokens_1;
	var buildMatchGraph = matchGraph$1.buildMatchGraph;
	var matchAsTree = match.matchAsTree;
	var trace = trace$1;
	var search = search$1;
	var getStructureFromConfig = structure.getStructureFromConfig;
	var cssWideKeywords = buildMatchGraph("inherit | initial | unset");
	var cssWideKeywordsWithExpression = buildMatchGraph("inherit | initial | unset | <-ms-legacy-expression>");

	function dumpMapSyntax(map, compact, syntaxAsAst) {
		var result = {};

		for (var name in map) {
			if (map[name].syntax) {
				result[name] = syntaxAsAst ? map[name].syntax : generate(map[name].syntax, { compact: compact });
			}
		}

		return result;
	}

	function dumpAtruleMapSyntax(map, compact, syntaxAsAst) {
		const result = {};

		for (const [name, atrule] of Object.entries(map)) {
			result[name] = {
				prelude: atrule.prelude && (syntaxAsAst ? atrule.prelude.syntax : generate(atrule.prelude.syntax, { compact })),
				descriptors: atrule.descriptors && dumpMapSyntax(atrule.descriptors, compact, syntaxAsAst),
			};
		}

		return result;
	}

	function valueHasVar(tokens) {
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].value.toLowerCase() === "var(") {
				return true;
			}
		}

		return false;
	}

	function buildMatchResult(match, error, iterations) {
		return {
			matched: match,
			iterations: iterations,
			error: error,
			getTrace: trace.getTrace,
			isType: trace.isType,
			isProperty: trace.isProperty,
			isKeyword: trace.isKeyword,
		};
	}

	function matchSyntax(lexer, syntax, value, useCommon) {
		var tokens = prepareTokens(value, lexer.syntax);
		var result;

		if (valueHasVar(tokens)) {
			return buildMatchResult(null, new Error("Matching for a tree with var() is not supported"));
		}

		if (useCommon) {
			result = matchAsTree(tokens, lexer.valueCommonSyntax, lexer);
		}

		if (!useCommon || !result.match) {
			result = matchAsTree(tokens, syntax.match, lexer);
			if (!result.match) {
				return buildMatchResult(
					null,
					new SyntaxMatchError(result.reason, syntax.syntax, value, result),
					result.iterations,
				);
			}
		}

		return buildMatchResult(result.match, null, result.iterations);
	}

	var Lexer$1 = function (config, syntax, structure) {
		this.valueCommonSyntax = cssWideKeywords;
		this.syntax = syntax;
		this.generic = false;
		this.atrules = {};
		this.properties = {};
		this.types = {};
		this.structure = structure || getStructureFromConfig(config);

		if (config) {
			if (config.types) {
				for (var name in config.types) {
					this.addType_(name, config.types[name]);
				}
			}

			if (config.generic) {
				this.generic = true;
				for (var name in generic) {
					this.addType_(name, generic[name]);
				}
			}

			if (config.atrules) {
				for (var name in config.atrules) {
					this.addAtrule_(name, config.atrules[name]);
				}
			}

			if (config.properties) {
				for (var name in config.properties) {
					this.addProperty_(name, config.properties[name]);
				}
			}
		}
	};

	Lexer$1.prototype = {
		structure: {},
		checkStructure: function (ast) {
			function collectWarning(node, message) {
				warns.push({
					node: node,
					message: message,
				});
			}

			var structure = this.structure;
			var warns = [];

			this.syntax.walk(ast, (node) => {
				if (Object.hasOwn(structure, node.type)) {
					structure[node.type].check(node, collectWarning);
				} else {
					collectWarning(node, `Unknown node type \`${node.type}\``);
				}
			});

			return warns.length ? warns : false;
		},

		createDescriptor: (syntax, type, name, parent = null) => {
			var ref = {
				type: type,
				name: name,
			};
			var descriptor = {
				type: type,
				name: name,
				parent: parent,
				syntax: null,
				match: null,
			};

			if (typeof syntax === "function") {
				descriptor.match = buildMatchGraph(syntax, ref);
			} else {
				if (typeof syntax === "string") {
					// lazy parsing on first access
					Object.defineProperty(descriptor, "syntax", {
						get: () => {
							Object.defineProperty(descriptor, "syntax", {
								value: parse(syntax),
							});

							return descriptor.syntax;
						},
					});
				} else {
					descriptor.syntax = syntax;
				}

				// lazy graph build on first access
				Object.defineProperty(descriptor, "match", {
					get: () => {
						Object.defineProperty(descriptor, "match", {
							value: buildMatchGraph(descriptor.syntax, ref),
						});

						return descriptor.match;
					},
				});
			}

			return descriptor;
		},
		addAtrule_: function (name, syntax) {
			if (!syntax) {
				return;
			}

			this.atrules[name] = {
				type: "Atrule",
				name: name,
				prelude: syntax.prelude ? this.createDescriptor(syntax.prelude, "AtrulePrelude", name) : null,
				descriptors: syntax.descriptors
					? Object.keys(syntax.descriptors).reduce((res, descName) => {
							res[descName] = this.createDescriptor(syntax.descriptors[descName], "AtruleDescriptor", descName, name);
							return res;
						}, {})
					: null,
			};
		},
		addProperty_: function (name, syntax) {
			if (!syntax) {
				return;
			}

			this.properties[name] = this.createDescriptor(syntax, "Property", name);
		},
		addType_: function (name, syntax) {
			if (!syntax) {
				return;
			}

			this.types[name] = this.createDescriptor(syntax, "Type", name);

			if (syntax === generic["-ms-legacy-expression"]) {
				this.valueCommonSyntax = cssWideKeywordsWithExpression;
			}
		},

		checkAtruleName: function (atruleName) {
			if (!this.getAtrule(atruleName)) {
				return new SyntaxReferenceError("Unknown at-rule", `@${atruleName}`);
			}
		},
		checkAtrulePrelude: function (atruleName, prelude) {
			const error = this.checkAtruleName(atruleName);

			if (error) {
				return error;
			}

			var atrule = this.getAtrule(atruleName);

			if (!atrule.prelude && prelude) {
				return new SyntaxError(`At-rule \`@${atruleName}\` should not contain a prelude`);
			}

			if (atrule.prelude && !prelude) {
				return new SyntaxError(`At-rule \`@${atruleName}\` should contain a prelude`);
			}
		},
		checkAtruleDescriptorName: function (atruleName, descriptorName) {
			const error = this.checkAtruleName(atruleName);

			if (error) {
				return error;
			}

			var atrule = this.getAtrule(atruleName);
			var descriptor = names$1.keyword(descriptorName);

			if (!atrule.descriptors) {
				return new SyntaxError(`At-rule \`@${atruleName}\` has no known descriptors`);
			}

			if (!atrule.descriptors[descriptor.name] && !atrule.descriptors[descriptor.basename]) {
				return new SyntaxReferenceError("Unknown at-rule descriptor", descriptorName);
			}
		},
		checkPropertyName: function (propertyName) {
			var property = names$1.property(propertyName);

			// don't match syntax for a custom property
			if (property.custom) {
				return new Error("Lexer matching doesn't applicable for custom properties");
			}

			if (!this.getProperty(propertyName)) {
				return new SyntaxReferenceError("Unknown property", propertyName);
			}
		},

		matchAtrulePrelude: function (atruleName, prelude) {
			var error = this.checkAtrulePrelude(atruleName, prelude);

			if (error) {
				return buildMatchResult(null, error);
			}

			if (!prelude) {
				return buildMatchResult(null, null);
			}

			return matchSyntax(this, this.getAtrule(atruleName).prelude, prelude, false);
		},
		matchAtruleDescriptor: function (atruleName, descriptorName, value) {
			var error = this.checkAtruleDescriptorName(atruleName, descriptorName);

			if (error) {
				return buildMatchResult(null, error);
			}

			var atrule = this.getAtrule(atruleName);
			var descriptor = names$1.keyword(descriptorName);

			return matchSyntax(
				this,
				atrule.descriptors[descriptor.name] || atrule.descriptors[descriptor.basename],
				value,
				false,
			);
		},
		matchDeclaration: function (node) {
			if (node.type !== "Declaration") {
				return buildMatchResult(null, new Error("Not a Declaration node"));
			}

			return this.matchProperty(node.property, node.value);
		},
		matchProperty: function (propertyName, value) {
			var error = this.checkPropertyName(propertyName);

			if (error) {
				return buildMatchResult(null, error);
			}

			return matchSyntax(this, this.getProperty(propertyName), value, true);
		},
		matchType: function (typeName, value) {
			var typeSyntax = this.getType(typeName);

			if (!typeSyntax) {
				return buildMatchResult(null, new SyntaxReferenceError("Unknown type", typeName));
			}

			return matchSyntax(this, typeSyntax, value, false);
		},
		match: function (syntax, value) {
			if (typeof syntax !== "string" && !syntax?.type) {
				return buildMatchResult(null, new SyntaxReferenceError("Bad syntax"));
			}

			if (typeof syntax === "string" || !syntax.match) {
				syntax = this.createDescriptor(syntax, "Type", "anonymous");
			}

			return matchSyntax(this, syntax, value, false);
		},

		findValueFragments: function (propertyName, value, type, name) {
			return search.matchFragments(this, value, this.matchProperty(propertyName, value), type, name);
		},
		findDeclarationValueFragments: function (declaration, type, name) {
			return search.matchFragments(this, declaration.value, this.matchDeclaration(declaration), type, name);
		},
		findAllFragments: function (ast, type, name) {
			var result = [];

			this.syntax.walk(ast, {
				visit: "Declaration",
				enter: function (declaration) {
					result.push.apply(result, this.findDeclarationValueFragments(declaration, type, name));
				}.bind(this),
			});

			return result;
		},

		getAtrule: function (atruleName, fallbackBasename = true) {
			var atrule = names$1.keyword(atruleName);
			var atruleEntry =
				atrule.vendor && fallbackBasename
					? this.atrules[atrule.name] || this.atrules[atrule.basename]
					: this.atrules[atrule.name];

			return atruleEntry || null;
		},
		getAtrulePrelude: function (atruleName, fallbackBasename = true) {
			const atrule = this.getAtrule(atruleName, fallbackBasename);

			return atrule?.prelude || null;
		},
		getAtruleDescriptor: function (atruleName, name) {
			return Object.hasOwn(this.atrules, atruleName) && this.atrules.declarators
				? this.atrules[atruleName].declarators[name] || null
				: null;
		},
		getProperty: function (propertyName, fallbackBasename = true) {
			var property = names$1.property(propertyName);
			var propertyEntry =
				property.vendor && fallbackBasename
					? this.properties[property.name] || this.properties[property.basename]
					: this.properties[property.name];

			return propertyEntry || null;
		},
		getType: function (name) {
			return Object.hasOwn(this.types, name) ? this.types[name] : null;
		},

		validate: function () {
			function validate(syntax, name, broken, descriptor) {
				if (Object.hasOwn(broken, name)) {
					return broken[name];
				}

				broken[name] = false;
				if (descriptor.syntax !== null) {
					walk(
						descriptor.syntax,
						(node) => {
							if (node.type !== "Type" && node.type !== "Property") {
								return;
							}

							var map = node.type === "Type" ? syntax.types : syntax.properties;
							var brokenMap = node.type === "Type" ? brokenTypes : brokenProperties;

							if (!Object.hasOwn(map, node.name) || validate(syntax, node.name, brokenMap, map[node.name])) {
								broken[name] = true;
							}
						},
						this,
					);
				}
			}

			var brokenTypes = {};
			var brokenProperties = {};

			for (var key in this.types) {
				validate(this, key, brokenTypes, this.types[key]);
			}

			for (var key in this.properties) {
				validate(this, key, brokenProperties, this.properties[key]);
			}

			brokenTypes = Object.keys(brokenTypes).filter((name) => brokenTypes[name]);
			brokenProperties = Object.keys(brokenProperties).filter((name) => brokenProperties[name]);

			if (brokenTypes.length || brokenProperties.length) {
				return {
					types: brokenTypes,
					properties: brokenProperties,
				};
			}

			return null;
		},
		dump: function (syntaxAsAst, pretty) {
			return {
				generic: this.generic,
				types: dumpMapSyntax(this.types, !pretty, syntaxAsAst),
				properties: dumpMapSyntax(this.properties, !pretty, syntaxAsAst),
				atrules: dumpAtruleMapSyntax(this.atrules, !pretty, syntaxAsAst),
			};
		},
		toString: function () {
			return JSON.stringify(this.dump());
		},
	};

	var Lexer_1 = Lexer$1;

	var definitionSyntax$1 = {
		SyntaxError: _SyntaxError,
		parse: parse_1,
		generate: generate_1,
		walk: walk$1,
	};

	var adoptBuffer = adoptBuffer$2;
	var isBOM = tokenizer$3.isBOM;

	var N$1 = 10;
	var F = 12;
	var R = 13;

	function computeLinesAndColumns(host, source) {
		var sourceLength = source.length;
		var lines = adoptBuffer(host.lines, sourceLength); // +1
		var line = host.startLine;
		var columns = adoptBuffer(host.columns, sourceLength);
		var column = host.startColumn;
		var startOffset = source.length > 0 ? isBOM(source.charCodeAt(0)) : 0;

		for (var i = startOffset; i < sourceLength; i++) {
			// -1
			var code = source.charCodeAt(i);

			lines[i] = line;
			columns[i] = column++;

			if (code === N$1 || code === R || code === F) {
				if (code === R && i + 1 < sourceLength && source.charCodeAt(i + 1) === N$1) {
					i++;
					lines[i] = line;
					columns[i] = column;
				}

				line++;
				column = 1;
			}
		}

		lines[i] = line;
		columns[i] = column;

		host.lines = lines;
		host.columns = columns;
	}

	var OffsetToLocation$1 = function () {
		this.lines = null;
		this.columns = null;
		this.linesAndColumnsComputed = false;
	};

	OffsetToLocation$1.prototype = {
		setSource: function (source, startOffset, startLine, startColumn) {
			this.source = source;
			this.startOffset = typeof startOffset === "undefined" ? 0 : startOffset;
			this.startLine = typeof startLine === "undefined" ? 1 : startLine;
			this.startColumn = typeof startColumn === "undefined" ? 1 : startColumn;
			this.linesAndColumnsComputed = false;
		},

		ensureLinesAndColumnsComputed: function () {
			if (!this.linesAndColumnsComputed) {
				computeLinesAndColumns(this, this.source);
				this.linesAndColumnsComputed = true;
			}
		},
		getLocation: function (offset, filename) {
			this.ensureLinesAndColumnsComputed();

			return {
				source: filename,
				offset: this.startOffset + offset,
				line: this.lines[offset],
				column: this.columns[offset],
			};
		},
		getLocationRange: function (start, end, filename) {
			this.ensureLinesAndColumnsComputed();

			return {
				source: filename,
				start: {
					offset: this.startOffset + start,
					line: this.lines[start],
					column: this.columns[start],
				},
				end: {
					offset: this.startOffset + end,
					line: this.lines[end],
					column: this.columns[end],
				},
			};
		},
	};

	var OffsetToLocation_1 = OffsetToLocation$1;

	var TYPE$A = tokenizer$3.TYPE;
	var WHITESPACE$a = TYPE$A.WhiteSpace;
	var COMMENT$8 = TYPE$A.Comment;

	var sequence$1 = function readSequence(recognizer) {
		var children = this.createList();
		var child = null;
		var context = {
			recognizer: recognizer,
			space: null,
			ignoreWS: false,
			ignoreWSAfter: false,
		};

		this.scanner.skipSC();

		while (!this.scanner.eof) {
			switch (this.scanner.tokenType) {
				case COMMENT$8:
					this.scanner.next();
					continue;

				case WHITESPACE$a:
					if (context.ignoreWS) {
						this.scanner.next();
					} else {
						context.space = this.WhiteSpace();
					}
					continue;
			}

			child = recognizer.getNode.call(this, context);

			if (child === undefined) {
				break;
			}

			if (context.space !== null) {
				children.push(context.space);
				context.space = null;
			}

			children.push(child);

			if (context.ignoreWSAfter) {
				context.ignoreWSAfter = false;
				context.ignoreWS = true;
			} else {
				context.ignoreWS = false;
			}
		}

		return children;
	};

	var OffsetToLocation = OffsetToLocation_1;
	var SyntaxError$2 = _SyntaxError$1;
	var TokenStream$1 = TokenStream_1;
	var List$3 = List_1;
	var tokenize$1 = tokenizer$3;
	var constants = _const;
	var { findWhiteSpaceStart, cmpStr: cmpStr$2 } = utils$2;
	var sequence = sequence$1;
	var noop$1 = () => {};

	var TYPE$z = constants.TYPE;
	var NAME$1 = constants.NAME;
	var WHITESPACE$9 = TYPE$z.WhiteSpace;
	var COMMENT$7 = TYPE$z.Comment;
	var IDENT$g = TYPE$z.Ident;
	var FUNCTION$6 = TYPE$z.Function;
	var URL$4 = TYPE$z.Url;
	var HASH$5 = TYPE$z.Hash;
	var PERCENTAGE$3 = TYPE$z.Percentage;
	var NUMBER$7 = TYPE$z.Number;
	var NUMBERSIGN$3 = 0x0023; // U+0023 NUMBER SIGN (#)
	var NULL = 0;

	function createParseContext(name) {
		return function () {
			return this[name]();
		};
	}

	function processConfig(config) {
		var parserConfig = {
			context: {},
			scope: {},
			atrule: {},
			pseudo: {},
		};

		if (config.parseContext) {
			for (var name in config.parseContext) {
				switch (typeof config.parseContext[name]) {
					case "function":
						parserConfig.context[name] = config.parseContext[name];
						break;

					case "string":
						parserConfig.context[name] = createParseContext(config.parseContext[name]);
						break;
				}
			}
		}

		if (config.scope) {
			for (var name in config.scope) {
				parserConfig.scope[name] = config.scope[name];
			}
		}

		if (config.atrule) {
			for (var name in config.atrule) {
				var atrule = config.atrule[name];

				if (atrule.parse) {
					parserConfig.atrule[name] = atrule.parse;
				}
			}
		}

		if (config.pseudo) {
			for (var name in config.pseudo) {
				var pseudo = config.pseudo[name];

				if (pseudo.parse) {
					parserConfig.pseudo[name] = pseudo.parse;
				}
			}
		}

		if (config.node) {
			for (var name in config.node) {
				parserConfig[name] = config.node[name].parse;
			}
		}

		return parserConfig;
	}

	var create$3 = function createParser(config) {
		var parser = {
			scanner: new TokenStream$1(),
			locationMap: new OffsetToLocation(),

			filename: "<unknown>",
			needPositions: false,
			onParseError: noop$1,
			onParseErrorThrow: false,
			parseAtrulePrelude: true,
			parseRulePrelude: true,
			parseValue: true,
			parseCustomProperty: false,

			readSequence: sequence,

			createList: () => new List$3(),
			createSingleNodeList: (node) => new List$3().appendData(node),
			getFirstListNode: (list) => list?.first(),
			getLastListNode: (list) => list.last(),

			parseWithFallback: function (consumer, fallback) {
				var startToken = this.scanner.tokenIndex;

				try {
					return consumer.call(this);
				} catch (e) {
					if (this.onParseErrorThrow) {
						throw e;
					}

					var fallbackNode = fallback.call(this, startToken);

					this.onParseErrorThrow = true;
					this.onParseError(e, fallbackNode);
					this.onParseErrorThrow = false;

					return fallbackNode;
				}
			},

			lookupNonWSType: function (offset) {
				do {
					var type = this.scanner.lookupType(offset++);
					if (type !== WHITESPACE$9) {
						return type;
					}
				} while (type !== NULL);

				return NULL;
			},

			eat: function (tokenType) {
				if (this.scanner.tokenType !== tokenType) {
					var offset = this.scanner.tokenStart;
					var message = `${NAME$1[tokenType]} is expected`;

					// tweak message and offset
					switch (tokenType) {
						case IDENT$g:
							// when identifier is expected but there is a function or url
							if (this.scanner.tokenType === FUNCTION$6 || this.scanner.tokenType === URL$4) {
								offset = this.scanner.tokenEnd - 1;
								message = "Identifier is expected but function found";
							} else {
								message = "Identifier is expected";
							}
							break;

						case HASH$5:
							if (this.scanner.isDelim(NUMBERSIGN$3)) {
								this.scanner.next();
								offset++;
								message = "Name is expected";
							}
							break;

						case PERCENTAGE$3:
							if (this.scanner.tokenType === NUMBER$7) {
								offset = this.scanner.tokenEnd;
								message = "Percent sign is expected";
							}
							break;

						default:
							// when test type is part of another token show error for current position + 1
							// e.g. eat(HYPHENMINUS) will fail on "-foo", but pointing on "-" is odd
							if (this.scanner.source.charCodeAt(this.scanner.tokenStart) === tokenType) {
								offset = offset + 1;
							}
					}

					this.error(message, offset);
				}

				this.scanner.next();
			},

			consume: function (tokenType) {
				var value = this.scanner.getTokenValue();

				this.eat(tokenType);

				return value;
			},
			consumeFunctionName: function () {
				var name = this.scanner.source.substring(this.scanner.tokenStart, this.scanner.tokenEnd - 1);

				this.eat(FUNCTION$6);

				return name;
			},

			getLocation: function (start, end) {
				if (this.needPositions) {
					return this.locationMap.getLocationRange(start, end, this.filename);
				}

				return null;
			},
			getLocationFromList: function (list) {
				if (this.needPositions) {
					var head = this.getFirstListNode(list);
					var tail = this.getLastListNode(list);
					return this.locationMap.getLocationRange(
						head !== null ? head.loc.start.offset - this.locationMap.startOffset : this.scanner.tokenStart,
						tail !== null ? tail.loc.end.offset - this.locationMap.startOffset : this.scanner.tokenStart,
						this.filename,
					);
				}

				return null;
			},

			error: function (message, offset) {
				var location =
					typeof offset !== "undefined" && offset < this.scanner.source.length
						? this.locationMap.getLocation(offset)
						: this.scanner.eof
							? this.locationMap.getLocation(findWhiteSpaceStart(this.scanner.source, this.scanner.source.length - 1))
							: this.locationMap.getLocation(this.scanner.tokenStart);

				throw new SyntaxError$2(
					message || "Unexpected input",
					this.scanner.source,
					location.offset,
					location.line,
					location.column,
				);
			},
		};

		config = processConfig(config || {});
		for (var key in config) {
			parser[key] = config[key];
		}

		return (source, options) => {
			options = options || {};

			var context = options.context || "default";
			var onComment = options.onComment;
			var ast;

			tokenize$1(source, parser.scanner);
			parser.locationMap.setSource(source, options.offset, options.line, options.column);

			parser.filename = options.filename || "<unknown>";
			parser.needPositions = Boolean(options.positions);
			parser.onParseError = typeof options.onParseError === "function" ? options.onParseError : noop$1;
			parser.onParseErrorThrow = false;
			parser.parseAtrulePrelude = "parseAtrulePrelude" in options ? Boolean(options.parseAtrulePrelude) : true;
			parser.parseRulePrelude = "parseRulePrelude" in options ? Boolean(options.parseRulePrelude) : true;
			parser.parseValue = "parseValue" in options ? Boolean(options.parseValue) : true;
			parser.parseCustomProperty = "parseCustomProperty" in options ? Boolean(options.parseCustomProperty) : false;

			if (!Object.hasOwn(parser.context, context)) {
				throw new Error(`Unknown context \`${context}\``);
			}

			if (typeof onComment === "function") {
				parser.scanner.forEachToken((type, start, end) => {
					if (type === COMMENT$7) {
						const loc = parser.getLocation(start, end);
						const value = cmpStr$2(source, end - 2, end, "*/")
							? source.slice(start + 2, end - 2)
							: source.slice(start + 2, end);

						onComment(value, loc);
					}
				});
			}

			ast = parser.context[context].call(parser, options);

			if (!parser.scanner.eof) {
				parser.error();
			}

			return ast;
		};
	};

	var sourceMapGenerator = {};

	var base64Vlq = {};

	var base64$1 = {};

	/* -*- Mode: js; js-indent-level: 2; -*- */

	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

	/**
	 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
	 */
	base64$1.encode = (number) => {
		if (0 <= number && number < intToCharMap.length) {
			return intToCharMap[number];
		}
		throw new TypeError(`Must be between 0 and 63: ${number}`);
	};

	/**
	 * Decode a single base 64 character code digit to an integer. Returns -1 on
	 * failure.
	 */
	base64$1.decode = (charCode) => {
		var bigA = 65; // 'A'
		var bigZ = 90; // 'Z'

		var littleA = 97; // 'a'
		var littleZ = 122; // 'z'

		var zero = 48; // '0'
		var nine = 57; // '9'

		var plus = 43; // '+'
		var slash = 47; // '/'

		var littleOffset = 26;
		var numberOffset = 52;

		// 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
		if (bigA <= charCode && charCode <= bigZ) {
			return charCode - bigA;
		}

		// 26 - 51: abcdefghijklmnopqrstuvwxyz
		if (littleA <= charCode && charCode <= littleZ) {
			return charCode - littleA + littleOffset;
		}

		// 52 - 61: 0123456789
		if (zero <= charCode && charCode <= nine) {
			return charCode - zero + numberOffset;
		}

		// 62: +
		if (charCode === plus) {
			return 62;
		}

		// 63: /
		if (charCode === slash) {
			return 63;
		}

		// Invalid base64 digit.
		return -1;
	};

	/* -*- Mode: js; js-indent-level: 2; -*- */

	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 *
	 * Based on the Base 64 VLQ implementation in Closure Compiler:
	 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
	 *
	 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
	 * Redistribution and use in source and binary forms, with or without
	 * modification, are permitted provided that the following conditions are
	 * met:
	 *
	 *  * Redistributions of source code must retain the above copyright
	 *    notice, this list of conditions and the following disclaimer.
	 *  * Redistributions in binary form must reproduce the above
	 *    copyright notice, this list of conditions and the following
	 *    disclaimer in the documentation and/or other materials provided
	 *    with the distribution.
	 *  * Neither the name of Google Inc. nor the names of its
	 *    contributors may be used to endorse or promote products derived
	 *    from this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	var base64 = base64$1;

	// A single base 64 digit can contain 6 bits of data. For the base 64 variable
	// length quantities we use in the source map spec, the first bit is the sign,
	// the next four bits are the actual value, and the 6th bit is the
	// continuation bit. The continuation bit tells us whether there are more
	// digits in this value following this digit.
	//
	//   Continuation
	//   |    Sign
	//   |    |
	//   V    V
	//   101011

	var VLQ_BASE_SHIFT = 5;

	// binary: 100000
	var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

	// binary: 011111
	var VLQ_BASE_MASK = VLQ_BASE - 1;

	// binary: 100000
	var VLQ_CONTINUATION_BIT = VLQ_BASE;

	/**
	 * Converts from a two-complement value to a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
	 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
	 */
	function toVLQSigned(aValue) {
		return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
	}

	/**
	 * Converts to a two-complement value from a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
	 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
	 */
	function fromVLQSigned(aValue) {
		var isNegative = (aValue & 1) === 1;
		var shifted = aValue >> 1;
		return isNegative ? -shifted : shifted;
	}

	/**
	 * Returns the base 64 VLQ encoded value.
	 */
	base64Vlq.encode = function base64VLQ_encode(aValue) {
		var encoded = "";
		var digit;

		var vlq = toVLQSigned(aValue);

		do {
			digit = vlq & VLQ_BASE_MASK;
			vlq >>>= VLQ_BASE_SHIFT;
			if (vlq > 0) {
				// There are still more digits in this value, so we must make sure the
				// continuation bit is marked.
				digit |= VLQ_CONTINUATION_BIT;
			}
			encoded += base64.encode(digit);
		} while (vlq > 0);

		return encoded;
	};

	/**
	 * Decodes the next base 64 VLQ value from the given string and returns the
	 * value and the rest of the string via the out parameter.
	 */
	base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
		var strLen = aStr.length;
		var result = 0;
		var shift = 0;
		var continuation;
		var digit;

		do {
			if (aIndex >= strLen) {
				throw new Error("Expected more digits in base 64 VLQ value.");
			}

			digit = base64.decode(aStr.charCodeAt(aIndex++));
			if (digit === -1) {
				throw new Error(`Invalid base64 digit: ${aStr.charAt(aIndex - 1)}`);
			}

			continuation = !!(digit & VLQ_CONTINUATION_BIT);
			digit &= VLQ_BASE_MASK;
			result = result + (digit << shift);
			shift += VLQ_BASE_SHIFT;
		} while (continuation);

		aOutParam.value = fromVLQSigned(result);
		aOutParam.rest = aIndex;
	};

	var util$3 = {};

	/* -*- Mode: js; js-indent-level: 2; -*- */

	((exports) => {
		/*
		 * Copyright 2011 Mozilla Foundation and contributors
		 * Licensed under the New BSD license. See LICENSE or:
		 * http://opensource.org/licenses/BSD-3-Clause
		 */

		/**
		 * This is a helper function for getting values from parameter/options
		 * objects.
		 *
		 * @param args The object we are extracting values from
		 * @param name The name of the property we are getting.
		 * @param defaultValue An optional value to return if the property is missing
		 * from the object. If this is not specified and the property is missing, an
		 * error will be thrown.
		 */
		function getArg(aArgs, aName, aDefaultValue) {
			if (aName in aArgs) {
				return aArgs[aName];
			}
			if (arguments.length === 3) {
				return aDefaultValue;
			}
			throw new Error(`"${aName}" is a required argument.`);
		}
		exports.getArg = getArg;

		var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
		var dataUrlRegexp = /^data:.+,.+$/;

		function urlParse(aUrl) {
			var match = aUrl.match(urlRegexp);
			if (!match) {
				return null;
			}
			return {
				scheme: match[1],
				auth: match[2],
				host: match[3],
				port: match[4],
				path: match[5],
			};
		}
		exports.urlParse = urlParse;

		function urlGenerate(aParsedUrl) {
			var url = "";
			if (aParsedUrl.scheme) {
				url += `${aParsedUrl.scheme}:`;
			}
			url += "//";
			if (aParsedUrl.auth) {
				url += `${aParsedUrl.auth}@`;
			}
			if (aParsedUrl.host) {
				url += aParsedUrl.host;
			}
			if (aParsedUrl.port) {
				url += `:${aParsedUrl.port}`;
			}
			if (aParsedUrl.path) {
				url += aParsedUrl.path;
			}
			return url;
		}
		exports.urlGenerate = urlGenerate;

		/**
		 * Normalizes a path, or the path portion of a URL:
		 *
		 * - Replaces consecutive slashes with one slash.
		 * - Removes unnecessary '.' parts.
		 * - Removes unnecessary '<dir>/..' parts.
		 *
		 * Based on code in the Node.js 'path' core module.
		 *
		 * @param aPath The path or url to normalize.
		 */
		function normalize(aPath) {
			var path = aPath;
			var url = urlParse(aPath);
			if (url) {
				if (!url.path) {
					return aPath;
				}
				path = url.path;
			}
			var isAbsolute = exports.isAbsolute(path);

			var parts = path.split(/\/+/);
			for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
				part = parts[i];
				if (part === ".") {
					parts.splice(i, 1);
				} else if (part === "..") {
					up++;
				} else if (up > 0) {
					if (part === "") {
						// The first part is blank if the path is absolute. Trying to go
						// above the root is a no-op. Therefore we can remove all '..' parts
						// directly after the root.
						parts.splice(i + 1, up);
						up = 0;
					} else {
						parts.splice(i, 2);
						up--;
					}
				}
			}
			path = parts.join("/");

			if (path === "") {
				path = isAbsolute ? "/" : ".";
			}

			if (url) {
				url.path = path;
				return urlGenerate(url);
			}
			return path;
		}
		exports.normalize = normalize;

		/**
		 * Joins two paths/URLs.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be joined with the root.
		 *
		 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
		 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
		 *   first.
		 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
		 *   is updated with the result and aRoot is returned. Otherwise the result
		 *   is returned.
		 *   - If aPath is absolute, the result is aPath.
		 *   - Otherwise the two paths are joined with a slash.
		 * - Joining for example 'http://' and 'www.example.com' is also supported.
		 */
		function join(aRoot, aPath) {
			if (aRoot === "") {
				aRoot = ".";
			}
			if (aPath === "") {
				aPath = ".";
			}
			var aPathUrl = urlParse(aPath);
			var aRootUrl = urlParse(aRoot);
			if (aRootUrl) {
				aRoot = aRootUrl.path || "/";
			}

			// `join(foo, '//www.example.org')`
			if (aPathUrl && !aPathUrl.scheme) {
				if (aRootUrl) {
					aPathUrl.scheme = aRootUrl.scheme;
				}
				return urlGenerate(aPathUrl);
			}

			if (aPathUrl || aPath.match(dataUrlRegexp)) {
				return aPath;
			}

			// `join('http://', 'www.example.com')`
			if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
				aRootUrl.host = aPath;
				return urlGenerate(aRootUrl);
			}

			var joined = aPath.charAt(0) === "/" ? aPath : normalize(`${aRoot.replace(/\/+$/, "")}/${aPath}`);

			if (aRootUrl) {
				aRootUrl.path = joined;
				return urlGenerate(aRootUrl);
			}
			return joined;
		}
		exports.join = join;

		exports.isAbsolute = (aPath) => aPath.charAt(0) === "/" || urlRegexp.test(aPath);

		/**
		 * Make a path relative to a URL or another path.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be made relative to aRoot.
		 */
		function relative(aRoot, aPath) {
			if (aRoot === "") {
				aRoot = ".";
			}

			aRoot = aRoot.replace(/\/$/, "");

			// It is possible for the path to be above the root. In this case, simply
			// checking whether the root is a prefix of the path won't work. Instead, we
			// need to remove components from the root one by one, until either we find
			// a prefix that fits, or we run out of components to remove.
			var level = 0;
			while (aPath.indexOf(`${aRoot}/`) !== 0) {
				var index = aRoot.lastIndexOf("/");
				if (index < 0) {
					return aPath;
				}

				// If the only part of the root that is left is the scheme (i.e. http://,
				// file:///, etc.), one or more slashes (/), or simply nothing at all, we
				// have exhausted all components, so the path is not relative to the root.
				aRoot = aRoot.slice(0, index);
				if (aRoot.match(/^([^/]+:\/)?\/*$/)) {
					return aPath;
				}

				++level;
			}

			// Make sure we add a "../" for each component we removed from the root.
			return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
		}
		exports.relative = relative;

		var supportsNullProto = (() => {
			var obj = Object.create(null);
			return !("__proto__" in obj);
		})();

		function identity(s) {
			return s;
		}

		/**
		 * Because behavior goes wacky when you set `__proto__` on objects, we
		 * have to prefix all the strings in our set with an arbitrary character.
		 *
		 * See https://github.com/mozilla/source-map/pull/31 and
		 * https://github.com/mozilla/source-map/issues/30
		 *
		 * @param String aStr
		 */
		function toSetString(aStr) {
			if (isProtoString(aStr)) {
				return `$${aStr}`;
			}

			return aStr;
		}
		exports.toSetString = supportsNullProto ? identity : toSetString;

		function fromSetString(aStr) {
			if (isProtoString(aStr)) {
				return aStr.slice(1);
			}

			return aStr;
		}
		exports.fromSetString = supportsNullProto ? identity : fromSetString;

		function isProtoString(s) {
			if (!s) {
				return false;
			}

			var length = s.length;

			if (length < 9 /* "__proto__".length */) {
				return false;
			}

			if (
				s.charCodeAt(length - 1) !== 95 /* '_' */ ||
				s.charCodeAt(length - 2) !== 95 /* '_' */ ||
				s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
				s.charCodeAt(length - 4) !== 116 /* 't' */ ||
				s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
				s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
				s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
				s.charCodeAt(length - 8) !== 95 /* '_' */ ||
				s.charCodeAt(length - 9) !== 95 /* '_' */
			) {
				return false;
			}

			for (var i = length - 10; i >= 0; i--) {
				if (s.charCodeAt(i) !== 36 /* '$' */) {
					return false;
				}
			}

			return true;
		}

		/**
		 * Comparator between two mappings where the original positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same original source/line/column, but different generated
		 * line and column the same. Useful when searching for a mapping with a
		 * stubbed out mapping.
		 */
		function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
			var cmp = strcmp(mappingA.source, mappingB.source);
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalLine - mappingB.originalLine;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalColumn - mappingB.originalColumn;
			if (cmp !== 0 || onlyCompareOriginal) {
				return cmp;
			}

			cmp = mappingA.generatedColumn - mappingB.generatedColumn;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.generatedLine - mappingB.generatedLine;
			if (cmp !== 0) {
				return cmp;
			}

			return strcmp(mappingA.name, mappingB.name);
		}
		exports.compareByOriginalPositions = compareByOriginalPositions;

		/**
		 * Comparator between two mappings with deflated source and name indices where
		 * the generated positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same generated line and column, but different
		 * source/name/original line and column the same. Useful when searching for a
		 * mapping with a stubbed out mapping.
		 */
		function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
			var cmp = mappingA.generatedLine - mappingB.generatedLine;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.generatedColumn - mappingB.generatedColumn;
			if (cmp !== 0 || onlyCompareGenerated) {
				return cmp;
			}

			cmp = strcmp(mappingA.source, mappingB.source);
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalLine - mappingB.originalLine;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalColumn - mappingB.originalColumn;
			if (cmp !== 0) {
				return cmp;
			}

			return strcmp(mappingA.name, mappingB.name);
		}
		exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

		function strcmp(aStr1, aStr2) {
			if (aStr1 === aStr2) {
				return 0;
			}

			if (aStr1 === null) {
				return 1; // aStr2 !== null
			}

			if (aStr2 === null) {
				return -1; // aStr1 !== null
			}

			if (aStr1 > aStr2) {
				return 1;
			}

			return -1;
		}

		/**
		 * Comparator between two mappings with inflated source and name strings where
		 * the generated positions are compared.
		 */
		function compareByGeneratedPositionsInflated(mappingA, mappingB) {
			var cmp = mappingA.generatedLine - mappingB.generatedLine;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.generatedColumn - mappingB.generatedColumn;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = strcmp(mappingA.source, mappingB.source);
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalLine - mappingB.originalLine;
			if (cmp !== 0) {
				return cmp;
			}

			cmp = mappingA.originalColumn - mappingB.originalColumn;
			if (cmp !== 0) {
				return cmp;
			}

			return strcmp(mappingA.name, mappingB.name);
		}
		exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

		/**
		 * Strip any JSON XSSI avoidance prefix from the string (as documented
		 * in the source maps specification), and then parse the string as
		 * JSON.
		 */
		function parseSourceMapInput(str) {
			return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
		}
		exports.parseSourceMapInput = parseSourceMapInput;

		/**
		 * Compute the URL of a source given the the source root, the source's
		 * URL, and the source map's URL.
		 */
		function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
			sourceURL = sourceURL || "";

			if (sourceRoot) {
				// This follows what Chrome does.
				if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
					sourceRoot += "/";
				}
				// The spec says:
				//   Line 4: An optional source root, useful for relocating source
				//   files on a server or removing repeated values in the
				//   “sources” entry.  This value is prepended to the individual
				//   entries in the “source” field.
				sourceURL = sourceRoot + sourceURL;
			}

			// Historically, SourceMapConsumer did not take the sourceMapURL as
			// a parameter.  This mode is still somewhat supported, which is why
			// this code block is conditional.  However, it's preferable to pass
			// the source map URL to SourceMapConsumer, so that this function
			// can implement the source URL resolution algorithm as outlined in
			// the spec.  This block is basically the equivalent of:
			//    new URL(sourceURL, sourceMapURL).toString()
			// ... except it avoids using URL, which wasn't available in the
			// older releases of node still supported by this library.
			//
			// The spec says:
			//   If the sources are not absolute URLs after prepending of the
			//   “sourceRoot”, the sources are resolved relative to the
			//   SourceMap (like resolving script src in a html document).
			if (sourceMapURL) {
				var parsed = urlParse(sourceMapURL);
				if (!parsed) {
					throw new Error("sourceMapURL could not be parsed");
				}
				if (parsed.path) {
					// Strip the last path component, but keep the "/".
					var index = parsed.path.lastIndexOf("/");
					if (index >= 0) {
						parsed.path = parsed.path.substring(0, index + 1);
					}
				}
				sourceURL = join(urlGenerate(parsed), sourceURL);
			}

			return normalize(sourceURL);
		}
		exports.computeSourceURL = computeSourceURL;
	})(util$3);

	var arraySet = {};

	/* -*- Mode: js; js-indent-level: 2; -*- */

	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util$2 = util$3;
	var has$1 = Object.prototype.hasOwnProperty;
	var hasNativeMap = typeof Map !== "undefined";

	/**
	 * A data structure which is a combination of an array and a set. Adding a new
	 * member is O(1), testing for membership is O(1), and finding the index of an
	 * element is O(1). Removing elements from the set is not supported. Only
	 * strings are supported for membership.
	 */
	function ArraySet$1() {
		this._array = [];
		this._set = hasNativeMap ? new Map() : Object.create(null);
	}

	/**
	 * Static method for creating ArraySet instances from an existing array.
	 */
	ArraySet$1.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
		var set = new ArraySet$1();
		for (var i = 0, len = aArray.length; i < len; i++) {
			set.add(aArray[i], aAllowDuplicates);
		}
		return set;
	};

	/**
	 * Return how many unique items are in this ArraySet. If duplicates have been
	 * added, than those do not count towards the size.
	 *
	 * @returns Number
	 */
	ArraySet$1.prototype.size = function ArraySet_size() {
		return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
	};

	/**
	 * Add the given string to this set.
	 *
	 * @param String aStr
	 */
	ArraySet$1.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
		var sStr = hasNativeMap ? aStr : util$2.toSetString(aStr);
		var isDuplicate = hasNativeMap ? this.has(aStr) : has$1.call(this._set, sStr);
		var idx = this._array.length;
		if (!isDuplicate || aAllowDuplicates) {
			this._array.push(aStr);
		}
		if (!isDuplicate) {
			if (hasNativeMap) {
				this._set.set(aStr, idx);
			} else {
				this._set[sStr] = idx;
			}
		}
	};

	/**
	 * Is the given string a member of this set?
	 *
	 * @param String aStr
	 */
	ArraySet$1.prototype.has = function ArraySet_has(aStr) {
		if (hasNativeMap) {
			return this._set.has(aStr);
		}
		var sStr = util$2.toSetString(aStr);
		return has$1.call(this._set, sStr);
	};

	/**
	 * What is the index of the given string in the array?
	 *
	 * @param String aStr
	 */
	ArraySet$1.prototype.indexOf = function ArraySet_indexOf(aStr) {
		if (hasNativeMap) {
			var idx = this._set.get(aStr);
			if (idx >= 0) {
				return idx;
			}
		} else {
			var sStr = util$2.toSetString(aStr);
			if (has$1.call(this._set, sStr)) {
				return this._set[sStr];
			}
		}

		throw new Error(`"${aStr}" is not in the set.`);
	};

	/**
	 * What is the element at the given index?
	 *
	 * @param Number aIdx
	 */
	ArraySet$1.prototype.at = function ArraySet_at(aIdx) {
		if (aIdx >= 0 && aIdx < this._array.length) {
			return this._array[aIdx];
		}
		throw new Error(`No element indexed by ${aIdx}`);
	};

	/**
	 * Returns the array representation of this set (which has the proper indices
	 * indicated by indexOf). Note that this is a copy of the internal array used
	 * for storing the members so that no one can mess with internal state.
	 */
	ArraySet$1.prototype.toArray = function ArraySet_toArray() {
		return this._array.slice();
	};

	arraySet.ArraySet = ArraySet$1;

	var mappingList = {};

	/* -*- Mode: js; js-indent-level: 2; -*- */

	/*
	 * Copyright 2014 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util$1 = util$3;

	/**
	 * Determine whether mappingB is after mappingA with respect to generated
	 * position.
	 */
	function generatedPositionAfter(mappingA, mappingB) {
		// Optimized for most common case
		var lineA = mappingA.generatedLine;
		var lineB = mappingB.generatedLine;
		var columnA = mappingA.generatedColumn;
		var columnB = mappingB.generatedColumn;
		return (
			lineB > lineA ||
			(lineB === lineA && columnB >= columnA) ||
			util$1.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0
		);
	}

	/**
	 * A data structure to provide a sorted view of accumulated mappings in a
	 * performance conscious manner. It trades a neglibable overhead in general
	 * case for a large speedup in case of mappings being added in order.
	 */
	function MappingList$1() {
		this._array = [];
		this._sorted = true;
		// Serves as infimum
		this._last = { generatedLine: -1, generatedColumn: 0 };
	}

	/**
	 * Iterate through internal items. This method takes the same arguments that
	 * `Array.prototype.forEach` takes.
	 *
	 * NOTE: The order of the mappings is NOT guaranteed.
	 */
	MappingList$1.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
		this._array.forEach(aCallback, aThisArg);
	};

	/**
	 * Add the given source mapping.
	 *
	 * @param Object aMapping
	 */
	MappingList$1.prototype.add = function MappingList_add(aMapping) {
		if (generatedPositionAfter(this._last, aMapping)) {
			this._last = aMapping;
			this._array.push(aMapping);
		} else {
			this._sorted = false;
			this._array.push(aMapping);
		}
	};

	/**
	 * Returns the flat, sorted array of mappings. The mappings are sorted by
	 * generated position.
	 *
	 * WARNING: This method returns internal data without copying, for
	 * performance. The return value must NOT be mutated, and should be treated as
	 * an immutable borrow. If you want to take ownership, you must make your own
	 * copy.
	 */
	MappingList$1.prototype.toArray = function MappingList_toArray() {
		if (!this._sorted) {
			this._array.sort(util$1.compareByGeneratedPositionsInflated);
			this._sorted = true;
		}
		return this._array;
	};

	mappingList.MappingList = MappingList$1;

	/* -*- Mode: js; js-indent-level: 2; -*- */

	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var base64VLQ = base64Vlq;
	var util = util$3;
	var ArraySet = arraySet.ArraySet;
	var MappingList = mappingList.MappingList;

	/**
	 * An instance of the SourceMapGenerator represents a source map which is
	 * being built incrementally. You may pass an object with the following
	 * properties:
	 *
	 *   - file: The filename of the generated source.
	 *   - sourceRoot: A root for all relative URLs in this source map.
	 */
	function SourceMapGenerator$1(aArgs) {
		if (!aArgs) {
			aArgs = {};
		}
		this._file = util.getArg(aArgs, "file", null);
		this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
		this._skipValidation = util.getArg(aArgs, "skipValidation", false);
		this._sources = new ArraySet();
		this._names = new ArraySet();
		this._mappings = new MappingList();
		this._sourcesContents = null;
	}

	SourceMapGenerator$1.prototype._version = 3;

	/**
	 * Creates a new SourceMapGenerator based on a SourceMapConsumer
	 *
	 * @param aSourceMapConsumer The SourceMap.
	 */
	SourceMapGenerator$1.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
		var sourceRoot = aSourceMapConsumer.sourceRoot;
		var generator = new SourceMapGenerator$1({
			file: aSourceMapConsumer.file,
			sourceRoot: sourceRoot,
		});
		aSourceMapConsumer.eachMapping((mapping) => {
			var newMapping = {
				generated: {
					line: mapping.generatedLine,
					column: mapping.generatedColumn,
				},
			};

			if (mapping.source != null) {
				newMapping.source = mapping.source;
				if (sourceRoot != null) {
					newMapping.source = util.relative(sourceRoot, newMapping.source);
				}

				newMapping.original = {
					line: mapping.originalLine,
					column: mapping.originalColumn,
				};

				if (mapping.name != null) {
					newMapping.name = mapping.name;
				}
			}

			generator.addMapping(newMapping);
		});
		aSourceMapConsumer.sources.forEach((sourceFile) => {
			var sourceRelative = sourceFile;
			if (sourceRoot !== null) {
				sourceRelative = util.relative(sourceRoot, sourceFile);
			}

			if (!generator._sources.has(sourceRelative)) {
				generator._sources.add(sourceRelative);
			}

			var content = aSourceMapConsumer.sourceContentFor(sourceFile);
			if (content != null) {
				generator.setSourceContent(sourceFile, content);
			}
		});
		return generator;
	};

	/**
	 * Add a single mapping from original source line and column to the generated
	 * source's line and column for this source map being created. The mapping
	 * object should have the following properties:
	 *
	 *   - generated: An object with the generated line and column positions.
	 *   - original: An object with the original line and column positions.
	 *   - source: The original source file (relative to the sourceRoot).
	 *   - name: An optional original token name for this mapping.
	 */
	SourceMapGenerator$1.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
		var generated = util.getArg(aArgs, "generated");
		var original = util.getArg(aArgs, "original", null);
		var source = util.getArg(aArgs, "source", null);
		var name = util.getArg(aArgs, "name", null);

		if (!this._skipValidation) {
			this._validateMapping(generated, original, source, name);
		}

		if (source != null) {
			source = String(source);
			if (!this._sources.has(source)) {
				this._sources.add(source);
			}
		}

		if (name != null) {
			name = String(name);
			if (!this._names.has(name)) {
				this._names.add(name);
			}
		}

		this._mappings.add({
			generatedLine: generated.line,
			generatedColumn: generated.column,
			originalLine: original?.line,
			originalColumn: original?.column,
			source: source,
			name: name,
		});
	};

	/**
	 * Set the source content for a source file.
	 */
	SourceMapGenerator$1.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(
		aSourceFile,
		aSourceContent,
	) {
		var source = aSourceFile;
		if (this._sourceRoot != null) {
			source = util.relative(this._sourceRoot, source);
		}

		if (aSourceContent != null) {
			// Add the source content to the _sourcesContents map.
			// Create a new _sourcesContents map if the property is null.
			if (!this._sourcesContents) {
				this._sourcesContents = Object.create(null);
			}
			this._sourcesContents[util.toSetString(source)] = aSourceContent;
		} else if (this._sourcesContents) {
			// Remove the source file from the _sourcesContents map.
			// If the _sourcesContents map is empty, set the property to null.
			delete this._sourcesContents[util.toSetString(source)];
			if (Object.keys(this._sourcesContents).length === 0) {
				this._sourcesContents = null;
			}
		}
	};

	/**
	 * Applies the mappings of a sub-source-map for a specific source file to the
	 * source map being generated. Each mapping to the supplied source file is
	 * rewritten using the supplied source map. Note: The resolution for the
	 * resulting mappings is the minimium of this map and the supplied map.
	 *
	 * @param aSourceMapConsumer The source map to be applied.
	 * @param aSourceFile Optional. The filename of the source file.
	 *        If omitted, SourceMapConsumer's file property will be used.
	 * @param aSourceMapPath Optional. The dirname of the path to the source map
	 *        to be applied. If relative, it is relative to the SourceMapConsumer.
	 *        This parameter is needed when the two source maps aren't in the same
	 *        directory, and the source map to be applied contains relative source
	 *        paths. If so, those relative source paths need to be rewritten
	 *        relative to the SourceMapGenerator.
	 */
	SourceMapGenerator$1.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(
		aSourceMapConsumer,
		aSourceFile,
		aSourceMapPath,
	) {
		var sourceFile = aSourceFile;
		// If aSourceFile is omitted, we will use the file property of the SourceMap
		if (aSourceFile == null) {
			if (aSourceMapConsumer.file == null) {
				throw new Error(
					"SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, " +
						'or the source map\'s "file" property. Both were omitted.',
				);
			}
			sourceFile = aSourceMapConsumer.file;
		}
		var sourceRoot = this._sourceRoot;
		// Make "sourceFile" relative if an absolute Url is passed.
		if (sourceRoot != null) {
			sourceFile = util.relative(sourceRoot, sourceFile);
		}
		// Applying the SourceMap can add and remove items from the sources and
		// the names array.
		var newSources = new ArraySet();
		var newNames = new ArraySet();

		// Find mappings for the "sourceFile"
		this._mappings.unsortedForEach((mapping) => {
			if (mapping.source === sourceFile && mapping.originalLine != null) {
				// Check if it can be mapped by the source map, then update the mapping.
				var original = aSourceMapConsumer.originalPositionFor({
					line: mapping.originalLine,
					column: mapping.originalColumn,
				});
				if (original.source != null) {
					// Copy mapping
					mapping.source = original.source;
					if (aSourceMapPath != null) {
						mapping.source = util.join(aSourceMapPath, mapping.source);
					}
					if (sourceRoot != null) {
						mapping.source = util.relative(sourceRoot, mapping.source);
					}
					mapping.originalLine = original.line;
					mapping.originalColumn = original.column;
					if (original.name != null) {
						mapping.name = original.name;
					}
				}
			}

			var source = mapping.source;
			if (source != null && !newSources.has(source)) {
				newSources.add(source);
			}

			var name = mapping.name;
			if (name != null && !newNames.has(name)) {
				newNames.add(name);
			}
		}, this);
		this._sources = newSources;
		this._names = newNames;

		// Copy sourcesContents of applied map.
		aSourceMapConsumer.sources.forEach(function (sourceFile) {
			var content = aSourceMapConsumer.sourceContentFor(sourceFile);
			if (content != null) {
				if (aSourceMapPath != null) {
					sourceFile = util.join(aSourceMapPath, sourceFile);
				}
				if (sourceRoot != null) {
					sourceFile = util.relative(sourceRoot, sourceFile);
				}
				this.setSourceContent(sourceFile, content);
			}
		}, this);
	};

	/**
	 * A mapping can have one of the three levels of data:
	 *
	 *   1. Just the generated position.
	 *   2. The Generated position, original position, and original source.
	 *   3. Generated and original position, original source, as well as a name
	 *      token.
	 *
	 * To maintain consistency, we validate that any new mapping being added falls
	 * in to one of these categories.
	 */
	SourceMapGenerator$1.prototype._validateMapping = function SourceMapGenerator_validateMapping(
		aGenerated,
		aOriginal,
		aSource,
		aName,
	) {
		// When aOriginal is truthy but has empty values for .line and .column,
		// it is most likely a programmer error. In this case we throw a very
		// specific error message to try to guide them the right way.
		// For example: https://github.com/Polymer/polymer-bundler/pull/519
		if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
			throw new Error(
				"original.line and original.column are not numbers -- you probably meant to omit " +
					"the original mapping entirely and only map the generated position. If so, pass " +
					"null for the original mapping instead of an object with empty or null values.",
			);
		}

		if (
			aGenerated &&
			"line" in aGenerated &&
			"column" in aGenerated &&
			aGenerated.line > 0 &&
			aGenerated.column >= 0 &&
			!aOriginal &&
			!aSource &&
			!aName
		) {
			// Case 1.
			return;
		}
		if (
			aGenerated &&
			"line" in aGenerated &&
			"column" in aGenerated &&
			aOriginal &&
			"line" in aOriginal &&
			"column" in aOriginal &&
			aGenerated.line > 0 &&
			aGenerated.column >= 0 &&
			aOriginal.line > 0 &&
			aOriginal.column >= 0 &&
			aSource
		) {
			// Cases 2 and 3.
			return;
		}
		throw new Error(
			`Invalid mapping: ${JSON.stringify({
				generated: aGenerated,
				source: aSource,
				original: aOriginal,
				name: aName,
			})}`,
		);
	};

	/**
	 * Serialize the accumulated mappings in to the stream of base 64 VLQs
	 * specified by the source map format.
	 */
	SourceMapGenerator$1.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
		var previousGeneratedColumn = 0;
		var previousGeneratedLine = 1;
		var previousOriginalColumn = 0;
		var previousOriginalLine = 0;
		var previousName = 0;
		var previousSource = 0;
		var result = "";
		var next;
		var mapping;
		var nameIdx;
		var sourceIdx;

		var mappings = this._mappings.toArray();
		for (var i = 0, len = mappings.length; i < len; i++) {
			mapping = mappings[i];
			next = "";

			if (mapping.generatedLine !== previousGeneratedLine) {
				previousGeneratedColumn = 0;
				while (mapping.generatedLine !== previousGeneratedLine) {
					next += ";";
					previousGeneratedLine++;
				}
			} else {
				if (i > 0) {
					if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
						continue;
					}
					next += ",";
				}
			}

			next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
			previousGeneratedColumn = mapping.generatedColumn;

			if (mapping.source != null) {
				sourceIdx = this._sources.indexOf(mapping.source);
				next += base64VLQ.encode(sourceIdx - previousSource);
				previousSource = sourceIdx;

				// lines are stored 0-based in SourceMap spec version 3
				next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
				previousOriginalLine = mapping.originalLine - 1;

				next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
				previousOriginalColumn = mapping.originalColumn;

				if (mapping.name != null) {
					nameIdx = this._names.indexOf(mapping.name);
					next += base64VLQ.encode(nameIdx - previousName);
					previousName = nameIdx;
				}
			}

			result += next;
		}

		return result;
	};

	SourceMapGenerator$1.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(
		aSources,
		aSourceRoot,
	) {
		return aSources.map(function (source) {
			if (!this._sourcesContents) {
				return null;
			}
			if (aSourceRoot != null) {
				source = util.relative(aSourceRoot, source);
			}
			var key = util.toSetString(source);
			return Object.hasOwn(this._sourcesContents, key) ? this._sourcesContents[key] : null;
		}, this);
	};

	/**
	 * Externalize the source map.
	 */
	SourceMapGenerator$1.prototype.toJSON = function SourceMapGenerator_toJSON() {
		var map = {
			version: this._version,
			sources: this._sources.toArray(),
			names: this._names.toArray(),
			mappings: this._serializeMappings(),
		};
		if (this._file != null) {
			map.file = this._file;
		}
		if (this._sourceRoot != null) {
			map.sourceRoot = this._sourceRoot;
		}
		if (this._sourcesContents) {
			map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
		}

		return map;
	};

	/**
	 * Render the source map being generated to a string.
	 */
	SourceMapGenerator$1.prototype.toString = function SourceMapGenerator_toString() {
		return JSON.stringify(this.toJSON());
	};

	sourceMapGenerator.SourceMapGenerator = SourceMapGenerator$1;

	var SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
	var trackNodes = {
		Atrule: true,
		Selector: true,
		Declaration: true,
	};

	var sourceMap$1 = function generateSourceMap(handlers) {
		var map = new SourceMapGenerator();
		var line = 1;
		var column = 0;
		var generated = {
			line: 1,
			column: 0,
		};
		var original = {
			line: 0, // should be zero to add first mapping
			column: 0,
		};
		var sourceMappingActive = false;
		var activatedGenerated = {
			line: 1,
			column: 0,
		};
		var activatedMapping = {
			generated: activatedGenerated,
		};

		var handlersNode = handlers.node;
		handlers.node = function (node) {
			if (node.loc?.start && Object.hasOwn(trackNodes, node.type)) {
				var nodeLine = node.loc.start.line;
				var nodeColumn = node.loc.start.column - 1;

				if (original.line !== nodeLine || original.column !== nodeColumn) {
					original.line = nodeLine;
					original.column = nodeColumn;

					generated.line = line;
					generated.column = column;

					if (sourceMappingActive) {
						sourceMappingActive = false;
						if (generated.line !== activatedGenerated.line || generated.column !== activatedGenerated.column) {
							map.addMapping(activatedMapping);
						}
					}

					sourceMappingActive = true;
					map.addMapping({
						source: node.loc.source,
						original: original,
						generated: generated,
					});
				}
			}

			handlersNode.call(this, node);

			if (sourceMappingActive && Object.hasOwn(trackNodes, node.type)) {
				activatedGenerated.line = line;
				activatedGenerated.column = column;
			}
		};

		var handlersChunk = handlers.chunk;
		handlers.chunk = (chunk) => {
			for (var i = 0; i < chunk.length; i++) {
				if (chunk.charCodeAt(i) === 10) {
					// \n
					line++;
					column = 0;
				} else {
					column++;
				}
			}

			handlersChunk(chunk);
		};

		var handlersResult = handlers.result;
		handlers.result = () => {
			if (sourceMappingActive) {
				map.addMapping(activatedMapping);
			}

			return {
				css: handlersResult(),
				map: map,
			};
		};

		return handlers;
	};

	var sourceMap = sourceMap$1;
	var hasOwnProperty$4 = Object.prototype.hasOwnProperty;

	function processChildren(node, delimeter) {
		var list = node.children;
		var prev = null;

		if (typeof delimeter !== "function") {
			list.forEach(this.node, this);
		} else {
			list.forEach(function (node) {
				if (prev !== null) {
					delimeter.call(this, prev);
				}

				this.node(node);
				prev = node;
			}, this);
		}
	}

	var create$2 = function createGenerator(config) {
		function processNode(node) {
			if (hasOwnProperty$4.call(types, node.type)) {
				types[node.type].call(this, node);
			} else {
				throw new Error(`Unknown node type: ${node.type}`);
			}
		}

		var types = {};

		if (config.node) {
			for (var name in config.node) {
				types[name] = config.node[name].generate;
			}
		}

		return (node, options) => {
			var buffer = "";
			var handlers = {
				children: processChildren,
				node: processNode,
				chunk: (chunk) => {
					buffer += chunk;
				},
				result: () => buffer,
			};

			if (options) {
				if (typeof options.decorator === "function") {
					handlers = options.decorator(handlers);
				}

				if (options.sourceMap) {
					handlers = sourceMap(handlers);
				}
			}

			handlers.node(node);

			return handlers.result();
		};
	};

	var List$2 = List_1;

	var create$1 = function createConvertors(walk) {
		return {
			fromPlainObject: (ast) => {
				walk(ast, {
					enter: (node) => {
						if (node.children && node.children instanceof List$2 === false) {
							node.children = new List$2().fromArray(node.children);
						}
					},
				});

				return ast;
			},
			toPlainObject: (ast) => {
				walk(ast, {
					leave: (node) => {
						if (node.children && node.children instanceof List$2) {
							node.children = node.children.toArray();
						}
					},
				});

				return ast;
			},
		};
	};

	var hasOwnProperty$3 = Object.prototype.hasOwnProperty;
	var noop = () => {};

	function ensureFunction(value) {
		return typeof value === "function" ? value : noop;
	}

	function invokeForType(fn, type) {
		return function (node, item, list) {
			if (node.type === type) {
				fn.call(this, node, item, list);
			}
		};
	}

	function getWalkersFromStructure(_name, nodeType) {
		var structure = nodeType.structure;
		var walkers = [];

		for (var key in structure) {
			if (hasOwnProperty$3.call(structure, key) === false) {
				continue;
			}

			var fieldTypes = structure[key];
			var walker = {
				name: key,
				type: false,
				nullable: false,
			};

			if (!Array.isArray(structure[key])) {
				fieldTypes = [structure[key]];
			}

			for (var i = 0; i < fieldTypes.length; i++) {
				var fieldType = fieldTypes[i];
				if (fieldType === null) {
					walker.nullable = true;
				} else if (typeof fieldType === "string") {
					walker.type = "node";
				} else if (Array.isArray(fieldType)) {
					walker.type = "list";
				}
			}

			if (walker.type) {
				walkers.push(walker);
			}
		}

		if (walkers.length) {
			return {
				context: nodeType.walkContext,
				fields: walkers,
			};
		}

		return null;
	}

	function getTypesFromConfig(config) {
		var types = {};

		for (var name in config.node) {
			if (hasOwnProperty$3.call(config.node, name)) {
				var nodeType = config.node[name];

				if (!nodeType.structure) {
					throw new Error(`Missed \`structure\` field in \`${name}\` node type definition`);
				}

				types[name] = getWalkersFromStructure(name, nodeType);
			}
		}

		return types;
	}

	function createTypeIterator(config, reverse) {
		var fields = config.fields.slice();
		var contextName = config.context;
		var useContext = typeof contextName === "string";

		if (reverse) {
			fields.reverse();
		}

		return (node, context, walk, walkReducer) => {
			var prevContextValue;

			if (useContext) {
				prevContextValue = context[contextName];
				context[contextName] = node;
			}

			for (var i = 0; i < fields.length; i++) {
				var field = fields[i];
				var ref = node[field.name];

				if (!field.nullable || ref) {
					if (field.type === "list") {
						var breakWalk = reverse ? ref.reduceRight(walkReducer, false) : ref.reduce(walkReducer, false);

						if (breakWalk) {
							return true;
						}
					} else if (walk(ref)) {
						return true;
					}
				}
			}

			if (useContext) {
				context[contextName] = prevContextValue;
			}
		};
	}

	function createFastTraveralMap(iterators) {
		return {
			Atrule: {
				StyleSheet: iterators.StyleSheet,
				Atrule: iterators.Atrule,
				Rule: iterators.Rule,
				Block: iterators.Block,
			},
			Rule: {
				StyleSheet: iterators.StyleSheet,
				Atrule: iterators.Atrule,
				Rule: iterators.Rule,
				Block: iterators.Block,
			},
			Declaration: {
				StyleSheet: iterators.StyleSheet,
				Atrule: iterators.Atrule,
				Rule: iterators.Rule,
				Block: iterators.Block,
				DeclarationList: iterators.DeclarationList,
			},
		};
	}

	var create = function createWalker(config) {
		var types = getTypesFromConfig(config);
		var iteratorsNatural = {};
		var iteratorsReverse = {};
		var breakWalk = Symbol("break-walk");
		var skipNode = Symbol("skip-node");

		for (var name in types) {
			if (hasOwnProperty$3.call(types, name) && types[name] !== null) {
				iteratorsNatural[name] = createTypeIterator(types[name], false);
				iteratorsReverse[name] = createTypeIterator(types[name], true);
			}
		}

		var fastTraversalIteratorsNatural = createFastTraveralMap(iteratorsNatural);
		var fastTraversalIteratorsReverse = createFastTraveralMap(iteratorsReverse);

		var walk = (root, options) => {
			function walkNode(node, item, list) {
				var enterRet = enter.call(context, node, item, list);

				if (enterRet === breakWalk) {
					return true;
				}

				if (enterRet === skipNode) {
					return false;
				}

				if (Object.hasOwn(iterators, node.type)) {
					if (iterators[node.type](node, context, walkNode, walkReducer)) {
						return true;
					}
				}

				if (leave.call(context, node, item, list) === breakWalk) {
					return true;
				}

				return false;
			}

			var walkReducer = (ret, data, item, list) => ret || walkNode(data, item, list);
			var enter = noop;
			var leave = noop;
			var iterators = iteratorsNatural;
			var context = {
				break: breakWalk,
				skip: skipNode,

				root: root,
				stylesheet: null,
				atrule: null,
				atrulePrelude: null,
				rule: null,
				selector: null,
				block: null,
				declaration: null,
				function: null,
			};

			if (typeof options === "function") {
				enter = options;
			} else if (options) {
				enter = ensureFunction(options.enter);
				leave = ensureFunction(options.leave);

				if (options.reverse) {
					iterators = iteratorsReverse;
				}

				if (options.visit) {
					if (Object.hasOwn(fastTraversalIteratorsNatural, options.visit)) {
						iterators = options.reverse
							? fastTraversalIteratorsReverse[options.visit]
							: fastTraversalIteratorsNatural[options.visit];
					} else if (!Object.hasOwn(types, options.visit)) {
						throw new Error(
							`Bad value \`${options.visit}\` for \`visit\` option (should be: ${Object.keys(types).join(", ")})`,
						);
					}

					enter = invokeForType(enter, options.visit);
					leave = invokeForType(leave, options.visit);
				}
			}

			if (enter === noop && leave === noop) {
				throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
			}

			walkNode(root);
		};

		walk.break = breakWalk;
		walk.skip = skipNode;

		walk.find = (ast, fn) => {
			var found = null;

			walk(ast, function (node, item, list) {
				if (fn.call(this, node, item, list)) {
					found = node;
					return breakWalk;
				}
			});

			return found;
		};

		walk.findLast = (ast, fn) => {
			var found = null;

			walk(ast, {
				reverse: true,
				enter: function (node, item, list) {
					if (fn.call(this, node, item, list)) {
						found = node;
						return breakWalk;
					}
				},
			});

			return found;
		};

		walk.findAll = (ast, fn) => {
			var found = [];

			walk(ast, function (node, item, list) {
				if (fn.call(this, node, item, list)) {
					found.push(node);
				}
			});

			return found;
		};

		return walk;
	};

	var List$1 = List_1;

	var clone$1 = function clone(node) {
		var result = {};

		for (var key in node) {
			var value = node[key];

			if (value) {
				if (Array.isArray(value) || value instanceof List$1) {
					value = value.map(clone);
				} else if (value.constructor === Object) {
					value = clone(value);
				}
			}

			result[key] = value;
		}

		return result;
	};

	const hasOwnProperty$2 = Object.prototype.hasOwnProperty;
	const shape$1 = {
		generic: true,
		types: appendOrAssign,
		atrules: {
			prelude: appendOrAssignOrNull,
			descriptors: appendOrAssignOrNull,
		},
		properties: appendOrAssign,
		parseContext: assign,
		scope: deepAssign,
		atrule: ["parse"],
		pseudo: ["parse"],
		node: ["name", "structure", "parse", "generate", "walkContext"],
	};

	function isObject$2(value) {
		return value && value.constructor === Object;
	}

	function copy(value) {
		return isObject$2(value) ? Object.assign({}, value) : value;
	}

	function assign(dest, src) {
		return Object.assign(dest, src);
	}

	function deepAssign(dest, src) {
		for (const key in src) {
			if (hasOwnProperty$2.call(src, key)) {
				if (isObject$2(dest[key])) {
					deepAssign(dest[key], copy(src[key]));
				} else {
					dest[key] = copy(src[key]);
				}
			}
		}

		return dest;
	}

	function append(a, b) {
		if (typeof b === "string" && /^\s*\|/.test(b)) {
			return typeof a === "string" ? a + b : b.replace(/^\s*\|\s*/, "");
		}

		return b || null;
	}

	function appendOrAssign(a, b) {
		if (typeof b === "string") {
			return append(a, b);
		}

		const result = Object.assign({}, a);
		for (const key in b) {
			if (hasOwnProperty$2.call(b, key)) {
				result[key] = append(hasOwnProperty$2.call(a, key) ? a[key] : undefined, b[key]);
			}
		}

		return result;
	}

	function appendOrAssignOrNull(a, b) {
		const result = appendOrAssign(a, b);

		return !isObject$2(result) || Object.keys(result).length ? result : null;
	}

	function mix$1(dest, src, shape) {
		for (const key in shape) {
			if (hasOwnProperty$2.call(shape, key) === false) {
				continue;
			}

			if (shape[key] === true) {
				if (key in src) {
					if (hasOwnProperty$2.call(src, key)) {
						dest[key] = copy(src[key]);
					}
				}
			} else if (shape[key]) {
				if (typeof shape[key] === "function") {
					const fn = shape[key];
					dest[key] = fn({}, dest[key]);
					dest[key] = fn(dest[key] || {}, src[key]);
				} else if (isObject$2(shape[key])) {
					const result = {};

					for (const name in dest[key]) {
						result[name] = mix$1({}, dest[key][name], shape[key]);
					}

					for (const name in src[key]) {
						result[name] = mix$1(result[name] || {}, src[key][name], shape[key]);
					}

					dest[key] = result;
				} else if (Array.isArray(shape[key])) {
					const res = {};
					const innerShape = shape[key].reduce((s, k) => {
						s[k] = true;
						return s;
					}, {});

					for (const [name, value] of Object.entries(dest[key] || {})) {
						res[name] = {};
						if (value) {
							mix$1(res[name], value, innerShape);
						}
					}

					for (const name in src[key]) {
						if (hasOwnProperty$2.call(src[key], name)) {
							if (!res[name]) {
								res[name] = {};
							}

							if (src[key]?.[name]) {
								mix$1(res[name], src[key][name], innerShape);
							}
						}
					}

					dest[key] = res;
				}
			}
		}
		return dest;
	}

	var mix_1 = (dest, src) => mix$1(dest, src, shape$1);

	var List = List_1;
	var SyntaxError$1 = _SyntaxError$1;
	var TokenStream = TokenStream_1;
	var Lexer = Lexer_1;
	var definitionSyntax = definitionSyntax$1;
	var tokenize = tokenizer$3;
	var createParser = create$3;
	var createGenerator = create$2;
	var createConvertor = create$1;
	var createWalker = create;
	var clone = clone$1;
	var names = names$2;
	var mix = mix_1;

	function createSyntax(config) {
		var parse = createParser(config);
		var walk = createWalker(config);
		var generate = createGenerator(config);
		var convert = createConvertor(walk);

		var syntax = {
			List: List,
			SyntaxError: SyntaxError$1,
			TokenStream: TokenStream,
			Lexer: Lexer,

			vendorPrefix: names.vendorPrefix,
			keyword: names.keyword,
			property: names.property,
			isCustomProperty: names.isCustomProperty,

			definitionSyntax: definitionSyntax,
			lexer: null,
			createLexer: (config) => new Lexer(config, syntax, syntax.lexer.structure),

			tokenize: tokenize,
			parse: parse,
			walk: walk,
			generate: generate,

			find: walk.find,
			findLast: walk.findLast,
			findAll: walk.findAll,

			clone: clone,
			fromPlainObject: convert.fromPlainObject,
			toPlainObject: convert.toPlainObject,

			createSyntax: (config) => createSyntax(mix({}, config)),
			fork: (extension) => {
				var base = mix({}, config); // copy of config
				return createSyntax(typeof extension === "function" ? extension(base, Object.assign) : mix(base, extension));
			},
		};

		syntax.lexer = new Lexer(
			{
				generic: true,
				types: config.types,
				atrules: config.atrules,
				properties: config.properties,
				node: config.node,
			},
			syntax,
		);

		return syntax;
	}
	create$4.create = (config) => createSyntax(mix({}, config));

	var require$$0 = {
		"@charset": {
			syntax: '@charset "<charset>";',
			groups: ["CSS Charsets"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@charset",
		},
		"@counter-style": {
			syntax:
				"@counter-style <counter-style-name> {\n  [ system: <counter-system>; ] ||\n  [ symbols: <counter-symbols>; ] ||\n  [ additive-symbols: <additive-symbols>; ] ||\n  [ negative: <negative-symbol>; ] ||\n  [ prefix: <prefix>; ] ||\n  [ suffix: <suffix>; ] ||\n  [ range: <range>; ] ||\n  [ pad: <padding>; ] ||\n  [ speak-as: <speak-as>; ] ||\n  [ fallback: <counter-style-name>; ]\n}",
			interfaces: ["CSSCounterStyleRule"],
			groups: ["CSS Counter Styles"],
			descriptors: {
				"additive-symbols": {
					syntax: "[ <integer> && <symbol> ]#",
					media: "all",
					initial: "n/a (required)",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				fallback: {
					syntax: "<counter-style-name>",
					media: "all",
					initial: "decimal",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				negative: {
					syntax: "<symbol> <symbol>?",
					media: "all",
					initial: '"-" hyphen-minus',
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				pad: {
					syntax: "<integer> && <symbol>",
					media: "all",
					initial: '0 ""',
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				prefix: {
					syntax: "<symbol>",
					media: "all",
					initial: '""',
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				range: {
					syntax: "[ [ <integer> | infinite ]{2} ]# | auto",
					media: "all",
					initial: "auto",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				"speak-as": {
					syntax: "auto | bullets | numbers | words | spell-out | <counter-style-name>",
					media: "all",
					initial: "auto",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				suffix: {
					syntax: "<symbol>",
					media: "all",
					initial: '". "',
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				symbols: {
					syntax: "<symbol>+",
					media: "all",
					initial: "n/a (required)",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				system: {
					syntax:
						"cyclic | numeric | alphabetic | symbolic | additive | [ fixed <integer>? ] | [ extends <counter-style-name> ]",
					media: "all",
					initial: "symbolic",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
			},
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@counter-style",
		},
		"@document": {
			syntax:
				"@document [ <url> | url-prefix(<string>) | domain(<string>) | media-document(<string>) | regexp(<string>) ]# {\n  <group-rule-body>\n}",
			interfaces: ["CSSGroupingRule", "CSSConditionRule"],
			groups: ["CSS Conditional Rules"],
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@document",
		},
		"@font-face": {
			syntax:
				"@font-face {\n  [ font-family: <family-name>; ] ||\n  [ src: <src>; ] ||\n  [ unicode-range: <unicode-range>; ] ||\n  [ font-variant: <font-variant>; ] ||\n  [ font-feature-settings: <font-feature-settings>; ] ||\n  [ font-variation-settings: <font-variation-settings>; ] ||\n  [ font-stretch: <font-stretch>; ] ||\n  [ font-weight: <font-weight>; ] ||\n  [ font-style: <font-style>; ]\n}",
			interfaces: ["CSSFontFaceRule"],
			groups: ["CSS Fonts"],
			descriptors: {
				"font-display": {
					syntax: "[ auto | block | swap | fallback | optional ]",
					media: "visual",
					percentages: "no",
					initial: "auto",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "experimental",
				},
				"font-family": {
					syntax: "<family-name>",
					media: "all",
					initial: "n/a (required)",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"font-feature-settings": {
					syntax: "normal | <feature-tag-value>#",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				"font-variation-settings": {
					syntax: "normal | [ <string> <number> ]#",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				"font-stretch": {
					syntax: "<font-stretch-absolute>{1,2}",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"font-style": {
					syntax: "normal | italic | oblique <angle>{0,2}",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"font-weight": {
					syntax: "<font-weight-absolute>{1,2}",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"font-variant": {
					syntax:
						"normal | none | [ <common-lig-values> || <discretionary-lig-values> || <historical-lig-values> || <contextual-alt-values> || stylistic(<feature-value-name>) || historical-forms || styleset(<feature-value-name>#) || character-variant(<feature-value-name>#) || swash(<feature-value-name>) || ornaments(<feature-value-name>) || annotation(<feature-value-name>) || [ small-caps | all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps ] || <numeric-figure-values> || <numeric-spacing-values> || <numeric-fraction-values> || ordinal || slashed-zero || <east-asian-variant-values> || <east-asian-width-values> || ruby ]",
					media: "all",
					initial: "normal",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				src: {
					syntax: "[ <url> [ format( <string># ) ]? | local( <family-name> ) ]#",
					media: "all",
					initial: "n/a (required)",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				"unicode-range": {
					syntax: "<unicode-range>#",
					media: "all",
					initial: "U+0-10FFFF",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
			},
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@font-face",
		},
		"@font-feature-values": {
			syntax: "@font-feature-values <family-name># {\n  <feature-value-block-list>\n}",
			interfaces: ["CSSFontFeatureValuesRule"],
			groups: ["CSS Fonts"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@font-feature-values",
		},
		"@import": {
			syntax: "@import [ <string> | <url> ] [ <media-query-list> ]?;",
			groups: ["Media Queries"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@import",
		},
		"@keyframes": {
			syntax: "@keyframes <keyframes-name> {\n  <keyframe-block-list>\n}",
			interfaces: ["CSSKeyframeRule", "CSSKeyframesRule"],
			groups: ["CSS Animations"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@keyframes",
		},
		"@media": {
			syntax: "@media <media-query-list> {\n  <group-rule-body>\n}",
			interfaces: ["CSSGroupingRule", "CSSConditionRule", "CSSMediaRule", "CSSCustomMediaRule"],
			groups: ["CSS Conditional Rules", "Media Queries"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@media",
		},
		"@namespace": {
			syntax: "@namespace <namespace-prefix>? [ <string> | <url> ];",
			groups: ["CSS Namespaces"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@namespace",
		},
		"@page": {
			syntax: "@page <page-selector-list> {\n  <page-body>\n}",
			interfaces: ["CSSPageRule"],
			groups: ["CSS Pages"],
			descriptors: {
				bleed: {
					syntax: "auto | <length>",
					media: ["visual", "paged"],
					initial: "auto",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				marks: {
					syntax: "none | [ crop || cross ]",
					media: ["visual", "paged"],
					initial: "none",
					percentages: "no",
					computed: "asSpecified",
					order: "orderOfAppearance",
					status: "standard",
				},
				size: {
					syntax: "<length>{1,2} | auto | [ <page-size> || [ portrait | landscape ] ]",
					media: ["visual", "paged"],
					initial: "auto",
					percentages: "no",
					computed: "asSpecifiedRelativeToAbsoluteLengths",
					order: "orderOfAppearance",
					status: "standard",
				},
			},
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@page",
		},
		"@property": {
			syntax: "@property <custom-property-name> {\n  <declaration-list>\n}",
			interfaces: ["CSS", "CSSPropertyRule"],
			groups: ["CSS Houdini"],
			descriptors: {
				syntax: {
					syntax: "<string>",
					media: "all",
					percentages: "no",
					initial: "n/a (required)",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "experimental",
				},
				inherits: {
					syntax: "true | false",
					media: "all",
					percentages: "no",
					initial: "auto",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "experimental",
				},
				"initial-value": {
					syntax: "<string>",
					media: "all",
					initial: "n/a (required)",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "experimental",
				},
			},
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@property",
		},
		"@supports": {
			syntax: "@supports <supports-condition> {\n  <group-rule-body>\n}",
			interfaces: ["CSSGroupingRule", "CSSConditionRule", "CSSSupportsRule"],
			groups: ["CSS Conditional Rules"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@supports",
		},
		"@viewport": {
			syntax: "@viewport {\n  <group-rule-body>\n}",
			interfaces: ["CSSViewportRule"],
			groups: ["CSS Device Adaptation"],
			descriptors: {
				height: {
					syntax: "<viewport-length>{1,2}",
					media: ["visual", "continuous"],
					initial: ["min-height", "max-height"],
					percentages: ["min-height", "max-height"],
					computed: ["min-height", "max-height"],
					order: "orderOfAppearance",
					status: "standard",
				},
				"max-height": {
					syntax: "<viewport-length>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "referToHeightOfInitialViewport",
					computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
					order: "uniqueOrder",
					status: "standard",
				},
				"max-width": {
					syntax: "<viewport-length>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "referToWidthOfInitialViewport",
					computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
					order: "uniqueOrder",
					status: "standard",
				},
				"max-zoom": {
					syntax: "auto | <number> | <percentage>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "the zoom factor itself",
					computed: "autoNonNegativeOrPercentage",
					order: "uniqueOrder",
					status: "standard",
				},
				"min-height": {
					syntax: "<viewport-length>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "referToHeightOfInitialViewport",
					computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
					order: "uniqueOrder",
					status: "standard",
				},
				"min-width": {
					syntax: "<viewport-length>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "referToWidthOfInitialViewport",
					computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
					order: "uniqueOrder",
					status: "standard",
				},
				"min-zoom": {
					syntax: "auto | <number> | <percentage>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "the zoom factor itself",
					computed: "autoNonNegativeOrPercentage",
					order: "uniqueOrder",
					status: "standard",
				},
				orientation: {
					syntax: "auto | portrait | landscape",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "referToSizeOfBoundingBox",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"user-zoom": {
					syntax: "zoom | fixed",
					media: ["visual", "continuous"],
					initial: "zoom",
					percentages: "referToSizeOfBoundingBox",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				"viewport-fit": {
					syntax: "auto | contain | cover",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "no",
					computed: "asSpecified",
					order: "uniqueOrder",
					status: "standard",
				},
				width: {
					syntax: "<viewport-length>{1,2}",
					media: ["visual", "continuous"],
					initial: ["min-width", "max-width"],
					percentages: ["min-width", "max-width"],
					computed: ["min-width", "max-width"],
					order: "orderOfAppearance",
					status: "standard",
				},
				zoom: {
					syntax: "auto | <number> | <percentage>",
					media: ["visual", "continuous"],
					initial: "auto",
					percentages: "the zoom factor itself",
					computed: "autoNonNegativeOrPercentage",
					order: "uniqueOrder",
					status: "standard",
				},
			},
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/@viewport",
		},
	};

	var all = {
		syntax: "initial | inherit | unset | revert",
		media: "noPracticalMedia",
		inherited: false,
		animationType: "eachOfShorthandPropertiesExceptUnicodeBiDiAndDirection",
		percentages: "no",
		groups: ["CSS Miscellaneous"],
		initial: "noPracticalInitialValue",
		appliesto: "allElements",
		computed: "asSpecifiedAppliesToEachProperty",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/all",
	};
	var animation = {
		syntax: "<single-animation>#",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Animations"],
		initial: [
			"animation-name",
			"animation-duration",
			"animation-timing-function",
			"animation-delay",
			"animation-iteration-count",
			"animation-direction",
			"animation-fill-mode",
			"animation-play-state",
		],
		appliesto: "allElementsAndPseudos",
		computed: [
			"animation-name",
			"animation-duration",
			"animation-timing-function",
			"animation-delay",
			"animation-direction",
			"animation-iteration-count",
			"animation-fill-mode",
			"animation-play-state",
		],
		order: "orderOfAppearance",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation",
	};
	var appearance = {
		syntax: "none | auto | textfield | menulist-button | <compat-auto>",
		media: "all",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Basic User Interface"],
		initial: "auto",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "perGrammar",
		status: "experimental",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/appearance",
	};
	var azimuth = {
		syntax:
			"<angle> | [ [ left-side | far-left | left | center-left | center | center-right | right | far-right | right-side ] || behind ] | leftwards | rightwards",
		media: "aural",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Speech"],
		initial: "center",
		appliesto: "allElements",
		computed: "normalizedAngle",
		order: "orderOfAppearance",
		status: "obsolete",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/azimuth",
	};
	var background = {
		syntax: "[ <bg-layer> , ]* <final-bg-layer>",
		media: "visual",
		inherited: false,
		animationType: [
			"background-color",
			"background-image",
			"background-clip",
			"background-position",
			"background-size",
			"background-repeat",
			"background-attachment",
		],
		percentages: ["background-position", "background-size"],
		groups: ["CSS Backgrounds and Borders"],
		initial: [
			"background-image",
			"background-position",
			"background-size",
			"background-repeat",
			"background-origin",
			"background-clip",
			"background-attachment",
			"background-color",
		],
		appliesto: "allElements",
		computed: [
			"background-image",
			"background-position",
			"background-size",
			"background-repeat",
			"background-origin",
			"background-clip",
			"background-attachment",
			"background-color",
		],
		order: "orderOfAppearance",
		alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background",
	};
	var border = {
		syntax: "<line-width> || <line-style> || <color>",
		media: "visual",
		inherited: false,
		animationType: ["border-color", "border-style", "border-width"],
		percentages: "no",
		groups: ["CSS Backgrounds and Borders"],
		initial: ["border-width", "border-style", "border-color"],
		appliesto: "allElements",
		computed: ["border-width", "border-style", "border-color"],
		order: "orderOfAppearance",
		alsoAppliesTo: ["::first-letter"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border",
	};
	var bottom = {
		syntax: "<length> | <percentage> | auto",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "referToContainingBlockHeight",
		groups: ["CSS Positioning"],
		initial: "auto",
		appliesto: "positionedElements",
		computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/bottom",
	};
	var clear = {
		syntax: "none | left | right | both | inline-start | inline-end",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Positioning"],
		initial: "none",
		appliesto: "blockLevelElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/clear",
	};
	var clip = {
		syntax: "<shape> | auto",
		media: "visual",
		inherited: false,
		animationType: "rectangle",
		percentages: "no",
		groups: ["CSS Masking"],
		initial: "auto",
		appliesto: "absolutelyPositionedElements",
		computed: "autoOrRectangle",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/clip",
	};
	var color$1 = {
		syntax: "<color>",
		media: "visual",
		inherited: true,
		animationType: "color",
		percentages: "no",
		groups: ["CSS Color"],
		initial: "variesFromBrowserToBrowser",
		appliesto: "allElements",
		computed: "translucentValuesRGBAOtherwiseRGB",
		order: "uniqueOrder",
		alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/color",
	};
	var columns = {
		syntax: "<'column-width'> || <'column-count'>",
		media: "visual",
		inherited: false,
		animationType: ["column-width", "column-count"],
		percentages: "no",
		groups: ["CSS Columns"],
		initial: ["column-width", "column-count"],
		appliesto: "blockContainersExceptTableWrappers",
		computed: ["column-width", "column-count"],
		order: "perGrammar",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/columns",
	};
	var contain = {
		syntax: "none | strict | content | [ size || layout || style || paint ]",
		media: "all",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Containment"],
		initial: "none",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "perGrammar",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/contain",
	};
	var content = {
		syntax: "normal | none | [ <content-replacement> | <content-list> ] [/ <string> ]?",
		media: "all",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Generated Content"],
		initial: "normal",
		appliesto: "beforeAndAfterPseudos",
		computed: "normalOnElementsForPseudosNoneAbsoluteURIStringOrAsSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/content",
	};
	var cursor = {
		syntax:
			"[ [ <url> [ <x> <y> ]? , ]* [ auto | default | none | context-menu | help | pointer | progress | wait | cell | crosshair | text | vertical-text | alias | copy | move | no-drop | not-allowed | e-resize | n-resize | ne-resize | nw-resize | s-resize | se-resize | sw-resize | w-resize | ew-resize | ns-resize | nesw-resize | nwse-resize | col-resize | row-resize | all-scroll | zoom-in | zoom-out | grab | grabbing ] ]",
		media: ["visual", "interactive"],
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Basic User Interface"],
		initial: "auto",
		appliesto: "allElements",
		computed: "asSpecifiedURLsAbsolute",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/cursor",
	};
	var direction = {
		syntax: "ltr | rtl",
		media: "visual",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Writing Modes"],
		initial: "ltr",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/direction",
	};
	var display = {
		syntax:
			"[ <display-outside> || <display-inside> ] | <display-listitem> | <display-internal> | <display-box> | <display-legacy>",
		media: "all",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Display"],
		initial: "inline",
		appliesto: "allElements",
		computed: "asSpecifiedExceptPositionedFloatingAndRootElementsKeywordMaybeDifferent",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/display",
	};
	var filter = {
		syntax: "none | <filter-function-list>",
		media: "visual",
		inherited: false,
		animationType: "filterList",
		percentages: "no",
		groups: ["Filter Effects"],
		initial: "none",
		appliesto: "allElementsSVGContainerElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/filter",
	};
	var flex = {
		syntax: "none | [ <'flex-grow'> <'flex-shrink'>? || <'flex-basis'> ]",
		media: "visual",
		inherited: false,
		animationType: ["flex-grow", "flex-shrink", "flex-basis"],
		percentages: "no",
		groups: ["CSS Flexible Box Layout"],
		initial: ["flex-grow", "flex-shrink", "flex-basis"],
		appliesto: "flexItemsAndInFlowPseudos",
		computed: ["flex-grow", "flex-shrink", "flex-basis"],
		order: "orderOfAppearance",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex",
	};
	var float = {
		syntax: "left | right | none | inline-start | inline-end",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Positioning"],
		initial: "none",
		appliesto: "allElementsNoEffectIfDisplayNone",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/float",
	};
	var font = {
		syntax:
			"[ [ <'font-style'> || <font-variant-css21> || <'font-weight'> || <'font-stretch'> ]? <'font-size'> [ / <'line-height'> ]? <'font-family'> ] | caption | icon | menu | message-box | small-caption | status-bar",
		media: "visual",
		inherited: true,
		animationType: [
			"font-style",
			"font-variant",
			"font-weight",
			"font-stretch",
			"font-size",
			"line-height",
			"font-family",
		],
		percentages: ["font-size", "line-height"],
		groups: ["CSS Fonts"],
		initial: ["font-style", "font-variant", "font-weight", "font-stretch", "font-size", "line-height", "font-family"],
		appliesto: "allElements",
		computed: ["font-style", "font-variant", "font-weight", "font-stretch", "font-size", "line-height", "font-family"],
		order: "orderOfAppearance",
		alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font",
	};
	var gap = {
		syntax: "<'row-gap'> <'column-gap'>?",
		media: "visual",
		inherited: false,
		animationType: ["row-gap", "column-gap"],
		percentages: "no",
		groups: ["CSS Box Alignment"],
		initial: ["row-gap", "column-gap"],
		appliesto: "multiColumnElementsFlexContainersGridContainers",
		computed: ["row-gap", "column-gap"],
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/gap",
	};
	var grid = {
		syntax:
			"<'grid-template'> | <'grid-template-rows'> / [ auto-flow && dense? ] <'grid-auto-columns'>? | [ auto-flow && dense? ] <'grid-auto-rows'>? / <'grid-template-columns'>",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: ["grid-template-rows", "grid-template-columns", "grid-auto-rows", "grid-auto-columns"],
		groups: ["CSS Grid Layout"],
		initial: [
			"grid-template-rows",
			"grid-template-columns",
			"grid-template-areas",
			"grid-auto-rows",
			"grid-auto-columns",
			"grid-auto-flow",
			"grid-column-gap",
			"grid-row-gap",
			"column-gap",
			"row-gap",
		],
		appliesto: "gridContainers",
		computed: [
			"grid-template-rows",
			"grid-template-columns",
			"grid-template-areas",
			"grid-auto-rows",
			"grid-auto-columns",
			"grid-auto-flow",
			"grid-column-gap",
			"grid-row-gap",
			"column-gap",
			"row-gap",
		],
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid",
	};
	var height = {
		syntax: "auto | <length> | <percentage> | min-content | max-content | fit-content(<length-percentage>)",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentagesRelativeToContainingBlock",
		groups: ["CSS Box Model"],
		initial: "auto",
		appliesto: "allElementsButNonReplacedAndTableColumns",
		computed: "percentageAutoOrAbsoluteLength",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/height",
	};
	var hyphens = {
		syntax: "none | manual | auto",
		media: "visual",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Text"],
		initial: "manual",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/hyphens",
	};
	var inset = {
		syntax: "<'top'>{1,4}",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "logicalHeightOfContainingBlock",
		groups: ["CSS Logical Properties"],
		initial: "auto",
		appliesto: "positionedElements",
		computed: "sameAsBoxOffsets",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset",
	};
	var isolation = {
		syntax: "auto | isolate",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["Compositing and Blending"],
		initial: "auto",
		appliesto: "allElementsSVGContainerGraphicsAndGraphicsReferencingElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/isolation",
	};
	var left = {
		syntax: "<length> | <percentage> | auto",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "referToWidthOfContainingBlock",
		groups: ["CSS Positioning"],
		initial: "auto",
		appliesto: "positionedElements",
		computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/left",
	};
	var margin = {
		syntax: "[ <length> | <percentage> | auto ]{1,4}",
		media: "visual",
		inherited: false,
		animationType: "length",
		percentages: "referToWidthOfContainingBlock",
		groups: ["CSS Box Model"],
		initial: ["margin-bottom", "margin-left", "margin-right", "margin-top"],
		appliesto: "allElementsExceptTableDisplayTypes",
		computed: ["margin-bottom", "margin-left", "margin-right", "margin-top"],
		order: "uniqueOrder",
		alsoAppliesTo: ["::first-letter", "::first-line"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin",
	};
	var mask = {
		syntax: "<mask-layer>#",
		media: "visual",
		inherited: false,
		animationType: [
			"mask-image",
			"mask-mode",
			"mask-repeat",
			"mask-position",
			"mask-clip",
			"mask-origin",
			"mask-size",
			"mask-composite",
		],
		percentages: ["mask-position"],
		groups: ["CSS Masking"],
		initial: [
			"mask-image",
			"mask-mode",
			"mask-repeat",
			"mask-position",
			"mask-clip",
			"mask-origin",
			"mask-size",
			"mask-composite",
		],
		appliesto: "allElementsSVGContainerElements",
		computed: [
			"mask-image",
			"mask-mode",
			"mask-repeat",
			"mask-position",
			"mask-clip",
			"mask-origin",
			"mask-size",
			"mask-composite",
		],
		order: "perGrammar",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask",
	};
	var offset = {
		syntax:
			"[ <'offset-position'>? [ <'offset-path'> [ <'offset-distance'> || <'offset-rotate'> ]? ]? ]! [ / <'offset-anchor'> ]?",
		media: "visual",
		inherited: false,
		animationType: ["offset-position", "offset-path", "offset-distance", "offset-anchor", "offset-rotate"],
		percentages: ["offset-position", "offset-distance", "offset-anchor"],
		groups: ["CSS Motion Path"],
		initial: ["offset-position", "offset-path", "offset-distance", "offset-anchor", "offset-rotate"],
		appliesto: "transformableElements",
		computed: ["offset-position", "offset-path", "offset-distance", "offset-anchor", "offset-rotate"],
		order: "perGrammar",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/offset",
	};
	var opacity = {
		syntax: "<alpha-value>",
		media: "visual",
		inherited: false,
		animationType: "number",
		percentages: "no",
		groups: ["CSS Color"],
		initial: "1.0",
		appliesto: "allElements",
		computed: "specifiedValueClipped0To1",
		order: "uniqueOrder",
		alsoAppliesTo: ["::placeholder"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/opacity",
	};
	var order = {
		syntax: "<integer>",
		media: "visual",
		inherited: false,
		animationType: "integer",
		percentages: "no",
		groups: ["CSS Flexible Box Layout"],
		initial: "0",
		appliesto: "flexItemsGridItemsAbsolutelyPositionedContainerChildren",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/order",
	};
	var orphans = {
		syntax: "<integer>",
		media: "visual",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Fragmentation"],
		initial: "2",
		appliesto: "blockContainerElements",
		computed: "asSpecified",
		order: "perGrammar",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/orphans",
	};
	var outline = {
		syntax: "[ <'outline-color'> || <'outline-style'> || <'outline-width'> ]",
		media: ["visual", "interactive"],
		inherited: false,
		animationType: ["outline-color", "outline-width", "outline-style"],
		percentages: "no",
		groups: ["CSS Basic User Interface"],
		initial: ["outline-color", "outline-style", "outline-width"],
		appliesto: "allElements",
		computed: ["outline-color", "outline-width", "outline-style"],
		order: "orderOfAppearance",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/outline",
	};
	var overflow = {
		syntax: "[ visible | hidden | clip | scroll | auto ]{1,2}",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Overflow"],
		initial: "visible",
		appliesto: "blockContainersFlexContainersGridContainers",
		computed: ["overflow-x", "overflow-y"],
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overflow",
	};
	var padding = {
		syntax: "[ <length> | <percentage> ]{1,4}",
		media: "visual",
		inherited: false,
		animationType: "length",
		percentages: "referToWidthOfContainingBlock",
		groups: ["CSS Box Model"],
		initial: ["padding-bottom", "padding-left", "padding-right", "padding-top"],
		appliesto: "allElementsExceptInternalTableDisplayTypes",
		computed: ["padding-bottom", "padding-left", "padding-right", "padding-top"],
		order: "uniqueOrder",
		alsoAppliesTo: ["::first-letter", "::first-line"],
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding",
	};
	var perspective = {
		syntax: "none | <length>",
		media: "visual",
		inherited: false,
		animationType: "length",
		percentages: "no",
		groups: ["CSS Transforms"],
		initial: "none",
		appliesto: "transformableElements",
		computed: "absoluteLengthOrNone",
		order: "uniqueOrder",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/perspective",
	};
	var position$1 = {
		syntax: "static | relative | absolute | sticky | fixed",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Positioning"],
		initial: "static",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/position",
	};
	var quotes = {
		syntax: "none | auto | [ <string> <string> ]+",
		media: "visual",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Generated Content"],
		initial: "dependsOnUserAgent",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/quotes",
	};
	var resize = {
		syntax: "none | both | horizontal | vertical | block | inline",
		media: "visual",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Basic User Interface"],
		initial: "none",
		appliesto: "elementsWithOverflowNotVisibleAndReplacedElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/resize",
	};
	var right = {
		syntax: "<length> | <percentage> | auto",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "referToWidthOfContainingBlock",
		groups: ["CSS Positioning"],
		initial: "auto",
		appliesto: "positionedElements",
		computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/right",
	};
	var rotate = {
		syntax: "none | <angle> | [ x | y | z | <number>{3} ] && <angle>",
		media: "visual",
		inherited: false,
		animationType: "transform",
		percentages: "no",
		groups: ["CSS Transforms"],
		initial: "none",
		appliesto: "transformableElements",
		computed: "asSpecified",
		order: "perGrammar",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/rotate",
	};
	var scale = {
		syntax: "none | <number>{1,3}",
		media: "visual",
		inherited: false,
		animationType: "transform",
		percentages: "no",
		groups: ["CSS Transforms"],
		initial: "none",
		appliesto: "transformableElements",
		computed: "asSpecified",
		order: "perGrammar",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scale",
	};
	var top = {
		syntax: "<length> | <percentage> | auto",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "referToContainingBlockHeight",
		groups: ["CSS Positioning"],
		initial: "auto",
		appliesto: "positionedElements",
		computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/top",
	};
	var transform = {
		syntax: "none | <transform-list>",
		media: "visual",
		inherited: false,
		animationType: "transform",
		percentages: "referToSizeOfBoundingBox",
		groups: ["CSS Transforms"],
		initial: "none",
		appliesto: "transformableElements",
		computed: "asSpecifiedRelativeToAbsoluteLengths",
		order: "uniqueOrder",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transform",
	};
	var transition = {
		syntax: "<single-transition>#",
		media: "interactive",
		inherited: false,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Transitions"],
		initial: ["transition-delay", "transition-duration", "transition-property", "transition-timing-function"],
		appliesto: "allElementsAndPseudos",
		computed: ["transition-delay", "transition-duration", "transition-property", "transition-timing-function"],
		order: "orderOfAppearance",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transition",
	};
	var translate = {
		syntax: "none | <length-percentage> [ <length-percentage> <length>? ]?",
		media: "visual",
		inherited: false,
		animationType: "transform",
		percentages: "referToSizeOfBoundingBox",
		groups: ["CSS Transforms"],
		initial: "none",
		appliesto: "transformableElements",
		computed: "asSpecifiedRelativeToAbsoluteLengths",
		order: "perGrammar",
		stacking: true,
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/translate",
	};
	var visibility = {
		syntax: "visible | hidden | collapse",
		media: "visual",
		inherited: true,
		animationType: "visibility",
		percentages: "no",
		groups: ["CSS Box Model"],
		initial: "visible",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/visibility",
	};
	var widows = {
		syntax: "<integer>",
		media: "visual",
		inherited: true,
		animationType: "discrete",
		percentages: "no",
		groups: ["CSS Fragmentation"],
		initial: "2",
		appliesto: "blockContainerElements",
		computed: "asSpecified",
		order: "perGrammar",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/widows",
	};
	var width = {
		syntax: "auto | <length> | <percentage> | min-content | max-content | fit-content(<length-percentage>)",
		media: "visual",
		inherited: false,
		animationType: "lpc",
		percentages: "referToWidthOfContainingBlock",
		groups: ["CSS Box Model"],
		initial: "auto",
		appliesto: "allElementsButNonReplacedAndTableRows",
		computed: "percentageAutoOrAbsoluteLength",
		order: "lengthOrPercentageBeforeKeywordIfBothPresent",
		status: "standard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/width",
	};
	var zoom = {
		syntax: "normal | reset | <number> | <percentage>",
		media: "visual",
		inherited: false,
		animationType: "integer",
		percentages: "no",
		groups: ["Microsoft Extensions"],
		initial: "normal",
		appliesto: "allElements",
		computed: "asSpecified",
		order: "uniqueOrder",
		status: "nonstandard",
		mdn_url: "https://developer.mozilla.org/docs/Web/CSS/zoom",
	};
	var require$$1 = {
		"--*": {
			syntax: "<declaration-value>",
			media: "all",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Variables"],
			initial: "seeProse",
			appliesto: "allElements",
			computed: "asSpecifiedWithVarsSubstituted",
			order: "perGrammar",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/--*",
		},
		"-ms-accelerator": {
			syntax: "false | true",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "false",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-accelerator",
		},
		"-ms-block-progression": {
			syntax: "tb | rl | bt | lr",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "tb",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-block-progression",
		},
		"-ms-content-zoom-chaining": {
			syntax: "none | chained",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-chaining",
		},
		"-ms-content-zooming": {
			syntax: "none | zoom",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "zoomForTheTopLevelNoneForTheRest",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zooming",
		},
		"-ms-content-zoom-limit": {
			syntax: "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: ["-ms-content-zoom-limit-max", "-ms-content-zoom-limit-min"],
			groups: ["Microsoft Extensions"],
			initial: ["-ms-content-zoom-limit-max", "-ms-content-zoom-limit-min"],
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: ["-ms-content-zoom-limit-max", "-ms-content-zoom-limit-min"],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-limit",
		},
		"-ms-content-zoom-limit-max": {
			syntax: "<percentage>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "maxZoomFactor",
			groups: ["Microsoft Extensions"],
			initial: "400%",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-limit-max",
		},
		"-ms-content-zoom-limit-min": {
			syntax: "<percentage>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "minZoomFactor",
			groups: ["Microsoft Extensions"],
			initial: "100%",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-limit-min",
		},
		"-ms-content-zoom-snap": {
			syntax: "<'-ms-content-zoom-snap-type'> || <'-ms-content-zoom-snap-points'>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: ["-ms-content-zoom-snap-type", "-ms-content-zoom-snap-points"],
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: ["-ms-content-zoom-snap-type", "-ms-content-zoom-snap-points"],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-snap",
		},
		"-ms-content-zoom-snap-points": {
			syntax: "snapInterval( <percentage>, <percentage> ) | snapList( <percentage># )",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "snapInterval(0%, 100%)",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-snap-points",
		},
		"-ms-content-zoom-snap-type": {
			syntax: "none | proximity | mandatory",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-content-zoom-snap-type",
		},
		"-ms-filter": {
			syntax: "<string>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: '""',
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-filter",
		},
		"-ms-flow-from": {
			syntax: "[ none | <custom-ident> ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "nonReplacedElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-flow-from",
		},
		"-ms-flow-into": {
			syntax: "[ none | <custom-ident> ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "iframeElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-flow-into",
		},
		"-ms-grid-columns": {
			syntax: "none | <track-list> | <auto-track-list>",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpcDifferenceLpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "none",
			appliesto: "gridContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-grid-columns",
		},
		"-ms-grid-rows": {
			syntax: "none | <track-list> | <auto-track-list>",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpcDifferenceLpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "none",
			appliesto: "gridContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-grid-rows",
		},
		"-ms-high-contrast-adjust": {
			syntax: "auto | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-high-contrast-adjust",
		},
		"-ms-hyphenate-limit-chars": {
			syntax: "auto | <integer>{1,3}",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-hyphenate-limit-chars",
		},
		"-ms-hyphenate-limit-lines": {
			syntax: "no-limit | <integer>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "no-limit",
			appliesto: "blockContainerElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-hyphenate-limit-lines",
		},
		"-ms-hyphenate-limit-zone": {
			syntax: "<percentage> | <length>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "referToLineBoxWidth",
			groups: ["Microsoft Extensions"],
			initial: "0",
			appliesto: "blockContainerElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-hyphenate-limit-zone",
		},
		"-ms-ime-align": {
			syntax: "auto | after",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-ime-align",
		},
		"-ms-overflow-style": {
			syntax: "auto | none | scrollbar | -ms-autohiding-scrollbar",
			media: "interactive",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-overflow-style",
		},
		"-ms-scrollbar-3dlight-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "dependsOnUserAgent",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-3dlight-color",
		},
		"-ms-scrollbar-arrow-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "ButtonText",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-arrow-color",
		},
		"-ms-scrollbar-base-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "dependsOnUserAgent",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-base-color",
		},
		"-ms-scrollbar-darkshadow-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "ThreeDDarkShadow",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-darkshadow-color",
		},
		"-ms-scrollbar-face-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "ThreeDFace",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-face-color",
		},
		"-ms-scrollbar-highlight-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "ThreeDHighlight",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-highlight-color",
		},
		"-ms-scrollbar-shadow-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "ThreeDDarkShadow",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-shadow-color",
		},
		"-ms-scrollbar-track-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "Scrollbar",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scrollbar-track-color",
		},
		"-ms-scroll-chaining": {
			syntax: "chained | none",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "chained",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-chaining",
		},
		"-ms-scroll-limit": {
			syntax:
				"<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: ["-ms-scroll-limit-x-min", "-ms-scroll-limit-y-min", "-ms-scroll-limit-x-max", "-ms-scroll-limit-y-max"],
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: [
				"-ms-scroll-limit-x-min",
				"-ms-scroll-limit-y-min",
				"-ms-scroll-limit-x-max",
				"-ms-scroll-limit-y-max",
			],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-limit",
		},
		"-ms-scroll-limit-x-max": {
			syntax: "auto | <length>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-limit-x-max",
		},
		"-ms-scroll-limit-x-min": {
			syntax: "<length>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "0",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-limit-x-min",
		},
		"-ms-scroll-limit-y-max": {
			syntax: "auto | <length>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-limit-y-max",
		},
		"-ms-scroll-limit-y-min": {
			syntax: "<length>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "0",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-limit-y-min",
		},
		"-ms-scroll-rails": {
			syntax: "none | railed",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "railed",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-rails",
		},
		"-ms-scroll-snap-points-x": {
			syntax: "snapInterval( <length-percentage>, <length-percentage> ) | snapList( <length-percentage># )",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "snapInterval(0px, 100%)",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-snap-points-x",
		},
		"-ms-scroll-snap-points-y": {
			syntax: "snapInterval( <length-percentage>, <length-percentage> ) | snapList( <length-percentage># )",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "snapInterval(0px, 100%)",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-snap-points-y",
		},
		"-ms-scroll-snap-type": {
			syntax: "none | proximity | mandatory",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-snap-type",
		},
		"-ms-scroll-snap-x": {
			syntax: "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: ["-ms-scroll-snap-type", "-ms-scroll-snap-points-x"],
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: ["-ms-scroll-snap-type", "-ms-scroll-snap-points-x"],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-snap-x",
		},
		"-ms-scroll-snap-y": {
			syntax: "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: ["-ms-scroll-snap-type", "-ms-scroll-snap-points-y"],
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: ["-ms-scroll-snap-type", "-ms-scroll-snap-points-y"],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-snap-y",
		},
		"-ms-scroll-translation": {
			syntax: "none | vertical-to-horizontal",
			media: "interactive",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-scroll-translation",
		},
		"-ms-text-autospace": {
			syntax: "none | ideograph-alpha | ideograph-numeric | ideograph-parenthesis | ideograph-space",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-text-autospace",
		},
		"-ms-touch-select": {
			syntax: "grippers | none",
			media: "interactive",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "grippers",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-touch-select",
		},
		"-ms-user-select": {
			syntax: "none | element | text",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "text",
			appliesto: "nonReplacedElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-user-select",
		},
		"-ms-wrap-flow": {
			syntax: "auto | both | start | end | maximum | clear",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "auto",
			appliesto: "blockLevelElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-wrap-flow",
		},
		"-ms-wrap-margin": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "0",
			appliesto: "exclusionElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-wrap-margin",
		},
		"-ms-wrap-through": {
			syntax: "wrap | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Microsoft Extensions"],
			initial: "wrap",
			appliesto: "blockLevelElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-ms-wrap-through",
		},
		"-moz-appearance": {
			syntax:
				"none | button | button-arrow-down | button-arrow-next | button-arrow-previous | button-arrow-up | button-bevel | button-focus | caret | checkbox | checkbox-container | checkbox-label | checkmenuitem | dualbutton | groupbox | listbox | listitem | menuarrow | menubar | menucheckbox | menuimage | menuitem | menuitemtext | menulist | menulist-button | menulist-text | menulist-textfield | menupopup | menuradio | menuseparator | meterbar | meterchunk | progressbar | progressbar-vertical | progresschunk | progresschunk-vertical | radio | radio-container | radio-label | radiomenuitem | range | range-thumb | resizer | resizerpanel | scale-horizontal | scalethumbend | scalethumb-horizontal | scalethumbstart | scalethumbtick | scalethumb-vertical | scale-vertical | scrollbarbutton-down | scrollbarbutton-left | scrollbarbutton-right | scrollbarbutton-up | scrollbarthumb-horizontal | scrollbarthumb-vertical | scrollbartrack-horizontal | scrollbartrack-vertical | searchfield | separator | sheet | spinner | spinner-downbutton | spinner-textfield | spinner-upbutton | splitter | statusbar | statusbarpanel | tab | tabpanel | tabpanels | tab-scroll-arrow-back | tab-scroll-arrow-forward | textfield | textfield-multiline | toolbar | toolbarbutton | toolbarbutton-dropdown | toolbargripper | toolbox | tooltip | treeheader | treeheadercell | treeheadersortarrow | treeitem | treeline | treetwisty | treetwistyopen | treeview | -moz-mac-unified-toolbar | -moz-win-borderless-glass | -moz-win-browsertabbar-toolbox | -moz-win-communicationstext | -moz-win-communications-toolbox | -moz-win-exclude-glass | -moz-win-glass | -moz-win-mediatext | -moz-win-media-toolbox | -moz-window-button-box | -moz-window-button-box-maximized | -moz-window-button-close | -moz-window-button-maximize | -moz-window-button-minimize | -moz-window-button-restore | -moz-window-frame-bottom | -moz-window-frame-left | -moz-window-frame-right | -moz-window-titlebar | -moz-window-titlebar-maximized",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "noneButOverriddenInUserAgentCSS",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/appearance",
		},
		"-moz-binding": {
			syntax: "<url> | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElementsExceptGeneratedContentOrPseudoElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-binding",
		},
		"-moz-border-bottom-colors": {
			syntax: "<color>+ | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-border-bottom-colors",
		},
		"-moz-border-left-colors": {
			syntax: "<color>+ | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-border-left-colors",
		},
		"-moz-border-right-colors": {
			syntax: "<color>+ | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-border-right-colors",
		},
		"-moz-border-top-colors": {
			syntax: "<color>+ | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-border-top-colors",
		},
		"-moz-context-properties": {
			syntax: "none | [ fill | fill-opacity | stroke | stroke-opacity ]#",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElementsThatCanReferenceImages",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-context-properties",
		},
		"-moz-float-edge": {
			syntax: "border-box | content-box | margin-box | padding-box",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "content-box",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-float-edge",
		},
		"-moz-force-broken-image-icon": {
			syntax: "<integer [0,1]>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "0",
			appliesto: "images",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-force-broken-image-icon",
		},
		"-moz-image-region": {
			syntax: "<shape> | auto",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "auto",
			appliesto: "xulImageElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-image-region",
		},
		"-moz-orient": {
			syntax: "inline | block | horizontal | vertical",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "inline",
			appliesto: "anyElementEffectOnProgressAndMeter",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-orient",
		},
		"-moz-outline-radius": {
			syntax: "<outline-radius>{1,4} [ / <outline-radius>{1,4} ]?",
			media: "visual",
			inherited: false,
			animationType: [
				"-moz-outline-radius-topleft",
				"-moz-outline-radius-topright",
				"-moz-outline-radius-bottomright",
				"-moz-outline-radius-bottomleft",
			],
			percentages: [
				"-moz-outline-radius-topleft",
				"-moz-outline-radius-topright",
				"-moz-outline-radius-bottomright",
				"-moz-outline-radius-bottomleft",
			],
			groups: ["Mozilla Extensions"],
			initial: [
				"-moz-outline-radius-topleft",
				"-moz-outline-radius-topright",
				"-moz-outline-radius-bottomright",
				"-moz-outline-radius-bottomleft",
			],
			appliesto: "allElements",
			computed: [
				"-moz-outline-radius-topleft",
				"-moz-outline-radius-topright",
				"-moz-outline-radius-bottomright",
				"-moz-outline-radius-bottomleft",
			],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-outline-radius",
		},
		"-moz-outline-radius-bottomleft": {
			syntax: "<outline-radius>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["Mozilla Extensions"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-outline-radius-bottomleft",
		},
		"-moz-outline-radius-bottomright": {
			syntax: "<outline-radius>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["Mozilla Extensions"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-outline-radius-bottomright",
		},
		"-moz-outline-radius-topleft": {
			syntax: "<outline-radius>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["Mozilla Extensions"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-outline-radius-topleft",
		},
		"-moz-outline-radius-topright": {
			syntax: "<outline-radius>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["Mozilla Extensions"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-outline-radius-topright",
		},
		"-moz-stack-sizing": {
			syntax: "ignore | stretch-to-fit",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "stretch-to-fit",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-stack-sizing",
		},
		"-moz-text-blink": {
			syntax: "none | blink",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-text-blink",
		},
		"-moz-user-focus": {
			syntax: "ignore | normal | select-after | select-before | select-menu | select-same | select-all | none",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-user-focus",
		},
		"-moz-user-input": {
			syntax: "auto | none | enabled | disabled",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-user-input",
		},
		"-moz-user-modify": {
			syntax: "read-only | read-write | write-only",
			media: "interactive",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "read-only",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-user-modify",
		},
		"-moz-window-dragging": {
			syntax: "drag | no-drag",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "drag",
			appliesto: "allElementsCreatingNativeWindows",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-window-dragging",
		},
		"-moz-window-shadow": {
			syntax: "default | menu | tooltip | sheet | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "default",
			appliesto: "allElementsCreatingNativeWindows",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-moz-window-shadow",
		},
		"-webkit-appearance": {
			syntax:
				"none | button | button-bevel | caret | checkbox | default-button | inner-spin-button | listbox | listitem | media-controls-background | media-controls-fullscreen-background | media-current-time-display | media-enter-fullscreen-button | media-exit-fullscreen-button | media-fullscreen-button | media-mute-button | media-overlay-play-button | media-play-button | media-seek-back-button | media-seek-forward-button | media-slider | media-sliderthumb | media-time-remaining-display | media-toggle-closed-captions-button | media-volume-slider | media-volume-slider-container | media-volume-sliderthumb | menulist | menulist-button | menulist-text | menulist-textfield | meter | progress-bar | progress-bar-value | push-button | radio | searchfield | searchfield-cancel-button | searchfield-decoration | searchfield-results-button | searchfield-results-decoration | slider-horizontal | slider-vertical | sliderthumb-horizontal | sliderthumb-vertical | square-button | textarea | textfield | -apple-pay-button",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "noneButOverriddenInUserAgentCSS",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/appearance",
		},
		"-webkit-border-before": {
			syntax: "<'border-width'> || <'border-style'> || <'color'>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: ["-webkit-border-before-width"],
			groups: ["WebKit Extensions"],
			initial: ["border-width", "border-style", "color"],
			appliesto: "allElements",
			computed: ["border-width", "border-style", "color"],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-border-before",
		},
		"-webkit-border-before-color": {
			syntax: "<'color'>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "nonstandard",
		},
		"-webkit-border-before-style": {
			syntax: "<'border-style'>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
		},
		"-webkit-border-before-width": {
			syntax: "<'border-width'>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["WebKit Extensions"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "nonstandard",
		},
		"-webkit-box-reflect": {
			syntax: "[ above | below | right | left ]? <length>? <image>?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-box-reflect",
		},
		"-webkit-line-clamp": {
			syntax: "none | <integer>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["WebKit Extensions", "CSS Overflow"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-line-clamp",
		},
		"-webkit-mask": {
			syntax:
				"[ <mask-reference> || <position> [ / <bg-size> ]? || <repeat-style> || [ <box> | border | padding | content | text ] || [ <box> | border | padding | content ] ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: [
				"-webkit-mask-image",
				"-webkit-mask-repeat",
				"-webkit-mask-attachment",
				"-webkit-mask-position",
				"-webkit-mask-origin",
				"-webkit-mask-clip",
			],
			appliesto: "allElements",
			computed: [
				"-webkit-mask-image",
				"-webkit-mask-repeat",
				"-webkit-mask-attachment",
				"-webkit-mask-position",
				"-webkit-mask-origin",
				"-webkit-mask-clip",
			],
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask",
		},
		"-webkit-mask-attachment": {
			syntax: "<attachment>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "scroll",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-attachment",
		},
		"-webkit-mask-clip": {
			syntax: "[ <box> | border | padding | content | text ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "border",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-clip",
		},
		"-webkit-mask-composite": {
			syntax: "<composite-style>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "source-over",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-composite",
		},
		"-webkit-mask-image": {
			syntax: "<mask-reference>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "none",
			appliesto: "allElements",
			computed: "absoluteURIOrNone",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-image",
		},
		"-webkit-mask-origin": {
			syntax: "[ <box> | border | padding | content ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "padding",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-origin",
		},
		"-webkit-mask-position": {
			syntax: "<position>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToSizeOfElement",
			groups: ["WebKit Extensions"],
			initial: "0% 0%",
			appliesto: "allElements",
			computed: "absoluteLengthOrPercentage",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-position",
		},
		"-webkit-mask-position-x": {
			syntax: "[ <length-percentage> | left | center | right ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToSizeOfElement",
			groups: ["WebKit Extensions"],
			initial: "0%",
			appliesto: "allElements",
			computed: "absoluteLengthOrPercentage",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-position-x",
		},
		"-webkit-mask-position-y": {
			syntax: "[ <length-percentage> | top | center | bottom ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToSizeOfElement",
			groups: ["WebKit Extensions"],
			initial: "0%",
			appliesto: "allElements",
			computed: "absoluteLengthOrPercentage",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-position-y",
		},
		"-webkit-mask-repeat": {
			syntax: "<repeat-style>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "repeat",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-repeat",
		},
		"-webkit-mask-repeat-x": {
			syntax: "repeat | no-repeat | space | round",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "repeat",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-repeat-x",
		},
		"-webkit-mask-repeat-y": {
			syntax: "repeat | no-repeat | space | round",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "repeat",
			appliesto: "allElements",
			computed: "absoluteLengthOrPercentage",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-mask-repeat-y",
		},
		"-webkit-mask-size": {
			syntax: "<bg-size>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "relativeToBackgroundPositioningArea",
			groups: ["WebKit Extensions"],
			initial: "auto auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-size",
		},
		"-webkit-overflow-scrolling": {
			syntax: "auto | touch",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "auto",
			appliesto: "scrollingBoxes",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-overflow-scrolling",
		},
		"-webkit-tap-highlight-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "black",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-tap-highlight-color",
		},
		"-webkit-text-fill-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "color",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-text-fill-color",
		},
		"-webkit-text-stroke": {
			syntax: "<length> || <color>",
			media: "visual",
			inherited: true,
			animationType: ["-webkit-text-stroke-width", "-webkit-text-stroke-color"],
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: ["-webkit-text-stroke-width", "-webkit-text-stroke-color"],
			appliesto: "allElements",
			computed: ["-webkit-text-stroke-width", "-webkit-text-stroke-color"],
			order: "canonicalOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-text-stroke",
		},
		"-webkit-text-stroke-color": {
			syntax: "<color>",
			media: "visual",
			inherited: true,
			animationType: "color",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-text-stroke-color",
		},
		"-webkit-text-stroke-width": {
			syntax: "<length>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "0",
			appliesto: "allElements",
			computed: "absoluteLength",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-text-stroke-width",
		},
		"-webkit-touch-callout": {
			syntax: "default | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "default",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/-webkit-touch-callout",
		},
		"-webkit-user-modify": {
			syntax: "read-only | read-write | read-write-plaintext-only",
			media: "interactive",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["WebKit Extensions"],
			initial: "read-only",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
		},
		"align-content": {
			syntax: "normal | <baseline-position> | <content-distribution> | <overflow-position>? <content-position>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "multilineFlexContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/align-content",
		},
		"align-items": {
			syntax: "normal | stretch | <baseline-position> | [ <overflow-position>? <self-position> ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/align-items",
		},
		"align-self": {
			syntax: "auto | normal | stretch | <baseline-position> | <overflow-position>? <self-position>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "auto",
			appliesto: "flexItemsGridItemsAndAbsolutelyPositionedBoxes",
			computed: "autoOnAbsolutelyPositionedElementsValueOfAlignItemsOnParent",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/align-self",
		},
		"align-tracks": {
			syntax: "[ normal | <baseline-position> | <content-distribution> | <overflow-position>? <content-position> ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "normal",
			appliesto: "gridContainersWithMasonryLayoutInTheirBlockAxis",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/align-tracks",
		},
		all: all,
		animation: animation,
		"animation-delay": {
			syntax: "<time>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "0s",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-delay",
		},
		"animation-direction": {
			syntax: "<single-animation-direction>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "normal",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-direction",
		},
		"animation-duration": {
			syntax: "<time>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "0s",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-duration",
		},
		"animation-fill-mode": {
			syntax: "<single-animation-fill-mode>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "none",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-fill-mode",
		},
		"animation-iteration-count": {
			syntax: "<single-animation-iteration-count>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "1",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-iteration-count",
		},
		"animation-name": {
			syntax: "[ none | <keyframes-name> ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "none",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-name",
		},
		"animation-play-state": {
			syntax: "<single-animation-play-state>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "running",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-play-state",
		},
		"animation-timing-function": {
			syntax: "<timing-function>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Animations"],
			initial: "ease",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/animation-timing-function",
		},
		appearance: appearance,
		"aspect-ratio": {
			syntax: "auto | <ratio>",
			media: "all",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "auto",
			appliesto: "allElementsExceptInlineBoxesAndInternalRubyOrTableBoxes",
			computed: "asSpecified",
			order: "perGrammar",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/aspect-ratio",
		},
		azimuth: azimuth,
		"backdrop-filter": {
			syntax: "none | <filter-function-list>",
			media: "visual",
			inherited: false,
			animationType: "filterList",
			percentages: "no",
			groups: ["Filter Effects"],
			initial: "none",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/backdrop-filter",
		},
		"backface-visibility": {
			syntax: "visible | hidden",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transforms"],
			initial: "visible",
			appliesto: "transformableElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/backface-visibility",
		},
		background: background,
		"background-attachment": {
			syntax: "<attachment>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "scroll",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-attachment",
		},
		"background-blend-mode": {
			syntax: "<blend-mode>#",
			media: "none",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Compositing and Blending"],
			initial: "normal",
			appliesto: "allElementsSVGContainerGraphicsAndGraphicsReferencingElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-blend-mode",
		},
		"background-clip": {
			syntax: "<box>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "border-box",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-clip",
		},
		"background-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "transparent",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-color",
		},
		"background-image": {
			syntax: "<bg-image>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecifiedURLsAbsolute",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-image",
		},
		"background-origin": {
			syntax: "<box>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "padding-box",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-origin",
		},
		"background-position": {
			syntax: "<bg-position>#",
			media: "visual",
			inherited: false,
			animationType: "repeatableListOfSimpleListOfLpc",
			percentages: "referToSizeOfBackgroundPositioningAreaMinusBackgroundImageSize",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0% 0%",
			appliesto: "allElements",
			computed: "listEachItemTwoKeywordsOriginOffsets",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-position",
		},
		"background-position-x": {
			syntax: "[ center | [ [ left | right | x-start | x-end ]? <length-percentage>? ]! ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToWidthOfBackgroundPositioningAreaMinusBackgroundImageHeight",
			groups: ["CSS Backgrounds and Borders"],
			initial: "left",
			appliesto: "allElements",
			computed: "listEachItemConsistingOfAbsoluteLengthPercentageAndOrigin",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-position-x",
		},
		"background-position-y": {
			syntax: "[ center | [ [ top | bottom | y-start | y-end ]? <length-percentage>? ]! ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToHeightOfBackgroundPositioningAreaMinusBackgroundImageHeight",
			groups: ["CSS Backgrounds and Borders"],
			initial: "top",
			appliesto: "allElements",
			computed: "listEachItemConsistingOfAbsoluteLengthPercentageAndOrigin",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-position-y",
		},
		"background-repeat": {
			syntax: "<repeat-style>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "repeat",
			appliesto: "allElements",
			computed: "listEachItemHasTwoKeywordsOnePerDimension",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-repeat",
		},
		"background-size": {
			syntax: "<bg-size>#",
			media: "visual",
			inherited: false,
			animationType: "repeatableListOfSimpleListOfLpc",
			percentages: "relativeToBackgroundPositioningArea",
			groups: ["CSS Backgrounds and Borders"],
			initial: "auto auto",
			appliesto: "allElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/background-size",
		},
		"block-overflow": {
			syntax: "clip | ellipsis | <string>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "clip",
			appliesto: "blockContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "experimental",
		},
		"block-size": {
			syntax: "<'width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "blockSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsWidthAndHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/block-size",
		},
		border: border,
		"border-block": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-top-width", "border-top-style", "border-top-color"],
			appliesto: "allElements",
			computed: ["border-top-width", "border-top-style", "border-top-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block",
		},
		"border-block-color": {
			syntax: "<'border-top-color'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-color",
		},
		"border-block-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-style",
		},
		"border-block-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-width",
		},
		"border-block-end": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: ["border-block-end-color", "border-block-end-style", "border-block-end-width"],
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-top-width", "border-top-style", "border-top-color"],
			appliesto: "allElements",
			computed: ["border-top-width", "border-top-style", "border-top-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-end",
		},
		"border-block-end-color": {
			syntax: "<'border-top-color'>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-end-color",
		},
		"border-block-end-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-end-style",
		},
		"border-block-end-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-end-width",
		},
		"border-block-start": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: ["border-block-start-color", "border-block-start-style", "border-block-start-width"],
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-width", "border-style", "color"],
			appliesto: "allElements",
			computed: ["border-width", "border-style", "border-block-start-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-start",
		},
		"border-block-start-color": {
			syntax: "<'border-top-color'>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-start-color",
		},
		"border-block-start-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-start-style",
		},
		"border-block-start-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-block-start-width",
		},
		"border-bottom": {
			syntax: "<line-width> || <line-style> || <color>",
			media: "visual",
			inherited: false,
			animationType: ["border-bottom-color", "border-bottom-style", "border-bottom-width"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-bottom-width", "border-bottom-style", "border-bottom-color"],
			appliesto: "allElements",
			computed: ["border-bottom-width", "border-bottom-style", "border-bottom-color"],
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom",
		},
		"border-bottom-color": {
			syntax: "<'border-top-color'>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom-color",
		},
		"border-bottom-left-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom-left-radius",
		},
		"border-bottom-right-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom-right-radius",
		},
		"border-bottom-style": {
			syntax: "<line-style>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom-style",
		},
		"border-bottom-width": {
			syntax: "<line-width>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthOr0IfBorderBottomStyleNoneOrHidden",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-bottom-width",
		},
		"border-collapse": {
			syntax: "collapse | separate",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Table"],
			initial: "separate",
			appliesto: "tableElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-collapse",
		},
		"border-color": {
			syntax: "<color>{1,4}",
			media: "visual",
			inherited: false,
			animationType: ["border-bottom-color", "border-left-color", "border-right-color", "border-top-color"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"],
			appliesto: "allElements",
			computed: ["border-bottom-color", "border-left-color", "border-right-color", "border-top-color"],
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-color",
		},
		"border-end-end-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-end-end-radius",
		},
		"border-end-start-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-end-start-radius",
		},
		"border-image": {
			syntax:
				"<'border-image-source'> || <'border-image-slice'> [ / <'border-image-width'> | / <'border-image-width'>? / <'border-image-outset'> ]? || <'border-image-repeat'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: ["border-image-slice", "border-image-width"],
			groups: ["CSS Backgrounds and Borders"],
			initial: [
				"border-image-source",
				"border-image-slice",
				"border-image-width",
				"border-image-outset",
				"border-image-repeat",
			],
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: [
				"border-image-outset",
				"border-image-repeat",
				"border-image-slice",
				"border-image-source",
				"border-image-width",
			],
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image",
		},
		"border-image-outset": {
			syntax: "[ <length> | <number> ]{1,4}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0",
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image-outset",
		},
		"border-image-repeat": {
			syntax: "[ stretch | repeat | round | space ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "stretch",
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image-repeat",
		},
		"border-image-slice": {
			syntax: "<number-percentage>{1,4} && fill?",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "referToSizeOfBorderImage",
			groups: ["CSS Backgrounds and Borders"],
			initial: "100%",
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: "oneToFourPercentagesOrAbsoluteLengthsPlusFill",
			order: "percentagesOrLengthsFollowedByFill",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image-slice",
		},
		"border-image-source": {
			syntax: "none | <image>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: "noneOrImageWithAbsoluteURI",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image-source",
		},
		"border-image-width": {
			syntax: "[ <length-percentage> | <number> | auto ]{1,4}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "referToWidthOrHeightOfBorderImageArea",
			groups: ["CSS Backgrounds and Borders"],
			initial: "1",
			appliesto: "allElementsExceptTableElementsWhenCollapse",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-image-width",
		},
		"border-inline": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-top-width", "border-top-style", "border-top-color"],
			appliesto: "allElements",
			computed: ["border-top-width", "border-top-style", "border-top-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline",
		},
		"border-inline-end": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: ["border-inline-end-color", "border-inline-end-style", "border-inline-end-width"],
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-width", "border-style", "color"],
			appliesto: "allElements",
			computed: ["border-width", "border-style", "border-inline-end-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-end",
		},
		"border-inline-color": {
			syntax: "<'border-top-color'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-color",
		},
		"border-inline-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-style",
		},
		"border-inline-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-width",
		},
		"border-inline-end-color": {
			syntax: "<'border-top-color'>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-end-color",
		},
		"border-inline-end-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-end-style",
		},
		"border-inline-end-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-end-width",
		},
		"border-inline-start": {
			syntax: "<'border-top-width'> || <'border-top-style'> || <'color'>",
			media: "visual",
			inherited: false,
			animationType: ["border-inline-start-color", "border-inline-start-style", "border-inline-start-width"],
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: ["border-width", "border-style", "color"],
			appliesto: "allElements",
			computed: ["border-width", "border-style", "border-inline-start-color"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-start",
		},
		"border-inline-start-color": {
			syntax: "<'border-top-color'>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-start-color",
		},
		"border-inline-start-style": {
			syntax: "<'border-top-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Logical Properties"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-start-style",
		},
		"border-inline-start-width": {
			syntax: "<'border-top-width'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-inline-start-width",
		},
		"border-left": {
			syntax: "<line-width> || <line-style> || <color>",
			media: "visual",
			inherited: false,
			animationType: ["border-left-color", "border-left-style", "border-left-width"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-left-width", "border-left-style", "border-left-color"],
			appliesto: "allElements",
			computed: ["border-left-width", "border-left-style", "border-left-color"],
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-left",
		},
		"border-left-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-left-color",
		},
		"border-left-style": {
			syntax: "<line-style>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-left-style",
		},
		"border-left-width": {
			syntax: "<line-width>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthOr0IfBorderLeftStyleNoneOrHidden",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-left-width",
		},
		"border-radius": {
			syntax: "<length-percentage>{1,4} [ / <length-percentage>{1,4} ]?",
			media: "visual",
			inherited: false,
			animationType: [
				"border-top-left-radius",
				"border-top-right-radius",
				"border-bottom-right-radius",
				"border-bottom-left-radius",
			],
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Backgrounds and Borders"],
			initial: [
				"border-top-left-radius",
				"border-top-right-radius",
				"border-bottom-right-radius",
				"border-bottom-left-radius",
			],
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: [
				"border-bottom-left-radius",
				"border-bottom-right-radius",
				"border-top-left-radius",
				"border-top-right-radius",
			],
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-radius",
		},
		"border-right": {
			syntax: "<line-width> || <line-style> || <color>",
			media: "visual",
			inherited: false,
			animationType: ["border-right-color", "border-right-style", "border-right-width"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-right-width", "border-right-style", "border-right-color"],
			appliesto: "allElements",
			computed: ["border-right-width", "border-right-style", "border-right-color"],
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-right",
		},
		"border-right-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-right-color",
		},
		"border-right-style": {
			syntax: "<line-style>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-right-style",
		},
		"border-right-width": {
			syntax: "<line-width>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthOr0IfBorderRightStyleNoneOrHidden",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-right-width",
		},
		"border-spacing": {
			syntax: "<length> <length>?",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Table"],
			initial: "0",
			appliesto: "tableElements",
			computed: "twoAbsoluteLengths",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-spacing",
		},
		"border-start-end-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-start-end-radius",
		},
		"border-start-start-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-start-start-radius",
		},
		"border-style": {
			syntax: "<line-style>{1,4}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-top-style", "border-right-style", "border-bottom-style", "border-left-style"],
			appliesto: "allElements",
			computed: ["border-bottom-style", "border-left-style", "border-right-style", "border-top-style"],
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-style",
		},
		"border-top": {
			syntax: "<line-width> || <line-style> || <color>",
			media: "visual",
			inherited: false,
			animationType: ["border-top-color", "border-top-style", "border-top-width"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-top-width", "border-top-style", "border-top-color"],
			appliesto: "allElements",
			computed: ["border-top-width", "border-top-style", "border-top-color"],
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top",
		},
		"border-top-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top-color",
		},
		"border-top-left-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top-left-radius",
		},
		"border-top-right-radius": {
			syntax: "<length-percentage>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfBorderBox",
			groups: ["CSS Backgrounds and Borders"],
			initial: "0",
			appliesto: "allElementsUAsNotRequiredWhenCollapse",
			computed: "twoAbsoluteLengthOrPercentages",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top-right-radius",
		},
		"border-top-style": {
			syntax: "<line-style>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top-style",
		},
		"border-top-width": {
			syntax: "<line-width>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLengthOr0IfBorderTopStyleNoneOrHidden",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-top-width",
		},
		"border-width": {
			syntax: "<line-width>{1,4}",
			media: "visual",
			inherited: false,
			animationType: ["border-bottom-width", "border-left-width", "border-right-width", "border-top-width"],
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"],
			appliesto: "allElements",
			computed: ["border-bottom-width", "border-left-width", "border-right-width", "border-top-width"],
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/border-width",
		},
		bottom: bottom,
		"box-align": {
			syntax: "start | center | end | baseline | stretch",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "stretch",
			appliesto: "elementsWithDisplayBoxOrInlineBox",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-align",
		},
		"box-decoration-break": {
			syntax: "slice | clone",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fragmentation"],
			initial: "slice",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-decoration-break",
		},
		"box-direction": {
			syntax: "normal | reverse | inherit",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "normal",
			appliesto: "elementsWithDisplayBoxOrInlineBox",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-direction",
		},
		"box-flex": {
			syntax: "<number>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "0",
			appliesto: "directChildrenOfElementsWithDisplayMozBoxMozInlineBox",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-flex",
		},
		"box-flex-group": {
			syntax: "<integer>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "1",
			appliesto: "inFlowChildrenOfBoxElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-flex-group",
		},
		"box-lines": {
			syntax: "single | multiple",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "single",
			appliesto: "boxElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-lines",
		},
		"box-ordinal-group": {
			syntax: "<integer>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "1",
			appliesto: "childrenOfBoxElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-ordinal-group",
		},
		"box-orient": {
			syntax: "horizontal | vertical | inline-axis | block-axis | inherit",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "inlineAxisHorizontalInXUL",
			appliesto: "elementsWithDisplayBoxOrInlineBox",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-orient",
		},
		"box-pack": {
			syntax: "start | center | end | justify",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions", "WebKit Extensions"],
			initial: "start",
			appliesto: "elementsWithDisplayMozBoxMozInlineBox",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-pack",
		},
		"box-shadow": {
			syntax: "none | <shadow>#",
			media: "visual",
			inherited: false,
			animationType: "shadowList",
			percentages: "no",
			groups: ["CSS Backgrounds and Borders"],
			initial: "none",
			appliesto: "allElements",
			computed: "absoluteLengthsSpecifiedColorAsSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-shadow",
		},
		"box-sizing": {
			syntax: "content-box | border-box",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "content-box",
			appliesto: "allElementsAcceptingWidthOrHeight",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/box-sizing",
		},
		"break-after": {
			syntax:
				"auto | avoid | always | all | avoid-page | page | left | right | recto | verso | avoid-column | column | avoid-region | region",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fragmentation"],
			initial: "auto",
			appliesto: "blockLevelElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/break-after",
		},
		"break-before": {
			syntax:
				"auto | avoid | always | all | avoid-page | page | left | right | recto | verso | avoid-column | column | avoid-region | region",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fragmentation"],
			initial: "auto",
			appliesto: "blockLevelElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/break-before",
		},
		"break-inside": {
			syntax: "auto | avoid | avoid-page | avoid-column | avoid-region",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fragmentation"],
			initial: "auto",
			appliesto: "blockLevelElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/break-inside",
		},
		"caption-side": {
			syntax: "top | bottom | block-start | block-end | inline-start | inline-end",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Table"],
			initial: "top",
			appliesto: "tableCaptionElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/caption-side",
		},
		"caret-color": {
			syntax: "auto | <color>",
			media: "interactive",
			inherited: true,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asAutoOrColor",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/caret-color",
		},
		clear: clear,
		clip: clip,
		"clip-path": {
			syntax: "<clip-source> | [ <basic-shape> || <geometry-box> ] | none",
			media: "visual",
			inherited: false,
			animationType: "basicShapeOtherwiseNo",
			percentages: "referToReferenceBoxWhenSpecifiedOtherwiseBorderBox",
			groups: ["CSS Masking"],
			initial: "none",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedURLsAbsolute",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/clip-path",
		},
		color: color$1,
		"color-adjust": {
			syntax: "economy | exact",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Color"],
			initial: "economy",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/color-adjust",
		},
		"column-count": {
			syntax: "<integer> | auto",
			media: "visual",
			inherited: false,
			animationType: "integer",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "auto",
			appliesto: "blockContainersExceptTableWrappers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-count",
		},
		"column-fill": {
			syntax: "auto | balance | balance-all",
			media: "visualInContinuousMediaNoEffectInOverflowColumns",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "balance",
			appliesto: "multicolElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-fill",
		},
		"column-gap": {
			syntax: "normal | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "multiColumnElementsFlexContainersGridContainers",
			computed: "asSpecifiedWithLengthsAbsoluteAndNormalComputingToZeroExceptMultiColumn",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-gap",
		},
		"column-rule": {
			syntax: "<'column-rule-width'> || <'column-rule-style'> || <'column-rule-color'>",
			media: "visual",
			inherited: false,
			animationType: ["column-rule-color", "column-rule-style", "column-rule-width"],
			percentages: "no",
			groups: ["CSS Columns"],
			initial: ["column-rule-width", "column-rule-style", "column-rule-color"],
			appliesto: "multicolElements",
			computed: ["column-rule-color", "column-rule-style", "column-rule-width"],
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-rule",
		},
		"column-rule-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "currentcolor",
			appliesto: "multicolElements",
			computed: "computedColor",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-rule-color",
		},
		"column-rule-style": {
			syntax: "<'border-style'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "none",
			appliesto: "multicolElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-rule-style",
		},
		"column-rule-width": {
			syntax: "<'border-width'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "medium",
			appliesto: "multicolElements",
			computed: "absoluteLength0IfColumnRuleStyleNoneOrHidden",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-rule-width",
		},
		"column-span": {
			syntax: "none | all",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "none",
			appliesto: "inFlowBlockLevelElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-span",
		},
		"column-width": {
			syntax: "<length> | auto",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Columns"],
			initial: "auto",
			appliesto: "blockContainersExceptTableWrappers",
			computed: "absoluteLengthZeroOrLarger",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-width",
		},
		columns: columns,
		contain: contain,
		content: content,
		"counter-increment": {
			syntax: "[ <custom-ident> <integer>? ]+ | none",
			media: "all",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Counter Styles"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/counter-increment",
		},
		"counter-reset": {
			syntax: "[ <custom-ident> <integer>? ]+ | none",
			media: "all",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Counter Styles"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/counter-reset",
		},
		"counter-set": {
			syntax: "[ <custom-ident> <integer>? ]+ | none",
			media: "all",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Counter Styles"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/counter-set",
		},
		cursor: cursor,
		direction: direction,
		display: display,
		"empty-cells": {
			syntax: "show | hide",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Table"],
			initial: "show",
			appliesto: "tableCellElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/empty-cells",
		},
		filter: filter,
		flex: flex,
		"flex-basis": {
			syntax: "content | <'width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToFlexContainersInnerMainSize",
			groups: ["CSS Flexible Box Layout"],
			initial: "auto",
			appliesto: "flexItemsAndInFlowPseudos",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "lengthOrPercentageBeforeKeywordIfBothPresent",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-basis",
		},
		"flex-direction": {
			syntax: "row | row-reverse | column | column-reverse",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Flexible Box Layout"],
			initial: "row",
			appliesto: "flexContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-direction",
		},
		"flex-flow": {
			syntax: "<'flex-direction'> || <'flex-wrap'>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Flexible Box Layout"],
			initial: ["flex-direction", "flex-wrap"],
			appliesto: "flexContainers",
			computed: ["flex-direction", "flex-wrap"],
			order: "orderOfAppearance",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-flow",
		},
		"flex-grow": {
			syntax: "<number>",
			media: "visual",
			inherited: false,
			animationType: "number",
			percentages: "no",
			groups: ["CSS Flexible Box Layout"],
			initial: "0",
			appliesto: "flexItemsAndInFlowPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-grow",
		},
		"flex-shrink": {
			syntax: "<number>",
			media: "visual",
			inherited: false,
			animationType: "number",
			percentages: "no",
			groups: ["CSS Flexible Box Layout"],
			initial: "1",
			appliesto: "flexItemsAndInFlowPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-shrink",
		},
		"flex-wrap": {
			syntax: "nowrap | wrap | wrap-reverse",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Flexible Box Layout"],
			initial: "nowrap",
			appliesto: "flexContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/flex-wrap",
		},
		float: float,
		font: font,
		"font-family": {
			syntax: "[ <family-name> | <generic-family> ]#",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "dependsOnUserAgent",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-family",
		},
		"font-feature-settings": {
			syntax: "normal | <feature-tag-value>#",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-feature-settings",
		},
		"font-kerning": {
			syntax: "auto | normal | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-kerning",
		},
		"font-language-override": {
			syntax: "normal | <string>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-language-override",
		},
		"font-optical-sizing": {
			syntax: "auto | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-optical-sizing",
		},
		"font-variation-settings": {
			syntax: "normal | [ <string> <number> ]#",
			media: "visual",
			inherited: true,
			animationType: "transform",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variation-settings",
		},
		"font-size": {
			syntax: "<absolute-size> | <relative-size> | <length-percentage>",
			media: "visual",
			inherited: true,
			animationType: "length",
			percentages: "referToParentElementsFontSize",
			groups: ["CSS Fonts"],
			initial: "medium",
			appliesto: "allElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-size",
		},
		"font-size-adjust": {
			syntax: "none | <number>",
			media: "visual",
			inherited: true,
			animationType: "number",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-size-adjust",
		},
		"font-smooth": {
			syntax: "auto | never | always | <absolute-size> | <length>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-smooth",
		},
		"font-stretch": {
			syntax: "<font-stretch-absolute>",
			media: "visual",
			inherited: true,
			animationType: "fontStretch",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-stretch",
		},
		"font-style": {
			syntax: "normal | italic | oblique <angle>?",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-style",
		},
		"font-synthesis": {
			syntax: "none | [ weight || style ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "weight style",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-synthesis",
		},
		"font-variant": {
			syntax:
				"normal | none | [ <common-lig-values> || <discretionary-lig-values> || <historical-lig-values> || <contextual-alt-values> || stylistic( <feature-value-name> ) || historical-forms || styleset( <feature-value-name># ) || character-variant( <feature-value-name># ) || swash( <feature-value-name> ) || ornaments( <feature-value-name> ) || annotation( <feature-value-name> ) || [ small-caps | all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps ] || <numeric-figure-values> || <numeric-spacing-values> || <numeric-fraction-values> || ordinal || slashed-zero || <east-asian-variant-values> || <east-asian-width-values> || ruby ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant",
		},
		"font-variant-alternates": {
			syntax:
				"normal | [ stylistic( <feature-value-name> ) || historical-forms || styleset( <feature-value-name># ) || character-variant( <feature-value-name># ) || swash( <feature-value-name> ) || ornaments( <feature-value-name> ) || annotation( <feature-value-name> ) ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-alternates",
		},
		"font-variant-caps": {
			syntax: "normal | small-caps | all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-caps",
		},
		"font-variant-east-asian": {
			syntax: "normal | [ <east-asian-variant-values> || <east-asian-width-values> || ruby ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-east-asian",
		},
		"font-variant-ligatures": {
			syntax:
				"normal | none | [ <common-lig-values> || <discretionary-lig-values> || <historical-lig-values> || <contextual-alt-values> ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-ligatures",
		},
		"font-variant-numeric": {
			syntax:
				"normal | [ <numeric-figure-values> || <numeric-spacing-values> || <numeric-fraction-values> || ordinal || slashed-zero ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-numeric",
		},
		"font-variant-position": {
			syntax: "normal | sub | super",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-variant-position",
		},
		"font-weight": {
			syntax: "<font-weight-absolute> | bolder | lighter",
			media: "visual",
			inherited: true,
			animationType: "fontWeight",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "keywordOrNumericalValueBolderLighterTransformedToRealValue",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/font-weight",
		},
		gap: gap,
		grid: grid,
		"grid-area": {
			syntax: "<grid-line> [ / <grid-line> ]{0,3}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: ["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"],
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: ["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-area",
		},
		"grid-auto-columns": {
			syntax: "<track-size>+",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridContainers",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-auto-columns",
		},
		"grid-auto-flow": {
			syntax: "[ row | column ] || dense",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "row",
			appliesto: "gridContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-auto-flow",
		},
		"grid-auto-rows": {
			syntax: "<track-size>+",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridContainers",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-auto-rows",
		},
		"grid-column": {
			syntax: "<grid-line> [ / <grid-line> ]?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: ["grid-column-start", "grid-column-end"],
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: ["grid-column-start", "grid-column-end"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-column",
		},
		"grid-column-end": {
			syntax: "<grid-line>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-column-end",
		},
		"grid-column-gap": {
			syntax: "<length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "0",
			appliesto: "gridContainers",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/column-gap",
		},
		"grid-column-start": {
			syntax: "<grid-line>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-column-start",
		},
		"grid-gap": {
			syntax: "<'grid-row-gap'> <'grid-column-gap'>?",
			media: "visual",
			inherited: false,
			animationType: ["grid-row-gap", "grid-column-gap"],
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: ["grid-row-gap", "grid-column-gap"],
			appliesto: "gridContainers",
			computed: ["grid-row-gap", "grid-column-gap"],
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/gap",
		},
		"grid-row": {
			syntax: "<grid-line> [ / <grid-line> ]?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: ["grid-row-start", "grid-row-end"],
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: ["grid-row-start", "grid-row-end"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-row",
		},
		"grid-row-end": {
			syntax: "<grid-line>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-row-end",
		},
		"grid-row-gap": {
			syntax: "<length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "0",
			appliesto: "gridContainers",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/row-gap",
		},
		"grid-row-start": {
			syntax: "<grid-line>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "auto",
			appliesto: "gridItemsAndBoxesWithinGridContainer",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-row-start",
		},
		"grid-template": {
			syntax:
				"none | [ <'grid-template-rows'> / <'grid-template-columns'> ] | [ <line-names>? <string> <track-size>? <line-names>? ]+ [ / <explicit-track-list> ]?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: ["grid-template-columns", "grid-template-rows"],
			groups: ["CSS Grid Layout"],
			initial: ["grid-template-columns", "grid-template-rows", "grid-template-areas"],
			appliesto: "gridContainers",
			computed: ["grid-template-columns", "grid-template-rows", "grid-template-areas"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-template",
		},
		"grid-template-areas": {
			syntax: "none | <string>+",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "none",
			appliesto: "gridContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-template-areas",
		},
		"grid-template-columns": {
			syntax: "none | <track-list> | <auto-track-list> | subgrid <line-name-list>?",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpcDifferenceLpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "none",
			appliesto: "gridContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-template-columns",
		},
		"grid-template-rows": {
			syntax: "none | <track-list> | <auto-track-list> | subgrid <line-name-list>?",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpcDifferenceLpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Grid Layout"],
			initial: "none",
			appliesto: "gridContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/grid-template-rows",
		},
		"hanging-punctuation": {
			syntax: "none | [ first || [ force-end | allow-end ] || last ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/hanging-punctuation",
		},
		height: height,
		hyphens: hyphens,
		"image-orientation": {
			syntax: "from-image | <angle> | [ <angle>? flip ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Images"],
			initial: "from-image",
			appliesto: "allElements",
			computed: "angleRoundedToNextQuarter",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/image-orientation",
		},
		"image-rendering": {
			syntax: "auto | crisp-edges | pixelated",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Images"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/image-rendering",
		},
		"image-resolution": {
			syntax: "[ from-image || <resolution> ] && snap?",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Images"],
			initial: "1dppx",
			appliesto: "allElements",
			computed: "asSpecifiedWithExceptionOfResolution",
			order: "uniqueOrder",
			status: "experimental",
		},
		"ime-mode": {
			syntax: "auto | normal | active | inactive | disabled",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "auto",
			appliesto: "textFields",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/ime-mode",
		},
		"initial-letter": {
			syntax: "normal | [ <number> <integer>? ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Inline"],
			initial: "normal",
			appliesto: "firstLetterPseudoElementsAndInlineLevelFirstChildren",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/initial-letter",
		},
		"initial-letter-align": {
			syntax: "[ auto | alphabetic | hanging | ideographic ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Inline"],
			initial: "auto",
			appliesto: "firstLetterPseudoElementsAndInlineLevelFirstChildren",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/initial-letter-align",
		},
		"inline-size": {
			syntax: "<'width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "inlineSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsWidthAndHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inline-size",
		},
		inset: inset,
		"inset-block": {
			syntax: "<'top'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalHeightOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-block",
		},
		"inset-block-end": {
			syntax: "<'top'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalHeightOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-block-end",
		},
		"inset-block-start": {
			syntax: "<'top'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalHeightOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-block-start",
		},
		"inset-inline": {
			syntax: "<'top'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-inline",
		},
		"inset-inline-end": {
			syntax: "<'top'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-inline-end",
		},
		"inset-inline-start": {
			syntax: "<'top'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "sameAsBoxOffsets",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/inset-inline-start",
		},
		isolation: isolation,
		"justify-content": {
			syntax: "normal | <content-distribution> | <overflow-position>? [ <content-position> | left | right ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "flexContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/justify-content",
		},
		"justify-items": {
			syntax:
				"normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ] | legacy | legacy && [ left | right | center ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "legacy",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/justify-items",
		},
		"justify-self": {
			syntax: "auto | normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "auto",
			appliesto: "blockLevelBoxesAndAbsolutelyPositionedBoxesAndGridItems",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/justify-self",
		},
		"justify-tracks": {
			syntax: "[ normal | <content-distribution> | <overflow-position>? [ <content-position> | left | right ] ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "normal",
			appliesto: "gridContainersWithMasonryLayoutInTheirInlineAxis",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/justify-tracks",
		},
		left: left,
		"letter-spacing": {
			syntax: "normal | <length>",
			media: "visual",
			inherited: true,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "allElements",
			computed: "optimumValueOfAbsoluteLengthOrNormal",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/letter-spacing",
		},
		"line-break": {
			syntax: "auto | loose | normal | strict | anywhere",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/line-break",
		},
		"line-clamp": {
			syntax: "none | <integer>",
			media: "visual",
			inherited: false,
			animationType: "integer",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "none",
			appliesto: "blockContainersExceptMultiColumnContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "experimental",
		},
		"line-height": {
			syntax: "normal | <number> | <length> | <percentage>",
			media: "visual",
			inherited: true,
			animationType: "numberOrLength",
			percentages: "referToElementFontSize",
			groups: ["CSS Fonts"],
			initial: "normal",
			appliesto: "allElements",
			computed: "absoluteLengthOrAsSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/line-height",
		},
		"line-height-step": {
			syntax: "<length>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Fonts"],
			initial: "0",
			appliesto: "blockContainers",
			computed: "absoluteLength",
			order: "perGrammar",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/line-height-step",
		},
		"list-style": {
			syntax: "<'list-style-type'> || <'list-style-position'> || <'list-style-image'>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Lists and Counters"],
			initial: ["list-style-type", "list-style-position", "list-style-image"],
			appliesto: "listItems",
			computed: ["list-style-image", "list-style-position", "list-style-type"],
			order: "orderOfAppearance",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/list-style",
		},
		"list-style-image": {
			syntax: "<url> | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Lists and Counters"],
			initial: "none",
			appliesto: "listItems",
			computed: "noneOrImageWithAbsoluteURI",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/list-style-image",
		},
		"list-style-position": {
			syntax: "inside | outside",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Lists and Counters"],
			initial: "outside",
			appliesto: "listItems",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/list-style-position",
		},
		"list-style-type": {
			syntax: "<counter-style> | <string> | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Lists and Counters"],
			initial: "disc",
			appliesto: "listItems",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/list-style-type",
		},
		margin: margin,
		"margin-block": {
			syntax: "<'margin-left'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-block",
		},
		"margin-block-end": {
			syntax: "<'margin-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-block-end",
		},
		"margin-block-start": {
			syntax: "<'margin-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-block-start",
		},
		"margin-bottom": {
			syntax: "<length> | <percentage> | auto",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-bottom",
		},
		"margin-inline": {
			syntax: "<'margin-left'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-inline",
		},
		"margin-inline-end": {
			syntax: "<'margin-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-inline-end",
		},
		"margin-inline-start": {
			syntax: "<'margin-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "dependsOnLayoutModel",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsMargin",
			computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-inline-start",
		},
		"margin-left": {
			syntax: "<length> | <percentage> | auto",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-left",
		},
		"margin-right": {
			syntax: "<length> | <percentage> | auto",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-right",
		},
		"margin-top": {
			syntax: "<length> | <percentage> | auto",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-top",
		},
		"margin-trim": {
			syntax: "none | in-flow | all",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "none",
			appliesto: "blockContainersAndMultiColumnContainers",
			computed: "asSpecified",
			order: "perGrammar",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/margin-trim",
		},
		mask: mask,
		"mask-border": {
			syntax:
				"<'mask-border-source'> || <'mask-border-slice'> [ / <'mask-border-width'>? [ / <'mask-border-outset'> ]? ]? || <'mask-border-repeat'> || <'mask-border-mode'>",
			media: "visual",
			inherited: false,
			animationType: [
				"mask-border-mode",
				"mask-border-outset",
				"mask-border-repeat",
				"mask-border-slice",
				"mask-border-source",
				"mask-border-width",
			],
			percentages: ["mask-border-slice", "mask-border-width"],
			groups: ["CSS Masking"],
			initial: [
				"mask-border-mode",
				"mask-border-outset",
				"mask-border-repeat",
				"mask-border-slice",
				"mask-border-source",
				"mask-border-width",
			],
			appliesto: "allElementsSVGContainerElements",
			computed: [
				"mask-border-mode",
				"mask-border-outset",
				"mask-border-repeat",
				"mask-border-slice",
				"mask-border-source",
				"mask-border-width",
			],
			order: "perGrammar",
			stacking: true,
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border",
		},
		"mask-border-mode": {
			syntax: "luminance | alpha",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "alpha",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-mode",
		},
		"mask-border-outset": {
			syntax: "[ <length> | <number> ]{1,4}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "0",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-outset",
		},
		"mask-border-repeat": {
			syntax: "[ stretch | repeat | round | space ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "stretch",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-repeat",
		},
		"mask-border-slice": {
			syntax: "<number-percentage>{1,4} fill?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "referToSizeOfMaskBorderImage",
			groups: ["CSS Masking"],
			initial: "0",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-slice",
		},
		"mask-border-source": {
			syntax: "none | <image>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "none",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedURLsAbsolute",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-source",
		},
		"mask-border-width": {
			syntax: "[ <length-percentage> | <number> | auto ]{1,4}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "relativeToMaskBorderImageArea",
			groups: ["CSS Masking"],
			initial: "auto",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-border-width",
		},
		"mask-clip": {
			syntax: "[ <geometry-box> | no-clip ]#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "border-box",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-clip",
		},
		"mask-composite": {
			syntax: "<compositing-operator>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "add",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-composite",
		},
		"mask-image": {
			syntax: "<mask-reference>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "none",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedURLsAbsolute",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-image",
		},
		"mask-mode": {
			syntax: "<masking-mode>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "match-source",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-mode",
		},
		"mask-origin": {
			syntax: "<geometry-box>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "border-box",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-origin",
		},
		"mask-position": {
			syntax: "<position>#",
			media: "visual",
			inherited: false,
			animationType: "repeatableListOfSimpleListOfLpc",
			percentages: "referToSizeOfMaskPaintingArea",
			groups: ["CSS Masking"],
			initial: "center",
			appliesto: "allElementsSVGContainerElements",
			computed: "consistsOfTwoKeywordsForOriginAndOffsets",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-position",
		},
		"mask-repeat": {
			syntax: "<repeat-style>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "no-repeat",
			appliesto: "allElementsSVGContainerElements",
			computed: "consistsOfTwoDimensionKeywords",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-repeat",
		},
		"mask-size": {
			syntax: "<bg-size>#",
			media: "visual",
			inherited: false,
			animationType: "repeatableListOfSimpleListOfLpc",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "auto",
			appliesto: "allElementsSVGContainerElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-size",
		},
		"mask-type": {
			syntax: "luminance | alpha",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Masking"],
			initial: "luminance",
			appliesto: "maskElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mask-type",
		},
		"masonry-auto-flow": {
			syntax: "[ pack | next ] || [ definite-first | ordered ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Grid Layout"],
			initial: "pack",
			appliesto: "gridContainersWithMasonryLayout",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/masonry-auto-flow",
		},
		"math-style": {
			syntax: "normal | compact",
			media: "visual",
			inherited: true,
			animationType: "notAnimatable",
			percentages: "no",
			groups: ["MathML"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/math-style",
		},
		"max-block-size": {
			syntax: "<'max-width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "blockSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsMaxWidthAndMaxHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/max-block-size",
		},
		"max-height": {
			syntax: "none | <length-percentage> | min-content | max-content | fit-content(<length-percentage>)",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentagesNone",
			groups: ["CSS Box Model"],
			initial: "none",
			appliesto: "allElementsButNonReplacedAndTableColumns",
			computed: "percentageAsSpecifiedAbsoluteLengthOrNone",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/max-height",
		},
		"max-inline-size": {
			syntax: "<'max-width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "inlineSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsMaxWidthAndMaxHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/max-inline-size",
		},
		"max-lines": {
			syntax: "none | <integer>",
			media: "visual",
			inherited: false,
			animationType: "integer",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "none",
			appliesto: "blockContainersExceptMultiColumnContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "experimental",
		},
		"max-width": {
			syntax: "none | <length-percentage> | min-content | max-content | fit-content(<length-percentage>)",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "none",
			appliesto: "allElementsButNonReplacedAndTableRows",
			computed: "percentageAsSpecifiedAbsoluteLengthOrNone",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/max-width",
		},
		"min-block-size": {
			syntax: "<'min-width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "blockSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsMinWidthAndMinHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/min-block-size",
		},
		"min-height": {
			syntax: "auto | <length> | <percentage> | min-content | max-content | fit-content(<length-percentage>)",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentages0",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "allElementsButNonReplacedAndTableColumns",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/min-height",
		},
		"min-inline-size": {
			syntax: "<'min-width'>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "inlineSizeOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "sameAsWidthAndHeight",
			computed: "sameAsMinWidthAndMinHeight",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/min-inline-size",
		},
		"min-width": {
			syntax: "auto | <length> | <percentage> | min-content | max-content | fit-content(<length-percentage>)",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "allElementsButNonReplacedAndTableRows",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/min-width",
		},
		"mix-blend-mode": {
			syntax: "<blend-mode>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Compositing and Blending"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			stacking: true,
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/mix-blend-mode",
		},
		"object-fit": {
			syntax: "fill | contain | cover | none | scale-down",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Images"],
			initial: "fill",
			appliesto: "replacedElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/object-fit",
		},
		"object-position": {
			syntax: "<position>",
			media: "visual",
			inherited: true,
			animationType: "repeatableListOfSimpleListOfLpc",
			percentages: "referToWidthAndHeightOfElement",
			groups: ["CSS Images"],
			initial: "50% 50%",
			appliesto: "replacedElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/object-position",
		},
		offset: offset,
		"offset-anchor": {
			syntax: "auto | <position>",
			media: "visual",
			inherited: false,
			animationType: "position",
			percentages: "relativeToWidthAndHeight",
			groups: ["CSS Motion Path"],
			initial: "auto",
			appliesto: "transformableElements",
			computed: "forLengthAbsoluteValueOtherwisePercentage",
			order: "perGrammar",
			status: "standard",
		},
		"offset-distance": {
			syntax: "<length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToTotalPathLength",
			groups: ["CSS Motion Path"],
			initial: "0",
			appliesto: "transformableElements",
			computed: "forLengthAbsoluteValueOtherwisePercentage",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/offset-distance",
		},
		"offset-path": {
			syntax:
				"none | ray( [ <angle> && <size> && contain? ] ) | <path()> | <url> | [ <basic-shape> || <geometry-box> ]",
			media: "visual",
			inherited: false,
			animationType: "angleOrBasicShapeOrPath",
			percentages: "no",
			groups: ["CSS Motion Path"],
			initial: "none",
			appliesto: "transformableElements",
			computed: "asSpecified",
			order: "perGrammar",
			stacking: true,
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/offset-path",
		},
		"offset-position": {
			syntax: "auto | <position>",
			media: "visual",
			inherited: false,
			animationType: "position",
			percentages: "referToSizeOfContainingBlock",
			groups: ["CSS Motion Path"],
			initial: "auto",
			appliesto: "transformableElements",
			computed: "forLengthAbsoluteValueOtherwisePercentage",
			order: "perGrammar",
			status: "experimental",
		},
		"offset-rotate": {
			syntax: "[ auto | reverse ] || <angle>",
			media: "visual",
			inherited: false,
			animationType: "angleOrBasicShapeOrPath",
			percentages: "no",
			groups: ["CSS Motion Path"],
			initial: "auto",
			appliesto: "transformableElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/offset-rotate",
		},
		opacity: opacity,
		order: order,
		orphans: orphans,
		outline: outline,
		"outline-color": {
			syntax: "<color> | invert",
			media: ["visual", "interactive"],
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "invertOrCurrentColor",
			appliesto: "allElements",
			computed: "invertForTranslucentColorRGBAOtherwiseRGB",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/outline-color",
		},
		"outline-offset": {
			syntax: "<length>",
			media: ["visual", "interactive"],
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/outline-offset",
		},
		"outline-style": {
			syntax: "auto | <'border-style'>",
			media: ["visual", "interactive"],
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/outline-style",
		},
		"outline-width": {
			syntax: "<line-width>",
			media: ["visual", "interactive"],
			inherited: false,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "medium",
			appliesto: "allElements",
			computed: "absoluteLength0ForNone",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/outline-width",
		},
		overflow: overflow,
		"overflow-anchor": {
			syntax: "auto | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Anchoring"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
		},
		"overflow-block": {
			syntax: "visible | hidden | clip | scroll | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "auto",
			appliesto: "blockContainersFlexContainersGridContainers",
			computed: "asSpecifiedButVisibleOrClipReplacedToAutoOrHiddenIfOtherValueDifferent",
			order: "perGrammar",
			status: "standard",
		},
		"overflow-clip-box": {
			syntax: "padding-box | content-box",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Mozilla Extensions"],
			initial: "padding-box",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Mozilla/CSS/overflow-clip-box",
		},
		"overflow-inline": {
			syntax: "visible | hidden | clip | scroll | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "auto",
			appliesto: "blockContainersFlexContainersGridContainers",
			computed: "asSpecifiedButVisibleOrClipReplacedToAutoOrHiddenIfOtherValueDifferent",
			order: "perGrammar",
			status: "standard",
		},
		"overflow-wrap": {
			syntax: "normal | break-word | anywhere",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "nonReplacedInlineElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overflow-wrap",
		},
		"overflow-x": {
			syntax: "visible | hidden | clip | scroll | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "visible",
			appliesto: "blockContainersFlexContainersGridContainers",
			computed: "asSpecifiedButVisibleOrClipReplacedToAutoOrHiddenIfOtherValueDifferent",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overflow-x",
		},
		"overflow-y": {
			syntax: "visible | hidden | clip | scroll | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "visible",
			appliesto: "blockContainersFlexContainersGridContainers",
			computed: "asSpecifiedButVisibleOrClipReplacedToAutoOrHiddenIfOtherValueDifferent",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overflow-y",
		},
		"overscroll-behavior": {
			syntax: "[ contain | none | auto ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior",
		},
		"overscroll-behavior-block": {
			syntax: "contain | none | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior-block",
		},
		"overscroll-behavior-inline": {
			syntax: "contain | none | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior-inline",
		},
		"overscroll-behavior-x": {
			syntax: "contain | none | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior-x",
		},
		"overscroll-behavior-y": {
			syntax: "contain | none | auto",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Model"],
			initial: "auto",
			appliesto: "nonReplacedBlockAndInlineBlockElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior-y",
		},
		padding: padding,
		"padding-block": {
			syntax: "<'padding-left'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-block",
		},
		"padding-block-end": {
			syntax: "<'padding-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-block-end",
		},
		"padding-block-start": {
			syntax: "<'padding-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-block-start",
		},
		"padding-bottom": {
			syntax: "<length> | <percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptInternalTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-bottom",
		},
		"padding-inline": {
			syntax: "<'padding-left'>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-inline",
		},
		"padding-inline-end": {
			syntax: "<'padding-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-inline-end",
		},
		"padding-inline-start": {
			syntax: "<'padding-left'>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "logicalWidthOfContainingBlock",
			groups: ["CSS Logical Properties"],
			initial: "0",
			appliesto: "allElements",
			computed: "asLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-inline-start",
		},
		"padding-left": {
			syntax: "<length> | <percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptInternalTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-left",
		},
		"padding-right": {
			syntax: "<length> | <percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptInternalTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-right",
		},
		"padding-top": {
			syntax: "<length> | <percentage>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Box Model"],
			initial: "0",
			appliesto: "allElementsExceptInternalTableDisplayTypes",
			computed: "percentageAsSpecifiedOrAbsoluteLength",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/padding-top",
		},
		"page-break-after": {
			syntax: "auto | always | avoid | left | right | recto | verso",
			media: ["visual", "paged"],
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Pages"],
			initial: "auto",
			appliesto: "blockElementsInNormalFlow",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/page-break-after",
		},
		"page-break-before": {
			syntax: "auto | always | avoid | left | right | recto | verso",
			media: ["visual", "paged"],
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Pages"],
			initial: "auto",
			appliesto: "blockElementsInNormalFlow",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/page-break-before",
		},
		"page-break-inside": {
			syntax: "auto | avoid",
			media: ["visual", "paged"],
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Pages"],
			initial: "auto",
			appliesto: "blockElementsInNormalFlow",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/page-break-inside",
		},
		"paint-order": {
			syntax: "normal | [ fill || stroke || markers ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "textElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/paint-order",
		},
		perspective: perspective,
		"perspective-origin": {
			syntax: "<position>",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpc",
			percentages: "referToSizeOfBoundingBox",
			groups: ["CSS Transforms"],
			initial: "50% 50%",
			appliesto: "transformableElements",
			computed: "forLengthAbsoluteValueOtherwisePercentage",
			order: "oneOrTwoValuesLengthAbsoluteKeywordsPercentages",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/perspective-origin",
		},
		"place-content": {
			syntax: "<'align-content'> <'justify-content'>?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "multilineFlexContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/place-content",
		},
		"place-items": {
			syntax: "<'align-items'> <'justify-items'>?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: ["align-items", "justify-items"],
			appliesto: "allElements",
			computed: ["align-items", "justify-items"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/place-items",
		},
		"place-self": {
			syntax: "<'align-self'> <'justify-self'>?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Box Alignment"],
			initial: ["align-self", "justify-self"],
			appliesto: "blockLevelBoxesAndAbsolutelyPositionedBoxesAndGridItems",
			computed: ["align-self", "justify-self"],
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/place-self",
		},
		"pointer-events": {
			syntax:
				"auto | none | visiblePainted | visibleFill | visibleStroke | visible | painted | fill | stroke | all | inherit",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["Pointer Events"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/pointer-events",
		},
		position: position$1,
		quotes: quotes,
		resize: resize,
		right: right,
		rotate: rotate,
		"row-gap": {
			syntax: "normal | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToDimensionOfContentArea",
			groups: ["CSS Box Alignment"],
			initial: "normal",
			appliesto: "multiColumnElementsFlexContainersGridContainers",
			computed: "asSpecifiedWithLengthsAbsoluteAndNormalComputingToZeroExceptMultiColumn",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/row-gap",
		},
		"ruby-align": {
			syntax: "start | center | space-between | space-around",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Ruby"],
			initial: "space-around",
			appliesto: "rubyBasesAnnotationsBaseAnnotationContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/ruby-align",
		},
		"ruby-merge": {
			syntax: "separate | collapse | auto",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Ruby"],
			initial: "separate",
			appliesto: "rubyAnnotationsContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
		},
		"ruby-position": {
			syntax: "over | under | inter-character",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Ruby"],
			initial: "over",
			appliesto: "rubyAnnotationsContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/ruby-position",
		},
		scale: scale,
		"scrollbar-color": {
			syntax: "auto | dark | light | <color>{2}",
			media: "visual",
			inherited: true,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Scrollbars"],
			initial: "auto",
			appliesto: "scrollingBoxes",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scrollbar-color",
		},
		"scrollbar-gutter": {
			syntax: "auto | [ stable | always ] && both? && force?",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Overflow"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scrollbar-gutter",
		},
		"scrollbar-width": {
			syntax: "auto | thin | none",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scrollbars"],
			initial: "auto",
			appliesto: "scrollingBoxes",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scrollbar-width",
		},
		"scroll-behavior": {
			syntax: "auto | smooth",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSSOM View"],
			initial: "auto",
			appliesto: "scrollingBoxes",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-behavior",
		},
		"scroll-margin": {
			syntax: "<length>{1,4}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin",
		},
		"scroll-margin-block": {
			syntax: "<length>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-block",
		},
		"scroll-margin-block-start": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-block-start",
		},
		"scroll-margin-block-end": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-block-end",
		},
		"scroll-margin-bottom": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-bottom",
		},
		"scroll-margin-inline": {
			syntax: "<length>{1,2}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-inline",
		},
		"scroll-margin-inline-start": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-inline-start",
		},
		"scroll-margin-inline-end": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-inline-end",
		},
		"scroll-margin-left": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-left",
		},
		"scroll-margin-right": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-right",
		},
		"scroll-margin-top": {
			syntax: "<length>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "0",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-margin-top",
		},
		"scroll-padding": {
			syntax: "[ auto | <length-percentage> ]{1,4}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding",
		},
		"scroll-padding-block": {
			syntax: "[ auto | <length-percentage> ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-block",
		},
		"scroll-padding-block-start": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-block-start",
		},
		"scroll-padding-block-end": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-block-end",
		},
		"scroll-padding-bottom": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-bottom",
		},
		"scroll-padding-inline": {
			syntax: "[ auto | <length-percentage> ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-inline",
		},
		"scroll-padding-inline-start": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-inline-start",
		},
		"scroll-padding-inline-end": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-inline-end",
		},
		"scroll-padding-left": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-left",
		},
		"scroll-padding-right": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-right",
		},
		"scroll-padding-top": {
			syntax: "auto | <length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "relativeToTheScrollContainersScrollport",
			groups: ["CSS Scroll Snap"],
			initial: "auto",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-padding-top",
		},
		"scroll-snap-align": {
			syntax: "[ none | start | end | center ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-align",
		},
		"scroll-snap-coordinate": {
			syntax: "none | <position>#",
			media: "interactive",
			inherited: false,
			animationType: "position",
			percentages: "referToBorderBox",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-coordinate",
		},
		"scroll-snap-destination": {
			syntax: "<position>",
			media: "interactive",
			inherited: false,
			animationType: "position",
			percentages: "relativeToScrollContainerPaddingBoxAxis",
			groups: ["CSS Scroll Snap"],
			initial: "0px 0px",
			appliesto: "scrollContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-destination",
		},
		"scroll-snap-points-x": {
			syntax: "none | repeat( <length-percentage> )",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "relativeToScrollContainerPaddingBoxAxis",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "scrollContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-points-x",
		},
		"scroll-snap-points-y": {
			syntax: "none | repeat( <length-percentage> )",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "relativeToScrollContainerPaddingBoxAxis",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "scrollContainers",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-points-y",
		},
		"scroll-snap-stop": {
			syntax: "normal | always",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-stop",
		},
		"scroll-snap-type": {
			syntax: "none | [ x | y | block | inline | both ] [ mandatory | proximity ]?",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-type",
		},
		"scroll-snap-type-x": {
			syntax: "none | mandatory | proximity",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-type-x",
		},
		"scroll-snap-type-y": {
			syntax: "none | mandatory | proximity",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Scroll Snap"],
			initial: "none",
			appliesto: "scrollContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "obsolete",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-type-y",
		},
		"shape-image-threshold": {
			syntax: "<alpha-value>",
			media: "visual",
			inherited: false,
			animationType: "number",
			percentages: "no",
			groups: ["CSS Shapes"],
			initial: "0.0",
			appliesto: "floats",
			computed: "specifiedValueNumberClipped0To1",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/shape-image-threshold",
		},
		"shape-margin": {
			syntax: "<length-percentage>",
			media: "visual",
			inherited: false,
			animationType: "lpc",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Shapes"],
			initial: "0",
			appliesto: "floats",
			computed: "asSpecifiedRelativeToAbsoluteLengths",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/shape-margin",
		},
		"shape-outside": {
			syntax: "none | <shape-box> || <basic-shape> | <image>",
			media: "visual",
			inherited: false,
			animationType: "basicShapeOtherwiseNo",
			percentages: "no",
			groups: ["CSS Shapes"],
			initial: "none",
			appliesto: "floats",
			computed: "asDefinedForBasicShapeWithAbsoluteURIOtherwiseAsSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/shape-outside",
		},
		"tab-size": {
			syntax: "<integer> | <length>",
			media: "visual",
			inherited: true,
			animationType: "length",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "8",
			appliesto: "blockContainers",
			computed: "specifiedIntegerOrAbsoluteLength",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/tab-size",
		},
		"table-layout": {
			syntax: "auto | fixed",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Table"],
			initial: "auto",
			appliesto: "tableElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/table-layout",
		},
		"text-align": {
			syntax: "start | end | left | right | center | justify | match-parent",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "startOrNamelessValueIfLTRRightIfRTL",
			appliesto: "blockContainers",
			computed: "asSpecifiedExceptMatchParent",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-align",
		},
		"text-align-last": {
			syntax: "auto | start | end | left | right | center | justify",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "auto",
			appliesto: "blockContainers",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-align-last",
		},
		"text-combine-upright": {
			syntax: "none | all | [ digits <integer>? ]",
			media: "visual",
			inherited: true,
			animationType: "notAnimatable",
			percentages: "no",
			groups: ["CSS Writing Modes"],
			initial: "none",
			appliesto: "nonReplacedInlineElements",
			computed: "keywordPlusIntegerIfDigits",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-combine-upright",
		},
		"text-decoration": {
			syntax:
				"<'text-decoration-line'> || <'text-decoration-style'> || <'text-decoration-color'> || <'text-decoration-thickness'>",
			media: "visual",
			inherited: false,
			animationType: [
				"text-decoration-color",
				"text-decoration-style",
				"text-decoration-line",
				"text-decoration-thickness",
			],
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: ["text-decoration-color", "text-decoration-style", "text-decoration-line"],
			appliesto: "allElements",
			computed: ["text-decoration-line", "text-decoration-style", "text-decoration-color", "text-decoration-thickness"],
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration",
		},
		"text-decoration-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-color",
		},
		"text-decoration-line": {
			syntax: "none | [ underline || overline || line-through || blink ] | spelling-error | grammar-error",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-line",
		},
		"text-decoration-skip": {
			syntax: "none | [ objects || [ spaces | [ leading-spaces || trailing-spaces ] ] || edges || box-decoration ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "objects",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-skip",
		},
		"text-decoration-skip-ink": {
			syntax: "auto | all | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-skip-ink",
		},
		"text-decoration-style": {
			syntax: "solid | double | dotted | dashed | wavy",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "solid",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-style",
		},
		"text-decoration-thickness": {
			syntax: "auto | from-font | <length> | <percentage> ",
			media: "visual",
			inherited: false,
			animationType: "byComputedValueType",
			percentages: "referToElementFontSize",
			groups: ["CSS Text Decoration"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-decoration-thickness",
		},
		"text-emphasis": {
			syntax: "<'text-emphasis-style'> || <'text-emphasis-color'>",
			media: "visual",
			inherited: false,
			animationType: ["text-emphasis-color", "text-emphasis-style"],
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: ["text-emphasis-style", "text-emphasis-color"],
			appliesto: "allElements",
			computed: ["text-emphasis-style", "text-emphasis-color"],
			order: "orderOfAppearance",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-emphasis",
		},
		"text-emphasis-color": {
			syntax: "<color>",
			media: "visual",
			inherited: false,
			animationType: "color",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "currentcolor",
			appliesto: "allElements",
			computed: "computedColor",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-emphasis-color",
		},
		"text-emphasis-position": {
			syntax: "[ over | under ] && [ right | left ]",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "over right",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-emphasis-position",
		},
		"text-emphasis-style": {
			syntax: "none | [ [ filled | open ] || [ dot | circle | double-circle | triangle | sesame ] ] | <string>",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-emphasis-style",
		},
		"text-indent": {
			syntax: "<length-percentage> && hanging? && each-line?",
			media: "visual",
			inherited: true,
			animationType: "lpc",
			percentages: "referToWidthOfContainingBlock",
			groups: ["CSS Text"],
			initial: "0",
			appliesto: "blockContainers",
			computed: "percentageOrAbsoluteLengthPlusKeywords",
			order: "lengthOrPercentageBeforeKeywords",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-indent",
		},
		"text-justify": {
			syntax: "auto | inter-character | inter-word | none",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "auto",
			appliesto: "inlineLevelAndTableCellElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-justify",
		},
		"text-orientation": {
			syntax: "mixed | upright | sideways",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Writing Modes"],
			initial: "mixed",
			appliesto: "allElementsExceptTableRowGroupsRowsColumnGroupsAndColumns",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-orientation",
		},
		"text-overflow": {
			syntax: "[ clip | ellipsis | <string> ]{1,2}",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "clip",
			appliesto: "blockContainerElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-overflow",
		},
		"text-rendering": {
			syntax: "auto | optimizeSpeed | optimizeLegibility | geometricPrecision",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Miscellaneous"],
			initial: "auto",
			appliesto: "textElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-rendering",
		},
		"text-shadow": {
			syntax: "none | <shadow-t>#",
			media: "visual",
			inherited: true,
			animationType: "shadowList",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "none",
			appliesto: "allElements",
			computed: "colorPlusThreeAbsoluteLengths",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-shadow",
		},
		"text-size-adjust": {
			syntax: "none | auto | <percentage>",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "referToSizeOfFont",
			groups: ["CSS Text"],
			initial: "autoForSmartphoneBrowsersSupportingInflation",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "experimental",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-size-adjust",
		},
		"text-transform": {
			syntax: "none | capitalize | uppercase | lowercase | full-width | full-size-kana",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "none",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-transform",
		},
		"text-underline-offset": {
			syntax: "auto | <length> | <percentage> ",
			media: "visual",
			inherited: true,
			animationType: "byComputedValueType",
			percentages: "referToElementFontSize",
			groups: ["CSS Text Decoration"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-underline-offset",
		},
		"text-underline-position": {
			syntax: "auto | from-font | [ under || [ left | right ] ]",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text Decoration"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "orderOfAppearance",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/text-underline-position",
		},
		top: top,
		"touch-action": {
			syntax:
				"auto | none | [ [ pan-x | pan-left | pan-right ] || [ pan-y | pan-up | pan-down ] || pinch-zoom ] | manipulation",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["Pointer Events"],
			initial: "auto",
			appliesto: "allElementsExceptNonReplacedInlineElementsTableRowsColumnsRowColumnGroups",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/touch-action",
		},
		transform: transform,
		"transform-box": {
			syntax: "content-box | border-box | fill-box | stroke-box | view-box",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transforms"],
			initial: "view-box",
			appliesto: "transformableElements",
			computed: "asSpecified",
			order: "perGrammar",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transform-box",
		},
		"transform-origin": {
			syntax:
				"[ <length-percentage> | left | center | right | top | bottom ] | [ [ <length-percentage> | left | center | right ] && [ <length-percentage> | top | center | bottom ] ] <length>?",
			media: "visual",
			inherited: false,
			animationType: "simpleListOfLpc",
			percentages: "referToSizeOfBoundingBox",
			groups: ["CSS Transforms"],
			initial: "50% 50% 0",
			appliesto: "transformableElements",
			computed: "forLengthAbsoluteValueOtherwisePercentage",
			order: "oneOrTwoValuesLengthAbsoluteKeywordsPercentages",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transform-origin",
		},
		"transform-style": {
			syntax: "flat | preserve-3d",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transforms"],
			initial: "flat",
			appliesto: "transformableElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			stacking: true,
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transform-style",
		},
		transition: transition,
		"transition-delay": {
			syntax: "<time>#",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transitions"],
			initial: "0s",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transition-delay",
		},
		"transition-duration": {
			syntax: "<time>#",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transitions"],
			initial: "0s",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transition-duration",
		},
		"transition-property": {
			syntax: "none | <single-transition-property>#",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transitions"],
			initial: "all",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transition-property",
		},
		"transition-timing-function": {
			syntax: "<timing-function>#",
			media: "interactive",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Transitions"],
			initial: "ease",
			appliesto: "allElementsAndPseudos",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/transition-timing-function",
		},
		translate: translate,
		"unicode-bidi": {
			syntax: "normal | embed | isolate | bidi-override | isolate-override | plaintext",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Writing Modes"],
			initial: "normal",
			appliesto: "allElementsSomeValuesNoEffectOnNonInlineElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/unicode-bidi",
		},
		"user-select": {
			syntax: "auto | text | none | contain | all",
			media: "visual",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Basic User Interface"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "nonstandard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/user-select",
		},
		"vertical-align": {
			syntax: "baseline | sub | super | text-top | text-bottom | middle | top | bottom | <percentage> | <length>",
			media: "visual",
			inherited: false,
			animationType: "length",
			percentages: "referToLineHeight",
			groups: ["CSS Table"],
			initial: "baseline",
			appliesto: "inlineLevelAndTableCellElements",
			computed: "absoluteLengthOrKeyword",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/vertical-align",
		},
		visibility: visibility,
		"white-space": {
			syntax: "normal | pre | nowrap | pre-wrap | pre-line | break-spaces",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/white-space",
		},
		widows: widows,
		width: width,
		"will-change": {
			syntax: "auto | <animateable-feature>#",
			media: "all",
			inherited: false,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Will Change"],
			initial: "auto",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/will-change",
		},
		"word-break": {
			syntax: "normal | break-all | keep-all | break-word",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "allElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/word-break",
		},
		"word-spacing": {
			syntax: "normal | <length-percentage>",
			media: "visual",
			inherited: true,
			animationType: "length",
			percentages: "referToWidthOfAffectedGlyph",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "allElements",
			computed: "optimumMinAndMaxValueOfAbsoluteLengthPercentageOrNormal",
			order: "uniqueOrder",
			alsoAppliesTo: ["::first-letter", "::first-line", "::placeholder"],
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/word-spacing",
		},
		"word-wrap": {
			syntax: "normal | break-word",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Text"],
			initial: "normal",
			appliesto: "nonReplacedInlineElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/overflow-wrap",
		},
		"writing-mode": {
			syntax: "horizontal-tb | vertical-rl | vertical-lr | sideways-rl | sideways-lr",
			media: "visual",
			inherited: true,
			animationType: "discrete",
			percentages: "no",
			groups: ["CSS Writing Modes"],
			initial: "horizontal-tb",
			appliesto: "allElementsExceptTableRowColumnGroupsTableRowsColumns",
			computed: "asSpecified",
			order: "uniqueOrder",
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/writing-mode",
		},
		"z-index": {
			syntax: "auto | <integer>",
			media: "visual",
			inherited: false,
			animationType: "integer",
			percentages: "no",
			groups: ["CSS Positioning"],
			initial: "auto",
			appliesto: "positionedElements",
			computed: "asSpecified",
			order: "uniqueOrder",
			stacking: true,
			status: "standard",
			mdn_url: "https://developer.mozilla.org/docs/Web/CSS/z-index",
		},
		zoom: zoom,
	};

	var attachment = {
		syntax: "scroll | fixed | local",
	};
	var box = {
		syntax: "border-box | padding-box | content-box",
	};
	var color = {
		syntax:
			"<rgb()> | <rgba()> | <hsl()> | <hsla()> | <hex-color> | <named-color> | currentcolor | <deprecated-system-color>",
	};
	var combinator = {
		syntax: "'>' | '+' | '~' | [ '||' ]",
	};
	var gradient = {
		syntax:
			"<linear-gradient()> | <repeating-linear-gradient()> | <radial-gradient()> | <repeating-radial-gradient()> | <conic-gradient()>",
	};
	var hue = {
		syntax: "<number> | <angle>",
	};
	var image = {
		syntax: "<url> | <image()> | <image-set()> | <element()> | <paint()> | <cross-fade()> | <gradient>",
	};
	var nth$1 = {
		syntax: "<an-plus-b> | even | odd",
	};
	var position = {
		syntax:
			"[ [ left | center | right ] || [ top | center | bottom ] | [ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ]? | [ [ left | right ] <length-percentage> ] && [ [ top | bottom ] <length-percentage> ] ]",
	};
	var quote = {
		syntax: "open-quote | close-quote | no-open-quote | no-close-quote",
	};
	var shadow = {
		syntax: "inset? && <length>{2,4} && <color>?",
	};
	var shape = {
		syntax: "rect(<top>, <right>, <bottom>, <left>)",
	};
	var size = {
		syntax: "closest-side | farthest-side | closest-corner | farthest-corner | <length> | <length-percentage>{2}",
	};
	var symbol = {
		syntax: "<string> | <image> | <custom-ident>",
	};
	var target = {
		syntax: "<target-counter()> | <target-counters()> | <target-text()>",
	};
	var require$$2 = {
		"absolute-size": {
			syntax: "xx-small | x-small | small | medium | large | x-large | xx-large | xxx-large",
		},
		"alpha-value": {
			syntax: "<number> | <percentage>",
		},
		"angle-percentage": {
			syntax: "<angle> | <percentage>",
		},
		"angular-color-hint": {
			syntax: "<angle-percentage>",
		},
		"angular-color-stop": {
			syntax: "<color> && <color-stop-angle>?",
		},
		"angular-color-stop-list": {
			syntax: "[ <angular-color-stop> [, <angular-color-hint>]? ]# , <angular-color-stop>",
		},
		"animateable-feature": {
			syntax: "scroll-position | contents | <custom-ident>",
		},
		attachment: attachment,
		"attr()": {
			syntax: "attr( <attr-name> <type-or-unit>? [, <attr-fallback> ]? )",
		},
		"attr-matcher": {
			syntax: "[ '~' | '|' | '^' | '$' | '*' ]? '='",
		},
		"attr-modifier": {
			syntax: "i | s",
		},
		"attribute-selector": {
			syntax:
				"'[' <wq-name> ']' | '[' <wq-name> <attr-matcher> [ <string-token> | <ident-token> ] <attr-modifier>? ']'",
		},
		"auto-repeat": {
			syntax: "repeat( [ auto-fill | auto-fit ] , [ <line-names>? <fixed-size> ]+ <line-names>? )",
		},
		"auto-track-list": {
			syntax:
				"[ <line-names>? [ <fixed-size> | <fixed-repeat> ] ]* <line-names>? <auto-repeat>\n[ <line-names>? [ <fixed-size> | <fixed-repeat> ] ]* <line-names>?",
		},
		"baseline-position": {
			syntax: "[ first | last ]? baseline",
		},
		"basic-shape": {
			syntax: "<inset()> | <circle()> | <ellipse()> | <polygon()> | <path()>",
		},
		"bg-image": {
			syntax: "none | <image>",
		},
		"bg-layer": {
			syntax: "<bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>",
		},
		"bg-position": {
			syntax:
				"[ [ left | center | right | top | bottom | <length-percentage> ] | [ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ] | [ center | [ left | right ] <length-percentage>? ] && [ center | [ top | bottom ] <length-percentage>? ] ]",
		},
		"bg-size": {
			syntax: "[ <length-percentage> | auto ]{1,2} | cover | contain",
		},
		"blur()": {
			syntax: "blur( <length> )",
		},
		"blend-mode": {
			syntax:
				"normal | multiply | screen | overlay | darken | lighten | color-dodge | color-burn | hard-light | soft-light | difference | exclusion | hue | saturation | color | luminosity",
		},
		box: box,
		"brightness()": {
			syntax: "brightness( <number-percentage> )",
		},
		"calc()": {
			syntax: "calc( <calc-sum> )",
		},
		"calc-sum": {
			syntax: "<calc-product> [ [ '+' | '-' ] <calc-product> ]*",
		},
		"calc-product": {
			syntax: "<calc-value> [ '*' <calc-value> | '/' <number> ]*",
		},
		"calc-value": {
			syntax: "<number> | <dimension> | <percentage> | ( <calc-sum> )",
		},
		"cf-final-image": {
			syntax: "<image> | <color>",
		},
		"cf-mixing-image": {
			syntax: "<percentage>? && <image>",
		},
		"circle()": {
			syntax: "circle( [ <shape-radius> ]? [ at <position> ]? )",
		},
		"clamp()": {
			syntax: "clamp( <calc-sum>#{3} )",
		},
		"class-selector": {
			syntax: "'.' <ident-token>",
		},
		"clip-source": {
			syntax: "<url>",
		},
		color: color,
		"color-stop": {
			syntax: "<color-stop-length> | <color-stop-angle>",
		},
		"color-stop-angle": {
			syntax: "<angle-percentage>{1,2}",
		},
		"color-stop-length": {
			syntax: "<length-percentage>{1,2}",
		},
		"color-stop-list": {
			syntax: "[ <linear-color-stop> [, <linear-color-hint>]? ]# , <linear-color-stop>",
		},
		combinator: combinator,
		"common-lig-values": {
			syntax: "[ common-ligatures | no-common-ligatures ]",
		},
		"compat-auto": {
			syntax:
				"searchfield | textarea | push-button | slider-horizontal | checkbox | radio | square-button | menulist | listbox | meter | progress-bar | button",
		},
		"composite-style": {
			syntax:
				"clear | copy | source-over | source-in | source-out | source-atop | destination-over | destination-in | destination-out | destination-atop | xor",
		},
		"compositing-operator": {
			syntax: "add | subtract | intersect | exclude",
		},
		"compound-selector": {
			syntax: "[ <type-selector>? <subclass-selector>* [ <pseudo-element-selector> <pseudo-class-selector>* ]* ]!",
		},
		"compound-selector-list": {
			syntax: "<compound-selector>#",
		},
		"complex-selector": {
			syntax: "<compound-selector> [ <combinator>? <compound-selector> ]*",
		},
		"complex-selector-list": {
			syntax: "<complex-selector>#",
		},
		"conic-gradient()": {
			syntax: "conic-gradient( [ from <angle> ]? [ at <position> ]?, <angular-color-stop-list> )",
		},
		"contextual-alt-values": {
			syntax: "[ contextual | no-contextual ]",
		},
		"content-distribution": {
			syntax: "space-between | space-around | space-evenly | stretch",
		},
		"content-list": {
			syntax: "[ <string> | contents | <image> | <quote> | <target> | <leader()> ]+",
		},
		"content-position": {
			syntax: "center | start | end | flex-start | flex-end",
		},
		"content-replacement": {
			syntax: "<image>",
		},
		"contrast()": {
			syntax: "contrast( [ <number-percentage> ] )",
		},
		"counter()": {
			syntax: "counter( <custom-ident>, <counter-style>? )",
		},
		"counter-style": {
			syntax: "<counter-style-name> | symbols()",
		},
		"counter-style-name": {
			syntax: "<custom-ident>",
		},
		"counters()": {
			syntax: "counters( <custom-ident>, <string>, <counter-style>? )",
		},
		"cross-fade()": {
			syntax: "cross-fade( <cf-mixing-image> , <cf-final-image>? )",
		},
		"cubic-bezier-timing-function": {
			syntax:
				"ease | ease-in | ease-out | ease-in-out | cubic-bezier(<number [0,1]>, <number>, <number [0,1]>, <number>)",
		},
		"deprecated-system-color": {
			syntax:
				"ActiveBorder | ActiveCaption | AppWorkspace | Background | ButtonFace | ButtonHighlight | ButtonShadow | ButtonText | CaptionText | GrayText | Highlight | HighlightText | InactiveBorder | InactiveCaption | InactiveCaptionText | InfoBackground | InfoText | Menu | MenuText | Scrollbar | ThreeDDarkShadow | ThreeDFace | ThreeDHighlight | ThreeDLightShadow | ThreeDShadow | Window | WindowFrame | WindowText",
		},
		"discretionary-lig-values": {
			syntax: "[ discretionary-ligatures | no-discretionary-ligatures ]",
		},
		"display-box": {
			syntax: "contents | none",
		},
		"display-inside": {
			syntax: "flow | flow-root | table | flex | grid | ruby",
		},
		"display-internal": {
			syntax:
				"table-row-group | table-header-group | table-footer-group | table-row | table-cell | table-column-group | table-column | table-caption | ruby-base | ruby-text | ruby-base-container | ruby-text-container",
		},
		"display-legacy": {
			syntax: "inline-block | inline-list-item | inline-table | inline-flex | inline-grid",
		},
		"display-listitem": {
			syntax: "<display-outside>? && [ flow | flow-root ]? && list-item",
		},
		"display-outside": {
			syntax: "block | inline | run-in",
		},
		"drop-shadow()": {
			syntax: "drop-shadow( <length>{2,3} <color>? )",
		},
		"east-asian-variant-values": {
			syntax: "[ jis78 | jis83 | jis90 | jis04 | simplified | traditional ]",
		},
		"east-asian-width-values": {
			syntax: "[ full-width | proportional-width ]",
		},
		"element()": {
			syntax: "element( <id-selector> )",
		},
		"ellipse()": {
			syntax: "ellipse( [ <shape-radius>{2} ]? [ at <position> ]? )",
		},
		"ending-shape": {
			syntax: "circle | ellipse",
		},
		"env()": {
			syntax: "env( <custom-ident> , <declaration-value>? )",
		},
		"explicit-track-list": {
			syntax: "[ <line-names>? <track-size> ]+ <line-names>?",
		},
		"family-name": {
			syntax: "<string> | <custom-ident>+",
		},
		"feature-tag-value": {
			syntax: "<string> [ <integer> | on | off ]?",
		},
		"feature-type": {
			syntax: "@stylistic | @historical-forms | @styleset | @character-variant | @swash | @ornaments | @annotation",
		},
		"feature-value-block": {
			syntax: "<feature-type> '{' <feature-value-declaration-list> '}'",
		},
		"feature-value-block-list": {
			syntax: "<feature-value-block>+",
		},
		"feature-value-declaration": {
			syntax: "<custom-ident>: <integer>+;",
		},
		"feature-value-declaration-list": {
			syntax: "<feature-value-declaration>",
		},
		"feature-value-name": {
			syntax: "<custom-ident>",
		},
		"fill-rule": {
			syntax: "nonzero | evenodd",
		},
		"filter-function": {
			syntax:
				"<blur()> | <brightness()> | <contrast()> | <drop-shadow()> | <grayscale()> | <hue-rotate()> | <invert()> | <opacity()> | <saturate()> | <sepia()>",
		},
		"filter-function-list": {
			syntax: "[ <filter-function> | <url> ]+",
		},
		"final-bg-layer": {
			syntax:
				"<'background-color'> || <bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>",
		},
		"fit-content()": {
			syntax: "fit-content( [ <length> | <percentage> ] )",
		},
		"fixed-breadth": {
			syntax: "<length-percentage>",
		},
		"fixed-repeat": {
			syntax: "repeat( [ <positive-integer> ] , [ <line-names>? <fixed-size> ]+ <line-names>? )",
		},
		"fixed-size": {
			syntax:
				"<fixed-breadth> | minmax( <fixed-breadth> , <track-breadth> ) | minmax( <inflexible-breadth> , <fixed-breadth> )",
		},
		"font-stretch-absolute": {
			syntax:
				"normal | ultra-condensed | extra-condensed | condensed | semi-condensed | semi-expanded | expanded | extra-expanded | ultra-expanded | <percentage>",
		},
		"font-variant-css21": {
			syntax: "[ normal | small-caps ]",
		},
		"font-weight-absolute": {
			syntax: "normal | bold | <number [1,1000]>",
		},
		"frequency-percentage": {
			syntax: "<frequency> | <percentage>",
		},
		"general-enclosed": {
			syntax: "[ <function-token> <any-value> ) ] | ( <ident> <any-value> )",
		},
		"generic-family": {
			syntax: "serif | sans-serif | cursive | fantasy | monospace",
		},
		"generic-name": {
			syntax: "serif | sans-serif | cursive | fantasy | monospace",
		},
		"geometry-box": {
			syntax: "<shape-box> | fill-box | stroke-box | view-box",
		},
		gradient: gradient,
		"grayscale()": {
			syntax: "grayscale( <number-percentage> )",
		},
		"grid-line": {
			syntax: "auto | <custom-ident> | [ <integer> && <custom-ident>? ] | [ span && [ <integer> || <custom-ident> ] ]",
		},
		"historical-lig-values": {
			syntax: "[ historical-ligatures | no-historical-ligatures ]",
		},
		"hsl()": {
			syntax:
				"hsl( <hue> <percentage> <percentage> [ / <alpha-value> ]? ) | hsl( <hue>, <percentage>, <percentage>, <alpha-value>? )",
		},
		"hsla()": {
			syntax:
				"hsla( <hue> <percentage> <percentage> [ / <alpha-value> ]? ) | hsla( <hue>, <percentage>, <percentage>, <alpha-value>? )",
		},
		hue: hue,
		"hue-rotate()": {
			syntax: "hue-rotate( <angle> )",
		},
		"id-selector": {
			syntax: "<hash-token>",
		},
		image: image,
		"image()": {
			syntax: "image( <image-tags>? [ <image-src>? , <color>? ]! )",
		},
		"image-set()": {
			syntax: "image-set( <image-set-option># )",
		},
		"image-set-option": {
			syntax: "[ <image> | <string> ] <resolution>",
		},
		"image-src": {
			syntax: "<url> | <string>",
		},
		"image-tags": {
			syntax: "ltr | rtl",
		},
		"inflexible-breadth": {
			syntax: "<length> | <percentage> | min-content | max-content | auto",
		},
		"inset()": {
			syntax: "inset( <length-percentage>{1,4} [ round <'border-radius'> ]? )",
		},
		"invert()": {
			syntax: "invert( <number-percentage> )",
		},
		"keyframes-name": {
			syntax: "<custom-ident> | <string>",
		},
		"keyframe-block": {
			syntax: "<keyframe-selector># {\n  <declaration-list>\n}",
		},
		"keyframe-block-list": {
			syntax: "<keyframe-block>+",
		},
		"keyframe-selector": {
			syntax: "from | to | <percentage>",
		},
		"leader()": {
			syntax: "leader( <leader-type> )",
		},
		"leader-type": {
			syntax: "dotted | solid | space | <string>",
		},
		"length-percentage": {
			syntax: "<length> | <percentage>",
		},
		"line-names": {
			syntax: "'[' <custom-ident>* ']'",
		},
		"line-name-list": {
			syntax: "[ <line-names> | <name-repeat> ]+",
		},
		"line-style": {
			syntax: "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset",
		},
		"line-width": {
			syntax: "<length> | thin | medium | thick",
		},
		"linear-color-hint": {
			syntax: "<length-percentage>",
		},
		"linear-color-stop": {
			syntax: "<color> <color-stop-length>?",
		},
		"linear-gradient()": {
			syntax: "linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )",
		},
		"mask-layer": {
			syntax:
				"<mask-reference> || <position> [ / <bg-size> ]? || <repeat-style> || <geometry-box> || [ <geometry-box> | no-clip ] || <compositing-operator> || <masking-mode>",
		},
		"mask-position": {
			syntax: "[ <length-percentage> | left | center | right ] [ <length-percentage> | top | center | bottom ]?",
		},
		"mask-reference": {
			syntax: "none | <image> | <mask-source>",
		},
		"mask-source": {
			syntax: "<url>",
		},
		"masking-mode": {
			syntax: "alpha | luminance | match-source",
		},
		"matrix()": {
			syntax: "matrix( <number>#{6} )",
		},
		"matrix3d()": {
			syntax: "matrix3d( <number>#{16} )",
		},
		"max()": {
			syntax: "max( <calc-sum># )",
		},
		"media-and": {
			syntax: "<media-in-parens> [ and <media-in-parens> ]+",
		},
		"media-condition": {
			syntax: "<media-not> | <media-and> | <media-or> | <media-in-parens>",
		},
		"media-condition-without-or": {
			syntax: "<media-not> | <media-and> | <media-in-parens>",
		},
		"media-feature": {
			syntax: "( [ <mf-plain> | <mf-boolean> | <mf-range> ] )",
		},
		"media-in-parens": {
			syntax: "( <media-condition> ) | <media-feature> | <general-enclosed>",
		},
		"media-not": {
			syntax: "not <media-in-parens>",
		},
		"media-or": {
			syntax: "<media-in-parens> [ or <media-in-parens> ]+",
		},
		"media-query": {
			syntax: "<media-condition> | [ not | only ]? <media-type> [ and <media-condition-without-or> ]?",
		},
		"media-query-list": {
			syntax: "<media-query>#",
		},
		"media-type": {
			syntax: "<ident>",
		},
		"mf-boolean": {
			syntax: "<mf-name>",
		},
		"mf-name": {
			syntax: "<ident>",
		},
		"mf-plain": {
			syntax: "<mf-name> : <mf-value>",
		},
		"mf-range": {
			syntax:
				"<mf-name> [ '<' | '>' ]? '='? <mf-value>\n| <mf-value> [ '<' | '>' ]? '='? <mf-name>\n| <mf-value> '<' '='? <mf-name> '<' '='? <mf-value>\n| <mf-value> '>' '='? <mf-name> '>' '='? <mf-value>",
		},
		"mf-value": {
			syntax: "<number> | <dimension> | <ident> | <ratio>",
		},
		"min()": {
			syntax: "min( <calc-sum># )",
		},
		"minmax()": {
			syntax:
				"minmax( [ <length> | <percentage> | min-content | max-content | auto ] , [ <length> | <percentage> | <flex> | min-content | max-content | auto ] )",
		},
		"named-color": {
			syntax:
				"transparent | aliceblue | antiquewhite | aqua | aquamarine | azure | beige | bisque | black | blanchedalmond | blue | blueviolet | brown | burlywood | cadetblue | chartreuse | chocolate | coral | cornflowerblue | cornsilk | crimson | cyan | darkblue | darkcyan | darkgoldenrod | darkgray | darkgreen | darkgrey | darkkhaki | darkmagenta | darkolivegreen | darkorange | darkorchid | darkred | darksalmon | darkseagreen | darkslateblue | darkslategray | darkslategrey | darkturquoise | darkviolet | deeppink | deepskyblue | dimgray | dimgrey | dodgerblue | firebrick | floralwhite | forestgreen | fuchsia | gainsboro | ghostwhite | gold | goldenrod | gray | green | greenyellow | grey | honeydew | hotpink | indianred | indigo | ivory | khaki | lavender | lavenderblush | lawngreen | lemonchiffon | lightblue | lightcoral | lightcyan | lightgoldenrodyellow | lightgray | lightgreen | lightgrey | lightpink | lightsalmon | lightseagreen | lightskyblue | lightslategray | lightslategrey | lightsteelblue | lightyellow | lime | limegreen | linen | magenta | maroon | mediumaquamarine | mediumblue | mediumorchid | mediumpurple | mediumseagreen | mediumslateblue | mediumspringgreen | mediumturquoise | mediumvioletred | midnightblue | mintcream | mistyrose | moccasin | navajowhite | navy | oldlace | olive | olivedrab | orange | orangered | orchid | palegoldenrod | palegreen | paleturquoise | palevioletred | papayawhip | peachpuff | peru | pink | plum | powderblue | purple | rebeccapurple | red | rosybrown | royalblue | saddlebrown | salmon | sandybrown | seagreen | seashell | sienna | silver | skyblue | slateblue | slategray | slategrey | snow | springgreen | steelblue | tan | teal | thistle | tomato | turquoise | violet | wheat | white | whitesmoke | yellow | yellowgreen",
		},
		"namespace-prefix": {
			syntax: "<ident>",
		},
		"ns-prefix": {
			syntax: "[ <ident-token> | '*' ]? '|'",
		},
		"number-percentage": {
			syntax: "<number> | <percentage>",
		},
		"numeric-figure-values": {
			syntax: "[ lining-nums | oldstyle-nums ]",
		},
		"numeric-fraction-values": {
			syntax: "[ diagonal-fractions | stacked-fractions ]",
		},
		"numeric-spacing-values": {
			syntax: "[ proportional-nums | tabular-nums ]",
		},
		nth: nth$1,
		"opacity()": {
			syntax: "opacity( [ <number-percentage> ] )",
		},
		"overflow-position": {
			syntax: "unsafe | safe",
		},
		"outline-radius": {
			syntax: "<length> | <percentage>",
		},
		"page-body": {
			syntax: "<declaration>? [ ; <page-body> ]? | <page-margin-box> <page-body>",
		},
		"page-margin-box": {
			syntax: "<page-margin-box-type> '{' <declaration-list> '}'",
		},
		"page-margin-box-type": {
			syntax:
				"@top-left-corner | @top-left | @top-center | @top-right | @top-right-corner | @bottom-left-corner | @bottom-left | @bottom-center | @bottom-right | @bottom-right-corner | @left-top | @left-middle | @left-bottom | @right-top | @right-middle | @right-bottom",
		},
		"page-selector-list": {
			syntax: "[ <page-selector># ]?",
		},
		"page-selector": {
			syntax: "<pseudo-page>+ | <ident> <pseudo-page>*",
		},
		"path()": {
			syntax: "path( [ <fill-rule>, ]? <string> )",
		},
		"paint()": {
			syntax: "paint( <ident>, <declaration-value>? )",
		},
		"perspective()": {
			syntax: "perspective( <length> )",
		},
		"polygon()": {
			syntax: "polygon( <fill-rule>? , [ <length-percentage> <length-percentage> ]# )",
		},
		position: position,
		"pseudo-class-selector": {
			syntax: "':' <ident-token> | ':' <function-token> <any-value> ')'",
		},
		"pseudo-element-selector": {
			syntax: "':' <pseudo-class-selector>",
		},
		"pseudo-page": {
			syntax: ": [ left | right | first | blank ]",
		},
		quote: quote,
		"radial-gradient()": {
			syntax: "radial-gradient( [ <ending-shape> || <size> ]? [ at <position> ]? , <color-stop-list> )",
		},
		"relative-selector": {
			syntax: "<combinator>? <complex-selector>",
		},
		"relative-selector-list": {
			syntax: "<relative-selector>#",
		},
		"relative-size": {
			syntax: "larger | smaller",
		},
		"repeat-style": {
			syntax: "repeat-x | repeat-y | [ repeat | space | round | no-repeat ]{1,2}",
		},
		"repeating-linear-gradient()": {
			syntax: "repeating-linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )",
		},
		"repeating-radial-gradient()": {
			syntax: "repeating-radial-gradient( [ <ending-shape> || <size> ]? [ at <position> ]? , <color-stop-list> )",
		},
		"rgb()": {
			syntax:
				"rgb( <percentage>{3} [ / <alpha-value> ]? ) | rgb( <number>{3} [ / <alpha-value> ]? ) | rgb( <percentage>#{3} , <alpha-value>? ) | rgb( <number>#{3} , <alpha-value>? )",
		},
		"rgba()": {
			syntax:
				"rgba( <percentage>{3} [ / <alpha-value> ]? ) | rgba( <number>{3} [ / <alpha-value> ]? ) | rgba( <percentage>#{3} , <alpha-value>? ) | rgba( <number>#{3} , <alpha-value>? )",
		},
		"rotate()": {
			syntax: "rotate( [ <angle> | <zero> ] )",
		},
		"rotate3d()": {
			syntax: "rotate3d( <number> , <number> , <number> , [ <angle> | <zero> ] )",
		},
		"rotateX()": {
			syntax: "rotateX( [ <angle> | <zero> ] )",
		},
		"rotateY()": {
			syntax: "rotateY( [ <angle> | <zero> ] )",
		},
		"rotateZ()": {
			syntax: "rotateZ( [ <angle> | <zero> ] )",
		},
		"saturate()": {
			syntax: "saturate( <number-percentage> )",
		},
		"scale()": {
			syntax: "scale( <number> , <number>? )",
		},
		"scale3d()": {
			syntax: "scale3d( <number> , <number> , <number> )",
		},
		"scaleX()": {
			syntax: "scaleX( <number> )",
		},
		"scaleY()": {
			syntax: "scaleY( <number> )",
		},
		"scaleZ()": {
			syntax: "scaleZ( <number> )",
		},
		"self-position": {
			syntax: "center | start | end | self-start | self-end | flex-start | flex-end",
		},
		"shape-radius": {
			syntax: "<length-percentage> | closest-side | farthest-side",
		},
		"skew()": {
			syntax: "skew( [ <angle> | <zero> ] , [ <angle> | <zero> ]? )",
		},
		"skewX()": {
			syntax: "skewX( [ <angle> | <zero> ] )",
		},
		"skewY()": {
			syntax: "skewY( [ <angle> | <zero> ] )",
		},
		"sepia()": {
			syntax: "sepia( <number-percentage> )",
		},
		shadow: shadow,
		"shadow-t": {
			syntax: "[ <length>{2,3} && <color>? ]",
		},
		shape: shape,
		"shape-box": {
			syntax: "<box> | margin-box",
		},
		"side-or-corner": {
			syntax: "[ left | right ] || [ top | bottom ]",
		},
		"single-animation": {
			syntax:
				"<time> || <timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state> || [ none | <keyframes-name> ]",
		},
		"single-animation-direction": {
			syntax: "normal | reverse | alternate | alternate-reverse",
		},
		"single-animation-fill-mode": {
			syntax: "none | forwards | backwards | both",
		},
		"single-animation-iteration-count": {
			syntax: "infinite | <number>",
		},
		"single-animation-play-state": {
			syntax: "running | paused",
		},
		"single-transition": {
			syntax: "[ none | <single-transition-property> ] || <time> || <timing-function> || <time>",
		},
		"single-transition-property": {
			syntax: "all | <custom-ident>",
		},
		size: size,
		"step-position": {
			syntax: "jump-start | jump-end | jump-none | jump-both | start | end",
		},
		"step-timing-function": {
			syntax: "step-start | step-end | steps(<integer>[, <step-position>]?)",
		},
		"subclass-selector": {
			syntax: "<id-selector> | <class-selector> | <attribute-selector> | <pseudo-class-selector>",
		},
		"supports-condition": {
			syntax:
				"not <supports-in-parens> | <supports-in-parens> [ and <supports-in-parens> ]* | <supports-in-parens> [ or <supports-in-parens> ]*",
		},
		"supports-in-parens": {
			syntax: "( <supports-condition> ) | <supports-feature> | <general-enclosed>",
		},
		"supports-feature": {
			syntax: "<supports-decl> | <supports-selector-fn>",
		},
		"supports-decl": {
			syntax: "( <declaration> )",
		},
		"supports-selector-fn": {
			syntax: "selector( <complex-selector> )",
		},
		symbol: symbol,
		target: target,
		"target-counter()": {
			syntax: "target-counter( [ <string> | <url> ] , <custom-ident> , <counter-style>? )",
		},
		"target-counters()": {
			syntax: "target-counters( [ <string> | <url> ] , <custom-ident> , <string> , <counter-style>? )",
		},
		"target-text()": {
			syntax: "target-text( [ <string> | <url> ] , [ content | before | after | first-letter ]? )",
		},
		"time-percentage": {
			syntax: "<time> | <percentage>",
		},
		"timing-function": {
			syntax: "linear | <cubic-bezier-timing-function> | <step-timing-function>",
		},
		"track-breadth": {
			syntax: "<length-percentage> | <flex> | min-content | max-content | auto",
		},
		"track-list": {
			syntax: "[ <line-names>? [ <track-size> | <track-repeat> ] ]+ <line-names>?",
		},
		"track-repeat": {
			syntax: "repeat( [ <positive-integer> ] , [ <line-names>? <track-size> ]+ <line-names>? )",
		},
		"track-size": {
			syntax:
				"<track-breadth> | minmax( <inflexible-breadth> , <track-breadth> ) | fit-content( [ <length> | <percentage> ] )",
		},
		"transform-function": {
			syntax:
				"<matrix()> | <translate()> | <translateX()> | <translateY()> | <scale()> | <scaleX()> | <scaleY()> | <rotate()> | <skew()> | <skewX()> | <skewY()> | <matrix3d()> | <translate3d()> | <translateZ()> | <scale3d()> | <scaleZ()> | <rotate3d()> | <rotateX()> | <rotateY()> | <rotateZ()> | <perspective()>",
		},
		"transform-list": {
			syntax: "<transform-function>+",
		},
		"translate()": {
			syntax: "translate( <length-percentage> , <length-percentage>? )",
		},
		"translate3d()": {
			syntax: "translate3d( <length-percentage> , <length-percentage> , <length> )",
		},
		"translateX()": {
			syntax: "translateX( <length-percentage> )",
		},
		"translateY()": {
			syntax: "translateY( <length-percentage> )",
		},
		"translateZ()": {
			syntax: "translateZ( <length> )",
		},
		"type-or-unit": {
			syntax:
				"string | color | url | integer | number | length | angle | time | frequency | cap | ch | em | ex | ic | lh | rlh | rem | vb | vi | vw | vh | vmin | vmax | mm | Q | cm | in | pt | pc | px | deg | grad | rad | turn | ms | s | Hz | kHz | %",
		},
		"type-selector": {
			syntax: "<wq-name> | <ns-prefix>? '*'",
		},
		"var()": {
			syntax: "var( <custom-property-name> , <declaration-value>? )",
		},
		"viewport-length": {
			syntax: "auto | <length-percentage>",
		},
		"wq-name": {
			syntax: "<ns-prefix>? <ident-token>",
		},
	};

	var atrules = {
		charset: {
			prelude: "<string>",
		},
		"font-face": {
			descriptors: {
				"unicode-range": {
					comment: "replaces <unicode-range>, an old production name",
					syntax: "<urange>#",
				},
			},
		},
	};
	var properties = {
		"-moz-background-clip": {
			comment: "deprecated syntax in old Firefox, https://developer.mozilla.org/en/docs/Web/CSS/background-clip",
			syntax: "padding | border",
		},
		"-moz-border-radius-bottomleft": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-left-radius",
			syntax: "<'border-bottom-left-radius'>",
		},
		"-moz-border-radius-bottomright": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-right-radius",
			syntax: "<'border-bottom-right-radius'>",
		},
		"-moz-border-radius-topleft": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-left-radius",
			syntax: "<'border-top-left-radius'>",
		},
		"-moz-border-radius-topright": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-right-radius",
			syntax: "<'border-bottom-right-radius'>",
		},
		"-moz-control-character-visibility": {
			comment: "firefox specific keywords, https://bugzilla.mozilla.org/show_bug.cgi?id=947588",
			syntax: "visible | hidden",
		},
		"-moz-osx-font-smoothing": {
			comment: "misssed old syntax https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
			syntax: "auto | grayscale",
		},
		"-moz-user-select": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/user-select",
			syntax: "none | text | all | -moz-none",
		},
		"-ms-flex-align": {
			comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-align",
			syntax: "start | end | center | baseline | stretch",
		},
		"-ms-flex-item-align": {
			comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-align",
			syntax: "auto | start | end | center | baseline | stretch",
		},
		"-ms-flex-line-pack": {
			comment:
				"misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-line-pack",
			syntax: "start | end | center | justify | distribute | stretch",
		},
		"-ms-flex-negative": {
			comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
			syntax: "<'flex-shrink'>",
		},
		"-ms-flex-pack": {
			comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-pack",
			syntax: "start | end | center | justify | distribute",
		},
		"-ms-flex-order": {
			comment: "misssed old syntax implemented in IE; https://msdn.microsoft.com/en-us/library/jj127303(v=vs.85).aspx",
			syntax: "<integer>",
		},
		"-ms-flex-positive": {
			comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
			syntax: "<'flex-grow'>",
		},
		"-ms-flex-preferred-size": {
			comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
			syntax: "<'flex-basis'>",
		},
		"-ms-interpolation-mode": {
			comment: "https://msdn.microsoft.com/en-us/library/ff521095(v=vs.85).aspx",
			syntax: "nearest-neighbor | bicubic",
		},
		"-ms-grid-column-align": {
			comment:
				"add this property first since it uses as fallback for flexbox, https://msdn.microsoft.com/en-us/library/windows/apps/hh466338.aspx",
			syntax: "start | end | center | stretch",
		},
		"-ms-grid-row-align": {
			comment:
				"add this property first since it uses as fallback for flexbox, https://msdn.microsoft.com/en-us/library/windows/apps/hh466348.aspx",
			syntax: "start | end | center | stretch",
		},
		"-ms-hyphenate-limit-last": {
			comment: "misssed old syntax implemented in IE; https://www.w3.org/TR/css-text-4/#hyphenate-line-limits",
			syntax: "none | always | column | page | spread",
		},
		"-webkit-appearance": {
			comment: "webkit specific keywords",
			references: ["http://css-infos.net/property/-webkit-appearance"],
			syntax:
				"none | button | button-bevel | caps-lock-indicator | caret | checkbox | default-button | inner-spin-button | listbox | listitem | media-controls-background | media-controls-fullscreen-background | media-current-time-display | media-enter-fullscreen-button | media-exit-fullscreen-button | media-fullscreen-button | media-mute-button | media-overlay-play-button | media-play-button | media-seek-back-button | media-seek-forward-button | media-slider | media-sliderthumb | media-time-remaining-display | media-toggle-closed-captions-button | media-volume-slider | media-volume-slider-container | media-volume-sliderthumb | menulist | menulist-button | menulist-text | menulist-textfield | meter | progress-bar | progress-bar-value | push-button | radio | scrollbarbutton-down | scrollbarbutton-left | scrollbarbutton-right | scrollbarbutton-up | scrollbargripper-horizontal | scrollbargripper-vertical | scrollbarthumb-horizontal | scrollbarthumb-vertical | scrollbartrack-horizontal | scrollbartrack-vertical | searchfield | searchfield-cancel-button | searchfield-decoration | searchfield-results-button | searchfield-results-decoration | slider-horizontal | slider-vertical | sliderthumb-horizontal | sliderthumb-vertical | square-button | textarea | textfield | -apple-pay-button",
		},
		"-webkit-background-clip": {
			comment: "https://developer.mozilla.org/en/docs/Web/CSS/background-clip",
			syntax: "[ <box> | border | padding | content | text ]#",
		},
		"-webkit-column-break-after": {
			comment: "added, http://help.dottoro.com/lcrthhhv.php",
			syntax: "always | auto | avoid",
		},
		"-webkit-column-break-before": {
			comment: "added, http://help.dottoro.com/lcxquvkf.php",
			syntax: "always | auto | avoid",
		},
		"-webkit-column-break-inside": {
			comment: "added, http://help.dottoro.com/lclhnthl.php",
			syntax: "always | auto | avoid",
		},
		"-webkit-font-smoothing": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
			syntax: "auto | none | antialiased | subpixel-antialiased",
		},
		"-webkit-mask-box-image": {
			comment: "missed; https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-mask-box-image",
			syntax: "[ <url> | <gradient> | none ] [ <length-percentage>{4} <-webkit-mask-box-repeat>{2} ]?",
		},
		"-webkit-print-color-adjust": {
			comment: "missed",
			references: ["https://developer.mozilla.org/en/docs/Web/CSS/-webkit-print-color-adjust"],
			syntax: "economy | exact",
		},
		"-webkit-text-security": {
			comment: "missed; http://help.dottoro.com/lcbkewgt.php",
			syntax: "none | circle | disc | square",
		},
		"-webkit-user-drag": {
			comment: "missed; http://help.dottoro.com/lcbixvwm.php",
			syntax: "none | element | auto",
		},
		"-webkit-user-select": {
			comment: "auto is supported by old webkit, https://developer.mozilla.org/en-US/docs/Web/CSS/user-select",
			syntax: "auto | none | text | all",
		},
		"alignment-baseline": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#AlignmentBaselineProperty"],
			syntax:
				"auto | baseline | before-edge | text-before-edge | middle | central | after-edge | text-after-edge | ideographic | alphabetic | hanging | mathematical",
		},
		"baseline-shift": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#BaselineShiftProperty"],
			syntax: "baseline | sub | super | <svg-length>",
		},
		behavior: {
			comment: "added old IE property https://msdn.microsoft.com/en-us/library/ms530723(v=vs.85).aspx",
			syntax: "<url>+",
		},
		"clip-rule": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/masking.html#ClipRuleProperty"],
			syntax: "nonzero | evenodd",
		},
		cue: {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<'cue-before'> <'cue-after'>?",
		},
		"cue-after": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<url> <decibel>? | none",
		},
		"cue-before": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<url> <decibel>? | none",
		},
		cursor: {
			comment:
				"added legacy keywords: hand, -webkit-grab. -webkit-grabbing, -webkit-zoom-in, -webkit-zoom-out, -moz-grab, -moz-grabbing, -moz-zoom-in, -moz-zoom-out",
			references: ["https://www.sitepoint.com/css3-cursor-styles/"],
			syntax:
				"[ [ <url> [ <x> <y> ]? , ]* [ auto | default | none | context-menu | help | pointer | progress | wait | cell | crosshair | text | vertical-text | alias | copy | move | no-drop | not-allowed | e-resize | n-resize | ne-resize | nw-resize | s-resize | se-resize | sw-resize | w-resize | ew-resize | ns-resize | nesw-resize | nwse-resize | col-resize | row-resize | all-scroll | zoom-in | zoom-out | grab | grabbing | hand | -webkit-grab | -webkit-grabbing | -webkit-zoom-in | -webkit-zoom-out | -moz-grab | -moz-grabbing | -moz-zoom-in | -moz-zoom-out ] ]",
		},
		display: {
			comment: "extended with -ms-flexbox",
			syntax: "| <-non-standard-display>",
		},
		position: {
			comment: "extended with -webkit-sticky",
			syntax: "| -webkit-sticky",
		},
		"dominant-baseline": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#DominantBaselineProperty"],
			syntax:
				"auto | use-script | no-change | reset-size | ideographic | alphabetic | hanging | mathematical | central | middle | text-after-edge | text-before-edge",
		},
		"image-rendering": {
			comment: "extended with <-non-standard-image-rendering>, added SVG keywords optimizeSpeed and optimizeQuality",
			references: [
				"https://developer.mozilla.org/en/docs/Web/CSS/image-rendering",
				"https://www.w3.org/TR/SVG/painting.html#ImageRenderingProperty",
			],
			syntax: "| optimizeSpeed | optimizeQuality | <-non-standard-image-rendering>",
		},
		fill: {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#FillProperty"],
			syntax: "<paint>",
		},
		"fill-opacity": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#FillProperty"],
			syntax: "<number-zero-one>",
		},
		"fill-rule": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#FillProperty"],
			syntax: "nonzero | evenodd",
		},
		filter: {
			comment: "extend with IE legacy syntaxes",
			syntax: "| <-ms-filter-function-list>",
		},
		"glyph-orientation-horizontal": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#GlyphOrientationHorizontalProperty"],
			syntax: "<angle>",
		},
		"glyph-orientation-vertical": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#GlyphOrientationVerticalProperty"],
			syntax: "<angle>",
		},
		kerning: {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#KerningProperty"],
			syntax: "auto | <svg-length>",
		},
		"letter-spacing": {
			comment: "fix syntax <length> -> <length-percentage>",
			references: ["https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/letter-spacing"],
			syntax: "normal | <length-percentage>",
		},
		marker: {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#MarkerProperties"],
			syntax: "none | <url>",
		},
		"marker-end": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#MarkerProperties"],
			syntax: "none | <url>",
		},
		"marker-mid": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#MarkerProperties"],
			syntax: "none | <url>",
		},
		"marker-start": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#MarkerProperties"],
			syntax: "none | <url>",
		},
		"max-width": {
			comment:
				"fix auto -> none (https://github.com/mdn/data/pull/431); extend by non-standard width keywords https://developer.mozilla.org/en-US/docs/Web/CSS/max-width",
			syntax:
				"none | <length-percentage> | min-content | max-content | fit-content(<length-percentage>) | <-non-standard-width>",
		},
		width: {
			comment:
				"per spec fit-content should be a function, however browsers are supporting it as a keyword (https://github.com/csstree/stylelint-validator/issues/29)",
			syntax: "| fit-content | -moz-fit-content | -webkit-fit-content",
		},
		"min-width": {
			comment: "extend by non-standard width keywords https://developer.mozilla.org/en-US/docs/Web/CSS/width",
			syntax:
				"auto | <length-percentage> | min-content | max-content | fit-content(<length-percentage>) | <-non-standard-width>",
		},
		overflow: {
			comment: "extend by vendor keywords https://developer.mozilla.org/en-US/docs/Web/CSS/overflow",
			syntax: "| <-non-standard-overflow>",
		},
		pause: {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<'pause-before'> <'pause-after'>?",
		},
		"pause-after": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<time> | none | x-weak | weak | medium | strong | x-strong",
		},
		"pause-before": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<time> | none | x-weak | weak | medium | strong | x-strong",
		},
		rest: {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<'rest-before'> <'rest-after'>?",
		},
		"rest-after": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<time> | none | x-weak | weak | medium | strong | x-strong",
		},
		"rest-before": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<time> | none | x-weak | weak | medium | strong | x-strong",
		},
		"shape-rendering": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#ShapeRenderingPropert"],
			syntax: "auto | optimizeSpeed | crispEdges | geometricPrecision",
		},
		src: {
			comment: "added @font-face's src property https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src",
			syntax: "[ <url> [ format( <string># ) ]? | local( <family-name> ) ]#",
		},
		speak: {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "auto | none | normal",
		},
		"speak-as": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "normal | spell-out || digits || [ literal-punctuation | no-punctuation ]",
		},
		stroke: {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "<paint>",
		},
		"stroke-dasharray": {
			comment: "added SVG property; a list of comma and/or white space separated <length>s and <percentage>s",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "none | [ <svg-length>+ ]#",
		},
		"stroke-dashoffset": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "<svg-length>",
		},
		"stroke-linecap": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "butt | round | square",
		},
		"stroke-linejoin": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "miter | round | bevel",
		},
		"stroke-miterlimit": {
			comment: "added SVG property (<miterlimit> = <number-one-or-greater>) ",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "<number-one-or-greater>",
		},
		"stroke-opacity": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "<number-zero-one>",
		},
		"stroke-width": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/painting.html#StrokeProperties"],
			syntax: "<svg-length>",
		},
		"text-anchor": {
			comment: "added SVG property",
			references: ["https://www.w3.org/TR/SVG/text.html#TextAlignmentProperties"],
			syntax: "start | middle | end",
		},
		"unicode-bidi": {
			comment: "added prefixed keywords https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi",
			syntax:
				"| -moz-isolate | -moz-isolate-override | -moz-plaintext | -webkit-isolate | -webkit-isolate-override | -webkit-plaintext",
		},
		"unicode-range": {
			comment: "added missed property https://developer.mozilla.org/en-US/docs/Web/CSS/%40font-face/unicode-range",
			syntax: "<urange>#",
		},
		"voice-balance": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "<number> | left | center | right | leftwards | rightwards",
		},
		"voice-duration": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "auto | <time>",
		},
		"voice-family": {
			comment: "<name> -> <family-name>, https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "[ [ <family-name> | <generic-voice> ] , ]* [ <family-name> | <generic-voice> ] | preserve",
		},
		"voice-pitch": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax:
				"<frequency> && absolute | [ [ x-low | low | medium | high | x-high ] || [ <frequency> | <semitones> | <percentage> ] ]",
		},
		"voice-range": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax:
				"<frequency> && absolute | [ [ x-low | low | medium | high | x-high ] || [ <frequency> | <semitones> | <percentage> ] ]",
		},
		"voice-rate": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "[ normal | x-slow | slow | medium | fast | x-fast ] || <percentage>",
		},
		"voice-stress": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "normal | strong | moderate | none | reduced",
		},
		"voice-volume": {
			comment: "https://www.w3.org/TR/css3-speech/#property-index",
			syntax: "silent | [ [ x-soft | soft | medium | loud | x-loud ] || <decibel> ]",
		},
		"writing-mode": {
			comment: "extend with SVG keywords",
			syntax: "| <svg-writing-mode>",
		},
	};
	var syntaxes = {
		"-legacy-gradient": {
			comment: "added collection of legacy gradient syntaxes",
			syntax:
				"<-webkit-gradient()> | <-legacy-linear-gradient> | <-legacy-repeating-linear-gradient> | <-legacy-radial-gradient> | <-legacy-repeating-radial-gradient>",
		},
		"-legacy-linear-gradient": {
			comment:
				"like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
			syntax:
				"-moz-linear-gradient( <-legacy-linear-gradient-arguments> ) | -webkit-linear-gradient( <-legacy-linear-gradient-arguments> ) | -o-linear-gradient( <-legacy-linear-gradient-arguments> )",
		},
		"-legacy-repeating-linear-gradient": {
			comment:
				"like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
			syntax:
				"-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> ) | -webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> ) | -o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )",
		},
		"-legacy-linear-gradient-arguments": {
			comment:
				"like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
			syntax: "[ <angle> | <side-or-corner> ]? , <color-stop-list>",
		},
		"-legacy-radial-gradient": {
			comment:
				"deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
			syntax:
				"-moz-radial-gradient( <-legacy-radial-gradient-arguments> ) | -webkit-radial-gradient( <-legacy-radial-gradient-arguments> ) | -o-radial-gradient( <-legacy-radial-gradient-arguments> )",
		},
		"-legacy-repeating-radial-gradient": {
			comment:
				"deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
			syntax:
				"-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> ) | -webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> ) | -o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )",
		},
		"-legacy-radial-gradient-arguments": {
			comment:
				"deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
			syntax:
				"[ <position> , ]? [ [ [ <-legacy-radial-gradient-shape> || <-legacy-radial-gradient-size> ] | [ <length> | <percentage> ]{2} ] , ]? <color-stop-list>",
		},
		"-legacy-radial-gradient-size": {
			comment:
				"before a standard it contains 2 extra keywords (`contain` and `cover`) https://www.w3.org/TR/2011/WD-css3-images-20110908/#ltsize",
			syntax: "closest-side | closest-corner | farthest-side | farthest-corner | contain | cover",
		},
		"-legacy-radial-gradient-shape": {
			comment:
				"define to double sure it doesn't extends in future https://www.w3.org/TR/2011/WD-css3-images-20110908/#ltshape",
			syntax: "circle | ellipse",
		},
		"-non-standard-font": {
			comment: "non standard fonts",
			references: ["https://webkit.org/blog/3709/using-the-system-font-in-web-content/"],
			syntax:
				"-apple-system-body | -apple-system-headline | -apple-system-subheadline | -apple-system-caption1 | -apple-system-caption2 | -apple-system-footnote | -apple-system-short-body | -apple-system-short-headline | -apple-system-short-subheadline | -apple-system-short-caption1 | -apple-system-short-footnote | -apple-system-tall-body",
		},
		"-non-standard-color": {
			comment: "non standard colors",
			references: [
				"http://cssdot.ru/%D0%A1%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA_CSS/color-i305.html",
				"https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Mozilla_Color_Preference_Extensions",
			],
			syntax:
				"-moz-ButtonDefault | -moz-ButtonHoverFace | -moz-ButtonHoverText | -moz-CellHighlight | -moz-CellHighlightText | -moz-Combobox | -moz-ComboboxText | -moz-Dialog | -moz-DialogText | -moz-dragtargetzone | -moz-EvenTreeRow | -moz-Field | -moz-FieldText | -moz-html-CellHighlight | -moz-html-CellHighlightText | -moz-mac-accentdarkestshadow | -moz-mac-accentdarkshadow | -moz-mac-accentface | -moz-mac-accentlightesthighlight | -moz-mac-accentlightshadow | -moz-mac-accentregularhighlight | -moz-mac-accentregularshadow | -moz-mac-chrome-active | -moz-mac-chrome-inactive | -moz-mac-focusring | -moz-mac-menuselect | -moz-mac-menushadow | -moz-mac-menutextselect | -moz-MenuHover | -moz-MenuHoverText | -moz-MenuBarText | -moz-MenuBarHoverText | -moz-nativehyperlinktext | -moz-OddTreeRow | -moz-win-communicationstext | -moz-win-mediatext | -moz-activehyperlinktext | -moz-default-background-color | -moz-default-color | -moz-hyperlinktext | -moz-visitedhyperlinktext | -webkit-activelink | -webkit-focus-ring-color | -webkit-link | -webkit-text",
		},
		"-non-standard-image-rendering": {
			comment: "non-standard keywords http://phrogz.net/tmp/canvas_image_zoom.html",
			syntax: "optimize-contrast | -moz-crisp-edges | -o-crisp-edges | -webkit-optimize-contrast",
		},
		"-non-standard-overflow": {
			comment: "non-standard keywords https://developer.mozilla.org/en-US/docs/Web/CSS/overflow",
			syntax: "-moz-scrollbars-none | -moz-scrollbars-horizontal | -moz-scrollbars-vertical | -moz-hidden-unscrollable",
		},
		"-non-standard-width": {
			comment: "non-standard keywords https://developer.mozilla.org/en-US/docs/Web/CSS/width",
			syntax:
				"fill-available | min-intrinsic | intrinsic | -moz-available | -moz-fit-content | -moz-min-content | -moz-max-content | -webkit-min-content | -webkit-max-content",
		},
		"-webkit-gradient()": {
			comment:
				"first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/ - TODO: simplify when after match algorithm improvement ( [, point, radius | , point] -> [, radius]? , point )",
			syntax:
				"-webkit-gradient( <-webkit-gradient-type>, <-webkit-gradient-point> [, <-webkit-gradient-point> | , <-webkit-gradient-radius>, <-webkit-gradient-point> ] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )",
		},
		"-webkit-gradient-color-stop": {
			comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
			syntax: "from( <color> ) | color-stop( [ <number-zero-one> | <percentage> ] , <color> ) | to( <color> )",
		},
		"-webkit-gradient-point": {
			comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
			syntax: "[ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ]",
		},
		"-webkit-gradient-radius": {
			comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
			syntax: "<length> | <percentage>",
		},
		"-webkit-gradient-type": {
			comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
			syntax: "linear | radial",
		},
		"-webkit-mask-box-repeat": {
			comment: "missed; https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-mask-box-image",
			syntax: "repeat | stretch | round",
		},
		"-webkit-mask-clip-style": {
			comment:
				"missed; there is no enough information about `-webkit-mask-clip` property, but looks like all those keywords are working",
			syntax: "border | border-box | padding | padding-box | content | content-box | text",
		},
		"-ms-filter-function-list": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-filter",
			syntax: "<-ms-filter-function>+",
		},
		"-ms-filter-function": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-filter",
			syntax: "<-ms-filter-function-progid> | <-ms-filter-function-legacy>",
		},
		"-ms-filter-function-progid": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-filter",
			syntax: "'progid:' [ <ident-token> '.' ]* [ <ident-token> | <function-token> <any-value>? ) ]",
		},
		"-ms-filter-function-legacy": {
			comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-filter",
			syntax: "<ident-token> | <function-token> <any-value>? )",
		},
		"-ms-filter": {
			syntax: "<string>",
		},
		age: {
			comment: "https://www.w3.org/TR/css3-speech/#voice-family",
			syntax: "child | young | old",
		},
		"attr-name": {
			syntax: "<wq-name>",
		},
		"attr-fallback": {
			syntax: "<any-value>",
		},
		"border-radius": {
			comment: "missed, https://drafts.csswg.org/css-backgrounds-3/#the-border-radius",
			syntax: "<length-percentage>{1,2}",
		},
		bottom: {
			comment:
				"missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
			syntax: "<length> | auto",
		},
		"content-list": {
			comment:
				"missed -> https://drafts.csswg.org/css-content/#typedef-content-list (document-url, <target> and leader() is omitted util stabilization)",
			syntax:
				"[ <string> | contents | <image> | <quote> | <target> | <leader()> | <attr()> | counter( <ident>, <'list-style-type'>? ) ]+",
		},
		"element()": {
			comment:
				"https://drafts.csswg.org/css-gcpm/#element-syntax & https://drafts.csswg.org/css-images-4/#element-notation",
			syntax: "element( <custom-ident> , [ first | start | last | first-except ]? ) | element( <id-selector> )",
		},
		"generic-voice": {
			comment: "https://www.w3.org/TR/css3-speech/#voice-family",
			syntax: "[ <age>? <gender> <integer>? ]",
		},
		gender: {
			comment: "https://www.w3.org/TR/css3-speech/#voice-family",
			syntax: "male | female | neutral",
		},
		"generic-family": {
			comment: "added -apple-system",
			references: ["https://webkit.org/blog/3709/using-the-system-font-in-web-content/"],
			syntax: "| -apple-system",
		},
		gradient: {
			comment: "added legacy syntaxes support",
			syntax: "| <-legacy-gradient>",
		},
		left: {
			comment:
				"missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
			syntax: "<length> | auto",
		},
		"mask-image": {
			comment: "missed; https://drafts.fxtf.org/css-masking-1/#the-mask-image",
			syntax: "<mask-reference>#",
		},
		"name-repeat": {
			comment:
				"missed, and looks like obsolete, keep it as is since other property syntaxes should be changed too; https://www.w3.org/TR/2015/WD-css-grid-1-20150917/#typedef-name-repeat",
			syntax: "repeat( [ <positive-integer> | auto-fill ], <line-names>+)",
		},
		"named-color": {
			comment: "added non standard color names",
			syntax: "| <-non-standard-color>",
		},
		paint: {
			comment: "used by SVG https://www.w3.org/TR/SVG/painting.html#SpecifyingPaint",
			syntax: "none | <color> | <url> [ none | <color> ]? | context-fill | context-stroke",
		},
		"page-size": {
			comment: "https://www.w3.org/TR/css-page-3/#typedef-page-size-page-size",
			syntax: "A5 | A4 | A3 | B5 | B4 | JIS-B5 | JIS-B4 | letter | legal | ledger",
		},
		ratio: {
			comment: "missed, https://drafts.csswg.org/mediaqueries-4/#typedef-ratio",
			syntax: "<integer> / <integer>",
		},
		right: {
			comment:
				"missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
			syntax: "<length> | auto",
		},
		shape: {
			comment: "missed spaces in function body and add backwards compatible syntax",
			syntax: "rect( <top>, <right>, <bottom>, <left> ) | rect( <top> <right> <bottom> <left> )",
		},
		"svg-length": {
			comment: "All coordinates and lengths in SVG can be specified with or without a unit identifier",
			references: ["https://www.w3.org/TR/SVG11/coords.html#Units"],
			syntax: "<percentage> | <length> | <number>",
		},
		"svg-writing-mode": {
			comment: "SVG specific keywords (deprecated for CSS)",
			references: [
				"https://developer.mozilla.org/en/docs/Web/CSS/writing-mode",
				"https://www.w3.org/TR/SVG/text.html#WritingModeProperty",
			],
			syntax: "lr-tb | rl-tb | tb-rl | lr | rl | tb",
		},
		top: {
			comment:
				"missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
			syntax: "<length> | auto",
		},
		"track-group": {
			comment: "used by old grid-columns and grid-rows syntax v0",
			syntax: "'(' [ <string>* <track-minmax> <string>* ]+ ')' [ '[' <positive-integer> ']' ]? | <track-minmax>",
		},
		"track-list-v0": {
			comment: "used by old grid-columns and grid-rows syntax v0",
			syntax: "[ <string>* <track-group> <string>* ]+ | none",
		},
		"track-minmax": {
			comment: "used by old grid-columns and grid-rows syntax v0",
			syntax: "minmax( <track-breadth> , <track-breadth> ) | auto | <track-breadth> | fit-content",
		},
		x: {
			comment:
				"missed; not sure we should add it, but no others except `cursor` is using it so it's ok for now; https://drafts.csswg.org/css-ui-3/#cursor",
			syntax: "<number>",
		},
		y: {
			comment:
				"missed; not sure we should add it, but no others except `cursor` is using so it's ok for now; https://drafts.csswg.org/css-ui-3/#cursor",
			syntax: "<number>",
		},
		declaration: {
			comment: "missed, restored by https://drafts.csswg.org/css-syntax",
			syntax: "<ident-token> : <declaration-value>? [ '!' important ]?",
		},
		"declaration-list": {
			comment: "missed, restored by https://drafts.csswg.org/css-syntax",
			syntax: "[ <declaration>? ';' ]* <declaration>?",
		},
		url: {
			comment: "https://drafts.csswg.org/css-values-4/#urls",
			syntax: "url( <string> <url-modifier>* ) | <url-token>",
		},
		"url-modifier": {
			comment: "https://drafts.csswg.org/css-values-4/#typedef-url-modifier",
			syntax: "<ident> | <function-token> <any-value> )",
		},
		"number-zero-one": {
			syntax: "<number [0,1]>",
		},
		"number-one-or-greater": {
			syntax: "<number [1,∞]>",
		},
		"positive-integer": {
			syntax: "<integer [0,∞]>",
		},
		"-non-standard-display": {
			syntax:
				"-ms-inline-flexbox | -ms-grid | -ms-inline-grid | -webkit-flex | -webkit-inline-flex | -webkit-box | -webkit-inline-box | -moz-inline-stack | -moz-box | -moz-inline-box",
		},
	};
	var require$$3 = {
		atrules: atrules,
		properties: properties,
		syntaxes: syntaxes,
	};

	const mdnAtrules = require$$0;
	const mdnProperties = require$$1;
	const mdnSyntaxes = require$$2;
	const patch = require$$3;
	const extendSyntax = /^\s*\|\s*/;

	function preprocessAtrules(dict) {
		const result = Object.create(null);

		for (const atruleName in dict) {
			const atrule = dict[atruleName];
			let descriptors = null;

			if (atrule.descriptors) {
				descriptors = Object.create(null);

				for (const descriptor in atrule.descriptors) {
					descriptors[descriptor] = atrule.descriptors[descriptor].syntax;
				}
			}

			result[atruleName.substr(1)] = {
				prelude:
					atrule.syntax
						.trim()
						.match(/^@\S+\s+([^;{]*)/)[1]
						.trim() || null,
				descriptors,
			};
		}

		return result;
	}

	function patchDictionary(dict, patchDict) {
		const result = {};

		// copy all syntaxes for an original dict
		for (const key in dict) {
			result[key] = dict[key].syntax || dict[key];
		}

		// apply a patch
		for (const key in patchDict) {
			if (key in dict) {
				if (patchDict[key].syntax) {
					result[key] = extendSyntax.test(patchDict[key].syntax)
						? `${result[key]} ${patchDict[key].syntax.trim()}`
						: patchDict[key].syntax;
				} else {
					delete result[key];
				}
			} else {
				if (patchDict[key].syntax) {
					result[key] = patchDict[key].syntax.replace(extendSyntax, "");
				}
			}
		}

		return result;
	}

	function unpackSyntaxes(dict) {
		const result = {};

		for (const key in dict) {
			result[key] = dict[key].syntax;
		}

		return result;
	}

	function patchAtrules(dict, patchDict) {
		const result = {};

		// copy all syntaxes for an original dict
		for (const key in dict) {
			const patchDescriptors = patchDict[key]?.descriptors || null;

			result[key] = {
				prelude: key in patchDict && "prelude" in patchDict[key] ? patchDict[key].prelude : dict[key].prelude || null,
				descriptors: dict[key].descriptors
					? patchDictionary(dict[key].descriptors, patchDescriptors || {})
					: patchDescriptors && unpackSyntaxes(patchDescriptors),
			};
		}

		// apply a patch
		for (const key in patchDict) {
			if (!hasOwnProperty.call(dict, key)) {
				result[key] = {
					prelude: patchDict[key].prelude || null,
					descriptors: patchDict[key].descriptors && unpackSyntaxes(patchDict[key].descriptors),
				};
			}
		}

		return result;
	}

	var data$1 = {
		types: patchDictionary(mdnSyntaxes, patch.syntaxes),
		atrules: patchAtrules(preprocessAtrules(mdnAtrules), patch.atrules),
		properties: patchDictionary(mdnProperties, patch.properties),
	};

	var cmpChar$2 = tokenizer$3.cmpChar;
	var isDigit$1 = tokenizer$3.isDigit;
	var TYPE$y = tokenizer$3.TYPE;

	var WHITESPACE$8 = TYPE$y.WhiteSpace;
	var COMMENT$6 = TYPE$y.Comment;
	var IDENT$f = TYPE$y.Ident;
	var NUMBER$6 = TYPE$y.Number;
	var DIMENSION$5 = TYPE$y.Dimension;
	var PLUSSIGN$5 = 0x002b; // U+002B PLUS SIGN (+)
	var HYPHENMINUS$2 = 0x002d; // U+002D HYPHEN-MINUS (-)
	var N = 0x006e; // U+006E LATIN SMALL LETTER N (n)
	var DISALLOW_SIGN = true;
	var ALLOW_SIGN = false;

	function checkInteger(offset, disallowSign) {
		var pos = this.scanner.tokenStart + offset;
		var code = this.scanner.source.charCodeAt(pos);

		if (code === PLUSSIGN$5 || code === HYPHENMINUS$2) {
			if (disallowSign) {
				this.error("Number sign is not allowed");
			}
			pos++;
		}

		for (; pos < this.scanner.tokenEnd; pos++) {
			if (!isDigit$1(this.scanner.source.charCodeAt(pos))) {
				this.error("Integer is expected", pos);
			}
		}
	}

	function checkTokenIsInteger(disallowSign) {
		return checkInteger.call(this, 0, disallowSign);
	}

	function expectCharCode(offset, code) {
		if (!cmpChar$2(this.scanner.source, this.scanner.tokenStart + offset, code)) {
			var msg = "";

			switch (code) {
				case N:
					msg = "N is expected";
					break;
				case HYPHENMINUS$2:
					msg = "HyphenMinus is expected";
					break;
			}

			this.error(msg, this.scanner.tokenStart + offset);
		}
	}

	// ... <signed-integer>
	// ... ['+' | '-'] <signless-integer>
	function consumeB() {
		var offset = 0;
		var sign = 0;
		var type = this.scanner.tokenType;

		while (type === WHITESPACE$8 || type === COMMENT$6) {
			type = this.scanner.lookupType(++offset);
		}

		if (type !== NUMBER$6) {
			if (this.scanner.isDelim(PLUSSIGN$5, offset) || this.scanner.isDelim(HYPHENMINUS$2, offset)) {
				sign = this.scanner.isDelim(PLUSSIGN$5, offset) ? PLUSSIGN$5 : HYPHENMINUS$2;

				do {
					type = this.scanner.lookupType(++offset);
				} while (type === WHITESPACE$8 || type === COMMENT$6);

				if (type !== NUMBER$6) {
					this.scanner.skip(offset);
					checkTokenIsInteger.call(this, DISALLOW_SIGN);
				}
			} else {
				return null;
			}
		}

		if (offset > 0) {
			this.scanner.skip(offset);
		}

		if (sign === 0) {
			type = this.scanner.source.charCodeAt(this.scanner.tokenStart);
			if (type !== PLUSSIGN$5 && type !== HYPHENMINUS$2) {
				this.error("Number sign is expected");
			}
		}

		checkTokenIsInteger.call(this, sign !== 0);
		return sign === HYPHENMINUS$2 ? `-${this.consume(NUMBER$6)}` : this.consume(NUMBER$6);
	}

	// An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
	var AnPlusB = {
		name: "AnPlusB",
		structure: {
			a: [String, null],
			b: [String, null],
		},
		parse: function () {
			/* eslint-disable brace-style*/
			var start = this.scanner.tokenStart;
			var a = null;
			var b = null;

			// <integer>
			if (this.scanner.tokenType === NUMBER$6) {
				checkTokenIsInteger.call(this, ALLOW_SIGN);
				b = this.consume(NUMBER$6);
			}

			// -n
			// -n <signed-integer>
			// -n ['+' | '-'] <signless-integer>
			// -n- <signless-integer>
			// <dashndashdigit-ident>
			else if (
				this.scanner.tokenType === IDENT$f &&
				cmpChar$2(this.scanner.source, this.scanner.tokenStart, HYPHENMINUS$2)
			) {
				a = "-1";

				expectCharCode.call(this, 1, N);

				switch (this.scanner.getTokenLength()) {
					// -n
					// -n <signed-integer>
					// -n ['+' | '-'] <signless-integer>
					case 2:
						this.scanner.next();
						b = consumeB.call(this);
						break;

					// -n- <signless-integer>
					case 3:
						expectCharCode.call(this, 2, HYPHENMINUS$2);

						this.scanner.next();
						this.scanner.skipSC();

						checkTokenIsInteger.call(this, DISALLOW_SIGN);

						b = `-${this.consume(NUMBER$6)}`;
						break;

					// <dashndashdigit-ident>
					default:
						expectCharCode.call(this, 2, HYPHENMINUS$2);
						checkInteger.call(this, 3, DISALLOW_SIGN);
						this.scanner.next();

						b = this.scanner.substrToCursor(start + 2);
				}
			}

			// '+'? n
			// '+'? n <signed-integer>
			// '+'? n ['+' | '-'] <signless-integer>
			// '+'? n- <signless-integer>
			// '+'? <ndashdigit-ident>
			else if (
				this.scanner.tokenType === IDENT$f ||
				(this.scanner.isDelim(PLUSSIGN$5) && this.scanner.lookupType(1) === IDENT$f)
			) {
				var sign = 0;
				a = "1";

				// just ignore a plus
				if (this.scanner.isDelim(PLUSSIGN$5)) {
					sign = 1;
					this.scanner.next();
				}

				expectCharCode.call(this, 0, N);

				switch (this.scanner.getTokenLength()) {
					// '+'? n
					// '+'? n <signed-integer>
					// '+'? n ['+' | '-'] <signless-integer>
					case 1:
						this.scanner.next();
						b = consumeB.call(this);
						break;

					// '+'? n- <signless-integer>
					case 2:
						expectCharCode.call(this, 1, HYPHENMINUS$2);

						this.scanner.next();
						this.scanner.skipSC();

						checkTokenIsInteger.call(this, DISALLOW_SIGN);

						b = `-${this.consume(NUMBER$6)}`;
						break;

					// '+'? <ndashdigit-ident>
					default:
						expectCharCode.call(this, 1, HYPHENMINUS$2);
						checkInteger.call(this, 2, DISALLOW_SIGN);
						this.scanner.next();

						b = this.scanner.substrToCursor(start + sign + 1);
				}
			}

			// <ndashdigit-dimension>
			// <ndash-dimension> <signless-integer>
			// <n-dimension>
			// <n-dimension> <signed-integer>
			// <n-dimension> ['+' | '-'] <signless-integer>
			else if (this.scanner.tokenType === DIMENSION$5) {
				var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);
				var sign = code === PLUSSIGN$5 || code === HYPHENMINUS$2;

				for (var i = this.scanner.tokenStart + sign; i < this.scanner.tokenEnd; i++) {
					if (!isDigit$1(this.scanner.source.charCodeAt(i))) {
						break;
					}
				}

				if (i === this.scanner.tokenStart + sign) {
					this.error("Integer is expected", this.scanner.tokenStart + sign);
				}

				expectCharCode.call(this, i - this.scanner.tokenStart, N);
				a = this.scanner.source.substring(start, i);

				// <n-dimension>
				// <n-dimension> <signed-integer>
				// <n-dimension> ['+' | '-'] <signless-integer>
				if (i + 1 === this.scanner.tokenEnd) {
					this.scanner.next();
					b = consumeB.call(this);
				} else {
					expectCharCode.call(this, i - this.scanner.tokenStart + 1, HYPHENMINUS$2);

					// <ndash-dimension> <signless-integer>
					if (i + 2 === this.scanner.tokenEnd) {
						this.scanner.next();
						this.scanner.skipSC();
						checkTokenIsInteger.call(this, DISALLOW_SIGN);
						b = `-${this.consume(NUMBER$6)}`;
					}
					// <ndashdigit-dimension>
					else {
						checkInteger.call(this, i - this.scanner.tokenStart + 2, DISALLOW_SIGN);
						this.scanner.next();
						b = this.scanner.substrToCursor(i + 1);
					}
				}
			} else {
				this.error();
			}

			if (a !== null && a.charCodeAt(0) === PLUSSIGN$5) {
				a = a.substr(1);
			}

			if (b !== null && b.charCodeAt(0) === PLUSSIGN$5) {
				b = b.substr(1);
			}

			return {
				type: "AnPlusB",
				loc: this.getLocation(start, this.scanner.tokenStart),
				a: a,
				b: b,
			};
		},
		generate: function (node) {
			var a = node.a !== null && node.a !== undefined;
			var b = node.b !== null && node.b !== undefined;

			if (a) {
				this.chunk(
					node.a === "+1"
						? "+n"
						: // eslint-disable-line operator-linebreak, indent
							node.a === "1"
							? "n"
							: // eslint-disable-line operator-linebreak, indent
								node.a === "-1"
								? "-n"
								: // eslint-disable-line operator-linebreak, indent
									`${node.a}n`, // eslint-disable-line operator-linebreak, indent
				);

				if (b) {
					b = String(node.b);
					if (b.charAt(0) === "-" || b.charAt(0) === "+") {
						this.chunk(b.charAt(0));
						this.chunk(b.substr(1));
					} else {
						this.chunk("+");
						this.chunk(b);
					}
				}
			} else {
				this.chunk(String(node.b));
			}
		},
	};

	var tokenizer = tokenizer$3;
	var TYPE$x = tokenizer.TYPE;

	var WhiteSpace$1 = TYPE$x.WhiteSpace;
	var Semicolon = TYPE$x.Semicolon;
	var LeftCurlyBracket = TYPE$x.LeftCurlyBracket;
	var Delim = TYPE$x.Delim;
	var EXCLAMATIONMARK$2 = 0x0021; // U+0021 EXCLAMATION MARK (!)

	function getOffsetExcludeWS() {
		if (this.scanner.tokenIndex > 0) {
			if (this.scanner.lookupType(-1) === WhiteSpace$1) {
				return this.scanner.tokenIndex > 1
					? this.scanner.getTokenStart(this.scanner.tokenIndex - 1)
					: this.scanner.firstCharOffset;
			}
		}

		return this.scanner.tokenStart;
	}

	// 0, 0, false
	function balanceEnd() {
		return 0;
	}

	// LEFTCURLYBRACKET, 0, false
	function leftCurlyBracket(tokenType) {
		return tokenType === LeftCurlyBracket ? 1 : 0;
	}

	// LEFTCURLYBRACKET, SEMICOLON, false
	function leftCurlyBracketOrSemicolon(tokenType) {
		return tokenType === LeftCurlyBracket || tokenType === Semicolon ? 1 : 0;
	}

	// EXCLAMATIONMARK, SEMICOLON, false
	function exclamationMarkOrSemicolon(tokenType, source, offset) {
		if (tokenType === Delim && source.charCodeAt(offset) === EXCLAMATIONMARK$2) {
			return 1;
		}

		return tokenType === Semicolon ? 1 : 0;
	}

	// 0, SEMICOLON, true
	function semicolonIncluded(tokenType) {
		return tokenType === Semicolon ? 2 : 0;
	}

	var Raw = {
		name: "Raw",
		structure: {
			value: String,
		},
		parse: function (startToken, mode, excludeWhiteSpace) {
			var startOffset = this.scanner.getTokenStart(startToken);
			var endOffset;

			this.scanner.skip(this.scanner.getRawLength(startToken, mode || balanceEnd));

			if (excludeWhiteSpace && this.scanner.tokenStart > startOffset) {
				endOffset = getOffsetExcludeWS.call(this);
			} else {
				endOffset = this.scanner.tokenStart;
			}

			return {
				type: "Raw",
				loc: this.getLocation(startOffset, endOffset),
				value: this.scanner.source.substring(startOffset, endOffset),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
		},

		mode: {
			default: balanceEnd,
			leftCurlyBracket: leftCurlyBracket,
			leftCurlyBracketOrSemicolon: leftCurlyBracketOrSemicolon,
			exclamationMarkOrSemicolon: exclamationMarkOrSemicolon,
			semicolonIncluded: semicolonIncluded,
		},
	};

	var TYPE$w = tokenizer$3.TYPE;
	var rawMode$5 = Raw.mode;

	var ATKEYWORD$2 = TYPE$w.AtKeyword;
	var SEMICOLON$4 = TYPE$w.Semicolon;
	var LEFTCURLYBRACKET$3 = TYPE$w.LeftCurlyBracket;
	var RIGHTCURLYBRACKET$1 = TYPE$w.RightCurlyBracket;

	function consumeRaw$5(startToken) {
		return this.Raw(startToken, rawMode$5.leftCurlyBracketOrSemicolon, true);
	}

	function isDeclarationBlockAtrule() {
		for (var offset = 1, type; (type = this.scanner.lookupType(offset)); offset++) {
			if (type === RIGHTCURLYBRACKET$1) {
				return true;
			}

			if (type === LEFTCURLYBRACKET$3 || type === ATKEYWORD$2) {
				return false;
			}
		}

		return false;
	}

	var Atrule = {
		name: "Atrule",
		structure: {
			name: String,
			prelude: ["AtrulePrelude", "Raw", null],
			block: ["Block", null],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var name;
			var nameLowerCase;
			var prelude = null;
			var block = null;

			this.eat(ATKEYWORD$2);

			name = this.scanner.substrToCursor(start + 1);
			nameLowerCase = name.toLowerCase();
			this.scanner.skipSC();

			// parse prelude
			if (
				this.scanner.eof === false &&
				this.scanner.tokenType !== LEFTCURLYBRACKET$3 &&
				this.scanner.tokenType !== SEMICOLON$4
			) {
				if (this.parseAtrulePrelude) {
					prelude = this.parseWithFallback(this.AtrulePrelude.bind(this, name), consumeRaw$5);

					// turn empty AtrulePrelude into null
					if (prelude.type === "AtrulePrelude" && prelude.children.head === null) {
						prelude = null;
					}
				} else {
					prelude = consumeRaw$5.call(this, this.scanner.tokenIndex);
				}

				this.scanner.skipSC();
			}

			switch (this.scanner.tokenType) {
				case SEMICOLON$4:
					this.scanner.next();
					break;

				case LEFTCURLYBRACKET$3:
					if (Object.hasOwn(this.atrule, nameLowerCase) && typeof this.atrule[nameLowerCase].block === "function") {
						block = this.atrule[nameLowerCase].block.call(this);
					} else {
						// TODO: should consume block content as Raw?
						block = this.Block(isDeclarationBlockAtrule.call(this));
					}

					break;
			}

			return {
				type: "Atrule",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				prelude: prelude,
				block: block,
			};
		},
		generate: function (node) {
			this.chunk("@");
			this.chunk(node.name);

			if (node.prelude !== null) {
				this.chunk(" ");
				this.node(node.prelude);
			}

			if (node.block) {
				this.node(node.block);
			} else {
				this.chunk(";");
			}
		},
		walkContext: "atrule",
	};

	var TYPE$v = tokenizer$3.TYPE;

	var SEMICOLON$3 = TYPE$v.Semicolon;
	var LEFTCURLYBRACKET$2 = TYPE$v.LeftCurlyBracket;

	var AtrulePrelude = {
		name: "AtrulePrelude",
		structure: {
			children: [[]],
		},
		parse: function (name) {
			var children = null;

			if (name !== null) {
				name = name.toLowerCase();
			}

			this.scanner.skipSC();

			if (Object.hasOwn(this.atrule, name) && typeof this.atrule[name].prelude === "function") {
				// custom consumer
				children = this.atrule[name].prelude.call(this);
			} else {
				// default consumer
				children = this.readSequence(this.scope.AtrulePrelude);
			}

			this.scanner.skipSC();

			if (
				this.scanner.eof !== true &&
				this.scanner.tokenType !== LEFTCURLYBRACKET$2 &&
				this.scanner.tokenType !== SEMICOLON$3
			) {
				this.error("Semicolon or block is expected");
			}

			if (children === null) {
				children = this.createList();
			}

			return {
				type: "AtrulePrelude",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node);
		},
		walkContext: "atrulePrelude",
	};

	var TYPE$u = tokenizer$3.TYPE;

	var IDENT$e = TYPE$u.Ident;
	var STRING$3 = TYPE$u.String;
	var COLON$6 = TYPE$u.Colon;
	var LEFTSQUAREBRACKET$3 = TYPE$u.LeftSquareBracket;
	var RIGHTSQUAREBRACKET$1 = TYPE$u.RightSquareBracket;
	var DOLLARSIGN$1 = 0x0024; // U+0024 DOLLAR SIGN ($)
	var ASTERISK$5 = 0x002a; // U+002A ASTERISK (*)
	var EQUALSSIGN = 0x003d; // U+003D EQUALS SIGN (=)
	var CIRCUMFLEXACCENT = 0x005e; // U+005E (^)
	var VERTICALLINE$2 = 0x007c; // U+007C VERTICAL LINE (|)
	var TILDE$2 = 0x007e; // U+007E TILDE (~)

	function getAttributeName() {
		if (this.scanner.eof) {
			this.error("Unexpected end of input");
		}

		var start = this.scanner.tokenStart;
		var expectIdent = false;
		var checkColon = true;

		if (this.scanner.isDelim(ASTERISK$5)) {
			expectIdent = true;
			checkColon = false;
			this.scanner.next();
		} else if (!this.scanner.isDelim(VERTICALLINE$2)) {
			this.eat(IDENT$e);
		}

		if (this.scanner.isDelim(VERTICALLINE$2)) {
			if (this.scanner.source.charCodeAt(this.scanner.tokenStart + 1) !== EQUALSSIGN) {
				this.scanner.next();
				this.eat(IDENT$e);
			} else if (expectIdent) {
				this.error("Identifier is expected", this.scanner.tokenEnd);
			}
		} else if (expectIdent) {
			this.error("Vertical line is expected");
		}

		if (checkColon && this.scanner.tokenType === COLON$6) {
			this.scanner.next();
			this.eat(IDENT$e);
		}

		return {
			type: "Identifier",
			loc: this.getLocation(start, this.scanner.tokenStart),
			name: this.scanner.substrToCursor(start),
		};
	}

	function getOperator() {
		var start = this.scanner.tokenStart;
		var code = this.scanner.source.charCodeAt(start);

		if (
			code !== EQUALSSIGN && // =
			code !== TILDE$2 && // ~=
			code !== CIRCUMFLEXACCENT && // ^=
			code !== DOLLARSIGN$1 && // $=
			code !== ASTERISK$5 && // *=
			code !== VERTICALLINE$2 // |=
		) {
			this.error("Attribute selector (=, ~=, ^=, $=, *=, |=) is expected");
		}

		this.scanner.next();

		if (code !== EQUALSSIGN) {
			if (!this.scanner.isDelim(EQUALSSIGN)) {
				this.error("Equal sign is expected");
			}

			this.scanner.next();
		}

		return this.scanner.substrToCursor(start);
	}

	// '[' <wq-name> ']'
	// '[' <wq-name> <attr-matcher> [ <string-token> | <ident-token> ] <attr-modifier>? ']'
	var AttributeSelector = {
		name: "AttributeSelector",
		structure: {
			name: "Identifier",
			matcher: [String, null],
			value: ["String", "Identifier", null],
			flags: [String, null],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var name;
			var matcher = null;
			var value = null;
			var flags = null;

			this.eat(LEFTSQUAREBRACKET$3);
			this.scanner.skipSC();

			name = getAttributeName.call(this);
			this.scanner.skipSC();

			if (this.scanner.tokenType !== RIGHTSQUAREBRACKET$1) {
				// avoid case `[name i]`
				if (this.scanner.tokenType !== IDENT$e) {
					matcher = getOperator.call(this);

					this.scanner.skipSC();

					value = this.scanner.tokenType === STRING$3 ? this.String() : this.Identifier();

					this.scanner.skipSC();
				}

				// attribute flags
				if (this.scanner.tokenType === IDENT$e) {
					flags = this.scanner.getTokenValue();
					this.scanner.next();

					this.scanner.skipSC();
				}
			}

			this.eat(RIGHTSQUAREBRACKET$1);

			return {
				type: "AttributeSelector",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				matcher: matcher,
				value: value,
				flags: flags,
			};
		},
		generate: function (node) {
			var flagsPrefix = " ";

			this.chunk("[");
			this.node(node.name);

			if (node.matcher !== null) {
				this.chunk(node.matcher);

				if (node.value !== null) {
					this.node(node.value);

					// space between string and flags is not required
					if (node.value.type === "String") {
						flagsPrefix = "";
					}
				}
			}

			if (node.flags !== null) {
				this.chunk(flagsPrefix);
				this.chunk(node.flags);
			}

			this.chunk("]");
		},
	};

	var TYPE$t = tokenizer$3.TYPE;
	var rawMode$4 = Raw.mode;

	var WHITESPACE$7 = TYPE$t.WhiteSpace;
	var COMMENT$5 = TYPE$t.Comment;
	var SEMICOLON$2 = TYPE$t.Semicolon;
	var ATKEYWORD$1 = TYPE$t.AtKeyword;
	var LEFTCURLYBRACKET$1 = TYPE$t.LeftCurlyBracket;
	var RIGHTCURLYBRACKET = TYPE$t.RightCurlyBracket;

	function consumeRaw$4(startToken) {
		return this.Raw(startToken, null, true);
	}
	function consumeRule() {
		return this.parseWithFallback(this.Rule, consumeRaw$4);
	}
	function consumeRawDeclaration(startToken) {
		return this.Raw(startToken, rawMode$4.semicolonIncluded, true);
	}
	function consumeDeclaration() {
		if (this.scanner.tokenType === SEMICOLON$2) {
			return consumeRawDeclaration.call(this, this.scanner.tokenIndex);
		}

		var node = this.parseWithFallback(this.Declaration, consumeRawDeclaration);

		if (this.scanner.tokenType === SEMICOLON$2) {
			this.scanner.next();
		}

		return node;
	}

	var Block = {
		name: "Block",
		structure: {
			children: [["Atrule", "Rule", "Declaration"]],
		},
		parse: function (isDeclaration) {
			var consumer = isDeclaration ? consumeDeclaration : consumeRule;

			var start = this.scanner.tokenStart;
			var children = this.createList();

			this.eat(LEFTCURLYBRACKET$1);

			scan: while (!this.scanner.eof) {
				switch (this.scanner.tokenType) {
					case RIGHTCURLYBRACKET:
						break scan;

					case WHITESPACE$7:
					case COMMENT$5:
						this.scanner.next();
						break;

					case ATKEYWORD$1:
						children.push(this.parseWithFallback(this.Atrule, consumeRaw$4));
						break;

					default:
						children.push(consumer.call(this));
				}
			}

			if (!this.scanner.eof) {
				this.eat(RIGHTCURLYBRACKET);
			}

			return {
				type: "Block",
				loc: this.getLocation(start, this.scanner.tokenStart),
				children: children,
			};
		},
		generate: function (node) {
			this.chunk("{");
			this.children(node, function (prev) {
				if (prev.type === "Declaration") {
					this.chunk(";");
				}
			});
			this.chunk("}");
		},
		walkContext: "block",
	};

	var TYPE$s = tokenizer$3.TYPE;

	var LEFTSQUAREBRACKET$2 = TYPE$s.LeftSquareBracket;
	var RIGHTSQUAREBRACKET = TYPE$s.RightSquareBracket;

	var Brackets = {
		name: "Brackets",
		structure: {
			children: [[]],
		},
		parse: function (readSequence, recognizer) {
			var start = this.scanner.tokenStart;
			var children = null;

			this.eat(LEFTSQUAREBRACKET$2);

			children = readSequence.call(this, recognizer);

			if (!this.scanner.eof) {
				this.eat(RIGHTSQUAREBRACKET);
			}

			return {
				type: "Brackets",
				loc: this.getLocation(start, this.scanner.tokenStart),
				children: children,
			};
		},
		generate: function (node) {
			this.chunk("[");
			this.children(node);
			this.chunk("]");
		},
	};

	var CDC$1 = tokenizer$3.TYPE.CDC;

	var CDC_1 = {
		name: "CDC",
		structure: [],
		parse: function () {
			var start = this.scanner.tokenStart;

			this.eat(CDC$1); // -->

			return {
				type: "CDC",
				loc: this.getLocation(start, this.scanner.tokenStart),
			};
		},
		generate: function () {
			this.chunk("-->");
		},
	};

	var CDO$1 = tokenizer$3.TYPE.CDO;

	var CDO_1 = {
		name: "CDO",
		structure: [],
		parse: function () {
			var start = this.scanner.tokenStart;

			this.eat(CDO$1); // <!--

			return {
				type: "CDO",
				loc: this.getLocation(start, this.scanner.tokenStart),
			};
		},
		generate: function () {
			this.chunk("<!--");
		},
	};

	var TYPE$r = tokenizer$3.TYPE;

	var IDENT$d = TYPE$r.Ident;
	var FULLSTOP$2 = 0x002e; // U+002E FULL STOP (.)

	// '.' ident
	var ClassSelector = {
		name: "ClassSelector",
		structure: {
			name: String,
		},
		parse: function () {
			if (!this.scanner.isDelim(FULLSTOP$2)) {
				this.error("Full stop is expected");
			}

			this.scanner.next();

			return {
				type: "ClassSelector",
				loc: this.getLocation(this.scanner.tokenStart - 1, this.scanner.tokenEnd),
				name: this.consume(IDENT$d),
			};
		},
		generate: function (node) {
			this.chunk(".");
			this.chunk(node.name);
		},
	};

	var TYPE$q = tokenizer$3.TYPE;

	var IDENT$c = TYPE$q.Ident;
	var PLUSSIGN$4 = 0x002b; // U+002B PLUS SIGN (+)
	var SOLIDUS$5 = 0x002f; // U+002F SOLIDUS (/)
	var GREATERTHANSIGN$1 = 0x003e; // U+003E GREATER-THAN SIGN (>)
	var TILDE$1 = 0x007e; // U+007E TILDE (~)

	// + | > | ~ | /deep/
	var Combinator = {
		name: "Combinator",
		structure: {
			name: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

			switch (code) {
				case GREATERTHANSIGN$1:
				case PLUSSIGN$4:
				case TILDE$1:
					this.scanner.next();
					break;

				case SOLIDUS$5:
					this.scanner.next();

					if (this.scanner.tokenType !== IDENT$c || this.scanner.lookupValue(0, "deep") === false) {
						this.error("Identifier `deep` is expected");
					}

					this.scanner.next();

					if (!this.scanner.isDelim(SOLIDUS$5)) {
						this.error("Solidus is expected");
					}

					this.scanner.next();
					break;

				default:
					this.error("Combinator is expected");
			}

			return {
				type: "Combinator",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: this.scanner.substrToCursor(start),
			};
		},
		generate: function (node) {
			this.chunk(node.name);
		},
	};

	var TYPE$p = tokenizer$3.TYPE;

	var COMMENT$4 = TYPE$p.Comment;
	var ASTERISK$4 = 0x002a; // U+002A ASTERISK (*)
	var SOLIDUS$4 = 0x002f; // U+002F SOLIDUS (/)

	// '/*' .* '*/'
	var Comment = {
		name: "Comment",
		structure: {
			value: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var end = this.scanner.tokenEnd;

			this.eat(COMMENT$4);

			if (
				end - start + 2 >= 2 &&
				this.scanner.source.charCodeAt(end - 2) === ASTERISK$4 &&
				this.scanner.source.charCodeAt(end - 1) === SOLIDUS$4
			) {
				end -= 2;
			}

			return {
				type: "Comment",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.source.substring(start + 2, end),
			};
		},
		generate: function (node) {
			this.chunk("/*");
			this.chunk(node.value);
			this.chunk("*/");
		},
	};

	var isCustomProperty = names$2.isCustomProperty;
	var TYPE$o = tokenizer$3.TYPE;
	var rawMode$3 = Raw.mode;

	var IDENT$b = TYPE$o.Ident;
	var HASH$4 = TYPE$o.Hash;
	var COLON$5 = TYPE$o.Colon;
	var SEMICOLON$1 = TYPE$o.Semicolon;
	var DELIM$4 = TYPE$o.Delim;
	var WHITESPACE$6 = TYPE$o.WhiteSpace;
	var EXCLAMATIONMARK$1 = 0x0021; // U+0021 EXCLAMATION MARK (!)
	var NUMBERSIGN$2 = 0x0023; // U+0023 NUMBER SIGN (#)
	var DOLLARSIGN = 0x0024; // U+0024 DOLLAR SIGN ($)
	var AMPERSAND = 0x0026; // U+0026 ANPERSAND (&)
	var ASTERISK$3 = 0x002a; // U+002A ASTERISK (*)
	var PLUSSIGN$3 = 0x002b; // U+002B PLUS SIGN (+)
	var SOLIDUS$3 = 0x002f; // U+002F SOLIDUS (/)

	function consumeValueRaw(startToken) {
		return this.Raw(startToken, rawMode$3.exclamationMarkOrSemicolon, true);
	}

	function consumeCustomPropertyRaw(startToken) {
		return this.Raw(startToken, rawMode$3.exclamationMarkOrSemicolon, false);
	}

	function consumeValue() {
		var startValueToken = this.scanner.tokenIndex;
		var value = this.Value();

		if (
			value.type !== "Raw" &&
			this.scanner.eof === false &&
			this.scanner.tokenType !== SEMICOLON$1 &&
			this.scanner.isDelim(EXCLAMATIONMARK$1) === false &&
			this.scanner.isBalanceEdge(startValueToken) === false
		) {
			this.error();
		}

		return value;
	}

	var Declaration = {
		name: "Declaration",
		structure: {
			important: [Boolean, String],
			property: String,
			value: ["Value", "Raw"],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var startToken = this.scanner.tokenIndex;
			var property = readProperty.call(this);
			var customProperty = isCustomProperty(property);
			var parseValue = customProperty ? this.parseCustomProperty : this.parseValue;
			var consumeRaw = customProperty ? consumeCustomPropertyRaw : consumeValueRaw;
			var important = false;
			var value;

			this.scanner.skipSC();
			this.eat(COLON$5);

			const valueStart = this.scanner.tokenIndex;

			if (!customProperty) {
				this.scanner.skipSC();
			}

			if (parseValue) {
				value = this.parseWithFallback(consumeValue, consumeRaw);
			} else {
				value = consumeRaw.call(this, this.scanner.tokenIndex);
			}

			if (customProperty && value.type === "Value" && value.children.isEmpty()) {
				for (let offset = valueStart - this.scanner.tokenIndex; offset <= 0; offset++) {
					if (this.scanner.lookupType(offset) === WHITESPACE$6) {
						value.children.appendData({
							type: "WhiteSpace",
							loc: null,
							value: " ",
						});
						break;
					}
				}
			}

			if (this.scanner.isDelim(EXCLAMATIONMARK$1)) {
				important = getImportant.call(this);
				this.scanner.skipSC();
			}

			// Do not include semicolon to range per spec
			// https://drafts.csswg.org/css-syntax/#declaration-diagram

			if (
				this.scanner.eof === false &&
				this.scanner.tokenType !== SEMICOLON$1 &&
				this.scanner.isBalanceEdge(startToken) === false
			) {
				this.error();
			}

			return {
				type: "Declaration",
				loc: this.getLocation(start, this.scanner.tokenStart),
				important: important,
				property: property,
				value: value,
			};
		},
		generate: function (node) {
			this.chunk(node.property);
			this.chunk(":");
			this.node(node.value);

			if (node.important) {
				this.chunk(node.important === true ? "!important" : `!${node.important}`);
			}
		},
		walkContext: "declaration",
	};

	function readProperty() {
		var start = this.scanner.tokenStart;

		// hacks
		if (this.scanner.tokenType === DELIM$4) {
			switch (this.scanner.source.charCodeAt(this.scanner.tokenStart)) {
				case ASTERISK$3:
				case DOLLARSIGN:
				case PLUSSIGN$3:
				case NUMBERSIGN$2:
				case AMPERSAND:
					this.scanner.next();
					break;

				// TODO: not sure we should support this hack
				case SOLIDUS$3:
					this.scanner.next();
					if (this.scanner.isDelim(SOLIDUS$3)) {
						this.scanner.next();
					}
					break;
			}
		}

		if (this.scanner.tokenType === HASH$4) {
			this.eat(HASH$4);
		} else {
			this.eat(IDENT$b);
		}

		return this.scanner.substrToCursor(start);
	}

	// ! ws* important
	function getImportant() {
		this.eat(DELIM$4);
		this.scanner.skipSC();

		var important = this.consume(IDENT$b);

		// store original value in case it differ from `important`
		// for better original source restoring and hacks like `!ie` support
		return important === "important" ? true : important;
	}

	var TYPE$n = tokenizer$3.TYPE;
	var rawMode$2 = Raw.mode;

	var WHITESPACE$5 = TYPE$n.WhiteSpace;
	var COMMENT$3 = TYPE$n.Comment;
	var SEMICOLON = TYPE$n.Semicolon;

	function consumeRaw$3(startToken) {
		return this.Raw(startToken, rawMode$2.semicolonIncluded, true);
	}

	var DeclarationList = {
		name: "DeclarationList",
		structure: {
			children: [["Declaration"]],
		},
		parse: function () {
			var children = this.createList();

			while (!this.scanner.eof) {
				switch (this.scanner.tokenType) {
					case WHITESPACE$5:
					case COMMENT$3:
					case SEMICOLON:
						this.scanner.next();
						break;

					default:
						children.push(this.parseWithFallback(this.Declaration, consumeRaw$3));
				}
			}

			return {
				type: "DeclarationList",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node, function (prev) {
				if (prev.type === "Declaration") {
					this.chunk(";");
				}
			});
		},
	};

	var consumeNumber$2 = utils$2.consumeNumber;
	var TYPE$m = tokenizer$3.TYPE;

	var DIMENSION$4 = TYPE$m.Dimension;

	var Dimension = {
		name: "Dimension",
		structure: {
			value: String,
			unit: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var numberEnd = consumeNumber$2(this.scanner.source, start);

			this.eat(DIMENSION$4);

			return {
				type: "Dimension",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.source.substring(start, numberEnd),
				unit: this.scanner.source.substring(numberEnd, this.scanner.tokenStart),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
			this.chunk(node.unit);
		},
	};

	var TYPE$l = tokenizer$3.TYPE;

	var RIGHTPARENTHESIS$5 = TYPE$l.RightParenthesis;

	// <function-token> <sequence> )
	var _Function = {
		name: "Function",
		structure: {
			name: String,
			children: [[]],
		},
		parse: function (readSequence, recognizer) {
			var start = this.scanner.tokenStart;
			var name = this.consumeFunctionName();
			var nameLowerCase = name.toLowerCase();
			var children;

			children = Object.hasOwn(recognizer, nameLowerCase)
				? recognizer[nameLowerCase].call(this, recognizer)
				: readSequence.call(this, recognizer);

			if (!this.scanner.eof) {
				this.eat(RIGHTPARENTHESIS$5);
			}

			return {
				type: "Function",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				children: children,
			};
		},
		generate: function (node) {
			this.chunk(node.name);
			this.chunk("(");
			this.children(node);
			this.chunk(")");
		},
		walkContext: "function",
	};

	var TYPE$k = tokenizer$3.TYPE;

	var HASH$3 = TYPE$k.Hash;

	// '#' ident
	var Hash = {
		name: "Hash",
		structure: {
			value: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;

			this.eat(HASH$3);

			return {
				type: "Hash",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.substrToCursor(start + 1),
			};
		},
		generate: function (node) {
			this.chunk("#");
			this.chunk(node.value);
		},
	};

	var TYPE$j = tokenizer$3.TYPE;

	var IDENT$a = TYPE$j.Ident;

	var Identifier = {
		name: "Identifier",
		structure: {
			name: String,
		},
		parse: function () {
			return {
				type: "Identifier",
				loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
				name: this.consume(IDENT$a),
			};
		},
		generate: function (node) {
			this.chunk(node.name);
		},
	};

	var TYPE$i = tokenizer$3.TYPE;

	var HASH$2 = TYPE$i.Hash;

	// <hash-token>
	var IdSelector = {
		name: "IdSelector",
		structure: {
			name: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;

			// TODO: check value is an ident
			this.eat(HASH$2);

			return {
				type: "IdSelector",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: this.scanner.substrToCursor(start + 1),
			};
		},
		generate: function (node) {
			this.chunk("#");
			this.chunk(node.name);
		},
	};

	var TYPE$h = tokenizer$3.TYPE;

	var IDENT$9 = TYPE$h.Ident;
	var NUMBER$5 = TYPE$h.Number;
	var DIMENSION$3 = TYPE$h.Dimension;
	var LEFTPARENTHESIS$5 = TYPE$h.LeftParenthesis;
	var RIGHTPARENTHESIS$4 = TYPE$h.RightParenthesis;
	var COLON$4 = TYPE$h.Colon;
	var DELIM$3 = TYPE$h.Delim;

	var MediaFeature = {
		name: "MediaFeature",
		structure: {
			name: String,
			value: ["Identifier", "Number", "Dimension", "Ratio", null],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var name;
			var value = null;

			this.eat(LEFTPARENTHESIS$5);
			this.scanner.skipSC();

			name = this.consume(IDENT$9);
			this.scanner.skipSC();

			if (this.scanner.tokenType !== RIGHTPARENTHESIS$4) {
				this.eat(COLON$4);
				this.scanner.skipSC();

				switch (this.scanner.tokenType) {
					case NUMBER$5:
						if (this.lookupNonWSType(1) === DELIM$3) {
							value = this.Ratio();
						} else {
							value = this.Number();
						}

						break;

					case DIMENSION$3:
						value = this.Dimension();
						break;

					case IDENT$9:
						value = this.Identifier();

						break;

					default:
						this.error("Number, dimension, ratio or identifier is expected");
				}

				this.scanner.skipSC();
			}

			this.eat(RIGHTPARENTHESIS$4);

			return {
				type: "MediaFeature",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				value: value,
			};
		},
		generate: function (node) {
			this.chunk("(");
			this.chunk(node.name);
			if (node.value !== null) {
				this.chunk(":");
				this.node(node.value);
			}
			this.chunk(")");
		},
	};

	var TYPE$g = tokenizer$3.TYPE;

	var WHITESPACE$4 = TYPE$g.WhiteSpace;
	var COMMENT$2 = TYPE$g.Comment;
	var IDENT$8 = TYPE$g.Ident;
	var LEFTPARENTHESIS$4 = TYPE$g.LeftParenthesis;

	var MediaQuery = {
		name: "MediaQuery",
		structure: {
			children: [["Identifier", "MediaFeature", "WhiteSpace"]],
		},
		parse: function () {
			this.scanner.skipSC();

			var children = this.createList();
			var child = null;
			var space = null;

			scan: while (!this.scanner.eof) {
				switch (this.scanner.tokenType) {
					case COMMENT$2:
						this.scanner.next();
						continue;

					case WHITESPACE$4:
						space = this.WhiteSpace();
						continue;

					case IDENT$8:
						child = this.Identifier();
						break;

					case LEFTPARENTHESIS$4:
						child = this.MediaFeature();
						break;

					default:
						break scan;
				}

				if (space !== null) {
					children.push(space);
					space = null;
				}

				children.push(child);
			}

			if (child === null) {
				this.error("Identifier or parenthesis is expected");
			}

			return {
				type: "MediaQuery",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node);
		},
	};

	var COMMA$3 = tokenizer$3.TYPE.Comma;

	var MediaQueryList = {
		name: "MediaQueryList",
		structure: {
			children: [["MediaQuery"]],
		},
		parse: function (relative) {
			var children = this.createList();

			this.scanner.skipSC();

			while (!this.scanner.eof) {
				children.push(this.MediaQuery(relative));

				if (this.scanner.tokenType !== COMMA$3) {
					break;
				}

				this.scanner.next();
			}

			return {
				type: "MediaQueryList",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node, function () {
				this.chunk(",");
			});
		},
	};

	var Nth = {
		name: "Nth",
		structure: {
			nth: ["AnPlusB", "Identifier"],
			selector: ["SelectorList", null],
		},
		parse: function (allowOfClause) {
			this.scanner.skipSC();

			var start = this.scanner.tokenStart;
			var end = start;
			var selector = null;
			var query;

			if (this.scanner.lookupValue(0, "odd") || this.scanner.lookupValue(0, "even")) {
				query = this.Identifier();
			} else {
				query = this.AnPlusB();
			}

			this.scanner.skipSC();

			if (allowOfClause && this.scanner.lookupValue(0, "of")) {
				this.scanner.next();

				selector = this.SelectorList();

				if (this.needPositions) {
					end = this.getLastListNode(selector.children).loc.end.offset;
				}
			} else {
				if (this.needPositions) {
					end = query.loc.end.offset;
				}
			}

			return {
				type: "Nth",
				loc: this.getLocation(start, end),
				nth: query,
				selector: selector,
			};
		},
		generate: function (node) {
			this.node(node.nth);
			if (node.selector !== null) {
				this.chunk(" of ");
				this.node(node.selector);
			}
		},
	};

	var NUMBER$4 = tokenizer$3.TYPE.Number;

	var _Number = {
		name: "Number",
		structure: {
			value: String,
		},
		parse: function () {
			return {
				type: "Number",
				loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
				value: this.consume(NUMBER$4),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
		},
	};

	// '/' | '*' | ',' | ':' | '+' | '-'
	var Operator = {
		name: "Operator",
		structure: {
			value: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;

			this.scanner.next();

			return {
				type: "Operator",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.substrToCursor(start),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
		},
	};

	var TYPE$f = tokenizer$3.TYPE;

	var LEFTPARENTHESIS$3 = TYPE$f.LeftParenthesis;
	var RIGHTPARENTHESIS$3 = TYPE$f.RightParenthesis;

	var Parentheses = {
		name: "Parentheses",
		structure: {
			children: [[]],
		},
		parse: function (readSequence, recognizer) {
			var start = this.scanner.tokenStart;
			var children = null;

			this.eat(LEFTPARENTHESIS$3);

			children = readSequence.call(this, recognizer);

			if (!this.scanner.eof) {
				this.eat(RIGHTPARENTHESIS$3);
			}

			return {
				type: "Parentheses",
				loc: this.getLocation(start, this.scanner.tokenStart),
				children: children,
			};
		},
		generate: function (node) {
			this.chunk("(");
			this.children(node);
			this.chunk(")");
		},
	};

	var consumeNumber$1 = utils$2.consumeNumber;
	var TYPE$e = tokenizer$3.TYPE;

	var PERCENTAGE$2 = TYPE$e.Percentage;

	var Percentage = {
		name: "Percentage",
		structure: {
			value: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var numberEnd = consumeNumber$1(this.scanner.source, start);

			this.eat(PERCENTAGE$2);

			return {
				type: "Percentage",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.source.substring(start, numberEnd),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
			this.chunk("%");
		},
	};

	var TYPE$d = tokenizer$3.TYPE;

	var IDENT$7 = TYPE$d.Ident;
	var FUNCTION$5 = TYPE$d.Function;
	var COLON$3 = TYPE$d.Colon;
	var RIGHTPARENTHESIS$2 = TYPE$d.RightParenthesis;

	// : [ <ident> | <function-token> <any-value>? ) ]
	var PseudoClassSelector = {
		name: "PseudoClassSelector",
		structure: {
			name: String,
			children: [["Raw"], null],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var children = null;
			var name;
			var nameLowerCase;

			this.eat(COLON$3);

			if (this.scanner.tokenType === FUNCTION$5) {
				name = this.consumeFunctionName();
				nameLowerCase = name.toLowerCase();

				if (Object.hasOwn(this.pseudo, nameLowerCase)) {
					this.scanner.skipSC();
					children = this.pseudo[nameLowerCase].call(this);
					this.scanner.skipSC();
				} else {
					children = this.createList();
					children.push(this.Raw(this.scanner.tokenIndex, null, false));
				}

				this.eat(RIGHTPARENTHESIS$2);
			} else {
				name = this.consume(IDENT$7);
			}

			return {
				type: "PseudoClassSelector",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				children: children,
			};
		},
		generate: function (node) {
			this.chunk(":");
			this.chunk(node.name);

			if (node.children !== null) {
				this.chunk("(");
				this.children(node);
				this.chunk(")");
			}
		},
		walkContext: "function",
	};

	var TYPE$c = tokenizer$3.TYPE;

	var IDENT$6 = TYPE$c.Ident;
	var FUNCTION$4 = TYPE$c.Function;
	var COLON$2 = TYPE$c.Colon;
	var RIGHTPARENTHESIS$1 = TYPE$c.RightParenthesis;

	// :: [ <ident> | <function-token> <any-value>? ) ]
	var PseudoElementSelector = {
		name: "PseudoElementSelector",
		structure: {
			name: String,
			children: [["Raw"], null],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var children = null;
			var name;
			var nameLowerCase;

			this.eat(COLON$2);
			this.eat(COLON$2);

			if (this.scanner.tokenType === FUNCTION$4) {
				name = this.consumeFunctionName();
				nameLowerCase = name.toLowerCase();

				if (Object.hasOwn(this.pseudo, nameLowerCase)) {
					this.scanner.skipSC();
					children = this.pseudo[nameLowerCase].call(this);
					this.scanner.skipSC();
				} else {
					children = this.createList();
					children.push(this.Raw(this.scanner.tokenIndex, null, false));
				}

				this.eat(RIGHTPARENTHESIS$1);
			} else {
				name = this.consume(IDENT$6);
			}

			return {
				type: "PseudoElementSelector",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: name,
				children: children,
			};
		},
		generate: function (node) {
			this.chunk("::");
			this.chunk(node.name);

			if (node.children !== null) {
				this.chunk("(");
				this.children(node);
				this.chunk(")");
			}
		},
		walkContext: "function",
	};

	var isDigit = tokenizer$3.isDigit;
	var TYPE$b = tokenizer$3.TYPE;

	var NUMBER$3 = TYPE$b.Number;
	var DELIM$2 = TYPE$b.Delim;
	var SOLIDUS$2 = 0x002f; // U+002F SOLIDUS (/)
	var FULLSTOP$1 = 0x002e; // U+002E FULL STOP (.)

	// Terms of <ratio> should be a positive numbers (not zero or negative)
	// (see https://drafts.csswg.org/mediaqueries-3/#values)
	// However, -o-min-device-pixel-ratio takes fractional values as a ratio's term
	// and this is using by various sites. Therefore we relax checking on parse
	// to test a term is unsigned number without an exponent part.
	// Additional checking may be applied on lexer validation.
	function consumeNumber() {
		this.scanner.skipWS();

		var value = this.consume(NUMBER$3);

		for (var i = 0; i < value.length; i++) {
			var code = value.charCodeAt(i);
			if (!isDigit(code) && code !== FULLSTOP$1) {
				this.error("Unsigned number is expected", this.scanner.tokenStart - value.length + i);
			}
		}

		if (Number(value) === 0) {
			this.error("Zero number is not allowed", this.scanner.tokenStart - value.length);
		}

		return value;
	}

	// <positive-integer> S* '/' S* <positive-integer>
	var Ratio = {
		name: "Ratio",
		structure: {
			left: String,
			right: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var left = consumeNumber.call(this);
			var right;

			this.scanner.skipWS();

			if (!this.scanner.isDelim(SOLIDUS$2)) {
				this.error("Solidus is expected");
			}
			this.eat(DELIM$2);
			right = consumeNumber.call(this);

			return {
				type: "Ratio",
				loc: this.getLocation(start, this.scanner.tokenStart),
				left: left,
				right: right,
			};
		},
		generate: function (node) {
			this.chunk(node.left);
			this.chunk("/");
			this.chunk(node.right);
		},
	};

	var TYPE$a = tokenizer$3.TYPE;
	var rawMode$1 = Raw.mode;

	var LEFTCURLYBRACKET = TYPE$a.LeftCurlyBracket;

	function consumeRaw$2(startToken) {
		return this.Raw(startToken, rawMode$1.leftCurlyBracket, true);
	}

	function consumePrelude() {
		var prelude = this.SelectorList();

		if (prelude.type !== "Raw" && this.scanner.eof === false && this.scanner.tokenType !== LEFTCURLYBRACKET) {
			this.error();
		}

		return prelude;
	}

	var Rule = {
		name: "Rule",
		structure: {
			prelude: ["SelectorList", "Raw"],
			block: ["Block"],
		},
		parse: function () {
			var startToken = this.scanner.tokenIndex;
			var startOffset = this.scanner.tokenStart;
			var prelude;
			var block;

			if (this.parseRulePrelude) {
				prelude = this.parseWithFallback(consumePrelude, consumeRaw$2);
			} else {
				prelude = consumeRaw$2.call(this, startToken);
			}

			block = this.Block(true);

			return {
				type: "Rule",
				loc: this.getLocation(startOffset, this.scanner.tokenStart),
				prelude: prelude,
				block: block,
			};
		},
		generate: function (node) {
			this.node(node.prelude);
			this.node(node.block);
		},
		walkContext: "rule",
	};

	var Selector = {
		name: "Selector",
		structure: {
			children: [
				[
					"TypeSelector",
					"IdSelector",
					"ClassSelector",
					"AttributeSelector",
					"PseudoClassSelector",
					"PseudoElementSelector",
					"Combinator",
					"WhiteSpace",
				],
			],
		},
		parse: function () {
			var children = this.readSequence(this.scope.Selector);

			// nothing were consumed
			if (this.getFirstListNode(children) === null) {
				this.error("Selector is expected");
			}

			return {
				type: "Selector",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node);
		},
	};

	var TYPE$9 = tokenizer$3.TYPE;

	var COMMA$2 = TYPE$9.Comma;

	var SelectorList = {
		name: "SelectorList",
		structure: {
			children: [["Selector", "Raw"]],
		},
		parse: function () {
			var children = this.createList();

			while (!this.scanner.eof) {
				children.push(this.Selector());

				if (this.scanner.tokenType === COMMA$2) {
					this.scanner.next();
					continue;
				}

				break;
			}

			return {
				type: "SelectorList",
				loc: this.getLocationFromList(children),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node, function () {
				this.chunk(",");
			});
		},
		walkContext: "selector",
	};

	var STRING$2 = tokenizer$3.TYPE.String;

	var _String = {
		name: "String",
		structure: {
			value: String,
		},
		parse: function () {
			return {
				type: "String",
				loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
				value: this.consume(STRING$2),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
		},
	};

	var TYPE$8 = tokenizer$3.TYPE;

	var WHITESPACE$3 = TYPE$8.WhiteSpace;
	var COMMENT$1 = TYPE$8.Comment;
	var ATKEYWORD = TYPE$8.AtKeyword;
	var CDO = TYPE$8.CDO;
	var CDC = TYPE$8.CDC;
	var EXCLAMATIONMARK = 0x0021; // U+0021 EXCLAMATION MARK (!)

	function consumeRaw$1(startToken) {
		return this.Raw(startToken, null, false);
	}

	var StyleSheet = {
		name: "StyleSheet",
		structure: {
			children: [["Comment", "CDO", "CDC", "Atrule", "Rule", "Raw"]],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var children = this.createList();
			var child;

			while (!this.scanner.eof) {
				switch (this.scanner.tokenType) {
					case WHITESPACE$3:
						this.scanner.next();
						continue;

					case COMMENT$1:
						// ignore comments except exclamation comments (i.e. /*! .. */) on top level
						if (this.scanner.source.charCodeAt(this.scanner.tokenStart + 2) !== EXCLAMATIONMARK) {
							this.scanner.next();
							continue;
						}

						child = this.Comment();
						break;

					case CDO: // <!--
						child = this.CDO();
						break;

					case CDC: // -->
						child = this.CDC();
						break;

					// CSS Syntax Module Level 3
					// §2.2 Error handling
					// At the "top level" of a stylesheet, an <at-keyword-token> starts an at-rule.
					case ATKEYWORD:
						child = this.parseWithFallback(this.Atrule, consumeRaw$1);
						break;

					// Anything else starts a qualified rule ...
					default:
						child = this.parseWithFallback(this.Rule, consumeRaw$1);
				}

				children.push(child);
			}

			return {
				type: "StyleSheet",
				loc: this.getLocation(start, this.scanner.tokenStart),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node);
		},
		walkContext: "stylesheet",
	};

	var TYPE$7 = tokenizer$3.TYPE;

	var IDENT$5 = TYPE$7.Ident;
	var ASTERISK$2 = 0x002a; // U+002A ASTERISK (*)
	var VERTICALLINE$1 = 0x007c; // U+007C VERTICAL LINE (|)

	function eatIdentifierOrAsterisk() {
		if (this.scanner.tokenType !== IDENT$5 && this.scanner.isDelim(ASTERISK$2) === false) {
			this.error("Identifier or asterisk is expected");
		}

		this.scanner.next();
	}

	// ident
	// ident|ident
	// ident|*
	// *
	// *|ident
	// *|*
	// |ident
	// |*
	var TypeSelector = {
		name: "TypeSelector",
		structure: {
			name: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;

			if (this.scanner.isDelim(VERTICALLINE$1)) {
				this.scanner.next();
				eatIdentifierOrAsterisk.call(this);
			} else {
				eatIdentifierOrAsterisk.call(this);

				if (this.scanner.isDelim(VERTICALLINE$1)) {
					this.scanner.next();
					eatIdentifierOrAsterisk.call(this);
				}
			}

			return {
				type: "TypeSelector",
				loc: this.getLocation(start, this.scanner.tokenStart),
				name: this.scanner.substrToCursor(start),
			};
		},
		generate: function (node) {
			this.chunk(node.name);
		},
	};

	var isHexDigit = tokenizer$3.isHexDigit;
	var cmpChar$1 = tokenizer$3.cmpChar;
	var TYPE$6 = tokenizer$3.TYPE;
	var NAME = tokenizer$3.NAME;

	var IDENT$4 = TYPE$6.Ident;
	var NUMBER$2 = TYPE$6.Number;
	var DIMENSION$2 = TYPE$6.Dimension;
	var PLUSSIGN$2 = 0x002b; // U+002B PLUS SIGN (+)
	var HYPHENMINUS$1 = 0x002d; // U+002D HYPHEN-MINUS (-)
	var QUESTIONMARK = 0x003f; // U+003F QUESTION MARK (?)
	var U$1 = 0x0075; // U+0075 LATIN SMALL LETTER U (u)

	function eatHexSequence(offset, allowDash) {
		for (var pos = this.scanner.tokenStart + offset, len = 0; pos < this.scanner.tokenEnd; pos++) {
			var code = this.scanner.source.charCodeAt(pos);

			if (code === HYPHENMINUS$1 && allowDash && len !== 0) {
				if (eatHexSequence.call(this, offset + len + 1, false) === 0) {
					this.error();
				}

				return -1;
			}

			if (!isHexDigit(code)) {
				this.error(
					allowDash && len !== 0
						? `HyphenMinus${len < 6 ? " or hex digit" : ""} is expected`
						: len < 6
							? "Hex digit is expected"
							: "Unexpected input",
					pos,
				);
			}

			if (++len > 6) {
				this.error("Too many hex digits", pos);
			}
		}

		this.scanner.next();
		return len;
	}

	function eatQuestionMarkSequence(max) {
		var count = 0;

		while (this.scanner.isDelim(QUESTIONMARK)) {
			if (++count > max) {
				this.error("Too many question marks");
			}

			this.scanner.next();
		}
	}

	function startsWith(code) {
		if (this.scanner.source.charCodeAt(this.scanner.tokenStart) !== code) {
			this.error(`${NAME[code]} is expected`);
		}
	}

	// https://drafts.csswg.org/css-syntax/#urange
	// Informally, the <urange> production has three forms:
	// U+0001
	//      Defines a range consisting of a single code point, in this case the code point "1".
	// U+0001-00ff
	//      Defines a range of codepoints between the first and the second value, in this case
	//      the range between "1" and "ff" (255 in decimal) inclusive.
	// U+00??
	//      Defines a range of codepoints where the "?" characters range over all hex digits,
	//      in this case defining the same as the value U+0000-00ff.
	// In each form, a maximum of 6 digits is allowed for each hexadecimal number (if you treat "?" as a hexadecimal digit).
	//
	// <urange> =
	//   u '+' <ident-token> '?'* |
	//   u <dimension-token> '?'* |
	//   u <number-token> '?'* |
	//   u <number-token> <dimension-token> |
	//   u <number-token> <number-token> |
	//   u '+' '?'+
	function scanUnicodeRange() {
		var hexLength = 0;

		// u '+' <ident-token> '?'*
		// u '+' '?'+
		if (this.scanner.isDelim(PLUSSIGN$2)) {
			this.scanner.next();

			if (this.scanner.tokenType === IDENT$4) {
				hexLength = eatHexSequence.call(this, 0, true);
				if (hexLength > 0) {
					eatQuestionMarkSequence.call(this, 6 - hexLength);
				}
				return;
			}

			if (this.scanner.isDelim(QUESTIONMARK)) {
				this.scanner.next();
				eatQuestionMarkSequence.call(this, 5);
				return;
			}

			this.error("Hex digit or question mark is expected");
			return;
		}

		// u <number-token> '?'*
		// u <number-token> <dimension-token>
		// u <number-token> <number-token>
		if (this.scanner.tokenType === NUMBER$2) {
			startsWith.call(this, PLUSSIGN$2);
			hexLength = eatHexSequence.call(this, 1, true);

			if (this.scanner.isDelim(QUESTIONMARK)) {
				eatQuestionMarkSequence.call(this, 6 - hexLength);
				return;
			}

			if (this.scanner.tokenType === DIMENSION$2 || this.scanner.tokenType === NUMBER$2) {
				startsWith.call(this, HYPHENMINUS$1);
				eatHexSequence.call(this, 1, false);
				return;
			}

			return;
		}

		// u <dimension-token> '?'*
		if (this.scanner.tokenType === DIMENSION$2) {
			startsWith.call(this, PLUSSIGN$2);
			hexLength = eatHexSequence.call(this, 1, true);

			if (hexLength > 0) {
				eatQuestionMarkSequence.call(this, 6 - hexLength);
			}

			return;
		}

		this.error();
	}

	var UnicodeRange = {
		name: "UnicodeRange",
		structure: {
			value: String,
		},
		parse: function () {
			var start = this.scanner.tokenStart;

			// U or u
			if (!cmpChar$1(this.scanner.source, start, U$1)) {
				this.error("U is expected");
			}

			if (!cmpChar$1(this.scanner.source, start + 1, PLUSSIGN$2)) {
				this.error("Plus sign is expected");
			}

			this.scanner.next();
			scanUnicodeRange.call(this);

			return {
				type: "UnicodeRange",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: this.scanner.substrToCursor(start),
			};
		},
		generate: function (node) {
			this.chunk(node.value);
		},
	};

	var isWhiteSpace = tokenizer$3.isWhiteSpace;
	var cmpStr$1 = tokenizer$3.cmpStr;
	var TYPE$5 = tokenizer$3.TYPE;

	var FUNCTION$3 = TYPE$5.Function;
	var URL$3 = TYPE$5.Url;
	var RIGHTPARENTHESIS = TYPE$5.RightParenthesis;

	// <url-token> | <function-token> <string> )
	var Url = {
		name: "Url",
		structure: {
			value: ["String", "Raw"],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var value;

			switch (this.scanner.tokenType) {
				case URL$3: {
					var rawStart = start + 4;
					var rawEnd = this.scanner.tokenEnd - 1;

					while (rawStart < rawEnd && isWhiteSpace(this.scanner.source.charCodeAt(rawStart))) {
						rawStart++;
					}

					while (rawStart < rawEnd && isWhiteSpace(this.scanner.source.charCodeAt(rawEnd - 1))) {
						rawEnd--;
					}

					value = {
						type: "Raw",
						loc: this.getLocation(rawStart, rawEnd),
						value: this.scanner.source.substring(rawStart, rawEnd),
					};

					this.eat(URL$3);
					break;
				}

				case FUNCTION$3:
					if (!cmpStr$1(this.scanner.source, this.scanner.tokenStart, this.scanner.tokenEnd, "url(")) {
						this.error("Function name must be `url`");
					}

					this.eat(FUNCTION$3);
					this.scanner.skipSC();
					value = this.String();
					this.scanner.skipSC();
					this.eat(RIGHTPARENTHESIS);
					break;

				default:
					this.error("Url or Function is expected");
			}

			return {
				type: "Url",
				loc: this.getLocation(start, this.scanner.tokenStart),
				value: value,
			};
		},
		generate: function (node) {
			this.chunk("url");
			this.chunk("(");
			this.node(node.value);
			this.chunk(")");
		},
	};

	var Value = {
		name: "Value",
		structure: {
			children: [[]],
		},
		parse: function () {
			var start = this.scanner.tokenStart;
			var children = this.readSequence(this.scope.Value);

			return {
				type: "Value",
				loc: this.getLocation(start, this.scanner.tokenStart),
				children: children,
			};
		},
		generate: function (node) {
			this.children(node);
		},
	};

	var WHITESPACE$2 = tokenizer$3.TYPE.WhiteSpace;
	var SPACE = Object.freeze({
		type: "WhiteSpace",
		loc: null,
		value: " ",
	});

	var WhiteSpace = {
		name: "WhiteSpace",
		structure: {
			value: String,
		},
		parse: function () {
			this.eat(WHITESPACE$2);
			return SPACE;

			// return {
			//     type: 'WhiteSpace',
			//     loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
			//     value: this.consume(WHITESPACE)
			// };
		},
		generate: function (node) {
			this.chunk(node.value);
		},
	};

	var node = {
		AnPlusB: AnPlusB,
		Atrule: Atrule,
		AtrulePrelude: AtrulePrelude,
		AttributeSelector: AttributeSelector,
		Block: Block,
		Brackets: Brackets,
		CDC: CDC_1,
		CDO: CDO_1,
		ClassSelector: ClassSelector,
		Combinator: Combinator,
		Comment: Comment,
		Declaration: Declaration,
		DeclarationList: DeclarationList,
		Dimension: Dimension,
		Function: _Function,
		Hash: Hash,
		Identifier: Identifier,
		IdSelector: IdSelector,
		MediaFeature: MediaFeature,
		MediaQuery: MediaQuery,
		MediaQueryList: MediaQueryList,
		Nth: Nth,
		Number: _Number,
		Operator: Operator,
		Parentheses: Parentheses,
		Percentage: Percentage,
		PseudoClassSelector: PseudoClassSelector,
		PseudoElementSelector: PseudoElementSelector,
		Ratio: Ratio,
		Raw: Raw,
		Rule: Rule,
		Selector: Selector,
		SelectorList: SelectorList,
		String: _String,
		StyleSheet: StyleSheet,
		TypeSelector: TypeSelector,
		UnicodeRange: UnicodeRange,
		Url: Url,
		Value: Value,
		WhiteSpace: WhiteSpace,
	};

	var data = data$1;

	var lexer = {
		generic: true,
		types: data.types,
		atrules: data.atrules,
		properties: data.properties,
		node: node,
	};

	var cmpChar = tokenizer$3.cmpChar;
	var cmpStr = tokenizer$3.cmpStr;
	var TYPE$4 = tokenizer$3.TYPE;

	var IDENT$3 = TYPE$4.Ident;
	var STRING$1 = TYPE$4.String;
	var NUMBER$1 = TYPE$4.Number;
	var FUNCTION$2 = TYPE$4.Function;
	var URL$2 = TYPE$4.Url;
	var HASH$1 = TYPE$4.Hash;
	var DIMENSION$1 = TYPE$4.Dimension;
	var PERCENTAGE$1 = TYPE$4.Percentage;
	var LEFTPARENTHESIS$2 = TYPE$4.LeftParenthesis;
	var LEFTSQUAREBRACKET$1 = TYPE$4.LeftSquareBracket;
	var COMMA$1 = TYPE$4.Comma;
	var DELIM$1 = TYPE$4.Delim;
	var NUMBERSIGN$1 = 0x0023; // U+0023 NUMBER SIGN (#)
	var ASTERISK$1 = 0x002a; // U+002A ASTERISK (*)
	var PLUSSIGN$1 = 0x002b; // U+002B PLUS SIGN (+)
	var HYPHENMINUS = 0x002d; // U+002D HYPHEN-MINUS (-)
	var SOLIDUS$1 = 0x002f; // U+002F SOLIDUS (/)
	var U = 0x0075; // U+0075 LATIN SMALL LETTER U (u)

	var _default = function defaultRecognizer(context) {
		switch (this.scanner.tokenType) {
			case HASH$1:
				return this.Hash();

			case COMMA$1:
				context.space = null;
				context.ignoreWSAfter = true;
				return this.Operator();

			case LEFTPARENTHESIS$2:
				return this.Parentheses(this.readSequence, context.recognizer);

			case LEFTSQUAREBRACKET$1:
				return this.Brackets(this.readSequence, context.recognizer);

			case STRING$1:
				return this.String();

			case DIMENSION$1:
				return this.Dimension();

			case PERCENTAGE$1:
				return this.Percentage();

			case NUMBER$1:
				return this.Number();

			case FUNCTION$2:
				return cmpStr(this.scanner.source, this.scanner.tokenStart, this.scanner.tokenEnd, "url(")
					? this.Url()
					: this.Function(this.readSequence, context.recognizer);

			case URL$2:
				return this.Url();

			case IDENT$3:
				// check for unicode range, it should start with u+ or U+
				if (
					cmpChar(this.scanner.source, this.scanner.tokenStart, U) &&
					cmpChar(this.scanner.source, this.scanner.tokenStart + 1, PLUSSIGN$1)
				) {
					return this.UnicodeRange();
				}
				return this.Identifier();

			case DELIM$1: {
				var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

				if (code === SOLIDUS$1 || code === ASTERISK$1 || code === PLUSSIGN$1 || code === HYPHENMINUS) {
					return this.Operator(); // TODO: replace with Delim
				}

				// TODO: produce a node with Delim node type

				if (code === NUMBERSIGN$1) {
					this.error("Hex or identifier is expected", this.scanner.tokenStart + 1);
				}

				break;
			}
		}
	};

	var atrulePrelude = {
		getNode: _default,
	};

	var TYPE$3 = tokenizer$3.TYPE;

	var DELIM = TYPE$3.Delim;
	var IDENT$2 = TYPE$3.Ident;
	var DIMENSION = TYPE$3.Dimension;
	var PERCENTAGE = TYPE$3.Percentage;
	var NUMBER = TYPE$3.Number;
	var HASH = TYPE$3.Hash;
	var COLON$1 = TYPE$3.Colon;
	var LEFTSQUAREBRACKET = TYPE$3.LeftSquareBracket;
	var NUMBERSIGN = 0x0023; // U+0023 NUMBER SIGN (#)
	var ASTERISK = 0x002a; // U+002A ASTERISK (*)
	var PLUSSIGN = 0x002b; // U+002B PLUS SIGN (+)
	var SOLIDUS = 0x002f; // U+002F SOLIDUS (/)
	var FULLSTOP = 0x002e; // U+002E FULL STOP (.)
	var GREATERTHANSIGN = 0x003e; // U+003E GREATER-THAN SIGN (>)
	var VERTICALLINE = 0x007c; // U+007C VERTICAL LINE (|)
	var TILDE = 0x007e; // U+007E TILDE (~)

	function getNode(context) {
		switch (this.scanner.tokenType) {
			case LEFTSQUAREBRACKET:
				return this.AttributeSelector();

			case HASH:
				return this.IdSelector();

			case COLON$1:
				if (this.scanner.lookupType(1) === COLON$1) {
					return this.PseudoElementSelector();
				}
				return this.PseudoClassSelector();

			case IDENT$2:
				return this.TypeSelector();

			case NUMBER:
			case PERCENTAGE:
				return this.Percentage();

			case DIMENSION:
				// throws when .123ident
				if (this.scanner.source.charCodeAt(this.scanner.tokenStart) === FULLSTOP) {
					this.error("Identifier is expected", this.scanner.tokenStart + 1);
				}
				break;

			case DELIM: {
				var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

				switch (code) {
					case PLUSSIGN:
					case GREATERTHANSIGN:
					case TILDE:
						context.space = null;
						context.ignoreWSAfter = true;
						return this.Combinator();

					case SOLIDUS: // /deep/
						return this.Combinator();

					case FULLSTOP:
						return this.ClassSelector();

					case ASTERISK:
					case VERTICALLINE:
						return this.TypeSelector();

					case NUMBERSIGN:
						return this.IdSelector();
				}

				break;
			}
		}
	}
	var selector = {
		getNode: getNode,
	};

	// legacy IE function
	// expression( <any-value> )
	var expression = function () {
		return this.createSingleNodeList(this.Raw(this.scanner.tokenIndex, null, false));
	};

	var TYPE$2 = tokenizer$3.TYPE;
	var rawMode = Raw.mode;

	var COMMA = TYPE$2.Comma;
	var WHITESPACE$1 = TYPE$2.WhiteSpace;

	// var( <ident> , <value>? )
	var _var = function () {
		var children = this.createList();

		this.scanner.skipSC();

		// NOTE: Don't check more than a first argument is an ident, rest checks are for lexer
		children.push(this.Identifier());

		this.scanner.skipSC();

		if (this.scanner.tokenType === COMMA) {
			children.push(this.Operator());

			const startIndex = this.scanner.tokenIndex;
			const value = this.parseCustomProperty
				? this.Value(null)
				: this.Raw(this.scanner.tokenIndex, rawMode.exclamationMarkOrSemicolon, false);

			if (value.type === "Value" && value.children.isEmpty()) {
				for (let offset = startIndex - this.scanner.tokenIndex; offset <= 0; offset++) {
					if (this.scanner.lookupType(offset) === WHITESPACE$1) {
						value.children.appendData({
							type: "WhiteSpace",
							loc: null,
							value: " ",
						});
						break;
					}
				}
			}

			children.push(value);
		}

		return children;
	};

	var value$2 = {
		getNode: _default,
		expression: expression,
		var: _var,
	};

	var scope = {
		AtrulePrelude: atrulePrelude,
		Selector: selector,
		Value: value$2,
	};

	var fontFace = {
		parse: {
			prelude: null,
			block: function () {
				return this.Block(true);
			},
		},
	};

	var TYPE$1 = tokenizer$3.TYPE;

	var STRING = TYPE$1.String;
	var IDENT$1 = TYPE$1.Ident;
	var URL$1 = TYPE$1.Url;
	var FUNCTION$1 = TYPE$1.Function;
	var LEFTPARENTHESIS$1 = TYPE$1.LeftParenthesis;

	var _import = {
		parse: {
			prelude: function () {
				var children = this.createList();

				this.scanner.skipSC();

				switch (this.scanner.tokenType) {
					case STRING:
						children.push(this.String());
						break;

					case URL$1:
					case FUNCTION$1:
						children.push(this.Url());
						break;

					default:
						this.error("String or url() is expected");
				}

				if (this.lookupNonWSType(0) === IDENT$1 || this.lookupNonWSType(0) === LEFTPARENTHESIS$1) {
					children.push(this.WhiteSpace());
					children.push(this.MediaQueryList());
				}

				return children;
			},
			block: null,
		},
	};

	var media = {
		parse: {
			prelude: function () {
				return this.createSingleNodeList(this.MediaQueryList());
			},
			block: function () {
				return this.Block(false);
			},
		},
	};

	var page = {
		parse: {
			prelude: function () {
				return this.createSingleNodeList(this.SelectorList());
			},
			block: function () {
				return this.Block(true);
			},
		},
	};

	var TYPE = tokenizer$3.TYPE;

	var WHITESPACE = TYPE.WhiteSpace;
	var COMMENT = TYPE.Comment;
	var IDENT = TYPE.Ident;
	var FUNCTION = TYPE.Function;
	var COLON = TYPE.Colon;
	var LEFTPARENTHESIS = TYPE.LeftParenthesis;

	function consumeRaw() {
		return this.createSingleNodeList(this.Raw(this.scanner.tokenIndex, null, false));
	}

	function parentheses() {
		this.scanner.skipSC();

		if (this.scanner.tokenType === IDENT && this.lookupNonWSType(1) === COLON) {
			return this.createSingleNodeList(this.Declaration());
		}

		return readSequence.call(this);
	}

	function readSequence() {
		var children = this.createList();
		var space = null;
		var child;

		this.scanner.skipSC();

		scan: while (!this.scanner.eof) {
			switch (this.scanner.tokenType) {
				case WHITESPACE:
					space = this.WhiteSpace();
					continue;

				case COMMENT:
					this.scanner.next();
					continue;

				case FUNCTION:
					child = this.Function(consumeRaw, this.scope.AtrulePrelude);
					break;

				case IDENT:
					child = this.Identifier();
					break;

				case LEFTPARENTHESIS:
					child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
					break;

				default:
					break scan;
			}

			if (space !== null) {
				children.push(space);
				space = null;
			}

			children.push(child);
		}

		return children;
	}

	var supports = {
		parse: {
			prelude: function () {
				var children = readSequence.call(this);

				if (this.getFirstListNode(children) === null) {
					this.error("Condition is expected");
				}

				return children;
			},
			block: function () {
				return this.Block(false);
			},
		},
	};

	var atrule = {
		"font-face": fontFace,
		import: _import,
		media: media,
		page: page,
		supports: supports,
	};

	var dir = {
		parse: function () {
			return this.createSingleNodeList(this.Identifier());
		},
	};

	var has = {
		parse: function () {
			return this.createSingleNodeList(this.SelectorList());
		},
	};

	var lang = {
		parse: function () {
			return this.createSingleNodeList(this.Identifier());
		},
	};

	var selectorList = {
		parse: function selectorList() {
			return this.createSingleNodeList(this.SelectorList());
		},
	};

	var matches = selectorList;

	var not = selectorList;

	var ALLOW_OF_CLAUSE = true;

	var nthWithOfClause = {
		parse: function nthWithOfClause() {
			return this.createSingleNodeList(this.Nth(ALLOW_OF_CLAUSE));
		},
	};

	var nthChild = nthWithOfClause;

	var nthLastChild = nthWithOfClause;

	var DISALLOW_OF_CLAUSE = false;

	var nth = {
		parse: function nth() {
			return this.createSingleNodeList(this.Nth(DISALLOW_OF_CLAUSE));
		},
	};

	var nthLastOfType = nth;

	var nthOfType = nth;

	var slotted = {
		parse: function compoundSelector() {
			return this.createSingleNodeList(this.Selector());
		},
	};

	var pseudo = {
		dir: dir,
		has: has,
		lang: lang,
		matches: matches,
		not: not,
		"nth-child": nthChild,
		"nth-last-child": nthLastChild,
		"nth-last-of-type": nthLastOfType,
		"nth-of-type": nthOfType,
		slotted: slotted,
	};

	var parser = {
		parseContext: {
			default: "StyleSheet",
			stylesheet: "StyleSheet",
			atrule: "Atrule",
			atrulePrelude: function (options) {
				return this.AtrulePrelude(options.atrule ? String(options.atrule) : null);
			},
			mediaQueryList: "MediaQueryList",
			mediaQuery: "MediaQuery",
			rule: "Rule",
			selectorList: "SelectorList",
			selector: "Selector",
			block: function () {
				return this.Block(true);
			},
			declarationList: "DeclarationList",
			declaration: "Declaration",
			value: "Value",
		},
		scope: scope,
		atrule: atrule,
		pseudo: pseudo,
		node: node,
	};

	var walker = {
		node: node,
	};

	var _args = [["css-tree@1.1.3", "/home/gitlab-runner/builds/BQJy2NwB/0/pagedjs/pagedjs"]];
	var _from = "css-tree@1.1.3";
	var _id = "css-tree@1.1.3";
	var _inBundle = false;
	var _integrity = "sha512-tRpdppF7TRazZrjJ6v3stzv93qxRcSsFmW6cX0Zm2NVKpxE1WV1HblnghVv9TreireHkqI/VDEsfolRF1p6y7Q==";
	var _location = "/css-tree";
	var _phantomChildren = {};
	var _requested = {
		type: "version",
		registry: true,
		raw: "css-tree@1.1.3",
		name: "css-tree",
		escapedName: "css-tree",
		rawSpec: "1.1.3",
		saveSpec: null,
		fetchSpec: "1.1.3",
	};
	var _requiredBy = ["/"];
	var _resolved = "https://registry.npmjs.org/css-tree/-/css-tree-1.1.3.tgz";
	var _spec = "1.1.3";
	var _where = "/home/gitlab-runner/builds/BQJy2NwB/0/pagedjs/pagedjs";
	var author = {
		name: "Roman Dvornov",
		email: "rdvornov@gmail.com",
		url: "https://github.com/lahmatiy",
	};
	var bugs = {
		url: "https://github.com/csstree/csstree/issues",
	};
	var dependencies = {
		"mdn-data": "2.0.14",
		"source-map": "^0.6.1",
	};
	var description =
		"A tool set for CSS: fast detailed parser (CSS → AST), walker (AST traversal), generator (AST → CSS) and lexer (validation and matching) based on specs and browser implementations";
	var devDependencies = {
		"@rollup/plugin-commonjs": "^11.0.2",
		"@rollup/plugin-json": "^4.0.2",
		"@rollup/plugin-node-resolve": "^7.1.1",
		coveralls: "^3.0.9",
		eslint: "^6.8.0",
		"json-to-ast": "^2.1.0",
		mocha: "^6.2.3",
		nyc: "^14.1.1",
		rollup: "^1.32.1",
		"rollup-plugin-terser": "^5.3.0",
	};
	var engines = {
		node: ">=8.0.0",
	};
	var files = ["data", "dist", "lib"];
	var homepage = "https://github.com/csstree/csstree#readme";
	var jsdelivr = "dist/csstree.min.js";
	var keywords = ["css", "ast", "tokenizer", "parser", "walker", "lexer", "generator", "utils", "syntax", "validation"];
	var license = "MIT";
	var main = "lib/index.js";
	var name = "css-tree";
	var repository = {
		type: "git",
		url: "git+https://github.com/csstree/csstree.git",
	};
	var scripts = {
		build: "rollup --config",
		coverage: "nyc npm test",
		coveralls: "nyc report --reporter=text-lcov | coveralls",
		hydrogen:
			"node --trace-hydrogen --trace-phase=Z --trace-deopt --code-comments --hydrogen-track-positions --redirect-code-traces --redirect-code-traces-to=code.asm --trace_hydrogen_file=code.cfg --print-opt-code bin/parse --stat -o /dev/null",
		lint: "eslint data lib scripts test && node scripts/review-syntax-patch --lint && node scripts/update-docs --lint",
		"lint-and-test": "npm run lint && npm test",
		prepublishOnly: "npm run build",
		"review:syntax-patch": "node scripts/review-syntax-patch",
		test: "mocha --reporter progress",
		travis: "nyc npm run lint-and-test && npm run coveralls",
		"update:docs": "node scripts/update-docs",
	};
	var unpkg = "dist/csstree.min.js";
	var version = "1.1.3";
	var require$$4 = {
		_args: _args,
		_from: _from,
		_id: _id,
		_inBundle: _inBundle,
		_integrity: _integrity,
		_location: _location,
		_phantomChildren: _phantomChildren,
		_requested: _requested,
		_requiredBy: _requiredBy,
		_resolved: _resolved,
		_spec: _spec,
		_where: _where,
		author: author,
		bugs: bugs,
		dependencies: dependencies,
		description: description,
		devDependencies: devDependencies,
		engines: engines,
		files: files,
		homepage: homepage,
		jsdelivr: jsdelivr,
		keywords: keywords,
		license: license,
		main: main,
		name: name,
		repository: repository,
		scripts: scripts,
		unpkg: unpkg,
		version: version,
	};

	function merge() {
		var dest = {};

		for (var i = 0; i < arguments.length; i++) {
			var src = arguments[i];
			for (var key in src) {
				dest[key] = src[key];
			}
		}

		return dest;
	}

	syntax.exports = create$4.create(merge(lexer, parser, walker));
	syntax.exports.version = require$$4.version;

	var syntaxExports = syntax.exports;

	var lib = syntaxExports;

	var csstree = /*@__PURE__*/ getDefaultExportFromCjs(lib);

	class Sheet {
		constructor(url, hooks) {
			if (hooks) {
				this.hooks = hooks;
			} else {
				this.hooks = {};
				this.hooks.onUrl = new Hook(this);
				this.hooks.onAtPage = new Hook(this);
				this.hooks.onAtMedia = new Hook(this);
				this.hooks.onRule = new Hook(this);
				this.hooks.onDeclaration = new Hook(this);
				this.hooks.onSelector = new Hook(this);
				this.hooks.onPseudoSelector = new Hook(this);

				this.hooks.onContent = new Hook(this);
				this.hooks.onImport = new Hook(this);

				this.hooks.beforeTreeParse = new Hook(this);
				this.hooks.beforeTreeWalk = new Hook(this);
				this.hooks.afterTreeWalk = new Hook(this);
			}

			try {
				this.url = new URL(url, window.location.href);
			} catch (_e) {
				this.url = new URL(window.location.href);
			}
		}

		// parse
		async parse(text) {
			this.text = text;

			await this.hooks.beforeTreeParse.trigger(this.text, this);

			// send to csstree
			this.ast = csstree.parse(this._text);

			await this.hooks.beforeTreeWalk.trigger(this.ast);

			// Replace urls
			this.replaceUrls(this.ast);

			// Scope
			this.id = UUID();
			// this.addScope(this.ast, this.uuid);

			// Replace IDs with data-id
			this.replaceIds(this.ast);

			this.imported = [];

			// Trigger Hooks
			this.urls(this.ast);
			this.rules(this.ast);
			this.atrules(this.ast);

			await this.hooks.afterTreeWalk.trigger(this.ast, this);

			// return ast
			return this.ast;
		}

		insertRule(rule) {
			const inserted = this.ast.children.appendData(rule);

			this.declarations(rule);

			return inserted;
		}

		urls(ast) {
			csstree.walk(ast, {
				visit: "Url",
				enter: (node, item, list) => {
					this.hooks.onUrl.trigger(node, item, list);
				},
			});
		}

		atrules(ast) {
			csstree.walk(ast, {
				visit: "Atrule",
				enter: (node, item, list) => {
					const basename = csstree.keyword(node.name).basename;

					if (basename === "page") {
						this.hooks.onAtPage.trigger(node, item, list);
						this.declarations(node, item, list);
					}

					if (basename === "media") {
						this.hooks.onAtMedia.trigger(node, item, list);
						this.declarations(node, item, list);
					}

					if (basename === "import") {
						this.hooks.onImport.trigger(node, item, list);
						this.imports(node, item, list);
					}
				},
			});
		}

		rules(ast) {
			csstree.walk(ast, {
				visit: "Rule",
				enter: (ruleNode, ruleItem, rulelist) => {
					this.hooks.onRule.trigger(ruleNode, ruleItem, rulelist);
					this.declarations(ruleNode, ruleItem, rulelist);
					this.onSelector(ruleNode, ruleItem, rulelist);
				},
			});
		}

		declarations(ruleNode, ruleItem, rulelist) {
			csstree.walk(ruleNode, {
				visit: "Declaration",
				enter: (declarationNode, dItem, dList) => {
					this.hooks.onDeclaration.trigger(declarationNode, dItem, dList, { ruleNode, ruleItem, rulelist });

					if (declarationNode.property === "content") {
						csstree.walk(declarationNode, {
							visit: "Function",
							enter: (funcNode, fItem, fList) => {
								this.hooks.onContent.trigger(
									funcNode,
									fItem,
									fList,
									{ declarationNode, dItem, dList },
									{ ruleNode, ruleItem, rulelist },
								);
							},
						});
					}
				},
			});
		}

		// add pseudo elements to parser
		onSelector(ruleNode, ruleItem, rulelist) {
			csstree.walk(ruleNode, {
				visit: "Selector",
				enter: (selectNode, selectItem, selectList) => {
					this.hooks.onSelector.trigger(selectNode, selectItem, selectList, { ruleNode, ruleItem, rulelist });

					if (
						selectNode.children.forEach((node) => {
							if (node.type === "PseudoElementSelector") {
								csstree.walk(node, {
									visit: "PseudoElementSelector",
									enter: (pseudoNode, pItem, pList) => {
										this.hooks.onPseudoSelector.trigger(
											pseudoNode,
											pItem,
											pList,
											{ selectNode, selectItem, selectList },
											{ ruleNode, ruleItem, rulelist },
										);
									},
								});
							}
						})
					);
				},
			});
		}

		replaceUrls(ast) {
			csstree.walk(ast, {
				visit: "Url",
				enter: (node, _item, _list) => {
					const content = node.value.value;
					if (
						(node.value.type === "Raw" && content.startsWith("data:")) ||
						(node.value.type === "String" && (content.startsWith('"data:') || content.startsWith("'data:")))
					);
					else {
						const href = content.replace(/["']/g, "");
						const url = new URL(href, this.url);
						node.value.value = url.toString();
					}
				},
			});
		}

		addScope(ast, id) {
			// Get all selector lists
			// add an id
			csstree.walk(ast, {
				visit: "Selector",
				enter: (node, _item, _list) => {
					const children = node.children;
					children.prepend(
						children.createItem({
							type: "WhiteSpace",
							value: " ",
						}),
					);
					children.prepend(
						children.createItem({
							type: "IdSelector",
							name: id,
							loc: null,
							children: null,
						}),
					);
				},
			});
		}

		getNamedPageSelectors(ast) {
			const namedPageSelectors = {};
			csstree.walk(ast, {
				visit: "Rule",
				enter: (node, _item, _list) => {
					csstree.walk(node, {
						visit: "Declaration",
						enter: (declaration, _dItem, _dList) => {
							if (declaration.property === "page") {
								const value = declaration.value.children.first();
								const name = value.name;
								const selector = csstree.generate(node.prelude);
								namedPageSelectors[name] = {
									name: name,
									selector: selector,
								};

								// dList.remove(dItem);

								// Add in page break
								declaration.property = "break-before";
								value.type = "Identifier";
								value.name = "always";
							}
						},
					});
				},
			});
			return namedPageSelectors;
		}

		replaceIds(ast) {
			csstree.walk(ast, {
				visit: "Rule",
				enter: (node, _item, _list) => {
					csstree.walk(node, {
						visit: "IdSelector",
						enter: (idNode, _idItem, _idList) => {
							const name = idNode.name;
							idNode.flags = null;
							idNode.matcher = "=";
							idNode.name = { type: "Identifier", loc: null, name: "data-id" };
							idNode.type = "AttributeSelector";
							idNode.value = { type: "String", loc: null, value: `"${name}"` };
						},
					});
				},
			});
		}

		imports(node, item, list) {
			// console.log("import", node, item, list);
			const queries = [];
			csstree.walk(node, {
				visit: "MediaQuery",
				enter: (mqNode, _mqItem, _mqList) => {
					csstree.walk(mqNode, {
						visit: "Identifier",
						enter: (identNode, _identItem, _identList) => {
							queries.push(identNode.name);
						},
					});
				},
			});

			// Just basic media query support for now
			const shouldNotApply = queries.some((query, index) => {
				let q = query;
				if (q === "not") {
					q = queries[index + 1];
					return !(q === "screen" || q === "speech");
				}
				return q === "screen" || q === "speech";
			});

			if (shouldNotApply) {
				return;
			}

			csstree.walk(node, {
				visit: "String",
				enter: (urlNode, _urlItem, _urlList) => {
					const href = urlNode.value.replace(/["']/g, "");
					const url = new URL(href, this.url);
					const value = url.toString();

					this.imported.push(value);

					// Remove the original
					list.remove(item);
				},
			});
		}

		set text(t) {
			this._text = t;
		}

		get text() {
			return this._text;
		}

		// generate string
		toString(ast) {
			return csstree.generate(ast || this.ast);
		}
	}

	var baseStyles = `
:root {
	--pagedjs-width: 8.5in;
	--pagedjs-height: 11in;
	--pagedjs-width-right: 8.5in;
	--pagedjs-height-right: 11in;
	--pagedjs-width-left: 8.5in;
	--pagedjs-height-left: 11in;
	--pagedjs-pagebox-width: 8.5in;
	--pagedjs-pagebox-height: 11in;
	--pagedjs-footnotes-height: 0mm;
	--pagedjs-margin-top: 1in;
	--pagedjs-margin-right: 1in;
	--pagedjs-margin-bottom: 1in;
	--pagedjs-margin-left: 1in;
	--pagedjs-padding-top: 0mm;
	--pagedjs-padding-right: 0mm;
	--pagedjs-padding-bottom: 0mm;
	--pagedjs-padding-left: 0mm;
	--pagedjs-border-top: 0mm;
	--pagedjs-border-right: 0mm;
	--pagedjs-border-bottom: 0mm;
	--pagedjs-border-left: 0mm;
	--pagedjs-bleed-top: 0mm;
	--pagedjs-bleed-right: 0mm;
	--pagedjs-bleed-bottom: 0mm;
	--pagedjs-bleed-left: 0mm;
	--pagedjs-bleed-right-top: 0mm;
	--pagedjs-bleed-right-right: 0mm;
	--pagedjs-bleed-right-bottom: 0mm;
	--pagedjs-bleed-right-left: 0mm;
	--pagedjs-bleed-left-top: 0mm;
	--pagedjs-bleed-left-right: 0mm;
	--pagedjs-bleed-left-bottom: 0mm;
	--pagedjs-bleed-left-left: 0mm;
	--pagedjs-crop-color: black;
	--pagedjs-crop-shadow: white;
	--pagedjs-crop-offset: 2mm;
	--pagedjs-crop-stroke: 1px;
	--pagedjs-cross-size: 5mm;
	--pagedjs-mark-cross-display: none;
	--pagedjs-mark-crop-display: none;
	--pagedjs-page-count: 0;
	--pagedjs-page-counter-increment: 1;
	--pagedjs-footnotes-count: 0;
	--pagedjs-column-gap-offset: 1000px;
}

@page {
	size: letter;
	margin: 0;
}

.pagedjs_sheet {
	box-sizing: border-box;
	width: var(--pagedjs-width);
	height: var(--pagedjs-height);
	overflow: hidden;
	position: relative;
	display: grid;
	grid-template-columns: [bleed-left] var(--pagedjs-bleed-left) [sheet-center] calc(var(--pagedjs-width) - var(--pagedjs-bleed-left) - var(--pagedjs-bleed-right)) [bleed-right] var(--pagedjs-bleed-right);
	grid-template-rows: [bleed-top] var(--pagedjs-bleed-top) [sheet-middle] calc(var(--pagedjs-height) - var(--pagedjs-bleed-top) - var(--pagedjs-bleed-bottom)) [bleed-bottom] var(--pagedjs-bleed-bottom);
}

.pagedjs_right_page .pagedjs_sheet {
	width: var(--pagedjs-width-right);
	height: var(--pagedjs-height-right);
	grid-template-columns: [bleed-left] var(--pagedjs-bleed-right-left) [sheet-center] calc(var(--pagedjs-width) - var(--pagedjs-bleed-right-left) - var(--pagedjs-bleed-right-right)) [bleed-right] var(--pagedjs-bleed-right-right);
	grid-template-rows: [bleed-top] var(--pagedjs-bleed-right-top) [sheet-middle] calc(var(--pagedjs-height) - var(--pagedjs-bleed-right-top) - var(--pagedjs-bleed-right-bottom)) [bleed-bottom] var(--pagedjs-bleed-right-bottom);
}

.pagedjs_left_page .pagedjs_sheet {
	width: var(--pagedjs-width-left);
	height: var(--pagedjs-height-left);
	grid-template-columns: [bleed-left] var(--pagedjs-bleed-left-left) [sheet-center] calc(var(--pagedjs-width) - var(--pagedjs-bleed-left-left) - var(--pagedjs-bleed-left-right)) [bleed-right] var(--pagedjs-bleed-left-right);
	grid-template-rows: [bleed-top] var(--pagedjs-bleed-left-top) [sheet-middle] calc(var(--pagedjs-height) - var(--pagedjs-bleed-left-top) - var(--pagedjs-bleed-left-bottom)) [bleed-bottom] var(--pagedjs-bleed-left-bottom);
}

.pagedjs_bleed {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	overflow: hidden;
}

.pagedjs_bleed-top {
	grid-column: bleed-left / -1;
	grid-row: bleed-top;
	flex-direction: row;
}

.pagedjs_bleed-bottom {
	grid-column: bleed-left / -1;
	grid-row: bleed-bottom;
	flex-direction: row;
}

.pagedjs_bleed-left {
	grid-column: bleed-left;
	grid-row: bleed-top / -1;
	flex-direction: column;
}

.pagedjs_bleed-right {
	grid-column: bleed-right;
	grid-row: bleed-top / -1;
	flex-direction: column;
}

.pagedjs_marks-crop {
	display: var(--pagedjs-mark-crop-display);
	flex-grow: 0;
	flex-shrink: 0;
	z-index: 9999999999;
}

.pagedjs_bleed-top .pagedjs_marks-crop:nth-child(1),
.pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(1) {
	width: calc(var(--pagedjs-bleed-left) - var(--pagedjs-crop-stroke));
	border-right: var(--pagedjs-crop-stroke) solid var(--pagedjs-crop-color);
	box-shadow: 1px 0px 0px 0px var(--pagedjs-crop-shadow);
}

.pagedjs_right_page .pagedjs_bleed-top .pagedjs_marks-crop:nth-child(1),
.pagedjs_right_page .pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(1) {
	width: calc(var(--pagedjs-bleed-right-left) - var(--pagedjs-crop-stroke));
}

.pagedjs_left_page .pagedjs_bleed-top .pagedjs_marks-crop:nth-child(1),
.pagedjs_left_page .pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(1) {
	width: calc(var(--pagedjs-bleed-left-left) - var(--pagedjs-crop-stroke));
}

.pagedjs_bleed-top .pagedjs_marks-crop:nth-child(3),
.pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(3) {
	width: calc(var(--pagedjs-bleed-right) - var(--pagedjs-crop-stroke));
	border-left: var(--pagedjs-crop-stroke) solid var(--pagedjs-crop-color);
	box-shadow: -1px 0px 0px 0px var(--pagedjs-crop-shadow);
}

.pagedjs_right_page .pagedjs_bleed-top .pagedjs_marks-crop:nth-child(3),
.pagedjs_right_page .pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(3) {
	width: calc(var(--pagedjs-bleed-right-right) - var(--pagedjs-crop-stroke));
}

.pagedjs_left_page .pagedjs_bleed-top .pagedjs_marks-crop:nth-child(3),
.pagedjs_left_page .pagedjs_bleed-bottom .pagedjs_marks-crop:nth-child(3) {
	width: calc(var(--pagedjs-bleed-left-right) - var(--pagedjs-crop-stroke));
}

.pagedjs_bleed-top .pagedjs_marks-crop {
	align-self: flex-start;
	height: calc(var(--pagedjs-bleed-top) - var(--pagedjs-crop-offset));
}

.pagedjs_right_page .pagedjs_bleed-top .pagedjs_marks-crop {
	height: calc(var(--pagedjs-bleed-right-top) - var(--pagedjs-crop-offset));
}

.pagedjs_left_page .pagedjs_bleed-top .pagedjs_marks-crop {
	height: calc(var(--pagedjs-bleed-left-top) - var(--pagedjs-crop-offset));
}

.pagedjs_bleed-bottom .pagedjs_marks-crop {
	align-self: flex-end;
	height: calc(var(--pagedjs-bleed-bottom) - var(--pagedjs-crop-offset));
}

.pagedjs_right_page .pagedjs_bleed-bottom .pagedjs_marks-crop {
	height: calc(var(--pagedjs-bleed-right-bottom) - var(--pagedjs-crop-offset));
}

.pagedjs_left_page .pagedjs_bleed-bottom .pagedjs_marks-crop {
	height: calc(var(--pagedjs-bleed-left-bottom) - var(--pagedjs-crop-offset));
}

.pagedjs_bleed-left .pagedjs_marks-crop:nth-child(1),
.pagedjs_bleed-right .pagedjs_marks-crop:nth-child(1) {
	height: calc(var(--pagedjs-bleed-top) - var(--pagedjs-crop-stroke));
	border-bottom: var(--pagedjs-crop-stroke) solid var(--pagedjs-crop-color);
	box-shadow: 0px 1px 0px 0px var(--pagedjs-crop-shadow);
}

.pagedjs_right_page .pagedjs_bleed-left .pagedjs_marks-crop:nth-child(1),
.pagedjs_right_page .pagedjs_bleed-right .pagedjs_marks-crop:nth-child(1) {
	height: calc(var(--pagedjs-bleed-right-top) - var(--pagedjs-crop-stroke));
}

.pagedjs_left_page .pagedjs_bleed-left .pagedjs_marks-crop:nth-child(1),
.pagedjs_left_page .pagedjs_bleed-right .pagedjs_marks-crop:nth-child(1) {
	height: calc(var(--pagedjs-bleed-left-top) - var(--pagedjs-crop-stroke));
}

.pagedjs_bleed-left .pagedjs_marks-crop:nth-child(3),
.pagedjs_bleed-right .pagedjs_marks-crop:nth-child(3) {
	height: calc(var(--pagedjs-bleed-bottom) - var(--pagedjs-crop-stroke));
	border-top: var(--pagedjs-crop-stroke) solid var(--pagedjs-crop-color);
	box-shadow: 0px -1px 0px 0px var(--pagedjs-crop-shadow);
}

.pagedjs_right_page .pagedjs_bleed-left .pagedjs_marks-crop:nth-child(3),
.pagedjs_right_page .pagedjs_bleed-right .pagedjs_marks-crop:nth-child(3) {
	height: calc(var(--pagedjs-bleed-right-bottom) - var(--pagedjs-crop-stroke));
}

.pagedjs_left_page .pagedjs_bleed-left .pagedjs_marks-crop:nth-child(3),
.pagedjs_left_page .pagedjs_bleed-right .pagedjs_marks-crop:nth-child(3) {
	height: calc(var(--pagedjs-bleed-left-bottom) - var(--pagedjs-crop-stroke));
}

.pagedjs_bleed-left .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-left) - var(--pagedjs-crop-offset));
	align-self: flex-start;
}

.pagedjs_right_page .pagedjs_bleed-left .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-right-left) - var(--pagedjs-crop-offset));
}

.pagedjs_left_page .pagedjs_bleed-left .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-left-left) - var(--pagedjs-crop-offset));
}

.pagedjs_bleed-right .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-right) - var(--pagedjs-crop-offset));
	align-self: flex-end;
}

.pagedjs_right_page .pagedjs_bleed-right .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-right-right) - var(--pagedjs-crop-offset));
}

.pagedjs_left_page .pagedjs_bleed-right .pagedjs_marks-crop {
	width: calc(var(--pagedjs-bleed-left-right) - var(--pagedjs-crop-offset));
}

.pagedjs_marks-middle {
	display: flex;
	flex-grow: 1;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
}

.pagedjs_marks-cross {
	display: var(--pagedjs-mark-cross-display);
	background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMi41MzdweCIgaGVpZ2h0PSIzMi41MzdweCIgdmlld0JveD0iMC4xMDQgMC4xMDQgMzIuNTM3IDMyLjUzNyIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwLjEwNCAwLjEwNCAzMi41MzcgMzIuNTM3IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMy4zODkzIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGQ9Ik0yOS45MzEsMTYuMzczYzAsNy40ODktNi4wNjgsMTMuNTYtMTMuNTU4LDEzLjU2Yy03LjQ4MywwLTEzLjU1Ny02LjA3Mi0xMy41NTctMTMuNTZjMC03LjQ4Niw2LjA3NC0xMy41NTQsMTMuNTU3LTEzLjU1NEMyMy44NjIsMi44MTksMjkuOTMxLDguODg3LDI5LjkzMSwxNi4zNzN6Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjMuMzg5MyIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiB4MT0iMC4xMDQiIHkxPSIxNi4zNzMiIHgyPSIzMi42NDIiIHkyPSIxNi4zNzMiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMy4zODkzIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHgxPSIxNi4zNzMiIHkxPSIwLjEwNCIgeDI9IjE2LjM3MyIgeTI9IjMyLjY0MiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIzLjM4OTMiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTI0LjUwOCwxNi4zNzNjMCw0LjQ5Ni0zLjYzOCw4LjEzNS04LjEzNSw4LjEzNWMtNC40OTEsMC04LjEzNS0zLjYzOC04LjEzNS04LjEzNWMwLTQuNDg5LDMuNjQ0LTguMTM1LDguMTM1LTguMTM1QzIwLjg2OSw4LjIzOSwyNC41MDgsMTEuODg0LDI0LjUwOCwxNi4zNzN6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjAuNjc3OCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNMjkuOTMxLDE2LjM3M2MwLDcuNDg5LTYuMDY4LDEzLjU2LTEzLjU1OCwxMy41NmMtNy40ODMsMC0xMy41NTctNi4wNzItMTMuNTU3LTEzLjU2YzAtNy40ODYsNi4wNzQtMTMuNTU0LDEzLjU1Ny0xMy41NTRDMjMuODYyLDIuODE5LDI5LjkzMSw4Ljg4NywyOS45MzEsMTYuMzczeiIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIwLjY3NzgiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgeDE9IjAuMTA0IiB5MT0iMTYuMzczIiB4Mj0iMzIuNjQyIiB5Mj0iMTYuMzczIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjAuNjc3OCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiB4MT0iMTYuMzczIiB5MT0iMC4xMDQiIHgyPSIxNi4zNzMiIHkyPSIzMi42NDIiLz48cGF0aCBkPSJNMjQuNTA4LDE2LjM3M2MwLDQuNDk2LTMuNjM4LDguMTM1LTguMTM1LDguMTM1Yy00LjQ5MSwwLTguMTM1LTMuNjM4LTguMTM1LTguMTM1YzAtNC40ODksMy42NDQtOC4xMzUsOC4xMzUtOC4xMzVDMjAuODY5LDguMjM5LDI0LjUwOCwxMS44ODQsMjQuNTA4LDE2LjM3MyIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIwLjY3NzgiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgeDE9IjguMjM5IiB5MT0iMTYuMzczIiB4Mj0iMjQuNTA4IiB5Mj0iMTYuMzczIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjAuNjc3OCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiB4MT0iMTYuMzczIiB5MT0iOC4yMzkiIHgyPSIxNi4zNzMiIHkyPSIyNC41MDgiLz48L3N2Zz4=);
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-size: var(--pagedjs-cross-size);

  z-index: 2147483647;
	width: var(--pagedjs-cross-size);
	height: var(--pagedjs-cross-size);
}

.pagedjs_pagebox {
	box-sizing: border-box;
	width: var(--pagedjs-pagebox-width);
	height: var(--pagedjs-pagebox-height);
	position: relative;
	display: grid;
	grid-template-columns: [left] var(--pagedjs-margin-left) [center] calc(var(--pagedjs-pagebox-width) - var(--pagedjs-margin-left) - var(--pagedjs-margin-right)) [right] var(--pagedjs-margin-right);
	grid-template-rows: [header] var(--pagedjs-margin-top) [page] calc(var(--pagedjs-pagebox-height) - var(--pagedjs-margin-top) - var(--pagedjs-margin-bottom)) [footer] var(--pagedjs-margin-bottom);
	grid-column: sheet-center;
	grid-row: sheet-middle;
}

.pagedjs_pagebox * {
	box-sizing: border-box;
}

.pagedjs_margin-top {
	width: calc(var(--pagedjs-pagebox-width) - var(--pagedjs-margin-left) - var(--pagedjs-margin-right));
	height: var(--pagedjs-margin-top);
	grid-column: center;
	grid-row: header;
	flex-wrap: nowrap;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	grid-template-rows: 100%;
}

.pagedjs_margin-top-left-corner-holder {
	width: var(--pagedjs-margin-left);
	height: var(--pagedjs-margin-top);
	display: flex;
	grid-column: left;
	grid-row: header;
}

.pagedjs_margin-top-right-corner-holder {
	width: var(--pagedjs-margin-right);
	height: var(--pagedjs-margin-top);
	display: flex;
	grid-column: right;
	grid-row: header;
}

.pagedjs_margin-top-left-corner {
	width: var(--pagedjs-margin-left);
}

.pagedjs_margin-top-right-corner {
	width: var(--pagedjs-margin-right);
}

.pagedjs_margin-right {
	height: calc(var(--pagedjs-pagebox-height) - var(--pagedjs-margin-top) - var(--pagedjs-margin-bottom));
	width: var(--pagedjs-margin-right);
	right: 0;
	grid-column: right;
	grid-row: page;
	display: grid;
	grid-template-rows: repeat(3, 33.3333%);
	grid-template-columns: 100%;
}

.pagedjs_margin-bottom {
	width: calc(var(--pagedjs-pagebox-width) - var(--pagedjs-margin-left) - var(--pagedjs-margin-right));
	height: var(--pagedjs-margin-bottom);
	grid-column: center;
	grid-row: footer;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	grid-template-rows: 100%;
}

.pagedjs_margin-bottom-left-corner-holder {
	width: var(--pagedjs-margin-left);
	height: var(--pagedjs-margin-bottom);
	display: flex;
	grid-column: left;
	grid-row: footer;
}

.pagedjs_margin-bottom-right-corner-holder {
	width: var(--pagedjs-margin-right);
	height: var(--pagedjs-margin-bottom);
	display: flex;
	grid-column: right;
	grid-row: footer;
}

.pagedjs_margin-bottom-left-corner {
	width: var(--pagedjs-margin-left);
}

.pagedjs_margin-bottom-right-corner {
	width: var(--pagedjs-margin-right);
}



.pagedjs_margin-left {
	height: calc(var(--pagedjs-pagebox-height) - var(--pagedjs-margin-top) - var(--pagedjs-margin-bottom));
	width: var(--pagedjs-margin-left);
	grid-column: left;
	grid-row: page;
	display: grid;
	grid-template-rows: repeat(3, 33.33333%);
	grid-template-columns: 100%;
}

.pagedjs_pages .pagedjs_pagebox .pagedjs_margin:not(.hasContent) {
	visibility: hidden;
}

.pagedjs_pagebox > .pagedjs_area {
	grid-column: center;
	grid-row: page;
	width: 100%;
	height: 100%;
	padding: var(--pagedjs-padding-top) var(--pagedjs-padding-right) var(--pagedjs-padding-bottom) var(--pagedjs-padding-left);
	border-top: var(--pagedjs-border-top);
	border-right: var(--pagedjs-border-right);
	border-bottom: var(--pagedjs-border-bottom);
	border-left: var(--pagedjs-border-left);
}

.pagedjs_pagebox > .pagedjs_area > .pagedjs_page_content {
	width: 100%;
	height: calc(100% - var(--pagedjs-footnotes-height));
	position: relative;
	column-fill: auto;
}

.pagedjs_pagebox > .pagedjs_area > .pagedjs_page_content > div {
	height: inherit;
}

.pagedjs_pagebox > .pagedjs_area > .pagedjs_footnote_area {
	position: relative;
	overflow: hidden;
	height: var(--pagedjs-footnotes-height);
	display: flex;
    justify-content: flex-end;
    flex-flow: column;
}

.pagedjs_pagebox > .pagedjs_area > .pagedjs_footnote_area > .pagedjs_footnote_content {
	overflow: hidden;
}

.pagedjs_pagebox > .pagedjs_area > .pagedjs_footnote_area > .pagedjs_footnote_inner_content {
	overflow: hidden;
}

.pagedjs_area [data-footnote-call] {
	all: unset;
	counter-increment: footnote;
}

.pagedjs_area [data-split-from] {
	counter-increment: unset;
	counter-reset: unset;
}

[data-footnote-call]::after {
	vertical-align: super;
	font-size: 65%;
	line-height: normal;
	content: counter(footnote);
}

@supports ( font-variant-position: super ) {
	[data-footnote-call]::after {
		vertical-align: baseline;
		font-size: 100%;
		line-height: inherit;
		font-variant-position: super;
	}
}

.pagedjs_footnote_empty {
	display: none;
}

.pagedjs_area [data-split-from] {
	counter-increment: unset;
	counter-reset: unset;
}

[data-footnote-marker] {
	text-indent: 0;
	display: list-item;
	list-style-position: inside;
}

[data-footnote-marker][data-split-from] {
	list-style: none;
}

[data-footnote-marker]:not([data-split-from]) {
	counter-increment: footnote-marker;
}

[data-footnote-marker]::marker {
	content: counter(footnote-marker) ". ";
}

[data-footnote-marker][data-split-from]::marker {
	content: unset;
}

.pagedjs_area .pagedjs_footnote_inner_content [data-note-display="inline"] {
 	display: inline;
}

.pagedjs_page {
	counter-increment: page var(--pagedjs-page-counter-increment);
	width: var(--pagedjs-width);
	height: var(--pagedjs-height);
}

.pagedjs_page.pagedjs_right_page {
	width: var(--pagedjs-width-right);
	height: var(--pagedjs-height-right);
}

.pagedjs_page.pagedjs_left_page {
	width: var(--pagedjs-width-left);
	height: var(--pagedjs-height-left);
}

.pagedjs_pages {
	counter-reset: pages var(--pagedjs-page-count) footnote var(--pagedjs-footnotes-count) footnote-marker var(--pagedjs-footnotes-count);
}

.pagedjs_pagebox .pagedjs_margin-top-left-corner,
.pagedjs_pagebox .pagedjs_margin-top-right-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-left-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-right-corner,
.pagedjs_pagebox .pagedjs_margin-top-left,
.pagedjs_pagebox .pagedjs_margin-top-right,
.pagedjs_pagebox .pagedjs_margin-bottom-left,
.pagedjs_pagebox .pagedjs_margin-bottom-right,
.pagedjs_pagebox .pagedjs_margin-top-center,
.pagedjs_pagebox .pagedjs_margin-bottom-center,
.pagedjs_pagebox .pagedjs_margin-top-center,
.pagedjs_pagebox .pagedjs_margin-bottom-center,
.pagedjs_margin-right-middle,
.pagedjs_margin-left-middle  {
	display: flex;
	align-items: center;
}

.pagedjs_margin-right-top,
.pagedjs_margin-left-top  {
	display: flex;
	align-items: flex-top;
}


.pagedjs_margin-right-bottom,
.pagedjs_margin-left-bottom  {
	display: flex;
	align-items: flex-end;
}



/*
.pagedjs_pagebox .pagedjs_margin-top-center,
.pagedjs_pagebox .pagedjs_margin-bottom-center {
	height: 100%;
	display: none;
	align-items: center;
	flex: 1 0 33%;
	margin: 0 auto;
}

.pagedjs_pagebox .pagedjs_margin-top-left-corner,
.pagedjs_pagebox .pagedjs_margin-top-right-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-right-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-left-corner {
	display: none;
	align-items: center;
}

.pagedjs_pagebox .pagedjs_margin-left-top,
.pagedjs_pagebox .pagedjs_margin-right-top {
	display: none;
	align-items: flex-start;
}

.pagedjs_pagebox .pagedjs_margin-right-middle,
.pagedjs_pagebox .pagedjs_margin-left-middle {
	display: none;
	align-items: center;
}

.pagedjs_pagebox .pagedjs_margin-left-bottom,
.pagedjs_pagebox .pagedjs_margin-right-bottom {
	display: none;
	align-items: flex-end;
}
*/

.pagedjs_pagebox .pagedjs_margin-top-left,
.pagedjs_pagebox .pagedjs_margin-top-right-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-left,
.pagedjs_pagebox .pagedjs_margin-bottom-right-corner { text-align: left; }

.pagedjs_pagebox .pagedjs_margin-top-left-corner,
.pagedjs_pagebox .pagedjs_margin-top-right,
.pagedjs_pagebox .pagedjs_margin-bottom-left-corner,
.pagedjs_pagebox .pagedjs_margin-bottom-right { text-align: right; }

.pagedjs_pagebox .pagedjs_margin-top-center,
.pagedjs_pagebox .pagedjs_margin-bottom-center,
.pagedjs_pagebox .pagedjs_margin-left-top,
.pagedjs_pagebox .pagedjs_margin-left-middle,
.pagedjs_pagebox .pagedjs_margin-left-bottom,
.pagedjs_pagebox .pagedjs_margin-right-top,
.pagedjs_pagebox .pagedjs_margin-right-middle,
.pagedjs_pagebox .pagedjs_margin-right-bottom { text-align: center; }

.pagedjs_pages .pagedjs_margin .pagedjs_margin-content {
	width: 100%;
}

.pagedjs_pages .pagedjs_margin-left .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-top .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-right .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-bottom .pagedjs_margin-content::after {
	display: block;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-to] {
	margin-bottom: unset;
	padding-bottom: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-from] {
	text-indent: unset;
	margin-top: unset;
	padding-top: unset;
	initial-letter: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-from] > *::first-letter,
.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-from]::first-letter {
	color: unset;
	font-size: unset;
	font-weight: unset;
	font-family: unset;
	color: unset;
	line-height: unset;
	float: unset;
	padding: unset;
	margin: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-to]:not([data-footnote-call]):after,
.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-to]:not([data-footnote-call])::after {
	content: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-from]:not([data-footnote-call]):before,
.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div [data-split-from]:not([data-footnote-call])::before {
	content: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_sheet > .pagedjs_pagebox > .pagedjs_area > div li[data-split-from]:first-of-type {
	list-style: none;
}

/*
[data-page]:not([data-split-from]),
[data-break-before="page"]:not([data-split-from]),
[data-break-before="always"]:not([data-split-from]),
[data-break-before="left"]:not([data-split-from]),
[data-break-before="right"]:not([data-split-from]),
[data-break-before="recto"]:not([data-split-from]),
[data-break-before="verso"]:not([data-split-from])
{
	break-before: column;
}

[data-page]:not([data-split-to]),
[data-break-after="page"]:not([data-split-to]),
[data-break-after="always"]:not([data-split-to]),
[data-break-after="left"]:not([data-split-to]),
[data-break-after="right"]:not([data-split-to]),
[data-break-after="recto"]:not([data-split-to]),
[data-break-after="verso"]:not([data-split-to])
{
	break-after: column;
}
*/

.pagedjs_clear-after::after {
	content: none !important;
}

[data-align-last-split-element='justify'] {
	text-align-last: justify;
}


@media print {
	html {
		width: 100%;
		height: 100%;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	body {
		margin: 0;
		padding: 0;
		width: 100% !important;
		height: 100% !important;
		min-width: 100%;
		max-width: 100%;
		min-height: 100%;
		max-height: 100%;
	}
	.pagedjs_pages {
		width: auto;
		display: block !important;
		transform: none !important;
		height: 100% !important;
		min-height: 100%;
		max-height: 100%;
		overflow: visible;
	}
	.pagedjs_page {
		margin: 0;
		padding: 0;
		max-height: 100%;
		min-height: 100%;
		height: 100% !important;
		page-break-after: always;
		break-after: page;
	}
	.pagedjs_sheet {
		margin: 0;
		padding: 0;
		max-height: 100%;
		min-height: 100%;
		height: 100% !important;
	}
}
`;

	async function request(url, options = {}) {
		return new Promise((resolve, reject) => {
			const request = new XMLHttpRequest();

			request.open(options.method || "get", url, true);

			for (const i in options.headers) {
				request.setRequestHeader(i, options.headers[i]);
			}

			request.withCredentials = options.credentials === "include";

			request.onload = () => {
				// Chrome returns a status code of 0 for local files
				const status = request.status === 0 && url.startsWith("file://") ? 200 : request.status;
				resolve(new Response(request.responseText, { status }));
			};

			request.onerror = reject;

			request.send(options.body || null);
		});
	}

	class Polisher {
		constructor(setup) {
			this.sheets = [];
			this.inserted = [];

			this.hooks = {};
			this.hooks.onUrl = new Hook(this);
			this.hooks.onAtPage = new Hook(this);
			this.hooks.onAtMedia = new Hook(this);
			this.hooks.onRule = new Hook(this);
			this.hooks.onDeclaration = new Hook(this);
			this.hooks.onContent = new Hook(this);
			this.hooks.onSelector = new Hook(this);
			this.hooks.onPseudoSelector = new Hook(this);

			this.hooks.onImport = new Hook(this);

			this.hooks.beforeTreeParse = new Hook(this);
			this.hooks.beforeTreeWalk = new Hook(this);
			this.hooks.afterTreeWalk = new Hook(this);

			if (setup !== false) {
				this.setup();
			}
		}

		setup() {
			this.base = this.insert(baseStyles);
			this.styleEl = document.createElement("style");
			document.head.appendChild(this.styleEl);
			this.styleSheet = this.styleEl.sheet;
			return this.styleSheet;
		}

		async add() {
			const fetched = [];
			const urls = [];

			for (var i = 0; i < arguments.length; i++) {
				let f;

				if (typeof arguments[i] === "object") {
					for (const url in arguments[i]) {
						const obj = arguments[i];
						f = new Promise((resolve, _reject) => {
							urls.push(url);
							resolve(obj[url]);
						});
					}
				} else {
					urls.push(arguments[i]);
					f = request(arguments[i]).then((response) => {
						return response.text();
					});
				}

				fetched.push(f);
			}

			return await Promise.all(fetched).then(async (originals) => {
				let text = "";
				for (let index = 0; index < originals.length; index++) {
					text = await this.convertViaSheet(originals[index], urls[index]);
					this.insert(text);
				}
				return text;
			});
		}

		async convertViaSheet(cssStr, href) {
			const sheet = new Sheet(href, this.hooks);
			await sheet.parse(cssStr);

			// Insert the imported sheets first
			for (const url of sheet.imported) {
				const str = await request(url).then((response) => {
					return response.text();
				});
				const text = await this.convertViaSheet(str, url);
				this.insert(text);
			}

			this.sheets.push(sheet);

			if (typeof sheet.width !== "undefined") {
				this.width = sheet.width;
			}
			if (typeof sheet.height !== "undefined") {
				this.height = sheet.height;
			}
			if (typeof sheet.orientation !== "undefined") {
				this.orientation = sheet.orientation;
			}
			return sheet.toString();
		}

		insert(text) {
			const head = document.querySelector("head");
			const style = document.createElement("style");
			style.setAttribute("data-pagedjs-inserted-styles", "true");

			style.appendChild(document.createTextNode(text));

			head.appendChild(style);

			this.inserted.push(style);
			return style;
		}

		destroy() {
			this.styleEl.remove();
			this.inserted.forEach((s) => {
				s.remove();
			});
			this.sheets = [];
		}
	}

	class Handler {
		constructor(chunker, polisher, caller) {
			const hooks = Object.assign({}, chunker?.hooks, polisher?.hooks, caller?.hooks);
			this.chunker = chunker;
			this.polisher = polisher;
			this.caller = caller;

			for (const name in hooks) {
				if (name in this) {
					const hook = hooks[name];
					hook.register(this[name].bind(this));
				}
			}
		}
	}

	EventEmitter(Handler.prototype);

	// https://www.w3.org/TR/css3-page/#page-size-prop

	var pageSizes = {
		A0: {
			width: {
				value: 841,
				unit: "mm",
			},
			height: {
				value: 1189,
				unit: "mm",
			},
		},
		A1: {
			width: {
				value: 594,
				unit: "mm",
			},
			height: {
				value: 841,
				unit: "mm",
			},
		},
		A2: {
			width: {
				value: 420,
				unit: "mm",
			},
			height: {
				value: 594,
				unit: "mm",
			},
		},
		A3: {
			width: {
				value: 297,
				unit: "mm",
			},
			height: {
				value: 420,
				unit: "mm",
			},
		},
		A4: {
			width: {
				value: 210,
				unit: "mm",
			},
			height: {
				value: 297,
				unit: "mm",
			},
		},
		A5: {
			width: {
				value: 148,
				unit: "mm",
			},
			height: {
				value: 210,
				unit: "mm",
			},
		},
		A6: {
			width: {
				value: 105,
				unit: "mm",
			},
			height: {
				value: 148,
				unit: "mm",
			},
		},
		A7: {
			width: {
				value: 74,
				unit: "mm",
			},
			height: {
				value: 105,
				unit: "mm",
			},
		},
		A8: {
			width: {
				value: 52,
				unit: "mm",
			},
			height: {
				value: 74,
				unit: "mm",
			},
		},
		A9: {
			width: {
				value: 37,
				unit: "mm",
			},
			height: {
				value: 52,
				unit: "mm",
			},
		},
		A10: {
			width: {
				value: 26,
				unit: "mm",
			},
			height: {
				value: 37,
				unit: "mm",
			},
		},
		B4: {
			width: {
				value: 250,
				unit: "mm",
			},
			height: {
				value: 353,
				unit: "mm",
			},
		},
		B5: {
			width: {
				value: 176,
				unit: "mm",
			},
			height: {
				value: 250,
				unit: "mm",
			},
		},
		letter: {
			width: {
				value: 8.5,
				unit: "in",
			},
			height: {
				value: 11,
				unit: "in",
			},
		},
		legal: {
			width: {
				value: 8.5,
				unit: "in",
			},
			height: {
				value: 14,
				unit: "in",
			},
		},
		ledger: {
			width: {
				value: 11,
				unit: "in",
			},
			height: {
				value: 17,
				unit: "in",
			},
		},
	};

	class AtPage extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.pages = {};

			this.width = undefined;
			this.height = undefined;
			this.orientation = undefined;
			this.marginalia = {};
		}

		pageModel(selector) {
			return {
				selector: selector,
				name: undefined,
				psuedo: undefined,
				nth: undefined,
				marginalia: {},
				width: undefined,
				height: undefined,
				orientation: undefined,
				margin: {
					top: {},
					right: {},
					left: {},
					bottom: {},
				},
				padding: {
					top: {},
					right: {},
					left: {},
					bottom: {},
				},
				border: {
					top: {},
					right: {},
					left: {},
					bottom: {},
				},
				backgroundOrigin: undefined,
				block: {},
				marks: undefined,
				notes: undefined,
				added: false,
			};
		}

		// Find and Remove @page rules
		onAtPage(node, item, list) {
			let page;
			let marginalia;
			let selector = "";
			let named;
			let psuedo;
			let nth;
			let needsMerge = false;

			if (node.prelude) {
				named = this.getTypeSelector(node);
				psuedo = this.getPsuedoSelector(node);
				nth = this.getNthSelector(node);
				selector = csstree.generate(node.prelude);
			} else {
				selector = "*";
			}

			if (selector in this.pages) {
				// this.pages[selector] = Object.assign(this.pages[selector], page);
				// console.log("after", selector, this.pages[selector]);

				// this.pages[selector].added = false;
				page = this.pages[selector];
				marginalia = this.replaceMarginalia(node);
				needsMerge = true;
				// Mark page for getting classes added again
				page.added = false;
			} else {
				page = this.pageModel(selector);
				marginalia = this.replaceMarginalia(node);
				this.pages[selector] = page;
			}

			page.name = named;
			page.psuedo = psuedo;
			page.nth = nth;

			if (needsMerge) {
				page.marginalia = Object.assign(page.marginalia, marginalia);
			} else {
				page.marginalia = marginalia;
			}

			const notes = this.replaceNotes(node);
			page.notes = notes;

			const declarations = this.replaceDeclarations(node);

			if (declarations.size) {
				page.size = declarations.size;
				page.width = declarations.size.width;
				page.height = declarations.size.height;
				page.orientation = declarations.size.orientation;
				page.format = declarations.size.format;
			}

			if (declarations.bleed && declarations.bleed[0] !== "auto") {
				switch (declarations.bleed.length) {
					case 4: // top right bottom left
						page.bleed = {
							top: declarations.bleed[0],
							right: declarations.bleed[1],
							bottom: declarations.bleed[2],
							left: declarations.bleed[3],
						};
						break;
					case 3: // top right bottom right
						page.bleed = {
							top: declarations.bleed[0],
							right: declarations.bleed[1],
							bottom: declarations.bleed[2],
							left: declarations.bleed[1],
						};
						break;
					case 2: // top right top right
						page.bleed = {
							top: declarations.bleed[0],
							right: declarations.bleed[1],
							bottom: declarations.bleed[0],
							left: declarations.bleed[1],
						};
						break;
					default:
						page.bleed = {
							top: declarations.bleed[0],
							right: declarations.bleed[0],
							bottom: declarations.bleed[0],
							left: declarations.bleed[0],
						};
				}
			}

			if (declarations.marks) {
				if (!declarations.bleed || (declarations.bleed && declarations.bleed[0] === "auto")) {
					// Spec say 6pt, but needs more space for marks
					page.bleed = {
						top: { value: 6, unit: "mm" },
						right: { value: 6, unit: "mm" },
						bottom: { value: 6, unit: "mm" },
						left: { value: 6, unit: "mm" },
					};
				}

				page.marks = declarations.marks;
			}

			if (declarations.margin) {
				page.margin = declarations.margin;
			}
			if (declarations.padding) {
				page.padding = declarations.padding;
			}

			if (declarations.border) {
				page.border = declarations.border;
			}

			if (declarations.marks) {
				page.marks = declarations.marks;
			}

			if (needsMerge) {
				page.block.children.appendList(node.block.children);
			} else {
				page.block = node.block;
			}

			// Remove the rule
			list.remove(item);
		}

		/* Handled in breaks */
		/*
		afterParsed(parsed) {
			for (let b in this.named) {
				// Find elements
				let elements = parsed.querySelectorAll(b);
				// Add break data
				for (var i = 0; i < elements.length; i++) {
					elements[i].setAttribute("data-page", this.named[b]);
				}
			}
		}
		*/

		afterTreeWalk(ast, sheet) {
			const dirtyPage = "*" in this.pages && this.pages["*"].added === false;

			this.addPageClasses(this.pages, ast, sheet);

			if (dirtyPage) {
				const width = this.pages["*"].width;
				const height = this.pages["*"].height;
				const format = this.pages["*"].format;
				const orientation = this.pages["*"].orientation;
				const bleed = this.pages["*"].bleed;
				const marks = this.pages["*"].marks;
				let bleedverso;
				let bleedrecto;

				if (":left" in this.pages) {
					bleedverso = this.pages[":left"].bleed;
				}

				if (":right" in this.pages) {
					bleedrecto = this.pages[":right"].bleed;
				}

				if (width && height && (this.width !== width || this.height !== height)) {
					this.width = width;
					this.height = height;
					this.format = format;
					this.orientation = orientation;

					this.addRootVars(ast, width, height, orientation, bleed, bleedrecto, bleedverso, marks);
					this.addRootPage(ast, this.pages["*"].size, bleed, bleedrecto, bleedverso);

					this.emit("size", { width, height, orientation, format, bleed });
					this.emit("atpages", this.pages);
				}
			}
		}

		getTypeSelector(ast) {
			// Find page name
			let name;

			csstree.walk(ast, {
				visit: "TypeSelector",
				enter: (node, _item, _list) => {
					name = node.name;
				},
			});

			return name;
		}

		getPsuedoSelector(ast) {
			// Find if it has :left & :right & :black & :first
			let name;
			csstree.walk(ast, {
				visit: "PseudoClassSelector",
				enter: (node, _item, _list) => {
					if (node.name !== "nth") {
						name = node.name;
					}
				},
			});

			return name;
		}

		getNthSelector(ast) {
			// Find if it has :nth
			let nth;
			csstree.walk(ast, {
				visit: "PseudoClassSelector",
				enter: (node, _item, _list) => {
					if (node.name === "nth" && node.children) {
						const raw = node.children.first();
						nth = raw.value;
					}
				},
			});

			return nth;
		}

		replaceMarginalia(ast) {
			const parsed = {};
			const MARGINS = [
				"top-left-corner",
				"top-left",
				"top",
				"top-center",
				"top-right",
				"top-right-corner",
				"bottom-left-corner",
				"bottom-left",
				"bottom",
				"bottom-center",
				"bottom-right",
				"bottom-right-corner",
				"left-top",
				"left-middle",
				"left",
				"left-bottom",
				"top-right-corner",
				"right-top",
				"right-middle",
				"right",
				"right-bottom",
				"right-right-corner",
			];
			csstree.walk(ast.block, {
				visit: "Atrule",
				enter: (node, item, list) => {
					let name = node.name;
					if (MARGINS.includes(name)) {
						if (name === "top") {
							name = "top-center";
						}
						if (name === "right") {
							name = "right-middle";
						}
						if (name === "left") {
							name = "left-middle";
						}
						if (name === "bottom") {
							name = "bottom-center";
						}
						parsed[name] = node.block;
						list.remove(item);
					}
				},
			});

			return parsed;
		}

		replaceNotes(ast) {
			const parsed = {};

			csstree.walk(ast.block, {
				visit: "Atrule",
				enter: (node, item, list) => {
					const name = node.name;
					if (name === "footnote") {
						parsed[name] = node.block;
						list.remove(item);
					}
				},
			});

			return parsed;
		}

		replaceDeclarations(ast) {
			const parsed = {};

			csstree.walk(ast.block, {
				visit: "Declaration",
				enter: (declaration, dItem, dList) => {
					const prop = csstree.property(declaration.property).name;
					// let value = declaration.value;

					if (prop === "marks") {
						parsed.marks = [];
						csstree.walk(declaration, {
							visit: "Identifier",
							enter: (ident) => {
								parsed.marks.push(ident.name);
							},
						});
						dList.remove(dItem);
					} else if (prop === "margin") {
						parsed.margin = this.getMargins(declaration);
						dList.remove(dItem);
					} else if (prop.indexOf("margin-") === 0) {
						const m = prop.substring("margin-".length);
						if (!parsed.margin) {
							parsed.margin = {
								top: {},
								right: {},
								left: {},
								bottom: {},
							};
						}
						parsed.margin[m] = declaration.value.children.first();
						dList.remove(dItem);
					} else if (prop === "padding") {
						parsed.padding = this.getPaddings(declaration.value);
						dList.remove(dItem);
					} else if (prop.indexOf("padding-") === 0) {
						const p = prop.substring("padding-".length);
						if (!parsed.padding) {
							parsed.padding = {
								top: {},
								right: {},
								left: {},
								bottom: {},
							};
						}
						parsed.padding[p] = declaration.value.children.first();
						dList.remove(dItem);
					} else if (prop === "border") {
						if (!parsed.border) {
							parsed.border = {
								top: {},
								right: {},
								left: {},
								bottom: {},
							};
						}
						parsed.border.top = csstree.generate(declaration.value);
						parsed.border.right = csstree.generate(declaration.value);
						parsed.border.left = csstree.generate(declaration.value);
						parsed.border.bottom = csstree.generate(declaration.value);

						dList.remove(dItem);
					} else if (prop.indexOf("border-") === 0) {
						if (!parsed.border) {
							parsed.border = {
								top: {},
								right: {},
								left: {},
								bottom: {},
							};
						}
						const p = prop.substring("border-".length);

						parsed.border[p] = csstree.generate(declaration.value);
						dList.remove(dItem);
					} else if (prop === "size") {
						parsed.size = this.getSize(declaration);
						dList.remove(dItem);
					} else if (prop === "bleed") {
						parsed.bleed = [];

						csstree.walk(declaration, {
							enter: (subNode) => {
								switch (subNode.type) {
									case "String": // bleed: "auto"
										if (subNode.value.indexOf("auto") > -1) {
											parsed.bleed.push("auto");
										}
										break;
									case "Dimension": // bleed: 1in 2in, bleed: 20px ect.
										parsed.bleed.push({
											value: subNode.value,
											unit: subNode.unit,
										});
										break;
									case "Number":
										parsed.bleed.push({
											value: subNode.value,
											unit: "px",
										});
										break;
									// ignore
								}
							},
						});

						dList.remove(dItem);
					}
				},
			});

			return parsed;
		}
		getSize(declaration) {
			let width;
			let height;
			let orientation;
			let format;

			// Get size: Xmm Ymm
			csstree.walk(declaration, {
				visit: "Dimension",
				enter: (node, _item, _list) => {
					const { value, unit } = node;
					if (typeof width === "undefined") {
						width = { value, unit };
					} else if (typeof height === "undefined") {
						height = { value, unit };
					}
				},
			});

			// Get size: "A4"
			csstree.walk(declaration, {
				visit: "String",
				enter: (node, _item, _list) => {
					const name = node.value.replace(/["|']/g, "");
					const s = pageSizes[name];
					if (s) {
						width = s.width;
						height = s.height;
					}
				},
			});

			// Get Format or Landscape or Portrait
			csstree.walk(declaration, {
				visit: "Identifier",
				enter: (node, _item, _list) => {
					const name = node.name;
					if (name === "landscape" || name === "portrait") {
						orientation = node.name;
					} else if (name !== "auto") {
						const s = pageSizes[name];
						if (s) {
							width = s.width;
							height = s.height;
						}
						format = name;
					}
				},
			});

			return {
				width,
				height,
				orientation,
				format,
			};
		}

		getMargins(declaration) {
			const margins = [];
			const margin = {
				top: {},
				right: {},
				left: {},
				bottom: {},
			};

			csstree.walk(declaration, {
				enter: (node) => {
					switch (node.type) {
						case "Dimension": // margin: 1in 2in, margin: 20px, etc...
							margins.push(node);
							break;
						case "Number": // margin: 0
							margins.push({ value: node.value, unit: "px" });
							break;
						// ignore
					}
				},
			});

			if (margins.length === 1) {
				for (const m in margin) {
					margin[m] = margins[0];
				}
			} else if (margins.length === 2) {
				margin.top = margins[0];
				margin.right = margins[1];
				margin.bottom = margins[0];
				margin.left = margins[1];
			} else if (margins.length === 3) {
				margin.top = margins[0];
				margin.right = margins[1];
				margin.bottom = margins[2];
				margin.left = margins[1];
			} else if (margins.length === 4) {
				margin.top = margins[0];
				margin.right = margins[1];
				margin.bottom = margins[2];
				margin.left = margins[3];
			}

			return margin;
		}

		getPaddings(declaration) {
			const paddings = [];
			const padding = {
				top: {},
				right: {},
				left: {},
				bottom: {},
			};

			csstree.walk(declaration, {
				enter: (node) => {
					switch (node.type) {
						case "Dimension": // padding: 1in 2in, padding: 20px, etc...
							paddings.push(node);
							break;
						case "Number": // padding: 0
							paddings.push({ value: node.value, unit: "px" });
							break;
						// ignore
					}
				},
			});
			if (paddings.length === 1) {
				for (const p in padding) {
					padding[p] = paddings[0];
				}
			} else if (paddings.length === 2) {
				padding.top = paddings[0];
				padding.right = paddings[1];
				padding.bottom = paddings[0];
				padding.left = paddings[1];
			} else if (paddings.length === 3) {
				padding.top = paddings[0];
				padding.right = paddings[1];
				padding.bottom = paddings[2];
				padding.left = paddings[1];
			} else if (paddings.length === 4) {
				padding.top = paddings[0];
				padding.right = paddings[1];
				padding.bottom = paddings[2];
				padding.left = paddings[3];
			}
			return padding;
		}

		// get values for the border on the @page to pass them to the element with the .pagedjs_area class
		getBorders(declaration) {
			const border = {
				top: {},
				right: {},
				left: {},
				bottom: {},
			};

			if (declaration.prop === "border") {
				border.top = csstree.generate(declaration.value);
				border.right = csstree.generate(declaration.value);
				border.bottom = csstree.generate(declaration.value);
				border.left = csstree.generate(declaration.value);
			} else if (declaration.prop === "border-top") {
				border.top = csstree.generate(declaration.value);
			} else if (declaration.prop === "border-right") {
				border.right = csstree.generate(declaration.value);
			} else if (declaration.prop === "border-bottom") {
				border.bottom = csstree.generate(declaration.value);
			} else if (declaration.prop === "border-left") {
				border.left = csstree.generate(declaration.value);
			}

			return border;
		}

		addPageClasses(pages, ast, sheet) {
			// First add * page
			if ("*" in pages && pages["*"].added === false) {
				const p = this.createPage(pages["*"], ast.children, sheet);
				sheet.insertRule(p);
				pages["*"].added = true;
			}
			// Add :left & :right
			if (":left" in pages && pages[":left"].added === false) {
				const left = this.createPage(pages[":left"], ast.children, sheet);
				sheet.insertRule(left);
				pages[":left"].added = true;
			}
			if (":right" in pages && pages[":right"].added === false) {
				const right = this.createPage(pages[":right"], ast.children, sheet);
				sheet.insertRule(right);
				pages[":right"].added = true;
			}
			// Add :first & :blank
			if (":first" in pages && pages[":first"].added === false) {
				const first = this.createPage(pages[":first"], ast.children, sheet);
				sheet.insertRule(first);
				pages[":first"].added = true;
			}
			if (":blank" in pages && pages[":blank"].added === false) {
				const blank = this.createPage(pages[":blank"], ast.children, sheet);
				sheet.insertRule(blank);
				pages[":blank"].added = true;
			}
			// Add nth pages
			for (const pg in pages) {
				if (pages[pg].nth && pages[pg].added === false) {
					const nth = this.createPage(pages[pg], ast.children, sheet);
					sheet.insertRule(nth);
					pages[pg].added = true;
				}
			}

			// Add named pages
			for (const pg in pages) {
				if (pages[pg].name && pages[pg].added === false) {
					const named = this.createPage(pages[pg], ast.children, sheet);
					sheet.insertRule(named);
					pages[pg].added = true;
				}
			}
		}

		createPage(page, ruleList, sheet) {
			const selectors = this.selectorsForPage(page);
			const children = page.block.children.copy();
			const block = {
				type: "Block",
				loc: 0,
				children: children,
			};

			const rule = this.createRule(selectors, block);

			this.addMarginVars(page.margin, children, children.first());
			this.addPaddingVars(page.padding, children, children.first());
			this.addBorderVars(page.border, children, children.first());

			if (page.width) {
				this.addDimensions(page.width, page.height, page.orientation, children, children.first());
			}

			if (page.marginalia) {
				this.addMarginaliaStyles(page, ruleList, rule, sheet);
				this.addMarginaliaContent(page, ruleList, rule, sheet);
			}

			if (page.notes) {
				this.addNotesStyles(page.notes, page, ruleList, rule, sheet);
			}

			return rule;
		}

		addMarginVars(margin, list, item) {
			// variables for margins
			for (const m in margin) {
				if (typeof margin[m].value !== "undefined") {
					const value = margin[m].value + (margin[m].unit || "");
					const mVar = list.createItem({
						type: "Declaration",
						property: `--pagedjs-margin-${m}`,
						value: {
							type: "Raw",
							value: value,
						},
					});
					list.append(mVar, item);
				}
			}
		}

		addPaddingVars(padding, list, item) {
			// variables for padding
			for (const p in padding) {
				if (typeof padding[p].value !== "undefined") {
					const value = padding[p].value + (padding[p].unit || "");
					const pVar = list.createItem({
						type: "Declaration",
						property: `--pagedjs-padding-${p}`,
						value: {
							type: "Raw",
							value: value,
						},
					});

					list.append(pVar, item);
				}
			}
		}

		addBorderVars(border, list, item) {
			// variables for borders
			for (const name of Object.keys(border)) {
				const value = border[name];
				// value is an empty object when undefined
				if (typeof value === "string") {
					const borderItem = list.createItem({
						type: "Declaration",
						property: `--pagedjs-border-${name}`,
						value: {
							type: "Raw",
							value: value,
						},
					});
					list.append(borderItem, item);
				}
			}
		}

		addDimensions(width, height, orientation, list, _item) {
			let widthString;
			let heightString;

			widthString = CSSValueToString(width);
			heightString = CSSValueToString(height);

			if (orientation && orientation !== "portrait") {
				// reverse for orientation
				[widthString, heightString] = [heightString, widthString];
			}

			// width variable
			const wVar = this.createVariable("--pagedjs-pagebox-width", widthString);
			list.appendData(wVar);

			// height variable
			const hVar = this.createVariable("--pagedjs-pagebox-height", heightString);
			list.appendData(hVar);

			// let w = this.createDimension("width", width);
			// let h = this.createDimension("height", height);
			// list.appendData(w);
			// list.appendData(h);
		}

		addMarginaliaStyles(page, list, _item, _sheet) {
			for (const loc in page.marginalia) {
				const block = csstree.clone(page.marginalia[loc]);
				let hasContent = false;

				if (block.children.isEmpty()) {
					continue;
				}

				csstree.walk(block, {
					visit: "Declaration",
					enter: (node, item, list) => {
						if (node.property === "content") {
							if (node.value.children && node.value.children.first().name === "none") {
								hasContent = false;
							} else {
								hasContent = true;
							}
							list.remove(item);
						}
						if (node.property === "vertical-align") {
							csstree.walk(node, {
								visit: "Identifier",
								enter: (identNode, _identItem, _identlist) => {
									const name = identNode.name;
									if (name === "top") {
										identNode.name = "flex-start";
									} else if (name === "middle") {
										identNode.name = "center";
									} else if (name === "bottom") {
										identNode.name = "flex-end";
									}
								},
							});
							node.property = "align-items";
						}

						if (
							node.property === "width" &&
							(loc === "top-left" ||
								loc === "top-center" ||
								loc === "top-right" ||
								loc === "bottom-left" ||
								loc === "bottom-center" ||
								loc === "bottom-right")
						) {
							const c = csstree.clone(node);
							c.property = "max-width";
							list.appendData(c);
						}

						if (
							node.property === "height" &&
							(loc === "left-top" ||
								loc === "left-middle" ||
								loc === "left-bottom" ||
								loc === "right-top" ||
								loc === "right-middle" ||
								loc === "right-bottom")
						) {
							const c = csstree.clone(node);
							c.property = "max-height";
							list.appendData(c);
						}
					},
				});

				const marginSelectors = this.selectorsForPageMargin(page, loc);
				const marginRule = this.createRule(marginSelectors, block);

				list.appendData(marginRule);

				const sel = csstree.generate({
					type: "Selector",
					children: marginSelectors,
				});

				this.marginalia[sel] = {
					page: page,
					selector: sel,
					block: page.marginalia[loc],
					hasContent: hasContent,
				};
			}
		}

		addMarginaliaContent(page, _list, _item, sheet) {
			let displayNone;
			// Just content
			for (const loc in page.marginalia) {
				const content = csstree.clone(page.marginalia[loc]);
				csstree.walk(content, {
					visit: "Declaration",
					enter: (node, item, list) => {
						if (node.property !== "content") {
							list.remove(item);
						}

						if (node.value.children && node.value.children.first().name === "none") {
							displayNone = true;
						}
					},
				});

				if (content.children.isEmpty()) {
					continue;
				}

				const displaySelectors = this.selectorsForPageMargin(page, loc);
				let displayDeclaration;

				displaySelectors.insertData({
					type: "Combinator",
					name: ">",
				});

				displaySelectors.insertData({
					type: "ClassSelector",
					name: "pagedjs_margin-content",
				});

				displaySelectors.insertData({
					type: "Combinator",
					name: ">",
				});

				displaySelectors.insertData({
					type: "TypeSelector",
					name: "*",
				});

				if (displayNone) {
					displayDeclaration = this.createDeclaration("display", "none");
				} else {
					displayDeclaration = this.createDeclaration("display", "block");
				}

				const displayRule = this.createRule(displaySelectors, [displayDeclaration]);
				sheet.insertRule(displayRule);

				// insert content rule
				const contentSelectors = this.selectorsForPageMargin(page, loc);

				contentSelectors.insertData({
					type: "Combinator",
					name: ">",
				});

				contentSelectors.insertData({
					type: "ClassSelector",
					name: "pagedjs_margin-content",
				});

				contentSelectors.insertData({
					type: "PseudoElementSelector",
					name: "after",
					children: null,
				});

				const contentRule = this.createRule(contentSelectors, content);
				sheet.insertRule(contentRule);
			}
		}

		addRootVars(ast, width, height, orientation, bleed, bleedrecto, bleedverso, marks) {
			const rules = [];
			const selectors = new csstree.List();
			selectors.insertData({
				type: "PseudoClassSelector",
				name: "root",
				children: null,
			});

			let widthString;
			let heightString;
			let widthStringRight;
			let heightStringRight;
			let widthStringLeft;
			let heightStringLeft;

			if (!bleed) {
				widthString = CSSValueToString(width);
				heightString = CSSValueToString(height);
				widthStringRight = CSSValueToString(width);
				heightStringRight = CSSValueToString(height);
				widthStringLeft = CSSValueToString(width);
				heightStringLeft = CSSValueToString(height);
			} else {
				widthString = `calc( ${CSSValueToString(width)} + ${CSSValueToString(bleed.left)} + ${CSSValueToString(bleed.right)} )`;
				heightString = `calc( ${CSSValueToString(height)} + ${CSSValueToString(bleed.top)} + ${CSSValueToString(bleed.bottom)} )`;

				widthStringRight = `calc( ${CSSValueToString(width)} + ${CSSValueToString(bleed.left)} + ${CSSValueToString(bleed.right)} )`;
				heightStringRight = `calc( ${CSSValueToString(height)} + ${CSSValueToString(bleed.top)} + ${CSSValueToString(bleed.bottom)} )`;

				widthStringLeft = `calc( ${CSSValueToString(width)} + ${CSSValueToString(bleed.left)} + ${CSSValueToString(bleed.right)} )`;
				heightStringLeft = `calc( ${CSSValueToString(height)} + ${CSSValueToString(bleed.top)} + ${CSSValueToString(bleed.bottom)} )`;

				const bleedTop = this.createVariable("--pagedjs-bleed-top", CSSValueToString(bleed.top));
				const bleedRight = this.createVariable("--pagedjs-bleed-right", CSSValueToString(bleed.right));
				const bleedBottom = this.createVariable("--pagedjs-bleed-bottom", CSSValueToString(bleed.bottom));
				const bleedLeft = this.createVariable("--pagedjs-bleed-left", CSSValueToString(bleed.left));

				let bleedTopRecto = this.createVariable("--pagedjs-bleed-right-top", CSSValueToString(bleed.top));
				let bleedRightRecto = this.createVariable("--pagedjs-bleed-right-right", CSSValueToString(bleed.right));
				let bleedBottomRecto = this.createVariable("--pagedjs-bleed-right-bottom", CSSValueToString(bleed.bottom));
				let bleedLeftRecto = this.createVariable("--pagedjs-bleed-right-left", CSSValueToString(bleed.left));

				let bleedTopVerso = this.createVariable("--pagedjs-bleed-left-top", CSSValueToString(bleed.top));
				let bleedRightVerso = this.createVariable("--pagedjs-bleed-left-right", CSSValueToString(bleed.right));
				let bleedBottomVerso = this.createVariable("--pagedjs-bleed-left-bottom", CSSValueToString(bleed.bottom));
				let bleedLeftVerso = this.createVariable("--pagedjs-bleed-left-left", CSSValueToString(bleed.left));

				if (bleedrecto) {
					bleedTopRecto = this.createVariable("--pagedjs-bleed-right-top", CSSValueToString(bleedrecto.top));
					bleedRightRecto = this.createVariable("--pagedjs-bleed-right-right", CSSValueToString(bleedrecto.right));
					bleedBottomRecto = this.createVariable("--pagedjs-bleed-right-bottom", CSSValueToString(bleedrecto.bottom));
					bleedLeftRecto = this.createVariable("--pagedjs-bleed-right-left", CSSValueToString(bleedrecto.left));

					widthStringRight = `calc( ${CSSValueToString(width)} + ${CSSValueToString(bleedrecto.left)} + ${CSSValueToString(bleedrecto.right)} )`;
					heightStringRight = `calc( ${CSSValueToString(height)} + ${CSSValueToString(bleedrecto.top)} + ${CSSValueToString(bleedrecto.bottom)} )`;
				}
				if (bleedverso) {
					bleedTopVerso = this.createVariable("--pagedjs-bleed-left-top", CSSValueToString(bleedverso.top));
					bleedRightVerso = this.createVariable("--pagedjs-bleed-left-right", CSSValueToString(bleedverso.right));
					bleedBottomVerso = this.createVariable("--pagedjs-bleed-left-bottom", CSSValueToString(bleedverso.bottom));
					bleedLeftVerso = this.createVariable("--pagedjs-bleed-left-left", CSSValueToString(bleedverso.left));

					widthStringLeft = `calc( ${CSSValueToString(width)} + ${CSSValueToString(bleedverso.left)} + ${CSSValueToString(bleedverso.right)} )`;
					heightStringLeft = `calc( ${CSSValueToString(height)} + ${CSSValueToString(bleedverso.top)} + ${CSSValueToString(bleedverso.bottom)} )`;
				}

				const pageWidthVar = this.createVariable("--pagedjs-width", CSSValueToString(width));
				const pageHeightVar = this.createVariable("--pagedjs-height", CSSValueToString(height));

				rules.push(
					bleedTop,
					bleedRight,
					bleedBottom,
					bleedLeft,
					bleedTopRecto,
					bleedRightRecto,
					bleedBottomRecto,
					bleedLeftRecto,
					bleedTopVerso,
					bleedRightVerso,
					bleedBottomVerso,
					bleedLeftVerso,
					pageWidthVar,
					pageHeightVar,
				);
			}

			if (marks) {
				marks.forEach((mark) => {
					const markDisplay = this.createVariable(`--pagedjs-mark-${mark}-display`, "block");
					rules.push(markDisplay);
				});
			}

			// orientation variable
			if (orientation) {
				const oVar = this.createVariable("--pagedjs-orientation", orientation);
				rules.push(oVar);

				if (orientation !== "portrait") {
					// reverse for orientation
					[widthString, heightString] = [heightString, widthString];
					[widthStringRight, heightStringRight] = [heightStringRight, widthStringRight];
					[widthStringLeft, heightStringLeft] = [heightStringLeft, widthStringLeft];
				}
			}

			const wVar = this.createVariable("--pagedjs-width", widthString);
			const hVar = this.createVariable("--pagedjs-height", heightString);

			const wVarR = this.createVariable("--pagedjs-width-right", widthStringRight);
			const hVarR = this.createVariable("--pagedjs-height-right", heightStringRight);

			const wVarL = this.createVariable("--pagedjs-width-left", widthStringLeft);
			const hVarL = this.createVariable("--pagedjs-height-left", heightStringLeft);

			rules.push(wVar, hVar, wVarR, hVarR, wVarL, hVarL);

			const rule = this.createRule(selectors, rules);

			ast.children.appendData(rule);
		}

		addNotesStyles(notes, page, list, _item, _sheet) {
			for (const note in notes) {
				const selectors = this.selectorsForPage(page);

				selectors.insertData({
					type: "Combinator",
					name: " ",
				});

				selectors.insertData({
					type: "ClassSelector",
					name: `pagedjs_${note}_content`,
				});

				const notesRule = this.createRule(selectors, notes[note]);

				list.appendData(notesRule);
			}
		}

		/*
		@page {
			size: var(--pagedjs-width) var(--pagedjs-height);
			margin: 0;
			padding: 0;
		}
		*/
		addRootPage(ast, size, bleed, bleedrecto, bleedverso) {
			const { width, height, orientation, format } = size;
			const children = new csstree.List();
			const childrenLeft = new csstree.List();
			const childrenRight = new csstree.List();
			const dimensions = new csstree.List();
			const dimensionsLeft = new csstree.List();
			const dimensionsRight = new csstree.List();

			if (bleed) {
				const widthCalculations = new csstree.List();
				const heightCalculations = new csstree.List();

				// width
				widthCalculations.appendData({
					type: "Dimension",
					unit: width.unit,
					value: width.value,
				});

				widthCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculations.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculations.appendData({
					type: "Dimension",
					unit: bleed.left.unit,
					value: bleed.left.value,
				});

				widthCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculations.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculations.appendData({
					type: "Dimension",
					unit: bleed.right.unit,
					value: bleed.right.value,
				});

				// height
				heightCalculations.appendData({
					type: "Dimension",
					unit: height.unit,
					value: height.value,
				});

				heightCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculations.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculations.appendData({
					type: "Dimension",
					unit: bleed.top.unit,
					value: bleed.top.value,
				});

				heightCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculations.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculations.appendData({
					type: "Dimension",
					unit: bleed.bottom.unit,
					value: bleed.bottom.value,
				});

				dimensions.appendData({
					type: "Function",
					name: "calc",
					children: widthCalculations,
				});

				dimensions.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				dimensions.appendData({
					type: "Function",
					name: "calc",
					children: heightCalculations,
				});
			} else if (format) {
				dimensions.appendData({
					type: "Identifier",
					name: format,
				});

				if (orientation) {
					dimensions.appendData({
						type: "WhiteSpace",
						value: " ",
					});

					dimensions.appendData({
						type: "Identifier",
						name: orientation,
					});
				}
			} else {
				dimensions.appendData({
					type: "Dimension",
					unit: width.unit,
					value: width.value,
				});

				dimensions.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				dimensions.appendData({
					type: "Dimension",
					unit: height.unit,
					value: height.value,
				});
			}

			children.appendData({
				type: "Declaration",
				property: "size",
				loc: null,
				value: {
					type: "Value",
					children: dimensions,
				},
			});

			children.appendData({
				type: "Declaration",
				property: "margin",
				loc: null,
				value: {
					type: "Value",
					children: [
						{
							type: "Dimension",
							unit: "px",
							value: 0,
						},
					],
				},
			});

			children.appendData({
				type: "Declaration",
				property: "padding",
				loc: null,
				value: {
					type: "Value",
					children: [
						{
							type: "Dimension",
							unit: "px",
							value: 0,
						},
					],
				},
			});

			children.appendData({
				type: "Declaration",
				property: "padding",
				loc: null,
				value: {
					type: "Value",
					children: [
						{
							type: "Dimension",
							unit: "px",
							value: 0,
						},
					],
				},
			});

			const rule = ast.children.createItem({
				type: "Atrule",
				prelude: null,
				name: "page",
				block: {
					type: "Block",
					loc: null,
					children: children,
				},
			});

			ast.children.append(rule);

			if (bleedverso) {
				const widthCalculationsLeft = new csstree.List();
				const heightCalculationsLeft = new csstree.List();

				// width
				widthCalculationsLeft.appendData({
					type: "Dimension",
					unit: width.unit,
					value: width.value,
				});

				widthCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsLeft.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsLeft.appendData({
					type: "Dimension",
					unit: bleedverso.left.unit,
					value: bleedverso.left.value,
				});

				widthCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsLeft.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsLeft.appendData({
					type: "Dimension",
					unit: bleedverso.right.unit,
					value: bleedverso.right.value,
				});

				// height
				heightCalculationsLeft.appendData({
					type: "Dimension",
					unit: height.unit,
					value: height.value,
				});

				heightCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsLeft.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsLeft.appendData({
					type: "Dimension",
					unit: bleedverso.top.unit,
					value: bleedverso.top.value,
				});

				heightCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsLeft.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculationsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsLeft.appendData({
					type: "Dimension",
					unit: bleedverso.bottom.unit,
					value: bleedverso.bottom.value,
				});

				dimensionsLeft.appendData({
					type: "Function",
					name: "calc",
					children: widthCalculationsLeft,
				});

				dimensionsLeft.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				dimensionsLeft.appendData({
					type: "Function",
					name: "calc",
					children: heightCalculationsLeft,
				});

				childrenLeft.appendData({
					type: "Declaration",
					property: "size",
					loc: null,
					value: {
						type: "Value",
						children: dimensionsLeft,
					},
				});

				const ruleLeft = ast.children.createItem({
					type: "Atrule",
					prelude: null,
					name: "page :left",
					block: {
						type: "Block",
						loc: null,
						children: childrenLeft,
					},
				});

				ast.children.append(ruleLeft);
			}

			if (bleedrecto) {
				const widthCalculationsRight = new csstree.List();
				const heightCalculationsRight = new csstree.List();

				// width
				widthCalculationsRight.appendData({
					type: "Dimension",
					unit: width.unit,
					value: width.value,
				});

				widthCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsRight.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsRight.appendData({
					type: "Dimension",
					unit: bleedrecto.left.unit,
					value: bleedrecto.left.value,
				});

				widthCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsRight.appendData({
					type: "Operator",
					value: "+",
				});

				widthCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				widthCalculationsRight.appendData({
					type: "Dimension",
					unit: bleedrecto.right.unit,
					value: bleedrecto.right.value,
				});

				// height
				heightCalculationsRight.appendData({
					type: "Dimension",
					unit: height.unit,
					value: height.value,
				});

				heightCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsRight.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsRight.appendData({
					type: "Dimension",
					unit: bleedrecto.top.unit,
					value: bleedrecto.top.value,
				});

				heightCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsRight.appendData({
					type: "Operator",
					value: "+",
				});

				heightCalculationsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				heightCalculationsRight.appendData({
					type: "Dimension",
					unit: bleedrecto.bottom.unit,
					value: bleedrecto.bottom.value,
				});

				dimensionsRight.appendData({
					type: "Function",
					name: "calc",
					children: widthCalculationsRight,
				});

				dimensionsRight.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				dimensionsRight.appendData({
					type: "Function",
					name: "calc",
					children: heightCalculationsRight,
				});

				childrenRight.appendData({
					type: "Declaration",
					property: "size",
					loc: null,
					value: {
						type: "Value",
						children: dimensionsRight,
					},
				});

				const ruleRight = ast.children.createItem({
					type: "Atrule",
					prelude: null,
					name: "page :right",
					block: {
						type: "Block",
						loc: null,
						children: childrenRight,
					},
				});

				ast.children.append(ruleRight);
			}
		}

		getNth(nth) {
			const n = nth.indexOf("n");
			const plus = nth.indexOf("+");
			const splitN = nth.split("n");
			const splitP = nth.split("+");
			let a = null;
			let b = null;
			if (n > -1) {
				a = splitN[0];
				if (plus > -1) {
					b = splitP[1];
				}
			} else {
				b = nth;
			}

			return {
				type: "Nth",
				loc: null,
				selector: null,
				nth: {
					type: "AnPlusB",
					loc: null,
					a: a,
					b: b,
				},
			};
		}

		addPageAttributes(page, start, _pages) {
			const namedPages = [start.dataset.page];

			if (namedPages?.length) {
				for (const named of namedPages) {
					if (!named) {
						continue;
					}
					page.name = named;
					page.element.classList.add("pagedjs_named_page");
					page.element.classList.add(`pagedjs_${named}_page`);

					if (!start.dataset.splitFrom) {
						page.element.classList.add(`pagedjs_${named}_first_page`);
					}
				}
			}
		}

		getStartElement(content, breakToken) {
			const node = breakToken?.node;

			if (!content && !breakToken) {
				return;
			}

			// No break
			if (!node) {
				return content.children[0];
			}

			// Top level element
			if (node.nodeType === 1 && node.parentNode.nodeType === 11) {
				return node;
			}

			// Named page
			if (node.nodeType === 1 && node.dataset.page) {
				return node;
			}

			// Get top level Named parent
			const fragment = rebuildAncestors(node);
			const pages = fragment.querySelectorAll("[data-page]");

			if (pages.length) {
				return pages[pages.length - 1];
			}
			return fragment.children[0];
		}

		beforePageLayout(page, contents, breakToken, chunker) {
			const start = this.getStartElement(contents, breakToken);
			if (start) {
				this.addPageAttributes(page, start, chunker.pages);
			}
			// page.element.querySelector('.paged_area').style.color = red;
		}

		finalizePage(_fragment, page, _breakToken, _chunker) {
			for (const m in this.marginalia) {
				const margin = this.marginalia[m];
				const sels = m.split(" ");

				let content;
				if (page.element.matches(sels[0]) && margin.hasContent) {
					content = page.element.querySelector(sels[1]);
					content.classList.add("hasContent");
				}
			}

			// check center
			["top", "bottom"].forEach((loc) => {
				const marginGroup = page.element.querySelector(`.pagedjs_margin-${loc}`);
				const center = page.element.querySelector(`.pagedjs_margin-${loc}-center`);
				const left = page.element.querySelector(`.pagedjs_margin-${loc}-left`);
				const right = page.element.querySelector(`.pagedjs_margin-${loc}-right`);

				const centerContent = center.classList.contains("hasContent");
				const leftContent = left.classList.contains("hasContent");
				const rightContent = right.classList.contains("hasContent");
				let centerWidth;
				let leftWidth;
				let rightWidth;

				if (leftContent) {
					leftWidth = window.getComputedStyle(left)["max-width"];
				}

				if (rightContent) {
					rightWidth = window.getComputedStyle(right)["max-width"];
				}

				if (centerContent) {
					centerWidth = window.getComputedStyle(center)["max-width"];

					if (centerWidth === "none" || centerWidth === "auto") {
						if (!leftContent && !rightContent) {
							marginGroup.style["grid-template-columns"] = "0 1fr 0";
						} else if (leftContent) {
							if (!rightContent) {
								if (leftWidth !== "none" && leftWidth !== "auto") {
									marginGroup.style["grid-template-columns"] = `${leftWidth} 1fr ${leftWidth}`;
								} else {
									marginGroup.style["grid-template-columns"] = "auto auto 1fr";
									left.style["white-space"] = "nowrap";
									center.style["white-space"] = "nowrap";
									const leftOuterWidth = left.offsetWidth;
									const centerOuterWidth = center.offsetWidth;
									const outerwidths = leftOuterWidth + centerOuterWidth;
									const newcenterWidth = (centerOuterWidth * 100) / outerwidths;
									marginGroup.style["grid-template-columns"] =
										`minmax(16.66%, 1fr) minmax(33%, ${newcenterWidth}%) minmax(16.66%, 1fr)`;
									left.style["white-space"] = "normal";
									center.style["white-space"] = "normal";
								}
							} else {
								if (leftWidth !== "none" && leftWidth !== "auto") {
									if (rightWidth !== "none" && rightWidth !== "auto") {
										marginGroup.style["grid-template-columns"] = `${leftWidth} 1fr ${rightWidth}`;
									} else {
										marginGroup.style["grid-template-columns"] = `${leftWidth} 1fr ${leftWidth}`;
									}
								} else {
									if (rightWidth !== "none" && rightWidth !== "auto") {
										marginGroup.style["grid-template-columns"] = `${rightWidth} 1fr ${rightWidth}`;
									} else {
										marginGroup.style["grid-template-columns"] = "auto auto 1fr";
										left.style["white-space"] = "nowrap";
										center.style["white-space"] = "nowrap";
										right.style["white-space"] = "nowrap";
										const leftOuterWidth = left.offsetWidth;
										const centerOuterWidth = center.offsetWidth;
										const rightOuterWidth = right.offsetWidth;
										const outerwidths = leftOuterWidth + centerOuterWidth + rightOuterWidth;
										const newcenterWidth = (centerOuterWidth * 100) / outerwidths;
										if (newcenterWidth > 40) {
											marginGroup.style["grid-template-columns"] =
												`minmax(16.66%, 1fr) minmax(33%, ${newcenterWidth}%) minmax(16.66%, 1fr)`;
										} else {
											marginGroup.style["grid-template-columns"] = "repeat(3, 1fr)";
										}
										left.style["white-space"] = "normal";
										center.style["white-space"] = "normal";
										right.style["white-space"] = "normal";
									}
								}
							}
						} else {
							if (rightWidth !== "none" && rightWidth !== "auto") {
								marginGroup.style["grid-template-columns"] = `${rightWidth} 1fr ${rightWidth}`;
							} else {
								marginGroup.style["grid-template-columns"] = "auto auto 1fr";
								right.style["white-space"] = "nowrap";
								center.style["white-space"] = "nowrap";
								const rightOuterWidth = right.offsetWidth;
								const centerOuterWidth = center.offsetWidth;
								const outerwidths = rightOuterWidth + centerOuterWidth;
								const newcenterWidth = (centerOuterWidth * 100) / outerwidths;
								marginGroup.style["grid-template-columns"] =
									`minmax(16.66%, 1fr) minmax(33%, ${newcenterWidth}%) minmax(16.66%, 1fr)`;
								right.style["white-space"] = "normal";
								center.style["white-space"] = "normal";
							}
						}
					} else if (centerWidth !== "none" && centerWidth !== "auto") {
						if (leftContent && leftWidth !== "none" && leftWidth !== "auto") {
							marginGroup.style["grid-template-columns"] = `${leftWidth} ${centerWidth} 1fr`;
						} else if (rightContent && rightWidth !== "none" && rightWidth !== "auto") {
							marginGroup.style["grid-template-columns"] = `1fr ${centerWidth} ${rightWidth}`;
						} else {
							marginGroup.style["grid-template-columns"] = `1fr ${centerWidth} 1fr`;
						}
					}
				} else {
					if (leftContent) {
						if (!rightContent) {
							marginGroup.style["grid-template-columns"] = "1fr 0 0";
						} else {
							if (leftWidth !== "none" && leftWidth !== "auto") {
								if (rightWidth !== "none" && rightWidth !== "auto") {
									marginGroup.style["grid-template-columns"] = `${leftWidth} 1fr ${rightWidth}`;
								} else {
									marginGroup.style["grid-template-columns"] = `${leftWidth} 0 1fr`;
								}
							} else {
								if (rightWidth !== "none" && rightWidth !== "auto") {
									marginGroup.style["grid-template-columns"] = `1fr 0 ${rightWidth}`;
								} else {
									marginGroup.style["grid-template-columns"] = "auto 1fr auto";
									left.style["white-space"] = "nowrap";
									right.style["white-space"] = "nowrap";
									const leftOuterWidth = left.offsetWidth;
									const rightOuterWidth = right.offsetWidth;
									const outerwidths = leftOuterWidth + rightOuterWidth;
									const newLeftWidth = (leftOuterWidth * 100) / outerwidths;
									marginGroup.style["grid-template-columns"] = `minmax(16.66%, ${newLeftWidth}%) 0 1fr`;
									left.style["white-space"] = "normal";
									right.style["white-space"] = "normal";
								}
							}
						}
					} else {
						if (rightWidth !== "none" && rightWidth !== "auto") {
							marginGroup.style["grid-template-columns"] = `1fr 0 ${rightWidth}`;
						} else {
							marginGroup.style["grid-template-columns"] = "0 0 1fr";
						}
					}
				}
			});

			// check middle
			["left", "right"].forEach((loc) => {
				const middle = page.element.querySelector(`.pagedjs_margin-${loc}-middle.hasContent`);
				const marginGroup = page.element.querySelector(`.pagedjs_margin-${loc}`);
				const top = page.element.querySelector(`.pagedjs_margin-${loc}-top`);
				const bottom = page.element.querySelector(`.pagedjs_margin-${loc}-bottom`);
				const topContent = top.classList.contains("hasContent");
				const bottomContent = bottom.classList.contains("hasContent");
				let middleHeight;
				let topHeight;
				let bottomHeight;

				if (topContent) {
					topHeight = window.getComputedStyle(top)["max-height"];
				}

				if (bottomContent) {
					bottomHeight = window.getComputedStyle(bottom)["max-height"];
				}

				if (middle) {
					middleHeight = window.getComputedStyle(middle)["max-height"];

					if (middleHeight === "none" || middleHeight === "auto") {
						if (!topContent && !bottomContent) {
							marginGroup.style["grid-template-rows"] = "0 1fr 0";
						} else if (topContent) {
							if (!bottomContent) {
								if (topHeight !== "none" && topHeight !== "auto") {
									marginGroup.style["grid-template-rows"] = `${topHeight} calc(100% - ${topHeight}*2) ${topHeight}`;
								}
							} else {
								if (topHeight !== "none" && topHeight !== "auto") {
									if (bottomHeight !== "none" && bottomHeight !== "auto") {
										marginGroup.style["grid-template-rows"] =
											`${topHeight} calc(100% - ${topHeight} - ${bottomHeight}) ${bottomHeight}`;
									} else {
										marginGroup.style["grid-template-rows"] = `${topHeight} calc(100% - ${topHeight}*2) ${topHeight}`;
									}
								} else {
									if (bottomHeight !== "none" && bottomHeight !== "auto") {
										marginGroup.style["grid-template-rows"] =
											`${bottomHeight} calc(100% - ${bottomHeight}*2) ${bottomHeight}`;
									}
								}
							}
						} else {
							if (bottomHeight !== "none" && bottomHeight !== "auto") {
								marginGroup.style["grid-template-rows"] =
									`${bottomHeight} calc(100% - ${bottomHeight}*2) ${bottomHeight}`;
							}
						}
					} else {
						if (topContent && topHeight !== "none" && topHeight !== "auto") {
							marginGroup.style["grid-template-rows"] =
								`${topHeight} ${middleHeight} calc(100% - (${topHeight} + ${middleHeight}))`;
						} else if (bottomContent && bottomHeight !== "none" && bottomHeight !== "auto") {
							marginGroup.style["grid-template-rows"] = `1fr ${middleHeight} ${bottomHeight}`;
						} else {
							marginGroup.style["grid-template-rows"] =
								`calc((100% - ${middleHeight})/2) ${middleHeight} calc((100% - ${middleHeight})/2)`;
						}
					}
				} else {
					if (topContent) {
						if (!bottomContent) {
							marginGroup.style["grid-template-rows"] = "1fr 0 0";
						} else {
							if (topHeight !== "none" && topHeight !== "auto") {
								if (bottomHeight !== "none" && bottomHeight !== "auto") {
									marginGroup.style["grid-template-rows"] = `${topHeight} 1fr ${bottomHeight}`;
								} else {
									marginGroup.style["grid-template-rows"] = `${topHeight} 0 1fr`;
								}
							} else {
								if (bottomHeight !== "none" && bottomHeight !== "auto") {
									marginGroup.style["grid-template-rows"] = `1fr 0 ${bottomHeight}`;
								} else {
									marginGroup.style["grid-template-rows"] = "1fr 0 1fr";
								}
							}
						}
					} else {
						if (bottomHeight !== "none" && bottomHeight !== "auto") {
							marginGroup.style["grid-template-rows"] = `1fr 0 ${bottomHeight}`;
						} else {
							marginGroup.style["grid-template-rows"] = "0 0 1fr";
						}
					}
				}
			});
		}

		// CSS Tree Helpers

		selectorsForPage(page) {
			let nthlist;
			let nth;

			const selectors = new csstree.List();

			selectors.insertData({
				type: "ClassSelector",
				name: "pagedjs_page",
			});

			// Named page
			if (page.name) {
				selectors.insertData({
					type: "ClassSelector",
					name: "pagedjs_named_page",
				});

				selectors.insertData({
					type: "ClassSelector",
					name: `pagedjs_${page.name}_page`,
				});
			}

			// PsuedoSelector
			if (page.psuedo && !(page.name && page.psuedo === "first")) {
				selectors.insertData({
					type: "ClassSelector",
					name: `pagedjs_${page.psuedo}_page`,
				});
			}

			if (page.name && page.psuedo === "first") {
				selectors.insertData({
					type: "ClassSelector",
					name: `pagedjs_${page.name}_${page.psuedo}_page`,
				});
			}

			// Nth
			if (page.nth) {
				nthlist = new csstree.List();
				nth = this.getNth(page.nth);

				nthlist.insertData(nth);

				selectors.insertData({
					type: "PseudoClassSelector",
					name: "nth-of-type",
					children: nthlist,
				});
			}

			return selectors;
		}

		selectorsForPageMargin(page, margin) {
			const selectors = this.selectorsForPage(page);

			selectors.insertData({
				type: "Combinator",
				name: " ",
			});

			selectors.insertData({
				type: "ClassSelector",
				name: `pagedjs_margin-${margin}`,
			});

			return selectors;
		}

		createDeclaration(property, value, important) {
			const children = new csstree.List();

			children.insertData({
				type: "Identifier",
				loc: null,
				name: value,
			});

			return {
				type: "Declaration",
				loc: null,
				important: important,
				property: property,
				value: {
					type: "Value",
					loc: null,
					children: children,
				},
			};
		}

		createVariable(property, value) {
			return {
				type: "Declaration",
				loc: null,
				property: property,
				value: {
					type: "Raw",
					value: value,
				},
			};
		}

		createCalculatedDimension(property, items, important, operator = "+") {
			const children = new csstree.List();
			const calculations = new csstree.List();

			items.forEach((item, index) => {
				calculations.appendData({
					type: "Dimension",
					unit: item.unit,
					value: item.value,
				});

				calculations.appendData({
					type: "WhiteSpace",
					value: " ",
				});

				if (index + 1 < items.length) {
					calculations.appendData({
						type: "Operator",
						value: operator,
					});

					calculations.appendData({
						type: "WhiteSpace",
						value: " ",
					});
				}
			});

			children.insertData({
				type: "Function",
				loc: null,
				name: "calc",
				children: calculations,
			});

			return {
				type: "Declaration",
				loc: null,
				important: important,
				property: property,
				value: {
					type: "Value",
					loc: null,
					children: children,
				},
			};
		}

		createDimension(property, cssValue, important) {
			const children = new csstree.List();

			children.insertData({
				type: "Dimension",
				loc: null,
				value: cssValue.value,
				unit: cssValue.unit,
			});

			return {
				type: "Declaration",
				loc: null,
				important: important,
				property: property,
				value: {
					type: "Value",
					loc: null,
					children: children,
				},
			};
		}

		createBlock(declarations) {
			const block = new csstree.List();

			declarations.forEach((declaration) => {
				block.insertData(declaration);
			});

			return {
				type: "Block",
				loc: null,
				children: block,
			};
		}

		createRule(selectors, block) {
			const selectorList = new csstree.List();
			selectorList.insertData({
				type: "Selector",
				children: selectors,
			});

			if (Array.isArray(block)) {
				block = this.createBlock(block);
			}

			return {
				type: "Rule",
				prelude: {
					type: "SelectorList",
					children: selectorList,
				},
				block: block,
			};
		}
	}

	class Breaks extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.breaks = {};
		}

		onDeclaration(declaration, dItem, dList, rule) {
			let property = declaration.property;

			if (property === "page") {
				const children = declaration.value.children.first();
				const value = children.name;
				const selector = csstree.generate(rule.ruleNode.prelude);
				const name = value;

				const breaker = {
					property: property,
					value: value,
					selector: selector,
					name: name,
				};

				selector.split(",").forEach((s) => {
					if (!this.breaks[s]) {
						this.breaks[s] = [breaker];
					} else {
						this.breaks[s].push(breaker);
					}
				});

				dList.remove(dItem);
			}

			if (
				property === "break-before" ||
				property === "break-after" ||
				property === "page-break-before" ||
				property === "page-break-after"
			) {
				const child = declaration.value.children.first();
				const value = child.name;
				const selector = csstree.generate(rule.ruleNode.prelude);

				if (property === "page-break-before") {
					property = "break-before";
				} else if (property === "page-break-after") {
					property = "break-after";
				}

				const breaker = {
					property: property,
					value: value,
					selector: selector,
				};

				selector.split(",").forEach((s) => {
					if (!this.breaks[s]) {
						this.breaks[s] = [breaker];
					} else {
						this.breaks[s].push(breaker);
					}
				});

				// Remove from CSS -- handle right / left in module
				dList.remove(dItem);
			}
		}

		afterParsed(parsed) {
			this.processBreaks(parsed, this.breaks);
		}

		processBreaks(parsed, breaks) {
			for (const b in breaks) {
				// Find elements
				const elements = parsed.querySelectorAll(b);
				// Add break data
				for (var i = 0; i < elements.length; i++) {
					for (const prop of breaks[b]) {
						if (prop.property === "break-after") {
							const nodeAfter = displayedElementAfter(elements[i], parsed);

							elements[i].setAttribute("data-break-after", prop.value);

							if (nodeAfter) {
								nodeAfter.setAttribute("data-previous-break-after", prop.value);
							}
						} else if (prop.property === "break-before") {
							const nodeBefore = displayedElementBefore(elements[i], parsed);

							// Breaks are only allowed between siblings, not between a box and its container.
							// If we cannot find a node before we should not break!
							// https://drafts.csswg.org/css-break-3/#break-propagation
							if (nodeBefore) {
								if (prop.value === "page" && needsPageBreak(elements[i], nodeBefore)) {
									// we ignore this explicit page break because an implicit page break is already needed
									continue;
								}
								elements[i].setAttribute("data-break-before", prop.value);
								nodeBefore.setAttribute("data-next-break-before", prop.value);
							}
						} else if (prop.property === "page") {
							elements[i].setAttribute("data-page", prop.value);

							const nodeAfter = displayedElementAfter(elements[i], parsed);

							if (nodeAfter) {
								nodeAfter.setAttribute("data-after-page", prop.value);
							}
						} else {
							elements[i].setAttribute(`data-${prop.property}`, prop.value);
						}
					}
				}
			}
		}

		mergeBreaks(pageBreaks, newBreaks) {
			for (const b in newBreaks) {
				if (b in pageBreaks) {
					pageBreaks[b] = pageBreaks[b].concat(newBreaks[b]);
				} else {
					pageBreaks[b] = newBreaks[b];
				}
			}
			return pageBreaks;
		}

		addBreakAttributes(pageElement, page) {
			const before = pageElement.querySelector("[data-break-before]");
			const after = pageElement.querySelector("[data-break-after]");
			const previousBreakAfter = pageElement.querySelector("[data-previous-break-after]");

			if (before) {
				if (before.dataset.splitFrom) {
					page.splitFrom = before.dataset.splitFrom;
					pageElement.setAttribute("data-split-from", before.dataset.splitFrom);
				} else if (before.dataset.breakBefore && before.dataset.breakBefore !== "avoid") {
					page.breakBefore = before.dataset.breakBefore;
					pageElement.setAttribute("data-break-before", before.dataset.breakBefore);
				}
			}

			if (after?.dataset) {
				if (after.dataset.splitTo) {
					page.splitTo = after.dataset.splitTo;
					pageElement.setAttribute("data-split-to", after.dataset.splitTo);
				} else if (after.dataset.breakAfter && after.dataset.breakAfter !== "avoid") {
					page.breakAfter = after.dataset.breakAfter;
					pageElement.setAttribute("data-break-after", after.dataset.breakAfter);
				}
			}

			if (previousBreakAfter?.dataset) {
				if (
					previousBreakAfter.dataset.previousBreakAfter &&
					previousBreakAfter.dataset.previousBreakAfter !== "avoid"
				) {
					page.previousBreakAfter = previousBreakAfter.dataset.previousBreakAfter;
				}
			}
		}

		afterPageLayout(pageElement, page) {
			this.addBreakAttributes(pageElement, page);
		}
	}

	class PrintMedia extends Handler {
		onAtMedia(node, item, list) {
			const media = this.getMediaName(node);
			let rules;
			if (media.includes("print")) {
				rules = node.block.children;

				// Append rules to the end of main rules list
				// TODO: this isn't working right, needs to check what is in the prelude
				/*
				rules.forEach((selectList) => {
					if (selectList.prelude) {
						selectList.prelude.children.forEach((rule) => {

							rule.children.prependData({
								type: "Combinator",
								name: " "
							});
		
							rule.children.prependData({
								type: "ClassSelector",
								name: "pagedjs_page"
							});
						});	
					}
				});

				list.insertList(rules, item);
				*/

				// Append rules to the end of main rules list
				list.appendList(rules);

				// Remove rules from the @media block
				list.remove(item);
			} else if (!media.includes("all") && !media.includes("pagedjs-ignore")) {
				list.remove(item);
			}
		}

		getMediaName(node) {
			const media = [];

			if (typeof node.prelude === "undefined" || node.prelude.type !== "AtrulePrelude") {
				return;
			}

			csstree.walk(node.prelude, {
				visit: "Identifier",
				enter: (identNode, _iItem, _iList) => {
					media.push(identNode.name);
				},
			});
			return media;
		}
	}

	class Splits extends Handler {
		afterPageLayout(pageElement, _page, _breakToken, _chunker) {
			const splits = Array.from(pageElement.querySelectorAll("[data-split-from]"));
			const pages = pageElement.parentNode;
			const index = Array.prototype.indexOf.call(pages.children, pageElement);
			let prevPage;

			if (index === 0) {
				return;
			}

			prevPage = pages.children[index - 1];

			let from; // Capture the last from element
			splits.forEach((split) => {
				const ref = split.dataset.ref;
				from = prevPage.querySelector(`[data-ref='${ref}']:not([data-split-to])`);

				if (from) {
					from.dataset.splitTo = ref;

					if (!from.dataset.splitFrom) {
						from.dataset.splitOriginal = true;
					}
				}
			});

			// Fix alignment on the deepest split element
			if (from) {
				this.handleAlignment(from);
			}
		}

		handleAlignment(node) {
			const styles = window.getComputedStyle(node);
			const align = styles["text-align"];
			const alignLast = styles["text-align-last"];
			node.dataset.lastSplitElement = "true";
			if (align === "justify" && alignLast === "auto") {
				node.dataset.alignLastSplitElement = "justify";
			} else {
				node.dataset.alignLastSplitElement = alignLast;
			}
		}
	}

	class Counters extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;
			this.counters = {};
			this.resetCountersMap = new Map();
		}

		onDeclaration(declaration, dItem, dList, rule) {
			const property = declaration.property;

			if (property === "counter-increment") {
				this.handleIncrement(declaration, rule);
				// clean up empty declaration
				let hasProperities = false;
				declaration.value.children.forEach((data) => {
					if (data.type && data.type !== "WhiteSpace") {
						hasProperities = true;
					}
				});
				if (!hasProperities) {
					dList.remove(dItem);
				}
			} else if (property === "counter-reset") {
				this.handleReset(declaration, rule);
				// clean up empty declaration
				let hasProperities = false;
				declaration.value.children.forEach((data) => {
					if (data.type && data.type !== "WhiteSpace") {
						hasProperities = true;
					}
				});
				if (!hasProperities) {
					dList.remove(dItem);
				}
			}
		}

		afterParsed(parsed) {
			this.processCounters(parsed, this.counters);
			this.scopeCounters(this.counters);
		}

		addCounter(name) {
			if (name in this.counters) {
				return this.counters[name];
			}

			this.counters[name] = {
				name: name,
				increments: {},
				resets: {},
			};

			return this.counters[name];
		}

		handleIncrement(declaration, rule) {
			const increments = [];
			const children = declaration.value.children;

			children.forEach((data, item) => {
				if (data.type && data.type === "Identifier") {
					const name = data.name;

					if (name === "page" || name.indexOf("target-counter-") === 0) {
						return;
					}

					let whitespace;
					let number;
					let value;
					if (item.next && item.next.data.type === "WhiteSpace") {
						whitespace = item.next;
					}
					if (whitespace?.next && whitespace.next.data.type === "Number") {
						number = whitespace.next;
						value = Number.parseInt(number.data.value, 10);
					}

					const selector = csstree.generate(rule.ruleNode.prelude);

					let counter;
					if (!(name in this.counters)) {
						counter = this.addCounter(name);
					} else {
						counter = this.counters[name];
					}
					const increment = {
						selector: selector,
						number: value || 1,
					};
					counter.increments[selector] = increment;
					increments.push(increment);

					// Remove the parsed resets
					children.remove(item);
					if (whitespace) {
						children.remove(whitespace);
					}
					if (number) {
						children.remove(number);
					}
				}
			});

			return increments;
		}

		handleReset(declaration, rule) {
			const children = declaration.value.children;

			children.forEach((data, item) => {
				if (data.type && data.type === "Identifier") {
					const name = data.name;
					let whitespace;
					let number;
					let value;
					if (item.next && item.next.data.type === "WhiteSpace") {
						whitespace = item.next;
					}
					if (whitespace?.next) {
						if (whitespace.next.data.type === "Number") {
							// The counter reset value is specified using a number. E.g. counter-reset: c2 5;
							number = whitespace.next;
							value = Number.parseInt(number.data.value, 10);
						} else if (whitespace.next.data.type === "Function" && whitespace.next.data.name === "var") {
							// The counter reset value is specified using a CSS variable (custom property).
							// E.g. counter-reset: c2 var(--my-variable);
							// See https://developer.mozilla.org/en-US/docs/Web/CSS/var
							number = whitespace.next;
							// Use the variable name (e.g. '--my-variable') as value for now. The actual value is resolved later by the
							// processCounterResets function.
							value = whitespace.next.data.children.head.data.name;
						}
					}

					let counter;
					let selector;
					const prelude = rule.ruleNode.prelude;

					if (rule.ruleNode.type === "Atrule" && rule.ruleNode.name === "page") {
						selector = ".pagedjs_page";
					} else {
						selector = csstree.generate(prelude || rule.ruleNode);
					}

					if (name === "footnote") {
						this.addFootnoteMarkerCounter(declaration.value.children);
					}

					if (!(name in this.counters)) {
						counter = this.addCounter(name);
					} else {
						counter = this.counters[name];
					}

					const reset = {
						selector: selector,
						number: value || 0,
					};

					counter.resets[selector] = reset;

					if (selector !== ".pagedjs_page") {
						// Remove the parsed resets
						children.remove(item);
						if (whitespace) {
							children.remove(whitespace);
						}
						if (number) {
							children.remove(number);
						}
					}
				}
			});
		}

		processCounters(parsed, counters) {
			let counter;
			for (const c in counters) {
				counter = this.counters[c];
				this.processCounterIncrements(parsed, counter);
				this.processCounterResets(parsed, counter);
				if (c !== "page") {
					this.addCounterValues(parsed, counter);
				}
			}
		}

		scopeCounters(counters) {
			const countersArray = [];
			for (const c in counters) {
				if (c !== "page") {
					countersArray.push(`${counters[c].name} 0`);
				}
			}
			// Add to pages to allow cross page scope
			this.insertRule(
				`.pagedjs_pages { counter-reset: ${countersArray.join(" ")} page 0 pages var(--pagedjs-page-count) footnote var(--pagedjs-footnotes-count) footnote-marker var(--pagedjs-footnotes-count)}`,
			);
		}

		insertRule(rule) {
			this.styleSheet.insertRule(rule, this.styleSheet.cssRules.length);
		}

		processCounterIncrements(parsed, counter) {
			let increment;
			for (const inc in counter.increments) {
				increment = counter.increments[inc];
				// Find elements for increments
				const incrementElements = parsed.querySelectorAll(increment.selector);
				// Add counter data
				for (let i = 0; i < incrementElements.length; i++) {
					incrementElements[i].setAttribute(`data-counter-${counter.name}-increment`, increment.number);
					if (incrementElements[i].getAttribute("data-counter-increment")) {
						incrementElements[i].setAttribute(
							"data-counter-increment",
							`${incrementElements[i].getAttribute("data-counter-increment")} ${counter.name}`,
						);
					} else {
						incrementElements[i].setAttribute("data-counter-increment", counter.name);
					}
				}
			}
		}

		processCounterResets(parsed, counter) {
			let reset;
			for (const r in counter.resets) {
				reset = counter.resets[r];
				// Find elements for resets
				const resetElements = parsed.querySelectorAll(reset.selector);
				// Add counter data
				for (var i = 0; i < resetElements.length; i++) {
					let value = reset.number;
					if (typeof value === "string" && value.startsWith("--")) {
						// The value is specified using a CSS variable (custom property).
						// FIXME: We get the variable value only from the inline style of the element because at this point the
						// element is detached and thus using:
						//
						//		getComputedStyle(resetElements[i]).getPropertyValue(value)
						//
						// always returns an empty string. We could try to temporarily attach the element to get its computed style,
						// but for now using the inline style is enough for us.
						value = resetElements[i].style.getPropertyValue(value) || 0;
					}
					resetElements[i].setAttribute(`data-counter-${counter.name}-reset`, value);
					if (resetElements[i].getAttribute("data-counter-reset")) {
						resetElements[i].setAttribute(
							"data-counter-reset",
							`${resetElements[i].getAttribute("data-counter-reset")} ${counter.name}`,
						);
					} else {
						resetElements[i].setAttribute("data-counter-reset", counter.name);
					}
				}
			}
		}

		addCounterValues(parsed, counter) {
			const counterName = counter.name;

			if (counterName === "page" || counterName === "footnote") {
				return;
			}

			const elements = parsed.querySelectorAll(
				`[data-counter-${counterName}-reset], [data-counter-${counterName}-increment]`,
			);

			let count = 0;
			let element;
			let increment;
			let reset;
			let resetValue;
			let incrementValue;
			let resetDelta;
			let incrementArray;

			for (let i = 0; i < elements.length; i++) {
				element = elements[i];
				resetDelta = 0;
				incrementArray = [];

				if (element.hasAttribute(`data-counter-${counterName}-reset`)) {
					reset = element.getAttribute(`data-counter-${counterName}-reset`);
					resetValue = Number.parseInt(reset, 10);

					// Use negative increment value inplace of reset
					resetDelta = resetValue - count;
					incrementArray.push(`${counterName} ${resetDelta}`);

					count = resetValue;
				}

				if (element.hasAttribute(`data-counter-${counterName}-increment`)) {
					increment = element.getAttribute(`data-counter-${counterName}-increment`);
					incrementValue = Number.parseInt(increment, 10);

					count += incrementValue;

					element.setAttribute(`data-counter-${counterName}-value`, count);

					incrementArray.push(`${counterName} ${incrementValue}`);
				}

				if (incrementArray.length > 0) {
					this.incrementCounterForElement(element, incrementArray);
				}
			}
		}

		addFootnoteMarkerCounter(list) {
			const markers = [];
			csstree.walk(list, {
				visit: "Identifier",
				enter: (identNode, _iItem, _iList) => {
					markers.push(identNode.name);
				},
			});

			// Already added
			if (markers.includes("footnote-maker")) {
				return;
			}

			list.insertData({
				type: "WhiteSpace",
				value: " ",
			});

			list.insertData({
				type: "Identifier",
				name: "footnote-marker",
			});

			list.insertData({
				type: "WhiteSpace",
				value: " ",
			});

			list.insertData({
				type: "Number",
				value: 0,
			});
		}

		incrementCounterForElement(element, incrementArray) {
			if (!element || !incrementArray || incrementArray.length === 0) return;

			const ref = element.dataset.ref;
			const increments = Array.from(this.styleSheet.cssRules)
				.filter((rule) => {
					return (
						rule.selectorText === `[data-ref="${element.dataset.ref}"]:not([data-split-from])` &&
						rule.style[0] === "counter-increment"
					);
				})
				.map((rule) => rule.style.counterIncrement);

			// Merge the current increments by summing the values because we generate both a decrement and an increment when the
			// element resets and increments the counter at the same time. E.g. ['c1 -7', 'c1 1'] should lead to 'c1 -6'.
			increments.push(
				this.mergeIncrements(
					incrementArray,
					(prev, next) => (Number.parseInt(prev, 10) || 0) + (Number.parseInt(next, 10) || 0),
				),
			);

			// Keep the last value for each counter when merging with the previous increments. E.g. ['c1 -7 c2 3', 'c1 1']
			// should lead to 'c1 1 c2 3'.
			const counterIncrement = this.mergeIncrements(increments, (_prev, next) => next);
			this.insertRule(`[data-ref="${ref}"]:not([data-split-from]) { counter-increment: ${counterIncrement} }`);
		}

		/**
		 * Merge multiple values of a counter-increment CSS rule, using the specified operator.
		 *
		 * @param {Array} incrementArray the values to merge, e.g. ['c1 1', 'c1 -7 c2 1']
		 * @param {Function} operator the function used to merge counter values (e.g. keep the last value of a counter or sum
		 *					the counter values)
		 * @return {string} the merged value of the counter-increment CSS rule
		 */
		mergeIncrements(incrementArray, operator) {
			const increments = {};
			incrementArray.forEach((increment) => {
				const values = increment.split(" ");
				for (let i = 0; i < values.length; i += 2) {
					increments[values[i]] = operator(increments[values[i]], values[i + 1]);
				}
			});

			return Object.entries(increments)
				.map(([key, value]) => `${key} ${value}`)
				.join(" ");
		}

		afterPageLayout(pageElement, _page) {
			const resets = [];

			const pgreset = pageElement.querySelectorAll("[data-counter-page-reset]:not([data-split-from])");
			pgreset.forEach((reset) => {
				const ref = reset.dataset?.ref;
				if (ref && this.resetCountersMap.has(ref));
				else {
					if (ref) {
						this.resetCountersMap.set(ref, "");
					}
					const value = reset.dataset.counterPageReset;
					resets.push(`page ${value}`);
				}
			});

			const notereset = pageElement.querySelectorAll("[data-counter-footnote-reset]:not([data-split-from])");
			notereset.forEach((reset) => {
				const value = reset.dataset.counterFootnoteReset;
				resets.push(`footnote ${value}`);
				resets.push(`footnote-marker ${value}`);
			});

			if (resets.length) {
				this.styleSheet.insertRule(
					`[data-page-number="${pageElement.dataset.pageNumber}"] { counter-increment: none; counter-reset: ${resets.join(" ")} }`,
					this.styleSheet.cssRules.length,
				);
			}
		}
	}

	class Lists extends Handler {
		afterParsed(content) {
			const orderedLists = content.querySelectorAll("ol");

			for (var list of orderedLists) {
				this.addDataNumbers(list);
			}
		}

		afterPageLayout(pageElement, _page, _breakToken, _chunker) {
			var orderedLists = pageElement.getElementsByTagName("ol");
			for (var list of orderedLists) {
				if (list.firstElementChild) {
					list.start = list.firstElementChild.dataset.itemNum;
				}
			}
		}

		addDataNumbers(list) {
			let start = 1;
			if (list.hasAttribute("start")) {
				start = Number.parseInt(list.getAttribute("start"), 10);
				if (Number.isNaN(start)) {
					start = 1;
				}
			}
			const items = list.children;
			for (var i = 0; i < items.length; i++) {
				items[i].setAttribute("data-item-num", i + start);
			}
		}
	}

	class PositionFixed extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);
			this.styleSheet = polisher.styleSheet;
			this.fixedElementsSelector = [];
			this.fixedElements = [];
		}

		onDeclaration(declaration, dItem, dList, rule) {
			if (declaration.property === "position" && declaration.value.children.first().name === "fixed") {
				const selector = csstree.generate(rule.ruleNode.prelude);
				this.fixedElementsSelector.push(selector);
				dList.remove(dItem);
			}
		}

		afterParsed(fragment) {
			this.fixedElementsSelector.forEach((fixedEl) => {
				fragment.querySelectorAll(`${fixedEl}`).forEach((el) => {
					el.style.setProperty("position", "absolute");
					this.fixedElements.push(el);
					el.remove();
				});
			});
		}

		afterPageLayout(pageElement, _page, _breakToken) {
			this.fixedElements.forEach((el) => {
				const clone = el.cloneNode(true);
				pageElement.querySelector(".pagedjs_pagebox").insertAdjacentElement("afterbegin", clone);
			});
		}
	}

	class PageCounterIncrement extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;
			this.pageCounter = {
				name: "page",
				increments: {},
				resets: {},
			};
		}

		onDeclaration(declaration, dItem, dList, rule) {
			const property = declaration.property;

			if (property === "counter-increment") {
				const inc = this.handleIncrement(declaration, rule);
				if (inc) {
					dList.remove(dItem);
				}
			}
		}

		afterParsed(_) {
			for (const inc in this.pageCounter.increments) {
				const increment = this.pageCounter.increments[inc];
				this.insertRule(`${increment.selector} { --pagedjs-page-counter-increment: ${increment.number} }`);
			}
		}

		handleIncrement(declaration, rule) {
			const identifier = declaration.value.children.first();
			const number = declaration.value.children.getSize() > 1 ? declaration.value.children.last().value : 1;
			const name = identifier?.name;

			if (name && name.indexOf("target-counter-") === 0) {
				return;
			}
			// A counter named page is automatically created and incremented by 1 on every page of the document,
			// unless the counter-increment property in the page context explicitly specifies a different increment for the page counter.
			// https://www.w3.org/TR/css-page-3/#page-based-counters
			if (name !== "page") {
				return;
			}
			// the counter-increment property is not defined on the page context (i.e. @page rule), ignoring...
			if (rule.ruleNode.name === "page" && rule.ruleNode.type === "Atrule") {
				return;
			}
			const selector = csstree.generate(rule.ruleNode.prelude);
			return (this.pageCounter.increments[selector] = {
				selector: selector,
				number,
			});
		}

		insertRule(rule) {
			this.styleSheet.insertRule(rule, this.styleSheet.cssRules.length);
		}
	}

	class NthOfType extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;
			this.selectors = {};
		}

		onRule(ruleNode, ruleItem, rulelist) {
			const selector = csstree.generate(ruleNode.prelude);
			if (selector.match(/:(first|last|nth)-of-type/)) {
				let declarations = csstree.generate(ruleNode.block);
				declarations = declarations.replace(/[{}]/g, "");

				const uuid = `nth-of-type-${UUID()}`;

				selector.split(",").forEach((s) => {
					if (!this.selectors[s]) {
						this.selectors[s] = [uuid, declarations];
					} else {
						this.selectors[s][1] = `${this.selectors[s][1]};${declarations}`;
					}
				});

				rulelist.remove(ruleItem);
			}
		}

		afterParsed(parsed) {
			this.processSelectors(parsed, this.selectors);
		}

		processSelectors(parsed, selectors) {
			// add the new attributes to matching elements
			for (const s in selectors) {
				const elements = parsed.querySelectorAll(s);

				for (var i = 0; i < elements.length; i++) {
					let dataNthOfType = elements[i].getAttribute("data-nth-of-type");

					if (dataNthOfType && dataNthOfType !== "") {
						dataNthOfType = `${dataNthOfType},${selectors[s][0]}`;
						elements[i].setAttribute("data-nth-of-type", dataNthOfType);
					} else {
						elements[i].setAttribute("data-nth-of-type", selectors[s][0]);
					}
				}

				const rule = `*[data-nth-of-type*='${selectors[s][0]}'] { ${selectors[s][1]}; }`;
				this.styleSheet.insertRule(rule, this.styleSheet.cssRules.length);
			}
		}
	}

	class Following extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;
			this.selectors = {};
		}

		onRule(ruleNode, ruleItem, rulelist) {
			const selector = csstree.generate(ruleNode.prelude);
			if (selector.match(/\+/)) {
				let declarations = csstree.generate(ruleNode.block);
				declarations = declarations.replace(/[{}]/g, "");

				const uuid = `following-${UUID()}`;

				selector.split(",").forEach((s) => {
					if (!this.selectors[s]) {
						this.selectors[s] = [uuid, declarations];
					} else {
						this.selectors[s][1] = `${this.selectors[s][1]};${declarations}`;
					}
				});

				rulelist.remove(ruleItem);
			}
		}

		afterParsed(parsed) {
			this.processSelectors(parsed, this.selectors);
		}

		processSelectors(parsed, selectors) {
			// add the new attributes to matching elements
			for (const s in selectors) {
				const elements = parsed.querySelectorAll(s);

				for (var i = 0; i < elements.length; i++) {
					let dataFollowing = elements[i].getAttribute("data-following");

					if (dataFollowing && dataFollowing !== "") {
						dataFollowing = `${dataFollowing},${selectors[s][0]}`;
						elements[i].setAttribute("data-following", dataFollowing);
					} else {
						elements[i].setAttribute("data-following", selectors[s][0]);
					}
				}

				const rule = `*[data-following*='${selectors[s][0]}'] { ${selectors[s][1]}; }`;
				this.styleSheet.insertRule(rule, this.styleSheet.cssRules.length);
			}
		}
	}

	class Footnotes extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.footnotes = {};
			this.needsLayout = [];
		}

		onDeclaration(declaration, dItem, dList, rule) {
			const property = declaration.property;
			if (property === "float") {
				const identifier = declaration.value.children?.first();
				const location = identifier?.name;
				if (location === "footnote") {
					const selector = csstree.generate(rule.ruleNode.prelude);
					this.footnotes[selector] = {
						selector: selector,
						policy: "auto",
						display: "block",
					};
					dList.remove(dItem);
				}
			}
			if (property === "footnote-policy") {
				const identifier = declaration.value.children?.first();
				const policy = identifier?.name;
				if (policy) {
					const selector = csstree.generate(rule.ruleNode.prelude);
					const note = this.footnotes[selector];
					if (note) {
						note.policy = policy;
					}
				}
			}
			if (property === "footnote-display") {
				const identifier = declaration.value.children?.first();
				const display = identifier?.name;
				const selector = csstree.generate(rule.ruleNode.prelude);
				if (display && this.footnotes[selector]) {
					const note = this.footnotes[selector];
					if (note) {
						note.display = display;
					}
				}
			}
		}

		onPseudoSelector(pseudoNode, _pItem, _pList, _selector, rule) {
			const name = pseudoNode.name;
			if (name === "footnote-marker") {
				// switch ::footnote-marker to [data-footnote-marker]::before
				const prelude = rule.ruleNode.prelude;
				const newPrelude = new csstree.List();

				// Can't get remove to work, so just copying everything else
				prelude.children.first().children.each((node) => {
					if (node.type !== "PseudoElementSelector") {
						newPrelude.appendData(node);
					}
				});

				// Add our data call
				newPrelude.appendData({
					type: "AttributeSelector",
					name: {
						type: "Identifier",
						name: "data-footnote-marker",
					},
					flags: null,
					loc: null,
					matcher: null,
					value: null,
				});

				// Add new pseudo element
				newPrelude.appendData({
					type: "PseudoElementSelector",
					name: "marker",
					loc: null,
					children: null,
				});

				prelude.children.first().children = newPrelude;
			}

			if (name === "footnote-call") {
				// switch ::footnote-call to [data-footnote-call]::after

				const prelude = rule.ruleNode.prelude;
				const newPrelude = new csstree.List();

				// Can't get remove to work, so just copying everything else
				prelude.children.first().children.each((node) => {
					if (node.type !== "PseudoElementSelector") {
						newPrelude.appendData(node);
					}
				});

				// Add our data call
				newPrelude.appendData({
					type: "AttributeSelector",
					name: {
						type: "Identifier",
						name: "data-footnote-call",
					},
					flags: null,
					loc: null,
					matcher: null,
					value: null,
				});

				// Add new pseudo element
				newPrelude.appendData({
					type: "PseudoElementSelector",
					name: "after",
					loc: null,
					children: null,
				});

				prelude.children.first().children = newPrelude;
			}
		}

		afterParsed(parsed) {
			this.processFootnotes(parsed, this.footnotes);
		}

		processFootnotes(parsed, notes) {
			for (const n in notes) {
				// Find elements
				const elements = parsed.querySelectorAll(n);
				let element;
				const note = notes[n];
				for (var i = 0; i < elements.length; i++) {
					element = elements[i];
					// Add note type
					element.setAttribute("data-note", "footnote");
					element.setAttribute("data-break-before", "avoid");
					element.setAttribute("data-note-policy", note.policy || "auto");
					element.setAttribute("data-note-display", note.display || "block");
					// Mark all parents
					this.processFootnoteContainer(element);
				}
			}
		}

		processFootnoteContainer(node) {
			// Find the container
			let element = node.parentElement;
			let prevElement = element;
			// Walk up the dom until we find a container element
			while (element) {
				if (isContainer(element)) {
					// Add flag to the previous non-container element that will render with children
					prevElement.setAttribute("data-has-notes", "true");
					break;
				}

				prevElement = element;
				element = element.parentElement;

				// If no containers were found and there are no further parents flag the last element
				if (!element) {
					prevElement.setAttribute("data-has-notes", "true");
				}
			}
		}

		renderNode(node) {
			if (node.nodeType === 1) {
				// Get all notes
				let notes;

				// Ingnore html element nodes, like mathml
				if (!node.dataset) {
					return;
				}

				if (node.dataset.note === "footnote") {
					notes = [node];
				} else if (node.dataset.hasNotes || node.querySelectorAll("[data-note='footnote']")) {
					notes = node.querySelectorAll("[data-note='footnote']");
				}

				if (notes?.length) {
					this.findVisibleFootnotes(notes, node);
				}
			}
		}

		findVisibleFootnotes(notes, node) {
			let area;
			let size;
			let right;
			area = node.closest(".pagedjs_page_content");
			size = area.getBoundingClientRect();
			right = size.left + size.width;

			for (let i = 0; i < notes.length; ++i) {
				const currentNote = notes[i];
				const bounds = currentNote.getBoundingClientRect();
				const left = bounds.left;

				if (left < right) {
					// Add call for the note
					this.moveFootnote(currentNote, node.closest(".pagedjs_area"), true);
				}
			}
		}

		moveFootnote(node, pageArea, needsNoteCall) {
			// let pageArea = node.closest(".pagedjs_area");
			const noteArea = pageArea.querySelector(".pagedjs_footnote_area");
			const noteContent = noteArea.querySelector(".pagedjs_footnote_content");
			const noteInnerContent = noteContent.querySelector(".pagedjs_footnote_inner_content");

			if (!isElement(node)) {
				return;
			}

			// Add call for the note
			let noteCall;
			if (needsNoteCall) {
				noteCall = this.createFootnoteCall(node);
			}

			// Remove the break before attribute for future layout
			node.removeAttribute("data-break-before");

			// Check if note already exists for overflow
			const existing = noteInnerContent.querySelector(`[data-ref="${node.dataset.ref}"]`);
			if (existing) {
				// Remove the note from the flow but no need to render it again
				node.remove();
				return;
			}

			// Add the note node
			noteInnerContent.appendChild(node);

			// Remove empty class
			if (noteContent.classList.contains("pagedjs_footnote_empty")) {
				noteContent.classList.remove("pagedjs_footnote_empty");
			}

			// Add marker
			node.dataset.footnoteMarker = node.dataset.ref;

			// Add Id
			node.id = `note-${node.dataset.ref}`;

			// Get note content size
			const height = noteContent.scrollHeight;

			// Check the noteCall is still on screen
			const area = pageArea.querySelector(".pagedjs_page_content");
			const size = area.getBoundingClientRect();
			const right = size.left + size.width;

			// TODO: add a max height in CSS

			// Check element sizes
			const noteCallBounds = noteCall?.getBoundingClientRect();
			const noteAreaBounds = noteArea.getBoundingClientRect();

			// Get the @footnote margins
			const noteContentMargins = this.marginsHeight(noteContent);
			const noteContentPadding = this.paddingHeight(noteContent);
			const noteContentBorders = this.borderHeight(noteContent);
			const total = noteContentMargins + noteContentPadding + noteContentBorders;

			// Get the top of the @footnote area
			let notAreaTop = Math.floor(noteAreaBounds.top);
			// If the height isn't set yet, remove the margins from the top
			if (noteAreaBounds.height === 0) {
				notAreaTop -= this.marginsHeight(noteContent, false);
				notAreaTop -= this.paddingHeight(noteContent, false);
				notAreaTop -= this.borderHeight(noteContent, false);
			}
			// Determine the note call position and offset per policy
			const notePolicy = node.dataset.notePolicy;
			let noteCallPosition = 0;
			let noteCallOffset = 0;
			if (noteCall) {
				// Get the correct line bottom for super or sub styled callouts
				const prevSibling = noteCall.previousSibling;
				const range = new Range();
				if (prevSibling) {
					range.setStartBefore(prevSibling);
				} else {
					range.setStartBefore(noteCall);
				}
				range.setEndAfter(noteCall);
				const rangeBounds = range.getBoundingClientRect();
				noteCallPosition = rangeBounds.bottom;
				if (!notePolicy || notePolicy === "auto") {
					noteCallOffset = Math.ceil(rangeBounds.bottom);
				} else if (notePolicy === "line") {
					noteCallOffset = Math.ceil(rangeBounds.top);
				} else if (notePolicy === "block") {
					// Check that there is a previous element on the page
					const parentParagraph = noteCall.closest("p").previousElementSibling;
					if (parentParagraph) {
						noteCallOffset = Math.ceil(parentParagraph.getBoundingClientRect().bottom);
					} else {
						noteCallOffset = Math.ceil(rangeBounds.bottom);
					}
				}
			}

			const contentDelta = height + total - noteAreaBounds.height;
			// Space between the top of the footnotes area and the bottom of the footnote call
			const noteDelta = noteCallPosition ? notAreaTop - noteCallPosition : 0;
			// Space needed for the force a break for the policy of the footnote
			const notePolicyDelta = noteCallPosition ? Math.floor(noteAreaBounds.top) - noteCallOffset : 0;
			const hasNotes = noteArea.querySelector("[data-note='footnote']");
			if (needsNoteCall && noteCallBounds.left > right) {
				// Note is offscreen and will be chunked to the next page on overflow
				node.remove();
			} else if (!hasNotes && needsNoteCall && total > noteDelta) {
				// No space to add even the footnote area
				pageArea.style.setProperty("--pagedjs-footnotes-height", "0px");
				// Add a wrapper as this div is removed later
				const wrapperDiv = document.createElement("div");
				wrapperDiv.appendChild(node);
				// Push to the layout queue for the next page
				this.needsLayout.push(wrapperDiv);
			} else if (!needsNoteCall) {
				// Call was previously added, force adding footnote
				pageArea.style.setProperty("--pagedjs-footnotes-height", `${height + total}px`);
			} else if (noteCallPosition < noteAreaBounds.top - contentDelta) {
				// the current note content will fit without pushing the call to the next page
				pageArea.style.setProperty(
					"--pagedjs-footnotes-height",
					`${height + noteContentMargins + noteContentBorders}px`,
				);
			} else {
				// set height to just before note call
				pageArea.style.setProperty("--pagedjs-footnotes-height", `${noteAreaBounds.height + notePolicyDelta}px`);
				noteInnerContent.style.height = `${noteAreaBounds.height + notePolicyDelta - total}px`;
			}
		}

		createFootnoteCall(node) {
			const parentElement = node.parentElement;
			const footnoteCall = document.createElement("a");
			for (const className of node.classList) {
				footnoteCall.classList.add(`${className}`);
			}

			footnoteCall.dataset.footnoteCall = node.dataset.ref;
			footnoteCall.dataset.ref = node.dataset.ref;

			// Increment for counters
			footnoteCall.dataset.dataCounterFootnoteIncrement = 1;

			// Add link
			footnoteCall.href = `#note-${node.dataset.ref}`;

			parentElement.insertBefore(footnoteCall, node);

			return footnoteCall;
		}

		afterPageLayout(pageElement, page, breakToken, chunker) {
			const pageArea = pageElement.querySelector(".pagedjs_area");
			const noteArea = page.footnotesArea;
			const noteContent = noteArea.querySelector(".pagedjs_footnote_content");
			const noteInnerContent = noteArea.querySelector(".pagedjs_footnote_inner_content");

			const noteContentBounds = noteContent.getBoundingClientRect();
			const { width } = noteContentBounds;

			noteInnerContent.style.columnWidth = `${Math.round(width)}px`;
			noteInnerContent.style.columnGap = "calc(var(--pagedjs-margin-right) + var(--pagedjs-margin-left))";

			// Get overflow
			const layout = new Layout(noteArea, undefined, chunker.settings);
			const overflow = layout.findOverflow(noteInnerContent, noteContentBounds);

			if (overflow) {
				const { startContainer, startOffset } = overflow;
				let startIsNode;
				if (isElement(startContainer)) {
					const start = startContainer.childNodes[startOffset];
					startIsNode = isElement(start) && start.hasAttribute("data-footnote-marker");
				}

				const extracted = overflow.extractContents();

				if (!startIsNode) {
					const splitChild = extracted.firstElementChild;
					splitChild.dataset.splitFrom = splitChild.dataset.ref;

					this.handleAlignment(noteInnerContent.lastElementChild);
				}

				this.needsLayout.push(extracted);

				noteContent.style.removeProperty("height");
				noteInnerContent.style.removeProperty("height");

				const noteInnerContentBounds = noteInnerContent.getBoundingClientRect();
				const { height } = noteInnerContentBounds;

				// Get the @footnote margins
				const noteContentMargins = this.marginsHeight(noteContent);
				const noteContentPadding = this.paddingHeight(noteContent);
				const noteContentBorders = this.borderHeight(noteContent);
				pageArea.style.setProperty(
					"--pagedjs-footnotes-height",
					`${height + noteContentMargins + noteContentBorders + noteContentPadding}px`,
				);

				// Hide footnote content if empty
				if (noteInnerContent.childNodes.length === 0) {
					noteContent.classList.add("pagedjs_footnote_empty");
				}

				if (!breakToken) {
					chunker.clonePage(page);
				} else {
					let breakBefore;
					let previousBreakAfter;
					if (
						breakToken.node &&
						typeof breakToken.node.dataset !== "undefined" &&
						typeof breakToken.node.dataset.previousBreakAfter !== "undefined"
					) {
						previousBreakAfter = breakToken.node.dataset.previousBreakAfter;
					}

					if (
						breakToken.node &&
						typeof breakToken.node.dataset !== "undefined" &&
						typeof breakToken.node.dataset.breakBefore !== "undefined"
					) {
						breakBefore = breakToken.node.dataset.breakBefore;
					}

					if (breakBefore || previousBreakAfter) {
						chunker.clonePage(page);
					}
				}
			}
			noteInnerContent.style.height = "auto";
		}

		handleAlignment(node) {
			const styles = window.getComputedStyle(node);
			const alignLast = styles["text-align-last"];
			node.dataset.lastSplitElement = "true";
			if (alignLast === "auto") {
				node.dataset.alignLastSplitElement = "justify";
			} else {
				node.dataset.alignLastSplitElement = alignLast;
			}
		}

		beforePageLayout(page) {
			while (this.needsLayout.length) {
				const fragment = this.needsLayout.shift();

				Array.from(fragment.childNodes).forEach((node) => {
					this.moveFootnote(node, page.element.querySelector(".pagedjs_area"), false);
				});
			}
		}

		afterOverflowRemoved(removed, rendered) {
			// Find the page area
			const area = rendered.closest(".pagedjs_area");
			// Get any rendered footnotes
			const notes = area.querySelectorAll(".pagedjs_footnote_area [data-note='footnote']");
			for (let n = 0; n < notes.length; n++) {
				const note = notes[n];
				// Check if the call for that footnote has been removed with the overflow
				const call = removed.querySelector(`[data-footnote-call="${note.dataset.ref}"]`);
				if (call) {
					note.remove();
				}
			}
			// Hide footnote content if empty
			const noteInnerContent = area.querySelector(".pagedjs_footnote_inner_content");
			if (noteInnerContent && noteInnerContent.childNodes.length === 0) {
				noteInnerContent.parentElement.classList.add("pagedjs_footnote_empty");
			}
		}

		marginsHeight(element, total = true) {
			const styles = window.getComputedStyle(element);
			const marginTop = Number.parseInt(styles.marginTop, 10);
			const marginBottom = Number.parseInt(styles.marginBottom, 10);
			let margin = 0;
			if (marginTop) {
				margin += marginTop;
			}
			if (marginBottom && total) {
				margin += marginBottom;
			}
			return margin;
		}

		paddingHeight(element, total = true) {
			const styles = window.getComputedStyle(element);
			const paddingTop = Number.parseInt(styles.paddingTop, 10);
			const paddingBottom = Number.parseInt(styles.paddingBottom, 10);
			let padding = 0;
			if (paddingTop) {
				padding += paddingTop;
			}
			if (paddingBottom && total) {
				padding += paddingBottom;
			}
			return padding;
		}

		borderHeight(element, total = true) {
			const styles = window.getComputedStyle(element);
			const borderTop = Number.parseInt(styles.borderTop, 10);
			const borderBottom = Number.parseInt(styles.borderBottom, 10);
			let borders = 0;
			if (borderTop) {
				borders += borderTop;
			}
			if (borderBottom && total) {
				borders += borderBottom;
			}
			return borders;
		}
	}

	var pagedMediaHandlers = [
		PrintMedia,
		AtPage,
		Breaks,
		Splits,
		Counters,
		Lists,
		PositionFixed,
		PageCounterIncrement,
		NthOfType,
		Following,
		Footnotes,
	];

	class RunningHeaders extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.runningSelectors = {};
			this.elements = {};
		}

		onDeclaration(declaration, _dItem, _dList, rule) {
			if (declaration.property === "position") {
				const selector = csstree.generate(rule.ruleNode.prelude);
				const identifier = declaration.value.children.first().name;

				if (identifier === "running") {
					let value;
					csstree.walk(declaration, {
						visit: "Function",
						enter: (node, _item, _list) => {
							value = node.children.first().name;
						},
					});

					this.runningSelectors[value] = {
						identifier: identifier,
						value: value,
						selector: selector,
					};
				}
			}

			if (declaration.property === "content") {
				csstree.walk(declaration, {
					visit: "Function",
					enter: (funcNode, _fItem, _fList) => {
						if (funcNode.name.indexOf("element") > -1) {
							const selector = csstree.generate(rule.ruleNode.prelude);

							const func = funcNode.name;

							const value = funcNode.children.first().name;

							const args = [value];

							// we only handle first for now
							const style = "first";

							selector.split(",").forEach((s) => {
								// remove before / after
								s = s.replace(/::after|::before/, "");

								this.elements[s] = {
									func: func,
									args: args,
									value: value,
									style: style,
									selector: s,
									fullSelector: selector,
								};
							});
						}
					},
				});
			}
		}

		afterParsed(fragment) {
			for (const name of Object.keys(this.runningSelectors)) {
				const set = this.runningSelectors[name];
				const selected = Array.from(fragment.querySelectorAll(set.selector));

				if (set.identifier === "running") {
					for (const header of selected) {
						header.style.display = "none";
					}
				}
			}
		}

		afterPageLayout(fragment) {
			for (const name of Object.keys(this.runningSelectors)) {
				const set = this.runningSelectors[name];
				const selected = fragment.querySelector(set.selector);
				if (selected) {
					// let cssVar;
					if (set.identifier === "running") {
						// cssVar = selected.textContent.replace(/\\([\s\S])|(["|'])/g,"\\$1$2");
						// this.styleSheet.insertRule(`:root { --string-${name}: "${cssVar}"; }`, this.styleSheet.cssRules.length);
						// fragment.style.setProperty(`--string-${name}`, `"${cssVar}"`);
						set.first = selected;
					} else {
						console.warn(`${set.value}needs css replacement`);
					}
				}
			}

			// move elements
			if (!this.orderedSelectors) {
				this.orderedSelectors = this.orderSelectors(this.elements);
			}

			for (const selector of this.orderedSelectors) {
				if (selector) {
					const el = this.elements[selector];
					const selected = fragment.querySelector(selector);
					if (selected) {
						const running = this.runningSelectors[el.args[0]];
						if (running?.first) {
							selected.innerHTML = ""; // Clear node
							// selected.classList.add("pagedjs_clear-after"); // Clear ::after
							const clone = running.first.cloneNode(true);
							clone.style.display = null;
							selected.appendChild(clone);
						}
					}
				}
			}
		}

		/**
		 * Assign a weight to @page selector classes
		 * 1) page
		 * 2) left & right
		 * 3) blank
		 * 4) first & nth
		 * 5) named page
		 * 6) named left & right
		 * 7) named first & nth
		 * @param {string} [s] selector string
		 * @return {int} weight
		 */
		pageWeight(s) {
			let weight = 1;
			const selector = s.split(" ");
			const parts = selector.length && selector[0].split(".");

			parts.shift(); // remove empty first part

			switch (parts.length) {
				case 4:
					if (/^pagedjs_[\w-]+_first_page$/.test(parts[3])) {
						weight = 7;
					} else if (parts[3] === "pagedjs_left_page" || parts[3] === "pagedjs_right_page") {
						weight = 6;
					}
					break;
				case 3:
					if (parts[1] === "pagedjs_named_page") {
						if (parts[2].indexOf(":nth-of-type") > -1) {
							weight = 7;
						} else {
							weight = 5;
						}
					}
					break;
				case 2:
					if (parts[1] === "pagedjs_first_page") {
						weight = 4;
					} else if (parts[1] === "pagedjs_blank_page") {
						weight = 3;
					} else if (parts[1] === "pagedjs_left_page" || parts[1] === "pagedjs_right_page") {
						weight = 2;
					}
					break;
				default:
					if (parts[0].indexOf(":nth-of-type") > -1) {
						weight = 4;
					} else {
						weight = 1;
					}
			}

			return weight;
		}

		/**
		 * Orders the selectors based on weight
		 *
		 * Does not try to deduplicate base on specifity of the selector
		 * Previous matched selector will just be overwritten
		 * @param {obj} [obj] selectors object
		 * @return {Array} orderedSelectors
		 */
		orderSelectors(obj) {
			const selectors = Object.keys(obj);
			const weighted = {
				1: [],
				2: [],
				3: [],
				4: [],
				5: [],
				6: [],
				7: [],
			};

			let orderedSelectors = [];

			for (const s of selectors) {
				const w = this.pageWeight(s);
				weighted[w].unshift(s);
			}

			for (var i = 1; i <= 7; i++) {
				orderedSelectors = orderedSelectors.concat(weighted[i]);
			}

			return orderedSelectors;
		}

		beforeTreeParse(text, sheet) {
			// element(x) is parsed as image element selector, so update element to element-ident
			sheet.text = text.replace(/element[\s]*\(([^|^#)]*)\)/g, "element-ident($1)");
		}
	}

	function cleanPseudoContent(el, trim = "\"' ") {
		if (el == null) return;
		return el
			.replace(new RegExp(`^[${trim}]+`), "")
			.replace(new RegExp(`[${trim}]+$`), "")
			.replace(/["']/g, (match) => {
				return `\\${match}`;
			})
			.replace(/[\n]/g, (_match) => {
				return "\\00000A";
			});
	}

	function cleanSelector(el) {
		if (el == null) return;
		return el.replace(/::footnote-call/g, "").replace(/::footnote-marker/g, "");
	}

	class StringSets extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.stringSetSelectors = {};
			this.type;
			// pageLastString = last string variable defined on the page
			this.pageLastString;
		}

		onDeclaration(declaration, _dItem, _dList, rule) {
			if (declaration.property === "string-set") {
				const selector = csstree.generate(rule.ruleNode.prelude);

				const identifiers = [];
				const functions = [];
				const values = [];

				declaration.value.children.forEach((child) => {
					if (child.type === "Identifier") {
						identifiers.push(child.name);
					}
					if (child.type === "Function") {
						functions.push(child.name);
						child.children.forEach((subchild) => {
							if (subchild.type === "Identifier") {
								values.push(subchild.name);
							}
						});
					}
				});

				identifiers.forEach((identifier, index) => {
					const func = functions[index];
					const value = values[index];
					this.stringSetSelectors[identifier] = {
						identifier,
						func,
						value,
						selector,
					};
				});
			}
		}

		onContent(funcNode, _fItem, _fList, _declaration, _rule) {
			if (funcNode.name === "string") {
				const identifier = funcNode.children?.first().name;
				this.type = funcNode.children.last().name;
				funcNode.name = "var";
				funcNode.children = new csstree.List();

				if (this.type === "first" || this.type === "last" || this.type === "start" || this.type === "first-except") {
					funcNode.children.append(
						funcNode.children.createItem({
							type: "Identifier",
							loc: null,
							name: `--pagedjs-string-${this.type}-${identifier}`,
						}),
					);
				} else {
					funcNode.children.append(
						funcNode.children.createItem({
							type: "Identifier",
							loc: null,
							name: `--pagedjs-string-first-${identifier}`,
						}),
					);
				}
			}
		}

		afterPageLayout(fragment) {
			if (this.pageLastString === undefined) {
				this.pageLastString = {};
			}

			for (const name of Object.keys(this.stringSetSelectors)) {
				const set = this.stringSetSelectors[name];
				const value = set.value;
				const func = set.func;
				const selected = fragment.querySelectorAll(set.selector);

				// Get the last found string for the current identifier
				const stringPrevPage = name in this.pageLastString ? this.pageLastString[name] : "";

				let varFirst;
				let varLast;
				let varStart;
				let varFirstExcept;

				if (selected.length === 0) {
					// if there is no sel. on the page
					varFirst = stringPrevPage;
					varLast = stringPrevPage;
					varStart = stringPrevPage;
					varFirstExcept = stringPrevPage;
				} else {
					selected.forEach((_sel) => {
						// push each content into the array to define in the variable the first and the last element of the page.
						if (func === "content") {
							this.pageLastString[name] = selected[selected.length - 1].textContent;
						}

						if (func === "attr") {
							this.pageLastString[name] = selected[selected.length - 1].getAttribute(value) || "";
						}
					});

					/* FIRST */

					if (func === "content") {
						varFirst = selected[0].textContent;
					}

					if (func === "attr") {
						varFirst = selected[0].getAttribute(value) || "";
					}

					/* LAST */

					if (func === "content") {
						varLast = selected[selected.length - 1].textContent;
					}

					if (func === "attr") {
						varLast = selected[selected.length - 1].getAttribute(value) || "";
					}

					/* START */

					// Hack to find if the sel. is the first elem of the page / find a better way
					const selTop = selected[0].getBoundingClientRect().top;
					const pageContent = selected[0].closest(".pagedjs_page_content");
					const pageContentTop = pageContent.getBoundingClientRect().top;

					if (selTop === pageContentTop) {
						varStart = varFirst;
					} else {
						varStart = stringPrevPage;
					}

					/* FIRST EXCEPT */

					varFirstExcept = "";
				}

				fragment.style.setProperty(`--pagedjs-string-first-${name}`, `"${cleanPseudoContent(varFirst)}`);
				fragment.style.setProperty(`--pagedjs-string-last-${name}`, `"${cleanPseudoContent(varLast)}`);
				fragment.style.setProperty(`--pagedjs-string-start-${name}`, `"${cleanPseudoContent(varStart)}`);
				fragment.style.setProperty(`--pagedjs-string-first-except-${name}`, `"${cleanPseudoContent(varFirstExcept)}`);
			}
		}
	}

	class TargetCounters extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;

			this.counterTargets = {};
		}

		onContent(funcNode, _fItem, _fList, _declaration, rule) {
			if (funcNode.name === "target-counter") {
				const selector = csstree.generate(rule.ruleNode.prelude);

				const first = funcNode.children.first();
				const func = first.name;

				const value = csstree.generate(funcNode);

				const args = [];

				first.children.forEach((child) => {
					if (child.type === "Identifier") {
						args.push(child.name);
					}
				});

				let counter;
				let style;
				let styleIdentifier;

				funcNode.children.forEach((child) => {
					if (child.type === "Identifier") {
						if (!counter) {
							counter = child.name;
						} else if (!style) {
							styleIdentifier = csstree.clone(child);
							style = child.name;
						}
					}
				});

				const variable = `target-counter-${UUID()}`;

				selector.split(",").forEach((s) => {
					this.counterTargets[s] = {
						func: func,
						args: args,
						value: value,
						counter: counter,
						style: style,
						selector: s,
						fullSelector: selector,
						variable: variable,
					};
				});

				// Replace with counter
				funcNode.name = "counter";
				funcNode.children = new csstree.List();
				funcNode.children.appendData({
					type: "Identifier",
					loc: 0,
					name: variable,
				});

				if (styleIdentifier) {
					funcNode.children.appendData({ type: "Operator", loc: null, value: "," });
					funcNode.children.appendData(styleIdentifier);
				}
			}
		}

		afterPageLayout(_fragment, _page, _breakToken, chunker) {
			Object.keys(this.counterTargets).forEach((name) => {
				const target = this.counterTargets[name];
				const split = target.selector.split(/::?/g);
				const query = split[0];

				const queried = chunker.pagesArea.querySelectorAll(`${query}:not([data-${target.variable}])`);

				queried.forEach((selected, _index) => {
					// TODO: handle func other than attr
					if (target.func !== "attr") {
						return;
					}
					const val = attr(selected, target.args);
					const element = chunker.pagesArea.querySelector(querySelectorEscape(val));

					if (element) {
						const selector = UUID();
						selected.setAttribute(`data-${target.variable}`, selector);
						// TODO: handle other counter types (by query)
						let pseudo = "";
						if (split.length > 1) {
							pseudo += `::${split[1]}`;
						}
						if (target.counter === "page") {
							const pages = chunker.pagesArea.querySelectorAll(".pagedjs_page");
							let pg = 0;
							for (let i = 0; i < pages.length; i++) {
								const page = pages[i];
								const styles = window.getComputedStyle(page);
								const reset = styles["counter-reset"].replace("page", "").trim();
								const increment = styles["counter-increment"].replace("page", "").trim();

								if (reset !== "none") {
									pg = Number.parseInt(reset, 10);
								}
								if (increment !== "none") {
									pg += Number.parseInt(increment, 10);
								}

								if (page.contains(element)) {
									break;
								}
							}
							this.styleSheet.insertRule(
								`[data-${target.variable}="${selector}"]${pseudo} { counter-reset: ${target.variable} ${pg}; }`,
								this.styleSheet.cssRules.length,
							);
						} else {
							const value = element.getAttribute(`data-counter-${target.counter}-value`);
							if (value) {
								this.styleSheet.insertRule(
									`[data-${target.variable}="${selector}"]${pseudo} { counter-reset: ${target.variable} ${target.variable} ${Number.parseInt(value, 10)}; }`,
									this.styleSheet.cssRules.length,
								);
							}
						}

						// force redraw
						const el = document.querySelector(`[data-${target.variable}="${selector}"]`);
						if (el) {
							el.style.display = "none";
							el.clientHeight;
							el.style.removeProperty("display");
						}
					}
				});
			});
		}
	}

	// import { nodeAfter } from "../../utils/dom";

	class TargetText extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);

			this.styleSheet = polisher.styleSheet;
			this.textTargets = {};
			this.beforeContent = "";
			this.afterContent = "";
			this.selector = {};
		}

		onContent(funcNode, _fItem, _fList, _declaration, rule) {
			if (funcNode.name === "target-text") {
				this.selector = csstree.generate(rule.ruleNode.prelude);
				const first = funcNode.children.first();
				const last = funcNode.children.last();
				const func = first.name;

				const value = csstree.generate(funcNode);

				const args = [];

				first.children.forEach((child) => {
					if (child.type === "Identifier") {
						args.push(child.name);
					}
				});

				let style;
				if (last !== first) {
					style = last.name;
				}

				const variable = `--pagedjs-${UUID()}`;

				this.selector.split(",").forEach((s) => {
					this.textTargets[s] = {
						func: func,
						args: args,
						value: value,
						style: style || "content",
						selector: s,
						fullSelector: this.selector,
						variable: variable,
					};
				});

				// Replace with variable
				funcNode.name = "var";
				funcNode.children = new csstree.List();
				funcNode.children.appendData({
					type: "Identifier",
					loc: 0,
					name: variable,
				});
			}
		}

		//   parse this on the ONCONTENT : get all before and after and replace the value with a variable
		onPseudoSelector(pseudoNode, _pItem, _pList, _selector, rule) {
			// console.log(pseudoNode);
			// console.log(rule);

			rule.ruleNode.block.children.forEach((properties) => {
				if (pseudoNode.name === "before" && properties.property === "content") {
					// let beforeVariable = "--pagedjs-" + UUID();

					const contenu = properties.value.children;
					contenu.forEach((prop) => {
						if (prop.type === "String") {
							this.beforeContent = prop.value;
						}
					});
				} else if (pseudoNode.name === "after" && properties.property === "content") {
					properties.value.children.forEach((prop) => {
						if (prop.type === "String") {
							this.afterContent = prop.value;
						}
					});
				}
			});
		}

		afterParsed(fragment) {
			Object.keys(this.textTargets).forEach((name) => {
				const target = this.textTargets[name];
				const split = target.selector.split("::");
				const query = split[0];
				const queried = fragment.querySelectorAll(query);
				let textContent;
				queried.forEach((selected, _index) => {
					const val = attr(selected, target.args);
					const element = fragment.querySelector(querySelectorEscape(val));
					if (element) {
						// content & first-letter & before & after refactorized
						if (target.style) {
							this.selector = UUID();
							selected.setAttribute("data-target-text", this.selector);

							let psuedo = "";
							if (split.length > 1) {
								psuedo += `::${split[1]}`;
							}

							if (target.style === "before" || target.style === "after") {
								const pseudoType = `${target.style}Content`;
								textContent = cleanPseudoContent(this[pseudoType]);
							} else {
								textContent = cleanPseudoContent(element.textContent, " ");
							}
							textContent = target.style === "first-letter" ? textContent.charAt(0) : textContent;
							this.styleSheet.insertRule(
								`[data-target-text="${this.selector}"]${psuedo} { ${target.variable}: "${textContent}" }`,
							);
						} else {
							console.warn("missed target", val);
						}
					}
				});
			});
		}
	}

	var generatedContentHandlers = [RunningHeaders, StringSets, TargetCounters, TargetText];

	class WhiteSpaceFilter extends Handler {
		filter(content) {
			filterTree(
				content,
				(node) => {
					return this.filterEmpty(node);
				},
				NodeFilter.SHOW_TEXT,
			);
		}

		filterEmpty(node) {
			if (node.textContent.length > 1 && isIgnorable(node)) {
				// Do not touch the content if text is pre-formatted
				const parent = node.parentNode;
				const pre = isElement(parent) && parent.closest("pre");
				if (pre) {
					return NodeFilter.FILTER_REJECT;
				}

				const previousSibling = previousSignificantNode(node);
				const nextSibling = nextSignificantNode(node);

				if (nextSibling === null && previousSibling === null) {
					// we should not remove a Node that does not have any siblings.
					node.textContent = " ";
					return NodeFilter.FILTER_REJECT;
				}
				if (nextSibling === null) {
					// we can safely remove this node
					return NodeFilter.FILTER_ACCEPT;
				}
				if (previousSibling === null) {
					// we can safely remove this node
					return NodeFilter.FILTER_ACCEPT;
				}

				// replace the content with a single space
				node.textContent = " ";

				// TODO: we also need to preserve sequences of white spaces when the parent has "white-space" rule:
				// pre
				// Sequences of white space are preserved. Lines are only broken at newline characters in the source and at <br> elements.
				//
				// pre-wrap
				// Sequences of white space are preserved. Lines are broken at newline characters, at <br>, and as necessary to fill line boxes.
				//
				// pre-line
				// Sequences of white space are collapsed. Lines are broken at newline characters, at <br>, and as necessary to fill line boxes.
				//
				// break-spaces
				// The behavior is identical to that of pre-wrap, except that:
				// - Any sequence of preserved white space always takes up space, including at the end of the line.
				// - A line breaking opportunity exists after every preserved white space character, including between white space characters.
				// - Such preserved spaces take up space and do not hang, and thus affect the box’s intrinsic sizes (min-content size and max-content size).
				//
				// See: https://developer.mozilla.org/en-US/docs/Web/CSS/white-space#Values

				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_REJECT;
		}
	}

	class CommentsFilter extends Handler {
		filter(content) {
			filterTree(content, null, NodeFilter.SHOW_COMMENT);
		}
	}

	class ScriptsFilter extends Handler {
		filter(content) {
			content.querySelectorAll("script").forEach((script) => {
				script.remove();
			});
		}
	}

	var clearCut = {};

	/**
	 * Originally ported from https://github.com/keeganstreet/specificity/blob/866bf7ab4e7f62a7179c15b13a95af4e1c7b1afa/specificity.js
	 *
	 * Calculates the specificity of CSS selectors
	 * http://www.w3.org/TR/css3-selectors/#specificity
	 *
	 * Returns a selector integer value
	 */

	((exports) => {
		// The following regular expressions assume that selectors matching the preceding regular expressions have been removed
		var attributeRegex = /(\[[^\]]+\])/g;
		var idRegex = /(#[^\s+>~.[:]+)/g;
		var classRegex = /(\.[^\s+>~.[:]+)/g;
		var pseudoElementRegex = /(::[^\s+>~.[:]+|:first-line|:first-letter|:before|:after)/g;
		var pseudoClassRegex = /(:[^\s+>~.[:]+)/g;
		var elementRegex = /([^\s+>~.[:]+)/g;
		var notRegex = /:not\(([^)]*)\)/g;
		var ruleRegex = /\{[^]*/gm;
		var separatorRegex = /[*\s+>~]/g;
		var straysRegex = /[#.]/g;

		// Find matches for a regular expression in a string and push their details to parts
		// Type is "a" for IDs, "b" for classes, attributes and pseudo-classes and "c" for elements and pseudo-elements
		var findMatch = (regex, type, types, selector) => {
			var matches = selector.match(regex);
			if (matches) {
				for (var i = 0; i < matches.length; i++) {
					types[type]++;
					// Replace this simple selector with whitespace so it won't be counted in further simple selectors
					selector = selector.replace(matches[i], " ");
				}
			}

			return selector;
		};

		// Calculate the specificity for a selector by dividing it into simple selectors and counting them
		var calculate = (selector) => {
			var commaIndex = selector.indexOf(",");
			if (commaIndex !== -1) {
				selector = selector.substring(0, commaIndex);
			}

			var types = {
				a: 0,
				b: 0,
				c: 0,
			};

			// Remove the negation psuedo-class (:not) but leave its argument because specificity is calculated on its argument
			selector = selector.replace(notRegex, " $1 ");

			// Remove anything after a left brace in case a user has pasted in a rule, not just a selector
			selector = selector.replace(ruleRegex, " ");

			// Add attribute selectors to parts collection (type b)
			selector = findMatch(attributeRegex, "b", types, selector);

			// Add ID selectors to parts collection (type a)
			selector = findMatch(idRegex, "a", types, selector);

			// Add class selectors to parts collection (type b)
			selector = findMatch(classRegex, "b", types, selector);

			// Add pseudo-element selectors to parts collection (type c)
			selector = findMatch(pseudoElementRegex, "c", types, selector);

			// Add pseudo-class selectors to parts collection (type b)
			selector = findMatch(pseudoClassRegex, "b", types, selector);

			// Remove universal selector and separator characters
			selector = selector.replace(separatorRegex, " ");

			// Remove any stray dots or hashes which aren't attached to words
			// These may be present if the user is live-editing this selector
			selector = selector.replace(straysRegex, " ");

			// The only things left should be element selectors (type c)
			findMatch(elementRegex, "c", types, selector);

			return types.a * 100 + types.b * 10 + types.c * 1;
		};

		var specificityCache = {};

		exports.calculateSpecificity = (selector) => {
			var specificity = specificityCache[selector];
			if (specificity === undefined) {
				specificity = calculate(selector);
				specificityCache[selector] = specificity;
			}
			return specificity;
		};

		var validSelectorCache = {};
		var testSelectorElement = null;

		exports.isSelectorValid = (selector) => {
			var valid = validSelectorCache[selector];
			if (valid === undefined) {
				if (testSelectorElement == null) {
					testSelectorElement = document.createElement("div");
				}

				try {
					testSelectorElement.querySelector(selector);
					valid = true;
				} catch (_error) {
					valid = false;
				}
				validSelectorCache[selector] = valid;
			}
			return valid;
		};

		exports.validateSelector = (selector) => {
			if (!exports.isSelectorValid(selector)) {
				var error = new SyntaxError(`${selector} is not a valid selector`);
				error.code = "EBADSELECTOR";
				throw error;
			}
		};
	})(clearCut);

	class UndisplayedFilter extends Handler {
		constructor(chunker, polisher, caller) {
			super(chunker, polisher, caller);
			this.displayRules = {};
		}

		onDeclaration(declaration, _dItem, _dList, rule) {
			if (declaration.property === "display") {
				const selector = csstree.generate(rule.ruleNode.prelude);
				const value = declaration.value.children.first().name;

				selector.split(",").forEach((s) => {
					this.displayRules[s] = {
						value: value,
						selector: s,
						specificity: clearCut.calculateSpecificity(s),
						important: declaration.important,
					};
				});
			}
		}

		filter(content) {
			const { matches, selectors } = this.sortDisplayedSelectors(content, this.displayRules);

			// Find matching elements that have display styles
			for (let i = 0; i < matches.length; i++) {
				const element = matches[i];
				const selector = selectors[i];
				const displayValue = selector[selector.length - 1].value;
				if (this.removable(element) && displayValue === "none") {
					element.dataset.undisplayed = "undisplayed";
				}
			}

			// Find elements that have inline styles
			const styledElements = content.querySelectorAll("[style]");
			for (let i = 0; i < styledElements.length; i++) {
				const element = styledElements[i];
				if (this.removable(element)) {
					element.dataset.undisplayed = "undisplayed";
				}
			}
		}

		sorter(a, b) {
			if (a.important && !b.important) {
				return 1;
			}

			if (b.important && !a.important) {
				return -1;
			}

			return a.specificity - b.specificity;
		}

		sortDisplayedSelectors(content, displayRules = []) {
			const matches = [];
			const selectors = [];
			for (const d in displayRules) {
				const displayItem = displayRules[d];
				const selector = displayItem.selector;
				let query = [];
				try {
					try {
						query = content.querySelectorAll(selector);
					} catch (_e) {
						query = content.querySelectorAll(cleanSelector(selector));
					}
				} catch (_e) {
					query = [];
				}
				const elements = Array.from(query);
				for (const e of elements) {
					if (matches.includes(e)) {
						const index = matches.indexOf(e);
						selectors[index].push(displayItem);
						selectors[index] = selectors[index].sort(this.sorter);
					} else {
						matches.push(e);
						selectors.push([displayItem]);
					}
				}
			}

			return { matches, selectors };
		}

		removable(element) {
			if (element.style && element.style.display !== "" && element.style.display !== "none") {
				return false;
			}

			return true;
		}
	}

	var filters = [WhiteSpaceFilter, CommentsFilter, ScriptsFilter, UndisplayedFilter];

	var isImplemented$3 = () => {
		var from = Array.from;
		var arr;
		var result;
		if (typeof from !== "function") return false;
		arr = ["raz", "dwa"];
		result = from(arr);
		return Boolean(result && result !== arr && result[1] === "dwa");
	};

	var isImplemented$2;
	var hasRequiredIsImplemented;

	function requireIsImplemented() {
		if (hasRequiredIsImplemented) return isImplemented$2;
		hasRequiredIsImplemented = 1;

		var validTypes = { object: true, symbol: true };

		isImplemented$2 = () => {
			var symbol;
			if (typeof Symbol !== "function") return false;
			symbol = Symbol("test symbol");
			try {
				String(symbol);
			} catch (_e) {
				return false;
			}

			// Return 'true' also for polyfills
			if (!validTypes[typeof Symbol.iterator]) return false;
			if (!validTypes[typeof Symbol.toPrimitive]) return false;
			if (!validTypes[typeof Symbol.toStringTag]) return false;

			return true;
		};
		return isImplemented$2;
	}

	var isSymbol;
	var hasRequiredIsSymbol;

	function requireIsSymbol() {
		if (hasRequiredIsSymbol) return isSymbol;
		hasRequiredIsSymbol = 1;

		isSymbol = (x) => {
			if (!x) return false;
			if (typeof x === "symbol") return true;
			if (!x.constructor) return false;
			if (x.constructor.name !== "Symbol") return false;
			return x[x.constructor.toStringTag] === "Symbol";
		};
		return isSymbol;
	}

	var validateSymbol;
	var hasRequiredValidateSymbol;

	function requireValidateSymbol() {
		if (hasRequiredValidateSymbol) return validateSymbol;
		hasRequiredValidateSymbol = 1;

		var isSymbol = requireIsSymbol();

		validateSymbol = (value) => {
			if (!isSymbol(value)) throw new TypeError(`${value} is not a symbol`);
			return value;
		};
		return validateSymbol;
	}

	var polyfill;
	var hasRequiredPolyfill;

	function requirePolyfill() {
		if (hasRequiredPolyfill) return polyfill;
		hasRequiredPolyfill = 1;

		var d = dExports;
		var validateSymbol = requireValidateSymbol();
		var create = Object.create;
		var defineProperties = Object.defineProperties;
		var defineProperty = Object.defineProperty;
		var objPrototype = Object.prototype;
		var NativeSymbol;
		var SymbolPolyfill;
		var HiddenSymbol;
		var globalSymbols = create(null);
		var isNativeSafe;

		if (typeof Symbol === "function") {
			NativeSymbol = Symbol;
			try {
				String(NativeSymbol());
				isNativeSafe = true;
			} catch (_ignore) {}
		}

		var generateName = (() => {
			var created = create(null);
			return (desc) => {
				var postfix = 0;
				var name;
				var ie11BugWorkaround;
				while (created[desc + (postfix || "")]) ++postfix;
				desc += postfix || "";
				created[desc] = true;
				name = `@@${desc}`;
				defineProperty(
					objPrototype,
					name,
					d.gs(null, function (value) {
						// For IE11 issue see:
						// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
						//    ie11-broken-getters-on-dom-objects
						// https://github.com/medikoo/es6-symbol/issues/12
						if (ie11BugWorkaround) return;
						ie11BugWorkaround = true;
						defineProperty(this, name, d(value));
						ie11BugWorkaround = false;
					}),
				);
				return name;
			};
		})();

		// Internal constructor (not one exposed) for creating Symbol instances.
		// This one is used to ensure that `someSymbol instanceof Symbol` always return false
		HiddenSymbol = function Symbol(description) {
			if (this instanceof HiddenSymbol) throw new TypeError("Symbol is not a constructor");
			return SymbolPolyfill(description);
		};

		// Exposed `Symbol` constructor
		// (returns instances of HiddenSymbol)
		polyfill = SymbolPolyfill = function Symbol(description) {
			var symbol;
			if (this instanceof Symbol) throw new TypeError("Symbol is not a constructor");
			if (isNativeSafe) return NativeSymbol(description);
			symbol = create(HiddenSymbol.prototype);
			description = description === undefined ? "" : String(description);
			return defineProperties(symbol, {
				__description__: d("", description),
				__name__: d("", generateName(description)),
			});
		};
		defineProperties(SymbolPolyfill, {
			for: d((key) => {
				if (globalSymbols[key]) return globalSymbols[key];
				return (globalSymbols[key] = SymbolPolyfill(String(key)));
			}),
			keyFor: d((s) => {
				var key;
				validateSymbol(s);
				for (key in globalSymbols) if (globalSymbols[key] === s) return key;
			}),

			// To ensure proper interoperability with other native functions (e.g. Array.from)
			// fallback to eventual native implementation of given symbol
			hasInstance: d("", NativeSymbol?.hasInstance || SymbolPolyfill("hasInstance")),
			isConcatSpreadable: d("", NativeSymbol?.isConcatSpreadable || SymbolPolyfill("isConcatSpreadable")),
			iterator: d("", NativeSymbol?.iterator || SymbolPolyfill("iterator")),
			match: d("", NativeSymbol?.match || SymbolPolyfill("match")),
			replace: d("", NativeSymbol?.replace || SymbolPolyfill("replace")),
			search: d("", NativeSymbol?.search || SymbolPolyfill("search")),
			species: d("", NativeSymbol?.species || SymbolPolyfill("species")),
			split: d("", NativeSymbol?.split || SymbolPolyfill("split")),
			toPrimitive: d("", NativeSymbol?.toPrimitive || SymbolPolyfill("toPrimitive")),
			toStringTag: d("", NativeSymbol?.toStringTag || SymbolPolyfill("toStringTag")),
			unscopables: d("", NativeSymbol?.unscopables || SymbolPolyfill("unscopables")),
		});

		// Internal tweaks for real symbol producer
		defineProperties(HiddenSymbol.prototype, {
			constructor: d(SymbolPolyfill),
			toString: d("", function () {
				return this.__name__;
			}),
		});

		// Proper implementation of methods exposed on Symbol.prototype
		// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
		defineProperties(SymbolPolyfill.prototype, {
			toString: d(function () {
				return `Symbol (${validateSymbol(this).__description__})`;
			}),
			valueOf: d(function () {
				return validateSymbol(this);
			}),
		});
		defineProperty(
			SymbolPolyfill.prototype,
			SymbolPolyfill.toPrimitive,
			d("", function () {
				var symbol = validateSymbol(this);
				if (typeof symbol === "symbol") return symbol;
				return symbol.toString();
			}),
		);
		defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d("c", "Symbol"));

		// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
		defineProperty(
			HiddenSymbol.prototype,
			SymbolPolyfill.toStringTag,
			d("c", SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]),
		);

		// Note: It's important to define `toPrimitive` as last one, as some implementations
		// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
		// And that may invoke error in definition flow:
		// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
		defineProperty(
			HiddenSymbol.prototype,
			SymbolPolyfill.toPrimitive,
			d("c", SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]),
		);
		return polyfill;
	}

	var es6Symbol;
	var hasRequiredEs6Symbol;

	function requireEs6Symbol() {
		if (hasRequiredEs6Symbol) return es6Symbol;
		hasRequiredEs6Symbol = 1;

		es6Symbol = requireIsImplemented()() ? Symbol : requirePolyfill();
		return es6Symbol;
	}

	var isArguments;
	var hasRequiredIsArguments;

	function requireIsArguments() {
		if (hasRequiredIsArguments) return isArguments;
		hasRequiredIsArguments = 1;

		var objToString = Object.prototype.toString;
		var id = objToString.call(
			(function () {
				return arguments;
			})(),
		);

		isArguments = (value) => objToString.call(value) === id;
		return isArguments;
	}

	var isFunction;
	var hasRequiredIsFunction;

	function requireIsFunction() {
		if (hasRequiredIsFunction) return isFunction;
		hasRequiredIsFunction = 1;

		var objToString = Object.prototype.toString;
		var id = objToString.call(noop$4);

		isFunction = (value) => typeof value === "function" && objToString.call(value) === id;
		return isFunction;
	}

	var isImplemented$1 = () => {
		var sign = Math.sign;
		if (typeof sign !== "function") return false;
		return sign(10) === 1 && sign(-20) === -1;
	};

	var shim$2;
	var hasRequiredShim$2;

	function requireShim$2() {
		if (hasRequiredShim$2) return shim$2;
		hasRequiredShim$2 = 1;

		shim$2 = (value) => {
			value = Number(value);
			if (Number.isNaN(value) || value === 0) return value;
			return value > 0 ? 1 : -1;
		};
		return shim$2;
	}

	var sign$1 = isImplemented$1() ? Math.sign : requireShim$2();

	var sign = sign$1;
	var abs$1 = Math.abs;
	var floor$1 = Math.floor;

	var toInteger$1 = (value) => {
		if (Number.isNaN(value)) return 0;
		value = Number(value);
		if (value === 0 || !Number.isFinite(value)) return value;
		return sign(value) * floor$1(abs$1(value));
	};

	var toInteger = toInteger$1;
	var max = Math.max;

	var toPosInteger = (value) => max(0, toInteger(value));

	var isString;
	var hasRequiredIsString;

	function requireIsString() {
		if (hasRequiredIsString) return isString;
		hasRequiredIsString = 1;

		var objToString = Object.prototype.toString;
		var id = objToString.call("");

		isString = (value) =>
			typeof value === "string" ||
			(value && typeof value === "object" && (value instanceof String || objToString.call(value) === id)) ||
			false;
		return isString;
	}

	var shim$1;
	var hasRequiredShim$1;

	function requireShim$1() {
		if (hasRequiredShim$1) return shim$1;
		hasRequiredShim$1 = 1;

		var iteratorSymbol = requireEs6Symbol().iterator;
		var isArguments = requireIsArguments();
		var isFunction = requireIsFunction();
		var toPosInt = toPosInteger;
		var callable = validCallable;
		var validValue$1 = validValue;
		var isValue = isValue$3;
		var isString = requireIsString();
		var isArray = Array.isArray;
		var call = Function.prototype.call;
		var desc = { configurable: true, enumerable: true, writable: true, value: null };
		var defineProperty = Object.defineProperty;

		// eslint-disable-next-line complexity
		shim$1 = function (arrayLike /*, mapFn, thisArg*/) {
			var mapFn = arguments[1];
			var thisArg = arguments[2];

			var i;
			var j;
			var arr;
			var length;
			var code;
			var iterator;
			var result;
			var getIterator;
			var value;

			arrayLike = Object(validValue$1(arrayLike));

			if (isValue(mapFn)) callable(mapFn);
			if (!this || this === Array || !isFunction(this)) {
				// Result: Plain array
				if (!mapFn) {
					if (isArguments(arrayLike)) {
						// Source: Arguments
						length = arrayLike.length;
						if (length !== 1) return Array.apply(null, arrayLike);
						arr = new Array(1);
						arr[0] = arrayLike[0];
						return arr;
					}
					if (isArray(arrayLike)) {
						// Source: Array
						arr = new Array((length = arrayLike.length));
						for (i = 0; i < length; ++i) arr[i] = arrayLike[i];
						return arr;
					}
				}
				arr = [];
			} else {
			}

			if (!isArray(arrayLike)) {
				if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
					// Source: Iterator
					iterator = callable(getIterator).call(arrayLike);
					if (this) arr = new this();
					result = iterator.next();
					i = 0;
					while (!result.done) {
						value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
						if (this) {
							desc.value = value;
							defineProperty(arr, i, desc);
						} else {
							arr[i] = value;
						}
						result = iterator.next();
						++i;
					}
					length = i;
				} else if (isString(arrayLike)) {
					// Source: String
					length = arrayLike.length;
					if (this) arr = new this();
					for (i = 0, j = 0; i < length; ++i) {
						value = arrayLike[i];
						if (i + 1 < length) {
							code = value.charCodeAt(0);
							// eslint-disable-next-line max-depth
							if (code >= 0xd800 && code <= 0xdbff) value += arrayLike[++i];
						}
						value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
						if (this) {
							desc.value = value;
							defineProperty(arr, j, desc);
						} else {
							arr[j] = value;
						}
						++j;
					}
					length = j;
				}
			}
			if (length === undefined) {
				// Source: array or array-like
				length = toPosInt(arrayLike.length);
				if (this) arr = new this(length);
				for (i = 0; i < length; ++i) {
					value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
					if (this) {
						desc.value = value;
						defineProperty(arr, i, desc);
					} else {
						arr[i] = value;
					}
				}
			}
			if (this) {
				desc.value = null;
				arr.length = length;
			}
			return arr;
		};
		return shim$1;
	}

	var from = isImplemented$3() ? Array.from : requireShim$1();

	var isImplemented = () => {
		var numberIsNaN = Number.isNaN;
		if (typeof numberIsNaN !== "function") return false;
		return !numberIsNaN({}) && numberIsNaN(Number.NaN) && !numberIsNaN(34);
	};

	var shim;
	var hasRequiredShim;

	function requireShim() {
		if (hasRequiredShim) return shim;
		hasRequiredShim = 1;

		shim = (value) => {
			// eslint-disable-next-line no-self-compare
			return value !== value;
		};
		return shim;
	}

	var isNan = isImplemented() ? Number.isNaN : requireShim();

	var numberIsNaN = isNan;
	var toPosInt = toPosInteger;
	var value$1 = validValue;
	var indexOf$1 = Array.prototype.indexOf;
	var objHasOwnProperty = Object.prototype.hasOwnProperty;
	var abs = Math.abs;
	var floor = Math.floor;

	var eIndexOf = function (searchElement /*, fromIndex*/) {
		var i;
		var length;
		var fromIndex;
		var val;
		if (!numberIsNaN(searchElement)) return indexOf$1.apply(this, arguments);

		length = toPosInt(value$1(this).length);
		fromIndex = arguments[1];
		if (Number.isNaN(fromIndex)) fromIndex = 0;
		else if (fromIndex >= 0) fromIndex = floor(fromIndex);
		else fromIndex = toPosInt(this.length) - floor(abs(fromIndex));

		for (i = fromIndex; i < length; ++i) {
			if (objHasOwnProperty.call(this, i)) {
				val = this[i];
				if (numberIsNaN(val)) return i; // Jslint: ignore
			}
		}
		return -1;
	};

	var indexOf = eIndexOf;
	var forEach = Array.prototype.forEach;
	var splice = Array.prototype.splice;

	// eslint-disable-next-line no-unused-vars
	var remove$1 = function (_itemToRemove /*, …item*/) {
		forEach.call(
			arguments,
			function (item) {
				var index = indexOf.call(this, item);
				if (index !== -1) splice.call(this, index, 1);
			},
			this,
		);
	};

	var isValue = isValue$3;

	var map = { function: true, object: true };

	var isObject$1 = (value) => (isValue(value) && map[typeof value]) || false;

	var isObject = isObject$1;

	var validObject = (value) => {
		if (!isObject(value)) throw new TypeError(`${value} is not an Object`);
		return value;
	};

	var aFrom = from;
	var remove = remove$1;
	var value = validObject;
	var d = dExports;
	var emit = eventEmitterExports.methods.emit;
	var defineProperty = Object.defineProperty;
	var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

	var pipe = function (e1, e2 /*, name*/) {
		var pipes;
		var pipe;
		var desc;
		var name;

		value(e1) && value(e2);
		name = arguments[2];
		if (name === undefined) name = "emit";

		pipe = {
			close: () => {
				remove.call(pipes, e2);
			},
		};
		if (hasOwnProperty$1.call(e1, "__eePipes__")) {
			(pipes = e1.__eePipes__).push(e2);
			return pipe;
		}
		defineProperty(e1, "__eePipes__", d("c", (pipes = [e2])));
		desc = getOwnPropertyDescriptor(e1, name);
		if (!desc) {
			desc = d("c", undefined);
		} else {
			delete desc.get;
			delete desc.set;
		}
		desc.value = function () {
			var i;
			var emitter;
			var data = aFrom(pipes);
			emit.apply(this, arguments);
			for (i = 0; (emitter = data[i]); ++i) emit.apply(emitter, arguments);
		};
		defineProperty(e1, name, desc);
		return pipe;
	};

	var pipe$1 = /*@__PURE__*/ getDefaultExportFromCjs(pipe);

	const registeredHandlers = [...pagedMediaHandlers, ...generatedContentHandlers, ...filters];

	class Handlers {
		constructor(chunker, polisher, caller) {
			registeredHandlers.forEach((Handler) => {
				const handler = new Handler(chunker, polisher, caller);
				pipe$1(handler, this);
			});
		}
	}

	EventEmitter(Handlers.prototype);

	function registerHandlers() {
		for (var i = 0; i < arguments.length; i++) {
			registeredHandlers.push(arguments[i]);
		}
	}

	function initializeHandlers(chunker, polisher, caller) {
		const handlers = new Handlers(chunker, polisher, caller);
		return handlers;
	}

	class Previewer {
		constructor(options) {
			// this.preview = this.getParams("preview") !== "false";

			this.settings = options || {};

			// Process styles
			this.polisher = new Polisher(false);

			// Chunk contents
			this.chunker = new Chunker(undefined, undefined, this.settings);

			// Hooks
			this.hooks = {};
			this.hooks.beforePreview = new Hook(this);
			this.hooks.afterPreview = new Hook(this);

			// default size
			this.size = {
				width: {
					value: 8.5,
					unit: "in",
				},
				height: {
					value: 11,
					unit: "in",
				},
				format: undefined,
				orientation: undefined,
			};

			this.chunker.on("page", (page) => {
				this.emit("page", page);
			});

			this.chunker.on("rendering", () => {
				this.emit("rendering", this.chunker);
			});
		}

		initializeHandlers() {
			const handlers = initializeHandlers(this.chunker, this.polisher, this);

			handlers.on("size", (size) => {
				this.size = size;
				this.emit("size", size);
			});

			handlers.on("atpages", (pages) => {
				this.atpages = pages;
				this.emit("atpages", pages);
			});

			return handlers;
		}

		registerHandlers() {
			return registerHandlers.apply(registerHandlers, arguments);
		}

		getParams(name) {
			let param;
			const url = new URL(window.location);
			const params = new URLSearchParams(url.search);
			for (var pair of params.entries()) {
				if (pair[0] === name) {
					param = pair[1];
				}
			}

			return param;
		}

		wrapContent() {
			// Wrap body in template tag
			const body = document.querySelector("body");

			// Check if a template exists
			let template;
			template = body.querySelector(":scope > template[data-ref='pagedjs-content']");

			if (!template) {
				// Otherwise create one
				template = document.createElement("template");
				template.dataset.ref = "pagedjs-content";
				template.innerHTML = body.innerHTML;
				body.innerHTML = "";
				body.appendChild(template);
			}

			return template.content;
		}

		removeStyles(doc = document) {
			// Get all stylesheets
			const stylesheets = Array.from(
				doc.querySelectorAll("link[rel='stylesheet']:not([data-pagedjs-ignore], [media~='screen'])"),
			);
			// Get inline styles
			const inlineStyles = Array.from(
				doc.querySelectorAll("style:not([data-pagedjs-inserted-styles], [data-pagedjs-ignore], [media~='screen'])"),
			);
			const elements = [...stylesheets, ...inlineStyles];
			return (
				elements
					// preserve order
					.sort((element1, element2) => {
						const position = element1.compareDocumentPosition(element2);
						if (position === Node.DOCUMENT_POSITION_PRECEDING) {
							return 1;
						}
						if (position === Node.DOCUMENT_POSITION_FOLLOWING) {
							return -1;
						}
						return 0;
					})
					// extract the href
					.map((element) => {
						if (element.nodeName === "STYLE") {
							const obj = {};
							obj[window.location.href] = element.textContent;
							element.remove();
							return obj;
						}
						if (element.nodeName === "LINK") {
							element.remove();
							return element.href;
						}
						// ignore
						console.warn(`Unable to process: ${element}, ignoring.`);
					})
			);
		}

		async preview(content, stylesheets, renderTo) {
			await this.hooks.beforePreview.trigger(content, renderTo);

			if (!content) {
				content = this.wrapContent();
			}

			if (!stylesheets) {
				stylesheets = this.removeStyles();
			}

			this.polisher.setup();

			this.handlers = this.initializeHandlers();

			await this.polisher.add(...stylesheets);

			const startTime = performance.now();

			// Render flow
			const flow = await this.chunker.flow(content, renderTo);

			const endTime = performance.now();

			flow.performance = endTime - startTime;
			flow.size = this.size;

			this.emit("rendered", flow);

			await this.hooks.afterPreview.trigger(flow.pages);

			return flow;
		}
	}

	EventEmitter(Previewer.prototype);

	var Paged = /*#__PURE__*/ Object.freeze({
		__proto__: null,
		Chunker: Chunker,
		Handler: Handler,
		Polisher: Polisher,
		Previewer: Previewer,
		initializeHandlers: initializeHandlers,
		registerHandlers: registerHandlers,
		registeredHandlers: registeredHandlers,
	});

	window.Paged = Paged;

	const ready = new Promise((resolve, _reject) => {
		if (document.readyState === "interactive" || document.readyState === "complete") {
			resolve(document.readyState);
			return;
		}

		document.onreadystatechange = (_$) => {
			if (document.readyState === "interactive") {
				resolve(document.readyState);
			}
		};
	});

	const config = window.PagedConfig || {
		auto: true,
		before: undefined,
		after: undefined,
		content: undefined,
		stylesheets: undefined,
		renderTo: undefined,
		settings: undefined,
	};

	const previewer = new Previewer(config.settings);

	ready.then(async () => {
		let done;
		if (config.before) {
			await config.before();
		}

		if (config.auto !== false) {
			done = await previewer.preview(config.content, config.stylesheets, config.renderTo);
		}

		if (config.after) {
			await config.after(done);
		}
	});

	return previewer;
});
