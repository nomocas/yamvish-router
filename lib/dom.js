var y = require('yamvish'),
	domEngine = require('yamvish/lib/output-engine/dom/engine'),
	utils = require('./utils');

domEngine.route = function(context, container, args) {
	var index = args[0],
		baseTemplate = args[1],
		route = args[2],
		handler = args[3];

	var parentRouter,
		currentRoute,
		oldRoute,
		restTemplate = new y.Template(baseTemplate._queue.slice(index));

	container.addWitness('router : ' + route.original);
	context.isRouted = true;

	var exec = function($route) {
		// console.log('router : exec ', $route)
		if ($route === oldRoute)
			return;
		oldRoute = $route;
		var matched = route.match(route.lastMatched ? ($route.lastMatched || $route) : $route);
		if (matched) {
			$route.lastMatched = matched;
			if (handler)
				handler.call(context, matched, container);
			context.set('$route', matched);
			if (restTemplate) { // not yet fully constructed
				restTemplate.toDOM(container, context, container);
				restTemplate = null;
				if (container.parentNode)
					container.emit('mounted', container);
			}
			container.emit('routed', matched);
			if (!container.witness.parentNode) // parent node has not been mounted
				return;
			if (!container.parentNode)
				container.remount();
			else if (container.closing && container.transitionIn) // already mounted
				container.transitionIn();
		} else if (container.parentNode)
			container.unmount(true);
	};

	parentRouter = utils.findParentRouter(context);
	if (parentRouter) {
		container.binds = container.binds ||  [];
		parentRouter.subscribe('$route', exec, true, container.binds);
		currentRoute = parentRouter.data.$route;
	}

	container.on('mounted', function() {
		var currentRoute = parentRouter ? parentRouter.data.$route : null;
		if (currentRoute)
			exec(currentRoute);
	});

	if (currentRoute)
		exec(currentRoute);
};

module.exports = require('../index');
