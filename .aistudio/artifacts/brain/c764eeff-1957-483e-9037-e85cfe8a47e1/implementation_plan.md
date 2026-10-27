# Implementation Plan: Apple-Style Mobile Redesign, Multi-Agent Contextual Comment DM Engine, and Multi-Provider AI Orchestrator

This plan outlines the architecture, database schema, AI routing layer, and front-end modernization to transform YouTube AI Studio into a mobile-first, Apple-inspired studio with contextual multi-agent comment automation, self-learning link distribution, and cost-efficient multi-provider AI failover.

---

## 1. Product Concept & Architecture

### A. Multi-Agent Comment Intelligence & Self-Learning DM System
1. **Comment Intent & Sentiment Agent**:
   - Analyzes incoming YouTube comments using video context (title, description, key topics) rather than treating comments in isolation.
   - Categorizes each comment: `question`, `appreciation`, `feedback`, `dm_link_request`, `collaboration`, or `spam`.
   - Generates bespoke, personalized responses tailored to the viewer's exact comment (no generic "Thank you!" copy).
2. **DM & Resource Request Detector**:
   - Detects when a viewer asks for a resource, guide, link, or download mentioned in the video (e.g., *"Can you DM me the link you talked about?"*, *"Where can I get this PDF?"*).
   - Checks the **Learned Links Repository** (`learned_links_repository` table):
     - If the creator has already registered or taught the agent the resource link for that video/topic, the agent automatically queues the approved personalized reply containing the link.
     - If the link is unknown, the agent automatically flags a `pending_dm_action` and dispatches an immediate in-app high-priority notification (and optional email alert) prompting the creator: *"Viewer @user asked for the promised download for video X. Provide the link once to teach the agent."*
     - Once the creator enters the link and approves, the agent stores the link into its permanent memory and delivers the reply. Future requests for the same item are automatically fulfilled without bothering the creator again.
3. **Interactive Multi-Agent Chat Assistant**:
   - Dedicated chat interface where the creator can talk naturally to the studio agent (like Gemini/ChatGPT).
   - Creators can instruct the assistant: *"For our new video, whenever someone asks for the notes, reply with this link: https://..."* or *"Review pending comment requests and approve all positive responses"*.
   - Multi-agent roles: **Comment Agent**, **Optimizer Agent**, and **Task Dispatcher**.

### B. Multi-Provider AI Orchestration Layer with Cost-Efficient Failover
1. **Universal LLM Gateway (`server/ai_orchestrator.ts`)**:
   - Unified interface supporting multiple AI providers:
     - **Google Gemini** (`gemini-3.8-flash` for high speed & zero cost / low price, `gemini-4-argon` for deep reasoning).
     - **OpenRouter** (access to cheap high-performance open models like Llama 3.3 70B, DeepSeek V3, Qwen 2.5).
     - **NVIDIA NIM** (fast inference API keys for open models).
     - **Mistral AI** (`mistral-small`, `codestral`).
2. **Intelligent Fallback & Circuit Breaker**:
   - If a provider hits a rate limit (HTTP 429), quota exhaustion, or timeout, the orchestrator automatically and seamlessly fails over to the next configured provider without interrupting the user's workflow.
   - Provider priority: Free/Default Gemini -> OpenRouter -> NVIDIA -> Mistral.
3. **Creator Provider Settings**:
   - In-app AI settings tab allowing creators to supply optional custom API keys or toggle auto-failover order.

### C. Apple iOS-Style Design System & Total Mobile Responsiveness
1. **Ergonomic Mobile Touch Layout**:
   - Safe-area inset handling (`env(safe-area-inset-bottom)`), thumb-friendly navigation bar, bottom drawer sheets for actions on mobile (`< 768px`).
   - Minimum touch target hitboxes of $44 \times 44\text{px}$ on all interactive controls.
2. **Aesthetic Refinement (Apple iOS Inspiration)**:
   - Eliminating all static pill capsules, badges, and garish neon accents.
   - Clean unboxed metadata with subtle typographic dots (`·`).
   - Frosted glassmorphism (`backdrop-blur-xl bg-zinc-950/80 border border-zinc-800/60`).
   - Native-feeling segmented controls for tabs, dropdowns, and status filters.
   - Zero text clipping, line-breaks, or overlapping: strict `truncate`, `break-words`, `min-w-0` on all flex children.
3. **Removal of Inauthentic Elements**:
   - Removal of synthetic / placeholder "AI Thumbnail Generator" mockups; keeping only verified, authentic YouTube Studio features.

---

## 2. Database Schema & Data Models (`server/db.ts`)

