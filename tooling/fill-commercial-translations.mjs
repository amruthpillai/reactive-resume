import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const localeDir = join(process.cwd(), "apps", "web", "locales");

const en = {
	"250+ Templates": "250+ Templates",
	Achievements: "Achievements",
	"Action plan": "Action plan",
	"Add negotiation scripts and an email template to the resume notes.":
		"Add negotiation scripts and an email template to the resume notes.",
	"An unknown error occurred while building your career plan.":
		"An unknown error occurred while building your career plan.",
	"An unknown error occurred while building your resume draft.":
		"An unknown error occurred while building your resume draft.",
	"ATS, growth, and salary notes were saved in the resume notes.":
		"ATS, growth, and salary notes were saved in the resume notes.",
	"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.",
	"Building your career plan...": "Building your career plan...",
	"Building your resume draft...": "Building your resume draft...",
	"Career coach": "Career coach",
	"Career plan ready.": "Career plan ready.",
	"Change language. Current language: {selectedLabel}": "Change language. Current language: {selectedLabel}",
	Constraints: "Constraints",
	"Current situation": "Current situation",
	Essay: "Essay",
	"Experience essay": "Experience essay",
	"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.",
	"Gaps to close": "Gaps to close",
	"Generate a headline, About section, recruiter message, and profile improvement ideas.":
		"Generate a headline, About section, recruiter message, and profile improvement ideas.",
	"Generate a tailored resume from your experience, a target job, and optional offer details.":
		"Generate a tailored resume from your experience, a target job, and optional offer details.",
	"Generate plan": "Generate plan",
	"Generate resume": "Generate resume",
	"Generating...": "Generating...",
	"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary",
	Goals: "Goals",
	Guided: "Guided",
	"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.",
	"Interview preparation": "Interview preparation",
	"Job description": "Job description",
	"Job offer text": "Job offer text",
	"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.",
	"LinkedIn profile builder": "LinkedIn profile builder",
	"LinkedIn strategy": "LinkedIn strategy",
	Links: "Links",
	Networking: "Networking",
	"Offer details": "Offer details",
	Optional: "Optional",
	"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.",
	"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.",
	"Resume strategy": "Resume strategy",
	"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.",
	"Salary negotiation": "Salary negotiation",
	"Salary strategy": "Salary strategy",
	Seniority: "Seniority",
	"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).",
	"Strengths to leverage": "Strengths to leverage",
	"Target compensation": "Target compensation",
	"Target role": "Target role",
	"The AI returned an invalid career plan. Please try again.":
		"The AI returned an invalid career plan. Please try again.",
	"The AI returned an invalid resume draft. Please try again.":
		"The AI returned an invalid resume draft. Please try again.",
	"The coach is reviewing your resume, goals, and market positioning.":
		"The coach is reviewing your resume, goals, and market positioning.",
	"This may take a minute while the AI turns your experience into structured resume sections.":
		"This may take a minute while the AI turns your experience into structured resume sections.",
	Timeframe: "Timeframe",
	"Turn your story or a job offer into a tailored resume": "Turn your story or a job offer into a tailored resume",
	"Use one of your resumes as coaching context.": "Use one of your resumes as coaching context.",
	"Watch-outs": "Watch-outs",
	"Weekly plan": "Weekly plan",
	"Wizard mode": "Wizard mode",
	"Work history": "Work history",
	"Your wizard resume is ready.": "Your wizard resume is ready.",
};

