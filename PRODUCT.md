# ZeroBuff

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

iOS and Android have equal product priority, confirmed by the owner on 2026-11-02. This is a native React Native / Expo app, not a mobile website. Preserve platform navigation, keyboard, accessibility, and safe-area expectations on both systems. This is a product requirement, not a claim that platform adaptation is already complete. A web target exists in the repository, but equal priority for web has not been established.

## Users

The primary users already train with their own workout plans. They need to organize those plans, record training, and review results. The app is not positioned primarily as a beginner coaching or guided-program product.

## Product Purpose

Bring programming, workout execution, and analysis into one place. Support the full loop: prepare a routine, assign training days, complete a workout, record performance, and use the history to inform the next session.

Success means users can complete that loop with little friction and can trust that recorded performance has actually been saved.

## Positioning

The owner-confirmed product emphasis is integration of planning, training, and analysis. Do not invent claims of market uniqueness, guaranteed strength gains, coaching effectiveness, or superiority to competing trackers.

## Operating Context

- The core recording task happens during strength training, between sets and exercises. Controls must remain usable in that setting.
- Users can switch exercises freely rather than follow a rigid sequence, for example when equipment is occupied.
- The active workflow includes set logging, a rest timer, comparison with earlier performance, and ending the session.
- Session history and progress analysis belong in Analytics. Planning belongs in routines and the weekly schedule.
- The application requires a network connection. The backend can take time to respond after inactivity; distinguish waiting, failure, and genuinely empty data.

## Capabilities and Constraints

- Main navigation: Today, Routines, Analytics, Profile.
- Shared exercise catalog and custom exercises; routines with exercise order, sets, reps, and rest duration; one routine assignment per weekday.
- Routine editing uses a local draft and a single request with the full saved state. Empty routines are permitted.
- Workout sessions support set logging, editing, exercise switching, recovery timing, and completion. Preserve the card carousel and the ability to add sets.
- Body-weight logging, session history, and exercise/routine statistics are part of the product scope. Existing code and tests determine implementation coverage; this document is not a release certification.
- Online-only: no offline synchronization or persisted mutation queue. Pending writes must not be presented as confirmed saves. Preserve entered values and a recovery action after failure.
- UI copy is in English. Code identifiers and comments are also in English; conversation with the owner is in Italian.
- The established application is the starting point for further work. Preserve its existing design system and behavior unless the owner requests a change; consult mobile/AGENTS.md for implementation and visual constraints.
- The Today start/resume action is intended to float over the content. Reserve enough scroll space to reach the final actions without replacing that overlay with a separate footer.
- On the workout surface, the recovery timer and active set card are the explicit attention priorities. Keep secondary information and adjustments accessible without making the main card crowded.
- Zero added weight is a valid bodyweight exercise input; negative added weight is invalid. The local API contract was updated to support this. Do not assume a deployed backend already includes unshipped changes.
- The existing architecture is React Native / Expo with a Python FastAPI backend, PostgreSQL, and Alembic. Follow repository instructions before changing architecture, dependencies, database schemas, migrations, or production configuration.

## Brand Commitments

The product name is ZeroBuff. Preserve its established name and existing assets. The owner has requested a clear and compact workout interface that emphasizes the timer and set being performed.

## Evidence on Hand

- README.md describes the product and repository architecture.
- AGENTS.md and mobile/AGENTS.md record project rules and established product decisions.
- mobile/src/features/ contains the implemented user flows; backend/app/schemas/ contains the API request/response contracts.
- mobile/assets/images/ contains the existing app icon and launch assets.
- backend/tests/ and mobile/tests/workout.test.cjs provide behavioral checks. Their presence does not imply current execution or passing status.
- Simulator observations and test history are kept outside this repository. Revalidate against the current checkout before relying on them.

## Product Principles

1. Connect planning, execution, and review around the user's own training plan.
2. Keep recording a set quick and understandable during a workout.
3. Make save status truthful and failures recoverable.
4. Let users adapt exercise order to the training situation.
5. Give iOS and Android equal attention when designing and validating workflows.

## Accessibility & Inclusion

- Existing project requirements specify touch targets of at least 48 × 48.
- Do not use color as the only state signal; accompany it with text or an icon.
- Preserve accessible names, checked/selected/expanded states, keyboard reachability, and readable numeric inputs.
- Respect platform text scaling and motion preferences. Large-text, assistive-technology, and Android coverage remain verification obligations, not completed certifications.

## Open Product Decisions

- kg is the existing working unit; a confirmed unit preference or kg/lb switching policy has not been established.
- Priority and adaptation requirements for tablets and web are not yet confirmed.
- Pricing, monetization, and distribution strategy are not established here.
- A proprietary training method or additional differentiating claim has not been supplied.

## UI Review — Problems and Recommended Improvements

Recorded on 2026-11-03. This is a design backlog, not an implementation or test report. Findings came from the current screen/component source and four existing iOS Analytics captures in `.impeccable/review/`. Other surfaces were reviewed in source only; the simulator was unavailable. Revalidate findings before implementation. P1 means major usability work; P2 means a subsequent refinement. Recommendations below are proposals unless explicitly marked as owner-confirmed.

### Owner-confirmed constraint: keep the set card lean

