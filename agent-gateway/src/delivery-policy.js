/**
 * Evaluates trusted snapshots before delivery. This function does not
 * authenticate the caller, perform a scan, or provide transaction isolation.
 * Re-evaluate in the delivery transaction and control concurrent changes.
 */
export function evaluateDelivery({ principal, clientAuthorization, grant, target, file, scan, policy } = {}) {
  const denied = (reason) => ({ allowed: false, reason });
  const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

  if (!principal || principal.active !== true || !nonempty(principal.id)) {
    return denied('PRINCIPAL_INACTIVE');
  }
  if (!clientAuthorization || clientAuthorization.active !== true ||
      clientAuthorization.principalId !== principal.id || !nonempty(clientAuthorization.clientId)) {
    return denied('CLIENT_AUTHORIZATION_INVALID');
  }
  if (!grant || grant.active !== true || grant.principalId !== principal.id ||
      grant.action !== 'deliver' || !nonempty(grant.targetId) ||
      !Array.isArray(grant.fileTypes) || !Array.isArray(grant.fileIds)) {
    return denied('GRANT_INVALID');
  }
  if (!target || target.enabled !== true || !nonempty(target.id) ||
      target.id !== grant.targetId || !Array.isArray(target.fileTypes)) {
    return denied('TARGET_INVALID');
  }
  if (!file || !nonempty(file.id) || !nonempty(file.version) ||
      !nonempty(file.sha256) || !/^[a-f0-9]{64}$/.test(file.sha256) ||
      !nonempty(file.type) || file.storageState !== 'quarantined') {
    return denied('FILE_INVALID');
  }
  if (!grant.fileIds.includes(file.id)) {
    return denied('FILE_FORBIDDEN');
  }
  if (!grant.fileTypes.includes(file.type) || !target.fileTypes.includes(file.type)) {
    return denied('TYPE_FORBIDDEN');
  }
  if (!policy || policy.active !== true || !nonempty(policy.version)) {
    return denied('POLICY_INVALID');
  }
  if (!scan || scan.status !== 'passed' || scan.fileId !== file.id ||
      scan.fileVersion !== file.version || scan.sha256 !== file.sha256 ||
      scan.policyVersion !== policy.version || !nonempty(scan.engineVersion)) {
    return denied('SCAN_INVALID');
  }
  return { allowed: true, reason: 'ALLOWED' };
}
