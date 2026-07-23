// AI 모델 선정 지식베이스
//
// 문제: 기존에는 프롬프트에 모델 선택 지침이 없어, 생성 결과가 어떤 사업 분야든
//       "딥러닝(CNN/LSTM), NLP, 강화학습" 수준의 뭉뚱그린 표현으로 수렴했다.
//       (데모 폴백은 아예 5개 패턴이 하드코딩되어 있었다.)
//
// 해결: 과업(task) 유형별로 실제 쓰이는 구체 모델과 표준 평가지표를 카탈로그로 제공하고,
//       "이 목록에서 고르되 목록은 하한선일 뿐이니 더 적합한 최신 모델이 있으면 그것을
//       쓰라"고 지시한다. 선정 근거와 정량 목표를 함께 요구해 심사 설득력을 높인다.
//
// 근거: 정부지원 선정 계획서(2억/1.3천만원) 분석 결과, 합격 계획서는 예외 없이
//       HRNet-W48 / BiRefNet / ControlNet / LoRA / LightGBM 처럼 과업에 맞는 구체
//       모델명과 MAE·IoU·PCK·AP 같은 표준 지표를 명시하고 있었다.

export interface ModelTask {
  id: string;
  label: string; // 과업명
  models: string; // 대표 모델·기법 (구체 명칭)
  metrics: string; // 표준 평가지표
}

