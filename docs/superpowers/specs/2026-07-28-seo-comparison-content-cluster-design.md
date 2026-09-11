# SEO Comparison Content Cluster Design

## Goal

Create a neutral, source-backed comparison cluster in the Mintlify documentation site that helps people searching for
free resume builders decide whether Reactive Resume or another product better fits their workflow.

The cluster should earn non-branded, high-intent traffic for queries such as `Reactive Resume vs Canva` without
overstating Reactive Resume's capabilities or turning the documentation into generic affiliate-style content. Every
page should give the competing product credit where it is stronger, explain Reactive Resume's relevant shortcomings,
and end with a distinct reason to try Reactive Resume.

## Audience and document type

These pages are decision-oriented explanations for:

- Job seekers comparing free or freemium resume-building products.
- Users who care about exports, privacy, portability, AI assistance, or customization.
- Technical users evaluating open-source or self-hosted options.

They are not tutorials, product reviews, rankings, or declarations that one product is universally better.

## Search-result scope

The comparison set comes from a non-personalized US Google search for `free resume builder`, captured on July 28,
2026. Products from the first two result pages are included when the result represents an identifiable resume-building
product. Reddit threads, videos, generic list articles, Reactive Resume itself, and an ambiguous LinkedIn showcase
result are excluded.

Zety is included because it appeared as a sponsored result and was explicitly requested. Overleaf is included because
it was explicitly requested and represents a common LaTeX-based resume workflow, even though it is not a dedicated
resume builder.

The approved pages are:

1. `comparisons/reactive-resume-vs-canva.mdx`
2. `comparisons/reactive-resume-vs-resume-com.mdx`
3. `comparisons/reactive-resume-vs-myperfectresume.mdx`
4. `comparisons/reactive-resume-vs-resume-now.mdx`
5. `comparisons/reactive-resume-vs-adobe-express.mdx`
6. `comparisons/reactive-resume-vs-careercircle.mdx`
7. `comparisons/reactive-resume-vs-kickresume.mdx`
8. `comparisons/reactive-resume-vs-resume-io.mdx`
9. `comparisons/reactive-resume-vs-resumegemini.mdx`
10. `comparisons/reactive-resume-vs-jobscan.mdx`
11. `comparisons/reactive-resume-vs-resumod.mdx`
12. `comparisons/reactive-resume-vs-novoresume.mdx`
13. `comparisons/reactive-resume-vs-livecareer.mdx`
14. `comparisons/reactive-resume-vs-rezi.mdx`
15. `comparisons/reactive-resume-vs-freesumes.mdx`
16. `comparisons/reactive-resume-vs-zety.mdx`
17. `comparisons/reactive-resume-vs-overleaf.mdx`

No separate comparison hub is required. The visible Mintlify navigation group provides the crawlable index and avoids
adding another page that competes for the existing `Reactive Resume alternatives` intent.

## Navigation

Add a `Comparisons` group immediately after `Use Cases` in the Documentation tab of `docs/docs.json`. Include all 17
page paths so Mintlify adds them to navigation and its generated sitemap.

No new tab, custom component, schema type, or redirect is needed.

## Page structure

Every comparison page follows the same information order, but not shared prose:

1. Unique frontmatter title and description targeting the exact product-pair query.
2. An answer-first opening that states the main workflow difference in two or three sentences.
3. A `Quick comparison` table using only criteria relevant to that competitor.
4. A section explaining where the competing product is stronger.
5. A section explaining where Reactive Resume is stronger.
6. A `Which should you choose?` section with concrete user profiles for both options.
7. A short limitations note that names Reactive Resume's relevant shortcomings.
8. A `Sources` section with first-party links and a `Last checked: July 28, 2026` line.
9. A final Mintlify `Card` linking to `https://rxresu.me` with competitor-specific title and copy.

The page should usually be 600 to 1,000 words. Length is determined by meaningful differences, not a word-count target.
Small products with limited official documentation should receive shorter pages rather than padded text.

## Comparison criteria

Use a subset of these criteria when they materially distinguish the two products:

- What the free tier permits.
- Whether a designed PDF can be downloaded for free.
- Other export formats.
- Account requirements and where resume data is stored.
- Open-source license and public source availability.
- Self-hosting support.
- Template breadth and general design flexibility.
- Resume-specific editing and live preview.
- Built-in writing guidance, content libraries, scoring, or human review.
- AI model/provider model and whether AI is optional.
- Job-description matching or ATS-oriented analysis.
- Application tracking, API, or automation support.
- LaTeX or source-controlled authoring for Overleaf.

Do not force every criterion into every page. A focused comparison is more useful than a large identical matrix.

The word `free` must be qualified. Distinguish among free creation, free plain-text export, free designed PDF export,
limited download counts, trials, and paid features. Do not describe a product as free when the relevant final export
requires payment.

## Evidence policy

Every mutable or comparative claim must be checked against first-party sources during implementation:

- Official product and feature pages.
- Official pricing or plan-comparison pages.
- Official help centers or documentation.
- Official privacy policies when data handling is compared.
- Official source repositories and licenses for open-source claims.

Search snippets and third-party reviews can identify candidates but cannot support page claims. If first-party sources
conflict, use the narrower claim and describe the ambiguity. If a fact cannot be verified, omit it.

Avoid exact prices unless the price itself is necessary to explain the choice. Prefer durable descriptions such as
`paid plan` or `limited free tier`, link the current pricing page, and retain the checked date.

