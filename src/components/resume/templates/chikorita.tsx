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

	// Section Heading in Sidebar Layout
	"group-data-[layout=sidebar]:[&>h6]:text-(--page-background-color)",
	"group-data-[layout=sidebar]:[&>h6]:border-(--page-background-color)",

	// Icon Colors in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item_i]:text-(--page-background-color)!",

	// Level Display in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-level>div]:bg-(--page-background-color)",
	"group-data-[layout=sidebar]:[&_.section-item-level>div]:text-(--page-background-color)",

	// Section Item Header in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:flex-col",
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:items-start",
);

/**
 * Template: Chikorita
 */
export function ChikoritaTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	return (
		<div className="template-chikorita page-content">
			{/* Sidebar Background */}
			{!fullWidth && (
				<div className="page-sidebar-background pointer-events-none absolute inset-y-0 z-0 w-(--page-sidebar-width) shrink-0 bg-(--page-primary-color) ltr:end-0 rtl:start-0" />
			)}

			{isFirstPage && <Header />}

			<div className="flex">
				<main
					data-layout="main"
					className="group page-main z-10 flex-1 space-y-4 px-(--page-margin-x) pt-(--page-margin-y)"
				>
					{main.map((section) => {
						const Component = getSectionComponent(section, { sectionClassName });
						return <Component key={section} id={section} />;
					})}
				</main>

				{!fullWidth && (
					<aside
						data-layout="sidebar"
						className="group page-sidebar z-10 w-(--page-sidebar-width) shrink-0 space-y-4 overflow-x-hidden px-(--page-margin-x) pt-(--page-margin-y) text-(--page-background-color)"
					>
						{sidebar.map((section) => {
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
		<div className="page-header relative flex">
			<div className="flex flex-1 items-center ps-(--page-margin-x) pt-(--page-margin-y)">
				<PagePicture />

				<div className="page-basics space-y-2 px-(--page-margin-x)">
					<div>
						<h2 className="basics-name">{basics.name}</h2>
						<p className="basics-headline">{basics.headline}</p>
					</div>

					<div className="basics-items flex flex-wrap gap-x-2 gap-y-0.5 *:flex *:items-center *:gap-x-1.5">
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

			<div className="w-(--page-sidebar-width) shrink-0" />
		</div>
	);
}
