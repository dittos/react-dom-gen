/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */

'use strict';

var ReactCurrentOwner = require('react/lib/ReactCurrentOwner');
var ReactElement = require('react/lib/ReactElement');
var ReactReconciler = require('react-dom/lib/ReactReconciler');
var ReactChildReconciler = require('../child-reconciler');
var instantiateReactComponent = require('react-dom/lib/instantiateReactComponent');

class ChildrenIterator {
  constructor(children, transaction, context, componentInstance) {
    this.children = children;
    this.transaction = transaction;
    this.context = context;
    this.componentInstance = componentInstance;
    this.index = 0;
    this.length = children.length;
    this.current = null;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.current) {
      const g = this.current.next();
      if (!g.done)
        return g;
      this.current = null;
    }
    if (this.index < this.length) {
      const child = instantiateReactComponent(this.children[this.index]);
      const mountImage = ReactReconciler.mountComponent(child, this.transaction, this.componentInstance, this.componentInstance._hostContainerInfo, this.context, 0);
      this.index++;
      if (mountImage && mountImage.next) {
        this.current = mountImage;
        return this.next();
      }
      return {
        value: mountImage,
        done: false,
      };
    }
    return {value: undefined, done: true};
  }
}

/**
 * ReactMultiChild are capable of reconciling multiple children.
 *
 * @class ReactMultiChild
 * @internal
 */
var ReactMultiChild = {

  /**
   * Provides common functionality for components that must reconcile multiple
   * children. This is used by `ReactDOMComponent` to mount, update, and
   * unmount child components.
   *
   * @lends {ReactMultiChild.prototype}
   */
  Mixin: {

    _reconcilerInstantiateChildren: function (nestedChildren, transaction, context) {
      if (process.env.NODE_ENV !== 'production') {
        if (this._currentElement) {
          try {
            ReactCurrentOwner.current = this._currentElement._owner;
            return ReactChildReconciler.instantiateChildren(nestedChildren, transaction, context, 0);
          } finally {
            ReactCurrentOwner.current = null;
          }
        }
      }
      return ReactChildReconciler.instantiateChildren(nestedChildren, transaction, context);
    },

    /**
     * Generates a "mount image" for each of the supplied children. In the case
     * of `ReactDOMComponent`, a mount image is a string of markup.
     *
     * @param {?object} nestedChildren Nested child maps.
     * @return {array} An array of mounted representations.
     * @internal
     */
    mountChildren: function(nestedChildren, transaction, context) {
      if (ReactElement.isValidElement(nestedChildren)) {
        // single child
        const child = instantiateReactComponent(nestedChildren);
        return ReactReconciler.mountComponent(child, transaction, this, this._hostContainerInfo, context, 0);
      }

      const children = this._reconcilerInstantiateChildren(nestedChildren, transaction, context);
      return new ChildrenIterator(
        children,
        transaction,
        context,
        this
      );
    },

  }

};

module.exports = ReactMultiChild;
