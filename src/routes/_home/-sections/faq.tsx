import { CaretRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/utils/style";

type FAQItemData = {
	question: string;
	answer: React.ReactNode;
};

const getFaqItems = (): FAQItemData[] => [
	{
		question: "Is Reactive Resume free to use?",
		answer: "Yes! You can create a resume, use 3 templates, and export to PDF completely free. The Pro plan unlocks unlimited resumes, all 13 templates, and unlimited AI suggestions for $10/month.",
	},
	{
		question: "How is my data protected?",
		answer: "Your data is stored securely and is never shared with third parties. You can also self-host Reactive Resume on your own servers for complete control over your data.",
	},
	{
		question: "Can I export my resume to PDF?",
		answer: "Absolutely! You can export your resume to PDF with a single click. The exported PDF maintains all your formatting and styling perfectly.",
	},
	{
		question: "What does the Pro plan include?",
		answer: "Pro gives you unlimited resumes, access to all 13 premium templates, PDF exports without watermark, unlimited downloads, unlimited AI writing suggestions, and a custom public resume URL.",
	},
	{
		question: "What makes Reactive Resume different from other resume builders?",
		answer: "Reactive Resume is open-source and privacy-focused. Unlike other resume builders, it doesn't show ads or track your data. You can even self-host it on your own servers.",
	},
	{
		question: "Can I customize the templates?",
		answer: "Yes! Every template is fully customizable. You can change colors, fonts, spacing, and even write custom CSS for complete control over your resume's appearance.",
	},
	{
		question: "How do I share my resume?",
		answer: "You can share your resume via a unique public URL, protect it with a password, or download it as a PDF to share directly. The choice is yours!",
	},
];

export function FAQ() {
	const faqItems = getFaqItems();

	return (
		<section
			id="frequently-asked-questions"
			className="flex flex-col gap-x-16 gap-y-6 p-4 md:p-8 lg:flex-row lg:gap-x-18 xl:py-16"
		>
			<motion.h2
				className={cn(
					"flex-1 font-semibold text-2xl tracking-tight md:text-4xl xl:text-5xl",
					"flex shrink-0 flex-wrap items-center gap-x-1.5 lg:flex-col lg:items-start",
				)}
				initial={{ opacity: 0, x: -20 }}
				whileInView={{ opacity: 1, x: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
			>
				<span>Frequently</span>
					<span>Asked</span>
					<span>Questions</span>
			</motion.h2>

			<motion.div
				className="max-w-2xl flex-2 lg:ml-auto 2xl:max-w-3xl"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6, delay: 0.1 }}
			>
				<Accordion type="multiple">
					{faqItems.map((item, index) => (
						<FAQItemComponent key={item.question} item={item} index={index} />
					))}
				</Accordion>
			</motion.div>
		</section>
	);
}

type FAQItemComponentProps = {
	item: FAQItemData;
	index: number;
};

function FAQItemComponent({ item, index }: FAQItemComponentProps) {
	return (
		<motion.div
			className="last:border-b"
			initial={{ opacity: 0, y: 10 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.4, delay: index * 0.05 }}
		>
			<AccordionItem value={item.question} className="group border-t">
				<AccordionTrigger className="py-5">
					{item.question}
					<CaretRightIcon aria-hidden="true" className="shrink-0 transition-transform duration-200" />
				</AccordionTrigger>
				<AccordionContent className="pb-5 text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
			</AccordionItem>
		</motion.div>
	);
}
