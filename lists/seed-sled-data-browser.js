/*
 * seed-sled-data-browser.js â€” one-paste demo-data seeder (no PnP, no app reg).
 *
 * WHAT IT DOES
 *   Creates Industries, Verticals, Use Cases, Patterns and Accelerators in the
 *   SLEDIndustries / SLEDVerticals / SLEDUseCases / SLEDPatterns /
 *   SLEDAccelerators lists over same-origin REST, as the signed-in user.
 *   Idempotent: skips any record whose business-key already exists, so it's
 *   safe to re-run.
 *
 * HOW TO RUN
 *   1. Sign in and open ANY page on the SLED site in your browser, e.g.
 *        https://<tenant>.sharepoint.com/sites/SLEDUseCaseLibrary/SiteAssets/sled/index.aspx
 *      (any page under /sites/SLEDUseCaseLibrary works).
 *   2. Press F12 -> Console.
 *   3. Paste this entire file and press Enter.
 *   4. Watch the console log for "created / skipped / failed" per list.
 *   5. Reload the app; the records appear from the live lists.
 *
 * NOTE: All SLED* columns are plain Text/Note, so multi-value fields
 *       (Tags/Components/Services/AcceleratorIds) are stored as "; "-joined
 *       text, exactly as the app expects.
 */
