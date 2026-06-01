/** Canonical MCP tool names. */
export const MCP_TOOL_NAME = {
	listResumes: "list_resumes",
	listResumeTags: "list_resume_tags",
	getResume: "read_resume",
	getResumeAnalysis: "get_resume_analysis",
	downloadResumePdf: "download_resume_pdf",
	createResume: "create_resume",
	importResume: "import_resume",
	duplicateResume: "duplicate_resume",
	patchResume: "apply_resume_patch",
	updateResume: "update_resume",
	deleteResume: "delete_resume",
	lockResume: "lock_resume",
	unlockResume: "unlock_resume",
	getResumeStatistics: "get_resume_statistics",
} as const;
