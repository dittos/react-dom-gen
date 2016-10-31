/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactServer2Rendering
 */
'use strict';

require('./injection').inject();
var checksum = require('./checksum');

var React = require('react');
var ReactDOMContainerInfo = require('react-dom/lib/ReactDOMContainerInfo');
var ReactReconciler = require('react-dom/lib/ReactReconciler');
var ReactServerRenderingTransaction = require('react-dom/lib/ReactServerRenderingTransaction');

var emptyObject = require('fbjs/lib/emptyObject');
var instantiateReactComponent = require('react-dom/lib/instantiateReactComponent');
var invariant = require('fbjs/lib/invariant');
var stream = require('stream');

class ReactIterator {
  constructor(element, makeStaticMarkup) {
    this.transaction = new ReactServerRenderingTransaction(makeStaticMarkup);
    this.mountImage = this.transaction.perform(function() {
      const componentInstance = instantiateReactComponent(element, true);
      return ReactReconciler.mountComponent(
        componentInstance,
        this.transaction,
        null,
        ReactDOMContainerInfo(),
        emptyObject,
        0 /* parentDebugID */
      );
    }, this);
    this.done = !this.mountImage;
  }

  next() {
    if (this.done)
      return {done: true};

    if (!this.mountImage.next) {
      // single string, end of stream
      this.checksum = checksum(this.mountImage, this.checksum);
      this.done = true;
      return {value: this.mountImage, done: false};
    }

    const {value, done} = this.transaction.perform(this.mountImage.next, this.mountImage);
    if (!done)
      this.checksum = checksum(value, this.checksum);
    this.done = done;
    return {value, done: false};
  }
}

class ReactReadable extends stream.Readable {
  constructor(iterator) {
    super();
    this.iterator = iterator;
  }

  get checksum() {
    return this.iterator.checksum;
  }

  _read(size) {
    while (true) {
      const {value, done} = this.iterator.next();
      if (done) {
        this.push(null);
        break;
      }
      if (!this.push(value)) {
        // should stop push
        break;
      }
    }
  }
}

function readAll(stream) {
  var buf = [];
  while (true) {
    const {value, done} = stream.next();
    if (done)
      break;
    buf.push(value);
  }
  return buf.join('');
}

function renderToString(element) {
  if (!React.isValidElement(element)) {
    if (process.env.NODE_ENV !== 'production')
      invariant(false, 'renderToString(): You must pass a valid ReactElement.');
  }
  const stream = new ReactIterator(element, false);
  const markup = readAll(stream);
  return {
    markup,
    checksum: stream.checksum,
  };
}

function renderToStaticMarkup(element) {
  if (!React.isValidElement(element)) {
    if (process.env.NODE_ENV !== 'production')
      invariant(false, 'renderToStaticMarkup(): You must pass a valid ReactElement.');
  }
  const stream = new ReactIterator(element, true);
  return readAll(stream);
}

module.exports = {
  createRenderStream: element => new ReactReadable(new ReactIterator(element, false)),
  renderToString: renderToString,
  renderToStaticMarkup: renderToStaticMarkup,
};
