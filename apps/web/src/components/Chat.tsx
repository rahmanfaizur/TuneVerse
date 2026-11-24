import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { CHAT_PAGE_SIZE, ChatHistoryPage, EVENTS, Message } from "@tuneverse/shared";

// Room updates carry the newest page; older pages and live messages are kept on top of it.
const mergeById = (...lists: Message[][]): Message[] => {
    const byId = new Map<string, Message>();
    lists.forEach((list) => list.forEach((m) => byId.set(m.id, m)));
    return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
};

interface ChatProps {
    username: string;
    initialMessages: Message[];
}

export default function Chat({ username, initialMessages }: ChatProps) {
    const { socket } = useSocket();
    const [extra, setExtra] = useState<Message[]>([]);
    const [hasMore, setHasMore] = useState(initialMessages.length >= CHAT_PAGE_SIZE);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [inputText, setInputText] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const heightBeforeLoad = useRef<number | null>(null);

    const messages = useMemo(() => mergeById(extra, initialMessages), [extra, initialMessages]);
    const lastId = messages[messages.length - 1]?.id;

    useEffect(() => {
        if (!socket) return;

        const handleChatReceive = (message: Message) => {
            setExtra((prev) => [...prev, message]);
        };

        socket.on(EVENTS.CHAT_RECEIVE, handleChatReceive);
        return () => {
            socket.off(EVENTS.CHAT_RECEIVE, handleChatReceive);
        };
    }, [socket]);

    // New message at the bottom: follow it. Scroll the list itself, because
    // scrollIntoView would move the whole page too.
    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [lastId]);

    // Older messages went in above: keep the reader where they were.
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list || heightBeforeLoad.current === null) return;
        list.scrollTop += list.scrollHeight - heightBeforeLoad.current;
        heightBeforeLoad.current = null;
    }, [messages]);

    const loadEarlier = () => {
        if (!socket || loadingOlder || !messages[0]) return;
        setLoadingOlder(true);
        socket.timeout(10000).emit(EVENTS.CHAT_HISTORY, { before: messages[0].id }, (err: Error | null, page?: ChatHistoryPage) => {
            setLoadingOlder(false);
            if (err || !page) return; // leave the button there to try again
            heightBeforeLoad.current = listRef.current?.scrollHeight ?? null;
            setExtra((prev) => [...page.messages, ...prev]);
            setHasMore(page.hasMore);
        });
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !socket) return;

        socket.emit(EVENTS.CHAT_SEND, { text: inputText });
        setInputText("");
    };

    return (
        <div className="flex h-full flex-col">
            <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-5">
                {hasMore && (
                    <button
                        type="button"
                        onClick={loadEarlier}
                        disabled={loadingOlder}
                        className="ink-link mx-auto block text-sm font-semibold disabled:opacity-50"
                    >
                        {loadingOlder ? "Loading…" : "Load earlier messages"}
                    </button>
                )}
                {messages.length === 0 ? (
                    <p className="pt-8 text-center text-soft">
                        Nothing said yet. Go on, say hi.
                    </p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.username === username;
                        return (
                            <div key={msg.id} className={`flex max-w-[85%] flex-col ${isMe ? "ml-auto items-end" : "items-start"}`}>
                                <div className="flex items-baseline gap-2 text-xs">
                                    <span className="font-bold">{isMe ? "You" : msg.username}</span>
                                    <span className="text-soft">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <p className={`mt-1 break-words px-3.5 py-2 text-[15px] leading-snug ${isMe ? "bg-pink text-on-pink" : "bg-wash"}`}>
                                    {msg.text}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t-2 border-rule p-3">
                <input
                    type="text"
                    value={inputText}
                    maxLength={500}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Say something"
                    aria-label="Message"
                    className="field min-w-0 flex-1 !py-2 text-[15px]"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="shrink-0 bg-pink px-3 py-2 text-sm font-bold text-on-pink transition-colors enabled:hover:bg-blue enabled:hover:text-paper disabled:opacity-40"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
