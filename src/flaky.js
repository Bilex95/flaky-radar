// Compares JUnit XML results from several CI runs of the same suite and
// separates FLAKY tests (passed in some runs, failed in others) from tests
// that are genuinely BROKEN (failed every time they ran).

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m]);

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = decode(m[2]);
  return out;
}

// Minimal JUnit parser: enough for the XML that Jest, Playwright, pytest,
// Maven Surefire and most CI tools emit. Returns [{ id, status }].
function parseJUnit(xml) {
  const results = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const a = attrs(m[1]);
    if (!a.name) continue;
    const body = m[3] || "";
    const status = /<(failure|error)\b/.test(body) ? "failed" : /<skipped\b/.test(body) ? "skipped" : "passed";
    results.push({ id: a.classname ? `${a.classname} › ${a.name}` : a.name, status });
  }
  return results;
}

// runs: [{ name, results: [{ id, status }] }]
function analyze(runs) {
  const tests = new Map();
  for (const run of runs) {
    for (const r of run.results) {
      const t = tests.get(r.id) || { id: r.id, passed: 0, failed: 0, skipped: 0, failedIn: [] };
      t[r.status]++;
      if (r.status === "failed") t.failedIn.push(run.name);
      tests.set(r.id, t);
    }
  }
  const all = [...tests.values()].map((t) => ({ ...t, failRate: t.failed / (t.passed + t.failed || 1) }));
  const byRate = (a, b) => b.failRate - a.failRate || a.id.localeCompare(b.id);
  return {
    runs: runs.length,
    total: all.length,
    flaky: all.filter((t) => t.passed > 0 && t.failed > 0).sort(byRate),
    broken: all.filter((t) => t.failed > 0 && t.passed === 0).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

const cell = (s) => String(s).replace(/\|/g, "\\|");

function toMarkdown(report) {
  const lines = [
    "## Flaky test report",
    "",
    `${report.runs} run(s), ${report.total} test(s): **${report.flaky.length} flaky**, **${report.broken.length} consistently failing**.`,
  ];
  if (report.flaky.length) {
    lines.push("", "### Flaky (passed and failed across runs)", "", "| Test | Failed / ran | Fail rate | Failed in |", "| --- | --- | --- | --- |");
    for (const t of report.flaky) {
      lines.push(`| ${cell(t.id)} | ${t.failed} / ${t.passed + t.failed} | ${Math.round(t.failRate * 100)}% | ${cell(t.failedIn.join(", "))} |`);
    }
  }
  if (report.broken.length) {
    lines.push("", "### Consistently failing (fix these first — they are not flaky)", "");
    for (const t of report.broken) lines.push(`- ${t.id}`);
  }
  if (!report.flaky.length && !report.broken.length) lines.push("", "No flaky or failing tests. 🎉");
  return lines.join("\n");
}

module.exports = { parseJUnit, analyze, toMarkdown };
