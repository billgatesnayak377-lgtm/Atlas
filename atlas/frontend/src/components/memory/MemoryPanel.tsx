
import { useMemo, useState } from "react";

import {
  createMemory,
  deleteMemory,
  updateMemory,
} from "../../memory/memory";

import type {
  AtlasMemory,
  MemoryType,
} from "../../memory/memory";

type MemoryPanelProps = {
  memories: AtlasMemory[];
  onChange: (
    memories: AtlasMemory[]
  ) => void;
};

const MEMORY_TYPES: {
  value: MemoryType;
  label: string;
}[] = [
  {
    value: "preference",
    label: "Preference",
  },
  {
    value: "goal",
    label: "Goal",
  },
  {
    value: "routine",
    label: "Routine",
  },
  {
    value: "context",
    label: "Context",
  },
  {
    value: "fact",
    label: "Fact",
  },
];

function typeLabel(
  type: MemoryType
): string {
  return (
    MEMORY_TYPES.find(
      (item) => item.value === type
    )?.label ?? "Memory"
  );
}

export default function MemoryPanel({
  memories,
  onChange,
}: MemoryPanelProps) {
  const [type, setType] =
    useState<MemoryType>("preference");

  const [key, setKey] =
    useState("");

  const [value, setValue] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editValue, setEditValue] =
    useState("");

  const sortedMemories =
    useMemo(
      () =>
        [...memories].sort(
          (a, b) =>
            new Date(
              b.updatedAt
            ).getTime() -
            new Date(
              a.updatedAt
            ).getTime()
        ),
      [memories]
    );

  function addMemory() {
    const cleanKey = key.trim();
    const cleanValue =
      value.trim();

    if (
      !cleanKey ||
      !cleanValue
    ) {
      return;
    }

    const memory = createMemory({
      type,
      key: cleanKey,
      value: cleanValue,
      confidence: 1,
      source: "user",
    });

    onChange([
      ...memories,
      memory,
    ]);

    setKey("");
    setValue("");
  }

  function startEdit(
    memory: AtlasMemory
  ) {
    setEditingId(memory.id);
    setEditValue(
      memory.value
    );
  }

  function saveEdit(
    memory: AtlasMemory
  ) {
    const cleanValue =
      editValue.trim();

    if (!cleanValue) {
      return;
    }

    onChange(
      memories.map(
        (item) =>
          item.id === memory.id
            ? updateMemory(
                item,
                {
                  value:
                    cleanValue,
                }
              )
            : item
      )
    );

    setEditingId(null);
    setEditValue("");
  }

  function removeMemory(
    memoryId: string
  ) {
    onChange(
      deleteMemory(
        memories,
        memoryId
      )
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          🧠
        </span>

        <div>
          <h2 className="text-xl font-semibold text-white">
            Atlas Memory
          </h2>

          <p className="text-sm text-slate-400">
            Things Atlas can remember
            and use later.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <select
          value={type}
          onChange={(event) =>
            setType(
              event.target
                .value as MemoryType
            )
          }
          className="rounded-xl bg-slate-900 px-4 py-3 text-white border border-slate-700 outline-none focus:border-purple-400"
        >
          {MEMORY_TYPES.map(
            (item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            )
          )}
        </select>

        <input
          value={key}
          onChange={(event) =>
            setKey(
              event.target.value
            )
          }
          placeholder="e.g. preferred study time"
          className="rounded-xl bg-slate-900 px-4 py-3 text-white placeholder-slate-500 border border-slate-700 outline-none focus:border-purple-400"
        />

        <input
          value={value}
          onChange={(event) =>
            setValue(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              addMemory();
            }
          }}
          placeholder="e.g. evening"
          className="rounded-xl bg-slate-900 px-4 py-3 text-white placeholder-slate-500 border border-slate-700 outline-none focus:border-purple-400"
        />
      </div>

      <button
        type="button"
        onClick={addMemory}
        disabled={
          !key.trim() ||
          !value.trim()
        }
        className="mt-3 rounded-xl bg-purple-500 px-5 py-3 font-semibold text-white hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 transition"
      >
        + Remember
      </button>

      <div className="mt-5 space-y-3">
        {sortedMemories.length ===
        0 ? (
          <div className="rounded-xl bg-slate-900/70 p-4 text-sm text-slate-400">
            Atlas has no saved memories
            yet.
          </div>
        ) : (
          sortedMemories.map(
            (memory) => (
              <div
                key={memory.id}
                className="rounded-xl bg-slate-900/70 border border-slate-800 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-purple-500/15 px-2 py-1 text-xs text-purple-300">
                        {typeLabel(
                          memory.type
                        )}
                      </span>

                      <span className="text-sm font-semibold text-white">
                        {memory.key}
                      </span>

                      {memory.source ===
                        "inferred" && (
                        <span className="text-xs text-amber-300">
                          inferred
                        </span>
                      )}
                    </div>

                    {editingId ===
                    memory.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={
                            editValue
                          }
                          onChange={(
                            event
                          ) =>
                            setEditValue(
                              event.target
                                .value
                            )
                          }
                          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-white border border-slate-700 outline-none focus:border-purple-400"
                          autoFocus
                        />

                        <button
                          type="button"
                          onClick={() =>
                            saveEdit(
                              memory
                            )
                          }
                          className="rounded-lg bg-emerald-500/20 px-3 py-2 text-emerald-300"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(
                              null
                            )
                          }
                          className="rounded-lg bg-slate-700 px-3 py-2 text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-slate-300">
                        {memory.value}
                      </p>
                    )}
                  </div>

                  {editingId !==
                    memory.id && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            memory
                          )
                        }
                        className="rounded-lg bg-sky-500/15 px-3 py-2 text-sky-300"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeMemory(
                            memory.id
                          )
                        }
                        className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}