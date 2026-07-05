import { CheckIcon } from "@phosphor-icons/react";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
} from "@reactive-resume/ui/components/avatar";

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, padding: 20 };

export const Fallback = () => (
	<div style={row}>
		<Avatar>
			<AvatarFallback>AP</AvatarFallback>
		</Avatar>
		<Avatar>
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
		<Avatar>
			<AvatarFallback>MK</AvatarFallback>
		</Avatar>
	</div>
);

export const WithStatus = () => (
	<div style={row}>
		<Avatar>
			<AvatarFallback>AP</AvatarFallback>
			<AvatarBadge>
				<CheckIcon weight="bold" />
			</AvatarBadge>
		</Avatar>
		<Avatar size="lg">
			<AvatarFallback>SR</AvatarFallback>
			<AvatarBadge />
		</Avatar>
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<Avatar size="sm">
			<AvatarFallback>AP</AvatarFallback>
		</Avatar>
		<Avatar size="default">
			<AvatarFallback>AP</AvatarFallback>
		</Avatar>
		<Avatar size="lg">
			<AvatarFallback>AP</AvatarFallback>
		</Avatar>
	</div>
);

export const Group = () => (
	<div style={row}>
		<AvatarGroup>
			<Avatar>
				<AvatarFallback>AP</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>MK</AvatarFallback>
			</Avatar>
			<AvatarGroupCount>+5</AvatarGroupCount>
		</AvatarGroup>
	</div>
);
