"use client";

import { FormEvent, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

type Message = { role: "assistant" | "user"; content: string };

const welcome: Message = {
  role: "assistant",
  content: "Hi. I can help you operate DukaOS and troubleshoot sales, inventory, purchases, transfers, credit, reports, users, and billing. What are you trying to do?",
};

export function SupportAssistant() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [pending, setPending] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || pending) return;
    setMessage("");
    setMessages((current) => [...current, { role: "user", content }]);
    setPending(true);
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await response.json() as { answer?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.answer ?? data.error ?? "I could not answer that just now." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I could not reach support right now. Please try again in a moment." }]);
    } finally {
      setPending(false);
    }
  }

  return <>
    {open && <section className="fixed bottom-24 right-4 z-50 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_55px_rgba(18,57,51,0.2)] sm:right-6" aria-label="DukaOS support assistant">
      <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Bot size={17} /></span><div><p className="text-sm font-semibold">DukaOS Support</p><p className="text-[11px] text-primary-foreground/75">Operational help</p></div></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close support assistant" className="rounded-md p-1.5 hover:bg-white/15"><X size={17} /></button>
      </header>
      <div className="scrollbar-hidden flex-1 space-y-3 overflow-y-auto bg-background p-3">
        {messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2.5 text-sm leading-6 ${item.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-foreground"}`}>{item.content}</p></div>)}
        {pending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Checking that for you...</div>}
      </div>
      <form onSubmit={send} className="border-t border-border bg-surface p-3"><div className="flex items-end gap-2"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the issue..." rows={2} maxLength={2000} disabled={pending} className="min-h-10 flex-1 resize-none rounded-md border border-border-strong bg-background px-3 py-2 text-sm outline-none focus:border-primary" /><button type="submit" disabled={!message.trim() || pending} aria-label="Send support question" className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} /></button></div></form>
    </section>}
    <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? "Close support assistant" : "Open support assistant"} className="fixed bottom-5 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(18,57,51,0.25)] transition-transform hover:-translate-y-0.5 sm:right-6"><MessageCircle size={21} /></button>
  </>;
}
