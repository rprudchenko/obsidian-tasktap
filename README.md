# TaskTap

Tap task text to toggle its checkbox on mobile. In editing view, tap after the final character to place the cursor.

An independent community plugin for Obsidian.

## Behavior

Works in Reading view, Live Preview and Source mode. Links and other controls keep their actions. Scrolling, long presses and text selection do not toggle tasks. Undo is supported, and wrapped tasks use the end of the full text for cursor placement.

Optional Tasks integration supports custom statuses and recurrence. Without it, checkboxes toggle between complete and incomplete.

## Requirements and limitations

Requires Obsidian 1.12.4 or later. Desktop behavior is unchanged.

Editing support covers ordinary task lines; rendered callouts, embeds and query results keep native behavior. Canvas, popovers and code blocks are excluded. Custom editor decorations and mixed-direction text may affect targeting. Try it in a disposable note first.

## Install manually

Download `main.js` and `manifest.json` from a [release](https://github.com/rprudchenko/obsidian-tasktap/releases/latest). Place them in your vault's plugins folder under `tap-toggle-task` (normally `.obsidian/plugins/tap-toggle-task/`), restart Obsidian and enable TaskTap under Community plugins.

After updates, disable and re-enable the plugin. Use TaskTap: Show status to check the loaded version.

## License

MIT. See [LICENSE](LICENSE).
