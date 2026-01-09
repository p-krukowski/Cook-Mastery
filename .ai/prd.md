# Product Requirements Document (PRD) - Cook Mastery

## 1. Product Overview

### 1.1 Purpose
Cook Mastery is a web app that helps people learn cooking fundamentals by combining curated tutorials and knowledge articles that explain not only how to do something, but why it works. The product focuses on beginner-to-intermediate learning where users can follow recipes but don’t understand principles such as heat control, ingredient function, technique choice, and equipment usage.

### 1.2 Target users
Primary:
- Beginner home cooks who can follow recipes but lack conceptual understanding of techniques and ingredient roles.

Secondary:
- Returning cooks who want to refresh fundamentals.
- Intermediate cooks seeking structured gaps-filling (in MVP, still level-based rather than a personalized learning path).

### 1.3 MVP platform
- Web-only MVP.

### 1.4 Core value proposition
- Curated, structured learning resources (tutorials + articles) organized by level and difficulty.
- A simple progress model (“passed” / “read”) that encourages learning completion without requiring validation.
- A personal cookbook feature to capture internet recipes with notes; helps users apply learning.

### 1.5 Key product principles
- Clarity over richness: plain text, consistent structure, minimal UI complexity.
- Low friction: quick mark-as-passed/read actions; no mandatory validation.
- Trust and safety baseline: secure authentication, password hashing, and session handling.
- No community overhead in MVP: no comments, ratings, or user-generated public content.

### 1.6 Definitions and terminology
- Content item: either a tutorial or an article.
- Tutorial categories: Practical knowledge, Theoretical knowledge, Cooking equipment knowledge.
- Article: blog-style knowledge post not directly linked to tutorials.
- Level: Beginner, Intermediate, Experienced.
- Difficulty weight: integer 1–5 (1 easiest, 5 hardest); assigned manually by an expert (out of scope to automate).
- Recommended content: content items matching the user’s currently selected level.
- Passed tutorial: user-marked completion of a tutorial.
- Read article: user-marked completion of an article.
- Completion percentage (for a level): (passed tutorials + read articles) / (all tutorials + all articles) within that level.
- Out of date: status flag when a user’s completion for the selected level falls below 85% due to new content being added.

### 1.7 Assumptions
- Content is added manually by administrators to the database.
- Content licensing/copyright verification is handled outside this product scope.
- Users can view any content level, but recommendations always follow the user’s manually selected level.

## 2. User Problem

### 2.1 Problem statement
People often cook by strictly following recipes without understanding the underlying concepts. This leads to:
- Inconsistent results (can’t adapt when ingredients/equipment differ).
- Low confidence (fear of improvisation).
- Limited skill progression (not understanding heat, technique, ingredient function, or equipment).

### 2.2 Why existing solutions fall short (MVP framing)
- Recipe sites optimize for the finished dish and entertainment rather than learning principles.
- Many learning resources are fragmented (random videos/posts) and hard to sequence.
- Too much multimedia and social content can distract from knowledge uptake.

### 2.3 User needs
- Short, structured explanations that connect “what to do” with “why it works”.
- A simple way to track progress and know what to learn next.
- A lightweight personal space to save and annotate recipes found elsewhere.

## 3. Functional Requirements

### 3.1 Authentication and authorization
FR-001 Sign up
- Users can create an account with email, username, and password.
- User selects an initial level during signup.

FR-002 Login/logout
- Users can login with email (or username) and password.
- Users can logout.

FR-003 Session handling
- Authenticated sessions persist across page loads.
- Basic session security is implemented (secure cookies, appropriate flags).

FR-004 Password security baseline
- Passwords are stored as salted hashes (no plaintext).
- Basic protections are included (at minimum: input validation and brute-force mitigation such as rate limiting or lockouts).

FR-005 Access control
- Viewing and interacting (marking passed/read, cookbook CRUD, profile editing) requires authentication.
- Public/anonymous access is not required in MVP.

