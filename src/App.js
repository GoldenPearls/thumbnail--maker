const { useState, useRef, useEffect } = React;

/** 이미지 로더 */
const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로딩 실패: ${src}`));
    img.src = src;
  });

/* -----------------------------
   유틸
------------------------------ */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const hexToRgb = (hex) => {
  const h = (hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const mixWithWhite = (hex, mix = 0.68) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const m = clamp(mix, 0, 1);
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * m),
    g: Math.round(rgb.g + (255 - rgb.g) * m),
    b: Math.round(rgb.b + (255 - rgb.b) * m),
  };
};

const makeBadgeBgFromBg = (bgHex, { mix = 0.68, alpha = 0.92 } = {}) => {
  const rgb = mixWithWhite(bgHex, mix);
  if (!rgb) return "rgba(255, 247, 235, 0.92)";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
};

const makeBadgeTextFromBg = (bgHex, strength = 0.72) => {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#5a3d2b";
  const s = clamp(strength, 0, 1);
  return `rgb(${Math.round(rgb.r * (1 - s))}, ${Math.round(
    rgb.g * (1 - s)
  )}, ${Math.round(rgb.b * (1 - s))})`;
};

/* -----------------------------
   ✅ 하이라이트 프리셋(카테고리별 2톤)
------------------------------ */
const HIGHLIGHT_PRESETS = {
  "🎡 놀거리": { line1: "#FFF3EC", line2: "#FFE1D6" },
  "☕ 카페": { line1: "#F7F1EA", line2: "#EADFD6" },
  "🍰 디저트": { line1: "#FFF2CC", line2: "#FFD6E8" },
  "💄 뷰티": { line1: "#FFF0F6", line2: "#FFD1E5" },
  "✈️ 여행": { line1: "#EEF6FF", line2: "#DCEEFF" },
  "📦 제품리뷰": { line1: "#F3F4F6", line2: "#E7E9EE" },
  "🎭 연극": { line1: "#F5F0FF", line2: "#E8DDFF" },
  "🍜 음식": { line1: "#FFF7EB", line2: "#FFE2C9" },
  "🎬 영화": { line1: "#1F2A44", line2: "#2F3B57" },
  "🍷 술": { line1: "#E9FBFF", line2: "#D6FFF8" },
};

/* -----------------------------
   ✅ 하이라이트/리본 그리기
------------------------------ */
const getLines = (text) =>
  (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const roundedRectPath = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const drawTextHighlight = (
  ctx,
  {
    lines,
    x,
    yCenter,
    lineHeight,
    align = "center",
    padX = 26,
    padY = 16,
    radius = 26,
    fill = "rgba(255,255,255,0.86)",

    // ✅ 라인별 색(우선)
    fills = null,

    mode = "pill", // "pill" | "stripe"
    stripeSkew = 10,
    shadow = true,
  }
) => {
  const totalH = lines.length * lineHeight;
  const startY = yCenter - totalH / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    const metrics = ctx.measureText(line);
    const textW = metrics.width;

    let leftX;
    if (align === "left") leftX = x;
    else if (align === "right") leftX = x - textW;
    else leftX = x - textW / 2;

    const boxX = leftX - padX;
    const boxY = startY + i * lineHeight - lineHeight / 2 - padY / 2;
    const boxW = textW + padX * 2;
    const boxH = lineHeight + padY;

    ctx.save();
    if (shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
    }

    ctx.fillStyle = fills && fills[i] ? fills[i] : fill;

    if (mode === "stripe") {
      ctx.beginPath();
      ctx.moveTo(boxX + stripeSkew, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW - stripeSkew, boxY + boxH);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.closePath();
      ctx.fill();
    } else {
      roundedRectPath(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();
    }

    ctx.restore();
  });
};

const drawMultilineText = (ctx, lines, x, yCenter, lineHeight) => {
  const totalH = lines.length * lineHeight;
  const startY = yCenter - totalH / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.fillText(line, x, y);
  });
};

/* -----------------------------
   템플릿 6종 (select)
------------------------------ */
const THEMES = {
  A_PAPER_CLASSIC: {
    name: "A 종이카드(기본)",
    frameMargin: 40,
    frameR: 60,
    photoVail: true,
    bottomGrad: true,
    cardFill: "rgba(255, 247, 235, 0.94)",
    cardDash: true,
    titleDefaultColor: "#4a2f1f",
    titleAlign: "center",
    titleBaseSize: 94,
    sticker: { w: 190, h: 190, offsetX: 5, offsetY: -100, rotateDeg: -10 },
  },

  B_PAPER_BOLD: {
    name: "B 종이카드(진한 제목)",
    frameMargin: 36,
    frameR: 60,
    photoVail: true,
    bottomGrad: true,
    cardFill: "rgba(255, 247, 235, 0.96)",
    cardDash: true,
    titleDefaultColor: "#2f1d12",
    titleAlign: "center",
    titleBaseSize: 102,
    sticker: { w: 190, h: 190, offsetX: 10, offsetY: -110, rotateDeg: -8 },
  },

  C_MINIMAL: {
    name: "C 미니멀(깔끔)",
    frameMargin: 52,
    frameR: 54,
    photoVail: false,
    bottomGrad: false,
    cardFill: "rgba(255, 255, 255, 0.92)",
    cardDash: false,
    titleDefaultColor: "#2a211b",
    titleAlign: "left",
    titleBaseSize: 86,
    sticker: { w: 160, h: 160, offsetX: 0, offsetY: -85, rotateDeg: -10 },
  },

  D_DARK: {
    name: "D 다크(영화/밤)",
    frameMargin: 40,
    frameR: 60,
    photoVail: false,
    bottomGrad: true,
    cardFill: "rgba(0,0,0,0.40)",
    cardDash: false,
    titleDefaultColor: "#ffffff",
    titleAlign: "left",
    titleBaseSize: 86,
    sticker: { w: 170, h: 170, offsetX: 0, offsetY: -90, rotateDeg: -8 },
  },

  E_POSTER: {
    name: "E 포스터(공연)",
    frameMargin: 40,
    frameR: 60,
    photoVail: false,
    bottomGrad: true,
    cardFill: "rgba(0,0,0,0.33)",
    cardDash: false,
    titleDefaultColor: "#fff7e8",
    titleAlign: "center",
    titleBaseSize: 92,
    sticker: { w: 180, h: 180, offsetX: 0, offsetY: -95, rotateDeg: -10 },
  },

  F_TOP_TITLE: {
    name: "F 상단 타이틀(가벼움)",
    frameMargin: 56,
    frameR: 54,
    photoVail: true,
    bottomGrad: false,
    cardFill: "rgba(255, 247, 235, 0.92)",
    cardDash: true,
    titleDefaultColor: "#3a2f24",
    titleAlign: "center",
    titleBaseSize: 88,
    sticker: { w: 170, h: 170, offsetX: 0, offsetY: -90, rotateDeg: -10 },
    cardPos: "mid",
  },
};

const ThumbnailMaker = () => {
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState("🍜 음식");
  const [title, setTitle] = useState("");
  const [selectedFont, setSelectedFont] = useState("YPairing");
  const [result, setResult] = useState(null);

  // ✅ 템플릿 선택
  const [themeKey, setThemeKey] = useState("A_PAPER_CLASSIC");

  // ✅ 폰트 크기(사용자 조절)
  const [titleSize, setTitleSize] = useState(94);

  // ✅ 글씨 색(사용자 지정) - 비어 있으면 템플릿 기본색
  const [titleColor, setTitleColor] = useState("");

  // ✅ 하이라이트(제목 뒤 배경)
  const [hlEnabled, setHlEnabled] = useState(true);
  const [hlMode, setHlMode] = useState("pill"); // "pill" | "stripe"
  const [hlColor, setHlColor] = useState("#FFF7EB");
  const [hlAlpha, setHlAlpha] = useState(0.92);

  // ✅ 라인별 하이라이트
  const [hlPerLine, setHlPerLine] = useState(true);
  const [hlAutoTwoTone, setHlAutoTwoTone] = useState(true);
  const [hlLine1, setHlLine1] = useState("#FFF7EB");
  const [hlLine2, setHlLine2] = useState("#FFE2C9");
  const [hlLine3, setHlLine3] = useState("#EAF7FF");

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * 스티커 경로
   */
  const STICKER_BASE = "./assets";

  /** 카테고리: 라벨(좌상단), 포인트색(점), 스티커 */
  const categories = {
    "🎡 놀거리": { dot: "#E76F51", bg: "#FFF3EC", label: "놀거리노트", sticker: `${STICKER_BASE}/play.png` },
    "☕ 카페": { dot: "#8D6E63", bg: "#F7F1EA", label: "카페노트", sticker: `${STICKER_BASE}/cafe.png` },
    "🍰 디저트": { dot: "#E3A008", bg: "#FFF2CC", label: "디저트일기", sticker: `${STICKER_BASE}/dessert.png` },
    "💄 뷰티": { dot: "#FF5C8A", bg: "#FFF0F6", label: "뷰티노트", sticker: `${STICKER_BASE}/beauty.png` },
    "✈️ 여행": { dot: "#457B9D", bg: "#EEF6FF", label: "여행기록", sticker: `${STICKER_BASE}/travel.png` },
    "📦 제품리뷰": { dot: "#6C757D", bg: "#F3F4F6", label: "사용후기", sticker: `${STICKER_BASE}/product.png` },
    "🎭 연극": { dot: "#6D597A", bg: "#F5F0FF", label: "공연기록", sticker: `${STICKER_BASE}/theater.png` },
    "🍜 음식": { dot: "#D62828", bg: "#FFF0EE", label: "먹데이트", sticker: `${STICKER_BASE}/food.png` },
    "🎬 영화": { dot: "#355070", bg: "#EEF1FF", label: "영화노트", sticker: `${STICKER_BASE}/movie.png` },
    "🍷 술": { dot: "#2EC4B6", bg: "#E9FBFF", label: "오늘의 한 잔", sticker: `${STICKER_BASE}/drink.png` },
  };

  const fonts = [
    { name: "Y페어링 (추천)", value: "YPairing" },
    { name: "배민 한나체", value: '"Black Han Sans"' },
    { name: "도현체", value: '"Do Hyeon"' },
    { name: "고운돋움", value: '"Gowun Dodum"' },
    { name: "땅스부대찌개 (강력추천)", value: "TtangsBudaeJjigae" },
    { name: "눈누 기초고딕 (본문용)", value: "NoonnuBasicGothic" },
    { name: "학교안심 별빛하늘", value: "SchoolSafetyStarrySky" },
    { name: "옹글잎 콩콩체", value: "OngleipKonkon" },
    { name: "학교안심 어항꾸미기", value: "SchoolSafetyAquariumDecor" },
    { name: "케리스케두 라인", value: "KerisKeduLine" },
    { name: "온글잎 박다현체", value: "OngleipParkDahyeon" },
    { name: "밑미 폰트", value: "MitmiFont" },
    { name: "학교안심 별자리", value: "SchoolSafetyConstellation" },
    { name: "넥슨 배찌체", value: "NexonBazzi" },
  ];

  // ✅ 템플릿 바뀌면 폰트 크기 기본값도 같이 바뀌게
  useEffect(() => {
    const t = THEMES[themeKey];
    if (t?.titleBaseSize) setTitleSize(t.titleBaseSize);
    // setTitleColor(""); // 원하면 주석 해제
  }, [themeKey]);

  // ✅ 카테고리 바뀌면: 하이라이트 프리셋 자동 세팅
  useEffect(() => {
    const style = categories[category];

    // 단색 하이라이트 기본색: bg 기반
    setHlColor(style?.bg || "#FFF7EB");

    const preset = HIGHLIGHT_PRESETS[category];
    if (preset) {
      setHlPerLine(true);
      setHlAutoTwoTone(true);
      setHlLine1(preset.line1);
      setHlLine2(preset.line2);
      setHlLine3(preset.line1);
    }

    // (선택) 커스텀 안 했을 때만 글씨색 자동 추천
    if (!titleColor?.trim()) {
      if (category === "🎬 영화") setTitleColor("#FFFFFF");
      else if (category === "📦 제품리뷰") setTitleColor("#2A2A2A");
      else setTitleColor(""); // 템플릿 기본색으로
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const makeThumbnail = async () => {
    if (!image) return;
    await document.fonts.ready;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 1080;
    canvas.height = 1080;

    const style = categories[category];
    const theme = THEMES[themeKey] || THEMES.A_PAPER_CLASSIC;

    // === 0) 전체 배경
    ctx.fillStyle = style.bg || "#f2e8d8";
    ctx.fillRect(0, 0, 1080, 1080);

    // === 1) 사진 영역: 둥근 프레임
    const frameMargin = theme.frameMargin ?? 40;
    const frameX = frameMargin;
    const frameY = frameMargin;
    const frameW = 1080 - frameMargin * 2;
    const frameH = 1080 - frameMargin * 2;
    const frameR = theme.frameR ?? 60;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, frameX + 10, frameY + 10, frameW - 20, frameH - 20, frameR - 10);
    ctx.clip();

    const size = Math.min(image.width, image.height);
    const sx = (image.width - size) / 2;
    const sy = (image.height - size) / 2;
    ctx.drawImage(image, sx, sy, size, size, frameX + 10, frameY + 10, frameW - 20, frameH - 20);

    if (theme.photoVail) {
      const warm = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
      warm.addColorStop(0, "rgba(255, 240, 220, 0.10)");
      warm.addColorStop(1, "rgba(240, 230, 210, 0.18)");
      ctx.fillStyle = warm;
      ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);
    }

    if (theme.bottomGrad) {
      const grad = ctx.createLinearGradient(0, 520, 0, 1080);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = grad;
      ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);
    }

    ctx.restore(); // clip

    // === 2) 좌상단 라벨 (배경 자동 + 너비 자동)
    const badgeX = frameX + 35;
    const badgeY = frameY + 35;
    const badgeH = 86;
    const badgeR = 22;

    ctx.font = `900 44px ${selectedFont}`;
    const labelW = ctx.measureText(style.label).width;

    const dotR = 10;
    const leftPad = 22;
    const rightPad = 26;
    const gap = 16;
    const badgeW = leftPad + dotR * 2 + gap + labelW + rightPad;

    const badgeBg = makeBadgeBgFromBg(style.bg, { mix: 0.68, alpha: 0.92 });
    const badgeTextColor = makeBadgeTextFromBg(style.bg, 0.72);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(badgeX + leftPad + dotR, badgeY + badgeH / 2, dotR, 0, Math.PI * 2);
    ctx.fillStyle = style.dot;
    ctx.fill();

    ctx.fillStyle = badgeTextColor;
    ctx.font = `900 44px ${selectedFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(style.label, badgeX + leftPad + dotR * 2 + gap, badgeY + badgeH / 2 + 2);

    // === 3) 하단 종이 카드(제목 영역)
    const cardX = frameX + 45;
    const cardW = frameW - 90;
    const cardH = 280;
    const defaultCardY = frameY + frameH - cardH - 55;
    const cardY = theme.cardPos === "mid" ? frameY + 560 : defaultCardY;
    const cardR = 30;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = theme.cardFill || "rgba(255, 247, 235, 0.94)";
    ctx.fill();
    ctx.restore();

    if (theme.cardDash) {
      ctx.save();
      roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.strokeStyle = "rgba(120, 90, 70, 0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.restore();
    }

    // === 4) 제목 (✅ 하이라이트 먼저 → 글씨)
    const lines = getLines(title);
    const baseSize = clamp(titleSize, 60, 130);

    const fillColor = titleColor?.trim()
      ? titleColor
      : theme.titleDefaultColor || "#4a2f1f";

    const align = theme.titleAlign || "center";
    const textX = align === "left" ? cardX + 70 : cardX + cardW / 2;
    const textY = cardY + cardH / 2 + 6;
    const lineHeight = baseSize + 12;

    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = `900 ${baseSize}px ${selectedFont}`;
    ctx.textAlign = align === "left" ? "left" : "center";

    // 하이라이트 색 준비
    const alpha = clamp(hlAlpha, 0, 1);
    const toRgba = (hex) => {
      const rgb = hexToRgb(hex) || { r: 255, g: 247, b: 235 };
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    };

    const hlFill = toRgba(hlColor);

    let fills = null;
    if (hlPerLine) {
      if (hlAutoTwoTone) {
        fills = lines.map((_, i) => (i % 2 === 0 ? toRgba(hlLine1) : toRgba(hlLine2)));
      } else {
        const manual = [hlLine1, hlLine2, hlLine3].map(toRgba);
        fills = lines.map((_, i) => manual[i] || hlFill);
      }
    }

    // ✅ 하이라이트 먼저
    if (hlEnabled && lines.length > 0) {
      drawTextHighlight(ctx, {
        lines,
        x: textX,
        yCenter: textY,
        lineHeight,
        align: align === "left" ? "left" : "center",
        padX: 30,
        padY: 18,
        radius: 28,
        fill: hlFill,
        fills,
        mode: hlMode,
        stripeSkew: 14,
        shadow: true,
      });
    }

    // ✅ 텍스트
    ctx.fillStyle = fillColor;
    if (lines.length > 0) {
      drawMultilineText(ctx, lines, textX, textY, lineHeight);
    }
    ctx.restore();

    // === 5) 스티커 PNG
    if (style.sticker) {
      try {
        const stickerImg = await loadImg(style.sticker);

        const s = theme.sticker || {};
        const sW = s.w ?? 190;
        const sH = s.h ?? 190;

        const sX = cardX + cardW - sW + (s.offsetX ?? 5);
        const sY = cardY + (s.offsetY ?? -100);

        ctx.save();
        ctx.translate(sX + sW / 2, sY + sH / 2);
        ctx.rotate(((s.rotateDeg ?? -10) * Math.PI) / 180);

        ctx.shadowColor = "rgba(0,0,0,0.22)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;

        ctx.drawImage(stickerImg, -sW / 2, -sH / 2, sW, sH);
        ctx.restore();
      } catch (e) {
        console.warn("Sticker load failed:", style.sticker, e);
      }
    }

    // === 6) 시그니처
    ctx.font = '400 44px "Nanum Brush Script"';
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(`지나의 ${style.label} 기록장`, frameX + frameW - 20, frameY + frameH - 22);

    setResult(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div className="container">
      <div className="font-preload">폰트미리로딩</div>

      <div className="panel settings">
        <h2 className="panel-title">✨ 디자인 설정</h2>

        <div className="input-item">
          <label>1. 사진 업로드</label>
          <div className="file-box" onClick={() => fileInputRef.current.click()}>
            {image ? "📸 사진 선택됨" : "📁 사진을 선택하세요"}
          </div>
          <input ref={fileInputRef} type="file" hidden onChange={handleImageUpload} accept="image/*" />
        </div>

        <div className="input-item">
          <label>2. 카테고리</label>
          <div className="category-grid">
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                className={`cat-btn ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="input-item">
          <label>3. 템플릿</label>
          <select className="custom-select" value={themeKey} onChange={(e) => setThemeKey(e.target.value)}>
            {Object.entries(THEMES).map(([k, t]) => (
              <option key={k} value={k}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-item">
          <label>4. 폰트 선택</label>
          <select className="custom-select" value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)}>
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-item">
          <label>5. 제목 글꼴 크기</label>
          <input
            className="range"
            type="range"
            min="60"
            max="120"
            value={titleSize}
            onChange={(e) => setTitleSize(Number(e.target.value))}
          />
          <div className="hint">{titleSize}px</div>
        </div>

        <div className="input-item">
          <label>6. 제목 글씨 색</label>
          <div className="color-row">
            <input
              type="color"
              value={titleColor || (THEMES[themeKey]?.titleDefaultColor ?? "#4a2f1f")}
              onChange={(e) => setTitleColor(e.target.value)}
            />
            <button className="mini-btn" onClick={() => setTitleColor("")} type="button">
              템플릿 기본색으로
            </button>
          </div>
          <div className="hint subtle">* 색을 비우면 템플릿 기본 글씨색을 사용해요.</div>
        </div>

        <hr className="divider" />

        {/* ✅ 하이라이트 UI */}
        <div className="input-item">
          <label>7. 제목 뒤 배경(하이라이트/리본)</label>

          <div className="row">
            <label className="check">
              <input type="checkbox" checked={hlEnabled} onChange={(e) => setHlEnabled(e.target.checked)} />
              사용
            </label>

            <select className="custom-select" value={hlMode} onChange={(e) => setHlMode(e.target.value)}>
              <option value="pill">둥근 배경(pill)</option>
              <option value="stripe">리본/스트랩(stripe)</option>
            </select>
          </div>

          <div className="row">
            <div className="color-row">
              <input type="color" value={hlColor} onChange={(e) => setHlColor(e.target.value)} />
              <div className="hint subtle">단색 배경</div>
            </div>

            <div className="slider-row">
              <span className="hint subtle">투명도</span>
              <input
                className="range"
                type="range"
                min="0.45"
                max="1"
                step="0.01"
                value={hlAlpha}
                onChange={(e) => setHlAlpha(Number(e.target.value))}
              />
              <span className="hint subtle">{Math.round(hlAlpha * 100)}%</span>
            </div>
          </div>

          <div className="row">
            <label className="check">
              <input type="checkbox" checked={hlPerLine} onChange={(e) => setHlPerLine(e.target.checked)} />
              라인별 사용
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={hlAutoTwoTone}
                onChange={(e) => setHlAutoTwoTone(e.target.checked)}
                disabled={!hlPerLine}
              />
              자동 2톤(1줄/2줄 교차)
            </label>
          </div>

          <div className="row3">
            <div className="color-col">
              <div className="hint subtle">1줄 색</div>
              <input type="color" value={hlLine1} onChange={(e) => setHlLine1(e.target.value)} disabled={!hlPerLine} />
            </div>

            <div className="color-col">
              <div className="hint subtle">2줄 색</div>
              <input type="color" value={hlLine2} onChange={(e) => setHlLine2(e.target.value)} disabled={!hlPerLine} />
            </div>

            <div className="color-col">
              <div className="hint subtle">3줄 색(옵션)</div>
              <input
                type="color"
                value={hlLine3}
                onChange={(e) => setHlLine3(e.target.value)}
                disabled={!hlPerLine || hlAutoTwoTone}
                title="자동 2톤이면 3줄 색은 사용되지 않아요"
              />
            </div>
          </div>

          <div className="hint subtle">* 카테고리를 바꾸면 자동 2톤 프리셋이 기본으로 세팅돼요.</div>
        </div>

        <div className="input-item">
          <label>8. 제목 입력</label>
          <textarea
            className="custom-textarea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요 (엔터로 줄바꿈)"
          />
        </div>

        <button className="make-btn" onClick={makeThumbnail} disabled={!image} type="button">
          썸네일 만들기 ✨
        </button>
      </div>

      <div className="panel preview">
        <h2 className="panel-title">📸 결과 확인</h2>
        <div className="canvas-wrapper">
          {result ? <img src={result} alt="thumbnail" className="result-img" /> : <div className="placeholder-box">사진을 먼저 업로드해주세요</div>}
        </div>

        {result && (
          <a href={result} download="jina_thumbnail.jpg" className="download-btn">
            이미지 저장하기
          </a>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ThumbnailMaker />);
