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
	const locale = useResumeStore((state) => state.resume.data.metadata.page.locale);
	const rtlDirection = isRTL(locale);

	const SummaryComponent = getSectionComponent("summary", {
		sectionClassName: cn(sectionClassName, "px-(--page-margin-x) pt-(--page-margin-y)"),
	});

	return (
		<div
			className="template-ditgar page-content grid min-h-[inherit] grid-cols-3"
			style={{ direction: rtlDirection ? "rtl" : "ltr" }}
		>
			{/* Sidebar Background */}
			{(!fullWidth || isFirstPage) && (
				<div
					className={`page-sidebar-background absolute inset-y-0 ${rtlDirection ? "end-0" : "start-0"} z-0 w-(--page-sidebar-width) shrink-0 bg-(--page-primary-color)/20`}
				/>
			)}

			<div
				data-layout="sidebar"
				className={cn("sidebar group flex flex-col", !(isFirstPage || !fullWidth) && "hidden")}
			>
				{isFirstPage && <Header />}
			</div>

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
					{isFirstPage && <SummaryComponent id="summary" />}

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
		<div className="page-header space-y-4 bg-(--page-primary-color) px-(--page-margin-x) py-(--page-margin-y) text-(--page-background-color)">
			<PagePicture />

			<div>
				<h2 className="font-bold text-2xl">{basics.name}</h2>
				<p>{basics.headline}</p>
			</div>

			<div className="flex flex-col items-start gap-y-2 text-sm [&>div>i]:text-(--page-background-color)!">
				{basics.location && (
					<div className="flex items-center gap-x-1.5">
						<PageIcon icon="map-pin" className="ph-bold" />
						<div>{basics.location}</div>
					</div>
				)}
				{basics.phone && (
					<div className="flex items-center gap-x-1.5">
						<PageIcon icon="phone" className="ph-bold" />
						<PageLink url={`tel:${basics.phone}`} label={basics.phone} />
					</div>
				)}
				{basics.email && (
					<div className="flex items-center gap-x-1.5">
						<PageIcon icon="at" className="ph-bold" />
						<PageLink url={`mailto:${basics.email}`} label={basics.email} />
					</div>
				)}
				{basics.website.url && (
					<div className="flex items-center gap-x-1.5">
						<PageIcon icon="globe" className="ph-bold" />
						<PageLink {...basics.website} />
					</div>
				)}
			</div>
		</div>
	);
}
