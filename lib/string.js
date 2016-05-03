var y = require('yamvish'),
	engine = require('yamvish/lib/output-engine/string'),
	utils = require('./utils');
engine.route = function(context, descriptor, args) {
	var index = args[0],
		baseTemplate = args[1],
		route = args[2],
		handler = args[3];
	var parentRouter,
		currentRoute,
		restTemplate = new y.Template(baseTemplate._queue.slice(index));
	parentRouter = utils.findParentRouter(context);
	if (parentRouter)
		currentRoute = parentRouter.data.$route;
	if (!currentRoute)
		return;
	var matched = route.match(route.lastMatched ? (currentRoute.lastMatched || currentRoute) : currentRoute);
	if (matched) {
		currentRoute.lastMatched = matched;
		if (handler)
			handler.call(context, matched);
		context.set('$route', matched);
		restTemplate.toHTMLString(context, descriptor);
	}
};
module.exports = require('../index');
