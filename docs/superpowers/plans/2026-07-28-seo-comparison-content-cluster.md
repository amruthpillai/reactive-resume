# SEO Comparison Content Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 17 neutral, first-party-sourced comparison pages that target high-intent resume-builder searches and
give appropriate readers a distinct reason to try Reactive Resume.

**Architecture:** Add one MDX page per competitor under `docs/comparisons/`, using a consistent decision-oriented
information order but unique claims, trade-offs, sources, and calls to action. Add the completed set to one visible
Mintlify navigation group, then validate frontmatter uniqueness, structural requirements, JSON configuration, internal
links, and Mintlify links without introducing new dependencies or shared abstractions.

**Tech Stack:** Mintlify, MDX, `docs.json`, Node.js 24, `markdownlint-cli2`, Mint CLI 4.2.748

## Global Constraints

- Create exactly the 17 approved comparison pages; no comparison hub, new tab, redirect, schema type, custom component,
  or dependency.
- Use only first-party product, pricing, help, privacy, source-repository, and license pages to support mutable claims.
- Use search results only to select competitors, never as evidence in an article.
- Use plain, neutral language and avoid `best`, `winner`, `superior`, `revolutionary`, `powerful`, `seamless`, and
  unqualified marketing claims.
- Every page must identify at least one situation where the competitor is the better fit and one relevant Reactive
  Resume limitation.
- Never promise ATS passage, interview outcomes, or repeat vendor outcome statistics and review scores as facts.
- Qualify `free` as free creation, TXT export, designed PDF export, limited downloads, trial access, or another precise
  meaning.
- Prefer durable plan descriptions over exact prices; include a first-party pricing link and `Last checked: July 28,
  2026`.
- Use two to four relevant internal documentation links per page.
- End every page with a unique Mintlify `Card` linking to `https://rxresu.me`.
- A shorter page is better than unsupported or padded copy; expected length is 600 to 1,000 words only when the evidence
  supports it.
- Do not run the repository-wide `pnpm check`; it is write-capable. Use focused non-mutating validation commands.

---

## File map

**Create:**

- `docs/comparisons/reactive-resume-vs-canva.mdx` — general visual editor versus structured resume editor.
- `docs/comparisons/reactive-resume-vs-adobe-express.mdx` — general template editor versus structured resume data.
- `docs/comparisons/reactive-resume-vs-overleaf.mdx` — LaTeX authoring versus visual resume editing.
- `docs/comparisons/reactive-resume-vs-resume-com.mdx` — two genuinely free builders with different ownership models.
- `docs/comparisons/reactive-resume-vs-myperfectresume.mdx` — guided content with TXT-only free export versus free
  designed exports.
- `docs/comparisons/reactive-resume-vs-resume-now.mdx` — guided AI/content with TXT-only free export versus direct
  control.
- `docs/comparisons/reactive-resume-vs-resume-io.mdx` — commercial freemium builder versus open-source builder.
- `docs/comparisons/reactive-resume-vs-zety.mdx` — guided writing and TXT-only free export versus free designed
  exports.
- `docs/comparisons/reactive-resume-vs-kickresume.mdx` — integrated AI/content library versus bring-your-own AI.
- `docs/comparisons/reactive-resume-vs-resumegemini.mdx` — AI/content examples versus open-source self-hosting.
- `docs/comparisons/reactive-resume-vs-jobscan.mdx` — specialized ATS/job matching versus ownership and automation.
- `docs/comparisons/reactive-resume-vs-resumod.mdx` — job-targeting assistance versus open-source control.
- `docs/comparisons/reactive-resume-vs-rezi.mdx` — specialized keyword scoring versus optional bring-your-own AI.
- `docs/comparisons/reactive-resume-vs-careercircle.mdx` — career-services platform versus standalone resume system.
- `docs/comparisons/reactive-resume-vs-novoresume.mdx` — guided one-document free tier versus unrestricted core resume
  management.
- `docs/comparisons/reactive-resume-vs-livecareer.mdx` — guided content with TXT-only free export versus free designed
  exports.
- `docs/comparisons/reactive-resume-vs-freesumes.mdx` — ephemeral no-account builder and template library versus
  persistent structured resume management.

**Modify:**

- `docs/docs.json` — add the visible `Comparisons` navigation group after `Use Cases`.

