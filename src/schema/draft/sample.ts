import type { DraftData } from "./data";

export const sampleDraftData: DraftData = {
	picture: {
		url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/JohnvonNeumann-LosAlamos.jpg",
	},
	basics: {
		name: "John von Neumann",
		headline: "Mathematician, Physicist, and Computer Scientist",
		email: "",
		phone: "",
		location: "Princeton, NJ, USA",
		website: {
			label: "Wikipedia",
			url: "https://en.wikipedia.org/wiki/John_von_Neumann",
		},
		customFields: [
			{
				text: "Born: Budapest, 1903",
				link: "",
			},
			{
				text: "Citizenship: Hungarian-American",
				link: "",
			},
			{
				text: "Fields: Mathematics, Physics, Computer Science, Economics",
				link: "",
			},
		],
	},
	summary: {
		title: "Summary",
		content:
			"Hungarian-American polymath who made foundational contributions to mathematical logic, game theory, " +
			"quantum mechanics, and the architecture of stored-program computers. Led theoretical and applied " +
			"work across academia, national laboratories, and government advisory roles.",
	},
	sections: {
		profiles: {
			title: "Profiles",
			items: [
				{
					network: "Wikipedia",
					username: "",
					website: {
						label: "en.wikipedia.org/wiki/John_von_Neumann",
						url: "https://en.wikipedia.org/wiki/John_von_Neumann",
					},
				},
				{
					network: "Mathematics Genealogy Project",
					username: "",
					website: {
						label: "genealogy.math.ndsu.nodak.edu",
						url: "https://genealogy.math.ndsu.nodak.edu/id.php?id=16917",
					},
				},
				{
					network: "Institute for Advanced Study",
					username: "",
					website: {
						label: "ias.edu",
						url: "https://www.ias.edu",
					},
				},
			],
		},
		experience: {
			title: "Experience",
			items: [
				{
					company: "Institute for Advanced Study",
					position: "Professor of Mathematics",
					location: "Princeton, NJ, USA",
					period: "1933 - 1957",
					website: {
						label: "ias.edu",
						url: "https://www.ias.edu",
					},
					description:
						"Member of the founding faculty; advanced operator theory, set theory, and numerical analysis " +
						"and influenced early digital computer design through the IAS computer project.",
				},
				{
					company: "Los Alamos National Laboratory",
					position: "Consultant, Manhattan Project",
					location: "Los Alamos, NM, USA",
					period: "1943 - 1945",
					website: {
						label: "lanl.gov",
						url: "https://www.lanl.gov",
					},
					description:
						"Applied shockwave and hydrodynamics calculations to implosion modeling and contributed " +
						"to computational approaches for weapons physics.",
				},
				{
					company: "Princeton University",
					position: "Visiting Professor",
					location: "Princeton, NJ, USA",
					period: "1930 - 1933",
					website: {
						label: "princeton.edu",
						url: "https://www.princeton.edu",
					},
					description:
						"Taught and conducted research in mathematical physics and logic prior to joining the IAS.",
				},
			],
		},
		education: {
			title: "Education",
			items: [
				{
					school: "Pazmany Peter University (University of Budapest)",
					degree: "PhD",
					area: "Mathematics",
					grade: "",
					location: "Budapest, Hungary",
					period: "1921 - 1926",
					website: {
						label: "ELTE",
						url: "https://www.elte.hu/en/",
					},
					description: "Completed doctorate in mathematics at age 23.",
				},
				{
					school: "ETH Zurich",
					degree: "Dipl. Ing.",
					area: "Chemical Engineering",
					grade: "",
					location: "Zurich, Switzerland",
					period: "1921 - 1925",
					website: {
						label: "ETH Zurich",
						url: "https://ethz.ch/en.html",
					},
					description:
						"Completed engineering degree while pursuing advanced mathematics and physics coursework.",
				},
			],
		},
		projects: {
			title: "Projects",
			items: [
				{
					name: "First Draft of a Report on the EDVAC",
					period: "1945",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/First_Draft_of_a_Report_on_the_EDVAC",
					},
					description:
						"Outlined the stored-program concept and architectural principles that became standard " +
						"for modern digital computers.",
				},
				{
					name: "Monte Carlo Method (with Stanislaw Ulam)",
					period: "1940s",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Monte_Carlo_method",
					},
					description:
						"Pioneered stochastic simulation techniques for complex physical and mathematical systems.",
				},
				{
					name: "von Neumann Architecture",
					period: "1945 - 1950",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Von_Neumann_architecture",
					},
					description:
						"Defined the single memory, stored-program architecture adopted by most general-purpose computers.",
				},
			],
		},
		skills: {
			title: "Skills",
			items: [
				{
					name: "Mathematical Analysis",
					proficiency: "Expert",
					level: 5,
					keywords: ["Measure theory", "Functional analysis", "Operator theory"],
				},
				{
					name: "Game Theory",
					proficiency: "Expert",
					level: 5,
					keywords: ["Minimax theorem", "Zero-sum games", "Equilibrium analysis"],
				},
				{
					name: "Numerical Methods",
					proficiency: "Advanced",
					level: 4,
					keywords: ["Approximation", "Stability", "Numerical integration"],
				},
				{
					name: "Computer Architecture",
					proficiency: "Advanced",
					level: 4,
					keywords: ["Stored-program design", "Logical design", "IAS computer"],
				},
			],
		},
		languages: {
			title: "Languages",
			items: [
				{
					language: "Hungarian",
					fluency: "Native",
					level: 5,
				},
				{
					language: "German",
					fluency: "Fluent",
					level: 4,
				},
				{
					language: "English",
					fluency: "Fluent",
					level: 4,
				},
			],
		},
		interests: {
			title: "Interests",
			items: [
				{
					name: "Computing Machinery",
					keywords: ["Automatic computing", "Digital logic", "Programming"],
				},
				{
					name: "Nuclear Physics",
					keywords: ["Hydrodynamics", "Shock waves", "Implosion modeling"],
				},
				{
					name: "Economics and Strategy",
					keywords: ["Decision theory", "Game theory", "Utility"],
				},
				{
					name: "Mathematical Logic",
					keywords: ["Set theory", "Axiomatization", "Foundations"],
				},
			],
		},
		awards: {
			title: "Awards",
			items: [
				{
					title: "Enrico Fermi Award",
					awarder: "U.S. Atomic Energy Commission",
					date: "1956",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Enrico_Fermi_Award",
					},
					description: "Recognized for contributions to nuclear physics and the atomic energy program.",
				},
				{
					title: "Medal for Merit",
					awarder: "United States",
					date: "1947",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Medal_for_Merit_(United_States)",
					},
					description:
						"Awarded for exceptionally meritorious conduct in the performance of outstanding services.",
				},
			],
		},
		certifications: {
			title: "Certifications",
			items: [],
		},
		publications: {
			title: "Publications",
			items: [
				{
					title: "Theory of Games and Economic Behavior",
					publisher: "Princeton University Press",
					date: "1944",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Theory_of_Games_and_Economic_Behavior",
					},
					description:
						"Co-authored with Oskar Morgenstern; established the mathematical foundations of game theory.",
				},
				{
					title: "Mathematical Foundations of Quantum Mechanics",
					publisher: "Princeton University Press",
					date: "1932",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Mathematical_Foundations_of_Quantum_Mechanics",
					},
					description:
						"Formalized the Hilbert space framework for quantum mechanics and operator theory.",
				},
				{
					title: "The Computer and the Brain",
					publisher: "Yale University Press",
					date: "1958",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/The_Computer_and_the_Brain",
					},
					description:
						"Posthumous work comparing digital computation with biological neural systems.",
				},
			],
		},
		volunteer: {
			title: "Public Service",
			items: [
				{
					organization: "U.S. Atomic Energy Commission - General Advisory Committee",
					location: "Washington, DC, USA",
					period: "1947 - 1952",
					website: {
						label: "Wikipedia",
						url: "https://en.wikipedia.org/wiki/Atomic_Energy_Commission",
					},
					description:
						"Served on advisory committee on nuclear policy, reactor development, and national security.",
				},
			],
		},
		references: {
			title: "References",
			items: [
				{
					name: "Available upon request",
					position: "",
					website: {
						label: "",
						url: "",
					},
					phone: "",
					description: "",
				},
			],
		},
	},
	customSections: [
		{
			title: "Defense Research Projects",
			type: "projects",
			items: [
				{
					name: "Shockwave and Hydrodynamic Calculations",
					period: "1940s",
					website: {
						label: "",
						url: "",
					},
					description:
						"Developed numerical techniques for shockwave propagation and implosion dynamics " +
						"used in defense research and early computational physics.",
				},
			],
		},
	],
	metadata: {
		notes:
			"Draft profile for historical figure; contact fields are intentionally left blank where unknown.",
	},
};
