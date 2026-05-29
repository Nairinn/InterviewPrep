// Debug Challenge seed problems — subtle silent-wrong-output bugs.
// Code runs without exceptions on the happy path; bugs surface only via test assertions.

export const debug1 = {
  id: 'debug:seed:weather',
  domain: 'Weather Station Data Pipeline',
  files: [
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
        self.ts = ts  # datetime.datetime
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
        # BUG (silent): divides by total readings rather than the bucket size,
        # collapsing hourly averages toward the global mean.
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
    # BUG (silent): uses > threshold; readings exactly at the threshold should also trigger an alert.
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
    # BUG (silent): mutates the station's readings list to overwrite temps with the
    # smoothed values, and returns the station rather than a fresh list of smoothed temps.
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
    # BUG (silent): operator precedence — Python evaluates 9/5 first as float, fine,
    # BUT missing parens around (temp_c * 9 / 5) means + 32 binds after correctly...
    # Actual bug: divides by 5 BEFORE multiplying by 9 in integer-context-friendly way that loses precision
    # when temp_c is provided as an int. Use of // turns truthful float math into truncation.
    return temp_c * 9 // 5 + 32


def format_alert(reading):
    f = c_to_f(reading.temp_c)
    return f"{reading.ts.isoformat()}: {f:.1f}°F, {reading.humidity}% humidity"
`,
    },
    {
      name: 'pipeline.py',
      content: `from aggregator import hourly_averages, daily_max
from alerts import heat_alerts, humidity_alerts, wind_alerts
from trends import smooth_readings


def daily_report(station):
    return {
        'hourly': hourly_averages(station),
        'daily_max': daily_max(station),
        'heat_alerts': heat_alerts(station.readings),
        'humidity_alerts': humidity_alerts(station.readings),
        'wind_alerts': wind_alerts(station.readings),
    }
`,
    },
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
    # Hour 10: temps 30, 32 → avg 31
    s.add_reading(Reading(TS(10, 0), 30.0, 40, 10))
    s.add_reading(Reading(TS(10, 30), 32.0, 42, 12))
    # Hour 11: temp 36 → avg 36
    s.add_reading(Reading(TS(11, 0), 36.0, 50, 15))
    # Hour 12: temps 38, 40 → avg 39
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
        # First value with window 3 has window size 1
        self.assertAlmostEqual(result[0], 30.0)
        # Second has window size 2: avg(30, 32)
        self.assertAlmostEqual(result[1], 31.0)


# CHECKPOINT 4
class TestFormatter(unittest.TestCase):
    def test_c_to_f_exact_37(self):
        """37C must convert to 98.6F — floor-division truncates this to 98"""
        self.assertAlmostEqual(c_to_f(37), 98.6, places=1)

    def test_c_to_f_fractional_25(self):
        """25C must convert to 77.0F — bug 25*9//5+32 = 225//5+32 = 45+32 = 77 (OK)
        but check via a value where // truncates: 23C → 23*9=207, 207//5=41 (truncates from 41.4),
        +32 = 73 (wrong); correct: 207/5=41.4 +32 = 73.4"""
        self.assertAlmostEqual(c_to_f(23), 73.4, places=1)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    {
      file: 'aggregator.py',
      line_hint: 14,
      description: 'hourly_averages divides each bucket sum by total readings instead of bucket size',
      why_subtle: 'Looks like a copy-paste error; the result is still a float and code runs fine — wrong values only show up under test',
      prevention: 'Always write a hand-calculated expected-value test for aggregation functions',
    },
    {
      file: 'alerts.py',
      line_hint: 3,
      description: 'heat_alerts uses > instead of >= for threshold comparison',
      why_subtle: 'Common boundary mistake — usually only one test in the suite hits the exact boundary',
      prevention: 'Make the threshold-boundary case an explicit test',
    },
    {
      file: 'trends.py',
      line_hint: 13,
      description: 'smooth_readings mutates input readings and returns the station instead of a fresh list of smoothed temps',
      why_subtle: 'Code does produce a list of smoothed values, but assigns them back AND returns the wrong object',
      prevention: 'Treat function inputs as immutable; return new collections',
    },
    {
      file: 'formatter.py',
      line_hint: 5,
      description: 'c_to_f uses // (integer division) so int inputs lose precision (e.g. c_to_f(37) returns 98 not 98.6)',
      why_subtle: 'Floor division only matters for ints; floats pass through unaffected — easy to miss in dev',
      prevention: 'Pick a non-integer reference value like 37C → 98.6F in a test',
    },
    {
      file: 'station.py',
      line_hint: 0,
      description: '(no bug in station.py — included for completeness; bug count 4 across the codebase)',
    },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Run the tests. For each failing test add a comment in the responsible file naming your hypothesis. Do NOT use the AI assistant yet.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Narrow down the bugs in aggregator.py and alerts.py. Use the chat to talk through your reasoning before changing code.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch all bugs one at a time, running tests after each fix. All assertions must pass.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat, explain each bug: root cause, why it was hard to spot, and a concrete prevention practice (test design, code review checklist, etc).' },
  ],
};

export const debug2 = {
  id: 'debug:seed:gradebook',
  domain: 'Student Gradebook',
  files: [
    {
      name: 'student.py',
      content: `class Student:
    def __init__(self, student_id, name):
        self.student_id = student_id
        self.name = name
        self.grades = {}  # course_code -> list of numeric grades

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
    # BUG (silent): averages of averages instead of average of all grades.
    # Skews results when courses have different numbers of recorded grades.
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
    # BUG (silent): uses > instead of >=; a 90.0 score falls through to 'B'.
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
    # BUG (silent): sorts ascending by GPA so 'top' is actually bottom.
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
    # BUG (silent): pass_threshold default is a string; the >= comparison against a number
    # always raises TypeError in Python 3 — wait, that DOES raise. Use type coercion safely:
    # We'll convert wrongly. Real bug: compares str to str when sometimes user passes a number.
    # Realistic version below: stores threshold as str, compares against average (float),
    # never matches — returns empty list silently when called with default.
    result = []
    for code, grades in student.grades.items():
        avg = sum(grades) / len(grades)
        if str(avg) >= str(pass_threshold):
            result.append(code)
    return result
`,
    },
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
    gb.record_grade('S1', 'MATH101', 85)  # avg 90
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
        # all-grades average = (100+100+0)/3 = 66.67
        self.assertAlmostEqual(overall_average(s), 200/3, places=2)

    def test_overall_average_unequal_counts(self):
        """Two courses with different grade counts: must average all 4 grades, not the two means"""
        s = Student('X', 'Test')
        # Course A: three 90s. Course B: one 60. All-grades avg = (270+60)/4 = 82.5
        # Wrong avg-of-avgs = (90 + 60)/2 = 75
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
        """Alice has MATH(avg 90, A, 4ch), ENG(80, B, 3ch), HIST(70, C, 3ch)
           weighted = (4*4 + 3*3 + 2*3)/10 = 31/10 = 3.1"""
        gb, alice, _ = sample_book()
        self.assertAlmostEqual(compute_gpa(alice, gb), 3.1, places=2)


# CHECKPOINT 3
class TestRoster(unittest.TestCase):
    def test_top_students_returns_highest_first(self):
        """top_students(n=1) should return the student with the HIGHEST GPA"""
        gb, alice, _ = sample_book()
        top = top_students(gb, n=1)
        self.assertEqual(top[0][0].student_id, 'S1')

    def test_students_above_gpa_with_boundary_letters(self):
        """A student whose averages all sit exactly on letter boundaries (which the bug
        kicks down a letter each) should still clear the 3.0 floor when to_letter is fixed."""
        gb, _, _ = sample_book()
        boundary = Student('SB', 'Boundary')
        gb.add_student(boundary)
        # MATH: 90 (boundary → 'A' fixed, 'B' buggy)
        # ENG:  80 (boundary → 'B' fixed, 'C' buggy)
        # HIST: 70 (boundary → 'C' fixed, 'D' buggy)
        gb.record_grade('SB', 'MATH101', 90)
        gb.record_grade('SB', 'ENG101', 80)
        gb.record_grade('SB', 'HIST101', 70)
        # Fixed: (4*4 + 3*3 + 2*3)/10 = 3.1 → above 3.0
        # Buggy: (3*4 + 2*3 + 1*3)/10 = 2.1 → below 3.0
        above = students_above(gb, 3.0)
        ids = {s.student_id for s in above}
        self.assertIn('SB', ids)


# CHECKPOINT 4
class TestReports(unittest.TestCase):
    def test_passing_rejects_below_threshold(self):
        """A 9.5 average must NOT pass when threshold is 10.
        Bug: str('9.5') >= str(10) → '9.5' >= '10' → '9' > '1' → True (wrongly passes).
        Fixed: 9.5 >= 10 → False (correctly excluded)."""
        gb, _, _ = sample_book()
        s = Student('Z', 'Z')
        gb.add_student(s)
        gb.record_grade('Z', 'MATH101', 9.5)
        result = passing(s, gb, pass_threshold=10)
        self.assertNotIn('MATH101', result)

    def test_passing_handles_single_digit_average(self):
        """A 9.0 average must NOT pass when threshold is 10.
        Bug: '9.0' >= '10' is True (str compare); Fixed: 9.0 >= 10 is False."""
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
    {
      file: 'averages.py',
      line_hint: 14,
      description: 'overall_average computes average-of-averages instead of average-of-all-grades',
      why_subtle: 'Looks correct at a glance and matches the units (a number out of 100); only fails when courses have unequal grade counts',
      prevention: 'Write a test where two courses have different numbers of grades and the two averaging strategies diverge',
    },
    {
      file: 'gpa.py',
      line_hint: 12,
      description: 'to_letter uses > instead of >=, so boundary scores drop one letter grade',
      why_subtle: 'Common boundary mistake; integer test scores rarely hit the boundary unless data is curated',
      prevention: 'Always test the exact boundary (90 → A, 80 → B, etc.)',
    },
    {
      file: 'roster.py',
      line_hint: 5,
      description: 'top_students sorts ascending — returns lowest-GPA students',
      why_subtle: '"top" reads naturally as best; sort default ascending matches Python convention',
      prevention: 'Make sort direction explicit in code review checklists',
    },
    {
      file: 'reports.py',
      line_hint: 16,
      description: 'passing() compares str(avg) to str(threshold) lexically — "70.0" >= "60" works by accident, "9.5" >= "10" does not',
      why_subtle: 'String comparison of stringified numbers gives correct answer for many inputs and wrong answer for others',
      prevention: 'Compare numbers as numbers; reject string thresholds at the API boundary',
    },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Run the full test suite. Annotate each failing test in a comment in the file you suspect, with a short hypothesis. Do NOT use the AI assistant.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Talk through the overall_average and to_letter bugs in the chat before changing code. Verify your hypothesis by reading the function.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch all four bugs one at a time, running tests after each fix.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat: explain why string-comparison of stringified numbers is dangerous, and what type-discipline practice would have caught it in code review.' },
  ],
};
