// Bug Hunt seed problems — codebases with seeded bugs.
// Every test must fail on day-0 code.
// Source code has NO comments revealing where bugs are.
// Each problem ships with:
//   - README.md      — project overview + architecture + "Known Issues" pointing to tickets/
//   - tickets/*.md   — one ticket per bug, describing the SYMPTOM only (no fix hints)
//   - main.py + expected_output.txt — runnable demo for diff-based diagnosis
//   - test_solution.py — unittest suite where every test fails on day-0 code

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Library Reservation Backend
// ─────────────────────────────────────────────────────────────────────────────

const lib_README = `# Library Reservation Backend

Welcome to the Loanstack team! Loanstack is the backend powering reservations
for a small public library system. Members place holds on books, the system
tracks active loans, and reports surface popular titles and per-member
activity to librarians.

## Project Structure

\`\`\`
models.py    — Book, Member, Reservation domain classes
policies.py  — borrowing limits and late-fee rules
library.py   — Library aggregate: add/reserve/return + queries
reports.py   — read-only reporting helpers (popular books, member summary)
main.py      — runnable demo exercising every section
expected_output.txt — what main.py SHOULD print
tickets/     — bugs filed against this service
\`\`\`

## Architecture

\`\`\`
            main.py / tests
                  │
                  ▼
           ┌──────────────┐
           │  Library     │  reserve / return / queries
           └──────┬───────┘
                  │ uses
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     models    policies   reports
\`\`\`

- **models.py** — plain data classes. \`Book.is_available()\` is the canonical
  "can someone reserve this?" check.
- **policies.py** — policy functions only. Library and reports both read from
  here so the rules live in one place.
- **library.py** — the aggregate. Owns the dicts of books/members and the
  reservation list.
- **reports.py** — pure functions over a Library. Never mutates.

## How to work this problem

1. Read \`README.md\` (you're here), then skim the tickets in \`tickets/\`.
2. Run \`main.py\` and compare against \`expected_output.txt\`.
3. Each diverging section maps to one or more tickets — fix one at a time.
4. Run \`test_solution.py\` to verify your fix didn't regress anything.

## Known Issues

Filed in \`tickets/\`:

- **LIB-401** — Single-copy book reports as unavailable
- **LIB-402** — Silver and gold members get the wrong borrowing limit
- **LIB-403** — Late fees seem way too high
- **LIB-404** — Reservation history leaks between unrelated callers
- **LIB-405** — \`popular_books\` returns the least-popular titles first
- **LIB-406** — \`member_summary\` returns nothing
`;

const lib_ticket_401 = `# LIB-401: Single-copy book reports as unavailable

**Status:** Open
**Priority:** P1
**Component:** Reservations / Catalog
**Reporter:** branch-librarian@loanstack

## Description

A book with exactly one copy in stock cannot be reserved. The catalog page
shows it as "unavailable" even though no one has it out.

## Steps to reproduce

1. Add a new \`Book\` with \`total_copies=1\` and zero reservations.
2. Call \`book.is_available()\`.

## Expected behavior

A book with 1 copy available should be reservable, same as a book with 5
copies available.

## Observed behavior

\`is_available()\` returns \`False\` for the single-copy case.
`;

const lib_ticket_402 = `# LIB-402: Silver and gold members get the wrong borrowing limit

**Status:** Open
**Priority:** P1
**Component:** Policies
**Reporter:** ops@loanstack

## Description

\`max_books_allowed\` is supposed to return 10 for premium tiers (silver, gold)
and 3 for basic. We have reports that basic-tier members are being allowed
to reserve far more than 3 books simultaneously.

## Steps to reproduce

1. Create a basic-tier member.
2. Call \`max_books_allowed(member)\`.

## Expected behavior

basic → 3, silver → 10, gold → 10.

## Observed behavior

basic members appear to share the premium limit. Something in
\`policies.max_books_allowed\` is matching every member.
`;

