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

	// Section Item Header in Sidebar Layout
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:flex-col",
	"group-data-[layout=sidebar]:[&_.section-item-header>div]:items-start",
);

/**
 * Template: Gengar
 */
export function GengarTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;

	return (
		<div className="template-gengar page-content">
			{/* Sidebar Background */}
			{(!fullWidth || isFirstPage) && (
				<div className="page-sidebar-background pointer-events-none absolute inset-y-0 z-0 w-(--page-sidebar-width) shrink-0 bg-(--page-primary-color)/20 ltr:start-0 rtl:end-0" />
			)}

			<div className="flex">
				{(!fullWidth || isFirstPage) && (
					<aside
						data-layout="sidebar"
						className="group page-sidebar z-10 flex w-(--page-sidebar-width) shrink-0 flex-col"
					>
						{isFirstPage && <Header />}

						{!fullWidth && (
							<div className="shrink-0 space-y-4 overflow-x-hidden px-(--page-margin-x) pt-(--page-margin-y)">
								{sidebar
									.filter((section) => section !== "summary")
									.map((section) => {
										const Component = getSectionComponent(section, { sectionClassName });
										return <Component key={section} id={section} />;
									})}
							</div>
						)}
					</aside>
				)}

				<main data-layout="main" className="group page-main z-10">
					{isFirstPage && (
						<PageSummary
							className={cn(
								sectionClassName,
								"bg-(--page-primary-color)/20 px-(--page-margin-x) py-(--page-margin-y) [&>h6]:hidden",
							)}
						/>
					)}

					<div className="space-y-4 px-(--page-margin-x) pt-(--page-margin-y)">
						{main
							.filter((section) => section !== "summary")
							.map((section) => {
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
			<div className="flex w-full shrink-0 flex-col justify-center gap-y-2 bg-(--page-primary-color) px-(--page-margin-x) py-(--page-margin-y) text-(--page-background-color)">
				<PagePicture />

				<div>
					<h2 className="basics-name">{basics.name}</h2>
					<p className="basics-headline">{basics.headline}</p>
				</div>

				<div
					className="basics-items flex flex-col gap-y-1 *:flex *:items-center *:gap-x-1.5"
					style={{ "--page-primary-color": "var(--page-background-color)" } as React.CSSProperties}
				>
					{basics.email && (
						<div className="basics-item-email">
							<PageIcon icon="envelope" />
							<PageLink url={`mailto:${basics.email}`} label={basics.email} />
						</div>
					)}

					{basics.phone && (
						<div className="basics-item-phone">
							<PageIcon icon="phone" />
							<PageLink url={`tel:${basics.phone}`} label={basics.phone} />
						</div>
					)}

					{basics.location && (
						<div className="basics-item-location">
							<PageIcon icon="map-pin" />
							<span>{basics.location}</span>
						</div>
					)}

					{basics.website.url && (
						<div className="basics-item-website">
							<PageIcon icon="globe" />
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
