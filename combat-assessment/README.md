# PGP COMBAT ATHLETE PERFORMANCE ASSESSMENT

**TEST. BENCHMARK. IDENTIFY. TRAIN. RETEST.**

A repeatable physical performance testing, benchmarking and reporting system for
MMA, Muay Thai and boxing gyms. It runs entirely in a browser, needs no server
and no network, and is built to test a squad of 10–30 athletes in a day.

It answers four questions for every athlete:

1. **Where am I now?** — a benchmarked profile across seven physical qualities
2. **What am I good at?** — top physical strengths
3. **What should I develop?** — development priorities and training guidance
4. **Did I improve?** — change at retest, measured against measurement error

It does **not** diagnose injury, assess injury risk, predict fighting ability,
or rank athletes as competitors. It measures physical performance qualities.

---

## Setup

There is nothing to install and nothing to build.

**Locally:** download or clone this folder and open `index.html` in any modern
browser. It works from `file://` — no web server needed.

**On an iPad or phone:** put the folder in iCloud Drive / Google Drive / Dropbox
and open `index.html`, or host the folder on any static host (GitHub Pages,
Netlify) and add the page to your home screen.

**Hosted, if you prefer:** any static host works, because there is no backend.

```
combat-assessment/
├── index.html              the application
├── css/app.css             dark UI theme
├── css/print.css           A4 report layout for print / Save as PDF
├── js/config/tests.js      the test battery: metrics, ranges, protocols, evidence
├── js/config/benchmarks.js the reference database  ← edit this as data improves
├── js/config/settings.js   levels, weights, thresholds, protocol version
├── js/config/protocol.js   SOP, testing order, design rationale, limitations
├── js/core/stats.js        statistical primitives
├── js/core/calc.js         the calculation engine (pure, documented)
├── js/core/validate.js     data validation
├── js/core/model.js        data model and derivation
├── js/core/engine.js       benchmarking, scoring, profiling, retest, aggregates
├── js/core/store.js        localStorage persistence
├── js/core/csv.js          CSV / JSON export and import
├── js/data/sample.js       fictional sample and quality-control athletes
├── js/ui/                  views (one file per page) and charts
└── tests/qc.html           the self-test suite — open it and press run
```

### First run

The app opens with a **fictional sample database** so you can see everything
working. Every sample athlete is invented. Before you enter a real athlete, go
to **Settings → Data → Remove all sample athletes**, so your gym aggregates and
your PGP internal norms are built from real data only.

### Backups — read this one

The database lives in **one browser on one device**. There is no server and no
account. Clearing site data deletes it.

**Export a JSON backup after every testing day.** Settings → Data → Export JSON
backup. That file is the only backup that exists.

---

## The battery

| # | Test | Category | Benchmarked metric |
|---|------|----------|--------------------|
| 1 | Countermovement jump | Power | Jump height (cm) |
| 2 | Standing broad jump | Power | Distance (cm) |
| 3 | Single-leg broad jump | Power | Best leg (cm) + L/R difference as an observation |
| 4 | Rotational medicine-ball throw | Power | Best throw (cm), ball-mass specific |
| 5 | 10 m sprint | Speed | Best 10 m time (electronic timing only) |
| 6 | Trap-bar deadlift | Strength | Estimated 1RM ÷ body mass |
| 7 | Strict chin-ups | Strength | Valid reps, against a body-mass band |
| 8 | Weighted chin-up *(optional)* | Strength | Relative system mass (× BW) |
| 9 | Bench press *(optional)* | Strength | Estimated 1RM ÷ body mass |
| 10 | 12-minute air-bike test | Aerobic capacity | Average W/kg |
| 11 | 30-second air-bike sprint | Anaerobic power | Peak and mean W/kg |
| 12 | Repeated sprint, 6 × 15 s / 45 s | Repeated effort | Mean sprint W/kg + decrement |
| 13 | Movement screen *(optional)* | Movement | Criterion score, **not** a percentile |

The full written protocol for every test — purpose, equipment, set-up, warm-up,
what to say, attempts, rest, what to record, calculation, common errors, stop
criteria and standardisation — is on the **Protocol** page in the app.

---

## How to run a testing day

1. **Testing Day → New testing day.** Name it, set the gym and the tester.
2. **Add athletes to the queue**, or import a roster CSV (`name` is the only
   required column; `sex` is needed before any percentile can be produced).
3. Work down the queue. Tap an athlete, work through the eleven steps, and the
   app autosaves after every keystroke.
4. Mark anything you could not test as **Not tested** with a reason. Missing
   data is never scored as zero and never counts against the athlete.
5. At the end, generate reports and **export a JSON backup before you leave**.

The **testing order matters and is part of the protocol version.** It was
reviewed and changed from the original specification — see Protocol → Design
decisions for what changed and why. In short: the movement screen happens cold
before the warm-up, the glycolytic bike work happens before the long aerobic
test, and the standalone 30-second sprint is not run in the same session as the
repeated-sprint set.

---

## What the scores mean

**Percentile + performance level**, never an arbitrary score out of 100.

