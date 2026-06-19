import { Trans } from "@lingui/react/macro";

const atlasCloudUrl = "https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=reactive-resume";
const sponsorshipEmail = "hello@amruthpillai.com";

type SponsorsProps = {
	show: boolean;
};

export const Sponsors = ({ show }: SponsorsProps) => {
	if (!show) return null;

	return (
		<section className="px-8 py-20">
			<div className="mx-auto flex max-w-4xl flex-col items-center text-center">
				<h2 className="max-w-3xl font-semibold text-2xl tracking-tight md:text-4xl">
					<Trans>Thank you to our sponsors</Trans>
				</h2>
				<p className="mt-5 max-w-2xl text-base text-muted-foreground leading-relaxed">
					<Trans>
						Reactive Resume stays free, open-source, and independent because companies choose to support the work behind
						it. Their sponsorship helps fund hosting, maintenance, and continued development for the community.
					</Trans>
				</p>

				<a
					href={atlasCloudUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Atlas Cloud"
					className="mt-12 inline-block"
				>
					<span className="sr-only">Atlas Cloud</span>
					<img
						src="/sponsors/atlas-cloud-logo-black.svg"
						alt=""
						aria-hidden="true"
						draggable={false}
						className="pointer-events-none h-20 w-auto md:h-24 dark:hidden"
						loading="lazy"
					/>
					<img
						src="/sponsors/atlas-cloud-logo-white.svg"
						alt=""
						aria-hidden="true"
						draggable={false}
						className="pointer-events-none hidden h-20 w-auto md:h-24 dark:block"
						loading="lazy"
					/>
				</a>

				<p className="mt-8 max-w-2xl text-muted-foreground leading-relaxed">
					<Trans>
						Atlas Cloud supports Reactive Resume as a project sponsor. If your company would like to sponsor the
						project, email{" "}
						<a
							href={`mailto:${sponsorshipEmail}`}
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							{sponsorshipEmail}
						</a>
						.
					</Trans>
				</p>
			</div>
		</section>
	);
};