### 3.2 User profile and level
FR-006 Level selection and change
- User selects a level at signup.
- User can change level manually later.
- Recommendations always follow the user’s manually selected level.

FR-007 Cross-level browsing
- User can view tutorials and articles from other levels.
- Only the selected level content is recommended.

### 3.3 Tutorials
FR-008 Tutorial data model (MVP fields)
- Title
- Category (Practical / Theoretical / Equipment)
- Level (Beginner / Intermediate / Experienced)
- Difficulty weight (1–5)
- Summary
- Main content (plain text)
- Steps or structured sections (plain text)
- Practice recommendations (plain text)
- Key takeaways (plain text)
- Created/added timestamp (used for “new content first” ordering)

FR-009 Tutorial list and ordering
- Main/home page shows a grid of tutorials matching the user’s selected level.
- Default sorting is easiest to hardest by difficulty weight (1 → 5).

FR-010 Tutorial detail view
- User can open a tutorial and read it.

FR-011 Mark tutorial as passed
- User can mark a tutorial as passed.
- No validation of actual learning is required.
- Users cannot unmark as unpassed in MVP.

### 3.4 Articles
FR-012 Article data model (MVP fields)
- Title
- Level (Beginner / Intermediate / Experienced)
- Difficulty weight (1–5)
- Summary
- Main content (plain text)
- Key takeaways (plain text)
- Created/added timestamp

FR-013 Article browsing and detail view
- User can browse articles across levels.
- User can open an article to read it.

FR-014 Mark article as read
- Articles include a “Mark as read” action at the bottom.
- User marking as read counts as completion.
- Users cannot unmark as unread in MVP.

### 3.5 Recommendations and content surfacing
FR-015 Recommended content scope
- Recommendations are level-based only (match user’s selected level).

FR-016 Recommendation ordering
- Recommended content should surface newly added content first within the user’s selected level to support staying up to date and maintaining completion.
- When displaying recommended items, prefer ordering that helps users discover what’s new first (exact UI behavior may be implemented as a “New” section or default sort).

FR-017 Discovery limitations
- No search, filters, tags, or personalized learning path in MVP.

### 3.6 Progression and status
FR-018 Completion calculation
- Completion is computed per level as a single percentage over all items of that level (tutorials + articles combined).

FR-019 Level advancement rule
- To be eligible to advance to the next level, the user must complete at least 85% of all content items (tutorials + articles) in their current level.

FR-020 Out-of-date status
- Newly added content in a level affects completion.
- If completion falls below 85% due to new content, the user is flagged “out of date”.
- User is not auto-downgraded.

FR-021 Progress UI
- User can view completion percent for their selected level.
- User can see whether they are “up to date” or “out of date”.
- User can see whether they are eligible to advance (meets 85%) and can manually change level.

### 3.7 Cookbook (personal recipe links)
FR-022 Add cookbook entry
- User can add an internet recipe by entering:
  - URL
  - Custom title
  - Notes

FR-023 View cookbook entries
- User can view a list of saved entries.

FR-024 Edit cookbook entry
- User can edit URL, title, and notes.

FR-025 Cookbook constraints
- No parsing of recipe websites in MVP.
- No limits specified (assume reasonable pagination/limits for UI if needed).

### 3.8 Content management (admin/manual)
FR-026 Manual content entry
- Tutorials and articles are added manually to the database by an admin process.
- In-app admin tooling is not required for MVP unless needed for basic operation (can be seeded/migrated).

### 3.9 Analytics and instrumentation (for success metrics)
FR-027 Event capture
- The system records, at minimum:
  - user_signed_up (timestamp)
  - tutorial_marked_passed (user_id, tutorial_id, timestamp)
  - article_marked_read (user_id, article_id, timestamp)
  - recipe_added (user_id, recipe_id, timestamp)

