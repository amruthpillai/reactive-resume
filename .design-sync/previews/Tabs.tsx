import { BriefcaseIcon, GraduationCapIcon, SparkleIcon } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";

const wrap: React.CSSProperties = { width: 460, padding: 16 };
const panel: React.CSSProperties = { padding: "12px 4px", lineHeight: 1.6 };

export const ResumeSections = () => (
	<div style={wrap}>
		<Tabs defaultValue="experience">
			<TabsList>
				<TabsTrigger value="experience">
					<BriefcaseIcon /> Experience
				</TabsTrigger>
				<TabsTrigger value="education">
					<GraduationCapIcon /> Education
				</TabsTrigger>
				<TabsTrigger value="skills">
					<SparkleIcon /> Skills
				</TabsTrigger>
			</TabsList>
			<TabsContent value="experience" style={panel}>
				<strong>Staff Engineer · Vercel</strong>
				<div>Owned the edge runtime rollout serving 2B requests per day.</div>
			</TabsContent>
			<TabsContent value="education" style={panel}>
				<strong>M.S. Computer Science · Carnegie Mellon</strong>
				<div>Focus on distributed systems and human-computer interaction.</div>
			</TabsContent>
			<TabsContent value="skills" style={panel}>
				<strong>Core stack</strong>
				<div>TypeScript, React, Go, PostgreSQL, and Kubernetes.</div>
			</TabsContent>
		</Tabs>
	</div>
);

export const LineVariant = () => (
	<div style={wrap}>
		<Tabs defaultValue="preview">
			<TabsList variant="line">
				<TabsTrigger value="preview">Preview</TabsTrigger>
				<TabsTrigger value="share">Share</TabsTrigger>
				<TabsTrigger value="export">Export</TabsTrigger>
			</TabsList>
			<TabsContent value="preview" style={panel}>
				Your resume renders live as you edit each section.
			</TabsContent>
			<TabsContent value="share" style={panel}>
				Publish a public link at reactive-resume.app/u/your-name.
			</TabsContent>
			<TabsContent value="export" style={panel}>
				Download a print-ready PDF or DOCX in one click.
			</TabsContent>
		</Tabs>
	</div>
);
