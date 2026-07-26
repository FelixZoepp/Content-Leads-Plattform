import { useState } from "react";
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";

export type QuestionType = "text" | "nps" | "scale_1_10";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
}

interface Props {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Freitext",
  nps: "NPS (0–10)",
  scale_1_10: "Skala (1–10)",
};

export function SurveyQuestionBuilder({ questions, onChange }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function addQuestion() {
    onChange([
      ...questions,
      { id: generateId(), type: "text", question: "", required: true },
    ]);
  }

  function removeQuestion(idx: number) {
    onChange(questions.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, patch: Partial<SurveyQuestion>) {
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function handleDragStart(idx: number) {
    setDragging(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(idx);
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragging === null || dragging === idx) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(idx, 0, moved);
    onChange(reordered);
    setDragging(null);
    setDragOver(null);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(249,249,249,0.4)]">
          Fragen ({questions.length})
        </span>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#E9CB8B] border border-[rgba(197,160,89,0.3)] hover:bg-[rgba(197,160,89,0.08)] transition"
        >
          <Plus className="w-3.5 h-3.5" /> Frage hinzufügen
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-[12px] text-[rgba(249,249,249,0.3)] py-4 text-center border border-dashed border-[rgba(249,249,249,0.08)] rounded-xl">
          Noch keine Fragen. Klicke auf "Frage hinzufügen".
        </p>
      )}

      <div className="space-y-2">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex gap-3 items-start p-3 rounded-xl border transition ${
              dragOver === idx && dragging !== idx
                ? "border-[rgba(197,160,89,0.5)] bg-[rgba(197,160,89,0.05)]"
                : "border-[rgba(249,249,249,0.08)] bg-[rgba(249,249,249,0.02)]"
            }`}
          >
            <div className="mt-2.5 cursor-grab text-[rgba(249,249,249,0.2)] hover:text-[rgba(249,249,249,0.5)] transition">
              <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(idx, { type: e.target.value as QuestionType })}
                  className="bg-[rgba(10,11,11,0.6)] border border-[rgba(249,249,249,0.08)] rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v} className="bg-[#141616]">{l}</option>
                  ))}
                </select>
                <input
                  value={q.question}
                  onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                  placeholder={`Frage ${idx + 1}…`}
                  className="flex-1 bg-[rgba(10,11,11,0.6)] border border-[rgba(249,249,249,0.08)] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder:text-[rgba(249,249,249,0.2)] outline-none focus:border-[rgba(197,160,89,0.3)] transition"
                />
              </div>

              {/* Preview pill */}
              <div className="flex items-center gap-2 text-[10px] text-[rgba(249,249,249,0.3)]">
                <span>Vorschau:</span>
                {q.type === "nps" && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="w-5 h-5 flex items-center justify-center rounded border border-[rgba(249,249,249,0.08)] text-[9px] text-[rgba(249,249,249,0.4)]">
                        {i}
                      </span>
                    ))}
                  </div>
                )}
                {q.type === "scale_1_10" && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className="w-5 h-5 flex items-center justify-center rounded border border-[rgba(249,249,249,0.08)] text-[9px] text-[rgba(249,249,249,0.4)]">
                        {i + 1}
                      </span>
                    ))}
                  </div>
                )}
                {q.type === "text" && (
                  <span className="px-2 py-0.5 rounded border border-[rgba(249,249,249,0.08)] text-[10px] text-[rgba(249,249,249,0.3)]">
                    Freitextfeld…
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => updateQuestion(idx, { required: !q.required })}
                title={q.required ? "Pflichtfeld (klicken zum deaktivieren)" : "Optional (klicken zum aktivieren)"}
                className="transition"
              >
                {q.required ? (
                  <ToggleRight className="w-5 h-5 text-[#E9CB8B]" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-[rgba(249,249,249,0.2)]" />
                )}
              </button>
              <span className="text-[9px] text-[rgba(249,249,249,0.3)] w-12">
                {q.required ? "Pflicht" : "Optional"}
              </span>
              <button
                type="button"
                onClick={() => removeQuestion(idx)}
                className="p-1 rounded text-[rgba(249,249,249,0.2)] hover:text-[#E87467] hover:bg-[rgba(232,116,103,0.08)] transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
