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
   배지 배경 자동 생성(bg 기반)
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
  return `rgb(${Math.round(rgb.r * (1 - s))}, ${Math.round(rgb.g * (1 - s))}, ${Math.round(rgb.b * (1 - s))})`;
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
    cardPos: "mid", // 카드 위치를 위로
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

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * 스티커 경로 
   */
  const STICKER_BASE = "./assets";

  /** 카테고리: 라벨(좌상단), 포인트색(점), 스티커 */
  const categories = {
    "🎡 놀거리": { dot: "#E76F51", bg: "#FFF3EC", label: "놀거리노트", sticker: `${STICKER_BASE}/play.png` },
    "☕ 카페":   { dot: "#8D6E63", bg: "#F7F1EA", label: "카페노트",   sticker: `${STICKER_BASE}/cafe.png` },
    "🍰 디저트":  { dot: "#E3A008", bg: "#FFF2CC", label: "디저트일기", sticker: `${STICKER_BASE}/dessert.png` },
    "💄 뷰티":   { dot: "#FF5C8A", bg: "#FFF0F6", label: "뷰티노트",   sticker: `${STICKER_BASE}/beauty.png` },
    "✈️ 여행":   { dot: "#457B9D", bg: "#EEF6FF", label: "여행기록",   sticker: `${STICKER_BASE}/travel.png` },
    "📦 제품리뷰":{ dot: "#6C757D", bg: "#F3F4F6", label: "사용후기",   sticker: `${STICKER_BASE}/product.png` },
    "🎭 연극":   { dot: "#6D597A", bg: "#F5F0FF", label: "공연기록",   sticker: `${STICKER_BASE}/theater.png` },
    "🍜 음식":   { dot: "#D62828", bg: "#FFF0EE", label: "먹데이트",   sticker: `${STICKER_BASE}/food.png` },
    "🎬 영화":   { dot: "#355070", bg: "#EEF1FF", label: "영화노트",   sticker: `${STICKER_BASE}/movie.png` },
    "🍷 술":     { dot: "#2EC4B6", bg: "#E9FBFF", label: "오늘의 한 잔", sticker: `${STICKER_BASE}/drink.png` },
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
    // 템플릿 바꾸면 글씨색은 "기본색"으로 돌리고 싶으면 아래 주석 해제
    // setTitleColor("");
  }, [themeKey]);

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

  /** 라운드 사각형 path */
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

  /** 텍스트 줄바꿈 간격 */
  const drawMultilineText = (ctx, text, x, yCenter, lineHeight) => {
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const totalH = lines.length * lineHeight;
    const startY = yCenter - totalH / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      ctx.fillText(line, x, y);
    });
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

    // === 0) 전체 배경 - 카테고리 별로 다르게
    ctx.fillStyle = style.bg || "#f2e8d8";
    ctx.fillRect(0, 0, 1080, 1080);

    // === 1) 사진 영역: 둥근 프레임 안에 넣기
    const frameMargin = theme.frameMargin ?? 40;
    const frameX = frameMargin;
    const frameY = frameMargin;
    const frameW = 1080 - frameMargin * 2;
    const frameH = 1080 - frameMargin * 2;
    const frameR = theme.frameR ?? 60;

    // 프레임 그림자 + 흰 테두리 바탕
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // 사진 클리핑 (안쪽 프레임)
    ctx.save();
    roundedRectPath(ctx, frameX + 10, frameY + 10, frameW - 20, frameH - 20, frameR - 10);
    ctx.clip();

    // 정방형 크롭
    const size = Math.min(image.width, image.height);
    const sx = (image.width - size) / 2;
    const sy = (image.height - size) / 2;
    ctx.drawImage(image, sx, sy, size, size, frameX + 10, frameY + 10, frameW - 20, frameH - 20);

    // 사진 위 소프트 베일(옵션)
    if (theme.photoVail) {
      const warm = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
      warm.addColorStop(0, "rgba(255, 240, 220, 0.10)");
      warm.addColorStop(1, "rgba(240, 230, 210, 0.18)");
      ctx.fillStyle = warm;
      ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);
    }

    // 하단 가독성 그라데이션(옵션)
    if (theme.bottomGrad) {
      const grad = ctx.createLinearGradient(0, 520, 0, 1080);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = grad;
      ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);
    }

    ctx.restore(); // clip

    // === 2) 좌상단 라벨 (✅ 배경 자동 + ✅ 너비 자동)
    const badgeX = frameX + 35;
    const badgeY = frameY + 35;
    const badgeH = 86;
    const badgeR = 22;

    ctx.font = `900 44px ${selectedFont}`;
    const textW = ctx.measureText(style.label).width;

    // dot+패딩 포함해서 배지 width 계산
    const dotR = 10;
    const leftPad = 22;
    const rightPad = 26;
    const gap = 16;
    const badgeW = leftPad + dotR * 2 + gap + textW + rightPad;

    const badgeBg = makeBadgeBgFromBg(style.bg, { mix: 0.68, alpha: 0.92 });
    const badgeTextColor = makeBadgeTextFromBg(style.bg, 0.72);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    ctx.fillStyle = badgeBg; // ✅ bg 기반 자동 생성
    ctx.fill();
    ctx.restore();

    // 점
    ctx.beginPath();
    ctx.arc(badgeX + leftPad + dotR, badgeY + badgeH / 2, dotR, 0, Math.PI * 2);
    ctx.fillStyle = style.dot;
    ctx.fill();

    // 텍스트
    ctx.fillStyle = badgeTextColor;
    ctx.font = `900 44px ${selectedFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(style.label, badgeX + leftPad + dotR * 2 + gap, badgeY + badgeH / 2 + 2);

    // === 3) 하단 종이 카드(제목 영역) - 템플릿에 따라 위치/색 변경
    const cardX = frameX + 45;
    const cardW = frameW - 90;

    const cardH = 280;
    const defaultCardY = frameY + frameH - cardH - 55;
    const cardY = theme.cardPos === "mid" ? (frameY + 560) : defaultCardY;

    const cardR = 30;

    // 카드 그림자
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = theme.cardFill || "rgba(255, 247, 235, 0.94)";
    ctx.fill();
    ctx.restore();

    // 카드 테두리(점선 옵션)
    if (theme.cardDash) {
      ctx.save();
      roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.strokeStyle = "rgba(120, 90, 70, 0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.restore();
    }

    // === 4) 제목 텍스트 (✅ 폰트 크기/색 사용자 설정)
    ctx.save();

    const lines = title.split("\n").map((s) => s.trim()).filter(Boolean);
    const baseSize = clamp(titleSize, 60, 130);

    const fillColor =
      titleColor?.trim()
        ? titleColor
        : (theme.titleDefaultColor || "#4a2f1f");

    ctx.fillStyle = fillColor;
    ctx.textBaseline = "middle";
    ctx.font = `900 ${baseSize}px ${selectedFont}`;

    if ((theme.titleAlign || "center") === "left") {
      ctx.textAlign = "left";
      drawMultilineText(ctx, title, cardX + 70, cardY + cardH / 2 + 6, baseSize + 12);
    } else {
      ctx.textAlign = "center";
      drawMultilineText(ctx, title, cardX + cardW / 2, cardY + cardH / 2 + 6, baseSize + 12);
    }

    ctx.restore();

    // === 5) 스티커 PNG (템플릿 파라미터로 위치/크기 조절)
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
      {/* 폰트 프리로드 */}
      <div className="font-preload">폰트미리로딩</div>

      <div className="panel settings">
        <h2 className="panel-title">✨ 디자인 설정</h2>

        <div className="input-item">
          <label>1. 사진 업로드</label>
          <div className="file-box" onClick={() => fileInputRef.current.click()}>
            {image ? "📸 사진 선택됨" : "📁 사진을 선택하세요"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleImageUpload}
            accept="image/*"
          />
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

        {/* ✅ 템플릿 select */}
        <div className="input-item">
          <label>3. 템플릿</label>
          <select
            className="custom-select"
            value={themeKey}
            onChange={(e) => setThemeKey(e.target.value)}
          >
            {Object.entries(THEMES).map(([k, t]) => (
              <option key={k} value={k}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-item">
          <label>4. 폰트 선택</label>
          <select
            className="custom-select"
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
          >
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ 폰트 크기 슬라이더 */}
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

        {/* ✅ 글씨 색 지정 */}
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

        <div className="input-item">
          <label>7. 제목 입력</label>
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
          {result ? (
            <img src={result} alt="thumbnail" className="result-img" />
          ) : (
            <div className="placeholder-box">사진을 먼저 업로드해주세요</div>
          )}
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

// 화면에 리액트 컴포넌트 렌더링
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ThumbnailMaker />);
