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
	if (href !== router.current) {
		router.current = href;
		// update hash
		var route = parseURL(href);
		window.history.pushState({
			href: href,
			title: title ||  '',
			data: data || {}
		}, title  || '', href);
		document.title = title || '';
		this.toAgora('route:update', route);
	}
};


var router = y.router = {
	parseURL: parseURL,
	parser: function(route) {
		return new Route(route);
	},
	push: function(href, title, data) {
		// console.log('router . push ', href)
		if (this.current !== href) {
			window.history.pushState({
				href: href,
				title: title || '',
				data: data || {}
			}, title || '', href);
		}
		this.current = href;
		// var route = parseURL(this.current);
	},
	bindHistory: function(context) {
		if (!context.env.data.isServer) {
			this.current = location.pathname + (location.search || '');
			var route = parseURL(this.current);
			console.log('router bind to history', route, this.current)
			context.isRouted = true;
			var self = this;
			context.set('$route', route);
			router.oldRoute = route;
			context.onAgora('route:update', function(context, route) {
				router.oldRoute = context.data.$route;
				context.set('$route', route);
			});
			// popstate event from back/forward in browser

			window.addEventListener('popstate', function(e) {
				var newURL = location.pathname + (location.search || '');
				// console.log('pop state : ', e, newURL);
				if (newURL === self.current) {
					// console.log('same url : so return');
					return;
				}
				self.current = newURL;
				var route = parseURL(newURL);
				context.toAgora('route:update', route);
				document.title = e.state ? (e.state.title || '') : '';
			});
			// window.addEventListener('hashchange', function(e) {
			// 	console.log('hashchange : ', e);
			// });
		}
	}
};

y.Template.prototype.route = function(route, handler) {
	var index = this._queue.length + 1,
		self = this,
		route = router.parser(route);
	return this.exec({
		dom: function(context, container, args) {
			var parentRouter,
				currentRoute,
				oldRoute,
				restTemplate = new y.Template(self._queue.slice(index));

			container.addWitness('router : ' + route.original);
			context.isRouted = true;

			var exec = function($route) {
				if ($route === oldRoute)
					return;
				oldRoute = $route;
				var matched = route.match(route.lastMatched ? ($route.lastMatched || $route) : $route);
				if (matched) {
					$route.lastMatched = matched;
					if (handler)
						handler.call(context, matched, container);
					// var contextOldRoute = context.data.$route;
					context.set('$route', matched);
					if (restTemplate) { // not yet fully constructed
						restTemplate.call(container, context, container);
						restTemplate = null;
						if (container.parentNode)
							container.emit('mounted', container);
					}
					// if (!contextOldRoute || contextOldRoute.matched !== matched.matched)
					container.emit('routed', $route);
					if (!container.witness.parentNode) // parent node has not been mounted
						return;
					if (!container.parentNode)
						container.remount();
					// else is already mounted
					else if (container.closing && container.transitionIn)
						container.transitionIn();
				} else if (container.parentNode)
					container.unmount(true);
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
					exec(currentRoute);
			});

			if (currentRoute)
				exec(currentRoute);
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