No runtime code or test file is needed. The content contract is checked with focused Node assertions, Markdown linting,
and Mintlify's link checker.

---

### Task 1: General design and source-authoring comparisons

**Files:**

- Create: `docs/comparisons/reactive-resume-vs-canva.mdx`
- Create: `docs/comparisons/reactive-resume-vs-adobe-express.mdx`
- Create: `docs/comparisons/reactive-resume-vs-overleaf.mdx`

**Interfaces:**

- Consumes: Current Reactive Resume export, template, privacy, and open-source documentation.
- Produces: Three self-contained MDX pages following the cluster heading, evidence, limitation, source, and CTA contract.

- [ ] **Step 1: Re-verify the shared Reactive Resume facts**

Read these current files before drafting:

```text
docs/use-cases/free-resume-builder.mdx
docs/use-cases/open-source-resume-builder.mdx
docs/use-cases/privacy-focused-resume-builder.mdx
docs/use-cases/self-hosted-resume-builder.mdx
docs/guides/choosing-a-template.mdx
docs/guides/exporting-your-resume.mdx
docs/legal/license.mdx
```

Confirm only claims used in the three pages: Reactive Resume is MIT-licensed and self-hostable; the hosted builder's
core resume workflow has no premium tier; current exports include PDF, DOCX, Markdown, and Reactive Resume JSON; and
its visual controls are resume-specific rather than a freeform design canvas.

- [ ] **Step 2: Verify the three competitors from first-party sources**

Use:

```text
Canva resume builder:
https://www.canva.com/create/resumes/

Adobe Express resume builder:
https://www.adobe.com/express/create/resume

Adobe Express Free plan:
https://helpx.adobe.com/express/web/adobe-express-subscription/free.html

Overleaf free-plan documentation:
https://docs.overleaf.com/getting-started/free-and-premium-plans

Overleaf CV and resume templates:
https://www.overleaf.com/latex/templates/tagged/cv

Overleaf plan comparison:
https://www.overleaf.com/user/subscription/plans
```

Do not infer that every Canva or Adobe asset/template is free. Describe their broader visual control and media/template
libraries, and link the plan pages when a feature boundary matters. Describe Overleaf as a collaborative LaTeX editor
with CV/resume templates, not a dedicated resume builder.

- [ ] **Step 3: Create the Canva comparison**

Use this frontmatter:

```yaml
---
title: "Reactive Resume vs Canva"
description: "Compare Reactive Resume and Canva for free resume creation, visual control, exports, data portability, and self-hosting."
---
```

The answer-first opening must say that Canva is the stronger choice for freeform visual composition and a broad design
library, while Reactive Resume is purpose-built around structured resume fields, reusable resume data, and
self-hosting. Include:

```markdown
## Quick comparison
## Where Canva is a better fit
## Where Reactive Resume is a better fit
## Which should you choose?
## Reactive Resume limitations in this comparison
## Sources
```

Name Reactive Resume's narrower design canvas as its limitation. End with:

```mdx
<Card title="Try a resume-specific editor" icon="arrow-right" href="https://rxresu.me">
  Use structured resume sections and keep the option to export or self-host when you do not need a general design
  canvas.
</Card>
```

- [ ] **Step 4: Create the Adobe Express comparison**

Use this frontmatter:

```yaml
---
title: "Reactive Resume vs Adobe Express"
description: "Compare Reactive Resume and Adobe Express for resume templates, PDF export, visual editing, structured data, and self-hosting."
---
```

Credit Adobe Express for broader document, image, and layout editing. Explain that Reactive Resume keeps content in
resume-specific fields and supports resume-focused versioning, formats, and deployment choices. Name its smaller visual
asset library and lack of a general canvas as limitations. End with:

```mdx
<Card title="Use structured resume fields" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when reusable work history and resume-specific controls matter more than general document design.
</Card>
```

- [ ] **Step 5: Create the Overleaf comparison**

Use this frontmatter:

```yaml
---
title: "Reactive Resume vs Overleaf"
description: "Compare Reactive Resume's visual resume builder with Overleaf's LaTeX templates, source editing, collaboration, and PDF workflow."
---
```

