# 🏔 Patagonia Browser

# API_DESIGN.md

**Document Version:** 1.0  
**Status:** Proposed Internal API Specification  
**Current Target:** Alpha 0.1  
**Owner:** Patagonia Labs  
**Last Updated:** July 2026

> [!IMPORTANT]
> This document defines the intended internal API architecture of Patagonia Browser.
> Some APIs described here may not yet exist in the current development version.
> Contracts become authoritative only after they are implemented, tested and included
> in an official project release.

---

## 1. Purpose

This document defines how the internal parts of Patagonia Browser communicate.

It establishes the official conventions for:

- Electron Main Process APIs
- Renderer-to-Main communication
- Secure IPC channels
- Preload bridge APIs
- Request and response contracts
- Events and subscriptions
- Error handling
- Input validation
- API versioning
- Service boundaries
- Testing and documentation

The objective is to prevent direct, unstructured or insecure communication between application layers.

---

## 2. Scope

This specification applies to all internal APIs used by:

- Main Process
- Preload scripts
- Renderer Process
- Browser services
- Feature modules
- Internal browser pages
- Storage adapters
- Security services
- Future extension and AI subsystems

This document does not define public web APIs exposed to websites.

Patagonia Browser must not expose privileged internal APIs to arbitrary web content.

---

## 3. API Design Goals

Every internal API must be:

- Explicit
- Typed
- Minimal
- Secure by default
- Easy to test
- Easy to audit
- Versionable
- Predictable
- Independent from UI implementation details
- Resistant to malformed or hostile input

---

## 4. Core Principles

### 4.1 Least Privilege

Every API exposes only the minimum capability required by its caller.

A renderer component must never receive unrestricted access to:

- Node.js
- File system APIs
- Shell execution
- Native process control
- Electron internals
- Credentials
- Raw database connections

### 4.2 Explicit Contracts

All requests, responses, events and errors must use explicit TypeScript contracts.

Unstructured payloads are forbidden.

Bad:

```ts
ipcRenderer.invoke("action", data);
```

Good:

```ts
window.patagonia.navigation.navigate({
  tabId,
  input,
});
```

### 4.3 Validation at Trust Boundaries

TypeScript types do not validate runtime data.

Every payload crossing a process or trust boundary must be validated at runtime.

Validation is required in:

- Preload
- Main Process handlers
- Storage boundaries
- External provider adapters
- File import flows
- Extension boundaries
- AI provider boundaries

### 4.4 Secure Defaults

The default behavior must deny unsafe operations.

Examples:

- Unknown IPC channel: reject
- Unknown command: reject
- Invalid URL: reject
- Missing permission: reject
- Unsupported file path: reject
- Untrusted sender: reject
- Unexpected payload field: reject

### 4.5 No Business Logic in IPC Handlers

IPC handlers coordinate requests but do not contain substantial business logic.

Preferred flow:

```text
Renderer
   ↓
Preload API
   ↓
IPC Handler
   ↓
Application Service
   ↓
Core / Storage / Platform Adapter
```

### 4.6 Stable Domain Language

API names must use the same terminology as the product documentation.

Preferred terms:

- Tab
- Window
- Navigation
- Bookmark
- History
- Download
- Permission
- Space
- Session
- Setting

Avoid multiple names for the same concept.

---

## 5. High-Level Communication Model

```text
┌──────────────────────────────────────────────┐
│ Renderer Process                             │
│ React UI and internal browser pages          │
└──────────────────────┬───────────────────────┘
                       │ window.patagonia
                       ▼
┌──────────────────────────────────────────────┐
│ Preload Bridge                               │
│ Typed, minimal and validated API surface     │
└──────────────────────┬───────────────────────┘
                       │ secure IPC
                       ▼
┌──────────────────────────────────────────────┐
│ Main Process API Layer                       │
│ Channel registration and sender validation  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Application Services                         │
│ Navigation, tabs, settings, downloads, etc.  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Core / Storage / Platform Adapters           │
└──────────────────────────────────────────────┘
```

