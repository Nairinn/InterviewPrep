// Debug Challenge seed problems — subtle silent-wrong-output bugs.
// Source code has NO comments revealing the bugs.
// Each problem ships with README.md, tickets/*.md (one per filed symptom),
// main.py + expected_output.txt for diff-based diagnosis, and a test suite.

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Weather Station Data Pipeline
// ─────────────────────────────────────────────────────────────────────────────

const wx_README = `# Weather Station Data Pipeline

Welcome to the Skyline team! Skyline ingests \`Reading\` records from
weather stations and produces aggregations, alerts, and smoothed time
series for the meteorologist dashboard. The pipeline runs without
throwing — but the numbers being reported are wrong, and customers have
noticed.

## Project Structure

\`\`\`
station.py    — Station + Reading data classes
aggregator.py — hourly_averages, daily_max
alerts.py     — heat / humidity / wind alert filters
trends.py     — trailing_average + smooth_readings
formatter.py  — c_to_f + format_alert
main.py       — runnable demo exercising every section
expected_output.txt — what main.py SHOULD print on a fixed pipeline
tickets/      — symptoms reported against the pipeline
\`\`\`

## Architecture

\`\`\`
Station ──► aggregator   (hourly_averages, daily_max)
   │   ──► alerts       (heat_alerts, humidity_alerts, wind_alerts)
   │   ──► trends       (smooth_readings → list)
   │   ──► formatter    (c_to_f for output formatting)
\`\`\`

- Inputs: \`Reading\` objects with \`ts\`, \`temp_c\`, \`humidity\`, \`wind_kph\`.
- Aggregators bucket by \`(year, month, day, hour)\` or \`(year, month, day)\`.
- Smoothing produces a derived series — it must NOT mutate input readings.

## How to work this problem

1. Read the tickets in \`tickets/\` — they describe what customers see.
2. Run \`main.py\` and diff against \`expected_output.txt\`.
3. Form a hypothesis per diverging section before reading the code.
4. Patch one bug at a time and re-verify.

## Reported Issues

- **WX-101** — Hourly averages look way too small
- **WX-102** — Heat alerts miss boundary readings
- **WX-103** — Smoothing trashes the station data
- **WX-104** — Celsius-to-Fahrenheit conversion is off
`;

const wx_t101 = `# WX-101: Hourly averages look way too small

**Status:** Open
**Priority:** P1
**Component:** Aggregator
**Reporter:** dashboard@skyline

## Description

The \`hourly_averages\` panel on the dashboard is showing numbers that are
much smaller than what the raw readings suggest. A bucket of \`[30, 32]\`
should average to **31**, but the dashboard sometimes shows numbers like
\`15\` or even smaller.

## Steps to reproduce

Add two readings at \`hour=10\` and two more at \`hour=12\`, then call
\`hourly_averages(station)\`.

## Expected behavior

\`{(2024, 6, 1, 10): 31.0, (2024, 6, 1, 12): 39.0, ...}\`

## Observed behavior

Numbers are dramatically lower; they appear to scale down as more data
flows in.
`;

const wx_t102 = `# WX-102: Heat alerts miss boundary readings

**Status:** Open
**Priority:** P0
**Component:** Alerts
**Reporter:** meteorology-ops@skyline

## Description

With \`heat_alerts(readings, threshold_c=30.0)\`, a reading of exactly
\`30°C\` should fire an alert. It doesn't. Our SOP defines threshold as
"30°C or above" — inclusive.

## Steps to reproduce

\`\`\`python
heat_alerts([Reading(ts, 30.0, 40, 10)], threshold_c=30.0)
\`\`\`

## Expected behavior

Returns the reading.

## Observed behavior

Returns an empty list.
`;

const wx_t103 = `# WX-103: Smoothing trashes the station data

**Status:** Open
**Priority:** P1
**Component:** Trends
**Reporter:** analytics@skyline

## Description

After we run \`smooth_readings(station)\` to get a smoothed temperature
series for charts, the underlying \`station.readings\` end up with the
**smoothed** temperatures — the raw temps are gone. We can't recompute
hourly averages from the same station afterward.

Additionally, the return value isn't what the function used to return —
downstream code expects a **list** of smoothed temperatures.

## Expected behavior

- \`station.readings\` retain their original \`temp_c\` values.
- \`smooth_readings\` returns a \`list[float]\` of smoothed temperatures.

## Observed behavior

- Original \`temp_c\` values are overwritten.
- Return value is the mutated station object, not a list.
`;

