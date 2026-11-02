# 🏔 Patagonia Browser

# UI_COMPONENTS.md

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Patagonia Labs  
**License:** MIT  
**Last Updated:** 2026-07-18

---

# User Interface Components

## Purpose

This document defines the visual components and interaction rules used throughout Patagonia Browser.

Its purpose is to ensure that every screen, panel, control and interaction feels consistent.

This document describes:

- Component purpose.
- Visual behavior.
- Interaction states.
- Accessibility requirements.
- Usage rules.
- Responsive behavior.
- Relationship with other browser systems.

This document must remain consistent with:

- `DESIGN_SYSTEM.md`
- `PRODUCT_PRINCIPLES.md`
- `BLUEPRINT.md`
- `FEATURES_SPECIFICATION.md`
- `DEVELOPMENT_GUIDE.md`

---

# Interface Philosophy

Patagonia Browser follows one central interface principle:

> Everything important should be visible. Nothing should get in the way.

The interface must feel:

- Calm.
- Clear.
- Fast.
- Predictable.
- Modern.
- Professional.
- Accessible.
- Respectful of user attention.

The browser must avoid visual noise, unnecessary decoration and excessive animation.

---

# Component Structure

Patagonia Browser components are organized into seven groups:

1. Application Shell
2. Navigation Components
3. Content Components
4. Panels and Overlays
5. Form Components
6. Feedback Components
7. System Components

---

# Component States

Interactive components may support the following states:

- Default.
- Hover.
- Focused.
- Active.
- Selected.
- Disabled.
- Loading.
- Warning.
- Error.
- Success.
- Dragging.
- Expanded.
- Collapsed.

Every state must be visually understandable.

Color must never be the only method used to communicate state.

---

# General Interaction Rules

All interactive elements must:

- Provide visible hover feedback.
- Provide visible keyboard focus.
- Use understandable labels.
- Avoid unexpected actions.
- Confirm destructive actions when necessary.
- Respond immediately to user input.
- Avoid unnecessary delays.
- Support keyboard navigation where practical.
- Respect reduced-motion settings.
- Provide accessible names for assistive technology.

---

# 1. Application Shell

**Component ID:** PB-UI-SHELL-001

## Purpose

The Application Shell is the main visual structure of Patagonia Browser.

It contains:

- Window controls.
- Tab area.
- Navigation toolbar.
- Sidebar when enabled.
- Web content area.
- Status surfaces.
- Browser panels.

## Layout

```text
┌─────────────────────────────────────────────────────┐
│ Window Controls / Tab Area                          │
├─────────────────────────────────────────────────────┤
│ Navigation Toolbar                                  │
├───────────────┬─────────────────────────────────────┤
│ Optional      │                                     │
│ Sidebar       │ Web Content                         │
│               │                                     │
└───────────────┴─────────────────────────────────────┘
```

## Requirements

The shell must:

- Adapt to different window sizes.
- Avoid overlapping controls.
- Preserve usable web content space.
- Support top tabs and side tabs.
- Support dark and light themes.
- Respect operating system scaling.
- Remain usable at minimum supported window size.

---

# 2. Title Bar

**Component ID:** PB-UI-TITLEBAR-001

## Purpose

Provide window drag space and operating system controls.

## Elements

- Application icon where appropriate.
- Window title where appropriate.
- Minimize.
- Maximize or restore.
- Close.
- Optional draggable empty area.

## Requirements

The title bar must:

- Follow operating system expectations.
- Preserve large enough draggable regions.
- Avoid placing essential actions too close to window controls.
- Support maximized and restored states.
- Clearly distinguish draggable and interactive regions.

## Platform Rule

Native window behavior should be preserved whenever possible.

Custom styling must not reduce usability.

---

# 3. Tab Bar

**Component ID:** PB-UI-TABBAR-001

## Purpose

Contain and organize browser tabs.

## Supported Layouts

### Horizontal Tab Bar

Displayed at the top of the browser.

### Vertical Tab Bar

Displayed inside the side panel.

## Requirements

The Tab Bar must support:

- Active tab.
- Inactive tabs.
- Pinned tabs.
- New tab control.
- Tab reordering.
- Dragging.
- Overflow management.
- Tab audio status.
- Tab loading status.
- Tab crash status.

## Behavior

The Tab Bar must remain usable when many tabs are open.

Possible overflow solutions include:

- Tab compression.
- Scrolling.
- Tab search.
- Overflow menu.
- Vertical layout recommendation.

---

# 4. Browser Tab

**Component ID:** PB-UI-TAB-001

## Purpose

Represent one open page.

## Content

A tab may display:

- Favicon.
- Page title.
- Loading indicator.
- Audio indicator.
- Mute state.
- Close button.
- Pinned state.
- Security or crash warning when required.

## States

### Active

The current visible tab.

Requirements:

- Stronger visual emphasis.
- Clear connection with web content area.
- Accessible selected state.

### Inactive

An open but non-visible tab.

Requirements:

- Lower emphasis.
- Readable title.
- Clear hover state.

### Loading

Must display subtle progress feedback.

### Playing Audio

Must display an understandable audio icon.

### Muted

Must show a muted icon and accessible text.

### Pinned

Must use a compact presentation while remaining identifiable.

### Crashed

Must show a visible warning state.

## Tab Close Button

The close button should:

- Appear consistently.
- Remain keyboard accessible.
- Avoid accidental activation.
- Be hidden or reduced for pinned tabs when appropriate.

## Tab Title Rules

Titles should:

- Truncate gracefully.
- Never overlap controls.
- Use tooltips when text is truncated.
- Avoid excessive animation when changing.

---

# 5. New Tab Button

**Component ID:** PB-UI-NEWTAB-001

## Purpose

Open a new browser tab.

## Requirements

The button must:

- Be easy to find.
- Use a plus icon with accessible label.
- Provide hover and focus states.
- Work in horizontal and vertical layouts.
- Avoid being confused with tab creation menus.

## Optional Behavior

Secondary activation may open:

- New tab options.
- New private tab or window.
- New Space tab.

This behavior must remain simple.

---

# 6. Sidebar

**Component ID:** PB-UI-SIDEBAR-001

## Purpose

Provide optional vertical navigation and tool access.

## Possible Contents

- Vertical tabs.
- Patagonia Hub.
- Spaces.
- Bookmarks.
- History.
- Downloads.
- Notes.
- AI tools.
- Extensions.

## States

- Expanded.
- Compact.
- Collapsed.
- Temporarily overlaid.

## Requirements

Users must be able to:

- Resize the sidebar within limits.
- Collapse it.
- Restore it.
- Navigate it with a keyboard.
- Understand the selected section.

## Design Rule

The sidebar must not become a permanent collection of unrelated icons.

Only important and user-enabled tools should appear.

---

# 7. Navigation Toolbar

**Component ID:** PB-UI-TOOLBAR-001

## Purpose

Provide primary browser controls.

## Default Content

- Back.
- Forward.
- Reload or stop.
- Address bar.
- Trust Indicator.
- Bookmark action.
- Extensions access.
- Patagonia Hub.
- Main menu.

## Requirements

The toolbar must:

- Prioritize the address bar.
- Remain compact.
- Avoid excessive buttons.
- Allow selected customization in future versions.
- Preserve minimum target sizes.
- Support keyboard navigation.

## Responsive Behavior

When available width decreases:

1. Reduce decorative spacing.
2. Hide optional labels.
3. Move secondary actions into overflow.
4. Preserve navigation, address bar and security controls.

---

# 8. Navigation Button

**Component ID:** PB-UI-NAVBUTTON-001

## Purpose

Represent a common browser navigation action.

## Examples

- Back.
- Forward.
- Reload.
- Stop.
- Home.
- Downloads.
- History.

## Visual Form

Typically an icon-only button with:

- Tooltip.
- Accessible label.
- Hover surface.
- Focus indicator.
- Disabled state.

## Requirements

Navigation buttons must:

- Use familiar icons.
- Avoid ambiguous symbolism.
- Provide clear disabled states.
- Remain consistent in size.
- Avoid unnecessary text unless clarity requires it.

---

# 9. Address Bar

**Component ID:** PB-UI-ADDRESSBAR-001

## Purpose

Allow navigation, search and browser command entry.

## Structure

```text
┌────────────────────────────────────────────────────┐
│ Trust │ URL, search or command                │ Tools │
└────────────────────────────────────────────────────┘
```

## Possible Elements

- Trust Indicator.
- Current URL or query.
- Search engine icon.
- Loading progress.
- Command mode indicator.
- Reader mode action.
- Bookmark action.
- Page actions.

## States

- Default.
- Focused.
- Editing.
- Loading.
- Search mode.
- Command mode.
- Error.
- Insecure connection.
- Private browsing.

## Focus Behavior

When focused:

- Current text should be easy to select.
- Suggestions may open.
- Visual focus must be clear.
- Page content must remain visible.
- Keyboard navigation must be supported.

## URL Display Rules

The address bar must:

- Make the domain understandable.
- Avoid misleading truncation.
- Highlight security-relevant information.
- Decode safe text where appropriate.
- Protect against visually deceptive characters.

## Placeholder

Suggested placeholder:

> Search, enter an address or type a command

The final localized text may vary.

---

# 10. Address Suggestions Panel

**Component ID:** PB-UI-SUGGESTIONS-001

## Purpose

Display navigation, search and command suggestions.

## Suggestion Types

- Current input.
- Search suggestions.
- History.
- Bookmarks.
- Open tabs.
- Browser commands.
- Space suggestions.
- Calculator or utility results.
- Internal pages.

## Suggestion Structure

Each result may contain:

- Icon.
- Primary label.
- Secondary description.
- Source category.
- Keyboard hint.
- Privacy indicator where relevant.

## Requirements

The panel must:

- Clearly distinguish suggestion categories.
- Support arrow-key navigation.
- Support Enter selection.
- Support Escape dismissal.
- Avoid sending text externally without permission.
- Highlight the matching text.
- Limit visual density.

## Privacy Rule

External suggestions must be visibly distinguishable from locally generated suggestions when relevant.

---

# 11. Patagonia Intelligence Command Result

**Component ID:** PB-UI-COMMAND-001

## Purpose

Represent a browser command in the address suggestions panel.

## Content

A command result should show:

- Command icon.
- Action name.
- Short explanation.
- Shortcut when available.
- Confirmation requirement when destructive.

## Example

```text
Clear browsing data
Remove selected local browsing information
Requires confirmation
```

## Requirements

Destructive commands must never execute immediately from ambiguous text input.

---

# 12. Trust Indicator

**Component ID:** PB-UI-TRUST-001

## Purpose

Communicate connection, privacy and security status for the current site.

## States

### Secure

- Positive icon.
- “Secure connection” label.
- No critical technical problem detected.

### Attention

- Warning icon.
- “Review site settings” label.
- Possible permission, mixed-content or privacy concern.