const lib_ticket_403 = `# LIB-403: Late fees seem way too high

**Status:** Open
**Priority:** P0
**Component:** Policies / Billing
**Reporter:** finance@loanstack

## Description

A member returned a book 5 days late (grace period = 3 days) and was billed
$2.50. They expected to pay $1.00 — two days past the grace period at $0.50
per day.

## Steps to reproduce

\`\`\`python
from policies import late_fee
late_fee(5, grace_period=3)
\`\`\`

## Expected behavior

5 days late, 3 of which are inside the grace period → 2 chargeable days
× $0.50 = **$1.00**.

## Observed behavior

Returns $2.50 — the function appears to charge for every late day, ignoring
the grace window.
`;

const lib_ticket_404 = `# LIB-404: Reservation history leaks between unrelated callers

**Status:** Open
**Priority:** P1
**Component:** Library API
**Reporter:** integration-team@loanstack

## Description

We added an optional \`history\` argument to \`Library.reserve\` so callers
could collect an audit trail. Two integration tests against fresh
\`Library\` instances are reporting state from previous test runs.

## Steps to reproduce

\`\`\`python
lib.reserve('X', 'Z', history=[])  # caller A passes an empty list
# ... later, in a totally separate test ...
lib.reserve('X', 'Z', history=[])  # caller B's list is somehow non-empty
\`\`\`

## Expected behavior

Each caller's \`history\` list contains only the reservations from their own
call.

## Observed behavior

The default \`history\` value appears to be **shared** across every call to
\`reserve\`. New entries pile up over time.
`;

const lib_ticket_405 = `# LIB-405: popular_books returns the least-popular titles

**Status:** Open
**Priority:** P2
**Component:** Reports
**Reporter:** product@loanstack

## Description

The "Most Popular This Month" widget on the homepage is showing books that
have been reserved zero or one times. \`popular_books(library, top_n=3)\` is
returning the wrong end of the ranking.

## Expected behavior

\`popular_books(top_n=3)\` returns the **3 most-reserved** books, highest
reservation count first.

## Observed behavior

It returns books in ascending order of reservation count — least popular
first.
`;

const lib_ticket_406 = `# LIB-406: member_summary returns nothing

**Status:** Open
**Priority:** P1
**Component:** Reports
**Reporter:** support@loanstack

## Description

The "My Account" page is showing an empty summary box for every member.
\`reports.member_summary(library, member_id)\` is returning \`None\` even when
the member has active reservations.

## Expected behavior

A dict with keys \`member_id\`, \`active_count\`, \`book_ids\`.

## Observed behavior

\`None\`.
`;

const lib_main = `from models import Book, Member
from library import Library
from policies import max_books_allowed, late_fee
from reports import popular_books, member_summary


def run():
    lib = Library()
    lib.add_book(Book('B1', 'Python 101', total_copies=1))
    lib.add_book(Book('B2', 'Databases', total_copies=3))
    lib.add_member(Member('M1', 'Alice', tier='basic'))
    lib.add_member(Member('M2', 'Bob', tier='gold'))

    # Single-copy book should be available
    print('--- Section A: availability ---')
    print('B1 available:', lib.books['B1'].is_available())

    # Member limits
    print('--- Section B: member limits ---')
    print('basic max:', max_books_allowed(lib.members['M1']))
    print('gold max:', max_books_allowed(lib.members['M2']))

    # Reservation flow
    print('--- Section C: reservations ---')
    r1 = lib.reserve('B1', 'M1')
    print('M1 reserved B1:', r1 is not None)
    print('M1 active count:', len(lib.member_active_reservations('M1')))

    # Late fees
    print('--- Section D: late fees ---')
    print('1 day late:', late_fee(1))
    print('4 days late (grace=3):', late_fee(4))
    print('5 days late (grace=3):', late_fee(5))

    # Popular books (after a few more reservations)
    lib.reserve('B2', 'M1')
    lib.reserve('B2', 'M2')
    print('--- Section E: reports ---')
    print('top 2 popular:', popular_books(lib, top_n=2))
    summary = member_summary(lib, 'M1')
    print('M1 summary:', summary)


if __name__ == '__main__':
    run()
`;

