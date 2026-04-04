// src/circle.ts
import { Listr, PRESET_TIMER } from "listr2";
import { minimatch } from "minimatch";
import { chalk as chalk3, globby, path as path2 } from "zx";
import { analyzeGraph } from "graph-cycles";

// src/logger.ts
import { chalk } from "zx";
var logger = {
  info: (...args) => console.log(chalk.blue("info"), ...args),
  warn: (...args) => console.log(chalk.yellow("warn"), ...args),
  error: (...args) => console.log(chalk.red("error"), ...args)
};

// src/utils.ts
import { chalk as chalk2, fs, path } from "zx";
var extensions = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "vue",
  "mjs",
  "cjs",
  "mts",
  "cts"
];
var removeTrailingSlash = (str) => /[/\\]$/.test(str) ? removeTrailingSlash(str.slice(0, -1)) : str;
function revertExtension(origin) {
  if (fs.existsSync(origin) && !fs.statSync(origin).isDirectory())
    return origin;
  for (const ext of extensions) {
    for (const result of [
      `${removeTrailingSlash(origin)}.${ext}`,
      path.posix.join(origin, `index.${ext}`)
    ]) {
      if (fs.existsSync(result)) return result;
    }
  }
}
var colorize = (filename) => chalk2[/\.[mc]?jsx?$/.test(filename) ? "yellow" : /\.[mc]?tsx?$/.test(filename) ? "blue" : /\.vue$/.test(filename) ? "green" : "grey"](filename);
function printCircles(circles = []) {
  console.log("\n");
  for (let i = 0; i < circles.length; i++) {
    const items = circles[i];
    console.log(
      [
        chalk2.underline(`Circle.${i + 1} - ${items.length} files`),
        ...items.map((v) => `\u2192 ${colorize(v)}`)
      ].join("\n")
    );
  }
  console.log("\n");
}

