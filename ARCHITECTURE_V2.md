# 🏔 Patagonia Browser

# ARCHITECTURE_V2.md

**Document Version:** 2.0  
**Status:** Draft  
**Owner:** Patagonia Labs  
**License:** MIT  
**Last Updated:** 2026-07-18

---

# Technical Architecture

## Purpose

This document defines the technical architecture of Patagonia Browser.

It describes:

- The main architectural layers.
- Process boundaries.
- Module responsibilities.
- Data flow.
- Communication rules.
- Security boundaries.
- Storage responsibilities.
- Dependency rules.
- Extension points.
- Testing boundaries.
- Scalability principles.

This document is intended to guide implementation decisions.

It must remain consistent with:

- `PRODUCT_PRINCIPLES.md`
- `BLUEPRINT.md`
- `FEATURES_SPECIFICATION.md`
- `UI_COMPONENTS.md`
- `USER_FLOWS.md`
- `DESIGN_SYSTEM.md`
- `DEVELOPMENT_GUIDE.md`

---

# Architectural Objective

Patagonia Browser should be built as a modular desktop browser with clearly separated responsibilities.

The architecture must allow the project to:

- Start with a small and stable browser core.
- Add features without tightly coupling the entire application.
- Preserve Chromium security boundaries.
- Replace internal implementations without redesigning the full product.
- Support optional modules.
- Maintain understandable data flow.
- Test important systems independently.
- Protect privileged browser capabilities from web content.

---

# Architectural Principles

## Separation of Responsibilities

Each subsystem should have one clear responsibility.

A component responsible for rendering interface elements should not directly manage browser storage, native processes or network security.

---

## Explicit Boundaries

Communication between modules and processes must happen through defined interfaces.

Hidden dependencies and unrestricted global access should be avoided.

---

## Least Privilege

Every process, module and interface should receive only the capabilities it requires.

Web content must never receive direct access to privileged browser APIs.

---

## Local-First Operation

Core browser functionality must work without:

- A Patagonia account.
- Cloud services.
- AI services.
- Telemetry.
- External proprietary infrastructure.

---

## Replaceable Implementations

High-level modules should depend on interfaces instead of concrete implementations whenever practical.

Examples:

- Search providers.
- AI providers.
- Storage adapters.
- Update services.
- Download backends.
- Sync providers.

---

## Stable Core, Optional Modules

Essential navigation belongs to the stable core.

Experimental and optional capabilities should be implemented as modules that can be disabled without breaking the browser.

---

## Security Before Convenience

Shortcuts that weaken process isolation, input validation or sandboxing are not acceptable.

---

## Observable Behavior

Important systems should expose structured state and diagnostic information without exposing sensitive user data.

---

# Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                     Patagonia Browser                        │
├──────────────────────────────────────────────────────────────┤
│ Presentation Layer                                           │
│                                                              │
│ Application Shell · Tabs · Toolbar · Hub · Settings · Panels │
├──────────────────────────────────────────────────────────────┤
│ Application Layer                                            │
│                                                              │
│ Commands · Use Cases · Navigation · Spaces · Session Logic   │
├──────────────────────────────────────────────────────────────┤
│ Domain Layer                                                 │
│                                                              │
│ Tabs · Windows · Spaces · Downloads · History · Permissions  │
├──────────────────────────────────────────────────────────────┤
│ Service Layer                                                │
│                                                              │
│ Storage · Security · Search · AI · Updates · Extensions      │
├──────────────────────────────────────────────────────────────┤
│ Platform Integration Layer                                   │
│                                                              │
│ Chromium · Operating System · File System · Network · GPU     │
└──────────────────────────────────────────────────────────────┘
```

---

# Layer Model

Patagonia Browser uses a layered architecture.

The exact technology used by each layer may evolve, but dependency direction should remain stable.

```text
Presentation
     ↓
Application
     ↓
Domain
     ↓
Services
     ↓
Platform Integration
```

Higher-level layers may request capabilities from lower-level layers through defined interfaces.

Lower-level layers should not depend on presentation components.

---

# 1. Presentation Layer

## Responsibility

The Presentation Layer contains the browser interface.

It is responsible for:

- Rendering visual components.
- Displaying application state.
- Receiving user input.
- Triggering application commands.
- Presenting errors and status changes.
- Managing focus and accessibility behavior.
- Supporting dark and light themes.
- Adapting to window size and tab layout.

## Main Areas

- Application Shell.
- Title Bar.
- Tab Bar.
- Navigation Toolbar.
- Address Bar.
- Patagonia Hub.
- Spaces interface.
- Privacy Center.
- Settings.
- Downloads interface.
- History interface.
- Bookmarks interface.
- Dialogs.
- Notifications.
- Internal browser pages.

## Rules

The Presentation Layer must not:

- Directly access the file system.
- Directly execute native operating system commands.
- Store sensitive credentials.
- Directly manage Chromium privileged objects.
- Expose privileged APIs to ordinary websites.
- Contain business logic that belongs to application services.

## Expected Pattern

```text
User Interaction
      ↓
UI Component
      ↓
Application Command
      ↓
Use Case
      ↓
Domain or Service
      ↓
State Update
      ↓
UI Re-render
```

---

# 2. Application Layer

## Responsibility

The Application Layer coordinates browser behavior.

It contains use cases representing actions users or internal systems may perform.

Examples:

- Open a tab.
- Close a tab.
- Navigate to a URL.
- Create a Space.
- Move a tab between Spaces.
- Start a download.
- Clear browsing data.
- Change a site permission.
- Restore a session.
- Install an extension.
- Check for updates.

## Main Components

- Command Dispatcher.
- Query Dispatcher.
- Use Cases.
- Navigation Coordinator.
- Session Coordinator.
- Space Coordinator.
- Window Coordinator.
- Module Coordinator.
- Permission Coordinator.
- Update Coordinator.

## Rules

Application services should:

- Coordinate operations.
- Validate high-level requests.
- Enforce workflow rules.
- Call domain and infrastructure interfaces.
- Return structured results.
- Avoid direct UI dependencies.

## Example

```text
MoveTabToSpaceCommand
        ↓
Validate tab
        ↓
Validate destination Space
        ↓
Update domain state
        ↓
Persist session state
        ↓
Publish TabMoved event
        ↓