---

## 6. Process Responsibilities

### 6.1 Renderer Process

The Renderer Process may:

- Render UI
- Collect user input
- Display application state
- Request approved actions
- Subscribe to approved events
- Perform local presentation logic

The Renderer Process must not:

- Import Electron directly
- Access Node.js directly
- Open arbitrary files
- Execute shell commands
- Access SQLite directly
- Read environment variables
- Access secrets
- Create unrestricted network clients for privileged services

### 6.2 Preload Bridge

The preload layer is the only approved bridge between Renderer and Main.

It must:

- Use `contextBridge`
- Expose a narrow API
- Validate basic payload shape
- Hide raw IPC primitives
- Prevent arbitrary channel access
- Return typed promises
- Provide explicit unsubscribe functions
- Avoid exposing Electron objects

The preload layer must not expose:

```ts
ipcRenderer
ipcRenderer.send
ipcRenderer.invoke
require
process
Buffer
fs
shell
```

### 6.3 Main Process

The Main Process owns:

- Browser windows
- Web contents
- Native dialogs
- Navigation control
- Downloads
- Permissions
- Session management
- Secure storage access
- Application lifecycle
- Updates
- Native integrations

The Main Process must validate:

- Sender identity
- Sender origin
- Window ownership
- Tab ownership
- Payload schema
- Requested capability
- Current application state

### 6.4 Services

Services implement application use cases.

Examples:

- `NavigationService`
- `TabService`
- `BookmarkService`
- `HistoryService`
- `DownloadService`
- `PermissionService`
- `SettingsService`
- `SessionService`
- `UpdateService`

Services should remain independent from IPC whenever possible.

---

## 7. API Surface

The Renderer receives one global API namespace:

```ts
window.patagonia
```

Example:

```ts
interface PatagoniaAPI {
  app: AppAPI;
  windows: WindowAPI;
  tabs: TabsAPI;
  navigation: NavigationAPI;
  bookmarks: BookmarksAPI;
  history: HistoryAPI;
  downloads: DownloadsAPI;
  permissions: PermissionsAPI;
  settings: SettingsAPI;
  sessions: SessionsAPI;
}
```

Future modules may be added through architectural review.

---

## 8. Global Type Declaration

```ts
declare global {
  interface Window {
    patagonia: PatagoniaAPI;
  }
}
```

The declaration must be generated or imported from the same source contracts used by the preload implementation.

Duplicated contract definitions are forbidden.

---

## 9. API Naming Conventions

### 9.1 Namespaces

Use plural resource names when managing collections:

```ts
tabs
bookmarks
downloads
permissions
settings
```

Use singular names for application-level capabilities:

```ts
app
navigation
```

### 9.2 Methods

Use action-oriented camelCase names:

```ts
createTab()
closeTab()
navigate()
reload()
getSettings()
updateSettings()
```

Avoid vague names:

```ts
doAction()
handle()
process()
run()
manage()
```

### 9.3 Queries and Commands

Queries read state without changing it:

```ts
getTab()
listTabs()
getSettings()
listBookmarks()
```

Commands change state:

```ts
createTab()
closeTab()
updateSettings()
removeBookmark()
```

A query must not produce hidden persistent side effects.

### 9.4 Events

Events use past-tense names because they describe something that already occurred:

```ts
tabCreated
tabClosed
navigationStarted
navigationCompleted
downloadUpdated
permissionChanged
```

---

## 10. IPC Channel Naming

Internal IPC channels follow this format:

```text
patagonia:<domain>:<action>:v<major>
```

Examples:

```text
patagonia:tabs:create:v1
patagonia:tabs:close:v1
patagonia:navigation:navigate:v1
patagonia:settings:get:v1
patagonia:settings:update:v1
```

Event channels follow:

```text
patagonia:event:<domain>:<event>:v<major>
```

Raw channel strings should be centralized as constants.

---

## 11. Channel Registry