// 과업 유형별 카탈로그 — 특정 산업에 한정되지 않도록 모달리티 전체를 포괄한다.
export const MODEL_TASKS: ModelTask[] = [
  // --- 비전 ---
  {
    id: "vision-classify",
    label: "이미지 분류·인식",
    models: "ViT, Swin Transformer, ConvNeXt, EfficientNetV2, CLIP(제로샷), DINOv2(자기지도 백본)",
    metrics: "Top-1/Top-5 Accuracy, F1, AUROC",
  },
  {
    id: "vision-detect",
    label: "객체 검출",
    models: "YOLO 계열(v8~v11), RT-DETR, DINO-DETR, Faster R-CNN, Grounding DINO(개방어휘)",
    metrics: "mAP@0.5, mAP@0.5:0.95, Recall",
  },
  {
    id: "vision-segment",
    label: "영역 분할(세그멘테이션)",
    models: "SAM/SAM2, BiRefNet, Mask2Former, U-Net(의료·산업), SegFormer, DeepLabv3+",
    metrics: "IoU, Dice, Boundary F1",
  },
  {
    id: "vision-keypoint",
    label: "키포인트·자세 추정",
    models: "HRNet-W48, ViTPose, OpenPose, MediaPipe Pose, RTMPose",
    metrics: "PCK, OKS, MPJPE, MAE(mm/cm)",
  },
  {
    id: "vision-ocr",
    label: "문서 인식·OCR·문서이해",
    models: "PaddleOCR, TrOCR, Donut, LayoutLMv3, Surya, EasyOCR(한글)",
    metrics: "CER, WER, Field-level F1",
  },
  {
    id: "vision-anomaly",
    label: "이상탐지(영상·제조 검사)",
    models: "PatchCore, PaDiM, FastFlow, EfficientAD, Autoencoder 기반",
    metrics: "Image/Pixel AUROC, PRO, False Alarm Rate",
  },
  {
    id: "vision-depth3d",
    label: "깊이·3D 복원",
    models: "Depth Anything V2, MiDaS, NeRF, 3D Gaussian Splatting, COLMAP",
    metrics: "AbsRel, RMSE, PSNR/SSIM",
  },
  // --- 음성 ---
  {
    id: "speech-asr",
    label: "음성인식(STT)",
    models: "Whisper large-v3, Distil-Whisper, wav2vec 2.0, Conformer, NeMo Parakeet",
    metrics: "WER, CER, RTF(실시간계수)",
  },
  {
    id: "speech-tts",
    label: "음성합성·음성변환",
    models: "VITS, XTTS-v2, StyleTTS2, Bark, RVC(음색변환)",
    metrics: "MOS, MCD, WER(합성음 인식률)",
  },
  {
    id: "speech-analysis",
    label: "발화 분석·화자·감정",
    models: "pyannote.audio(화자분리), ECAPA-TDNN(화자인식), openSMILE/eGeMAPS(운율), WavLM",
    metrics: "DER, EER, UAR, Pearson r(사람 평가 상관)",
  },
  // --- 언어 ---
  {
    id: "nlp-llm",
    label: "생성·요약·대화(LLM)",
    models: "Claude, GPT 계열, Gemini, Llama 3.x, Qwen2.5, Mistral, 한국어 특화(EEVE, KULLM, Polyglot-Ko)",
    metrics: "ROUGE, BERTScore, G-Eval/LLM-as-judge, 인간평가 승률",
  },
  {
    id: "nlp-understand",
    label: "분류·개체명·관계추출",
    models: "KoELECTRA, KLUE-RoBERTa, DeBERTa-v3, KoBERT, spaCy 파이프라인",
    metrics: "Macro-F1, Precision/Recall, Cohen's kappa",
  },
  {
    id: "nlp-rag",
    label: "검색증강생성(RAG)·임베딩",
    models: "BGE-M3, E5-mistral, KoSimCSE, ColBERT-v2, Reranker(bge-reranker), FAISS/pgvector",
    metrics: "Recall@k, nDCG, MRR, Faithfulness/Groundedness",
  },
  // --- 정형·시계열 ---
  {
    id: "tabular",
    label: "정형데이터 예측·스코어링",
    models: "XGBoost, LightGBM, CatBoost, TabNet, FT-Transformer, ElasticNet(선형 보정)",
    metrics: "AUC, MAE/RMSE, Lift, KS 통계량",
  },
  {
    id: "timeseries",
    label: "시계열 예측·수요예측",
    models: "Temporal Fusion Transformer, PatchTST, N-BEATS, Prophet, LSTM/GRU, Chronos",
    metrics: "MAPE, sMAPE, MASE, RMSE",
  },
  {
    id: "ts-anomaly",
    label: "시계열 이상탐지·예지보전",
    models: "Isolation Forest, LSTM-AE, USAD, Anomaly Transformer, Matrix Profile",
    metrics: "F1, Point-adjusted F1, 조기탐지 리드타임",
  },
  // --- 추천·최적화 ---
  {
    id: "recsys",
    label: "추천·개인화",
    models: "Two-Tower, SASRec/BERT4Rec(순차), LightGCN, DeepFM, Contextual Bandit(LinUCB/Thompson)",
    metrics: "Recall@k, nDCG, CTR, 전환율 리프트",
  },
  {
    id: "rl-opt",
    label: "강화학습·의사결정 최적화",
    models: "PPO, SAC, DQN, Offline RL(CQL/IQL), OR-Tools(제약최적화), 유전알고리즘",
    metrics: "누적보상, 정책 개선율, 제약 위반율, 대조군 대비 개선",
  },
  {
    id: "edu-dkt",
    label: "학습자 지식추적·적응형 학습",
    models: "DKT, SAKT, AKT, Bayesian Knowledge Tracing, IRT(문항반응이론)",
    metrics: "AUC, RMSE, 학습효율(목표도달 시간 단축률)",
  },
  // --- 생성·멀티모달 ---
  {
    id: "genai-image",
    label: "이미지 생성·편집",
    models: "Stable Diffusion XL/3, FLUX, ControlNet(구조제어), LoRA/DreamBooth(맞춤학습), IP-Adapter, Inpainting",
    metrics: "FID, CLIP-Score, 사용자 선호도 A/B",
  },
  {
    id: "multimodal",
    label: "멀티모달 이해(VLM)",
    models: "Claude Vision, GPT-4o 계열, Qwen2-VL, InternVL, LLaVA, Florence-2",
    metrics: "과업별 Accuracy/F1, 환각률(Hallucination Rate)",
  },
  // --- 데이터·서빙 공통 ---
  {
    id: "finetune",
    label: "학습·튜닝 전략",
    models: "LoRA/QLoRA, PEFT, 지식증류(Distillation), 준지도학습, Active Learning, Human-in-the-Loop 검수",
    metrics: "데이터 효율(라벨 대비 성능), 학습비용, 파라미터 대비 성능",
  },
  {
    id: "serving",
    label: "서빙·최적화",
    models: "ONNX Runtime, TensorRT, vLLM, Triton Inference Server, 양자화(INT8/AWQ)",
    metrics: "p95 지연시간, 처리량(QPS), GPU 메모리, 단가(원/건)",
  },
];

