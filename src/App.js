const { useState, useRef } = React;

/** 이미지 로더 */
const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const ThumbnailMaker = () => {
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState("🍜 음식");
  const [title, setTitle] = useState("홍대 떡볶이 맛집\n모둠 즉떡 오성방앗간");
  const [selectedFont, setSelectedFont] = useState("YPairing");
  const [result, setResult] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * 스티커 경로
   */
  const STICKER_BASE = "./assets";

  /** 카테고리: 라벨(좌상단), 포인트색(점), 스티커 */
  const categories = {
    "🎡 놀거리": { dot: "#E76F51", label: "놀거리노트", sticker: `${STICKER_BASE}/play.png` },
    "☕ 카페":   { dot: "#8D6E63", label: "카페노트",   sticker: `${STICKER_BASE}/cafe2.png` },
    "🍰 디저트": { dot: "#F4A261", label: "디저트일기", sticker: `${STICKER_BASE}/dessert.png` },
    "💄 뷰티":   { dot: "#FF5C8A", label: "뷰티노트",   sticker: `${STICKER_BASE}/beauty2.png` },
    "✈️ 여행":   { dot: "#457B9D", label: "여행기록",   sticker: `${STICKER_BASE}/travel.png` },
    "📦 제품리뷰":{ dot: "#6C757D", label: "사용후기",   sticker: `${STICKER_BASE}/product.png` },
    "🎭 연극":   { dot: "#6D597A", label: "공연기록",   sticker: `${STICKER_BASE}/theater.png` },
    "🍜 음식":   { dot: "#D62828", label: "먹데이트",   sticker: `${STICKER_BASE}/food.png` },
    "🎬 영화":   { dot: "#355070", label: "영화노트",   sticker: `${STICKER_BASE}/movie.png` },
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
  ];

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
  const drawMultilineText = (ctx, text, x, yCenter, maxWidth, lineHeight) => {
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
    const totalH = lines.length * lineHeight;
    let startY = yCenter - totalH / 2 + lineHeight / 2;

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

    // === 0) 전체 배경 (베이지 종이 느낌)
    ctx.fillStyle = "#f2e8d8";
    ctx.fillRect(0, 0, 1080, 1080);

    // === 1) 사진 영역: 둥근 프레임 안에 넣기 (첫 번째 사진 느낌)
    const frameMargin = 70;
    const frameX = frameMargin;
    const frameY = frameMargin;
    const frameW = 1080 - frameMargin * 2;
    const frameH = 1080 - frameMargin * 2;
    const frameR = 60;

    // 프레임 그림자
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // 사진 클리핑
    ctx.save();
    roundedRectPath(ctx, frameX + 10, frameY + 10, frameW - 20, frameH - 20, frameR - 10);
    ctx.clip();

    // 정방형 크롭
    const size = Math.min(image.width, image.height);
    const sx = (image.width - size) / 2;
    const sy = (image.height - size) / 2;
    ctx.drawImage(image, sx, sy, size, size, frameX + 10, frameY + 10, frameW - 20, frameH - 20);

    // 사진 위 살짝 소프트 베일(따뜻한 톤)
    const warm = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    warm.addColorStop(0, "rgba(255, 240, 220, 0.10)");
    warm.addColorStop(1, "rgba(240, 230, 210, 0.18)");
    ctx.fillStyle = warm;
    ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);

    // 하단 가독성 그라데이션 (약하게)
    const grad = ctx.createLinearGradient(0, 520, 0, 1080);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = grad;
    ctx.fillRect(frameX + 10, frameY + 10, frameW - 20, frameH - 20);

    ctx.restore();

    // === 2) 좌상단 라벨(첫 번째 사진처럼: 베이지 박스 + 점 + 텍스트)
    const badgeX = frameX + 35;
    const badgeY = frameY + 35;
    const badgeW = 330;
    const badgeH = 86;
    const badgeR = 22;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    ctx.fillStyle = "rgba(255, 247, 235, 0.92)";
    ctx.fill();
    ctx.restore();

    // 점
    ctx.beginPath();
    ctx.arc(badgeX + 46, badgeY + badgeH / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = style.dot;
    ctx.fill();

    // 텍스트
    ctx.fillStyle = "#5a3d2b";
    ctx.font = `900 44px ${selectedFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(style.label, badgeX + 72, badgeY + badgeH / 2 + 2);

    // === 3) 하단 종이 카드(제목 영역)
    const cardX = frameX + 45;
    const cardW = frameW - 90;
    const cardH = 280;
    const cardY = frameY + frameH - cardH - 55;
    const cardR = 30;

    // 카드 그림자
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = "rgba(255, 247, 235, 0.94)";
    ctx.fill();
    ctx.restore();

    // 카드 테두리(점선 느낌)
    ctx.save();
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.strokeStyle = "rgba(120, 90, 70, 0.25)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.restore();

    // === 4) 제목 텍스트 (첫 번째처럼 갈색 + 굵게)
    ctx.save();
    ctx.fillStyle = "#4a2f1f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 제목 길이에 따라 폰트 크기 자동 조절(대충 안정적으로)
    const lines = title.split("\n").map(s => s.trim()).filter(Boolean);
    const baseSize = lines.length >= 2 ? 86 : 94;
    ctx.font = `900 ${baseSize}px ${selectedFont}`;

    drawMultilineText(ctx, title, cardX + cardW / 2, cardY + cardH / 2 + 6, cardW - 220, baseSize + 12);
    ctx.restore();

    // === 5) 스티커 PNG (카드 오른쪽 위에 "붙인" 느낌)
    if (style.sticker) {
      try {
        const stickerImg = await loadImg(style.sticker);
        const sW = 190;
        const sH = 190;

        const sX = cardX + cardW - sW + 5;
        const sY = cardY - 100;

        ctx.save();
        ctx.translate(sX + sW / 2, sY + sH / 2);
        ctx.rotate(-10 * Math.PI / 180);

        ctx.shadowColor = "rgba(0,0,0,0.22)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;

        ctx.drawImage(stickerImg, -sW / 2, -sH / 2, sW, sH);
        ctx.restore();
      } catch (e) {
        // 스티커 로딩 실패해도 썸네일은 나오게
        console.warn("Sticker load failed:", style.sticker, e);
      }
    }

    // === 6) 시그니처 (오른쪽 아래, 연한 필기 느낌)
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

        <div className="input-item">
          <label>3. 폰트 선택</label>
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

        <div className="input-item">
          <label>4. 제목 입력</label>
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
