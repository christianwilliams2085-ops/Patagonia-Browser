# 🏔 Patagonia Browser

# CODING_STANDARDS.md

**Document Version:** 1.0  
**Status:** Official Coding Standard  
**Applies To:** All Contributors

---

# Purpose

This document defines the official coding standards for Patagonia Browser.

Every source file, module and feature must follow these rules to ensure:

- Consistency
- Maintainability
- Readability
- Security
- Scalability

Code quality is considered a feature.

---

# General Principles

Every line of code should be:

- Readable
- Predictable
- Testable
- Secure
- Simple
- Explicit

Code is written for humans first.

---

# Development Philosophy

Always prefer:

Readability > Cleverness

Maintainability > Shortness

Explicitness > Magic

Composition > Inheritance

Small modules > Large files

Simple solutions > Complex abstractions

---

# TypeScript Rules

Strict Mode is mandatory.

Never disable:

- strict
- noImplicitAny
- strictNullChecks

Avoid:

```ts
any
```

Prefer:

```ts
unknown
```

or explicit types.

---

# Typing

Every function must have explicit types.

Good

```ts
function navigate(url: string): Promise<void>
```

Bad

```ts
function navigate(url)
```

---

# Interfaces

Interfaces describe contracts.

Example

```ts
interface ITab {
    id: string;
    title: string;
    url: string;
}
```

Interfaces begin with:

I

---

# Types

Use:

type

for unions.

Example

```ts
type Theme = "light" | "dark";
```

---

# Enums

Only use enums when values are fixed.

Suffix:

Enum

Example

PermissionEnum

---

# Constants

Use

UPPER_CASE

Example

```ts
const DEFAULT_TIMEOUT = 3000;
```

---

# Variables

Use descriptive names.

Good

```ts
activeTab
```

Bad

```ts
a
```

---

# Functions

Functions should:

Do one thing.

Prefer:

20–40 lines.

Maximum:

80 lines.

Split large functions.

---

# Classes

Classes should remain small.

Prefer composition.

Avoid large inheritance trees.

---

# React Components

One responsibility.

One file.

Prefer:

Functional Components.

Never use Class Components.

---

# Hooks

Custom hooks begin with:

use

Example

```ts
useTabs()
```

Hooks contain logic.

UI belongs in components.

---

# Component Structure

Recommended order:

Imports

Types

Component

Hooks

Handlers

Render

Export

---

# File Size

Preferred

<300 lines

Maximum

500 lines

Refactor if larger.

---

# Folder Size

Avoid directories containing hundreds of files.

Group logically.

---

# Imports

Order:

Node

Third-party

Internal

Relative

Example

```ts
import fs from "fs";

import React from "react";

import { Tab } from "@/modules/tabs";

import "./styles.css";
```

---

# Dependency Rules

Renderer never imports Electron APIs directly.

Renderer communicates only through IPC.

Main Process never imports React.

---

# Async Code

Prefer

async / await

Avoid Promise chains.

Good

```ts
await downloadFile();
```

Bad

```ts
downloadFile()
.then(...)
.catch(...)
```

---

# Error Handling

Never ignore errors.

Always log meaningful information.

Bad

```ts
catch {}
```

Good

```ts
catch(error){
logger.error(error);
}
```

---

# Logging

Use structured logging.

Avoid:

console.log()

Except during temporary debugging.

---

# Comments

Comment:

Why

Not:

What

Bad

```ts
// increment i
i++;
```

Good

```ts
// Retry after temporary network failure.
```

---

# Security

Never:

Disable CSP

Trust user input

Execute arbitrary code

Store secrets in source code

Bypass IPC validation

---

# Input Validation

Validate:

URLs

Paths

Commands

Permissions

External data

Never trust input.

---

# Naming

Components

PascalCase

Example

BrowserToolbar.tsx

Functions

camelCase

Example

openTab()

Variables

camelCase

Example

currentSession

Interfaces

ITab

Services

NavigationService

Managers

TabManager

Controllers

BrowserController

Hooks

useHistory()

---

# Formatting

Use:

Prettier

No manual formatting.

---

# Linting

All code must pass ESLint.

Warnings should be resolved whenever possible.

---

# Testing

Every important feature should have:

Unit Tests

Integration Tests

Critical browser functionality should also include:

E2E Tests

---

# Performance

Avoid unnecessary renders.

Avoid duplicated work.

Prefer memoization only when justified.

Measure before optimizing.

---

# Accessibility

Every UI element must support:

Keyboard navigation

Focus management

ARIA labels where appropriate

High contrast themes

---

# Internationalization

Never hardcode user-visible strings inside components.

Future translations should be possible.

---

# Git

Commit messages follow Conventional Commits.

Examples

feat:

fix:

docs:

refactor:

test:

build:

---

# Pull Requests

Every Pull Request should:

Compile

Pass tests

Pass lint

Update documentation if needed

Include a clear description

---

# Code Reviews

Reviewers should evaluate:

Correctness

Security

Architecture

Performance

Readability

Maintainability

Documentation

---

# Definition of Good Code

Good code:

Is understandable without explanation.

Can be safely modified.

Has clear responsibilities.

Contains few surprises.

Fails safely.

Supports future growth.

---

# Final Principle

Write code that your future self—and every future contributor—will thank you for.

---

> "Clean code is not written once.
>
> It is continuously maintained."
>
> — Patagonia Labs
