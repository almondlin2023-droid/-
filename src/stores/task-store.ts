import { create } from "zustand";
import type { Task, TaskSummary } from "@/types/diagnosis";

interface TaskState {
  currentTask: Task | null;
  taskList: Task[];
  isAnalyzing: boolean;
  progress: number;

  setCurrentTask: (task: Task | null) => void;
  setTaskList: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Task["status"], summary?: TaskSummary) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTask: null,
  taskList: [],
  isAnalyzing: false,
  progress: 0,

  setCurrentTask: (task) => set({ currentTask: task }),
  setTaskList: (taskList) => set({ taskList }),
  addTask: (task) => set((s) => ({ taskList: [task, ...s.taskList] })),
  updateTaskStatus: (taskId, status, summary) =>
    set((s) => ({
      taskList: s.taskList.map((t) =>
        t.id === taskId ? { ...t, status, summary } : t
      ),
      currentTask:
        s.currentTask?.id === taskId
          ? { ...s.currentTask, status, summary }
          : s.currentTask,
    })),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setProgress: (progress) => set({ progress }),
}));
