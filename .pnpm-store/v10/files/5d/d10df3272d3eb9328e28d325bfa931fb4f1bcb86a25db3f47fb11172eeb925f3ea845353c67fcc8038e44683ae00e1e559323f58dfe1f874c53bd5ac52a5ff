'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const helpers = require('../helpers.cjs');

const fix = helpers.defineFix({
  name: "anchor",
  selectors: ["a"],
  handleRule(rule, options) {
    const { processedPrefixes, tokens } = options;
    const fixedSelectors = [];
    const fixedDecls = [];
    rule.selectors.forEach((selectorItem) => {
      if (fix.selectors.includes(selectorItem)) {
        const antdDecls = {
          "color": tokens?.colorPrimary || "#1677FF",
          "text-decoration": "none"
        };
        const antdDeclsProps = Object.keys(antdDecls);
        rule.walkDecls(
          new RegExp(antdDeclsProps.map((item) => `(${item})`).join("|")),
          (decl) => {
            if (antdDeclsProps.includes(decl.prop) && decl.value === "inherit") {
              const value = antdDecls[decl.prop];
              fixedDecls.push(
                decl.clone({
                  value
                })
              );
            }
          }
        );
        if (!fixedDecls.length) {
          return;
        }
        const antdIncludeSelector = helpers.getIncludeSelector(
          processedPrefixes.map((item) => item.prefixCls)
        );
        fixedSelectors.push({
          from: selectorItem,
          to: `${antdIncludeSelector} ${selectorItem}`
        });
      }
    });
    if (fixedSelectors.length === 0) {
      return;
    }
    rule.cloneAfter({
      selectors: fixedSelectors.map((item) => item.to),
      nodes: fixedDecls
    });
  }
});

exports.fix = fix;
