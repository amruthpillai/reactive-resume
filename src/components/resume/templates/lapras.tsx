import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { cn } from "@/utils/style";
import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";
import type { TemplateProps } from "./types";

const sectionClassName = cn(
	// Container
	"rounded-(--container-border-radius) border border-(--page-text-color)/10 bg-(--page-background-color) p-4",

	// Section Heading
	"[&>h6]:-mt-(--heading-negative-margin) [&>h6]:max-w-fit [&>h6]:bg-(--page-background-color) [&>h6]:px-4 [&>h6]:pb-0.5",
);

/**
 * Template: Lapras
 */
export function LaprasTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	const containerBorderRadius = useResumeStore((state) => Math.min(state.resume.data.picture.borderRadius, 30));
	const headingNegativeMargin = useResumeStore((state) => state.resume.data.metadata.typography.heading.fontSize + 6);

	return (
		<div
			style={
				{
					"--container-border-radius": `${containerBorderRadius}pt`,
					"--heading-negative-margin": `${headingNegativeMargin}pt`,
				} as React.CSSProperties
			}
			className="template-lapras page-content space-y-7 px-(--page-margin-x) py-(--page-margin-y) print:p-0"
		>
			{isFirstPage && <Header />}

			<main data-layout="main" className="group page-main space-y-7">
				{main.map((section) => {
					const Component = getSectionComponent(section, { sectionClassName });
					return <Component key={section} id={section} />;
				})}
			</main>

			{!fullWidth && (
				<aside data-layout="sidebar" className="group page-sidebar space-y-7">
					{sidebar.map((section) => {
						const Component = getSectionComponent(section, { sectionClassName });
						return <Component key={section} id={section} />;
					})}
				</aside>
			)}
		</div>
	);
}

function Header() {
	const basics = useResumeStore((state) => state.resume.data.basics);

	return (
		<div
			className={cn(
				"page-header flex items-center gap-x-4",
				"rounded-(--picture-border-radius) border border-(--page-text-color)/10 bg-(--page-background-color) p-4",
			)}
		>
			<PagePicture />

			<div className="page-basics space-y-2">
				<div>
					<h2 className="basics-name">{basics.name}</h2>
					<p className="basics-headline">{basics.headline}</p>
				</div>

				<div className="basics-items flex flex-wrap gap-x-2 gap-y-0.5 *:flex *:items-center *:gap-x-1.5 *:border-(--page-primary-color) *:border-r *:py-0.5 *:pr-2 *:last:border-r-0">
					{basics.email && (
						<div className="basics-item-email">
							<EnvelopeIcon />
							<PageLink url={`mailto:${basics.email}`} label={basics.email} />
						</div>
					)}

					{basics.phone && (
						<div className="basics-item-phone">
							<PhoneIcon />
							<PageLink url={`tel:${basics.phone}`} label={basics.phone} />
						</div>
					)}

					{basics.location && (
						<div className="basics-item-location">
							<MapPinIcon />
							<span>{basics.location}</span>
						</div>
					)}

					{basics.website.url && (
						<div className="basics-item-website">
							<GlobeIcon />
							<PageLink {...basics.website} />
						</div>
					)}

					{basics.customFields.map((field) => (
						<div key={field.id} className="basics-item-custom">
							<PageIcon icon={field.icon} />
							{field.link ? <PageLink url={field.link} label={field.text} /> : <span>{field.text}</span>}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
