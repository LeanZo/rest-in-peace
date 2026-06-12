---
name: code-structure
description: This skill defines how to plan and implement a modern, maintainable, high-performance application with a clean separation between front end and back end, strong code organization, and a long-term maintainable architecture. The main focus is JS/TS web development but is flexible for other languages.
license: MIT
metadata:
  author: LeanZo
  version: "1.0"
---

# Code Structure — Well-Structured App Project Guidance

## Purpose

This skill defines how to plan and implement a modern, maintainable, high-performance application with a clean separation between front end and back end, strong code organization, and a long-term maintainable architecture. The main focus is JS/TS web development but is flexible for other languages.

The agent should treat this as a project discipline guide, not just a stack preference list.

---

## Core Principles

- Prefer simplicity, clarity, and long-term maintainability over cleverness.
- Build with a strong structure from the beginning, but avoid unnecessary abstraction.
- Keep the codebase fast, predictable, testable, and easy to extend.
- Use modern patterns and declarative code where appropriate.
- Minimize hidden coupling, duplicated logic, and technical debt.
- Optimize for readability first, then performance, then convenience.

---

## Technology Selection Rules

### Language and Runtime
- Use **TypeScript** by default for JavaScript-based projects.
- If the user specifies another language, follow the user’s choice.
- Use the **latest stable version** of the chosen language and runtime at implementation time.
- For JavaScript/TypeScript projects, use **Node.js latest stable version**.

### Front End
- Default to **React + Vite** for front-end-only or SPA projects.
- Use the **latest stable versions** of the selected front-end stack.
- Follow the user’s preferred front-end framework if explicitly stated.

### Back End
- Default to **NestJS** for back-end services.
- Use the **latest stable versions** of the selected back-end stack.
- Follow the user’s preferred server framework if explicitly stated.

### Full Stack Alternatives
- For full-stack projects, prefer:
  - **React + Vite** for the front end
  - **NestJS** for the back end
- For smaller projects, a simpler **React + Vite + Express** setup may be acceptable.
- Use **Next.js** only when it is a better fit for the product requirements, such as when a unified full-stack framework is clearly beneficial.
- Prefer the stack that is best for long-term maintainability, scalability, and clean separation of concerns.

### Version Policy
- Before implementation, verify online and use the **latest stable versions** of major tools, frameworks, and libraries.
- Prefer official documentation and trusted sources when checking current stable versions.

---

## Architecture Requirements

### Separation of Concerns
- Maintain a **clear boundary between front-end and back-end code**.
- Keep UI logic, server logic, and data access logic separated.
- Shared code is allowed only for:
  - types
  - schemas
  - constants
  - utility functions that are truly framework-agnostic

### Shared Code Rules
- Shared code must not contain business logic tied to only one side.
- Do not place framework-specific code in shared packages.
- Shared types should be used to reduce duplication, not to blur architecture boundaries.

### Code Organization
- Keep files and modules focused and purposeful.
- Prefer small, contained functions and components.
- Avoid excessively deep folder nesting, but maintain enough structure to stay readable.
- Avoid chains of tiny indirections that force constant file jumping.
- Use a layout that makes it easy to find:
  - features
  - components
  - services
  - types
  - tests
  - database logic

---

## Quality Standards

### Performance
- The application should be optimized and fast.
- Avoid wasteful re-renders, unnecessary queries, and inefficient data flows.
- Use efficient patterns for state, rendering, and server interactions.
- Measure before optimizing, but do not ignore obvious inefficiencies.

### Dependencies
- Avoid excessive small dependencies.
- Prefer a small set of meaningful, well-maintained dependencies.
- For trivial functionality, implement the solution directly when that is simpler, safer, and more maintainable.
- Add a dependency only when it clearly improves maintainability, reliability, or developer velocity.

### Declarative Style
- Prefer declarative programming patterns where practical.
- Use imperative code only when it improves clarity or is necessary for control or performance.
- Keep business rules explicit and easy to audit.

### Clean Code
- Avoid magic numbers, magic strings, and unexplained constants.
- Extract meaningful constants when values are repeated or semantically important.
- Use descriptive names for variables, functions, modules, and types.
- Keep method and component responsibilities narrow.

---

## Testing Requirements

- Write **unit tests** for both front end and back end.
- Prioritize testing:
  - business logic
  - utility functions
  - service layers
  - critical UI behavior
  - validation and transformation logic
- Keep tests readable, deterministic, and focused on behavior.
- Do not rely on brittle implementation-detail tests unless absolutely necessary.
- Add tests alongside the code they validate whenever practical.

---

## Database and Persistence

### Database Default
- Use **PostgreSQL** by default unless the user specifies another database.

### ORM Requirement
- Use a proper ORM for database access.
- Prefer a well-supported ORM such as **Prisma** or **TypeORM** for JavaScript/TypeScript projects.
- Do not scatter raw SQL throughout the codebase.
- Avoid ad hoc seeds and one-off database scripts as the primary structure for persistence.

### Data Access Rules
- Centralize database access in dedicated modules or services.
- Keep schema, migrations, and repositories organized and consistent.
- Isolate data access from UI and controller logic.

---

## Implementation Workflow

When starting a project or feature, the agent should:

1. Confirm the user’s requirements and platform constraints.
2. Select the most appropriate architecture based on project size and long-term maintainability.
3. Verify the latest stable versions of required tools and libraries.
4. Establish a clean folder structure before adding feature code.
5. Implement core domain logic first.
6. Add tests for critical behavior.
7. Ensure front end and back end remain clearly separated.
8. Review for performance, maintainability, and unnecessary complexity.

---

## Default Stack Recommendation

Unless the user states otherwise, use:

- **TypeScript**
- **Node.js**
- **React + Vite** for the front end
- **NestJS** for the back end
- **PostgreSQL**
- **Prisma or TypeORM**
- **Unit tests** on both sides

This stack is the preferred long-term default because it balances structure, scalability, and maintainability.

---

## Non-Negotiables

- Do not lock the project to outdated versions.
- Do not blur the boundary between front end and back end.
- Do not omit tests for important logic.
- Do not overuse dependencies.
- Do not leave magic values unexplained.
- Do not introduce architecture that is harder to maintain than the problem requires.

---

## Goal

The final codebase should feel like a professional product foundation:
clean, modular, testable, fast, and easy to evolve over time.
