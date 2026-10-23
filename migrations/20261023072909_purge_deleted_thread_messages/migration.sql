-- Conversations deleted before their messages were deleted with them: remove what the user already deleted.
DELETE FROM "agent_messages" WHERE "thread_id" IN (SELECT "id" FROM "agent_threads" WHERE "deleted_at" IS NOT NULL);
