/*!
 * basket.js
 * v0.5.2 - 2015-02-07
 * http://addyosmani.github.com/basket.js
 * (c) Addy Osmani;  License
 * Created by: Addy Osmani, Sindre Sorhus, Andrée Hansson, Mat Scales
 * Contributors: Ironsjp, Mathias Bynens, Rick Waldron, Felipe Morais
 */
(function (window, document) {
	'use strict';

	var head = document.head || document.getElementsByTagName('head')[0],
		storagePrefix = 'basket-',
		defaultExpiration = 5000,
		inBasket = [];

	if(!window.loadedDependencies) {
		window.loadedDependencies = {};
	}

	var addLocalStorage = function (key, storeObj) {
		try {
			localStorage.setItem(storagePrefix + key, JSON.stringify(storeObj));
			return true;
		} catch (e) {
			if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
				var item;
				var tempScripts = [];

				for (item in localStorage) {
					if (item.indexOf(storagePrefix) === 0) {
						tempScripts.push(JSON.parse(localStorage[item]));
					}
				}

				if (tempScripts.length) {
					tempScripts.sort(function (a, b) {
						return a.stamp - b.stamp;
					});

					basket.remove(tempScripts[0].key);

					return addLocalStorage(key, storeObj);

				} else {
					// no files to remove. Larger than available quota
					return;
				}

			} else {
				// some other error
				return;
			}
		}

	};

	var getUrl = function (url) {
		var promise = new RSVP.Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest();

			xhr.open('GET', url);

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4) {
					if (( xhr.status === 200 ) ||
						( ( xhr.status === 0 ) && xhr.responseText )) {
						resolve({
							content: xhr.responseText,
							type: xhr.getResponseHeader('content-type')
						});
					} else {
						reject(new Error(xhr.statusText));
					}
				}
			};

			// By default XHRs never timeout, and even Chrome doesn't implement the
			// spec for xhr.timeout. So we do it ourselves.
			setTimeout(function () {
				if (xhr.readyState < 4) {
					xhr.abort();
				}
			}, basket.timeout);

			xhr.send();
		});

		return promise;
	};

	var saveUrl = function (obj) {
		return getUrl(obj.url).then(function (result) {
			var storeObj = wrapStoreData(obj, result);

			if (!obj.skipCache) {
				addLocalStorage(obj.key, storeObj);
			}

			return storeObj;
		});
	};

	var wrapStoreData = function (obj, data) {
		var now = +new Date();
		obj.data = data.content;
		obj.originalType = data.type;
		obj.type = obj.type || data.type;
		obj.skipCache = obj.skipCache || false;
		obj.stamp = now;
		obj.expire = now + ( ( obj.expire || defaultExpiration ) * 60 * 60 * 1000 );

		return obj;
	};

	var isCacheValid = function (source, obj) {
		return !source ||
			source.expire - +new Date() < 0 ||
			obj.unique !== source.unique ||
			(basket.isValidItem && !basket.isValidItem(source, obj));
	};

	var handleStackObject = function (obj) {
		var source, promise, shouldFetch;

		if (!obj.url) {
			return;
		}

		obj.key = ( obj.key || obj.url );

		source = basket.get(obj.key);

		obj.execute = obj.execute !== false;

		shouldFetch = isCacheValid(source, obj);

		if (obj.live || shouldFetch) {
			if (obj.unique) {
				// set parameter to prevent browser cache
				obj.url += ( ( obj.url.indexOf('?') > 0 ) ? '&' : '?' ) + 'basket-unique=' + obj.unique;
			}
			promise = saveUrl(obj);

			if (obj.live && !shouldFetch) {
				promise = promise
					.then(function (result) {
						// If we succeed, just return the value
						// RSVP doesn't have a .fail convenience method
						return result;
					}, function () {
						return source;
					});
			}
		} else {
			source.type = obj.type || source.originalType;
			source.execute = obj.execute;

			promise = new RSVP.Promise( function( resolve ){
				resolve( source );
			});
		}

		return promise;
	};

	var injectCode = function (obj, type) {
		var code;

		//console.log('loaded', window.loadedDependencies);
		//console.log('trying to inject', window.loadedDependencies[obj.key]);

		if(!window.loadedDependencies[obj.key]) {
			code = document.createElement(type);

			if (type === 'style') {
				code.setAttribute('type', 'text/css');
				code.textContent += obj.data;
			} else {
				// Have to use .text, since we support IE8,
				// which won't allow appending to a script
				code.text = obj.data;
			}

			code.defer = true;

			head.appendChild(code);
			//console.log('injected code of', obj.key);
			window.loadedDependencies[obj.key] = true;
		} else {
			//console.log('already injected code of', obj.key);
		}
	};

	var handlers = {
		'default': injectCode
	};

	var execute = function (obj) {
		var type = 'script';

		if (obj.originalType.indexOf('application/javascript') < 0 ) {
			type = 'style';
		}

		return handlers['default'](obj, type); // 'default' is a reserved word
	};

	var performActions = function (resources) {
		return resources.map(function (obj) {
			if (obj.execute) {
				execute(obj);
			}

			return obj;
		});
	};

	var fetch = function () {
		var i, l, promises = [];

		for (i = 0, l = arguments.length; i < l; i++) {
			promises.push(handleStackObject(arguments[i]));
		}

		return RSVP.all( promises );
	};

	var thenRequire = function () {
		var resources = fetch.apply(null, arguments),
			promise = this.then(function () {
				return resources;
			}).then(performActions);

		promise.thenRequire = thenRequire;

		return promise;
	};

	window.basket = {
		require: function () {
			for (var a = 0, l = arguments.length; a < l; a++) {
				arguments[a].execute = arguments[a].execute !== false;

				if (arguments[a].once && inBasket.indexOf(arguments[a].url) >= 0) {
					arguments[a].execute = false;
				} else if (arguments[a].execute !== false && inBasket.indexOf(arguments[a].url) < 0) {
					inBasket.push(arguments[a].url);
				}
			}
			var promise = fetch.apply(null, arguments).then(performActions);

			promise.thenRequire = thenRequire;

			return promise;
		},

		remove: function (key) {
			localStorage.removeItem(storagePrefix + key);

			return this;
		},

		get: function (key) {
			var item = localStorage.getItem(storagePrefix + key);

			try {
				return JSON.parse(item || 'false');
			} catch (e) {
				return false;
			}
		},

		clear: function (expired) {
			var item, key,
				now = +new Date();

			for (item in localStorage) {
				key = item.split(storagePrefix)[1];

				if (key && ( !expired || this.get(key).expire <= now )) {
					this.remove(key);
				}
			}

			return this;
		},

		isValidItem: null,

		timeout: 5000
	};

	// delete expired keys
	basket.clear(true);

})(this, document);