Credit Overleaf for direct LaTeX source control, its large community template gallery, and document collaboration.
Explain that Reactive Resume is easier for readers who do not want to edit or debug LaTeX and stores resume content as
structured data. Name the absence of LaTeX source editing and Overleaf-style academic document collaboration as
Reactive Resume limitations. End with:

```mdx
<Card title="Choose visual editing when LaTeX is unnecessary" icon="arrow-right" href="https://rxresu.me">
  Build from structured sections and a live preview without maintaining a LaTeX document.
</Card>
```

- [ ] **Step 6: Run focused validation**

Run:

```bash
pnpm exec markdownlint-cli2 \
  docs/comparisons/reactive-resume-vs-canva.mdx \
  docs/comparisons/reactive-resume-vs-adobe-express.mdx \
  docs/comparisons/reactive-resume-vs-overleaf.mdx
```

Expected: exit code 0.

Run:

```bash
node - <<'NODE'
const fs = require("node:fs");
const files = [
  "docs/comparisons/reactive-resume-vs-canva.mdx",
  "docs/comparisons/reactive-resume-vs-adobe-express.mdx",
  "docs/comparisons/reactive-resume-vs-overleaf.mdx",
];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const required of [
    "## Quick comparison",
    "## Where Reactive Resume is a better fit",
    "## Which should you choose?",
    "## Reactive Resume limitations in this comparison",
    "## Sources",
    "Last checked: July 28, 2026",
    'href="https://rxresu.me"',
  ]) {
    if (!text.includes(required)) throw new Error(`${file}: missing ${required}`);
  }
}
console.log("Task 1 content contract passed");
NODE
```

Expected: `Task 1 content contract passed`.

- [ ] **Step 7: Commit the batch**

```bash
git add \
  docs/comparisons/reactive-resume-vs-canva.mdx \
  docs/comparisons/reactive-resume-vs-adobe-express.mdx \
  docs/comparisons/reactive-resume-vs-overleaf.mdx
git commit -m "docs: compare Reactive Resume with design editors"
```

---

### Task 2: Mainstream free and freemium builder comparisons

**Files:**

- Create: `docs/comparisons/reactive-resume-vs-resume-com.mdx`
- Create: `docs/comparisons/reactive-resume-vs-myperfectresume.mdx`
- Create: `docs/comparisons/reactive-resume-vs-resume-now.mdx`
- Create: `docs/comparisons/reactive-resume-vs-resume-io.mdx`
- Create: `docs/comparisons/reactive-resume-vs-zety.mdx`

**Interfaces:**

- Consumes: Task 1's page contract and current Reactive Resume export/open-source documentation.
- Produces: Five pages that distinguish free creation from free designed-document export.

- [ ] **Step 1: Verify the competitors from first-party sources**

Use:

```text
Resume.com free-plan help:
https://support.resume.com/hc/en-us/articles/360008079171-Is-Resume-com-really-free

Resume.com account help:
https://support.resume.com/hc/en-us/articles/360040199931-How-do-I-create-a-new-account

MyPerfectResume free-builder guide:
https://www.myperfectresume.com/career-center/resumes/how-to/free-resume-builder

MyPerfectResume pricing:
https://www.myperfectresume.com/pricing

Resume-Now free-builder guide:
https://www.resume-now.com/job-resources/resumes/how-to-use-our-resume-builder

Resume-Now product page:
https://www.resume-now.com/

Resume.io free-plan help:
https://help.resume.io/en/articles/3785088

Zety pricing:
https://zety.com/pricing
```

Preserve the important distinctions: Resume.com supports free PDF and plain-text downloads; MyPerfectResume,
Resume-Now, and Zety limit free downloads to TXT; Resume.io currently allows a free PDF using its Vancouver template
and TXT export, while other templates/features require its paid workflow. Do not quote a plan price.

- [ ] **Step 2: Create the Resume.com comparison**

Use:

```yaml
---
title: "Reactive Resume vs Resume.com"
description: "Compare two free resume builders by PDF export, accounts, templates, open-source access, portability, and self-hosting."
---
```

Do not manufacture a pricing advantage for Reactive Resume: both products support free PDF export. Credit Resume.com
for its simple hosted workflow and lack of a paid membership tier. Distinguish Reactive Resume through source access,
self-hosting, more export formats, API/MCP automation, and optional bring-your-own AI. Name account/setup complexity
and the more technical options as Reactive Resume limitations. End with:

```mdx
<Card title="Keep more options for your resume data" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when self-hosting, structured exports, or automation matter alongside free PDF creation.
</Card>
```

- [ ] **Step 3: Create the MyPerfectResume comparison**

Use:

```yaml
---
title: "Reactive Resume vs MyPerfectResume"
description: "Compare Reactive Resume and MyPerfectResume by free downloads, writing guidance, templates, AI, open source, and self-hosting."
---
```

Credit MyPerfectResume for step-by-step prompts, expert-written content suggestions, and its resume checker. State
precisely that its free download is plain text and designed PDF/Word downloads require premium access. Name Reactive
Resume's lack of an equivalent built-in content library and specialized checker as limitations. End with:

```mdx
<Card title="Export a designed resume without a premium tier" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when you already have the content and want free PDF, DOCX, Markdown, and JSON exports.
</Card>
```

- [ ] **Step 4: Create the Resume-Now comparison**

Use:

```yaml
---
title: "Reactive Resume vs Resume-Now"
description: "Compare Reactive Resume and Resume-Now by free export formats, guided writing, AI tools, templates, and self-hosting."
---
```

Credit Resume-Now for guided content suggestions and resume-analysis tools. State that its current free download is TXT
and designed PDF/Word formats require paid access. Name Reactive Resume's smaller built-in writing-guidance surface as
its limitation. End with:

```mdx
<Card title="Use a resume workflow without a subscription" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when direct editing and designed exports matter more than a large guided-content library.
</Card>
```

- [ ] **Step 5: Create the Resume.io comparison**

Use:

```yaml
---
title: "Reactive Resume vs Resume.io"
description: "Compare Reactive Resume and Resume.io by free PDF access, templates, writing tools, exports, open source, and self-hosting."
---
```

Credit Resume.io for its guided writing tools, sample content, and commercial template experience. State the narrow
current free-PDF allowance without claiming all PDF export is paid. Note that Resume.io says plan availability can vary
by location. Name Reactive Resume's smaller guided-content library as its limitation. End with:

```mdx
<Card title="Create and export without template-tier limits" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when you want the included templates, multiple export formats, and no premium resume tier.
</Card>
```

- [ ] **Step 6: Create the Zety comparison**

Use:

```yaml
---
title: "Reactive Resume vs Zety"
description: "Compare Reactive Resume and Zety by free downloads, guided writing, resume checks, templates, open source, and self-hosting."
---
```

Credit Zety for its guided builder, writing suggestions, cover-letter workflow, and resume check. State that Zety's
free package currently exports TXT, while PDF and Word are paid formats. Name Reactive Resume's lack of equivalent
prewritten guidance and job matching as limitations. End with:

```mdx
<Card title="Download a designed resume without upgrading" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when free PDF and DOCX exports matter more than guided writing and job-matching tools.
</Card>
```

- [ ] **Step 7: Validate and commit**

Run:

```bash
pnpm exec markdownlint-cli2 \
  docs/comparisons/reactive-resume-vs-resume-com.mdx \
  docs/comparisons/reactive-resume-vs-myperfectresume.mdx \
  docs/comparisons/reactive-resume-vs-resume-now.mdx \
  docs/comparisons/reactive-resume-vs-resume-io.mdx \
  docs/comparisons/reactive-resume-vs-zety.mdx
```

Expected: exit code 0.

Then:

```bash
git add \
  docs/comparisons/reactive-resume-vs-resume-com.mdx \
  docs/comparisons/reactive-resume-vs-myperfectresume.mdx \
  docs/comparisons/reactive-resume-vs-resume-now.mdx \
  docs/comparisons/reactive-resume-vs-resume-io.mdx \
  docs/comparisons/reactive-resume-vs-zety.mdx
git commit -m "docs: compare mainstream resume builders"
```

---

### Task 3: AI, ATS, and job-targeting comparisons

**Files:**

- Create: `docs/comparisons/reactive-resume-vs-kickresume.mdx`
- Create: `docs/comparisons/reactive-resume-vs-resumegemini.mdx`
- Create: `docs/comparisons/reactive-resume-vs-jobscan.mdx`
- Create: `docs/comparisons/reactive-resume-vs-resumod.mdx`
- Create: `docs/comparisons/reactive-resume-vs-rezi.mdx`

