# 🏔 Patagonia Browser

# API_ERROR.md

**Document Version:** 1.0  
**Status:** Official Error Contract Specification  
**Owner:** Patagonia Labs  
**Last Updated:** July 2026

---

## 1. Purpose

This document defines the official error model used by the internal APIs of Patagonia Browser.

The objective is to ensure that all failures crossing application boundaries are:

- Typed
- Predictable
- Safe to display
- Easy to log
- Easy to test
- Compatible with future API versions
- Free from sensitive implementation details

This specification applies to:

- Renderer-to-Main API calls
- Preload bridge methods
- Main Process handlers
- Application services
- Storage services
- Native integrations
- Import flows
- Extension boundaries
- AI provider boundaries
- Update services

---

## 2. Core Principle

Errors exposed through internal APIs must describe the failure without exposing privileged implementation details.

The Renderer should receive enough information to:

- Inform the user
- Decide whether recovery is possible
- Retry when appropriate
- Request another action
- Associate the failure with diagnostic logs

The Renderer must not receive:

- Stack traces
- SQL statements
- File system internals
- Environment variables
- Tokens
- Cookies
- Secrets
- Native exception objects
- Raw Electron errors
- Raw provider responses
- Internal process paths

---

## 3. Standard API Result

All request-and-response APIs use the following result contract:

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
const result = await window.patagonia.tabs.close({
  tabId,
});

if (!result.ok) {
  showApiError(result.error);
  return;
}

updateTabs(result.data);
```

Expected domain failures must return `ApiResult`.

Unexpected programmer errors may be caught at the API boundary and converted into a safe `ApiError`.

---

## 4. ApiError Contract

```ts
export interface ApiError {
  /**
   * Stable machine-readable error identifier.
   */
  code: ApiErrorCode;

  /**
   * Safe user-facing or UI-facing explanation.
   */
  message: string;

  /**
   * Indicates whether the caller may reasonably retry
   * or recover through another user action.
   */
  recoverable: boolean;

  /**
   * Optional identifier used to associate a user-visible
   * failure with internal diagnostic logs.
   */
  correlationId?: string;

  /**
   * Optional safe structured metadata.
   *
   * Sensitive values, stack traces and internal objects
   * are forbidden.
   */
  details?: Record<
    string,
    string | number | boolean
  >;
}
```

---

## 5. Why `correlationId` Exists

The optional `correlationId` allows a user-visible failure to be associated with internal diagnostic logs without exposing sensitive implementation details.

Example shown to the user:

```text
The download could not be completed.

Reference: API-7H2K91
```

Associated internal log:

```text
correlationId=API-7H2K91
operation=downloads.start
errorCode=RESOURCE_UNAVAILABLE
durationMs=142
```

The correlation identifier must not encode:

- User identity
- File paths
- URLs
- Secrets
- Timestamps that reveal private activity
- Database identifiers
- Browsing history

Recommended format:

```text
API-7H2K91
```

The format should be short enough for users to copy and communicate.

---

## 6. Error Codes

```ts
export type ApiErrorCode =
  | "INVALID_ARGUMENT"
  | "INVALID_URL"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "UNAUTHORIZED_CALLER"
  | "CONFLICT"
  | "ALREADY_EXISTS"
  | "UNSUPPORTED_OPERATION"
  | "RESOURCE_UNAVAILABLE"
  | "TIMEOUT"
  | "CANCELLED"
  | "RATE_LIMITED"
  | "STORAGE_ERROR"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";
