#!/usr/bin/env node --use-system-ca
import assert from "node:assert";
import { parseArgs, type ParseArgsOptionDescriptor as Options } from "node:util";
import app from 'express';
import http from 'node:http';
import https from 'node:https';


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

  if (clearCache) {
    // clear cache
  } else {
    const server = app();
    const target = new URL(origin!);
    server.use((req, res) => {
      const isHttps = target.protocol == 'https:'
      const httpProtocolUsed = isHttps ? https : http;
      const clientReq = httpProtocolUsed.request({
        hostname: target.hostname,
        protocol: target.protocol,
        path: req.originalUrl,
        method: req.method,
        headers: {
          ...req.headers,
          host: target.hostname,
        },
      }, (clientRes) => {
        res.setHeader("X-Cache", "MISS")
        res.writeHead(clientRes.statusCode || 200, clientRes.headers);
        clientRes.pipe(res);
      });
      req.pipe(clientReq);
    });
    server.listen(port);
  }
} catch (error) {
  console.error("Invalid arguments:", error);
}
