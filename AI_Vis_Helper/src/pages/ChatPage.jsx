import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';

export const ChatPage = () => {
    const [messages, setMessages] = useState([{ id: 1, type: 'bot', text: "Console Ready." }]);
    const [inputValue, setInputValue] = useState('');
    const [selectedTag, setSelectedTag] = useState('chat');
    const [isLoading, setIsLoading] = useState(false);
    const [useDataContext, setUseDataContext] = useState(false);
    const [useCodeContext, setUseCodeContext] = useState(false);
    const [useKnowledgeContext, setUseKnowledgeContext] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll logic
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleAction = async (action) => {
        setIsLoading(true);
        try {
            const endpoint = action === 'run' ? 'run-code' : 'source-code';
            const method = action === 'run' ? 'POST' : 'GET';
            const res = await fetch(`http://localhost:5174/api/${endpoint}`, { method });
            const data = await res.json();
            
            let resultText = "";
            if (action === 'run') {
                resultText = data.error 
                    ? `### ⚠️ Execution Error\n\`\`\`text\n${data.error}\n\`\`\`` 
                    : `### ✅ Output\n\`\`\`text\n${data.output || "Execution finished with no output."}\n\`\`\``;
            } else {
                resultText = `### main.py Source\n\`\`\`python\n${data.code}\n\`\`\``;
            }

            // CRITICAL FIX: Use functional update to preserve previous messages
            setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: resultText }]);
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: "❌ Action failed: Server unreachable." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const processMessage = async (text) => {
        if (!text || !text.trim() || isLoading) return;

        const userMsg = { id: Date.now(), type: 'user', text: `[${selectedTag}] ${text}` };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // Controller to handle potential server hangups during file writes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const res = await fetch("http://localhost:5174/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, useData: useDataContext, useCode: useCodeContext, useKnowledge: useKnowledgeContext }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await res.json();

            let botText = data.reply;
            if (data.wasUpdated) {
                botText += `\n\n### 🛠️ Modifications Applied\n\`\`\`python\n// unchanged\n${data.newCode}\n// unchanged\n\`\`\``;
            }

            setMessages(prev => [...prev, { id: Date.now() + 2, type: 'bot', text: botText }]);
        } catch (e) {
            if (e.name === 'AbortError') {
                setMessages(prev => [...prev, { id: Date.now() + 2, type: 'bot', text: "⚠️ Request timed out. The file may have been updated, but the server is restarting." }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 2, type: 'bot', text: "❌ Connection lost. If you are using Vite, ensure main.py is ignored in vite.config.js." }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
            <header className="bg-white border-b p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">Lab Assistant</h1>
                        <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} 
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-lg px-2 py-1 font-bold">
                            <option value="chat">CHAT</option>
                            <option value="file">FILE</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleAction('display')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600">DISPLAY</button>
                        <button onClick={() => handleAction('run')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">RUN</button>
                        <button onClick={() => fileInputRef.current.click()} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200">UPLOAD DATA</button>
                        <input type="file" multiple accept=".csv,.txt" ref={fileInputRef} className="hidden" 
                            onChange={(e) => {/* Reuse handleUpload logic here */}} />
                    </div>
                </div>

                <div className="flex gap-4 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                        <input type="checkbox" checked={useDataContext} onChange={e => setUseDataContext(e.target.checked)} className="accent-indigo-600" /> DATA
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                        <input type="checkbox" checked={useCodeContext} onChange={e => setUseCodeContext(e.target.checked)} className="accent-indigo-600" /> CODE (MODIFIABLE)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                        <input type="checkbox" checked={useKnowledgeContext} onChange={e => setUseKnowledgeContext(e.target.checked)} className="accent-indigo-600" /> KNOWLEDGE
                    </label>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[95%] sm:max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                            msg.type === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white border text-gray-800 rounded-tl-none'
                        } transition-all duration-200`}>
                            
                            {/* FIX: Added overflow-hidden and break-words to the container */}
                            <div className="text-sm prose prose-sm max-w-none break-words overflow-hidden">
                                <ReactMarkdown 
                                    components={{
                                        // FIX: Specifically force pre/code tags to wrap or scroll
                                        pre: ({node, ...props}) => (
                                            <div className="overflow-x-auto w-full my-2 bg-gray-900/5 rounded-lg">
                                                <pre {...props} className="p-2 whitespace-pre-wrap break-all" />
                                            </div>
                                        ),
                                        code: ({node, ...props}) => (
                                            <code {...props} className="bg-gray-100 px-1 rounded break-all" />
                                        )
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>

                            {msg.image && (
                                <div className="mt-3 overflow-hidden rounded-lg border">
                                    <img 
                                        src={msg.image} 
                                        alt="asset" 
                                        className="w-full h-auto object-contain max-h-80" 
                                        onError={(e) => e.target.style.display = 'none'} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="text-xs text-gray-400 animate-pulse ml-2">Processing...</div>}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-white border-t">
                <form onSubmit={(e) => { e.preventDefault(); processMessage(inputValue); }} className="flex gap-2">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} 
                        placeholder="Message..." className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">
                        Send
                    </button>
                </form>
            </footer>
        </div>
    );
};