(async () => {
  // ---- resolve the site URL (works from SiteAssets, SitePages, Lists, etc.)
  const m = location.pathname.match(/^(.*?\/(?:sites|teams)\/[^/]+)/i);
  const site = (window._spPageContextInfo && _spPageContextInfo.webAbsoluteUrl)
    || (m ? location.origin + m[1] : location.origin);
  console.log('%cSLED seeder', 'font-weight:bold', '-> site:', site);

  // ---- embedded seed data (injected from app/data/*.json) -------------------
  const UC = {
  "useCases": [
    {
      "id": "UC-001", "title": "Automated Permitting Workflow with AI Agents", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "Manual permit intake and routing takes weeks and is error-prone, frustrating residents and staff.",
      "currentProcess": "Paper and email submissions manually triaged by clerks across multiple departments.",
      "proposedSolution": "An AI agent classifies permit applications, checks completeness, routes to the right department, and drafts responses.",
      "beneficiaries": "Residents, permit clerks, planning department",
      "tags": ["AI", "Copilot", "Automation"], "components": ["Azure OpenAI", "Power Automate", "Dataverse"],
      "copilotRole": "Triage and drafting assistant", "services": ["Azure OpenAI", "Power Platform"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-001",
      "dataDependencies": "Permit records, zoning rules", "compliance": "PII handled under state records policy; access trimmed.",
      "risks": "Model drift on edge-case permit types.",
      "businessValue": "Cuts permit processing time from weeks to days.", "estimatedImpact": "60% faster turnaround",
      "impactMetric": "Avg. days to decision", "feasibility": "High â€” built on existing Power Platform tenant.", "reusability": "High across municipalities.",
      "ownerName": "Jordan Lee", "ownerEmail": "jordan.lee@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/permitting", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-05-20T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-10T12:00:00.000Z"
    },
    {
      "id": "UC-002", "title": "Real-Time 911 Call Summarization", "industryId": "IND-002", "segment": "State Agency",
      "status": "Published",
      "businessProblem": "Dispatchers manually note key facts during high-stress calls, risking missed details.",
      "currentProcess": "Manual note-taking in the CAD system during live calls.",
      "proposedSolution": "Live transcription and AI summarization surfaces location, threat level, and key entities in real time.",
      "beneficiaries": "Dispatchers, first responders",
      "tags": ["AI", "Citizen Experience"], "components": ["Azure AI Speech", "Azure OpenAI"],
      "copilotRole": "Live call summarizer", "services": ["Azure AI Speech", "Azure OpenAI"],
      "solutionPlay": "Public Safety & Justice Modernization", "patternId": "PAT-002",
      "dataDependencies": "Live audio feed, CAD integration", "compliance": "CJIS-aligned; audio retained per policy.",
      "risks": "Transcription accuracy in noisy environments.",
      "businessValue": "Faster, more accurate dispatch decisions.", "estimatedImpact": "Reduced time-to-dispatch",
      "impactMetric": "Seconds to dispatch", "feasibility": "Medium â€” requires CAD integration.", "reusability": "High across PSAPs.",
      "ownerName": "Priya Nair", "ownerEmail": "priya.nair@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/911", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-05-22T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-12T12:00:00.000Z"
    },
    {
      "id": "UC-003", "title": "Benefits Eligibility Copilot for Caseworkers", "industryId": "IND-003", "segment": "County Government",
      "status": "In Review",
      "businessProblem": "Caseworkers navigate complex, changing eligibility rules across many programs, slowing decisions.",
      "currentProcess": "Manual lookup across policy manuals and multiple systems.",
      "proposedSolution": "A document-grounded Copilot answers eligibility questions with citations to current policy.",
      "beneficiaries": "Caseworkers, benefit applicants",
      "tags": ["AI", "Copilot", "Compliance"], "components": ["Azure OpenAI", "Azure AI Search"],
      "copilotRole": "Policy Q&A assistant", "services": ["Azure OpenAI", "Azure AI Search"],
      "solutionPlay": "Citizen & Constituent Engagement", "patternId": "PAT-001",
      "dataDependencies": "Program policy manuals", "compliance": "PII minimized; citations required for every answer.",
      "risks": "Hallucination if grounding is incomplete.",
      "businessValue": "Faster, more consistent eligibility decisions.", "estimatedImpact": "Reduced determination time",
      "impactMetric": "Avg. minutes per determination", "feasibility": "High", "reusability": "High across human-services agencies.",
      "ownerName": "", "ownerEmail": "",
      "referenceUrl": "https://contoso.example/refarch/benefits", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-05-25T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-14T12:00:00.000Z"
    },
    {
      "id": "UC-004", "title": "Predictive Maintenance for Transit Fleets", "industryId": "IND-004", "segment": "Special District / Regional Authority",
      "status": "Published",
      "businessProblem": "Unplanned bus breakdowns disrupt service and inflate repair costs.",
      "currentProcess": "Reactive maintenance on fixed mileage schedules.",
      "proposedSolution": "Telemetry and ML predict component failures before they happen, scheduling proactive maintenance.",
      "beneficiaries": "Transit riders, fleet maintenance teams",
      "tags": ["AI", "Data & Analytics", "Cost Savings"], "components": ["Azure IoT", "Azure ML", "Power BI"],
      "copilotRole": "", "services": ["Azure IoT Hub", "Azure Machine Learning"],
      "solutionPlay": "Data & AI for Public Sector", "patternId": "",
      "dataDependencies": "Vehicle telemetry", "compliance": "No PII; operational data only.",
      "risks": "Sensor data quality.",
      "businessValue": "Fewer breakdowns, lower repair costs.", "estimatedImpact": "Reduced unplanned downtime",
      "impactMetric": "Unplanned downtime hours", "feasibility": "Medium", "reusability": "High across transit authorities.",
      "ownerName": "Dana Wu", "ownerEmail": "dana.wu@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/transit", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-05-27T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-08T12:00:00.000Z"
    },
    {
      "id": "UC-005", "title": "Student Success Early-Warning System", "industryId": "IND-005", "segment": "Higher Education Institution",
      "status": "In Review",
      "businessProblem": "At-risk students are often identified too late for effective intervention.",
      "currentProcess": "Manual review of grades and attendance by advisors mid-semester.",
      "proposedSolution": "Analytics surface early risk signals so advisors can intervene proactively.",
      "beneficiaries": "Students, academic advisors",
      "tags": ["AI", "Data & Analytics", "Citizen Experience"], "components": ["Azure Synapse", "Power BI"],
      "copilotRole": "", "services": ["Azure Synapse Analytics", "Power BI"],
      "solutionPlay": "Power Business Decisions with Cloud Scale Analytics", "patternId": "",
      "dataDependencies": "SIS data, LMS activity", "compliance": "FERPA-aligned; role-based access.",
      "risks": "Bias in risk signals.",
      "businessValue": "Improved retention and graduation rates.", "estimatedImpact": "Higher retention",
      "impactMetric": "Retention rate", "feasibility": "Medium", "reusability": "High across institutions.",
      "ownerName": "", "ownerEmail": "",
      "referenceUrl": "https://contoso.example/refarch/student-success", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-05-29T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-13T12:00:00.000Z"
    },
    {
      "id": "UC-006", "title": "Constituent Service Chatbot", "industryId": "IND-001", "segment": "State Agency",
      "status": "Draft",
      "businessProblem": "Call centers are overwhelmed with routine status and how-to questions.",
      "currentProcess": "Phone and email handled by limited call-center staff.",
      "proposedSolution": "A multilingual chatbot answers common questions and hands off complex cases to staff.",
      "beneficiaries": "Residents, call-center staff",
      "tags": ["AI", "Citizen Experience", "Accessibility"], "components": ["Azure AI Bot Service", "Azure OpenAI"],
      "copilotRole": "Self-service assistant", "services": ["Azure Bot Service", "Azure OpenAI"],
      "solutionPlay": "Citizen & Constituent Engagement", "patternId": "PAT-001",
      "dataDependencies": "FAQ and service catalog", "compliance": "Accessible (WCAG); no PII stored.",
      "risks": "Coverage gaps for niche questions.",
      "businessValue": "Deflects routine calls, frees staff for complex cases.", "estimatedImpact": "Call deflection",
      "impactMetric": "% calls deflected", "feasibility": "High", "reusability": "Very high across agencies.",
      "ownerName": "", "ownerEmail": "",
      "referenceUrl": "#", "repoUrl": "#",
      "createdBy": "Seed", "createdAt": "2026-06-01T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-06-15T12:00:00.000Z"
    },
    {
      "id": "UC-007", "title": "NYC AI Hackathon â€” Database & AI Workload Acceleration", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "NYC agencies needed to move legacy database and AI workloads to the cloud faster, but lacked a low-risk way to prove out the Microsoft full stack quickly.",
      "currentProcess": "Long, exploratory cloud evaluations with no hands-on validation across data, apps, and AI.",
      "proposedSolution": "A 1.5-day AI hackathon accelerated database and AI workloads and showcased the Microsoft full stack across Azure, Data, Apps, AI, and GitHub Copilot â€” opening broader Cloud + AI priorities.",
      "beneficiaries": "NYC agency IT teams, developers, city leadership",
      "tags": ["AI", "Copilot", "Cloud Migration"], "components": ["Azure", "Azure PaaS Databases", "GitHub Copilot", "Azure AI Foundry"],
      "copilotRole": "AI-assisted development across data and app workloads", "services": ["Azure", "Azure Database", "GitHub Copilot", "Azure AI Foundry"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-004",
      "dataDependencies": "Legacy agency databases and app data", "compliance": "Government data handled under agency policy.",
      "risks": "Sustaining momentum from event to funded engagement.",
      "businessValue": "Accelerated cloud + AI adoption; part of 325k+ combined ACR accelerated across the FY26 program.", "estimatedImpact": "Workloads accelerated in 1.5 days",
      "impactMetric": "Time to validate cloud + AI workloads", "feasibility": "High â€” delivered via Cloud Accelerate Factory at no cost.", "reusability": "High â€” the motion scales across agencies and geographies.",
      "ownerName": "Marcus Reed", "ownerEmail": "marcus.reed@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/nyc-hackathon", "repoUrl": "https://contoso.example/repos/nyc-hackathon",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-008", "title": "Louisiana OTS â€” App-in-a-Day Azure App & Database Modernization", "industryId": "IND-001", "segment": "State Agency",
      "status": "Published",
      "businessProblem": "Louisiana Office of Technology Services (OTS) was stalled in cloud exploration, with Azure in an AWS bake-off and no clear action plan.",
      "currentProcess": "Exploratory platform evaluation without hands-on Azure validation.",
      "proposedSolution": "An App-in-a-Day validated Azure app-dev, database, and GitHub Copilot through hands-on scenarios â€” moving OTS from exploration to active Azure evaluation and reopening the platform decision.",
      "beneficiaries": "Louisiana OTS developers and architects, state agency stakeholders",
      "tags": ["Copilot", "Cloud Migration", "Cost Savings"], "components": ["Azure App Service", "Azure PaaS Databases", "GitHub Copilot"],
      "copilotRole": "Hands-on app modernization accelerator", "services": ["Azure App Service", "Azure Database", "GitHub Copilot"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-003",
      "dataDependencies": "State application and database estate", "compliance": "State data governance policies.",
      "risks": "Competitive displacement in the AWS bake-off.",
      "businessValue": "Positioned Azure in the AWS bake-off and converted technical discovery into a scoped action plan with an updated cost view.", "estimatedImpact": "Exploration to active Azure evaluation",
      "impactMetric": "Platform decision progression", "feasibility": "High", "reusability": "High across state agencies evaluating cloud platforms.",
      "ownerName": "Priya Nair", "ownerEmail": "priya.nair@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/la-ots-appinaday", "repoUrl": "https://contoso.example/repos/la-ots-appinaday",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-009", "title": "Florida App / AI in a Day â€” Scaling App Modernization + AI Readiness", "industryId": "IND-001", "segment": "State Agency",
      "status": "Published",
      "businessProblem": "Teams were interested in modernization and AI but had not moved to execution, and it was unclear the motion could scale beyond one geography.",
      "currentProcess": "Interest without a repeatable path from idea to execution.",
      "proposedSolution": "An App / AI in a Day combined application modernization with AI readiness, moving teams from interest to execution and demonstrating the model scales beyond a single geography.",
      "beneficiaries": "Florida agency teams, developers, GTM stakeholders",
      "tags": ["AI", "Copilot", "Cloud Migration"], "components": ["Azure", "GitHub Copilot", "Azure AI Foundry"],
      "copilotRole": "App modernization and AI readiness accelerator", "services": ["Azure", "GitHub Copilot", "Azure AI Foundry"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-003",
      "dataDependencies": "Agency application estate", "compliance": "State data governance policies.",
      "risks": "Consistency of delivery quality as the motion scales.",
      "businessValue": "Proved the one-to-many event motion drives Azure consumption and scales across geographies.", "estimatedImpact": "Interest to execution",
      "impactMetric": "Teams moved to execution", "feasibility": "High", "reusability": "High â€” repeatable one-to-many event motion.",
      "ownerName": "Dana Wu", "ownerEmail": "dana.wu@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/fl-app-ai-in-a-day", "repoUrl": "https://contoso.example/repos/fl-app-ai-in-a-day",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-010", "title": "Legacy App Modernization at Speed with GitHub Copilot (NYC)", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "Legacy Microsoft Access and Oracle form-based applications were costly to maintain and slow to modernize.",
      "currentProcess": "Manual re-write of form-based apps with long development cycles.",
      "proposedSolution": "AI-assisted development with GitHub Copilot modernized legacy Access and Oracle form-based applications at speed, refactoring and migrating faster to Azure.",
      "beneficiaries": "NYC agency developers and application owners",
      "tags": ["Copilot", "Automation", "Cloud Migration"], "components": ["GitHub Copilot", "Azure App Service", "Azure PaaS Databases"],
      "copilotRole": "Code, refactor, and migrate legacy applications", "services": ["GitHub Copilot", "Azure App Service", "Azure Database"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-003",
      "dataDependencies": "Legacy Access/Oracle application data", "compliance": "Agency data governance policies.",
      "risks": "Data fidelity during migration from legacy stores.",
      "businessValue": "Faster modernization and reduced maintenance burden on legacy form-based apps.", "estimatedImpact": "Accelerated modernization cycle time",
      "impactMetric": "Time to modernize an application", "feasibility": "High", "reusability": "Very high across agencies with legacy Access/Oracle apps.",
      "ownerName": "Kevin Tran", "ownerEmail": "kevin.tran@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/nyc-legacy-appmod", "repoUrl": "https://contoso.example/repos/nyc-legacy-appmod",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-011", "title": "Operational Workflow Automation Across NYC Agencies", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "Procurement, inspections, identity/access, and IT workflows were manual and fragmented across many NYC agencies.",
      "currentProcess": "Disconnected, manual workflows handled agency-by-agency.",
      "proposedSolution": "Modernized and automated procurement, inspections, identity/access, and IT workflows across NYC Buildings, Sanitation, FDNY, Health, Housing, and OMB.",
      "beneficiaries": "NYC Buildings, Sanitation, FDNY, Health, Housing, and OMB staff",
      "tags": ["Automation", "AI", "Copilot"], "components": ["Power Automate", "Azure", "GitHub Copilot"],
      "copilotRole": "AI-assisted workflow automation", "services": ["Power Platform", "Azure"],
      "solutionPlay": "Modernize Government Operations", "patternId": "PAT-007",
      "dataDependencies": "Procurement, inspection, and identity/access records", "compliance": "Agency identity and access policies.",
      "risks": "Change management across multiple agencies.",
      "businessValue": "Reduced manual effort and standardized operational workflows across agencies.", "estimatedImpact": "Workflows automated across 6+ agencies",
      "impactMetric": "Manual workflow hours reduced", "feasibility": "High", "reusability": "Very high â€” common back-office workflows across government.",
      "ownerName": "Sofia Alvarez", "ownerEmail": "sofia.alvarez@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/nyc-workflow-automation", "repoUrl": "https://contoso.example/repos/nyc-workflow-automation",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-012", "title": "Resident Service Chatbots & Voice Assistants (NYC)", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "High call volumes strained frontline staff and slowed service for NYC residents.",
      "currentProcess": "Phone and in-person support handled by limited frontline staff.",
      "proposedSolution": "Public chatbots, voice assistants, and guidance tools reduced call volume and improved user experiences for NYC residents and frontline staff.",
      "beneficiaries": "NYC residents, frontline service staff",
      "tags": ["AI", "Citizen Experience", "Accessibility"], "components": ["Azure AI Bot Service", "Azure AI Speech", "Azure OpenAI"],
      "copilotRole": "Resident self-service and guidance assistant", "services": ["Azure Bot Service", "Azure AI Speech", "Azure OpenAI"],
      "solutionPlay": "Citizen & Constituent Engagement", "patternId": "PAT-005",
      "dataDependencies": "Service catalog and FAQ content", "compliance": "Accessible (WCAG); resident PII minimized.",
      "risks": "Coverage gaps for complex or multilingual requests.",
      "businessValue": "Reduced call volume and improved resident and staff experience.", "estimatedImpact": "Reduced call volume",
      "impactMetric": "% calls deflected", "feasibility": "High", "reusability": "Very high across resident-facing agencies.",
      "ownerName": "Jordan Lee", "ownerEmail": "jordan.lee@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/nyc-resident-chatbots", "repoUrl": "https://contoso.example/repos/nyc-resident-chatbots",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    },
    {
      "id": "UC-013", "title": "Natural-Language Leadership Dashboards (NYC)", "industryId": "IND-001", "segment": "City / Municipality",
      "status": "Published",
      "businessProblem": "Leaders depended on business analysts to answer data questions, delaying real-time insight.",
      "currentProcess": "Static reports and analyst-built dashboards with turnaround delays.",
      "proposedSolution": "Natural-language dashboards enable real-time leadership insights without business-analyst dependency.",
      "beneficiaries": "NYC agency leadership and decision-makers",
      "tags": ["AI", "Data & Analytics", "Copilot"], "components": ["Microsoft Fabric", "Power BI", "Azure OpenAI"],
      "copilotRole": "Natural-language data query and insight", "services": ["Microsoft Fabric", "Power BI", "Azure OpenAI"],
      "solutionPlay": "Power Business Decisions with Cloud Scale Analytics", "patternId": "PAT-006",
      "dataDependencies": "Governed agency data estate", "compliance": "Role-based access to governed data.",
      "risks": "Data quality and governance across sources.",
      "businessValue": "Real-time, self-service leadership insight without analyst dependency.", "estimatedImpact": "Real-time insight without analyst backlog",
      "impactMetric": "Time to answer a leadership data question", "feasibility": "Medium", "reusability": "High across data-rich agencies.",
      "ownerName": "Alicia Gomez", "ownerEmail": "alicia.gomez@contoso.com",
      "referenceUrl": "https://contoso.example/refarch/nyc-nl-dashboards", "repoUrl": "https://contoso.example/repos/nyc-nl-dashboards",
      "createdBy": "CAF FY26 deck", "createdAt": "2026-06-20T12:00:00.000Z", "modifiedBy": "CAF FY26 deck", "modifiedAt": "2026-06-20T12:00:00.000Z"
    }
  ]
};
  const PAT = {
  "patterns": [
    { "id": "PAT-001", "name": "Document-grounded Copilot (RAG)", "summary": "Retrieval-augmented assistant over an agency's document corpus with citations and access trimming.", "repeatability": "High", "solutionPlay": "Data & AI for Public Sector", "components": ["Azure OpenAI", "Azure AI Search", "Entra ID"], "acceleratorIds": ["ACC-001"], "createdBy": "Seed", "createdAt": "2026-05-02T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-05-02T12:00:00.000Z" },
    { "id": "PAT-002", "name": "Real-time event summarization", "summary": "Stream transcription and summarization of live audio/text with structured output for downstream systems.", "repeatability": "Medium", "solutionPlay": "Public Safety & Justice Modernization", "components": ["Azure AI Speech", "Azure OpenAI", "Event Hubs"], "acceleratorIds": ["ACC-002"], "createdBy": "Seed", "createdAt": "2026-05-02T12:00:00.000Z", "modifiedBy": "Seed", "modifiedAt": "2026-05-02T12:00:00.000Z" },
    { "id": "PAT-003", "name": "AI-assisted legacy app modernization (GitHub Copilot)", "summary": "Modernize legacy Microsoft Access and Oracle form-based applications to Azure using AI-assisted development with GitHub Copilot; the repeatable App-in-a-Day / App-&-AI-in-a-Day motion that moved NYC, Louisiana OTS and Florida from interest to execution.", "repeatability": "High", "solutionPlay": "Modernize Government Operations", "components": ["GitHub Copilot", "Azure App Service", "Azure SQL Database", "Visual Studio Code"], "acceleratorIds": ["ACC-003", "ACC-004"], "createdBy": "Imported (FY26 CAF deck)", "createdAt": "2026-07-07T00:00:00.000Z", "modifiedBy": "Imported (FY26 CAF deck)", "modifiedAt": "2026-07-07T00:00:00.000Z" },
    { "id": "PAT-004", "name": "Database modernization to Azure PaaS", "summary": "Migrate and modernize on-premises and legacy databases (incl. PostgreSQL/SQL) to Azure PaaS database services, accelerating both data and AI workloads. Core Cloud Adoption Factory migrate-&-modernize workload.", "repeatability": "High", "solutionPlay": "Modernize Government Operations", "components": ["Azure SQL Database", "Azure Database Migration Service", "Azure Arc-enabled SQL", "Azure Data Studio"], "acceleratorIds": ["ACC-005", "ACC-006"], "createdBy": "Imported (FY26 CAF deck)", "createdAt": "2026-07-07T00:00:00.000Z", "modifiedBy": "Imported (FY26 CAF deck)", "modifiedAt": "2026-07-07T00:00:00.000Z" },
    { "id": "PAT-005", "name": "Constituent virtual assistant (chatbot + voice)", "summary": "Public chatbots, voice assistants and guidance tools that reduce call volume and improve service delivery for residents and frontline staff, grounded on agency content. Proven in the NYC AI Hackathon scalable outcomes.", "repeatability": "High", "solutionPlay": "Citizen & Constituent Engagement", "components": ["Azure AI Foundry", "Azure OpenAI", "Azure AI Bot Service", "Azure AI Speech"], "acceleratorIds": ["ACC-007"], "createdBy": "Imported (FY26 CAF deck)", "createdAt": "2026-07-07T00:00:00.000Z", "modifiedBy": "Imported (FY26 CAF deck)", "modifiedAt": "2026-07-07T00:00:00.000Z" },
    { "id": "PAT-006", "name": "Natural-language analytics over Microsoft Fabric", "summary": "Natural-language dashboards that give leadership real-time insight without business-analyst dependency, over a unified governed data estate. From the NYC Hackathon 'Instant Data Insight' outcome.", "repeatability": "Medium", "solutionPlay": "Power Business Decisions with Cloud Scale Analytics", "components": ["Microsoft Fabric", "Power BI", "Copilot for Power BI", "Azure OpenAI"], "acceleratorIds": ["ACC-008"], "createdBy": "Imported (FY26 CAF deck)", "createdAt": "2026-07-07T00:00:00.000Z", "modifiedBy": "Imported (FY26 CAF deck)", "modifiedAt": "2026-07-07T00:00:00.000Z" },
    { "id": "PAT-007", "name": "Operational workflow automation agents", "summary": "AI agents that modernize procurement, inspections, identity/access and IT workflows across agencies (e.g., NYC Buildings, Sanitation, FDNY, Health, Housing, OMB). Aligns to initial Agent Factory use cases.", "repeatability": "Medium", "solutionPlay": "Modernize Government Operations", "components": ["Azure AI Foundry Agent Service", "Power Automate", "Azure Logic Apps", "Dataverse"], "acceleratorIds": ["ACC-009"], "createdBy": "Imported (FY26 CAF deck)", "createdAt": "2026-07-07T00:00:00.000Z", "modifiedBy": "Imported (FY26 CAF deck)", "modifiedAt": "2026-07-07T00:00:00.000Z" }
  ],
  "accelerators": [
    { "id": "ACC-001", "name": "RAG starter (Bicep + app)", "type": "Repo template", "patternId": "PAT-001", "url": "https://contoso.example/accelerators/rag-starter" },
    { "id": "ACC-002", "name": "Streaming summarizer sample", "type": "Sample app", "patternId": "PAT-002", "url": "https://contoso.example/accelerators/stream-summarizer" },
    { "id": "ACC-003", "name": "App-in-a-Day workshop kit", "type": "Documentation", "patternId": "PAT-003", "url": "https://contoso.example/accelerators/app-in-a-day-kit" },
    { "id": "ACC-004", "name": "GitHub Copilot app-modernization playbook", "type": "Repo template", "patternId": "PAT-003", "url": "https://contoso.example/accelerators/copilot-appmod-playbook" },
    { "id": "ACC-005", "name": "Azure Landing Zone (ALZ) for data platforms", "type": "Solution accelerator", "patternId": "PAT-004", "url": "https://contoso.example/accelerators/alz-data" },
    { "id": "ACC-006", "name": "Database migration assessment kit (DMA + SQL)", "type": "Documentation", "patternId": "PAT-004", "url": "https://contoso.example/accelerators/db-migration-assessment" },
    { "id": "ACC-007", "name": "Citizen chatbot starter (Bot + RAG)", "type": "Sample app", "patternId": "PAT-005", "url": "https://contoso.example/accelerators/citizen-chatbot-starter" },
    { "id": "ACC-008", "name": "NL dashboard sample (Fabric + Copilot)", "type": "Sample app", "patternId": "PAT-006", "url": "https://contoso.example/accelerators/nl-dashboard-fabric" },
    { "id": "ACC-009", "name": "Government workflow agent templates", "type": "Flow template", "patternId": "PAT-007", "url": "https://contoso.example/accelerators/gov-workflow-agents" }
  ]
};

  // ---- list column maps (mirror app/js/store.js MAPS) -----------------------
  // Seed Industries + Verticals (the taxonomy) so Use Cases resolve their links.
  const INDUSTRIES = [
    { id: 'IND-001', name: 'State & Local Government', description: 'Statewide agencies and local governments modernizing citizen services, operations, and back-office systems.' },
    { id: 'IND-002', name: 'Public Safety & Justice', description: 'Law enforcement, courts, corrections, and emergency response improving outcomes with AI and cloud.' },
    { id: 'IND-003', name: 'Public Health & Social Services', description: 'Health departments and human-services agencies streamlining benefits, casework, and population health.' },
    { id: 'IND-004', name: 'Transportation & Urban Infrastructure', description: 'Transit, roads, utilities, and smart-city infrastructure using data and AI for resilience and efficiency.' },
    { id: 'IND-005', name: 'Education', description: 'K-12 districts and higher-ed institutions improving student success, operations, and research.' }
  ];
  const VERTICALS = [
    { id: 'VER-001', name: 'State Agency', industryId: 'IND-001', description: 'Statewide executive agencies and departments.' },
    { id: 'VER-002', name: 'City / Municipality', industryId: 'IND-001', description: 'City and municipal governments serving residents directly.' },
    { id: 'VER-003', name: 'County Government', industryId: 'IND-001', description: 'County-level administration and services.' },
    { id: 'VER-004', name: 'Law Enforcement', industryId: 'IND-002', description: 'Police, sheriffs, and emergency dispatch (911 / PSAP).' },
    { id: 'VER-005', name: 'Courts & Corrections', industryId: 'IND-002', description: 'Courts, prosecution, and corrections modernization.' },
    { id: 'VER-006', name: 'Health & Human Services', industryId: 'IND-003', description: 'Benefits, casework, and social-service delivery.' },
    { id: 'VER-007', name: 'Public Health', industryId: 'IND-003', description: 'Population health, epidemiology, and health departments.' },
    { id: 'VER-008', name: 'Transit & Mobility', industryId: 'IND-004', description: 'Public transit authorities and mobility services.' },
    { id: 'VER-009', name: 'Smart Infrastructure', industryId: 'IND-004', description: 'Roads, utilities, and smart-city infrastructure.' },
    { id: 'VER-010', name: 'K-12 / Primary & Secondary', industryId: 'IND-005', description: 'K-12 school districts and primary/secondary education.' },
    { id: 'VER-011', name: 'Higher Education', industryId: 'IND-005', description: 'Colleges, universities, and research institutions.' }
  ];
  const SOLUTION_PLAYS = [
    { id: 'PLAY-001', name: 'Modernize Government Operations', description: 'Streamline back-office and mission operations with cloud and AI.' },
    { id: 'PLAY-002', name: 'Citizen & Constituent Engagement', description: 'Deliver responsive, accessible, self-service experiences for residents.' },
    { id: 'PLAY-003', name: 'Public Safety & Justice Modernization', description: 'Improve outcomes across law enforcement, courts, and emergency response.' },
    { id: 'PLAY-004', name: 'Data & AI for Public Sector', description: 'Unlock insight and automation with data platforms and AI.' },
    { id: 'PLAY-005', name: 'Power Business Decisions with Cloud Scale Analytics', description: 'Enable real-time, self-service analytics over a governed data estate.' },
    { id: 'PLAY-006', name: 'Secure Government', description: 'Protect the digital estate with zero-trust security and compliance.' }
  ];

  // Resolve each use case's legacy (industryId, segment) pair to a VerticalId.
  const SEGMENT_TO_VERTICAL = {
    'IND-001|City / Municipality': 'VER-002',
    'IND-001|State Agency': 'VER-001',
    'IND-001|County Government': 'VER-003',
    'IND-002|State Agency': 'VER-004',
    'IND-002|Law Enforcement': 'VER-004',
    'IND-003|County Government': 'VER-006',
    'IND-004|Special District / Regional Authority': 'VER-008',
    'IND-005|Higher Education Institution': 'VER-011'
  };
  (UC.useCases || UC.usecases || []).forEach(u => {
    u.verticalId = u.verticalId || SEGMENT_TO_VERTICAL[`${u.industryId}|${u.segment}`] || '';
  });
  // Approval columns default to 'Approved' for all seed records.
  const APPROVAL_COLS = [
    ['ApprovalStatus', 'approvalStatus', 'text'], ['SubmittedByName', 'submittedBy', 'text'],
    ['SubmittedAtText', 'submittedAt', 'text'], ['ReviewedByName', 'reviewedBy', 'text'],
    ['ReviewedAtText', 'reviewedAt', 'text'], ['ReviewNote', 'reviewNote', 'text']
  ];
  [...INDUSTRIES, ...VERTICALS, ...SOLUTION_PLAYS, ...(UC.useCases || UC.usecases || []), ...(PAT.patterns || []), ...(PAT.accelerators || [])].forEach(r => {
    r.approvalStatus = r.approvalStatus || 'Approved';
  });

  const MAPS = {
    SLEDIndustries: { key: 'IndustryId', data: INDUSTRIES, cols: [
      ['Title', 'name', 'text'], ['IndustryId', 'id', 'text'], ['Description', 'description', 'text'],
      ['RecordStatus', 'recordStatus', 'text'], ...APPROVAL_COLS,
      ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] },
    SLEDVerticals: { key: 'VerticalId', data: VERTICALS, cols: [
      ['Title', 'name', 'text'], ['VerticalId', 'id', 'text'], ['IndustryId', 'industryId', 'text'],
      ['Description', 'description', 'text'], ['RecordStatus', 'recordStatus', 'text'], ...APPROVAL_COLS,
      ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] },
    SLEDSolutionPlays: { key: 'SolutionPlayId', data: SOLUTION_PLAYS, cols: [
      ['Title', 'name', 'text'], ['SolutionPlayId', 'id', 'text'], ['Description', 'description', 'text'],
      ['RecordStatus', 'recordStatus', 'text'], ...APPROVAL_COLS,
      ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] },
    SLEDUseCases: { key: 'UseCaseId', data: (UC.useCases || UC.usecases || []), cols: [
      ['Title', 'title', 'text'], ['UseCaseId', 'id', 'text'], ['IndustryId', 'industryId', 'text'],
      ['VerticalId', 'verticalId', 'text'], ['UCStatus', 'status', 'text'], ['BusinessProblem', 'businessProblem', 'text'],
      ['CurrentProcess', 'currentProcess', 'text'], ['ProposedSolution', 'proposedSolution', 'text'],
      ['Beneficiaries', 'beneficiaries', 'text'], ['Tags', 'tags', 'list'], ['Components', 'components', 'list'],
      ['CopilotRole', 'copilotRole', 'text'], ['Services', 'services', 'list'], ['SolutionPlay', 'solutionPlay', 'text'],
      ['PatternId', 'patternId', 'text'], ['DataDependencies', 'dataDependencies', 'text'], ['Compliance', 'compliance', 'text'],
      ['Risks', 'risks', 'text'], ['BusinessValue', 'businessValue', 'text'], ['EstimatedImpact', 'estimatedImpact', 'text'],
      ['ImpactMetric', 'impactMetric', 'text'], ['Feasibility', 'feasibility', 'text'], ['Reusability', 'reusability', 'text'],
      ['OwnerName', 'ownerName', 'text'], ['OwnerEmail', 'ownerEmail', 'text'], ['ReferenceUrl', 'referenceUrl', 'text'],
      ['RepoUrl', 'repoUrl', 'text'], ...APPROVAL_COLS, ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] },
    SLEDPatterns: { key: 'PatternId', data: (PAT.patterns || []), cols: [
      ['Title', 'name', 'text'], ['PatternId', 'id', 'text'], ['Summary', 'summary', 'text'],
      ['Repeatability', 'repeatability', 'text'], ['SolutionPlay', 'solutionPlay', 'text'],
      ['Components', 'components', 'list'], ['AcceleratorIds', 'acceleratorIds', 'list'],
      ['RecordStatus', 'recordStatus', 'text'], ...APPROVAL_COLS,
      ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] },
    SLEDAccelerators: { key: 'AcceleratorId', data: (PAT.accelerators || []), cols: [
      ['Title', 'name', 'text'], ['AcceleratorId', 'id', 'text'], ['AccType', 'type', 'text'],
      ['PatternId', 'patternId', 'text'], ['Url', 'url', 'text'],
      ['RecordStatus', 'recordStatus', 'text'], ...APPROVAL_COLS,
      ['CreatedByName', 'createdBy', 'text'], ['CreatedAtText', 'createdAt', 'text'],
      ['ModifiedByName', 'modifiedBy', 'text'], ['ModifiedAtText', 'modifiedAt', 'text']
    ] }
  };

  const enc = (v, k) => k === 'list' ? (Array.isArray(v) ? v : []).join('; ') : (v == null ? '' : String(v));

  async function getJson(url, init) {
    const r = await fetch(url, { ...init, headers: { Accept: 'application/json;odata=nometadata', ...(init && init.headers) }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText + ' @ ' + url);
    return r.json();
  }

  // ---- form digest ----------------------------------------------------------
  const ci = await getJson(site + '/_api/contextinfo', { method: 'POST' });
  const digest = (ci.GetContextWebInformation || ci).FormDigestValue;

  const totals = { created: 0, skipped: 0, failed: 0 };

  for (const [listTitle, map] of Object.entries(MAPS)) {
    const keyField = map.cols.find(c => c[0] === map.key)[1];

    // existing business keys (so re-runs don't duplicate)
    const have = new Set();
    let url = site + `/_api/web/lists/getbytitle('${listTitle}')/items?$select=${map.key},Id&$top=5000`;
    try {
      while (url) {
        const j = await getJson(url);
        (j.value || []).forEach(it => have.add(String(it[map.key] || '')));
        url = j['odata.nextLink'] || j['@odata.nextLink'] || '';
      }
    } catch (e) {
      console.error(`Cannot read list '${listTitle}' â€” is it provisioned? Skipping.`, e.message);
      continue;
    }

    let created = 0, skipped = 0, failed = 0;
    for (const rec of map.data) {
      const kv = String(rec[keyField] || '');
      if (have.has(kv)) { skipped++; continue; }
      const body = {};
      for (const [col, field, kind] of map.cols) body[col] = enc(rec[field], kind);
      try {
        const r = await fetch(site + `/_api/web/lists/getbytitle('${listTitle}')/items`, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json;odata=nometadata', Accept: 'application/json;odata=nometadata', 'X-RequestDigest': digest },
          body: JSON.stringify(body)
        });
        if (!r.ok) { failed++; console.warn('  FAIL', listTitle, kv, r.status, await r.text().catch(() => '')); }
        else { created++; }
      } catch (e) { failed++; console.warn('  ERR', listTitle, kv, e.message); }
    }
    totals.created += created; totals.skipped += skipped; totals.failed += failed;
    console.log(`%c${listTitle}%c  created ${created} | skipped ${skipped} | failed ${failed}`, 'font-weight:bold', 'font-weight:normal');
  }

  console.log(`%cDone.%c total created ${totals.created}, skipped ${totals.skipped}, failed ${totals.failed}. Reload the app to see the records.`, 'font-weight:bold;color:green', 'font-weight:normal');
})();
