# 🏔 Patagonia Browser

# API_DESIGN.md

**Document Version:** 1.1

**Status:** Official Internal API Specification

**Owner:** Patagonia Labs

**Applies To:** All Browser Components

**Current Target:** Alpha 0.1

**Last Updated:** July 2026

---

# Table of Contents

1. Purpose
2. Scope
3. Design Philosophy
4. Architectural Principles
5. Security Principles
6. Architecture Overview
7. Layer Responsibilities
8. Trust Boundaries
9. IPC Design
10. Public API
11. Namespace Design
12. API Contracts
13. DTOs
14. Validation
15. Security
16. Versioning
17. Examples
18. Appendices

---

# 1. Purpose

This document defines the official internal API architecture of Patagonia Browser.

It specifies:

* How browser components communicate.
* How IPC is exposed.
* How privileged operations are protected.
* Which contracts are stable.
* How APIs evolve.
* Which responsibilities belong to each layer.
* Which security guarantees must always remain true.

This specification is considered part of the browser security model.

Any modification requires architectural review.

---

# 2. Scope

This document applies to every internal API exposed by Patagonia Browser.

Including:

* Renderer APIs
* Preload APIs
* IPC Contracts
* Main Process Services
* Browser Modules
* Native Integrations
* Internal Pages
* Settings
* Downloads
* History
* Bookmarks
* AI Providers
* Extensions
* Future SDKs

External web pages are explicitly outside this scope.

---

# 3. Design Philosophy

The API is designed around one fundamental idea:

> Capabilities are exposed.
>
> Infrastructure is hidden.

Application code should never need to understand:

* Electron
* IPC channels
* Native APIs
* SQLite
* File System
* Process Management

Instead, it interacts with high-level browser capabilities.

Example:

Bad:

```ts
ipcRenderer.invoke("tabs:create")
```

Good:

```ts
window.patagonia.tabs.create(...)
```

The API should read like browser functionality instead of operating system functionality.

---

# 4. Primary Goals

The internal API exists to provide:

* Safety
* Simplicity
* Stability
* Predictability
* Versionability
* Testability
* Security
* Maintainability

Every exposed method must justify its existence.

If a capability can remain internal, it should remain internal.

---

# 5. Architectural Principles

The following principles govern every API.

## Explicit

No hidden behavior.

Every action is represented by a documented method.

---

## Small Surface

Expose the smallest possible API.

Large APIs become impossible to secure.

---

## Strong Contracts

Every request and response has an explicit TypeScript contract.

Implicit objects are forbidden.

---

## Runtime Validation

Compile-time validation is insufficient.

Every trust boundary performs runtime validation using Zod.

---

## Stable Evolution

Minor releases should not break existing integrations.

Breaking changes require version evolution.

---

## Secure by Default

Unsafe operations require deliberate opt-in.

Security is never optional.

---

# 6. Security Principles

The API is one of the primary security boundaries of Patagonia Browser.

The following guarantees are mandatory.

## Renderer Isolation

Renderer processes never receive Node.js access.

---

## Capability Isolation

Only approved capabilities are exposed.

Everything else remains private.

---

## Sender Validation

Every privileged IPC call validates the sender.

---

## Runtime Validation

All incoming data is validated.

---

## DTO Isolation

Internal objects never cross process boundaries.

Only DTOs travel through IPC.

---

## Secret Isolation

Secrets never leave the Main Process.

---

## Raw IPC Isolation

Raw Electron IPC objects are never visible to React code.

---

# 7. Architecture Overview

Patagonia Browser follows a layered architecture.

```text
React UI
    │
    ▼
window.patagonia
    │
    ▼
Preload Bridge
    │
    ▼
Runtime Validation
    │
    ▼
Secure IPC
    │
    ▼
Sender Validation
    │
    ▼
Application Services
    │
    ▼
Core
    │
    ▼
Storage / Native APIs
```

Each layer has exactly one responsibility.

---

# 8. Layer Responsibilities

## Renderer

Responsible for:

* User Interface
* Interaction
* Rendering
* Local UI State

Forbidden:

* Node.js
* File System
* SQLite
* Native APIs
* Electron Internals

---

## Preload

Responsible for:

* Safe bridge
* API exposure
* DTO conversion
* IPC abstraction

Preload contains no business logic.

---

## Main Process

Responsible for:

* Privileged execution
* Window management
* Downloads
* Updates
* File system
* Native dialogs
* Permissions

---

## Services

Responsible for business rules.

Examples:

NavigationService

HistoryService

DownloadService

BookmarkService

PermissionService

No Electron-specific code should leak beyond this layer.

---

## Core

Responsible for browser orchestration.

Examples:

Tab Manager

Window Manager

Session Manager

Browser Controller

---

## Storage

Responsible only for persistence.

Examples:

SQLite

Cache

Cookies

Preferences

No UI logic belongs here.

---

# 9. Trust Boundaries

Trust decreases as data approaches the user.

```text
Main Process

↓

Preload

↓

Renderer

↓

Website
```

Every transition requires validation.

---

# 10. IPC Philosophy

IPC is an implementation detail.

Applications should never depend directly on IPC channels.

Instead of:

ipcRenderer.invoke(...)

Applications use:

window.patagonia.*

This allows:

* Channel renaming
* Internal refactoring
* Improved security
* Better testing
* Stable contracts

---

# 11. IPC Rules

IPC handlers:

* Validate sender
* Validate payload
* Call services
* Return DTOs

Nothing else.

Business logic belongs inside services.

---

# 12. Public API Surface

The official public interface is:

```ts
window.patagonia
```

Everything available to the Renderer begins here.

No other global object is permitted.

---

# 13. Global Object

```ts
interface Window {
    patagonia: PatagoniaAPI;
}
```

This object is injected exclusively by the preload script.

Web content must never access it.

---

# 14. Namespace Philosophy

Capabilities are grouped by domain.

Examples:

app

windows

tabs

navigation

history

bookmarks

downloads

settings

permissions

sessions

Each namespace owns a single responsibility.

---

# 15. Namespace Rules

Namespaces should:

* Be cohesive
* Be discoverable
* Remain small
* Avoid overlapping responsibilities
* Hide infrastructure

Example:

Good

tabs.create()

tabs.close()

tabs.activate()

Bad

browser.createNewTab()

system.openBrowserTab()

window.createNavigationTab()

---

# 16. Initial Namespaces

Alpha 0.1 exposes:

app

windows

tabs

navigation

Later releases introduce:

history

downloads

settings

bookmarks

permissions

sessions

extensions

ai

spaces

---

# 17. API Naming

Methods always use verbs.

Examples:

create()

update()

remove()

close()

reload()

activate()

navigate()

search()

clear()

Never expose implementation names.

Example:

Bad

invokeChannel()

sendIPC()

executeElectron()

Good

tabs.create()

downloads.pause()

settings.update()

---

# 18. Final Principle

The API represents the browser itself.

It must never expose how the browser is implemented.

Changing Electron, SQLite or internal services should never require changing the public API.

This separation is one of the most important long-term architectural goals of Patagonia Browser.


# 19. Detailed Process Architecture

Patagonia Browser uses a multi-process architecture based on strict privilege separation.

Each process owns a well-defined responsibility and communicates only through validated IPC contracts.

```text
Website
   │
   ▼
Renderer
   │
window.patagonia
   │
Preload
   │
Secure IPC
   │
Main Process
   │
Application Services
   │
Infrastructure
```

Each transition crosses a trust boundary and requires validation.

---

# 20. Renderer Process

The Renderer is considered an untrusted execution environment.

Responsibilities:

* Render the user interface.
* Handle user interaction.
* Manage local UI state.
* Consume the public API.

The Renderer must never access Node.js, Electron internals, the filesystem, databases or operating system resources directly.

---

# 21. Preload Process

The preload layer exposes the public API through `contextBridge`.

Responsibilities:

