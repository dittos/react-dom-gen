/**
 * Copyright 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactServer2RenderingTransaction
 */

'use strict';

var PooledClass = require('react-dom/lib/PooledClass');
var Transaction = require('react-dom/lib/Transaction');
var ReactInstrumentation = require('react-dom/lib/ReactInstrumentation');
var ReactServerUpdateQueue = require('react-dom/lib/ReactServerUpdateQueue');


/**
 * Executed within the scope of the `Transaction` instance. Consider these as
 * being member methods, but with an implied ordering while being isolated from
 * each other.
 */
var TRANSACTION_WRAPPERS = [];

if (process.env.NODE_ENV !== 'production') {
  TRANSACTION_WRAPPERS.push({
    initialize: ReactInstrumentation.debugTool.onBeginFlush,
    close: ReactInstrumentation.debugTool.onEndFlush,
  });
}

var noopCallbackQueue = {
  enqueue: function() {},
};

/**
 * @class ReactServerRenderingTransaction
 * @param {boolean} renderToStaticMarkup
 */
function ReactServer2RenderingTransaction(renderToStaticMarkup) {
  this.reinitializeTransaction();
  this.renderToStaticMarkup = renderToStaticMarkup;
  this.useCreateElement = false;
  this.updateQueue = new ReactServerUpdateQueue(this);
  this.buffer = [];
  this.nextWriteHeader = null;
  this.position = 0;
  var buf = [];
  var nextWriteHeader = null;
  this.serverBuffer = {
    position: 0,
  };
}

var Mixin = {
  /**
   * @see Transaction
   * @abstract
   * @final
   * @return {array} Empty list of operation wrap procedures.
   */
  getTransactionWrappers: function() {
    return TRANSACTION_WRAPPERS;
  },

  /**
   * @return {object} The queue to collect `onDOMReady` callbacks with.
   */
  getReactMountReady: function() {
    return noopCallbackQueue;
  },

  /**
   * @return {object} The queue to collect React async events.
   */
  getUpdateQueue: function() {
    return this.updateQueue;
  },

  /**
   * `PooledClass` looks for this, and will invoke this before allowing this
   * instance to be reused.
   */
  destructor: function() {
  },

  checkpoint: function() {
  },

  rollback: function() {
  },

  enqueueNextWriteHeader(header) {
    this.nextWriteHeader = header;
  },

  resetNextWriteHeader() {
    this.nextWriteHeader = null;
  },

  write(chunk) {
    if (this.nextWriteHeader) {
      this.buffer.push(this.nextWriteHeader);
      this.position += this.nextWriteHeader.length;
      this.resetNextWriteHeader();
    }
    this.buffer.push(chunk);
    this.position += chunk.length;
  },

  flush() {
    return this.buffer.join('');
  }
};


Object.assign(
  ReactServer2RenderingTransaction.prototype,
  Transaction,
  Mixin
);

PooledClass.addPoolingTo(ReactServer2RenderingTransaction);

module.exports = ReactServer2RenderingTransaction;
