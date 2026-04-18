# Anti-AI-Slop Rules

These patterns are banned from all generated code, designs, and copy. They signal lazy AI output and destroy credibility.

## Visual Design Slop (Frontend/UI)

- NEVER use purple/violet/indigo gradient backgrounds — the #1 AI tell
- NEVER create 3-column feature grids with icon-in-colored-circle cards — generic and meaningless
- NEVER use rounded-card-with-shadow-on-everything layouts — shows zero design thinking
- NEVER add emoji as design elements in professional interfaces
- NEVER create generic stock-photo hero sections with overlaid text
- NEVER use glassmorphism/frosted glass effects unless the design system explicitly calls for it
- NEVER create floating particle/dot animations as backgrounds — pure decoration with no function

## Copy Slop (Text/Marketing)

- NEVER write "unleash the power of..." or "unlock your potential" — vacuous filler
- NEVER use "revolutionary", "cutting-edge", "game-changing", "next-generation" — meaningless superlatives
- NEVER write "seamless", "robust", "scalable" without concrete evidence — show don't tell
- NEVER use "leverage" as a verb, "synergy", "paradigm shift" — corporate jargon that says nothing
- NEVER start paragraphs with "In today's fast-paced world..." or "In the ever-evolving landscape..." — instant credibility killer

## Code Slop

- NEVER leave Lorem Ipsum in shipped code — use real or realistic placeholder data
- NEVER include placeholder data that looks real (fake user "John Doe", fake email "test@test.com") — use obviously-fake data if needed
- NEVER create meaningless loading spinners that mask empty states — show skeleton screens or empty state designs
- NEVER add TODO comments in shipped code without issue tracker references
- NEVER create wrapper functions that just pass through to one other function — unnecessary abstraction
- NEVER generate boilerplate comments that restate what the code already says ("// increment counter" above counter++)

## Anti-Pattern Detection

When generating ANY frontend component, UI design, marketing copy, or user-facing text:
1. Review against this blacklist before outputting
2. If any pattern matches, replace with a specific, contextual alternative
3. When in doubt, choose plain and functional over decorative and generic