Update UI
```

---

# 3. Domain Layer

## Responsibility

The Domain Layer represents the browser's core concepts and rules.

It should contain logic that remains meaningful regardless of the final UI framework or storage technology.

## Core Domain Entities

- BrowserWindow.
- BrowserTab.
- BrowserSession.
- Space.
- Bookmark.
- BookmarkFolder.
- HistoryEntry.
- DownloadItem.
- SitePermission.
- Extension.
- SearchProvider.
- AIProvider.
- BrowserSetting.
- Module.
- UpdateState.

## Domain Value Objects

Possible value objects include:

- TabId.
- WindowId.
- SpaceId.
- DownloadId.
- ExtensionId.
- URLValue.
- DomainName.
- PermissionType.
- PermissionDecision.
- IsolationLevel.
- ThemePreference.
- ReleaseChannel.

## Domain Rules

Examples:

- A tab belongs to one active Space at a time.
- A destroyed window cannot accept new tabs.
- A private session must not write ordinary history entries.
- A dangerous download cannot be opened silently.
- A Space deletion requires a defined tab migration or closure policy.
- A disabled module cannot register active interface actions.
- Destructive browser commands require explicit confirmation.

## Domain Independence

The Domain Layer should not depend on:

- UI frameworks.
- Database implementations.
- Chromium-specific interface details where avoidable.
- Operating-system-specific code.
- Cloud SDKs.

---

# 4. Service Layer

## Responsibility

The Service Layer provides capabilities required by the application and domain layers.

## Main Services

- Navigation Service.
- Session Service.
- Storage Service.
- History Service.
- Bookmark Service.
- Download Service.
- Permission Service.
- Privacy Service.
- Security Service.
- Search Service.
- Extension Service.
- Module Service.
- Update Service.
- Diagnostics Service.
- AI Service.
- Localization Service.

## Service Interface Rule

Services should expose narrow interfaces.

Preferred:

```text
HistoryService.search(query, filters)
HistoryService.remove(entryIds)
HistoryService.clear(timeRange)
```

Avoid:

```text
GlobalBrowserService.executeAnything(input)
```

---

# 5. Platform Integration Layer

## Responsibility

The Platform Integration Layer connects Patagonia Browser with Chromium and the operating system.

## Main Areas

- Chromium embedding.
- Renderer lifecycle.
- Browser process integration.
- GPU process integration.
- Network process integration.
- Native window creation.
- File system operations.
- Operating system notifications.
- Default browser registration.
- Native menus.
- Update installation.
- Secure credential storage.
- Process launching.
- Crash reporting infrastructure.

## Rules

Platform-specific code should be isolated behind interfaces.

Example:

```text
DefaultBrowserService
    ├── WindowsDefaultBrowserAdapter
    ├── LinuxDefaultBrowserAdapter
    └── MacOSDefaultBrowserAdapter
```

The first supported platform may implement only one adapter.

The interface should still avoid unnecessary platform coupling.

---

# Process Architecture

A browser is a multi-process application.

Patagonia Browser should preserve the process-isolation model provided by Chromium or the selected Chromium-based framework.

```text
Operating System

└── Patagonia Browser

    ├── Browser Process

    ├── Renderer Processes

    ├── GPU Process

    ├── Network Service Process

    ├── Utility Processes

    └── Extension Processes
```

Exact process behavior may depend on the selected technical foundation.

The architectural security boundary must remain clear regardless of implementation.

---

# Browser Process

## Responsibility

The Browser Process is the privileged application coordinator.

It may manage:

- Native windows.
- Tab lifecycle.
- Navigation requests.
- Browser sessions.
- Downloads.
- Permissions.
- Native menus.
- Internal storage coordination.
- Extensions.
- Updates.
- Operating system integration.
- Process creation.
- Privileged application commands.

## Security Role

The Browser Process is trusted.

Code executing in this process must be minimized, reviewed and protected from unvalidated renderer input.

## Rules

The Browser Process must:

- Validate all incoming messages.
- Reject unknown commands.
- Validate identifiers and parameters.
- Apply authorization rules.
- Avoid executing arbitrary renderer-provided code.
- Never trust URLs or file paths received from a renderer.
- Use typed or schema-validated messages.

---

# Renderer Processes

## Responsibility

Renderer Processes display web content or approved browser interface content.

A renderer may host:

- Ordinary website content.
- Internal browser pages.
- Extension interfaces.
- Isolated application UI surfaces.

These contexts must not automatically share the same privilege level.

## Ordinary Web Renderer

An ordinary website renderer must not receive access to:

- File system APIs.
- Browser settings storage.
- Native operating system commands.
- Update controls.
- Extension management.
- Session databases.
- Secure credentials.
- Unrestricted inter-process communication.

## Internal UI Renderer

Internal browser pages may require approved capabilities.

Those capabilities must be exposed through a limited bridge.

Example:

```text
patagonia://downloads
    ↓
DownloadsBridge
    ↓
Validated IPC
    ↓
Download Application Service
```

## Renderer Rules

- Context isolation should remain enabled.
- Node or equivalent native runtime access should not be exposed to websites.
- Privileged bridges must use allowlisted methods.
- Renderer input must be treated as untrusted.
- Internal and external origins must be clearly separated.

---

# GPU Process

## Responsibility

The GPU Process handles hardware-accelerated rendering tasks.

It may support:

- Page rendering.
- Video decoding.
- Canvas acceleration.
- WebGL.
- Browser interface compositing.

## Rules

Patagonia Browser should avoid introducing custom GPU-process logic unless technically necessary.

GPU failures should not permanently prevent the browser from starting.

A safe fallback mode should be considered for troubleshooting.

---

# Network Service Process

## Responsibility

The Network Service handles network operations.

It may manage:

- HTTP and HTTPS requests.
- DNS.
- Proxy configuration.
- Cookies.
- Cache.
- Certificates.
- Connection security.
- Download network streams.

## Security Rules

- Certificate validation must not be weakened.
- Dangerous certificate overrides must remain explicit.
- Proxy configuration changes must be validated.
- Secure DNS state must be visible when exposed to users.
- Network diagnostics must avoid logging private browsing content.

---

# Utility Processes

Utility processes may be used for isolated tasks such as:

- Audio.
- PDF processing.
- File parsing.
- Data import.
- Media decoding.
- AI model integration.
- Untrusted document processing.

Risky or resource-intensive work should be separated from the main Browser Process where possible.

---

# Inter-Process Communication

## Purpose

Inter-process communication, or IPC, allows processes to request actions and exchange state.

IPC is a major security boundary.

## IPC Rule

Every IPC channel must be:

- Explicitly defined.
- Directional.
- Validated.
- Minimally privileged.
- Documented.
- Testable.

## Message Structure

A message should contain:

```text
Message Type

