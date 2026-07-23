// 사업계획서 → 한글 네이티브 포맷(.hwpx / OWPML) 변환기
// .hwpx 는 OWPML XML들을 담은 ZIP 컨테이너다. 한글(Hangul) 2014 이상에서 네이티브로 열린다.
// (진짜 .hwp 바이너리는 한컴 독점이라 생성 불가 → 표준 개방포맷 .hwpx 로 제공)

import JSZip from "jszip";
import type { PlanningProject } from "./planningStore";
import type { ArchModule } from "./planning";

// XML 텍스트 이스케이프 (제어문자 제거 + 특수문자 이스케이프)
function x(s: string | undefined): string {
  return (s || "")
    .replace(/\r?\n+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 문단: charPr(글자모양) / paraPr(문단모양) ID 참조.
// linesegarray(줄 레이아웃 캐시)는 넣지 않는다 → 한글이 열 때 줄바꿈을 스스로 계산하도록.
// (고정 lineseg를 넣으면 긴 문단이 한 줄에 강제로 채워져 글자가 벌어지는 문제 발생)
function p(text: string, charId = 0, paraId = 0, secPr = ""): string {
  return (
    `<hp:p id="0" paraPrIDRef="${paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="${charId}">${secPr}<hp:t>${x(text)}</hp:t></hp:run>` +
    `</hp:p>`
  );
}

// 모듈 블록 (제목 + 항목들)
function moduleBlock(m: ArchModule): string {
  const row = (k: string, v: string) => p(`${k}: ${v}`, 0, 0);
  return (
    p(`${m.id}. ${m.name}`, 2, 0) +
    row("정의", m.role) +
    row("적용 AI 모델", m.aiModels) +
    row("Input", m.input) +
    row("Processing", m.processing) +
    row("학습·개발 방식", m.learningMethod) +
    row("Output", m.output) +
    (m.metrics ? row("정량 성능 목표", m.metrics) : "") +
    (m.rationale ? row("모델 선정 근거", m.rationale) : "")
  );
}

// ── 표(테이블) ──────────────────────────────────────────────────────────────
const COLW = [7000, 6200, 9320, 6000, 7000, 7000]; // 6열, 합계 42520 HWPUNIT
const TBLW = 42520;

function cellPara(text: string, charId: number): string {
  return (
    `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="${charId}"><hp:t>${x(text)}</hp:t></hp:run>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="800" textheight="800" baseline="680" spacing="430" horzpos="0" horzsize="6000" flags="393216"/></hp:linesegarray>` +
    `</hp:p>`
  );
}

function cell(text: string, col: number, row: number, w: number, h: number, isHeader: boolean): string {
  const bf = isHeader ? 4 : 3; // 4=헤더(음영), 3=일반 (둘 다 실선)
  const cid = isHeader ? 6 : 5; // 6=작은 볼드, 5=작은 본문
  return (
    `<hp:tc name="" header="${isHeader ? 1 : 0}" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="${bf}">` +
    `<hp:cellAddr colAddr="${col}" rowAddr="${row}"/>` +
    `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
    `<hp:cellSz width="${w}" height="${h}"/>` +
    `<hp:cellMargin left="141" right="141" top="70" bottom="70"/>` +
    `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
    cellPara(text, cid) +
    `</hp:subList></hp:tc>`
  );
}

function hwpxTable(headers: string[], rows: string[][]): string {
  const C = headers.length;
  const headH = 1400;
  const bodyH = 3600;
  const totalH = headH + bodyH * rows.length;
  let trs = `<hp:tr>` + headers.map((hd, c) => cell(hd, c, 0, COLW[c] || 6000, headH, true)).join("") + `</hp:tr>`;
  rows.forEach((r, ri) => {
    trs += `<hp:tr>` + r.map((v, c) => cell(v, c, ri + 1, COLW[c] || 6000, bodyH, false)).join("") + `</hp:tr>`;
  });
  return (
    `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="0">` +
    `<hp:tbl id="1" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length + 1}" colCnt="${C}" cellSpacing="0" borderFillIDRef="3" noAdjust="0">` +
    `<hp:sz width="${TBLW}" widthRelTo="ABSOLUTE" height="${totalH}" heightRelTo="ABSOLUTE" protect="0"/>` +
    `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
    `<hp:outMargin left="0" right="0" top="0" bottom="0"/>` +
    `<hp:inMargin left="141" right="141" top="141" bottom="141"/>` +
    trs +
    `</hp:tbl></hp:run>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1100" textheight="1100" baseline="935" spacing="600" horzpos="0" horzsize="42520" flags="1441792"/></hp:linesegarray>` +
    `</hp:p>`
  );
}

// ── 섹션 본문 (section0.xml) 문단 생성 ──────────────────────────────────────
function buildParagraphs(project: PlanningProject): string {
  const a = project.artifacts;
  const plan = a.plan;
  const arch = a.architecture;
  const diffs = a.differentiators || [];
  const title = plan?.titleCandidates?.[0] || project.title;

  let s = "";
  // 표지 (첫 문단에 secPr 포함)
  s += p("딥테크 정부지원사업 연구개발계획서", 3, 1, SECPR);
  s += p(title, 4, 1);

  if (plan) {
    if (plan.summaryTable?.length) {
      s += p("0. 모듈별 요약표", 1, 0);
      s += hwpxTable(
        ["모듈", "Input", "Processing", "AI 모델", "학습방법", "Output"],
        plan.summaryTable.map((m) => [`${m.id}. ${m.name}`, m.input, m.processing, m.aiModels, m.learningMethod, m.output])
      );
    }
    s += p("1. 연구개발 과제명(후보)", 1, 0);
    plan.titleCandidates?.forEach((t, i) => (s += p(`후보 ${i + 1}. ${t}`, 0, 0)));

    s += p("2. 연구개발의 필요성", 1, 0);
    plan.necessity?.forEach((n, i) => {
      s += p(`2-${i + 1}. ${n.heading}`, 2, 0);
      s += p(n.body, 0, 0);
    });

    s += p("3. 운영 시스템 흐름", 1, 0);
    s += p(plan.systemFlow, 0, 0);

    s += p("4. 연구개발 프로세스", 1, 0);
    plan.processDetail?.forEach((m) => (s += moduleBlock(m)));

    if (diffs.length) {
      s += p("5. 기술 차별성 및 핵심 IP", 1, 0);
      diffs.forEach((d) => {
        s += p(`${d.id}. ${d.title}`, 2, 0);
        s += p(d.description, 0, 0);
        s += p(`근거: ${d.rationale}`, 0, 0);
      });
    }

    if (arch) {
      s += p("6. 시스템 아키텍처", 1, 0);
      s += p(arch.overview, 0, 0);
      arch.layers?.forEach((l) => (s += p(`· ${l.name} — ${l.description}`, 0, 0)));
      if (arch.techStack?.length) {
        s += p("기술 스택", 2, 0);
        arch.techStack.forEach((t) => (s += p(`· ${t.layer}: ${t.tech}`, 0, 0)));
      }
    }

    s += p("7. 사업화 및 시장 진입 전략", 1, 0);
    s += p(plan.marketStrategy, 0, 0);
    s += p("8. 추진 체계 및 팀 구성", 1, 0);
    s += p(plan.teamPlan, 0, 0);
    if (project.input.founder) {
      s += p("대표자 이력", 2, 0);
      s += p(project.input.founder, 0, 0);
    }
    if (project.input.team) {
      s += p("팀원 구성", 2, 0);
      s += p(project.input.team, 0, 0);
    }
  } else {
    s += p("아직 사업계획서가 완성되지 않았습니다.", 0, 0, SECPR);
  }
  return s;
}

// 섹션 속성 (A4, 여백) — 첫 문단 첫 run 안에 위치
const SECPR =
  `<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">` +
  `<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0" strtnum="0"/>` +
  `<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>` +
  `<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>` +
  `<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>` +
  `<hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY">` +
  `<hp:margin header="4252" footer="4252" gutter="0" left="8504" right="8504" top="5668" bottom="4252"/>` +
  `</hp:pagePr>` +
  `<hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="850" belowLine="567" aboveLine="567"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr>` +
  `<hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>` +
  `<hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>` +
  `<hp:pageBorderFill type="EVEN" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>` +
  `<hp:pageBorderFill type="ODD" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>` +
  `</hp:secPr>`;

// ── header.xml 조각 ─────────────────────────────────────────────────────────
const LANGS = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"];

function fontfaces(): string {
  const face = (lang: string) =>
    `<hh:fontface lang="${lang}" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0">` +
    `<hh:typeInfo familyType="FCAT_GOTHIC" weight="8" proportion="0" contrast="0" strokeVariation="0" armStyle="0" letterform="0" midline="0" xHeight="0"/></hh:font></hh:fontface>`;
  return `<hh:fontfaces itemCnt="${LANGS.length}">${LANGS.map(face).join("")}</hh:fontfaces>`;
}

function fontRefBlock(): string {
  const seven = (v: string) => `hangul="${v}" latin="${v}" hanja="${v}" japanese="${v}" other="${v}" symbol="${v}" user="${v}"`;
  return (
    `<hh:fontRef ${seven("0")}/>` +
    `<hh:ratio ${seven("100")}/>` +
    `<hh:spacing ${seven("0")}/>` +
    `<hh:relSz ${seven("100")}/>` +
    `<hh:offset ${seven("0")}/>`
  );
}

function charPr(id: number, height: number, bold: boolean): string {
  return (
    `<hh:charPr id="${id}" height="${height}" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">` +
    fontRefBlock() +
    (bold ? `<hh:bold/>` : ``) +
    `</hh:charPr>`
  );
}

function borderFill(id: number): string {
  return (
    `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">` +
    `<hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>` +
    `<hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>` +
    `<hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>` +
    `<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>` +
    `<hc:fillBrush><hc:winBrush faceColor="none" hatchColor="#999999" alpha="0"/></hc:fillBrush>` +
    `</hh:borderFill>`
  );
}

// 실선 테두리 셀용 borderFill (fill="none"이면 배경 없음)
function solidFill(id: number, fill: string): string {
  const b = (side: string) => `<hh:${side} type="SOLID" width="0.12 mm" color="#000000"/>`;
  const brush =
    fill === "none"
      ? `<hc:winBrush faceColor="none" hatchColor="#999999" alpha="0"/>`
      : `<hc:winBrush faceColor="${fill}" hatchColor="#333333" alpha="0"/>`;
  return (
    `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">` +
    `<hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>` +
    b("leftBorder") + b("rightBorder") + b("topBorder") + b("bottomBorder") +
    `<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>` +
    `<hc:fillBrush>${brush}</hc:fillBrush>` +
    `</hh:borderFill>`
  );
}

function paraPr(id: number, align: string): string {
  return (
    `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">` +
    `<hh:align horizontal="${align}" vertical="BASELINE"/>` +
    `<hh:heading type="NONE" idRef="0" level="0"/>` +
    `<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>` +
    `<hh:autoSpacing eAsianEng="0" eAsianNum="0"/>` +
    `<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="100" unit="HWPUNIT"/></hh:margin>` +
    `<hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>` +
    `<hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>` +
    `</hh:paraPr>`
  );
}

function headerXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" version="1.4" secCnt="1">` +
    `<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>` +
    `<hh:refList>` +
    fontfaces() +
    `<hh:borderFills itemCnt="4">${borderFill(1)}${borderFill(2)}${solidFill(3, "none")}${solidFill(4, "#EEF2FF")}</hh:borderFills>` +
    `<hh:charProperties itemCnt="7">${charPr(0, 1100, false)}${charPr(1, 1500, true)}${charPr(2, 1300, true)}${charPr(3, 1200, true)}${charPr(4, 1900, true)}${charPr(5, 800, false)}${charPr(6, 800, true)}</hh:charProperties>` +
    `<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>` +
    `<hh:numberings itemCnt="0"/>` +
    `<hh:paraProperties itemCnt="2">${paraPr(0, "JUSTIFY")}${paraPr(1, "CENTER")}</hh:paraProperties>` +
    `<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>` +
    `</hh:refList>` +
    `</hh:head>`
  );
}

