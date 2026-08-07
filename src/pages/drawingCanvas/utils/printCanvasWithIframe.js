import { exportToBlob } from "@excalidraw/excalidraw";

const A4_WIDTH_PX = 2480; // 210mm at 300 DPI
const A4_HEIGHT_PX = 3508; // 297mm at 300 DPI
const PAGE_PADDING_PX = 120;

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const dataUrlToImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

export const printCanvasWithIframe = async ({
  excalidrawAPI,
  title = "Canvas",
  iframeId = "canvas-print-iframe",
}) => {
  if (!excalidrawAPI) {
    return { status: false, reason: "MISSING_API" };
  }

  const elements = excalidrawAPI.getSceneElements();
  if (!elements?.length) {
    return { status: false, reason: "EMPTY_CANVAS" };
  }

  const currentAppState = excalidrawAPI.getAppState();
  const files = excalidrawAPI.getFiles();

  const sceneBlob = await exportToBlob({
    elements,
    appState: {
      ...currentAppState,
      exportWithDarkMode: false,
      viewBackgroundColor: currentAppState.viewBackgroundColor || "#ffffff",
    },
    files,
    mimeType: "image/png",
    quality: 1,
    maxWidthOrHeight: 3508,
  });

  const sceneDataUrl = await blobToDataUrl(sceneBlob);
  const sceneImage = await dataUrlToImage(sceneDataUrl);

  const sheetCanvas = document.createElement("canvas");
  sheetCanvas.width = A4_WIDTH_PX;
  sheetCanvas.height = A4_HEIGHT_PX;

  const ctx = sheetCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const drawableWidth = A4_WIDTH_PX - PAGE_PADDING_PX * 2;
  const drawableHeight = A4_HEIGHT_PX - PAGE_PADDING_PX * 2;
  const sceneAspectRatio = sceneImage.width / sceneImage.height;
  const drawableAspectRatio = drawableWidth / drawableHeight;

  let drawWidth = drawableWidth;
  let drawHeight = drawableHeight;
  if (sceneAspectRatio > drawableAspectRatio) {
    drawHeight = drawWidth / sceneAspectRatio;
  } else {
    drawWidth = drawHeight * sceneAspectRatio;
  }

  const offsetX = (A4_WIDTH_PX - drawWidth) / 2;
  const offsetY = (A4_HEIGHT_PX - drawHeight) / 2;
  ctx.drawImage(sceneImage, offsetX, offsetY, drawWidth, drawHeight);

  const printUrl = sheetCanvas.toDataURL("image/png", 1);

  const existingIframe = document.getElementById(iframeId);
  if (existingIframe?.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  const iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    throw new Error("Unable to initialize print frame");
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Print</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #ffffff;
          }
          .page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <img id="canvas-print-image" src="${printUrl}" alt="Canvas print" />
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const img = iframeDoc.getElementById("canvas-print-image");
  if (!img) {
    throw new Error("Print image not found");
  }

  const triggerPrint = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 50);
  };

  if (img.complete) {
    triggerPrint();
  } else {
    await new Promise((resolve, reject) => {
      img.onload = () => {
        triggerPrint();
        resolve(true);
      };
      img.onerror = () => reject(new Error("Failed to load canvas image for printing"));
    });
  }

  return { status: true };
};