**Interfaces:**

- Consumes: Current Reactive Resume AI, automation, export, privacy, and self-hosting documentation.
- Produces: Five pages that distinguish integrated specialist tools from Reactive Resume's optional provider model.

- [ ] **Step 1: Re-verify Reactive Resume's AI and automation boundaries**

Read:

```text
docs/use-cases/ai-resume-builder.mdx
docs/use-cases/api-mcp-resume-automation.mdx
docs/guides/using-ai.mdx
docs/guides/using-ai-in-the-builder.mdx
docs/guides/using-ai-agent.mdx
docs/guides/using-the-api.mdx
docs/guides/using-the-mcp-server.mdx
```

Use only supported claims: AI is optional and bring-your-own-provider; users configure their provider credentials;
Reactive Resume offers API and MCP workflows; and provider use can incur separate provider costs. Do not claim that
Reactive Resume has a dedicated ATS score, native keyword-match score, or human review service.

- [ ] **Step 2: Verify the competitors from first-party sources**

Use:

```text
Kickresume plan FAQ:
https://www.kickresume.com/en/help-center/general/

Kickresume editor and AI documentation:
https://www.kickresume.com/en/help-center/resume/

ResumeGemini product page:
https://www.resumegemini.com/

ResumeGemini product overview:
https://resumegemini.com/about-us

Jobscan resume builder:
https://www.jobscan.co/resume-builder

Jobscan resume scanner:
https://www.jobscan.co/resume-scanner

Resumod product page:
https://resumod.co/

Resumod AI builder:
https://resumod.co/ai-resume-builder

Rezi pricing and feature comparison:
https://www.rezi.ai/pricing

Rezi official product summary:
https://www.rezi.ai/ai-llm-info
```

Treat every ATS or outcome statement as the vendor's positioning, not a proven result. It is safe to state that a
product exposes a checker, score, keyword-targeting flow, or job-description analysis when the official page documents
that feature.

- [ ] **Step 3: Create the Kickresume comparison**

Use:

```yaml
---
title: "Reactive Resume vs Kickresume"
description: "Compare Reactive Resume and Kickresume by free downloads, AI writing, content examples, templates, provider choice, and self-hosting."
---
```

Credit Kickresume for integrated AI writing, content examples, imports, and a larger guided career-document workflow.
State that its free plan supports unlimited documents/downloads when free customization options are used. Name
Reactive Resume's provider setup and smaller content library as limitations. End with:

```mdx
<Card title="Choose your own AI provider" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when you want AI to remain optional and configurable rather than bundled into the builder.
</Card>
```

- [ ] **Step 4: Create the ResumeGemini comparison**

Use:

```yaml
---
title: "Reactive Resume vs ResumeGemini"
description: "Compare Reactive Resume and ResumeGemini by free PDF export, AI optimization, content examples, open source, and self-hosting."
---
```

Credit ResumeGemini for prewritten examples and integrated job-targeted AI optimization. Its site currently documents
at least one free template with free PDF download; do not generalize that to every template. Name Reactive Resume's
lack of a built-in content-example library and keyword-optimization product as limitations. End with:

```mdx
<Card title="Try an open-source, self-hostable workflow" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when source access and deployment control matter more than integrated content examples.
</Card>
```

- [ ] **Step 5: Create the Jobscan comparison**

Use:

```yaml
---
title: "Reactive Resume vs Jobscan"
description: "Compare Reactive Resume and Jobscan by free PDF creation, ATS analysis, job matching, exports, open source, and automation."
---
```

Credit Jobscan for its free resume builder, nine current templates, LinkedIn import, resume scanner, and specialized
job-description analysis. Avoid repeating its ATS success claims. Name Reactive Resume's lack of a native ATS score or
job-keyword scanner as limitations. End with:

```mdx
<Card title="Own the resume before adding specialized analysis" icon="arrow-right" href="https://rxresu.me">
  Build, export, and automate structured resume data in Reactive Resume when an ATS score is not your primary need.
</Card>
```

- [ ] **Step 6: Create the Resumod comparison**

Use:

```yaml
---
title: "Reactive Resume vs Resumod"
description: "Compare Reactive Resume and Resumod by AI writing, resume scoring, job targeting, exports, open source, and self-hosting."
---
```