const lib_expected = `--- Section A: availability ---
B1 available: True
--- Section B: member limits ---
basic max: 3
gold max: 10
--- Section C: reservations ---
M1 reserved B1: True
M1 active count: 1
--- Section D: late fees ---
1 day late: 0.0
4 days late (grace=3): 0.5
5 days late (grace=3): 1.0
--- Section E: reports ---
top 2 popular: ['B2', 'B1']
M1 summary: {'member_id': 'M1', 'active_count': 2, 'book_ids': ['B1', 'B2']}
`;

export const bugHunt1 = {
  id: 'bug_hunt:seed:lib',
  domain: 'Library Reservation Backend',
  files: [
    { name: 'README.md', content: lib_README },
    { name: 'tickets/LIB-401.md', content: lib_ticket_401 },
    { name: 'tickets/LIB-402.md', content: lib_ticket_402 },
    { name: 'tickets/LIB-403.md', content: lib_ticket_403 },
    { name: 'tickets/LIB-404.md', content: lib_ticket_404 },
    { name: 'tickets/LIB-405.md', content: lib_ticket_405 },
    { name: 'tickets/LIB-406.md', content: lib_ticket_406 },
    {
      name: 'models.py',
      content: `class Book:
    def __init__(self, book_id, title, total_copies):
        self.book_id = book_id
        self.title = title
        self.total_copies = total_copies
        self.copies_reserved = 0

    def available_copies(self):
        return self.total_copies - self.copies_reserved

    def is_available(self):
        return self.available_copies() > 1


class Member:
    def __init__(self, member_id, name, tier='basic'):
        self.member_id = member_id
        self.name = name
        self.tier = tier


class Reservation:
    def __init__(self, book_id, member_id, reserved_on, due_date):
        self.book_id = book_id
        self.member_id = member_id
        self.reserved_on = reserved_on
        self.due_date = due_date
        self.returned = False
`,
    },
    {
      name: 'policies.py',
      content: `def max_books_allowed(member):
    if member.tier == 'gold' or 'silver':
        return 10
    return 3


def late_fee(days_late, grace_period=3):
    if days_late <= grace_period:
        return 0.0
    return days_late * 0.50
`,
    },
    {
      name: 'library.py',
      content: `import datetime
from models import Book, Reservation
from policies import max_books_allowed


class Library:
    def __init__(self):
        self.books = {}
        self.members = {}
        self.reservations = []

    def add_book(self, book):
        self.books[book.book_id] = book

    def add_member(self, member):
        self.members[member.member_id] = member

    def reserve(self, book_id, member_id, history=[]):
        book = self.books.get(book_id)
        member = self.members.get(member_id)
        if book is None or member is None:
            return None

        active_count = sum(
            1 for r in self.reservations
            if r.member_id == member_id and not r.returned
        )
        if active_count >= max_books_allowed(member):
            return None
        if not book.is_available():
            return None

        book.copies_reserved += 1
        today = datetime.date(2024, 6, 1)
        due = today + datetime.timedelta(days=14)
        r = Reservation(book_id, member_id, today, due)
        self.reservations.append(r)
        history.append((book_id, member_id))
        return r

    def return_book(self, book_id, member_id):
        for r in self.reservations:
            if r.book_id == book_id and r.member_id == member_id and not r.returned:
                r.returned = True
                book = self.books.get(book_id)
                if book is not None:
                    book.copies_reserved -= 1
                return True
        return False

    def member_active_reservations(self, member_id):
        return [r for r in self.reservations if r.member_id == member_id and not r.returned]
`,
    },
    {
      name: 'reports.py',
      content: `from collections import Counter


def popular_books(library, top_n=3):
    counter = Counter(r.book_id for r in library.reservations)
    sorted_items = sorted(counter.items(), key=lambda kv: kv[1])
    return [book_id for book_id, _ in sorted_items[:top_n]]


def member_summary(library, member_id):
    active = library.member_active_reservations(member_id)
    summary = {
        'member_id': member_id,
        'active_count': len(active),
        'book_ids': [r.book_id for r in active],
    }
`,
    },
    { name: 'main.py', content: lib_main },
    { name: 'expected_output.txt', content: lib_expected },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
import datetime
from models import Book, Member, Reservation
from library import Library
from policies import max_books_allowed, late_fee
from reports import popular_books, member_summary


def make_library():
    lib = Library()
    lib.add_book(Book('B1', 'Python 101', total_copies=2))
    lib.add_book(Book('B2', 'Algorithms', total_copies=1))
    lib.add_book(Book('B3', 'Databases', total_copies=3))
    lib.add_member(Member('M1', 'Alice', tier='basic'))
    lib.add_member(Member('M2', 'Bob', tier='gold'))
    return lib


# CHECKPOINT 1
class TestBookAvailability(unittest.TestCase):
    def test_book_available_with_one_copy_left(self):
        """Book with exactly 1 available copy must report available"""
        b = Book('B', 'Title', total_copies=1)
        self.assertTrue(b.is_available())

    def test_basic_member_max_books_is_three(self):
        """basic-tier member should have 3-book limit"""
        m = Member('M', 'X', tier='basic')
        self.assertEqual(max_books_allowed(m), 3)


# CHECKPOINT 2
class TestReservationFlow(unittest.TestCase):
    def test_reserve_history_isolated_between_calls(self):
        """history default arg must NOT leak between separate reserve() calls"""
        lib2 = Library()
        lib2.add_book(Book('X', 'X', 1))
        lib2.add_member(Member('Z', 'Z'))
        h = []
        lib2.reserve('X', 'Z', history=h)
        self.assertEqual(len(h), 1)
        h2 = []
        lib2.reserve('X', 'Z', history=h2)
        self.assertEqual(len(h2), 0)

    def test_basic_member_blocked_at_limit(self):
        """basic member with 3 active reservations cannot reserve a 4th"""
        lib = make_library()
        for bid in ['B1', 'B3', 'B3']:
            lib.reserve(bid, 'M1')
        lib.add_book(Book('B4', 'Extra', total_copies=2))
        result = lib.reserve('B4', 'M1')
        self.assertIsNone(result)


# CHECKPOINT 3
class TestPoliciesAndReports(unittest.TestCase):
    def test_late_fee_one_day_past_grace(self):
        """One day past grace=3 should charge for exactly that one day (0.50)"""
        self.assertAlmostEqual(late_fee(4, grace_period=3), 0.50)

    def test_late_fee_subtracts_grace(self):
        """5 days late with grace=3 should charge 2*0.50 = 1.00, not 5*0.50"""
        self.assertAlmostEqual(late_fee(5, grace_period=3), 1.00)

    def test_popular_books_sorted_desc(self):
        """popular_books should return most-reserved first"""
        lib = make_library()
        lib.reserve('B1', 'M1')
        lib.reserve('B3', 'M1')
        lib.reserve('B3', 'M2')
        result = popular_books(lib, top_n=2)
        self.assertEqual(result[0], 'B3')

    def test_member_summary_returns_dict(self):
        """member_summary must return a dict, not None"""
        lib = make_library()
        lib.reserve('B1', 'M2')
        result = member_summary(lib, 'M2')
        self.assertIsNotNone(result)
        self.assertEqual(result['member_id'], 'M2')


# CHECKPOINT 4
class TestEdgeCases(unittest.TestCase):
    def test_member_summary_active_count(self):
        """member_summary active_count must reflect current outstanding holds"""
        lib = make_library()
        lib.reserve('B1', 'M1')
        lib.reserve('B3', 'M1')
        result = member_summary(lib, 'M1')
        self.assertEqual(result['active_count'], 2)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    { file: 'models.py', description: 'Book availability check off-by-one' },
    { file: 'policies.py', description: 'Tier policy bug — limit applies to wrong groups' },
    { file: 'policies.py', description: 'Late fee math charges too much past the grace window' },
    { file: 'library.py', description: 'Reserve function carries state between calls' },
    { file: 'reports.py', description: 'Popular books returned in wrong order' },
    { file: 'reports.py', description: 'Member summary returns the wrong thing' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Orientation', ai_enabled: false, task: 'Read README.md and the tickets in tickets/. Run main.py and diff against expected_output.txt. Fix the bugs surfacing in Section A (LIB-401) and Section B (LIB-402). Do NOT use the AI assistant.' },
    { id: 2, title: 'Reservation Flow', ai_enabled: true, task: 'Diagnose why Section C diverges and fix the issues described in LIB-404. Verify the two reservation-flow tests pass.' },
    { id: 3, title: 'Policies & Reports', ai_enabled: true, task: 'Resolve LIB-403, LIB-405, and LIB-406 (late fees, popular books, member summary). Explain each fix in chat.' },
    { id: 4, title: 'Edge Cases', ai_enabled: true, task: 'Add input validation. Make sure the member-summary active-count test stays green.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Support Ticket Queue Backend
// ─────────────────────────────────────────────────────────────────────────────

const queue_README = `# Support Ticket Queue

Welcome to the Helpdesk team! This service routes inbound support tickets to
available agents. Customers create tickets via a web form; agents pull them
off a priority queue. Reports power the on-call dashboard and weekly load
review.

## Project Structure

\`\`\`
ticket.py    — Ticket model (id, customer, priority, status, events)
agent.py     — Agent model (id, max_load, active_tickets)
queue.py     — TicketQueue: submit / register agents / pick & assign next
reports.py   — agent_load_report, open_ticket_count, average_priority
main.py      — runnable demo exercising every section
expected_output.txt — what main.py SHOULD print
tickets/     — bugs filed against this service
\`\`\`

## Architecture

\`\`\`
   web form ──► TicketQueue.submit(ticket)
                       │
                       ▼
        TicketQueue.next_unassigned()  ◄── priority order
                       │
                       ▼
        TicketQueue.assign_next()  ──► picks an Agent with capacity
                       │
                       ▼
                Ticket.assign(agent_id)
\`\`\`

- **Priority convention:** lower number = more urgent (1 is the most urgent).
- **Statuses:** \`open\` → \`closed\`. No other states.
- **Reports** are pure functions over a TicketQueue — never mutate.

## How to work this problem

1. Read this README, then skim \`tickets/\`.
2. Run \`main.py\` and compare its output to \`expected_output.txt\`.
3. Each divergent section maps to one or more filed tickets.
4. \`test_solution.py\` is the source of truth for "fixed".

## Known Issues

- **TICKET-501** — Closed tickets aren't reported as closed
- **TICKET-502** — Agents are accepting one too many tickets
- **TICKET-503** — Queue picks the wrong ticket first
- **TICKET-504** — \`open_ticket_count\` includes closed tickets
- **TICKET-505** — \`average_priority\` loses fractional values
`;

const queue_ticket_501 = `# TICKET-501: Closed tickets aren't reported as closed

**Status:** Open
**Priority:** P0
**Component:** Ticket model
**Reporter:** dashboard-team@helpdesk

## Description

The agent dashboard groups tickets by status. We're seeing a column called
"close" with no items in our standard "closed" filter — tickets that were
closed are landing in a separate bucket.

## Steps to reproduce

\`\`\`python
t = Ticket('X', 'C', 1, 'demo')
t.close()
print(t.status, t.is_open())
\`\`\`

## Expected behavior

\`status == 'closed'\`, \`is_open() == False\`.

## Observed behavior

\`status\` is some other string, so the existing \`is_open()\` check returns
\`True\` (incorrectly) and dashboards group the ticket as "open".
`;

const queue_ticket_502 = `# TICKET-502: Agents are accepting one too many tickets

**Status:** Open
**Priority:** P1
**Component:** Agent capacity
**Reporter:** ops@helpdesk

## Description

Agents configured with \`max_load=N\` are ending up with \`N+1\` active tickets
during peak hours. We expected the capacity check to refuse the (N+1)th
assignment, but it doesn't.

## Steps to reproduce

\`\`\`python
a = Agent('A', 'X', max_load=2)
a.active_tickets = ['t1', 't2']  # already at cap
a.can_take(Ticket('T', 'C', 1, 'x'))
\`\`\`

## Expected behavior

\`can_take\` returns \`False\` when \`len(active_tickets) == max_load\`.

## Observed behavior

Returns \`True\` — the agent gets handed yet another ticket.
`;

const queue_ticket_503 = `# TICKET-503: Queue picks the wrong ticket first

**Status:** Open
**Priority:** P1
**Component:** Queue ordering
**Reporter:** product@helpdesk

## Description

We expect the queue to surface the most-urgent ticket first. With priorities
\`{T1: 3, T2: 1, T3: 5}\`, calling \`next_unassigned()\` should return T2.
It's returning T3.

## Reminder about priority

Lower number = more urgent. So priority **1** is more urgent than priority 5.

## Observed behavior

\`next_unassigned()\` returns the **least** urgent ticket.
`;

const queue_ticket_504 = `# TICKET-504: open_ticket_count includes closed tickets

**Status:** Open
**Priority:** P2
**Component:** Reports
**Reporter:** sla-team@helpdesk

## Description

Our SLA dashboard treats \`open_ticket_count\` as the number of tickets
currently needing attention. After a busy week of closed tickets, the
counter keeps climbing instead of resetting to roughly steady-state.

## Expected behavior

Closed tickets must NOT be counted.

## Observed behavior

\`open_ticket_count\` returns the total number of tickets ever submitted.
`;

const queue_ticket_505 = `# TICKET-505: average_priority loses fractional values

**Status:** Open
**Priority:** P2
**Component:** Reports
**Reporter:** analytics@helpdesk

## Description

The "Avg Priority" cell on the weekly load report always shows an integer.
For a queue with priorities [1, 2] we expect 1.5 but we see 1.

## Expected behavior

\`average_priority\` returns a float — true mean of the priorities, not the
truncated integer mean.

## Observed behavior

Returns an int rounded toward zero.
`;

const queue_main = `from ticket import Ticket
from agent import Agent
from queue import TicketQueue
from reports import agent_load_report, open_ticket_count, average_priority


def run():
    q = TicketQueue()
    q.register_agent(Agent('A1', 'Alice', max_load=1))
    q.register_agent(Agent('A2', 'Bob', max_load=3))
    q.submit(Ticket('T1', 'C1', priority=3, subject='font bug'))
    q.submit(Ticket('T2', 'C2', priority=1, subject='payment broken'))
    q.submit(Ticket('T3', 'C3', priority=5, subject='typo'))

    # Picking the next ticket
    print('--- Section A: picking next ---')
    nxt = q.next_unassigned()
    print('next ticket id:', nxt.ticket_id)
    print('next ticket priority:', nxt.priority)

    # Closing semantics
    print('--- Section B: closing ---')
    t = Ticket('X1', 'C', 1, 'demo')
    t.close()
    print('closed status:', t.status)
    print('is open after close:', t.is_open())

    # Assignment distribution
    print('--- Section C: assignment distribution ---')
    q.assign_next()
    q.assign_next()
    q.assign_next()
    report = agent_load_report(q)
    print('Alice load:', report['A1'])
    print('Bob load:', report['A2'])

    # Open count after close
    print('--- Section D: open ticket count ---')
    q2 = TicketQueue()
    q2.submit(Ticket('U1', 'C', 1, 'a'))
    q2.submit(Ticket('U2', 'C', 2, 'b'))
    q2.tickets[0].close()
    print('open count (1 closed of 2):', open_ticket_count(q2))

    # Numeric mean
    print('--- Section E: average priority ---')
    q3 = TicketQueue()
    q3.submit(Ticket('V1', 'C', 1, 'a'))
    q3.submit(Ticket('V2', 'C', 2, 'b'))
    avg = average_priority(q3)
    print('mean of [1, 2]:', avg)
    print('type is float:', isinstance(avg, float))


if __name__ == '__main__':
    run()
`;

const queue_expected = `--- Section A: picking next ---
next ticket id: T2
next ticket priority: 1
--- Section B: closing ---
closed status: closed
is open after close: False
--- Section C: assignment distribution ---
Alice load: 1
Bob load: 2
--- Section D: open ticket count ---
open count (1 closed of 2): 1
--- Section E: average priority ---
mean of [1, 2]: 1.5
type is float: True
`;

export const bugHunt2 = {
  id: 'bug_hunt:seed:queue',
  domain: 'Support Ticket Queue Backend',
  files: [
    { name: 'README.md', content: queue_README },
    { name: 'tickets/TICKET-501.md', content: queue_ticket_501 },
    { name: 'tickets/TICKET-502.md', content: queue_ticket_502 },
    { name: 'tickets/TICKET-503.md', content: queue_ticket_503 },
    { name: 'tickets/TICKET-504.md', content: queue_ticket_504 },
    { name: 'tickets/TICKET-505.md', content: queue_ticket_505 },
    {
      name: 'ticket.py',
      content: `class Ticket:
    def __init__(self, ticket_id, customer_id, priority, subject):
        self.ticket_id = ticket_id
        self.customer_id = customer_id
        self.priority = priority
        self.subject = subject
        self.status = 'open'
        self.assigned_to = None
        self.events = []

    def assign(self, agent_id):
        self.assigned_to = agent_id
        self.events.append(('assigned', agent_id))

    def close(self):
        self.status = 'close'
        self.events.append(('closed',))

    def is_open(self):
        return self.status == 'open'
`,
    },
    {
      name: 'agent.py',
      content: `class Agent:
    def __init__(self, agent_id, name, max_load=5, skills=None):
        self.agent_id = agent_id
        self.name = name
        self.max_load = max_load
        self.skills = skills if skills is not None else []
        self.active_tickets = []

    def can_take(self, ticket):
        return len(self.active_tickets) <= self.max_load

    def load(self):
        return len(self.active_tickets)
`,
    },
    {
      name: 'queue.py',
      content: `from ticket import Ticket
from agent import Agent


class TicketQueue:
    def __init__(self):
        self.tickets = []
        self.agents = {}

    def submit(self, ticket):
        self.tickets.append(ticket)

    def register_agent(self, agent):
        self.agents[agent.agent_id] = agent

    def next_unassigned(self):
        unassigned = [t for t in self.tickets if t.assigned_to is None and t.is_open()]
        if not unassigned:
            return None
        return max(unassigned, key=lambda t: t.priority)

    def assign_next(self):
        ticket = self.next_unassigned()
        if ticket is None:
            return None
        for agent in self.agents.values():
            if agent.can_take(ticket):
                ticket.assign(agent.agent_id)
                agent.active_tickets.append(ticket.ticket_id)
                return ticket
        return None
`,
    },
    {
      name: 'reports.py',
      content: `from collections import Counter


def agent_load_report(queue):
    return {
        agent.agent_id: agent.load()
        for agent in queue.agents.values()
    }


def open_ticket_count(queue):
    return len(queue.tickets)


def average_priority(queue):
    open_tickets = [t for t in queue.tickets if t.is_open()]
    if not open_tickets:
        return 0
    total = sum(t.priority for t in open_tickets)
    return total // len(open_tickets)
`,
    },
    { name: 'main.py', content: queue_main },
    { name: 'expected_output.txt', content: queue_expected },
  ],
  test_file: {
    name: 'test_solution.py',
    content: `import unittest
from ticket import Ticket
from agent import Agent
from queue import TicketQueue
from reports import agent_load_report, open_ticket_count, average_priority


def setup_queue():
    q = TicketQueue()
    q.register_agent(Agent('A1', 'Alice', max_load=2))
    q.register_agent(Agent('A2', 'Bob', max_load=3))
    q.submit(Ticket('T1', 'C1', priority=3, subject='font bug'))
    q.submit(Ticket('T2', 'C2', priority=1, subject='payment broken'))
    q.submit(Ticket('T3', 'C3', priority=5, subject='typo'))
    return q


# CHECKPOINT 1
class TestTicketBasics(unittest.TestCase):
    def test_ticket_close_sets_status(self):
        """Ticket.close should set status to 'closed' (not a typo'd value)"""
        t = Ticket('X', 'C', 1, 'hi')
        t.close()
        self.assertEqual(t.status, 'closed')

    def test_closed_ticket_records_correct_event(self):
        """Closing a ticket must store the literal string 'closed' in events"""
        t = Ticket('X', 'C', 1, 'hi')
        t.close()
        self.assertEqual(t.status, 'closed')
        self.assertFalse(t.is_open())

    def test_agent_can_take_at_capacity(self):
        """Agent at max_load must NOT accept another ticket"""
        a = Agent('A', 'X', max_load=2)
        a.active_tickets = ['t1', 't2']
        self.assertFalse(a.can_take(Ticket('T', 'C', 1, 'x')))


# CHECKPOINT 2
class TestQueueOrdering(unittest.TestCase):
    def test_next_unassigned_returns_urgent_first(self):
        """next_unassigned must return the lowest-numbered priority (most urgent)"""
        q = setup_queue()
        t = q.next_unassigned()
        self.assertEqual(t.ticket_id, 'T2')

    def test_assign_next_chooses_urgent(self):
        """assign_next must pick the urgent ticket and assign an agent"""
        q = setup_queue()
        assigned = q.assign_next()
        self.assertIsNotNone(assigned)
        self.assertEqual(assigned.ticket_id, 'T2')
        self.assertIsNotNone(assigned.assigned_to)


# CHECKPOINT 3
class TestReports(unittest.TestCase):
    def test_open_ticket_count_excludes_closed(self):
        """open_ticket_count must NOT include closed tickets"""
        q = setup_queue()
        q.tickets[0].close()
        self.assertEqual(open_ticket_count(q), 2)

    def test_average_priority_returns_float_type(self):
        """average_priority must return a float type, not an int (floor-divided)"""
        q = setup_queue()
        result = average_priority(q)
        self.assertIsInstance(result, float)

    def test_average_priority_fractional(self):
        """Mean of [1,2] should be 1.5, not 1"""
        q = TicketQueue()
        q.submit(Ticket('T1', 'C', priority=1, subject='a'))
        q.submit(Ticket('T2', 'C', priority=2, subject='b'))
        self.assertAlmostEqual(average_priority(q), 1.5)


# CHECKPOINT 4
class TestIntegration(unittest.TestCase):
    def test_full_assignment_cycle(self):
        """A submitted urgent ticket should be auto-assignable and counted as open"""
        q = setup_queue()
        q.assign_next()
        urgent = next(t for t in q.tickets if t.ticket_id == 'T2')
        self.assertIsNotNone(urgent.assigned_to)
        self.assertEqual(open_ticket_count(q), 3)

    def test_agent_load_report_respects_max_load(self):
        """After 3 assignments to a queue where Alice can take 2 and Bob can take 3,
        Bob must get at least 1 ticket once Alice is full."""
        q = setup_queue()
        q.submit(Ticket('T4', 'C4', priority=2, subject='login broken'))
        for _ in range(3):
            q.assign_next()
        report = agent_load_report(q)
        self.assertGreaterEqual(report['A2'], 1)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    { file: 'ticket.py', description: 'Ticket close stores the wrong status value' },
    { file: 'agent.py', description: 'Agent capacity check off-by-one' },
    { file: 'queue.py', description: 'Wrong end of the priority queue is picked' },
    { file: 'reports.py', description: 'open_ticket_count includes closed tickets' },
    { file: 'reports.py', description: 'average_priority loses fractional values' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Orientation', ai_enabled: false, task: 'Read README.md and the tickets in tickets/. Run main.py and diff against expected_output.txt. Fix the issues described in TICKET-501 (Section B) and TICKET-503 (Section A). Do NOT use the AI assistant.' },
    { id: 2, title: 'Queue Ordering', ai_enabled: true, task: 'Resolve TICKET-502 (agent capacity) and verify Section C now distributes correctly.' },
    { id: 3, title: 'Reports', ai_enabled: true, task: 'Fix TICKET-504 and TICKET-505 in reports.py. Explain why integer division is the wrong tool here.' },
    { id: 4, title: 'Edge Cases', ai_enabled: true, task: 'Confirm assign_next returns None gracefully when no agent has capacity. Keep all integration tests green.' },
  ],
};