const wx_t104 = `# WX-104: Celsius-to-Fahrenheit conversion is off

**Status:** Open
**Priority:** P2
**Component:** Formatter
**Reporter:** internal-tools@skyline

## Description

\`formatter.c_to_f(37)\` should return \`98.6\`. It's returning \`98.0\`.
Small temperatures show similar but slightly-off results.

## Expected

\`c_to_f(37) == 98.6\`, \`c_to_f(23) == 73.4\`.

## Observed

\`c_to_f(37) == 98\`, \`c_to_f(23) == 73\` (or similar — anything that's
just shy of the real value).
`;

const wx_main = `import datetime
from station import Station, Reading
from aggregator import hourly_averages, daily_max
from alerts import heat_alerts
from trends import smooth_readings
from formatter import c_to_f


def TS(h, m=0):
    return datetime.datetime(2024, 6, 1, h, m)


def run():
    s = Station('S1', 'Phoenix', 33.4, -112.0)
    # Hour 10: temps 30, 32 -> expected avg 31
    s.add_reading(Reading(TS(10, 0), 30.0, 40, 10))
    s.add_reading(Reading(TS(10, 30), 32.0, 42, 12))
    # Hour 12: temps 38, 40 -> expected avg 39
    s.add_reading(Reading(TS(12, 0), 38.0, 90, 65))
    s.add_reading(Reading(TS(12, 30), 40.0, 85, 70))

    print('--- Section A: hourly averages ---')
    h = hourly_averages(s)
    print('hour 10 avg:', round(h[(2024, 6, 1, 10)], 2))
    print('hour 12 avg:', round(h[(2024, 6, 1, 12)], 2))

    print('--- Section B: heat alerts threshold=30 ---')
    alerts = heat_alerts(s.readings, threshold_c=30.0)
    print('alerts triggered:', len(alerts))

    print('--- Section C: smoothing ---')
    original = [r.temp_c for r in s.readings]
    result = smooth_readings(s, window=3)
    print('result type:', type(result).__name__)
    print('original temps preserved:', [r.temp_c for r in s.readings] == original)

    print('--- Section D: c_to_f ---')
    print('c_to_f(37):', c_to_f(37))
    print('c_to_f(23):', c_to_f(23))


if __name__ == '__main__':
    run()
`;

const wx_expected = `--- Section A: hourly averages ---
hour 10 avg: 31.0
hour 12 avg: 39.0
--- Section B: heat alerts threshold=30 ---
alerts triggered: 4
--- Section C: smoothing ---
result type: list
original temps preserved: True
--- Section D: c_to_f ---
c_to_f(37): 98.6
c_to_f(23): 73.4
`;

