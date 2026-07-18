# 🏔 Patagonia Browser

# TECH_STACK.md

**Document Version:** 1.1  
**Status:** Official Technical Stack  
**Owner:** Patagonia Labs  
**Last Updated:** July 2026

---

## 1. Purpose

This document defines the official technology stack of Patagonia Browser.

It explains:

- Which technologies are approved
- Why each technology was selected
- How each technology fits the architecture
- Which responsibilities belong to each layer
- How dependencies are evaluated
- Which practices are forbidden
- Which technologies may be considered in the future

Technology choices are architectural decisions.

No new framework, runtime, database, validation library, build tool or infrastructure dependency may be introduced without technical review.

---

## 2. Design Principles

The technology stack must prioritize:

- Long-term maintainability
- Security
- Stability
- Cross-platform compatibility
- Developer experience
- Performance
- Open-source availability
- Strong documentation
- Large community support
- Predictable upgrade paths

No technology should be adopted solely because it is new, popular or fashionable.

The stack must remain as small as practical.

---

## 3. Technology Overview

| Layer | Technology |
|---|---|
| Desktop Runtime | Electron |
| Rendering Engine | Chromium |
| UI Framework | React |
| Language | TypeScript |
| Build Tool | Vite |
| Package Manager | npm |
| Styling | CSS Modules + CSS Variables |
| Local Storage | SQLite |
| State Management | React Context + Custom Services |
| Runtime Validation | Zod |
| Linting | ESLint |
| Formatting | Prettier |
| Unit Testing | Vitest |
| End-to-End Testing | Playwright |
| Packaging | electron-builder |
| CI/CD | GitHub Actions |

---

## 4. Electron

### Purpose

Electron provides the desktop application runtime.

It is responsible for:

- Window management
- Native operating system integration
- IPC
- File system access
- Native dialogs
- Application lifecycle
- Menus
- Notifications
- Auto-updates
- Download integration
- Permission handling
- Session management

Electron must be used only where desktop-level capabilities are required.

Business logic should remain independent from Electron whenever practical.

### Security Requirements

Electron must be configured with secure defaults.

Required principles include:

- Context isolation enabled
- Node integration disabled in Renderer processes
- Sandboxing enabled where supported
- Narrow preload APIs
- No raw IPC exposure
- No arbitrary shell execution
- No direct Node.js access from React
- Explicit navigation controls
- Sender validation for privileged IPC calls

Electron configuration must remain consistent with:

- `SECURITY_MODEL.md`
- `API_DESIGN.md`
- `ARCHITECTURE_V2.md`

---

## 5. Chromium

Chromium provides the web rendering engine.

It is responsible for:

- HTML rendering
- CSS rendering
- JavaScript execution
- Web platform support
- Browser engine behavior
- Network requests
- Page lifecycle
- Web security primitives
- Site isolation capabilities

Patagonia Browser relies on Chromium's rendering capabilities while implementing its own:

- User interface
- Navigation model
- Tabs
- Privacy controls
- Permissions interface
- Settings
- Sessions
- Spaces
- Security policies

Chromium must not be treated as the product interface.

The Patagonia Browser UI remains separate from normal web content.

---

## 6. React

React is used exclusively for the trusted application interface.

Responsibilities include:

- Rendering browser controls
- Rendering tab interfaces
- Rendering internal pages
- UI composition
- State synchronization
- User interaction
- Accessibility behavior
- Theme integration

React must never communicate directly with:

- Node.js APIs
- Electron internals
- SQLite
- File system APIs
- Environment variables
- Native shell APIs
- Secrets

All privileged communication must pass through the approved preload API and secure IPC contracts defined in `API_DESIGN.md`.

---

## 7. TypeScript

TypeScript is mandatory for application code.

Strict mode must remain enabled.

Goals:

- Static typing
- Refactoring safety
- Better editor tooling
- Explicit contracts
- Reduced runtime defects
- Safer API evolution
- Improved testability

### Rules

- Avoid `any`
- Prefer `unknown` when a value is not yet validated
- Define explicit request and response types
- Define explicit event contracts
- Use discriminated unions for state and errors
- Separate domain types from Renderer-safe DTOs
- Do not duplicate shared API contracts

TypeScript provides compile-time safety.

It does not replace runtime validation.

---

## 8. Vite

Vite is the official build tool for the Renderer and supporting front-end assets.

It provides:

