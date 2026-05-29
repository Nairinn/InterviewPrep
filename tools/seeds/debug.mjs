// Debug Challenge seed problems — subtle silent-wrong-output bugs.
// Source code has NO comments revealing the bugs.
// Each problem ships with main.py + expected_output.txt for diff-based diagnosis.

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
    {
      name: 'main.py',
      content: `import datetime
from station import Station, Reading
from aggregator import hourly_averages, daily_max
from alerts import heat_alerts
from trends import smooth_readings
from formatter import c_to_f


def TS(h, m=0):
    return datetime.datetime(2024, 6, 1, h, m)


def run():
    s = Station('S1', 'Phoenix', 33.4, -112.0)
    # Hour 10: temps 30, 32 → expected avg 31
    s.add_reading(Reading(TS(10, 0), 30.0, 40, 10))
    s.add_reading(Reading(TS(10, 30), 32.0, 42, 12))
    # Hour 12: temps 38, 40 → expected avg 39
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
`,
    },
    {
      name: 'expected_output.txt',
      content: `--- Section A: hourly averages ---
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
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Run main.py and diff against expected_output.txt. For each diverging section, add a comment in the file you suspect with your hypothesis. Do NOT use the AI assistant yet.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Investigate Sections A and B in main.py via the chat. Verify hypotheses by reading the code.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch all the bugs one at a time, re-running main.py + the tests after each fix.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat: explain each bug — root cause, why it was subtle, and how you would catch it in code review.' },
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
    {
      name: 'main.py',
      content: `from student import Student
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
    # Three 90s + one 60 → all-grades mean = (270+60)/4 = 82.5
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
`,
    },
    {
      name: 'expected_output.txt',
      content: `--- Section A: overall average ---
avg of three 90s and one 60: 82.5
--- Section B: letter grade boundaries ---
score 90: A
score 80: B
score 70: C
--- Section C: top students ---
top student id: H
--- Section D: passing threshold ---
9.5 average vs threshold 10 — included?: False
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
        """Alice GPA: MATH(avg 90, A, 4ch), ENG(80, B, 3ch), HIST(70, C, 3ch) → 3.1"""
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
    { id: 1, title: 'Reproduce', ai_enabled: false, task: 'Run main.py and diff vs expected_output.txt. Annotate each diverging section in code with your hypothesis. Do NOT use the AI assistant.' },
    { id: 2, title: 'Isolate', ai_enabled: true, task: 'Investigate Sections A and B before changing code. Confirm the hypothesis by reading the implementation.' },
    { id: 3, title: 'Fix & Verify', ai_enabled: true, task: 'Patch the bugs one at a time. Re-run main.py and the tests after each.' },
    { id: 4, title: 'Post-mortem', ai_enabled: true, task: 'In the chat: explain why string-comparison of stringified numbers is dangerous and how to catch it in review.' },
  ],
};
