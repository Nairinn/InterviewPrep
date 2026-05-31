// Feature Implementation seed problems — stubs to fill in.
// Every test must fail on day-0 code (every test exercises at least one stub).
// Each problem ships with README.md + tickets/*.md describing the
// to-be-built features.

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Personal Finance Tracker
// ─────────────────────────────────────────────────────────────────────────────

const fin_README = `# Personal Finance Tracker

Welcome to the Wallet team! Wallet is a personal-finance tracker. Users
record transactions (income or expense), tag them with categories, and view
monthly budget summaries. The data model is already in place; several
feature methods are stubbed and need implementation.

## Project Structure

\`\`\`
transaction.py  — Transaction model (id, amount, description, date, category)
account.py      — Account: balance + windowed queries (TWO STUBS)
categories.py   — Keyword-based auto-categorization (ONE STUB)
budget.py       — Budget limits and per-category over/under (ONE STUB)
reports.py      — Monthly summary + daily-spend reports (TWO STUBS)
tickets/        — feature tickets, one per stub
\`\`\`

## Architecture

\`\`\`
Transaction ──► Account ──► Reports / Budget
                  │              │
                  └─► categories.auto_categorize
\`\`\`

- **Amount convention:** positive = income, negative = expense.
- **Deterministic dates:** tests pass an explicit \`today\` so stubs that take
  "the last N days" should accept and respect that argument; default to
  \`datetime.date(2024, 6, 1)\` when not supplied.

## Conventions

- Stubs raise \`NotImplementedError\` until you fill them in.
- Each stub's docstring/comment block names the behavior — read it before
  coding.
- Tests in \`test_solution.py\` cover all four checkpoints. Every test
  currently fails because every code path goes through at least one stub.

## Tickets

- **FIN-001** — Implement \`Account.balance\`
- **FIN-002** — Implement \`Account.last_n_days\`
- **FIN-003** — Implement \`auto_categorize\`
- **FIN-004** — Implement \`Budget.over_under\`
- **FIN-005** — Implement \`monthly_summary\`
- **FIN-006** — Implement \`average_daily_spend\` (and its validation)
`;

const fin_t1 = `# FIN-001: Implement Account.balance

**Status:** To Do
**Priority:** P0
**Component:** Account
**File:** \`account.py\`

## Background

\`Account\` holds a starting balance and a list of \`Transaction\` objects.
We need a \`balance()\` method that returns the current balance.

## Acceptance criteria

- \`Account('x', starting_balance=250.0)\` with no transactions → \`balance() == 250.0\`
- For each transaction, \`amount\` is positive for income or negative for
  expense — so the running balance is \`starting_balance + sum(amounts)\`.
- Return type: \`float\`.
`;

const fin_t2 = `# FIN-002: Implement Account.last_n_days

**Status:** To Do
**Priority:** P0
**Component:** Account
**File:** \`account.py\`

## Background

Several reports need "transactions in the last N days". Implement a windowed
query on \`Account\` that filters by date.

## Acceptance criteria

- Signature: \`last_n_days(n, today=None)\`.
- If \`today is None\`, default to \`datetime.date(2024, 6, 1)\` so tests are
  deterministic.
- Window is **inclusive on both ends**: \`today - (n - 1) <= tx.date <= today\`.
- Returns a list of \`Transaction\` objects (order can match insertion order).

### Example

\`last_n_days(3, today=date(2024, 6, 1))\` includes transactions dated
\`5/30\`, \`5/31\`, and \`6/1\`.
`;

const fin_t3 = `# FIN-003: Implement auto_categorize

**Status:** To Do
**Priority:** P1
**Component:** Categorization
**File:** \`categories.py\`

## Background

Transactions arrive without a category set. We have a keyword map
(\`KEYWORDS\`) like:

\`\`\`python
{'groceries': ['supermarket', 'grocery', 'whole foods', 'trader joe'], ...}
\`\`\`

Auto-categorize by matching the transaction's \`description\` against the
keywords.

## Acceptance criteria

- Match is **case-insensitive substring**.
- Return the **first** category that has any keyword matching.
- If nothing matches, return \`'uncategorized'\`.

### Example

- "Whole Foods Market" → \`groceries\`
- "COFFEE break at office" → \`dining\`
- "Mystery vendor" → \`uncategorized\`
`;

