import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/style";

const crowdinUrl = "https://crowdin.com/project/reactive-resume";

type FAQItemData = {
	question: string;
	answer: React.ReactNode;
};

const getFaqItems = (): FAQItemData[] => [
	{
		question: t`Is Reactive Resume really free?`,
		answer: t`Yes! Reactive Resume is completely free to use, with no hidden costs, premium tiers, or subscription fees. It's open-source and will always remain free.`,
	},
	{
		question: t`How is my data protected?`,
		answer: t`Your data is stored securely and is never shared with third parties. You can also self-host Reactive Resume on your own servers for complete control over your data.`,
	},
	{
		question: t`Can I export my resume to PDF?`,
		answer: t`Absolutely! You can export your resume to PDF with a single click. The exported PDF maintains all your formatting and styling perfectly.`,
	},
	{
		question: t`Is Reactive Resume available in multiple languages?`,
		answer: (
			<Trans>
				Yes, Reactive Resume is available in multiple languages. You can choose your preferred language in the settings
				page, or using the language switcher in the top right corner. If you don't see your language, or you would like
				to improve the existing translations, you can{" "}
				<a
					href={crowdinUrl}
					target="_blank"
					rel="noopener"
					className={buttonVariants({ variant: "link", className: "h-auto px-0!" })}
				>
					contribute to the translations on Crowdin
					<span className="sr-only"> (opens in new tab)</span>
				</a>
				.
			</Trans>
		),
	},
	{
		question: t`What makes Reactive Resume different from other resume builders?`,
		answer: t`Reactive Resume is open-source, privacy-focused, and completely free. Unlike other resume builders, it doesn't show ads, track your data, or limit your features behind a paywall.`,
	},
	{
		question: t`Can I customize the templates?`,
		answer: t`Yes! Every template is fully customizable. You can change colors, fonts, spacing, and even write custom CSS for complete control over your resume's appearance.`,
	},
	{
		question: t`How do I share my resume?`,
		answer: t`You can share your resume via a unique public URL, protect it with a password, or download it as a PDF to share directly. The choice is yours!`,
	},
];

export function FAQ() {
	const faqItems = getFaqItems();

	return (
		<section
			id="frequently-asked-questions"
			className="flex flex-col gap-x-16 gap-y-6 p-4 md:p-8 lg:flex-row lg:gap-x-24 xl:py-16"
		>
			<motion.h2
				className={cn(
					"font-semibold text-2xl tracking-tight md:text-4xl xl:text-5xl",
					"flex shrink-0 flex-wrap items-center gap-x-1.5 lg:flex-col lg:items-start",
				)}
				initial={{ opacity: 0, x: -20 }}
				whileInView={{ opacity: 1, x: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
			>
				<Trans context="Every word needs to be wrapped in a tag">
					<span>Frequently</span>
					<span>Asked</span>
					<span>Questions</span>
				</Trans>
			</motion.h2>

			<motion.div
				className="max-w-2xl flex-1 lg:ml-auto 2xl:max-w-3xl"
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