Credit Resumod for role-specific content, resume scoring, job-targeted AI, and documented PDF/Word output. Do not state
that every template or AI feature is free because the official page describes both free and paid templates without a
clear complete plan matrix. Name Reactive Resume's lack of an integrated ATS-style score and content library as
limitations. End with:

```mdx
<Card title="Keep deployment and provider choices open" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when self-hosting and optional bring-your-own AI matter more than bundled scoring tools.
</Card>
```

- [ ] **Step 7: Create the Rezi comparison**

Use:

```yaml
---
title: "Reactive Resume vs Rezi"
description: "Compare Reactive Resume and Rezi by free limits, ATS scoring, keyword targeting, AI writing, provider choice, and self-hosting."
---
```

Credit Rezi for its specialized score, keyword targeting, integrated AI writing, interview tool, and expert-review
option. State its current free limits as one resume and three PDF downloads without quoting the paid price. Name
Reactive Resume's lack of those specialist scoring/review tools and the setup required for its AI as limitations. End
with:

```mdx
<Card title="Keep AI optional and bring your own provider" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when provider choice, open source, self-hosting, and API or MCP automation matter more than an
  integrated ATS score.
</Card>
```

- [ ] **Step 8: Validate and commit**

Run:

```bash
pnpm exec markdownlint-cli2 \
  docs/comparisons/reactive-resume-vs-kickresume.mdx \
  docs/comparisons/reactive-resume-vs-resumegemini.mdx \
  docs/comparisons/reactive-resume-vs-jobscan.mdx \
  docs/comparisons/reactive-resume-vs-resumod.mdx \
  docs/comparisons/reactive-resume-vs-rezi.mdx
```

Expected: exit code 0.

Then:

```bash
git add \
  docs/comparisons/reactive-resume-vs-kickresume.mdx \
  docs/comparisons/reactive-resume-vs-resumegemini.mdx \
  docs/comparisons/reactive-resume-vs-jobscan.mdx \
  docs/comparisons/reactive-resume-vs-resumod.mdx \
  docs/comparisons/reactive-resume-vs-rezi.mdx
git commit -m "docs: compare AI and ATS resume builders"
```

---

### Task 4: Career-platform and template-library comparisons

**Files:**

- Create: `docs/comparisons/reactive-resume-vs-careercircle.mdx`
- Create: `docs/comparisons/reactive-resume-vs-novoresume.mdx`
- Create: `docs/comparisons/reactive-resume-vs-livecareer.mdx`
- Create: `docs/comparisons/reactive-resume-vs-freesumes.mdx`

**Interfaces:**

- Consumes: Current Reactive Resume dashboard, application-tracking, export, and privacy documentation.
- Produces: Four pages focused on broader career services, document limits, guided content, and no-account ephemeral use.

- [ ] **Step 1: Verify the competitors from first-party sources**

Use:

```text
CareerCircle resume builder:
https://www.careercircle.com/resume-builder

Novorésumé product and plan comparison:
https://novoresume.com/

LiveCareer pricing:
https://www.livecareer.com/pricing

LiveCareer resume builder:
https://www.livecareer.com/t3

Freesumes resume builder:
https://www.freesumes.com/resume-builder/

Freesumes product overview:
https://www.freesumes.com/

Freesumes privacy behavior in the builder:
https://www.freesumes.com/build-resume
```

Do not repeat claimed interview outcomes, ATS guarantees, review scores, or user counts. Describe only documented
product behavior.

- [ ] **Step 2: Create the CareerCircle comparison**

Use:

```yaml
---
title: "Reactive Resume vs CareerCircle"
description: "Compare Reactive Resume and CareerCircle by free PDF and Word exports, career resources, accounts, open source, and self-hosting."
---
```

Credit CareerCircle for free PDF/Word output, staffing-expert guidance, jobs, courses, and professional-development
resources in the same service. State its sign-up requirement. Name Reactive Resume's lack of CareerCircle's broader
course/job community as its limitation. End with:

```mdx
<Card title="Use a standalone resume system" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when resume ownership, multiple export formats, and self-hosting matter more than bundled career
  services.
</Card>
```

- [ ] **Step 3: Create the Novorésumé comparison**

Use:

```yaml
---
title: "Reactive Resume vs Novorésumé"
description: "Compare Reactive Resume and Novorésumé by free document limits, templates, guided writing, AI, exports, and self-hosting."
---
```