```

Error codes are stable API values.

They must not be renamed casually.

---

## 7. Error Code Semantics

### `INVALID_ARGUMENT`

The request contains a value that is syntactically valid but semantically unacceptable.

Examples:

- Empty tab identifier
- Negative pagination limit
- Unsupported disposition
- Invalid setting value

Recommended recovery:

- Correct the input
- Do not retry unchanged

---

### `INVALID_URL`

The supplied URL or navigation input is unsafe, malformed or uses a forbidden protocol.

Examples:

- Invalid URL structure
- Unsupported protocol
- Blocked local file access
- Unsafe external protocol

Recommended recovery:

- Ask the user to correct the address
- Do not retry unchanged

---

### `VALIDATION_FAILED`

The request failed runtime schema validation.

Examples:

- Missing required field
- Unexpected field
- Wrong field type
- Oversized string
- Invalid enum value

Recommended recovery:

- Treat as a caller or compatibility problem
- Do not retry unchanged

---

### `NOT_FOUND`

The requested resource does not exist or is no longer available.

Examples:

- Unknown tab
- Missing bookmark
- Deleted download record
- Unknown settings profile

Recommended recovery:

- Refresh local state
- Inform the user
- Avoid repeated retries

---

### `PERMISSION_DENIED`

The caller is known but lacks the required capability or permission.

Examples:

- Access to a blocked browser capability
- File action without user approval
- Restricted settings operation
- Site permission denied

Recommended recovery:

- Request permission when appropriate
- Explain the denied capability

---

### `UNAUTHORIZED_CALLER`

The sender is not allowed to invoke the API.

Examples:

- Untrusted web content
- Unknown window
- Cross-window access
- Cross-Space access
- Invalid sender origin

Recommended recovery:

- None for the caller
- Log as a security event
- Never expose internal validation details

---

### `CONFLICT`

The operation conflicts with the current application state.

Examples:

- Closing a tab already being closed
- Updating stale settings
- Activating a destroyed tab
- Restoring a session during shutdown

Recommended recovery:

- Refresh state
- Retry only after state synchronization

---

### `ALREADY_EXISTS`

The requested resource already exists.

Examples:

- Duplicate bookmark
- Duplicate label
- Duplicate profile name

Recommended recovery:

- Reuse the existing resource
- Ask the user to choose another value

---

### `UNSUPPORTED_OPERATION`

The capability is recognized but unavailable in the current context, platform or release.

Examples:

- Feature not implemented in Alpha
- Unsupported platform integration
- Operation unavailable in private mode

Recommended recovery:

- Disable the action in the UI
- Explain the limitation

---

### `RESOURCE_UNAVAILABLE`

A required service or resource is temporarily unavailable.

Examples:

- Native integration unavailable
- Download destination inaccessible
- Update service unavailable
- Storage temporarily locked

Recommended recovery:

- Retry when appropriate
- Offer an alternative action

---

### `TIMEOUT`

The operation did not complete within its defined time limit.

Examples:

- External provider timeout
- Update check timeout
- Slow native operation
- AI request timeout

Recommended recovery:

- Retry may be offered
- Preserve consistent state
- Do not leave partial operations unmanaged

---

### `CANCELLED`

The operation was intentionally cancelled.

Examples:

- User cancels file selection
- Download cancelled
- Navigation aborted
- Long-running operation stopped

Recommended recovery:

- Usually no error UI is required
- Restore the previous stable state

---

### `RATE_LIMITED`

The operation exceeded an allowed request rate.

Examples:

- Repeated permission prompts
- Excessive update checks
- Repeated external protocol requests
- Repeated AI calls

Recommended recovery:

- Delay retry
- Show a calm, non-technical message

---

### `STORAGE_ERROR`

A persistence operation failed.

Examples:

- SQLite write failure
- Migration failure
- Corrupt stored record
- Transaction rollback

Recommended recovery:

- Retry only when safe
- Preserve user data
- Log detailed diagnostics internally

---

### `NETWORK_ERROR`

A network operation failed before a valid response was received.

Examples:

- DNS failure
- Connection failure
- TLS failure
- Offline state

Recommended recovery:

- Retry when connectivity returns
- Preserve user input

---

### `INTERNAL_ERROR`

An unexpected failure occurred.

This is a fallback code.

It must not be used when a more specific error code is available.

Recommended recovery:

- Show a generic message
- Include a correlation identifier
- Log the original failure internally
- Avoid exposing implementation details

---

## 8. Error Creation

Errors should be created through a central factory.

```ts
export interface CreateApiErrorInput {
  code: ApiErrorCode;
  message: string;
  recoverable: boolean;
  correlationId?: string;
  details?: Record<string, string | number | boolean>;
}

export function createApiError(
  input: CreateApiErrorInput,
): ApiError {
  return {
    code: input.code,
    message: input.message,
    recoverable: input.recoverable,
    correlationId: input.correlationId,
    details: input.details,
  };
}
```

Central creation helps enforce:

- Safe messages
- Stable codes
- Consistent correlation identifiers
- Controlled details
- Uniform logging

---

## 9. Safe Error Mapping

Native and third-party errors must be mapped before crossing the API boundary.

Bad:

```ts
return {
  ok: false,
  error,
};
```

Good:

```ts
return {
  ok: false,
  error: mapDownloadError(error),
};
```

Example:

```ts
export function mapDownloadError(
  error: unknown,
): ApiError {
  const correlationId = createCorrelationId();

  logInternalError({
    correlationId,
    operation: "downloads.start",
    error,
  });

  return {
    code: "RESOURCE_UNAVAILABLE",
    message: "The download could not be started.",
    recoverable: true,
    correlationId,
  };
}
```

---

## 10. Validation Error Mapping

Raw Zod errors must not be returned directly.

```ts
const parsed =
  NavigateRequestSchema.safeParse(payload);

