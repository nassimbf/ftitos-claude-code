# Ftitos Claude Code Documentation

**Complete reference guides for Claude Code's command system and brain architecture**

---

## 📚 Documents in This Directory

### 1. **CLAUDE_CODE_CHEAT_SHEET.md** (Main Reference)
   **For:** Anyone using Claude Code
   **Content:**
   - Complete command reference (100+ commands)
   - Organized by functionality, not alphabetically
   - Quick lookup tables by use case
   - Workflow patterns (feature → ship)
   - Daily/weekly/shipping cadences
   - Troubleshooting guide

   **Size:** ~200 KB
   **Read Time:** 30-45 minutes (reference style)

   **Key Sections:**
   - 🚀 Project Setup & Initialization
   - 📋 Project Planning & Architecture
   - 💻 Feature Development & Implementation
   - 🔍 Code Review & Quality
   - 🔐 Security & Audits
   - ✅ Testing & Verification
   - 🧠 Knowledge & Brain Systems
   - 📚 Git & Version Control
   - 👥 Team & Multi-Model Workflows
   - ⚙️ Workspace Management
   - 🛠️ Utility & Configuration

---

### 2. **BRAIN_SYSTEMS_TECHNICAL_GUIDE.md** (Deep Dive)
   **For:** Technical people wanting to understand HOW the brains work
   **Content:**
   - Complete architecture overview of 4-brain system
   - Technical deep dives on each brain:
     - **GBrain** (WHO+WHY) — people, organizations, relationships
     - **Graphify** (WHAT+HOW) — concepts, knowledge graph, communities
     - **GitNexus** (WHERE+IMPACT) — code structure, impact analysis
     - **Engram** (LEARNED) — session memory, decisions, patterns
   - How they work together
   - Query execution models
   - Data structures and indexing
   - Practical examples
   - Design trade-offs and limitations

   **Size:** ~150 KB
   **Read Time:** 45-60 minutes (comprehensive but accessible)

   **Key Sections:**
   - Architecture & Problem Overview
   - Individual Brain Systems (4 sections)
   - Integration & Unified Router
   - Technical Deep Dives (query execution, memory, consistency)
   - Practical Examples (real use cases)
   - Key Insights & Trade-offs

---

## 🎯 Which Document to Read?

### I want to...
| Goal | Read This | Time |
|------|-----------|------|
| Know what commands exist | **CHEAT_SHEET** | 5 min (scan) |
| Find a specific command | **CHEAT_SHEET** - Use quick lookup | 1 min |
| Understand the full workflow | **CHEAT_SHEET** - Workflow patterns | 10 min |
| Learn how GBrain works | **BRAIN_GUIDE** - Section 2 | 15 min |
| Understand code impact analysis | **BRAIN_GUIDE** - GitNexus section | 20 min |
| Understand memory system | **BRAIN_GUIDE** - Engram section | 15 min |
| Learn all 4 brains | **BRAIN_GUIDE** - Full document | 45 min |
| Troubleshoot a problem | **CHEAT_SHEET** - Troubleshooting section | 5 min |
| Design a new workflow | **CHEAT_SHEET** - Workflow patterns | 15 min |
| Understand "what breaks?" queries | **BRAIN_GUIDE** - GitNexus impact section | 20 min |

---

## 🚀 Quick Start

### If You're New to Claude Code:
1. Start with **CHEAT_SHEET** - Overview section (5 min)
2. Skim the "Quick Lookup by Use Case" table (10 min)
3. Read the "Workflow Patterns" for your use case (10 min)
4. Reference as needed while working

### If You Want to Understand the Brain System:
1. Read **BRAIN_GUIDE** - Overview section (5 min)
2. Read each brain section in order:
   - GBrain (WHO+WHY) — 10 min
   - Graphify (WHAT+HOW) — 15 min
   - GitNexus (WHERE+IMPACT) — 15 min
   - Engram (LEARNED) — 10 min
3. Read "How They Work Together" (5 min)
4. Read practical examples relevant to you (10 min)

### If You're Troubleshooting:
1. Go to **CHEAT_SHEET** - "When Something Breaks" section
2. Find your problem in the table
3. Run the suggested command

---

## 📖 Reading Tips

### For the Cheat Sheet:
- **Bookmark the "Quick Lookup by Use Case" table** — you'll reference it constantly
- **Skim the workflow patterns** — understand the big picture first
- **Read only the sections relevant to your workflow**
- Keep it open while working (search feature will be your friend)

### For the Brain Guide:
- **Read in order** — each brain builds on previous understanding
- **Pay attention to the "How It Works" sections** — these show the mental model
- **Study the data model examples** — they clarify the abstract concepts
- **Read the practical examples** — they show real query patterns
- **Understand the limitations** — know what each brain can and can't do

---

## 🔗 Cross-References

### Commands That Use Each Brain:

**GBrain (people/context)**
- `/brain who is <person>`
- `/brain <query>` → routes to GBrain for people queries

**Graphify (concepts)**
- `/brain what concepts relate to <topic>`
- `/brain search <concept>`

**GitNexus (code)**
- `/brain how does <feature> work`
- `/brain impact of changing <symbol>`
- `/brain what will break if I change <X>`
- `/project:review` (uses GitNexus for impact analysis)

