import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type ChatSession = {
  session_id: string;
  created_at: string;
  preview: string;
};

type ChatSidebarProps = {
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
};

export const ChatSidebar = ({ currentSessionId, onNewChat, onSelectSession }: ChatSidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [currentSessionId]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("diary_entries")
      .select("session_id, created_at, user_message")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    // Group by session and get first message as preview
    const sessionMap = new Map<string, ChatSession>();
    data?.forEach((entry) => {
      if (!sessionMap.has(entry.session_id)) {
        sessionMap.set(entry.session_id, {
          session_id: entry.session_id,
          created_at: entry.created_at,
          preview: entry.user_message.substring(0, 50) + (entry.user_message.length > 50 ? "..." : ""),
        });
      }
    });

    setSessions(Array.from(sessionMap.values()));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <Button
            onClick={() => {
              onNewChat();
              setOpen(false);
            }}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-2 pr-4">
              {sessions.map((session) => (
                <Button
                  key={session.session_id}
                  variant={session.session_id === currentSessionId ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => {
                    onSelectSession(session.session_id);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="text-sm line-clamp-2">{session.preview}</span>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
