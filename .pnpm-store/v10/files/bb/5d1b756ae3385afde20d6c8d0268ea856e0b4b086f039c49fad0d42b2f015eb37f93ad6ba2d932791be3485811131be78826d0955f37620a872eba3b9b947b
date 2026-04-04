import fixes from './fixes/index.mjs';

const plugin = (options) => {
  const {
    prefixes: antdPrefixes = ["ant"],
    tokens,
    fixes: customFixes = {}
  } = options || {};
  const processedPrefixes = antdPrefixes.map((item) => {
    if (typeof item === "string") {
      return {
        prefixCls: item
      };
    }
    return item;
  });
  const mixHashPriority = processedPrefixes.slice(1).some((item) => {
    return item.hashPriority !== processedPrefixes[0].hashPriority;
  });
  return {
    postcssPlugin: "postcss-antd-fixes",
    Once: (root) => {
      fixes.filter((item) => {
        return customFixes[item.name] !== false;
      }).forEach((fix) => {
        root.walkRules(
          new RegExp(fix.selectors.map((item) => `(${item})`).join("|")),
          (rule) => {
            fix.handleRule(rule, {
              processedPrefixes,
              mixHashPriority,
              tokens
            });
          }
        );
      });
    }
  };
};
plugin.postcss = true;

export { plugin as default };
