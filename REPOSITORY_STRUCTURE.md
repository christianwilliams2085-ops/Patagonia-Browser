# 🏔 Patagonia Browser

# REPOSITORY_STRUCTURE.md

**Document Version:** 1.0  
**Status:** Official Repository Layout  
**Applies To:** All Contributors

---

# Purpose

This document defines the official directory structure of Patagonia Browser.

Every source file, asset, test, configuration file and document must follow this structure.

The objective is to maintain a clean, scalable and maintainable repository throughout the lifetime of the project.

---

# Repository Overview

```
Patagonia-Browser/

├── docs/
├── src/
├── assets/
├── tests/
├── scripts/
├── build/
├── releases/
├── .github/

├── package.json
├── tsconfig.json
├── electron-builder.yml
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
├── LICENSE
├── README.md
└── CHANGELOG.md
```

---

# Root Directory

The root contains only project-level files.

Allowed:

- README
- LICENSE
- CHANGELOG
- package.json
- build configuration
- CI configuration

No application source code should exist here.

---

# docs/

Project documentation.

```
docs/

architecture/
design/
development/
product/
security/
reference/
adr/
```

## architecture/

Contains:

- ARCHITECTURE.md
- ARCHITECTURE_V2.md
- BLUEPRINT.md

---

## design/

Contains:

- DESIGN_SYSTEM.md
- UI_GUIDE.md
- UI_COMPONENTS.md

---

## product/

Contains:

- FEATURES.md
- FEATURES_SPECIFICATION.md
- PRODUCT_PRINCIPLES.md
- USER_FLOWS.md
- VISION.md
- ROADMAP.md
- PROJECT_STATUS.md

---

## security/

Contains:

- SECURITY_MODEL.md

Future:

- SECURITY_AUDITS.md
- SECURITY_REPORTS.md

---

## development/

Contains:

- DEVELOPMENT_GUIDE.md
- IMPLEMENTATION_PLAN.md
- CONTRIBUTING.md

---

## adr/

Architecture Decision Records.

Example:

ADR-001.md

ADR-002.md

ADR-003.md

---

# src/

Application source code.

```
src/

main/
renderer/
shared/
modules/
services/
security/
storage/
core/
types/
utils/
config/
```

---

# src/main/

Electron Main Process.

Responsibilities:

- Window Management
- IPC
- Native APIs
- Updates
- Menus
- File System
- Process Management

No React code.

---

# src/renderer/

React application.

Contains:

```
app/
pages/
components/
hooks/
layouts/
styles/
```

Renderer never accesses Node APIs directly.

---

# src/shared/

Shared code.

Examples:

- Types
- Interfaces
- Constants
- DTOs
- Events

No UI.

---

# src/modules/

Large browser features.

Example:

```
tabs/
history/
bookmarks/
downloads/
settings/
spaces/
extensions/
ai/
```

Every module is isolated.

---

# src/services/

Reusable services.

Examples:

- NavigationService
- DownloadService
- PermissionService
- UpdateService
- SearchService

Services contain business logic.

---

# src/security/

Security layer.

Contains:

- CSP
- Permission validation
- IPC validation
- URL validation
- Safe Browsing
- Certificate handling

---

# src/storage/

Persistent data.

Examples:

- SQLite
- Preferences
- Sessions
- Cache
- Cookies

---

# src/core/

Core browser engine.

Contains:

- Browser Controller
- Tab Manager
- Window Manager
- Event Bus

Core should remain framework-independent whenever possible.

---

# src/types/

Global TypeScript types.

---

# src/utils/

Small helper utilities.

No business logic.

---

# src/config/

Application configuration.

Examples:

- Feature Flags
- Environment
- Constants

---

# assets/

Static resources.

```
icons/
images/
fonts/
themes/
branding/
```

---

# tests/

Testing.

```
unit/
integration/
e2e/
performance/
security/
fixtures/
```

---

# scripts/

Automation.

Examples:

- Build
- Packaging
- Release
- Versioning
- Code generation

---

# build/

Generated artifacts.

Never edited manually.

---

# releases/

Release packages.

Examples:

- Alpha
- Beta
- Stable

---

# .github/

GitHub configuration.

```
workflows/
ISSUE_TEMPLATE/
PULL_REQUEST_TEMPLATE.md
CODEOWNERS
```

---

# Naming Conventions

Directories

lowercase

Examples:

tabs

history

downloads

Files

PascalCase

Example:

TabManager.ts

DownloadService.ts

HistoryPage.tsx

Interfaces

Prefix:

I

Example:

ITab

IWindow

Enums

Suffix:

Enum

Example:

PermissionEnum

Events

Suffix:

Event

Example:

NavigationEvent

---

# Import Rules

Allowed:

Shared → Modules

Modules → Services

Renderer → Shared

Renderer → Modules

Forbidden:

Renderer → Main

Modules → UI

Services → React Components

Security → UI

---

# Dependency Direction

```
UI

↓

Modules

↓

Services

↓

Core

↓

Storage

↓

Platform
```

Dependencies must always point downward.

Circular dependencies are forbidden.

---

# Repository Growth Policy

New directories must only be added when:

- Multiple files justify separation.
- The structure remains consistent.
- Architectural boundaries are preserved.

---

# Future Expansion

Reserved directories:

```
plugins/

sdk/

devtools/

telemetry/

analytics/

experiments/
```

These folders should remain empty until officially introduced.

---

# Repository Principles

- Small files
- Clear responsibilities
- No duplicated logic
- Strong module isolation
- Explicit dependencies
- Predictable layout
- Easy onboarding for contributors

---

# Final Principle

The repository structure is part of the architecture.

Changing it requires architectural review.

---

> "A clean repository is the foundation of maintainable software."

— Patagonia Labs
