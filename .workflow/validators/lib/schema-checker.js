/**
 * Shared assertion helpers for deterministic validators.
 */

/**
 * Build a gate result object.
 * @param {Array<{name: string, passed: boolean, message?: string}>} checks
 * @returns {{ passed: boolean, checks: Array }}
 */
function buildResult(checks) {
  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}

/**
 * Assert a condition and return a check object.
 * @param {string} name
 * @param {boolean} condition
 * @param {string} [failMessage]
 * @returns {{ name: string, passed: boolean, message?: string }}
 */
function check(name, condition, failMessage) {
  return condition
    ? { name, passed: true }
    : { name, passed: false, message: failMessage || `Check '${name}' failed` };
}

/**
 * Check that all required keys are present and non-empty in an object.
 * @param {Record<string,unknown>} obj
 * @param {string[]} requiredKeys
 * @param {string} contextName
 * @returns {Array<{name: string, passed: boolean, message?: string}>}
 */
function requiredFields(obj, requiredKeys, contextName) {
  return requiredKeys.map((key) =>
    check(
      `${contextName}.${key}-present`,
      obj[key] !== undefined && obj[key] !== null && obj[key] !== '',
      `Required field '${key}' is missing or empty in ${contextName}`
    )
  );
}

module.exports = { buildResult, check, requiredFields };
