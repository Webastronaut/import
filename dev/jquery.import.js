/** Dependency loading plugin based on basket.js and rsvp.js
 *
 * @param {Array} modules - Array of modules to be loaded
 * @param {Boolean} setStatus - Wether to set the loading status in the related body attributes or not
 * @param {Number} timeout - Custom loading timeout
 *
 * @return {object} - Promise
 *
 */
;(function($) {
	$.import = function(modules, setStatus, timeout) {
		var _ = {
				loading: 0,
				lengthLoading: 0,
				loaded: 0,
				$body: $('body'),
				$doc: $(document),
				promise: $.Deferred(),
				viewport: window.innerHeight
			};

		/** Recursively loads all dependencies and fires the callback
		 * when all dependencies have been loaded
		 *
		 * @param {Object} module
		 */
 		_.getDependencies = function(module) {
			var $that = $(),
				basketOptions = {},
				promise,
				eventData;

			// all modules loaded?
			if(module.fetch.length === 0) {
				// do we have a jquery object?
				if(module.condition.jquery) {
					$that = module.condition;
				}

				// fire the callback(s) and assign this to it
				if(module.callback) {
					for (var i = 0, len = module.callback.length; i < len; i += 1) {
						if(module.callback[i].method) {
							// do we have params for the method call?
							if (module.callback[i].param) {
								module.callback[i].method.call($that, module.callback[i].param);
							} else {
								module.callback[i].method.call($that);
							}
						}
					}
				}

				// fire custom event(s) when module is available
				if(module.event && module.event.length) {
					for(var j = 0, lenEvt = module.event.length; j < lenEvt; j += 1) {
						// get data for event handler if data assigned
						eventData = module.event[j].data.slice() || [];

						_.$doc.trigger(module.event[j].name, eventData);
					}
				}

				if(!$that.is('body')) {
					$that.removeClass('on-loading');
				}

				_.$doc.trigger('on-module-loaded');
				_.loaded += 1;
				if(setStatus) {
					_.setStatus();
				}
				// remove loaded module from modules list
				modules.shift();
				_.loading -= 1;

				if(modules[0]) {
					_.getDependencies(modules[0]);
				}

				return;
			} else {
				// for the party people load it from the localstorage
				basketOptions.url = module.fetch[0];

				if(module.unique) {
					basketOptions.unique = module.unique;
				}

				promise = basket.require(basketOptions);

				// store the loaded dependency reference for possible lookups
				if($.inArray(module.fetch[0], window.loadedDependencies) < 0) {
					window.loadedDependencies.push(module.fetch[0]);
				}
			}

			// Load the next dependency
			promise.then(function() {
				module.fetch.shift();

				_.getDependencies(module);
			}, function() {
				// uh oh, an error occured while loading (silence is golden)
				_.$doc.trigger('on-loading-error');
			});
		};

		/** Checks if the modules' condition is true
		 *
		 * @param module
		 * @returns {Boolean}
		 */
		_.checkExistence = function (module) {
			var moduleExists = false;

			if(module.condition === undefined) {
				return false;
			}

			if(module.condition.jquery) {
				moduleExists = module.condition.length !== 0;
			} else {
				moduleExists = module.condition;
			}

			return moduleExists;
		};

		/** Sets the loading order of the module based on its offset from the top
		 * of the viewport. If the modules' condition is a boolean the order will be set
		 * to the lowest priority
		 *
		 * @param {Object} module
		 * @returns {Object} - Promise
		 */
		_.setOrder = function(module) {
			var promise = $.Deferred();

			if(module.condition.jquery) {
				module.order = Math.floor(module.condition.offset().top);
			} else {
				module.order = _.viewport;
			}
			promise.resolve(module);

			return promise.promise();
		};

		/** Checks the condition of all modules
		 * Falsy conditions will be removed from the loading list
		 *
		 * @returns {Object} - Promise
		 */
		_.rejectMissingModules = function () {
			var promise = $.Deferred(),
				newModules = [];

			for(var i = 0, len = modules.length; i < len; i += 1) {
				console.log('module exists', _.checkExistence(modules[i]));
				if(_.checkExistence(modules[i])) {
					_.setOrder(modules[i]).then(function (module) {
						newModules.push( module );
					});
				}

				if(i === len - 1) {
					promise.resolve();
				}
			}

			modules = newModules;

			return promise.promise();
		};

		/** Sorts all modules by order property
		 *
		 * @returns {Object} - Promise
		 */
		_.sortModules = function () {
			var promise = $.Deferred();

			modules.sort(function(a, b) {
				return a.order - b.order;
			});

			promise.resolve();

			return promise.promise();
		};

		/** Sets the loading status by adding classes and attributes to the body element
		 *
		 */
		_.setStatus = function () {
			var temp,
				// get loading status
				status = Math.floor(_.loaded * 100 / _.lengthLoading);

			// we only want percent in tens steps
			if(status > 10 && status < 100) {
				status = '' + status;
				temp = status.split('');

				if(temp[1] <= 5) {
					temp[1] = 0;
				} else {
					temp[0] = parseInt(temp[0], 10) + 1;
					temp[1] = 0;
				}

				status = temp.join('');
			} else if (status > 0 && status <= 10) {
				status = 10;
			}

			// set initial and all following loading states
			_.$body
				.attr({
					'data-status': status,
					'data-loading': _.lengthLoading,
					'data-loaded': _.loaded
				})[0]
				.className = _.$body[0].className
					.replace(/on-loading-(\d){1,3}/g, 'on-loading-' + status);

			// set final loading state and fire event when done
			setTimeout(function() {
				if(parseInt(status, 10) === 100) {
					_.$body
						.removeClass('on-loading')[0]
						.className = _.$body[0].className
							.replace('on-loading-100', 'on-loading-done');

					_.$doc.trigger('on-loading-done');
					_.promise.resolve();

					setTimeout(function() {
						_.$body
							.removeClass('on-loading-done')
							.addClass('on-loading-complete');
					}, 600);
				}
			}, 500);
		};

		/** Self explanatory
		 *
		 */
		_.setLoadingValues = function () {
			_.loading = modules.length;
			_.lengthLoading = modules.length;
			_.loaded = 0;

			_.$body.addClass('on-loading on-loading-0').attr({
				'data-loading': _.lengthLoading,
				'data-loaded': _.loaded
			});
		};

		/** Initialize the module loading
		 *
		 */
		_.load = function () {
			if(setStatus) {
				_.setLoadingValues();
				_.setStatus();
			}
			_.getDependencies(modules[0]);
		};

		/** Constructor
		 *
		 */
		_.init = function () {
			var sortingDone;

			if(!window.loadedDependencies) {
				// storage for loaded dependencies
				window.loadedDependencies = [];
			}

			if(timeout) {
				basket.timeout = timeout;
			}

			sortingDone = _.rejectMissingModules().then(_.sortModules);
			sortingDone.then(_.load);
		};

		_.init();

		return _.promise.promise();
	};
})(jQuery);