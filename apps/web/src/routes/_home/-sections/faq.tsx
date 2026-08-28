import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { m } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";
import { buttonVariants } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";

const crowdinUrl = "https://crowdin.com/project/reactive-resume";

type FAQItemData = {
	question: string;
	answer: React.ReactNode;
};

const getFaqItems = (): FAQItemData[] => [
	{
		question: t`Is Reactive Resume really free?`,
		answer: t`Yes. Reactive Resume is free to use, with no hidden costs, premium tiers, or subscription fees. It's open source, and it will stay free.`,
	},
	{
		question: t`How is my data protected?`,
		answer: t`Your data is stored securely and never shared with third parties. If you want full control over it, you can self-host Reactive Resume on your own servers.`,
	},
	{
		question: t`Can I export my resume to PDF?`,
		answer: t`Yes. One click exports your resume to PDF, with your formatting and styling intact.`,
	},
	{
		question: t`Is Reactive Resume available in multiple languages?`,
		answer: (
			<Trans>
				Yes. Pick your language on the settings page, or with the language switcher in the top right corner. If your
				language is missing, or the existing translation could be better, you can{" "}
				<a
					href={crowdinUrl}
					target="_blank"
					rel="noopener noreferrer"
					className={buttonVariants({ variant: "link", className: "h-auto px-0!" })}
				>
					contribute to the translations on Crowdin
					<span className="sr-only">
						<Trans comment="Screen reader hint indicating the FAQ translation contribution link opens in a new browser tab">
							{" "}
							(opens in new tab)
						</Trans>
					</span>
				</a>
				.
			</Trans>
		),
	},
	{
		question: t`What makes Reactive Resume different from other resume builders?`,
		answer: t`Reactive Resume is open source, private, and free. It shows no ads, doesn't track what you do, and doesn't lock features behind a paywall.`,
	},
	{
		question: t`How do I share my resume?`,
		answer: t`Share it with a public URL, put a password on that URL, or download the PDF and send it yourself.`,
	},
];

export function Faq() {
	const faqItems = getFaqItems();

	return (
		<section
			id="frequently-asked-questions"
			className="flex flex-col gap-x-16 gap-y-6 p-4 md:p-8 lg:flex-row lg:gap-x-18 xl:py-16"
		>
			<m.h2
				className={cn(
					"flex-1 font-semibold text-2xl tracking-tight will-change-[transform,opacity] md:text-4xl xl:text-5xl",
					"flex shrink-0 flex-wrap items-center gap-x-1.5 lg:flex-col lg:items-start",
				)}
				initial={{ opacity: 0, x: -20 }}
				whileInView={{ opacity: 1, x: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.45 }}
			>
				<Trans context="Home page FAQ section heading with each word visually separated into individual spans">
					<span>Frequently</span>
					<span>Asked</span>
					<span>Questions</span>
				</Trans>
			</m.h2>

			<m.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.45, delay: 0.08 }}
				className="max-w-2xl flex-2 will-change-[transform,opacity] lg:ml-auto 2xl:max-w-3xl"
			>
				<Accordion multiple>
					{faqItems.map((item, index) => (
						<FAQItemComponent key={item.question} item={item} index={index} />
					))}
				</Accordion>
			</m.div>
		</section>
	);
}

type FAQItemComponentProps = {
	item: FAQItemData;
	index: number;
};

function FAQItemComponent({ item, index }: FAQItemComponentProps) {
	return (
		<m.div
			className="will-change-[transform,opacity] last:border-b"
			initial={{ opacity: 0, y: 10 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.24, delay: Math.min(0.16, index * 0.03) }}
		>
			<AccordionItem value={item.question} className="group border-t">
				<AccordionTrigger className="py-5">{item.question}</AccordionTrigger>
				<AccordionContent className="pb-5 text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
			</AccordionItem>
		</m.div>
	);
}
