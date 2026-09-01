# Claude Code Plugins
> - https://anthropic.skilljar.com/claude-code-in-action/486939
> - https://www.youtube.com/watch?v=k4kZwJ0FtX0
---
## 1. What is a Plugin?

A **Claude Code plugin** is an installable package that bundles a Claude Code setup so it can be shared consistently across machines and team members.

A plugin can contain:

- Skills
- Subagents
- Hooks
- MCP server configurations
- LSP servers
- Background monitors
- Themes
- Limited `settings.json` configuration

### Core idea

```text
.claude setup
     │
     ▼
  Package
     │
     ▼
   Plugin
     │
     ▼
Share across team
```

Instead of manually copying `.claude` files between machines, the team installs one versioned plugin.

---

## 2. Installing a Plugin

Install a plugin directly:

```bash
/plugin install org-name@plugin-name
```

Claude Code may ask you to run:

```bash
/reload-plugins
```

to apply the changes.

---

## 3. Marketplace

For teams, add a shared marketplace:

```bash
/plugin marketplace add your-org/claude-plugins
```

A marketplace provides centralized:

- Plugin discovery
- Version tracking
- Updates
- Team distribution

Plugins can be browsed through the **Discover** tab.

```text
Team Marketplace
       │
       ├── Plugin A
       ├── Plugin B
       └── Plugin C
            │
       ┌────┼────┐
       ▼    ▼    ▼
      Dev1 Dev2 Dev3
```

---

## 4. Security: Read Before Installing

A plugin can **run code on your machine with your privileges**.

It is therefore not just a collection of prompts or configuration.

Pay particular attention to:

- Hooks
- Agents/subagents
- MCP servers
- Scripts/commands
- Network access

For example, a plugin could contain a `Stop` hook that makes a network request whenever the corresponding event occurs.

### Important rule

> **Reviewed does not mean fully trusted. Inspect a plugin before installing or enabling it.**

Community marketplace submissions may go through automated review, while the official marketplace follows a separate curation process.

---

## 5. Plugin Components Run Alongside Yours

Installing a plugin generally does **not overwrite your configuration**.

Plugin components operate alongside your existing components.

### Hooks stack

If both your configuration and a plugin have a `PreToolUse` hook:

```text
Tool Call
   │
   ├── Your PreToolUse hook
   │
   └── Plugin PreToolUse hook
```

Neither automatically replaces the other.

This is why plugin hooks should be inspected before installation.

---

## 6. Namespacing

Skills, agents, and commands provided by plugins are namespaced using the plugin name.

Example:

```text
company-name:skill-name
```

This prevents collisions between your own components and components from different plugins.

---

## 7. Plugin `settings.json`

A plugin can contain a `settings.json`, but only a limited portion is honored.

The course specifically notes support for:

- Agent status line
- Subagent status line

The **agent** setting is particularly important because it can promote one of the plugin's subagents to the main thread.

This can affect:

- System prompt
- Tool restrictions
- Model
- Default Claude Code behavior

Therefore, inspect the plugin before enabling it.

---

## 8. Packaging Your Own Plugin

Once you have a `.claude` directory that works well, package it instead of manually copying it between machines.

A plugin follows the existing `.claude` structure:

```text
.claude/
├── skills/
│   ├── skill-1/
│   └── skill-2/
│
├── agents/
│   ├── reviewer.md
│   └── tester.md
│
├── hooks/
│   └── hooks.json
│
└── .mcp.json
```

Claude Code discovers components based on these conventions.

---

## 9. Plugin Manifest

An optional manifest can be added at:

```text
.claude-plugin/plugin.json
```

Example:

```json
{
  "name": "svg-splitter-review",
  "version": "0.1.0",
  "description": "Reviews the SVG Splitter repo",
  "author": {
    "name": "Lewis Menelaws"
  }
}
```

### Manifest fields

| Field | Purpose |
|---|---|
| `name` | Plugin name and namespace |
| `version` | Version tracking and updates |
| `description` | Plugin description |
| `author` | Plugin author |

**`name` is the only required field.**

The manifest is optional because Claude Code can discover components from the directory structure.

---

## 10. Versioning

Treat plugins like software dependencies.

```text
Plugin v0.1.0
      │
      ▼
Team installs
      │
      ▼
Plugin v0.2.0
      │
      ▼
Team updates
```

Versioning provides:

- Consistent team versions
- Update tracking
- Easier dependency management

---

## 11. Manual `.claude` Sharing vs Plugin

| Manual Sharing | Plugin |
|---|---|
| Copy files manually | One installable unit |
| Easy to get out of sync | Version controlled |
| Difficult to update | Easier updates |
| Individual setup | Shared setup |
| More maintenance | Centralized distribution |

---

## 12. Senior Engineer Takeaways

### Plugin = packaged Claude Code capability

```text
Skills
+ Agents
+ Hooks
+ MCP
+ Other components
        │
        ▼
      Plugin
```

### Most important security concept

```text
Install plugin
      │
      ▼
Plugin code executes
      │
      ▼
Uses your machine's privileges
```

### Key rules

1. **Use plugins to distribute reusable Claude Code setups.**
2. **Inspect hooks, agents, and MCP servers before installation.**
3. **Remember that plugin hooks stack with your own hooks.**
4. **Plugin components are namespaced to avoid collisions.**
5. **Version plugins like software dependencies.**
6. **Once a `.claude` setup is proven, package it as a plugin instead of copying files manually.**

> **Memory aid:** A Claude Code plugin is a versioned, installable package of Claude Code capabilities—treat it like executable software, not just configuration.
