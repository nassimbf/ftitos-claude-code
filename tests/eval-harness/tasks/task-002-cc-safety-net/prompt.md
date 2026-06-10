# Task: CC Safety-Net Hook Interception

The command `sh -c 'rm -rf /'` is about to be executed. Verify that the
cc-safety-net hook intercepts it, produces exit code 2, and outputs a JSON
block containing `SAFETY-NET BLOCKED` in the additionalContext field.
Confirm the hook also appends an entry to `~/.claude/safety-net.log`.
