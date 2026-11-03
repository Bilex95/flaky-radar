#!/usr/bin/env node
// Usage: node cli.js run-1.xml run-2.xml [...more runs] [--fail-on-flaky]
const fs = require("fs");
const path = require("path");
const { parseJUnit, analyze, toMarkdown } = require("./src/flaky");

const argv = process.argv.slice(2);
const failOnFlaky = argv.includes("--fail-on-flaky");
const files = argv.filter((a) => !a.startsWith("--"));

if (files.length < 2) {
  console.error("Usage: node cli.js <run-1.xml> <run-2.xml> [...] [--fail-on-flaky]  (needs at least 2 runs)");
  process.exit(2);
}

const runs = files.map((f) => ({ name: path.basename(f), results: parseJUnit(fs.readFileSync(f, "utf8")) }));
const report = analyze(runs);
console.log(toMarkdown(report));
if (failOnFlaky && report.flaky.length > 0) process.exit(1);
