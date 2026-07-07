// constants.js — SLED choice sets and the canonical column maps shared by the
// local store and the SharePoint adapter. Keeping the value sets here means the
// forms, filters, seed data and list provisioning all agree on the same options.

// The five SLED industry verticals (fixed lookup).
export const VERTICALS = [
  'State & Local Government',
  'Public Safety & Justice',
  'Public Health & Social Services',
  'Transportation & Urban Infrastructure',
  'Education'
];

// Government / organisation segments a use case may target.
export const SEGMENTS = [
  'State Agency',
  'County Government',
  'City / Municipality',
  'K-12 School District',
  'Higher Education Institution',
  'Special District / Regional Authority'
];

// Microsoft solution plays relevant to SLED.
export const SOLUTION_PLAYS = [
  'Modernize Government Operations',
  'Citizen & Constituent Engagement',
  'Public Safety & Justice Modernization',
  'Data & AI for Public Sector',
  'Power Business Decisions with Cloud Scale Analytics',
  'Secure Government'
];

// Lifecycle status that replaces the old hackathon scoring band.
export const STATUSES = ['Draft', 'In Review', 'Published'];

// Keyword tags for filtering.
export const TAGS = [
  'AI', 'Copilot', 'Automation', 'Citizen Experience', 'Data & Analytics',
  'Security / Cybersecurity', 'Compliance', 'Cost Savings', 'Cloud Migration', 'Accessibility'
];

export const REPEATABILITY = ['High', 'Medium', 'Low'];

export const ACCELERATOR_TYPES = [
  'Solution accelerator', 'Repo template', 'Flow template', 'Sample app', 'Documentation'
];

export const EVENT_STATUS = ['Proposed', 'Confirmed', 'Open for registration', 'Closed'];
export const EVENT_FORMAT = ['In-person', 'Virtual', 'Hybrid'];

// Record lifecycle (soft archive) state, mirrors HCL.
export const RECORD_STATUS = ['Draft', 'Active', 'Archived'];

// Map of the status badge CSS class for a use-case status value.
export const STATUS_CLASS = {
  'Draft': 'draft',
  'In Review': 'review',
  'Published': 'published'
};