### Dangerous

- Error icon.
- “Unsafe connection” or appropriate warning.
- Clear recommended action.

### Internal

- Patagonia Browser icon.
- Indicates an internal browser page.

### Local

- Device or local-network icon.
- Indicates local content or service.

## Requirements

The Trust Indicator must:

- Never use color alone.
- Show icon and text in its panel.
- Avoid claiming a website is trustworthy only because HTTPS is active.
- Open the Site Information Panel.
- Remain understandable to non-technical users.

---

# 13. Site Information Panel

**Component ID:** PB-UI-SITEINFO-001

## Purpose

Display current-site connection, privacy and permission information.

## Sections

- Connection.
- Certificate.
- Permissions.
- Cookies and storage.
- Trackers.
- Site data.
- Security notices.
- Clear site data action.

## Requirements

The panel must:

- Use plain language.
- Provide direct actions.
- Hide advanced technical details behind expandable sections.
- Clearly distinguish browser protection from website reputation.
- Avoid overwhelming the user.

---

# 14. Search Field

**Component ID:** PB-UI-SEARCHFIELD-001

## Purpose

Provide search inside browser pages and tools.

## Used In

- Settings.
- History.
- Downloads.
- Bookmarks.
- Extensions.
- Notes.
- Spaces.
- Tab search.

## Requirements

Search fields must:

- Have a visible or accessible label.
- Support keyboard use.
- Provide a clear action.
- Show no-results feedback.
- Avoid starting expensive searches before useful input exists.
- Preserve query where appropriate.

---

# 15. Patagonia Hub Button

**Component ID:** PB-UI-HUBBUTTON-001

## Purpose

Open Patagonia Hub.

## Visual Identity

The control may use:

- Patagonia logo.
- Mountain-inspired icon.
- Neutral control styling.
- Visible selected state when Hub is open.

## Requirements

The button must:

- Remain visible in the default interface.
- Have a clear accessible label.
- Avoid resembling an advertisement.
- Open and close the Hub consistently.

---

# 16. Patagonia Hub Panel

**Component ID:** PB-UI-HUB-001

## Purpose

Provide central access to browser management and enabled modules.

## Main Sections

- Current Space.
- Quick actions.
- Bookmarks.
- Downloads.
- History.
- Privacy.
- Extensions.
- Intelligence and AI.
- Settings.
- Browser status.

## Requirements

The Hub must:

- Open quickly.
- Use a predictable structure.
- Support keyboard navigation.
- Avoid excessive metrics.
- Show only useful status information.
- Support enabled and disabled modules.
- Close with Escape.
- Preserve user context when reopened.

## Layout Principle

Frequently used actions should appear before system information.

---

# 17. Space Switcher

**Component ID:** PB-UI-SPACESWITCHER-001

## Purpose

Allow users to view and change Patagonia Spaces.

## Space Item Content

- Icon.
- Space name.
- Accent.
- Active-tab count.
- Optional notification or activity marker.

## Requirements

Users must be able to:

- Switch Spaces.
- Create a Space.
- Open Space settings.
- Reorder Spaces in a future version.
- Identify the active Space.

## Design Rule

Space identity must not depend only on color.

---

# 18. Space Card

**Component ID:** PB-UI-SPACECARD-001

## Purpose

Represent a Space in management screens.

## Content

- Name.
- Icon.
- Accent.
- Description.
- Open-tab count.
- Isolation level.
- Last used time.
- Management actions.

## States

- Default.
- Active.
- Hovered.
- Editing.
- Disabled.
- Deleting.

## Destructive Action

Deleting a Space must show:

- What data will be removed.
- What data will remain.
- Whether tabs can be moved.
- Confirmation action.

---

# 19. Privacy Center Button

**Component ID:** PB-UI-PRIVACYBUTTON-001

## Purpose

Open the browser-wide Privacy Center.

## Requirements

The button must:

- Be easy to locate.
- Use understandable privacy language.
- Show status only when useful.
- Avoid fear-based visual design.
- Provide an accessible label.

---

# 20. Privacy Status Card

**Component ID:** PB-UI-PRIVACYCARD-001

## Purpose

Summarize one privacy or security category.

## Examples

- Trackers blocked.
- Secure DNS.
- Cookie status.
- Fingerprinting protection.
- Permission warnings.

## Structure

- Status icon.
- Title.
- Short explanation.
- Optional value.
- Action link.

## Requirements

Cards must:

- Explain status in plain language.
- Avoid unnecessary statistics.
- Provide actionable next steps.
- Use consistent positive, neutral and warning states.

---

# 21. Main Menu

**Component ID:** PB-UI-MAINMENU-001

## Purpose

Provide access to secondary browser actions.

## Possible Sections

- New tab.
- New window.
- Private window.
- Zoom.
- Bookmarks.
- History.
- Downloads.
- Extensions.
- Print.
- Find in page.
- More tools.
- Settings.
- Help.
- Exit.

## Requirements

The Main Menu must:

- Use clear grouping.
- Avoid deeply nested menus.
- Display keyboard shortcuts.
- Support keyboard navigation.
- Keep destructive actions separated.
- Remain consistent across platforms.

---

# 22. Context Menu

**Component ID:** PB-UI-CONTEXTMENU-001

## Purpose

Provide context-specific actions.

## Contexts

- Web page.
- Link.
- Image.
- Selected text.
- Tab.
- Bookmark.
- Download.
- Sidebar item.

## Requirements

Context menus must:

- Show only relevant actions.
- Avoid unnecessary length.
- Group related actions.
- Place destructive actions separately.
- Support keyboard navigation.
- Respect website and operating system behavior where appropriate.

---

# 23. Panel

**Component ID:** PB-UI-PANEL-001

## Purpose

Display temporary or persistent browser information beside the main interface.

## Examples

- Patagonia Hub.
- Downloads.
- History.
- Bookmarks.
- Privacy.
- Spaces.
- AI assistant.
- Tab search.

## Types

### Popover Panel

Anchored to a control and used for short tasks.

### Side Panel

Displayed beside web content for longer interactions.

### Full Internal Page

Used for complex management interfaces.

## Requirements

Panels must:

- Have a clear title.
- Provide a close action.
- Support Escape when temporary.
- Preserve reasonable focus behavior.
- Avoid trapping users unexpectedly.
- Avoid blocking the entire interface unless necessary.

---

# 24. Dialog

**Component ID:** PB-UI-DIALOG-001

## Purpose

Request user attention or confirmation.

## Types

- Confirmation.
- Warning.
- Error.
- Information.
- Permission.
- Form dialog.

## Requirements

Dialogs must:

- Use a clear title.
- Explain the required decision.
- Use action labels that describe outcomes.
- Focus the safest sensible action.
- Support Escape when cancellation is allowed.
- Return focus to the previous control when closed.

## Button Labels

Preferred:

- Delete Space.
- Clear History.
- Cancel.
- Restart Browser.

Avoid vague labels:

- Yes.
- No.
- OK, when a clearer action is possible.

---

# 25. Confirmation Dialog

**Component ID:** PB-UI-CONFIRM-001

## Purpose

Prevent accidental destructive or irreversible actions.

## Required Information

A confirmation must explain:

- What will happen.
- Which data is affected.
- Whether the action can be undone.
- The safest alternative when relevant.

## Product Rule

Confirmation dialogs should not be used for ordinary, reversible actions.

Too many confirmations reduce their effectiveness.

---

# 26. Button

**Component ID:** PB-UI-BUTTON-001

## Purpose

Trigger an immediate action.

## Variants

### Primary

Used for the main action in a view.

Examples:

- Save.
- Create Space.
- Install.
- Restart.

### Secondary

Used for supporting actions.

### Ghost

Used for low-emphasis toolbar or panel actions.

### Destructive

Used for irreversible or damaging actions.

### Icon Button

Used for familiar compact actions.

## Requirements

Buttons must:

- Use action-oriented labels.
- Have visible hover and focus states.
- Show disabled state.
- Avoid multiple primary buttons in one small area.
- Maintain accessible target size.
- Show progress when action takes time.

---

# 27. Toggle Switch

**Component ID:** PB-UI-TOGGLE-001

## Purpose

Enable or disable one setting.

## Requirements

A toggle must:

- Have a visible label.
- Clearly show on and off states.
- Take effect immediately only when safe.
- Explain restart requirements.
- Avoid reversed or confusing wording.

## Preferred Label

> Block third-party cookies

Avoid:

> Disable acceptance of third-party cookies

---

# 28. Checkbox

**Component ID:** PB-UI-CHECKBOX-001

## Purpose

Select one or more independent options.

## Requirements

Checkboxes must:

- Have clickable labels.
- Support keyboard use.
- Show checked, unchecked and indeterminate states.
- Not be used as action buttons.

---

# 29. Radio Group

**Component ID:** PB-UI-RADIO-001

## Purpose

Choose one option from a small set.

## Examples

- Theme.
- Tab layout.
- Startup behavior.
- Download behavior.

## Requirements

Radio options must:

- Be mutually exclusive.
- Use clear labels.
- Include descriptions when consequences differ.
- Support arrow-key navigation.

---

# 30. Select Menu

**Component ID:** PB-UI-SELECT-001

## Purpose

Choose one value from a longer list.

## Examples

- Search engine.
- Language.
- AI provider.
- Download location behavior.
- Default Space.

## Requirements

Select menus must:

- Display current value.
- Use meaningful option names.
- Support keyboard use.
- Avoid hiding very important decisions when a visible radio group would be clearer.

---

# 31. Text Input

**Component ID:** PB-UI-INPUT-001

## Purpose

Allow text entry.

## Examples

- Space name.
- Custom search engine.
- Search.
- Local AI endpoint.
- Bookmark name.

## Requirements

Text inputs must:

- Have labels.
- Show validation clearly.
- Preserve user input after recoverable errors.
- Avoid placeholder-only labeling.
- Support copy and paste.
- Explain expected format when required.

---

# 32. Slider

**Component ID:** PB-UI-SLIDER-001

## Purpose

Select a value within a continuous or stepped range.

## Examples

- Zoom.
- Sidebar width.
- Interface density.
- Font size.
- Reading width.

## Requirements

Sliders must:

- Display current value.
- Support keyboard adjustment.
- Use sensible minimum and maximum values.
- Avoid use where exact text entry would be easier.

---

# 33. Settings Row

**Component ID:** PB-UI-SETTINGSROW-001

## Purpose

Present one setting consistently.

## Structure

```text
Setting title                     Control
Short explanation
```

## Requirements

Settings rows must:

- Use clear titles.
- Include concise explanations.
- Keep related controls aligned.
- Avoid overly long descriptions.
- Show policy or availability restrictions.
- Indicate restart requirements.

---

# 34. Settings Section

**Component ID:** PB-UI-SETTINGSSECTION-001

## Purpose

