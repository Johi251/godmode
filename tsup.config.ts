import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { cp, copyFile, mkdir } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig([
	// 1. OpenClaw plugin (existing, unchanged)
	{
		entry: ["index.ts"],
		format: ["esm"],
		target: "node22",
		outDir: "dist",
		dts: false,
		clean: true,
		splitting: false,
		sourcemap: false,
		minify: true,
		external: [
			"openclaw/plugin-sdk",
		],
		onSuccess: async () => {
			if (existsSync("src/lib/auth-public-key.pem")) {
				await copyFile("src/lib/auth-public-key.pem", "dist/auth-public-key.pem");
			}
			await mkdir("dist/assets/workspace-templates", { recursive: true });
			if (existsSync("assets/workspace-templates")) {
				await cp("assets/workspace-templates", "dist/assets/workspace-templates", { recursive: true });
			}
		},
	},
	// 2. Hermes standalone + MCP entry
	{
		entry: ["standalone.ts", "mcp-entry.ts"],
		format: ["esm"],
		target: "node22",
		outDir: "dist",
		dts: false,
		clean: false, // Don't clean — OC build already ran
		splitting: false,
		sourcemap: false,
		minify: true,
		noExternal: ["openclaw/plugin-sdk", "openclaw/plugin-sdk/agent-runtime", "openclaw/plugin-sdk/infra-runtime"],
		esbuildOptions(options) {
			options.alias = {
				"openclaw/plugin-sdk/agent-runtime": resolve("src/adapter/sdk-shim-agent-runtime.ts"),
				"openclaw/plugin-sdk/infra-runtime": resolve("src/adapter/sdk-shim-infra-runtime.ts"),
				"openclaw/plugin-sdk": resolve("src/adapter/sdk-shim.ts"),
			};
		},
	},
]);
