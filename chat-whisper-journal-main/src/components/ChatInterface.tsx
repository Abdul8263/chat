import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, BookOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatSidebar } from "./ChatSidebar";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const sessionId = useRef(
    localStorage.getItem("diarySessionId") || crypto.randomUUID()
  );

  useEffect(() => {
    localStorage.setItem("diarySessionId", sessionId.current);
  }, []);

  const loadSessionMessages = async (sessionIdToLoad: string) => {
    const { data, error } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("session_id", sessionIdToLoad)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading session:", error);
      return;
    }

    const loadedMessages: Message[] = [];
    data?.forEach((entry) => {
      loadedMessages.push({ role: "user", content: entry.user_message });
      loadedMessages.push({ role: "assistant", content: entry.ai_response });
    });

    setMessages(loadedMessages);
  };

  const handleNewChat = () => {
    sessionId.current = crypto.randomUUID();
    localStorage.setItem("diarySessionId", sessionId.current);
    setMessages([]);
  };

  const handleSelectSession = (selectedSessionId: string) => {
    sessionId.current = selectedSessionId;
    localStorage.setItem("diarySessionId", selectedSessionId);
    loadSessionMessages(selectedSessionId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message: userMessage,
        sessionId: sessionId.current,
        conversationHistory: messages,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (resp.status === 402) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Failed to get AI response. Please try again.");
      }
      throw new Error("Failed to stream chat");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
          
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const aiResponse = await streamChat(userMessage);

      // Format diary entry using AI
      const formatResp = await supabase.functions.invoke("format-diary", {
        body: { userMessage, aiResponse },
      });

      const formattedEntry = formatResp.data?.formattedEntry || `Dear Diary,\n${userMessage}`;

      // Save formatted entry to diary
      await supabase.from("diary_entries").insert({
        session_id: sessionId.current,
        user_message: userMessage,
        ai_response: formattedEntry,
      });
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatSidebar
        currentSessionId={sessionId.current}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground ml-12">Dear Diary AI</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/diary")}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          View Diary
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg mb-2">Welcome to your AI Diary Companion! 💭</p>
            <p className="text-sm">
              Share your thoughts, and I'll listen. Every conversation is automatically
              saved to your personal diary.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[hsl(var(--user-bubble))] text-[hsl(var(--user-bubble-foreground))]"
                  : "bg-[hsl(var(--ai-bubble))] text-[hsl(var(--ai-bubble-foreground))] border border-border"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[hsl(var(--ai-bubble))] text-[hsl(var(--ai-bubble-foreground))] border border-border rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-border">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Share your thoughts..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};