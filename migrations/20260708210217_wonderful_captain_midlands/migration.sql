WITH entries AS (
	SELECT
		a.id AS application_id,
		entry.value AS entry,
		entry.ordinality,
		coalesce(nullif(entry.value ->> 'id', ''), md5(a.id || ':' || entry.ordinality::text)) AS entry_id,
		coalesce(nullif(entry.value ->> 'at', ''), a.applied_at::text, a.created_at::text, now()::text) AS entry_at,
		lower(coalesce(entry.value ->> 'text', '')) AS entry_text
	FROM "application" a
	CROSS JOIN LATERAL jsonb_array_elements(
		CASE WHEN jsonb_typeof(a.activity) = 'array' THEN a.activity ELSE '[]'::jsonb END
	) WITH ORDINALITY AS entry(value, ordinality)
),
normalized AS (
	SELECT
		application_id,
		ordinality,
		CASE
			WHEN entry ->> 'type' = 'stage'
				AND entry ->> 'stage' IN ('saved', 'applied', 'screening', 'interview', 'offer', 'rejected') THEN
				jsonb_build_object('id', entry_id, 'type', 'stage', 'stage', entry ->> 'stage', 'at', entry_at)
			WHEN entry ->> 'type' IN ('created', 'stage')
				AND CASE
					WHEN entry_text LIKE '%screening%' THEN 'screening'
					WHEN entry_text LIKE '%interview%' THEN 'interview'
					WHEN entry_text LIKE '%offer%' THEN 'offer'
					WHEN entry_text LIKE '%rejected%' THEN 'rejected'
					WHEN entry_text LIKE '%applied%' THEN 'applied'
					WHEN entry_text LIKE '%saved%' THEN 'saved'
				END IS NOT NULL THEN
				jsonb_build_object(
					'id', entry_id,
					'type', 'stage',
					'stage', CASE
						WHEN entry_text LIKE '%screening%' THEN 'screening'
						WHEN entry_text LIKE '%interview%' THEN 'interview'
						WHEN entry_text LIKE '%offer%' THEN 'offer'
						WHEN entry_text LIKE '%rejected%' THEN 'rejected'
						WHEN entry_text LIKE '%applied%' THEN 'applied'
						WHEN entry_text LIKE '%saved%' THEN 'saved'
					END,
					'at', entry_at
				)
			ELSE
				jsonb_build_object(
					'id', entry_id,
					'type', 'note',
					'text', coalesce(nullif(btrim(entry ->> 'text'), ''), 'Imported timeline entry'),
					'at', entry_at
				)
		END AS normalized_entry
	FROM entries
),
grouped AS (
	SELECT application_id, jsonb_agg(normalized_entry ORDER BY ordinality) AS activity
	FROM normalized
	GROUP BY application_id
)
UPDATE "application" a
SET activity = grouped.activity
FROM grouped
WHERE a.id = grouped.application_id;
--> statement-breakpoint
UPDATE "application"
SET activity = jsonb_build_array(
	jsonb_build_object(
		'id', md5(id || ':stage'),
		'type', 'stage',
		'stage', status,
		'at', coalesce(applied_at::text, created_at::text, now()::text)
	)
)
WHERE jsonb_typeof(activity) IS DISTINCT FROM 'array' OR activity = '[]'::jsonb;
--> statement-breakpoint
WITH stage_stats AS (
	SELECT
		a.id AS application_id,
		max((entry.value ->> 'at')::timestamptz) FILTER (WHERE entry.value ->> 'type' = 'stage') AS latest_stage_at,
		max((entry.value ->> 'at')::timestamptz) FILTER (
			WHERE entry.value ->> 'type' = 'stage' AND entry.value ->> 'stage' = a.status
		) AS current_stage_at
	FROM "application" a
	CROSS JOIN LATERAL jsonb_array_elements(
		CASE WHEN jsonb_typeof(a.activity) = 'array' THEN a.activity ELSE '[]'::jsonb END
	) AS entry(value)
	GROUP BY a.id
),
anchors AS (
	SELECT
		a.id,
		a.status,
		greatest(
			coalesce(stage_stats.latest_stage_at, a.applied_at, a.created_at, now()),
			coalesce(a.applied_at, a.created_at, now())
		) AS anchor_at,
		stage_stats.latest_stage_at,
		stage_stats.current_stage_at
	FROM "application" a
	LEFT JOIN stage_stats ON stage_stats.application_id = a.id
	WHERE jsonb_typeof(a.activity) = 'array'
)
UPDATE "application" a
SET activity = a.activity || jsonb_build_array(
	jsonb_build_object(
		'id', md5(a.id || ':stage:' || a.status || ':anchor'),
		'type', 'stage',
		'stage', a.status,
		'at', anchors.anchor_at::text
	)
)
FROM anchors
WHERE a.id = anchors.id
	AND (
		anchors.current_stage_at IS NULL
		OR (anchors.latest_stage_at IS NOT NULL AND anchors.current_stage_at < anchors.latest_stage_at)
	);
