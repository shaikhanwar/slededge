<#
.SYNOPSIS
  Provision the SIX SLED Use Case Library lists (plus the Solution Architecture
  document library) with CORRECT column internal names, using SharePoint Site
  Designs / Site Scripts via the SharePoint Online Management Shell you already
  have (Microsoft.Online.SharePoint.PowerShell).

  NO PnP. NO Entra app registration. NO browser console.

.WHY THIS EXISTS
  The app's REST calls address every column by its *internal* name (UseCaseId,
  BusinessProblem, ...). "Import from CSV" or hand-made columns mangle internal
  names, so saves fail with HTTP 400 "field does not exist". This script
  declares each column with an explicit internal name via Field XML
  (<Field Name='UseCaseId' .../>), registers it as a Site Script + Site Design,
  and applies the design to the site. Site Designs are Microsoft's supported,
  repeatable, no-app-registration provisioning model — ideal for DEV -> PROD.

  Mirrors SLEDEdge/lists/sled-list-schema.json and the app's column maps in
  SLEDEdge/app/js/store.js (MAPS) 1:1.

.PREREQUISITES
  * PowerShell 7 (pwsh) or Windows PowerShell 5.1.
  * Microsoft.Online.SharePoint.PowerShell:
      Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser -Force
  * You are a SharePoint / tenant admin.
  * Custom script is allowed on the site (admin center -> Active sites ->
    <site> -> Settings -> Custom scripts -> Allow). Not strictly needed for
    provisioning, but needed later so index.aspx runs.

.USAGE
  pwsh -File .\provision-sled-via-sitedesign.ps1 `
       -SiteUrl  "https://vw4gr.sharepoint.com/sites/SLEDUseCaseLibrary"

  # Team site instead of Communication? add: -WebTemplate 64
  # Skip the document library (create it by hand)? add: -SkipLibrary

.NOTES
  Site Designs are ADDITIVE and idempotent: createSPList creates the list on the
  first apply and only adds missing columns on later applies. Safe to re-run.
  The default Title column is reused by the app as each list's name field; this
  script leaves its display name as "Title" (purely cosmetic — rename later in
  List settings if you like).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl,
  [string]$AdminUrl,
  [ValidateSet('64','68')][string]$WebTemplate = '68',  # 68 = Communication, 64 = Team
  [switch]$SkipLibrary
)

$ErrorActionPreference = 'Stop'

# Derive the admin URL from the site URL if not supplied.
if (-not $AdminUrl) {
  if ($SiteUrl -match 'https://([^.]+)\.sharepoint\.com') {
    $AdminUrl = "https://$($Matches[1])-admin.sharepoint.com"
  } else {
    throw "Could not derive AdminUrl from SiteUrl. Pass -AdminUrl explicitly."
  }
}

# ---- Column model (authoritative — mirrors store.js MAPS / sled-list-schema.json)
#      t = Text (single line), n = Note (multi-line). Title exists by default.
$LISTS = [ordered]@{
  'SLEDIndustries' = @{
    t = @('IndustryId','RecordStatus',
          'ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('Description','ReviewNote')
  }
  'SLEDVerticals' = @{
    t = @('VerticalId','IndustryId','RecordStatus',
          'ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('Description','ReviewNote')
  }
  'SLEDSolutionPlays' = @{
    t = @('SolutionPlayId','RecordStatus',
          'ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('Description','ReviewNote')
  }
  'SLEDUseCases' = @{
    t = @('UseCaseId','IndustryId','VerticalId','UCStatus','CopilotRole','SolutionPlay','PatternId',
          'EstimatedImpact','ImpactMetric','OwnerName','OwnerEmail','ReferenceUrl','RepoUrl',
          'RecordStatus','ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('BusinessProblem','CurrentProcess','ChallengeSummary','ProposedSolution','Beneficiaries',
          'Tags','Components','Services','DataDependencies','Compliance','Risks','BusinessValue',
          'Feasibility','Reusability','ReviewNote')
  }
  'SLEDEvents' = @{
    t = @('EventId','StartDate','EndDate','EventStatus','Format','Location','RegistrationUrl',
          'RecordStatus','CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('Themes','Organizers','Notes')
  }
  'SLEDPatterns' = @{
    t = @('PatternId','Repeatability','SolutionPlay','RecordStatus',
          'ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('Summary','Components','AcceleratorIds','ReviewNote')
  }
  'SLEDAccelerators' = @{
    t = @('AcceleratorId','AccType','PatternId','Url','RecordStatus',
          'ApprovalStatus','SubmittedByName','SubmittedAtText','ReviewedByName','ReviewedAtText',
          'CreatedByName','CreatedAtText','ModifiedByName','ModifiedAtText')
    n = @('ReviewNote')
  }
  'SLEDAuditLog' = @{
    t = @('AuditId','RecordId','RecordType','Action','ByName','AtText')
    n = @('Summary')
  }
}

# Business-key column per list (added to the default view so lists are readable).
$KEY = @{
  SLEDIndustries='IndustryId'; SLEDVerticals='VerticalId'; SLEDSolutionPlays='SolutionPlayId'; SLEDUseCases='UseCaseId'; SLEDEvents='EventId';
  SLEDPatterns='PatternId'; SLEDAccelerators='AcceleratorId'; SLEDAuditLog='AuditId'
}

# ---- helpers --------------------------------------------------------------
function New-FieldXml {
  param([string]$Name, [ValidateSet('Text','Note')][string]$Type)
  $id = ([guid]::NewGuid()).ToString('B')
  if ($Type -eq 'Note') {
    return "<Field Type='Note' NumLines='6' RichText='FALSE' Name='$Name' StaticName='$Name' DisplayName='$Name' ID='$id' />"
  }
  return "<Field Type='Text' Name='$Name' StaticName='$Name' DisplayName='$Name' ID='$id' />"
}

function New-ListSubactions {
  param([string]$ListName)
  $sub = New-Object System.Collections.Generic.List[object]
  foreach ($c in $LISTS[$ListName].t) {
    $sub.Add([ordered]@{ verb='addSPFieldXml'; schemaXml=(New-FieldXml $c 'Text'); addToDefaultView=($KEY[$ListName] -eq $c) })
  }
  foreach ($c in $LISTS[$ListName].n) {
    $sub.Add([ordered]@{ verb='addSPFieldXml'; schemaXml=(New-FieldXml $c 'Note'); addToDefaultView=$false })
  }
  return $sub.ToArray()
}

function New-ListScriptJson {
  param([string]$ListName, [object[]]$Subactions, [int]$TemplateType = 100)
  $subJson = @($Subactions) | ConvertTo-Json -Depth 6
  if ($Subactions.Count -eq 1) { $subJson = "[$subJson]" }   # force single-element array
  return @"
{
  "`$schema": "https://developer.microsoft.com/json-schemas/sp/site-design-script-actions.schema.json",
  "actions": [
    {
      "verb": "createSPList",
      "listName": "$ListName",
      "templateType": $TemplateType,
      "subactions": $subJson
    }
  ],
  "bindata": { },
  "version": 1
}
"@
}