Credit Novorésumé for guided design, writing advice, a content library, and its integrated assistant. State its current
Basic limits precisely: one document and one page, with larger document counts and longer documents in Premium. Name
Reactive Resume's smaller guidance/content surface as its limitation. End with:

```mdx
<Card title="Manage more resume versions without a document limit" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when you want multiple resumes and designed exports without moving to a premium plan.
</Card>
```

- [ ] **Step 4: Create the LiveCareer comparison**

Use:

```yaml
---
title: "Reactive Resume vs LiveCareer"
description: "Compare Reactive Resume and LiveCareer by free downloads, guided content, resume checks, templates, open source, and self-hosting."
---
```

Credit LiveCareer for ready-made content, spell-checking, writing tips, and resume checking. State that its free builder
currently exports TXT, while unlimited PDF and Word downloads require premium access. Name Reactive Resume's smaller
guided-content and checker surface as limitations. End with:

```mdx
<Card title="Use the core builder and designed exports for free" icon="arrow-right" href="https://rxresu.me">
  Try Reactive Resume when PDF or DOCX output matters more than ready-made writing suggestions.
</Card>
```

- [ ] **Step 5: Create the Freesumes comparison**

Use:

```yaml
---
title: "Reactive Resume vs Freesumes"
description: "Compare Reactive Resume and Freesumes by no-account use, PDF export, templates, saved resume management, privacy, and self-hosting."
---
```

Credit Freesumes for a no-account, no-card builder, six current builder templates, free PDF output, Word/Google Docs
templates, and browser-session privacy. Explain the documented trade-off: builder data is wiped when the tab is
refreshed or closed. Name Reactive Resume's account requirement and server-backed persistence as limitations for users
who want a one-off local session. End with:

```mdx
<Card title="Move from a one-off file to saved resume management" icon="arrow-right" href="https://rxresu.me">
  Use Reactive Resume when you want persistent resume versions, multiple export formats, sharing, and automation.
</Card>
```

- [ ] **Step 6: Validate and commit**

Run:

```bash
pnpm exec markdownlint-cli2 \
  docs/comparisons/reactive-resume-vs-careercircle.mdx \
  docs/comparisons/reactive-resume-vs-novoresume.mdx \
  docs/comparisons/reactive-resume-vs-livecareer.mdx \
  docs/comparisons/reactive-resume-vs-freesumes.mdx
```

Expected: exit code 0.

Then:

```bash
git add \
  docs/comparisons/reactive-resume-vs-careercircle.mdx \
  docs/comparisons/reactive-resume-vs-novoresume.mdx \
  docs/comparisons/reactive-resume-vs-livecareer.mdx \
  docs/comparisons/reactive-resume-vs-freesumes.mdx
git commit -m "docs: compare career and template resume tools"
```

---

### Task 5: Navigation and whole-cluster verification

**Files:**

- Modify: `docs/docs.json`
- Test: all 17 files under `docs/comparisons/`

**Interfaces:**

- Consumes: The 17 completed page paths and frontmatter contracts from Tasks 1 through 4.
- Produces: Navigable and sitemap-eligible Mintlify pages with a verified unique-content contract.

- [ ] **Step 1: Add the Mintlify navigation group**

Insert this group immediately after `Use Cases`:

```json
{
  "group": "Comparisons",
  "pages": [
    "comparisons/reactive-resume-vs-canva",
    "comparisons/reactive-resume-vs-adobe-express",
    "comparisons/reactive-resume-vs-overleaf",
    "comparisons/reactive-resume-vs-resume-com",
    "comparisons/reactive-resume-vs-myperfectresume",
    "comparisons/reactive-resume-vs-resume-now",
    "comparisons/reactive-resume-vs-resume-io",
    "comparisons/reactive-resume-vs-zety",
    "comparisons/reactive-resume-vs-kickresume",
    "comparisons/reactive-resume-vs-resumegemini",
    "comparisons/reactive-resume-vs-jobscan",
    "comparisons/reactive-resume-vs-resumod",
    "comparisons/reactive-resume-vs-rezi",
    "comparisons/reactive-resume-vs-careercircle",
    "comparisons/reactive-resume-vs-novoresume",
    "comparisons/reactive-resume-vs-livecareer",
    "comparisons/reactive-resume-vs-freesumes"
  ]
}
```

