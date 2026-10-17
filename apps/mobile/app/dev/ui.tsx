// Dev-only gallery of every src/ui primitive, for design review and screenshots. Not a product screen, so its
// sample copy is not translated. Production builds redirect home.
//
// Deep links: `me.rxresu://dev/ui?group=fields`, and `&open=sheet|long|reopen|tags|footer|dialog|destructive|toast|undo`
// to open an overlay on arrival. `reopen` closes the sheet and reopens it while it is still sliding away.
import type { ReactNode } from "react";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import {
	Avatar,
	Banner,
	Button,
	Card,
	Chip,
	ChipInput,
	ConfirmDialog,
	EmptyState,
	IconButton,
	ListGroup,
	ListRow,
	Screen,
	Segmented,
	SelectSheet,
	Sheet,
	Skeleton,
	SortableList,
	Switch,
	Text,
	TextArea,
	TextField,
	toast,
	useTheme,
} from "@/ui";

const groups = ["buttons", "fields", "lists", "feedback", "overlays", "sortable"] as const;
type Group = (typeof groups)[number];

type SectionProps = { title: string; children: ReactNode };

function Section({ title, children }: SectionProps) {
	const { space } = useTheme();
	return (
		<View style={{ gap: space.s3 }}>
			<Text variant="caption" color="ink3">
				{title}
			</Text>
			{children}
		</View>
	);
}

function Wrap({ children }: { children: ReactNode }) {
	const { space } = useTheme();
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2, alignItems: "center" }}>{children}</View>
	);
}

const noop = () => undefined;

function Buttons() {
	const [loading, setLoading] = useState(false);
	return (
		<>
			<Section title="Button variants">
				<Button size="lg" fullWidth label="Continue in browser" icon="arrow-square-out" onPress={noop} />
				<Button size="lg" fullWidth variant="secondary" label="Continue as guest" onPress={noop} />
				<Wrap>
					<Button label="Primary" onPress={noop} />
					<Button variant="secondary" label="Secondary" onPress={noop} />
					<Button variant="ghost" label="Ghost" onPress={noop} />
				</Wrap>
				<Wrap>
					<Button variant="danger" label="Delete" icon="trash" onPress={noop} />
					<Button variant="dangerOutline" label="Delete account" onPress={noop} />
					<Button variant="link" label="Link" onPress={noop} />
				</Wrap>
			</Section>
			<Section title="Sizes and states">
				<Wrap>
					<Button size="sm" label="Small" onPress={noop} />
					<Button size="sm" variant="secondary" label="Small" icon="plus" onPress={noop} />
					<Button disabled label="Disabled" onPress={noop} />
					<Button
						loading={loading}
						label="Loading"
						onPress={() => {
							setLoading(true);
							setTimeout(() => setLoading(false), 1500);
						}}
					/>
				</Wrap>
			</Section>
			<Section title="Icon buttons">
				<Wrap>
					<IconButton icon="dots-three" label="More" onPress={noop} />
					<IconButton icon="share-network" label="Share" variant="secondary" onPress={noop} />
					<IconButton icon="plus" label="New" variant="primary" onPress={noop} />
					<IconButton icon="text-b" label="Bold" selected onPress={noop} />
					<IconButton icon="trash" label="Delete" color="dangerText" onPress={noop} />
					<IconButton icon="arrow-left" label="Back" disabled onPress={noop} />
				</Wrap>
			</Section>
		</>
	);
}

