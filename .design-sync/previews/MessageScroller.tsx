import { SparkleIcon, UserIcon } from "@phosphor-icons/react";
import { Bubble, BubbleContent } from "@reactive-resume/ui/components/bubble";
import { Message, MessageAvatar, MessageContent } from "@reactive-resume/ui/components/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@reactive-resume/ui/components/message-scroller";

const avatar: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", padding: 8 };

const turns = [
	{ role: "user", text: "Can you review my resume for a senior engineering role?" },
	{ role: "assistant", text: "Sure — I'll focus on scope, impact, and leadership signals. Reading it now." },
	{ role: "user", text: "Great, keep the tone concise." },
	{
		role: "assistant",
		text: "I rewrote your summary and tightened three experience bullets with measurable outcomes.",
	},
	{ role: "user", text: "Perfect, publish the draft." },
	{ role: "assistant", text: "Draft saved and published to your public resume. Anything else you'd like to refine?" },
];

export const Thread = () => (
	<div style={{ height: 340, width: 460, padding: 12 }}>
		<MessageScrollerProvider autoScroll defaultScrollPosition="end">
			<MessageScroller>
				<MessageScrollerViewport>
					<MessageScrollerContent style={{ padding: 12 }}>
						{turns.map((turn, index) => (
							<MessageScrollerItem key={turn.text} messageId={`turn-${index}`}>
								<Message align={turn.role === "user" ? "end" : "start"}>
									<MessageAvatar>
										<span style={avatar}>{turn.role === "user" ? <UserIcon /> : <SparkleIcon />}</span>
									</MessageAvatar>
									<MessageContent>
										<Bubble
											variant={turn.role === "user" ? "default" : "muted"}
											align={turn.role === "user" ? "end" : "start"}
										>
											<BubbleContent>{turn.text}</BubbleContent>
										</Bubble>
									</MessageContent>
								</Message>
							</MessageScrollerItem>
						))}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
			</MessageScroller>
		</MessageScrollerProvider>
	</div>
);
