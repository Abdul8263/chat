import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DiaryEntry = {
  id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
};

export default function Diary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const sessionId = localStorage.getItem("diarySessionId");

  useEffect(() => {
    loadDiary();
  }, []);

  const loadDiary = async () => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("diary_entries")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error loading diary:", error);
      toast.error("Failed to load diary entries");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDiary = () => {
    if (entries.length === 0) {
      toast.error("No diary entries to download");
      return;
    }

    let diaryText = "Dear Diary,\n\n";
    
    entries.forEach((entry) => {
      const date = new Date(entry.created_at);
      diaryText += `${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
      diaryText += `\nMe: ${entry.user_message}\n`;
      diaryText += `\nAI: ${entry.ai_response}\n`;
      diaryText += "\n" + "─".repeat(50) + "\n\n";
    });

    const blob = new Blob([diaryText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_diary_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Diary downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--notebook-bg))] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
          <Button
            onClick={downloadDiary}
            disabled={entries.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Diary
          </Button>
        </header>

        <div className="bg-card border-2 border-border rounded-lg shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-[hsl(var(--notebook-lines))]">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-serif text-foreground" style={{ fontFamily: "'Dancing Script', cursive" }}>
              My Diary
            </h1>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading your diary...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Your diary is empty</p>
              <p className="text-sm">Start chatting to create your first entry!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="pb-6 border-b border-[hsl(var(--notebook-lines))] last:border-0"
                >
                  <time className="text-sm text-muted-foreground font-medium">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="font-semibold text-foreground mb-1">Me:</p>
                      <p className="text-foreground/90 leading-relaxed pl-4 border-l-2 border-primary/30">
                        {entry.user_message}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-secondary-foreground mb-1">AI Companion:</p>
                      <p className="text-foreground/80 leading-relaxed pl-4 border-l-2 border-secondary/30">
                        {entry.ai_response}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <p className="text-center text-muted-foreground text-sm mt-6">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} in your diary
          </p>
        )}
      </div>
    </div>
  );
}