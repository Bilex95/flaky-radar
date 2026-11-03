const test = require("node:test");
const assert = require("node:assert");
const { parseJUnit, analyze, toMarkdown } = require("../src/flaky");

const xml = (cases) => `<testsuites><testsuite name="s">${cases}</testsuite></testsuites>`;

test("parses passed, failed, errored and skipped testcases", () => {
  const results = parseJUnit(
    xml(
      '<testcase classname="a" name="ok"/>' +
        '<testcase classname="a" name="bad"><failure message="x">boom</failure></testcase>' +
        '<testcase classname="a" name="err"><error/></testcase>' +
        '<testcase classname="a" name="skip"><skipped/></testcase>' +
        '<testcase name="no class &amp; entity"></testcase>'
    )
  );
  assert.deepStrictEqual(
    results.map((r) => [r.id, r.status]),
    [
      ["a › ok", "passed"],
      ["a › bad", "failed"],
      ["a › err", "failed"],
      ["a › skip", "skipped"],
      ["no class & entity", "passed"],
    ]
  );
});

test("mixed outcomes are flaky; always-failing is broken, not flaky", () => {
  const runs = [
    { name: "r1", results: [{ id: "t1", status: "failed" }, { id: "t2", status: "failed" }, { id: "t3", status: "passed" }] },
    { name: "r2", results: [{ id: "t1", status: "passed" }, { id: "t2", status: "failed" }, { id: "t3", status: "passed" }] },
    { name: "r3", results: [{ id: "t1", status: "failed" }, { id: "t2", status: "failed" }, { id: "t3", status: "skipped" }] },
  ];
  const report = analyze(runs);
  assert.deepStrictEqual(report.flaky.map((t) => [t.id, t.failed, t.passed, t.failedIn]), [["t1", 2, 1, ["r1", "r3"]]]);
  assert.deepStrictEqual(report.broken.map((t) => t.id), ["t2"]);
  assert.strictEqual(report.total, 3);
});

test("flaky tests are ranked by fail rate", () => {
  const runs = ["r1", "r2", "r3", "r4"].map((name, i) => ({
    name,
    results: [
      { id: "rarely", status: i === 0 ? "failed" : "passed" },
      { id: "often", status: i < 3 ? "failed" : "passed" },
    ],
  }));
  assert.deepStrictEqual(analyze(runs).flaky.map((t) => t.id), ["often", "rarely"]);
});

test("markdown report has a flaky table and a broken list", () => {
  const md = toMarkdown(
    analyze([
      { name: "r1", results: [{ id: "x | y", status: "failed" }, { id: "z", status: "failed" }] },
      { name: "r2", results: [{ id: "x | y", status: "passed" }, { id: "z", status: "failed" }] },
    ])
  );
  assert.match(md, /2 run\(s\), 2 test\(s\): \*\*1 flaky\*\*, \*\*1 consistently failing\*\*/);
  assert.match(md, /\| x \\\| y \| 1 \/ 2 \| 50% \| r1 \|/);
  assert.match(md, /- z/);
});
