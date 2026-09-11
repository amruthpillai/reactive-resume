// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@reactive-resume/ui/components/dropdown-menu";
import { useResumeStore } from "@/features/resume/builder/draft";
import { SkillKeywordLayoutMenu } from "./skill-keyword-layout-menu";

const queryClient = { setQueryData: vi.fn() };
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => queryClient }));
vi.mock("@tanstack/react-router", () => ({ useParams: () => ({ resumeId: "keywords" }) }));
vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { getById: { queryOptions: () => ({ queryKey: ["resume"] }) } } },
	streamClient: {},
}));

beforeEach(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
	const data = structuredClone(defaultResumeData);
	data.customSections = [{ ...data.sections.skills, id: "custom", type: "skills", columns: 2 }];
	useResumeStore.getState().initialize({
		id: "keywords",
		name: "Keywords",
		slug: "keywords",
		tags: [],
		data,
		isLocked: false,
		updatedAt: new Date(),
	});
});
afterEach(() => useResumeStore.getState().reset());

function renderMenu(custom: boolean) {
	return render(
		<I18nProvider i18n={i18n}>
			<DropdownMenu>
				<DropdownMenuTrigger>Options</DropdownMenuTrigger>
				<DropdownMenuContent>
					<SkillKeywordLayoutMenu sectionId={custom ? "custom" : undefined} />
				</DropdownMenuContent>
			</DropdownMenu>
		</I18nProvider>,
	);
}

it.each([false, true])("changes keyword presentation through real draft hook with custom=%s", async (custom) => {
	renderMenu(custom);
	const selected = () =>
		custom
			? useResumeStore.getState().resume?.data.customSections[0]
			: useResumeStore.getState().resume?.data.sections.skills;
	screen.getByRole("button", { name: "Options" }).click();
	(await screen.findByRole("menuitem", { name: "Keyword layout" })).click();
	(await screen.findByRole("menuitemradio", { name: "Bulleted list" })).click();
	expect(selected()?.keywordLayout).toBe("list");
	expect(selected()?.columns).toBe(custom ? 2 : 1);
	act(() => useResumeStore.getState().undo());
	expect(selected()?.keywordLayout).toBe("inline");
	act(() => useResumeStore.getState().redo());
	expect(selected()?.keywordLayout).toBe("list");
});

it.each([false, true])("disables keyword controls on locked resumes with custom=%s", async (custom) => {
	useResumeStore.getState().patchResume((resume) => {
		resume.isLocked = true;
	});
	renderMenu(custom);
	screen.getByRole("button", { name: "Options" }).click();
	const control = await screen.findByRole("menuitem", { name: "Keyword layout" });
	expect(control.getAttribute("aria-disabled")).toBe("true");
	control.click();
	expect(screen.queryByRole("menuitemradio", { name: "Bulleted list" })).toBeNull();
});