| Level | Percentile | Meaning |
|---|---|---|
| DEVELOPING | 0–25 | Lower relative performance in this quality |
| TRAINED | 25–65 | Established physical preparation |
| ADVANCED | 65–90 | High level of physical performance |
| HIGH PERFORMANCE | 90–100 | Exceptional relative performance |

These describe **measured physical performance relative to a reference
population**. They do not describe fighting ability, technical ability, fight
IQ, likelihood of winning, or professional status.

**Category scores** are the weighted mean of the contributing test *z-scores*,
converted back to a percentile — not a plain average of percentiles, which
distorts at the extremes. The contributing tests, the weights and the mean z are
printed on every report so the number can be reproduced by hand.

**There is no overall score by default, and that is the recommendation.** Two
athletes with an identical composite can need opposite training. The profile is
the product. A composite can be switched on in Settings if a customer insists,
and it is then labelled as an unvalidated convenience index.

---

## The standards are provisional — say so

Every numeric standard shipped in `js/config/benchmarks.js` is a **PGP
PROVISIONAL STANDARD**: a coaching-judgement reference point chosen to be
plausible for trained combat athletes. None of them is taken from a published
study.

This is deliberate. Filling the file with invented numbers dressed up as
literature values would make the whole product indefensible. Instead:

- every standard is labelled with where it came from, everywhere it is used;
- percentiles derived from provisional bands are shown **rounded to the nearest
  5**, because they do not support finer resolution;
- published data can be dropped in without touching any other file;
- **PGP's own database takes over as the reference source** once a matched group
  of athletes is large enough — computed and shown as supplementary at 20,
  promoted to the primary reference at 50, caveat dropped at 100 (all editable).

The **Benchmarks → Literature queue** page carries the reading list for
replacing provisional sets with published ones, and the workflow for doing it.

The right thing to say to a customer: *"benchmarked against PGP provisional
standards, which are being replaced by our own data as the database grows."*
Coaches trust the person who tells them what the numbers cannot do.

---

## When the app refuses to give you a percentile

By design, and it is the most important behaviour in the system. It reports
**"Insufficient reference data"** rather than fabricating a number when:

- the athlete's **sex** is not recorded (reference sets are never substituted);
- the athlete is **under 18** (adult standards do not apply to a maturing athlete);
- the **medicine-ball mass** has no matching reference set;
- the **air bike** is unrecorded, or is a different machine family;
- the sprint was **hand timed** (stopwatch error exceeds the gap between levels);
- the **repeated-sprint configuration** differs from the one the set was built on;
- the test was **started but not completed**;
- a value is **flagged for verification**.

---

## Retesting

Change is only called an improvement or a decline when it **exceeds the minimal
detectable change** (2.77 × typical error). Smaller changes are reported as
within measurement variation.

The typical-error values shipped are **conservative PGP placeholders**, not
measured values, and every verdict drawn from them is labelled provisional.
Replacing them needs PGP's own reliability study: two trials on separate days,
same tester, same equipment, at least ten athletes, per test.

The app also refuses to compare across protocol versions, and flags a retest
where the equipment changed.

---

## Exports

| Export | What it is |
|---|---|
| **JSON backup** | Everything, full fidelity. Round-trips without loss. The only backup. |
| **Raw results CSV** | One row per session: every attempt and calculated metric. A test that was not performed exports as an **empty cell** with its reason alongside — never a zero. |
| **Scores CSV** | Percentiles, levels, category scores, strengths and priorities, for Excel or Sheets. |
| **Athlete roster CSV** | The athlete list, and the format the roster importer expects. |

Reports print to a clean A4 PDF: open a report and use the browser's print
dialog → **Save as PDF**, A4 portrait, background graphics on.

---

## Protocol versioning

Every session records the protocol version it ran under, and the app will not
compare results across versions.

**Bump `PROTOCOL_VERSION` in `js/config/settings.js`** whenever a change makes
results non-comparable: a different air-bike protocol, a different sprint
recovery period, a change to the jump procedure or device standard, a different
strength rep scheme, or a change to the scoring methodology. Add a note to
`PROTOCOL_VERSION_NOTES` saying what changed — in two years it is the only way
to know why two numbers are not comparable.

---

## Quality control

Open `tests/qc.html`, or **Settings → Quality control → Run the self-test
suite**. Sixty checks run against seven fixture athletes: normal results, very
high, very low, missing tests, different body weight and sex, a retest with a
changed protocol, and deliberately invalid input.

From the command line: `node tests/qc.js`.

Run it after changing any setting, weight or benchmark anchor.

---

## Assumptions and limitations

The **Protocol → Assumptions & limitations** page in the app is deliberately
prominent and is worth reading in full before selling this service. It covers:
norms are population-specific; equipment differences; protocol consistency;
percentiles are not fighting ability; performance testing does not diagnose
injury; which tests have strong evidence and which do not; the reliability
values are placeholders; there is no validated overall score; and the
provisional standards need validating against real data.

---

*PGP Elite Performance · Protocol PGP v1.0*
