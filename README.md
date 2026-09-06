# TaskTap

Toggle a task by tapping its text in Obsidian on mobile.

In editing view, tap immediately after the final character to place the cursor normally. Tap the text itself, including its final character, to toggle the checkbox.

TaskTap is an independent community plugin, not an official Obsidian product.

## Behavior

- Reading view: a short tap on task text activates its existing checkbox.
- Editing view: works with ordinary task lines in both Live Preview and Source mode.
- Wrapped lines: only the end of the complete task text is the cursor-entry area, not an intermediate screen wrap.
- Links, tags, checkboxes and other interactive controls keep their own actions.
- Scrolling, long presses, text selection and modifier-key clicks do not toggle tasks.
- Editor changes support undo. Ordinary status changes preserve the existing cursor position.
- Desktop interaction is unchanged.

When the Tasks plugin and its toggle API are available, editor toggles use Tasks' configured status transitions, completion behavior and recurring tasks. Without that API, a space becomes `x` and any other status becomes a space. Tasks is optional.

## Requirements and limitations

- Obsidian 1.12.4 or later. The minimum version is deliberately set to the version used for integration testing.
- Mobile app for tap-to-toggle behavior. Desktop can run the status command only.
- Editing support applies to task lines themselves. Rendered callout blocks, embedded notes and query results retain their native behavior in editing view.
- Canvas and popovers are excluded. Task-like text inside fenced code blocks is not toggled.
- Mixed-direction text, third-party editor decorations and changes to Obsidian's internal markup may affect hit testing.
- This plugin changes text interaction on mobile. Try it in a disposable note first, especially near the end of a task.

## Install manually

1. Download `main.js` and `manifest.json` from a GitHub release.
2. Create `tap-toggle-task` inside your vault's plugins configuration folder (normally `.obsidian/plugins/`).
3. Copy both files into that folder.
4. Restart Obsidian and enable **TaskTap** under Community plugins.

The internal ID remains `tap-toggle-task` for compatibility with earlier local builds. Do not enable a second copy of the same plugin.

After an update, disable and re-enable TaskTap on each device. Run **TaskTap: Show status** from the command palette to check the loaded version, platform and view mode.

## Privacy

TaskTap makes no network requests, collects no telemetry, requires no account or payment, and does not access files outside the vault. It does not keep a separate copy of your notes. It handles task text locally using the editor or the existing checkbox handler. Optional Tasks integration runs locally inside Obsidian.

Obsidian and other installed plugins have their own behavior and privacy policies.

## Development

Use Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm run check
npm run lint
npm run build
npm test
```

`main.ts` is the source. TypeScript emits a CommonJS `main.js`. Obsidian and CodeMirror are provided by the host app and are not bundled as duplicate runtime instances. Dependencies are locked in `package-lock.json`.

## Validation

Integration checks in Obsidian 1.12.4 use a disposable note and simulated mobile events. Covered scenarios include toggling in both editor modes, trailing cursor placement, wrapped and formatted text, undo, Tasks recurrence, operation without Tasks, links, scroll rejection and handler cleanup. Reading view regression checks cover nested tasks, custom statuses, callouts and direct checkbox clicks.

Synthetic desktop events cannot prove physical keyboard behavior or finger targeting on iOS and Android. Verify those on a physical device before relying on a new release. See [TESTING.md](TESTING.md).

## Release

Update the version in `manifest.json` and `package.json`, add its minimum app version to `versions.json`, run all checks, and commit the matching source and build. Create a release whose tag exactly matches the manifest version, without a `v` prefix, and attach `main.js` and `manifest.json`.

## License

MIT. See [LICENSE](LICENSE).
