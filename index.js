var y = require('yamvish'),
	Route = require('routedsl'),
	utils = require('./lib/utils');

y.Template.prototype.route = function(route, handler) {
	return this.exec('route', [this._queue.length + 1, this, new Route(route), handler], true);
};

y.Template.prototype.clickTo = function(href, title, data) {
	return this.dom(function(context, node) {
		node.addEventListener('click', function(e) {
			e.preventDefault();
			context.navigateTo(href || node.getAttribute('href'), title, data);
		});
	});
};

y.Template.prototype.aNav = function(href, title, content) {
	return this.a(href, y().clickTo(href, title), content);
};

y.Context.prototype.navigateTo = function(href, title, data) {
	// console.log('navigateTo', href, title, data)
	if (href !== router.current) {
		router.current = href;
		// update hash
		var route = utils.parseURL(href);
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
	parseURL: utils.parseURL,
	parser: function(route) {
		return new Route(route);
	},
	push: function(href, title, data) {
		throw new Error('router.push');
		if (this.current !== href) {
			window.history.pushState({
				href: href,
				title: title || '',
				data: data || {}
			}, title || '', href);
		}
		this.current = href;
	},
	bindHistory: function(context) {
		if (context.env.data.isServer)
			return;
		this.current = location.pathname + (location.search || '');
		var route = utils.parseURL(this.current);
		console.log('yamvish router : bind to history', route, this.current)
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
				console.log('router popstate : same url : so return');
				return;
			}
			self.current = newURL;
			var route = utils.parseURL(newURL);
			context.toAgora('route:update', route);
			document.title = e.state ? (e.state.title || '') : '';
		});
		// window.addEventListener('hashchange', function(e) {
		// 	console.log('hashchange : ', e);
		// });
	}
};



module.exports = router;
