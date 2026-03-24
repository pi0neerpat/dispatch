#!/usr/bin/env node
/**
 * protect-env.js — Claude Code hook to block reading and editing .env files.
 * Prevents Read, Edit, Grep, and Write tool calls targeting .env or .env.* (except .env.example).
 */

const fs = require("fs");
const path = require("path");

const input = JSON.parse(fs.readFileSync(0, "utf-8"));
const toolInput = input.tool_input || {};
const filePath =
  toolInput.file_path || toolInput.path || toolInput.target_file || "";

if (!filePath) {
  process.exit(0);
}

const filename = path.basename(filePath);

if (filename === ".env") {
  process.stderr.write(
    "Blocked: Cannot read or modify .env files (secrets). Use .env.example as reference.\n"
  );
  process.exit(2);
}

if (filename.startsWith(".env.") && filename !== ".env.example") {
  process.stderr.write(
    "Blocked: Cannot read or modify .env files (secrets). Use .env.example as reference.\n"
  );
  process.exit(2);
}

process.exit(0);
