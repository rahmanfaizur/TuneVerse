import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { EVENTS, Message } from "@tuneverse/shared";

interface ChatProps {
    roomId: string;
    username: string;
    initialMessages?: Message[];
}

export default function Chat({ roomId, username, initialMessages = [] }: ChatProps) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync initial messages if they change (e.g. on room join/re-fetch)
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleChatReceive = (message: Message) => {
            setMessages((prev) => [...prev, message]);
        };

        socket.on(EVENTS.CHAT_RECEIVE, handleChatReceive);

        return () => {
            socket.off(EVENTS.CHAT_RECEIVE, handleChatReceive);
        };
    }, [socket]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !socket) return;

        socket.emit(EVENTS.CHAT_SEND, { text: inputText });
        setInputText("");
    };

    return (
        <div className="flex flex-col h-full bg-background transition-colors">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="font-serif italic text-sm">No messages yet.</p>
                        <p className="text-[10px] font-sans uppercase tracking-widest mt-1">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.username === username;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    <img
                                        src={msg.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${msg.username}`}
                                        alt={msg.username}
                                        className="w-6 h-6 rounded-full bg-muted border border-border/50"
                                    />
                                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-foreground" : "text-muted-foreground"}`}>
                                                {msg.username}
                                            </span>
                                            <span className="text-[8px] text-muted-foreground/70">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`mt-1 p-2 text-sm font-sans rounded-lg shadow-sm ${isMe
                                            ? "bg-accent text-accent-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none border border-border/30"
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="TYPE MESSAGE"
                        className="flex-1 bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-xs font-sans uppercase tracking-widest text-foreground placeholder-muted-foreground transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="text-[10px] font-bold uppercase tracking-widest text-foreground hover:opacity-50 disabled:opacity-25 transition-opacity"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
