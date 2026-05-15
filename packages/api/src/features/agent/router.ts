import { actionsRouter } from "./actions";
import { attachmentsRouter } from "./attachments";
import { messagesRouter } from "./messages";
import { threadsRouter } from "./threads";

export const agentRouter = {
	threads: threadsRouter,
	messages: messagesRouter,
	attachments: attachmentsRouter,
	actions: actionsRouter,
};
