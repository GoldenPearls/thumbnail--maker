const { useState, useRef, useEffect } = React;

/** 이미지 로더 유틸 */
const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로딩 실패: ${src}`));
    img.src = src;
  });

/* -----------------------------
   🎨 유틸리티 & 장식 도구들
------------------------------ */
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

const drawTape = (ctx, x, y, w, h, rotateDeg = -6, color = "rgba(255,255,255,0.55)") => {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  roundedRectPath(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

const drawBanner = (ctx, x, y, w, h, fill = "rgba(255,247,235,0.92)") => {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.16)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 10;
  roundedRectPath(ctx, x, y, w, h, 28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
};

const drawCornerStamp = (ctx, x, y, text, color = "rgba(120,60,40,0.55)", fontFamily = "YPairing") => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-10 * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  roundedRectPath(ctx, -170, -60, 340, 120, 22);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `900 46px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

const drawNoteLines = (ctx, x, y, w, h) => {
  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, x, y, w, h, 26);
  ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(140,110,90,0.55)";
  // 줄 간격을 42px로 설정하여 텍스트와 조화롭게 배치
  for (let yy = y + 42; yy < y + h; yy += 42) {
    ctx.beginPath();
    ctx.moveTo(x + 30, yy);
    ctx.lineTo(x + w - 30, yy);
    ctx.stroke();
  }
  ctx.restore();
};

/* -----------------------------
   🚀 테마 정의 (B/E 유지 + G~L 총 8종)
------------------------------ */
const THEMES = {
  B_PAPER_BOLD: {
    name: "종이카드(B)",
    frameMargin: 36, frameR: 60, photoVail: true, bottomGrad: true,
    cardFill: "rgba(255, 247, 235, 0.96)", cardDash: true,
    titleDefaultColor: "#2f1d12", titleAlign: "center", titleBaseSize: 102,
    text: { title: { y: 0.43, size: 102 }, subtitle: { y: 0.66, size: 54 }, location: { y: 0.86, size: 42 } },
    sticker: { w: 190, h: 190, offsetX: 10, offsetY: -110, rotateDeg: -8 },
  },
  E_POSTER: {
    name: "포스터(E)",
    frameMargin: 40, frameR: 60, photoVail: false, bottomGrad: true,
    cardFill: "rgba(0,0,0,0.33)", cardDash: false,
    titleDefaultColor: "#fff7e8", titleAlign: "center", titleBaseSize: 92,
    text: { title: { y: 0.40, size: 92 }, subtitle: { y: 0.62, size: 52 }, location: { y: 0.82, size: 40 } },
    sticker: { w: 180, h: 180, offsetX: 0, offsetY: -95, rotateDeg: -10 },
  },
  G_POLAROID: {
    name: "폴라로이드(G)",
    frameMargin: 54, frameR: 44, photoVail: true, bottomGrad: false,
    cardFill: "rgba(255,255,255,0.96)", cardDash: false,
    titleDefaultColor: "#2f1d12", titleAlign: "center", titleBaseSize: 92,
    cardPos: "mid", cardH: 320, decorations: [{ type: "tape" }],
    text: { title: { y: 0.38, size: 92 }, subtitle: { y: 0.64, size: 50 }, location: { y: 0.86, size: 40 } },
    sticker: { w: 180, h: 180, offsetX: 0, offsetY: -95, rotateDeg: -8 },
  },
  H_TOP_BANNER: {
    name: "상단 배너(H)",
    frameMargin: 40, frameR: 60, photoVail: true, bottomGrad: true,
    cardFill: "rgba(255, 247, 235, 0.94)", cardDash: false,
    titleDefaultColor: "#2f1d12", titleAlign: "center", titleBaseSize: 102,
    cardPos: "top", cardH: 240, banner: true,
    text: { title: { y: 0.50, size: 102 }, subtitle: { y: 0.84, size: 46 }, location: { y: 0.98, size: 36 } },
    sticker: { w: 170, h: 170, offsetX: 0, offsetY: -90, rotateDeg: -10 },
  },
  I_SIDE_TAG: {
    name: "사이드 태그(I)",
    frameMargin: 44, frameR: 58, photoVail: true, bottomGrad: true,
    cardFill: "rgba(255, 255, 255, 0.90)", cardDash: true,
    titleDefaultColor: "#2a211b", titleAlign: "left", titleBaseSize: 88,
    cardPos: "bottom", cardH: 280, sideTag: true,
    text: { title: { y: 0.42, size: 88 }, subtitle: { y: 0.70, size: 48 }, location: { y: 0.90, size: 38 } },
    sticker: { w: 160, h: 160, offsetX: 0, offsetY: -88, rotateDeg: -12 },
  },
  J_STAMP_CORNER: {
    name: "코너 스탬프(J)",
    frameMargin: 40, frameR: 60, photoVail: true, bottomGrad: true,
    cardFill: "rgba(255, 247, 235, 0.92)", cardDash: false,
    titleDefaultColor: "#2f1d12", titleAlign: "center", titleBaseSize: 96,
    cardPos: "bottom", cardH: 280, cornerStamp: true,
    text: { title: { y: 0.44, size: 96 }, subtitle: { y: 0.70, size: 52 }, location: { y: 0.90, size: 40 } },
    sticker: { w: 180, h: 180, offsetX: 0, offsetY: -95, rotateDeg: -8 },
  },
  K_GLASS_BAR: {
    name: "유리바(K)",
    frameMargin: 40, frameR: 60, photoVail: false, bottomGrad: false,
    cardFill: "rgba(255,255,255,0.30)", cardDash: false, glass: true,
    titleDefaultColor: "#ffffff", titleAlign: "center", titleBaseSize: 92,
    cardPos: "bottom", cardH: 260,
    text: { title: { y: 0.44, size: 92 }, subtitle: { y: 0.70, size: 48 }, location: { y: 0.90, size: 38 } },
    sticker: { w: 170, h: 170, offsetX: 0, offsetY: -92, rotateDeg: -10 },
  },
  L_NOTE_LINES: {
    name: "줄노트 기록(L)",
    frameMargin: 40, frameR: 60, photoVail: true, bottomGrad: true,
    cardFill: "rgba(255, 252, 245, 0.96)", cardDash: true, noteLines: true,
    titleDefaultColor: "#3d2b1f", titleAlign: "center", titleBaseSize: 94,
    cardPos: "bottom", cardH: 340,
    text: { title: { y: 0.42, size: 94 }, subtitle: { y: 0.72, size: 50 }, location: { y: 0.90, size: 38 } },
    sticker: { w: 180, h: 180, offsetX: 0, offsetY: -100, rotateDeg: -8 },
  },
};