* Publish `window.patagonia`.
* Marshal requests and responses.
* Perform lightweight validation.
* Hide IPC implementation details.

Business rules are forbidden in this layer.

---

# 22. Main Process

The Main Process is the browser's trusted execution environment.

Responsibilities:

* Execute privileged operations.
* Manage windows and tabs.
* Coordinate services.
* Access native operating system APIs.
* Enforce security policies.

---

# 23. Application Services

Application Services implement business rules independently from Electron.

Examples include:

* NavigationService
* TabsService
* DownloadService
* HistoryService
* SettingsService

Services receive validated DTOs and return validated DTOs.

---

# 24. Trust Boundary Model

Every process transition represents a trust boundary.

Validation is mandatory at:

* Renderer → Preload
* Preload → Main Process
* Main Process → Services
* Services → Infrastructure

Trust must never be inherited across boundaries.

---

# 25. IPC Request Flow

Every IPC request follows the same lifecycle:

1. Renderer calls `window.patagonia`.
2. Preload serializes the request.
3. Main Process validates sender.
4. Payload is validated.
5. Service executes business logic.
6. DTO response is returned.
7. Preload exposes the result to the Renderer.

---

# 26. IPC Channel Registry

IPC channel names are internal implementation details.

Rules:

* Centralized registration.
* One handler per channel.
* Stable naming.
* No dynamic channel creation.
* No public dependency on channel names.

---

# 27. Runtime Validation

All external input is validated at runtime.

Validation covers:

* Request DTOs
* Response DTOs
* IPC payloads
* Configuration
* External integrations

Compile-time typing never replaces runtime validation.

---

# 28. Sender Validation

Every privileged IPC handler validates:

* Sender origin.
* Browser window.
* Frame context.
* Permission requirements.

Unauthorized requests are rejected before business logic executes.

---

# 29. IPC Handler Rules

Handlers must only:

* Validate sender.
* Validate payload.
* Invoke one service.
* Return a DTO or ApiResult.

Handlers must never contain business rules or persistence logic.

---

# 30. DTO Mapping

Internal domain objects never cross process boundaries.

Services map domain models into immutable DTOs before returning results.

This ensures implementation details remain private while maintaining stable API contracts.

---

# 31. Public API Structure

The Renderer process interacts with Patagonia Browser exclusively through the
global `window.patagonia` object.

This object represents the complete public API surface exposed by the browser.

It is intentionally:

* Small
* Stable
* Typed
* Discoverable
* Versionable
* Secure

No Electron APIs, Node.js APIs or IPC primitives are exposed directly.

---

# 32. Global API Contract

The preload script injects the following object:

```ts
declare global {
    interface Window {
        readonly patagonia: PatagoniaAPI;
    }
}
```

The object is immutable after initialization.

Replacing or mutating `window.patagonia` is forbidden.

---

# 33. PatagoniaAPI Interface

The root interface is intentionally organized into namespaces.

Example:

```ts
export interface PatagoniaAPI {

    readonly app: AppAPI;

    readonly windows: WindowsAPI;

    readonly tabs: TabsAPI;

    readonly navigation: NavigationAPI;

    readonly downloads: DownloadsAPI;

    readonly history: HistoryAPI;

    readonly bookmarks: BookmarksAPI;

    readonly settings: SettingsAPI;

    readonly permissions: PermissionsAPI;

    readonly sessions: SessionsAPI;

    readonly ai: AIAPI;
}
```

Each namespace owns exactly one functional domain.

---

# 34. Namespace Design Principles

Namespaces should follow these rules:

* One responsibility
* No overlap
* Easy discovery
* Stable naming
* Independent evolution

Namespaces must never expose implementation details.

Good:

```ts
tabs.create()
```

Bad:

```ts
ipc.invokeCreateTab()
```

---

# 35. Namespace Responsibilities

## app

Application lifecycle.

Examples:

* version
* quit
* restart
* checkUpdates

---

## windows

Browser windows.

Examples:

* create
* close
* minimize
* maximize
* focus

