# ShipFlow: Complete Detailed Flow

---

## **PHASE 1: PRODUCT DISCOVERY**

### **Step 1.1: Customer Submits Feature Request**

**Actor:** Customer / Support Team / Product Manager
**Input Methods:**

- Web form on ShipFlow app
- Email to feature-request@shipflow.app
- Support ticket (Zendesk, Intercom, etc.)
- API call to ShipFlow

**Data Created:**

- REQUEST record created in DB
- Status: `NEW`
- Fields populated:
  - title
  - description
  - customerEmail
  - customerName (optional)
  - source (form, email, api, ticket)
  - sourceId (external ticket ID if any)
  - priority (user can set or default MEDIUM)
  - deadline (optional)
  - createdAt: now
  - createdBy: user_id (if authenticated)

**Output:**

- Customer receives confirmation email with REQUEST_ID (e.g., FR-123)
- Card appears on Kanban board in **"New Requests"** column
- ShipFlow system marks this for Phase 1 processing

---

### **Step 1.2: AI Begins Clarification Phase**

**Actor:** AI Agent (ShipFlow)
**Trigger:** Request created OR manually triggered by user

**AI's Task:**

- Read REQUEST.title and REQUEST.description
- Analyze what's missing (context, scope, constraints, etc.)
- Decide: Does this request need clarification?

**Three Possible Paths:**

#### **Path A: Request is Clear Enough**

- AI generates list: "These clarifications aren't needed"
- Skip to Step 1.4 (PRD generation)

#### **Path B: Standard Clarifications Needed**

- AI asks 3-7 follow-up questions
- Examples:
  - "Which platforms should this work on?"
  - "What's the deadline?"
  - "Who are the main users?"
  - "What metrics define success?"
  - "Any security/compliance concerns?"

**Data Created:**

- CLARIFICATION records (one per question)
- Each has:
  - requestId: REQUEST.id
  - question: AI's question text
  - askedBy: "ai"
  - isAnswered: false
  - createdAt: now

**Output:**

- Confirmation email sent to customer with questions
- Questions also visible in ShipFlow UI (chat-like interface)
- REQUEST.status: `CLARIFYING`
- Card moves to **"Awaiting Clarification"** column

#### **Path C: Feature Already Exists (Education)**

- AI recognizes this is a duplicate or already built feature
- AI sends response: "We already have this! Here's how to use it..."
- Provides documentation/tutorial links
- Option for customer: "Acknowledge" or "Different request?"

**Data Created:**

- CLARIFICATION record with:
  - question: "Feature already exists - interested in variations?"
  - askedBy: "ai"
  - type: "feature_education"

**Output:**

- Customer educated
- REQUEST.status: `AWAITING_APPROVAL` (moves to decision point)
- Card moves to **"Awaiting Approval"** column

---

### **Step 1.3: Customer Responds to Clarifications**

**Actor:** Customer / Requester
**Wait Time:** Depends on customer (hours to days)

**Customer Actions:**

