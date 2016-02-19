var y = require('yamvish'),
	Route = require('routedsl');

function findParentRouter(context) {
	var parent = context.parent;
	if (!parent)
		return null;
	return parent && parent.isRouted ? parent : findParentRouter(parent);
}

function parseURL(url) {
	var route = url.split('/');
	if (route[0] === '')
		route.shift();
	if (route[route.length - 1] === '')
		route.pop();
	return {
		length: route.length,
		route: route,
		index: 0
	};
}

y.Template.prototype.clickTo = function(href, title, data) {
	return this.dom(function(context, node) {
		node.addEventListener('click', function(e) {
			e.preventDefault();
			context.navigateTo(href, title, data);
		});
	});
};

y.Template.prototype.aNav = function(href, title, content) {
	return this.a(href, y().clickTo(href, title), content);
};

y.Context.prototype.navigateTo = function(href, title, data) {
	if (href !== (location.pathname + location.search)) {
		this.toAgora('route:update', href, title || '', data);
		window.history.pushState({
			href: href,
			title: title,
			data: data
		}, title  || '', href);
		document.title = title || '';
	}
};

var router = y.router = {
	parser: function(route) {
		return new Route(route);
	},
	bindHistory: function(context) {
		if (!context.env.data.isServer) {
			var route = parseURL(location.pathname + (location.search || ''));
			context.isRouted = true;
			context.set('$route', route);
			context.onAgora('route:update', function(context, route, title, state) {
				context.set('$route', route);
			});
			// popstate event from back/forward in browser
			window.addEventListener('popstate', function(e) {
				var route = parseURL(location.pathname + (location.search || ''));
				context.toAgora('route:update', route);
				document.title = e.state ? (e.state.title || '') : '';
			});
		}
	}
};

y.View.prototype.route = function(route, handler) {
	var index = this._queue.length + 1,
		self = this,
		route = router.parser(route);
	return this.exec({
		dom: function(context, container) {
			var parentRouter,
				currentRoute,
				oldRoute,
				restTemplate = new y.Template(self._queue.slice(index));

			container.addWitness('router : ' + route.original);
			context.isRouted = true;

			var exec = function($route, type) {
				if ($route === oldRoute)
					return;
				oldRoute = $route;
				var matched = route.match(route.lastMatched ? ($route.lastMatched || $route) : $route);
				if (matched) {
					$route.lastMatched = matched;
					if (handler)
						handler.call(context, matched);
					context.set('$route', matched);
					if (restTemplate) { // not yet fully constructed
						restTemplate.call(container, context);
						restTemplate = null;
						if (container.parentNode)
							container.emit('mounted', container);
					}
					if (!container.witness.parentNode) // parent node has not been mounted
						return;
					if (container.parentNode) // is already mounted
					{
						if (container.closing && container.transitionIn)
							container.transitionIn();
						return;
					}
					container.remount();
				} else {
					if (!container.parentNode) // is not mounted
						return;
					container.unmount(true);
				}
			};
			parentRouter = findParentRouter(context);
			if (parentRouter) {
				container.binds = container.binds ||  [];
				parentRouter.subscribe('$route', exec, false, container.binds);
				currentRoute = parentRouter.data.$route;
			}
			container.on('mounted', function() {
				var currentRoute = parentRouter ? parentRouter.data.$route : null;
				if (currentRoute)
					exec(currentRoute, 'set');
			});

			if (currentRoute)
				exec(currentRoute, 'set');
		},
		// string output
		string: function(context, descriptor) {

		},
		// twopass output
		firstPass: function(context) {

		},
		secondPass: function(context, descriptor) {

		}
	}, null, true);
};

module.exports = router;