// 프롬프트에 주입할 카탈로그 텍스트
function catalogText(): string {
  return MODEL_TASKS.map(
    (t) => `- ${t.label}: ${t.models}\n  · 평가지표: ${t.metrics}`
  ).join("\n");
}

// 모델 선정 지침 — 아키텍처/차별화/초안/계획서 프롬프트에 공통 주입한다.
export function modelSelectionGuide(): string {
  return `[AI 모델 선정 지침 — 반드시 준수]
아래는 과업 유형별 실제 사용 모델 카탈로그입니다. **이 목록은 하한선이며 상한선이 아닙니다.**
사업 분야와 데이터 특성에 더 적합한 모델(카탈로그에 없는 최신 모델 포함)이 있다면 그것을 우선 선택하세요.

${catalogText()}

[선정 규칙]
1. "딥러닝", "AI 모델", "머신러닝", "NLP" 같은 뭉뚱그린 표현을 절대 쓰지 마세요.
   반드시 **구체적인 모델명**을 쓰세요. (예: "딥러닝" ✕ → "HRNet-W48 기반 키포인트 검출" ○)
2. 모듈마다 그 과업에 **가장 적합한 모델**을 고르세요. 모든 모듈에 같은 계열 모델을
   반복 적용하지 마세요. 과업이 다르면 모델도 달라야 합니다.
3. 각 모듈에는 **선정 근거(rationale)**를 쓰세요. 검토한 대안 모델을 1~2개 명시하고,
   왜 그 대안이 아니라 이 모델을 선택했는지 데이터·정확도·지연시간·비용 관점에서 설명하세요.
4. 각 모듈에는 **정량 목표(metrics)**를 쓰세요. 해당 과업의 표준 지표를 사용하고
   구체적 수치 목표를 제시하세요. (예: "IoU 0.85 이상", "WER 8% 이하", "MAE ±0.5cm 이하")
   근거 없는 정확도 99% 같은 과장 수치는 쓰지 마세요.
5. 오픈소스 기반 위에 자사 고유 알고리즘을 결합하는 구조를 권장합니다.
   (선정 계획서 공통 패턴: 오픈소스로 기본 구성 → 자사 보정·최적화 모듈로 차별화)
6. 학습 전략과 서빙 방식도 구체적으로 쓰세요. (LoRA 파인튜닝, Human-in-the-Loop 검수,
   INT8 양자화 후 TensorRT 서빙 등)`;
}

// 정부 R&D 심사 통과 계획서의 서술 규범 — 선정된 계획서 2건 분석에서 도출.
export const WINNING_PLAN_STYLE = `[정부지원 선정 계획서 서술 규범 — 실제 선정 사례 기반]
1. 과제명은 "[핵심기술] 및 [핵심기술]을 활용한 [도메인] [산출물] 자동화/고도화 기술 개발"
   형태로, 기술 요소가 과제명에 드러나게 쓰세요.
2. 필요성은 (산업 구조적 문제) → (기존 기술의 한계) → (그래서 본 과제가 필요) 순서로 쓰고,
   가능한 곳에는 시장 규모·성장률·비용 같은 정량 근거를 넣으세요.
3. 목표는 반드시 측정 가능한 수치로 쓰세요. ("정확도 향상" ✕ → "평균 오차 ±0.5cm 이하" ○)
4. 개발 방법은 모듈형 설계(Modular Decomposition)로 쓰고, 각 모듈을 ①②③ 번호로 구분해
   입력→처리→출력이 서로 연결되는 파이프라인임을 보이세요.
5. 단일 모델의 성능 개선이 아니라, 현장에서 반복 사용 가능한 시스템을 구현한다는 관점으로
   서술하세요. 심사위원은 실용성과 실증 가능성을 봅니다.
6. 팀 구성은 (대표자 총괄 역량) → (내부 개발 인력의 담당 기술) → (외부 전문가 자문) 3단으로
   쓰고, 보유 데이터·선행 경험을 학습데이터 확보와 연결하세요.
7. 사업화는 목표시장 규모(TAM)와 연평균성장률(CAGR)을 출처와 함께 제시하고,
   초기 진입(B2B 실증) → 확장(SaaS 구독) 단계로 서술하세요.`;
