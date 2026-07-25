# mitelis-noise-killer — design

**Date:** 2026-07-26

## Problem

On `workspace.mitelis.net` a full-viewport noise overlay is rendered:

```html
<div class="noise fixed inset-0 opacity-40 pointer-events-none z-0" aria-hidden="true"></div>
```

It should be gone. The page is a React app, so the element may be re-inserted on
re-render or client-side navigation, and the fix must survive that.

## Scope

A browser extension for Chrome/Chromium and Firefox that hides this element on
`workspace.mitelis.net`, with a toolbar button toggling the behaviour on and off.

Out of scope: any other domain, any other element, options page, sync across
devices, popup UI.

## Approach

Hiding is done with CSS, not by removing the node from the DOM. A static
stylesheet injected at `document_start` applies before first paint (no flash of
the overlay) and keeps applying no matter how often React re-renders. Removing
the node with JS would need a permanent `MutationObserver` and risks fighting
React over a node it owns.

Because a statically declared stylesheet cannot be un-injected, the rule is
written so that a marker class disables it:

```css
html:not(.mnk-off) div.noise.fixed.inset-0[aria-hidden="true"] {
  display: none !important;
}
```

The selector matches the class combination plus `aria-hidden`, not a bare
`.noise`, so unrelated elements that happen to carry a `noise` class are not
affected.

Default state is enabled: with no marker class present, the overlay is hidden.

## Components

### `manifest.json`

Manifest V3, cross-browser:

- `content_scripts`: one entry, `matches: ["*://workspace.mitelis.net/*"]`,
  `run_at: "document_start"`, `css: ["hide.css"]`, `js: ["content.js"]`.
- `background`: both `service_worker` (used by Chrome) and `scripts` (used by
  Firefox); each browser ignores the key it does not support.
- `browser_specific_settings.gecko.id`: required by Firefox for a stable
  extension identity and `storage.local`.
- `action`: toolbar button with icons, no `default_popup` — clicking toggles
  directly.
- `permissions`: `["storage"]` only. No host permissions: a statically declared
  content script needs only `matches`, so the extension can touch no other site.

### `hide.css`

The single rule above.

### `content.js`

Runs at `document_start` on the target domain.

1. Reads `enabled` from `chrome.storage.local` (default `true` when unset).
2. If disabled, adds class `mnk-off` to `document.documentElement`; otherwise
   ensures the class is absent.
3. Subscribes to `chrome.storage.onChanged` and applies the same toggle live, so
   flipping the button updates every open tab of the domain without a reload.

The storage read is asynchronous, so when the extension is *disabled* the
overlay stays hidden for a few milliseconds after `document_start` before
reappearing. This is acceptable — the flash goes in the harmless direction; the
enabled path (hide) has no flash at all because it is pure static CSS.

### `background.js`

- `chrome.action.onClicked`: reads `enabled`, writes the inverted value.
- Badge reflects state: text `OFF` on a red background when disabled, empty when
  enabled; the button title says which state it is in.
- Badge and title are refreshed on `runtime.onInstalled` and `runtime.onStartup`
  as well, so a restarted browser shows the true state.

### `icons/`

16/48/128 px PNGs. A single icon set for both states — state is communicated by
the badge, not by swapping icons.

## Error handling

There is nothing to fail meaningfully. If `storage.local` is unreadable the
content script treats the state as enabled (hide the overlay), which is the
default behaviour the user installed the extension for.

## Verification

Manual, in both browsers:

1. Load unpacked (`chrome://extensions` → Load unpacked; `about:debugging` →
   Load Temporary Add-on in Firefox).
2. Open `workspace.mitelis.net` — the noise overlay is not visible; confirm in
   DevTools that the node exists but computes to `display: none`.
3. Click the toolbar button — the overlay reappears immediately without a
   reload, badge shows `OFF`.
4. Reload the page — the overlay is still shown (state persisted).
5. Click again — overlay hidden, badge cleared.
6. Open an unrelated site — the extension is inactive, no content script runs.
