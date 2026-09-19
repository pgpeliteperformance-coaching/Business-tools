# Design decisions

Where this build departs from the original specification, and why. Every change
below is surfaced in the app itself (Protocol → Design decisions) rather than
made silently.

---

## 1. The testing order changed

**Three changes to the proposed order.**

**The movement screen stays before the warm-up, and the reason is now written
down.** A screen performed after fifteen minutes of mobility work measures the
warm-up, not the athlete. An athlete screened warm on one occasion and cold on
the next produces a change that means nothing. Consistency matters more than
which state you pick.

**The standalone 30-second bike sprint was removed from the default
single-session battery.** The proposed order was: 12-minute aerobic test →
recovery → 30-second sprint → repeated-sprint test. Three maximal bike efforts
in one session cannot all be valid, and putting the 12-minute test first
guarantees that both subsequent maximal efforts are performed on an athlete who
has just finished the hardest twelve minutes of their week. The 30-second test
and the 6 × 15 s set also measure heavily overlapping qualities, and peak power
from sprint 1 of the repeated set already indexes maximal power output. Both
tests remain fully implemented — run the 30-second test when anaerobic power is
the specific question, or on a second visit.

**The glycolytic work moved ahead of the aerobic test.** Neither order is free
of contamination, but they are not equally bad: a 12-minute maximal effort
leaves an athlete unable to produce peak power for the rest of the day, whereas
a 15-second sprint set followed by a genuine 20–30 minute recovery block still
allows a credible 12-minute effort. The sustained test absorbs the
contamination because it is the more robust of the two to prior fatigue.

**The recommendation the app cannot enforce.** The defensible version is two
sessions at least 24 hours apart: Session A (registration, anthropometry,
screen, warm-up, power, sprint, strength) and Session B (repeated-sprint,
recovery, 12-minute test). The single-session battery is a commercial
compromise and is described as one on the report.

---

## 2. There is no overall score

Averaging power, strength, aerobic capacity and repeated-effort percentiles into
one number implies those qualities are interchangeable and equally important.
Two athletes with an identical composite can need opposite training, which makes
the number worse than useless for the decision it looks like it is helping with.

The profile is the product. A composite index can be enabled in Settings for a
customer who insists, and it is then labelled as an unvalidated convenience
index with its method printed.

---

## 3. Category scores average z-scores, not percentiles

Percentiles are not a linear scale. A plain mean of percentiles distorts the
result at the extremes and lets an 85th and a 45th average to something that
misrepresents both. So: each test percentile → z-score → weighted mean →
back to a percentile. The contributing tests, the weights and the mean z are all
printed on the report, so any category score can be reproduced by hand.

Default weights are equal within a category, with two documented exceptions:

- **Bench press and weighted chin-up at 0.5.** The bench has the weakest
  combat-sport rationale in the battery; the weighted chin-up overlaps with the
  bodyweight chin-up and would otherwise double-count upper-body pulling.
- **Repeated effort at 70/30, mean sprint power over decrement.** An athlete who
  paces the first sprint posts a flattering decrement score with poor mean
  power. Weighting the amount of power higher stops that reading as a good
  result. The app never reports decrement on its own.

---

## 4. Provisional standards, labelled as such

Not one numeric standard shipped in `js/config/benchmarks.js` comes from a
published study. Entering means and standard deviations from memory rather than
from the paper is exactly how a testing product becomes indefensible, so the
file ships coaching-judgement band anchors, labelled `PGP_PROVISIONAL`
everywhere they are used, with `source.verified: false`.

Consequences carried through the whole system:

- Percentiles from provisional bands are **displayed rounded to the nearest 5**.
  The system cannot tell the 79th percentile from the 80th, and should not
  pretend to.
- A `PUBLISHED` reference set is refused unless its source is marked verified.
- `LITERATURE_QUEUE` in the same file carries the reading list and the workflow
  for replacing each provisional set, including one entry that is an honest
  **GAP**: no peer-reviewed reliability data for fan bikes could be located, so
  a PGP reliability study is the first internal research worth doing.

---

## 5. Band interpolation, and why the anchors are where they are

A band benchmark supplies the value at the 25th, 65th and 90th percentiles —
the three performance-level boundaries. The engine interpolates linearly between
them, extrapolates beyond the end anchors using the slope of the nearest
segment, and clamps to 1–99 so that no athlete ever scores a 0th or a 100th
percentile.