**Engram (memory)**
- `/brain what did we decide about <topic>`
- `/brain last session`
- `/brain remember <observation>`
- `/mem_search <keyword>`
- `/mem_save <observation>`

---

## 💡 Key Concepts

### The 4 Brains Model

| Brain | Specialty | Answers |
|-------|-----------|---------|
| **GBrain** | People, orgs, relationships | "Who?" "Who decided?" "Who should review?" |
| **Graphify** | Concepts, architecture, ideas | "What concepts?" "How related?" "Architecture view?" |
| **GitNexus** | Code structure, impact | "Where is it?" "What calls it?" "What breaks?" |
| **Engram** | Memory, decisions, patterns | "What did we decide?" "Have we tried this?" "Remember when?" |

### The Unified Router

`/brain <query>` intelligently routes to the right brain(s):
- Classifies your intent
- Sends query to appropriate brain(s)
- Runs in parallel when possible
- Merges and attributes results

### Why 4 Separate?

Each brain optimized for:
- **Different data** (code vs people vs decisions)
- **Different access patterns** (hot vs cold path)
- **Different update frequencies** (constant vs rare)
- **Different scales** (millions of symbols vs dozens of people)

---

## 📊 Document Statistics

| Document | Content | Format | Sections | Size |
|----------|---------|--------|----------|------|
| **CHEAT_SHEET** | Command reference | Markdown | 12 categories + lookup tables | ~200 KB |
| **BRAIN_GUIDE** | Technical deep dives | Markdown | 8 major sections + examples | ~150 KB |

---

## 🎓 Learning Paths

### Path 1: "I Just Want to Use Claude Code" (30 min)
1. CHEAT_SHEET - Overview (5 min)
2. CHEAT_SHEET - "My Use Case" workflow (10 min)
3. CHEAT_SHEET - Command reference (15 min)
4. Start using `/project:sprint` or `/ccg:feat`

### Path 2: "I Want to Master the System" (90 min)
1. CHEAT_SHEET - Full document (45 min)
2. BRAIN_GUIDE - Full document (45 min)
3. Hands-on: Try `/brain search <topic>` and `/brain how does X work`

### Path 3: "I'm Building Something Complex" (60 min)
1. CHEAT_SHEET - Workflow patterns (10 min)
2. BRAIN_GUIDE - GitNexus section (20 min)
3. BRAIN_GUIDE - How they work together (10 min)
4. CHEAT_SHEET - Team workflows section (10 min)
5. Hands-on: Try `/project:review` + `/brain impact of X`

### Path 4: "I'm Troubleshooting or Debugging" (10 min)
1. CHEAT_SHEET - Troubleshooting section (5 min)
2. Run suggested command
3. Reference BRAIN_GUIDE if understanding the "why"

---

## 🔧 How to Use These Docs

### During Development:
- Keep CHEAT_SHEET open in a split pane
- Use Ctrl+F to search for the command you need
- Copy/paste examples as needed

### During Code Review:
- Reference the review workflow patterns
- Use GitNexus impact analysis (via `/brain impact of`)
- Check decisions via `/brain what did we decide`

### During Architecture Design:
- Use Graphify to understand concepts (via `/brain what concepts`)
- Use GitNexus to understand existing structure
- Reference decisions from Engram

### When Learning/Onboarding:
- Read both documents in order
- Try hands-on examples from BRAIN_GUIDE
- Practice with real queries on your project

---

## 📝 Document Version Info

| Document | Last Updated | Version |
|----------|--------------|---------|
| CHEAT_SHEET | April 19, 2026 | 2.0 |
| BRAIN_GUIDE | April 19, 2026 | 1.0 |
| INDEX (this file) | April 19, 2026 | 1.0 |

---

## 🤝 Contributing

These documents are reference materials. As Claude Code evolves:
- New commands get added to CHEAT_SHEET
- New brain capabilities get added to BRAIN_GUIDE
- Keep both up to date with the actual system

---

## ❓ FAQ

**Q: Should I read both documents?**
A: If you only care about using commands → CHEAT_SHEET. If you want to understand how the system works → both. BRAIN_GUIDE is optional but helps you get the most out of the system.

**Q: Can I search these documents?**
A: Yes, use your reader's search (Ctrl+F) to find commands, concepts, or examples.

**Q: Are the examples real?**
A: Yes, they're based on actual Ftitos setup and workflows. Some output is simplified for clarity.

**Q: What if a command isn't listed?**
A: CHEAT_SHEET is comprehensive as of April 2026. New commands are added to Claude Code regularly. Check `/help` in Claude Code for the latest.

**Q: How do I report an error in these docs?**
A: These are reference documents for the system. If something is inaccurate, the actual system is the source of truth.

---

## 📚 Additional Resources

- **Everything Claude Code repo:** `/Users/theftitostai.lung.2026/everything-claude-code/`
- **Claude Code settings:** `~/.claude.json`
- **Command definitions:** `~/.claude/commands/`
- **Brain systems:** MCP servers (gbrain, graphify, gitnexus, engram)

---

**Happy coding! 🚀**

For questions about specific commands, search CHEAT_SHEET.
For questions about how the brain systems work, search BRAIN_GUIDE.

