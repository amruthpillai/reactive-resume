import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { RouterOutput } from "@/libs/orpc/client";
import { FileTextIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { createPdfFirstPageImageUrl } from "@/features/resume/preview/pdf-thumbnail";
import { getResumeThumbnailCacheKey } from "@/features/resume/preview/resume-thumbnail.shared";
import { orpc } from "@/libs/orpc/client";

type ResumeListItem = RouterOutput["resume"]["list"][number];

type ThumbnailState = { status: "error" | "idle" | "loading" } | { status: "ready"; url: string };

function useResumeThumbnail(data: ResumeData | undefined, cacheKey: string | undefined) {
	const [thumbnail, setThumbnail] = useState<ThumbnailState>({ status: "idle" });
	const currentUrlRef = useRef<string | null>(null);

	const revokeCurrentThumbnail = useCallback(() => {
		if (!currentUrlRef.current) return;
		URL.revokeObjectURL(currentUrlRef.current);
		currentUrlRef.current = null;
	}, []);

	useEffect(() => {
		return () => {
			revokeCurrentThumbnail();
		};
	}, [revokeCurrentThumbnail]);

	useEffect(() => {
		if (!data || !cacheKey) {
			revokeCurrentThumbnail();
			setThumbnail({ status: "idle" });
			return;
		}

		let isCancelled = false;
		let nextUrl: string | null = null;

		setThumbnail({ status: "loading" });

		const generateThumbnail = async () => {
			try {
				const pdf = await createResumePdfBlob(data);
				if (isCancelled) return;

				nextUrl = await createPdfFirstPageImageUrl(pdf);
				if (isCancelled) {
					URL.revokeObjectURL(nextUrl);
					nextUrl = null;
					return;
				}

				revokeCurrentThumbnail();
				currentUrlRef.current = nextUrl;
				setThumbnail({ status: "ready", url: nextUrl });
				nextUrl = null;
			} catch (error) {
				if (isCancelled) return;

				console.error("Failed to generate resume thumbnail", error);
				revokeCurrentThumbnail();
				setThumbnail({ status: "error" });
			}
		};

		void generateThumbnail();

		return () => {
			isCancelled = true;

			if (nextUrl) {
				URL.revokeObjectURL(nextUrl);
			}
		};
	}, [data, cacheKey, revokeCurrentThumbnail]);

	return thumbnail;
}

export function ResumeThumbnail({ isLocked, resume }: { isLocked: boolean; resume: ResumeListItem }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(containerRef, { amount: 0.1, margin: "240px", once: true });
	const resumeQuery = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: resume.id } }),
		enabled: isInView,
	});
	const thumbnail = useResumeThumbnail(
		resumeQuery.data?.data,
		isInView ? getResumeThumbnailCacheKey(resume.id, resume.updatedAt) : undefined,
	);
	const hasFailed = resumeQuery.isError || thumbnail.status === "error";

	return (
		<div
			ref={containerRef}
			className={cn("relative size-full overflow-hidden bg-muted/40 transition-all", isLocked && "blur-xs")}
		>
			{thumbnail.status === "ready" ? (
				<div
					aria-hidden
					className="absolute inset-0 bg-center bg-contain bg-white bg-no-repeat"
					style={{ backgroundImage: `url(${thumbnail.url})` }}
				/>
			) : hasFailed ? (
				<div className="absolute inset-0 flex items-center justify-center">
					<FileTextIcon weight="thin" className="size-12 opacity-40" />
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center">
					<Spinner className="size-8 text-muted-foreground" />
				</div>
			)}
		</div>
	);
}
