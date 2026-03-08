#!/usr/bin/env node
import assert from "node:assert";
import { parseArgs, type ParseArgsOptionDescriptor as Options } from "node:util";
import app, { type Request, type Response } from 'express';
import http from 'node:http';
import https from 'node:https';
import { RedisModule } from "./redis.js";
import crypto from 'node:crypto';
import zlib from "zlib";

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
  const port = parsedArgs.values.port as string | undefined;
  const origin = parsedArgs.values.origin as string | undefined;
  const clearCache = parsedArgs.values["clear-cache"] as boolean;
  assert.notStrictEqual(!!port, !origin, "Port and origin must both be specified or both be omitted");
  assert.notStrictEqual(clearCache, !!port || !!origin, "Clear cache flag cannot be used with port or origin");
  await RedisModule.init();

  if (clearCache) {
    await RedisModule.clear();
    console.log("Cache cleared");
  } else {
    const server = app();
    const target = new URL(origin!);
    server.use(async (req, res) => {
      const isHttps = target.protocol == 'https:'
      const httpProtocolUsed = isHttps ? https : http;
      let cacheKey = `${req.method}:${req.originalUrl}`;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        let bodyData = '';
        req.on('data', chunk => {
          bodyData += chunk;
        });
        req.on('end', async () => {
          if (bodyData) {
            const bodyHash = bodyData
              ? crypto.createHash('sha256').update(bodyData).digest('hex')
              : '';
            cacheKey = `${cacheKey}:${bodyHash}`;
          }
          const isCached = await handleCache(req, res, cacheKey);
          if (isCached) {
            return;
          }
          sendProxiedRequestWithCache({
            httpProtocolUsed,
            req,
            res,
            target,
            preSendRequest: (clientReq) => {
              clientReq.write(bodyData);
            },
            handleCache: async (body) => {
              await RedisModule.hset(req.method, cacheKey, body);
            },
          });
        });
      } else {
        const isCached = await handleCache(req, res, cacheKey);
        if (isCached) {
          return;
        }
        sendProxiedRequestWithCache({
          httpProtocolUsed,
          req,
          res,
          target,
          handleCache: async (body) => {
            await RedisModule.hset(req.method, cacheKey, body);
          },
          preSendRequest: (clientReq) => { },
        });
      }

    });
    server.listen(port);
    console.log(`Server listening on port ${port}`);
  }
} catch (error) {
  console.error("Invalid arguments:", error);
}

async function handleCache(req: Request, res: Response, cacheKey: string): Promise<boolean> {
  const cachedResponseStr = await RedisModule.hget(req.method, cacheKey);
  if (cachedResponseStr) {
    const cachedResponse = JSON.parse(cachedResponseStr);
    res.setHeader("X-Cache", "HIT")
    res.json(cachedResponse);
    return true;
  }
  return false;
}

function sendProxiedRequestWithCache(payload: {
  httpProtocolUsed: typeof http | typeof https;
  req: Request; res: Response; target: { hostname: string; protocol: string };
  handleCache: (body: string) => Promise<void>;
  preSendRequest?: (req: http.ClientRequest) => void;
}) {
  const { httpProtocolUsed, req, res, target, preSendRequest, handleCache } = payload;
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
    const chunks: Buffer[] = [];

    clientRes.on("data", (chunk) => {
      chunks.push(chunk);
    });

    clientRes.on("end", async () => {
      const bodyBuffer = Buffer.concat(chunks);
      const encoding = clientRes.headers["content-encoding"];
      const decompressedBuffer = await decompress(bodyBuffer, encoding);
      const bodyJson = decompressedBuffer.toString();
      await handleCache(bodyJson);
      res.setHeader("X-Cache", "MISS");
      res.writeHead(clientRes.statusCode || 200, clientRes.headers);
      res.end(bodyBuffer);
    });
  });
  if (preSendRequest) {
    preSendRequest(clientReq);
  }
  clientReq.end();
}

function decompress(buffer: Buffer, encoding?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    switch (encoding) {
      case 'gzip':
        zlib.gunzip(buffer, (err, result) => err ? reject(err) : resolve(result));
        break;
      case 'deflate':
        zlib.inflate(buffer, (err, result) => err ? reject(err) : resolve(result));
        break;
      case 'br':
        zlib.brotliDecompress(buffer, (err, result) => err ? reject(err) : resolve(result));
        break;
      default:
        resolve(buffer);
    }
  });
}
