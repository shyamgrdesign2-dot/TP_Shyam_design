import { useEffect, useState } from "react";
import { Spin, Image } from "antd";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import ApiChat from "../../api/services/ApiChat";

export default function AttachmentViewer({ blobReference, chatId, mimeType }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!blobReference || chatId == null || chatId === "") {
      setUrl(null);
      setError(true);
      return undefined;
    }

    let cancelled = false;
    setUrl(null);
    setError(null);
    ApiChat.getAttachmentUrl(blobReference, chatId)
      .then((res) => {
        if (!cancelled) setUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [blobReference, chatId]);

  if (error) {
    return <div className="chat-attachment chat-attachment-error">Attachment unavailable</div>;
  }

  if (!url) {
    return (
      <div className="chat-attachment chat-attachment-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <div className="chat-attachment chat-attachment-pdf">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@2.6.347/build/pdf.worker.min.js`}>
          <div style={{ height: 320, width: 240 }}>
            <Viewer fileUrl={url} />
          </div>
        </Worker>
      </div>
    );
  }

  return (
    <div className="chat-attachment chat-attachment-image">
      <Image src={url} alt="attachment" width="100%" style={{ maxWidth: 240, maxHeight: 320, borderRadius: 8, objectFit: "cover" }} />
    </div>
  );
}