FR-028 Cohort measurement
- The system can compute the defined KPIs within 2 days of signup per user.
- Storage can be event tables or derived fields, but must support queryable calculation.

## 4. Product Boundaries

### 4.1 Explicitly out of scope for MVP
- Users adding their own tutorials or publishing recipes/tutorials.
- Comments, ratings, likes, or any social features.
- Rich multimedia support (video hosting, interactive embeds, complex media attachments).
- Search, tagging, filters, or recommendation personalization beyond level selection.
- Learning path generation or adaptive sequencing.
- Validation of learning (quizzes, tests, completion verification).
- Undo actions (unpass tutorial, unread article).
- Account flows beyond basic signup/login/logout (password reset, email verification, account deletion/export).
- Copyright/licensing verification for sourced content.

### 4.2 Non-goals / constraints
- Recommendations are not based on behavior or interests in MVP.
- Not optimized for mobile apps in MVP (web-only, responsive is optional unless required by product quality).

### 4.3 Security baseline constraints
- Must implement password hashing, secure session handling, and basic anti-abuse.
- Full compliance features (GDPR export/delete workflows, audit trails) are not required in MVP.

## 5. User Stories

### 5.1 Authentication, sessions, and account security

- ID: US-001
  Title: Sign up with email, username, password, and initial level
  Description: As a new user, I want to create an account using email, username, and password and choose my starting level so I can access the app and see relevant content.
  Acceptance Criteria:
  - Given I am on the signup page, when I enter a valid email, a non-empty username, a password meeting the minimum policy, and select a level, then my account is created.
  - After successful signup, I am authenticated and redirected to the home page.
  - Duplicate email is rejected with a clear error message.
  - Duplicate username is rejected with a clear error message.
  - Invalid email format is rejected.
  - Missing level selection is rejected.

- ID: US-002
  Title: Log in with email or username and password
  Description: As a returning user, I want to log in so I can access my progress and cookbook.
  Acceptance Criteria:
  - Given I have an existing account, when I enter my correct credentials, then I am authenticated and redirected to the home page.
  - When I enter incorrect credentials, then I see a generic error (does not reveal whether the account exists).

- ID: US-003
  Title: Log out to end my session
  Description: As a user, I want to log out so that others can’t access my account on a shared device.
  Acceptance Criteria:
  - Given I am logged in, when I click “Log out”, then my session is invalidated.
  - After logout, any attempt to access authenticated pages redirects to login.

- ID: US-004
  Title: Maintain a secure authenticated session
  Description: As a user, I want my session to stay active across page loads while remaining secure.
  Acceptance Criteria:
  - Given I am logged in, when I refresh the page, then I remain logged in.
  - Session cookies are not accessible to client-side scripts (HttpOnly).
  - Session cookies are only sent over HTTPS in production (Secure).
  - Session cookies have an appropriate SameSite policy.

- ID: US-005
  Title: Protect accounts from brute-force login attempts
  Description: As a product owner, I want basic abuse protections to reduce account compromise risk.
  Acceptance Criteria:
  - When repeated failed login attempts occur from the same source in a short time window, the system slows or blocks further attempts (rate limit/temporary lockout).
  - The API returns an appropriate error code/message without exposing sensitive details.

- ID: US-006
  Title: Restrict access to authenticated-only features
  Description: As a user, I want only logged-in users to access progress actions and cookbook so my data stays private.
  Acceptance Criteria:
  - When not authenticated, requests to mark a tutorial passed, mark an article read, or manage cookbook entries are rejected.
  - When not authenticated, navigating to protected pages results in redirect to login.

### 5.2 Level selection, profile, and status

- ID: US-007
  Title: View my selected level and completion status
  Description: As a user, I want to see my current level, completion percentage, and whether I am out of date.
  Acceptance Criteria:
  - Given I am logged in, when I open my profile/status area, then I see my selected level.
  - I see my completion percentage for the selected level.
  - I see a status indicator: up to date if completion >= 85%, out of date if completion < 85%.

