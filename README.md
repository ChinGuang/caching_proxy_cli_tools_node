# caching_proxy_cli_tools_node
 a CLI tool that starts a caching proxy server, it will forward requests to the actual server and cache the responses. If the same request is made again, it will return the cached response instead of forwarding the request to the server.

Project URL: https://roadmap.sh/projects/caching-server

```caching-proxy --port <number> --origin <url>```

- --port is the port on which the caching proxy server will run.<br>
- --origin is the URL of the server to which the requests will be forwarded.

```caching-proxy --clear-cache```
- a way to clear the cache

Development Time: about 5 hrs (exclude rest time, start at 7 March 2026, end at 8 March 2026)

Without Express: switch to `without-express` branch