---

## tabs

Browser tabs.

Examples:

* create
* close
* duplicate
* activate
* move
* pin

---

## navigation

Navigation.

Examples:

* back
* forward
* reload
* stop
* navigate

---

## downloads

Download management.

Examples:

* pause
* resume
* cancel
* remove

---

## history

Browsing history.

Examples:

* search
* clear
* deleteEntry

---

## bookmarks

Bookmark management.

Examples:

* create
* update
* delete
* move

---

## settings

Persistent configuration.

Examples:

* get
* update
* reset

---

## permissions

Permission management.

Examples:

* request
* revoke
* list

---

## sessions

Profiles and sessions.

Examples:

* create
* switch
* delete

---

## ai

Artificial Intelligence integrations.

Examples:

* summarize
* translate
* explain
* chat

---

# 36. Naming Convention

Methods always begin with verbs.

Examples:

```ts
create()

update()

delete()

move()

reload()

activate()

pause()

resume()

search()
```

Avoid nouns as actions.

Bad:

```ts
tabCreation()

windowClose()

historyCleaner()
```

---

# 37. Method Signature Rules

Every method must:

* Receive typed parameters.
* Return typed results.
* Never return `any`.
* Never throw expected business errors.
* Be deterministic.

Example:

```ts
create(input: CreateTabRequest): Promise<ApiResult<TabDTO>>
```

---

# 38. Request Objects

Methods receiving more than one parameter should use request objects.

Bad:

```ts
create(url, active, pinned)
```

Good:

```ts
create({

    url,

    active,

    pinned

})
```

Advantages:

* Easier evolution
* Better readability
* Optional fields
* Backward compatibility

---

# 39. Response Objects

Responses must never expose internal classes.

Only DTOs.

Good:

```ts
TabDTO
```

Bad:

```ts
Electron.WebContents
```

---

# 40. Immutability

Returned DTOs should be treated as immutable.

Consumers should never modify received objects.

Updates are performed using dedicated API methods.

---

# 41. Async Rules

Every operation crossing an IPC boundary is asynchronous.

Examples:

```ts
await tabs.create()

await settings.get()

await downloads.pause()
```

Avoid synchronous IPC entirely.

---

# 42. Error Handling

Methods return an ApiResult.

Expected failures are represented as values.

Unexpected failures are converted into ApiError.

The Renderer should never receive uncaught exceptions from the Main Process.

---

# 43. Discoverability

The API should be intuitive.

Developers should discover capabilities using IDE autocomplete.

Example:

```ts
window.patagonia.
```

Immediately reveals:

* app
* tabs
* navigation
* downloads
* settings
* history

No documentation should be required for common operations.

---

# 44. Stability Rules

Public methods are considered contracts.

Changing:

* names
* meanings
* parameter order
* return types

is considered a breaking change.

Breaking changes require version evolution.

---

# 45. Deprecation Policy

Deprecated APIs remain available during at least one major release.

Example:

```ts
/**
 * @deprecated
 * Use tabs.activate()
 */
focusTab()
```

Deprecated methods should emit development warnings.

---

# 46. Namespace Evolution

New namespaces may be added without breaking compatibility.

Existing namespaces should not change responsibility.

Example:

Future additions:

```text
sync

extensions

workspaces

profiles

passwordManager

devtools
```

---

# 47. Forbidden Public APIs

The following must never appear in the Renderer API:

* ipcRenderer
* ipcMain
* BrowserWindow
* WebContents
* shell
* dialog
* fs
* path
* process
* child_process
* sqlite
* Electron classes

The Renderer interacts only with browser capabilities.

---

# 48. Public API Invariants

The following rules are always true:

* The Renderer never talks directly to Electron.
* Every call passes through the preload bridge.
* Every payload is validated.
* Every privileged operation validates the sender.
* DTOs are immutable.
* Business logic never exists inside preload.
* IPC channels are private.
* Contracts are versioned.
* Secrets never leave the Main Process.

These invariants are part of Patagonia Browser's security model.
