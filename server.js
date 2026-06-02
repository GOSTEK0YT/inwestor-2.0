const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT || 4175);
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "accounts.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function defaultData() {
  return {
    users: {
      admin: {
        passwordHash: hashPassword("codex"),
        createdAt: Date.now(),
        role: "admin"
      }
    },
    saves: {},
    sessions: {}
  };
}

function readData() {
  try {
    if (!fs.existsSync(dataFile)) return defaultData();
    const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    data.users = data.users || {};
    data.saves = data.saves || {};
    data.sessions = data.sessions || {};
    if (!data.users.admin) data.users.admin = defaultData().users.admin;
    return data;
  } catch {
    return defaultData();
  }
}

function writeData(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function normalizeLogin(login) {
  return String(login || "").trim().toLowerCase();
}

function publicUser(login, user) {
  return {
    login,
    role: user.role || "player",
    createdAt: user.createdAt
  };
}

function createSession(data, login) {
  const token = crypto.randomBytes(24).toString("hex");
  data.sessions[token] = { login, createdAt: Date.now() };
  return token;
}

function authLogin(data, token) {
  const session = data.sessions[token];
  return session && data.users[session.login] ? session.login : null;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Za duze dane."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Niepoprawne dane JSON."));
      }
    });
  });
}

async function handleApi(req, res, pathname) {
  try {
    const body = req.method === "GET" ? {} : await readBody(req);
    const data = readData();
    const token = req.headers.authorization || "";

    if (pathname === "/api/register" && req.method === "POST") {
      const login = normalizeLogin(body.login);
      const password = String(body.password || "");
      if (login.length < 3) return sendJson(res, 400, { message: "Login musi miec minimum 3 znaki." });
      if (password.length < 3) return sendJson(res, 400, { message: "Haslo musi miec minimum 3 znaki." });
      if (data.users[login]) return sendJson(res, 409, { message: "Takie konto juz istnieje." });

      data.users[login] = { passwordHash: hashPassword(password), createdAt: Date.now(), role: "player" };
      const newToken = createSession(data, login);
      writeData(data);
      return sendJson(res, 200, { token: newToken, user: publicUser(login, data.users[login]), save: null });
    }

    if (pathname === "/api/login" && req.method === "POST") {
      const login = normalizeLogin(body.login);
      const password = String(body.password || "");
      const user = data.users[login];
      if (!user || user.passwordHash !== hashPassword(password)) {
        return sendJson(res, 401, { message: "Zly login albo haslo." });
      }

      const newToken = createSession(data, login);
      writeData(data);
      return sendJson(res, 200, { token: newToken, user: publicUser(login, user), save: data.saves[login] || null });
    }

    const login = authLogin(data, token);
    if (!login) return sendJson(res, 401, { message: "Brak aktywnej sesji." });

    if (pathname === "/api/me" && req.method === "GET") {
      return sendJson(res, 200, { user: publicUser(login, data.users[login]), save: data.saves[login] || null });
    }

    if (pathname === "/api/save" && req.method === "PUT") {
      data.saves[login] = body.save || null;
      writeData(data);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/logout" && req.method === "POST") {
      delete data.sessions[token];
      writeData(data);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/reset" && req.method === "POST") {
      delete data.saves[login];
      writeData(data);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/account" && req.method === "DELETE") {
      if (login === "admin") return sendJson(res, 403, { message: "Konta admin nie mozna usunac." });
      delete data.users[login];
      delete data.saves[login];
      Object.entries(data.sessions).forEach(([sessionToken, session]) => {
        if (session.login === login) delete data.sessions[sessionToken];
      });
      writeData(data);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { message: "Nie znaleziono API." });
  } catch (error) {
    return sendJson(res, 400, { message: error.message || "Blad serwera." });
  }
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(rootDir, cleanPath));

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(rootDir, "index.html"), (indexError, indexContent) => {
        if (indexError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
        res.end(indexContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

writeData(readData());

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url.pathname);
    return;
  }
  serveStatic(req, res, url.pathname);
}).listen(port, () => {
  console.log(`Inwestor 2.0 dziala na porcie ${port}`);
});
