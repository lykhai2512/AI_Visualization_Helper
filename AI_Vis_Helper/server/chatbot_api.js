import "dotenv/config";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";

// Multer configuration for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowed = ['.csv', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and TXT files are allowed'));
        }
    }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB Cluster"))
    .catch(err => console.error("MongoDB Connection Error:", err));

const LogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userPrompt: String,
    botResponse: String,
    tags: { useData: Boolean, useCode: Boolean, useKnowledge: Boolean },
    modification: { wasUpdated: Boolean, newCode: String }
});
const Log = mongoose.model("InteractionLog", LogSchema);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_SERVICE_KEY);

// PATH CONSTANTS
const DATA_DIR = path.join(__dirname, "../src/data");
const CODE_FILE = path.join(__dirname, "../src/code/main.py");
const KNOWLEDGE_DIR = path.join(__dirname, "../src/knowledge");
const RULES_DIR = path.join(__dirname, "../rules");
const VIS_QUESTIONS_FILE = path.join(__dirname, "../src/data/vis_questions.json");

// Ensure Directories exist
[DATA_DIR, KNOWLEDGE_DIR, RULES_DIR].forEach(async (dir) => {
    try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
});

// Helper to get active rules
async function getActiveRules() {
    try {
        const files = await fs.readdir(RULES_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        let rulesContext = "";
        for (const file of jsonFiles) {
            const content = await fs.readFile(path.join(RULES_DIR, file), "utf-8");
            const data = JSON.parse(content);
            if (data.project_rules) {
                data.project_rules.forEach(r => rulesContext += `- [${r.id}]: ${r.description}\n`);
            }
        }
        return rulesContext || "No specific rules found.";
    } catch (e) { return "Error loading rules."; }
}

// Helper to get vis questions
async function getVisQuestions() {
    try {
        const content = await fs.readFile(VIS_QUESTIONS_FILE, "utf-8");
        return JSON.parse(content);
    } catch (e) { return { questions: [] }; }
}

async function buildContext(includeData, includeCode, includeKnowledge) {
    let context = "";
    if (includeData) {
        const meta = await fs.readFile(path.join(DATA_DIR, "metadata.txt"), "utf-8").catch(() => "");
        const csv = await fs.readFile(path.join(DATA_DIR, "data.csv"), "utf-8").catch(() => "");
        const headers = csv ? csv.split('\n')[0] : "No data.csv found.";
        context += `\n[DATA CONTEXT]\nMetadata: ${meta}\nHeaders: ${headers}\n`;
    }
    if (includeCode) {
        const code = await fs.readFile(CODE_FILE, "utf-8").catch(() => "");
        context += `\n[CODE CONTEXT - main.py]\n${code}\n`;
    }
    if (includeKnowledge) {
        const files = await fs.readdir(KNOWLEDGE_DIR).catch(() => []);
        let knowledgeContent = "";
        for (const file of files.filter(f => f.endsWith('.txt'))) {
            const content = await fs.readFile(path.join(KNOWLEDGE_DIR, file), "utf-8");
            knowledgeContent += `\n--- Document: ${file} ---\n${content}\n`;
        }
        context += `\n[KNOWLEDGE BASE CONTEXT]\n${knowledgeContent || "Empty."}\n`;
    }
    
    // Always include Vis Question Tracker
    const visData = await getVisQuestions();
    context += `\n[VISUALIZATION QUESTION TRACKER]\n${JSON.stringify(visData, null, 2)}\n`;
    
    return context;
}

// MAIN CHAT ENDPOINT
app.post("/api/chat", async (req, res) => {
    try {
        const { prompt, useData, useCode, useKnowledge } = req.body;
        const [context, rules] = await Promise.all([
            buildContext(useData, useCode, useKnowledge),
            getActiveRules()
        ]);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1' });

        const systemInstruction = `
### SYSTEM OPERATIONAL RULES
${rules}

### STORAGE PROTOCOL
- To update Visualization Questions, return JSON: {"update_vis_questions": [{"id": 1, "question": "...", "is_visualized": false, "graph_path": null}]}
- To update main.py, return JSON: {"update_code": "...", "explanation": "..."}
        `.trim();

        const result = await model.generateContent(`${systemInstruction}\n\nCONTEXT:\n${context}\n\nUSER:\n${prompt}`);
        const responseText = result.response.text();
        
        let wasUpdated = false;
        let newCode = null;
        let finalReply = responseText;

        // 1. Handle Visualization Questions Storage
        const visMatch = responseText.match(/\{[\s\S]*"update_vis_questions"[\s\S]*\}/);
        if (visMatch) {
            try {
                const visData = JSON.parse(visMatch[0]);
                await fs.writeFile(VIS_QUESTIONS_FILE, JSON.stringify(visData, null, 2), "utf-8");
            } catch (e) { console.error("Vis Question Save Error:", e); }
        }

        // 2. Handle Code Modifications
        const codeMatch = responseText.match(/\{[\s\S]*"update_code"[\s\S]*\}/);
        if (codeMatch) {
            try {
                const data = JSON.parse(codeMatch[0]);
                await fs.writeFile(CODE_FILE, data.update_code, "utf-8");
                wasUpdated = true;
                newCode = data.update_code;
                finalReply = data.explanation;
            } catch (e) { console.error("Code Save Error:", e); }
        }

        // 3. Database Logging
        const newLog = new Log({
            userPrompt: prompt,
            botResponse: finalReply,
            tags: { useData, useCode, useKnowledge },
            modification: { wasUpdated, newCode }
        });
        await newLog.save();

        res.json({ reply: finalReply, wasUpdated, newCode });
    } catch (e) {
        console.error("Chat Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET Source Code for DISPLAY button
app.get("/api/source-code", async (req, res) => {
    try {
        const code = await fs.readFile(CODE_FILE, "utf-8");
        res.json({ code });
    } catch (e) {
        res.status(500).json({ error: "Could not read main.py" });
    }
});

// POST Run Code for RUN button
app.post("/api/run-code", (req, res) => {
    // Executes 'python3' or 'python' depending on your system environment
    exec(`python3 "${CODE_FILE}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ output: stdout });
    });
});

// POST Upload Data Files
app.post("/api/upload", upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const savedFiles = [];

        for (const file of req.files) {
            const ext = path.extname(file.originalname).toLowerCase();
            let targetPath;
            let targetName;

            if (ext === '.csv') {
                targetPath = path.join(DATA_DIR, 'data.csv');
                targetName = 'data.csv';
            } else if (ext === '.txt') {
                targetPath = path.join(DATA_DIR, 'metadata.txt');
                targetName = 'metadata.txt';
            } else {
                continue;
            }

            await fs.writeFile(targetPath, file.buffer, 'utf-8');
            savedFiles.push(targetName);
        }

        if (savedFiles.length === 0) {
            return res.status(400).json({ error: "No valid files were saved" });
        }

        res.json({ success: true, savedFiles });
    } catch (e) {
        console.error("Upload Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST Reset Data and Knowledge
app.post("/api/reset", async (req, res) => {
    try {
        const deletedItems = [];

        // Delete all files in DATA_DIR
        try {
            const dataFiles = await fs.readdir(DATA_DIR);
            for (const file of dataFiles) {
                const filePath = path.join(DATA_DIR, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    await fs.unlink(filePath);
                    deletedItems.push(`data/${file}`);
                }
            }
        } catch (e) { console.error("Error clearing data folder:", e); }

        // Delete all files in KNOWLEDGE_DIR
        try {
            const knowledgeFiles = await fs.readdir(KNOWLEDGE_DIR);
            for (const file of knowledgeFiles) {
                const filePath = path.join(KNOWLEDGE_DIR, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    await fs.unlink(filePath);
                    deletedItems.push(`knowledge/${file}`);
                }
            }
        } catch (e) { console.error("Error clearing knowledge folder:", e); }

        res.json({ success: true, deletedItems: deletedItems.length > 0 ? deletedItems : ['(no files deleted)'] });
    } catch (e) {
        console.error("Reset Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST Reset Data and Knowledge
app.post("/api/reset", async (req, res) => {
    try {
        const deletedItems = [];

        // Delete all files in DATA_DIR
        try {
            const dataFiles = await fs.readdir(DATA_DIR);
            for (const file of dataFiles) {
                const filePath = path.join(DATA_DIR, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    await fs.unlink(filePath);
                    deletedItems.push(`data/${file}`);
                }
            }
        } catch (e) { console.error("Error clearing data folder:", e); }

        // Delete all files in KNOWLEDGE_DIR
        try {
            const knowledgeFiles = await fs.readdir(KNOWLEDGE_DIR);
            for (const file of knowledgeFiles) {
                const filePath = path.join(KNOWLEDGE_DIR, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    await fs.unlink(filePath);
                    deletedItems.push(`knowledge/${file}`);
                }
            }
        } catch (e) { console.error("Error clearing knowledge folder:", e); }

        res.json({ success: true, deletedItems: deletedItems.length > 0 ? deletedItems : ['(no files deleted)'] });
    } catch (e) {
        console.error("Reset Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET Image for FILE mode
app.get("/api/image/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const imagePath = path.join(__dirname, "../src/assets", filename);
        await fs.access(imagePath);
        res.sendFile(imagePath);
    } catch (e) {
        res.status(404).json({ error: "Image not found" });
    }
});

// Start Server
app.listen(5174, () => console.log("Server running on http://localhost:5174"));