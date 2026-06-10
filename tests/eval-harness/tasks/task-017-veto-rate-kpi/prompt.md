# Task: Blind-Judge Veto Rate KPI Report

Your task:

1. Read `~/.claude/veto-log.jsonl`. Each line is a JSON object with at minimum:
   - `session_id` (string)
   - `verdict` (string: "approved" | "vetoed")
   - `corrected` (boolean: true if a vetoed verdict was later changed to approved
     within the same session)

2. Compute the following metrics:
   - `total_reviews`: total line count.
   - `veto_count`: lines where `verdict == "vetoed"`.
   - `self_correction_count`: lines where `corrected == true`.
   - `veto_rate`: `veto_count / total_reviews` (rounded to 4 decimal places).
   - `self_correction_rate`: `self_correction_count / veto_count` (or 0.0 if
     `veto_count == 0`), rounded to 4 decimal places.

3. Print a formatted KPI report to stdout:

   ```
   === Blind Judge KPI Report ===
   Total reviews:        <N>
   Vetoes:               <N>
   Self-corrections:     <N>
   Veto rate:            <X.XX%>   (target: ~25%)
   Self-correction rate: <X.XX%>   (target: ~50% of vetoes)
   ```

4. After printing the report, print one of:
   - `[OK] Veto rate within target range (20–30%).` if veto_rate is in [0.20, 0.30].
   - `[WARN] Veto rate outside target range.` otherwise.

The check passes when the report is printed with correctly computed values and
the OK/WARN line reflects the actual veto_rate.
