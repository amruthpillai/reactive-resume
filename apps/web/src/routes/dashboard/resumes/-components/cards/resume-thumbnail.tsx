import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { RouterOutput } from "@/libs/orpc/client";
import { FileTextIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";
import { createResumePdfBlob } from "@/libs/resume/pdf-document";
import {
	getResumeThumbnailCacheKey,
	getResumeThumbnailRenderSize,
	RESUME_THUMBNAIL_TARGET_WIDTH,
} from "./resume-thumbnail.shared";

type ResumeListItem = RouterOutput["resume"]["list"][number];

type ThumbnailState = { status: "error" | "idle" | "loading" } | { status: "ready"; url: string };

const canvasToBlob = async (canvas: HTMLCanvasElement) => {
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Failed to create resume thumbnail image."));
				return;
			}

			resolve(blob);
		}, "image/png");
	});
};

const createPdfFirstPageImageUrl = async (file: Blob) => {
	const { AnnotationMode, GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
	GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
	let pdfDocument: Awaited<typeof loadingTask.promise> | undefined;

	try {
		pdfDocument = await loadingTask.promise;
		const page = await pdfDocument.getPage(1);

		try {
			const baseViewport = page.getViewport({ scale: 1 });
			const renderSize = getResumeThumbnailRenderSize(
				{ height: baseViewport.height, width: baseViewport.width },
				RESUME_THUMBNAIL_TARGET_WIDTH,
				window.devicePixelRatio || 1,
			);

			const canvas = document.createElement("canvas");
			const canvasContext = canvas.getContext("2d");

			if (!canvasContext) throw new Error("Failed to create resume thumbnail canvas context.");

			canvas.height = renderSize.height;
			canvas.width = renderSize.width;

			const viewport = page.getViewport({ scale: renderSize.scale });
			const renderTask = page.render({
				canvas,
				canvasContext,
				viewport,
				annotationMode: AnnotationMode.DISABLE,
				background: "white",
			});

			await renderTask.promise;

			const image = await canvasToBlob(canvas);
			return URL.createObjectURL(image);
		} finally {
			page.cleanup();
		}
	} finally {
		if (pdfDocument) {
			void pdfDocument.destroy();
		} else {
			void loadingTask.destroy();
		}
	}
};

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