function New-LibraryScriptJson {
  param([string]$LibraryName)
  return @"
{
  "`$schema": "https://developer.microsoft.com/json-schemas/sp/site-design-script-actions.schema.json",
  "actions": [
    {
      "verb": "createSPList",
      "listName": "$LibraryName",
      "templateType": 101,
      "subactions": [
        { "verb": "setDescription", "description": "SLED Solution Architecture artifacts. One folder per record (UseCaseId / PatternId)." }
      ]
    }
  ],
  "bindata": { },
  "version": 1
}
"@
}

# ---- connect --------------------------------------------------------------
if (-not (Get-Module -ListAvailable -Name Microsoft.Online.SharePoint.PowerShell)) {
  throw "Microsoft.Online.SharePoint.PowerShell is not installed. Run: Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser -Force"
}
# -UseWindowsPowerShell only exists in PowerShell 7 (imports the Windows-only SPO
# module via the compatibility layer). In Windows PowerShell 5.1 the module loads
# natively, so import it without that switch there.
if ($PSVersionTable.PSEdition -eq 'Core') {
  Import-Module Microsoft.Online.SharePoint.PowerShell -UseWindowsPowerShell -WarningAction SilentlyContinue
} else {
  Import-Module Microsoft.Online.SharePoint.PowerShell -WarningAction SilentlyContinue
}

Write-Host "Connecting to $AdminUrl ..." -ForegroundColor Cyan
Connect-SPOService -Url $AdminUrl

# ---- clean up any previous SLED site scripts/designs (idempotent re-runs) ---
# NOTE: Remove-SPOSiteDesign / Remove-SPOSiteScript do NOT support -Confirm.
$ColsPerChunk = 12   # columns per apply — safely under the per-design stage limit
Write-Host "Removing any previous 'SLED-*' site scripts/designs..." -ForegroundColor DarkGray
Get-SPOSiteDesign | Where-Object { $_.Title -like 'SLED List*' -or $_.Title -like 'SLED Library*' } | ForEach-Object { Remove-SPOSiteDesign -Identity $_.Id -ErrorAction SilentlyContinue }
Get-SPOSiteScript | Where-Object { $_.Title -like 'SLED-*' } | ForEach-Object { Remove-SPOSiteScript -Identity $_.Id -ErrorAction SilentlyContinue }

