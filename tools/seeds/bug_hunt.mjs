// Bug Hunt seed problems — codebases with seeded bugs.
// Every test must fail on day-0 code.

export const bugHunt1 = {
  id: 'bug_hunt:seed:lib',
  domain: 'Library Reservation Backend',
  files: [
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
        # BUG: should be >= 1 to count a single available copy
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
    # BUG: 'or' on truthy literal — always returns 10 because the tier check short-circuits
    if member.tier == 'gold' or 'silver':
        return 10
    return 3


def late_fee(days_late, grace_period=3):
    if days_late <= grace_period:
        return 0.0
    # BUG: charges for every day including the free grace ones — should subtract grace_period
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
        # BUG: mutable default arg — every call shares the same list
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
    # BUG: sorts ascending by count instead of descending
    sorted_items = sorted(counter.items(), key=lambda kv: kv[1])
    return [book_id for book_id, _ in sorted_items[:top_n]]


def member_summary(library, member_id):
    active = library.member_active_reservations(member_id)
    summary = {
        'member_id': member_id,
        'active_count': len(active),
        'book_ids': [r.book_id for r in active],
    }
    # BUG: missing return statement
`,
    },
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
        lib = make_library()
        r1 = lib.reserve('B1', 'M1')
        r2 = lib.reserve('B3', 'M2')
        # If mutable default leaks, history list grows across calls.
        # We assert by checking a fresh instance starts clean.
        lib2 = Library()
        lib2.add_book(Book('X', 'X', 1))
        lib2.add_member(Member('Z', 'Z'))
        h = []
        lib2.reserve('X', 'Z', history=h)
        self.assertEqual(len(h), 1)
        h2 = []
        lib2.reserve('X', 'Z', history=h2)  # already reserved → returns None, no append
        self.assertEqual(len(h2), 0)

    def test_basic_member_blocked_at_limit(self):
        """basic member with 3 active reservations cannot reserve a 4th"""
        lib = make_library()
        for bid in ['B1', 'B3', 'B3']:
            lib.reserve(bid, 'M1')
        # B4 has 2 copies so is_available() works even with the boundary bug
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
        # B3 has 2 reservations, B1 has 1
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
    { file: 'models.py', line_hint: 12, description: 'Book.is_available uses > 1 instead of >= 1' },
    { file: 'policies.py', line_hint: 3, description: "max_books_allowed uses 'or' on truthy literal — always returns 10" },
    { file: 'policies.py', line_hint: 9, description: 'late_fee uses <= grace_period; the boundary day is treated incorrectly' },
    { file: 'library.py', line_hint: 18, description: 'Library.reserve has mutable default arg history=[]' },
    { file: 'reports.py', line_hint: 6, description: 'popular_books sorts ascending — should be descending' },
    { file: 'reports.py', line_hint: 17, description: 'member_summary missing return statement' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Orientation', ai_enabled: false, task: 'Run the tests. Fix the bug in Book.is_available (models.py) and the bug in max_books_allowed (policies.py). Do not use the AI assistant.' },
    { id: 2, title: 'Reservation Flow', ai_enabled: true, task: 'Fix the mutable-default-argument bug in Library.reserve so each call uses an isolated history list, then verify the basic-tier reservation limit works.' },
    { id: 3, title: 'Policies & Reports', ai_enabled: true, task: 'Fix the late-fee boundary bug, the popular_books sort direction, and the missing return in member_summary. Explain each fix in chat.' },
    { id: 4, title: 'Edge Cases', ai_enabled: true, task: 'Add input validation to Library.reserve (reject when book_id or member_id is missing — already partially handled) and Library.return_book. Make sure the gold-tier and active-count tests pass cleanly.' },
  ],
};

export const bugHunt2 = {
  id: 'bug_hunt:seed:queue',
  domain: 'Support Ticket Queue Backend',
  files: [
    {
      name: 'ticket.py',
      content: `class Ticket:
    def __init__(self, ticket_id, customer_id, priority, subject):
        self.ticket_id = ticket_id
        self.customer_id = customer_id
        self.priority = priority  # 1 (urgent) .. 5 (low)
        self.subject = subject
        self.status = 'open'
        self.assigned_to = None
        self.events = []

    def assign(self, agent_id):
        self.assigned_to = agent_id
        self.events.append(('assigned', agent_id))

    def close(self):
        # BUG: status should change to 'closed', this is a typo
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
        # BUG: mutable default avoidance is fine but skills=None then leaks if not assigned
        # Real bug below:
        self.skills = skills if skills is not None else []
        self.active_tickets = []

    def can_take(self, ticket):
        # BUG: should be < max_load, using <= overshoots by one
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
        # BUG: returns LOWEST-priority ticket (highest number) instead of highest (lowest number)
        unassigned = [t for t in self.tickets if t.assigned_to is None and t.is_open()]
        if not unassigned:
            return None
        return max(unassigned, key=lambda t: t.priority)

    def assign_next(self):
        ticket = self.next_unassigned()
        if ticket is None:
            return None
        # Find an agent who can take it
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
    # BUG: counts ALL tickets instead of just open ones
    return len(queue.tickets)


def average_priority(queue):
    open_tickets = [t for t in queue.tickets if t.is_open()]
    if not open_tickets:
        return 0
    total = sum(t.priority for t in open_tickets)
    # BUG: integer division truncates; should be float division
    return total // len(open_tickets)
`,
    },
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
        # Verifies status is exactly 'closed' — the typo bug stores 'close'
        self.assertEqual(t.status, 'closed')
        # And a closed ticket must not appear as open
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
        q.tickets[0].close()  # close T1
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
        # T2 was urgent, should be assigned now
        urgent = next(t for t in q.tickets if t.ticket_id == 'T2')
        self.assertIsNotNone(urgent.assigned_to)
        # Open count still 3
        self.assertEqual(open_ticket_count(q), 3)

    def test_agent_load_report_respects_max_load(self):
        """After 3 assignments to a queue where Alice can take 2 and Bob can take 3,
        Bob must get at least 1 ticket once Alice is full."""
        q = setup_queue()
        # Add a 4th ticket so we have 4 to distribute
        q.submit(Ticket('T4', 'C4', priority=2, subject='login broken'))
        for _ in range(3):
            q.assign_next()
        report = agent_load_report(q)
        # Bug (<=) allows Alice to hold 3 tickets; fix (<) caps her at 2 so Bob gets at least 1
        self.assertGreaterEqual(report['A2'], 1)


if __name__ == '__main__':
    unittest.main()
`,
  },
  bugs: [
    { file: 'ticket.py', line_hint: 15, description: "Ticket.close sets status to 'close' instead of 'closed'" },
    { file: 'agent.py', line_hint: 12, description: 'Agent.can_take uses <= max_load — off-by-one allowing capacity+1' },
    { file: 'queue.py', line_hint: 19, description: 'next_unassigned uses max() on priority, returning lowest-urgency ticket' },
    { file: 'reports.py', line_hint: 11, description: 'open_ticket_count returns total ticket count instead of filtering open ones' },
    { file: 'reports.py', line_hint: 19, description: 'average_priority uses // (integer division) instead of /' },
  ],
  stubs: [],
  checkpoints: [
    { id: 1, title: 'Orientation', ai_enabled: false, task: 'Run the tests. Fix Ticket.close (ticket.py) and Agent.can_take (agent.py) without the AI assistant.' },
    { id: 2, title: 'Queue Ordering', ai_enabled: true, task: 'Fix TicketQueue.next_unassigned so it returns the most urgent (lowest priority number) ticket. Verify both queue tests pass.' },
    { id: 3, title: 'Reports', ai_enabled: true, task: 'Fix open_ticket_count and average_priority in reports.py. Explain why integer division is the wrong tool here.' },
    { id: 4, title: 'Edge Cases', ai_enabled: true, task: 'Add an integration check: when no agents have capacity, assign_next should return None gracefully. Make sure the two integration tests stay green.' },
  ],
};