Request ID

Sender Context

Payload

Schema Version
```

A response should contain:

```text
Request ID

Success State

Result

Structured Error
```

## Example

```text
Renderer
    │
    │ Request: downloads.openFile
    │ Payload: { downloadId }
    ↓
IPC Validator
    ↓
Authorization Check
    ↓
Download Service
    ↓
Operating System Adapter
```

## Forbidden Patterns

Avoid:

- Generic remote code execution channels.
- IPC methods that accept arbitrary method names.
- Unvalidated JSON objects.
- Passing raw file paths when stable identifiers can be used.
- Allowing website renderers to call internal-page APIs.
- Exposing entire service objects through one bridge.

---

# API Bridge Architecture

Internal browser pages may communicate through approved bridge APIs.

## Example Bridge

```text
PatagoniaDownloadsAPI

listDownloads()

pauseDownload(downloadId)

resumeDownload(downloadId)

cancelDownload(downloadId)

openDownload(downloadId)

showDownloadInFolder(downloadId)

removeDownloadEntry(downloadId)
```

## Rules

A bridge must:

- Expose only required methods.
- Validate parameters.
- Return serializable data.
- Avoid leaking internal objects.
- Prevent prototype manipulation.
- Avoid exposing filesystem paths unnecessarily.
- Include permission checks where needed.

---

# Command Architecture

User and system actions should be represented as explicit commands.

## Example Commands

- OpenNewTabCommand.
- CloseTabCommand.
- NavigateCommand.
- CreateSpaceCommand.
- MoveTabToSpaceCommand.
- StartDownloadCommand.
- ClearHistoryCommand.
- ChangePermissionCommand.
- RestartForUpdateCommand.

## Command Lifecycle

```text
Command Requested
       ↓
Schema Validation
       ↓
Authorization
       ↓
Use Case Execution
       ↓
Domain Mutation
       ↓
Persistence
       ↓
Event Publication
       ↓
UI State Update
```

## Benefits

- Easier testing.
- Clear audit of behavior.
- Reusable keyboard and menu actions.
- Consistent validation.
- Simplified Patagonia Intelligence integration.
- Reduced UI business logic.

---

# Query Architecture

Queries request information without changing state.

## Example Queries

- GetActiveTabQuery.
- ListSpacesQuery.
- SearchHistoryQuery.
- ListDownloadsQuery.
- GetSitePermissionsQuery.
- GetUpdateStatusQuery.
- GetBrowserSettingsQuery.

## Rule

Queries must not perform hidden destructive operations.

---

# Event System

## Purpose

The Event System communicates meaningful state changes between modules.

## Example Events

- TabCreated.
- TabClosed.
- TabActivated.
- TabMoved.
- NavigationStarted.
- NavigationCompleted.
- DownloadStarted.
- DownloadCompleted.
- DownloadFailed.
- SpaceCreated.
- SpaceChanged.
- PermissionChanged.
- ThemeChanged.
- ModuleEnabled.
- UpdateAvailable.
- SessionRestored.

## Event Structure

An event should contain:

```text
Event Name

Event ID

Timestamp

Source Module

Payload

Schema Version
```

## Event Rules

Events must:

- Represent completed or meaningful state changes.
- Avoid exposing sensitive data unnecessarily.
- Be immutable after publication.
- Use versioned payloads when persisted.
- Avoid circular event chains.
- Avoid relying on event ordering unless explicitly guaranteed.

## Event Scope

Two event categories are recommended:

### Local Events

Used inside one process or module boundary.

### Application Events

Used across major modules or process boundaries.

---

# State Management

## State Categories

Patagonia Browser contains different types of state.

### UI State

Examples:

- Open panel.
- Selected settings section.
- Sidebar width.
- Dialog visibility.
- Hover and focus state.

### Session State

Examples:

- Open windows.
- Open tabs.
- Tab order.
- Active Space.
- Active tab.
- Window position.

### Persistent User State

Examples:

- Settings.
- Bookmarks.
- History.
- Spaces.
- Permissions.
- Download records.

### Sensitive State

Examples:

- Tokens.
- API credentials.
- Saved passwords.
- Encryption keys.

### Ephemeral State

Examples:

- Loading progress.
- Temporary suggestions.
- Current command input.
- Active drag operation.

## Rule

Different state categories should not be stored together without justification.

Sensitive state must never be stored as ordinary application configuration.

---

# Application State Flow

```text
User Action
    ↓
Command
    ↓
Application Service
    ↓
Domain State
    ↓
Repository
    ↓
Event
    ↓
State Projection
    ↓
Interface
```

The interface should render from structured application state instead of manually synchronizing many unrelated local variables.

---

# Storage Architecture

## Objective

Provide reliable local data storage while maintaining privacy, recoverability and migration support.

## Storage Categories

```text
User Profile

├── Preferences
├── Sessions
├── History
├── Bookmarks
├── Downloads
├── Spaces
├── Permissions
├── Extensions
├── Module Data
├── AI Configuration
└── Diagnostics
```

## Suggested Storage Types

Depending on the selected framework:

- Structured database for history and bookmarks.
- Key-value storage for preferences.
- Session snapshots for recovery.
- Operating system secure storage for credentials.
- File-based module data when appropriate.
- Chromium-managed stores for cookies and cache.

## Repository Pattern

Domain and application layers should use repository interfaces.

Example:

```text
BookmarkRepository

add(bookmark)

update(bookmark)

remove(bookmarkId)

findById(bookmarkId)

search(query)

listByFolder(folderId)
```

Concrete storage implementations remain outside the domain layer.

---

# Storage Rules

Storage systems must support:

- Schema versioning.
- Migration.
- Transactional updates where data integrity matters.
- Corruption detection where practical.
- Backup or recovery strategy for critical user data.
- Private-mode separation.
- Selective data deletion.
- Data export when promised.
- Clear ownership by module.

## Forbidden Storage Practices

Avoid:

- Storing secrets in plain text.
- Storing all application data in one unstructured file.
- Writing ordinary history from private browsing.
- Sharing data between Spaces while claiming full isolation.
- Silent destructive migrations.
- Storing raw page content without a documented feature requirement.

---

# Profile Architecture

A browser profile represents one persistent user environment.

## Profile Content

A profile may include:

- Settings.
- Cookies.
- History.
- Bookmarks.
- Extensions.
- Sessions.
- Spaces.
- Permissions.
- Search configuration.
- AI configuration.
- Module configuration.

## Initial Scope

The first versions may support one local profile.

The architecture should avoid making future multi-profile support impossible.

## Rule

Spaces and Profiles are different concepts.

```text
Profile
    ├── Space: Personal
    ├── Space: Work
    └── Space: Development
