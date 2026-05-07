/**
 * Prefixed MCP tool names for multi-server clients.
 */
export const MCP_TOOL_NAME = {
	listResumes: "reactive_resume_list_resumes",
	listResumeTags: "reactive_resume_list_resume_tags",
	getResume: "reactive_resume_get_resume",
	getResumeAnalysis: "reactive_resume_get_resume_analysis",
	createResume: "reactive_resume_create_resume",
	importResume: "reactive_resume_import_resume",
	duplicateResume: "reactive_resume_duplicate_resume",
	patchResume: "reactive_resume_patch_resume",
	updateResume: "reactive_resume_update_resume",
	deleteResume: "reactive_resume_delete_resume",
	lockResume: "reactive_resume_lock_resume",
	unlockResume: "reactive_resume_unlock_resume",
	getResumeStatistics: "reactive_resume_get_resume_statistics",
} as const;
