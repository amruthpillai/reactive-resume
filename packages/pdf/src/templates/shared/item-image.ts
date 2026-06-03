import type { ItemLogo } from "@reactive-resume/schema/resume/data";

/**
 * Returns true when the logo should be rendered:
 * - the logo object exists
 * - hidden is false
 * - a non-empty URL is provided
 */
export const hasItemLogo = (logo: ItemLogo | undefined): logo is ItemLogo & { url: string } =>
	Boolean(logo && !logo.hidden && logo.url.trim() !== "");