```ts
export const IPC_CHANNELS = {
  tabs: {
    create: "patagonia:tabs:create:v1",
    close: "patagonia:tabs:close:v1",
    list: "patagonia:tabs:list:v1",
  },
  navigation: {
    navigate: "patagonia:navigation:navigate:v1",
    reload: "patagonia:navigation:reload:v1",
    stop: "patagonia:navigation:stop:v1",
  },
} as const;
```

Channel strings must not be scattered throughout the codebase.

---

## 12. Request and Response Pattern

Most Renderer-to-Main calls use request/response semantics through `invoke`.

```text
Request
   ↓
Validation
   ↓
Authorization
   ↓
Service execution
   ↓
Response mapping
   ↓
Typed result
```

---

## 13. Standard API Result

Expected domain failures should use a typed result.

```ts
export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };
```

Example:

```ts
const result = await window.patagonia.tabs.close({ tabId });

if (!result.ok) {
  showError(result.error.message);
  return;
}
```

---

## 14. Standard API Error

```ts
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, string | number | boolean>;
}
```

Approved error codes:

```ts
export type ApiErrorCode =
  | "INVALID_ARGUMENT"
  | "INVALID_URL"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "UNSUPPORTED_OPERATION"
  | "RESOURCE_UNAVAILABLE"
  | "TIMEOUT"
  | "CANCELLED"
  | "SECURITY_VIOLATION"
  | "INTERNAL_ERROR";
```

Sensitive implementation details must not be returned to the Renderer.

---

## 15. Error Rules

APIs must:

- Return predictable error codes
- Include user-safe messages
- Mark recoverability
- Log internal diagnostic context
- Avoid leaking paths, tokens, SQL or stack traces
- Preserve correlation identifiers internally where useful

APIs must not return:

- Raw exceptions
- Database errors
- Native stack traces
- Environment variables
- File system internals
- Secret values

---

## 16. Runtime Validation

Every incoming request must be validated with an approved schema validator or equivalent explicit validation.

Conceptual example:

```ts
const NavigateRequestSchema = schema.object({
  tabId: schema.string().min(1),
  input: schema.string().min(1).max(8192),
});
```

Validation must reject:

- Unknown properties when practical
- Missing required fields
- Incorrect types
- Oversized input
- Invalid identifiers
- Unsupported protocols
- Malformed URLs

---

## 17. Sender Validation

Every privileged IPC handler must verify the sender.

Checks may include:

- Sender belongs to a registered application window
- Sender is an approved internal UI origin
- Sender owns the target tab or window
- Sender is not arbitrary website content
- Web contents have not been destroyed
- Request matches the active profile or Space

Sender validation must occur before executing the service.

---

## 18. Navigation API

```ts
export interface NavigationAPI {
  navigate(
    request: NavigateRequest,
  ): Promise<ApiResult<NavigationSnapshot>>;

  goBack(
    request: TabTargetRequest,
  ): Promise<ApiResult<NavigationSnapshot>>;

  goForward(
    request: TabTargetRequest,
  ): Promise<ApiResult<NavigationSnapshot>>;

  reload(
    request: ReloadRequest,
  ): Promise<ApiResult<void>>;

  stop(
    request: TabTargetRequest,
  ): Promise<ApiResult<void>>;

  onStateChanged(
    listener: (event: NavigationStateChangedEvent) => void,
  ): Unsubscribe;
}
```

### 18.1 Navigate Request

```ts
export interface NavigateRequest {
  tabId: string;
  input: string;
  disposition?: "current-tab" | "new-tab";
}
```

The `input` may be:

- A valid supported URL
- A search query
- An internal browser URL

The Main Process or navigation service decides how to interpret it.

### 18.2 Navigation Snapshot

```ts
export interface NavigationSnapshot {
  tabId: string;
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  securityState: SecurityState;
}
```

### 18.3 Supported Protocols

Initial supported protocols:

- `https:`
- `http:`
- Approved internal Patagonia schemes

Protocols such as the following must be denied or explicitly confirmed:

