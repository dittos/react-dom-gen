// Perf hack. See https://github.com/facebook/react/issues/812
process.env = Object.assign({}, process.env);

const express = require('express');

const React = require('react');
const ReactDOMStream = require('react-dom-stream/server');

const RecursiveDivs = require('./RecursiveDivs');

var app = express();

app.get('/', (req, res) => {
  var {depth = 1, breadth = 1} = req.query;
  const element = React.createElement(RecursiveDivs, { depth, breadth });

  ReactDOMStream.renderToString(element).pipe(res);
});

app.get('/quit', (req, res) => {
  res.end();
  process.exit();
});

var server = app.listen(9001, () => {
  var host = server.address().address || "localhost";
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
