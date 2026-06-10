# Task: OpenSpec Delta-Spec Hash Validation

Your task:

1. Create a delta-spec file at `specs/delta/rollforward.delta.json` that targets
   `docs/product-specs/rollforward.md` as the source-of-truth. The delta-spec must
   include the SHA-256 hash of the file's current content under the key
   `source_hash`.

   Minimum required structure:

   ```json
   {
     "source": "docs/product-specs/rollforward.md",
     "source_version": "<SHA-256 of current file content>",
     "created_at": "<ISO-8601 timestamp>",
     "rules": []
   }
   ```

2. Modify `docs/product-specs/rollforward.md` by appending a single blank line.
   This changes the file's SHA-256 hash.

3. Run the spec validator against the delta-spec. The validator must:
   a. Recompute the SHA-256 hash of the current `rollforward.md`.
   b. Compare it against the stored `source_version`.
   c. Detect the mismatch and print an INVALIDATED warning to stdout in the
      following format:

      ```
      [INVALIDATED] specs/delta/rollforward.delta.json
      Stored hash:  <original SHA-256>
      Current hash: <new SHA-256>
      Action: re-anchor or review spec
      ```

4. Do NOT update the delta-spec automatically — the warning output is sufficient.

The check passes when the INVALIDATED warning is printed with both hashes and
they differ.