const translations = {
	"en-GB": en,
	"ar-SA": {
		"250+ Templates": "أكثر من 250 قالبًا",
		Achievements: "الإنجازات",
		"Action plan": "خطة العمل",
		"Add negotiation scripts and an email template to the resume notes.":
			"إضافة نصوص تفاوض وقالب بريد إلكتروني إلى ملاحظات السيرة الذاتية.",
		"An unknown error occurred while building your career plan.": "حدث خطأ غير معروف أثناء إنشاء خطتك المهنية.",
		"An unknown error occurred while building your resume draft.": "حدث خطأ غير معروف أثناء إنشاء مسودة سيرتك الذاتية.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"تم حفظ ملاحظات ATS والنمو والراتب في ملاحظات السيرة الذاتية.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"أنشئ خطة عملية للأدوار المستهدفة والمهارات والمقابلات ولينكدإن والتعويضات.",
		"Building your career plan...": "جارٍ إنشاء خطتك المهنية...",
		"Building your resume draft...": "جارٍ إنشاء مسودة سيرتك الذاتية...",
		"Career coach": "مدرب مهني",
		"Career plan ready.": "الخطة المهنية جاهزة.",
		"Change language. Current language: {selectedLabel}": "تغيير اللغة. اللغة الحالية: {selectedLabel}",
		Constraints: "القيود",
		"Current situation": "الوضع الحالي",
		Essay: "مقال",
		"Experience essay": "وصف الخبرة",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"استكشف مجموعة متنوعة من القوالب المصممة لأساليب ومهن وشخصيات مختلفة. تتضمن المنصة الآن أكثر من 250 قالب سيرة ذاتية و CV، مع خيارات مخصصة للأدوار التي تعتمد على ATS، والتنفيذية، والتقنية، والإبداعية، والأكاديمية، والدولية.",
		"Gaps to close": "الفجوات التي يجب سدها",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"إنشاء عنوان وقسم نبذة ورسالة للمسؤول عن التوظيف وأفكار لتحسين الملف الشخصي.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"إنشاء سيرة ذاتية مخصصة من خبرتك ووظيفة مستهدفة وتفاصيل عرض اختيارية.",
		"Generate plan": "إنشاء خطة",
		"Generate resume": "إنشاء السيرة الذاتية",
		"Generating...": "جارٍ الإنشاء...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"احصل على خطة عملية للأدوار والمهارات والمقابلات ولينكدإن والراتب",
		Goals: "الأهداف",
		Guided: "موجّه",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"اذكر الأدوار والمشاريع والأدوات والإنجازات والتعليم وأي شيء تريد إبرازه.",
		"Interview preparation": "الاستعداد للمقابلة",
		"Job description": "الوصف الوظيفي",
		"Job offer text": "نص عرض العمل",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"سيتم حفظ محتوى لينكدإن في ملاحظات السيرة الذاتية مع خطة ATS والنمو.",
		"LinkedIn profile builder": "منشئ ملف لينكدإن",
		"LinkedIn strategy": "استراتيجية لينكدإن",
		Links: "الروابط",
		Networking: "بناء العلاقات",
		"Offer details": "تفاصيل العرض",
		Optional: "اختياري",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"الصق وصفًا وظيفيًا لتخصيص الكلمات المفتاحية والنقاط وتقييم ATS والتموضع.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"يواصل Reactive Resume النمو بفضل مجتمعه النشط. يدين هذا المشروع بتقدمه للعديد من الأشخاص الذين خصصوا وقتهم ومهاراتهم لتحسينه. نحتفي بالمطورين الذين حسّنوا ميزاته على GitHub، وبالمترجمين الذين جعلت ترجماتهم على Crowdin المنتج متاحًا لجمهور أوسع، وبكل من ساعد في تحسين المنتج مع الوقت.",
		"Resume strategy": "استراتيجية السيرة الذاتية",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"قوالب سيرة ذاتية و CV مخصصة للأدوار لتناسب ATS والطلبات التنفيذية والتقنية والإبداعية والأكاديمية والدولية.",
		"Salary negotiation": "التفاوض على الراتب",
		"Salary strategy": "استراتيجية الراتب",
		Seniority: "مستوى الخبرة",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"عمود واحد مع رأس إدخال داخلي من ثلاثة أعمدة (المنصب، المؤسسة، الفترة)؛ مدمج ومناسب لأنظمة ATS، وملائم لتقاليد السير الذاتية الآسيوية (الصين/اليابان/كوريا).",
		"Strengths to leverage": "نقاط القوة للاستفادة منها",
		"Target compensation": "التعويض المستهدف",
		"Target role": "الدور المستهدف",
		"The AI returned an invalid career plan. Please try again.":
			"أعاد الذكاء الاصطناعي خطة مهنية غير صالحة. يرجى المحاولة مرة أخرى.",
		"The AI returned an invalid resume draft. Please try again.":
			"أعاد الذكاء الاصطناعي مسودة سيرة ذاتية غير صالحة. يرجى المحاولة مرة أخرى.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"يقوم المدرب بمراجعة سيرتك الذاتية وأهدافك وتموضعك في السوق.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"قد يستغرق ذلك دقيقة بينما يحول الذكاء الاصطناعي خبرتك إلى أقسام سيرة ذاتية منظمة.",
		Timeframe: "الإطار الزمني",
		"Turn your story or a job offer into a tailored resume": "حوّل قصتك أو عرض عمل إلى سيرة ذاتية مخصصة",
		"Use one of your resumes as coaching context.": "استخدم إحدى سيرك الذاتية كسياق للتوجيه.",
		"Watch-outs": "نقاط يجب الانتباه لها",
		"Weekly plan": "الخطة الأسبوعية",
		"Wizard mode": "وضع المعالج",
		"Work history": "تاريخ العمل",
		"Your wizard resume is ready.": "سيرتك الذاتية من وضع المعالج جاهزة.",
	},
	"es-ES": {
		"250+ Templates": "Más de 250 plantillas",
		Achievements: "Logros",
		"Action plan": "Plan de acción",
		"Add negotiation scripts and an email template to the resume notes.":
			"Añade guiones de negociación y una plantilla de correo a las notas del currículum.",
		"An unknown error occurred while building your career plan.":
			"Se produjo un error desconocido al crear tu plan profesional.",
		"An unknown error occurred while building your resume draft.":
			"Se produjo un error desconocido al crear el borrador de tu currículum.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"Las notas de ATS, crecimiento y salario se guardaron en las notas del currículum.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"Crea un plan práctico para puestos objetivo, habilidades, entrevistas, LinkedIn y compensación.",
		"Building your career plan...": "Creando tu plan profesional...",
		"Building your resume draft...": "Creando el borrador de tu currículum...",
		"Career coach": "Coach profesional",
		"Career plan ready.": "Plan profesional listo.",
		"Change language. Current language: {selectedLabel}": "Cambiar idioma. Idioma actual: {selectedLabel}",
		Constraints: "Restricciones",
		"Current situation": "Situación actual",
		Essay: "Ensayo",
		"Experience essay": "Relato de experiencia",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"Explora nuestra selección diversa de plantillas, diseñadas para distintos estilos, profesiones y personalidades. La plataforma ahora incluye más de 250 plantillas de currículum y CV, con opciones específicas para solicitudes orientadas a ATS, ejecutivas, técnicas, creativas, académicas e internacionales.",
		"Gaps to close": "Brechas por cerrar",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"Genera un titular, una sección Acerca de, un mensaje para reclutadores e ideas para mejorar el perfil.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"Genera un currículum personalizado a partir de tu experiencia, un empleo objetivo y detalles opcionales de la oferta.",
		"Generate plan": "Generar plan",
		"Generate resume": "Generar currículum",
		"Generating...": "Generando...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"Obtén un plan práctico para puestos, habilidades, entrevistas, LinkedIn y salario",
		Goals: "Objetivos",
		Guided: "Guiado",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"Incluye puestos, proyectos, herramientas, logros, educación y todo lo que quieras destacar.",
		"Interview preparation": "Preparación para entrevistas",
		"Job description": "Descripción del empleo",
		"Job offer text": "Texto de la oferta de empleo",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"El contenido de LinkedIn se guardará en las notas del currículum junto con el plan de ATS y crecimiento.",
		"LinkedIn profile builder": "Constructor de perfil de LinkedIn",
		"LinkedIn strategy": "Estrategia de LinkedIn",
		Links: "Enlaces",
		Networking: "Networking",
		"Offer details": "Detalles de la oferta",
		Optional: "Opcional",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"Pega una descripción de empleo para adaptar palabras clave, viñetas, puntuación ATS y posicionamiento.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resume sigue creciendo gracias a su comunidad activa. Este proyecto debe su progreso a muchas personas que dedicaron su tiempo y habilidades a mejorarlo. Celebramos a quienes mejoraron sus funciones en GitHub, a quienes tradujeron en Crowdin para hacerlo accesible a más personas y a quienes ayudaron a mejorar el producto con el tiempo.",
		"Resume strategy": "Estrategia de currículum",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"Plantillas de currículum y CV específicas por rol para solicitudes ATS, ejecutivas, técnicas, creativas, académicas e internacionales.",
		"Salary negotiation": "Negociación salarial",
		"Salary strategy": "Estrategia salarial",
		Seniority: "Nivel de experiencia",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"Una columna con encabezado interno de tres columnas (puesto, organización, periodo); compacta y compatible con ATS, adecuada para convenciones de currículum asiáticas (CN/JP/KR).",
		"Strengths to leverage": "Fortalezas que aprovechar",
		"Target compensation": "Compensación objetivo",
		"Target role": "Puesto objetivo",
		"The AI returned an invalid career plan. Please try again.":
			"La IA devolvió un plan profesional no válido. Inténtalo de nuevo.",
		"The AI returned an invalid resume draft. Please try again.":
			"La IA devolvió un borrador de currículum no válido. Inténtalo de nuevo.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"El coach está revisando tu currículum, tus objetivos y tu posicionamiento en el mercado.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"Puede tardar un minuto mientras la IA convierte tu experiencia en secciones estructuradas de currículum.",
		Timeframe: "Plazo",
		"Turn your story or a job offer into a tailored resume":
			"Convierte tu historia o una oferta de empleo en un currículum personalizado",
		"Use one of your resumes as coaching context.": "Usa uno de tus currículums como contexto para el coaching.",
		"Watch-outs": "Puntos de atención",
		"Weekly plan": "Plan semanal",
		"Wizard mode": "Modo asistente",
		"Work history": "Historial laboral",
		"Your wizard resume is ready.": "Tu currículum del asistente está listo.",
	},
	"fr-FR": {
		"250+ Templates": "Plus de 250 modèles",
		Achievements: "Réalisations",
		"Action plan": "Plan d'action",
		"Add negotiation scripts and an email template to the resume notes.":
			"Ajoutez des scripts de négociation et un modèle d'e-mail aux notes du CV.",
		"An unknown error occurred while building your career plan.":
			"Une erreur inconnue s'est produite lors de la création de votre plan de carrière.",
		"An unknown error occurred while building your resume draft.":
			"Une erreur inconnue s'est produite lors de la création de votre brouillon de CV.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"Les notes ATS, de progression et de salaire ont été enregistrées dans les notes du CV.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"Créez un plan pratique pour les postes ciblés, les compétences, les entretiens, LinkedIn et la rémunération.",
		"Building your career plan...": "Création de votre plan de carrière...",
		"Building your resume draft...": "Création de votre brouillon de CV...",
		"Career coach": "Coach de carrière",
		"Career plan ready.": "Plan de carrière prêt.",
		"Change language. Current language: {selectedLabel}": "Changer de langue. Langue actuelle : {selectedLabel}",
		Constraints: "Contraintes",
		"Current situation": "Situation actuelle",
		Essay: "Récit",
		"Experience essay": "Récit d'expérience",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"Explorez notre sélection variée de modèles, chacun conçu pour différents styles, métiers et personnalités. La plateforme comprend désormais plus de 250 modèles de CV, avec des options adaptées aux candidatures orientées ATS, exécutives, techniques, créatives, académiques et internationales.",
		"Gaps to close": "Écarts à combler",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"Générez un titre, une section À propos, un message recruteur et des idées d'amélioration du profil.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"Générez un CV personnalisé à partir de votre expérience, d'un poste cible et de détails d'offre facultatifs.",
		"Generate plan": "Générer le plan",
		"Generate resume": "Générer le CV",
		"Generating...": "Génération...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"Obtenez un plan pratique pour les postes, compétences, entretiens, LinkedIn et le salaire",
		Goals: "Objectifs",
		Guided: "Guidé",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"Incluez les postes, projets, outils, réalisations, formations et tout ce que vous souhaitez mettre en avant.",
		"Interview preparation": "Préparation aux entretiens",
		"Job description": "Description du poste",
		"Job offer text": "Texte de l'offre d'emploi",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"Le contenu LinkedIn sera enregistré dans les notes du CV avec le plan ATS et de progression.",
		"LinkedIn profile builder": "Créateur de profil LinkedIn",
		"LinkedIn strategy": "Stratégie LinkedIn",
		Links: "Liens",
		Networking: "Réseautage",
		"Offer details": "Détails de l'offre",
		Optional: "Facultatif",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"Collez une description de poste pour adapter les mots-clés, les puces, le score ATS et le positionnement.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resume continue de grandir grâce à sa communauté dynamique. Ce projet doit ses progrès aux nombreuses personnes qui ont consacré leur temps et leurs compétences à l'améliorer. Nous saluons les développeurs qui ont enrichi ses fonctionnalités sur GitHub, les linguistes dont les traductions sur Crowdin l'ont rendu accessible à un public plus large, et toutes les personnes qui ont contribué à améliorer le produit au fil du temps.",
		"Resume strategy": "Stratégie de CV",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"Modèles de CV par rôle pour les candidatures ATS, exécutives, techniques, créatives, académiques et internationales.",
		"Salary negotiation": "Négociation salariale",
		"Salary strategy": "Stratégie salariale",
		Seniority: "Niveau d'expérience",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"Une colonne avec un en-tête d'entrée en trois colonnes (poste, organisation, période) ; compact et compatible ATS, adapté aux conventions de CV asiatiques (CN/JP/KR).",
		"Strengths to leverage": "Forces à exploiter",
		"Target compensation": "Rémunération cible",
		"Target role": "Poste cible",
		"The AI returned an invalid career plan. Please try again.":
			"L'IA a renvoyé un plan de carrière non valide. Veuillez réessayer.",
		"The AI returned an invalid resume draft. Please try again.":
			"L'IA a renvoyé un brouillon de CV non valide. Veuillez réessayer.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"Le coach examine votre CV, vos objectifs et votre positionnement sur le marché.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"Cela peut prendre une minute pendant que l'IA transforme votre expérience en sections de CV structurées.",
		Timeframe: "Calendrier",
		"Turn your story or a job offer into a tailored resume":
			"Transformez votre parcours ou une offre d'emploi en CV personnalisé",
		"Use one of your resumes as coaching context.": "Utilisez l'un de vos CV comme contexte de coaching.",
		"Watch-outs": "Points de vigilance",
		"Weekly plan": "Plan hebdomadaire",
		"Wizard mode": "Mode assistant",
		"Work history": "Historique professionnel",
		"Your wizard resume is ready.": "Votre CV généré par l'assistant est prêt.",
	},
	"pt-BR": {
		"250+ Templates": "Mais de 250 modelos",
		Achievements: "Conquistas",
		"Action plan": "Plano de ação",
		"Add negotiation scripts and an email template to the resume notes.":
			"Adicione roteiros de negociação e um modelo de e-mail às notas do currículo.",
		"An unknown error occurred while building your career plan.":
			"Ocorreu um erro desconhecido ao criar seu plano de carreira.",
		"An unknown error occurred while building your resume draft.":
			"Ocorreu um erro desconhecido ao criar o rascunho do seu currículo.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"As notas de ATS, crescimento e salário foram salvas nas notas do currículo.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"Crie um plano prático para cargos-alvo, habilidades, entrevistas, LinkedIn e remuneração.",
		"Building your career plan...": "Criando seu plano de carreira...",
		"Building your resume draft...": "Criando o rascunho do seu currículo...",
		"Career coach": "Coach de carreira",
		"Career plan ready.": "Plano de carreira pronto.",
		"Change language. Current language: {selectedLabel}": "Alterar idioma. Idioma atual: {selectedLabel}",
		Constraints: "Restrições",
		"Current situation": "Situação atual",
		Essay: "Texto livre",
		"Experience essay": "Descrição da experiência",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"Explore nossa seleção diversa de modelos, cada um criado para diferentes estilos, profissões e personalidades. A plataforma agora inclui mais de 250 modelos de currículo e CV, com opções específicas para candidaturas focadas em ATS, executivas, técnicas, criativas, acadêmicas e internacionais.",
		"Gaps to close": "Lacunas a fechar",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"Gere um título, seção Sobre, mensagem para recrutadores e ideias de melhoria do perfil.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"Gere um currículo personalizado a partir da sua experiência, de uma vaga-alvo e de detalhes opcionais da oferta.",
		"Generate plan": "Gerar plano",
		"Generate resume": "Gerar currículo",
		"Generating...": "Gerando...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"Receba um plano prático para cargos, habilidades, entrevistas, LinkedIn e salário",
		Goals: "Objetivos",
		Guided: "Guiado",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"Inclua cargos, projetos, ferramentas, conquistas, formação e qualquer coisa que queira destacar.",
		"Interview preparation": "Preparação para entrevistas",
		"Job description": "Descrição da vaga",
		"Job offer text": "Texto da oferta de emprego",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"O conteúdo do LinkedIn será salvo nas notas do currículo com o plano de ATS e crescimento.",
		"LinkedIn profile builder": "Construtor de perfil do LinkedIn",
		"LinkedIn strategy": "Estratégia para LinkedIn",
		Links: "Links",
		Networking: "Networking",
		"Offer details": "Detalhes da oferta",
		Optional: "Opcional",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"Cole uma descrição de vaga para adaptar palavras-chave, marcadores, pontuação ATS e posicionamento.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"O Reactive Resume continua crescendo graças à sua comunidade vibrante. Este projeto deve seu progresso a muitas pessoas que dedicaram tempo e habilidades para torná-lo melhor. Celebramos quem aprimorou seus recursos no GitHub, quem traduziu no Crowdin para torná-lo acessível a um público maior e todas as pessoas que ajudaram a melhorar o produto ao longo do tempo.",
		"Resume strategy": "Estratégia de currículo",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"Modelos de currículo e CV específicos por função para candidaturas ATS, executivas, técnicas, criativas, acadêmicas e internacionais.",
		"Salary negotiation": "Negociação salarial",
		"Salary strategy": "Estratégia salarial",
		Seniority: "Senioridade",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"Uma coluna com cabeçalho interno de três colunas (cargo, organização, período); compacto e compatível com ATS, adequado às convenções de currículo asiáticas (CN/JP/KR).",
		"Strengths to leverage": "Pontos fortes a aproveitar",
		"Target compensation": "Remuneração-alvo",
		"Target role": "Cargo-alvo",
		"The AI returned an invalid career plan. Please try again.":
			"A IA retornou um plano de carreira inválido. Tente novamente.",
		"The AI returned an invalid resume draft. Please try again.":
			"A IA retornou um rascunho de currículo inválido. Tente novamente.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"O coach está analisando seu currículo, seus objetivos e seu posicionamento no mercado.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"Isso pode levar um minuto enquanto a IA transforma sua experiência em seções estruturadas de currículo.",
		Timeframe: "Prazo",
		"Turn your story or a job offer into a tailored resume":
			"Transforme sua história ou uma oferta de emprego em um currículo personalizado",
		"Use one of your resumes as coaching context.": "Use um dos seus currículos como contexto para o coaching.",
		"Watch-outs": "Pontos de atenção",
		"Weekly plan": "Plano semanal",
		"Wizard mode": "Modo assistente",
		"Work history": "Histórico profissional",
		"Your wizard resume is ready.": "Seu currículo do assistente está pronto.",
	},
	"de-DE": {
		"250+ Templates": "Über 250 Vorlagen",
		Achievements: "Erfolge",
		"Action plan": "Aktionsplan",
		"Add negotiation scripts and an email template to the resume notes.":
			"Füge Verhandlungsskripte und eine E-Mail-Vorlage zu den Lebenslaufnotizen hinzu.",
		"An unknown error occurred while building your career plan.":
			"Beim Erstellen deines Karriereplans ist ein unbekannter Fehler aufgetreten.",
		"An unknown error occurred while building your resume draft.":
			"Beim Erstellen deines Lebenslaufentwurfs ist ein unbekannter Fehler aufgetreten.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"ATS-, Wachstums- und Gehaltsnotizen wurden in den Lebenslaufnotizen gespeichert.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"Erstelle einen praktischen Plan für Zielrollen, Fähigkeiten, Interviews, LinkedIn und Vergütung.",
		"Building your career plan...": "Dein Karriereplan wird erstellt...",
		"Building your resume draft...": "Dein Lebenslaufentwurf wird erstellt...",
		"Career coach": "Karrierecoach",
		"Career plan ready.": "Karriereplan fertig.",
		"Change language. Current language: {selectedLabel}": "Sprache ändern. Aktuelle Sprache: {selectedLabel}",
		Constraints: "Einschränkungen",
		"Current situation": "Aktuelle Situation",
		Essay: "Freitext",
		"Experience essay": "Erfahrungsbeschreibung",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"Entdecke unsere vielfältige Auswahl an Vorlagen, die für unterschiedliche Stile, Berufe und Persönlichkeiten gestaltet sind. Die Plattform enthält jetzt über 250 Lebenslauf- und CV-Vorlagen mit rollenspezifischen Optionen für ATS-lastige, Executive-, technische, kreative, akademische und internationale Bewerbungen.",
		"Gaps to close": "Lücken schließen",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"Erstelle eine Überschrift, einen Über-mich-Abschnitt, eine Recruiter-Nachricht und Ideen zur Profilverbesserung.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"Erstelle einen zugeschnittenen Lebenslauf aus deiner Erfahrung, einer Zielstelle und optionalen Angebotsdetails.",
		"Generate plan": "Plan erstellen",
		"Generate resume": "Lebenslauf erstellen",
		"Generating...": "Wird erstellt...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"Erhalte einen praktischen Plan für Rollen, Fähigkeiten, Interviews, LinkedIn und Gehalt",
		Goals: "Ziele",
		Guided: "Geführt",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"Füge Rollen, Projekte, Tools, Erfolge, Ausbildung und alles hinzu, was hervorgehoben werden soll.",
		"Interview preparation": "Interviewvorbereitung",
		"Job description": "Stellenbeschreibung",
		"Job offer text": "Text des Jobangebots",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"LinkedIn-Inhalte werden zusammen mit dem ATS- und Wachstumsplan in den Lebenslaufnotizen gespeichert.",
		"LinkedIn profile builder": "LinkedIn-Profilgenerator",
		"LinkedIn strategy": "LinkedIn-Strategie",
		Links: "Links",
		Networking: "Networking",
		"Offer details": "Angebotsdetails",
		Optional: "Optional",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"Füge eine Stellenbeschreibung ein, um Keywords, Stichpunkte, ATS-Bewertung und Positionierung anzupassen.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resume wächst dank seiner lebendigen Community weiter. Dieses Projekt verdankt seinen Fortschritt vielen Menschen, die Zeit und Fähigkeiten investiert haben, um es besser zu machen. Wir würdigen die Entwickler, die Funktionen auf GitHub verbessert haben, die Übersetzer, die es über Crowdin einem breiteren Publikum zugänglich gemacht haben, und alle, die das Produkt im Laufe der Zeit verbessert haben.",
		"Resume strategy": "Lebenslaufstrategie",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"Rollenspezifische Lebenslauf- und CV-Vorlagen für ATS-, Executive-, technische, kreative, akademische und internationale Bewerbungen.",
		"Salary negotiation": "Gehaltsverhandlung",
		"Salary strategy": "Gehaltsstrategie",
		Seniority: "Senioritätslevel",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"Einspaltig mit eingebetteter dreispaltiger Eintragskopfzeile (Position, Organisation, Zeitraum); kompakt und ATS-freundlich, gut geeignet für asiatische Lebenslaufkonventionen (CN/JP/KR).",
		"Strengths to leverage": "Stärken nutzen",
		"Target compensation": "Zielvergütung",
		"Target role": "Zielrolle",
		"The AI returned an invalid career plan. Please try again.":
			"Die KI hat einen ungültigen Karriereplan zurückgegeben. Bitte versuche es erneut.",
		"The AI returned an invalid resume draft. Please try again.":
			"Die KI hat einen ungültigen Lebenslaufentwurf zurückgegeben. Bitte versuche es erneut.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"Der Coach prüft deinen Lebenslauf, deine Ziele und deine Marktpositionierung.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"Das kann eine Minute dauern, während die KI deine Erfahrung in strukturierte Lebenslaufabschnitte umwandelt.",
		Timeframe: "Zeitrahmen",
		"Turn your story or a job offer into a tailored resume":
			"Verwandle deinen Werdegang oder ein Jobangebot in einen zugeschnittenen Lebenslauf",
		"Use one of your resumes as coaching context.": "Verwende einen deiner Lebensläufe als Coaching-Kontext.",
		"Watch-outs": "Worauf du achten solltest",
		"Weekly plan": "Wochenplan",
		"Wizard mode": "Assistentenmodus",
		"Work history": "Berufserfahrung",
		"Your wizard resume is ready.": "Dein Assistenten-Lebenslauf ist fertig.",
	},
	"ja-JP": {
		"250+ Templates": "250以上のテンプレート",
		Achievements: "実績",
		"Action plan": "アクションプラン",
		"Add negotiation scripts and an email template to the resume notes.":
			"交渉スクリプトとメールテンプレートを履歴書メモに追加します。",
		"An unknown error occurred while building your career plan.":
			"キャリアプランの作成中に不明なエラーが発生しました。",
		"An unknown error occurred while building your resume draft.":
			"履歴書ドラフトの作成中に不明なエラーが発生しました。",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"ATS、成長計画、給与に関するメモを履歴書メモに保存しました。",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"目標職種、スキル、面接、LinkedIn、報酬に向けた実践的な計画を作成します。",
		"Building your career plan...": "キャリアプランを作成しています...",
		"Building your resume draft...": "履歴書ドラフトを作成しています...",
		"Career coach": "キャリアコーチ",
		"Career plan ready.": "キャリアプランが完成しました。",
		"Change language. Current language: {selectedLabel}": "言語を変更します。現在の言語: {selectedLabel}",
		Constraints: "制約",
		"Current situation": "現在の状況",
		Essay: "自由記述",
		"Experience essay": "経験の記述",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"さまざまなスタイル、職種、個性に合わせて設計されたテンプレートを選べます。現在、このプラットフォームには250以上の履歴書・CVテンプレートがあり、ATS重視、エグゼクティブ、技術職、クリエイティブ、アカデミック、国際応募向けの職種別オプションも用意されています。",
		"Gaps to close": "埋めるべきギャップ",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"見出し、自己紹介欄、採用担当者向けメッセージ、プロフィール改善案を生成します。",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"あなたの経験、目標求人、任意のオファー詳細からカスタム履歴書を生成します。",
		"Generate plan": "計画を生成",
		"Generate resume": "履歴書を生成",
		"Generating...": "生成中...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"職種、スキル、面接、LinkedIn、給与に向けた実践的な計画を取得します",
		Goals: "目標",
		Guided: "ガイド付き",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"職務、プロジェクト、ツール、実績、学歴、強調したい内容を含めてください。",
		"Interview preparation": "面接準備",
		"Job description": "求人説明",
		"Job offer text": "求人票テキスト",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"LinkedInコンテンツはATSと成長計画とともに履歴書メモに保存されます。",
		"LinkedIn profile builder": "LinkedInプロフィール作成",
		"LinkedIn strategy": "LinkedIn戦略",
		Links: "リンク",
		Networking: "ネットワーキング",
		"Offer details": "オファー詳細",
		Optional: "任意",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"求人説明を貼り付けると、キーワード、箇条書き、ATSスコア、ポジショニングを調整できます。",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resumeは活発なコミュニティのおかげで成長を続けています。このプロジェクトは、改善のために時間とスキルを捧げてくれた多くの人々に支えられています。GitHubで機能を強化した開発者、Crowdinで翻訳しより多くの人に届けてくれた翻訳者、そして製品改善に貢献したすべての人に感謝します。",
		"Resume strategy": "履歴書戦略",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"ATS、エグゼクティブ、技術職、クリエイティブ、アカデミック、国際応募向けの職種別履歴書・CVテンプレート。",
		"Salary negotiation": "給与交渉",
		"Salary strategy": "給与戦略",
		Seniority: "経験レベル",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"1カラム構成で、項目ヘッダーは3列（役職、組織、期間）をインライン表示。コンパクトでATS対応しやすく、アジア圏の履歴書慣習（中国/日本/韓国）に適しています。",
		"Strengths to leverage": "活かすべき強み",
		"Target compensation": "希望報酬",
		"Target role": "目標職種",
		"The AI returned an invalid career plan. Please try again.":
			"AIが無効なキャリアプランを返しました。もう一度お試しください。",
		"The AI returned an invalid resume draft. Please try again.":
			"AIが無効な履歴書ドラフトを返しました。もう一度お試しください。",
		"The coach is reviewing your resume, goals, and market positioning.":
			"コーチがあなたの履歴書、目標、市場でのポジショニングを確認しています。",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"AIがあなたの経験を構造化された履歴書セクションに変換するため、少し時間がかかる場合があります。",
		Timeframe: "期間",
		"Turn your story or a job offer into a tailored resume": "あなたの経歴や求人票からカスタム履歴書を作成",
		"Use one of your resumes as coaching context.": "コーチングの文脈として既存の履歴書を使用します。",
		"Watch-outs": "注意点",
		"Weekly plan": "週間計画",
		"Wizard mode": "ウィザードモード",
		"Work history": "職歴",
		"Your wizard resume is ready.": "ウィザード履歴書が完成しました。",
	},
	"ko-KR": {
		"250+ Templates": "250개 이상의 템플릿",
		Achievements: "성과",
		"Action plan": "실행 계획",
		"Add negotiation scripts and an email template to the resume notes.":
			"협상 스크립트와 이메일 템플릿을 이력서 메모에 추가합니다.",
		"An unknown error occurred while building your career plan.":
			"커리어 계획을 만드는 중 알 수 없는 오류가 발생했습니다.",
		"An unknown error occurred while building your resume draft.":
			"이력서 초안을 만드는 중 알 수 없는 오류가 발생했습니다.",
		"ATS, growth, and salary notes were saved in the resume notes.":
			"ATS, 성장, 급여 관련 메모가 이력서 메모에 저장되었습니다.",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"목표 직무, 역량, 면접, LinkedIn, 보상을 위한 실용적인 계획을 만듭니다.",
		"Building your career plan...": "커리어 계획을 만드는 중...",
		"Building your resume draft...": "이력서 초안을 만드는 중...",
		"Career coach": "커리어 코치",
		"Career plan ready.": "커리어 계획이 준비되었습니다.",
		"Change language. Current language: {selectedLabel}": "언어 변경. 현재 언어: {selectedLabel}",
		Constraints: "제약 사항",
		"Current situation": "현재 상황",
		Essay: "자유 서술",
		"Experience essay": "경험 서술",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"다양한 스타일, 직업, 개성에 맞게 설계된 템플릿을 살펴보세요. 이제 플랫폼에는 250개 이상의 이력서 및 CV 템플릿이 포함되며, ATS 중심, 임원, 기술, 창의, 학술, 국제 지원에 맞춘 직무별 옵션도 제공합니다.",
		"Gaps to close": "보완할 격차",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"헤드라인, 소개 섹션, 리크루터 메시지, 프로필 개선 아이디어를 생성합니다.",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"경험, 목표 직무, 선택적 제안 정보를 바탕으로 맞춤형 이력서를 생성합니다.",
		"Generate plan": "계획 생성",
		"Generate resume": "이력서 생성",
		"Generating...": "생성 중...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"직무, 역량, 면접, LinkedIn, 급여를 위한 실용적인 계획을 받으세요",
		Goals: "목표",
		Guided: "가이드형",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"직무, 프로젝트, 도구, 성과, 학력 및 강조하고 싶은 내용을 포함하세요.",
		"Interview preparation": "면접 준비",
		"Job description": "직무 설명",
		"Job offer text": "채용 공고 텍스트",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"LinkedIn 콘텐츠는 ATS 및 성장 계획과 함께 이력서 메모에 저장됩니다.",
		"LinkedIn profile builder": "LinkedIn 프로필 작성기",
		"LinkedIn strategy": "LinkedIn 전략",
		Links: "링크",
		Networking: "네트워킹",
		"Offer details": "제안 세부 정보",
		Optional: "선택 사항",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"직무 설명을 붙여넣어 키워드, bullet, ATS 점수, 포지셔닝을 맞춤화하세요.",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resume는 활발한 커뮤니티 덕분에 계속 성장하고 있습니다. 이 프로젝트는 더 나은 제품을 만들기 위해 시간과 역량을 기여한 많은 사람들 덕분에 발전했습니다. GitHub에서 기능을 개선한 개발자, Crowdin 번역으로 더 많은 사람이 사용할 수 있게 한 번역가, 그리고 제품 개선에 도움을 준 모든 분께 감사드립니다.",
		"Resume strategy": "이력서 전략",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"ATS, 임원, 기술, 창의, 학술, 국제 지원을 위한 직무별 이력서 및 CV 템플릿.",
		"Salary negotiation": "급여 협상",
		"Salary strategy": "급여 전략",
		Seniority: "경력 수준",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"단일 열 구조에 3열 인라인 항목 헤더(직책, 조직, 기간)를 사용합니다. 간결하고 ATS 친화적이며 아시아권 이력서 관례(CN/JP/KR)에 적합합니다.",
		"Strengths to leverage": "활용할 강점",
		"Target compensation": "목표 보상",
		"Target role": "목표 직무",
		"The AI returned an invalid career plan. Please try again.":
			"AI가 유효하지 않은 커리어 계획을 반환했습니다. 다시 시도해 주세요.",
		"The AI returned an invalid resume draft. Please try again.":
			"AI가 유효하지 않은 이력서 초안을 반환했습니다. 다시 시도해 주세요.",
		"The coach is reviewing your resume, goals, and market positioning.":
			"코치가 이력서, 목표, 시장 포지셔닝을 검토하고 있습니다.",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"AI가 경험을 구조화된 이력서 섹션으로 변환하는 동안 잠시 시간이 걸릴 수 있습니다.",
		Timeframe: "기간",
		"Turn your story or a job offer into a tailored resume": "당신의 이야기나 채용 공고를 맞춤형 이력서로 변환",
		"Use one of your resumes as coaching context.": "기존 이력서 중 하나를 코칭 컨텍스트로 사용합니다.",
		"Watch-outs": "주의할 점",
		"Weekly plan": "주간 계획",
		"Wizard mode": "마법사 모드",
		"Work history": "경력 사항",
		"Your wizard resume is ready.": "마법사 이력서가 준비되었습니다.",
	},
	"zh-CN": {
		"250+ Templates": "250 多个模板",
		Achievements: "成就",
		"Action plan": "行动计划",
		"Add negotiation scripts and an email template to the resume notes.": "将谈判话术和邮件模板添加到简历备注中。",
		"An unknown error occurred while building your career plan.": "生成职业计划时发生未知错误。",
		"An unknown error occurred while building your resume draft.": "生成简历草稿时发生未知错误。",
		"ATS, growth, and salary notes were saved in the resume notes.": "ATS、成长和薪资备注已保存到简历备注中。",
		"Build a practical plan for target roles, skills, interviews, LinkedIn, and compensation.":
			"为目标岗位、技能、面试、LinkedIn 和薪酬生成实用计划。",
		"Building your career plan...": "正在生成职业计划...",
		"Building your resume draft...": "正在生成简历草稿...",
		"Career coach": "职业教练",
		"Career plan ready.": "职业计划已准备好。",
		"Change language. Current language: {selectedLabel}": "更改语言。当前语言：{selectedLabel}",
		Constraints: "限制条件",
		"Current situation": "当前情况",
		Essay: "自由描述",
		"Experience essay": "经历描述",
		"Explore our diverse selection of templates, each designed to fit different styles, professions, and personalities. The platform now includes 250+ resume and CV templates, with role-specific options for ATS-heavy, executive, technical, creative, academic, and international applications.":
			"浏览我们多样化的模板选择，每个模板都适合不同风格、职业和个性。平台现在包含 250 多个简历和 CV 模板，并提供适合 ATS 密集型、高管、技术、创意、学术和国际申请的岗位专属选项。",
		"Gaps to close": "需要弥补的差距",
		"Generate a headline, About section, recruiter message, and profile improvement ideas.":
			"生成标题、关于部分、招聘人员消息和个人资料改进建议。",
		"Generate a tailored resume from your experience, a target job, and optional offer details.":
			"根据你的经历、目标职位和可选 offer 详情生成定制简历。",
		"Generate plan": "生成计划",
		"Generate resume": "生成简历",
		"Generating...": "正在生成...",
		"Get a practical plan for roles, skills, interviews, LinkedIn, and salary":
			"获取针对岗位、技能、面试、LinkedIn 和薪资的实用计划",
		Goals: "目标",
		Guided: "引导式",
		"Include roles, projects, tools, achievements, education, and anything you want highlighted.":
			"包括岗位、项目、工具、成就、教育经历以及任何你想突出的内容。",
		"Interview preparation": "面试准备",
		"Job description": "职位描述",
		"Job offer text": "职位信息文本",
		"LinkedIn content will be saved into the resume notes with the ATS and growth plan.":
			"LinkedIn 内容将与 ATS 和成长计划一起保存到简历备注中。",
		"LinkedIn profile builder": "LinkedIn 资料生成器",
		"LinkedIn strategy": "LinkedIn 策略",
		Links: "链接",
		Networking: "人脉拓展",
		"Offer details": "Offer 详情",
		Optional: "可选",
		"Paste a job description to tailor keywords, bullets, ATS scoring, and positioning.":
			"粘贴职位描述，以定制关键词、项目符号、ATS 评分和定位。",
		"Reactive Resume continues to grow thanks to its vibrant community. This project owes its progress to numerous individuals who've dedicated their time and skills to make it better. We celebrate the coders who've enhanced its features on GitHub, the linguists whose translations on Crowdin have made it accessible to a broader audience, and the people who've helped improve the product over time.":
			"Reactive Resume 得益于活跃社区而不断成长。本项目的进步离不开许多投入时间和技能来改进它的人。我们感谢在 GitHub 上增强功能的开发者、通过 Crowdin 翻译让它触达更广泛用户的语言贡献者，以及所有长期帮助改进产品的人。",
		"Resume strategy": "简历策略",
		"Role-specific resume and CV templates for ATS, executive, technical, creative, academic, and international applications.":
			"面向 ATS、高管、技术、创意、学术和国际申请的岗位专属简历与 CV 模板。",
		"Salary negotiation": "薪资谈判",
		"Salary strategy": "薪资策略",
		Seniority: "资历级别",
		"Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).":
			"单栏布局，条目标题内嵌三列（职位、机构、时间）；紧凑且 ATS 友好，适合亚洲简历习惯（中国/日本/韩国）。",
		"Strengths to leverage": "可利用的优势",
		"Target compensation": "目标薪酬",
		"Target role": "目标岗位",
		"The AI returned an invalid career plan. Please try again.": "AI 返回了无效的职业计划。请重试。",
		"The AI returned an invalid resume draft. Please try again.": "AI 返回了无效的简历草稿。请重试。",
		"The coach is reviewing your resume, goals, and market positioning.": "职业教练正在查看你的简历、目标和市场定位。",
		"This may take a minute while the AI turns your experience into structured resume sections.":
			"AI 正在将你的经历转换为结构化简历部分，可能需要一分钟。",
		Timeframe: "时间范围",
		"Turn your story or a job offer into a tailored resume": "将你的经历或职位信息转换为定制简历",
		"Use one of your resumes as coaching context.": "使用你的一份简历作为辅导上下文。",
		"Watch-outs": "注意事项",
		"Weekly plan": "每周计划",
		"Wizard mode": "向导模式",
		"Work history": "工作经历",
		"Your wizard resume is ready.": "向导生成的简历已准备好。",
	},
};

const escapePo = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const [locale, messages] of Object.entries(translations)) {
	const filePath = join(localeDir, `${locale}.po`);
	let contents = readFileSync(filePath, "utf8");

	for (const [msgid, msgstr] of Object.entries(messages)) {
		const pattern = new RegExp(`(msgid "${escapeRegExp(escapePo(msgid))}"\\n)msgstr "(?:[^"\\\\]|\\\\.)*"`, "g");
		const next = contents.replace(pattern, `$1msgstr "${escapePo(msgstr)}"`);
		if (next === contents) {
			throw new Error(`Could not update ${locale}: ${msgid}`);
		}
		contents = next;
	}

	writeFileSync(filePath, contents, "utf8");
}
