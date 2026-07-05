import { DownloadSimpleIcon, FileDocIcon, FilePdfIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
} from "@reactive-resume/ui/components/attachment";

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, padding: 16, width: 360 };

export const WithActions = () => (
	<div style={wrap}>
		<Attachment>
			<AttachmentMedia>
				<FilePdfIcon />
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>Ansel_Bradford_Resume.pdf</AttachmentTitle>
				<AttachmentDescription>248 KB · PDF</AttachmentDescription>
			</AttachmentContent>
			<AttachmentActions>
				<AttachmentAction aria-label="Download">
					<DownloadSimpleIcon />
				</AttachmentAction>
				<AttachmentAction aria-label="Remove">
					<TrashIcon />
				</AttachmentAction>
			</AttachmentActions>
		</Attachment>
	</div>
);

export const States = () => (
	<div style={wrap}>
		<Attachment size="sm" state="uploading">
			<AttachmentMedia>
				<FileDocIcon />
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>cover-letter.docx</AttachmentTitle>
				<AttachmentDescription>Uploading…</AttachmentDescription>
			</AttachmentContent>
		</Attachment>
		<Attachment size="sm" state="error">
			<AttachmentMedia>
				<WarningIcon />
			</AttachmentMedia>
			<AttachmentContent>
				<AttachmentTitle>portfolio-2024.zip</AttachmentTitle>
				<AttachmentDescription>Upload failed · file too large</AttachmentDescription>
			</AttachmentContent>
		</Attachment>
	</div>
);

export const Group = () => (
	<div style={{ padding: 16, width: 360 }}>
		<AttachmentGroup>
			<Attachment orientation="vertical" size="sm">
				<AttachmentMedia>
					<FilePdfIcon />
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>Resume.pdf</AttachmentTitle>
					<AttachmentDescription>248 KB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment orientation="vertical" size="sm">
				<AttachmentMedia>
					<FileDocIcon />
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>cover-letter.docx</AttachmentTitle>
					<AttachmentDescription>19 KB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
		</AttachmentGroup>
	</div>
);
