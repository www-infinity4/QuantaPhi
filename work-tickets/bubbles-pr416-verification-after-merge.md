# Bubbles PR 416 Post‑Merge Verification Ticket

## Goal
Verify that **Bubbles PR 416** has been merged correctly and that the Android UI meets the required visual and functional standards.

## Required Device
- Real Android phone with a 360 px‑class screen (e.g., Google Pixel 3a, Samsung Galaxy A10, etc.)
- Android 12+ (or the minimum version supported by the app)

## Verification Checklist
### 1. Android Contrast
- Open the Bubbles UI.
- Ensure all text meets WCAG AA contrast ratios against its background.
- Capture screenshots of the main screens (home, settings, overlay) showing the contrast.

### 2. Compact Layout
- Verify that UI elements adapt to the 360 px width without overflow.
- Check that buttons, icons, and text are fully visible and usable.
- Record a short video or series of screenshots demonstrating navigation on the device.

### 3. SIM Check ("Check My SIM")
- Open the **Check My SIM** feature.
- Confirm that the app only reports permitted Android observations (e.g., carrier name, network type) and **does not claim carrier activation**.
- Log the output shown in the app and any console logs.

### 4. Infinity Connectivity Audit
- Review the connectivity status screen after the PR merge.
- Verify that all authorized Infinity infrastructure endpoints are reachable.
- Document any missing or failing services.

## Evidence Collection
- Photos/screenshots of each checklist item.
- Log files (`logcat` output) for the SIM check.
- CI test results artifact (uploaded by the GitHub Actions workflow).
- A brief summary report linking to this ticket and any related Bubbles repair tickets.

## Coordination
- Reference existing Bubbles repair tickets: `IW-20261013-C86DFEA8`, `IW-20261014-B832560E`.
- **Do not modify** any speaker‑verification implementation.

---
*Ticket created by the automated Green engineer to ensure post‑merge quality for Bubbles PR 416.*