- Receives email with AI's questions
- Clicks link to ShipFlow UI
- Reads questions in chat-like interface
- Responds to each question (required or optional based on AI's marking)
- Hits "Submit Answers" button

**Data Updated:**

- For each CLARIFICATION:
  - answer: customer's response
  - isAnswered: true
  - answeredAt: now
  - answeredBy: customer_email

**Output:**

- REQUEST.status: Still `CLARIFYING` until all answers collected
- If any unanswered required questions → REQUEST.status stays `CLARIFYING`
- If all required answered → REQUEST.status: `CLARIFYING` (complete)
- Kanban card updated with new information

**Possible Sub-Path: More Questions Needed**

- AI reviews responses
- More clarifications needed?
- Yes → Create new CLARIFICATION records (follow-up questions)
- Loop back to Step 1.3
- No → Move to Step 1.4

---

### **Step 1.4: Team Reviews & Approves Feature Request**

**Actor:** Product Manager / Tech Lead / Project Owner
**Trigger:** Manual review queue or automated notification

**Team's Decision:**

- Open REQUEST in ShipFlow UI
- See:
  - Original request
  - All clarification Q&As
  - Estimated scope/effort
  - Priority
  - Deadline
  - AI's recommendation ("Good feature to build" or "Needs refinement")

**Three Decision Options:**

#### **Option A: APPROVE Feature Request**

- Reviewer clicks "Approve Feature Request" button
- Adds comment (optional): "Looks good, aligns with roadmap"

**Data Updated:**

- REQUEST.status: `APPROVED`
- REQUEST.approvedAt: now
- REQUEST.approvedBy: user_id
- REQUEST.approvalComments: (if provided)
- REQUEST.phase: `2` (moving to Planning)

**Output:**

- Confirmation email sent to customer: "Your feature request was approved! We're generating a detailed plan."
- Kanban card moves to **"PRD Ready for Review"** column
- Internal webhook triggered → Start Phase 1.5

#### **Option B: REJECT Feature Request**

- Reviewer clicks "Reject Feature Request" button
- Must provide reason

**Data Updated:**

- REQUEST.status: `REJECTED`
- REQUEST.rejectionReason: (mandatory text)
- REQUEST.approvedAt: null
- REQUEST.approvedBy: user_id (who rejected)

**Output:**

- Email sent to customer: "Your feature request was reviewed. Here's why it wasn't approved: [reason]"
- Kanban card moves to **"Rejected"** or archive
- End of flow for this REQUEST

#### **Option C: NEED MORE INFO**

- Reviewer clicks "Request More Information"
- Adds new questions or requests clarification

**Data Created:**

- New CLARIFICATION records with:
  - askedBy: "human"
  - question: (team's question)

**Output:**

- REQUEST.status: Back to `CLARIFYING`
- Loop back to Step 1.3 (customer responds again)

---

### **Step 1.5: AI Generates PRD (Triggered after Approval)**

**Actor:** AI Agent (ShipFlow)
**Trigger:** REQUEST.status changes to `APPROVED`

**PRD Generation Process:**

**AI Inputs:**

- REQUEST.title + REQUEST.description
- All CLARIFICATION Q&As (request + answers)
- Internal knowledge base (tech stack, existing features, etc.)

**AI Outputs:**

- Structured PRD content:
  - **Problem Statement:** Why does this feature matter?
  - **Goals:** What success looks like (3-5 main goals)
  - **Non-Goals:** What we're explicitly NOT building
  - **User Stories:** 5-10 stories in format "As a [user], I want [action] so that [benefit]"
  - **Acceptance Criteria:** Detailed criteria per user story
  - **Edge Cases:** Scenarios to handle (offline, errors, etc.)
  - **Success Metrics:** How we measure success (KPIs)
  - **Non-Functional Requirements:**
    - Performance (response time, throughput)
    - Scalability (concurrent users, data volume)
    - Security (auth, data privacy, etc.)
    - Accessibility (WCAG compliance)
  - **Constraints:** Limits/boundaries
  - **Assumptions:** Decisions we're making
  - **Dependencies:** Other systems/features needed

**Data Created:**

- PRD record in DB with:
  - requestId: REQUEST.id
  - All above fields as JSONB or text
  - status: `DRAFT`
  - fileUrl: `/docs/prd-{REQUEST_ID}.md`
  - generatedBy: "ai"
  - createdAt: now

- PRD markdown file created:
  - Path: `/repo/docs/prd-{REQUEST_ID}.md`
  - Version controlled in GitHub
  - Contains full formatted PRD

**Output:**

- REQUEST.status: `PRD_GENERATED`
- REQUEST.phase: `2`
- Notification sent to team: "PRD generated for [request title]. Ready for review."
- Kanban card moves to **"PRD Ready for Review"** column

---

### **Step 1.6: Team Reviews PRD**

**Actor:** Product Manager / Tech Lead / Engineering Lead
**Location:** ShipFlow UI or GitHub `/docs/prd-{REQUEST_ID}.md`

**Review Checklist:**

- Is problem statement clear?
- Are goals realistic and measurable?
- Are user stories complete?
- Are acceptance criteria testable?
- Are edge cases covered?
- Are success metrics quantifiable?
- Any missing dependencies?
- Feasible with current tech stack?
- Any concerns about scope?

**Three Outcomes:**

#### **Outcome A: APPROVE PRD**

- Reviewer clicks "Approve PRD" button

**Data Updated:**

- PRD.status: `APPROVED`
- PRD.approvedAt: now
- PRD.approvedBy: user_id
- REQUEST.status: `AWAITING_PLAN_APPROVAL`

**Output:**

- Notification: "PRD approved! Moving to Planning phase."
- Kanban card moves to **"Awaiting Plan Approval"** column
- Internal webhook → Move to Phase 2

#### **Outcome B: REQUEST CHANGES**

- Reviewer clicks "Request Changes" button
- Adds comments with specific feedback

**Data Updated:**

- PRD.status: `DRAFT` (reset)
- PRD.reviewComments: (feedback text)
- REQUEST.status: `PRD_GENERATED` (reset)

**Output:**

- Notification sent to AI with review feedback
- AI regenerates PRD based on feedback
- Loop back to Step 1.6 (team reviews updated PRD)

#### **Outcome C: REJECT PRD**

- Reviewer clicks "Reject" with explanation

**Data Updated:**

- REQUEST.status: `REJECTED`
- PRD.status: `REJECTED`

**Output:**

- End of flow
- Customer notified

---

## **PHASE 2: PLANNING**

### **Step 2.1: Auto-Create GitHub Issue**

**Actor:** ShipFlow System (automated)
**Trigger:** PRD.status changes to `APPROVED`

**GitHub Issue Created:**

- Issue title: `[FEATURE] {REQUEST.title}`
- Issue body: Links to `/docs/prd-{REQUEST_ID}.md`
- Labels: `feature`, `shipflow`, `phase-2-planning`
- Assignee: Team lead or unassigned
- Milestone: (optional, set by config)

**Data Updated:**

- REQUEST.githubIssueNumber: (GitHub issue #)
- REQUEST.githubIssueUrl: (GitHub issue URL)
- REQUEST.status: `AWAITING_PLAN_APPROVAL`

**Output:**

- GitHub issue visible to dev team
- Developers can see PRD from within GitHub

---

### **Step 2.2: AI Breaks Down PRD into Engineering Tasks**

**Actor:** AI Agent (ShipFlow)
**Trigger:** PRD.status = `APPROVED`

**Task Creation Logic:**

- AI reads PRD content (goals, user stories, acceptance criteria)
- Breaks down into discrete, actionable tasks
- Each task is 1-3 days of work (estimate)
- Example breakdown:
  - TASK 1: "Setup database schema for real-time notifications"
  - TASK 2: "Implement WebSocket connection handler"
  - TASK 3: "Build notification dispatch service"
  - TASK 4: "Create frontend notification UI component"
  - TASK 5: "Add unit tests for notification service"
  - TASK 6: "Add integration tests for WebSocket flow"
  - TASK 7: "Documentation for API"
  - TASK 8: "Load testing & performance optimization"

**Data Created:**

- TASK records (8-15 typically):
  - prdId: PRD.id
  - title: "Setup database schema..."
  - description: Detailed description of what to do
  - status: `TODO`
  - order: (1, 2, 3, ... for sequencing)
  - estimatedHours: (4, 8, 16, etc.)
  - githubIssueNumber: (optional, can create GitHub issue per task)

- GitHub Issues created per task (optional):
  - Can be done as sub-issues under main REQUEST issue

**Output:**

- TASK records visible in ShipFlow UI
- Kanban board updated with task list
- GitHub milestones/issues created for tracking

---

### **Step 2.3: Team Approves Plan**

**Actor:** Project Manager / Engineering Lead
**Location:** ShipFlow UI → Plan tab

**Review Checklist:**

- Are tasks logically sequenced?
- Are estimates reasonable?
- Any missing tasks?
- Any tasks that are too big?
- Dependencies between tasks clear?
- Feasible to complete by deadline?

**Two Outcomes:**

#### **Outcome A: APPROVE PLAN**

- Click "Approve Plan" button

**Data Updated:**

- REQUEST.status: `PLAN_APPROVED`
- REQUEST.phase: `3`
- All TASK records now active (developers can pick up)

**Output:**

- Notification: "Plan approved! Development can begin."
- Kanban card moves to **"In Development"** column
- Developers notified: "Your tasks are ready for pickup"
- GitHub issues assigned to developers

#### **Outcome B: REQUEST CHANGES**

- Click "Request Changes"
- Add feedback

**Data Updated:**

- REQUEST.status: Back to `AWAITING_PLAN_APPROVAL`
- TASK records marked for revision

**Output:**

- AI revisits task breakdown
- Loop back to Step 2.3

---

## **PHASE 3: DEVELOPMENT**

### **Step 3.1: Developers Pick Up Tasks**

**Actor:** Developer / Development Team
**Location:** GitHub or ShipFlow UI

**Developer Actions:**

1. Sees TASK in their queue
2. Reads description and acceptance criteria
3. Clicks "Start Work" or assigns to self on GitHub
4. Creates feature branch: `feature/shipflow-{REQUEST_ID}-{TASK_ID}`
   - Example: `feature/shipflow-fr-123-task-1`

**Data Updated:**

- TASK.status: `IN_PROGRESS`
- TASK.assignedTo: developer_email
- TASK.startedAt: now

**Output:**

- GitHub branch created
- Kanban card shows developer assigned
- Other developers see it's claimed

---

### **Step 3.2: Developer Implements Feature**

**Actor:** Developer
**Location:** Local machine + Git

**Development Process:**

1. Clone repo
2. Checkout feature branch
3. Code the feature based on:
   - TASK description
   - Acceptance criteria from PRD
   - Any technical docs/architecture docs
4. Write unit tests
5. Commit code with clear messages: `feat: implement websocket notification handler`
6. Push to remote branch

**Code Quality Checks (Local):**

- Linting passes
- Tests pass locally
- No console errors
- Follows code style guide

**Output:**

- Code pushed to feature branch
- Branch visible in GitHub
- Tests running on CI/CD pipeline

---

### **Step 3.3: Developer Opens Pull Request**

**Actor:** Developer
**Trigger:** Feature branch ready for review

**PR Creation:**

- Developer opens PR on GitHub
- Title: `feat: websocket notification handler (#123)` (references issue)
- PR Description includes:
  - What was implemented
  - Which TASK this closes (links)
  - Testing done
  - Any breaking changes
  - Screenshots (if UI change)

**PR Template (Auto-filled):**

```
## Implementation of
- Closes #123 (GitHub issue)
- Implements TASK: [task title]

## Changes
- [Change 1]
- [Change 2]

## Testing
- [Test 1 description]
- [Test 2 description]

## Screenshots (if applicable)
[Add images]
```

**Data Created:**

- GITHUB_PR record in ShipFlow DB:
  - requestId: REQUEST.id
  - prNumber: (from GitHub)
  - prUrl: (GitHub PR URL)
  - branchName: `feature/shipflow-fr-123-task-1`
  - title, description, status: `OPEN`
  - authorEmail: developer
  - authorName: developer_name
  - createdAt: now
  - commitCount, filesChanged, additions, deletions: (from GitHub API)

- REQUEST.status: `IN_DEVELOPMENT` (if first PR for request) or stays same
- TASK.status: `IN_PROGRESS` (if not already)

**Output:**

- PR visible on GitHub
- Notification sent to reviewers (automated or manual)
- CI/CD pipeline runs tests
- ShipFlow records PR in database
- Kanban card shows "1 PR Open"

---

### **Step 3.4: Code Review (Human / Auto-Check)**

**Actor:** Peer Developers + Linting Tools
**Location:** GitHub PR

**Human Review Checks:**

- Code style & readability
- Logic correctness
- No obvious bugs
- Proper error handling
- Performance impact
- Security issues
- Test coverage

**Automated Checks:**

- CI/CD tests pass
- Linting passes
- Coverage threshold met (e.g., > 80%)
- No security vulnerabilities (SAST)

**Two Outcomes:**

#### **Outcome A: APPROVED (by humans)**

- Reviewer clicks "Approve" on GitHub PR

**Data Updated:**

- GITHUB_PR.status: `APPROVED`

**Output:**

- PR ready to merge (can be auto-merged or manual)
- Kanban shows "Approved - Ready for AI Review"

#### **Outcome B: CHANGES REQUESTED**

- Reviewer clicks "Request Changes"
- Adds comments with feedback

**Data Updated:**

- GITHUB_PR.status: `OPEN` (not approved)

**Output:**

- Developer sees feedback
- Makes changes, commits, pushes
- Loop back to Step 3.4 (re-review)

---

### **Step 3.5: PR Merged (Tentative)**

**Actor:** GitHub (if auto-merge enabled) or Developer
**Trigger:** PR approved + tests pass + no conflicts

**Merge Process:**

- PR merged to `develop` or `main` branch
- Branch deleted
- Commit is part of main codebase

**Data Updated:**

- GITHUB_PR.status: `MERGED`
- GITHUB_PR.mergedAt: now
- TASK.status: `DONE` (if this was the final task)

**Note:** At this point, code is in repo but NOT deployed. Next phase will validate before final merge/deploy.

**Output:**

- Deployment pipeline triggered (may auto-deploy to staging)
- Notification: "Your PR was merged!"

---

## **PHASE 4: AI REVIEW LOOP**

### **Step 4.1: AI Reviews PR Against PRD**

**Actor:** AI Agent (ShipFlow) + System
**Trigger:** GITHUB_PR.status = `MERGED` OR manually triggered

**AI Review Process:**

**AI Gathers Information:**

1. Fetches PRD from DB (PRD.id linked to REQUEST)
2. Fetches PR diff from GitHub (all code changes)
3. Reads PRD acceptance criteria + edge cases + requirements
4. Reads TASK descriptions for this PR
5. Analyzes test coverage report
6. Runs static analysis on code (security, performance)

**AI Checks Against Each Criteria:**

#### **Check 1: PRD Compliance**

- Does code implement what PRD asks for?
- Example: "PRD says notifications should be < 500ms latency - is there evidence of this?"
- Example: "PRD says offline mode needed - is there code for reconnection?"

#### **Check 2: Acceptance Criteria**

- Each acceptance criteria from PRD:
  - ✅ Met? Or ❌ Missing?
- Example: "AC: Test shows latency < 500ms" - Can AI verify this from tests?

#### **Check 3: Code Quality**

- Test coverage adequate?
- Error handling present?
- No obvious bugs?
- Code style consistent?

#### **Check 4: Security**

- Any hardcoded secrets?
- SQL injection risks?
- XSS vulnerabilities?
- CORS misconfiguration?
- Auth bypass risks?

#### **Check 5: Performance**

- Any N+1 queries?
- Memory leaks?
- Inefficient algorithms?
- Does it scale?

#### **Check 6: Edge Cases**

- PRD mentions: "offline, slow network, reconnection"
- Code handles these? Or missing?

#### **Check 7: Task Completion**

- Does code close all related TASK items?
- Any task description missed?

**Data Created:**

- AI_REVIEW record:
  - requestId: REQUEST.id
  - prId: GITHUB_PR.id
  - reviewNumber: 1 (or 2, 3 if re-reviews)
  - status: `PENDING` → `APPROVED` or `NEEDS_FIXES`
  - findings: Array of issues found:
    ```
    [
      {
        type: "blocking",
        category: "prd_compliance",
        title: "Offline reconnection not implemented",
        description: "PRD AC#3 requires automatic reconnection after network loss",
        suggestedFix: "Add Socket.IO reconnection handler with exponential backoff",
        severity: "critical"
      },
      {
        type: "blocking",
        category: "security",
        title: "API key hardcoded in config",
        description: "Found hardcoded AWS key in environment config",
        suggestedFix: "Use environment variables with .env.example for templates",
        severity: "critical"
      },
      {
        type: "non_blocking",
        category: "code_quality",
        title: "Missing error boundary in React component",
        description: "Notification component should have error boundary",
        suggestedFix: "Wrap with <ErrorBoundary> component",
        severity: "medium"
      }
    ]
    ```
  - blockingIssueCount: 2
  - nonBlockingIssueCount: 1
  - summary: "Code has 2 blocking issues that need fixes before merging"
  - createdAt: now

**Output:**

- AI_REVIEW record created
- Notification sent to developer: "AI Review complete - 2 issues found"
- Kanban card shows "Issues Found" badge
- REQUEST.status: `IN_AI_REVIEW`

---

### **Step 4.2: AI Review Outcomes**

#### **Outcome A: NO ISSUES FOUND** ✅

- AI_REVIEW.blockingIssueCount: 0
- AI_REVIEW.status: `APPROVED`

**Output:**

- REQUEST.status: `READY_FOR_HUMAN_APPROVAL`
- Kanban card moves to **"Ready for Human Approval"** column
- Notification: "AI review passed! Ready for human approval."

#### **Outcome B: BLOCKING ISSUES FOUND** ❌

- AI_REVIEW.blockingIssueCount > 0
- AI_REVIEW.status: `NEEDS_FIXES`

**Output:**

- REQUEST.status: `FIX_NEEDED`
- Kanban card moves back to **"In Development"** column
- Notification to developer:

  ```
  "AI Review found 2 blocking issues:
  1. [Issue 1 title]
  2. [Issue 2 title]

  Please fix and update the PR."
  ```

#### **Outcome C: NON-BLOCKING ISSUES ONLY** ⚠️

- AI_REVIEW.blockingIssueCount: 0
- AI_REVIEW.nonBlockingIssueCount > 0
- AI_REVIEW.status: `APPROVED` (with warnings)

**Output:**

- REQUEST.status: `READY_FOR_HUMAN_APPROVAL`
- Kanban card shows warnings badge
- Notification: "AI review passed with suggestions"
- Developer can choose to fix or defer

---

### **Step 4.3: Developer Fixes Blocking Issues (if needed)**

**Actor:** Developer
**Trigger:** REQUEST.status = `FIX_NEEDED`

**Developer Actions:**

1. Reads AI findings + suggested fixes
2. Makes necessary code changes
3. Commits: `fix: offline reconnection handling (AI review #1)`
4. Pushes to same PR branch (PR stays open)

**Automated:**

- CI/CD re-runs tests
- Code changes pushed to open PR

**Data Updated:**

- GITHUB_PR.status: Still `OPEN` (not merged yet)
- GITHUB_PR.updatedAt: now

**Output:**

- PR shows new commits
- Tests re-run

---

### **Step 4.4: AI Re-Reviews Updated Code**

**Actor:** AI Agent (ShipFlow)
**Trigger:** New commits pushed to PR branch

**AI Re-Review Process:**

- Same as Step 4.1
- Checks if issues are fixed
- May find new issues (unlikely if fixes are correct)
- Creates new AI_REVIEW record with reviewNumber: 2

**Data Created:**

- New AI_REVIEW record:
  - reviewNumber: 2
  - findings: (updated list, hopefully empty or fewer)

**Output:**

- Notification: "AI Review #2 complete"
- If all blocking issues fixed:
  - REQUEST.status: `READY_FOR_HUMAN_APPROVAL`
  - Kanban moves to **"Ready for Human Approval"**
- If new issues found:
  - REQUEST.status: Stays `FIX_NEEDED`
  - Loop back to Step 4.3

---

### **Step 4.5: Loop Until No Blocking Issues**

**Repeating Process:**

- Developer fixes issues → pushes → AI re-reviews → repeat
- Typically 1-3 loops
- Eventually: All blocking issues resolved

**Output When Complete:**

- REQUEST.status: `READY_FOR_HUMAN_APPROVAL`
- Kanban card moves to **"Ready for Human Approval"** column
- GITHUB_PR.status: Ready to merge (but not merged yet)

---

## **PHASE 5: HUMAN APPROVAL**

### **Step 5.1: Human Reviewer Inspects Everything**

**Actor:** Project Manager / Tech Lead / Release Manager
**Location:** ShipFlow UI → Approval Dashboard

**Reviewer Sees:**

1. **REQUEST details:**
   - Original feature request
   - All clarifications Q&A
2. **PRD:**
   - Full PRD with all sections
   - Goal statements
   - Acceptance criteria
   - Success metrics
3. **TASKS:**
   - All engineering tasks
   - Status: completed/done
4. **PR Details:**
   - Code diff (summary)
   - Commits
   - Test results
   - Coverage report
5. **AI Review History:**
   - All AI reviews (Review #1, #2, etc.)
   - Issues found and fixed
   - Final AI verdict
6. **Non-Blocking Issues (if any):**
   - Warnings or suggestions
   - Can be deferred

**Reviewer Checklist:**

- [ ] PRD is clear and complete?
- [ ] All tasks documented and done?
- [ ] Code implements PRD correctly?
- [ ] Tests are comprehensive?
- [ ] AI review passed without blocking issues?
- [ ] No security risks?
- [ ] Performance acceptable?
- [ ] Any breaking changes documented?
- [ ] Release notes prepared?

---

### **Step 5.2: Human Makes Approval Decision**

#### **Decision A: APPROVE RELEASE** ✅

- Reviewer clicks "Approve Release" button
- Adds optional comment: "Looks great! Ready to ship."

**Data Created:**

- HUMAN_APPROVAL record:
  - requestId: REQUEST.id
  - reviewedBy: reviewer_user_id
  - status: `APPROVED`
  - comments: (if provided)
  - prdVerified: true
  - tasksVerified: true
  - prVerified: true
  - aiReviewVerified: true
  - noBlockingIssues: true
  - reviewedAt: now

**Data Updated:**

- REQUEST.status: `APPROVED` (changes from `READY_FOR_HUMAN_APPROVAL`)
- REQUEST.phase: `5`

**Output:**

- Notification: "Release approved! Preparing to merge and deploy."
- Kanban card moves to **"Approved"** column
- Auto-triggers Step 5.3

#### **Decision B: REJECT RELEASE** ❌

- Reviewer clicks "Reject" button
- Must provide reason (required)

**Data Created:**

- HUMAN_APPROVAL record:
  - status: `REJECTED`
  - comments: rejection reason (mandatory)

**Data Updated:**

- REQUEST.status: `REJECTED`

**Output:**

- Notification to team: "Release rejected - reason: [reason]"
- End of flow
- Can optionally go back to development

#### **Decision C: REQUEST CHANGES** 🔄

- Reviewer clicks "Request Changes"
- Adds specific feedback

**Data Updated:**

- REQUEST.status: Back to `FIX_NEEDED`
- HUMAN_APPROVAL: Marked as "pending changes"

**Output:**

- Developer notified with feedback
- Loop back to Step 4.3 (developer fixes)

---

## **PHASE 5+: SHIPMENT**

### **Step 5.3: Merge PR to Main**

**Actor:** ShipFlow System (automated) or Manual
**Trigger:** REQUEST.status = `APPROVED`

**Merge Process:**

1. PR merged from feature branch to `main` or `production` branch
2. Merge strategy: squash or conventional (based on config)
3. Merge commit created with reference to REQUEST

**Data Updated:**

- GITHUB_PR.status: `MERGED`
- GITHUB_PR.mergedAt: now
- GITHUB_PR.mergeCommitSha: (git commit hash)

**Output:**

- GitHub shows "Merged"
- Code now in production branch
- All tests passing on main

---

### **Step 5.4: Deploy to Production**

**Actor:** CI/CD Pipeline (automated) or Manual Deployment Team
**Trigger:** PR merged to main

**Deployment Process:**

1. Build Docker image (if applicable)
2. Run smoke tests
3. Deploy to staging (optional)
4. Deploy to production
5. Health checks pass
6. Rollback plan ready (if needed)

**Timeline:**

- Staging: 5-10 minutes
- Production: 15-30 minutes
- Total: ~30-45 minutes

**Data Created:**

- SHIPMENT record:
  - requestId: REQUEST.id
  - mergedBy: (person who merged, or automation)
  - mergedAt: (when PR merged)
  - mergeCommitSha: (git hash)
  - deployedAt: now
  - deploymentEnvironment: `production`
  - releaseNotes: (auto-generated from commits)

**Output:**

- Deployment logs visible in ShipFlow
- Notification: "Feature deployed to production!"

---

### **Step 5.5: Notify Customer**

**Actor:** ShipFlow System (automated)
**Trigger:** Deployment successful

**Customer Notification Email:**

```
Subject: Your Feature Request is Live! 🎉

Hi [Customer Name],

Your feature request "[Feature Title]" is now live in production!

What was built:
- [Brief description from PRD goals]

How to access:
- [Link to feature or documentation]

Questions?
- [Support link]

Thanks for your patience!
ShipFlow Team
```

**Data Updated:**

- SHIPMENT.customerNotifiedAt: now
- SHIPMENT.notificationMethod: `email`

**Output:**

- Email sent to REQUEST.customerEmail
- Customer can start using feature immediately

---

### **Step 5.6: Mark Feature as Shipped**

**Actor:** System (automated)
**Trigger:** Notification sent + deployment healthy

**Final State Update:**

- REQUEST.status: `SHIPPED`
- REQUEST.phase: `5` (complete)
- Kanban card moves to **"Shipped"** column with ✅ badge

**Data Updated:**

- SHIPMENT record completed:
  - All fields filled
  - Archived PRD URL stored
  - Task count stored for analytics

**Output:**

- Final notification in Slack/Teams: "FR-123 shipped to production"
- REQUEST marked as complete
- Card stays on Shipped column (for reference)
- Analytics updated (time from request to ship)

---

### **Step 5.7: Measure Success**

**Actor:** Product Analytics / Engineering
**Trigger:** 1 week after deployment

**Metrics Checked Against PRD.successMetrics:**

- Example: "PRD said: users should see notifications < 500ms"
  - Check: Are real notifications hitting < 500ms? ✅
- Example: "PRD said: Support ticket volume should drop 20%"
  - Check: Did it drop? ✅ or ❌

**Data Updated:**

- SHIPMENT.successMetricsVerified: true/false
- Notes on actual vs expected

**Output:**

- Retrospective report (optional)
- If metrics met: Feature counts as success ✅
- If metrics not met: Issue created for follow-up work

---

## **FULL FLOW SUMMARY**

```
PHASE 1: PRODUCT DISCOVERY
  1.1 Customer submits request → REQUEST created (NEW)
  1.2 AI asks clarifications → REQUEST (CLARIFYING)
  1.3 Customer responds → Answers collected
  1.4 Team approves feature → REQUEST (APPROVED)
  1.5 AI generates PRD → PRD created (DRAFT)
  1.6 Team approves PRD → PRD (APPROVED)

PHASE 2: PLANNING
  2.1 Auto-create GitHub issue
  2.2 AI breaks into tasks → TASK records created
  2.3 Team approves plan → REQUEST (PLAN_APPROVED)

PHASE 3: DEVELOPMENT
  3.1 Developer picks task → TASK (IN_PROGRESS)
  3.2 Developer codes feature
  3.3 Developer opens PR → GITHUB_PR created (OPEN)
  3.4 Peer review PR → GITHUB_PR (APPROVED)
  3.5 PR merged → GITHUB_PR (MERGED)

PHASE 4: AI REVIEW LOOP
  4.1 AI reviews PR vs PRD → AI_REVIEW created
  4.2 Review results:
      - ✅ No issues → REQUEST (READY_FOR_HUMAN_APPROVAL)
      - ❌ Issues found → REQUEST (FIX_NEEDED)
  4.3 Developer fixes issues
  4.4 AI re-reviews → AI_REVIEW #2
  4.5 Loop until no blocking issues

PHASE 5: HUMAN APPROVAL
  5.1 Human reviewer inspects everything
  5.2 Human decision:
      - ✅ Approve → REQUEST (APPROVED)
      - ❌ Reject → REQUEST (REJECTED)
  5.3 Merge PR to main
  5.4 Deploy to production
  5.5 Notify customer → Email sent
  5.6 Mark as shipped → REQUEST (SHIPPED)
  5.7 Measure success metrics
```

---

## **KEY ACTORS**

| Actor               | Phases  | Actions                                               |
| ------------------- | ------- | ----------------------------------------------------- |
| **Customer**        | 1       | Submits request, answers clarification Q&As           |
| **Product Manager** | 1, 2, 5 | Approves feature, PRD, and release                    |
| **AI Agent**        | 1, 2, 4 | Clarifies, generates PRD, creates tasks, reviews code |
| **Developer**       | 3, 4    | Implements, opens PR, fixes issues                    |
| **Peer Reviewer**   | 3       | Reviews code quality                                  |
| **QA/Test**         | 3       | Ensures tests pass                                    |
| **Release Manager** | 5       | Merges, deploys, notifies                             |
| **ShipFlow System** | All     | Orchestrates, triggers, stores, notifies              |

---

## **DATA FLOW TIMELINE**

```
TIME     PHASE   STATUS                DATABASE UPDATES
────────────────────────────────────────────────────────
T+0      1       NEW                   REQUEST created
T+1h     1       CLARIFYING            CLARIFICATIONS added
T+24h    1       CLARIFYING            Answers collected
T+26h    1       APPROVED              Team approves
T+27h    1       PRD_GENERATED         PRD created
T+28h    1       AWAITING_PLAN_APPROV  Team approves PRD
T+29h    2       PLAN_APPROVED         TASKS created
T+30h    2       —                     GitHub issue + branch created
T+31h    3       IN_DEVELOPMENT        Developer starts coding
T+40h    3       —                     Developer opens PR
T+42h    3       —                     Peer review passes
T+43h    3       —                     PR merged
T+44h    4       IN_AI_REVIEW          AI reviews (finds issues)
T+45h    4       FIX_NEEDED            Developer starts fixing
T+50h    4       IN_AI_REVIEW          AI re-reviews (no issues)
T+51h    4       READY_FOR_HUMAN_APPROV
T+52h    5       APPROVED              Human approves
T+53h    5       —                     Deployed to staging
T+54h    5       —                     Deployed to production
T+55h    5       SHIPPED               Customer notified
───────────────────────────────────────────────────────
TOTAL: ~55 hours (2.3 days) from request to shipped
```

---

## **KEY DECISIONS / GATES**

```
Gate 1: Team approves feature?
        YES → Proceed to PRD generation
        NO  → Rejected (end)

Gate 2: PRD quality acceptable?
        YES → Approve PRD, create tasks
        NO  → Request changes, regenerate

Gate 3: Plan (tasks) reasonable?
        YES → Approve plan, development starts
        NO  → Revise tasks

Gate 4: AI review passes (no blocking issues)?
        YES → Ready for human approval
        NO  → Developer fixes, re-review

Gate 5: Human approves release?
        YES → Merge, deploy, ship
        NO  → Reject or request changes
```

---

## **KANBAN BOARD COLUMNS**

```
1. New Requests
   └─ STATUS: NEW

2. Awaiting Clarification
   └─ STATUS: CLARIFYING

3. PRD Ready for Review
   └─ STATUS: PRD_GENERATED

4. Awaiting Plan Approval
   └─ STATUS: AWAITING_PLAN_APPROVAL

5. In Development
   └─ STATUS: IN_DEVELOPMENT, FIX_NEEDED

6. In AI Review
   └─ STATUS: IN_AI_REVIEW

7. Issues Found (Fix Needed)
   └─ STATUS: FIX_NEEDED

8. Ready for Human Approval
   └─ STATUS: READY_FOR_HUMAN_APPROVAL

9. Shipped
   └─ STATUS: SHIPPED
```

---

**END OF DETAILED FLOW**