- The owner explicitly wants the set card as lean as possible: adding information and controls can create confusion. This overrides the earlier review's suggestion to enlarge or add a dominant completion action inside the card.
- Preserve the card carousel, free exercise switching, and ability to add sets. Keep weight, reps, and one clear completion control as the card's visual focus. A larger card or an additional CTA is not the default solution.
- Keep optional RIR, previous-performance context, removal, and other adjustments visually secondary. Evaluate placing secondary actions outside the card or behind a clearly discoverable contextual control; preserve their functionality and accessible alternatives.
- Avoid permanent explanatory copy, repeated save summaries, multiple competing buttons, and rows of quick-increment controls inside the card. If quick increments are introduced, evaluate a contextual input accessory rather than expanding the default card.
- Keep saving, unsaved changes, and failures truthful and understandable. Use concise status feedback; expose recovery when needed and preserve entered values. Simplification must not hide a failed save.
- Keep the rest timer prominent outside the card. Clarify the difference between completing a set and changing exercise through hierarchy and labels, without adding competing primary actions.
- Lean means fewer competing elements, not smaller touch targets or less readable numbers. Validate the result with the keyboard open and with large text on both platforms.

### P1 — Reliability feedback and recovery

- **Today:** a failure in any queried section, including body weight, replaces the whole screen with an error. Prefer section-level failures and retries while preserving available content and a safe start/resume path.
- **Profile and Schedule:** initial query failures are not explicitly distinguished from missing data in some paths. Provide a clear failed-load state and retry instead of presenting unavailable information as empty or unset.
- **Mutations:** routine deletion and sex updates lack explicit local error feedback in their screen handlers. Show pending, success, and actionable failure consistently; do not let a closed picker imply a successful save.
- Preserve the active workout's existing distinction between pending and confirmed saves. Apply the same clarity to other surfaces without filling them with persistent status text.

### P1 — Accessible exercise reordering

- Routine reordering relies on long press and drag. Add an accessible alternative such as “Move up” / “Move down”, with position announcements. Retain drag for users who prefer it.
- Check the drag handle's effective touch area and spacing; its visual box is 40 × 40 with hit slop. Validate that neighboring targets do not overlap.

### P2 — Today and workout flow

- Today's routine card uses generic motivational text. Prefer useful planning information already available, such as exercise and planned-set counts, without turning the home into another routine editor.
- Prefer an explicit “Start workout” label to “Start”. After a completed session, show a clear completion state and evaluate a secondary path to start another workout rather than simply losing the CTA.
- During a workout, reduce the prominence of secondary adjustments such as auto-rest settings and removal. Preserve timer and active-set priority, subject to the lean-card constraint above.

### P2 — Routines and exercise selection

- Routine and movement totals occupy space before the actionable routine list. Compact them or remove their prominence; prioritize finding and opening a routine.
- Put a visible “Create routine” action in the empty state instead of relying only on the header plus icon.
- The shared header-button variant has a 40 pt minimum height. Bring its effective target to the project's 48 × 48 requirement, including routine saving.
- Make the outcome of leaving a routine with unsaved changes explicit; verify existing draft preservation before choosing a warning or recovery design.
- “Create exercise” appears ahead of catalog results. Make it secondary during normal selection and more useful after an unsuccessful search.
- Provide “Clear filters” for an empty filtered catalog and “Try again” for catalog load failures.

### P2 — Analytics hierarchy and sparse data

- Captures show substantial space devoted to titles, descriptions, category tabs, period selection, and filters before the useful data. Compact the upper area and distinguish category navigation from filters while preserving adequate targets.
- A single body-weight measurement still occupies a full chart. Prefer a compact measurement summary and explain that a trend needs more data; do not imply an established trend from sparse history.
- Show measurement count and a clear, factual change summary where supported. Keep chart values, dates, units, and selected-point feedback readable.
- Explain “Est. 1RM” and “RIR” on demand rather than through a mandatory tutorial or permanent paragraphs.
- One weight capture shows a partially clipped “Latest” line beneath the fixed header while scrolled. Reproduce before treating it as a layout bug; verify header/content separation and scroll behavior.

### P2 — Profile and authentication

- Make username editing discoverable with an explicit edit affordance rather than relying only on tapping the profile card.
- Use “Not set” for genuinely missing optional information; keep this distinct from a failed load.
- Align “Your account and preferences” with the settings actually offered. Do not add unconfirmed unit or theme preferences solely to match the subtitle.
- The sign-in screen has no visible password-recovery path. Verify the backend contract before implementing one. Evaluate a show/hide password control with an accessible name and state.

### Cross-screen visual consistency and verification

- Preserve the existing palette and Work Sans / Oswald pairing. Differentiate primary actions, selection, and completion through shape, border, icon, and text as well as brightness; adding colors is not required.
- Secondary outline buttons can compete with white primary buttons. Reduce their visual emphasis while keeping contrast and clear pressed/disabled states.
- Validate iOS and Android with large text, long names, small screens, keyboard visibility, screen readers, and gesture/navigation insets. The fixed-height bottom bar needs device validation, not an assumed defect label.
- Verify error-text contrast and non-color state cues. The blue gear visible in saved captures was excluded from the critique because its ownership was not established.
- For implementation work, run the required lint/type checks and relevant behavioral tests, then visually verify affected states on both platforms. No UI behavior or accessibility fix is certified by this review.