```

A Space is primarily an organizational environment unless stronger isolation is explicitly implemented.

A Profile is a broader persistent browser identity and data boundary.

---

# Patagonia Spaces Architecture

## Core Model

```text
Profile
    ↓
Spaces
    ↓
Windows
    ↓
Tabs
```

Alternative window-to-Space relationships may be supported later, but the initial model should remain clear.

## Space Entity

A Space may contain:

```text
Space

├── ID
├── Name
├── Icon
├── Accent
├── Isolation Level
├── Tab Session
├── Pinned Tabs
├── Bookmark References
├── Appearance Preferences
├── Module Preferences
└── AI Preferences
```

## Isolation Modes

### Organizational Isolation

Separates interface and session organization.

Shared:

- Cookies.
- Site storage.
- Authentication sessions.

### Storage Isolation

Separates selected browser storage partitions.

Possible separation:

- Cookies.
- Local storage.
- Cache.
- Permissions.

### Profile Isolation

Uses separate browser profile-level storage.

## Rule

The implemented isolation level must be visible in the product and documented accurately.

---

# Tab Architecture

## Tab Entity

```text
BrowserTab

├── Tab ID
├── Window ID
├── Space ID
├── Current URL
├── Page Title
├── Favicon
├── Loading State
├── Audio State
├── Mute State
├── Pin State
├── Suspension State
├── Privacy State
├── Navigation History
└── Renderer Reference
```

## Tab Lifecycle

```text
Created
   ↓
Initializing
   ↓
Active or Inactive
   ↓
Loading
   ↓
Loaded
   ↓
Suspended or Closed
```

Possible failure states:

```text
Crashed

Blocked

Navigation Error
```

## Rules

- UI state should not be the only source of tab truth.
- Closing a tab must release renderer resources.
- Session persistence should not block immediate tab interaction.
- Tab restoration must tolerate invalid or unavailable URLs.
- Crashed tabs should be replaceable without restarting the browser.

---

# Window Architecture

## Window Entity

```text
BrowserWindow

├── Window ID
├── Bounds
├── Display ID
├── Window State
├── Active Tab ID
├── Tab Order
├── Active Space ID
├── Private State
├── Sidebar State
└── Appearance State
```

## Rules

- Native window state should be managed by a dedicated coordinator.
- Window restoration must respect available displays.
- Off-screen restored windows should be moved to a visible region.
- Private and ordinary windows must not share session restoration behavior incorrectly.

---

# Navigation Architecture

## Navigation Pipeline

```text
User Input
    ↓
Input Classification
    ├── URL
    ├── Search Query
    ├── Browser Command
    └── Internal Route
    ↓
Validation
    ↓
Navigation Policy
    ↓
Chromium Navigation
    ↓
Security Evaluation
    ↓
Page Commit
    ↓
History and UI Update
```

## Input Classification

The address bar should classify input without requiring AI.

Basic categories should be processed locally.

Examples:

- Valid URL.
- Search text.
- Known internal route.
- Registered browser command.
- Invalid or unsupported protocol.

## Navigation Policy

Navigation policy may determine:

- Whether a URL may open.
- Whether it should open internally or externally.
- Whether a download begins.
- Whether a permission is required.
- Whether a warning page is shown.
- Whether the request belongs to a private session.
- Whether the navigation crosses a Space storage boundary.

---

# Internal Page Architecture

Internal browser pages use a protected scheme.

Example:

```text
patagonia://newtab
patagonia://settings
patagonia://downloads
patagonia://history
patagonia://bookmarks
patagonia://privacy
patagonia://extensions
patagonia://about
patagonia://diagnostics
```

## Requirements

Internal pages must:

- Use a trusted internal origin.
- Be isolated from remote web content.
- Use restricted API bridges.
- Validate route parameters.
- Apply a strict content security policy.
- Avoid remote executable content.
- Avoid inline code when security policy forbids it.
- Prevent remote pages from imitating privileged browser chrome.

## Internal Page Ownership

Each internal page should belong to one module.

Example:

```text
Downloads Module
    ├── Internal Route
    ├── UI Components
    ├── Bridge API
    ├── Application Use Cases
    ├── Repository
    └── Tests
```

---

# Module Architecture

## Objective

Allow Patagonia Browser to grow through isolated capabilities.

## Module Categories

### Core Module

Required for browser operation.

Examples:

- Tabs.
- Navigation.
- Windows.
- Settings.
- Security.

### Official Module

Maintained by Patagonia Labs but not required for minimum browser operation.

Examples:

- Patagonia Hub.
- Spaces.
- Notes.
- AI tools.
- Screen capture.

### Experimental Module

Feature under active testing.

### Third-Party Extension

Uses the compatible browser extension system rather than full internal module privileges.

## Module Contract

Every module should define:

```text
Module ID

Name

Version

Category

Status

Dependencies

Required Capabilities

Registered Commands

Registered Routes

Registered Events

Settings Schema

Storage Schema

UI Entry Points

Lifecycle Hooks
```

## Module Lifecycle

```text
Discovered
    ↓
Validated
    ↓
Initialized
    ↓
Enabled
    ↓
Running
    ↓
Disabled
    ↓
Disposed
```

## Rules

Modules must:

- Declare dependencies.
- Avoid circular dependencies.
- Clean up subscriptions.
- Release resources when disabled.
- Own their storage schema.
- Expose narrow public interfaces.
- Avoid direct access to unrelated module internals.

---

# Module Dependency Graph

Preferred:

```text
Hub Module
    ↓
Public service interfaces

Downloads Module
History Module
Bookmarks Module
Spaces Module
Privacy Module
```

Avoid:

```text
Hub UI
    ↓
Direct database access
    ↓
Private fields from every module
```

The Hub should aggregate public projections, not bypass module boundaries.

---

# Dependency Injection

## Purpose

Dependency Injection separates service consumers from service implementations.

## Example

```text
NavigationUseCase

depends on:

NavigationService

HistoryRepository

SecurityPolicy

