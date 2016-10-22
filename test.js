var React = require('react');
var ReactDOMServer2 = require('./src');

console.log(ReactDOMServer2.renderToString(React.createElement('div', {style: {fontSize: 13}})));