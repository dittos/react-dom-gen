const Benchmark = require('benchmark');
const React = require('react');

const suite = new Benchmark.Suite;

var ReactDOMServer;
var ReactDOMGen;

function Deep(props) {
	if (props.depth === 0)
		return React.createElement('div');

	return React.createElement('div', null, React.createElement(Deep, {depth: props.depth - 1}));
}

function Div() {
	return React.createElement('div');
}

function Wide(props) {
	var children = [];
	for (var i = 0; i < props.count; i++)
		children.push(React.createElement(Div, null, {key: i}));
	return React.createElement('div', null, children);
}

global.require = require;
global.deepElement = React.createElement(Deep, {depth: 100});
global.wideElement = React.createElement(Wide, {count: 100});

suite
.add('ReactDOMServer deep', () => {
	return ReactDOMServer.renderToString(deepElement);
}, {
	setup: function() {
		ReactDOMServer = require('react-dom/server');
	}
})
.add('ReactDOMServer wide', () => {
	return ReactDOMServer.renderToString(wideElement);
}, {
	setup: function() {
		ReactDOMServer = require('react-dom/server');
	}
})
.add('ReactDOMGen deep', () => {
	return ReactDOMGen.renderToString(deepElement);
}, {
	setup: function() {
		ReactDOMGen = require('../src');
	}
})
.add('ReactDOMGen wide', () => {
	return ReactDOMGen.renderToString(wideElement);
}, {
	setup: function() {
		ReactDOMGen = require('../src');
	}
})
.on('error', function(err) {
	console.trace(err);
})
.on('cycle', function(event) {
	console.log(String(event.target));
})
.run();