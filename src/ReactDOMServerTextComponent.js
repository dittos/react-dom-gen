/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMServerTextComponent
 */

'use strict';

var escapeTextContentForBrowser = require('react-dom/lib/escapeTextContentForBrowser');
var invariant = require('fbjs/lib/invariant');
var validateDOMNesting = require('react-dom/lib/validateDOMNesting');

/**
 * Text nodes violate a couple assumptions that React makes about components:
 *
 *  - When mounting text into the DOM, adjacent text nodes are merged.
 *  - Text nodes cannot be assigned a React root ID.
 *
 * This component is used to wrap strings between comment nodes so that they
 * can undergo the same reconciliation that is applied to elements.
 *
 * TODO: Investigate representing React components in the DOM with text nodes.
 *
 * @class ReactDOMTextComponent
 * @extends ReactComponent
 * @internal
 */
var ReactDOMTextComponent = function(text) {
  // TODO: This is really a ReactText (ReactNode), not a ReactElement
  this._currentElement = text;
  this._stringText = '' + text;
};

Object.assign(ReactDOMTextComponent.prototype, {

  /**
   * Creates the markup for this text node. This node is not intended to have
   * any features besides containing text content.
   *
   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
   * @return {string} Markup for this text node.
   * @internal
   */
  mountComponent: function(
    transaction,
    hostParent,
    hostContainerInfo,
    context
  ) {
    if (process.env.NODE_ENV !== 'production') {
      var parentInfo;
      if (hostParent != null) {
        parentInfo = hostParent._ancestorInfo;
      } else if (hostContainerInfo != null) {
        parentInfo = hostContainerInfo._ancestorInfo;
      }
      if (parentInfo) {
        // parentInfo should always be present except for the top-level
        // component when server rendering
        validateDOMNesting(null, this._stringText, this, parentInfo);
      }
    }

    const domID = hostContainerInfo._idCounter++;
    var escapedText = escapeTextContentForBrowser(this._stringText);

    if (!transaction.renderToStaticMarkup) {
      var openingValue = ' react-text: ' + domID + ' ';
      var closingValue = ' /react-text ';
      escapedText = (
        '<!--' + openingValue + '-->' + escapedText +
        '<!--' + closingValue + '-->'
      );
    }
    transaction.write(escapedText);
  },

  receiveComponent: function(nextText, transaction) {
    throw new Error('unsupported operation');
  },

  getHostNode: function() {
    throw new Error('unsupported operation');
  },

  unmountComponent: function() {
    throw new Error('unsupported operation');
  },

});

module.exports = ReactDOMTextComponent;
