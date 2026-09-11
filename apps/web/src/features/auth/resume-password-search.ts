import z from "zod";

// Keep the existing slug-shaped `redirect` as verification identity. The optional
// continuation is deliberately limited to the configured instance root.
export const resumePasswordSearchSchema = z.object({
	redirect: z.string().regex(/^\/[^/\\?#%\s]+\/[^/\\?#%\s]+$/),
	returnTo: z.literal("/").optional(),
});
