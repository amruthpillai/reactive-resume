import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@reactive-resume/ui/components/bubble";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: 16, width: 420 };

export const Conversation = () => (
	<div style={wrap}>
		<BubbleGroup>
			<Bubble align="end">
				<BubbleContent>Can you make my summary sound more senior without exaggerating?</BubbleContent>
			</Bubble>
			<Bubble variant="muted" align="start">
				<BubbleContent>
					I tightened it to lead with scope and outcomes. Want me to mirror that tone in your experience bullets too?
				</BubbleContent>
			</Bubble>
			<Bubble align="end">
				<BubbleContent>Yes, keep it concise.</BubbleContent>
			</Bubble>
		</BubbleGroup>
	</div>
);

export const Variants = () => (
	<div style={wrap}>
		<Bubble variant="default" align="end">
			<BubbleContent>Applied 3 edits to your resume.</BubbleContent>
		</Bubble>
		<Bubble variant="tinted" align="start">
			<BubbleContent>I emphasized measurable launch outcomes in your last role.</BubbleContent>
		</Bubble>
		<Bubble variant="outline" align="start">
			<BubbleContent>Draft saved — publish when you're ready.</BubbleContent>
		</Bubble>
		<Bubble variant="destructive" align="start">
			<BubbleContent>Couldn't reach the AI provider. Retry?</BubbleContent>
		</Bubble>
	</div>
);

export const WithReactions = () => (
	<div style={{ padding: 24, width: 420 }}>
		<Bubble variant="secondary" align="start">
			<BubbleContent>Rewrote your headline to target a Senior Product Manager role.</BubbleContent>
			<BubbleReactions>👍 2</BubbleReactions>
		</Bubble>
	</div>
);
