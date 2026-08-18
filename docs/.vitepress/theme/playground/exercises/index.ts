import type { Exercise } from "../types";
import { ch01Exercises } from "./ch01";
import { ch02Exercises } from "./ch02";
import { ch03Exercises } from "./ch03";
import { ch04Exercises } from "./ch04";
import { ch05Exercises } from "./ch05";
import { ch06Exercises } from "./ch06";
import { ch07Exercises } from "./ch07";
import { ch08Exercises } from "./ch08";

export const exercises: Exercise[] = [
  ...ch01Exercises,
  ...ch02Exercises,
  ...ch03Exercises,
  ...ch04Exercises,
  ...ch05Exercises,
  ...ch06Exercises,
  ...ch07Exercises,
  ...ch08Exercises,
];

export function getExercise(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

/** 按章节分组，供选择器展示 */
export function groupByChapter(): { chapter: number; chapterName: string; items: Exercise[] }[] {
  const groups = new Map<number, { chapter: number; chapterName: string; items: Exercise[] }>();
  for (const exercise of exercises) {
    if (!groups.has(exercise.chapter)) {
      groups.set(exercise.chapter, {
        chapter: exercise.chapter,
        chapterName: exercise.chapterName,
        items: [],
      });
    }
    groups.get(exercise.chapter)!.items.push(exercise);
  }
  return [...groups.values()].sort((a, b) => a.chapter - b.chapter);
}