- `file:`
- `javascript:`
- `data:`
- `vbscript:`
- Unknown custom protocols

---

## 19. Tabs API

```ts
export interface TabsAPI {
  create(
    request: CreateTabRequest,
  ): Promise<ApiResult<TabSnapshot>>;

  close(
    request: CloseTabRequest,
  ): Promise<ApiResult<void>>;

  activate(
    request: ActivateTabRequest,
  ): Promise<ApiResult<TabSnapshot>>;

  duplicate(
    request: TabTargetRequest,
  ): Promise<ApiResult<TabSnapshot>>;

  list(
    request?: ListTabsRequest,
  ): Promise<ApiResult<TabSnapshot[]>>;

  onCreated(listener: (event: TabCreatedEvent) => void): Unsubscribe;
  onUpdated(listener: (event: TabUpdatedEvent) => void): Unsubscribe;
  onClosed(listener: (event: TabClosedEvent) => void): Unsubscribe;
}
```

### 19.1 Tab Snapshot

```ts
export interface TabSnapshot {
  id: string;
  windowId: string;
  title: string;
  url: string;
  faviconUrl?: string;
  active: boolean;
  pinned: boolean;
  loading: boolean;
  audible: boolean;
  muted: boolean;
}
```

Snapshots are immutable data representations.

Renderer code must not receive direct references to Main Process objects.

---

## 20. Window API

```ts
export interface WindowAPI {
  minimize(): Promise<ApiResult<void>>;
  maximize(): Promise<ApiResult<void>>;
  restore(): Promise<ApiResult<void>>;
  close(): Promise<ApiResult<void>>;
  getState(): Promise<ApiResult<WindowStateSnapshot>>;
  onStateChanged(
    listener: (event: WindowStateChangedEvent) => void,
  ): Unsubscribe;
}
```

The Renderer must not receive a raw `BrowserWindow` object.

---

## 21. Settings API

```ts
export interface SettingsAPI {
  get(): Promise<ApiResult<PublicSettings>>;
  update(
    request: UpdateSettingsRequest,
  ): Promise<ApiResult<PublicSettings>>;
  reset(
    request: ResetSettingsRequest,
  ): Promise<ApiResult<PublicSettings>>;
  onChanged(
    listener: (event: SettingsChangedEvent) => void,
  ): Unsubscribe;
}
```

Only renderer-safe settings may be exposed.

Secrets and native paths must not be part of `PublicSettings`.

---

## 22. Bookmarks API

```ts
export interface BookmarksAPI {
  create(
    request: CreateBookmarkRequest,
  ): Promise<ApiResult<Bookmark>>;
  update(
    request: UpdateBookmarkRequest,
  ): Promise<ApiResult<Bookmark>>;
  remove(
    request: RemoveBookmarkRequest,
  ): Promise<ApiResult<void>>;
  list(
    request?: ListBookmarksRequest,
  ): Promise<ApiResult<Bookmark[]>>;
  search(
    request: SearchBookmarksRequest,
  ): Promise<ApiResult<Bookmark[]>>;
}
```

---

## 23. History API

```ts
export interface HistoryAPI {
  list(
    request: ListHistoryRequest,
  ): Promise<ApiResult<HistoryEntry[]>>;
  search(
    request: SearchHistoryRequest,
  ): Promise<ApiResult<HistoryEntry[]>>;
  remove(
    request: RemoveHistoryRequest,
  ): Promise<ApiResult<void>>;
  clear(
    request: ClearHistoryRequest,
  ): Promise<ApiResult<void>>;
}
```

Private browsing activity must not be returned by the normal history API.

---

## 24. Downloads API

```ts
export interface DownloadsAPI {
  list(): Promise<ApiResult<DownloadSnapshot[]>>;
  pause(request: DownloadTargetRequest): Promise<ApiResult<void>>;
  resume(request: DownloadTargetRequest): Promise<ApiResult<void>>;
  cancel(request: DownloadTargetRequest): Promise<ApiResult<void>>;
  openFile(request: DownloadTargetRequest): Promise<ApiResult<void>>;
  showInFolder(request: DownloadTargetRequest): Promise<ApiResult<void>>;
  onUpdated(
    listener: (event: DownloadUpdatedEvent) => void,
  ): Unsubscribe;
}
```

