# 🏔 Patagonia Browser

# USER_FLOWS.md

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Patagonia Labs  
**License:** MIT  
**Last Updated:** 2026-07-18

---

# User Flows

## Purpose

This document defines the primary user journeys within Patagonia Browser.

A User Flow describes every interaction from the user's perspective.

It answers one simple question:

> **"What happens from the moment the user decides to do something until the task is completed?"**

These flows ensure consistency across the entire browser.

---

# UX Philosophy

A good flow should feel:

- Natural
- Predictable
- Fast
- Calm
- Consistent
- Recoverable

Users should never wonder what to do next.

The interface should always guide them.

---

# User Flow Structure

Each flow contains:

- Goal
- Trigger
- Preconditions
- Main Flow
- Alternative Flow
- Failure Flow
- Success State
- UX Notes

---

# FLOW 001 — First Launch

**ID:** PB-UF-001

## Goal

Allow the user to start using Patagonia Browser in less than two minutes.

---

## Trigger

The browser is launched for the first time.

---

## Main Flow

1. Patagonia Browser opens.
2. Welcome screen appears.
3. User selects:
   - Theme
   - Tab Layout
4. Optional import assistant.
5. Optional Space creation.
6. Privacy summary.
7. Browser opens New Tab.

---

## Success

User reaches the browser ready to navigate.

---

## UX Notes

- No account required.
- No advertisements.
- Setup must be skippable.

---

# FLOW 002 — Open a Website

**ID:** PB-UF-002

## Goal

Navigate to any website.

---

## Main Flow

1. User clicks Address Bar.
2. Types URL or search.
3. Suggestions appear.
4. User presses Enter.
5. Loading indicator appears.
6. Website loads.
7. Trust Indicator updates.

---

## Failure

If loading fails:

- Friendly error page.
- Retry button.
- Diagnostic details available.

---

# FLOW 003 — Open a New Tab

**ID:** PB-UF-003

## Goal

Create another browsing context.

---

## Main Flow

User may:

- Press Ctrl+T
- Click "+"
- Use Patagonia Intelligence

Browser:

- Creates tab
- Focuses Address Bar
- Shows New Tab page

---

# FLOW 004 — Switch Tabs

**ID:** PB-UF-004

## Goal

Move between tabs quickly.

---

## Main Flow

User:

- Clicks tab

OR

- Ctrl+Tab

Browser:

- Activates tab
- Updates toolbar
- Updates security indicator
- Keeps scroll position

---

# FLOW 005 — Create a Space

**ID:** PB-UF-005

## Goal

Create a workspace.

---

## Main Flow

1. Open Patagonia Hub.
2. Open Spaces.
3. Click Create.
4. Choose:
   - Name
   - Icon
   - Accent
5. Save.

Browser:

Creates new Space.

Switches to it.

Shows empty workspace.

---

# FLOW 006 — Switch Space

**ID:** PB-UF-006

## Goal

Move to another workspace.

---

## Main Flow

1. Open Space Switcher.
2. Select Space.

Browser:

- Saves current session.
- Loads destination Space.
- Restores tabs.
- Updates interface.

---

# FLOW 007 — Bookmark a Page

**ID:** PB-UF-007

## Goal

Save current page.

---

## Main Flow

1. User clicks bookmark icon.
2. Browser asks:
   - Folder
   - Name
3. Save.

Toast:

Bookmark saved.

---

# FLOW 008 — Download File

**ID:** PB-UF-008

## Goal

Download content.

---

## Main Flow

1. User clicks download link.
2. Browser checks security.
3. Download begins.
4. Progress shown.
5. Notification appears.
6. User opens file.

---

## Alternative

Dangerous file.

Browser:

- Shows warning.
- Explains why.
- Lets user cancel.

---

# FLOW 009 — View History

**ID:** PB-UF-009

## Goal

Find previously visited page.

---

## Main Flow

1. Open History.
2. Search.
3. Select entry.

Browser:

Loads page.

---

# FLOW 010 — Clear Browsing Data

**ID:** PB-UF-010

## Goal

Delete selected data.

---

## Main Flow

1. Settings.
2. Privacy.
3. Clear Data.
4. Select:
   - Cookies
   - Cache
   - History
5. Confirm.

Browser:

Deletes selected data.

Shows confirmation.

---

# FLOW 011 — Open Privacy Center

**ID:** PB-UF-011

## Goal

Review browser privacy.

---

## Main Flow

User:

Clicks Privacy Center.

Browser:

Shows:

- Cookies
- Trackers
- DNS
- Permissions
- Fingerprinting
- Site Data

---

# FLOW 012 — Change Site Permission

**ID:** PB-UF-012

## Goal

Modify permissions.

---

## Main Flow

1. Open Trust Indicator.
2. Site Information.
3. Permissions.
4. Change Camera.

Browser:

Applies immediately.

---

# FLOW 013 — Restore Session

**ID:** PB-UF-013

## Goal

Recover previous work.

---

## Trigger

Unexpected shutdown.

---

## Main Flow

Browser starts.

Recovery dialog appears.

User chooses:

Restore Session

Browser restores:

Tabs

Spaces

Downloads

---

# FLOW 014 — Use Patagonia Intelligence

**ID:** PB-UF-014

## Goal

Execute browser command.

---

## Example

User types:

```
downloads
```

Browser:

Recognizes command.

Shows action.

User presses Enter.

Downloads panel opens.

---

# FLOW 015 — Search the Web

**ID:** PB-UF-015

## Goal

Search internet.

---

## Main Flow

User types:

```
best linux browser
```

Browser:

Displays suggestions.

Enter.

Search engine opens.

---

# FLOW 016 — Open Downloads

**ID:** PB-UF-016

User:

Hub

or

Ctrl+J

Browser:

Shows downloads.

---

# FLOW 017 — Install Extension

**ID:** PB-UF-017

Goal:

Add extension.

Flow:

Install

↓

Permission review

↓

Approve

↓

Installed

---

# FLOW 018 — Remove Extension

User:

Extensions

↓

Remove

↓

Confirmation

↓

Extension removed.

---

# FLOW 019 — Enter Private Browsing

Goal:

Private session.

Flow:

Ctrl+Shift+N

↓

Private window opens.

↓

Explanation page.

↓

Navigation begins.

---

# FLOW 020 — Browser Update

Trigger:

Update available.

Browser:

Downloads.

Waits.

Shows:

Restart to update.

User:

Restart.

Browser:

Returns to previous session.

---

# FLOW 021 — Search Bookmarks

User:

Ctrl+Shift+B

↓

Search.

↓

Select bookmark.

↓

Open.

---

# FLOW 022 — Search History

User:

History

↓

Search

↓

Results

↓

Open page.

---

# FLOW 023 — Move Tab Between Spaces

Goal:

Reorganize work.

Flow:

Drag tab

↓

Select destination Space

↓

Move

↓

Space updated.

---

# FLOW 024 — Open Patagonia Hub

User:

Clicks Patagonia Logo.

↓

Hub opens.

↓

User selects tool.

↓

Tool opens.

---

# FLOW 025 — Change Theme

User:

Settings

↓

Appearance

↓

Dark

↓

Applied instantly.

---

# FLOW 026 — Vertical Tabs

Settings

↓

Tabs

↓

Vertical

↓

Interface updates.

No restart.

---

# FLOW 027 — Import Data

First Run

or

Settings

↓

Import

↓

Select Browser

↓

Select Data

↓

Import

↓

Summary

---

# FLOW 028 — Configure AI

Settings

↓

AI

↓

Provider

↓

API or Local

↓

Test

↓

Save

---

# FLOW 029 — Local AI

User:

Select Ollama

↓

Test

↓

Connected

↓

Ready.

---

# FLOW 030 — Browser Crash

Browser crashes.

Restart.

Recovery.

Restore session.

Continue working.

---

# Global UX Rules

Every flow should:

Require the fewest possible steps.

Avoid asking unnecessary questions.

Always allow cancellation.

Never surprise users.

Always explain destructive actions.

Maintain keyboard accessibility.

Support screen readers.

Respect privacy.

Preserve user work whenever possible.

---

# Success Principles

Every completed flow should make the user feel:

"I knew what would happen."

"I stayed in control."

"The browser helped me."

---

# Error Principles

Errors should:

Explain.

Guide.

Recover.

Never blame the user.

---

# Future Flows

Additional flows may include:

- Password Manager
- Sync
- Notes
- AI Conversation
- Cloud Services
- Developer Tools
- Module Marketplace
- Patagonia Account
- Collaboration
- Multi-device workflows

---

# Final Statement

Features define what Patagonia Browser can do.

User Flows define how people experience it.

A feature is successful only when its flow feels effortless.

---

> "The best interface is the one users never have to think about."

— Patagonia Labs