Group related preferences.

## Examples

- Appearance.
- Tabs.
- Privacy.
- Search.
- Downloads.
- Accessibility.

## Requirements

Sections must:

- Have a clear heading.
- Use a logical order.
- Avoid excessive nesting.
- Be searchable.
- Support direct linking where possible.

---

# 35. Card

**Component ID:** PB-UI-CARD-001

## Purpose

Group related information or actions.

## Examples

- Space.
- Privacy status.
- Extension.
- AI provider.
- Import source.

## Requirements

Cards must:

- Have one clear purpose.
- Avoid unnecessary decoration.
- Use consistent padding.
- Avoid excessive nested cards.
- Provide visible selection when interactive.

---

# 36. List Item

**Component ID:** PB-UI-LISTITEM-001

## Purpose

Represent one item in a collection.

## Examples

- History entry.
- Bookmark.
- Download.
- Extension.
- Search result.
- Open tab.

## Content

- Leading icon or preview.
- Primary text.
- Secondary information.
- Status.
- Actions.

## Requirements

List items must:

- Support keyboard navigation when interactive.
- Keep actions discoverable.
- Avoid overcrowding.
- Use consistent row height.
- Show selection clearly.

---

# 37. Empty State

**Component ID:** PB-UI-EMPTY-001

## Purpose

Explain when no content exists.

## Examples

- No downloads.
- No history.
- No bookmarks.
- No search results.
- No Spaces.

## Requirements

An empty state should:

- Explain the situation.
- Suggest one useful next action.
- Avoid blaming the user.
- Avoid excessive illustration.
- Remain concise.

## Example

> No bookmarks yet  
> Save pages you want to find again.

---

# 38. Loading Indicator

**Component ID:** PB-UI-LOADING-001

## Purpose

Communicate active work.

## Types

- Spinner.
- Progress bar.
- Skeleton placeholder.
- Inline loading state.
- Tab loading indicator.

## Requirements

Loading indicators must:

- Appear only when useful.
- Avoid flashing during very short operations.
- Show progress when measurable.
- Avoid blocking unrelated interaction.
- Respect reduced-motion preferences.

---

# 39. Progress Bar

**Component ID:** PB-UI-PROGRESS-001

## Purpose

Show measurable task progress.

## Examples

- Download.
- Import.
- Update.
- Data deletion.
- Installation.

## Requirements

Progress bars must:

- Display completion percentage when available.
- Explain the current task.
- Show paused, failed and completed states.
- Avoid fake progress.
- Provide cancellation when safe.

---

# 40. Notification Banner

**Component ID:** PB-UI-BANNER-001

## Purpose

Display important information inside a page or panel.

## Variants

- Information.
- Success.
- Warning.
- Error.
- Update.
- Recovery.

## Requirements

Banners must:

- Explain the issue clearly.
- Provide an action when useful.
- Be dismissible when appropriate.
- Avoid appearing for trivial information.
- Use icon, text and visual state.

---

# 41. Toast Notification

**Component ID:** PB-UI-TOAST-001

## Purpose

Provide temporary feedback after an action.

## Examples

- Bookmark saved.
- Link copied.
- Download completed.
- Setting updated.
- Tab moved.

## Requirements

Toasts must:

- Be brief.
- Avoid blocking controls.
- Remain long enough to read.
- Support screen reader announcement.
- Provide Undo when appropriate.
- Avoid stacking excessively.

---

# 42. Error Message

**Component ID:** PB-UI-ERROR-001

## Purpose

Explain a failed action or state.

## Requirements

Error messages must:

- Describe what failed.
- Explain what the user can do.
- Avoid exposing raw technical details by default.
- Preserve user work where possible.
- Provide retry when useful.
- Include diagnostic detail only behind an advanced option.

## Example

Preferred:

> Patagonia Browser could not reach this website. Check your connection and try again.

Avoid:

> ERR_NETWORK_CHANGED.

Technical codes may be shown as secondary information.

---

# 43. Warning Message

**Component ID:** PB-UI-WARNING-001

## Purpose

Explain risk before or during an action.

## Requirements

Warnings must:

- Be proportional to the actual risk.
- Avoid fear-based language.
- Explain consequences.
- Provide a recommended safe action.
- Allow advanced override only when appropriate.

---

# 44. Success Message

**Component ID:** PB-UI-SUCCESS-001

## Purpose

Confirm completion of an important task.

## Requirements

Success messages should:

- Be concise.
- Avoid appearing after every ordinary interaction.
- Provide a next action only when useful.
- Disappear automatically when no longer needed.

---

# 45. Tooltip

**Component ID:** PB-UI-TOOLTIP-001

## Purpose

Explain icon-only controls or unfamiliar interface elements.

## Requirements

Tooltips must:

- Appear after a short delay.
- Use concise text.
- Support keyboard focus.
- Never contain essential information unavailable elsewhere.
- Avoid covering the target control.

---

# 46. Badge

**Component ID:** PB-UI-BADGE-001

## Purpose

Display a short status or count.

## Examples

- Beta.
- Experimental.
- Update available.
- Three active downloads.
- Permission warning.

## Requirements

Badges must:

- Use short text or numbers.
- Avoid unnecessary use.
- Remain readable at different scales.
- Not depend only on color.

---

# 47. Divider

**Component ID:** PB-UI-DIVIDER-001

## Purpose

Separate related groups visually.

## Requirements

Dividers must:

- Be subtle.
- Avoid over-segmenting interfaces.
- Support logical grouping.
- Never replace proper spacing.

