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

var React = require('react');
var ReactDOMContainerInfo = require('react-dom/lib/ReactDOMContainerInfo');
var ReactDefaultBatchingStrategy = require('react-dom/lib/ReactDefaultBatchingStrategy');
var ReactInstrumentation = require('react-dom/lib/ReactInstrumentation');
var ReactMarkupChecksum = require('./ReactMarkupChecksum');
var ReactReconciler = require('react-dom/lib/ReactReconciler');
var ReactServerBatchingStrategy = require('react-dom/lib/ReactServerBatchingStrategy');
var ReactServerRenderingTransaction =
  require('./ReactServer2RenderingTransaction');
var ReactUpdates = require('react-dom/lib/ReactUpdates');

var emptyObject = require('fbjs/lib/emptyObject');
var instantiateReactComponent = require('react-dom/lib/instantiateReactComponent');
var invariant = require('fbjs/lib/invariant');

var pendingTransactions = 0;

/**
 * @param {ReactElement} element
 * @return {string} the HTML markup
 */
function renderToStringImpl(element, makeStaticMarkup) {
  var transaction;
  try {
    ReactUpdates.injection.injectBatchingStrategy(ReactServerBatchingStrategy);

    transaction = ReactServerRenderingTransaction.getPooled(makeStaticMarkup);

    pendingTransactions++;

    return transaction.perform(function() {
      var componentInstance = instantiateReactComponent(element, true);
      var markup = ReactReconciler.mountComponent(
        componentInstance,
        transaction,
        null,
        ReactDOMContainerInfo(),
        emptyObject,
        0 /* parentDebugID */
      );
      if (process.env.NODE_ENV !== 'production') {
        ReactInstrumentation.debugTool.onUnmountComponent(
          componentInstance._debugID
        );
      }
      markup = transaction.serverBuffer.flush();
      if (!makeStaticMarkup) {
        markup = ReactMarkupChecksum.addChecksumToMarkup(markup);
      }
      return markup;
    }, null);
  } finally {
    pendingTransactions--;
    ReactServerRenderingTransaction.release(transaction);
    // Revert to the DOM batching strategy since these two renderers
    // currently share these stateful modules.
    if (!pendingTransactions) {
      ReactUpdates.injection.injectBatchingStrategy(
        ReactDefaultBatchingStrategy
      );
    }
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
