import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/builder/$resumeId/")({
	component: lazyRouteComponent(() => import("./-components/preview-page"), "PreviewPage"),
	ssr: false,
});
