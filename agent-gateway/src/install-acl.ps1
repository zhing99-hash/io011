$ErrorActionPreference = 'Stop'
$taskSections = [System.Security.AccessControl.AccessControlSections]::Access -bor
    [System.Security.AccessControl.AccessControlSections]::Owner -bor
    [System.Security.AccessControl.AccessControlSections]::Group

if ($env:AGENT_GATEWAY_ACL_VALUE) {
    $taskBytes = [Convert]::FromBase64String($env:AGENT_GATEWAY_ACL_VALUE)
} else {
    $taskBytes = [System.IO.File]::GetAccessControl(
        $env:AGENT_GATEWAY_ACL_SOURCE, $taskSections
    ).GetSecurityDescriptorBinaryForm()
}

# Import into a new object so .NET marks the access rules as modified.
$taskOriginal = [System.Security.AccessControl.FileSecurity]::new()
$taskOriginal.SetSecurityDescriptorBinaryForm($taskBytes, $taskSections)
$taskExisting = [System.IO.File]::GetAccessControl($env:AGENT_GATEWAY_ACL_TARGET, $taskSections)
$taskSid = [System.Security.Principal.SecurityIdentifier]
if ($taskOriginal.GetOwner($taskSid).Value -ne $taskExisting.GetOwner($taskSid).Value -or
    $taskOriginal.GetGroup($taskSid).Value -ne $taskExisting.GetGroup($taskSid).Value) {
    throw 'UNSUPPORTED_FILE_OWNER'
}

# Do not request WRITE_OWNER: this installer never transfers file ownership.
$taskAcl = [System.Security.AccessControl.FileSecurity]::new()
$taskAcl.SetSecurityDescriptorBinaryForm(
    $taskBytes, [System.Security.AccessControl.AccessControlSections]::Access
)
if ($env:AGENT_GATEWAY_ACL_PROTECT -eq '1') {
    # A backup in a different directory must not inherit broader access there.
    $taskAcl.SetAccessRuleProtection($true, $true)
}
[System.IO.File]::SetAccessControl($env:AGENT_GATEWAY_ACL_TARGET, $taskAcl)
[Console]::Out.Write([Convert]::ToBase64String($taskBytes))
