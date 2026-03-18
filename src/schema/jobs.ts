import z from "zod";

// --- JSearch API Request Types ---

export const searchParamsSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().positive().optional(),
  num_pages: z.number().int().positive().optional(),
  date_posted: z.enum(["all", "today", "3days", "week", "month"]).optional(),
  remote_jobs_only: z.boolean().optional(),
  employment_types: z.string().optional(),
  job_requirements: z.string().optional(),
  radius: z.number().positive().optional(),
  exclude_job_publishers: z.string().optional(),
  categories: z.string().optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// --- JSearch API Response Types ---

export const jobRequiredExperienceSchema = z.object({
  no_experience_required: z.boolean().catch(false),
  required_experience_in_months: z.number().nullable().catch(null),
  experience_mentioned: z.boolean().catch(false),
  experience_preferred: z.boolean().catch(false),
});

export const jobRequiredEducationSchema = z.object({
  postgraduate_degree: z.boolean().catch(false),
  professional_certification: z.boolean().catch(false),
  high_school: z.boolean().catch(false),
  associates_degree: z.boolean().catch(false),
  bachelors_degree: z.boolean().catch(false),
  degree_mentioned: z.boolean().catch(false),
  degree_preferred: z.boolean().catch(false),
  professional_certification_mentioned: z.boolean().catch(false),
});

export const applyOptionSchema = z.object({
  publisher: z.string().catch(""),
  apply_link: z.string().catch(""),
  is_direct: z.boolean().catch(false),
});

export const jobResultSchema = z.object({
  job_id: z.string(),
  job_title: z.string(),
  employer_name: z.string(),
  employer_logo: z.string().nullable().catch(null),
  employer_website: z.string().nullable().catch(null),
  employer_company_type: z.string().nullable().catch(null),
  employer_linkedin: z.string().nullable().catch(null),
  job_publisher: z.string().catch(""),
  job_employment_type: z.string().catch(""),
  job_apply_link: z.string().catch(""),
  job_apply_is_direct: z.boolean().catch(false),
  job_apply_quality_score: z.number().nullable().catch(null),
  job_description: z.string().catch(""),
  job_is_remote: z.boolean().catch(false),
  job_city: z.string().catch(""),
  job_state: z.string().catch(""),
  job_country: z.string().catch(""),
  job_latitude: z.number().nullable().catch(null),
  job_longitude: z.number().nullable().catch(null),
  job_posted_at_timestamp: z.number().nullable().catch(null),
  job_posted_at_datetime_utc: z.string().catch(""),
  job_offer_expiration_datetime_utc: z.string().nullable().catch(null),
  job_offer_expiration_timestamp: z.number().nullable().catch(null),
  job_min_salary: z.number().nullable().catch(null),
  job_max_salary: z.number().nullable().catch(null),
  job_salary_currency: z.string().nullable().catch(null),
  job_salary_period: z.string().nullable().catch(null),
  job_benefits: z.array(z.string()).nullable().catch(null),
  job_google_link: z.string().nullable().catch(null),
  job_required_experience: jobRequiredExperienceSchema.catch({
    no_experience_required: false,
    required_experience_in_months: null,
    experience_mentioned: false,
    experience_preferred: false,
  }),
  job_required_skills: z.array(z.string()).nullable().catch(null),
  job_required_education: jobRequiredEducationSchema.catch({
    postgraduate_degree: false,
    professional_certification: false,
    high_school: false,
    associates_degree: false,
    bachelors_degree: false,
    degree_mentioned: false,
    degree_preferred: false,
    professional_certification_mentioned: false,
  }),
  job_experience_in_place_of_education: z.boolean().nullable().catch(null),
  job_highlights: z.record(z.string(), z.array(z.string())).nullable().catch(null),
  job_posting_language: z.string().nullable().catch(null),
  job_onet_soc: z.string().nullable().catch(null),
  job_onet_job_zone: z.string().nullable().catch(null),
  job_occupational_categories: z.array(z.string()).nullable().catch(null),
  job_naics_code: z.string().nullable().catch(null),
  job_naics_name: z.string().nullable().catch(null),
  apply_options: z.array(applyOptionSchema).catch([]),
});

export type JobResult = z.infer<typeof jobResultSchema>;

export const searchResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  parameters: z.record(z.string(), z.string()).catch({}),
  data: z.array(jobResultSchema).catch([]),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const jobDetailsResponseSchema = z.object({
  status: z.string(),
  request_id: z.string(),
  data: z.array(jobResultSchema).catch([]),
});

export type JobDetailsResponse = z.infer<typeof jobDetailsResponseSchema>;

// --- Client-side Filter Types ---

export const postFilterOptionsSchema = z.object({
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  includeKeywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  excludeCompanies: z.array(z.string()).optional(),
  directApplyOnly: z.boolean().optional(),
});

export type PostFilterOptions = z.infer<typeof postFilterOptionsSchema>;

// --- Rate Limiting Types ---

export const rapidApiQuotaSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  used: z.number(),
});

export type RapidApiQuota = z.infer<typeof rapidApiQuotaSchema>;
