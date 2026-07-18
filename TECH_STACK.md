# 🏔 Patagonia Browser

# TECH_STACK.md

**Document Version:** 1.0  
**Status:** Official Technical Stack  
**Owner:** Patagonia Labs

---

# Purpose

This document defines the official technology stack of Patagonia Browser.

It explains the technologies used throughout the project, the reasons behind each decision, and the criteria for introducing new dependencies.

Technology choices are considered architectural decisions.

---

# Design Principles

The technology stack must prioritize:

- Long-term maintainability
- Security
- Stability
- Cross-platform compatibility
- Developer experience
- Performance
- Open-source ecosystem
- Large community support

No technology should be adopted solely because it is new or popular.

---

# Technology Overview

| Layer | Technology |
|--------|------------|
| Desktop Runtime | Electron |
| Rendering Engine | Chromium |
| UI Framework | React |
| Language | TypeScript |
| Build Tool | Vite |
| Package Manager | npm |
| Styling | CSS Modules + CSS Variables |
| Local Storage | SQLite |
| State Management | React Context + Custom Services |
| Linting | ESLint |
| Formatting | Prettier |
| Testing | Vitest + Playwright |
| Packaging | electron-builder |
| CI/CD | GitHub Actions |

---

# Electron

## Purpose

Electron provides the desktop runtime.

Responsibilities include:

- Window management
- Native operating system integration
- IPC
- File system access
- Native dialogs
- Auto-updates
- System tray
- Notifications

Electron is used only for desktop functionality.

Business logic remains independent whenever possible.

---

# Chromium

Chromium is responsible for:

- HTML rendering
- CSS rendering
- JavaScript execution
- Browser engine
- Modern web standards

Patagonia Browser relies on Chromium's rendering capabilities while implementing its own user experience.

---

# React

React is used exclusively for the user interface.

Responsibilities:

- Component rendering
- State synchronization
- UI composition
- Internal pages
- Browser controls

React must never communicate directly with Node.js APIs.

All communication passes through secure IPC.

---

# TypeScript

TypeScript is mandatory.

Strict mode is always enabled.

Goals:

- Static typing
- Refactoring safety
- Better tooling
- Fewer runtime errors

The use of `any` should be avoided.

---

# Vite

Vite provides:

- Fast development server
- Efficient builds
- Modern bundling
- Hot Module Replacement

Development speed is one of the reasons for choosing Vite.

---

# SQLite

SQLite stores:

- History
- Bookmarks
- Preferences
- Sessions
- Downloads
- Browser metadata

Reasons:

- Lightweight
- Reliable
- No external server
- Cross-platform
- Excellent TypeScript support

---

# CSS Strategy

Patagonia Browser uses:

- CSS Modules
- CSS Variables
- Design Tokens

Goals:

- Theme support
- Isolation
- Predictability
- Performance

Global CSS should remain minimal.

---

# State Management

Global application state is intentionally simple.

Primary tools:

- React Context
- Custom Services

Additional state libraries should only be introduced if justified by measurable complexity.

---

# Testing Stack

## Unit Tests

Vitest

Used for:

- Utilities
- Services
- Core logic
- Components

---

## End-to-End Tests

Playwright

Used for:

- Navigation
- Tabs
- Downloads
- Browser workflows
- Settings

---

# Linting

ESLint enforces:

- Code quality
- Best practices
- TypeScript rules
- React rules

No production code should bypass linting.

---

# Formatting

Prettier formats the entire codebase.

Formatting decisions are automated.

Manual formatting should be avoided.

---

# Packaging

electron-builder is responsible for:

- Windows installers
- Portable builds
- Release artifacts
- Version metadata

---

# Continuous Integration

GitHub Actions automates:

- Build validation
- Linting
- Testing
- Release workflows

Every Pull Request should pass CI before merging.

---

# Dependency Policy

New dependencies must satisfy all of the following:

- Actively maintained
- Open source
- Compatible license
- Stable releases
- Good documentation
- Security track record
- Strong community adoption

---

# Dependency Evaluation Checklist

Before adding a library, answer:

- Does it solve a real problem?
- Can it be implemented internally with reasonable effort?
- Is the maintenance burden acceptable?
- Is it actively maintained?
- Does it increase bundle size significantly?
- Does it introduce unnecessary security risks?

If any answer raises concern, the dependency should be reconsidered.

---

# Forbidden Practices

Avoid libraries that:

- Are abandoned
- Have unclear licensing
- Require disabling security features
- Duplicate existing functionality
- Introduce unnecessary complexity
- Depend on unstable APIs

---

# Versioning Policy

General rules:

- Prefer stable releases
- Avoid pre-release versions in production
- Update dependencies regularly
- Review changelogs before upgrading
- Test all major upgrades thoroughly

---

# Security Considerations

Technology choices must support:

- Context Isolation
- Secure IPC
- CSP
- Sandboxing
- Principle of Least Privilege

No dependency should weaken the browser's security architecture.

---

# Future Technologies

Potential future additions include:

- Rust modules for performance-critical components
- WebAssembly for isolated workloads
- Native operating system integrations
- AI inference engines
- Plugin SDK

These technologies require architectural review before adoption.

---

# Technologies Not Currently Planned

The following technologies are intentionally excluded from the initial roadmap:

- Angular
- Vue
- Redux
- MobX
- Tailwind CSS
- Tauri
- Flutter
- .NET
- Java

This decision may be revisited if future project requirements change.

---

# Architecture Compatibility

Every technology introduced into Patagonia Browser must be compatible with:

- ARCHITECTURE.md
- ARCHITECTURE_V2.md
- SECURITY_MODEL.md
- CODING_STANDARDS.md
- IMPLEMENTATION_PLAN.md

No implementation may contradict the project's architectural principles.

---

# Final Principle

Technology serves the architecture.

Architecture serves the product.

The product serves the user.

Technology decisions should always follow that order.

---

> "Choose technologies that will still make sense five years from now—not just five weeks."

— Patagonia Labs
