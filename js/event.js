var CssLogic = {};
/**
  * Find a unique CSS selector for a given element
  * @returns a string such that ele.ownerDocument.querySelector(reply) === ele
  * and ele.ownerDocument.querySelectorAll(reply).length === 1
  */
CssLogic.findCssSelector = function CssLogic_findCssSelector(ele) {
  // ele = getRootBindingParent(ele);
  var document = ele.ownerDocument;
  if (!document || !document.contains(ele)) {
    throw new Error('findCssSelector received element not inside document');
  }
  // document.querySelectorAll("#id") returns multiple if elements share an ID
  if (ele.id && document.querySelectorAll('#' + CSS.escape(ele.id)).length === 1) {
    return '#' + CSS.escape(ele.id);
  }
  // Inherently unique by tag name
  var tagName = ele.localName;
  if (tagName === 'html') {
    return 'html';
  }
  if (tagName === 'head') {
    return 'head';
  }
  if (tagName === 'body') {
    return 'body';
  }
  // We might be able to find a unique class name
  var selector, index, matches;
  if (ele.classList.length > 0) {
    for (var i = 0; i < ele.classList.length; i++) {
      // Is this className unique by itself?
      selector = '.' + CSS.escape(ele.classList.item(i));
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique with a tag name?
      selector = tagName + selector;
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique using a tag name and nth-child
      index = positionInNodeList(ele, ele.parentNode.children) + 1;
      selector = selector + ':nth-child(' + index + ')';
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
    }
  }
  // Not unique enough yet.  As long as it's not a child of the document,
  // continue recursing up until it is unique enough.
  if (ele.parentNode !== document) {
    index = positionInNodeList(ele, ele.parentNode.children) + 1;
    selector = CssLogic_findCssSelector(ele.parentNode) + ' > ' +
            tagName + ':nth-child(' + index + ')';
  }
  return selector;
};
/**
  * Find the position of [element] in [nodeList].
  * @returns an index of the match, or -1 if there is no match
  */
function positionInNodeList(element, nodeList) {
  for (var i = 0; i < nodeList.length; i++) {
    if (element === nodeList[i]) {
      return i;
    }
  }
  return -1;
}
var EventQueue = [];
var Mode = 0;
function main () {
  var oael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, useCapture) {
    oael.call(this, type, function (listener, event) {
      if (Mode === 1) {
        pushEvent(this, event);
      }
      //
      if (typeof listener === 'function') {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }.bind(this, listener), useCapture);
  };
}
function pushEvent (target, event) {
  target = CssLogic.findCssSelector(event.target);
//   if (target === document) {
//     target = target.activeElement;
//     target = '__DOCUMENT__';
//   } else {
//     target = CssLogic.findCssSelector(target);
//   }
  if (event.type === 'click') {
    var relatedTarget = event.relatedTarget;
    if (relatedTarget) {
      relatedTarget = CssLogic.findCssSelector(relatedTarget);
    }
  }
  EventQueue.push({
    target: target,
    type: event.type,
    data: {
      // Event
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      // UIEvent
      detail: event.detail,
      view: event.view,
      // MouseEvent
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      button: event.button,
      buttons: event.buttons,
      relatedTarget: relatedTarget,
      region: event.region,
    },
  });
}
function record () {
  Mode = 1;
  EventQueue = [];
}
function replay () {
  Mode = 2;
  // EventQueue.forEach(function (v) {
  //   var element = document.querySelector(v.target);
  //   if (!element) {
  //     console.warn(v.target, 'not found');
  //     return;
  //   }
  //   if (v.type === 'click' || v.type === 'mousedown') {
  //     if (v.data.relatedTarget) {
  //       v.data.relatedTarget = document.querySelector(v.data.relatedTarget);
  //     }
  //     var event = new MouseEvent(v.type, v.data);
  //     console.info('dispatch before');
  //     element.dispatchEvent(event);
  //     console.info('dispatch after');
  //   }
  // });
  // asyncForEach(EventQueue, function (v) {
  //   if (v.target === '__DOCUMENT__') {
  //     var element = document;
  //   } else {
  //     var element = document.querySelector(v.target);
  //   }
  //   if (!element) {
  //     console.warn(v.target, 'not found');
  //     return;
  //   }
  //   if (v.type === 'click' || v.type === 'mousedown') {
  //     if (v.data.relatedTarget) {
  //       v.data.relatedTarget = document.querySelector(v.data.relatedTarget);
  //     }
  //     var event = new MouseEvent(v.type, v.data);
  //     console.info('dispatch before');
  //     element.dispatchEvent(event);
  //     console.info('dispatch after');
  //   }
  // });
  var i = 0;
  var handle = setInterval(function () {
    if (i >= EventQueue.length) {
      clearInterval(handle);
      return;
    }
    var v = EventQueue[i];
    var element = document.querySelector(v.target);
    if (!element) {
      console.warn(v.target, 'not found');
      return;
    }
    if (v.type === 'click' || v.type === 'mousedown') {
      if (v.data.relatedTarget) {
        v.data.relatedTarget = document.querySelector(v.data.relatedTarget);
      }
      var event = new MouseEvent(v.type, v.data);
      console.info('dispatch before');
      element.dispatchEvent(event);
      console.info('dispatch after');
    }
    ++i;
  }, 1000);
}
function stop () {
  Mode = 0;
}
function wait (msec) {
  return new Promise(function (resolve, reject) {
    var handle = setTimeout(resolve, msec);
  });
}
function mapToPromise (seq, fn) {
  return seq.map(function (v, i, self) {
    return function (v, i) {
      return new Promise(function (resolve, reject) {
        fn(v, i);
        return wait(500);
      });
    }.bind(self, v, i);
  });
}
function asyncForEach(seq, fn) {
  var tasks = mapToPromise(seq, fn);
  var p = tasks[0]();
  for (var i = 1; i < tasks.length; ++i) {
    p = p.then(function () {
      return tasks[i]();
    }.bind(null, i));
  }
}
main();
