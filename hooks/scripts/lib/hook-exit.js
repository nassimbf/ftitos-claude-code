'use strict';
/**
 * hook-exit.js — a declared crash policy for every hook.
 *
 * Ported from open-gsd/gsd-core (MIT), hooks/lib/hook-exit.js. The idea and the
 * reasoning below are theirs, adapted to this repo's exit protocol.
 *
 * WHY THE POLICY IS A REQUIRED ARGUMENT WITH NO DEFAULT — this is the whole
 * module. Every hook here ends its outer try/catch one of two ways:
 *
 *   exit 0  fail open  — a hook's own bug must never block a legitimate call.
 *                        Right for advisory hooks: ship-gate, read-injection-
 *                        scanner, post-edit-combined.
 *   exit 2  fail closed — a hook whose entire job is a safety denial must not
 *                        let its own bug wave the denial through. Right for
 *                        pre-secrets-block and secret-read-guard: a crash
 *                        there means a secret ships.
 *
 * Both are correct, for different hooks. Neither is obviously correct. So a
 * helper that silently defaulted to either would let a future hook inherit the
 * wrong policy by saying nothing — "nothing fails with success", the defect
 * worth closing. Naming the policy at the call site makes "I forgot to decide"
 * a visible failure instead of a silent behaviour.
 *
 * resolveCrashExit is TOTAL: it never throws, even on hostile input. Throwing
 * would unwind into the caller's own outer catch — exactly the
 * fail-open-by-accident hazard this removes. An unrecognised policy resolves to
 * a loud exit 2 naming the offending value, so a typo is debuggable on stderr
 * rather than being silently reinterpreted as ALLOW.
 */

/** The two declarable policies. There is deliberately no third. */
const HOOK_ON_CRASH = Object.freeze({
  ALLOW: 'allow',
  DENY: 'deny',
});

const VALID = new Set([HOOK_ON_CRASH.ALLOW, HOOK_ON_CRASH.DENY]);

/**
 * Render a policy value for a diagnostic. Total — Symbols and objects included,
 * because String(Symbol()) throws under implicit coercion and a diagnostic path
 * that throws is worse than useless.
 */
function describeCrash(value) {
  try {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'symbol') return value.toString();
    return JSON.stringify(value) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * Resolve a declared crash policy to an exit decision.
 *
 * @param {'allow'|'deny'} onCrash
 * @returns {{code: 0|2, declared: boolean, reason: string|null}}
 */
function resolveCrashExit(onCrash) {
  if (typeof onCrash === 'string' && VALID.has(onCrash)) {
    return {
      code: onCrash === HOOK_ON_CRASH.ALLOW ? 0 : 2,
      declared: true,
      reason: null,
    };
  }

  // Undeclared or unrecognised. This is a bug in the HOOK, not a safety
  // decision about the user's command, so it must be loud rather than quietly
  // permissive — exit 2 puts the diagnostic in front of the model instead of
  // letting it vanish.
  return {
    code: 2,
    declared: false,
    reason:
      `hook did not declare a crash policy (got ${describeCrash(onCrash)}). `
      + 'Pass HOOK_ON_CRASH.ALLOW to fail open or HOOK_ON_CRASH.DENY to fail closed.',
  };
}

/**
 * Terminate per a declared policy. Call from a hook's outer catch.
 *
 * @param {'allow'|'deny'} onCrash declared policy — required
 * @param {Error} [err] the error being handled, for the diagnostic
 */
function crash(onCrash, err) {
  const { code, declared, reason } = resolveCrashExit(onCrash);
  if (!declared) {
    process.stderr.write(`HOOK-EXIT: ${reason}\n`);
  } else if (code !== 0 && err) {
    process.stderr.write(`HOOK-EXIT: failing closed after ${err.message}\n`);
  }
  process.exit(code);
}

module.exports = { HOOK_ON_CRASH, resolveCrashExit, describeCrash, crash };
