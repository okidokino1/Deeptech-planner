// 사업계획서 → Word(.docx) 변환기 (docx v9)
// 정부 R&D 딥테크 사업계획서 양식에 맞춘 문서를 생성한다.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { PlanningProject } from "./planningStore";
import type { ArchModule } from "./planning";

const FONT = "맑은 고딕";

function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, size: 30, font: FONT })],
  });
}
function h2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT })],
  });
}
function body(text: string, opts: { bold?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 90, line: 300 },
    children: [new TextRun({ text: text || "", bold: opts.bold, size: 22, font: FONT })],
  });
}
function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60, line: 290 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

function cell(text: string, opts: { bold?: boolean; width?: number; shade?: boolean } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { fill: "EEF2FF" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [
      new Paragraph({ children: [new TextRun({ text: text || "-", bold: opts.bold, size: 18, font: FONT })] }),
    ],
  });
}

// 모듈별 요약표 (모듈 · Input · Processing · AI모델 · 학습방법 · Output)
function moduleSummaryTable(modules: ArchModule[]): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("모듈", { bold: true, width: 20, shade: true }),
      cell("Input", { bold: true, width: 18, shade: true }),
      cell("Processing", { bold: true, width: 22, shade: true }),
      cell("AI 모델", { bold: true, width: 14, shade: true }),
      cell("학습방법", { bold: true, width: 14, shade: true }),
      cell("Output", { bold: true, width: 12, shade: true }),
    ],
  });
  const rows = modules.map(
    (m) =>
      new TableRow({
        children: [
          cell(`${m.id}. ${m.name}`, { bold: true }),
          cell(m.input),
          cell(m.processing),
          cell(m.aiModels),
          cell(m.learningMethod),
          cell(m.output),
        ],
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "C7D2FE" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "C7D2FE" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "C7D2FE" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "C7D2FE" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
    rows: [header, ...rows],
  });
}

function moduleDetail(m: ArchModule): Paragraph[] {
  return [
    h2(`${m.id}. ${m.name}`),
    body("정의: " + m.role),
    body("적용 AI 모델: " + m.aiModels),
    body("Input: " + m.input),
    body("Processing: " + m.processing),
    body("학습·개발 방식: " + m.learningMethod),
    body("Output: " + m.output),
    ...(m.metrics ? [body("정량 성능 목표: " + m.metrics)] : []),
    ...(m.rationale ? [body("모델 선정 근거: " + m.rationale)] : []),
  ];
}

export async function buildPlanDocx(project: PlanningProject): Promise<Buffer> {
  const a = project.artifacts;
  const plan = a.plan;
  const arch = a.architecture;
  const children: (Paragraph | Table)[] = [];

  const title = plan?.titleCandidates?.[0] || project.title;

  // 표지 제목
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [new TextRun({ text: "딥테크 정부지원사업 연구개발계획서", bold: true, size: 24, color: "4F46E5", font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [new TextRun({ text: title, bold: true, size: 36, font: FONT })],
    })
  );

  if (plan) {
    // 0. 모듈별 요약표
    if (plan.summaryTable?.length) {
      children.push(h1("0. 모듈별 요약표"));
      children.push(moduleSummaryTable(plan.summaryTable));
    }
    // 1. 과제명 후보
    children.push(h1("1. 연구개발 과제명(후보)"));
    plan.titleCandidates?.forEach((t, i) => children.push(body(`후보 ${i + 1}. ${t}`)));

    // 2. 필요성
    children.push(h1("2. 연구개발의 필요성"));
    plan.necessity?.forEach((n, i) => {
      children.push(h2(`2-${i + 1}. ${n.heading}`));
      children.push(body(n.body));
    });

    // 3. 운영 시스템 흐름
    children.push(h1("3. 운영 시스템 흐름"));
    children.push(body(plan.systemFlow));

    // 4. 연구개발 프로세스
    children.push(h1("4. 연구개발 프로세스"));
    plan.processDetail?.forEach((m) => moduleDetail(m).forEach((p) => children.push(p)));

    // 5. 기술 차별성
    if (a.differentiators?.length) {
      children.push(h1("5. 기술 차별성 및 핵심 IP"));
      a.differentiators.forEach((d) => {
        children.push(h2(`${d.id}. ${d.title}`));
        children.push(body(d.description));
        children.push(body("근거: " + d.rationale));
      });
    }

    // 6. 시스템 아키텍처
    if (arch) {
      children.push(h1("6. 시스템 아키텍처"));
      children.push(body(arch.overview));
      arch.layers?.forEach((l) => children.push(bullet(`${l.name} — ${l.description}`)));
      if (arch.techStack?.length) {
        children.push(h2("기술 스택"));
        arch.techStack.forEach((s) => children.push(bullet(`${s.layer}: ${s.tech}`)));
      }
    }

    // 7. 사업화 전략
    children.push(h1("7. 사업화 및 시장 진입 전략"));
    children.push(body(plan.marketStrategy));

    // 8. 추진 체계
    children.push(h1("8. 추진 체계 및 팀 구성"));
    children.push(body(plan.teamPlan));
    if (project.input.founder) {
      children.push(h2("대표자 이력"));
      children.push(body(project.input.founder));
    }
    if (project.input.team) {
      children.push(h2("팀원 구성"));
      children.push(body(project.input.team));
    }
  } else {
    children.push(body("아직 사업계획서가 완성되지 않았습니다. 기술기획 마법사를 먼저 완료하세요."));
  }

  const doc = new Document({
    creator: "딥테크 플래너 · 기술기획 스튜디오",
    title,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
