CampusFlow Backend Brain

Single source of truth for the CampusFlow backend. Read this fully before writing any backend code. Derived from the final Phase 1 deck (MiniProjectFinal.pptx). Where this file and the deck disagree, the deck wins and this file must be fixed. The folder and file structure is deliberately NOT defined here. The team defines it. This file names logical modules only; map each one to your own files.

0. How to use this file
Build in the order of section 16. Do not skip ahead.
Every rule marked MUST is a design guarantee the evaluation depends on.
Anything marked ASSUMPTION is a decision I made where the deck was silent. Section 17 lists them so the team can confirm or change them.
Keep controllers thin. All business rules live in services (section 3).
Never read Date.now() or new Date() directly in business logic. Use the clock service (section 3.4) so tests and simulation can control time.
1. What CampusFlow is, and what makes it not plain CRUD

CampusFlow runs a college event from proposal to attendance. The CRUD layer is thin. The value is four decision engines:

#	Engine	Guarantee (MUST)
1	Clash engine	A proposal is blocked at submission if it overlaps another slot-holding event on venue, organiser club, audience, or exceeds venue capacity. On a clash it returns the reasons and 2 to 3 nearest free slots.
2	Approval workflow	Clubs are verified once by an admin. Each event is approved by a faculty coordinator through a secure email link plus a one-time code. Only legal transitions occur. Overdue requests escalate automatically.
3	Participation engine	Seats are never overbooked, even under concurrent requests. Cancellations promote the waitlist automatically.
4	Attendance engine	Each confirmed student gets one personal, HMAC-signed, single-use QR ticket, hidden until 24 hours before the event, accepted only inside the check-in window.

Out of scope (do not build): online payments, chat or social feed, native mobile app. Stretch only: recommendations, turnout forecast, rotating (time-window) QR.

2. Tech stack
Concern	Choice
Runtime	Node.js LTS (20 or newer)
Web framework	Express
Database	MongoDB with Mongoose
Auth	JWT access token, bcrypt password hashing
Validation	zod (or Joi, pick one and use it everywhere)
Scheduled jobs	node-cron (in-process)
Email	Nodemailer over SMTP (Gmail app password or college SMTP)
QR	qrcode package for the image, Node crypto for HMAC
Logging	pino (or morgan for dev) with a request id
Security middleware	helmet, cors (allow-list), express-rate-limit, express-mongo-sanitize
Testing	Jest, supertest, mongodb-memory-server, @faker-js/faker
Config	dotenv, validated at boot (fail fast if a variable is missing)

Notes:

MongoDB transactions need a replica set. The design below does NOT require transactions (section 8.2 uses guarded atomic updates plus post-verification), so a standalone MongoDB works. If the team has Atlas, transactions are an allowed optimisation, not a dependency.
node-cron runs inside the API process. A run missed during downtime is caught by the next run, because every job selects work by state, not by "since last run". Agenda is the upgrade path.
3. Architecture
3.1 Layers
HTTP request
  -> middleware chain (requestId, helmet, cors, rateLimit, json body, mongoSanitize)
  -> router (path + method)
  -> route middleware (authenticate, authorize(role | rule), validate(schema))
  -> controller   (thin: read validated input, call ONE service function, shape response)
  -> service      (all business rules, orchestrates models, clock, audit, notifier)
  -> model        (Mongoose schema, indexes, small invariants only)
  -> MongoDB
Side channels from services: auditLogger (always), notifier (email), cron jobs call services too.

Rules:

Controllers never touch models directly.
Services never touch req or res.
Cron jobs and HTTP handlers call the same service functions, so behaviour is identical and testable.
A service function that changes state MUST write an audit log entry (section 13) in the same logical operation.
3.2 Logical modules (map each to your own files)
Module	Responsibility
auth	register, login, token issue and verify, password hashing
users	user lookup, admin-managed accounts (faculty, volunteers)
clubs	club registration, admin review, suspension
venues	venue master data, availability view
events	draft CRUD, submit, cancel, listing, status transitions
clash	overlap detection and free-slot suggestion (pure logic plus queries)
approvals	coordinator link and OTP flow, admin decisions, escalation
registrations	seat allocation, waitlist, cancellation, promotion
tickets	ticket id, HMAC signing, QR rendering, release rules
checkin	scan verification, single-use enforcement, attendance
notifier	email templates and delivery
audit	append-only audit log writer and reader
scheduler	node-cron job registration (escalation, ticket release, completion)
clock	time source (real or simulated)
config	constants and validated environment
errors	typed application errors mapped to HTTP responses
simulation	seed and evaluation harness (dev only)
3.3 Cross-cutting concerns
Error handling: services throw typed AppError(code, httpStatus, message, details). One error middleware turns everything into the response envelope. Unknown errors become INTERNAL with a request id and are logged, never leaked.
Response envelope: { ok: true, data, meta? } or { ok: false, error: { code, message, details? } }.
Pagination: ?page=1&limit=20 (limit capped at 100), response meta: { page, limit, total }.
Time: store all instants as UTC Date. The college timezone is Asia/Kolkata. Convert only at the edges (parsing "14 Nov 2026, 2:00 PM IST" and email text).
IDs: Mongo ObjectIds in URLs. Ticket ids and approval tokens are random and never derived from ObjectIds.
3.4 Clock service

One function now() returns the current instant. Tests and the evaluation harness can set a fixed or advancing time. Every time comparison in services (ticket release, check-in window, escalation, registration window) uses it.

4. Roles and permissions
4.1 Roles
Role	Meaning
student	Default for self-registered users. Can register for events.
faculty	Faculty account. Used for the console and as a coordinator identity. Approving an event does NOT require login (section 8.3).
admin	Verifies clubs, handles admin-level event approvals, manages venues, sees audit log.
volunteer	Can scan tickets for events they are assigned to.

Organiser is not a role. A student is an organiser of a club if their id is in club.organisers, and the club is active. This keeps one user able to be a student, an organiser and a volunteer.