Keep the grouping order aligned with the article batches; do not add a hub page.

- [ ] **Step 2: Validate JSON and the complete content contract**

Run:

```bash
node - <<'NODE'
const fs = require("node:fs");

const paths = [
  "canva",
  "adobe-express",
  "overleaf",
  "resume-com",
  "myperfectresume",
  "resume-now",
  "resume-io",
  "zety",
  "kickresume",
  "resumegemini",
  "jobscan",
  "resumod",
  "rezi",
  "careercircle",
  "novoresume",
  "livecareer",
  "freesumes",
].map((slug) => `comparisons/reactive-resume-vs-${slug}`);

const config = JSON.parse(fs.readFileSync("docs/docs.json", "utf8"));
const docsTab = config.navigation.tabs.find((tab) => tab.tab === "Documentation");
const group = docsTab.groups.find((entry) => entry.group === "Comparisons");
if (!group) throw new Error("Missing Comparisons navigation group");
if (JSON.stringify(group.pages) !== JSON.stringify(paths)) {
  throw new Error("Comparison navigation paths or order do not match the approved set");
}

const titles = new Set();
const descriptions = new Set();
const ctas = new Set();

for (const pagePath of paths) {
  const file = `docs/${pagePath}.mdx`;
  const text = fs.readFileSync(file, "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error(`${file}: missing frontmatter`);

  const title = frontmatter[1].match(/^title: "(.+)"$/m)?.[1];
  const description = frontmatter[1].match(/^description: "(.+)"$/m)?.[1];
  if (!title || !description) throw new Error(`${file}: missing title or description`);
  if (titles.has(title)) throw new Error(`${file}: duplicate title`);
  if (descriptions.has(description)) throw new Error(`${file}: duplicate description`);
  titles.add(title);
  descriptions.add(description);

  for (const required of [
    "## Quick comparison",
    "## Where Reactive Resume is a better fit",
    "## Which should you choose?",
    "## Reactive Resume limitations in this comparison",
    "## Sources",
    "Last checked: July 28, 2026",
    'href="https://rxresu.me"',
  ]) {
    if (!text.includes(required)) throw new Error(`${file}: missing ${required}`);
  }

  const competitorFit = text.match(/^## Where (.+) is a better fit$/m)?.[1];
  if (!competitorFit || competitorFit === "Reactive Resume") {
    throw new Error(`${file}: missing competitor advantage section`);
  }

  const cta = text.match(/<Card title="([^"]+)"/)?.[1];
  if (!cta) throw new Error(`${file}: missing CTA title`);
  if (ctas.has(cta)) throw new Error(`${file}: duplicate CTA title`);
  ctas.add(cta);
}

console.log(`Validated ${paths.length} comparison pages`);
NODE
```

Expected: `Validated 17 comparison pages`.

- [ ] **Step 3: Scan for disallowed language**

Run:

```bash
rg -n -i \
  '\b(best|winner|superior|revolutionary|seamless|guaranteed|guarantees|will pass|land an interview)\b' \
  docs/comparisons
```

Expected: no matches. If a word only appears inside an official source title, rewrite the link label neutrally rather
than keeping the promotional title.

- [ ] **Step 4: Run focused Markdown and Mintlify validation**

Run:

```bash
pnpm exec markdownlint-cli2 "docs/comparisons/*.mdx"
```

Expected: exit code 0.

Run:

```bash
cd docs && pnpm dlx mint@4.2.748 broken-links --check-redirects
```

Expected: exit code 0 and no broken comparison-page links.

- [ ] **Step 5: Review the final content diff**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Expected: only `docs/docs.json` and any deliberate final corrections to the 17 approved MDX pages are uncommitted; no
generated files or unrelated changes.

Read all 17 answer-first openings, competitor-advantage sections, Reactive Resume limitation sections, source lists,
and CTAs consecutively. Remove repeated sentences and unsupported cross-page claims.

- [ ] **Step 6: Commit navigation and final corrections**

```bash
git add docs/docs.json docs/comparisons
git commit -m "docs: publish resume builder comparison cluster"
```

- [ ] **Step 7: Confirm a clean final state**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: clean status and one commit for each content batch plus the navigation/final-validation commit.