- Fast development startup
- Hot Module Replacement
- Modern bundling
- TypeScript support
- Efficient development builds
- Optimized production builds
- Simple React integration

Vite configuration must remain predictable and minimal.

Build customizations must be documented when they affect:

- Security
- Asset loading
- Preload scripts
- Worker behavior
- Internal browser pages
- Production packaging

---

## 9. npm

npm is the official package manager.

Reasons:

- Included with Node.js
- Broad ecosystem support
- Stable lockfile behavior
- Native compatibility with Electron tooling
- Familiar contributor workflow
- Strong CI support

Requirements:

- Commit `package-lock.json`
- Use reproducible installation commands in CI
- Review dependency changes
- Avoid unnecessary package manager migration
- Do not mix multiple lockfiles

Recommended CI installation:

```bash
npm ci
```

---

## 10. CSS Strategy

Patagonia Browser uses:

- CSS Modules
- CSS Variables
- Design Tokens

Goals:

- Style isolation
- Theme support
- Predictable component styling
- Minimal global CSS
- Reusable visual tokens
- Good performance
- Reduced naming collisions

### Rules

- Global CSS must remain minimal
- Colors, spacing, typography and elevation should use design tokens
- Components should not hardcode duplicated visual values
- Theme behavior must follow `DESIGN_SYSTEM.md`
- UI implementation must follow `UI_GUIDE.md`
- Accessibility states must remain visible

Tailwind CSS is not currently part of the approved stack.

---

## 11. SQLite

SQLite is the official local database.

It stores data such as:

- History
- Bookmarks
- Preferences
- Sessions
- Downloads
- Browser metadata
- Spaces
- Permission decisions
- Migration state

Reasons:

- Lightweight
- Reliable
- No external database server
- Cross-platform
- Transaction support
- Mature ecosystem
- Good local application fit
- Strong Node.js and TypeScript support

### Access Rules

- Renderer processes must never access SQLite directly
- Database operations must pass through storage services
- SQL must not cross IPC boundaries
- Migrations must be versioned
- Sensitive values must be protected according to `SECURITY_MODEL.md`
- Private browsing data must not be written to normal persistent history

A dedicated `DATABASE_SCHEMA.md` should define tables, indexes, relationships and migrations.

---

## 12. State Management

The initial state management strategy is intentionally simple.

Primary tools:

- React Context
- Custom hooks
- Application services
- Typed event subscriptions
- Local component state

Additional state libraries may only be introduced when justified by measurable complexity.

A new state library must not be added merely to avoid designing clear data ownership.

### State Ownership

- UI presentation state belongs in the Renderer
- Privileged browser state belongs in the Main Process
- Persistent state belongs in storage services
- Shared contracts belong in `src/shared`
- Browser domain logic belongs in services or core modules

The Renderer must not be treated as the authoritative source for privileged browser state.

---

## 13. Runtime Validation

Zod is the official runtime validation library.

Zod is used to validate data crossing trust boundaries.

This includes:

- IPC requests
- IPC responses where appropriate
- Configuration files
- Imported data
- External service responses
- AI provider responses
- Extension manifests
- Update metadata
- User-controlled structured input
- Data read from storage after migrations

TypeScript provides compile-time safety.

Zod provides runtime safety.

### Validation Rules

- Validate all IPC payloads in the trusted process
- Reject unknown or unsupported values where practical
- Enforce input length limits
- Validate identifiers
- Validate URLs and protocols
- Validate enum-like values
- Validate imported files before persistence
- Never trust external JSON
- Never rely only on TypeScript types

### Example

```ts
import { z } from "zod";

export const NavigateRequestSchema = z
  .object({
    tabId: z.string().min(1),
    input: z.string().min(1).max(8192),
    disposition: z
      .enum(["current-tab", "new-tab"])
      .optional(),
  })
  .strict();

export type NavigateRequest = z.infer<
  typeof NavigateRequestSchema
>;
```

Shared schemas should be placed near their shared contracts.

Validation errors must be mapped to safe API errors.

Raw Zod errors must not be exposed directly to untrusted web content.

---

## 14. ESLint

ESLint enforces code quality and project conventions.

It should cover:

- TypeScript rules
- React rules
- Hooks rules
- Import organization
- Unsafe type usage
- Promise handling
- Unused code
- Security-related restrictions where practical

No production code should bypass linting without documented justification.

Disabling an ESLint rule locally requires an explanatory comment when the reason is not obvious.

---

## 15. Prettier

