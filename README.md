import.js
=========

Dependency loader plugin (only 3KB). Loads plugin dependencies (JS/CSS), stores them into the local storage and a lot more. A refactored and extended version of [loadmodule.js](https://github.com/Webastronaut/loadmodule). This plugin uses a customized version of the awesome [basket.js](https://github.com/addyosmani/basket.js) from Addy Osmani.

Support: IE9+

## Why another dependency loader?

Most of the frontend modules I develop consist of styles, javascript plugins and or custom scripts and related DOM elements. What I needed was a dependency loader checking the existence of a module in the DOM or if a given condition like touch events is true or not and loading the dependecies when and only when the given condition is true. That's pretty much it.

Think of it as the spine of your web application. Please read on to get an idea what import.js is capable of and what you can achieve with it.

## TBD

- remove jqQery dependency -> DONE
- code review -> DONE
- tests
- performance optimizations

## Get started

First include ```basket.full.custom.min.js``` and ``import.min.js``` to your template.

```HTML
<script src="dist/basket.full.custom.min.js"></script>
<script src="dist/import.min.js"></script>
```

Then proceed to use import.js to lazily load the needed modules dependencies.

```JavaScript
// ATTENTION: jQuery is not required!
$(function() {

	var loading = window.import([
		{
			condition: 'body',
			fetch: [
				'some/dep/path/styles.css',
				'some/dep/path/script.js'
			],
			callback: [
				{ method: myMethod, param: 'foo' },
				{ method: anotherMethod, param: { text: 'bar' } },
				{ method: toImportOrNotToImport }
			],
			unique: 0
		},
		{
			condition: window.innerWidth <= 480,
			fetch: [
				'some/other/dep/path.js'
			],
			event: [
				{ name: 'my-custom-event', data: ['someStringParam', 'anotherStringParam'] },
				{ name: 'another-custom-event', data: { hello: 'world' } }
			],
			unique: new Date().getTime()
		}
	], true, 60000);
	
	loading.then(function() {
		alert('Hooray, everything loaded');
	});
});
```

To see import.js in action clone this repo install the node_modules and type grunt sync on your console to see the example.

Be careful with cross site requests, in other words avoid them. Some browser have problems with that and with some browser I mean IE.

## How does it work

The main part of the whole thing is the sorting of the modules. 

1. Check if the condition is true. If it's false, the module will be deleted from the stack
2. If it's a DOM Element get the top offset and use this value for sorting
3. Sort the modules by their top offset. Boolean values have the lowest priority
4. Load

## Documentation

### Parameters

| Order | Type      | Description                                                  |
|-------|-----------|--------------------------------------------------------------|
| 1     | {Array}   | Array of module objects to be loaded                         |
| 2     | {Boolean} | Wether the loading status should be set (to the body) or not |
| 3     | {Number}  | The loading timeout in milliseconds (Default: 5000ms)        |

### Options

| Name      | Type            | Description                                                                                               |
|-----------|-----------------|-----------------------------------------------------------------------------------------------------------|
| condition | {*}             | The main entry point for import.js. If this condition is true, the dependencies will be loaded.           |
| fetch     | {Array}         | An array of file references to be loaded. Allowed are CSS and JS files.                                   |
| event     | {Array}         | A list of custom events and related parameters to be fired, when the module dependencies have been loaded. NOTE: If you're using jQuery for eventlisteners you'll find the event data within the originalEvent object |
| callback  | {Array}         | A list of callbacks to be called, when the module has been loaded                                         |
| unique    | {Number/String} | If this value changes the modules' dependecies will be refetched from the server                                                                                               |

### Thrown events

| Eventname        | Description/Occurance                                                          |
|------------------|--------------------------------------------------------------------------------|
| on-module-loaded | Is triggered after each loaded module                                          |
| on-loading-done  | Is triggered when all modules have been loaded successfully                    |
| on-loading-error | Will be triggered when a dependecy could not be loaded for some kind of reason |

### Classes set to the body and other DOM elements

| Classname                                       | Description                                                         |
|-------------------------------------------------|---------------------------------------------------------------------|
| on-loading                                      | The initial loading state                                           |
| on-loading-0, on-loading-10, on-loading-20, ... | The state of the loading in tens steps                              |
| on-loading-done                                 | Will be attached to body when all modules have been loaded          |
| on-loading-complete                             | Will be attached to the body when the whole loading process is done |

## LICENCE

The code is available under MIT Licence, so do whatever you want to do with it.
