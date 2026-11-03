import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { EVENTS, Message } from "@tuneverse/shared";

interface ChatProps {
    username: string;
    initialMessages: Message[];
}

export default function Chat({ username, initialMessages }: ChatProps) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputText, setInputText] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        if (!socket) return;

        const handleChatReceive = (message: Message) => {
            setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        };

        socket.on(EVENTS.CHAT_RECEIVE, handleChatReceive);
        return () => {
            socket.off(EVENTS.CHAT_RECEIVE, handleChatReceive);
        };
    }, [socket]);

    // Scroll the list itself, because scrollIntoView would move the whole page too.
    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [messages.length]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !socket) return;

        socket.emit(EVENTS.CHAT_SEND, { text: inputText });
        setInputText("");
    };

    return (
        <div className="flex h-full flex-col">
            <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-5">
                {messages.length === 0 ? (
                    <p className="pt-8 text-center font-serif text-lg italic text-muted-foreground">
                        Nothing said yet. Go on, say hi.
                    </p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.username === username;
                        return (
                            <div key={msg.id} className={`flex max-w-[85%] flex-col ${isMe ? "ml-auto items-end" : "items-start"}`}>
                                <div className="flex items-baseline gap-2 text-xs">
                                    <span className="font-medium">{isMe ? "You" : msg.username}</span>
                                    <span className="text-muted-foreground">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <p className={`mt-1 break-words px-3 py-2 text-[15px] leading-snug ${isMe ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                                    {msg.text}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-3 border-t border-border p-4">
                <input
                    type="text"
                    value={inputText}
                    maxLength={500}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Say something"
                    aria-label="Message"
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="text-sm underline underline-offset-4 transition-colors enabled:hover:text-signal disabled:opacity-30 disabled:no-underline"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
