// factory.js — canonical entity builders for the SLED Use Case Library.
// Single source of truth for record shapes. Every form and the seed data build
// records through these so the model stays consistent (no undefined fields on
// any render path). The SharePoint columns mirror these field-for-field.

// ---- ID sequence ----------------------------------------------------------
let seq = 1;
export function resetSeq(n = 1) { seq = n; }
export function nextId(prefix) { return `${prefix}-${String(seq++).padStart(3, '0')}`; }

// Small helpers
const str = (v, d = '') => (v == null ? d : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',').map(s => s.trim()).filter(Boolean));
const bool = (v) => v === true || v === 'true' || v === 'on';

// ---- Audit (mirrors SharePoint Author / Created / Editor / Modified) ------
function auditFields(p = {}) {
  const createdBy = str(p.createdBy, 'Seed');
  const createdAt = str(p.createdAt);
  return {
    createdBy,
    createdAt,
    modifiedBy: str(p.modifiedBy) || createdBy,
    modifiedAt: str(p.modifiedAt) || createdAt
  };
}

// ---- Industry (replaces the HCL Agency) -----------------------------------
// A fixed lookup of the SLED verticals. Simple record: name + segment +
// description. Use cases link to one Industry by id.
export function buildIndustry(p = {}) {
  return {
    id: p.id || nextId('IND-NEW'),
    name: str(p.name, 'Untitled Industry'),
    segment: str(p.segment),
    description: str(p.description),
    recordStatus: str(p.recordStatus, 'Active'),
    ...auditFields(p)
  };
}

// ---- Pattern / Accelerator ------------------------------------------------
export function buildPattern(p = {}) {
  return {
    id: p.id || nextId('PAT-NEW'),
    name: str(p.name, 'Untitled Pattern'),
    summary: str(p.summary),
    repeatability: str(p.repeatability, 'Medium'),
    solutionPlay: str(p.solutionPlay || p.play),
    components: list(p.components),
    acceleratorIds: arr(p.acceleratorIds),
    recordStatus: str(p.recordStatus, 'Active'),
    ...auditFields(p)
  };
}

export function buildAccelerator(p = {}) {
  return {
    id: p.id || nextId('ACC-NEW'),
    name: str(p.name, 'Untitled Accelerator'),
    type: str(p.type, 'Solution accelerator'),
    patternId: p.patternId || null,
    url: str(p.url, '#')
  };
}

// ---- Event (standalone — renamed from Calendar, NOT linked to use cases) ---
export function buildEvent(p = {}) {
  return {
    id: p.id || nextId('EV-NEW'),
    title: str(p.title || p.name, 'Untitled Event'),
    startDate: str(p.startDate),
    endDate: str(p.endDate),
    status: str(p.status, 'Proposed'),
    format: str(p.format, 'In-person'),
    location: str(p.location),
    themes: list(p.themes),
    organizers: list(p.organizers),
    registrationUrl: str(p.registrationUrl, '#'),
    notes: str(p.notes),
    recordStatus: str(p.recordStatus, 'Active'),
    ...auditFields(p)
  };
}

// ---- Use case -------------------------------------------------------------
export function buildUseCase(p = {}) {
  return {
    id: p.id || nextId('UC-NEW'),
    title: str(p.title, 'Untitled Use Case'),
    industryId: p.industryId || null,
    segment: str(p.segment),
    status: str(p.status, 'Draft'),
    // Overview
    businessProblem: str(p.businessProblem),
    currentProcess: str(p.currentProcess),
    challengeSummary: str(p.challengeSummary),
    proposedSolution: str(p.proposedSolution),
    beneficiaries: str(p.beneficiaries),
    tags: list(p.tags),
    // Solution & tech
    components: list(p.components),
    copilotRole: str(p.copilotRole),
    services: list(p.services),
    solutionPlay: str(p.solutionPlay),
    patternId: p.patternId || null,
    dataDependencies: str(p.dataDependencies),
    compliance: str(p.compliance),
    risks: str(p.risks),
    // Value & impact
    businessValue: str(p.businessValue),
    estimatedImpact: str(p.estimatedImpact),
    impactMetric: str(p.impactMetric),
    feasibility: str(p.feasibility),
    reusability: str(p.reusability),
    // Owner
    ownerName: str(p.ownerName),
    ownerEmail: str(p.ownerEmail),
    // Artifacts
    referenceUrl: str(p.referenceUrl, '#'),
    repoUrl: str(p.repoUrl, '#'),
    recordStatus: str(p.recordStatus, 'Active'),
    ...auditFields(p)
  };
}