---

# 48. Breadcrumb

**Component ID:** PB-UI-BREADCRUMB-001

## Purpose

Show location inside complex internal pages.

## Possible Uses

- Settings.
- Bookmark folders.
- Download location navigation.
- Advanced Privacy Center pages.

## Requirements

Breadcrumbs must:

- Show hierarchy clearly.
- Support keyboard interaction.
- Avoid use in shallow interfaces.
- Truncate long paths safely.

---

# 49. Internal Page Header

**Component ID:** PB-UI-PAGEHEADER-001

## Purpose

Introduce a browser management page.

## Structure

- Page title.
- Short description.
- Optional primary action.
- Optional search field.

## Examples

- History.
- Downloads.
- Settings.
- Bookmarks.
- Extensions.
- Privacy Center.

## Requirements

Page headers must:

- Remain concise.
- Avoid oversized decorative titles.
- Keep primary actions easy to identify.
- Use consistent spacing.

---

# 50. Data Table

**Component ID:** PB-UI-TABLE-001

## Purpose

Display structured information where rows and columns improve understanding.

## Possible Uses

- Site permissions.
- Diagnostic information.
- Extension details.
- Certificate details.

## Requirements

Tables must:

- Use clear column labels.
- Support keyboard navigation when interactive.
- Adapt to narrow screens.
- Avoid use when a simpler list is clearer.
- Provide text alternatives for icons and statuses.

---

# 51. Download Item

**Component ID:** PB-UI-DOWNLOADITEM-001

## Purpose

Represent one download.

## Content

- Filename.
- Source domain.
- File size.
- Progress.
- Status.
- Time remaining.
- Security state.
- Actions.

## Actions

- Pause.
- Resume.
- Cancel.
- Retry.
- Open.
- Show in folder.
- Remove from history.

## States

- Starting.
- Downloading.
- Paused.
- Completed.
- Failed.
- Blocked.
- Cancelled.
- Missing.

## Requirements

Dangerous files must have clear warnings and safe default actions.

---

# 52. History Item

**Component ID:** PB-UI-HISTORYITEM-001

## Purpose

Represent one visited page.

## Content

- Favicon.
- Page title.
- Domain.
- Visit time.
- Space where relevant.
- Selection control.
- Remove action.

## Requirements

History items must:

- Make the destination clear.
- Support multi-selection where useful.
- Avoid exposing full sensitive URLs unnecessarily.
- Provide understandable grouping by date.

---

# 53. Bookmark Item

**Component ID:** PB-UI-BOOKMARKITEM-001

## Purpose

Represent one saved page or folder.

## Content

- Favicon or folder icon.
- Name.
- Domain or location.
- Space or collection.
- Actions.

## Requirements

Bookmark items must:

- Support drag and drop in management views.
- Support keyboard organization.
- Distinguish folders from webpages.
- Provide clear editing actions.

---

# 54. Extension Card

**Component ID:** PB-UI-EXTENSIONCARD-001

## Purpose

Represent one installed extension.

## Content

- Extension icon.
- Name.
- Version.
- Description.
- Enabled state.
- Permission summary.
- Error state.
- Management actions.

## Actions

- Enable or disable.
- Details.
- Permissions.
- Remove.
- Open options.
- Reload for developer extensions.

## Security Requirement

High-risk permissions must be displayed clearly.

---

# 55. AI Provider Card

**Component ID:** PB-UI-AIPROVIDER-001

## Purpose

Represent one configured AI provider.

## Content

- Provider name.
- Local or cloud indicator.
- Connection state.
- Selected model.
- Privacy summary.
- Available capabilities.

## Actions

- Configure.
- Test.
- Select default.
- Disable.
- Remove credentials.

## Privacy Requirement

The card must clearly state whether content leaves the device.

---

# 56. Permission Prompt

**Component ID:** PB-UI-PERMISSIONPROMPT-001

## Purpose

Ask whether a website may access a sensitive capability.

## Required Information

- Website identity.
- Requested capability.
- Reason when available.
- Allow action.
- Block action.
- Optional “always” or “this time” choice.

## Requirements

Permission prompts must:

- Be attached to browser chrome, not easily imitated by web content.
- Avoid preselecting the most permissive choice.
- Use clear language.
- Avoid interrupting before a user action when possible.
- Allow later changes from Site Information.

---

# 57. Private Browsing Indicator

**Component ID:** PB-UI-PRIVATEINDICATOR-001

## Purpose

Clearly show that the user is in a private browsing window.

## Requirements

Private browsing must be identifiable through:

- Window appearance.
- Visible text or icon.
- New tab explanation.
- Accessible title.

Color alone is insufficient.

The private appearance must remain calm and professional.

---

# 58. Find in Page Bar

**Component ID:** PB-UI-FINDBAR-001

## Purpose

Search text inside the current webpage.

## Content

- Search field.
- Match count.
- Previous result.
- Next result.
- Close.

## Requirements

The Find Bar must:

- Open without shifting content excessively.
- Focus the text field.
- Support Enter and Shift+Enter.
- Highlight page matches.
- Close with Escape.
- Preserve page scroll position when possible.

---

# 59. Zoom Control

**Component ID:** PB-UI-ZOOM-001

## Purpose

Adjust page zoom.

## Content

- Decrease.
- Current percentage.
- Increase.
- Reset.
- Full-screen action where appropriate.

## Requirements

Zoom controls must:

- Show current value.
- Support keyboard shortcuts.
- Remember per-site zoom where supported.
- Avoid changing interface scale unless explicitly selected.

