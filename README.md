# flaky-radar

Compare JUnit XML results from several CI runs and separate the flaky tests from the ones that are genuinely broken.

## The problem

A red build comes in. Is it a real regression or "that coupon test again"? Teams lose hours re-running pipelines, and over time they learn to ignore red — which is exactly how real bugs slip through. Nobody has a list of which tests flip between pass and fail, how often, or whether a "flaky" test is actually failing every single time.

## Who it's for

QA engineers, SDETs and developers who own a CI test suite and need evidence for which tests to quarantine, fix, or trust — and a short report they can share with the team.

## What it does

- Reads two or more JUnit XML files (the format Jest, Playwright, pytest, Maven Surefire and most CI tools can emit), one per run of the same suite.
- Marks a test **flaky** if it passed in some runs and failed in others, and ranks flaky tests by fail rate.
- Lists tests that failed in **every** run separately — those are broken, not flaky, and should be fixed first.
- Prints a Markdown report; `--fail-on-flaky` exits with code 1 so a scheduled CI job can raise the alarm.

## Try it

Requires Node 18+. No install step, no dependencies.

```bash
node cli.js examples/run-1.xml examples/run-2.xml
node cli.js examples/run-1.xml examples/run-2.xml --fail-on-flaky; echo $?
node --test
```

The two sample runs show 2 flaky tests and 1 test that failed both times.

## Acceptance criteria

- `failure` and `error` count as failed, `skipped` as neither passed nor failed.
- A test that both passed and failed across runs is flaky; one that failed every run is listed as consistently failing, not flaky.
- Flaky tests are ranked by fail rate and show which runs they failed in.
- XML entities in test names (`&amp;`) are decoded; pipes in names don't break the table.
- `--fail-on-flaky` exits 1 only when at least one flaky test is found.

## How it's built

`src/flaky.js` has three pure functions: `parseJUnit` (a small regex-based reader for `<testcase>` elements, no XML library needed), `analyze` (counts outcomes per test across runs), and `toMarkdown`. `cli.js` only reads files and handles flags.

## Limits and safety

- The parser handles the common JUnit shapes, not every XML edge case (CDATA in names, namespaces). Malformed testcases are skipped rather than guessed.
- Tests are matched across runs by `classname › name`; renaming a test makes it look like a new one.
- Two runs is the minimum; flakiness rates become meaningful with 10+ runs.
- It reads local files only and doesn't quarantine or skip anything by itself — a person decides what to do with each flaky test.

## Contribute

- Accept a directory of XML files instead of listing each one.
- Show average duration per test — slow tests are often the flaky ones.
- Output JSON so a dashboard can track flakiness over time.

---

Scaffolded by an automated weekly pipeline, then refined by hand — see the factory repo for how it works.
