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
	return this.client(
		y().click(function(e) {
			if (e.preventDefault())
				e.preventDefault();
			this.navigateTo(href, title, data);
		})
	);
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
			context.onAgora('route:update', function(route, title, state) {
				this.set('$route', route);
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
		// dom output
		dom: function(context, container, args) {
			var parentRouter,
				currentRoute,
				oldRoute,
				current,
				resumed = false,
				skipMounted = true,
				fakeNode = y.utils.hide(context.env.data.factory.createElement('div')),
				restTemplate = new y.Template(self._queue.slice(index));

			container.appendChild(fakeNode);
			current = fakeNode;
			context.isRouted = true;

			var exec = function($route, type) {
				if (!container.mountPoint || $route === oldRoute)
					return;
				oldRoute = $route;
				var matched = route.match(route.lastMatched ? ($route.lastMatched || $route) : $route);
				if (matched) {
					$route.lastMatched = matched;
					if (handler)
						handler.call(context, matched);
					context.set('$route', matched);
					if (!resumed) {
						var mp = container.mountPoint;
						container.mountPoint = null;
						restTemplate.call(container, context);
						restTemplate = null;
						resumed = true;
						container.mountPoint = mp;
					}
					if (current === container)
						return;
					current = container;
					var nextSibling = y.utils.findNextSibling(fakeNode);
					container.removeChild(fakeNode);
					container.childNodes.forEach(function(child) {
						y.utils.insertBefore(container.mountPoint, child, nextSibling);
					});
					if (!skipMounted)
						container.emit('mounted', context);
					skipMounted = false;
				} else {
					if (current === fakeNode)
						return;
					current = fakeNode;
					container.appendChild(fakeNode);
					container.childNodes.forEach(function(child) {
						if (child !== fakeNode) {
							if (child.__yPureNode__)
								y.utils.unmountPureNode(child);
							else if (child.parentNode)
								child.parentNode.removeChild(child);
						}
					});
					container.emit('unmounted', context);
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
		string: function(context, descriptor, args) {

		},

		// twopass output
		twopass: {
			firstPass: function(context, args) {

			},
			secondPass: function(context, descriptor, args) {

			}
		}
	}, null, false, true);
};

module.exports = router;