File-opening operations require security checks.

The Renderer must submit a known download identifier, not an arbitrary path.

---

## 25. Permissions API

```ts
export interface PermissionsAPI {
  listForOrigin(
    request: ListPermissionsRequest,
  ): Promise<ApiResult<OriginPermission[]>>;
  update(
    request: UpdatePermissionRequest,
  ): Promise<ApiResult<OriginPermission>>;
  resetForOrigin(
    request: ResetOriginPermissionsRequest,
  ): Promise<ApiResult<void>>;
  onChanged(
    listener: (event: PermissionChangedEvent) => void,
  ): Unsubscribe;
}
```

Supported permission decisions:

```ts
export type PermissionDecision = "allow" | "block" | "ask";
```

Permission updates must validate origin, permission type and profile scope.

---

## 26. Sessions API

```ts
export interface SessionsAPI {
  getCurrent(): Promise<ApiResult<SessionSnapshot>>;
  restoreLast(): Promise<ApiResult<SessionSnapshot>>;
  clearSaved(): Promise<ApiResult<void>>;
}
```

Session APIs must respect:

- Private browsing
- Spaces
- Profile boundaries
- Recovery mode
- Safe Mode

---

## 27. Application API

```ts
export interface AppAPI {
  getInfo(): Promise<ApiResult<AppInfo>>;
  requestQuit(): Promise<ApiResult<void>>;
  requestRestart(): Promise<ApiResult<void>>;
  checkForUpdates(): Promise<ApiResult<UpdateStatus>>;
}
```

```ts
export interface AppInfo {
  name: string;
  version: string;
  channel: "development" | "alpha" | "beta" | "stable";
  platform: "windows" | "linux" | "macos";
}
```

---

## 28. Event Subscription Model

Subscriptions return an unsubscribe function.

```ts
export type Unsubscribe = () => void;
```

Example:

```ts
const unsubscribe = window.patagonia.tabs.onUpdated((event) => {
  updateTab(event.tab);
});

unsubscribe();
```

The preload implementation must wrap listeners so the Renderer cannot remove unrelated listeners.

---

## 29. Event Envelope

```ts
export interface ApiEvent<TType extends string, TPayload> {
  type: TType;
  timestamp: string;
  payload: TPayload;
}
```

Example:

```ts
export type TabUpdatedEvent = ApiEvent<
  "tabUpdated",
  {
    tab: TabSnapshot;
    changedFields: Array<keyof TabSnapshot>;
  }
>;
```

---

## 30. Event Rules

Events must:

- Represent completed state changes
- Carry serializable data only
- Be scoped to the correct window or profile
- Avoid sending unnecessary sensitive state
- Be safe to receive multiple times when possible
- Include enough data to update the UI deterministically

Events must not:

- Carry Electron objects
- Carry functions
- Expose raw exceptions
- Expose database rows directly
- Broadcast private data globally

---

## 31. Serialization

IPC payloads must use structured-clone-compatible values.

Approved:

- Strings
- Numbers
- Booleans
- Null
- Arrays
- Plain objects
- Serialized dates as ISO strings

Avoid:

- Class instances
- Functions
- DOM nodes
- Electron objects
- Streams
- Circular structures
- Large binary payloads

Large files must use controlled file handles or Main Process-managed operations.

---

## 32. Preload Implementation Pattern

```ts
const api: PatagoniaAPI = {
  tabs: {
    create: async (request) => {
      const validated = CreateTabRequestSchema.parse(request);

      return ipcRenderer.invoke(
        IPC_CHANNELS.tabs.create,
        validated,
      );
    },

    onUpdated: (listener) => {
      const wrappedListener = (
        _event: Electron.IpcRendererEvent,
        payload: TabUpdatedEvent,
      ): void => {
        listener(payload);
      };

      ipcRenderer.on(
        IPC_CHANNELS.events.tabs.updated,
        wrappedListener,
      );

      return () => {
        ipcRenderer.removeListener(
          IPC_CHANNELS.events.tabs.updated,
          wrappedListener,
        );
      };
    },
  },
};
```

