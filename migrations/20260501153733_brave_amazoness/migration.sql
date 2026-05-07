CREATE OR REPLACE FUNCTION migrate_resume_item_inline_link(value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
	transformed jsonb;
	key text;
	child jsonb;
	legacy_inline_link jsonb;
	existing_inline_link jsonb;
BEGIN
	CASE jsonb_typeof(value)
		WHEN 'array' THEN
			SELECT jsonb_agg(migrate_resume_item_inline_link(element.value))
			INTO transformed
			FROM jsonb_array_elements(value) AS element(value);

			RETURN COALESCE(transformed, '[]'::jsonb);

		WHEN 'object' THEN
			transformed := '{}'::jsonb;

			FOR key, child IN SELECT * FROM jsonb_each(value) LOOP
				transformed := jsonb_set(transformed, ARRAY[key], migrate_resume_item_inline_link(child), true);
			END LOOP;

			legacy_inline_link := transformed #> '{options,showLinkInTitle}';

			IF legacy_inline_link IS NOT NULL AND jsonb_typeof(transformed->'website') = 'object' THEN
				existing_inline_link := transformed #> '{website,inlineLink}';
				transformed := jsonb_set(
					transformed,
					'{website,inlineLink}',
					COALESCE(existing_inline_link, legacy_inline_link),
					true
				);
				transformed := jsonb_set(transformed, '{options}', (transformed->'options') - 'showLinkInTitle', true);

				IF transformed->'options' = '{}'::jsonb THEN
					transformed := transformed - 'options';
				END IF;
			END IF;

			RETURN transformed;

		ELSE
			RETURN value;
	END CASE;
END;
$$;
--> statement-breakpoint
UPDATE "resume"
SET "data" = migrate_resume_item_inline_link("data")
WHERE "data" @? '$.**.options.showLinkInTitle';
--> statement-breakpoint
DROP FUNCTION migrate_resume_item_inline_link(jsonb);