4.2 Permission matrix
Action	student	organiser (of that club)	volunteer (assigned)	faculty	admin
Register / login	yes	yes	yes	yes	yes
Submit a club registration	yes	-	-	-	-
View published events	yes	yes	yes	yes	yes
Create / edit draft event	no	yes	no	no	yes
Run clash dry-run	no	yes	no	no	yes
Send event for approval	no	yes	no	no	yes
Cancel event	no	yes (own club)	no	no	yes
Register for event	yes	yes	yes	yes	no
Cancel own registration	yes	yes	yes	yes	no
View own ticket	yes	yes	yes	yes	no
Decide event via email link	-	-	-	coordinator only, by link + OTP	-
View pending event approvals in console	no	no	no	yes (own club's coordinator email)	yes
Verify / reject / suspend club	no	no	no	no	yes
Admin-level event approval	no	no	no	no	yes
Manage venues, users, volunteers	no	no	no	no	yes
Scan tickets	no	yes (own event)	yes (assigned)	no	yes
View attendance report	no	yes (own event)	no	yes (own club's events)	yes
View audit log	no	no	no	no	yes

Authorisation is two layers: a coarse role check in the route, then a fine ownership check in the service (for example "is this user an organiser of this event's club").

5. Configuration
5.1 Environment variables (validated at boot)
Variable	Example	Purpose
NODE_ENV	development	Enables dev-only simulation routes when not production
PORT	5000	HTTP port
MONGODB_URI	mongodb://localhost:27017/campusflow	Database
JWT_SECRET	long random	Signs access tokens
JWT_EXPIRES_IN	8h	Access token lifetime
QR_HMAC_SECRET	long random, different from JWT	Signs QR tickets
APPROVAL_TOKEN_PEPPER	long random	Extra secret mixed into token and OTP hashing
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS		Email delivery
MAIL_FROM	CampusFlow <no-reply@college.edu>	Sender
APP_BASE_URL	https://campusflow.college.edu	Used to build approval and ticket links in emails
ALLOWED_EMAIL_DOMAINS	students.git.edu,git.edu	Domains allowed for accounts and coordinator emails
CORS_ORIGINS	http://localhost:5173	Allowed front-end origins
5.2 Tunable constants (config module, with env override)
Constant	Default	Used by
ESCALATION_HOURS	48	Approval escalation
APPROVAL_LINK_TTL_HOURS	48	Each issued approval link
MAX_REMINDERS	2	After this many escalations, the approval expires and an admin must decide
OTP_TTL_MINUTES	10	One-time code lifetime
OTP_MAX_ATTEMPTS	3	Wrong codes before the link locks
OTP_RESEND_COOLDOWN_SECONDS	60	Minimum gap between code emails
TICKET_RELEASE_HOURS	24	QR hidden until start minus this
CHECKIN_OPEN_MINUTES	30	Scans accepted from start minus this
BUDGET_ADMIN_THRESHOLD	10000 (INR)	Events above this also need admin approval
WORKING_HOURS	08:00 to 20:00 IST	Window for free-slot suggestions
SLOT_STEP_MINUTES	30	Granularity of suggested slots
SUGGESTION_COUNT	3	Suggestions returned on a clash
MIN_EVENT_MINUTES / MAX_EVENT_MINUTES	15 / 720	Sanity limits
MAX_COORDINATORS	2	Per club
DEPARTMENTS	list, e.g. CSE,ECE,EEE,ME,CIV,AIML	Audience expansion for "all"
YEARS	1,2,3,4	Audience expansion for "all"
6. Data models

Eight collections from the deck: Users, Clubs, Events, Venues, Registrations, Approvals, CheckIns, AuditLogs. One optional ninth (Outbox) is described in 6.9. All have createdAt and updatedAt (Mongoose timestamps) unless noted.

6.1 Users
Field	Type	Notes
_id	ObjectId	
name	String, required	
email	String, required, unique, lowercase	Must match ALLOWED_EMAIL_DOMAINS
passwordHash	String, required	bcrypt, cost 12. Never returned by any query (select: false)
role	enum student, faculty, admin, volunteer	default student
usn	String, unique, sparse	Students only
department	String	Code such as CSE
year	Number 1 to 4	Students only
isActive	Boolean	default true; false blocks login
lastLoginAt	Date	

Indexes: unique email; unique sparse usn; { role: 1 }.

6.2 Clubs
Field	Type	Notes
name	String, required, unique (case-insensitive collation)	
description	String	
department	String	Owning department, optional
organisers	[ObjectId -> User], min 1	First entry is the creator
facultyCoordinators	[{ name, email, verifiedAt }], 1 to 2	Emails MUST match allowed domains and be distinct. verifiedAt is set when the admin approves
status	enum submitted, admin_review, active, rejected, suspended	See 7.1
decision	{ by: ObjectId, at: Date, reason: String }	Last admin decision
submittedAt	Date	Updated on each resubmission
resubmitCount	Number	
suspendedAt, suspendReason	Date, String	

Indexes: unique name; { status: 1, submittedAt: 1 } (admin queue); { organisers: 1 }; { "facultyCoordinators.email": 1 }.

Invariant (MUST): only active clubs can create or submit events.

6.3 Venues
Field	Type	Notes
name	String, required, unique	
building	String	
capacity	Number, required, min 1	
facilities	[String]	
isActive	Boolean	Inactive venues are not bookable

Index: unique name.

6.4 Events
Field	Type	Notes
clubId	ObjectId -> Club, required	
createdBy	ObjectId -> User	
title, description	String	
type	enum workshop, seminar, competition, cultural, sports, fest, other	
venueId	ObjectId -> Venue, required	
start, end	Date, required	end > start; start must be in the future at submission
audience	[{ department, year }]	What the organiser selected. "All" is expanded to every department and year in config
audienceKeys	[String]	Derived, e.g. CSE-5. Indexed. Rebuilt on every save
expectedTurnout	Number	Used for the capacity check
seatLimit	Number	Max confirmed registrations. MUST be at most the venue capacity
seatsLeft	Number	Atomic counter. Initialised to seatLimit when the event is published
budget	Number (INR), default 0	
externalGuests	Boolean, default false	
guestDetails	String	Required when externalGuests is true
registrationOpensAt, registrationClosesAt	Date	Defaults: at publish, and at start
status	enum draft, faculty_review, admin_review, published, completed, rejected, cancelled	See 7.2
requiresAdminApproval	Boolean	Computed at submission: budget > BUDGET_ADMIN_THRESHOLD or externalGuests
holdsSlotSince	Date	Set when the event enters a slot-holding status. Used to break race ties (section 9.1)
approvalRound	Number	Incremented on every submission. Ties approval records to one review cycle
lastFeedback	{ by, comment, at }	From "changes requested" or rejection
volunteers	[ObjectId -> User]	Who may scan this event
publishedAt, completedAt, cancelledAt, cancelReason		

Slot-holding statuses (the set ACTIVE_STATUSES): faculty_review, admin_review, published. Only these block other events. Draft, rejected, cancelled and completed never block.

Indexes:

{ venueId: 1, start: 1, end: 1 }
{ clubId: 1, start: 1 }
{ audienceKeys: 1, start: 1 }
{ status: 1, start: 1 } (listing and cron)
{ status: 1, holdsSlotSince: 1 }
6.5 Registrations
Field	Type	Notes
eventId	ObjectId -> Event, required	
studentId	ObjectId -> User, required	
status	enum confirmed, waitlisted, cancelled	
waitlistedAt	Date	Queue order for promotion
promotedAt	Date	Set when moved from waitlist to confirmed
cancelledAt, cancelReason	Date, enum student, event_cancelled, admin	
ticket	{ ticketId, issuedAt }	ticketId: random 128-bit hex, unique, sparse. Created when status becomes confirmed. Cleared or voided on cancellation
ticketNotifiedAt	Date	Set when the "ticket ready" email went out
checkedInAt	Date, default null	The single-use flag
checkedInBy	ObjectId -> User	

Indexes:

Unique partial { eventId: 1, studentId: 1 } where status in (confirmed, waitlisted). A student can re-register after cancelling, but never hold two active registrations for one event.
{ eventId: 1, status: 1, waitlistedAt: 1 } (promotion queue)
{ studentId: 1, status: 1 } (my registrations)
unique sparse { "ticket.ticketId": 1 }
6.6 Approvals

One document per approver per review cycle. It records the decision and holds the secure link and code state.

Field	Type	Notes
subjectType	enum club, event	
subjectId	ObjectId	Club or Event id
stage	enum admin_club, faculty_event, admin_event	
round	Number	For events: equals event.approvalRound at creation. A decision only counts if round matches the event's current round
approverType	enum faculty_email, admin_user	
approverEmail	String	Coordinator email (faculty stage)
approverUserId	ObjectId	Admin who decided (admin stages)
tokenHash	String	SHA-256 of the link token plus pepper. The raw token exists only in the email
tokenExpiresAt	Date	
otpHash	String	Hash of the current code. Cleared on use
otpExpiresAt	Date	
otpAttempts	Number	Wrong tries on the current code
otpSentAt	Date	For the resend cooldown
status	enum pending, approved, changes_requested, rejected, superseded, expired	
decision	enum approve, request_changes, reject	
comment	String	Reason or note
decidedAt	Date	
decidedVia	enum email_link, console	
decidedIp, decidedUserAgent	String	For the audit trail
escalatedAt	Date	Time of the last escalation
reminderCount	Number	

Indexes:

unique sparse { tokenHash: 1 }
{ subjectType: 1, subjectId: 1, round: 1 }
{ stage: 1, status: 1, createdAt: 1 } (escalation job and admin queues)
{ approverEmail: 1, status: 1 } (faculty console)

Rules:

Raw tokens and raw codes are never stored or logged.
When a reminder re-sends the link, the token is rotated (a new tokenHash and tokenExpiresAt). The old link stops working.
When one coordinator decides, the other coordinator's pending approval for the same round becomes superseded.
6.7 CheckIns

Every scan attempt, successful or not, is recorded. This gives the evaluation its security numbers.

Field	Type	Notes
eventId	ObjectId	From the scan request
registrationId	ObjectId, nullable	Null if the payload was invalid
studentId	ObjectId, nullable	
scannedBy	ObjectId -> User	
scannedAt	Date	
result	enum below	
payloadFingerprint	String	SHA-256 of the scanned payload. Never the payload itself

result values: OK, ALREADY_USED, INVALID_SIGNATURE, MALFORMED, NOT_FOUND, WRONG_EVENT, OUTSIDE_WINDOW, CANCELLED, NOT_AUTHORISED_SCANNER.

Indexes: { eventId: 1, scannedAt: -1 }; { registrationId: 1 }; { eventId: 1, result: 1 }.

6.8 AuditLogs

Append-only. No update or delete route exists, and the model rejects updates and deletes.

Field	Type	Notes
actorType	enum user, system, coordinator_link	
actorId	ObjectId, nullable	Null for system and coordinator link
actorLabel	String	Email or cron:escalation
action	String	One of the constants in section 13
entityType	enum user, club, event, venue, registration, approval, checkin	
entityId	ObjectId	
before, after	Mixed (small)	Changed fields only. Never secrets, hashes or tokens
meta	{ requestId, ip, userAgent, reason }	
createdAt	Date	No updatedAt

Indexes: { entityType: 1, entityId: 1, createdAt: -1 }; { actorId: 1, createdAt: -1 }; { action: 1, createdAt: -1 }.

6.9 Optional ninth collection: Outbox (not in the deck)

Added only if email reliability matters. Stores { to, template, payload, status: pending|sent|failed, attempts, lastError, nextAttemptAt }. A cron tick retries pending and failed items with backoff. If skipped, email failures are logged as EMAIL_FAILED audit entries and the next cron run re-sends where state still requires it (for example reminders). Mark it clearly in the report as an extension.

7. State machines

All transitions go through one transition table per entity. Any move not in the table throws INVALID_TRANSITION (409). The table is data, so tests can assert it exhaustively.

7.1 Club
student submits
admin opens
admin approves
admin rejects (reason)
admin approves
admin rejects (reason)
organiser edits andresubmits
admin suspends (reason)
admin reinstates
submitted
admin_review
active
rejected
suspended
Approving sets facultyCoordinators[].verifiedAt for every coordinator on the club.
Suspending blocks creating or submitting events. Already published events stay as they are (ASSUMPTION; section 17).
7.2 Event
organiser creates
Send for approval(clash-free)
coordinator requestschanges
coordinator rejects
coordinator approves, noadmin step needed
coordinator approves, adminstep required
admin approves
admin requests changes
admin rejects
end time passes (cron)
draft
faculty_review
rejected
published
admin_review
completed
cancelled
draft -> faculty_review runs the full clash check and sets holdsSlotSince, approvalRound, requiresAdminApproval.
Leaving a slot-holding status (to draft, rejected, cancelled) releases the slot immediately. holdsSlotSince is cleared.
Editing is allowed only in draft. A published event cannot be rescheduled; it can be cancelled (ASSUMPTION; reschedule is stretch).
Entering published: set seatsLeft = seatLimit, set registration window defaults, set publishedAt, email the organiser.
Entering cancelled: cancel every confirmed and waitlisted registration (cancelReason = event_cancelled), void their tickets, email the affected students.
7.3 Approval record
another approver decidedfirst
MAX_REMINDERS reached
pending
approved
changes_requested
rejected
superseded
expired

The first decision wins. Deciding is guarded by the event or club status and round (section 9.2).

7.4 Registration
seat available
no seat left
promoted on a cancellation
confirmed
waitlisted
cancelled
8. Engines in detail
8.1 Clash engine

Interval test (MUST be strict inequalities): two ranges overlap when existing.start < new.end AND existing.end > new.start. Events that only touch (one ends at 3:00, the next starts at 3:00) do not clash.

Candidate set: events with status in ACTIVE_STATUSES, excluding the event being checked (_id != self).

Four checks (each returns a list of conflicting events, tagged by type):

Type	Query condition on the candidate set
venue	same venueId and overlap
organiser	same clubId and overlap
audience	audienceKeys intersects the new event's keys, and overlap
capacity	not an overlap check: expectedTurnout > venue.capacity or seatLimit > venue.capacity

Also validated before any clash check: club is active, venue is active, end > start, start is in the future, duration within limits, seatLimit <= venue.capacity.

Result shape:

{ clear: boolean,
  clashes: [ { type, eventId?, title?, clubName?, start?, end?, detail } ],
  suggestions: [ { venueId, venueName, start, end, reasonNote } ] }

Suggestion algorithm (only when not clear):

Pull the day's slot-holding events once for: the requested venue, other venues with enough capacity, the club, and the audience keys. Work in memory after that.
Generate candidate start times across WORKING_HOURS on the requested date, stepping by SLOT_STEP_MINUTES, with the same duration as the request.
For each candidate, run the same four checks against the pre-fetched data. Keep only fully clear candidates.
Candidates cover: same venue at other times, and other venues at the requested time (and nearby times).
Rank by abs(candidate.start - requested.start), then prefer the same venue.
Return the top SUGGESTION_COUNT. If none exist that day, search the next two days, then return an empty list with a note.

Where it runs:

POST /events/check: dry run, writes nothing.
POST /events/:id/submit: authoritative check plus the race protection in 9.1.
8.2 Race protection for submission (MUST)

Two organisers can submit the same slot at the same instant. Both pass a read-only check. To prevent a double booking without transactions:

Run the clash check (read).
Atomically move the event: findOneAndUpdate({ _id, status: "draft" }, { status: "faculty_review", holdsSlotSince: now, approvalRound: +1, ... }). If nothing matched, someone else changed it; return INVALID_TRANSITION.
Post-verify: re-run the same overlap queries against slot-holding events other than this one.
If a conflicting event exists whose holdsSlotSince is earlier (ties broken by smaller _id), this submission lost the race. Revert this event to draft, clear holdsSlotSince, and return CLASH_DETECTED with the reasons and fresh suggestions.
If both submissions run steps 3 and 4 at the same time, the ordering rule guarantees exactly one wins, because both apply the same ordering.

Test this with parallel submissions (section 14).

8.3 Approval engine
A. Club approval (admin, once)
A student submits a club: validate coordinator emails (allowed domain, distinct, 1 to 2). Create with status: submitted.
Admin queue lists submitted and admin_review clubs. Admin may open (admin_review), then approve or reject (reject needs a reason).
Approve: status: active, set verifiedAt on coordinators, set decision. Email the organisers.
Reject: status: rejected, store the reason. The organiser may edit and resubmit (resubmitCount + 1).
Suspend and reinstate: admin only, with a reason on suspend.
Write an Approvals record (stage admin_club, decidedVia: console) and an audit entry for every decision.
B. Event approval by faculty coordinator (email link plus one-time code)

On submit (draft -> faculty_review):

Create one Approvals document per coordinator email on the club (stage: faculty_event, round = event.approvalRound, status: pending).
For each, generate a random token (at least 32 bytes, base64url). Store only its hash (tokenHash) and tokenExpiresAt = now + APPROVAL_LINK_TTL_HOURS.
Email each coordinator a summary and the link APP_BASE_URL/approve/<token>. Include the clash result ("clash check passed") and the event details.

When a coordinator opens the link (no login):

GET /approvals/link/:token hashes the token, finds the approval, and checks: exists, status = pending, not expired, event status is still faculty_review, round matches.
Return the event summary only. Sending the OTP is a separate step so email scanners that prefetch links cannot cause any change.

Request a code: POST /approvals/link/:token/otp generates a 6-digit code, stores its hash with otpExpiresAt = now + OTP_TTL_MINUTES, resets otpAttempts, and emails the code to the same coordinator address. Enforce OTP_RESEND_COOLDOWN_SECONDS.

Decide: POST /approvals/link/:token/decision with { otp, decision, comment? }:

Validate the token (as above) and the code (hash compare, constant time). A wrong code increments otpAttempts. At OTP_MAX_ATTEMPTS the link locks (OTP_LOCKED).
comment is required for request_changes and reject.
First decision wins. Apply the decision with a guarded update on the Event: findOneAndUpdate({ _id: eventId, status: "faculty_review", approvalRound: round }, { ...new status... }).
If it matched: mark this approval with the decision, mark the other coordinator's pending approval for this round superseded, write audit entries, send emails.
If it did not match: someone already decided. Return ALREADY_DECIDED and show who decided and when.
Outcomes of a decision:
approve and requiresAdminApproval = false: event becomes published.
approve and requiresAdminApproval = true: event becomes admin_review, and an admin_event approval is created and the admins are emailed.
request_changes: event returns to draft, lastFeedback is set, the organiser is emailed.
reject: event becomes rejected, the slot is released.

Admin-level event approval (only when required): admin decides in the console via the admin routes. Same transition rules, decidedVia: console, guarded by status: admin_review and the round.

Escalation (cron, hourly): for every faculty_event approval that is pending and older than ESCALATION_HOURS since the last reminder or creation:

If reminderCount < MAX_REMINDERS: rotate the token (new link), send a reminder to both coordinators, notify admins that the request is overdue, set escalatedAt = now, increment reminderCount.
Otherwise: set the approval expired, flag the event for the admin queue (GET /admin/approvals?status=expired). An admin may then decide on the event directly (admin override, audited).
Idempotent: the job selects by state, so a missed run is covered by the next one, and running twice does not double-send because escalatedAt and reminderCount are checked in the update filter.
8.4 Seat allocation and waitlist (MUST not overbook)

Register (POST /events/:id/registrations):

Eligibility: event is published, registration window is open (registrationOpensAt <= now < registrationClosesAt and now < start), student's department-year is in audienceKeys (ASSUMPTION: strict; configurable), no active registration already exists.
Atomic seat grab: findOneAndUpdate({ _id: eventId, status: "published", seatsLeft: { $gt: 0 } }, { $inc: { seatsLeft: -1 } }).
Matched: insert a confirmed registration with a new ticket. If the insert fails (for example a duplicate from a double click), compensate with $inc: { seatsLeft: +1 }.
Did not match (no seats): insert a waitlisted registration with waitlistedAt = now.
The unique partial index is the final guard against duplicate active registrations.
If the event starts within TICKET_RELEASE_HOURS, the ticket is immediately viewable (section 8.5). Send the confirmation email.

Cancel (DELETE /registrations/:id):

Guarded update confirmed|waitlisted -> cancelled, void the ticket.
If it was confirmed, promote:
Try findOneAndUpdate({ eventId, status: "waitlisted" }, { status: "confirmed", promotedAt: now, ticket }, { sort: { waitlistedAt: 1 } }).
If a student was promoted: the seat transfers to them, so seatsLeft does not change. Email them. If the event is within 24 hours, tell them their QR is available now.
If nobody is waiting: $inc seatsLeft +1, never above seatLimit.
If it was waitlisted, nothing else changes.

Event cancellation: loop all active registrations, cancel them without promotion, void tickets, email students.

8.5 QR ticket and check-in

Ticket creation: when a registration becomes confirmed, generate ticketId = crypto.randomBytes(16).toString("hex") and store it.

Signed payload (MUST be HMAC-signed with QR_HMAC_SECRET):

payload   = "CF1." + ticketId + "." + registrationId + "." + eventId
signature = base64url( HMAC_SHA256( QR_HMAC_SECRET, payload ) )   // truncate to 22 chars is acceptable
qrText    = payload + "." + signature

The QR image is generated from qrText only when the ticket is requested, never stored.

Release rule (server time is the real rule):

GET /registrations/:id/ticket returns the QR only if the registration is confirmed and now >= event.start - TICKET_RELEASE_HOURS.
Otherwise return TICKET_NOT_RELEASED with releaseAt, so the front end can show a countdown.
Late registrants and promoted students get the QR immediately because the condition already holds.
Only the registrant can fetch their own ticket.

Scan (POST /checkin/scan, body { eventId, qrText }):

Authorise the scanner: admin, an organiser of the event's club, or a volunteer listed in event.volunteers. Else NOT_AUTHORISED_SCANNER.
Parse. Malformed gives MALFORMED.
Recompute the HMAC and compare with crypto.timingSafeEqual. Mismatch gives INVALID_SIGNATURE.
Find the registration by ticketId. Missing gives NOT_FOUND.
Payload eventId must equal the request eventId and the registration's eventId, else WRONG_EVENT.
Registration must be confirmed, else CANCELLED.
Time window: event.start - CHECKIN_OPEN_MINUTES <= now <= event.end, else OUTSIDE_WINDOW.
Single use, atomic: findOneAndUpdate({ _id, status: "confirmed", checkedInAt: null }, { checkedInAt: now, checkedInBy }). If it did not match, the code was already used: ALREADY_USED.
Every outcome writes a CheckIns record with the result. Return the student's name, department, year and the result so the volunteer sees who is entering.

HMAC stops forged tickets. The checkedInAt flag stops reused or shared tickets. The server-side time check stops early access.

8.6 Scheduled jobs (node-cron)

All jobs are idempotent and select work by state. Each logs start, count and duration. Cron expressions are config.

Job	Schedule (default)	Work
approvalEscalation	hourly	Section 8.3, escalation
ticketReleaseNotifier	every 15 minutes	Find confirmed registrations with ticketNotifiedAt = null where event.start - TICKET_RELEASE_HOURS <= now and the event is still published. Send "your ticket is ready", set ticketNotifiedAt.
eventCompletion	every 15 minutes	published events with end < now become completed.

Registering jobs happens once at boot, and only when ENABLE_CRON is not false (tests turn it off and call the job functions directly).

9. API

Base path /api/v1. JSON only. Authorization: Bearer <jwt> unless marked public. All inputs validated by schema before the controller runs. IDs in paths are validated as ObjectIds.

9.1 Conventions
Success: 200 (or 201 for creation, 204 only where noted) with { ok: true, data }.
Errors: { ok: false, error: { code, message, details? } }.
Dates in requests and responses are ISO 8601 UTC strings.
Lists accept page, limit, sort (for example sort=-start).
9.2 Error codes
Code	HTTP	Meaning
VALIDATION_ERROR	400	Input failed schema. details lists fields
UNAUTHENTICATED	401	Missing or invalid token
FORBIDDEN	403	Role or ownership check failed
NOT_FOUND	404	Entity missing, or hidden from this user
CONFLICT	409	Generic uniqueness or state conflict
CLASH_DETECTED	409	Submission blocked. details has clashes and suggestions
INVALID_TRANSITION	409	Move not allowed from the current state
CLUB_NOT_ACTIVE	403	Club must be active
EVENT_NOT_OPEN	409	Event is not published or registration window is closed
NOT_ELIGIBLE	403	Student's department and year are not in the audience
ALREADY_REGISTERED	409	Active registration exists
TICKET_NOT_RELEASED	403	details.releaseAt tells when
TOKEN_INVALID	404	Unknown approval token
TOKEN_EXPIRED	410	Link expired or rotated by a reminder
OTP_REQUIRED	401	Decision sent without a valid code
OTP_INVALID	401	Wrong code. details.attemptsLeft
OTP_LOCKED	423	Too many wrong codes
OTP_COOLDOWN	429	Wait before requesting another code
ALREADY_DECIDED	409	Another approver decided first. details has who and when
RATE_LIMITED	429	Too many requests
INTERNAL	500	Unexpected. Logged with request id

Scan results are returned as data.result with HTTP 200 for business outcomes (so the scanner screen always gets a result), and recorded in CheckIns. Only authorisation and validation failures use error codes.

9.3 Routes
Health
Method	Path	Auth	Purpose
GET	/health	public	Liveness plus database ping
Auth
Method	Path	Auth	Purpose
POST	/auth/register	public	Body: name, email, password, usn, department, year. Email must match allowed domains. Creates a student. Rate limited
POST	/auth/login	public	Body: email, password. Returns { token, user }. Rate limited, generic failure message
GET	/auth/me	any	Current user
POST	/auth/change-password	any	Body: currentPassword, newPassword
Users (admin)
Method	Path	Auth	Purpose
GET	/users	admin	Filter by role, department, q
POST	/users	admin	Create a faculty, volunteer or admin account (temporary password, forced change is a stretch)
PATCH	/users/:id	admin	Change role, isActive, department
Venues
Method	Path	Auth	Purpose
GET	/venues	any	List active venues
GET	/venues/:id/availability?date=YYYY-MM-DD	any	Busy and free blocks that day within working hours (slot-holding events only)
POST	/venues	admin	Create
PATCH	/venues/:id	admin	Edit, deactivate
Clubs
Method	Path	Auth	Purpose
POST	/clubs	student	Submit a club. Body: name, description, department?, facultyCoordinators[1..2]{name,email}. Creator becomes the first organiser. Status submitted
GET	/clubs/mine	student	Clubs where I am an organiser
GET	/clubs	any	Active clubs (public list)
GET	/clubs/:id	member or admin	Detail, including status and decision reason
PATCH	/clubs/:id	organiser	Edit while rejected. Edits to coordinators reset verification
POST	/clubs/:id/resubmit	organiser	rejected -> submitted
POST	/clubs/:id/organisers	organiser	Add another student organiser by email
Club administration
Method	Path	Auth	Purpose
GET	/admin/clubs?status=	admin	Review queue
POST	/admin/clubs/:id/open	admin	submitted -> admin_review
POST	/admin/clubs/:id/approve	admin	Verifies coordinators, -> active
POST	/admin/clubs/:id/reject	admin	Body: reason required
POST	/admin/clubs/:id/suspend	admin	Body: reason required
POST	/admin/clubs/:id/reinstate	admin	suspended -> active
Events
Method	Path	Auth	Purpose
POST	/events	organiser	Create a draft. Club must be active. Computes audienceKeys
GET	/events	any	Published events. Filters: from, to, venueId, clubId, audience, q. Students see the audience-eligible flag
GET	/events/:id	any (non-published only to organiser, coordinator, admin)	Detail
GET	/clubs/:id/events	organiser	All of the club's events in any status
PATCH	/events/:id	organiser	Edit while draft only. Rebuilds audienceKeys
DELETE	/events/:id	organiser	Delete a draft
POST	/events/check	organiser	Dry-run clash check on a body or an existing draft id. Writes nothing. Returns { clear, clashes, suggestions }
POST	/events/:id/submit	organiser	"Send for approval". Full check, race-safe submit (8.2), creates approvals, sends emails. 409 CLASH_DETECTED on failure
POST	/events/:id/cancel	organiser (own club) or admin	Body: reason. Cancels registrations and notifies
GET	/events/:id/approvals	organiser, coordinator, admin	Approval status, who has been emailed, reminders sent, decision and comment
PUT	/events/:id/volunteers	organiser or admin	Body: volunteerIds[]. Replaces the scanner list
Approvals: coordinator link (public, token is the credential)
Method	Path	Auth	Purpose
GET	/approvals/link/:token	public, rate limited	Validate and return event summary. No state change
POST	/approvals/link/:token/otp	public, rate limited	Email a fresh code to the registered coordinator address
POST	/approvals/link/:token/decision	public, rate limited	Body: otp, decision (approve, request_changes, reject), comment?. First decision wins
Approvals: console
Method	Path	Auth	Purpose
GET	/faculty/approvals	faculty	Pending approvals addressed to my email (view only; deciding still uses the link and code)
GET	/admin/approvals?stage=&status=&escalated=	admin	Admin queue, including expired ones needing an override
POST	/admin/events/:id/approve	admin	Only valid in admin_review (or an override on an expired faculty stage; audited)
POST	/admin/events/:id/request-changes	admin	Body: comment required
POST	/admin/events/:id/reject	admin	Body: comment required
Registrations
Method	Path	Auth	Purpose
POST	/events/:id/registrations	student, organiser, volunteer, faculty	Register. Returns { registration, outcome: confirmed or waitlisted, waitlistPosition? }
GET	/me/registrations	any	My registrations with event summary
DELETE	/registrations/:id	owner	Cancel. Triggers promotion
GET	/registrations/:id/ticket	owner	{ qrText, qrPngDataUrl, event }, or TICKET_NOT_RELEASED
GET	/events/:id/registrations	organiser (own), faculty (own club), admin	Roster with status filter and waitlist order
Check-in
Method	Path	Auth	Purpose
POST	/checkin/scan	scanner (8.5 step 1)	Body: eventId, qrText. Returns { result, student? }
GET	/events/:id/checkins	organiser, admin	Scan log with results
GET	/events/:id/attendance	organiser (own), faculty (own club), admin	Counts: registered, checked in, no-shows, waitlisted. ?format=csv for export
Audit and reports (admin)
Method	Path	Auth	Purpose
GET	/admin/audit?entityType=&entityId=&actorId=&action=&from=&to=	admin	Read-only audit log
GET	/admin/stats	admin	Totals: clubs by status, events by status, clashes blocked, average approval turnaround, escalations, scan results
Development and evaluation (only when NODE_ENV is not production)
Method	Path	Auth	Purpose
POST	/dev/seed	admin	Generate simulated campus data (section 15)
POST	/dev/clock	admin	Set or advance the simulated clock
POST	/dev/run-job/:name	admin	Run approvalEscalation, ticketReleaseNotifier or eventCompletion once
POST	/dev/simulate/concurrent-registrations	admin	Body: eventId, requests, concurrency. Reports confirmed, waitlisted, overbooked (MUST be 0)
9.4 Key request and response shapes

Create event (POST /events):

json
{
  "clubId": "…",
  "title": "Robo Race 2026",
  "type": "competition",
  "description": "…",
  "venueId": "…",
  "start": "2026-11-20T08:30:00.000Z",
  "end": "2026-11-20T10:30:00.000Z",
  "audience": [{ "department": "CSE", "year": 3 }, { "department": "ECE", "year": 3 }],
  "expectedTurnout": 120,
  "seatLimit": 120,
  "budget": 8000,
  "externalGuests": false
}

Clash response (409 on submit, 200 on dry run):

json
{
  "ok": false,
  "error": {
    "code": "CLASH_DETECTED",
    "message": "This proposal overlaps another event.",
    "details": {
      "clashes": [
        { "type": "venue", "eventId": "…", "title": "Coding Contest", "clubName": "Coding Club",
          "start": "…", "end": "…", "detail": "Seminar Hall A is booked 2:00 to 4:00 PM" }
      ],
      "suggestions": [
        { "venueId": "…", "venueName": "Seminar Hall A", "start": "…", "end": "…", "reasonNote": "Same venue, 2 hours later" }
      ]
    }
  }
}

Register response:

json
{ "ok": true, "data": { "registrationId": "…", "outcome": "waitlisted", "waitlistPosition": 4 } }

Scan response:

json
{ "ok": true, "data": { "result": "OK", "student": { "name": "…", "department": "CSE", "year": 3 } } }
10. Email catalogue

All emails go through the notifier. Subjects are short; bodies include the event title, date and time (IST) and one link where relevant. Raw tokens appear only in approval emails.

Template	To	Trigger
club_submitted	Admins	Club submitted or resubmitted
club_approved / club_rejected	Organisers	Admin decision (rejection includes the reason)
club_suspended / club_reinstated	Organisers	Admin action
approval_request	Each coordinator	Event submitted. Contains the approval link
approval_otp	The coordinator	Code requested
approval_decided	Organisers, and the other coordinator ("already decided by X")	Decision made
approval_reminder	Coordinators	Escalation. Contains a new link
approval_overdue_admin	Admins	Escalation, and when an approval expires
admin_approval_needed	Admins	Faculty approved and an admin step is required
event_published	Organisers	Entered published
event_changes_requested / event_rejected	Organisers	Includes the reviewer comment
registration_confirmed	Student	Seat granted
registration_waitlisted	Student	Added to the waitlist with position
waitlist_promoted	Student	Promoted. Says if the QR is already available
ticket_ready	Student	Ticket release job
event_cancelled	Students and organisers	Event cancelled

Delivery failures are logged as EMAIL_FAILED audit entries. The state change that triggered the email is never rolled back because of an email failure.

11. Security checklist
Passwords: bcrypt cost 12, minimum length 8, never logged or returned.
JWT: signed with JWT_SECRET, short lifetime, payload holds only sub and role. Re-load the user on each request so deactivation and role changes apply immediately.
Authorisation: role middleware plus per-resource ownership checks in services. Return NOT_FOUND instead of FORBIDDEN when revealing existence would leak information.
Approval tokens: at least 32 random bytes, stored only as a hash with a pepper, single-purpose, expiring, rotated by reminders.
One-time codes: 6 digits, hashed, short lifetime, attempt limit, resend cooldown, constant-time comparison.
Link GET never changes state (protects against email scanners).
QR: HMAC-SHA256 with a secret separate from JWT, timingSafeEqual, single-use flag in the database, server-side time window.
Rate limits: strict on /auth/login, /auth/register, all /approvals/link/*, and /checkin/scan.
Input: schema validation on every route, express-mongo-sanitize against operator injection, length limits, ObjectId validation.
Email domain allow-list for accounts and coordinator emails.
helmet, a CORS allow-list, request body size limit, no stack traces in responses.
Secrets only in environment variables. .env is git-ignored. Commit an .env.example with names only.
Audit log is append-only and never contains secrets.
Dev routes are not mounted in production.
12. Concurrency summary (the places that must be atomic)
Place	Technique
Last seat	findOneAndUpdate with seatsLeft > 0 and $inc
Duplicate registration	Unique partial index plus compensation of the seat counter
Waitlist promotion	findOneAndUpdate on the oldest waitlisted registration, sorted by waitlistedAt
Two organisers, same slot	Guarded status update, then post-verify with holdsSlotSince ordering (8.2)
Two coordinators deciding	Guarded update on event status and approvalRound
Ticket reuse	findOneAndUpdate with checkedInAt: null
Cron overlap	State-selected work and guarded updates; safe to run twice
13. Audit log

Write an entry for every state change and every security-relevant event. Action constants:

USER_REGISTERED, USER_LOGIN, USER_LOGIN_FAILED, USER_ROLE_CHANGED, CLUB_SUBMITTED, CLUB_OPENED, CLUB_APPROVED, CLUB_REJECTED, CLUB_RESUBMITTED, CLUB_SUSPENDED, CLUB_REINSTATED, VENUE_CREATED, VENUE_UPDATED, EVENT_CREATED, EVENT_UPDATED, EVENT_DELETED, EVENT_CLASH_BLOCKED, EVENT_SUBMITTED, EVENT_PUBLISHED, EVENT_CHANGES_REQUESTED, EVENT_REJECTED, EVENT_CANCELLED, EVENT_COMPLETED, APPROVAL_CREATED, APPROVAL_LINK_OPENED, APPROVAL_OTP_SENT, APPROVAL_OTP_FAILED, APPROVAL_DECIDED, APPROVAL_SUPERSEDED, APPROVAL_ESCALATED, APPROVAL_EXPIRED, ADMIN_OVERRIDE, REGISTRATION_CONFIRMED, REGISTRATION_WAITLISTED, REGISTRATION_PROMOTED, REGISTRATION_CANCELLED, TICKET_VIEWED, CHECKIN_OK, CHECKIN_REJECTED, EMAIL_FAILED, JOB_RUN.

system actor label format: cron:<jobName>. coordinator_link actor label is the coordinator email.

14. Testing
14.1 Setup

Jest, supertest and mongodb-memory-server. Cron is disabled in tests; job functions are called directly with a controllable clock. Email is replaced by an in-memory recorder so tests can read the link and code.

14.2 Must-have test groups

Clash engine

Exact back-to-back events do not clash.
Partial overlap on either side, fully nested, identical ranges.
Each of venue, organiser, audience and capacity alone triggers a clash.
Draft, rejected, cancelled and completed events do not block.
Editing a draft does not clash with itself.
Suggestions are clear, ranked by closeness, and respect working hours.
Parallel submissions of the same slot: exactly one wins (run 20 in parallel, repeat).

Approval

Every illegal transition is rejected (generate from the transition table).
Link GET changes nothing.
Wrong code three times locks the link.
Expired and rotated tokens fail.
Two coordinators deciding at once: exactly one decision applies; the other gets ALREADY_DECIDED.
Escalation sends a reminder with a new link; the old link dies.
After MAX_REMINDERS, the approval expires and an admin override works.
High budget or external guests route through admin_review.
Suspended or non-active clubs cannot create or submit events.

Seats and waitlist

100 concurrent registrations on 50 seats: 50 confirmed, 50 waitlisted, seatsLeft = 0, never negative.
Double click by the same student creates one registration and one seat taken.
Cancellation promotes the oldest waitlisted student and keeps seatsLeft consistent.
Cancellation with an empty waitlist restores a seat, never above seatLimit.
Event cancellation cancels everyone.

Tickets and check-in

QR hidden before the release time, visible after; late registrants and promoted students see it at once.
Forged signature, edited payload, wrong event, cancelled registration, outside the window: each returns the right result.
A second scan of the same ticket returns ALREADY_USED. Concurrent scans of one ticket: exactly one OK.
Cancelling a registration invalidates its ticket.
Unauthorised scanner is refused.

Security and basics

Role and ownership checks on every route group.
Rate limits trigger.
Mongo operator injection in inputs is stripped.
Responses never include passwordHash, token hashes or code hashes.
14.3 Evaluation (feeds the Phase 2 report and the deck's "Evaluation plan")
Metric	How it is measured
Clashes caught vs naive check	Generate a set of proposals with known injected clashes (venue, organiser, audience, capacity). Compare CampusFlow's four-way check with a naive venue-only check. Report caught and missed counts.
Approval turnaround, with and without escalation	Use the simulated clock. Model coordinators who sometimes do not respond. Compare time to decision with the escalation job on and off.
No overbooking at 100 requests	The concurrent registration simulation: report confirmed, waitlisted and overbooked (target 0), repeated many runs.
Check-in security	Scripted attempts: reused QR, edited QR, QR for another event, early scan, post-cancellation scan. Report rejection rate (target 100 percent) and that the QR stays hidden until 24 hours before.

Report measured results only. The deck labels all figures as planned targets until measured.

15. Seed and simulation

The simulation module generates, with a fixed random seed so results are reproducible:

Around 500 students across the configured departments and years, plus faculty, 2 admins, and volunteers.
10 to 15 clubs (most active, a few submitted, rejected, suspended), each with 1 or 2 coordinator emails.
8 to 10 venues with realistic capacities.
Around 50 events across statuses, including deliberate clashes for the clash evaluation and a mix of budgets and external guests for approval routing.
Registrations including full events with waitlists.

Seeding uses the same services as the API where possible, so the data is valid by construction. A --reset option clears all collections first.

16. Build order

Matches the Phase 2 plan in the deck. Each milestone ends with its tests passing.

Step	Scope	Owner (per deck)
0	Config, environment validation, clock, errors, response envelope, logging, health route, database connection, test harness	all
1 (weeks 1 to 2)	Models and indexes for all collections; auth (register, login, me); role middleware; audit logger; clubs (submit, admin review, suspend); venues; events draft CRUD; event and club transition tables	Venkatesh
2 (week 3)	Clash engine, dry-run route, suggestion algorithm, race-safe submit	Ubedulla
3 (week 3 to 4)	Approval engine: approval records, email link, OTP, first-decision-wins, admin stage, notifier with email templates	shared (approvals sit between weeks)
4 (week 4)	Registrations: atomic seats, waitlist, cancellation promotion, event cancellation fan-out, concurrency simulation	Soham
5 (week 5)	Tickets, HMAC signing, QR rendering, release rule, scan and check-in, attendance report; node-cron jobs (escalation, ticket release, completion)	Yash
6	Seed and evaluation harness, stats route, full test run, evaluation numbers	all
7	Report, demo rehearsal	all

Definition of done for each step: routes documented here exist and behave as written, tests cover the group in 14.2, audit entries are written, no secret appears in logs or responses.

17. Assumptions and open decisions (confirm or change)
#	Item	Current assumption
1	Admin step for events	Only when budget > BUDGET_ADMIN_THRESHOLD or externalGuests (from the deck's "rule-based routing"). Threshold default INR 10,000
2	Coordinator identity	Coordinator emails are stored on the club and verified by the admin. A faculty user account is optional and used only to view pending items
3	Suspending a club	Blocks new events; already published events continue
4	Rescheduling	Not supported; cancel and create a new event
5	Audience eligibility	Strict: a student can register only if their department and year are in the event audience (config switch to relax)
6	Token refresh	Single access token (8h). Refresh tokens are a stretch
7	Transactions	Not required. Guarded atomic updates plus post-verification are used
8	Outbox	Not built by default (section 6.9)
9	Working hours	08:00 to 20:00 IST for suggestions
10	Escalation	48 hours between reminders, 2 reminders, then the admin must decide
11	Email provider	Gmail app password or the college SMTP; to be chosen
12	Hosting for demo	Local or a free tier; MongoDB local or Atlas free
13	QR design	HMAC-signed personal ticket, single-use via the database. Rotating QR is future work, as in the deck
14	One-time code delivery	By email to the same coordinator address as the link
18. Glossary
Slot-holding event: an event in faculty_review, admin_review or published. It occupies its venue, club and audience for its time range.
Round: one submission cycle of an event. A new submission after "changes requested" starts a new round, so old approval links cannot apply to it.
Audience key: <department>-<year> such as CSE-5, used to detect audience clashes.
Ticket: the personal registration credential. The QR code is the ticket's signed, scannable form.
Supersede: an approval record closed because another approver of the same round already decided.