- ID: US-008
  Title: Manually change my level
  Description: As a user, I want to change my selected level manually so recommendations match what I want to study.
  Acceptance Criteria:
  - Given I am logged in, when I select a different level and confirm, then my selected level is updated.
  - After changing level, the home recommendations update to the newly selected level.

- ID: US-009
  Title: See eligibility to advance
  Description: As a user, I want to know when I’ve completed enough to advance to the next level.
  Acceptance Criteria:
  - Given my selected level is not Experience, when my completion >= 85%, then the UI indicates I’m eligible to advance.
  - Given my completion < 85%, then the UI indicates I’m not eligible.

- ID: US-010
  Title: Browse content from other levels
  Description: As a curious user, I want to view tutorials/articles from other levels even if they are not recommended.
  Acceptance Criteria:
  - Given I am browsing tutorials or articles, I can navigate to view content of a different level.
  - Content from non-selected levels is clearly not labeled as “recommended”.

### 5.3 Tutorials (browse, read, pass)

- ID: US-011
  Title: See recommended tutorials on the home page
  Description: As a user, I want the home page to show tutorials that match my selected level so I know what to learn next.
  Acceptance Criteria:
  - Given I am logged in, when I open the home page, then I see a grid/list of tutorials filtered by my selected level.
  - Tutorials display at least title, category, and difficulty weight.

- ID: US-012
  Title: Default tutorial ordering by difficulty
  Description: As a user, I want tutorials ordered from easiest to hardest so I can progress gradually.
  Acceptance Criteria:
  - Given I am on the home page, tutorials are sorted by weight ascending (1 to 5).
  - Items with the same weight have a deterministic secondary order (e.g., by created timestamp descending or title) so the list doesn’t shuffle.

- ID: US-013
  Title: Open and read a tutorial
  Description: As a user, I want to open a tutorial and read structured content so I can learn effectively.
  Acceptance Criteria:
  - When I click a tutorial item, I can open a detail view.
  - The detail view shows summary, main content, steps/sections, practice recommendations, and key takeaways.

- ID: US-014
  Title: Mark a tutorial as passed
  Description: As a user, I want to mark a tutorial as passed when I feel I understand it.
  Acceptance Criteria:
  - Given I am viewing a tutorial, when I click “Mark as passed”, then the tutorial is recorded as passed for my account.
  - The UI updates to reflect passed status.
  - Marking the same tutorial as passed again does not create duplicates (idempotent).

- ID: US-015
  Title: Prevent unpassing tutorials in MVP
  Description: As a product owner, I want to keep MVP simple by not allowing “unpass”.
  Acceptance Criteria:
  - Given a tutorial is passed, there is no UI control to unpass it.
  - API endpoints do not support changing passed to unpassed.

- ID: US-016
  Title: Handle empty tutorial catalog gracefully
  Description: As a user, I want the app to behave clearly when there are no tutorials for my selected level.
  Acceptance Criteria:
  - If there are zero tutorials for my selected level, the home page shows an empty state message.
  - The app does not error or show broken UI.

### 5.4 Articles (browse, read, mark as read)

- ID: US-017
  Title: Browse articles
  Description: As a user, I want to browse articles so I can gain conceptual knowledge.
  Acceptance Criteria:
  - Given I am logged in, when I open the articles section, then I see a list of articles.
  - Articles show at least title, level, and difficulty weight.

- ID: US-018
  Title: Open and read an article
  Description: As a user, I want to open an article with a clear structure so I can learn efficiently.
  Acceptance Criteria:
  - When I click an article item, I can open the article detail page.
  - The article shows summary, main content, and key takeaways.

- ID: US-019
  Title: Mark an article as read
  Description: As a user, I want to mark an article as read when I finish it so my progress is tracked.
  Acceptance Criteria:
  - Given I am viewing an article, when I click “Mark as read” at the bottom, then the article is recorded as read for my account.
  - The UI updates to reflect read status.
  - Marking the same article as read again does not create duplicates (idempotent).

