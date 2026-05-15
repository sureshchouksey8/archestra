ALTER TABLE "mcp_server" ADD COLUMN "environment_values" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
-- Gentle backfill: any existing install whose catalog declares at least one
-- `promptOnInstallation: true` AND `type: plain_text` env var has been
-- silently losing those values on every auto-redeploy (the bag rebuild in
-- McpServerRuntimeManager.startServer only restores secret-typed values).
-- The new `environment_values` column starts empty for those installs, so
-- their next auto-redeploy would still drop the plain values.
--
-- Mark them as needing a manual reinstall — that flow re-prompts the user
-- and populates the new column. The pod keeps running on its current spec
-- until the user clicks Reinstall; this surfaces the migration as a benign
-- "please reinstall" hint rather than silently breaking running pods.
UPDATE "mcp_server"
SET "reinstall_required" = TRUE
WHERE "catalog_id" IN (
  SELECT "id" FROM "internal_mcp_catalog"
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements("local_config"->'environment') AS env
    WHERE env->>'type' = 'plain_text'
      AND (env->>'promptOnInstallation')::boolean IS TRUE
  )
);