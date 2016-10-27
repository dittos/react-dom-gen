/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMServerComponent
 */

/* global hasOwnProperty:true */

'use strict';

var CSSPropertyOperations = require('react-dom/lib/CSSPropertyOperations');
var DOMNamespaces = require('react-dom/lib/DOMNamespaces');
var DOMProperty = require('react-dom/lib/DOMProperty');
var DOMPropertyOperations = require('react-dom/lib/DOMPropertyOperations');
var EventPluginRegistry = require('react-dom/lib/EventPluginRegistry');
var ReactDOMInput = require('react-dom/lib/ReactDOMInput');
var ReactDOMOption = require('react-dom/lib/ReactDOMOption');
var ReactDOMSelect = require('react-dom/lib/ReactDOMSelect');
var ReactDOMTextarea = require('react-dom/lib/ReactDOMTextarea');
var ReactMultiChild = require('./children');

var escapeTextContentForBrowser = require('react-dom/lib/escapeTextContentForBrowser');
var invariant = require('fbjs/lib/invariant');
var validateDOMNesting = require('react-dom/lib/validateDOMNesting');
var warning = require('fbjs/lib/warning');

var registrationNameModules = EventPluginRegistry.registrationNameModules;

// For quickly matching children type, to test if can be treated as content.
var CONTENT_TYPES = {'string': true, 'number': true};

var STYLE = 'style';
var HTML = '__html';
var RESERVED_PROPS = {
  children: null,
  dangerouslySetInnerHTML: null,
  suppressContentEditableWarning: null,
};


function getDeclarationErrorAddendum(internalInstance) {
  if (internalInstance) {
    var owner = internalInstance._currentElement._owner || null;
    if (owner) {
      var name = owner.getName();
      if (name) {
        return ' This DOM node was rendered by `' + name + '`.';
      }
    }
  }
  return '';
}

/**
 * @param {object} component
 * @param {?object} props
 */
function assertValidProps(component, props) {
  if (!props) {
    return;
  }
  // Note the use of `==` which checks for null or undefined.
  if (voidElementTags[component._tag]) {
    invariant(
      props.children == null && props.dangerouslySetInnerHTML == null,
      '%s is a void element tag and must neither have `children` nor ' +
      'use `dangerouslySetInnerHTML`.%s',
      component._tag,
      component._currentElement._owner ?
        ' Check the render method of ' +
        component._currentElement._owner.getName() + '.' :
        ''
    );
  }
  if (props.dangerouslySetInnerHTML != null) {
    invariant(
      props.children == null,
      'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
    );
    invariant(
      typeof props.dangerouslySetInnerHTML === 'object' &&
      HTML in props.dangerouslySetInnerHTML,
      '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
      'Please visit https://fb.me/react-invariant-dangerously-set-inner-html ' +
      'for more information.'
    );
  }
  if (process.env.NODE_ENV !== 'production') {
    warning(
      props.innerHTML == null,
      'Directly setting property `innerHTML` is not permitted. ' +
      'For more information, lookup documentation on `dangerouslySetInnerHTML`.'
    );
    warning(
      props.suppressContentEditableWarning ||
      !props.contentEditable ||
      props.children == null,
      'A component is `contentEditable` and contains `children` managed by ' +
      'React. It is now your responsibility to guarantee that none of ' +
      'those nodes are unexpectedly modified or duplicated. This is ' +
      'probably not intentional.'
    );
    warning(
      props.onFocusIn == null &&
      props.onFocusOut == null,
      'React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' +
      'All React events are normalized to bubble, so onFocusIn and onFocusOut ' +
      'are not needed/supported by React.'
    );
  }
  invariant(
    props.style == null || typeof props.style === 'object',
    'The `style` prop expects a mapping from style properties to values, ' +
    'not a string. For example, style={{marginRight: spacing + \'em\'}} when ' +
    'using JSX.%s',
     getDeclarationErrorAddendum(component)
  );
}

// For HTML, certain tags should omit their close tag. We keep a whitelist for
// those special-case tags.

var omittedCloseTags = {
  'area': true,
  'base': true,
  'br': true,
  'col': true,
  'embed': true,
  'hr': true,
  'img': true,
  'input': true,
  'keygen': true,
  'link': true,
  'meta': true,
  'param': true,
  'source': true,
  'track': true,
  'wbr': true,
  // NOTE: menuitem's close tag should be omitted, but that causes problems.
};

var newlineEatingTags = {
  'listing': true,
  'pre': true,
  'textarea': true,
};

// For HTML, certain tags cannot have children. This has the same purpose as
// `omittedCloseTags` except that `menuitem` should still have its closing tag.

