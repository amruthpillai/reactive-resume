import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/builder/$resumeId/")({
	ssr: false,
	component: lazyRouteComponent(() => import("./-components/preview-page"), "PreviewPage"),
});
