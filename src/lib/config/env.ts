import fs from "node:fs";
import path from "node:path";

export function loadLocalEnvironment() {
  const candidates = [".env.local", ".env"];
  for (const filename of candidates) {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL no está configurada. Ejecuta `neon env pull --file .env.local` o configura .env.local.");
  }
}
