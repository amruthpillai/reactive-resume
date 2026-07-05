import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";

// FormItem carries its own field context (id + error state) — FormLabel /
// FormControl / FormDescription / FormMessage compose under it standalone.
const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, padding: 16, width: 340 };

export const Default = () => (
	<div style={wrap}>
		<FormItem>
			<FormLabel>Headline</FormLabel>
			<FormControl render={<Input placeholder="Senior Software Engineer" />} />
			<FormDescription>Shown under your name at the top of the resume.</FormDescription>
		</FormItem>
	</div>
);

export const WithError = () => (
	<div style={wrap}>
		<FormItem hasError>
			<FormLabel>Email</FormLabel>
			<FormControl render={<Input defaultValue="jane@" />} />
			<FormMessage errors={["Enter a valid email address."]} />
		</FormItem>
	</div>
);
