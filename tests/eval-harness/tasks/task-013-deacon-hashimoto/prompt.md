# Task: Deacon Transcript Analysis — Hashimoto Candidate

Given a session transcript where the same `ModuleNotFoundError: saa.engine` error
appears 3 times across different tool calls, run the deacon agent in
transcript-analysis mode.

Your task:

1. Load the session transcript and identify all occurrences of
   `ModuleNotFoundError: saa.engine`.
2. Run the deacon agent against the transcript. The agent must:
   a. Detect that the same error repeats >= 3 times across distinct tool calls.
   b. Classify the pattern as a recurring failure warranting a permanent fix.
3. Produce a `hashimoto-candidate.json` file in the working directory with the
   following structure:

   ```json
   {
     "error": "ModuleNotFoundError: saa.engine",
     "occurrences": <N>,
     "fix_type": "<one of: sign | lint | hook | tool | gate>",
     "proposed_fix": "<brief description of the permanent fix>",
     "confidence": <0.0-1.0>
   }
   ```

4. The `fix_type` field must be one of the five canonical Hashimoto categories.
   Choose the most appropriate one for a missing-module import error.
5. Do NOT attempt to apply the fix — only produce the candidate file.

The check passes when `hashimoto-candidate.json` exists, has the correct schema,
occurrences >= 3, and fix_type is one of the five valid values.
