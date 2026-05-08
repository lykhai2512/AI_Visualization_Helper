import "dotenv/config";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_SERVICE_KEY);

const DATA_DIR = path.join(__dirname, "../src/data");
const CODE_FILE = path.join(__dirname, "../src/code/main.py");
const KNOWLEDGE_DIR = path.join(__dirname, "../src/knowledge");

// Ensure data directory exists
try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) {}
try { await fs.mkdir(KNOWLEDGE_DIR, { recursive: true }); } catch (e) {}

// Setup Multer for Data Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DATA_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.csv') cb(null, 'data.csv');
        else if (ext === '.txt') cb(null, 'metadata.txt');
    }
});

const upload = multer({ storage });

async function buildContext(includeData, includeCode, includeKnowledge) {
    let context = "";
    if (includeData) {
        const meta = await fs.readFile(path.join(DATA_DIR, "metadata.txt"), "utf-8").catch(() => "");
        const csv = await fs.readFile(path.join(DATA_DIR, "data.csv"), "utf-8").catch(() => "");
        const headers = csv.split('\n')[0];
        context += `\n[DATA CONTEXT]\nMetadata: ${meta}\nCSV Headers: ${headers}\n`;
    }
    if (includeCode) {
        const code = await fs.readFile(CODE_FILE, "utf-8").catch(() => "");
        context += `\n[CODE CONTEXT - main.py]\n${code}\n`;
    }
    if (includeKnowledge) {
        try {
            const files = await fs.readdir(KNOWLEDGE_DIR);
            const txtFiles = files.filter(f => f.endsWith('.txt'));
            let knowledgeContent = "";
            
            for (const file of txtFiles) {
                const content = await fs.readFile(path.join(KNOWLEDGE_DIR, file), "utf-8");
                knowledgeContent += `\n--- Document: ${file} ---\n${content}\n`;
            }
            
            if (knowledgeContent) {
                context += `\n[KNOWLEDGE BASE CONTEXT]\n${knowledgeContent}\n`;
            }
        } catch (e) {
            console.error("Error reading knowledge folder:", e);
        }
    }
    return context;
}

// UPLOAD ENDPOINT
app.post("/api/upload-data", upload.array("files", 2), (req, res) => {
    res.json({ success: true, message: "Files saved as data.csv and metadata.txt" });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { prompt, useData, useCode, useKnowledge } = req.body;
        const context = await buildContext(useData, useCode, useKnowledge);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = useCode ? `
            You have permission to modify main.py. If the user asks for a change, 
            provide the FULL corrected code inside a JSON block like this:
            { "update_code": "full_code_here", "explanation": "what you did" }
            Otherwise, respond normally with text.
        ` : "Respond normally to the user.";

        const result = await model.generateContent(`${systemInstruction}\n${context}\nUser: ${prompt}`);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*"update_code"[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[0]);
                // Await the write to ensure it completes before responding
                await fs.writeFile(CODE_FILE, data.update_code, "utf-8");
                
                // Return explicitly to prevent further execution in this block
                return res.json({ 
                    reply: data.explanation, 
                    wasUpdated: true, 
                    newCode: data.update_code 
                });
            } catch (jsonErr) {
                console.error("JSON Parse Error:", jsonErr);
            }
        }

        res.json({ reply: responseText, wasUpdated: false });
    } catch (e) {
        console.error("Chat Error:", e);
        if (!res.headersSent) {
            res.status(500).json({ error: "AI Error" });
        }
    }
});


// RUN/DISPLAY ENDPOINTS
app.get("/api/source-code", async (req, res) => {
    const code = await fs.readFile(CODE_FILE, "utf-8").catch(() => "File not found.");
    res.json({ code });
});

// Ensure RUN returns a structured object to avoid frontend crashes
app.post("/api/run-code", (req, res) => {
    exec(`python3 main.py`, { cwd: path.dirname(CODE_FILE) }, (err, stdout, stderr) => {
        res.json({ 
            output: stdout || "", 
            error: stderr || (err ? err.message : null) 
        });
    });
});

app.listen(5174, () => console.log("Server running on 5174"));