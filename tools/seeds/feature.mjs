// Feature Implementation seed problems — stubs to fill in.
// Every test must fail on day-0 code (every test exercises at least one stub).

export const feature1 = {
  id: 'feature:seed:finance',
  domain: 'Personal Finance Tracker',
  files: [
    {
      name: 'transaction.py',
      content: `import datetime


class Transaction:
    def __init__(self, tx_id, amount, description, date, category=None):
        self.tx_id = tx_id
        # amount: positive for income, negative for expense
        self.amount = amount
        self.description = description
        self.date = date
        self.category = category

    def is_expense(self):
        return self.amount < 0

    def is_income(self):
        return self.amount > 0
`,
    },
    {
      name: 'account.py',
      content: `import datetime


class Account:
    def __init__(self, name, starting_balance=0.0):
        self.name = name
        self.starting_balance = starting_balance
        self.transactions = []

    def add(self, transaction):
        self.transactions.append(transaction)

    def balance(self):
        # TODO STUB 1: Return the current balance.
        # Starting balance plus the sum of every transaction amount.
        raise NotImplementedError('account.balance')

    def last_n_days(self, n, today=None):
        # TODO STUB 2: Return transactions whose date is within the last n days from 'today'.
        # If today is None, use datetime.date(2024, 6, 1) as the reference point so tests are deterministic.
        # The window is inclusive on both ends: today - (n-1) <= tx.date <= today.
        raise NotImplementedError('account.last_n_days')
`,
    },
    {
      name: 'categories.py',
      content: `KEYWORDS = {
    'groceries': ['supermarket', 'grocery', 'whole foods', 'trader joe'],
    'rent': ['rent', 'landlord', 'apartment'],
    'transport': ['uber', 'lyft', 'gas', 'metro', 'subway'],
    'dining': ['restaurant', 'cafe', 'coffee', 'pizza'],
    'utilities': ['electric', 'water', 'internet', 'gas bill'],
}


def auto_categorize(transaction):
    # TODO STUB 3: Inspect transaction.description (case-insensitive).
    # Return the first category whose any keyword appears as a substring of the description.
    # If nothing matches, return 'uncategorized'.
    raise NotImplementedError('categories.auto_categorize')
`,
    },
    {
      name: 'budget.py',
      content: `class Budget:
    def __init__(self):
        self.limits = {}  # category -> monthly limit (positive number, in dollars spent)

    def set_limit(self, category, monthly_limit):
        self.limits[category] = monthly_limit

    def over_under(self, account, year, month):
        # TODO STUB 4: For each category in self.limits, compute:
        #   spent = sum of |amount| for expense transactions in (year, month) of that category
        # Return a dict: { category: limit - spent }
        # Positive values mean under budget; negative mean over.
        # Categories with no transactions still appear (full limit available).
        raise NotImplementedError('budget.over_under')
`,
    },
    {
      name: 'reports.py',
      content: `from collections import defaultdict


def monthly_summary(account, year, month):
    # TODO STUB 5: Return a dict with these keys:
    #   'income'   — sum of positive amounts that month
    #   'expenses' — absolute sum of negative amounts that month
    #   'net'      — income - expenses
    #   'by_category' — dict mapping each category (or 'uncategorized') to total expense in that category
    raise NotImplementedError('reports.monthly_summary')


def average_daily_spend(account, n_days, today=None):
    # TODO STUB 6: Compute average daily expense over the last n_days.
    # Use the same 'today' default (datetime.date(2024, 6, 1)) as account.last_n_days.
    # Return total_expense / n_days as a float. If n_days <= 0, raise ValueError.
    raise NotImplementedError('reports.average_daily_spend')
`,
    },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
import datetime
from transaction import Transaction
from account import Account
from categories import auto_categorize
from budget import Budget
from reports import monthly_summary, average_daily_spend


def D(y, m, d):
    return datetime.date(y, m, d)


def sample_account():
    a = Account('main', starting_balance=1000.0)
    a.add(Transaction('T1', -50.0, 'Whole Foods Market', D(2024, 5, 28), 'groceries'))
    a.add(Transaction('T2', -30.0, 'Uber ride downtown', D(2024, 5, 30), 'transport'))
    a.add(Transaction('T3', 2000.0, 'Paycheck May', D(2024, 5, 31), 'income'))
    a.add(Transaction('T4', -1200.0, 'Apartment rent June', D(2024, 6, 1), 'rent'))
    a.add(Transaction('T5', -15.0, 'Coffee shop', D(2024, 6, 1), 'dining'))
    return a


# CHECKPOINT 1
class TestAccountFoundation(unittest.TestCase):
    def test_balance_with_no_transactions(self):
        """balance() of a fresh account equals starting_balance"""
        a = Account('empty', starting_balance=250.0)
        self.assertAlmostEqual(a.balance(), 250.0)

    def test_balance_after_mixed_transactions(self):
        """balance() = starting + sum of all amounts"""
        a = sample_account()
        # 1000 + (-50 -30 +2000 -1200 -15) = 1705
        self.assertAlmostEqual(a.balance(), 1705.0)

    def test_last_n_days_filters_correctly(self):
        """last_n_days(3) on today=2024-06-01 includes 2024-05-30..06-01"""
        a = sample_account()
        recent = a.last_n_days(3, today=D(2024, 6, 1))
        ids = sorted(t.tx_id for t in recent)
        self.assertEqual(ids, ['T2', 'T3', 'T4', 'T5'])


# CHECKPOINT 2
class TestCategorization(unittest.TestCase):
    def test_auto_categorize_groceries(self):
        """A 'Trader Joe' description should auto-categorize as 'groceries'"""
        t = Transaction('X', -25.0, 'Trader Joe weekly run', D(2024, 6, 1))
        self.assertEqual(auto_categorize(t), 'groceries')

    def test_auto_categorize_case_insensitive(self):
        """Match should ignore case"""
        t = Transaction('X', -25.0, 'COFFEE break at office', D(2024, 6, 1))
        self.assertEqual(auto_categorize(t), 'dining')

    def test_auto_categorize_uncategorized_fallback(self):
        """Description with no keywords falls back to 'uncategorized'"""
        t = Transaction('X', -25.0, 'Mystery vendor', D(2024, 6, 1))
        self.assertEqual(auto_categorize(t), 'uncategorized')


# CHECKPOINT 3
class TestBudgetAndReports(unittest.TestCase):
    def test_budget_over_under_basic(self):
        """Budget limit minus actual expenses by category"""
        a = sample_account()
        b = Budget()
        b.set_limit('rent', 1500.0)
        b.set_limit('dining', 10.0)
        result = b.over_under(a, 2024, 6)
        # June rent spend: 1200 → remaining = 300
        self.assertAlmostEqual(result['rent'], 300.0)
        # June dining spend: 15 → remaining = -5
        self.assertAlmostEqual(result['dining'], -5.0)

    def test_monthly_summary_may(self):
        """Monthly summary for May 2024 totals"""
        a = sample_account()
        r = monthly_summary(a, 2024, 5)
        # May: T1 -50, T2 -30, T3 +2000
        self.assertAlmostEqual(r['income'], 2000.0)
        self.assertAlmostEqual(r['expenses'], 80.0)
        self.assertAlmostEqual(r['net'], 1920.0)
        self.assertAlmostEqual(r['by_category']['groceries'], 50.0)


# CHECKPOINT 4
class TestPolishAndValidation(unittest.TestCase):
    def test_average_daily_spend_basic(self):
        """avg daily spend = total expenses in window / n_days"""
        a = sample_account()
        # last 3 days expenses: T2 (30) + T4 (1200) + T5 (15) = 1245
        avg = average_daily_spend(a, 3, today=D(2024, 6, 1))
        self.assertAlmostEqual(avg, 415.0)

    def test_average_daily_spend_zero_days_raises(self):
        """n_days=0 must raise ValueError"""
        a = sample_account()
        with self.assertRaises(ValueError):
            average_daily_spend(a, 0, today=D(2024, 6, 1))


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [],
  stubs: [
    { file: 'account.py', function: 'balance', description: 'Sum starting_balance + all transaction amounts' },
    { file: 'account.py', function: 'last_n_days', description: 'Filter transactions in inclusive window today-(n-1)..today' },
    { file: 'categories.py', function: 'auto_categorize', description: 'Case-insensitive keyword match against transaction description' },
    { file: 'budget.py', function: 'over_under', description: 'Per-category remaining budget for a given month' },
    { file: 'reports.py', function: 'monthly_summary', description: 'Income, expenses, net, and per-category breakdown for a month' },
    { file: 'reports.py', function: 'average_daily_spend', description: 'Average expense per day over a window; validate n_days > 0' },
  ],
  checkpoints: [
    { id: 1, title: 'Foundation', ai_enabled: false, task: 'Implement Account.balance and Account.last_n_days in account.py. Read the existing Transaction model to understand the data shape. Do NOT use the AI assistant.' },
    { id: 2, title: 'Categorization', ai_enabled: true, task: 'Implement categories.auto_categorize. Use the KEYWORDS map, case-insensitive substring match, and fall back to "uncategorized".' },
    { id: 3, title: 'Budgets & Reports', ai_enabled: true, task: 'Implement Budget.over_under and reports.monthly_summary. Both filter transactions to a given (year, month).' },
    { id: 4, title: 'Polish & Validation', ai_enabled: true, task: 'Implement reports.average_daily_spend including the ValueError on non-positive n_days.' },
  ],
};

export const feature2 = {
  id: 'feature:seed:habit',
  domain: 'Habit Tracker',
  files: [
    {
      name: 'habit.py',
      content: `import datetime


class Habit:
    def __init__(self, name, target_per_week=7):
        self.name = name
        self.target_per_week = target_per_week
        self.completions = []  # list of datetime.date

    def log(self, day):
        if day not in self.completions:
            self.completions.append(day)

    def total_completions(self):
        return len(self.completions)
`,
    },
    {
      name: 'streaks.py',
      content: `import datetime


def current_streak(habit, today):
    # TODO STUB 1: Count consecutive days ending at 'today' where the habit was completed.
    # Example: completions on June 1, 2, 3 and today=June 3 → streak 3.
    # If today itself is missing, streak is 0 (broken).
    raise NotImplementedError('streaks.current_streak')


def longest_streak(habit):
    # TODO STUB 2: Find the longest run of consecutive days in habit.completions.
    # Returns the length as an int. Empty completions → 0.
    raise NotImplementedError('streaks.longest_streak')
`,
    },
    {
      name: 'weekly.py',
      content: `import datetime


def week_of(day):
    # ISO week starting Monday
    monday = day - datetime.timedelta(days=day.weekday())
    return monday


def completions_this_week(habit, today):
    # TODO STUB 3: Return the number of completions whose date is in the same ISO week as 'today'
    # (Monday-Sunday inclusive).
    raise NotImplementedError('weekly.completions_this_week')


def hit_target(habit, today):
    # TODO STUB 4: True if completions_this_week(habit, today) >= habit.target_per_week.
    raise NotImplementedError('weekly.hit_target')
`,
    },
    {
      name: 'tracker.py',
      content: `from streaks import current_streak, longest_streak
from weekly import completions_this_week, hit_target


class Tracker:
    def __init__(self):
        self.habits = {}

    def add_habit(self, habit):
        self.habits[habit.name] = habit

    def log(self, habit_name, day):
        h = self.habits.get(habit_name)
        if h is None:
            raise KeyError(habit_name)
        h.log(day)

    def overview(self, today):
        # TODO STUB 5: Return a dict mapping each habit name to its overview:
        #   { 'streak': int, 'this_week': int, 'on_target': bool, 'total': int }
        raise NotImplementedError('tracker.overview')
`,
    },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
import datetime
from habit import Habit
from streaks import current_streak, longest_streak
from weekly import completions_this_week, hit_target, week_of
from tracker import Tracker


def D(y, m, d):
    return datetime.date(y, m, d)


def sample_habit():
    h = Habit('read', target_per_week=5)
    # Logged: May 27, 28, 29, 30, 31, Jun 1 (six consecutive days)
    for day in range(27, 32):
        h.log(D(2024, 5, day))
    h.log(D(2024, 6, 1))
    return h


# CHECKPOINT 1
class TestStreaks(unittest.TestCase):
    def test_current_streak_basic(self):
        """6 consecutive days ending today → streak 6"""
        h = sample_habit()
        self.assertEqual(current_streak(h, D(2024, 6, 1)), 6)

    def test_current_streak_broken(self):
        """If today itself is unlogged, streak is 0"""
        h = sample_habit()
        self.assertEqual(current_streak(h, D(2024, 6, 2)), 0)

    def test_longest_streak_simple(self):
        """6 consecutive days → longest 6"""
        h = sample_habit()
        self.assertEqual(longest_streak(h), 6)

    def test_longest_streak_with_gap(self):
        """Streak resets after a gap"""
        h = Habit('exercise')
        for day in [1, 2, 3, 7, 8]:
            h.log(D(2024, 6, day))
        self.assertEqual(longest_streak(h), 3)


# CHECKPOINT 2
class TestWeekly(unittest.TestCase):
    def test_completions_this_week_partial(self):
        """today=Sat Jun 1 2024 (ISO week starting Mon May 27): 6 logged days"""
        h = sample_habit()
        self.assertEqual(completions_this_week(h, D(2024, 6, 1)), 6)

    def test_completions_this_week_isolated_week(self):
        """A log in a previous week is not counted"""
        h = Habit('test')
        h.log(D(2024, 5, 20))  # previous week
        h.log(D(2024, 5, 28))  # current week (Tue)
        self.assertEqual(completions_this_week(h, D(2024, 6, 1)), 1)

    def test_hit_target_true(self):
        """5 completions, target 5 → hit"""
        h = sample_habit()  # 6 completions in week
        self.assertTrue(hit_target(h, D(2024, 6, 1)))

    def test_hit_target_false(self):
        """3 completions, target 5 → miss"""
        h = Habit('miss', target_per_week=5)
        for day in range(28, 31):
            h.log(D(2024, 5, day))
        self.assertFalse(hit_target(h, D(2024, 6, 1)))


# CHECKPOINT 3 + 4
class TestTrackerOverview(unittest.TestCase):
    def test_overview_includes_all_habits(self):
        """overview returns one entry per habit"""
        t = Tracker()
        t.add_habit(Habit('read', target_per_week=5))
        t.add_habit(Habit('exercise', target_per_week=3))
        t.log('read', D(2024, 6, 1))
        result = t.overview(D(2024, 6, 1))
        self.assertEqual(set(result.keys()), {'read', 'exercise'})

    def test_overview_fields_present(self):
        """Each overview entry has streak/this_week/on_target/total keys"""
        t = Tracker()
        t.add_habit(Habit('read', target_per_week=5))
        for day in range(28, 32):
            t.log('read', D(2024, 5, day))
        t.log('read', D(2024, 6, 1))
        result = t.overview(D(2024, 6, 1))
        entry = result['read']
        self.assertEqual(entry['streak'], 5)
        self.assertEqual(entry['this_week'], 5)
        self.assertTrue(entry['on_target'])
        self.assertEqual(entry['total'], 5)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [],
  stubs: [
    { file: 'streaks.py', function: 'current_streak', description: 'Consecutive days ending at today; 0 if today missing' },
    { file: 'streaks.py', function: 'longest_streak', description: 'Longest consecutive run anywhere in completions' },
    { file: 'weekly.py', function: 'completions_this_week', description: 'Count completions in the same Mon-Sun ISO week as today' },
    { file: 'weekly.py', function: 'hit_target', description: 'True if completions_this_week >= target_per_week' },
    { file: 'tracker.py', function: 'overview', description: 'Per-habit summary dict: streak, this_week, on_target, total' },
  ],
  checkpoints: [
    { id: 1, title: 'Streaks', ai_enabled: false, task: 'Implement current_streak and longest_streak in streaks.py. Think about when a streak resets. Do NOT use the AI assistant.' },
    { id: 2, title: 'Weekly View', ai_enabled: true, task: 'Implement completions_this_week and hit_target in weekly.py. Use week_of() to determine the Monday of any given date.' },
    { id: 3, title: 'Tracker Overview', ai_enabled: true, task: 'Implement Tracker.overview to combine streak/weekly/total info for every habit.' },
    { id: 4, title: 'Polish', ai_enabled: true, task: 'Verify all tests pass. Add a defensive check in Tracker.log if the habit is missing (already raises KeyError). Run the full suite and explain how each piece fits together in the chat.' },
  ],
};