/* -----------------------------
   🏠 메인 컴포넌트
------------------------------ */
const ThumbnailMaker = () => {
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState("🍜 음식");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [locationText, setLocationText] = useState("");
  const [themeKey, setThemeKey] = useState("B_PAPER_BOLD");
  const [selectedFont, setSelectedFont] = useState("YPairing");
  const [result, setResult] = useState(null);
  const [titleSize, setTitleSize] = useState(94);

  const canvasRef = useRef(null);

  const categories = {
    "🍜 음식": { dot: "#D62828", bg: "#FFF0EE", label: "먹데이트", sticker: "./assets/food.png" },
    "☕ 카페": { dot: "#8D6E63", bg: "#F7F1EA", label: "카페노트", sticker: "./assets/cafe.png" },
    "✈️ 여행": { dot: "#457B9D", bg: "#EEF6FF", label: "여행기록", sticker: "./assets/travel.png" },
    "🎡 놀거리": { dot: "#E76F51", bg: "#FFF3EC", label: "놀거리노트", sticker: "./assets/play.png" },
  };

  useEffect(() => {
    const t = THEMES[themeKey];
    if (t?.titleBaseSize) setTitleSize(t.titleBaseSize);
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

  const makeThumbnail = async () => {
    if (!image) return;
    await document.fonts.ready;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const style = categories[category];
    const theme = THEMES[themeKey];

    // 1. 전체 배경 & 사진
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, 1080, 1080);
    const frameMargin = theme.frameMargin;
    const frameW = 1080 - frameMargin * 2;
    const frameH = 1080 - frameMargin * 2;

    ctx.save();
    roundedRectPath(ctx, frameMargin, frameMargin, frameW, frameH, theme.frameR);
    ctx.clip();
    const size = Math.min(image.width, image.height);
    ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, frameMargin, frameMargin, frameW, frameH);
    if (theme.photoVail) { ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(frameMargin, frameMargin, frameW, frameH); }
    ctx.restore();

    // 2. 카드(텍스트 영역) 계산
    const cardX = frameMargin + 45;
    const cardW = frameW - 90;
    const cardH = theme.cardH ?? 280;
    const cardY = theme.cardPos === "mid" ? frameMargin + 560 : theme.cardPos === "top" ? frameMargin + 160 : frameMargin + frameH - cardH - 55;

    // 카드 배경
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, 30);
    ctx.fillStyle = theme.cardFill; ctx.fill();
    ctx.restore();

    // 3. 테마별 장식 레이어
    if (theme.noteLines) drawNoteLines(ctx, cardX, cardY, cardW, cardH);
    if (theme.banner) drawBanner(ctx, frameMargin + 60, frameMargin + 110, frameW - 120, 160);
    if (theme.cornerStamp) drawCornerStamp(ctx, cardX + cardW - 70, cardY + cardH - 36, "RECORD", "rgba(120,60,40,0.5)", selectedFont);
    if (theme.decorations?.some(d => d.type === "tape")) {
      drawTape(ctx, cardX + 40, cardY - 26, 220, 70, -8);
      drawTape(ctx, cardX + cardW - 260, cardY - 30, 220, 70, 6);
    }
    if (theme.glass) {
      ctx.save(); roundedRectPath(ctx, cardX, cardY, cardW, cardH, 30);
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
    if (theme.sideTag) {
      const tagW = 90, tagX = frameMargin + frameW - tagW - 28, tagY = frameMargin + 160, tagH = 420;
      drawBanner(ctx, tagX, tagY, tagW, tagH);
      ctx.save(); ctx.translate(tagX + tagW / 2, tagY + tagH / 2); ctx.rotate(-Math.PI / 2);
      ctx.font = `900 44px ${selectedFont}`; ctx.fillStyle = "rgba(70,55,45,0.85)"; ctx.textAlign = "center";
      ctx.fillText(style.label, 0, 0); ctx.restore();
    }

    // 4. 텍스트 렌더링
    const align = theme.titleAlign || "center";
    const titleX = align === "center" ? cardX + cardW / 2 : align === "left" ? cardX + 70 : cardX + cardW - 70;
    
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    // 제목
    ctx.font = `900 ${titleSize}px ${selectedFont}`;
    ctx.fillStyle = theme.titleDefaultColor;
    const titleLines = title.split("\n").filter(Boolean);
    titleLines.forEach((line, i) => {
      ctx.fillText(line, titleX, cardY + cardH * theme.text.title.y + (i * titleSize * 1.1));
    });

    // 부제 & 위치
    ctx.font = `500 48px ${selectedFont}`; ctx.globalAlpha = 0.85;
    ctx.fillText(subtitle, titleX, cardY + cardH * theme.text.subtitle.y);
    ctx.font = `400 36px ${selectedFont}`; ctx.globalAlpha = 0.7;
    ctx.fillText(locationText, titleX, cardY + cardH * theme.text.location.y);
    ctx.globalAlpha = 1.0;

    // 5. 스티커
    try {
      const stickerImg = await loadImg(style.sticker);
      const s = theme.sticker;
      ctx.save();
      ctx.translate(cardX + cardW / 2 + s.offsetX, cardY + s.offsetY);
      ctx.rotate((s.rotateDeg * Math.PI) / 180);
      ctx.drawImage(stickerImg, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    } catch (e) { console.warn("스티커 누락"); }

    setResult(canvas.toDataURL("image/png"));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <input type="file" onChange={handleImageUpload} className="block w-full text-sm border p-2" />
      <div className="grid grid-cols-2 gap-2">
        <select onChange={(e) => setCategory(e.target.value)} className="border p-2">{Object.keys(categories).map(c => <option key={c}>{c}</option>)}</select>
        <select onChange={(e) => setThemeKey(e.target.value)} className="border p-2">{Object.keys(THEMES).map(k => <option key={k} value={k}>{THEMES[k].name}</option>)}</select>
      </div>
      <textarea placeholder="제목" onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 h-20" />
      <input placeholder="부제" onChange={(e) => setSubtitle(e.target.value)} className="w-full border p-2" />
      <button onClick={makeThumbnail} className="w-full bg-indigo-600 text-white p-3 rounded font-bold">이미지 생성</button>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {result && (
        <div className="mt-4">
          <img src={result} alt="Result" className="w-full border shadow-xl" />
          <a href={result} download="thumbnail.png" className="block text-center mt-2 text-indigo-500 underline font-medium">내 기기에 저장</a>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<ThumbnailMaker />, document.getElementById("root"));
