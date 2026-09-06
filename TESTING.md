# Device smoke test

Use a disposable note containing only synthetic tasks:

```md
- [ ] Buy tea
    - [ ] Pick a flavor
- [x] Read a chapter
- [ ] A long task description that wraps onto another screen line
- [ ] Follow a [link](https://example.com)

> [!note] Sample
> - [ ] A task in a callout
```

1. In Reading view, tap task text twice. Verify both changes are saved and each tap toggles only once.
2. Tap a nested task and check that the parent is unchanged.
3. In Live Preview, tap the beginning, middle and final character. Each should toggle the task without moving an existing cursor.
4. Tap after the final character. Verify normal cursor placement and keyboard entry.
5. Repeat in Source mode and on a wrapped task. An intermediate wrap must not become an end-of-task cursor area.
6. Undo a toggle. Check that the previous task state and cursor are restored.
7. Scroll, long-press, select text and follow a link. None should toggle the task accidentally.
8. Tap a checkbox directly. It should toggle exactly once.
9. With Tasks enabled, test a recurring task and a custom status. Check the expected next occurrence and undo.
10. Repeat ordinary task toggles without Tasks enabled.
11. Disable TaskTap. Check that the native editor and reading behavior return.

Check both iOS and Android, with the keyboard initially hidden and already open. TaskTap does not claim physical-device coverage based on synthetic event tests alone.