---

# 60. Update Status Component

**Component ID:** PB-UI-UPDATE-001

## Purpose

Communicate browser update state.

## States

- Up to date.
- Checking.
- Downloading.
- Restart required.
- Failed.
- Unsupported version.
- Security update required.

## Requirements

The component must:

- Avoid interrupting active work.
- Clearly explain restart requirements.
- Provide release information.
- Make urgent security updates understandable.
- Avoid false urgency.

---

# 61. Crash Recovery Component

**Component ID:** PB-UI-RECOVERY-001

## Purpose

Help restore work after an abnormal shutdown.

## Content

- Recovery explanation.
- Restore session.
- Open clean session.
- Review tabs where supported.
- Troubleshooting option.

## Requirements

Recovery must:

- Avoid repeated crash loops.
- Preserve user control.
- Explain damaged or excluded tabs.
- Avoid technical jargon.

---

# 62. Onboarding Step

**Component ID:** PB-UI-ONBOARDING-001

## Purpose

Represent one step of the first-run experience.

## Possible Steps

- Welcome.
- Theme.
- Tab layout.
- Import.
- First Space.
- Privacy.
- Default browser.
- Finish.

## Requirements

Onboarding steps must:

- Be skippable when optional.
- Be short.
- Explain consequences.
- Avoid account requirements.
- Show progress without implying a long process.

---

# 63. Keyboard Shortcut Label

**Component ID:** PB-UI-SHORTCUTLABEL-001

## Purpose

Show a keyboard command beside an action.

## Examples

```text
Ctrl + L
Ctrl + T
Ctrl + Shift + T
```

## Requirements

Shortcut labels must:

- Follow operating system notation.
- Be secondary to the action label.
- Update if customization becomes available.
- Remain accessible to screen readers.

---

# 64. Drag and Drop Indicator

**Component ID:** PB-UI-DRAG-001

## Purpose

Show where an item will move when dragged.

## Used For

- Tabs.
- Spaces.
- Bookmarks.
- Sidebar modules.
- Downloads where applicable.

## Requirements

Drag feedback must:

- Clearly show insertion position.
- Avoid triggering accidental navigation.
- Provide keyboard alternatives.
- Cancel safely with Escape.
- Support reduced motion.

---

# 65. Resizable Panel Handle

**Component ID:** PB-UI-RESIZE-001

## Purpose

Allow the user to resize side panels.

## Requirements

The handle must:

- Have a visible hover state.
- Use an appropriate cursor.
- Support keyboard resizing where practical.
- Respect minimum and maximum sizes.
- Provide a larger invisible interaction area than its visual width.

---

# 66. Skeleton Placeholder

**Component ID:** PB-UI-SKELETON-001

## Purpose

Represent content structure while data is loading.

## Requirements

Skeletons must:

- Match the expected layout.
- Avoid excessive animation.
- Respect reduced-motion settings.
- Not be used when a simple spinner is clearer.
- Disappear immediately when content is ready.

---

# 67. Status Icon

**Component ID:** PB-UI-STATUSICON-001

## Purpose

Represent a semantic state.

## Categories

- Information.
- Success.
- Warning.
- Error.
- Secure.
- Insecure.
- Private.
- Loading.
- Offline.
- Local.

## Requirements

Status icons must:

- Use consistent symbolism.
- Include accessible labels.
- Never communicate meaning only through color.
- Avoid decorative misuse.

---

# 68. Web Content Area

**Component ID:** PB-UI-WEBCONTENT-001

## Purpose

Display rendered websites and documents.

## Requirements

The web content area must:

- Receive the largest available space.
- Remain visually separate from browser chrome.
- Avoid being covered unnecessarily.
- Resize correctly with sidebar and panel changes.
- Display loading and crash states safely.
- Prevent websites from drawing over privileged browser controls.

---

# 69. Browser Error Page

**Component ID:** PB-UI-ERRORPAGE-001

## Purpose

Explain why web content could not be displayed.

## Possible Causes

- No connection.
- DNS failure.
- Certificate issue.
- Blocked threat.
- Page crash.
- Unsupported protocol.
- Access denied.
- Server unavailable.

## Required Content

- Clear title.
- Plain-language explanation.
- Recommended action.
- Retry.
- Advanced details when appropriate.
- Diagnostic code as secondary information.

## Product Rule

Error pages should help the user continue, not merely report failure.

---

# 70. New Tab Shortcut

**Component ID:** PB-UI-SHORTCUT-001

## Purpose

Provide quick access to a user-selected website or browser action.

## Content

- Icon.
- Name.
- Optional Space indicator.
- Edit action.
- Remove action.

## Requirements

Shortcuts must:

- Be user-controlled.
- Never be sponsored by default.
- Support drag and drop.
- Use safe favicon loading.
- Provide a clear fallback icon.

---

# 71. Patagonia Phrase

**Component ID:** PB-UI-PHRASE-001

## Purpose

Add subtle product identity to the New Tab page.

## Examples

- Explore freely.
- Every new tab is a new beginning.
- The best routes are discovered step by step.

## Requirements

The phrase must:

- Be optional.
- Be visually subtle.
- Avoid distracting animation.
- Support localization.
- Never contain advertising or promotions.
- Avoid appearing in professional environments when disabled.

---

# 72. Browser Status Row

**Component ID:** PB-UI-STATUSROW-001

## Purpose

Display concise browser health information.

## Possible Information

