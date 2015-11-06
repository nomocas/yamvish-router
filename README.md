# yamvish-router

In-place routing plugin for [yamvish](https://github.com/nomocas/yamvish).

It uses [routedsl](https://github.com/nomocas/routedsl) to manage matching.


## install

As it comes as an CommonJS module usable with browserify by example, simply install it with npm in your project folder, where you have previously installed yamvish.
```
npm i yamvish-router --save
```

__Require__ : Browser side, it uses history pushState/popState by default and so you should also load a polyfills for IE8/IE9 (as [min-history](https://github.com/nomocas/min-history))

## Example with simple route

When you define a route on a node, it will be showned (style.display = '') only if route matchs.

```javascript
var y = require('yamvish');
require('yamvish-router');

var view = new y.View()
// bind this view to root router (i.e. that will respond to y.navigateTo)
.rootRouter()
.div(
	y().route('/$') // assign route to containing div
	.p('home content')
)
.div(
	y().route('/hello') // assign route to containing div
	.p('hello page content')
	.div(
		y().route('./world') // assign route to containing div
		.p('hello/world content')
	)
)
// mount view somewhere
.mount('#anID');

y.navigateTo('/hello/world');
```

## Example with simple route that catch variables

When a route catch some variables it injects them in curent context under '$route'.

```javascript
var y = require('yamvish');
require('yamvish-router');

var view = new y.View()
// bind this view to root router (i.e. that will respond to y.navigateTo)
.rootRouter()
.div(
	y().route('/$') // assign route to containing div
	.p('home content')
)
.div(
	y().route('/hello/s:page') // catched 'page' from route will be set in context.data.$route.page
	.p('content for {{ $route.page }}')
)
// mount view somewhere
.mount('#anID');

y.navigateTo('/hello/world');
```


## Example with map

```javascript
var y = require('yamvish');
require('yamvish-router');

var view = new y.View()
// bind this view to root router
.rootRouter()
.div(
	y().route({ // assign route to containing div. 

		// first route that match will inject associatd template in routed div

		'/$': y().p('home content'),

		'/hello': y().p('hello content')
					.div(
						y().route('./world') // assign route to containing div
						.p('hello/world content')
					)
	})	
)
// mount view somewhere
.mount('#anID');

y.navigateTo('/hello/world');
```

## Example with map and resource loading

__Require__ : you need to define a 'get' function in router before using with loadable resource

```javascript
var y = require('yamvish');
require('yamvish-router');

y.router.get = function(req, opt){
	return ...; // return a promise that will be fullfiled with loaded resource
};

var view = new y.View()
// bind this view to root router
.rootRouter()
.div(
	y().route({
	
		'/$': 'some/resource/home.html'

		'/hello': 'some/resource/hello.html'
	})	
)
// mount view somewhere
.mount('#anID');

y.navigateTo('/');
```


## Route-map and context

Each route from a route-map has its own context where catched variables will be injected if any.
All those context are independents.

```javascript
var y = require('yamvish');
require('yamvish-router');

var view = new y.View()
.rootRouter()
.div(
	y().route({

		'/$': y().p('home content'),

		'/hello/?s:page': y().p('hello content for {{ page || 'foo' }}'),

		'/campaign/?s:page': y().p('campaign content for {{ page || 'bar' }}')
				
	})	
)
// mount view somewhere
.mount('#anID');

y.navigateTo('/hello/world');
```

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2015 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

