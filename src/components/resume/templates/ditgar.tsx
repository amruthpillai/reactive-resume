import { cn } from "@/utils/style";

import type { TemplateProps } from "./types";

import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";

const sectionClassName = cn(
	// Section Heading
	"[&>h6]:border-b [&>h6]:border-(--page-primary-color)",

	// Section Item Header in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:flex-col",
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:items-start",

	// Decoration Line in Section Item Header
	"group-data-[layout=main]:[&_.section-item-header]:ps-2",
	"group-data-[layout=main]:[&_.section-item-header]:py-0.5",
	"group-data-[layout=main]:[&_.section-item-header]:-ms-2.5",
	"group-data-[layout=main]:[&_.section-item-header]:border-s-2",
	"group-data-[layout=main]:[&_.section-item-header]:border-(--page-primary-color)",
);

/**
 * Template: Ditgar
 */
export function DitgarTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	return (
		<div className="template-ditgar page-content">
			{/* Sidebar Background */}
			{(!fullWidth || isFirstPage) && (
				<div className="page-sidebar-background pointer-events-none absolute inset-y-0 z-0 w-(--page-sidebar-width) shrink-0 bg-(--page-primary-color)/20 ltr:inset-s-0 rtl:inset-e-0" />
			)}

			<div className="flex">
				{(!fullWidth || isFirstPage) && (
					<aside data-layout="sidebar" className="sidebar group z-10 flex w-(--page-sidebar-width) shrink-0 flex-col">
						{isFirstPage && <Header />}

						<div className="flex-1 space-y-4 px-(--page-margin-x) pt-(--page-margin-y)">
							{sidebar.map((section) => {
								const Component = getSectionComponent(section, { sectionClassName });
								return <Component key={section} id={section} />;
							})}
						</div>
					</aside>
				)}

				<main data-layout="main" className={cn("main group z-10", !fullWidth ? "col-span-2" : "col-span-3")}>
					<div className="space-y-4 px-(--page-margin-x) pt-(--page-margin-y)">
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
		<div className="page-header space-y-4 bg-(--page-primary-color) px-(--page-margin-x) py-(--page-margin-y) text-(--page-background-color)">
			<PagePicture />

			<div className="basics-header">
				<h2 className="basics-name text-2xl font-bold">{basics.name}</h2>
				<p className="basics-headline">{basics.headline}</p>
			</div>

			<div className="basics-items flex flex-col items-start gap-y-2 text-sm [&>div>i]:text-(--page-background-color)!">
				{basics.location && (
					<div className="basics-item-location flex items-center gap-x-1.5">
						<PageIcon icon="map-pin" className="ph-bold" />
						<div>{basics.location}</div>
					</div>
				)}

				{basics.phone && (
					<div className="basics-item-phone flex items-center gap-x-1.5">
						<PageIcon icon="phone" className="ph-bold" />
						<PageLink url={`tel:${basics.phone}`} label={basics.phone} />
					</div>
				)}

				{basics.email && (
					<div className="basics-item-email flex items-center gap-x-1.5">
						<PageIcon icon="at" className="ph-bold" />
						<PageLink url={`mailto:${basics.email}`} label={basics.email} />
					</div>
				)}

				{basics.website.url && (
					<div className="basics-item-website flex items-center gap-x-1.5">
						<PageIcon icon="globe" className="ph-bold" />
						<PageLink {...basics.website} />
					</div>
				)}

				{basics.customFields.map((field) => (
					<div key={field.id} className="basics-item-custom flex items-center gap-x-1.5">
						<PageIcon icon={field.icon} />
						{field.link ? <PageLink url={field.link} label={field.text} /> : <span>{field.text}</span>}
					</div>
				))}
			</div>
		</div>
	);
}