EventPublisher
```

The use case should not construct those dependencies itself.

## Benefits

- Easier testing.
- Replaceable implementations.
- Clear ownership.
- Reduced global state.
- Better platform support.

## Rules

- Prefer constructor or explicit factory injection.
- Avoid hidden service locators.
- Avoid unrestricted global containers.
- Keep lifecycle scopes clear.
- Do not expose privileged services to renderers through dependency injection.

---

# Service Lifetimes

Possible lifetimes include:

## Application Lifetime

One instance for the entire browser process.

Examples:

- Update Service.
- Module Registry.
- Diagnostics Service.

## Profile Lifetime

One instance per active profile.

Examples:

- History Repository.
- Bookmark Repository.
- Settings Repository.

## Window Lifetime

One instance per browser window.

Examples:

- Window Coordinator.
- Window UI State.

## Tab Lifetime

One instance per tab.

Examples:

- Navigation Controller.
- Site Permission Context.
- Renderer Bridge.

## Request Lifetime

Created for one command or operation.

Examples:

- Import operation.
- Clear-data operation.
- Update verification request.

---

# Patagonia Hub Architecture

The Hub is an aggregation surface.

It should not become a centralized god module.

## Hub Responsibilities

- Display module summaries.
- Trigger registered actions.
- Show browser status.
- Navigate to internal tools.
- Display current Space.

## Hub Data Sources

Modules may expose read-only projections such as:

```text
DownloadsSummary

ActiveDownloadCount

LastCompletedDownload
```

```text
PrivacySummary

TrackerProtectionState

PermissionWarningCount
```

```text
HistorySummary

RecentlyVisitedItems
```

## Rule

The Hub must not directly modify module databases.

It should invoke application commands.

---

# Patagonia Intelligence Architecture

## Objective

Interpret address-bar input and execute browser actions.

## Processing Pipeline

```text
Input
   ↓
Local Parser
   ↓
Input Classification
   ├── URL
   ├── Search
   ├── Internal Route
   ├── Registered Command
   └── Optional AI Request
   ↓
Suggestion Ranking
   ↓
User Selection
   ↓
Command Execution or Navigation
```

## Local Parser

The Local Parser should support:

- Exact commands.
- Command aliases.
- Keyboard-friendly matching.
- Localized command names.
- Fuzzy matching within safe limits.
- Registered module commands.

## Command Registry

Modules may register commands.

Example:

```text
Command ID: downloads.open
Aliases:
- downloads
- open downloads
- show downloads
```

## AI Boundary

AI should not be required for standard browser commands.

AI interpretation may be used only when:

- The user enables it.
- The provider is configured.
- Data-processing behavior is visible.
- The request cannot be satisfied reliably by local parsing.

## Destructive Command Rule

Commands such as clearing data, uninstalling extensions or deleting Spaces must require explicit confirmation.

---

# AI Provider Architecture

## Provider Interface

```text
AIProvider

getProviderInfo()

listModels()

testConnection()

executeTask(request)

cancelTask(requestId)

getPrivacyMetadata()
```

## Provider Types

- Local Provider.
- Local Network Provider.
- Cloud Provider.
- OpenAI-Compatible Provider.
- Disabled Provider.

## Request Model

An AI request should explicitly declare:

```text
Task Type

User Input

Included Page Content

Provider ID

Model ID

Privacy Classification

Timeout

Cancellation Token
```

## Security and Privacy Rules

- API credentials must use secure storage.
- Page content must not be sent without user permission.
- Provider responses must be treated as untrusted data.
- AI output must not directly execute privileged commands.
- AI-proposed commands require validation.
- Automatic cloud fallback must not happen unless configured.

---

# Search Provider Architecture

## Provider Interface

```text
SearchProvider

ID

Name

Search URL Template

Suggestion Endpoint

Suggestion Privacy Behavior

Keyword

Enabled State
```

## Search Flow

```text
User Query
    ↓
Selected Provider
    ↓
Suggestion Policy
    ↓
Optional External Suggestion Request
    ↓
Search Navigation
```

## Rules

- External suggestions must follow user settings.
- Search engines must be replaceable.
- Custom provider templates must be validated.
- Search URLs must not allow arbitrary browser command injection.

---

# Privacy Architecture

## Objective

Make privacy behavior explicit and enforceable.

## Privacy Components

- Cookie Policy.
- Storage Policy.
- History Policy.
- Permission Policy.
- Tracker Protection.
- Secure DNS Configuration.
- Fingerprinting Protection.
- Private Browsing Policy.
- Data Retention Policy.
- AI Data Policy.
- Telemetry Policy.

## Privacy Policy Engine

A central policy service may answer questions such as:

```text
Should history be saved?

May this site access the microphone?

May suggestions be sent externally?

May this AI provider receive page content?

Should third-party cookies be blocked?

Should data be retained for this Space?
```

## Rule

Privacy decisions should not be scattered across unrelated UI components.

The UI should display policy state.

The policy layer should enforce it.

---

# Permission Architecture

## Permission Request Flow

```text
Website Request
    ↓
Chromium Permission Interception
    ↓
Permission Policy
    ↓
Existing Decision Lookup
    ↓
User Prompt if Required
    ↓
Allow or Block
    ↓
Persist Decision if Applicable
    ↓
Notify Site and UI
```

## Permission Decision

```text
PermissionDecision

├── Permission Type
├── Origin
├── Decision
├── Scope
├── Expiration
├── Source
└── Timestamp
```

## Possible Scopes

- This request.
- This session.
- This site.
- This Space.
- This profile.
- Browser-wide default.

## Rule

The first implementation may support fewer scopes.

Unsupported scopes must not be shown in the interface.

---

# Download Architecture

## Download Flow

```text
Navigation or User Action
    ↓
Download Request
    ↓
Security Evaluation
    ↓
Destination Resolution
    ↓
Download Manager
    ↓
Progress Events
    ↓
Completion or Failure
    ↓
History Update
    ↓
User Notification
```

## Download Manager Responsibilities

- Track active downloads.
- Pause or resume when supported.
- Cancel.
- Validate destination.
- Handle filename conflicts.
- Publish progress.
- Record security state.
- Retain history.
- Open or reveal completed files safely.

## Security Rules

- Executable files must not open automatically.
- Download paths must be normalized and validated.
- File opening must reference a known download record.
- Remote content must not supply arbitrary local commands.
- Security warnings must be separate from ordinary failures.

---

# History Architecture

## History Entry

```text
HistoryEntry

