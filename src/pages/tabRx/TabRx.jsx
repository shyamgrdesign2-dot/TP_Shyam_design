import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spin } from "antd";

import TabRxCanvas from "./components/TabRxCanvas";
import ConsultationLayout from "../../components/ConsultationLayout";
import TabRxWelcomePopup from "./components/tabRxWelcomePopup/TabRxWelcomePopup";
import { errorMessage } from "../../utils/utils";
import { getMetadata, getTemplates } from "./services/templateService";
import { uploadTabRxFiles } from "./services/tabRxService";
import { FETCH_SMART_RX } from "../../utils/constants";
import api from "../../api/services/axiosService";
import { env } from "../../EnvironmentConfig";

export default function TabRx() {
  const location = useLocation();
  const { state } = location;
  const { patient_data, caseManagerData, smartRxFilesData, tcm_id } = state || {};
  const tcmId = caseManagerData !== undefined ? caseManagerData.tcm_id : tcm_id || 0;
  
  const { profile } = useSelector((state) => state.doctors);

  // Canvas state
  const canvasRef = useRef(null);
  const [smartRxFiles, setSmartRxFiles] = useState([]);
  const [isCustomSSRX, setIsCustomSSRX] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [canvasInitialTemplateId, setCanvasInitialTemplateId] = useState('blank');
  const [canvasLoader, setCanvasLoader] = useState(false);
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const [customSSDataForCanvas, setCustomSSDataForCanvas] = useState(null);
  const [isTemplateSelectionLocked, setIsTemplateSelectionLocked] = useState(false);

  // Welcome popup state
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [isSelectLetterHead, setIsSelectLetterHead] = useState(false);
  const [userFormatPref, setUserFormatPref] = useState(null);

  const handleToggleTemplateDrawer = useCallback(() => {
    setShowTemplateDrawer(prev => !prev);
  }, []);

  const handleCanvasContentChange = useCallback((hasContent) => {
    setHasCanvasContent(hasContent);
  }, []);

  const handleTemplateSelectionChange = useCallback((templateId) => {
    setSelectedTemplateId(templateId || null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit case: smartRxFilesData exists => hydrate canvas template/pages metadata from custom_ss_data.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isEdit = Array.isArray(smartRxFilesData) && smartRxFilesData.length > 0;
    if (!isEdit) return;
    if (!caseManagerData) return;

    const backendCustom =
      caseManagerData?.custom_ss_data?.custom_ss_data ||
      caseManagerData?.custom_ss_data ||
      null;

    const templateId = backendCustom?.template_id || null;
    if (!templateId) return;

    setIsCustomSSRX(true);
    setSelectedTemplateId(templateId);
    setCanvasInitialTemplateId(templateId);
    setCustomSSDataForCanvas(backendCustom);
    setIsTemplateSelectionLocked(true);
  }, [smartRxFilesData, caseManagerData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // New consult (no smartRxFilesData): metadata format 1=blank, 2=standard, 3=API default template.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isNew = !Array.isArray(smartRxFilesData) || smartRxFilesData.length === 0;
    if (!isNew) return;

    let isCancelled = false;
    const initDefaultTemplate = async () => {
      try {
        const [metaResult, templatesResult] = await Promise.all([
          getMetadata(),
          getTemplates(),
        ]);
        if (isCancelled) return;

        let formatNum = null;
        if (metaResult?.success && metaResult?.data) {
          const raw = metaResult.data.format;
          if (raw !== null && raw !== undefined && raw !== "") {
            const n = Number(raw);
            if (Number.isFinite(n)) {
              formatNum = n;
            }
          }
        }

        const list =
          templatesResult?.success && Array.isArray(templatesResult?.data)
            ? templatesResult.data
            : [];
        const defaultTemplate = list.find((t) => t?.default === true);
        const fallbackCustom = defaultTemplate || list[0];

        if (formatNum === 1) {
          setIsCustomSSRX(false);
          setSelectedTemplateId("blank");
          setCanvasInitialTemplateId("blank");
          setCustomSSDataForCanvas(null);
          setIsTemplateSelectionLocked(false);
          return;
        }
        if (formatNum === 2) {
          setIsCustomSSRX(false);
          setSelectedTemplateId("standard");
          setCanvasInitialTemplateId("standard");
          setCustomSSDataForCanvas(null);
          setIsTemplateSelectionLocked(false);
          return;
        }
        if (fallbackCustom?.id) {
          setIsCustomSSRX(false);
          setSelectedTemplateId(fallbackCustom.id);
          setCanvasInitialTemplateId(fallbackCustom.id);
          setCustomSSDataForCanvas(null);
          setIsTemplateSelectionLocked(false);
        }
      } catch (e) {
        console.error("TabRx default template init failed:", e);
      }
    };

    initDefaultTemplate();
    return () => {
      isCancelled = true;
    };
  }, [smartRxFilesData]);

  // Check welcome popup on mount
  useEffect(() => {
    let isMounted = true;
    const checkWelcomePopup = async () => {
      try {
        const result = await getMetadata();
        if (isMounted && result?.success && result?.data) {
          const format = result?.data?.format;
          const letterHeadFlag = result?.data?.isSelectLetterHead;

          if (letterHeadFlag !== undefined) {
            setIsSelectLetterHead(letterHeadFlag);
          }

          if (format) {
            setUserFormatPref(format);
          }

          if (!format) {
            setShowWelcomePopup(true);
          } else {
            setShowWelcomePopup(false);
          }
        }
      } catch (error) {
        console.error("Error fetching metadata format:", error);
      } finally {
        if (isMounted) {
          setMetadataLoaded(true);
        }
      }
    };
    checkWelcomePopup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize smartRxFiles and canvas background when editing existing prescription
  useEffect(() => {
    if (smartRxFilesData && Array.isArray(smartRxFilesData) && smartRxFilesData.length > 0) {
      setSmartRxFiles(smartRxFilesData);
      setHasCanvasContent(true);
      const firstUrl = smartRxFilesData[0]?.smart_prescription_file || smartRxFilesData[0]?.fileUrl;
      if (firstUrl) {
        setBackgroundImageUrl(firstUrl);
      }
    }
  }, [smartRxFilesData]);

  // Fallback: if no smartRxFilesData was passed but caseManagerData indicates a smart Rx image,
  // fetch the smart prescription images (works for flows like TabRxPrescriptionPrintView).
  useEffect(() => {
    const shouldFetch =
      (!smartRxFilesData || smartRxFilesData.length === 0) &&
      caseManagerData &&
      typeof caseManagerData.smart_prescription_filename === "string" &&
      caseManagerData.smart_prescription_filename.includes(".jpeg") &&
      tcmId;

    if (!shouldFetch) {
      return;
    }

    const fetchSmartRxFiles = async () => {
      try {
        const payload = { tcm_id: tcmId };
        const response = await api.post(FETCH_SMART_RX, payload, env.casemanager_api_url);
        if (response?.data?.length) {
          setSmartRxFiles(response.data);
          setHasCanvasContent(true);
          const first = response.data[0];
          const firstUrl =
            first?.smart_prescription_file ||
            first?.fileUrl ||
            first?.url ||
            null;
          if (firstUrl) {
            setBackgroundImageUrl(firstUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching smart Rx files in TabRx:", error);
      }
    };

    fetchSmartRxFiles();
  }, [smartRxFilesData, caseManagerData, tcmId]);

  // Check canvas content on mount and when canvas ref changes
  useEffect(() => {
    const checkCanvasContent = () => {
      if (canvasRef.current) {
        try {
          const canvasData = canvasRef.current.getCanvasData();
          if (canvasData) {
            const hasStrokes = canvasData.strokesByPage &&
              Object.values(canvasData.strokesByPage).some(strokes =>
                Array.isArray(strokes) && strokes.length > 0
              );

            const hasTextElements = canvasData.textElementsByPage &&
              Object.values(canvasData.textElementsByPage).some(textElements =>
                Array.isArray(textElements) && textElements.length > 0 &&
                textElements.some(el => el.content && el.content.trim().length > 0)
              );

            const hasContent = hasStrokes || hasTextElements;
            setHasCanvasContent(hasContent);
          } else {
            setHasCanvasContent(false);
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };

    const timeout = setTimeout(checkCanvasContent, 100);
    const interval = setInterval(checkCanvasContent, 2000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [canvasRef]);

  // Handle canvas submission - convert canvas to files and upload
  const handleCanvasSubmit = useCallback(async () => {
    if (!canvasRef.current) {
      return { files: [], blobs: [] };
    }

    setCanvasLoader(true);
    try {
      const { files, blobs } = await canvasRef.current.exportToImages();

      if (files.length > 0) {
        // Upload files using tab-rx service
        const uploadResult = await uploadTabRxFiles(files, (progress) => {});

        if (uploadResult.success) {
          // Extract uploaded file names from API response
          const uploadedFileNames = uploadResult.uploadedFileNames || [];

          // Update files with the names returned from API
          const updatedFiles = files.map((file, index) => {
            const apiFileName = uploadedFileNames[index];
            if (apiFileName) {
              return new File([file], apiFileName, { type: file.type });
            }
            return file;
          });

          setSmartRxFiles(updatedFiles);

          const canvasData = canvasRef.current.getCanvasData();

          if (canvasData.selectedTemplateId && canvasData.selectedTemplateId !== 'blank') {
            setIsCustomSSRX(true);
            setSelectedTemplateId(canvasData.selectedTemplateId);
          }

          return { files: updatedFiles, blobs };
        } else {
          errorMessage('Error uploading canvas files. Please try again.');
        }
      }
      return { files, blobs };
    } catch (error) {
      errorMessage('Error uploading canvas files. Please try again.');
      return { files: [], blobs: [] };
    } finally {
      setCanvasLoader(false);
    }
  }, []);

  const handleCanvasClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setSmartRxFiles([]);
      setIsCustomSSRX(false);
      setSelectedTemplateId(null);
      setHasCanvasContent(false);
    }
  }, []);

  const headerProps = {
    smartRxFiles,
    isCustomSSRX,
    selectedTemplateId,
    canvasData: canvasRef.current?.getCanvasData() || null,
    canvasRef,
    hasCanvasContent,
    onCanvasClear: handleCanvasClear,
    onCanvasSubmit: handleCanvasSubmit,
    onToggleTemplateDrawer: handleToggleTemplateDrawer,
    isSelectLetterHead,
  };

  return (
    <ConsultationLayout headerProps={headerProps}>
      <TabRxCanvas
        ref={canvasRef}
        patient={patient_data}
        backgroundImages={smartRxFiles.map(f => f?.fileUrl || f?.smart_prescription_file).filter(Boolean)}
        backgroundImage={backgroundImageUrl}
        profile={profile}
        initialTemplateId={canvasInitialTemplateId}
        customSSData={customSSDataForCanvas}
        lockTemplateSelection={isTemplateSelectionLocked}
        lockedTemplateId={customSSDataForCanvas?.template_id || null}
        showTemplateDrawer={showTemplateDrawer}
        onToggleTemplateDrawer={handleToggleTemplateDrawer}
        metadataLoaded={metadataLoaded}
        isSelectLetterHead={isSelectLetterHead}
        userFormatPref={userFormatPref}
        onContentChange={handleCanvasContentChange}
        onTemplateChange={handleTemplateSelectionChange}
      />
      {canvasLoader && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
        </div>
      )}
      <TabRxWelcomePopup
        open={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        onSuccess={(format) => {
          setShowWelcomePopup(false);
          setUserFormatPref(format);
        }}
        isSelectLetterHead={isSelectLetterHead}
      />
    </ConsultationLayout>
  );
}