The actual implementation must not expose `ipcRenderer`.

---

## 33. Main Handler Pattern

```ts
ipcMain.handle(
  IPC_CHANNELS.tabs.create,
  async (event, payload): Promise<ApiResult<TabSnapshot>> => {
    try {
      senderValidator.assertTrusted(event.sender);

      const request = CreateTabRequestSchema.parse(payload);

      const tab = await tabService.create({
        ownerWebContentsId: event.sender.id,
        ...request,
      });

      return {
        ok: true,
        data: tabMapper.toSnapshot(tab),
      };
    } catch (error: unknown) {
      return apiErrorMapper.fromUnknown(error);
    }
  },
);
```

---

## 34. Handler Registration

All handlers must be registered in dedicated modules.

```text
src/main/api/
├── registerApiHandlers.ts
├── tabs/
│   ├── registerTabsHandlers.ts
│   └── tabsSchemas.ts
├── navigation/
│   ├── registerNavigationHandlers.ts
│   └── navigationSchemas.ts
└── settings/
    ├── registerSettingsHandlers.ts
    └── settingsSchemas.ts
```

Handlers must not be registered from random feature files.

---

## 35. Contract Organization

```text
src/shared/api/
├── index.ts
├── apiResult.ts
├── apiError.ts
├── channels.ts
├── events.ts
├── app/
├── tabs/
├── navigation/
├── bookmarks/
├── history/
├── downloads/
├── permissions/
├── settings/
└── sessions/
```

Contracts must remain independent from Electron-specific types.

---

## 36. Service Interface Pattern

```ts
export interface TabService {
  create(command: CreateTabCommand): Promise<Tab>;
  close(command: CloseTabCommand): Promise<void>;
  activate(command: ActivateTabCommand): Promise<Tab>;
  list(query: ListTabsQuery): Promise<readonly Tab[]>;
}
```

Services use domain commands and queries.

IPC request types should not automatically become domain models.

---

## 37. DTO Mapping

```text
Domain Model
   ↓
Mapper
   ↓
Renderer-safe DTO
```

Reasons:

- Prevent accidental data leakage
- Preserve API stability
- Separate internal implementation
- Control serialization
- Support versioning

---

## 38. Internal Page APIs

Internal browser pages may use specialized APIs.

Examples:

- `patagonia://settings`
- `patagonia://history`
- `patagonia://downloads`
- `patagonia://privacy`

Each internal page receives only the capabilities it needs.

A settings page should not automatically receive download file access.

---

## 39. Web Content Isolation

Normal websites must never have access to:

```ts
window.patagonia
```

The browser UI and web content must run in separate security contexts.

Internal APIs must only be exposed to trusted application UI origins.

---

## 40. File and External Protocol APIs

Renderer code must not request arbitrary path access or execute arbitrary protocols.

Use constrained operations based on identifiers and explicit user intent.

Bad:

```ts
readFile(path: string)
openExternal(url: string)
```

Preferred:

```ts
openDownloadedFile({ downloadId })
requestExternalProtocol({ url, sourceTabId })
```

The Main Process must validate protocol, origin, ownership and user confirmation requirements.

---

## 41. Secret and Credential APIs

Secrets must not be returned directly to the Renderer.

Approved pattern:

```text
Renderer requests an operation
   ↓
Main retrieves secret
   ↓
Main performs operation
   ↓
Renderer receives safe result
```

Bad:

```ts
const apiKey = await window.patagonia.secrets.get("provider");
```

Preferred:

```ts
await window.patagonia.ai.testProviderConnection({ providerId });
```

---

## 42. AI and Extension Boundaries

