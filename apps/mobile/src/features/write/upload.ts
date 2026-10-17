// Binds an upload's result to the resume and account it started in. Pure, so Node can check the ordering.

export type UploadContext = {
	/** The open resume's id. */
	resumeId: () => string | undefined;
	/** The account scope (server + OAuth subject), or null when signed out. */
	scope: () => Promise<string | null>;
};

export type UploadOwner = { resumeId: string; scope: string };

export async function claimUpload(context: UploadContext): Promise<UploadOwner | null> {
	const resumeId = context.resumeId();
	const scope = await context.scope();
	// Navigating while the scope was read makes this upload belong to nobody.
	return resumeId && scope && context.resumeId() === resumeId ? { resumeId, scope } : null;
}

/**
 * Writes the result only if the same resume is open under the same account. The scope is awaited first; the
 * checks and the write then run synchronously, so nothing can switch resume between them.
 */
export async function commitUpload(owner: UploadOwner, context: UploadContext, write: () => void): Promise<boolean> {
	const scope = await context.scope();
	if (scope !== owner.scope || context.resumeId() !== owner.resumeId) return false;
	write();
	return true;
}