var voidElementTags = Object.assign({
  'menuitem': true,
}, omittedCloseTags);

// We accept any tag to be rendered but since this gets injected into arbitrary
// HTML, we want to make sure that it's a safe tag.
// http://www.w3.org/TR/REC-xml/#NT-Name

var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset
var validatedTagCache = {};
var hasOwnProperty = {}.hasOwnProperty;

function validateDangerousTag(tag) {
  if (!hasOwnProperty.call(validatedTagCache, tag)) {
    invariant(VALID_TAG_REGEX.test(tag), 'Invalid tag: %s', tag);
    validatedTagCache[tag] = true;
  }
}

function isCustomComponent(tagName, props) {
  return tagName.indexOf('-') >= 0 || props.is != null;
}

const STATE_HEAD = 0;
const STATE_BODY = 1;
const STATE_DONE = 2;

class ChildrenIterator {
  constructor(head, body, tail) {
    this.state = STATE_HEAD;
    this.head = head;
    this.body = body;
    this.tail = tail;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    switch (this.state) {
      case STATE_HEAD:
        this.state = STATE_BODY;
        return {value: this.head, done: false};
      case STATE_BODY: {
        var g = this.body.next();
        if (g.done) {
          this.state = STATE_DONE;
          return {value: this.tail, done: false};
        }
        return {value: g.value, done: false};
      }
      case STATE_DONE:
        return {value: undefined, done: true};
    }
  }
}

/**
 * Creates a new React class that is idempotent and capable of containing other
 * React components. It accepts event listeners and DOM properties that are
 * valid according to `DOMProperty`.
 *
 *  - Event listeners: `onClick`, `onMouseDown`, etc.
 *  - DOM properties: `className`, `name`, `title`, etc.
 *
 * The `style` property functions differently from the DOM API. It accepts an
 * object mapping of style properties to values.
 *
 * @constructor ReactDOMComponent
 * @extends ReactMultiChild
 */
function ReactDOMServerComponent(element) {
  var tag = element.type;
  validateDangerousTag(tag);
  this._currentElement = element;
  this._tag = tag.toLowerCase();
  this._namespaceURI = null;
  this._hostParent = null;
  this._domID = 0;
  this._hostContainerInfo = null;
  this._wrapperState = null;
  if (process.env.NODE_ENV !== 'production') {
    this._ancestorInfo = null;
  }
}

ReactDOMServerComponent.displayName = 'ReactDOMComponent';

