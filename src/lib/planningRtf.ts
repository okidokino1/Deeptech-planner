// 사업계획서 → RTF 변환기 (한글/HWP 대체 포맷)
// 진짜 .hwp 바이너리는 한컴 독점이라 서버에서 생성 불가하므로, 한글이 그대로 열어 편집할 수 있는
// RTF(.rtf)로 내보낸다. 한글에서 "다른 이름으로 저장 → .hwp"로 변환 가능. (MS Word도 RTF를 연다)

import type { PlanningProject } from "./planningStore";
import type { ArchModule } from "./planning";

// RTF 이스케이프: \ { } 처리 + 비ASCII는 유니코드 이스케이프(\uN?)로 (한글 포함)
function esc(s: string | undefined): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) {
    if (ch === "\\" || ch === "{" || ch === "}") {
      out += "\\" + ch;
      continue;
    }
    if (ch === "\n") {
      out += "\\line ";
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (code < 128) out += ch;
    else if (code <= 0xffff) out += `\\u${code}?`;
    else out += "?"; // BMP 밖(이모지 등)은 생략 — 계획서 텍스트에는 없음
  }
  return out;
}

const h1 = (t: string) => `{\\pard\\keepn\\sb280\\sa120\\b\\fs30 ${esc(t)}\\par}\n`;
const h2 = (t: string) => `{\\pard\\keepn\\sb180\\sa80\\b\\fs26 ${esc(t)}\\par}\n`;
const body = (t: string) => `{\\pard\\sa100\\sl276\\slmult1\\fs22 ${esc(t)}\\par}\n`;
const label = (k: string, v: string) =>
  `{\\pard\\sa60\\fs22{\\b ${esc(k)}: }${esc(v)}\\par}\n`;
const bullet = (t: string) =>
  `{\\pard\\fi-220\\li360\\sa60\\fs22 \\bullet\\tab ${esc(t)}\\par}\n`;

function moduleBlock(m: ArchModule): string {
  return (
    h2(`${m.id}. ${m.name}`) +
    label("정의", m.role) +
    label("적용 AI 모델", m.aiModels) +
    label("Input", m.input) +
    label("Processing", m.processing) +
    label("학습·개발 방식", m.learningMethod) +
    label("Output", m.output)
  );
}

// RTF 표: 6열. cellx = 열 오른쪽 경계(twips) 누적. A4 가용폭 ≈ 9020 twips.
const RTF_EDGES = [1500, 2820, 4800, 6080, 7560, 9020];
function rtfRowDef(shade: boolean): string {
  return (
    "\\trowd\\trgaph108\\trleft0" +
    RTF_EDGES.map(
      (e) =>
        "\\clvertalc\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10" +
        (shade ? "\\clcbpat2" : "") +
        `\\cellx${e}`
    ).join("")
  );
}
function rtfTable(headers: string[], rows: string[][]): string {
  const cells = (arr: string[], bold: boolean) =>
    arr.map((t) => `\\pard\\intbl\\fs16${bold ? "\\b" : ""} ${esc(t)}\\cell`).join("");
  let out = rtfRowDef(true) + cells(headers, true) + "\\row\n";
  rows.forEach((r) => {
    out += rtfRowDef(false) + cells(r, false) + "\\row\n";
  });
  return out + "{\\pard\\sa100\\par}\n";
}

export function buildPlanRtf(project: PlanningProject): string {
  const a = project.artifacts;
  const plan = a.plan;
  const arch = a.architecture;
  const diffs = a.differentiators || [];
  const title = plan?.titleCandidates?.[0] || project.title;

  let c = "";
  // 표지
  c += `{\\pard\\qc\\sb240\\sa60\\b\\fs24\\cf1 ${esc("딥테크 정부지원사업 연구개발계획서")}\\par}\n`;
  c += `{\\pard\\qc\\sa280\\b\\fs36 ${esc(title)}\\par}\n`;

  if (plan) {
    // 0. 모듈별 요약
    if (plan.summaryTable?.length) {
      c += h1("0. 모듈별 요약표");
      c += rtfTable(
        ["모듈", "Input", "Processing", "AI 모델", "학습방법", "Output"],
        plan.summaryTable.map((m) => [`${m.id}. ${m.name}`, m.input, m.processing, m.aiModels, m.learningMethod, m.output])
      );
    }
    // 1. 과제명 후보
    c += h1("1. 연구개발 과제명(후보)");
    plan.titleCandidates?.forEach((t, i) => (c += body(`후보 ${i + 1}. ${t}`)));
    // 2. 필요성
    c += h1("2. 연구개발의 필요성");
    plan.necessity?.forEach((n, i) => {
      c += h2(`2-${i + 1}. ${n.heading}`);
      c += body(n.body);
    });
    // 3. 운영 흐름
    c += h1("3. 운영 시스템 흐름");
    c += body(plan.systemFlow);
    // 4. 연구개발 프로세스
    c += h1("4. 연구개발 프로세스");
    plan.processDetail?.forEach((m) => (c += moduleBlock(m)));
    // 5. 차별화
    if (diffs.length) {
      c += h1("5. 기술 차별성 및 핵심 IP");
      diffs.forEach((d) => {
        c += h2(`${d.id}. ${d.title}`);
        c += body(d.description);
        c += label("근거", d.rationale);
      });
    }
    // 6. 아키텍처
    if (arch) {
      c += h1("6. 시스템 아키텍처");
      c += body(arch.overview);
      arch.layers?.forEach((l) => (c += bullet(`${l.name} — ${l.description}`)));
      if (arch.techStack?.length) {
        c += h2("기술 스택");
        arch.techStack.forEach((s) => (c += bullet(`${s.layer}: ${s.tech}`)));
      }
    }
    // 7. 사업화
    c += h1("7. 사업화 및 시장 진입 전략");
    c += body(plan.marketStrategy);
    // 8. 추진 체계
    c += h1("8. 추진 체계 및 팀 구성");
    c += body(plan.teamPlan);
    if (project.input.founder) {
      c += h2("대표자 이력");
      c += body(project.input.founder);
    }
    if (project.input.team) {
      c += h2("팀원 구성");
      c += body(project.input.team);
    }
  } else {
    c += body("아직 사업계획서가 완성되지 않았습니다. 기술기획 마법사를 먼저 완료하세요.");
  }

  // RTF 문서 래퍼 (한글 코드페이지 949, 맑은 고딕 · 한글 charset)
  const header =
    `{\\rtf1\\ansi\\ansicpg949\\deff0\\deflang1042` +
    `{\\fonttbl{\\f0\\fnil\\fcharset129 Malgun Gothic;}{\\f1\\fnil\\fcharset129 \\uc0\\u47569 \\u51008  \\u44256 \\u46357 ;}}` +
    `{\\colortbl;\\red79\\green70\\blue229;\\red238\\green242\\blue255;}` +
    `\\viewkind4\\uc1\\f0 `;
  return header + c + "}";
}
