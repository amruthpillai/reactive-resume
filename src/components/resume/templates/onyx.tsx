import { EnvelopeIcon, GlobeIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { isRTL } from "@/utils/locale";
import { cn } from "@/utils/style";
import { getSectionComponent } from "../shared/get-section-component";
import { PageIcon } from "../shared/page-icon";
import { PageLink } from "../shared/page-link";
import { PagePicture } from "../shared/page-picture";
import { useResumeStore } from "../store/resume";
import type { TemplateProps } from "./types";

const sectionClassName = cn();

/**
 * Template: Onyx
 */
export function OnyxTemplate({ pageIndex, pageLayout }: TemplateProps) {
	const isFirstPage = pageIndex === 0;
	const { main, sidebar, fullWidth } = pageLayout;
	const locale = useResumeStore((state) => state.resume.data.metadata.page.locale);
	const rtlDirection = isRTL(locale);

	return (
		<div
			className="template-onyx page-content space-y-(--page-gap-y) px-(--page-margin-x) py-(--page-margin-y) print:p-0"
			style={{ direction: rtlDirection ? "rtl" : "ltr" }}
		>
			{isFirstPage && <Header />}

			<main data-layout="main" className="group page-main space-y-(--page-gap-y)">
				{main.map((section) => {
					const Component = getSectionComponent(section, { sectionClassName });
					return <Component key={section} id={section} />;
				})}
			</main>

			{!fullWidth && (
				<aside data-layout="sidebar" className="group page-sidebar space-y-(--page-gap-y)">
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
		<div className="page-header flex items-center gap-x-4 border-(--page-primary-color) border-b pb-(--page-margin-y)">
			<PagePicture />

			<div className="page-basics space-y-2">
				<div>
					<h2 className="basics-name">{basics.name}</h2>
					<p className="basics-headline">{basics.headline}</p>
				</div>

				<div className="basics-items flex flex-wrap gap-x-3 gap-y-0.5 *:flex *:items-center *:gap-x-1.5">
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
