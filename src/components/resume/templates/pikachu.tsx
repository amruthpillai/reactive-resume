import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { isRTL } from "@/utils/locale";
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
 * Template: Pikachu
 */
export function PikachuTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;
	const locale = useResumeStore((state) => state.resume.data.metadata.page.locale);
	const rtlDirection = isRTL(locale);

	return (
		<div
			className="template-pikachu page-content px-(--page-margin-x) py-(--page-margin-y) print:p-0"
			style={{ direction: rtlDirection ? "rtl" : "ltr" }}
		>
			<div className="flex gap-x-(--page-margin-x)">
				<aside
					data-layout="sidebar"
					className="group page-sidebar flex w-(--page-sidebar-width) shrink-0 flex-col space-y-3"
				>
					{isFirstPage && (
						<div className="flex items-center justify-center">
							<PagePicture />
						</div>
					)}

					{!fullWidth && (
						<div className="shrink-0 space-y-(--page-gap-y) overflow-x-hidden">
							{sidebar.map((section) => {
								const Component = getSectionComponent(section, { sectionClassName });
								return <Component key={section} id={section} />;
							})}
						</div>
					)}
				</aside>

				<main data-layout="main" className="group page-main flex-1 space-y-(--page-margin-y)">
					{isFirstPage && <Header />}

					<div className="space-y-(--page-gap-y)">
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
		<div className="page-header w-full space-y-2 rounded-(--picture-border-radius) bg-(--page-primary-color) px-(--page-margin-x) py-(--page-margin-y) text-(--page-background-color)">
			<div className="border-(--page-background-color)/50 border-b pb-2">
				<h2 className="basics-name">{basics.name}</h2>
				<p className="basics-headline">{basics.headline}</p>
			</div>

			<div
				className="basics-items flex flex-wrap gap-x-3 gap-y-0.5 *:flex *:items-center *:gap-x-1.5"
				style={{ "--page-primary-color": "var(--page-background-color)" } as React.CSSProperties}
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
	);
}
