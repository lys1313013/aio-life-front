#!/usr/bin/env node
import {
  circularDepsDetect,
  logger,
  printCircles
} from "./chunk-UHB6UPTV.js";

// src/cli.ts
import { fs, chalk } from "zx";
import { program } from "commander";
import updateNotifier from "update-notifier";
import nodeCleanup from "node-cleanup";

// package.json
var name = "circular-dependency-scanner";
var version = "2.3.0";
var description = "Out-of-box and zero configuration circular dependencies detector, with both JavaScript API and Command Line Tool.";

// src/cli.ts
var startAt = Date.now();
nodeCleanup(
  (exitCode) => console.log(
    exitCode ? `${chalk.red.bold("error")} Command failed with exit code ${exitCode}.` : `\u2728 Done in ${((Date.now() - startAt) / 1e3).toFixed(2)}s.`
  )
);
program.version(version).description(description).showHelpAfterError("(add --help for additional information)").hook(
  "preAction",
  () => updateNotifier({ pkg: { name, version } }).notify({
    isGlobal: true
  })
);
program.argument("[path]", "command execute path. (default: process.cwd())").option("--filter <pattern>", "glob pattern to filter output circles.").option(
  "--exclude-types",
  "exclude pure type-references when calculating circles."
).option(
  "--absolute",
  "print absolute path instead. usually use with editor which can quickly jump to the file.",
  false
).option(
  "-o, --output <filename>",
  "output the analysis into specified json file."
).option("-i, --ignore <patterns...>", "glob patterns to exclude matches.", [
  "**/{.git,node_modules,dist}/**"
]).option("-t, --throw", "exit with code 1 when cycles're found.", false).action(async (cwd, options) => {
  const { output, throw: isThrow, ...rest } = options;
  const cycles = await circularDepsDetect({
    ...rest,
    cwd
  });
  if (!cycles.length) return;
  if (output) {
    fs.writeFileSync(
      output || "circles.json",
      JSON.stringify(cycles, null, 2)
    );
    logger.info(
      `Output has been redirected to ${chalk.cyan.underline(output)}`
    );
  } else {
    printCircles(cycles);
  }
  if (isThrow) {
    logger.error("Command failed with exit code 1");
    process.exit(1);
  }
});
program.parse();
