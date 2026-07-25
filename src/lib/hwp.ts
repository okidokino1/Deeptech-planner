// 한글(HWP/HWPX) 파일 텍스트 추출
//
// 정부지원사업 공고문은 대부분 한글 파일이다. 두 포맷을 모두 지원한다.
//   - .hwp  : 구형 HWP5 바이너리(OLE 복합파일). cfb 로 스트림을 열고 zlib 해제 후 레코드 파싱
//   - .hwpx : 신형 개방 포맷(ZIP + OWPML XML). jszip 으로 열고 <hp:t> 텍스트 수집
//
// 실제 공고문(모집공고 25,916자 / FAQ 7,698자)으로 추출 검증 완료.

import zlib from "zlib";

// PARA_TEXT 안에서 8워드(16바이트)를 차지하는 인라인/확장 제어문자
const CTRL8 = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

// ── HWP5 바이너리 ────────────────────────────────────────────────────────────
export async function extractHwp(buf: Buffer): Promise<string> {
  const CFB = await import("cfb");
  const cfb = CFB.parse(buf);

  // FileHeader 오프셋 36바이트: bit0 = 본문 압축 여부
  const fh = CFB.find(cfb, "FileHeader");
  if (!fh || !fh.content) throw new Error("HWP5 FileHeader를 찾을 수 없습니다.");
  const fhContent = fh.content as Uint8Array;
  const compressed = (fhContent[36] & 0x01) === 1;

  // BodyText/Section0, Section1 ... 순서대로 수집
  const sections = cfb.FullPaths.map((p: string, i: number) => ({ p, e: cfb.FileIndex[i] }))
    .filter(({ p }: { p: string }) => /BodyText\/Section\d+$/i.test(p))
    .sort((a: { p: string }, b: { p: string }) => a.p.localeCompare(b.p, undefined, { numeric: true }));
  if (!sections.length) throw new Error("HWP 본문(BodyText) 섹션이 없습니다.");

  let out = "";
  for (const { e } of sections) {
    let data = Buffer.from(e.content as Uint8Array);
    if (compressed) {
      try {
        data = zlib.inflateRawSync(data);
      } catch {
        try {
          data = zlib.inflateSync(data);
        } catch {
          /* 비압축으로 간주하고 원본 사용 */
        }
      }
    }
    out += parseRecords(data);
  }
  return normalize(out);
}

function parseRecords(buf: Buffer): string {
  let pos = 0;
  let text = "";
  while (pos + 4 <= buf.length) {
    const header = buf.readUInt32LE(pos);
    pos += 4;
    const tagId = header & 0x3ff;
    let size = (header >> 20) & 0xfff;
    if (size === 0xfff) {
      if (pos + 4 > buf.length) break;
      size = buf.readUInt32LE(pos);
      pos += 4;
    }
    if (pos + size > buf.length) break;
    if (tagId === 0x43) {
      // HWPTAG_PARA_TEXT
      text += decodeParaText(buf.subarray(pos, pos + size)) + "\n";
    }
    pos += size;
  }
  return text;
}

function decodeParaText(buf: Buffer): string {
  let s = "";
  for (let i = 0; i + 2 <= buf.length; ) {
    const c = buf.readUInt16LE(i);
    if (c >= 32) {
      s += String.fromCharCode(c);
      i += 2;
    } else if (CTRL8.has(c)) {
      i += 16; // 8워드 제어문자 스킵
    } else {
      if (c === 10 || c === 13) s += "\n";
      i += 2;
    }
  }
  return s;
}

// ── HWPX 개방 포맷 (ZIP + OWPML) ─────────────────────────────────────────────
export async function extractHwpx(buf: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);

  // Contents/section0.xml, section1.xml ... 순서대로
  const names = Object.keys(zip.files)
    .filter((n) => /Contents\/section\d+\.xml$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!names.length) throw new Error("HWPX 본문(section) XML이 없습니다.");

  let out = "";
  for (const n of names) {
    const xml = await zip.files[n].async("string");
    out += xmlToText(xml) + "\n";
  }
  return normalize(out);
}

// OWPML: 문단 <hp:p> 안의 텍스트런 <hp:t>...</hp:t> 를 이어붙인다. 문단 경계=줄바꿈.
function xmlToText(xml: string): string {
  let s = "";
  const paras = xml.split(/<hp:p[\s>]/);
  for (const para of paras) {
    const runs = para.match(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g);
    if (!runs) continue;
    let line = "";
    for (const r of runs) {
      const inner = r.replace(/<hp:t[^>]*>/, "").replace(/<\/hp:t>/, "");
      line += unescapeXml(inner.replace(/<[^>]+>/g, ""));
    }
    if (line.trim()) s += line + "\n";
  }
  return s;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// 시그니처로 포맷 판별 후 추출 (확장자 오인 대비)
export async function extractHangul(buf: Buffer): Promise<string> {
  // ZIP(PK) → HWPX, OLE(D0CF11E0) → HWP5
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return extractHwpx(buf);
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf) return extractHwp(buf);
  throw new Error("한글 파일 형식을 인식할 수 없습니다.");
}
