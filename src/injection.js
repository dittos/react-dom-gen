/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactServerInjection
 */

'use strict';

var ARIADOMPropertyConfig = require('react-dom/lib/ARIADOMPropertyConfig');
var BeforeInputEventPlugin = require('react-dom/lib/BeforeInputEventPlugin');
var ChangeEventPlugin = require('react-dom/lib/ChangeEventPlugin');
var DefaultEventPluginOrder = require('react-dom/lib/DefaultEventPluginOrder');
var EnterLeaveEventPlugin = require('react-dom/lib/EnterLeaveEventPlugin');
var HTMLDOMPropertyConfig = require('react-dom/lib/HTMLDOMPropertyConfig');
var ReactComponentBrowserEnvironment =
  require('react-dom/lib/ReactComponentBrowserEnvironment');
var ReactDOMComponentTree = require('react-dom/lib/ReactDOMComponentTree');
var ReactDOMTreeTraversal = require('react-dom/lib/ReactDOMTreeTraversal');
var ReactServerBatchingStrategy = require('react-dom/lib/ReactServerBatchingStrategy');
var ReactEventListener = require('react-dom/lib/ReactEventListener');
var ReactInjection = require('react-dom/lib/ReactInjection');
var ReactReconcileTransaction = require('react-dom/lib/ReactReconcileTransaction');
var SVGDOMPropertyConfig = require('react-dom/lib/SVGDOMPropertyConfig');
var SelectEventPlugin = require('react-dom/lib/SelectEventPlugin');
var SimpleEventPlugin = require('react-dom/lib/SimpleEventPlugin');

var ReactDOMServerComponent = require('./components/generic');
var ReactDOMServerEmptyComponent = require('./components/empty');
var ReactDOMServerTextComponent = require('./components/text');

var alreadyInjected = false;

function inject() {
  if (alreadyInjected) {
    // TODO: This is currently true because these injections are shared between
    // the client and the server package. They should be built independently
    // and not share any injection state. Then this problem will be solved.
    return;
  }
  alreadyInjected = true;

  /**
   * Inject modules for resolving DOM hierarchy and plugin ordering.
   */
  ReactInjection.EventPluginHub.injectEventPluginOrder(DefaultEventPluginOrder);

  /**
   * Some important event plugins included by default (without having to require
   * them).
   */
  ReactInjection.EventPluginHub.injectEventPluginsByName({
    SimpleEventPlugin: SimpleEventPlugin,
    EnterLeaveEventPlugin: EnterLeaveEventPlugin,
    ChangeEventPlugin: ChangeEventPlugin,
    SelectEventPlugin: SelectEventPlugin,
    BeforeInputEventPlugin: BeforeInputEventPlugin,
  });

  ReactInjection.HostComponent.injectGenericComponentClass(
    ReactDOMServerComponent
  );

  ReactInjection.HostComponent.injectTextComponentClass(
    ReactDOMServerTextComponent
  );

  ReactInjection.DOMProperty.injectDOMPropertyConfig(ARIADOMPropertyConfig);
  ReactInjection.DOMProperty.injectDOMPropertyConfig(HTMLDOMPropertyConfig);
  ReactInjection.DOMProperty.injectDOMPropertyConfig(SVGDOMPropertyConfig);

  ReactInjection.EmptyComponent.injectEmptyComponentFactory(
    function(instantiate) {
      return new ReactDOMServerEmptyComponent(instantiate);
    }
  );

  ReactInjection.Updates.injectReconcileTransaction(
    ReactReconcileTransaction
  );
  ReactInjection.Updates.injectBatchingStrategy(
    ReactServerBatchingStrategy
  );

  ReactInjection.Component.injectEnvironment(ReactComponentBrowserEnvironment);
}

module.exports = {
  inject: inject,
};
