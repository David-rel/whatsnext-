"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Clip {
  id: string;
  title: string;
  video_url: string;
  duration: number;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  clips: Clip[];
}

function SortableClip({
  clip,
  onDelete,
  onTitleChange,
  onDurationFound,
}: {
  clip: Clip;
  onDelete: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onDurationFound: (id: string, duration: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="glass rounded-2xl p-4 flex gap-3 items-start">
      <button
        {...attributes}
        {...listeners}
        className="text-xl pt-2 cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: "rgba(255,255,255,0.35)", touchAction: "none" }}
      >
        ⠿
      </button>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <input
          className="input-field py-2 text-sm"
          value={clip.title}
          onChange={(e) => onTitleChange(clip.id, e.target.value)}
          placeholder="Clip title..."
        />
        <video
          src={clip.video_url}
          className="rounded-xl w-full"
          style={{ maxHeight: "200px", objectFit: "contain", background: "#000" }}
          controls
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = (e.target as HTMLVideoElement).duration;
            if (d && d !== clip.duration) onDurationFound(clip.id, d);
          }}
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {clip.duration > 0
            ? `${clip.duration.toFixed(1)}s total — video pauses at ${(clip.duration - 10).toFixed(1)}s, reveals the last 10s`
            : "⏳ loading duration..."}
        </p>
      </div>
      <button onClick={() => onDelete(clip.id)} className="shrink-0 btn-ghost px-3 py-2 mt-1" style={{ color: "rgba(255,100,100,0.7)" }}>
        🗑️
      </button>
    </div>
  );
}

export default function QuizEditor({ quiz: initialQuiz }: { quiz: Quiz | null }) {
  const [title, setTitle] = useState(initialQuiz?.title ?? "");
  const [clips, setClips] = useState<Clip[]>(initialQuiz?.clips ?? []);
  const [quizId, setQuizId] = useState<string | null>(initialQuiz?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function ensureQuiz(): Promise<string> {
    if (quizId) return quizId;
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "Untitled Quiz" }),
    });
    const data = await res.json();
    setQuizId(data.id);
    return data.id;
  }

  async function saveTitle(id?: string) {
    const qid = id ?? quizId;
    if (!qid || !title.trim()) return;
    await fetch(`/api/quizzes/${qid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("video/")) { alert("Please upload a video file!"); return; }
    setUploading(true);
    setUploadProgress(5);

    const id = await ensureQuiz();
    await saveTitle(id);

    const clipTitle = file.name.replace(/\.[^.]+$/, "");
    const ext = file.name.split(".").pop() ?? "mp4";
    const pathname = `whatsnext/clips/${id}/${Date.now()}.${ext}`;

    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/clips/upload",
      clientPayload: JSON.stringify({ quizId: id, title: clipTitle, order: clips.length }),
      onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage * 0.9)),
    });

    setUploadProgress(95);

    // Always save to DB (handles both local dev and prod)
    const res = await fetch("/api/clips/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: id, title: clipTitle, videoUrl: blob.url, order: clips.length }),
    });
    const clip = await res.json();

    setClips((c) => [...c, { ...clip, video_url: clip.video_url ?? blob.url }]);
    setUploadProgress(100);
    setTimeout(() => { setUploading(false); setUploadProgress(0); }, 400);
  }

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) await uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  async function deleteClip(id: string) {
    if (!confirm("Remove this clip?")) return;
    await fetch(`/api/clips/${id}`, { method: "DELETE" });
    setClips((c) => c.filter((x) => x.id !== id));
  }

  function updateTitle(id: string, newTitle: string) {
    setClips((c) => c.map((x) => (x.id === id ? { ...x, title: newTitle } : x)));
    fetch(`/api/clips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
  }

  function updateDuration(id: string, duration: number) {
    setClips((c) => c.map((x) => (x.id === id ? { ...x, duration } : x)));
    fetch(`/api/clips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration }),
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = clips.findIndex((c) => c.id === active.id);
    const newIndex = clips.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(clips, oldIndex, newIndex);
    setClips(reordered);
    await Promise.all(
      reordered.map((clip, idx) =>
        fetch(`/api/clips/${clip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: idx }),
        })
      )
    );
  }

  async function handleFinish() {
    setSaving(true);
    const id = await ensureQuiz();
    await saveTitle(id);
    setSaving(false);
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost px-3 py-2">← Back</Link>
          <h1 className="text-3xl font-bold flex-1" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            {quizId ? "Edit Quiz" : "New Quiz"} 🎬
          </h1>
        </div>

        <div className="glass rounded-2xl p-5">
          <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
            Quiz Title
          </label>
          <input
            className="input-field text-lg"
            placeholder="My Awesome Quiz"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveTitle()}
          />
        </div>

        {/* Upload zone */}
        <div
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${dragOver ? "scale-[1.02]" : ""}`}
          style={{
            borderColor: dragOver ? "#ff5733" : "rgba(255,255,255,0.2)",
            background: dragOver ? "rgba(255,87,51,0.1)" : "rgba(255,255,255,0.03)",
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          <div className="text-5xl mb-3">{uploading ? "⏳" : "🎥"}</div>
          {uploading ? (
            <div>
              <p className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Uploading to cloud...</p>
              <div className="w-full max-w-xs mx-auto rounded-full h-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: "#ff5733" }} />
              </div>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>{uploadProgress}%</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Drop video clips here</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                or click to browse · MP4, MOV, WebM
              </p>
              <p className="text-xs mt-2" style={{ color: "rgba(255,87,51,0.8)" }}>💡 Last 10s of each clip = the reveal!</p>
            </>
          )}
        </div>

        {clips.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              Clips ({clips.length}) — drag to reorder
            </h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={clips.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {clips.map((clip) => (
                  <SortableClip
                    key={clip.id}
                    clip={clip}
                    onDelete={deleteClip}
                    onTitleChange={updateTitle}
                    onDurationFound={updateDuration}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        <button onClick={handleFinish} className="btn-coral justify-center py-4 text-lg" disabled={saving || uploading}>
          {saving ? "Saving..." : "Save & Done ✅"}
        </button>
      </div>
    </div>
  );
}