function Fields() {
	const [name, setName] = useState("Senior Product Designer");
	const [server, setServer] = useState("");
	const [summary, setSummary] = useState("");
	const [degree, setDegree] = useState<string | null>(null);
	const [font, setFont] = useState<string | null>("medium");
	const [language, setLanguage] = useState<string | null>("English");
	const [switches, setSwitches] = useState([true, false]);
	const [view, setView] = useState("grid");
	const [kind, setKind] = useState("all");
	const [chips, setChips] = useState(["remote"]);
	const [tags, setTags] = useState(["game-dev"]);

	return (
		<>
			<Section title="Text fields">
				<TextField label="Title" value={name} onChangeText={setName} />
				<TextField
					label="Server"
					prefix="https://"
					value={server}
					onChangeText={setServer}
					placeholder="rxresu.me"
					helper="The address you open Reactive Resume at."
					autoCapitalize="none"
					keyboardType="url"
				/>
				<TextField
					label="Email"
					value="ava@"
					onChangeText={noop}
					error="Enter a full email address, like name@example.com."
				/>
				<TextField
					label="API key"
					mono
					value="rr_live_••••••••3f9a"
					onChangeText={noop}
					trailing={<IconButton icon="copy" label="Copy" size={20} onPress={noop} />}
				/>
				<TextArea label="Summary" value={summary} onChangeText={setSummary} placeholder="A few lines about you" />
			</Section>
			<Section title="Select sheet">
				<SelectSheet
					label="Degree"
					value={degree}
					placeholder="Choose a degree"
					onChange={setDegree}
					options={[
						{ value: "ba", label: "Bachelor of Arts" },
						{ value: "bs", label: "Bachelor of Science" },
						{ value: "ma", label: "Master of Arts", description: "Two years" },
					]}
				/>
			</Section>
			<Section title="Long select sheet">
				<SelectSheet
					label="Language"
					value={language}
					onChange={setLanguage}
					options={[
						"English",
						"Deutsch",
						"Français",
						"Español",
						"Italiano",
						"Português",
						"Nederlands",
						"Polski",
						"Svenska",
						"日本語",
						"한국어",
						"العربية",
					].map((label) => ({ value: label, label }))}
				/>
			</Section>
			<Section title="Switch">
				<Wrap>
					<Switch
						label="On"
						value={switches[0] ?? false}
						onValueChange={(on) => setSwitches([on, switches[1] ?? false])}
					/>
					<Switch
						label="Off"
						value={switches[1] ?? false}
						onValueChange={(on) => setSwitches([switches[0] ?? false, on])}
					/>
					<Switch label="Disabled" value disabled onValueChange={noop} />
				</Wrap>
			</Section>
			<Section title="Segmented">
				<Segmented
					label="View"
					value={view}
					onChange={setView}
					options={[
						{ value: "grid", label: "Grid", icon: "squares-four" },
						{ value: "list", label: "List", icon: "rows" },
					]}
				/>
				<Segmented
					label="Type"
					value={kind}
					onChange={setKind}
					options={[
						{ value: "all", label: "All" },
						{ value: "resumes", label: "Resumes" },
						{ value: "letters", label: "Letters" },
					]}
				/>
			</Section>
			<Section title="Chips">
				<Wrap>
					<Chip label="All" selected onPress={noop} />
					<Chip label="#art" onPress={noop} />
					<Chip label="Pinned" icon="map-pin" onPress={noop} />
					{chips.map((chip) => (
						<Chip key={chip} label={`#${chip}`} selected onRemove={() => setChips(chips.filter((c) => c !== chip))} />
					))}
				</Wrap>
				<ChipInput
					label="Tags"
					values={tags}
					onChange={setTags}
					placeholder="Add a keyword..."
					helper="Return or comma adds the keyword."
					suggestions={["art", "remote", "design", "game-dev"]}
					suggestionsLabel="Your tags"
				/>
			</Section>
			<Section title="Settings row select">
				<ListGroup>
					<SelectSheet
						appearance="row"
						label="Font size"
						value={font}
						onChange={setFont}
						options={[
							{ value: "small", label: "Small" },
							{ value: "medium", label: "Medium" },
							{ value: "large", label: "Large" },
						]}
					/>
				</ListGroup>
			</Section>
		</>
	);
}

function Lists() {
	const [notify, setNotify] = useState(true);
	const [selected, setSelected] = useState(false);
	return (
		<>
			<ListGroup title="Account" footer="Security settings open in the browser.">
				<ListRow title="Profile" leading="user-circle" chevron onPress={noop} />
				<ListRow title="Theme" leading="palette" value="System" chevron onPress={noop} />
				<ListRow
					title="Interview reminders"
					leading="bell"
					trailing={<Switch label="Interview reminders" value={notify} onValueChange={setNotify} />}
				/>
				<ListRow title="Password and passkeys" subtitle="rxresu.me" leading="lock" external onPress={noop} />
				<ListRow title="Add server" leading="plus" accent onPress={noop} />
				<ListRow title="Sign out" leading="sign-out" destructive onPress={noop} />
			</ListGroup>
			<ListGroup title="Choose one">
				<ListRow title="English" selected onPress={noop} />
				<ListRow title="Deutsch" onPress={noop} />
			</ListGroup>
			<Section title="Cards">
				<Card>
					<Text weight={600}>Product Designer at Lapras</Text>
					<Text variant="callout" color="ink3">
						Edited 2 hours ago
					</Text>
				</Card>
				<Card selected={selected} onPress={() => setSelected(!selected)} onLongPress={noop} accessibilityLabel="Letter">
					<Text weight={600}>Cover letter for Lapras</Text>
					<Text variant="callout" color={selected ? "ink2" : "ink3"}>
						Tap to select
					</Text>
				</Card>
			</Section>
			<Section title="Avatars">
				<Wrap>
					<Avatar name="Ava Martinez" size={36} />
					<Avatar name="Ava Martinez" />
					<Avatar name="Ava Martinez" size={72} />
					<Avatar name="Émile" size={36} />
				</Wrap>
			</Section>
		</>
	);
}