Future AI APIs must be task-specific and must not expose raw provider credentials, unrestricted file access, shell access or unrelated browser data.

Future extension APIs must be separate from the trusted internal API.

Extensions must not receive `window.patagonia`.

A dedicated extension API must define:

- Permissions
- Capability grants
- Resource limits
- Event subscriptions
- Storage quotas
- Review requirements

---

## 43. API Versioning

IPC channels use major versions.

Example:

```text
patagonia:tabs:create:v1
```

Rules:

- Compatible additions may remain in the same major version
- Breaking changes require a new major version
- Old versions may coexist during migration
- Removed versions must be documented
- Renderer and Main versions must remain compatible within one application build

Breaking changes include:

- Renaming a method
- Removing a field
- Changing a field type
- Changing error semantics
- Changing permission behavior
- Changing event delivery assumptions
- Changing the meaning of an existing value

---

## 44. Deprecation Policy

Deprecated APIs must:

1. Be marked in TypeScript documentation
2. Include a replacement
3. Remain available for a defined migration period
4. Produce development warnings when appropriate
5. Be removed only in a planned breaking release

```ts
/**
 * @deprecated Use tabs.activate() instead.
 */
focusTab(request: FocusTabRequest): Promise<ApiResult<TabSnapshot>>;
```

---

## 45. Concurrency, Cancellation and Timeouts

APIs must define behavior for concurrent requests.

Examples:

- Two requests closing the same tab
- Navigation while a previous navigation is pending
- Settings updated from multiple windows
- Session restore during shutdown
- Download pause and cancel issued together

Long-running operations should support explicit cancellation where useful.

Remote or privileged operations must define reasonable timeouts and return:

```ts
code: "TIMEOUT"
```

Timeouts must not leave partial state without recovery handling.

---

## 46. Rate Limiting

Sensitive or expensive APIs may require rate limiting.

Candidates:

- Permission prompts
- Update checks
- External protocol requests
- AI requests
- Import operations
- Security scans
- Repeated file dialogs

Rate limits must be enforced in the trusted process.

---

## 47. Logging and Telemetry

API boundaries should log:

- Operation name
- Result status
- Duration
- Error code
- Correlation identifier
- Safe resource identifiers

Logs must not include:

- Passwords
- Tokens
- Cookies
- Full browsing history by default
- Private browsing data
- Sensitive page content
- Personal file contents

No API usage telemetry should be collected unless permitted by the telemetry policy and user controls.

---

## 48. Performance Requirements

Avoid:

- Repeated full-state transfers
- Large history payloads
- Full tab-list broadcasts for one title change
- Database queries on every render
- Large serialized objects
- Blocking synchronous IPC

Synchronous IPC is forbidden for normal application features.

---

## 49. Pagination

List APIs must support pagination when data may grow significantly.

```ts
export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor?: string;
}
```

Recommended initial maximum:

```ts
limit <= 100
```

History, bookmarks and downloads should not return unbounded collections.

---

## 50. API Documentation Requirements

Every API method must document:

- Purpose
- Caller
- Required permission
- Request type
- Response type
- Error codes
- Side effects
- Security considerations
- Event emissions
- Version introduced

---

## 51. Testing Strategy

### 51.1 Contract Tests

Verify:

- Request schemas
- Response schemas
- Error formats
- Event formats
- Serialization
- Version compatibility

### 51.2 Handler Tests

Verify:

- Valid requests
- Invalid payload rejection
- Sender rejection
- Permission denial
- Service integration
- Error mapping

### 51.3 Preload Tests

Verify:

- Only approved APIs are exposed
- Raw IPC is hidden
- Listener cleanup works
- Payloads are validated
- Unknown methods are unavailable

### 51.4 Security Tests

Required negative cases:

- Arbitrary channel invocation
- Malformed payload
- Oversized payload
- Untrusted sender
- Website attempting to access internal API
- Invalid URL scheme
- Path traversal
- Cross-window tab access
- Cross-Space access
- Secret extraction attempt