├── Entry ID
├── URL
├── Title
├── Visit Timestamp
├── Transition Type
├── Space ID
├── Profile ID
├── Referrer Metadata
└── Privacy Classification
```

## Rules

- Private browsing must not persist ordinary history.
- Sensitive metadata should be minimized.
- Deletion must remove associated searchable projections.
- History search should avoid loading the entire dataset into memory.
- Retention policies should be enforceable by the service layer.

---

# Bookmark Architecture

## Bookmark Model

```text
BookmarkNode

├── Node ID
├── Parent ID
├── Type
├── Title
├── URL
├── Position
├── Space Association
├── Date Created
└── Date Modified
```

## Node Types

- Bookmark.
- Folder.
- Separator, if supported.
- Smart collection, in future versions.

## Rules

- Folder cycles must be prevented.
- Bookmark ordering must be deterministic.
- Import should not silently overwrite existing items.
- Duplicate handling must be defined separately from import.

---

# Settings Architecture

## Settings Categories

Settings may exist at multiple levels:

```text
Application Defaults

Profile Settings

Space Settings

Site Settings

Session Overrides
```

## Resolution Order

A possible resolution model:

```text
Session Override
    ↓
Site Setting
    ↓
Space Setting
    ↓
Profile Setting
    ↓
Application Default
```

This hierarchy should only be implemented where it provides real user value.

## Settings Schema

Each setting should define:

```text
Setting ID

Data Type

Default Value

Scope

Validation

Migration Version

Restart Requirement

Privacy Impact

User-Facing Description
```

## Rule

Settings must not be identified only by UI labels.

Stable internal identifiers are required.

---

# Extension Architecture

## Objective

Support compatible browser extensions while preserving security boundaries.

## Extension Areas

- Manifest parsing.
- Permission review.
- Background execution.
- Content scripts.
- Extension pages.
- Toolbar actions.
- Storage.
- Messaging.
- Update handling.

## Rules

- Extension permissions must be explicit.
- Content scripts must remain isolated from browser internals.
- Extension APIs must be allowlisted.
- Unsupported APIs must fail safely.
- High-risk permissions must be visible to users.
- Extension processes must not receive full browser-process access.

## Internal Modules vs Extensions

```text
Internal Module

Trusted by Patagonia Browser

Uses internal application interfaces

Reviewed as part of the project
```

```text
Extension

Third-party or separately distributed

Uses restricted extension APIs

Runs with declared permissions
```

These systems must not be treated as equivalent.

---

# Update Architecture

## Update Pipeline

```text
Check for Update
    ↓
Retrieve Metadata
    ↓
Verify Signature
    ↓
Compare Version
    ↓
Download Package
    ↓
Verify Package
    ↓
Stage Update
    ↓
Request Restart
    ↓
Install
    ↓
Verify Startup
    ↓
Rollback if Required
```

## Security Requirements

- Update metadata must be authenticated.
- Packages must be cryptographically verified.
- Downgrade behavior must be controlled.
- Update URLs must not be writable by ordinary web content.
- Failure must not corrupt the current installation.
- Security updates must receive priority.

## Release Channels

Possible channels:

- Stable.
- Beta.
- Developer.
- Nightly.

Channels must use explicit configuration and separate update metadata where appropriate.

---

# Diagnostics Architecture

## Objective

Support troubleshooting without collecting unnecessary data.

## Diagnostic Sources

- Application version.
- Operating system version.
- Graphics information.
- Renderer crash state.
- Enabled modules.
- Extension status.
- Update state.
- Storage migration state.
- Recent structured application errors.

## Privacy Rules

Diagnostics should not include by default:

- Full browsing history.
- Page content.
- Form data.
- Passwords.
- API credentials.
- Complete personal file paths.
- Private browsing activity.

## Structured Logging

Preferred log fields:

```text
Timestamp

Severity

Module

Event Code

Message

Operation ID

Non-Sensitive Context
```

Avoid unstructured logs containing arbitrary user content.

---

# Error Architecture

## Structured Error Model

```text
ApplicationError

├── Error Code
├── Category
├── User Message
├── Technical Message
├── Recoverable State
├── Suggested Action
├── Module
└── Diagnostic Context
```

## Categories

- Validation.
- Permission.
- Network.
- Storage.
- Security.
- Update.
- Extension.
- Navigation.
- Renderer.
- Platform.
- Unknown.

## Rule

User-facing messages and technical diagnostic messages must remain separate.

---

# Recovery Architecture

## Recovery Areas

- Window recovery.
- Tab recovery.
- Session recovery.
- Download recovery.
- Storage migration recovery.
- Failed update rollback.
- Safe mode.
- Corrupted preference reset.

## Session Snapshot Strategy

Session state may be saved:

- After meaningful state changes.
- On a controlled interval.
- During graceful shutdown.
- Before high-risk operations.

## Rules

- Persistence must not freeze the interface.
- Session writes should be atomic when possible.
- Corrupted snapshots should not block startup.
- A previous known-good snapshot may be retained.
- Restored tabs should load gradually when resource usage matters.

---

# Safe Mode

## Objective

Allow Patagonia Browser to start when an extension, module, setting or GPU issue prevents normal operation.

## Safe Mode May Disable

- Third-party extensions.
- Experimental modules.
- Custom themes.
- Hardware acceleration.
- Session restoration.
- Optional startup tasks.

## Rules

Safe Mode must:

- Explain what was disabled.
- Preserve user data.
- Offer repair actions.
- Avoid silently changing permanent settings.
- Allow returning to normal mode.

---

# Security Boundaries

```text
Most Trusted

Browser Process

Internal Privileged Services

Internal Browser Pages

Extension Processes

Ordinary Web Renderers

Remote Web Content

Least Trusted
```

Trust must not automatically flow upward.

Data from a less-trusted level must be validated before reaching a more-trusted level.

---

# Threat Model Overview

Patagonia Browser should consider threats including:

- Malicious websites.
- Compromised renderer processes.
- Malicious extensions.
- Unsafe downloads.
- IPC injection.
- Path traversal.
- Command injection.
- Untrusted imported data.
- Corrupted profile data.
- Supply-chain attacks.
- Update tampering.
- Credential exposure.
- Cross-Space data leakage.
- AI prompt injection.
- Fake internal browser interfaces.

Detailed threats should later be documented in `SECURITY_MODEL.md`.

---

# Content Security Policy

Internal browser pages should use a restrictive Content Security Policy.

Objectives:

- Prevent execution of injected scripts.
- Restrict external resource loading.
- Block unsafe inline execution.
- Limit connection destinations.
- Prevent framing where inappropriate.
- Reduce the impact of UI injection.

Any exception must be documented.

---

# Data Validation

All input crossing a boundary must be validated.

Boundary examples:

- Renderer to Browser Process.
- Module to Module.
- Extension to Browser API.
- Imported file to application data.
- Network response to update system.
- AI provider response to interface.
- User-entered path to file system.
- Internal route parameter to application command.

Validation should verify:

- Type.
- Length.
- Allowed values.
- Identifier validity.
- URL protocol.
- Origin.
- Path safety.
- Permission.
- Current object state.

---

# Scalability Principles

## Vertical Feature Growth

New features should be added as complete slices.

Example:

```text
Downloads Feature