export const debug1 = {
  id: 'debug:seed:weather',
  domain: 'Weather Station Data Pipeline',
  files: [
    { name: 'README.md', content: wx_README },
    { name: 'tickets/WX-101.md', content: wx_t101 },
    { name: 'tickets/WX-102.md', content: wx_t102 },
    { name: 'tickets/WX-103.md', content: wx_t103 },
    { name: 'tickets/WX-104.md', content: wx_t104 },
    {
      name: 'station.py',
      content: `class Station:
    def __init__(self, station_id, name, lat, lon):
        self.station_id = station_id
        self.name = name
        self.lat = lat
        self.lon = lon
        self.readings = []

    def add_reading(self, reading):
        self.readings.append(reading)


class Reading:
    def __init__(self, ts, temp_c, humidity, wind_kph):
        self.ts = ts
        self.temp_c = temp_c
        self.humidity = humidity
        self.wind_kph = wind_kph
`,
    },
    {
      name: 'aggregator.py',
      content: `from collections import defaultdict


def hourly_averages(station):
    buckets = defaultdict(list)
    for r in station.readings:
        key = (r.ts.year, r.ts.month, r.ts.day, r.ts.hour)
        buckets[key].append(r.temp_c)

    result = {}
    for key, temps in buckets.items():
        result[key] = sum(temps) / len(station.readings)
    return result


def daily_max(station):
    buckets = defaultdict(list)
    for r in station.readings:
        key = (r.ts.year, r.ts.month, r.ts.day)
        buckets[key].append(r.temp_c)
    return {k: max(v) for k, v in buckets.items()}
`,
    },
    {
      name: 'alerts.py',
      content: `def heat_alerts(readings, threshold_c=30.0):
    return [r for r in readings if r.temp_c > threshold_c]


def humidity_alerts(readings, max_humidity=85):
    return [r for r in readings if r.humidity > max_humidity]


def wind_alerts(readings, max_kph=60):
    return [r for r in readings if r.wind_kph >= max_kph]
`,
    },
    {
      name: 'trends.py',
      content: `def trailing_average(values, window):
    if window <= 0 or not values:
        return []
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        window_vals = values[start:i + 1]
        result.append(sum(window_vals) / len(window_vals))
    return result


def smooth_readings(station, window=3):
    temps = [r.temp_c for r in station.readings]
    smoothed = trailing_average(temps, window)
    for r, s in zip(station.readings, smoothed):
        r.temp_c = s
    return station
`,
    },
    {
      name: 'formatter.py',
      content: `def c_to_f(temp_c):
    return temp_c * 9 // 5 + 32


def format_alert(reading):
    f = c_to_f(reading.temp_c)
    return f"{reading.ts.isoformat()}: {f:.1f}°F, {reading.humidity}% humidity"
`,
    },
    { name: 'main.py', content: wx_main },
    { name: 'expected_output.txt', content: wx_expected },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
import datetime
from station import Station, Reading
from aggregator import hourly_averages, daily_max
from alerts import heat_alerts, humidity_alerts, wind_alerts
from trends import smooth_readings, trailing_average
from formatter import c_to_f


def TS(h, m=0):
    return datetime.datetime(2024, 6, 1, h, m)


def sample_station():
    s = Station('S1', 'Phoenix', 33.4, -112.0)
    s.add_reading(Reading(TS(10, 0), 30.0, 40, 10))
    s.add_reading(Reading(TS(10, 30), 32.0, 42, 12))
    s.add_reading(Reading(TS(11, 0), 36.0, 50, 15))
    s.add_reading(Reading(TS(12, 0), 38.0, 90, 65))
    s.add_reading(Reading(TS(12, 30), 40.0, 85, 70))
    return s


# CHECKPOINT 1
class TestAggregation(unittest.TestCase):
    def test_hourly_average_hour_10(self):
        """Hour 10 average of [30, 32] must be 31, not diluted by other hours"""
        s = sample_station()
        result = hourly_averages(s)
        self.assertAlmostEqual(result[(2024, 6, 1, 10)], 31.0)

    def test_hourly_average_hour_12(self):
        """Hour 12 average of [38, 40] must be 39"""
        s = sample_station()
        result = hourly_averages(s)
        self.assertAlmostEqual(result[(2024, 6, 1, 12)], 39.0)


# CHECKPOINT 2
class TestAlerts(unittest.TestCase):
    def test_heat_alert_includes_threshold(self):
        """A reading exactly at 30C must trigger a heat alert (>= threshold)"""
        s = sample_station()
        alerts = heat_alerts(s.readings, threshold_c=30.0)
        ts_set = {a.ts for a in alerts}
        self.assertIn(TS(10, 0), ts_set)

    def test_heat_alert_count(self):
        """All 5 readings >= 30C should be flagged"""
        s = sample_station()
        alerts = heat_alerts(s.readings, threshold_c=30.0)
        self.assertEqual(len(alerts), 5)


# CHECKPOINT 3
class TestSmoothing(unittest.TestCase):
    def test_smooth_does_not_mutate_station(self):
        """smooth_readings must NOT overwrite the original station temps"""
        s = sample_station()
        original_temps = [r.temp_c for r in s.readings]
        smooth_readings(s, window=3)
        current_temps = [r.temp_c for r in s.readings]
        self.assertEqual(current_temps, original_temps)

    def test_smooth_returns_list_of_floats(self):
        """smooth_readings should return a list of smoothed temperatures"""
        s = sample_station()
        result = smooth_readings(s, window=3)
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), len(s.readings))
        self.assertAlmostEqual(result[0], 30.0)
        self.assertAlmostEqual(result[1], 31.0)