# ---- provision each list in column-chunks ----------------------------------
$ok = 0; $failed = 0; $failedLists = @()
foreach ($name in $LISTS.Keys) {
  $subs = @(New-ListSubactions -ListName $name)
  $chunks = New-Object System.Collections.Generic.List[object]
  $batch  = New-Object System.Collections.Generic.List[object]
  foreach ($s in $subs) {
    $batch.Add($s)
    if ($batch.Count -ge $ColsPerChunk) { $chunks.Add($batch.ToArray()); $batch = New-Object System.Collections.Generic.List[object] }
  }
  if ($batch.Count -gt 0) { $chunks.Add($batch.ToArray()) }

  $part = 0; $listOk = $true
  foreach ($chunk in $chunks) {
    $part++
    $scriptId = $null; $designId = $null
    try {
      $json = New-ListScriptJson -ListName $name -Subactions $chunk
      $sc = Add-SPOSiteScript -Title "SLED-$name-$part" -Content $json -Description "SLED $name columns part $part"
      $scriptId = $sc.Id
      $design = Add-SPOSiteDesign -Title "SLED List $name $part" -SiteScripts $scriptId -WebTemplate $WebTemplate -Description "Provisions $name (part $part)."
      $designId = $design.Id
      Invoke-SPOSiteDesign -Identity $designId -WebUrl $SiteUrl -ErrorAction Stop | Out-Null
    }
    catch {
      $listOk = $false
      Write-Warning "$name part $part : $($_.Exception.Message)"
    }
    finally {
      if ($designId) { Remove-SPOSiteDesign -Identity $designId -ErrorAction SilentlyContinue }
      if ($scriptId) { Remove-SPOSiteScript -Identity $scriptId -ErrorAction SilentlyContinue }
    }
  }
  if ($listOk) { Write-Host "+ applied $name ($($chunks.Count) part(s))" -ForegroundColor Green; $ok++ }
  else { Write-Host "x FAILED $name" -ForegroundColor Red; $failed++; $failedLists += $name }
}

# ---- Solution Architecture document library --------------------------------
if (-not $SkipLibrary) {
  $lib = 'SLEDSolutionArchitecture'
  $scriptId = $null; $designId = $null
  try {
    $json = New-LibraryScriptJson -LibraryName $lib
    $sc = Add-SPOSiteScript -Title "SLED-$lib" -Content $json -Description "SLED Solution Architecture document library"
    $scriptId = $sc.Id
    $design = Add-SPOSiteDesign -Title "SLED Library $lib" -SiteScripts $scriptId -WebTemplate $WebTemplate -Description "Provisions the $lib document library."
    $designId = $design.Id
    Invoke-SPOSiteDesign -Identity $designId -WebUrl $SiteUrl -ErrorAction Stop | Out-Null
    Write-Host "+ applied $lib (document library)" -ForegroundColor Green
  }
  catch {
    $failed++; $failedLists += $lib
    Write-Warning "$lib : $($_.Exception.Message). Tip: create it by hand (Site contents -> New -> Document library -> '$lib'), or re-run with -SkipLibrary."
  }
  finally {
    if ($designId) { Remove-SPOSiteDesign -Identity $designId -ErrorAction SilentlyContinue }
    if ($scriptId) { Remove-SPOSiteScript -Identity $scriptId -ErrorAction SilentlyContinue }
  }
}

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "Lists OK: $ok | failed: $failed" -ForegroundColor Cyan
if ($failed -eq 0) {
  Write-Host "Done. Each list/library applies in the background (a few seconds each)." -ForegroundColor Green
  Write-Host "Open the site -> Site contents to confirm the six SLED* lists + SLEDSolutionArchitecture." -ForegroundColor Green
  Write-Host "Next: upload the app to SiteAssets/sled/ and open index.aspx (see PHASE-2-PROTOTYPE-RUNBOOK.md)." -ForegroundColor Green
  Write-Host "`nReusable: run this same script against the PROD site URL — no app registration, no console, ever." -ForegroundColor DarkGray
} else {
  Write-Warning "Failed: $($failedLists -join ', '). Re-run the script — it is safe to repeat (idempotent)."
}