- ID: US-020
  Title: Prevent unreading articles in MVP
  Description: As a product owner, I want to keep MVP simple by not allowing “mark as unread”.
  Acceptance Criteria:
  - Given an article is read, there is no UI control to unmark it.
  - API endpoints do not support changing read to unread.

- ID: US-021
  Title: Handle empty article catalog gracefully
  Description: As a user, I want the app to behave clearly when there are no articles for my selected level.
  Acceptance Criteria:
  - If there are zero articles for my selected level, the articles section shows an empty state message.
  - The app does not error or show broken UI.

### 5.5 Recommendations and “new content first” behavior

- ID: US-022
  Title: Surface newly added recommended content first
  Description: As a user, I want to easily find newly added content in my level so I can stay up to date.
  Acceptance Criteria:
  - Given there is new content in my selected level, the recommendations highlight it ahead of older content (e.g., appears in a “New” subsection or appears first in the default recommended ordering).
  - The behavior is consistent and deterministic.

- ID: US-023
  Title: Keep playbook simple: no search/filter/tags
  Description: As a product owner, I want discovery to be limited in MVP to reduce complexity.
  Acceptance Criteria:
  - There is no search box.
  - There are no filter controls or tag chips.
  - The API does not expose search/filter query parameters beyond level browsing.

### 5.6 Progress computation and out-of-date rule

- ID: US-024
  Title: Compute completion percentage for my selected level
  Description: As a user, I want my completion percentage to reflect my passed tutorials and read articles within the selected level.
  Acceptance Criteria:
  - Completion % is computed as completed_items / total_items for the selected level.
  - Completed items include passed tutorials and read articles.
  - Total items includes all tutorials and articles for that level.
  - If total items is 0, completion is shown as 0% and eligibility messaging is handled gracefully (no divide-by-zero).

- ID: US-025
  Title: Become eligible to advance at 85% completion
  Description: As a user, I want to unlock eligibility to advance when I reach the threshold.
  Acceptance Criteria:
  - When completion reaches >= 85% for the selected level, the UI indicates eligibility to advance.
  - When completion drops below 85%, eligibility indicator is removed.

- ID: US-026
  Title: Be flagged out of date when new content reduces completion
  Description: As a user, I want to be told when newly added content makes my completion fall below 85% so I can catch up.
  Acceptance Criteria:
  - Given I previously had completion >= 85% for my selected level, when new content is added to that level and my completion becomes < 85%, then I see an “out of date” status.
  - The system does not automatically change my selected level.

### 5.7 Cookbook (save, view, edit recipe links)

- ID: US-027
  Title: Add a recipe link to my cookbook
  Description: As a user, I want to save a recipe URL with my own title and notes so I can easily return to it.
  Acceptance Criteria:
  - Given I am logged in, when I enter a valid URL and a title (and optional notes) and save, then the entry is created.
  - URL must be present and be a valid URL format.
  - Title must be present (non-empty).

- ID: US-028
  Title: View my saved cookbook entries
  Description: As a user, I want to see all recipes I’ve saved.
  Acceptance Criteria:
  - Given I am logged in, when I open my cookbook, then I see a list of my entries.
  - Each entry shows title, URL, and notes preview (if present).

- ID: US-029
  Title: Edit an existing cookbook entry
  Description: As a user, I want to edit the title, URL, or notes for a recipe I saved.
  Acceptance Criteria:
  - Given I am logged in and viewing an entry I own, when I edit fields and save, then the changes persist.
  - Invalid URL updates are rejected with a clear error.

- ID: US-030
  Title: Prevent one user from accessing another user’s cookbook
  Description: As a user, I want my cookbook private.
  Acceptance Criteria:
  - When I attempt to access or edit a cookbook entry I do not own, access is denied.
  - Cookbook lists only return entries belonging to the authenticated user.

