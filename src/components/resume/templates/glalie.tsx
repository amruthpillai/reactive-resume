import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { cn } from "@/utils/style";
import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";
import type { TemplateProps } from "./types";

const sectionClassName = cn(
	// Section Heading
	"[&>h6]:border-(--page-primary-color) [&>h6]:border-b",

	// Section Item Header in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:flex-col",
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:items-start",
);

/**
 * Template: Glalie
 */
export function GlalieTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	return (
		<div className="template-glalie page-content">
			{/* Sidebar Background */}
			{(!fullWidth || isFirstPage) && (
				<div className="page-sidebar-background absolute inset-y-0 left-0 z-0 w-(--page-sidebar-width) shrink-0 bg-(--page-primary-color)/20" />
			)}

			<div className="flex">
				<aside
					data-layout="sidebar"
					className="group page-sidebar flex w-(--page-sidebar-width) shrink-0 flex-col space-y-4 px-(--page-margin-x) py-(--page-margin-y)"
				>
					{isFirstPage && <Header />}

					{!fullWidth && (
						<div className="shrink-0 space-y-4 overflow-x-hidden">
							{sidebar.map((section) => {
								const Component = getSectionComponent(section, { sectionClassName });
								return <Component key={section} id={section} />;
							})}
						</div>
					)}
				</aside>

				<main data-layout="main" className="group page-main">
					<div className="space-y-4 px-(--page-margin-x) py-(--page-margin-y)">
						{main.map((section) => {
							const Component = getSectionComponent(section, { sectionClassName });
							return <Component key={section} id={section} />;
						})}
					</div>
				</main>
			</div>
		</div>
	);
}

function Header() {
	const basics = useResumeStore((state) => state.resume.data.basics);

	return (
		<div className="page-header relative flex">
			<div className="flex w-full shrink-0 flex-col items-center justify-center gap-y-3">
				<PagePicture />

				<div className="text-center">
					<h2 className="basics-name">{basics.name}</h2>
					<p className="basics-headline">{basics.headline}</p>
				</div>

				<div
					style={{ "--box-radius": "calc(var(--picture-border-radius) / 4)" } as React.CSSProperties}
					className="basics-items flex w-full flex-col gap-y-1 rounded-(--box-radius) border border-(--page-primary-color) p-3 *:flex *:items-center *:gap-x-1.5"
				>
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
