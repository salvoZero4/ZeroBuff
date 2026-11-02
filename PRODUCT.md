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
- Simulator observations and test history are recorded separately in /Users/salvozero4/Projects/ZeroBuff-context/STATO.md. Revalidate against the current checkout before relying on them.

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