ReactDOMServerComponent.Mixin = {

  mountComponent: function(
    transaction,
    hostParent,
    hostContainerInfo,
    context
  ) {
    this._domID = hostContainerInfo._idCounter++;
    this._hostParent = hostParent;
    this._hostContainerInfo = hostContainerInfo;

    var props = this._currentElement.props;

    switch (this._tag) {
      case 'input':
        ReactDOMInput.mountWrapper(this, props, hostParent);
        props = ReactDOMInput.getHostProps(this, props);
        break;
      case 'option':
        ReactDOMOption.mountWrapper(this, props, hostParent);
        props = ReactDOMOption.getHostProps(this, props);
        break;
      case 'select':
        ReactDOMSelect.mountWrapper(this, props, hostParent);
        props = ReactDOMSelect.getHostProps(this, props);
        break;
      case 'textarea':
        ReactDOMTextarea.mountWrapper(this, props, hostParent);
        props = ReactDOMTextarea.getHostProps(this, props);
        break;
    }

    assertValidProps(this, props);

    // We create tags in the namespace of their parent container, except HTML
    // tags get no namespace.
    var namespaceURI;
    var parentTag;
    if (hostParent != null) {
      namespaceURI = hostParent._namespaceURI;
      parentTag = hostParent._tag;
    } else if (hostContainerInfo._tag) {
      namespaceURI = hostContainerInfo._namespaceURI;
      parentTag = hostContainerInfo._tag;
    }
    if (namespaceURI == null ||
        namespaceURI === DOMNamespaces.svg && parentTag === 'foreignobject') {
      namespaceURI = DOMNamespaces.html;
    }
    if (namespaceURI === DOMNamespaces.html) {
      if (this._tag === 'svg') {
        namespaceURI = DOMNamespaces.svg;
      } else if (this._tag === 'math') {
        namespaceURI = DOMNamespaces.mathml;
      }
    }
    this._namespaceURI = namespaceURI;

    if (process.env.NODE_ENV !== 'production') {
      var parentInfo;
      if (hostParent != null) {
        parentInfo = hostParent._ancestorInfo;
      } else if (hostContainerInfo._tag) {
        parentInfo = hostContainerInfo._ancestorInfo;
      }
      if (parentInfo) {
        // parentInfo should always be present except for the top-level
        // component when server rendering
        validateDOMNesting(this._tag, null, this, parentInfo);
      }
      this._ancestorInfo =
        validateDOMNesting.updatedAncestorInfo(parentInfo, this._tag, this);
    }
    const tagOpen = this._createOpenTagMarkup(transaction, props);
    const children = this._createContentMarkup(transaction, props, context);
    var tagContent = '';
    var isGenerator;
    if (children) {
      if (children.next) {
        isGenerator = true;
        // Exhaust until first byte
        while (tagContent.length === 0) {
          const {value, done} = children.next();
          if (done) {
            isGenerator = false;
            break;
          }
          tagContent = value;
        }
      } else {
        isGenerator = false;
        tagContent = children;
      }
    }

    if (!tagContent && omittedCloseTags[this._tag]) {
      return tagOpen + '/>';
    } else {
      if (newlineEatingTags[this._tag] && tagContent.charAt(0) === '\n') {
        // text/html ignores the first character in these tags if it's a newline
        // Prefer to break application/xml over text/html (for now) by adding
        // a newline specifically to get eaten by the parser. (Alternately for
        // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
        // \r is normalized out by HTMLTextAreaElement#value.)
        // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
        // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
        // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
        // See: Parsing of "textarea" "listing" and "pre" elements
        //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
        tagContent = '\n' + tagContent;
      }
    }

    if (isGenerator)
      return new ChildrenIterator(
        tagOpen + '>' + tagContent,
        children,
        '</' + this._currentElement.type + '>'
      );
    else
      return tagOpen + '>' + tagContent + '</' + this._currentElement.type + '>';
  },

  _createOpenTagMarkup: function(transaction, props) {
    var ret = '<' + this._currentElement.type;

    for (var propKey in props) {
      if (!props.hasOwnProperty(propKey)) {
        continue;
      }
      var propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      var isEventHandler = registrationNameModules.hasOwnProperty(propKey);
      if (isEventHandler) {
        continue;
      }
      if (propKey === STYLE) {
        propValue = CSSPropertyOperations.createMarkupForStyles(propValue, this);
      }
      var markup = null;
      if (this._tag != null && isCustomComponent(this._tag, props)) {
        if (!RESERVED_PROPS.hasOwnProperty(propKey)) {
          markup = DOMPropertyOperations.createMarkupForCustomAttribute(propKey, propValue);
        }
      } else {
        markup = DOMPropertyOperations.createMarkupForProperty(propKey, propValue);
      }
      if (markup) {
        ret += ' ' + markup;
      }
    }

    // For static pages, no need to put React ID and checksum. Saves lots of
    // bytes.
    if (transaction.renderToStaticMarkup) {
      return ret;
    }

    if (!this._hostParent) {
      ret += ' ' + DOMPropertyOperations.createMarkupForRoot();
    }
    ret += ' ' + DOMPropertyOperations.createMarkupForID(this._domID);
    return ret;
  },

  _createContentMarkup: function(transaction, props, context) {
    // Intentional use of != to avoid catching zero/false.
    var innerHTML = props.dangerouslySetInnerHTML;
    if (innerHTML != null) {
      if (innerHTML.__html != null) {
        return innerHTML.__html;
      }
    } else {
      var contentToUse =
        CONTENT_TYPES[typeof props.children] ? props.children : null;
      var childrenToUse = contentToUse != null ? null : props.children;
      if (contentToUse != null) {
        // TODO: Validate that text is allowed as a child of this node
        if (process.env.NODE_ENV !== 'production') {
          validateDOMNesting(null, String(contentToUse), this, this._ancestorInfo);
        }
        return escapeTextContentForBrowser(contentToUse);
      } else if (childrenToUse != null) {
        return this.mountChildren(
          childrenToUse,
          transaction,
          context
        );
      }
    }
  },

  receiveComponent: function(nextElement, transaction, context) {
    throw new Error('unsupported operation');
  },

  getHostNode: function() {
    throw new Error('unsupported operation');
  },

  unmountComponent: function(safely, skipLifecycle) {
    throw new Error('unsupported operation');
  },

  getPublicInstance: function() {
    throw new Error('unsupported operation');
  },

};

Object.assign(
  ReactDOMServerComponent.prototype,
  ReactDOMServerComponent.Mixin,
  ReactMultiChild.Mixin
);

module.exports = ReactDOMServerComponent;
