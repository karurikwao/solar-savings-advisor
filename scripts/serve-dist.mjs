import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const args = process.argv.slice(2);
const portArg = args.find((arg, index) => ["--port", "-p"].includes(args[index - 1]) || arg.startsWith("--port="));
const port = Number(
  process.env.PORT ||
    (portArg?.startsWith("--port=") ? portArg.split("=")[1] : portArg) ||
    4178
);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalizedPath === path.sep ? "index.html" : normalizedPath.replace(/^[/\\]/, "");
  const directPath = path.join(distDir, relativePath);

  const candidates = [
    directPath,
    `${directPath}.html`,
    path.join(directPath, "index.html"),
  ];

  return candidates.find((candidate) => {
    const relative = path.relative(distDir, candidate);
    return relative && !relative.startsWith("..") && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  });
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");
  const resolvedPath = filePath ?? path.join(distDir, "404.html");

  if (!fs.existsSync(resolvedPath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(resolvedPath);
  response.writeHead(filePath ? 200 : 404, {
    "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
  });
  fs.createReadStream(resolvedPath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving dist at http://127.0.0.1:${port}`);
});