if (!parsed.success) {
  return {
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message: "The navigation request is invalid.",
      recoverable: false,
      details: {
        fieldCount: parsed.error.issues.length,
      },
    },
  };
}
```

Allowed validation details may include:

- Number of invalid fields
- Public field names
- Safe expected value categories

Forbidden validation details include:

- Raw payload values
- Secret fields
- Full imported content
- Private URLs
- File contents

---

## 11. User-Facing Messages

Messages must be:

- Clear
- Calm
- Brief
- Actionable when possible
- Free from internal jargon

Bad:

```text
SQLITE_BUSY: database is locked at Database.prepare
```

Good:

```text
The browser could not save the change right now.
Please try again.
```

Bad:

```text
ipc sender frame mismatch
```

Good:

```text
This action could not be completed.
```

Security failures should use intentionally limited messages.

---

## 12. Recoverability

The `recoverable` field indicates whether a reasonable user or application action may resolve the problem.

Set `recoverable: true` for cases such as:

- Temporary network failure
- Timeout
- Resource temporarily unavailable
- Retryable storage lock
- Rate limiting
- User-correctable input

Set `recoverable: false` for cases such as:

- Unauthorized caller
- Unsupported operation
- Invalid API contract
- Forbidden protocol
- Destroyed resource
- Internal invariant violation

`recoverable` does not mean automatic retry is always safe.

Retry policy must be defined separately.

---

## 13. Details Field

The optional `details` field contains safe, structured metadata.

Example:

```ts
details: {
  setting: "theme",
  expected: "light | dark | system",
}
```

Allowed value types:

```ts
string | number | boolean
```

Do not include:

- Nested arbitrary objects
- Arrays of private data
- Error instances
- Stack traces
- File contents
- Full URLs by default
- Tokens
- Cookies
- Passwords
- SQL
- Environment variables

---

## 14. Logging

Internal logs should include:

- Correlation identifier
- API operation
- Error code
- Duration
- Safe resource identifiers
- Process
- Application version
- Platform when relevant

Example:

```ts
logger.error({
  correlationId,
  operation: "tabs.close",
  code: "CONFLICT",
  durationMs: 18,
  tabId: safeTabReference,
});
```

Logs must not include:

- Passwords
- Tokens
- Cookies
- Personal file contents
- Full browsing history
- Private browsing data
- Sensitive page content
- Raw authentication headers

---

## 15. Event Errors

Events must not emit raw exception objects.

Preferred event contract:

```ts
export interface ApiFailureEvent {
  eventId: string;
  occurredAt: string;
  operation: string;
  error: ApiError;
}
```

Events should be used only when the failure is asynchronous and cannot be returned through the original request.

Examples:

- Download fails after starting
- Update installation fails later
- Background import fails
- Session restoration partially fails

---

## 16. HTTP and Provider Errors

External status codes must be mapped to internal error codes.

Example mapping:

| External condition | Internal code |
|---|---|
| Invalid provider request | `INVALID_ARGUMENT` |
| Authentication failure | `PERMISSION_DENIED` |
| Provider rate limit | `RATE_LIMITED` |
| Provider timeout | `TIMEOUT` |
| Provider unavailable | `RESOURCE_UNAVAILABLE` |
| Network connection failure | `NETWORK_ERROR` |
| Unknown provider failure | `INTERNAL_ERROR` |

Provider response bodies must not be forwarded directly to the Renderer.

---

## 17. Storage Errors

Storage adapters must classify failures.

Example:

```ts
export type StorageFailure =
  | "NOT_FOUND"
  | "CONFLICT"
  | "LOCKED"
  | "CORRUPT_DATA"
  | "MIGRATION_FAILED"
  | "UNKNOWN";
