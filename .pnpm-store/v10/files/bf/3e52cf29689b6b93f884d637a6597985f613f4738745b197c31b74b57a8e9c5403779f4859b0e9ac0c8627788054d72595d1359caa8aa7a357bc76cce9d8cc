'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

function defineFix(options) {
  return {
    ...options
  };
}
function getAntdSelectors(prefixClsArr) {
  return prefixClsArr.map((item) => {
    return `[class^="${item}"]`;
  });
}
function getIncludeSelector(prefixClsArr) {
  let selector = `${getAntdSelectors(prefixClsArr).join(", ")}`;
  selector = `:where(${selector})`;
  return selector;
}
function getExcludeSelector(prefixClsArr, hashPriority) {
  let selector = `:not(${getAntdSelectors(prefixClsArr).join(", ")})`;
  if (hashPriority !== "high") {
    selector = `:where(${selector})`;
  }
  return selector;
}

exports.defineFix = defineFix;
exports.getAntdSelectors = getAntdSelectors;
exports.getExcludeSelector = getExcludeSelector;
exports.getIncludeSelector = getIncludeSelector;
