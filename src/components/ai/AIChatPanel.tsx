import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/animate-ui/components/buttons/button";
// import { Input } from "@/components/animate-ui/components/input";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIChatPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi 👋 I can help you improve your resume. What would you like to change?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content: "Got it 👍 (AI response will come here)",
      },
    ]);

    setInput("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l bg-popover shadow-lg"
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <h3 className="font-medium">Build with AI</h3>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <XIcon />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[90%] rounded-lg px-3 py-2 ${msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t p-3">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Tell me what to change…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <Button size="icon" onClick={handleSend}>
              <PaperPlaneRightIcon />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}