```sql
-- 1. Multi-Provider AI Configuration
CREATE TABLE IF NOT EXISTS ai_provider_configs (
  provider_id TEXT PRIMARY KEY, -- 'gemini', 'openrouter', 'nvidia', 'mistral'
  api_key_encrypted TEXT,
  model_name TEXT NOT NULL,
  priority_order INTEGER DEFAULT 1,
  is_enabled INTEGER DEFAULT 1,
  last_used_at DATETIME,
  failure_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Learned Links & Resource Memory (Self-Learning Agent)
CREATE TABLE IF NOT EXISTS learned_links_repository (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  video_id TEXT, -- NULL if global channel resource
  keyword_trigger TEXT NOT NULL, -- e.g., 'notes', 'pdf', 'telegram', 'course'
  title TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  description TEXT,
  times_shared INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pending DM / Link Request Actions
CREATE TABLE IF NOT EXISTS pending_dm_actions (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT,
  youtube_comment_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  comment_text TEXT NOT NULL,
  detected_intent TEXT NOT NULL, -- 'dm_link_request', 'custom_question'
  requested_resource TEXT, -- extracted keyword (e.g., 'PDF notes')
  suggested_reply TEXT,
  provided_link TEXT,
  status TEXT DEFAULT 'pending_creator', -- 'pending_creator', 'approved', 'dismissed', 'auto_fulfilled'
  email_notified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- 4. Interactive AI Studio Chat History
CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  agent_type TEXT DEFAULT 'general', -- 'general', 'comment_agent', 'optimizer_agent'
  content TEXT NOT NULL,
  action_payload TEXT, -- JSON action if an agent performed an action
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Implementation Steps

### Phase 1: AI Provider Orchestration Layer (`server/ai_orchestrator.ts`)
- Implement `AiOrchestrator` class supporting Gemini (`@google/genai`), OpenRouter (OpenAI-compatible client), NVIDIA NIM, and Mistral.
- Built-in automatic circuit-breaker and failover mechanism:
  - If Primary provider fails (e.g. rate limit 429), immediately tries the next healthy provider in sequence.
  - Returns metadata showing which provider and model executed the task.
- Endpoints:
  - `GET /api/ai/providers`: List active providers, status, and model selections.
  - `POST /api/ai/providers`: Update custom provider API keys and default routing order.
  - `POST /api/ai/chat`: Streaming / non-streaming conversation with the studio multi-agent assistant.

### Phase 2: Multi-Agent Comment Analysis & Self-Learning Engine (`server/agents/comment_agent.ts`)
- Create comment intent analyzer prompt:
  - Evaluates comment text against video metadata.
  - Classifies intent and determines whether the user is asking for a link/resource.
- Implement matching against `learned_links_repository`:
  - If a matching keyword exists for that video/channel, auto-generates a contextual reply containing the link.
  - If no match exists, logs a row in `pending_dm_actions` and sets `status = 'pending_creator'`.
- Creator DM approval endpoint:
  - `POST /api/comments/dm-actions/:id/approve`: Creator inputs the link, approves the reply, and flags whether to remember this link for future commenters.
  - When remembered, inserts into `learned_links_repository`.
  - Publishes the reply to YouTube via `postCommentReply`.

### Phase 3: Mobile Touch Ergonomics & Apple iOS UI Polish
- **Global Typography & Collision Fixes**:
  - Audit and fix all `text-xs`, `truncate`, flex layouts, and headers where text collided or broke onto two lines on small screens.
  - Ensure zero horizontal scrollbars on viewports from 375px to 430px.
- **Apple iOS Design Tokens**:
  - Segmented control pills with tactile feedback (`bg-zinc-800/80 p-1 rounded-xl` with active white/zinc state).
  - Floating frosted navigation with bottom safe-area padding.
  - Native iOS-style action sheets and clean card hierarchy without noisy badge containers.
- **Comment Manager Upgrade (`src/components/CommentManager.tsx`)**:
  - Dedicated "DM & Resource Requests" tab showing pending commenter queries awaiting links.
  - 1-click "Approve & Teach Agent" drawer.
  - Filter by intent: Questions, DM Requests, Appreciation, Feedback.
- **Interactive Multi-Agent Assistant (`src/components/AiAssistantStudio.tsx`)**:
  - ChatGPT/Gemini style conversational interface where creators can chat with their channel agent.
  - Pre-built quick action chips: *"Check pending DM requests"*, *"Analyze latest video feedback"*, *"Teach a new link"*.
  - Provider indicator badge showing which model answered (e.g. *Gemini 3.8 Flash* or *OpenRouter Llama 3.3*).

### Phase 4: Clean-Up & Verification
- Remove old fake thumbnail generator components.
- Run `lint_applet` and `compile_applet`.
- Verify on mobile viewports (375px, 390px, 414px) and desktop (1440px).

---

## 4. Verification Plan

1. **AI Provider Failover**:
   - Send requests through the AI Orchestrator with and without external provider keys to verify clean fallback to Gemini.
2. **Comment Intent & DM Learning Flow**:
   - Test comment: *"Please send me the link to the notes you mentioned in the video"*.
   - Verify that the system flags it as `dm_link_request`, creates a `pending_dm_actions` item, prompts the creator, and upon submission, saves to `learned_links_repository`.
   - Test a second identical request and verify that the agent auto-fulfills it using the newly learned link.
3. **Mobile Responsive & Visual Inspection**:
   - Validate on iPhone viewport dimensions (375px, 390px) to confirm zero text overlap, smooth scrolling, and full touch target accessibility ($\ge 44\text{px}$).
