const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "main.ts"), "utf8");
const compiled = fs.readFileSync(path.join(root, "main.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const versions = JSON.parse(fs.readFileSync(path.join(root, "versions.json"), "utf8"));

test("release metadata is consistent", () => {
  assert.equal(manifest.name, "TaskTap");
  assert.equal(manifest.id, "tap-toggle-task");
  assert.equal(manifest.version, pkg.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  assert.equal(manifest.author, "prudok");
  assert.equal(manifest.isDesktopOnly, false);
  assert.equal(pkg.license, "MIT");
});

test("published JavaScript matches the TypeScript source", () => {
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  assert.equal(compiled, result.outputText);
});

test("runtime imports are provided by Obsidian", () => {
  const imports = [...compiled.matchAll(/require\("([^"]+)"\)/g)].map(match => match[1]);
  assert.deepEqual(imports.sort(), ["obsidian", "@codemirror/view", "@codemirror/state", "@codemirror/commands"].sort());
  assert.doesNotMatch(compiled, /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|requestUrl)\b/);
});

test("runtime and public text contain no local profile paths or non-English UI", () => {
  for (const file of ["main.ts", "main.js", "manifest.json", "README.md", "TESTING.md", "CHANGELOG.md"]) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(text, /[\u0400-\u04ff]/);
    assert.doesNotMatch(text, /\/Users\/|iCloud~|-----BEGIN .*PRIVATE KEY-----/);
  }
});

test("desktop registers diagnostics without intercepting input", () => {
  const commands = [];
  const output = { exports: {} };
  const api = {
    Plugin: class {
      addCommand(command) { commands.push(command); }
      registerDomEvent() { assert.fail("Desktop must not register input handlers"); }
    },
    Platform: { isMobileApp: false },
  };
  vm.runInNewContext(compiled, {
    exports: output.exports,
    require: name => name === "obsidian" ? api : {},
  });
  new output.exports.default().onload();
  assert.deepEqual(commands.map(command => command.name), ["Show status"]);
});
