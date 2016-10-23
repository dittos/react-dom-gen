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
var ReactMarkupChecksum = require('./checksum');

var React = require('react');
var ReactDOMContainerInfo = require('react-dom/lib/ReactDOMContainerInfo');
var ReactReconciler = require('react-dom/lib/ReactReconciler');
var ReactServerBatchingStrategy = require('react-dom/lib/ReactServerBatchingStrategy');
var ReactServerRenderingTransaction = require('react-dom/lib/ReactServerRenderingTransaction');
var ReactUpdates = require('react-dom/lib/ReactUpdates');

var emptyObject = require('fbjs/lib/emptyObject');
var instantiateReactComponent = require('react-dom/lib/instantiateReactComponent');
var invariant = require('fbjs/lib/invariant');

/**
 * @param {ReactElement} element
 * @return {string} the HTML markup
 */
function renderToStringImpl(element, makeStaticMarkup) {
  var transaction;
  try {
    transaction = ReactServerRenderingTransaction.getPooled(makeStaticMarkup);

    const mountImage = transaction.perform(function() {
      const componentInstance = instantiateReactComponent(element, true);
      return ReactReconciler.mountComponent(
        componentInstance,
        transaction,
        null,
        ReactDOMContainerInfo(),
        undefined,
        0 /* parentDebugID */
      );
    }, null);
    var markup = '';
    if (mountImage) {
      if (mountImage.next) {
        while (true) {
          const {value, done} = transaction.perform(() => mountImage.next());
          if (done) break;
          markup += value;
        }
      } else {
        markup = mountImage;
      }
    }
    if (!makeStaticMarkup) {
      markup = ReactMarkupChecksum.addChecksumToMarkup(markup);
    }
    return markup;
  } finally {
    ReactServerRenderingTransaction.release(transaction);
  }
}

/**
 * Render a ReactElement to its initial HTML. This should only be used on the
 * server.
 * See https://facebook.github.io/react/docs/top-level-api.html#reactdomserver.rendertostring
 */
function renderToString(element) {
  invariant(
    React.isValidElement(element),
    'renderToString(): You must pass a valid ReactElement.'
  );
  return renderToStringImpl(element, false);
}

/**
 * Similar to renderToString, except this doesn't create extra DOM attributes
 * such as data-react-id that React uses internally.
 * See https://facebook.github.io/react/docs/top-level-api.html#reactdomserver.rendertostaticmarkup
 */
function renderToStaticMarkup(element) {
  invariant(
    React.isValidElement(element),
    'renderToStaticMarkup(): You must pass a valid ReactElement.'
  );
  return renderToStringImpl(element, true);
}

module.exports = {
  renderToString: renderToString,
  renderToStaticMarkup: renderToStaticMarkup,
};
