# yamvish-router

In-place routing plugin for [yamvish](https://github.com/nomocas/yamvish).

## install

As it comes as an CommonJS module usable with browserify by example, simply install it with npm in your project folder, where you have previously installed yamvish.
```
npm i yamvish-router --save
```

## Route DSL

It uses [routedsl](https://github.com/nomocas/routedsl) to manag matching.

## Example 

__Require__ : Browser side, it uses history pushState/popState by default and so you should load a polyfills for IE8/IE9 (as [min-history](https://github.com/nomocas/min-history))

```javascript
var y = require('yamvish');
require('yamvish-router');

var view = new y.View()
// bind this view to root router
.rootRouter()
.div(
	y().route('/$')
	.p('home content')
)
.div(
	y().route('/hello')
	.p('hello page content')
	.div(
		y().route('./world')
		.p('hello/world content')
	)
)
// mount view somewhere
.mount('#anID');
```

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2015 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

