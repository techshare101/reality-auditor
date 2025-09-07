import { build } from "esbuild";
import { resolve } from "path";

async function buildScript() {
  try {
    await build({
      entryPoints: [resolve(__dirname, "backfill-subscriptions.ts")],
      bundle: true,
      platform: "node",
      target: "node16",
      outfile: resolve(__dirname, "dist/backfill.js"),
      external: ["firebase-admin"],
    });
    
    console.log("✅ Build successful!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildScript();
