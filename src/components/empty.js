/**
 * Copyright 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMServerEmptyComponent
 */

'use strict';

var ReactDOMEmptyComponent = function(instantiate) {
  // ReactCompositeComponent uses this:
  this._currentElement = null;
};
Object.assign(ReactDOMEmptyComponent.prototype, {
  mountComponent: function(
    transaction,
    hostParent,
    hostContainerInfo,
    context
  ) {
    const domID = hostContainerInfo._idCounter++;

    var nodeValue = ' react-empty: ' + domID + ' ';
    if (!transaction.renderToStaticMarkup) {
      context.write('<!--' + nodeValue + '-->');
    }
  },
  receiveComponent: function() {
    throw new Error('unsupported operation');
  },
  getHostNode: function() {
    throw new Error('unsupported operation');
  },
  unmountComponent: function() {
    throw new Error('unsupported operation');
  },
});

module.exports = ReactDOMEmptyComponent;