Prettier is the official formatter.

Responsibilities:

- Consistent formatting
- Reduced style debates
- Predictable diffs
- Automated code layout

Formatting decisions should be automated.

Manual alignment and formatting should be avoided when Prettier will rewrite it.

Prettier should run in:

- Local development
- Pre-commit workflows where practical
- CI validation

---

## 16. Vitest

Vitest is the official unit and integration test runner for TypeScript modules.

Used for:

- Utilities
- Services
- Domain logic
- Validation schemas
- API contracts
- Mappers
- React components
- Hooks
- Storage abstractions
- Security helpers

Tests should be fast, deterministic and isolated.

Vitest is not a substitute for Electron or browser end-to-end testing.

---

## 17. Playwright

Playwright is the official end-to-end testing framework.

Used for:

- Browser startup
- Navigation
- Tabs
- Window behavior
- Downloads
- Settings
- History
- Internal pages
- Browser workflows
- Regression testing
- Security boundary verification where practical

Important flows should be tested across supported platforms when CI capacity allows.

End-to-end tests must not rely on unstable public websites when a local test fixture can be used.

---

## 18. electron-builder

`electron-builder` is the official packaging tool.

Responsibilities include:

- Windows installers
- Portable builds
- Linux packages
- macOS packages when supported
- Release artifacts
- Application metadata
- Code-signing integration
- Update metadata where applicable

Packaging configuration must not weaken Electron security settings.

Release artifacts must be reproducible where practical.

---

## 19. GitHub Actions

GitHub Actions is the official CI/CD platform.

It automates:

- Dependency installation
- Type checking
- Linting
- Formatting validation
- Unit tests
- Integration tests
- End-to-end tests
- Build validation
- Packaging checks
- Release workflows
- Security scanning where configured

Every Pull Request should pass required CI checks before merge.

Secrets must use protected GitHub Actions secrets and must not be printed in logs.

---

## 20. Dependency Policy

New dependencies must satisfy all relevant criteria:

- Solve a real project need
- Be actively maintained
- Use a compatible license
- Have stable releases
- Have adequate documentation
- Have a reasonable security history
- Support the project platforms
- Avoid unnecessary bundle growth
- Avoid duplicating existing functionality
- Have an acceptable maintenance burden

The smallest suitable dependency should be preferred.

Native dependencies require additional review because they may affect:

- Cross-platform builds
- Electron compatibility
- Packaging
- Security
- Installation complexity

---

## 21. Dependency Evaluation Checklist

Before adding a dependency, answer:

1. Does it solve a real and current problem?
2. Can existing approved tools already solve it?
3. Can it be implemented internally with reasonable effort?
4. Is the project actively maintained?
5. Is the license compatible?
6. Is the package widely trusted?
7. Does it have unresolved critical vulnerabilities?
8. Does it significantly increase bundle size?
9. Does it add native build requirements?
10. Does it weaken security boundaries?
11. Is its API stable?
12. Is removal or replacement realistic later?

If the answers raise meaningful concern, the dependency should be reconsidered.

---

## 22. Forbidden Practices

Avoid libraries or tools that:

- Are abandoned
- Have unclear licensing
- Require disabling security features
- Duplicate approved functionality
- Introduce unnecessary complexity
- Depend on unstable APIs
- Expose raw native capabilities to the Renderer
- Require unrestricted shell execution
- Hide important behavior behind opaque magic
- Make reproducible builds difficult
- Collect telemetry without explicit project approval

Forbidden implementation patterns include:

- Direct Node.js access from React
- Raw `ipcRenderer` exposure
- Arbitrary IPC channel invocation
- Arbitrary file path APIs
- Raw SQL from the Renderer
- Unvalidated external JSON
- Secrets returned to the Renderer
- Synchronous IPC for normal application features

---

## 23. Versioning Policy

General rules:

- Prefer stable releases
- Avoid pre-release dependencies in production
- Review changelogs before upgrades
- Test major upgrades thoroughly
- Update security-sensitive dependencies promptly
- Keep Electron and Chromium security updates current
- Avoid uncontrolled automatic major upgrades
- Document breaking stack changes

Dependency update Pull Requests should include:

- Reason for the update
- Important breaking changes
- Security impact
- Test results
- Migration notes when needed

---

## 24. Security Considerations

Every technology must support:

- Context isolation
- Sandboxing
- Secure IPC
- Content Security Policy
- Principle of Least Privilege
- Runtime input validation
- Safe secret handling
- Process separation
- Controlled navigation
- Controlled file access
- Secure update workflows

