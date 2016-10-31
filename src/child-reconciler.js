/**
 * Copyright 2014-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */

'use strict';

var ReactReconciler = require('react-dom/lib/ReactReconciler');

var instantiateReactComponent = require('react-dom/lib/instantiateReactComponent');
var KeyEscapeUtils = require('react-dom/lib/KeyEscapeUtils');
var traverseAllChildren = require('react-dom/lib/traverseAllChildren');
var warning = require('fbjs/lib/warning');

function instantiateChild({seenKeys, children}, child, name, selfDebugID) {
  // We found a component instance.
  var keyUnique = !seenKeys.has(name);
  if (process.env.NODE_ENV !== 'production') {
    if (!keyUnique) {
      process.env.NODE_ENV !== 'production' ? warning(false, 'flattenChildren(...): Encountered two children with the same key, ' + '`%s`. Child keys must be unique; when two children share a key, only ' + 'the first child will be used.', KeyEscapeUtils.unescape(name)) : void 0;
    }
  }
  if (child != null && keyUnique) {
    seenKeys.add(name);
    children.push(child);
  }
}

/**
 * ReactChildReconciler provides helpers for initializing or updating a set of
 * children. Its output is suitable for passing it onto ReactMultiChild which
 * does diffed reordering and insertion.
 */
var ReactChildReconciler = {
  /**
   * Generates a "mount image" for each of the supplied children. In the case
   * of `ReactDOMComponent`, a mount image is a string of markup.
   *
   * @param {?object} nestedChildNodes Nested child maps.
   * @return {?object} A set of child instances.
   * @internal
   */
  instantiateChildren: function (nestedChildNodes, transaction, context) {
    if (nestedChildNodes == null) {
      return null;
    }
    var traverseContext = {
      seenKeys: new Set(),
      children: [],
    };
    traverseAllChildren(nestedChildNodes, instantiateChild, traverseContext);
    return traverseContext.children;
  },

};

module.exports = ReactChildReconciler;
