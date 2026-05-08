export const getAIResponse = async (userPrompt) => {
    try {
        const res = await fetch("http://localhost:5174/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: userPrompt }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        return data?.reply ?? "No response from system.";
    } catch (error) {
        console.error("Fetch Error:", error);
        return "Sorry, a connection error occurred.";
    }
};