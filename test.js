var React = require('react');
var prgrsv = require('./src');

function C() {
	return null;
}

const el = React.createElement('div', {style: {fontSize: 13}}, 'a', React.createElement(C), 'b');
const stream = prgrsv.createRenderStream(el);

stream.on('end', () => {
	console.log('\nchecksum: ' + stream.checksum);
}).pipe(process.stdout);