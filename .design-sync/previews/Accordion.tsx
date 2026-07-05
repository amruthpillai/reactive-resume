import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@reactive-resume/ui/components/accordion";

const wrap: React.CSSProperties = { width: 420, padding: 16 };

// Open by default so the panel content is visible in the card (Base UI accordion
// is uncontrolled via defaultValue, matching item `value` props).
export const Sections = () => (
	<div style={wrap}>
		<Accordion defaultValue={["experience"]}>
			<AccordionItem value="experience">
				<AccordionTrigger>Work Experience</AccordionTrigger>
				<AccordionContent>
					<p>Senior Product Designer · Framer — 2021 to Present</p>
					<p>Led the redesign of the onboarding flow, lifting activation by 24% across web and mobile.</p>
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="education">
				<AccordionTrigger>Education</AccordionTrigger>
				<AccordionContent>
					<p>B.Des in Interaction Design · Rhode Island School of Design</p>
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="skills">
				<AccordionTrigger>Skills</AccordionTrigger>
				<AccordionContent>
					<p>Figma, prototyping, design systems, user research, and front-end handoff.</p>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	</div>
);

export const MultipleOpen = () => (
	<div style={wrap}>
		<Accordion openMultiple defaultValue={["summary", "certifications"]}>
			<AccordionItem value="summary">
				<AccordionTrigger>Professional Summary</AccordionTrigger>
				<AccordionContent>
					<p>Full-stack engineer with eight years shipping resilient TypeScript services and design systems.</p>
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="certifications">
				<AccordionTrigger>Certifications</AccordionTrigger>
				<AccordionContent>
					<p>AWS Solutions Architect · Professional</p>
					<p>Certified Kubernetes Administrator</p>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	</div>
);
