import type { PdfCheck } from "../types";
import { contactIsOnFirstPage, hasProfessionalLink } from "../analyze/contact";
import { check, fail, failIf, hasNoText, pass, skip, snippet } from "./helpers";

/** A phone number a parser will recognise without heroics: digits, spaces, and at most one +. */
const PLAIN_PHONE = /^\+?[\d\s().-]{7,20}$/;
const BARE_URL = /(?:^|\s)(?:www\.|[\w-]+\.(?:com|org|net|io|dev|me|co|ai|app|edu|gov)\b)/i;

export const contactChecks: readonly PdfCheck[] = [
	check("NO_EMAIL", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.contact.emails.length === 0, "NO_EMAIL");
	}),

	check("NO_PHONE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.contact.phones.length === 0, "NO_PHONE");
	}),

	check("NO_NAME_LINE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.contact.nameLine === null, "NO_NAME_LINE");
	}),

	check("CONTACT_NOT_ON_FIRST_PAGE", (context) => {
		const { contact } = context.semantics;
		if (contact.emails.length === 0 && contact.phones.length === 0) return skip("not-applicable");

		return failIf(!contactIsOnFirstPage(context.doc, contact), "CONTACT_NOT_ON_FIRST_PAGE");
	}),

	check("EMAIL_SPLIT_ACROSS_ITEMS", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.contact.emailLooksSplit, "EMAIL_SPLIT_ACROSS_ITEMS");
	}),

	check("LINK_TEXT_URL_MISMATCH", (context) => {
		if (context.raw.links.length === 0) return skip("not-applicable");

		const [mismatch] = context.semantics.contact.linkMismatches;
		if (!mismatch) return pass;

		return fail("LINK_TEXT_URL_MISMATCH", { shown: mismatch.shown, target: mismatch.target });
	}),

	check("MULTIPLE_EMAILS", (context) => {
		const { emails } = context.semantics.contact;
		if (emails.length === 0) return skip("not-applicable");

		return failIf(emails.length > 1, "MULTIPLE_EMAILS", { count: emails.length });
	}),

	check("NO_PROFESSIONAL_LINK", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(!hasProfessionalLink(context.semantics.contact), "NO_PROFESSIONAL_LINK");
	}),

	check("BARE_URL_WITHOUT_PROTOCOL", (context) => {
		const { textUrls } = context.semantics.contact;
		if (textUrls.length === 0) return skip("not-applicable");

		const bare = textUrls.find((url) => !url.toLowerCase().startsWith("http") && BARE_URL.test(` ${url}`));
		if (!bare) return pass;

		return fail("BARE_URL_WITHOUT_PROTOCOL", undefined, { snippet: snippet(bare) });
	}),

	check("PHONE_FORMAT_UNUSUAL", (context) => {
		const { phones } = context.semantics.contact;
		if (phones.length === 0) return skip("not-applicable");

		const unusual = phones.find((phone) => !PLAIN_PHONE.test(phone));
		if (!unusual) return pass;

		return fail("PHONE_FORMAT_UNUSUAL", undefined, { snippet: snippet(unusual) });
	}),
];