---

## 52. API Review Checklist

Before approving a new API:

- Is the capability necessary?
- Can the request be narrower?
- Is the caller trusted?
- Is runtime validation present?
- Is sender validation present?
- Are permissions checked?
- Does the response expose sensitive data?
- Are errors safe?
- Is the method testable?
- Does it preserve architecture boundaries?
- Is versioning considered?
- Is documentation complete?

---

## 53. Forbidden API Designs

The following patterns are forbidden:

### Generic command execution

```ts
execute(command: string, args: unknown[])
```

### Arbitrary IPC access

```ts
invoke(channel: string, payload: unknown)
```

### Arbitrary file access

```ts
readFile(path: string)
```

### Raw database queries

```ts
query(sql: string)
```

### Raw shell execution

```ts
runShell(command: string)
```

### Secret retrieval

```ts
getSecret(name: string)
```

Every capability must have a narrow, explicit method.

---

## 54. Alpha 0.1 API Scope

The first Alpha should implement only the APIs required for basic browsing.

Required:

- `app.getInfo`
- `app.requestQuit`
- `windows.minimize`
- `windows.maximize`
- `windows.restore`
- `windows.close`
- `windows.getState`
- `tabs.create`
- `tabs.close`
- `tabs.activate`
- `tabs.list`
- `navigation.navigate`
- `navigation.goBack`
- `navigation.goForward`
- `navigation.reload`
- `navigation.stop`
- Essential tab and navigation events

Deferred:

- Bookmarks
- History management
- Downloads management
- Permissions UI
- Settings persistence beyond essentials
- Sessions
- Spaces
- Extensions
- AI
- Updates

---

## 55. Alpha 0.1 Exit Criteria

The internal API layer is ready for Alpha 0.1 when:

- No Renderer code imports Electron
- No raw IPC object is exposed
- Every channel is registered centrally
- Every request has runtime validation
- Every privileged handler validates the sender
- Every response follows `ApiResult`
- Website content cannot access internal APIs
- Navigation schemes are validated
- Tab ownership rules are enforced
- API contract tests pass
- Negative security tests pass
- API documentation matches implementation

---

## 56. Future API Domains

Potential future namespaces:

```ts
window.patagonia.privacy
window.patagonia.spaces
window.patagonia.ai
window.patagonia.updates
window.patagonia.imports
window.patagonia.extensions
window.patagonia.devtools
```

These namespaces are reserved conceptually.

They must not be introduced without implementation requirements and security review.

---

## 57. Repository Placement

Recommended files:

```text
src/
├── preload/
│   ├── index.ts
│   └── api/
├── main/
│   └── api/
├── shared/
│   └── api/
├── services/
└── security/
    └── ipc/
```

Recommended documentation location:

```text
docs/architecture/API_DESIGN.md
```

---

## 58. Decision Authority

Changes to this API design require review when they affect:

- Trust boundaries
- IPC exposure
- Renderer privileges
- Secret handling
- File access
- Navigation behavior
- Extension capabilities
- AI capabilities
- Public compatibility
- Major API versions

Major decisions should be recorded in an Architecture Decision Record.

---

## 59. Final API Principles

Patagonia Browser internal APIs must always follow these rules:

1. Expose capabilities, not infrastructure.
2. Validate every trust-boundary input.
3. Keep the Renderer unprivileged.
4. Never expose raw IPC.
5. Never expose secrets.
6. Return stable typed results.
7. Use narrow domain-specific methods.
8. Separate handlers from business logic.
9. Map domain objects to safe DTOs.
10. Version breaking changes.
11. Test negative security cases.
12. Prefer a smaller API surface.

---

## 60. Closing Statement

A secure internal API is not merely a communication mechanism.

It is the boundary that protects the browser UI, the operating system, user data and future features from unintended privilege.

Patagonia Browser must treat every API method as a controlled capability.

> “A good API makes the correct operation easy, the unsafe operation difficult, and the forbidden operation impossible.”
>
> — Patagonia Labs
