# ADR-0003: Keep PostgreSQL separate from the application image

Reactive Resume does not provide an all-in-one image embedding PostgreSQL. The maintainer rejected that packaging direction on 2026-09-05 because it provides no benefit worth supporting; keep the database lifecycle separate and address setup convenience through existing Compose/Unraid onboarding.