No dependency may weaken the browser's security architecture.

Security requirements take priority over developer convenience.

---

## 25. Performance Considerations

Technology decisions must account for:

- Startup time
- Memory usage
- CPU usage
- Renderer responsiveness
- Database performance
- IPC frequency
- Serialization cost
- Build size
- Package size
- Background activity

Avoid:

- Large dependency trees
- Unnecessary background processes
- Frequent full-state IPC transfers
- Blocking synchronous operations
- Unbounded database queries
- Large client-side state duplication

Performance problems should be measured before introducing complex optimization tools.

---

## 26. Accessibility Compatibility

The stack must support:

- Keyboard navigation
- Screen readers
- Semantic HTML
- Visible focus states
- Reduced motion
- Scalable text
- High contrast
- Accessible dialogs
- Accessible internal pages

React components must use native platform semantics whenever possible.

Accessibility must not depend on a future rewrite.

---

## 27. Cross-Platform Requirements

The stack should support:

- Windows
- Linux
- macOS when project capacity allows

Platform-specific code must be isolated behind adapters.

Avoid spreading operating system checks throughout business logic.

Example:

```text
Application Service
        ↓
Platform Adapter
        ↓
Windows / Linux / macOS Implementation
```

---

## 28. Future Technologies

Potential future additions include:

- Rust modules for performance-critical components
- WebAssembly for isolated workloads
- Native operating system integrations
- Local AI inference engines
- Remote AI provider adapters
- Plugin SDK
- Extension sandbox infrastructure
- Crash reporting infrastructure
- Automated update services

These technologies require architectural and security review before adoption.

They are not part of Alpha 0.1 unless explicitly approved.

---

## 29. Technologies Not Currently Planned

The following technologies are not currently planned for the initial architecture:

- Angular
- Vue
- Redux
- MobX
- Tailwind CSS
- Tauri
- Flutter
- .NET
- Java
- Multiple package managers
- Alternative desktop runtimes

This is not a permanent ban.

A technology may be reconsidered if future requirements provide a strong, documented justification.

---

## 30. Alpha 0.1 Stack

The Alpha 0.1 implementation should initially require:

- Electron
- Chromium
- React
- TypeScript
- Vite
- npm
- CSS Modules
- CSS Variables
- Zod
- ESLint
- Prettier
- Vitest
- Playwright
- electron-builder
- GitHub Actions

SQLite may be introduced when persistent features begin requiring it.

The initial browser shell should not add future-facing dependencies for:

- AI
- Extensions
- Cloud synchronization
- Telemetry
- Plugin systems
- Complex state management

---

## 31. Architecture Compatibility

Every technology introduced into Patagonia Browser must be compatible with:

- `ARCHITECTURE.md`
- `ARCHITECTURE_V2.md`
- `API_DESIGN.md`
- `SECURITY_MODEL.md`
- `CODING_STANDARDS.md`
- `IMPLEMENTATION_PLAN.md`
- `REPOSITORY_STRUCTURE.md`
- `DESIGN_SYSTEM.md`

No implementation may contradict the project's approved architectural principles.

When documents conflict, the conflict must be resolved through an explicit architectural decision.

---

## 32. Technology Decision Records

Major technology decisions should be recorded as Architecture Decision Records.

Examples:

```text
ADR-001-WEB-CONTENT-CONTAINER.md
ADR-002-RUNTIME-VALIDATION-ZOD.md
ADR-003-SQLITE-DRIVER.md
ADR-004-ELECTRON-PACKAGING.md
```

An ADR should include:

- Context
- Decision
- Alternatives considered
- Security impact
- Consequences
- Migration implications
- Decision status

---

## 33. Review Checklist

Before approving a technology change:

- Does it solve a documented requirement?
- Is it compatible with the architecture?
- Is it compatible with the security model?
- Is it actively maintained?
- Is its license acceptable?
- Does it work across target platforms?
- Does it add native build complexity?
- Does it increase startup or memory cost?
- Does it duplicate an approved tool?
- Can it be tested reliably?
- Can it be removed later?
- Has the decision been documented?

---

## 34. Final Principle

Technology serves the architecture.

Architecture serves the product.

The product serves the user.

Technology decisions should always follow that order.

---

> “Choose technologies that will still make sense five years from now—not just five weeks.”
>
> — Patagonia Labs
