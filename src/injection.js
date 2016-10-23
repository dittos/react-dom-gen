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

var ReactInjection = require('react-dom/lib/ReactInjection');
var ReactDefaultInjection = require('react-dom/lib/ReactDefaultInjection');
var ReactServerBatchingStrategy = require('react-dom/lib/ReactServerBatchingStrategy');
var ReactDOMServerComponent = require('./components/generic');

function inject() {
  ReactDefaultInjection.inject();

  ReactInjection.HostComponent.injectGenericComponentClass(
    ReactDOMServerComponent
  );
  ReactInjection.Updates.injectBatchingStrategy(
    ReactServerBatchingStrategy
  );
}

module.exports = {
  inject: inject,
};
