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

## 11b. One screen, not a workflow

The first build had a New Test wizard *and* a Testing Day mode, and required a
gym to be created before a testing day, which needed an athlete registered
before a session, which needed eleven steps clicked through before a number
could be typed. That is a database schema wearing a user interface. What a
coach actually does is turn up somewhere, work through a list of people, and
write numbers down.

So the front door is now one screen. The gym is a text field, not an entity —
a testing day *is* a gym name and a date, so today's list is derived by asking
which sessions share them, and there is no event record to keep in step.
Athletes are created by typing a name; a name already on file is offered as a
retest with their details filled in. Data entry is a single scrolling page with
every test on it, and typing a value marks that test as done rather than
needing its own tap.

Navigation went from nine tabs to four: Testing, Athletes, Reports, More. The
depth did not go anywhere — gym view, database, benchmarks, protocol and
settings all still exist, behind More, because they are what a coach uses
between testing days rather than during one.

## 12. No server, and how the data survives anyway

No backend, no account, no database service: the app works in a basement gym
with no signal, nothing leaves the device unless the coach sends it, and there
is nothing to run or pay for.

The first build kept everything in `localStorage`, and that was the wrong
default for a coach who travels between gyms. Browser storage is not a filing
cabinet — clearing site data wipes it, losing the device loses it, and iOS
Safari evicts script-writable storage for sites left unopened for about a week,
which describes a gym visited quarterly exactly. "Remember to export" is not a
system.

So the source of truth is now **a file the coach picks**, written through the
File System Access API on every change. Put it in iCloud Drive or Dropbox and
the sync service the coach already pays for becomes the backend, with no
service to sign up for and nothing new to trust. Browser storage stays behind
it as a same-device cache. Where the API does not exist — Safari on iPad and
iPhone, Firefox — the app falls back to browser storage, counts the changes
that are not in a file anywhere, and says so in the header and in a banner
rather than failing quietly.

Three supporting decisions follow from that:

- **Opening an existing workbook loads the file, not the browser.** Otherwise
  opening last month's file would overwrite it with whatever this browser
  happened to be holding.
- **Permission is never faked.** A browser cannot silently re-grant file
  access, so a workbook that needs asking again shows a Reconnect button and
  the header stops claiming to be saved.
- **Import gained a merge mode**, because a coach testing on an iPad and
  keeping the master on a laptop needs to combine the two, not choose. Merge
  adds new records, takes the more recently edited copy of a session, keeps
  this device's athlete records (they carry consent and notes edited here on
  purpose), and ignores the other file's settings and custom reference sets —
  silently adopting another installation's scoring rules would change every
  percentile without saying so.

Fixing that last point exposed a real bug: `deriveSession` stamped `updatedAt`,
and derivation runs on every load and every render. Every imported session
therefore looked newer than the local copy and would have won every merge.
`updatedAt` now means "a person changed this", stamped only where an edit is
accepted.

A web app manifest lets iOS and Android install the app to the Home Screen,
which both makes it launch like an app and makes the operating system far less
willing to evict its storage.

Every file is a plain classic script rather than an ES module, so `index.html`
opens straight from the filesystem with no web server.