function Feedback() {
	const [dismissed, setDismissed] = useState(false);
	const { space } = useTheme();
	return (
		<>
			<View style={{ marginHorizontal: -space.s4 }}>
				<Banner
					strip
					variant="offline"
					message="Offline. Edits are saved on this device and sync when you reconnect."
				/>
			</View>
			<Banner variant="locked" message="Locked. Unlock to edit." />
			<Banner
				variant="guest"
				title="You're using a guest account"
				message="Your work is lost when you sign out or the session ends."
				actions={[
					{ label: "Create account", onPress: noop },
					{ label: "Sign in", onPress: noop },
				]}
			/>
			<Banner
				variant="sessionExpired"
				title="Your session on rxresu.me ended"
				message="Sign in again to keep working. Edits you made are kept on this device."
			/>
			<Banner tone="danger" icon="warning-circle" message="The Word file couldn't be generated. Try again." />
			{dismissed ? null : (
				<Banner
					tone="accent"
					icon="check-circle"
					message="Imported from LinkedIn. 9 sections, 24 entries."
					onDismiss={() => setDismissed(true)}
				/>
			)}
			<Section title="Skeleton">
				<View style={{ flexDirection: "row", gap: space.s3 }}>
					<View style={{ flex: 1, gap: space.s2 }}>
						<Skeleton height={140} />
						<Skeleton width="80%" height={14} />
						<Skeleton width="50%" height={12} />
					</View>
					<View style={{ flex: 1, gap: space.s2 }}>
						<Skeleton height={140} />
						<Skeleton width="70%" height={14} />
						<Skeleton width="40%" height={12} />
					</View>
				</View>
			</Section>
			<Section title="Toast">
				<Wrap>
					<Button variant="secondary" size="sm" label="Toast" onPress={() => toast({ message: "Link copied" })} />
					<Button
						variant="secondary"
						size="sm"
						label="With undo"
						onPress={() => toast({ message: "Moved to trash", undo: noop })}
					/>
				</Wrap>
			</Section>
			<EmptyState
				icon="file-text"
				title="No documents yet"
				message="Create a resume or import one you already have."
				action={{ label: "New resume", onPress: noop }}
				secondaryAction={{ label: "Import", onPress: noop }}
			/>
		</>
	);
}

type OverlaysProps = { open: string | undefined };

function Overlays({ open: initial }: OverlaysProps) {
	const [open, setOpen] = useState<string | undefined>(undefined);
	const [tags, setTags] = useState(["game-dev"]);
	const [note, setNote] = useState("");
	const [choice, setChoice] = useState<string | null>("modern");
	const close = () => setOpen(undefined);

	useEffect(() => {
		// Let the screen settle before presenting, so the sheet animates from the bottom.
		const timer = setTimeout(() => {
			if (!initial) return;
			if (initial === "toast" || initial === "undo") setOpen(undefined);
			if (initial === "toast") toast({ message: "Link copied" });
			else if (initial === "undo") toast({ message: "Moved to trash", undo: noop });
			else if (initial === "reopen") {
				setOpen("sheet");
				later.push(setTimeout(() => setOpen(undefined), 1200));
				later.push(setTimeout(() => setOpen("sheet"), 1300));
			} else setOpen(initial);
		}, 400);
		const later: ReturnType<typeof setTimeout>[] = [];
		return () => {
			clearTimeout(timer);
			for (const id of later) clearTimeout(id);
		};
	}, [initial]);

	return (
		<>
			<Wrap>
				<Button variant="secondary" label="Sheet" onPress={() => setOpen("sheet")} />
				<Button variant="secondary" label="Tags sheet" onPress={() => setOpen("tags")} />
				<Button variant="secondary" label="Sheet with footer" onPress={() => setOpen("footer")} />
				<Button variant="secondary" label="Dialog" onPress={() => setOpen("dialog")} />
				<Button variant="danger" label="Destructive dialog" onPress={() => setOpen("destructive")} />
			</Wrap>
			<SelectSheet
				label="Template"
				value={choice}
				onChange={setChoice}
				options={[
					{ value: "modern", label: "Azurill", icon: "file-text" },
					{ value: "classic", label: "Onyx", icon: "file-text" },
					{ value: "compact", label: "Pikachu", icon: "file-text" },
				]}
			/>

			<Sheet open={open === "long"} onClose={close} title="Move to">
				<ListGroup>
					{Array.from({ length: 30 }, (_, index) => (
						<ListRow key={index} title={`Section ${index + 1}`} onPress={close} />
					))}
				</ListGroup>
			</Sheet>
			<Sheet open={open === "sheet"} onClose={close} title="Sort by">
				<ListGroup>
					<ListRow title="Last edited" selected onPress={close} />
					<ListRow title="Name" onPress={close} />
					<ListRow title="Created" onPress={close} />
				</ListGroup>
			</Sheet>
			<Sheet
				open={open === "tags"}
				onClose={close}
				title="Tags"
				detents={[0.5, 0.9]}
				headerStart={<Button variant="ghost" size="sm" label="Cancel" onPress={close} />}
				headerEnd={<Button variant="ghost" size="sm" label="Save" onPress={close} />}
			>
				<Text variant="callout" color="ink2">
					Tags group documents in the library; pick one above the grid to filter by it.
				</Text>
				<ChipInput
					label="Add a tag"
					values={tags}
					onChange={setTags}
					placeholder="Add a keyword..."
					helper="Return or comma adds the keyword."
					suggestions={["art", "remote"]}
					suggestionsLabel="Your tags"
				/>
			</Sheet>
			<Sheet
				open={open === "footer"}
				onClose={close}
				title="Add a note"
				footer={<Button size="lg" fullWidth label="Save note" onPress={close} />}
			>
				<TextArea label="Note" value={note} onChangeText={setNote} placeholder="What happened in the interview?" />
			</Sheet>
			<ConfirmDialog
				open={open === "dialog"}
				title="Discard changes?"
				message="Your edits to this entry will be lost."
				confirmLabel="Discard"
				onConfirm={close}
				onCancel={close}
			/>
			<ConfirmDialog
				open={open === "destructive"}
				title="Delete 3 documents?"
				message="They are deleted for good. This can't be undone."
				confirmLabel="Delete"
				destructive
				onConfirm={close}
				onCancel={close}
			/>
		</>
	);
}