```

The API layer maps storage failures to `ApiErrorCode`.

Storage-specific implementation details remain internal.

---

## 18. Cancellation

Cancellation is not always an exceptional failure.

For user-initiated cancellation:

```ts
{
  code: "CANCELLED",
  message: "The operation was cancelled.",
  recoverable: true,
}
```

The UI may choose not to show an error notification for expected cancellation.

---

## 19. Retry Policy

Automatic retries are allowed only when:

- The operation is idempotent
- Duplicate effects are prevented
- Retry limits are defined
- Backoff is used when appropriate
- Cancellation remains possible

Do not automatically retry:

- Destructive actions
- Permission prompts
- External protocol launches
- Non-idempotent writes
- Operations with uncertain completion state

---

## 20. Versioning

The `ApiError` contract follows internal API versioning rules.

Non-breaking changes may include:

- Adding an optional field
- Adding a new error code when callers handle unknown codes safely
- Expanding documentation
- Improving safe messages without changing semantics

Breaking changes include:

- Removing a field
- Renaming a field
- Changing a field type
- Changing the meaning of `recoverable`
- Reusing an existing error code for a different meaning
- Making an optional field required

Breaking changes require a new major API version.

---

## 21. Unknown Error Codes

Renderer code must include a safe fallback.

```ts
function getErrorMessage(
  error: ApiError,
): string {
  switch (error.code) {
    case "INVALID_URL":
      return "The address is not valid.";

    case "NETWORK_ERROR":
      return "A network error occurred.";

    default:
      return error.message ||
        "The operation could not be completed.";
  }
}
```

The UI must not crash when receiving a newer error code.

---

## 22. Testing Requirements

Every API error path must test:

- Correct error code
- Safe message
- Recoverability value
- Correlation identifier behavior
- Safe details
- No secret leakage
- Unknown error fallback
- Serialization
- Version compatibility

Negative security tests must verify that errors do not expose:

- Stack traces
- Local paths
- SQL
- Tokens
- Cookies
- Environment variables
- Raw provider errors

---

## 23. Example: Navigation Error

```ts
export async function navigate(
  request: NavigateRequest,
): Promise<ApiResult<NavigationSnapshot>> {
  const parsed =
    NavigateRequestSchema.safeParse(request);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "The navigation request is invalid.",
        recoverable: false,
      },
    };
  }

  const normalized =
    normalizeNavigationInput(parsed.data.input);

  if (!normalized.ok) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        message: "The address cannot be opened.",
        recoverable: true,
      },
    };
  }

  return navigationService.navigate({
    ...parsed.data,
    input: normalized.value,
  });
}
```

---

## 24. Example: Unexpected Failure

```ts
export async function handleRequest<T>(
  operation: string,
  execute: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  try {
    return await execute();
  } catch (error) {
    const correlationId =
      createCorrelationId();

    logInternalError({
      operation,
      correlationId,
      error,
    });

    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          "The operation could not be completed.",
        recoverable: false,
        correlationId,
      },
    };
  }
}
```

---

## 25. Forbidden Patterns

### Returning raw errors

```ts
return {
  ok: false,
  error,
};
```

### Returning stack traces

```ts
details: {
  stack: error.stack,
}
```

### Returning raw SQL failures

```ts
message: databaseError.message
```

### Using vague codes everywhere

```ts
code: "INTERNAL_ERROR"
```

### Exposing sensitive request data

```ts
details: {
  token,
  password,
  cookie,
}
```

### Trusting provider messages

```ts
message: providerResponse.error.message
```

All external and native failures must be mapped.

---

## 26. Review Checklist

Before approving an error path:

- Is the error code specific?
- Is the message safe?
- Is the message understandable?
- Is `recoverable` accurate?
- Is retry behavior defined?
- Is a correlation identifier useful?
- Are details minimal?
- Could details reveal private data?
- Is the original failure logged internally?
- Does the UI handle unknown codes?
- Is the error covered by tests?
- Does it preserve the security model?

---

## 27. Final Rules

1. Never expose raw exceptions.
2. Use stable error codes.
3. Keep messages safe and understandable.
4. Use correlation identifiers for diagnostics.
5. Keep details minimal.
6. Never expose secrets.
7. Map native and provider failures.
8. Test negative security cases.
9. Preserve compatibility.
10. Prefer specific errors over `INTERNAL_ERROR`.

---

## 28. Closing Statement

Errors are part of the Patagonia Browser API contract.

A well-designed error model allows the browser to fail safely, inform users clearly and provide useful diagnostics without exposing privileged information.

Every failure crossing a trust boundary must be intentionally classified, safely mapped and consistently handled.

> “A secure error explains what the caller needs to know—and nothing the caller must not know.”
>
> — Patagonia Labs
