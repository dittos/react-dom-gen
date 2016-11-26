// Perf hack. See https://github.com/facebook/react/issues/812
process.env = Object.assign({}, process.env);

const express = require('express');

const React = require('react');
const ReactDOMServer = require('react-dom/server');

const RecursiveDivs = require('./RecursiveDivs');

var app = express();

app.get('/', (req, res) => {
  var {depth = 1, breadth = 1} = req.query;
  const element = React.createElement(RecursiveDivs, { depth, breadth });

  res.write(ReactDOMServer.renderToString(element));
  res.end();
});

app.get('/quit', (req, res) => {
  res.end();
  process.exit();
});

var server = app.listen(9000, () => {
  var host = server.address().address || "localhost";
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
