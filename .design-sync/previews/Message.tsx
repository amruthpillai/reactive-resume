import { SparkleIcon, UserIcon } from "@phosphor-icons/react";
import { Bubble, BubbleContent } from "@reactive-resume/ui/components/bubble";
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
} from "@reactive-resume/ui/components/message";

const avatar: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", padding: 8 };

export const Conversation = () => (
	<div style={{ display: "flex", padding: 16, width: 460 }}>
		<MessageGroup style={{ width: "100%" }}>
			<Message align="end">
				<MessageAvatar>
					<span style={avatar}>
						<UserIcon />
					</span>
				</MessageAvatar>
				<MessageContent>
					<Bubble align="end">
						<BubbleContent>Tailor my resume for a product manager role.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message align="start">
				<MessageAvatar>
					<span style={avatar}>
						<SparkleIcon />
					</span>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="muted" align="start">
						<BubbleContent>
							Done — I emphasized roadmap ownership and stakeholder communication in your summary.
						</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		</MessageGroup>
	</div>
);

export const WithMeta = () => (
	<div style={{ display: "flex", padding: 16, width: 460 }}>
		<Message align="start">
			<MessageAvatar>
				<span style={avatar}>
					<SparkleIcon />
				</span>
			</MessageAvatar>
			<MessageContent>
				<MessageHeader>Reactive AI</MessageHeader>
				<Bubble variant="tinted" align="start">
					<BubbleContent>I found 4 weak bullets and rewrote them with stronger verbs and metrics.</BubbleContent>
				</Bubble>
				<MessageFooter>Just now · applied 4 edits</MessageFooter>
			</MessageContent>
		</Message>
	</div>
);
