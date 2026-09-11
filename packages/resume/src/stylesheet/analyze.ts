import type { SemanticCssDiagnostic, SemanticNode, StyleProgram } from "./types";
import { createDiagnostic } from "./diagnostics";
import { SEMANTIC_CSS_LIMITS_V1 } from "./limits";
import { PROPERTY_REGISTRY_V1 } from "./registry/properties";
import { createSelectorMatcher } from "./selector";

function flatten(root: SemanticNode): SemanticNode[] | null {
	const nodes: SemanticNode[] = [];
	const stack = [root];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!node) break;
		if (nodes.length >= SEMANTIC_CSS_LIMITS_V1.maxSemanticNodes) return null;
		nodes.push(node);
		const childCount = node.children.length;
		if (childCount > SEMANTIC_CSS_LIMITS_V1.maxSemanticNodes - nodes.length - stack.length) return null;
		for (let index = 0; index < childCount; index++) {
			const child = node.children[index];
			if (child) stack.push(child);
		}
	}
	return nodes;
}

export function analyzeStylesheet(program: StyleProgram, tree: SemanticNode): readonly SemanticCssDiagnostic[] {
	const diagnostics: SemanticCssDiagnostic[] = [];
	const nodes = flatten(tree);
	if (!nodes) {
		return [createDiagnostic("RESOURCE_LIMIT", "error", "The semantic tree exceeds the Semantic CSS node limit.")];
	}
	const matchesSelector = createSelectorMatcher(tree);
	for (const rule of program.rules) {
		const matches = nodes.filter((node) => matchesSelector(rule.selector, node.key));
		if (matches.length === 0) {
			diagnostics.push(
				createDiagnostic("SELECTOR_NO_MATCH", "warning", "This selector matches no semantic resume node.", rule.range),
			);
			continue;
		}
		for (const declaration of rule.declarations) {
			if (declaration.property.startsWith("--")) continue;
			const definition = PROPERTY_REGISTRY_V1[declaration.property];
			if (definition && !matches.some((node) => definition.appliesTo.includes(node.kind))) {
				diagnostics.push(
					createDiagnostic(
						"PROPERTY_NOT_APPLICABLE",
						"warning",
						`${declaration.property} cannot apply to the matched semantic node kinds.`,
						declaration.range,
					),
				);
			}
		}
	}
	return diagnostics;
}
