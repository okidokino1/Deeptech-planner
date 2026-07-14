import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env, features } from "@/lib/env";
import type { WordTs } from "@/lib/metrics";

export const runtime = "nodejs";
export const maxDuration = 60;

// 음성 → 텍스트 (Whisper). 키 없으면 클라이언트의 Web Speech 전사를 사용하도록 안내.
export async function POST(req: Request) {
  if (!features.whisper) {
    return NextResponse.json(
      { transcript: "", words: [], engine: "none", note: "OPENAI_API_KEY 미설정" },
      { status: 200 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "audio 파일이 필요합니다." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: env.openaiKey });
    const resp = await openai.audio.transcriptions.create({
      file: new File([file], "answer.webm", { type: file.type || "audio/webm" }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const anyResp = resp as unknown as {
      text: string;
      words?: Array<{ word: string; start: number; end: number }>;
    };
    const words: WordTs[] = (anyResp.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    return NextResponse.json({ transcript: anyResp.text || "", words, engine: "whisper" });
  } catch (e) {
    console.error("[transcribe] 실패:", e);
    return NextResponse.json(
      { transcript: "", words: [], engine: "error" },
      { status: 200 }
    );
  }
}
