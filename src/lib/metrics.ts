import type { SpeechMetrics } from "./types";

// 영어 필러 — 발표 중 영어 표현이 섞이는 경우를 대비해 유지한다.
const EN_FILLERS = [
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

// 한국어 발표용 간투사.
// "그/좀/뭐/어" 는 접속사·부사와 형태가 겹치므로 반드시 독립 어절일 때만 센다.
// ("그" 는 세지만 "그래서/그리고" 의 일부는 세지 않는다)
const KO_FILLERS = ["음", "어", "그", "저기", "이제", "뭐", "인제", "약간", "좀"];

// Whisper 단어 타임스탬프가 없을 때 발화 시간을 추정하는 상수.
// 한국어 발표 권장 속도 약 300자/분, 어절 평균 약 3.2자 → 약 94어절/분 ≈ 1.6어절/초.
// 영어 기준(2.3단어/초)을 쓰면 발화 시간이 과소평가되어 멈춤 횟수가 크게 부풀려진다.
const KO_EOJEOL_PER_SEC = 1.6;

// Whisper word timestamps (있으면). 없으면 transcript+duration만으로 근사.
export interface WordTs {
  word: string;
  start: number;
  end: number;
}

// 독립 어절로 등장하는 필러만 센다.
// 뒤 경계는 lookahead 로 두어 "음 음 음" 처럼 연속될 때 누락되지 않게 한다.
function countFillers(text: string, fillers: string[]): number {
  const norm = " " + text.replace(/[.,!?;:…""'()]/g, " ") + " ";
  let n = 0;
  for (const f of fillers) {
    const re = new RegExp(`\\s${f.replace(/ /g, "\\s+")}(?=\\s)`, "g");
    n += (norm.match(re) || []).length;
  }
  return n;
}

export function computeMetrics(
  transcript: string,
  durationSec: number,
  words?: WordTs[]
): SpeechMetrics {
  // 한글이 NFD(자모 분리)로 들어오면 "음"·"어" 같은 간투사 리터럴과 매칭되지 않아
  // fillerCount 가 조용히 0이 된다. 비교 전에 반드시 NFC 로 합성한다.
  const clean = transcript.normalize("NFC").trim();
  const tokens = clean.length ? clean.split(/\s+/) : [];
  const wordCount = tokens.length;
  const dur = Math.max(1, durationSec);
  const wpm = Math.round((wordCount / dur) * 60);

  const fillerCount =
    countFillers(clean.toLowerCase(), EN_FILLERS) + countFillers(clean, KO_FILLERS);
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
    const est = wordCount / KO_EOJEOL_PER_SEC;
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

// Claude 채점 프롬프트에만 쓰인다. 영어 WPM 기준으로 오독하지 않도록
// 한국어 표준 속도 범위를 함께 넘긴다.
export function metricsSummary(m: SpeechMetrics): string {
  return [
    `어절 수 ${m.wordCount}개`,
    `말하기 속도 ${m.wpm} 어절/분 (한국어 발표 표준 약 90~110)`,
    `간투사 ${m.fillerCount}회`,
    `멈춤 ${m.pauseCount}회(최장 ${m.longestPauseSec}s)`,
    `발화 비율 ${Math.round(m.speakingRatio * 100)}%`,
  ].join(" · ");
}