// src/ast.ts
import { fs as fs2 } from "zx";
import { tsx } from "@ast-grep/napi";
import { parse } from "@vue/compiler-sfc";
function getImportNodes(content) {
  const sgNode = tsx.parse(content).root();
  return sgNode.findAll({
    rule: {
      kind: "string_fragment",
      any: [
        {
          inside: {
            stopBy: "end",
            kind: "import_statement",
            field: "source"
          }
        },
        {
          inside: {
            stopBy: "end",
            kind: "export_statement",
            field: "source"
          }
        },
        {
          inside: {
            kind: "string",
            inside: {
              kind: "arguments",
              inside: {
                kind: "call_expression",
                has: {
                  field: "function",
                  regex: "^(import|require)$"
                }
              }
            }
          }
        }
      ]
    }
  });
}
function getTypeExcludedImportNodes(content) {
  return tsx.parse(content).root().findAll({
    rule: {
      kind: "string_fragment",
      any: [
        {
          inside: {
            kind: "import_statement",
            stopBy: "end",
            all: [
              {
                not: {
                  regex: "^import\\stype",
                  not: {
                    regex: "^import\\stype\\sfrom"
                  }
                }
              },
              {
                any: [
                  {
                    has: {
                      kind: "string",
                      field: "source",
                      nthChild: 1
                    }
                  },
                  {
                    has: {
                      kind: "import_specifier",
                      stopBy: "end",
                      not: { regex: "^type\\s" }
                    }
                  },
                  {
                    has: {
                      stopBy: "end",
                      any: [
                        { kind: "identifier" },
                        { kind: "namespace_import" }
                      ],
                      inside: {
                        kind: "import_clause"
                      }
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          inside: {
            kind: "export_statement",
            stopBy: "end",
            not: {
              regex: "^export\\stype"
            },
            any: [
              { regex: "^export\\s?\\*" },
              {
                has: {
                  kind: "export_specifier",
                  stopBy: "end",
                  not: {
                    regex: "^type\\s"
                  }
                }
              }
            ]
          }
        },
        {
          inside: {
            kind: "string",
            inside: {
              kind: "arguments",
              inside: {
                kind: "call_expression",
                has: {
                  field: "function",
                  regex: "^(import|require)$"
                }
              }
            }
          }
        }
      ]
    }
  });
}
function getScriptContentFromVue(filename) {
  const { descriptor: result } = parse(fs2.readFileSync(filename, "utf-8"));
  const { script, scriptSetup } = result;
  const scriptNode = script || scriptSetup;
  return scriptNode?.content;
}
function getImportSpecifiers(filePath, excludeTypes = false) {
  const fileContent = filePath.endsWith(".vue") ? getScriptContentFromVue(filePath) ?? "" : fs2.readFileSync(filePath, "utf8");
  const nodes = excludeTypes ? getTypeExcludedImportNodes(fileContent) : getImportNodes(fileContent);
  return nodes.map((node) => node.text());
}

// src/circle.ts
import {
  getTsconfig,
  createPathsMatcher
} from "get-tsconfig";
async function circularDepsDetect(options) {
  let {
    cwd = process.cwd(),
    ignore = [],
    absolute = false,
    filter,
    excludeTypes = false
  } = options || {};
  ignore = [.../* @__PURE__ */ new Set([...ignore, "**/{.git,node_modules,dist}/**"])];
  const globPattern = `**/*.{${extensions.join(",")}}`;
  logger.info(
    `Working directory is ${chalk3.underline.cyan(path2.resolve(cwd))}`
  );
  logger.info(`Ignored paths: ${ignore.map((v) => chalk3.yellow(v)).join(",")}`);
  const tsconfig = [
    "tsconfig.json",
    "jsconfig.json"
  ].reduceRight(
    (config, filename) => config ?? getTsconfig(cwd, filename),
    null
  );
  if (tsconfig?.config.compilerOptions?.paths) {
    logger.info(`Config file detected: ${chalk3.cyan(tsconfig.path)}`);
  }
  const runner = new Listr(
    [
      {
        title: `Globbing files with ${chalk3.underline.cyan(globPattern)}`,
        task: async (_, task) => task.newListr([
          {
            title: "Wait a moment...",
            task: async (ctx, task2) => {
              const files = await globby(globPattern, {
                absolute: true,
                cwd,
                ignore
              });
              task2.title = `${chalk3.cyan(files.length)} files were detected.`;
              ctx.files = files;
            }
          }
        ])
      },
      {
        title: "Pulling out import specifiers from files...",
        rendererOptions: { outputBar: 1 },
        task: async ({ files, entries }, task) => {
          const pathMatcher = tsconfig && createPathsMatcher(tsconfig);
          const getRealPathOfSpecifier = (filename, specifier) => revertExtension(
            specifier.startsWith(".") ? path2.resolve(path2.posix.dirname(filename), specifier) : pathMatcher?.(specifier)[0] ?? specifier
          );
          for (const [i, filename] of files.entries()) {
            task.output = `${i + 1}/${files.length} - ${filename}`;
            const relFileName = path2.relative(cwd, filename);
            const deps = [];
            for (const value of getImportSpecifiers(filename, excludeTypes)) {
              const resolvedPath = getRealPathOfSpecifier(filename, value);
              resolvedPath && deps.push(resolvedPath);
            }
            entries.push(
              absolute ? [filename, deps] : [relFileName, deps.map((v) => path2.relative(cwd, v))]
            );
          }
        }
      },
      {
        title: "Analyzing circular dependencies...",
        task: async (_, task) => task.newListr([
          {
            title: "Wait a moment...",
            task: async (ctx, task2) => {
              let result2 = analyzeGraph(ctx.entries).cycles;
              if (filter) {
                const matcher = minimatch.filter(filter);
                result2 = result2.filter((v) => v.some(matcher));
              }
              task2.title = `${chalk3.cyan(result2.length)} circles were found${filter ? `, filtered with ${chalk3.yellow(filter)}` : ""}.`;
              ctx.result = result2;
            }
          }
        ])
      }
    ],
    {
      ctx: { entries: [], result: [], files: [] },
      rendererOptions: {
        collapseSubtasks: false,
        timer: PRESET_TIMER
      }
    }
  );
  const { result } = await runner.run();
  return result;
}

export {
  logger,
  printCircles,
  circularDepsDetect
};
