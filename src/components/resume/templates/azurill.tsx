import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { cn } from "@/utils/style";
import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";
import type { TemplateProps } from "./types";

const sectionClassName = cn(
	// Heading Decoration in Sidebar Layout
	"group-data-[layout=sidebar]:[&>h6]:px-4",
	"group-data-[layout=sidebar]:[&>h6]:relative",
	"group-data-[layout=sidebar]:[&>h6]:inline-flex",
	"group-data-[layout=sidebar]:[&>h6]:items-center",
	"group-data-[layout=sidebar]:[&>h6]:before:content-['']",
	"group-data-[layout=sidebar]:[&>h6]:before:absolute",
	"group-data-[layout=sidebar]:[&>h6]:before:left-0",
	"group-data-[layout=sidebar]:[&>h6]:before:rounded-full",
	"group-data-[layout=sidebar]:[&>h6]:before:size-2",
	"group-data-[layout=sidebar]:[&>h6]:before:border",
	"group-data-[layout=sidebar]:[&>h6]:before:border-(--page-primary-color)",
	"group-data-[layout=sidebar]:[&>h6]:after:content-['']",
	"group-data-[layout=sidebar]:[&>h6]:after:absolute",
	"group-data-[layout=sidebar]:[&>h6]:after:right-0",
	"group-data-[layout=sidebar]:[&>h6]:after:rounded-full",
	"group-data-[layout=sidebar]:[&>h6]:after:size-2",
	"group-data-[layout=sidebar]:[&>h6]:after:border",
	"group-data-[layout=sidebar]:[&>h6]:after:border-(--page-primary-color)",

	// Section in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:flex-col",
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:items-start",

	// Section in Main Layout
	"group-data-[layout=main]:[&>.section-content]:relative",
	"group-data-[layout=main]:[&>.section-content]:ml-4",
	"group-data-[layout=main]:[&>.section-content]:pl-4",
	"group-data-[layout=main]:[&>.section-content]:border-l",
	"group-data-[layout=main]:[&>.section-content]:border-(--page-primary-color)",

	// Timeline Marker in Main Layout
	"group-data-[layout=main]:[&>.section-content]:after:content-['']",
	"group-data-[layout=main]:[&>.section-content]:after:absolute",
	"group-data-[layout=main]:[&>.section-content]:after:top-5",
	"group-data-[layout=main]:[&>.section-content]:after:left-0",
	"group-data-[layout=main]:[&>.section-content]:after:size-2.5",
	"group-data-[layout=main]:[&>.section-content]:after:translate-x-[-50%]",
	"group-data-[layout=main]:[&>.section-content]:after:translate-y-[-50%]",
	"group-data-[layout=main]:[&>.section-content]:after:rounded-full",
	"group-data-[layout=main]:[&>.section-content]:after:border",
	"group-data-[layout=main]:[&>.section-content]:after:border-(--page-primary-color)",
	"group-data-[layout=main]:[&>.section-content]:after:bg-(--page-background-color)",
);

/**
 * Template: Azurill
 */
export function AzurillTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	return (
		<div className="template-azurill page-content space-y-(--page-gap-y) px-(--page-margin-x) py-(--page-margin-y) print:p-0">
			{isFirstPage && <Header />}

			<div className="flex gap-x-(--page-gap-x)">
				{!fullWidth && (
					<aside
						data-layout="sidebar"
						className="group page-sidebar w-(--page-sidebar-width) shrink-0 space-y-(--page-gap-y) overflow-x-hidden"
					>
						{sidebar.map((section) => {
							const Component = getSectionComponent(section, { sectionClassName });
							return <Component key={section} id={section} />;
						})}
					</aside>
				)}

				<main data-layout="main" className="group page-main grow space-y-(--page-gap-y)">
					{main.map((section) => {
						const Component = getSectionComponent(section, { sectionClassName });
						return <Component key={section} id={section} />;
					})}
				</main>
			</div>
		</div>
	);
}

function Header() {
	const basics = useResumeStore((state) => state.resume.data.basics);

	return (
		<div className="page-header flex flex-col items-center gap-y-2">
			<PagePicture />

			<div className="page-basics space-y-2 text-center">
				<div className="basics-header">
					<h2 className="basics-name">{basics.name}</h2>
					<p className="basics-headline">{basics.headline}</p>
				</div>

				<div className="basics-items flex flex-wrap justify-center gap-x-3 gap-y-1 *:flex *:items-center *:gap-x-1.5">
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
