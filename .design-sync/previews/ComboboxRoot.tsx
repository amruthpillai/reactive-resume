import {
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxRoot,
} from "@reactive-resume/ui/components/combobox";

const skills = ["TypeScript", "React", "Node.js", "GraphQL", "PostgreSQL", "Kubernetes"];

// Base UI Combobox — items passed to Root, rendered open (defaultOpen).
// cfg.overrides.ComboboxRoot pins cardMode: single + viewport with room below.
export const Open = () => (
	<div style={{ width: 320, padding: 16, paddingBottom: 200 }}>
		<ComboboxRoot items={skills} defaultOpen>
			<ComboboxInput placeholder="Add a skill…" />
			<ComboboxContent>
				<ComboboxEmpty>No skills found.</ComboboxEmpty>
				<ComboboxList>
					{(item: string) => (
						<ComboboxItem key={item} value={item}>
							{item}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</ComboboxRoot>
	</div>
);
