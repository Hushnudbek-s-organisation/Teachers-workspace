// ============================================================================
// scripts/mock-supabase.mjs — mahalliy "soxta Supabase" (server testlari uchun)
//
//   MODE=fail (default) → har so'rovga 401:
//       {"message":"Invalid API key - Double check your Supabase 'anon` or
//        'service_role' API key."}
//     (production'dagi haqiqiy holat: kalit noto'g'ri)
//
//   MODE=ok → har GET so'rovga 200 + content-range (17/17 "hammasi joyida");
//     POST/PATCH → 201. Sxema sog'lom baza holatini taqlid qiladi.
//
// Ishga tushirish (o'z-o'zini imzolagan sertifikat kerak):
//   openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
//     -keyout /tmp/certs/key.pem -out /tmp/certs/cert.pem \
//     -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1"
//   MODE=fail CERT_PATH=/tmp/certs/cert.pem KEY_PATH=/tmp/certs/key.pem \
//     node scripts/mock-supabase.mjs
// ============================================================================

import https from "node:https";
import fs from "node:fs";

const MODE = process.env.MODE ?? "fail";
const PORT = Number(process.env.PORT ?? 9443);
const CERT = process.env.CERT_PATH ?? new URL("./.mock-certs/cert.pem", import.meta.url).pathname;
const KEY = process.env.KEY_PATH ?? new URL("./.mock-certs/key.pem", import.meta.url).pathname;

const INVALID_KEY_MSG =
  "Invalid API key - Double check your Supabase 'anon' or 'service_role' API key.";

const server = https.createServer(
  { key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) },
  (req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = req.url ?? "/";
      console.log(`[mock-supabase:${MODE}] ${req.method} ${url}`);

      if (MODE === "fail") {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: INVALID_KEY_MSG }));
        return;
      }

      // ------------------------------ MODE=ok ------------------------------
      if (req.method === "GET" || req.method === "HEAD") {
        res.writeHead(200, {
          "content-type": "application/json",
          "content-range": "*/17",
        });
        res.end(url.includes("limit=") || !url.endsWith("/") ? "[]" : "");
        return;
      }
      if (req.method === "DELETE") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("[]");
        return;
      }
      // POST / PATCH / PUT → yozuvni qaytaradi
      let parsed = {};
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        /* bo'sh body */
      }
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]));
    });
  }
);

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-supabase] MODE=${MODE} https://127.0.0.1:${PORT}`);
});