type Entry = { id: string; name: string };

function Sortable() {
	const { colors, size, space } = useTheme();
	const [entries, setEntries] = useState<Entry[]>([
		{ id: "1", name: "Experience" },
		{ id: "2", name: "Education" },
		{ id: "3", name: "Skills" },
		{ id: "4", name: "Projects" },
		{ id: "5", name: "Languages" },
	]);

	return (
		<SortableList
			data={entries}
			keyExtractor={(entry) => entry.id}
			onReorder={setEntries}
			renderItem={({ item, drag, isActive, accessibilityActions, onAccessibilityAction }) => (
				<View
					accessible
					accessibilityLabel={item.name}
					accessibilityActions={accessibilityActions}
					onAccessibilityAction={onAccessibilityAction}
					style={{
						flexDirection: "row",
						alignItems: "center",
						minHeight: size.row,
						paddingStart: space.s4,
						backgroundColor: isActive ? colors.raised : colors.bg,
						borderBottomWidth: 1,
						borderBottomColor: colors.line,
					}}
				>
					<Text variant="bodyLarge" style={{ flex: 1 }}>
						{item.name}
					</Text>
					<IconButton icon="dots-six-vertical" label={`Reorder ${item.name}`} onPress={noop} onLongPress={drag} />
				</View>
			)}
		/>
	);
}

function Gallery() {
	const params = useLocalSearchParams<{ group?: string; open?: string }>();
	const router = useRouter();
	// The group lives in the URL, so a deep link to the open gallery switches it too.
	const group: Group = groups.includes(params.group as Group) ? (params.group as Group) : "buttons";
	const setGroup = (value: Group) => router.setParams({ group: value, open: "" });
	const { space } = useTheme();
	const picker = (
		<View style={{ gap: space.s2 }}>
			<Segmented<Group>
				label="Group"
				value={group}
				onChange={setGroup}
				options={groups.slice(0, 3).map((value) => ({ value, label: value }))}
			/>
			<Segmented<Group>
				label="Group"
				value={group}
				onChange={setGroup}
				options={groups.slice(3).map((value) => ({ value, label: value }))}
			/>
		</View>
	);

	return (
		<>
			<Stack.Screen options={{ title: "UI kit" }} />
			{group === "sortable" ? (
				<Screen scroll={false} contentStyle={{ paddingHorizontal: 0 }}>
					<View style={{ paddingHorizontal: space.s4 }}>{picker}</View>
					<Sortable />
				</Screen>
			) : (
				<Screen contentStyle={{ gap: space.s6, paddingBottom: space.s12 * 2 }}>
					{picker}
					{group === "buttons" ? <Buttons /> : null}
					{group === "fields" ? <Fields /> : null}
					{group === "lists" ? <Lists /> : null}
					{group === "feedback" ? <Feedback /> : null}
					{group === "overlays" ? <Overlays open={params.open} /> : null}
				</Screen>
			)}
		</>
	);
}

export default function DevUiRoute() {
	if (!__DEV__) return <Redirect href="/" />;
	return <Gallery />;
}
