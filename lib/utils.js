module.exports = {
	findParentRouter: function(context) {
		var parent = context.parent;
		if (!parent)
			return null;
		return parent && (parent.isRouted || parent.data.$route) ? parent : this.findParentRouter(parent);
	},
	parseURL: function(url) {
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
};
