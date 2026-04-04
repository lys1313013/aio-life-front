import { defineFix, getExcludeSelector } from '../helpers.mjs';

const fix = defineFix({
  name: "button",
  selectors: ["button", "[type='button']", "[type='reset']", "[type='submit']"],
  handleRule(rule, options) {
    const { mixHashPriority, processedPrefixes } = options;
    const rawSelectors = [];
    const fixedSelectors = [];
    rule.selectors.forEach((selectorItem) => {
      if (fix.selectors.includes(selectorItem)) {
        if (mixHashPriority) {
          const antdExcludeSelectors = processedPrefixes.map((item) => {
            return getExcludeSelector([item.prefixCls], item.hashPriority);
          });
          fixedSelectors.push({
            from: selectorItem,
            to: antdExcludeSelectors.map((antdExcludeSelector) => {
              return `${selectorItem}${antdExcludeSelector}`;
            }).join(", ")
          });
        } else {
          const antdExcludeSelector = getExcludeSelector(
            processedPrefixes.map((item) => item.prefixCls),
            processedPrefixes[0].hashPriority
          );
          fixedSelectors.push({
            from: selectorItem,
            to: `${selectorItem}${antdExcludeSelector}`
          });
        }
      } else {
        rawSelectors.push(selectorItem);
      }
    });
    if (fixedSelectors.length === 0) {
      return;
    }
    rule.cloneAfter({
      selectors: fixedSelectors.map((item) => item.to)
    });
    if (fixedSelectors.length === rule.selectors.length) {
      rule.remove();
    } else {
      rule.replaceWith(
        rule.clone({
          selectors: rawSelectors
        })
      );
    }
  }
});

export { fix };