function sectionXml(project: PlanningProject): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">` +
    buildParagraphs(project) +
    `</hs:sec>`
  );
}

// ── ZIP 조립 ────────────────────────────────────────────────────────────────
export async function buildPlanHwpx(project: PlanningProject): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype 은 반드시 첫 항목 + 무압축(STORE)
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });

  zip.file(
    "version.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="0" buildNumber="0" os="1" xmlVersion="1.4" application="Hancom Office Hangul" appVersion="9.1.1.0"/>`
  );

  zip.file(
    "settings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="http://www.hancom.co.kr/hwpml/2011/config-item">` +
      `<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`
  );

  const metaInf = zip.folder("META-INF")!;
  metaInf.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">` +
      `<ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>`
  );
  metaInf.file(
    "manifest.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" version="1.4">` +
      `<odf:file-entry full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>` +
      `<odf:file-entry full-path="Contents/header.xml" media-type="application/xml"/>` +
      `<odf:file-entry full-path="Contents/section0.xml" media-type="application/xml"/>` +
      `<odf:file-entry full-path="settings.xml" media-type="application/xml"/>` +
      `<odf:file-entry full-path="version.xml" media-type="application/xml"/></odf:manifest>`
  );

  const contents = zip.folder("Contents")!;
  const title = project.artifacts.plan?.titleCandidates?.[0] || project.title;
  contents.file(
    "content.hpf",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<hpf:HWPMLPackage xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:dc="http://purl.org/dc/elements/1.1/" version="1.4" unitsperinch="7200">` +
      `<hpf:head><hpf:metadata><opf:title>${x(title)}</opf:title><opf:language>ko</opf:language></hpf:metadata><hpf:mapping/></hpf:head>` +
      `<opf:manifest>` +
      `<opf:item id="header" href="Contents/header.xml" media-type="application/xml" isEmbeded="0"/>` +
      `<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml" isEmbeded="0"/>` +
      `<opf:item id="settings" href="settings.xml" media-type="application/xml" isEmbeded="0"/>` +
      `</opf:manifest>` +
      `<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine>` +
      `</hpf:HWPMLPackage>`
  );
  contents.file("header.xml", headerXml());
  contents.file("section0.xml", sectionXml(project));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }) as Promise<Buffer>;
}