Domain Model

Application Commands

Service

Repository

IPC Bridge

UI

Tests
```

Avoid implementing all UI first and adding behavior later across unrelated systems.

## Horizontal Infrastructure Growth

Shared infrastructure should remain minimal.

Examples:

- Event Bus.
- Command Dispatcher.
- Storage Abstraction.
- IPC Validation.
- Logging.
- Localization.

Shared systems must not become unrestricted global dependencies.

---

# Performance Architecture

## Critical Paths

The most important performance paths include:

- Browser startup.
- New tab creation.
- Tab switching.
- Address-bar input.
- Navigation start.
- Page rendering.
- Hub opening.
- Space switching.
- Session restoration.
- Download progress.
- Settings loading.

## Rules

- Expensive work should not block the main UI thread.
- Storage queries should be paginated where appropriate.
- Large history collections should not load entirely at startup.
- Background modules should start lazily.
- Optional modules should not delay first window display.
- UI state updates should be incremental.
- Telemetry must not be introduced as a performance dependency.
- AI initialization must remain optional and lazy.

---

# Startup Architecture

## Suggested Startup Sequence

```text
Application Start

↓

Initialize crash protection

↓

Load minimum configuration

↓

Initialize secure platform services

↓

Create Browser Process services

↓

Open first window

↓

Restore essential session state

↓

Display usable interface

↓

Initialize optional modules

↓

Run background update and maintenance checks
```

## Rule

The browser should become usable before every optional service has finished initializing.

---

# Shutdown Architecture

## Controlled Shutdown

```text
Shutdown Requested

↓

Stop accepting new operations

↓

Persist session snapshot

↓

Pause or record downloads

↓

Dispose modules

↓

Close renderers

↓

Flush critical storage

↓

Close native windows

↓

Exit
```

## Rules

- Shutdown should have a timeout strategy.
- One broken module should not prevent browser exit.
- Critical persistence should occur before nonessential cleanup.
- Private browsing data should be removed according to policy.

---

# Background Tasks

Possible background tasks include:

- Update checks.
- History cleanup.
- Cache maintenance.
- Extension updates.
- Session snapshots.
- Download monitoring.
- Storage migrations.
- Security-list updates.
- Optional AI model status checks.

## Rules

Background tasks must:

- Have cancellation support where practical.
- Avoid blocking startup.
- Respect battery and resource limits.
- Avoid running without clear purpose.
- Use bounded retries.
- Avoid collecting user data unnecessarily.

---

# Concurrency Model

## Objective

Prevent race conditions and inconsistent browser state.

## Examples of Concurrent Operations

- Closing a tab while it navigates.
- Moving a tab while a Space is deleted.
- Clearing history while search results are open.
- Cancelling a download during completion.
- Updating settings during browser shutdown.
- Disabling a module while it publishes events.

## Rules

- Domain mutations should use controlled coordinators.
- Long-running operations should support cancellation.
- Commands should return clear final states.
- Duplicate commands should be safely handled where possible.
- Storage transactions should protect multi-step updates.
- Events should be emitted after successful state mutation.

---

# Versioning

## Areas Requiring Versioning

- Application releases.
- Module contracts.
- IPC schemas.
- Stored data schemas.
- Session snapshots.
- Import formats.
- Settings schemas.
- Update metadata.
- AI provider interfaces.

## Rule

Version changes must distinguish:

- Backward-compatible change.
- Migration-required change.
- Breaking change.
- Deprecated behavior.

---

# Data Migration Architecture

## Migration Flow

```text
Read Stored Schema Version
    ↓
Create Backup or Recovery Point
    ↓
Apply Ordered Migrations
    ↓
Validate Result
    ↓
Commit New Schema Version
    ↓
Remove Temporary Data
```

## Rules

- Migrations must be repeatable or safely detectable.
- Failed migrations must not silently destroy data.
- Large migrations should report progress when visible.
- Downgrade compatibility must be explicitly defined.
- Migration code should be tested with representative old data.

---

# Localization Architecture

User-facing text should use localization identifiers.

Preferred:

```text
settings.privacy.blockThirdPartyCookies.title
```

Avoid:

```text
"Block third-party cookies"
```

hardcoded throughout the application.

## Rules

- Internal error codes remain language-independent.
- UI text is localized at the presentation boundary.
- Date, time and number formatting uses locale-aware utilities.
- Commands may support localized aliases.
- Layouts must tolerate text expansion.

---

# Accessibility Architecture

Accessibility should be supported structurally.

## Requirements

- Semantic component primitives.
- Central focus-management rules.
- Keyboard command registry.
- Accessible status announcements.
- Reduced-motion service.
- Theme and contrast support.
- Accessible IPC-driven notifications.
- Screen-reader labels independent of visible icon text.

## Rule

Accessibility behavior should not be added only inside final screens.

Shared components must carry correct accessibility behavior by default.

---

# Testing Architecture

Testing should follow architectural boundaries.

## Unit Tests

Test:

- Domain rules.
- Value objects.
- Parsers.
- Validators.
- Command handlers.
- Policy logic.
- Storage adapters.

## Integration Tests

Test:

- Application services with repositories.
- IPC bridge validation.
- Module registration.
- Session restoration.
- Permission workflows.
- Download lifecycle.
- Update verification.

## UI Tests

Test:

- Main user flows.
- Keyboard navigation.
- Focus management.
- Dialog behavior.
- Tab interaction.
- Settings.
- Spaces.
- Internal pages.

## Security Tests

Test:

- Unauthorized IPC calls.
- Invalid internal origins.
- Path traversal attempts.
- Malformed imported data.
- Extension permission enforcement.
- Content Security Policy.
- Dangerous download handling.
- Renderer isolation.

## Performance Tests

Measure:

- Startup time.
- New tab creation.
- Tab switch latency.
- Address-bar responsiveness.
- Memory use.
- Session restoration.
- Large history search.
- Space switching.

---

# Test Boundaries

Each module should provide:

```text
Unit Tests

