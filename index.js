/**  @author Gilles Coomans <gilles.coomans@gmail.com> */
(function() {
	'use strict';
	var Route = require('routedsl'),
		y = require('yamvish');

	var router = y.router = {
		Route: Route,
	};

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

	function getParentRouter(node) {
		if (node.parentNode)
			if (node.parentNode._route)
				return node.parentNode;
			else
				return getParentRouter(node.parentNode);
	}

	function removeChildRouter(arr, node) {
		for (var i = 0, len = arr.length; i < len; ++i)
			if (arr[i] === node)
				return arr.splice(i, 1);
	}

	function bindToParentRouter(node, parent, dontExecRoute) {
		var _route = node._route;
		parent = parent ||  getParentRouter(node);
		if (!parent)
			throw new Error('yamvish-router : no parent found to bind current route.');
		if (_route.parent !== parent) {
			if (_route.unbind) {
				_route.unbind();
				_route.unbind = null;
			}
			_route.parent = parent;
			(parent._route.subrouters = parent._route.subrouters || []).push(node);
			_route.unbind = function() {
				removeChildRouter(parent._route.subrouters, node);
				_route.parent = null;
			};
		}
		// console.log('bindToParentRouter : parent : ', parent);
		if (!dontExecRoute && parent._route.descriptor) {
			// console.log('bindToParentRouter : parent has descriptor : executing route : ', parent._route.descriptor);
			executeNodeRouting(node, parent._route.descriptor);
		}
		return parent;
	}

	router.bindToParentRouter = bindToParentRouter;

	function checkSubrouters(subrouters, descriptor, lastIndex, children) {
		subrouters.forEach(function(sub) {
			var res = checkRoute(sub, descriptor, lastIndex);
			if (res) {
				lastIndex = Math.max(res.lastIndex, lastIndex);
				children.push(res);
			}
		});
		return lastIndex;
	}

	// execute route checking for a single node. return associated descriptor.
	// if route is array of route : use automatically checkRouteMap
	// else check Route
	function checkRoute(node, url, lastIndex) {
		var _route = node._route;
		if (_route.route && _route.route.forEach)
			return checkRouteMap(node, url, lastIndex);
		lastIndex = lastIndex || 0;
		var children = [],
			descriptor = _route.route ? _route.route.match(url) : url;
		if (descriptor) {
			lastIndex = Math.max(lastIndex, descriptor.index);
			if (_route.subrouters) // check children
				lastIndex = checkSubrouters(_route.subrouters, descriptor, lastIndex, children);
		}
		return {
			lastIndex: lastIndex,
			node: node,
			descriptor: descriptor,
			children: children
		};
	}

	// check route map of a router node. return associated descriptor containing resource to load when matched.
	function checkRouteMap(node, url, lastIndex) {
		lastIndex = lastIndex || 0;
		var children = [],
			matched,
			descriptor;

		node._route.route.some(function(item) {
			descriptor = item.route.match(url);
			if (descriptor)
				return matched = item;
		});
		var output = {
			node: node,
			children: children
		}
		if (descriptor) {
			lastIndex = Math.max(lastIndex, descriptor.index);
			if (node._route.subrouters)
				lastIndex = checkSubrouters(node._route.subrouters, descriptor, lastIndex, children);
			output.item = matched;
			output.descriptor = descriptor;
		}
		output.lastIndex = lastIndex;
		return output;
	}

	function applyContent(templ, node, _route, context) {
		if (_route.current) {
			if (_route.current._route && _route.current._route.unbind)
				_route.current._route.unbind();
			if (_route.current.unmount)
				_route.current.unmount();
		}
		var r;
		if (templ.__yContainer__)
			r = templ.mount(node);
		else if (templ.__yTemplate__)
			r = templ.toContainer(context).mount(node);
		else if (typeof templ === 'string') {
			node.innerHTML = templ;
			r = node.childNodes[0];
		}
		_route.current = r;
		if (!r._route)
			r._route = {
				subrouters: []
			};
		bindToParentRouter(r, node);
		if (_route.once) {
			_route.once.call(r, context, _route.container);
			_route.once = null;
		}
		if (_route.success)
			_route.success.call(r, context, _route.container);
		// console.log('after apply content : ', r._route);
		r.dispatchEvent(y.env().isServer ? 'routed' : new Event('routed'));
		return r;
	}

	function getRoutedContent(node, _route, item, $route) {
		if (!router.get)
			throw new Error('yamvish router has no get for retrieving resource. please bind one before use.');
		if (item.instance && !item.resource.__interpolable__) {
			applyContent(item.instance, node, _route, item.context);
		} else {
			var resource = item.resource.__interpolable__ ? item.resource.output(item.context) : item.resource;
			if (typeof resource !== 'string')
				item.instance = applyContent(resource, node, _route, item.context);
			else {
				var p = router.get(resource)
					.then(function(templ) {
						item.instance = applyContent(templ, node, _route, item.context);
					}, function(e) {
						console.error('resource fail to load : ', item.resource, e);
					});
				item.context.waiting(p);
			}
		}
	}

	function walkRouteTree(treeNode) {
		// console.log('walkRouteTree : ', treeNode);
		var node = treeNode.node,
			_route = node._route,
			item = treeNode.item,
			descriptor = treeNode.descriptor,
			context = node.context || _route.context,
			env = y.env();
		if (descriptor) {
			_route.descriptor = descriptor;
			// console.log('walkTree : ', _route, node, descriptor.route.slice(0, descriptor.index));
			var $route = {
				__local: '/' + descriptor.route.slice(0, descriptor.index).join('/')
			};
			for (var i in descriptor.output)
				$route[i] = descriptor.output[i];
			if (item) {
				// console.log('walkTree has item : ', item);
				if (!item.context)
					item.context = new y.Context({
						parent: context
					});
				if (!item.context.data.$route || item.context.data.$route.__local !== $route.__local)
					item.context.set('$route', $route);
				if (!item.instance || _route.current !== item.instance || item.resource.__interpolable__)
					getRoutedContent(node, _route, item, $route);
				else {
					if (_route.success)
						_route.success.call(node, item.context, _route.container);
					item.instance.dispatchEvent(env.isServer ? 'routed' : new Event('routed'));
				}
			} else if (context) {
				context.delay(function() {}, 0);
				// console.log('walkTree NO item : ', node);
				if (!context.data.$route || context.data.$route.__local !== $route.__local)
					context.set('$route', $route);
				if (_route.once) {
					_route.once.call(node, context, _route.container);
					_route.once = null;
				}
				if (_route.success)
					_route.success.call(node, context, _route.container);
				node.dispatchEvent(env.isServer ? 'routed' : new Event('routed'));
			}
			y.utils.show(node);
			treeNode.children.forEach(function(child) {
				walkRouteTree(child);
			});
		} else {
			_route.descriptor = null;
			if (_route.fail)
				_route.fail.call(node, context, _route.container);
			y.utils.hide(node);
		}
	}

	function executeNodeRouting(node, url) {
		var r = checkRoute(node, url, 0);
		if (r) {
			walkRouteTree(r);
			if (r.descriptor)
				return true;
		}
		return false;
	}

	function executeRouting(url, routes) {
		var ok = false;
		try {
			url = parseURL(url);
			(routes || y.env()._route.subrouters).forEach(function(router) {
				var r = executeNodeRouting(router, url);
				if (r)
					ok = true;
			});
			if (!ok)
				console.error('route not match : ', url);
		} catch (e) {
			console.log('error on routing : ', e, e.stack);
		}
	}

	y.Template.prototype.rootRouter = y.View.prototype.rootRouter = function() {
		return this.exec(function(context, container) {
			this._route = this._route ||  {
				subrouters: []
			};
			router.init(y.env());
			bindToParentRouter(this, y.env());
		}, true);
	};

	y.Template.prototype.route = y.View.prototype.route = function(route, once, success, fail) {
		if (typeof route === 'string')
			route = new Route(route); // parse single Route
		else {
			// parse route map.
			var routes = [];
			for (var i in route)
				routes.push({
					route: new Route(i),
					resource: y.interpolable(route[i])
				});
			route = routes;
		}
		return this.exec(function(context, container) {
			// console.log('Template.route application : ', original, this);
			y.utils.hide(this);
			this._route = {
				route: route,
				context: context,
				container: container,
				once: once,
				success: success,
				fail: fail,
				subrouters: this._route ? this._route.subrouters : []
			};

			if (this._route.route.forEach) // shallow copy route map (needed to store local vars after)
			{
				this._route.route = this._route.route.map(function(item) {
					return y.utils.shallowCopy(item);
				});
			}

			if (container && container !== this) { // bind to current container if any
				container._route = container._route || {
					subrouters: []
				};
				bindToParentRouter(this, container);
			} else if (!bindToParentRouter(this)) // try to bind to parent node that hold a _route entry
				console.warn('yamvish route has not be attached to parent router. will never fire.', route);
		}, true);
	};

	y.navigateTo = function(url, title, state) {
		var env = y.env();
		executeRouting(url, env._route.subrouters);
		if (!env.isServer && url !== (location.pathname + location.search))
			window.history.pushState(state, title  || '', url);
	};

	y.Template.prototype.linkA = function(title, state) {
		return this.click(function(e) {
			if (e && e.preventDefault())
				e.preventDefault();
			y.navigateTo(e.target.getAttribute('href'), title, state);
		});
	};

	router.execute = executeRouting;

	router.init = function(env) {
		if (env._route)
			return;

		env._route = {
			subrouters: [],
			descriptor: {
				index: 0,
				route: []
			}
		};

		if (!env.isServer) {
			env._route.descriptor.route = parseURL(location.pathname + (location.serch || '')).route;
			// popstate event from back/forward in browser
			window.addEventListener('popstate', function(e) {
				// console.log('pop state : ', location.pathname + (location.serch || ''));
				executeRouting(location.pathname + (location.serch || ''), env._route.subrouters);
			});
		}
	};

	module.exports = router;
})();
