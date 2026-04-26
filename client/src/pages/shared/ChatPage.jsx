import { Archive, CheckCheck, Eye, EyeOff, Filter, MailOpen, MailX, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../../components/common/EmptyState";
import PageHero from "../../components/common/PageHero";
import { getInboxApi, getThreadApi, sendMessageApi, archiveChatApi, deleteChatApi, markChatReadApi, markChatUnreadApi } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { getSocket } from "../../sockets/socket";
import dashboardBanner from "../../assets/illustrations/dashboard-banner.png";
import emptyChat from "../../assets/illustrations/empty-chat.png";

function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function ChatPage() {
    const { user } = useAuth();
    const location = useLocation();
    const chatAutoSelectRef = useRef(false);
    const [inbox, setInbox] = useState([]);
    const [inboxLoaded, setInboxLoaded] = useState(false);
    const [selected, setSelected] = useState(null);
    const [pendingNew, setPendingNew] = useState(null); // { listingId, studentId, listingTitle, studentName }
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [filter, setFilter] = useState("all"); // all | unread | read
    const [menuOpen, setMenuOpen] = useState(null); // conversationKey
    const messagesEndRef = useRef(null);

    const loadInbox = async () => {
        try {
            const { data } = await getInboxApi();
            setInbox(data.inbox || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load inbox");
        } finally {
            setInboxLoaded(true);
        }
    };

    const openConversation = async (item) => {
        try {
            setSelected(item);

            const listingId =
                item.listing?._id ||
                item.latestMessage?.listingId ||
                item.latestMessage?.listingId?._id;

            const { data } = await getThreadApi(
                listingId,
                user.role === "LANDLORD" ? item.studentId : undefined
            );

            setMessages(data.messages || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to open thread");
        }
    };

    useEffect(() => {
        loadInbox();
    }, []);

    // Auto-open a specific conversation when navigated with context
    useEffect(() => {
        const state = location.state;
        if (!state?.listingId && !state?.studentId) return;
        if (chatAutoSelectRef.current) return;
        if (!inboxLoaded) return; // wait until inbox API has finished

        let target = null;
        if (state.listingId && state.studentId) {
            target = inbox.find(
                (item) =>
                    (String(item.listing?._id) === String(state.listingId) ||
                        String(item.latestMessage?.listingId) === String(state.listingId)) &&
                    String(item.studentId) === String(state.studentId),
            );
        } else if (state.listingId) {
            target = inbox.find(
                (item) =>
                    String(item.listing?._id) === String(state.listingId) ||
                    String(item.latestMessage?.listingId) === String(state.listingId),
            );
        } else if (state.studentId) {
            target = inbox.find(
                (item) => String(item.studentId) === String(state.studentId),
            );
        }

        chatAutoSelectRef.current = true;
        if (target) {
            openConversation(target);
        } else {
            // No existing conversation — prepare a blank thread to start one
            setPendingNew({
                listingId: state.listingId || null,
                studentId: state.studentId || null,
                listingTitle: state.listingTitle || null,
                studentName: state.studentName || null,
            });
        }
    }, [inbox, location.state, inboxLoaded]);

    useEffect(() => {
        const socket = getSocket();
        socket.emit("register-user", user?._id);

        const onNewMessage = ({ conversationKey, message }) => {
            setInbox((prev) =>
                prev.map((item) =>
                    item.conversationKey === conversationKey
                        ? {
                            ...item,
                            latestMessage: message,
                            unreadCount:
                                String(message.senderId?._id || message.senderId) === String(user?._id)
                                    ? item.unreadCount
                                    : item.unreadCount + 1,
                        }
                        : item
                )
            );

            if (selected?.conversationKey === conversationKey) {
                setMessages((prev) =>
                    prev.some((m) => m._id === message._id)
                        ? prev
                        : [...prev, message]
                );
            }
        };

        socket.on("chat:new-message", onNewMessage);

        return () => {
            socket.off("chat:new-message", onNewMessage);
        };
    }, [selected, user?._id]);

    useEffect(() => {
        const socket = getSocket();

        if (selected?.conversationKey) {
            socket.emit("join-conversation", selected.conversationKey);
        }

        return () => {
            if (selected?.conversationKey) {
                socket.emit("leave-conversation", selected.conversationKey);
            }
        };
    }, [selected]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const selectedListingId = useMemo(() => {
        return (
            selected?.listing?._id ||
            selected?.latestMessage?.listingId ||
            selected?.latestMessage?.listingId?._id
        );
    }, [selected]);

    const handleSend = async (e) => {
        e.preventDefault();
        const effectiveListingId = selected ? selectedListingId : pendingNew?.listingId;
        const effectiveStudentId = selected
            ? (user.role === "LANDLORD" ? selected.studentId : undefined)
            : (user.role === "LANDLORD" ? pendingNew?.studentId : undefined);

        if (!draft.trim() || !effectiveListingId) return;

        try {
            const payload =
                user.role === "LANDLORD"
                    ? { listingId: effectiveListingId, studentId: effectiveStudentId, body: draft }
                    : { listingId: effectiveListingId, body: draft };

            const { data } = await sendMessageApi(payload);
            const newMsg = data.data.chatMessage;

            if (selected) {
                setMessages((prev) =>
                    prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]
                );
            } else {
                // First message in a brand-new conversation
                const syntheticItem = {
                    conversationKey: data.data.conversationKey,
                    latestMessage: newMsg,
                    listing: { _id: effectiveListingId, title: pendingNew?.listingTitle || "Conversation" },
                    studentId: newMsg.studentId,
                    landlordId: newMsg.landlordId,
                    unreadCount: 0,
                };
                setInbox((prev) => [syntheticItem, ...prev]);
                setSelected(syntheticItem);
                setMessages([newMsg]);
                setPendingNew(null);
            }

            setDraft("");
            loadInbox();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to send message");
        }
    };

    const handleArchive = async (conversationKey) => {
        try {
            await archiveChatApi(conversationKey);
            toast.success("Chat archived");
            setInbox((prev) => prev.filter((i) => i.conversationKey !== conversationKey));
            if (selected?.conversationKey === conversationKey) {
                setSelected(null);
                setMessages([]);
            }
        } catch {
            toast.error("Failed to archive chat");
        }
        setMenuOpen(null);
    };

    const handleDelete = async (conversationKey) => {
        try {
            await deleteChatApi(conversationKey);
            toast.success("Chat deleted");
            setInbox((prev) => prev.filter((i) => i.conversationKey !== conversationKey));
            if (selected?.conversationKey === conversationKey) {
                setSelected(null);
                setMessages([]);
            }
        } catch {
            toast.error("Failed to delete chat");
        }
        setMenuOpen(null);
    };

    const handleMarkRead = async (conversationKey) => {
        try {
            await markChatReadApi(conversationKey);
            setInbox((prev) => prev.map((i) => i.conversationKey === conversationKey ? { ...i, unreadCount: 0 } : i));
            toast.success("Marked as read");
        } catch {
            toast.error("Failed to mark as read");
        }
        setMenuOpen(null);
    };

    const handleMarkUnread = async (conversationKey) => {
        try {
            await markChatUnreadApi(conversationKey);
            setInbox((prev) => prev.map((i) => i.conversationKey === conversationKey ? { ...i, unreadCount: Math.max(i.unreadCount, 1) } : i));
            toast.success("Marked as unread");
        } catch {
            toast.error("Failed to mark as unread");
        }
        setMenuOpen(null);
    };

    const filteredInbox = useMemo(() => {
        if (filter === "unread") return inbox.filter((i) => i.unreadCount > 0);
        if (filter === "read") return inbox.filter((i) => i.unreadCount === 0);
        return inbox;
    }, [inbox, filter]);

    return (
        <div className="space-y-5">
            <PageHero
                eyebrow="Communication Center"
                title="Chat"
                description="Talk directly with landlords or students about accommodation, availability, visits, and booking details."
                backgroundImage={dashboardBanner}
            />

            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <div className="card overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-bold text-slate-900">Inbox</h3>
                            <div className="flex items-center gap-1">
                                <Filter size={14} className="text-slate-400" />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {[
                                { key: "all", label: "All" },
                                { key: "unread", label: "Unread" },
                                { key: "read", label: "Read" },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto p-3">
                        {filteredInbox.length === 0 ? (
                            <EmptyState
                                image={emptyChat}
                                imageAlt="No conversations illustration"
                                title={filter !== "all" ? `No ${filter} conversations` : "No conversations yet"}
                                description={filter !== "all" ? "Try switching to a different filter." : "Start chatting from a listing page to begin a conversation."}
                                compact
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredInbox.map((item) => {
                                    const active = selected?.conversationKey === item.conversationKey;
                                    const showMenu = menuOpen === item.conversationKey;

                                    return (
                                        <div key={item.conversationKey} className="relative">
                                            <button
                                                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active
                                                    ? "border-indigo-200 bg-indigo-50"
                                                    : item.unreadCount > 0
                                                        ? "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                                    }`}
                                                onClick={() => openConversation(item)}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`font-semibold ${item.unreadCount > 0 ? "text-slate-900" : "text-slate-700"}`}>
                                                            {item.listing?.title || "Conversation"}
                                                        </div>
                                                        <div className={`mt-1 line-clamp-2 text-sm leading-6 ${item.unreadCount > 0 ? "font-medium text-slate-700" : "text-slate-500"}`}>
                                                            {item.latestMessage?.body || "No messages yet"}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="text-xs text-slate-400">
                                                            {formatTime(item.latestMessage?.createdAt)}
                                                        </span>
                                                        {item.unreadCount > 0 && (
                                                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                                                                {item.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(showMenu ? null : item.conversationKey);
                                                }}
                                            >
                                                <MoreVertical size={14} />
                                            </button>

                                            {showMenu && (
                                                <div className="absolute right-2 top-10 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                                    {item.unreadCount > 0 ? (
                                                        <button
                                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                                            onClick={() => handleMarkRead(item.conversationKey)}
                                                        >
                                                            <Eye size={14} />
                                                            Mark as read
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                                            onClick={() => handleMarkUnread(item.conversationKey)}
                                                        >
                                                            <EyeOff size={14} />
                                                            Mark as unread
                                                        </button>
                                                    )}
                                                    <button
                                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                                        onClick={() => handleArchive(item.conversationKey)}
                                                    >
                                                        <Archive size={14} />
                                                        Archive chat
                                                    </button>
                                                    <button
                                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                                        onClick={() => handleDelete(item.conversationKey)}
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete chat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card flex min-h-[72vh] flex-col overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {selected?.listing?.title
                                        || pendingNew?.listingTitle
                                        || (pendingNew ? (pendingNew.studentName ? `Chat with ${pendingNew.studentName}` : "New conversation") : "Select a conversation")}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selected
                                        ? "Reply and continue the conversation in real time."
                                        : pendingNew
                                            ? "No messages yet — send the first one to start the conversation."
                                            : "Choose a conversation from the inbox to start chatting."}
                                </p>
                            </div>
                            {selected && (
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleArchive(selected.conversationKey)}
                                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                                        title="Archive this chat"
                                    >
                                        <Archive size={13} strokeWidth={2.2} />
                                        Archive
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(selected.conversationKey)}
                                        className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200/70 transition hover:bg-rose-100"
                                        title="Delete this chat"
                                    >
                                        <Trash2 size={13} strokeWidth={2.2} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!selected && !pendingNew ? (
                        <div className="flex flex-1 items-center justify-center p-8">
                            <EmptyState
                                image={emptyChat}
                                imageAlt="Select conversation illustration"
                                title="Select a conversation"
                                description="Choose a chat from the inbox to view messages and reply."
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-6 py-6">
                                {messages.length === 0 && pendingNew && (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-center text-sm text-slate-400">No messages yet. Say hello!</p>
                                    </div>
                                )}
                                {messages.map((message) => {
                                    const mine =
                                        String(message.senderId?._id || message.senderId) === String(user?._id);

                                    return (
                                        <div
                                            key={message._id}
                                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className="max-w-[78%]">
                                                <div
                                                    className={`rounded-3xl px-4 py-3 text-sm shadow-sm ${mine
                                                        ? "bg-indigo-600 text-white"
                                                        : "border border-slate-200 bg-white text-slate-800"
                                                        }`}
                                                >
                                                    <div className="mb-1 text-xs opacity-80">
                                                        {message.senderId?.fullName || "User"}
                                                    </div>
                                                    <div className="leading-6">{message.body}</div>
                                                </div>

                                                <div
                                                    className={`mt-1 px-2 text-xs text-slate-400 ${mine ? "text-right" : "text-left"
                                                        }`}
                                                >
                                                    {formatTime(message.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="border-t border-slate-100 bg-white p-4" onSubmit={handleSend}>
                                <div className="flex gap-3">
                                    <input
                                        className="input"
                                        placeholder="Type your message..."
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                    />
                                    <button className="btn-primary px-6" disabled={!draft.trim() || (!!pendingNew && !pendingNew.listingId)}>
                                        Send
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
