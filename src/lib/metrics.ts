import type { SpeechMetrics } from "./types";

const FILLERS = [
  "um",
  "uh",
  "erm",
  "eh",
  "like",
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "basically",
  "actually",
  "well",
];

// Whisper word timestamps (있으면). 없으면 transcript+duration만으로 근사.
export interface WordTs {
  word: string;
  start: number;
  end: number;
}

export function computeMetrics(
  transcript: string,
  durationSec: number,
  words?: WordTs[]
): SpeechMetrics {
  const clean = transcript.trim();
  const tokens = clean.length ? clean.split(/\s+/) : [];
  const wordCount = tokens.length;
  const dur = Math.max(1, durationSec);
  const wpm = Math.round((wordCount / dur) * 60);

  const lower = " " + clean.toLowerCase().replace(/[.,!?;:]/g, " ") + " ";
  let fillerCount = 0;
  for (const f of FILLERS) {
    const re = new RegExp("\\s" + f.replace(/ /g, "\\s") + "\\s", "g");
    fillerCount += (lower.match(re) || []).length;
  }
  const fillerRatio = wordCount ? fillerCount / wordCount : 0;

  let pauseCount = 0;
  let longestPauseSec = 0;
  let speakingTime = dur;
  if (words && words.length > 1) {
    let spoken = 0;
    for (let i = 0; i < words.length; i++) {
      spoken += Math.max(0, words[i].end - words[i].start);
      if (i > 0) {
        const gap = words[i].start - words[i - 1].end;
        if (gap > 0.6) {
          pauseCount++;
          longestPauseSec = Math.max(longestPauseSec, gap);
        }
      }
    }
    speakingTime = spoken;
  } else {
    // 근사: 침묵 시간 추정
    const est = wordCount / 2.3; // 초당 약 2.3단어를 표준 속도로 가정
    speakingTime = Math.min(dur, est);
    const silence = Math.max(0, dur - speakingTime);
    pauseCount = Math.round(silence / 1.5);
    longestPauseSec = Math.min(silence, 3);
  }

  const speakingRatio = Math.max(0, Math.min(1, speakingTime / dur));

  return {
    wordCount,
    wpm,
    fillerCount,
    fillerRatio: Number(fillerRatio.toFixed(3)),
    pauseCount,
    longestPauseSec: Number(longestPauseSec.toFixed(1)),
    speakingRatio: Number(speakingRatio.toFixed(2)),
  };
}

export function metricsSummary(m: SpeechMetrics): string {
  return [
    `단어 수 ${m.wordCount}개`,
    `말하기 속도 ${m.wpm} WPM`,
    `필러워드 ${m.fillerCount}회`,
    `멈춤 ${m.pauseCount}회(최장 ${m.longestPauseSec}s)`,
    `발화 비율 ${Math.round(m.speakingRatio * 100)}%`,
  ].join(" · ");
}
