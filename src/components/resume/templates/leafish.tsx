import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { isRTL } from "@/utils/locale";
import { cn } from "@/utils/style";
import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { PageSummary } from "../shared/page-summary";
import { useResumeStore } from "../store/resume";
import type { TemplateProps } from "./types";

const sectionClassName = cn(
	// Section Heading
	"[&>h6]:border-(--page-primary-color) [&>h6]:border-b",
);

/**
 * Template: Leafish
 */
export function LeafishTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;
	const locale = useResumeStore((state) => state.resume.data.metadata.page.locale);
	const rtlDirection = isRTL(locale);

	return (
		<div className="template-leafish page-content space-y-4" style={{ direction: rtlDirection ? "rtl" : "ltr" }}>
			{isFirstPage && <Header />}

			<div className="flex gap-x-(--page-margin-x) px-(--page-margin-x) pt-(--page-margin-y)">
				<main data-layout="main" className="group page-main space-y-4">
					{main
						.filter((section) => section !== "summary")
						.map((section) => {
							const Component = getSectionComponent(section, { sectionClassName });
							return <Component key={section} id={section} />;
						})}
				</main>

				{!fullWidth && (
					<aside data-layout="sidebar" className="group page-sidebar w-(--page-sidebar-width) shrink-0 space-y-4">
						{sidebar
							.filter((section) => section !== "summary")
							.map((section) => {
								const Component = getSectionComponent(section, { sectionClassName });
								return <Component key={section} id={section} />;
							})}
					</aside>
				)}
			</div>
		</div>
	);
}

function Header() {
	const basics = useResumeStore((state) => state.resume.data.basics);

	return (
		<div className="page-header bg-(--page-primary-color)/10">
			<div className="flex items-center gap-x-(--page-margin-x) px-(--page-margin-x) py-(--page-margin-y)">
				<PagePicture />

				<div className="space-y-2">
					<div>
						<h2 className="basics-name">{basics.name}</h2>
						<p className="basics-headline">{basics.headline}</p>
					</div>

					<PageSummary className="[&>h6]:hidden" />
				</div>
			</div>

			<div className="page-basics bg-(--page-primary-color)/10 px-(--page-margin-x) py-(--page-margin-y)">
				<div className="basics-items flex flex-wrap gap-x-4 gap-y-1 *:flex *:items-center *:gap-x-1.5">
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
