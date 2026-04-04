"use strict";
const {
  __pow,
  __export,
  __toESM,
  __toCommonJS,
  __async,
  __forAwait
} = require('./esblib.cjs');


// src/goods.ts
var goods_exports = {};
__export(goods_exports, {
  argv: () => argv,
  echo: () => echo,
  expBackoff: () => expBackoff,
  fetch: () => fetch,
  os: () => os,
  parseArgv: () => parseArgv,
  path: () => import_node_path.default,
  question: () => question,
  retry: () => retry,
  sleep: () => sleep,
  spinner: () => spinner,
  stdin: () => stdin,
  updateArgv: () => updateArgv
});
module.exports = __toCommonJS(goods_exports);
var import_node_assert = __toESM(require("assert"), 1);
var import_node_readline = require("readline");
var import_core = require("./core.cjs");
var import_util = require("./util.cjs");
var import_vendor = require("./vendor.cjs");
var import_node_path = __toESM(require("path"), 1);
var os = __toESM(require("os"), 1);
var parseArgv = (args = process.argv.slice(2), opts = {}) => Object.entries((0, import_vendor.minimist)(args, opts)).reduce(
  (m, [k, v]) => {
    const kTrans = opts.camelCase ? import_util.toCamelCase : import_util.identity;
    const vTrans = opts.parseBoolean ? import_util.parseBool : import_util.identity;
    const [_k, _v] = k === "--" || k === "_" ? [k, v] : [kTrans(k), vTrans(v)];
    m[_k] = _v;
    return m;
  },
  {}
);
function updateArgv(args, opts) {
  for (const k in argv) delete argv[k];
  Object.assign(argv, parseArgv(args, opts));
}
var argv = parseArgv();
function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, (0, import_util.parseDuration)(duration));
  });
}
function fetch(url, init) {
  return __async(this, null, function* () {
    import_core.$.log({ kind: "fetch", url, init, verbose: !import_core.$.quiet && import_core.$.verbose });
    return (0, import_vendor.nodeFetch)(url, init);
  });
}
function echo(pieces, ...args) {
  const lastIdx = pieces.length - 1;
  const msg = (0, import_util.isStringLiteral)(pieces, ...args) ? args.map((a, i) => pieces[i] + stringify(a)).join("") + pieces[lastIdx] : [pieces, ...args].map(stringify).join(" ");
  console.log(msg);
}
function stringify(arg) {
  return arg instanceof import_core.ProcessOutput ? arg.toString().trimEnd() : `${arg}`;
}
function question(query, options) {
  return __async(this, null, function* () {
    let completer = void 0;
    if (options && Array.isArray(options.choices)) {
      completer = function completer2(line) {
        const completions = options.choices;
        const hits = completions.filter((c) => c.startsWith(line));
        return [hits.length ? hits : completions, line];
      };
    }
    const rl = (0, import_node_readline.createInterface)({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer
    });
    return new Promise(
      (resolve) => rl.question(query != null ? query : "", (answer) => {
        rl.close();
        resolve(answer);
      })
    );
  });
}
function stdin() {
  return __async(this, null, function* () {
    let buf = "";
    process.stdin.setEncoding("utf8");
    try {
      for (var iter = __forAwait(process.stdin), more, temp, error; more = !(temp = yield iter.next()).done; more = false) {
        const chunk = temp.value;
        buf += chunk;
      }
    } catch (temp) {
      error = [temp];
    } finally {
      try {
        more && (temp = iter.return) && (yield temp.call(iter));
      } finally {
        if (error)
          throw error[0];
      }
    }
    return buf;
  });
}
function retry(count, a, b) {
  return __async(this, null, function* () {
    const total = count;
    let callback;
    let delayStatic = 0;
    let delayGen;
    if (typeof a === "function") {
      callback = a;
    } else {
      if (typeof a === "object") {
        delayGen = a;
      } else {
        delayStatic = (0, import_util.parseDuration)(a);
      }
      (0, import_node_assert.default)(b);
      callback = b;
    }
    let lastErr;
    let attempt = 0;
    while (count-- > 0) {
      attempt++;
      try {
        return yield callback();
      } catch (err) {
        let delay = 0;
        if (delayStatic > 0) delay = delayStatic;
        if (delayGen) delay = delayGen.next().value;
        import_core.$.log({
          kind: "retry",
          total,
          attempt,
          delay,
          exception: err,
          verbose: !import_core.$.quiet && import_core.$.verbose,
          error: `FAIL Attempt: ${attempt}/${total}, next: ${delay}`
          // legacy
        });
        lastErr = err;
        if (count == 0) break;
        if (delay) yield sleep(delay);
      }
    }
    throw lastErr;
  });
}
function* expBackoff(max = "60s", rand = "100ms") {
  const maxMs = (0, import_util.parseDuration)(max);
  const randMs = (0, import_util.parseDuration)(rand);
  let n = 1;
  while (true) {
    const ms = Math.floor(Math.random() * randMs);
    yield Math.min(__pow(2, n++), maxMs) + ms;
  }
}
function spinner(title, callback) {
  return __async(this, null, function* () {
    if (typeof title === "function") {
      callback = title;
      title = "";
    }
    if (import_core.$.quiet || process.env.CI) return callback();
    let i = 0;
    const spin = () => process.stderr.write(`  ${"\u280B\u2819\u2839\u2838\u283C\u2834\u2826\u2827\u2807\u280F"[i++ % 10]} ${title}\r`);
    return (0, import_core.within)(() => __async(this, null, function* () {
      import_core.$.verbose = false;
      const id = setInterval(spin, 100);
      try {
        return yield callback();
      } finally {
        clearInterval(id);
        process.stderr.write(" ".repeat((process.stdout.columns || 1) - 1) + "\r");
      }
    }));
  });
}
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  argv,
  echo,
  expBackoff,
  fetch,
  os,
  parseArgv,
  path,
  question,
  retry,
  sleep,
  spinner,
  stdin,
  updateArgv
});