# CHECKPOINT 4
class TestFormatter(unittest.TestCase):
    def test_c_to_f_exact_37(self):
        """37C must convert to 98.6F"""
        self.assertAlmostEqual(c_to_f(37), 98.6, places=1)

    def test_c_to_f_fractional_23(self):
        """23C must convert to 73.4F"""
        self.assertAlmostEqual(c_to_f(23), 73.4, places=1)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    { file: 'aggregator.py', description: 'Hourly averages produce wrong numbers' },
    { file: 'alerts.py', description: 'Heat alerts miss some events' },
    { file: 'trends.py', description: 'Smoothing has side effects and returns the wrong thing' },
    { file: 'formatter.py', description: 'Temperature conversion is off' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Read README.md and the tickets in tickets/. Run main.py and diff against expected_output.txt. For each diverging section, annotate the suspected file in code with your hypothesis. Do NOT use the AI assistant yet.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Investigate WX-101 (Section A) and WX-102 (Section B) via the chat. Verify hypotheses by reading the code.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch WX-101 through WX-104 one at a time, re-running main.py + the tests after each fix.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat: explain each bug — root cause, why it was subtle, and how you would catch it in code review.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Student Gradebook
// ─────────────────────────────────────────────────────────────────────────────

const gb_README = `# Student Gradebook

Welcome to the Registrar team! Gradebook tracks student grades across
courses, computes per-course averages, an overall GPA, and surfaces
"top students" and "passing" rosters. Several reports are returning
plausible but **wrong** numbers — counselors and students alike are
reporting issues.

## Project Structure

\`\`\`
student.py    — Student model (id, name, grades dict)
gradebook.py  — Gradebook aggregate (students, courses, record_grade)
averages.py   — course_average + overall_average
gpa.py        — to_letter + compute_gpa (uses credit hours)
roster.py     — top_students + students_above
reports.py    — transcript + passing
main.py       — runnable demo
expected_output.txt — what main.py SHOULD print
tickets/      — symptoms reported by counselors
\`\`\`

## Architecture

\`\`\`
Student ──► averages ──► overall_average
   │
   └─► gpa.compute_gpa ──► roster (top_students, students_above)
                       └─► reports (transcript, passing)
\`\`\`

## Conventions

- Grades are **0–100 integers** (one course may have multiple recorded
  scores). The course's average is the mean of those scores.
- Letter grade cutoffs are **inclusive** at the floor: 90 → A, 80 → B, 70 → C,
  60 → D, anything else → F.
- "Pass threshold" is a numeric comparison — never a string comparison.

## Reported Issues

- **GB-001** — Overall average is wrong when course grade counts differ
- **GB-002** — Letter grades drop one level at the boundary scores
- **GB-003** — \`top_students\` returns the wrong end of the ranking
- **GB-004** — \`passing()\` lets low averages slip through against high thresholds
`;

const gb_t1 = `# GB-001: Overall average is wrong when courses have different grade counts

**Status:** Open
**Priority:** P1
**Component:** Averages
**Reporter:** counselor@registrar

## Description

A student with three 90s in course A and one 60 in course B should have an
overall average across all four grades of \`82.5\`. The transcript is showing
\`75\`.

## Steps to reproduce

\`\`\`python
s = Student('X', 'Test')
s.record('A', 90); s.record('A', 90); s.record('A', 90)
s.record('B', 60)
overall_average(s)
\`\`\`

## Expected behavior

\`82.5\` — the mean of all four recorded grades.

## Observed behavior

\`75.0\` — looks like the mean of the per-course averages (\`(90 + 60) / 2\`),
which is **not** what overall average should mean here.
`;

const gb_t2 = `# GB-002: Letter grades drop one level at the boundary scores

**Status:** Open
**Priority:** P0
**Component:** GPA
**Reporter:** transcripts-team@registrar

## Description

Students with a score of exactly 90 are being marked as a B on their
transcript — same with 80→C and 70→D. The published policy is that 90 is
an A (inclusive cutoff).

## Steps to reproduce

\`\`\`python
to_letter(90), to_letter(80), to_letter(70)
\`\`\`

## Expected

\`('A', 'B', 'C')\`

## Observed

\`('B', 'C', 'D')\`
`;

const gb_t3 = `# GB-003: top_students returns the wrong end of the ranking

**Status:** Open
**Priority:** P1
**Component:** Roster
**Reporter:** dean@registrar

## Description

The "Top Students" report on the Dean's dashboard is consistently showing
the **lowest-GPA** students at the top of the list, not the highest.

## Expected behavior

\`top_students(gradebook, n=1)\` returns the student with the highest GPA.

## Observed behavior

Returns the student with the lowest GPA.
`;

const gb_t4 = `# GB-004: passing() lets low averages slip through against high thresholds

**Status:** Open
**Priority:** P1
**Component:** Reports
**Reporter:** academic-standing@registrar

## Description

A student with a course average of \`9.5\` is being marked as **passing**
when the threshold is set to \`10\`. We've also seen \`9.0\` slip through
against threshold \`10\`.

## Steps to reproduce

\`\`\`python
passing(student_with_9_5_avg, gradebook, pass_threshold=10)
\`\`\`

## Expected

The course should NOT be in the passing list — \`9.5 < 10\`.

## Observed

The course IS in the list. Smells like a string comparison ("9.5" > "10"
lexicographically).
`;

const gb_main = `from student import Student
from gradebook import Gradebook
from averages import overall_average
from gpa import to_letter, compute_gpa
from roster import top_students
from reports import passing


def run():
    # Overall average behavior
    print('--- Section A: overall average ---')
    s = Student('X', 'Test')
    s.record('A', 90)
    s.record('A', 90)
    s.record('A', 90)
    s.record('B', 60)
    # Three 90s + one 60 -> all-grades mean = (270+60)/4 = 82.5
    print('avg of three 90s and one 60:', round(overall_average(s), 2))

    # Letter grade boundaries
    print('--- Section B: letter grade boundaries ---')
    print('score 90:', to_letter(90))
    print('score 80:', to_letter(80))
    print('score 70:', to_letter(70))

    # Top students should be highest GPA first
    print('--- Section C: top students ---')
    gb = Gradebook()
    gb.add_course('M', 'Math', credit_hours=3)
    gb.add_course('E', 'English', credit_hours=3)
    high = Student('H', 'High')
    low = Student('L', 'Low')
    gb.add_student(high)
    gb.add_student(low)
    gb.record_grade('H', 'M', 95)
    gb.record_grade('H', 'E', 90)
    gb.record_grade('L', 'M', 60)
    gb.record_grade('L', 'E', 65)
    ranking = top_students(gb, n=1)
    print('top student id:', ranking[0][0].student_id)

    # Passing with numeric threshold (single-digit boundary case)
    print('--- Section D: passing threshold ---')
    s2 = Student('Z', 'Z')
    gb.add_student(s2)
    gb.record_grade('Z', 'M', 9.5)
    result = passing(s2, gb, pass_threshold=10)
    print('9.5 average vs threshold 10 — included?:', 'M' in result)


if __name__ == '__main__':
    run()
`;

const gb_expected = `--- Section A: overall average ---
avg of three 90s and one 60: 82.5
--- Section B: letter grade boundaries ---
score 90: A
score 80: B
score 70: C
--- Section C: top students ---
top student id: H
--- Section D: passing threshold ---
9.5 average vs threshold 10 — included?: False
`;

export const debug2 = {
  id: 'debug:seed:gradebook',
  domain: 'Student Gradebook',
  files: [
    { name: 'README.md', content: gb_README },
    { name: 'tickets/GB-001.md', content: gb_t1 },
    { name: 'tickets/GB-002.md', content: gb_t2 },
    { name: 'tickets/GB-003.md', content: gb_t3 },
    { name: 'tickets/GB-004.md', content: gb_t4 },
    {
      name: 'student.py',
      content: `class Student:
    def __init__(self, student_id, name):
        self.student_id = student_id
        self.name = name
        self.grades = {}

    def record(self, course_code, score):
        self.grades.setdefault(course_code, []).append(score)
`,
    },
    {
      name: 'gradebook.py',
      content: `class Gradebook:
    def __init__(self):
        self.students = {}
        self.courses = {}

    def add_student(self, student):
        self.students[student.student_id] = student

    def add_course(self, course_code, name, credit_hours):
        self.courses[course_code] = {'name': name, 'credit_hours': credit_hours}

    def record_grade(self, student_id, course_code, score):
        student = self.students.get(student_id)
        if student is None:
            return False
        if course_code not in self.courses:
            return False
        student.record(course_code, score)
        return True
`,
    },
    {
      name: 'averages.py',
      content: `def course_average(student, course_code):
    grades = student.grades.get(course_code, [])
    if not grades:
        return 0.0
    return sum(grades) / len(grades)


def overall_average(student):
    if not student.grades:
        return 0.0
    course_avgs = [course_average(student, c) for c in student.grades]
    return sum(course_avgs) / len(course_avgs)
`,
    },
    {
      name: 'gpa.py',
      content: `LETTER_GRADES = [
    (90, 'A'),
    (80, 'B'),
    (70, 'C'),
    (60, 'D'),
    (0,  'F'),
]


def to_letter(score):
    for cutoff, letter in LETTER_GRADES:
        if score > cutoff:
            return letter
    return 'F'


GPA_POINTS = {'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0}


def compute_gpa(student, gradebook):
    if not student.grades:
        return 0.0
    total_points = 0.0
    total_credits = 0
    for code, grades in student.grades.items():
        course = gradebook.courses.get(code)
        if course is None:
            continue
        avg = sum(grades) / len(grades)
        letter = to_letter(avg)
        total_points += GPA_POINTS[letter] * course['credit_hours']
        total_credits += course['credit_hours']
    if total_credits == 0:
        return 0.0
    return total_points / total_credits
`,
    },
    {
      name: 'roster.py',
      content: `def top_students(gradebook, n=3):
    from gpa import compute_gpa
    entries = [(s, compute_gpa(s, gradebook)) for s in gradebook.students.values()]
    entries.sort(key=lambda kv: kv[1])
    return entries[:n]


def students_above(gradebook, gpa_floor):
    from gpa import compute_gpa
    return [s for s in gradebook.students.values() if compute_gpa(s, gradebook) >= gpa_floor]
`,
    },
    {
      name: 'reports.py',
      content: `from averages import overall_average


def transcript(student, gradebook):
    rows = []
    for code, grades in student.grades.items():
        course = gradebook.courses.get(code, {'name': code, 'credit_hours': 0})
        rows.append({
            'course': course['name'],
            'credits': course['credit_hours'],
            'average': sum(grades) / len(grades),
        })
    return rows


def passing(student, gradebook, pass_threshold='60'):
    result = []
    for code, grades in student.grades.items():
        avg = sum(grades) / len(grades)
        if str(avg) >= str(pass_threshold):
            result.append(code)
    return result
`,
    },
    { name: 'main.py', content: gb_main },
    { name: 'expected_output.txt', content: gb_expected },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
from student import Student
from gradebook import Gradebook
from averages import course_average, overall_average
from gpa import to_letter, compute_gpa
from roster import top_students, students_above
from reports import transcript, passing


def sample_book():
    gb = Gradebook()
    gb.add_course('MATH101', 'Calculus', credit_hours=4)
    gb.add_course('ENG101', 'English', credit_hours=3)
    gb.add_course('HIST101', 'History', credit_hours=3)
    alice = Student('S1', 'Alice')
    gb.add_student(alice)
    gb.record_grade('S1', 'MATH101', 95)
    gb.record_grade('S1', 'MATH101', 85)
    gb.record_grade('S1', 'ENG101', 80)
    gb.record_grade('S1', 'HIST101', 70)
    bob = Student('S2', 'Bob')
    gb.add_student(bob)
    gb.record_grade('S2', 'MATH101', 60)
    gb.record_grade('S2', 'ENG101', 70)
    gb.record_grade('S2', 'HIST101', 65)
    return gb, alice, bob


# CHECKPOINT 1
class TestAverages(unittest.TestCase):
    def test_overall_average_weights_all_grades(self):
        """overall_average should average across ALL grades, not average-of-averages"""
        s = Student('X', 'Test')
        s.record('A', 100)
        s.record('A', 100)
        s.record('B', 0)
        self.assertAlmostEqual(overall_average(s), 200/3, places=2)

    def test_overall_average_unequal_counts(self):
        """Two courses with different grade counts: must average all 4 grades, not the two means"""
        s = Student('X', 'Test')
        s.record('A', 90)
        s.record('A', 90)
        s.record('A', 90)
        s.record('B', 60)
        self.assertAlmostEqual(overall_average(s), 82.5)


# CHECKPOINT 2
class TestLetterGrades(unittest.TestCase):
    def test_to_letter_90_is_A(self):
        """A score of exactly 90 should be an A, not a B"""
        self.assertEqual(to_letter(90), 'A')

    def test_to_letter_80_is_B(self):
        """A score of exactly 80 should be a B"""
        self.assertEqual(to_letter(80), 'B')

    def test_to_letter_70_is_C(self):
        """A score of exactly 70 should be a C"""
        self.assertEqual(to_letter(70), 'C')

    def test_compute_gpa_alice(self):
        """Alice GPA: MATH(avg 90, A, 4ch), ENG(80, B, 3ch), HIST(70, C, 3ch) -> 3.1"""
        gb, alice, _ = sample_book()
        self.assertAlmostEqual(compute_gpa(alice, gb), 3.1, places=2)


# CHECKPOINT 3
class TestRoster(unittest.TestCase):
    def test_top_students_returns_highest_first(self):
        """top_students(n=1) should return the student with the HIGHEST GPA"""
        gb, _, _ = sample_book()
        top = top_students(gb, n=1)
        self.assertEqual(top[0][0].student_id, 'S1')

    def test_students_above_gpa_with_boundary_letters(self):
        """A student with averages on letter boundaries (90/80/70) should clear 3.0 once to_letter is fixed."""
        gb, _, _ = sample_book()
        boundary = Student('SB', 'Boundary')
        gb.add_student(boundary)
        gb.record_grade('SB', 'MATH101', 90)
        gb.record_grade('SB', 'ENG101', 80)
        gb.record_grade('SB', 'HIST101', 70)
        above = students_above(gb, 3.0)
        ids = {s.student_id for s in above}
        self.assertIn('SB', ids)


# CHECKPOINT 4
class TestReports(unittest.TestCase):
    def test_passing_rejects_below_threshold(self):
        """A 9.5 average must NOT pass when threshold is 10."""
        gb, _, _ = sample_book()
        s = Student('Z', 'Z')
        gb.add_student(s)
        gb.record_grade('Z', 'MATH101', 9.5)
        result = passing(s, gb, pass_threshold=10)
        self.assertNotIn('MATH101', result)

    def test_passing_handles_single_digit_average(self):
        """A 9.0 average must NOT pass when threshold is 10."""
        gb, _, _ = sample_book()
        s = Student('Z2', 'Z2')
        gb.add_student(s)
        gb.record_grade('Z2', 'MATH101', 9.0)
        result = passing(s, gb, pass_threshold=10)
        self.assertNotIn('MATH101', result)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    { file: 'averages.py', description: 'overall_average computes the wrong kind of mean when courses have unequal grade counts' },
    { file: 'gpa.py', description: 'Letter grades drop one level at the boundary scores' },
    { file: 'roster.py', description: 'top_students returns the wrong end of the ranking' },
    { file: 'reports.py', description: 'passing() uses the wrong comparison so small averages slip through' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Read README.md and the tickets in tickets/. Run main.py and diff against expected_output.txt. Annotate each diverging section in code with your hypothesis. Do NOT use the AI assistant.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Investigate GB-001 and GB-002 (Sections A and B) before changing code. Confirm the hypothesis by reading the implementation.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch GB-001 through GB-004 one at a time. Re-run main.py and the tests after each.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat: explain why string-comparison of stringified numbers is dangerous and how to catch it in code review.' },
  ],
};
