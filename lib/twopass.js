var y = require('yamvish'),
	engine = require('yamvish/lib/output-engine/twopass'),
	utils = require('./utils');

engine.firstMethods.route = function(context, args, stack) {
	var index = args[0],
		baseTemplate = args[1],
		route = args[2],
		handler = args[3],
		parentRouter,
		currentRoute,
		matched,
		restTemplate = new y.Template(baseTemplate._queue.slice(index));

	context.isRouted = true;
	parentRouter = utils.findParentRouter(context);
	if (parentRouter)
		currentRoute = parentRouter.data.$route;

	var data = {
		matched: false,
		route: route,
		template: restTemplate,
		stack: []
	};

	stack.push(data);
	// console.log('route firstPass : ', route.original, context.id, context.firstPassObjects.length)
	if (currentRoute) {
		matched = route.match(currentRoute);
		if (matched) {
			data.matched = matched;
			if (handler)
				handler.call(context, matched);
			context.set('$route', matched);
			engine.firstPass(restTemplate, context, data.stack);
		}
	}
};

engine.secondMethods.route = function(context, descriptor, args, stack) {
	var data = stack.shift();
	if (data.matched)
		engine.secondPass(data.template, context, descriptor, data.stack);
};

module.exports = require('../index');