const fin_t4 = `# FIN-004: Implement Budget.over_under

**Status:** To Do
**Priority:** P1
**Component:** Budget
**File:** \`budget.py\`

## Background

\`Budget\` holds per-category monthly limits. We need a function that returns
remaining budget per category for a given (year, month).

## Acceptance criteria

- For each category in \`self.limits\`, compute the absolute total of expense
  transactions in that (year, month) tagged with the category.
- Return \`{ category: limit - spent }\` — positive = under budget,
  negative = over.
- Categories with **no** matching transactions still appear in the result
  (with the full limit remaining).
`;

const fin_t5 = `# FIN-005: Implement monthly_summary

**Status:** To Do
**Priority:** P1
**Component:** Reports
**File:** \`reports.py\`

## Background

The monthly view needs income, expense, net, and a per-category expense
breakdown — all for one (year, month).

## Acceptance criteria

\`monthly_summary(account, year, month)\` returns a dict with keys:

- \`income\` — sum of positive amounts that month
- \`expenses\` — **absolute** sum of negative amounts that month
- \`net\` — \`income - expenses\`
- \`by_category\` — dict mapping each category (or \`'uncategorized'\`) to its
  total expense in that month

Only consider transactions whose \`date\` falls in the given month.
`;

const fin_t6 = `# FIN-006: Implement average_daily_spend

**Status:** To Do
**Priority:** P2
**Component:** Reports
**File:** \`reports.py\`

## Background

Returns the average daily expense over the last \`n_days\`, useful for the
"burn rate" widget.

## Acceptance criteria

- Signature: \`average_daily_spend(account, n_days, today=None)\`.
- Same \`today\` default as \`Account.last_n_days\` (use
  \`datetime.date(2024, 6, 1)\`).
- Returns \`total_expense / n_days\` as a float, where \`total_expense\` is the
  absolute sum of expense amounts in the window.
- If \`n_days <= 0\`, raise \`ValueError\`.
`;