- ID: US-031
  Title: Handle edge cases for long notes
  Description: As a user, I want to write notes without breaking the UI.
  Acceptance Criteria:
  - Notes can contain multi-line text.
  - Very long notes (within reasonable limits) do not break page layout; they wrap or display with scrolling.

### 5.8 Content seeding/admin (manual)

- ID: US-032
  Title: Provide an initial set of tutorials and articles
  Description: As a system operator, I want the MVP to ship with initial content so users can use the app immediately.
  Acceptance Criteria:
  - On first run (or via a documented seed process), the database can be populated with tutorial and article records.
  - Seeded content includes required metadata: level and difficulty weight.

### 5.9 Analytics for success metrics

- ID: US-033
  Title: Record signup timestamp for KPI cohorts
  Description: As a product owner, I want to measure engagement within 2 days of signup.
  Acceptance Criteria:
  - When a user signs up, a signup timestamp is stored.

- ID: US-034
  Title: Record tutorial passed events
  Description: As a product owner, I want to measure if users pass at least one tutorial within 2 days.
  Acceptance Criteria:
  - When a user marks a tutorial as passed, a timestamped event is recorded.
  - The event is linked to the user and tutorial.

- ID: US-035
  Title: Record article read events
  Description: As a product owner, I want to measure if users read at least one article within 2 days.
  Acceptance Criteria:
  - When a user marks an article as read, a timestamped event is recorded.
  - The event is linked to the user and article.

- ID: US-036
  Title: Record recipe added events
  Description: As a product owner, I want to measure if users add at least one recipe within 2 days.
  Acceptance Criteria:
  - When a user adds a cookbook entry, a timestamped event is recorded.
  - The event is linked to the user and recipe entry.

- ID: US-037
  Title: Compute KPI attainment per user within 2 days
  Description: As a product owner, I want to compute whether each user achieved key actions within 2 days.
  Acceptance Criteria:
  - For each user, the system can determine if at least one tutorial_passed occurred within 48 hours of signup.
  - For each user, the system can determine if at least one article_marked_read occurred within 48 hours of signup.
  - For each user, the system can determine if at least one recipe_added occurred within 48 hours of signup.

## 6. Success Metrics

### 6.1 Measurement window
- All success KPIs are measured within 2 days (48 hours) after signup, cohort-based.

### 6.2 KPI definitions and targets
- Tutorials engagement KPI
  - Definition: percentage of new users who mark at least one tutorial as passed within 2 days of signup.
  - Target: 90%.

- Articles engagement KPI
  - Definition: percentage of new users who mark at least one article as read within 2 days of signup.
  - Target: 50%.

- Cookbook engagement KPI
  - Definition: percentage of new users who add at least one cookbook entry within 2 days of signup.
  - Target: 30%.

### 6.3 Supporting product health metrics (non-target, recommended)
- Activation funnel
  - Signup -> first session -> first tutorial open -> first tutorial passed.
- Content consumption
  - Median number of tutorials passed per user in first 2 days.
  - Median number of articles read per user in first 2 days.
- Retention (optional, non-MVP target)
  - Day-7 return rate.

### 6.4 Instrumentation requirements summary
- Persist signup timestamp.
- Persist pass/read/add events with timestamps.
- Provide queries or reports enabling cohort analysis at +48 hours.

### 6.5 PRD checklist review (self-check)
- Are all user stories testable? Yes: each story includes observable actions and system responses.
- Are acceptance criteria clear and specific? Yes: criteria specify inputs, conditions, and expected outcomes.
- Are there enough user stories to build a fully functional application? Yes: covers auth, level selection, browse/read/mark actions, progression rules, cookbook CRUD, and analytics.
- Are authentication and authorization requirements included? Yes: US-001 through US-006 and US-030 cover secure access and data isolation.

