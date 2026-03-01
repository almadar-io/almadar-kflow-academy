import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import app from "./app";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configfile = process.env.NODE_ENV?.trim() === "development" ? ".env.development" : ".env";
config({
  path: path.resolve(
    __dirname,
    "..",
    configfile
  ),
});

const port: number = parseInt(process.env.PORT || "3001", 10);

app.listen(port, () => {
  console.log(`KFlow server running on port ${port}`);
  console.log(
    `AI Note Generation: ${
      process.env.OPENAI_API_KEY ? "Enabled" : "Disabled (No API Key)"
    }`
  );
});
