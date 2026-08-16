import assert from "node:assert/strict";

const fields = [
	[
		"Product variant",
		{
			Cloud: "deployment: cloud",
			"Self-hosted": "deployment: self-hosted",
		},
	],
	[
		"Area",
		{
			"Resume builder & data": "area: builder",
			"Templates, preview & export": "area: rendering",
			"Accounts & sharing": "area: account",
			"AI & Agent": "area: ai",
			"Language & localization": "area: localization",
			"Self-hosting": "area: self-hosting",
			"API & integrations": "area: integrations",
			"Applications & cover letters": "area: applications",
		},
	],
];

export function getIssueLabels(body) {
	return fields.flatMap(([heading, labels]) => {
		const answer = body.match(new RegExp(`^### ${heading}\\r?\\n\\r?\\n([^\\r\\n]+)$`, "m"))?.[1].trim();
		return answer && labels[answer] ? [labels[answer]] : [];
	});
}

if (import.meta.main) {
	const issueBody = `### Product variant

Self-hosted

### Area

Templates, preview & export`;

	assert.deepEqual(getIssueLabels(issueBody), ["deployment: self-hosted", "area: rendering"]);
	assert.deepEqual(getIssueLabels("### Area\n\nOther / unsure"), []);
	assert.deepEqual(getIssueLabels("#### Area\n\nAI & Agent"), []);
	assert.deepEqual(getIssueLabels("prefix ### Area\n\nAI & Agent"), []);
}
