import path from "path";
import { config } from "dotenv";
import app from "./app";

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