export const feature1 = {
  id: 'feature:seed:finance',
  domain: 'Personal Finance Tracker',
  files: [
    { name: 'README.md', content: fin_README },
    { name: 'tickets/FIN-001.md', content: fin_t1 },
    { name: 'tickets/FIN-002.md', content: fin_t2 },
    { name: 'tickets/FIN-003.md', content: fin_t3 },
    { name: 'tickets/FIN-004.md', content: fin_t4 },
    { name: 'tickets/FIN-005.md', content: fin_t5 },
    { name: 'tickets/FIN-006.md', content: fin_t6 },
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
        # TODO STUB 1 (FIN-001): Return the current balance.
        # Starting balance plus the sum of every transaction amount.
        raise NotImplementedError('account.balance')

    def last_n_days(self, n, today=None):
        # TODO STUB 2 (FIN-002): Return transactions whose date is within
        # the last n days from 'today'. If today is None, use
        # datetime.date(2024, 6, 1) as the reference point so tests are
        # deterministic. The window is inclusive on both ends:
        # today - (n-1) <= tx.date <= today.
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
    # TODO STUB 3 (FIN-003): Inspect transaction.description
    # (case-insensitive). Return the first category whose any keyword
    # appears as a substring of the description. If nothing matches,
    # return 'uncategorized'.
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
        # TODO STUB 4 (FIN-004): For each category in self.limits, compute:
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
    # TODO STUB 5 (FIN-005): Return a dict with these keys:
    #   'income'   — sum of positive amounts that month
    #   'expenses' — absolute sum of negative amounts that month
    #   'net'      — income - expenses
    #   'by_category' — dict mapping each category (or 'uncategorized')
    #                   to total expense in that category
    raise NotImplementedError('reports.monthly_summary')


def average_daily_spend(account, n_days, today=None):
    # TODO STUB 6 (FIN-006): Compute average daily expense over the last
    # n_days. Use the same 'today' default (datetime.date(2024, 6, 1)) as
    # account.last_n_days. Return total_expense / n_days as a float. If
    # n_days <= 0, raise ValueError.
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
    { id: 1, title: 'Foundation', ai_enabled: false, task: 'Read README.md, then tickets/FIN-001 and FIN-002. Implement Account.balance and Account.last_n_days in account.py. Do NOT use the AI assistant.' },
    { id: 2, title: 'Categorization', ai_enabled: true, task: 'Implement tickets/FIN-003 in categories.py. Use the KEYWORDS map, case-insensitive substring match, and fall back to "uncategorized".' },
    { id: 3, title: 'Budgets & Reports', ai_enabled: true, task: 'Implement tickets/FIN-004 and FIN-005. Both filter transactions to a given (year, month).' },
    { id: 4, title: 'Polish & Validation', ai_enabled: true, task: 'Implement tickets/FIN-006 including the ValueError on non-positive n_days.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Habit Tracker
// ─────────────────────────────────────────────────────────────────────────────

const habit_README = `# Habit Tracker

Welcome to the Streaks team! Streaks is a personal habit tracker — users
define habits with a weekly target and log completions per calendar date.
The UI shows current streak, weekly progress, and an overall dashboard.
The model classes exist; the streak math and weekly reporting are stubbed.

## Project Structure

\`\`\`
habit.py     — Habit model (name, target_per_week, completions)
streaks.py   — current_streak + longest_streak (TWO STUBS)
weekly.py    — week_of, completions_this_week, hit_target (TWO STUBS)
tracker.py   — Tracker aggregate + overview() report (ONE STUB)
tickets/     — feature tickets, one per stub
\`\`\`

## Architecture

\`\`\`
   Habit ──► streaks.current_streak / longest_streak
     │
     └─► weekly.completions_this_week → weekly.hit_target
            │
            ▼
       Tracker.overview()  (combines streak + weekly + total)
\`\`\`

## Conventions

- All dates are \`datetime.date\` objects (no datetimes, no strings).
- A "week" is the **ISO week starting Monday** (use \`weekly.week_of\`).
- Completions are deduplicated: \`Habit.log\` already drops same-day repeats.

## Tickets

- **HABIT-001** — \`current_streak\`
- **HABIT-002** — \`longest_streak\`
- **HABIT-003** — \`completions_this_week\`
- **HABIT-004** — \`hit_target\`
- **HABIT-005** — \`Tracker.overview\`
`;

const habit_t1 = `# HABIT-001: Implement current_streak

**Status:** To Do
**Priority:** P0
**Component:** Streaks
**File:** \`streaks.py\`

## Background

The dashboard's biggest number is "current streak" — how many consecutive
days, ending today, the user has logged this habit.

## Acceptance criteria

- Signature: \`current_streak(habit, today)\`.
- If \`today\` itself is **not** in \`habit.completions\` → streak is 0 (broken).
- Otherwise walk backward day-by-day; stop when you hit a missing date.
- Return the count as an int.

### Example

Completions \`Jun 1, 2, 3\` and \`today=Jun 3\` → streak \`3\`.
Completions \`Jun 1, 2, 3\` and \`today=Jun 4\` → streak \`0\`.
`;

const habit_t2 = `# HABIT-002: Implement longest_streak

**Status:** To Do
**Priority:** P1
**Component:** Streaks
**File:** \`streaks.py\`

## Background

For the "all-time best" badge, return the longest consecutive run anywhere
in the habit's completion history.

## Acceptance criteria

- Signature: \`longest_streak(habit)\`.
- Returns an int — the length of the longest consecutive-day run.
- Empty completions → \`0\`.

### Example

Completions \`Jun 1, 2, 3, 7, 8\` → \`3\` (the Jun 1–3 run).
`;

const habit_t3 = `# HABIT-003: Implement completions_this_week

**Status:** To Do
**Priority:** P1
**Component:** Weekly
**File:** \`weekly.py\`

## Background

Drives the "X / target" widget. Counts how many of the user's completions
fall in the **same ISO week** as a given \`today\`.

## Acceptance criteria

- Signature: \`completions_this_week(habit, today)\`.
- "Same ISO week" = Monday–Sunday, **inclusive**. Use the provided
  \`week_of(day)\` helper to find the Monday.
- Return the count as an int.
`;

const habit_t4 = `# HABIT-004: Implement hit_target

**Status:** To Do
**Priority:** P2
**Component:** Weekly
**File:** \`weekly.py\`

## Background

Drives the green checkmark on each habit row.

## Acceptance criteria

- Signature: \`hit_target(habit, today)\`.
- Returns \`True\` iff \`completions_this_week(habit, today) >= habit.target_per_week\`.
- Returns \`False\` otherwise.
`;

const habit_t5 = `# HABIT-005: Implement Tracker.overview

**Status:** To Do
**Priority:** P1
**Component:** Tracker dashboard
**File:** \`tracker.py\`

## Background

The dashboard view calls one method to get everything it needs to render
each habit row.

## Acceptance criteria

\`tracker.overview(today)\` returns a dict:

\`\`\`python
{ habit_name: {
    'streak':    int,  # current_streak(habit, today)
    'this_week': int,  # completions_this_week(habit, today)
    'on_target': bool, # hit_target(habit, today)
    'total':     int,  # habit.total_completions()
} }
\`\`\`

Every habit in \`self.habits\` must appear, even with empty completions.
`;

export const feature2 = {
  id: 'feature:seed:habit',
  domain: 'Habit Tracker',
  files: [
    { name: 'README.md', content: habit_README },
    { name: 'tickets/HABIT-001.md', content: habit_t1 },
    { name: 'tickets/HABIT-002.md', content: habit_t2 },
    { name: 'tickets/HABIT-003.md', content: habit_t3 },
    { name: 'tickets/HABIT-004.md', content: habit_t4 },
    { name: 'tickets/HABIT-005.md', content: habit_t5 },
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
    # TODO STUB 1 (HABIT-001): Count consecutive days ending at 'today' where
    # the habit was completed. Example: completions on June 1, 2, 3 and
    # today=June 3 -> streak 3. If today itself is missing, streak is 0
    # (broken).
    raise NotImplementedError('streaks.current_streak')


def longest_streak(habit):
    # TODO STUB 2 (HABIT-002): Find the longest run of consecutive days in
    # habit.completions. Returns the length as an int. Empty completions -> 0.
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
    # TODO STUB 3 (HABIT-003): Return the number of completions whose date
    # is in the same ISO week as 'today' (Monday-Sunday inclusive).
    raise NotImplementedError('weekly.completions_this_week')


def hit_target(habit, today):
    # TODO STUB 4 (HABIT-004): True if
    #   completions_this_week(habit, today) >= habit.target_per_week.
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
        # TODO STUB 5 (HABIT-005): Return a dict mapping each habit name to:
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
        """6 consecutive days ending today -> streak 6"""
        h = sample_habit()
        self.assertEqual(current_streak(h, D(2024, 6, 1)), 6)

    def test_current_streak_broken(self):
        """If today itself is unlogged, streak is 0"""
        h = sample_habit()
        self.assertEqual(current_streak(h, D(2024, 6, 2)), 0)

    def test_longest_streak_simple(self):
        """6 consecutive days -> longest 6"""
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
        """5 completions, target 5 -> hit"""
        h = sample_habit()  # 6 completions in week
        self.assertTrue(hit_target(h, D(2024, 6, 1)))

    def test_hit_target_false(self):
        """3 completions, target 5 -> miss"""
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
    { id: 1, title: 'Streaks', ai_enabled: false, task: 'Read README.md and tickets/HABIT-001 + HABIT-002. Implement current_streak and longest_streak in streaks.py. Do NOT use the AI assistant.' },
    { id: 2, title: 'Weekly View', ai_enabled: true, task: 'Implement tickets/HABIT-003 and HABIT-004 in weekly.py. Use week_of() to determine the Monday of any given date.' },
    { id: 3, title: 'Tracker Overview', ai_enabled: true, task: 'Implement tickets/HABIT-005 to combine streak / weekly / total info for every habit.' },
    { id: 4, title: 'Polish', ai_enabled: true, task: 'Verify all tests pass. Run the full suite and explain how each piece fits together in the chat.' },
  ],
};
