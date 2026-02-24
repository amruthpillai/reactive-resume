import { PlusIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { CommandLoading } from "cmdk";
import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useDialogStore } from "@/dialogs/store";
import { orpc } from "@/integrations/orpc/client";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

export function ResumesCommandGroup() {
	const navigate = useNavigate();
	const { openDialog } = useDialogStore();
	const { session } = useRouteContext({ strict: false });
	const reset = useCommandPaletteStore((state) => state.reset);
	const peekPage = useCommandPaletteStore((state) => state.peekPage);
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	const isResumesPage = peekPage() === "resumes";

	const { data: resumes, isLoading } = useQuery(
		orpc.resume.list.queryOptions({
			enabled: !!session && isResumesPage,
		}),
	);

	const onCreate = () => {
		navigate({ to: "/dashboard/resumes" });
		openDialog("resume.create", undefined);
		reset();
	};

	const onNavigate = (path: string) => {
		navigate({ to: path });
		reset();
	};

	if (!session) return null;

	return (
		<>
			<BaseCommandGroup heading={Search for...}>
				<CommandItem keywords={["Resumes"]} value="search.resumes" onSelect={() => pushPage("resumes")}>
					<ReadCvLogoIcon />
					Resumes
				</CommandItem>
			</BaseCommandGroup>

			<BaseCommandGroup page="resumes" heading={Resumes}>
				<CommandItem onSelect={onCreate}>
					<PlusIcon />
					Create a new resume
				</CommandItem>

				{isLoading ? (
					<CommandLoading>
						Loading resumes...
					</CommandLoading>
				) : (
					resumes?.map((resume) => (
						<CommandItem
							key={resume.id}
							value={resume.id}
							keywords={[resume.name]}
							onSelect={() => onNavigate(`/builder/${resume.id}`)}
						>
							<ReadCvLogoIcon />
							{resume.name}

							<CommandShortcut className="opacity-0 transition-opacity group-data-[selected=true]/command-item:opacity-100">
								Press <Kbd>Enter</Kbd> to open
							</CommandShortcut>
						</CommandItem>
					))
				)}
			</BaseCommandGroup>
		</>
	);
}
