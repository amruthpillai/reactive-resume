import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { getRouter } from "./router";
import "./index.css";

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Root element not found");

const router = await getRouter();

// Server metadata describes the initial URL. The SPA router owns these tags after
// startup, including navigation into root mode from another marketing/public page.
const serverSeoSelectors = [
	"[data-root-resume-shell]",
	'head link[rel="canonical"]',
	'head script[type="application/ld+json"]',
	'head meta[property^="og:"]',
	'head meta[name^="twitter:"]',
];
document.querySelectorAll(serverSeoSelectors.join(",")).forEach((element) => {
	element.remove();
});

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);

	root.render(<RouterProvider router={router} />);
}
