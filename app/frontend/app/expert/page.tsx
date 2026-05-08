"use client";

import { useRef, useState } from "react";
import { BrainCircuit, ChevronRight, RotateCcw, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { ExpertResponseBlock } from "@/lib/types";
import { ExpertResponseRenderer } from "@/components/ExpertResponseRenderer";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { useBLGrouping } from "@/lib/bl-grouping-context";
import { formatDateTime } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "¿Cuál es el top 10 de clientes de Author este mes?",
  "¿Cuánto ha crecido el ARR total de LMS en los últimos 6 meses?",
  "¿Por qué varió el ARR de Skills entre enero y junio de 2025?",
  "¿Qué clientes tienen mayor riesgo de churn basándome en la evolución de su ARR?",
  "Dame un resumen ejecutivo del ARR de isEazy a fecha de hoy",
  "¿Cuál es la distribución de ARR por línea de negocio actualmente?",
  "¿Qué alertas de calidad de datos están pendientes de revisión?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: ExpertResponseBlock[];
  isLoading?: boolean;
  error?: string;
}

export default function ExpertPage() {
  const { activeSnapshot } = useSnapshotContext();
  const { combineLmsAio, combineAuthor } = useBLGrouping();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    // Build conversation history (exclude the loading placeholder)
    const history = messages
      .filter((m) => !m.isLoading)
      .map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? (m.blocks ? JSON.stringify({ blocks: m.blocks }) : m.content) : m.content,
      }));

    try {
      const response = await api.expertChat({
        message: text.trim(),
        conversation_history: history,
        snapshot_id: activeSnapshot?.id,
        combine_lms_aio: combineLmsAio,
        combine_author: combineAuthor,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, blocks: response.blocks, isLoading: false }
            : m,
        ),
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al conectar con el ARR Expert";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, error: errorMsg, isLoading: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setInputValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#e7e1f2] bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20">
              <BrainCircuit size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#151229]">ARR Expert</h1>
                <span className="rounded-full bg-[#efe9ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#6d35ff]">
                  Beta
                </span>
              </div>
              <p className="text-sm text-[#6f6a80]">Pregunta cualquier cosa sobre los datos de ARR</p>
            </div>
          </div>
          {hasMessages && (
            <button
              onClick={resetConversation}
              className="flex items-center gap-2 rounded-xl border border-[#e7e1f2] bg-white px-3 py-2 text-sm font-semibold text-[#6f6a80] transition hover:border-[#c4b0ff] hover:text-[#2f185f]"
            >
              <RotateCcw size={15} />
              Nueva conversación
            </button>
          )}
        </div>

        {/* Context bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fbfaff] px-4 py-3 text-xs font-semibold text-[#6f6a80]">
          <span>
            Snapshot:{" "}
            <span className="font-black text-[#2f185f]">
              {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : "Sin snapshot"}
            </span>
          </span>
          <span className="text-[#e7e1f2]">·</span>
          <span>
            Registros:{" "}
            <span className="font-black text-[#2f185f]">
              {activeSnapshot?.sf_records_processed ?? "—"}
            </span>
          </span>
          {combineLmsAio && (
            <>
              <span className="text-[#e7e1f2]">·</span>
              <span className="rounded-full bg-[#efe9ff] px-2 py-0.5 text-[#6d35ff]">LMS & AIO agrupados</span>
            </>
          )}
          {combineAuthor && (
            <>
              <span className="text-[#e7e1f2]">·</span>
              <span className="rounded-full bg-[#efe9ff] px-2 py-0.5 text-[#6d35ff]">Author agrupado</span>
            </>
          )}
        </div>
      </div>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Suggested questions */}
        {!hasMessages && (
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-sm font-semibold text-[#837a9f]">Preguntas sugeridas</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-1.5 rounded-2xl border border-[#e7e1f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#2f185f] transition hover:border-[#c4b0ff] hover:bg-[#f7f3ff]"
                >
                  <ChevronRight size={14} className="text-[#6d35ff]" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[75%] rounded-3xl bg-[#6d35ff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6d35ff]/15">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#2f185f] text-white">
                      <BrainCircuit size={14} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-[#2f185f]">ARR Expert</span>
                  </div>
                  <div className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_8px_30px_rgba(49,24,95,0.06)]">
                    {msg.isLoading ? (
                      <div className="flex items-center gap-3 text-sm font-semibold text-[#837a9f]">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#efe9ff] border-t-[#6d35ff]" />
                        Analizando datos...
                      </div>
                    ) : msg.error ? (
                      <p className="text-sm font-semibold text-[#d03932]">{msg.error}</p>
                    ) : msg.blocks ? (
                      <ExpertResponseRenderer blocks={msg.blocks} />
                    ) : (
                      <p className="text-sm text-[#6f6a80]">Sin respuesta.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#e7e1f2] bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre ARR... (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 py-3 text-sm font-semibold text-[#151229] placeholder-[#9ca3af] outline-none transition focus:border-[#6d35ff] focus:ring-2 focus:ring-[#6d35ff]/10"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20 transition hover:bg-[#5b27e6] disabled:opacity-40 disabled:shadow-none"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-[#9ca3af]">
          El experto consulta los datos reales del snapshot activo. Shift+Enter para nueva línea.
        </p>
      </div>
    </div>
  );
}