Integration Tests

Contract Tests

UI Tests

Failure Tests

Security Tests
```

Not every small component requires every category.

Critical and privileged modules require stronger coverage.

---

# Repository Structure

A possible initial structure:

```text
Patagonia-Browser/

├── apps/
│   └── desktop/
│
├── src/
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── coordinators/
│   │   └── use-cases/
│   │
│   ├── domain/
│   │   ├── tabs/
│   │   ├── windows/
│   │   ├── spaces/
│   │   ├── downloads/
│   │   ├── history/
│   │   ├── bookmarks/
│   │   └── permissions/
│   │
│   ├── services/
│   │   ├── navigation/
│   │   ├── storage/
│   │   ├── security/
│   │   ├── updates/
│   │   ├── extensions/
│   │   ├── search/
│   │   └── ai/
│   │
│   ├── platform/
│   │   ├── chromium/
│   │   ├── windows/
│   │   ├── filesystem/
│   │   └── native/
│   │
│   ├── presentation/
│   │   ├── shell/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── panels/
│   │   └── state/
│   │
│   ├── modules/
│   │   ├── hub/
│   │   ├── spaces/
│   │   ├── privacy/
│   │   ├── downloads/
│   │   ├── history/
│   │   ├── bookmarks/
│   │   └── settings/
│   │
│   ├── ipc/
│   │   ├── contracts/
│   │   ├── validators/
│   │   ├── handlers/
│   │   └── bridges/
│   │
│   └── shared/
│       ├── errors/
│       ├── events/
│       ├── identifiers/
│       ├── localization/
│       └── validation/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   ├── performance/
│   └── end-to-end/
│
├── scripts/
├── assets/
├── docs/
└── tools/
```

This structure is conceptual.

The final structure must match the selected framework and build system.

---

# Dependency Rules

## Allowed Direction

```text
Presentation
    ↓
Application
    ↓
Domain
```

```text
Application
    ↓
Service Interfaces
```

```text
Infrastructure
    ↑
implements interfaces
```

## Forbidden Dependencies

Examples:

- Domain importing UI components.
- Domain importing Chromium objects.
- UI directly querying databases.
- Renderer directly using native file APIs.
- One module modifying another module's private storage.
- Shared utilities importing feature modules.
- Platform adapters containing product workflow logic.

---

# Public Module Interface

Each module should expose a small public interface.

Example:

```text
DownloadsModule

Commands:
- StartDownload
- PauseDownload
- ResumeDownload
- CancelDownload
- OpenDownload

Queries:
- ListDownloads
- GetDownload

Events:
- DownloadStarted
- DownloadProgressChanged
- DownloadCompleted
- DownloadFailed
```

Private implementation details should not be imported by other modules.

---

# Architecture Decision Records

Major technical decisions should be recorded separately.

Recommended location:

```text
docs/architecture/decisions/
```

Example:

```text
ADR-0001-browser-foundation.md
ADR-0002-ui-framework.md
ADR-0003-storage-engine.md
ADR-0004-ipc-validation.md
ADR-0005-space-isolation.md
```

Each decision should document:

- Context.
- Decision.
- Alternatives.
- Consequences.
- Status.
- Date.

---

# Initial Implementation Strategy

Patagonia Browser should not implement the entire architecture at once.

## Phase 1 — Technical Proof

Implement:

- Main window.
- Chromium content view.
- One tab.
- Address input.
- Basic navigation.
- Secure renderer configuration.
- Minimal Browser Process communication.

## Phase 2 — Browser Foundation

Implement:

- Multiple tabs.
- Tab lifecycle.
- Browser controls.
- Session state.
- Internal new tab page.
- Settings foundation.
- Structured commands and events.

## Phase 3 — Core Data Modules

Implement:

- History.
- Downloads.
- Bookmarks.
- Permissions.
- Persistent settings.
- Recovery.

## Phase 4 — Product Identity

Implement:

- Patagonia Hub.
- Spaces.
- Privacy Center.
- Adaptive tabs.
- Patagonia Intelligence local commands.

## Phase 5 — Expansion

Implement:

- Extensions.
- Import.
- Update system.
- Diagnostics.
- Optional modules.

## Phase 6 — Advanced Services

Research and possibly implement:

- AI providers.
- Sync.
- Password management.
- Strong Space isolation.
- Advanced productivity modules.

---

# Architecture Acceptance Criteria

The architecture is being followed correctly when:

- Core navigation works without optional modules.
- UI components do not access privileged resources directly.
- Web renderers cannot call internal browser APIs.
- IPC messages are validated.
- Modules expose narrow interfaces.
- Domain logic can be tested without launching Chromium.
- Storage implementations can migrate safely.
- Settings have stable identifiers.
- Browser startup is not blocked by optional services.
- Failures in one module do not crash the entire browser.
- Private browsing data follows its retention rules.
- Security boundaries are documented and testable.
- New capabilities can be added without rewriting unrelated modules.

---

# Architectural Non-Goals

The initial architecture does not aim to:

- Build a new rendering engine.
- Replace Chromium networking.
- Replace Chromium JavaScript execution.
- Create a proprietary extension ecosystem.
- Require cloud services.
- Implement every future feature.
- Support every operating system immediately.
- Create a distributed microservice architecture.
- Add abstraction where no real boundary exists.

Patagonia Browser is a desktop application.

It should not imitate server-side architecture unnecessarily.

---

# Architecture Review Questions

Before approving an architectural change, ask:

- Which layer owns this responsibility?
- Does this change cross a security boundary?
- Is the dependency direction correct?
- Can this component be tested independently?
- Does it expose more capability than necessary?
- Does it create a global dependency?
- Can the implementation be replaced later?
- What data does it read, write or transmit?
- What happens when it fails?
- Does it affect startup performance?
- Does it weaken Chromium isolation?
- Does it preserve private browsing rules?
- Does it require a new architecture decision record?

---

# Final Principle

Patagonia Browser should have a small trusted core and a clear modular structure.

Every layer must understand its responsibility.

Every process must understand its privilege.

Every module must understand its boundaries.

Every feature must integrate without weakening the whole system.

---

> “Good architecture does not predict every future feature. It creates safe places for future features to exist.”

— Patagonia Labs