- Version.
- Update state.
- Current Space.
- Active downloads.
- Privacy status.
- Memory-saving mode.
- Recovery notice.

## Requirements

Status rows must:

- Show only actionable or useful information.
- Avoid turning the Hub into a technical dashboard.
- Use simple language.
- Link to more details where needed.

---

# 73. Overflow Menu

**Component ID:** PB-UI-OVERFLOW-001

## Purpose

Contain secondary actions that do not fit in the current layout.

## Requirements

Overflow menus must:

- Preserve essential controls outside the menu.
- Use understandable grouping.
- Avoid hiding commonly used actions unnecessarily.
- Update responsively.
- Support keyboard navigation.

---

# 74. Module Entry

**Component ID:** PB-UI-MODULEENTRY-001

## Purpose

Represent an enabled optional module inside the interface.

## Content

- Module icon.
- Module name.
- Status.
- Open action.
- Optional settings.
- Disable action in management view.

## Requirements

Module entries must:

- Match core interface styling.
- Clearly identify experimental modules.
- Avoid adding actions to multiple places without purpose.
- Respect module permissions and availability.

---

# Responsive Behavior

Patagonia Browser must remain usable across different desktop window sizes.

## Large Window

May show:

- Full tab titles.
- Full toolbar.
- Expanded sidebar.
- Additional labels.
- Wider panels.

## Medium Window

May:

- Reduce spacing.
- Truncate tab titles.
- Collapse secondary labels.
- Use compact sidebar mode.

## Small Window

Must preserve:

- Window controls.
- Active tab identification.
- Back.
- Reload.
- Address bar.
- Trust Indicator.
- Main menu.

Secondary actions may move into overflow menus.

---

# Focus Management

Keyboard focus must behave predictably.

## Rules

- Opening a dialog moves focus into the dialog.
- Closing a dialog returns focus to the previous control.
- Opening the address bar suggestions keeps focus in the address input.
- Opening a temporary panel moves focus to its first meaningful control when appropriate.
- Escape closes temporary surfaces in reverse order.
- Focus must never disappear after an action.
- Web content and browser chrome must have clear focus boundaries.

---

# Animation Rules

Animations must communicate:

- Opening.
- Closing.
- Movement.
- Selection.
- Progress.
- State change.

Animations must not:

- Delay interaction.
- Repeat without purpose.
- Create visual noise.
- ignore reduced-motion preferences.
- use exaggerated movement.

## Recommended Duration

- Small state change: 100–150 ms.
- Panel transition: 150–250 ms.
- Larger layout transition: maximum 300 ms.

Longer animations require specific justification.

---

# Iconography Rules

Icons must:

- Use one consistent visual family.
- Remain understandable at small sizes.
- Use familiar symbols where available.
- Avoid decorative complexity.
- Support high-contrast environments.
- Include accessible names when interactive.

Icons should not replace text when the meaning is not universally understood.

---

# Typography Rules

Components must follow the typography definitions from `DESIGN_SYSTEM.md`.

General rules:

- Use readable sizes.
- Avoid excessive weight changes.
- Reserve bold emphasis for important hierarchy.
- Support operating system text scaling.
- Avoid text embedded inside images.
- Allow translated text to expand.

---

# Spacing Rules

Components must use consistent spacing tokens.

Spacing should communicate:

- Grouping.
- Hierarchy.
- Separation.
- Interaction boundaries.

Avoid arbitrary spacing values inside individual components.

---

# Corner Radius Rules

Rounded corners are part of Patagonia Browser's visual identity.

They must remain consistent.

Suggested categories:

- Small controls.
- Standard controls.
- Panels.
- Dialogs.
- Large surfaces.

Excessively rounded elements should be avoided where they reduce clarity.

---

# Surface and Glass Rules

Glass effects may be used for:

- Temporary panels.
- Floating controls.
- Dialogs.
- Sidebar surfaces.
- New tab elements.

Glass effects must not:

- Reduce text contrast.
- Make controls difficult to identify.
- cause performance problems.
- be used on every surface.
- interfere with accessibility.

Fallback solid surfaces must always exist.

---

# Accessibility Requirements

Every component must be reviewed for:

- Keyboard access.
- Focus visibility.
- Screen reader naming.
- Logical reading order.
- Sufficient contrast.
- Text scaling.
- Reduced motion.
- Non-color status communication.
- Appropriate target size.
- Understandable error messages.

Accessibility is part of component completion.

---

# Component Documentation Template

New components should use the following template:

```text
Component Name

Component ID

Purpose

Usage

Structure

Variants

States

Behavior

Accessibility

Responsive Behavior

Security Considerations

Privacy Considerations

Testing Requirements
```

---

# Component Acceptance Criteria

A component is not complete until:

- Its purpose is clear.
- Its visual states are implemented.
- Keyboard interaction works.
- Focus behavior is verified.
- Screen reader labels exist.
- Dark and light themes are tested.
- Responsive behavior is tested.
- Error and loading states are defined.
- Reduced motion is respected.
- The component matches the Design System.
- The component does not create unnecessary complexity.

---

# Component Change Rule

Changes to shared components must consider every screen where the component appears.

Major visual or behavioral changes should:

- Be documented.
- Be tested across themes.
- Be tested across supported layouts.
- Avoid breaking keyboard workflows.
- Update this document when required.

---

# Final Principle

The user should not need to learn each component separately.

Once one part of Patagonia Browser is understood, the rest should feel familiar.

Consistency creates confidence.

Confidence creates trust.

---

> “A good interface explains itself.”

— Patagonia Labs