Vendor outcome statistics, review scores, user counts, and claims such as `ATS-approved` must not be repeated as
objective evidence. It is acceptable to say that a product offers an ATS checker or markets a template for ATS use when
the official source supports that narrower statement. No page may promise that a resume will pass an ATS or produce an
interview.

Reactive Resume claims should be verified against the current repository, documentation, hosted product, license, and
privacy policy. Existing use-case pages may be linked for details but should not be copied.

## Neutrality and shortcomings

Use plain, factual language. Avoid `best`, `winner`, `superior`, `revolutionary`, `powerful`, `seamless`, and similar
promotional terms unless they appear in a clearly attributed source title.

Each page must name at least one situation where the competitor is the better fit and one relevant Reactive Resume
limitation. Depending on the comparison, those limitations may include:

- Less general-purpose visual design freedom than Canva or Adobe Express.
- No LaTeX authoring workflow comparable to Overleaf.
- No built-in equivalent to a competitor's specialized ATS score, job-keyword workflow, content library, or human
  review when current product evidence confirms that gap.
- Bring-your-own-provider setup and possible provider costs for AI-assisted features.
- Operational work required when choosing self-hosting.

Limitations must be tailored and verified rather than repeated mechanically across the cluster.

## Distinct search intent

Each page should answer the decision implied by its competitor:

| Competitor | Primary comparison angle |
| --- | --- |
| Canva | General visual-design tool versus a structured resume editor |
| Resume.com | Mainstream free builder versus open-source portability and self-hosting |
| MyPerfectResume | Guided writing and plan limits versus open-source, unrestricted core exports |
| Resume-Now | Guided AI/content workflow versus direct control and open-source operation |
| Adobe Express | General template editor versus structured resume data and workflow |
| CareerCircle | Career-services platform versus a standalone open-source resume system |
| Kickresume | Integrated AI/content tools versus bring-your-own AI and self-hosting |
| Resume.io | Commercial freemium workflow versus free core exports and open source |
| ResumeGemini | AI-guided builder versus an open-source, self-hostable workflow |
| Jobscan | ATS/job-description analysis versus broader resume ownership and automation |
| Resumod | AI and job-targeting assistance versus open-source control and self-hosting |
| Novorésumé | Guided templates and premium features versus unrestricted core resume management |
| LiveCareer | Guided content and career tools versus free, open-source editing and export |
| Rezi | Specialized ATS/keyword tooling versus provider choice, self-hosting, and automation |
| Freesumes | Templates and editorial resources versus structured ongoing resume management |
| Zety | Recruiter-style guidance and paid export workflow versus free core exports and open source |
| Overleaf | LaTeX collaboration and source control versus visual editing and structured resume data |

These angles are hypotheses to verify against current first-party evidence. If research disproves one, replace it with
the closest verified decision angle rather than forcing the planned contrast.

## Conversion calls to action

Every page ends with a link to the hosted Reactive Resume app, but its title and copy must reflect the comparison just
made. The planned CTA intents are:

| Competitor | CTA intent |
| --- | --- |
| Canva | Try a resume-specific editor |
| Resume.com | Keep resume data portable |
| MyPerfectResume | Build and export without a premium resume tier |
| Resume-Now | Edit without a subscription-based resume workflow |
| Adobe Express | Use structured resume fields instead of a general canvas |
| CareerCircle | Use a standalone resume builder |
| Kickresume | Choose and configure your own AI provider |
| Resume.io | Create, manage, and export without premium template gating |
| ResumeGemini | Try an open-source, self-hostable workflow |
| Jobscan | Build and own the resume before adding specialized analysis |
| Resumod | Keep deployment and resume data under your control |
| Novorésumé | Manage multiple resume versions without a premium document limit |
| LiveCareer | Use the core builder and exports without a paid plan |
| Rezi | Bring your own AI provider and keep AI optional |
| Freesumes | Move from a downloaded template to structured resume management |
| Zety | Export from a builder with no premium resume tier |
| Overleaf | Choose visual editing when LaTeX is unnecessary |

The implementation must adjust any CTA whose premise is not supported by current evidence. CTA text should invite an
appropriate reader to try Reactive Resume, not pressure every reader to switch.

## Internal linking

Link only to directly relevant existing pages, including:

- `/use-cases/free-resume-builder`
- `/use-cases/open-source-resume-builder`
- `/use-cases/privacy-focused-resume-builder`
- `/use-cases/self-hosted-resume-builder`
- `/use-cases/ai-resume-builder`
- `/guides/choosing-a-template`
- `/guides/importing-resumes`
- `/guides/exporting-your-resume`
- `/guides/using-ai`

Use two to four internal links per page. Do not create circular boilerplate link blocks or link every comparison page to
every other comparison page.

## Validation

Implementation is complete when:

- All 17 MDX files exist and appear in the `Comparisons` navigation group.
- Every file has a unique title, description, opening, comparison angle, limitations section, source list, and CTA.
- Every mutable competitor claim has a first-party source.
- Every page acknowledges a meaningful competitor advantage and a relevant Reactive Resume limitation.
- No page declares a universal winner, promises ATS passage, or repeats vendor outcome claims as facts.
- `docs/docs.json` parses successfully.
- Repository checks find no duplicate frontmatter titles or descriptions in the new files.
- All internal links in the new pages resolve.
- Mintlify's broken-link check passes for the affected documentation.
- A final diff review confirms that only the approved content pages, navigation, and implementation plan changed.

Search ranking and conversion are post-publication measurements, not implementation acceptance criteria. After
indexing, measure impressions, clicks, position, and visits from each comparison page before deciding whether to add
more competitors.
