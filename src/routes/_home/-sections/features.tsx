import {
	CloudArrowUpIcon,
	CodeSimpleIcon,
	CurrencyDollarIcon,
	DatabaseIcon,
	DotsThreeIcon,
	FileCssIcon,
	FilesIcon,
	GithubLogoIcon,
	GlobeIcon,
	type Icon,
	KeyIcon,
	LayoutIcon,
	LockSimpleIcon,
	PaletteIcon,
	ProhibitIcon,
	ShieldCheckIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/utils/style";

type Feature = {
	id: string;
	icon: Icon;
	title: string;
	description: string;
};

type FeatureCardProps = Feature & {
	index: number;
};

const getFeatures = (): Feature[] => [
	{
		id: "free",
		icon: CurrencyDollarIcon,
		title: "Free",
		description: "Completely free, forever, no hidden costs.",
	},
	{
		id: "open-source",
		icon: GithubLogoIcon,
		title: "Open Source",
		description: "By the community, for the community.",
	},
	{
		id: "no-ads",
		icon: ProhibitIcon,
		title: "No Advertising, No Tracking",
		description: "For a secure and distraction-free experience.",
	},
	{
		id: "data-security",
		icon: DatabaseIcon,
		title: "Data Security",
		description: "Your data is secure, and never shared or sold to anyone.",
	},
	{
		id: "self-host",
		icon: CloudArrowUpIcon,
		title: "Self-Host with Docker",
		description: "You also have the option to deploy on your own servers using the Docker image.",
	},
	{
		id: "ai",
		icon: CodeSimpleIcon,
		title: "AI-Powered Writing",
		description: "Get AI suggestions to improve, shorten, or tailor your resume content.",
	},
	{
		id: "auth",
		icon: KeyIcon,
		title: "One-Click Sign-In",
		description: "Sign in with GitHub, Google or a custom OAuth provider.",
	},
	{
		id: "2fa",
		icon: ShieldCheckIcon,
		title: "Passkeys & 2FA",
		description: "Enhance the security of your account with additional layers of protection.",
	},
	{
		id: "unlimited-resumes",
		icon: FilesIcon,
		title: "Unlimited Resumes",
		description: "Create as many resumes as you want, without limits.",
	},
	{
		id: "design",
		icon: PaletteIcon,
		title: "Flexibility",
		description: "Personalize your resume with any colors, fonts or designs, and make it your own.",
	},
	{
		id: "css",
		icon: FileCssIcon,
		title: "Custom CSS",
		description: "Write your own CSS (or use an AI to generate it for you) to customize your resume to the fullest.",
	},
	{
		id: "templates",
		icon: LayoutIcon,
		title: "12+ Templates",
		description: "Beautiful templates to choose from, with more on the way.",
	},
	{
		id: "public",
		icon: GlobeIcon,
		title: "Shareable Links",
		description: "Share your resume with a public URL, and let others view it.",
	},
	{
		id: "password-protection",
		icon: LockSimpleIcon,
		title: "Password Protection",
		description: "Protect your resume with a password, and let only people with the password view it.",
	},
	{
		id: "api-access",
		icon: CodeSimpleIcon,
		title: "API Access",
		description: "Access your resumes and data programmatically using the API.",
	},
	{
		id: "more",
		icon: DotsThreeIcon,
		title: "And many more...",
		description: "New features are constantly being added and improved, so be sure to check back often.",
	},
];

function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
	return (
		<motion.div
			className={cn(
				"group relative flex min-h-48 flex-col gap-4 overflow-hidden border-b bg-background p-6 transition-[background-color] duration-300",
				"not-nth-[2n]:border-r xl:not-nth-[4n]:border-r",
				"hover:bg-secondary/30",
			)}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.1 }}
			transition={{ duration: 0.4, delay: index * 0.03, ease: "easeOut" }}
		>
			{/* Hover gradient overlay */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
			/>

			{/* Icon */}
			<div aria-hidden="true" className="relative">
				<div className="inline-flex rounded-lg bg-primary/5 p-2.5 text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
					<Icon size={24} weight="thin" />
				</div>
			</div>

			{/* Content */}
			<div className="relative flex flex-col gap-y-1.5">
				<h3 className="font-semibold text-base tracking-tight transition-colors group-hover:text-primary">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
			</div>
		</motion.div>
	);
}

export function Features() {
	return (
		<section id="features">
			{/* Header */}
			<motion.div
				className="space-y-4 p-4 md:p-8 xl:py-16"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
			>
				<h2 className="font-semibold text-2xl tracking-tight md:text-4xl xl:text-5xl">
					Features
				</h2>

				<p className="max-w-2xl text-muted-foreground leading-relaxed">
					Everything you need to create, customize, and share professional resumes. Built with privacy in mind,
						powered by open source, and completely free forever.
				</p>
			</motion.div>

			{/* Features Grid */}
			<div className="grid grid-cols-1 xs:grid-cols-2 border-t xl:grid-cols-4">
				{getFeatures().map((feature, index) => (
					<FeatureCard key={feature.id} {...feature} index={index} />
				))}
			</div>
		</section>
	);
}