For a lower-is-better metric the values are negated first, so a faster sprint
time always produces a higher percentile.

Two better methods are implemented and take priority when data exists: a z-score
against a published mean and SD, and the empirical mid-rank percentile within
PGP's own matched sample.

---

## 6. Which metrics are normalised by body mass, and which are not

Nothing is divided by body mass simply because it can be.

| Normalised (per kg) | Absolute | Banded by body mass |
|---|---|---|
| Trap-bar estimated 1RM | Jump height | Chin-up repetitions |
| Bench estimated 1RM | Jump and throw distance | |
| Weighted chin-up system mass | Sprint time | |
| All air-bike power | | |

In a vertical or horizontal jump the athlete is already moving their own body
mass, so dividing by it double-counts. Sprint time is already a rate. Chin-up
repetitions scale *inversely* with body mass — a 95 kg athlete doing 10 reps is
not weaker than a 65 kg athlete doing 15 — so dividing reps by body mass would
be physiologically meaningless and body-mass bands are used instead.

---

## 7. The movement screen is a criterion score, not a percentile

It is reported as a percentage of the achievable score on the items actually
assessed, with its **own labels** (Limitations noted / Monitor / Acceptable /
Full range observed) rather than the performance-level names. Calling a movement
screen result "HIGH PERFORMANCE" would imply a percentile against other
athletes, which this number is not, because no defensible reference population
exists for a subjective screen.

It is excluded from the composite index and from the strengths and priorities
lists, the assessor is recorded because scores are not comparable between
assessors, and an unscored item is excluded from both the numerator and the
denominator — never counted as zero.

It makes no injury claim. The published evidence for movement screens as
injury-prediction tools is weak.

---

## 8. Strengths and priorities are not a sort on the percentile

A quality is reported as a strength only at or above the 60th percentile and as
a priority only at or below the 45th — results in between are not far enough
from the middle of the reference population to be called either.

Also excluded: tests that were not performed, values the validator flagged for
verification, and the criterion-scored movement screen. Ordering weights the
percentile by the test's measurement reliability and the reference set's
confidence. **At most one metric per test** contributes to each list — two
metrics from the same air-bike sprint are one finding, not two, and listing both
crowds out a genuinely different quality.

The thresholds are applied to the percentile the report **prints**, not the
unrounded one behind it. Otherwise a result shown as "45th percentile" could
fail a rule stated as "at or below the 45th", which reads as a bug to anybody
holding the report.

---

## 9. Missing data is missing

A test that was not performed has no value, no percentile, and no effect on any
category score, on the strengths and priorities lists, or on any gym aggregate.
It is recorded with a reason, printed on the report, and exported to CSV as an
**empty cell** — never a zero, which every downstream tool would read as a
result.

A new result starts as `pending`, which opens data entry and becomes `tested`
the moment a value is entered. At review, any test marked tested but carrying no
result is flagged rather than assumed either way.

---

## 10. The validator never corrects anything

Three severities — *error* (physically impossible or internally contradictory),
*verify* (possible but outside the expected range), *info* (worth knowing). The
message is always a request: "Please verify this value."

An error blocks benchmarking until resolved. A verify flag excludes the metric
from strengths and priorities. Neither ever changes the stored value, because an
unusual value can be real and a silently corrected one is a lie.

---

## 11. Colour is never the only signal

The performance-level scale is a **sequential single-hue gold ramp**, monotonic
in lightness, because performance level is an ordered magnitude rather than four
unrelated categories — and because four loud semantic colours would imply
"DEVELOPING = bad", which the app explicitly says it is not. Every mark that
uses the ramp is also labelled with the level name.

Reserved status colours (good / warning / critical) are used only for data
quality and retest verdicts, always paired with a glyph *and* a word. The
two-series categorical pair used in comparison charts was validated for
colour-vision-deficiency separation against this surface.

---

## 12. No server, and what that costs

`localStorage` only: it works in a gym with no signal, nothing leaves the device
unless you export it, and there is nothing to run or pay for. The cost is that
the database lives in one browser on one device, and an exported JSON file is
the only backup. The app says so on the Testing Day page, the Database page and
the Settings page, because it is the single most likely way for a coach to lose
a day's work.

Every file is a plain classic script rather than an ES module, so `index.html`
opens straight from the filesystem with no web server.
