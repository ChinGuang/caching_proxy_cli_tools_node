#!/usr/bin/env node
import assert from "node:assert";
import { parseArgs, type ParseArgsOptionDescriptor as Options } from "node:util";

const options: Record<string, Options> = {
  "port": {
    type: "string",
    short: "p",
  },
  "origin": {
    type: "string",
    short: "o",
  },
  "clear-cache": {
    type: "boolean",
    short: "c",
  },
}

const args: string[] = process.argv.slice(2);
console.log("Arguments received:", args);
try {
  const parsedArgs = parseArgs({
    options,
    args,
  });
  console.log("Parsed arguments:", parsedArgs)
  const port = parsedArgs.values.port as string | undefined;
  const origin = parsedArgs.values.origin as string | undefined;
  const clearCache = parsedArgs.values["clear-cache"] as boolean;
  assert.notStrictEqual(!!port, !origin, "Port and origin must both be specified or both be omitted");
  assert.notStrictEqual(clearCache, !!port || !!origin, "Clear cache flag cannot be used with port or origin");
} catch (error) {
  console.error("Invalid arguments:", error);
}
