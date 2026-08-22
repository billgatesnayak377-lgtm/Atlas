export type MemoryType =
  | "preference"
  | "goal"
  | "routine"
  | "context"
  | "fact";

export type MemorySource = "user" | "inferred";

export type AtlasMemory = {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  confidence: number;
  source: MemorySource;
  createdAt: string;
  updatedAt: string;
};

export const MEMORY_STORAGE_KEY = "atlas-memory";

export function loadMemories(): AtlasMemory[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem(
    MEMORY_STORAGE_KEY
  );

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is AtlasMemory =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as AtlasMemory).id === "string" &&
            typeof (item as AtlasMemory).type === "string" &&
            typeof (item as AtlasMemory).key === "string" &&
            typeof (item as AtlasMemory).value === "string"
        )
    );
  } catch {
    console.error("Could not load Atlas memory.");
    return [];
  }
}

export function saveMemories(
  memories: AtlasMemory[]
): void {
  localStorage.setItem(
    MEMORY_STORAGE_KEY,
    JSON.stringify(memories)
  );
}

export function createMemory(
  input: Omit<
    AtlasMemory,
    "id" | "createdAt" | "updatedAt"
  >
): AtlasMemory {
  const now = new Date().toISOString();

  return {
    ...input,
    id: `mem_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMemory(
  memory: AtlasMemory,
  changes: Partial<
    Pick<
      AtlasMemory,
      | "type"
      | "key"
      | "value"
      | "confidence"
      | "source"
    >
  >
): AtlasMemory {
  return {
    ...memory,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteMemory(
  memories: AtlasMemory[],
  memoryId: string
): AtlasMemory[] {
  return memories.filter(
    (memory) => memory.id !== memoryId
  );
}

export function getRelevantMemories(
  memories: AtlasMemory[],
  query: string,
  limit = 8
): AtlasMemory[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word.replace(/[^a-z0-9]/g, "")
    )
    .filter(
      (word) => word.length >= 3
    );

  if (words.length === 0) {
    return memories.slice(0, limit);
  }

  const scored = memories.map(
    (memory) => {
      const haystack = [
        memory.type,
        memory.key,
        memory.value,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;

      for (const word of words) {
        if (haystack.includes(word)) {
          score += 1;
        }
      }

      if (memory.source === "user") {
        score += 0.25;
      }

      score +=
        Math.max(
          0,
          Math.min(memory.confidence, 1)
        ) * 0.25;

      return {
        memory,
        score,
      };
    }
  );

  return scored
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, limit)
    .map(
      (item) => item.memory
    );
}