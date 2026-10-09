import React, { useState, useEffect } from 'react';
import DrawingCanvasCard from './DrawingCanvasCard';
import ExcalidrawEditor from './ExcalidrawEditor';
import CanvasPreview from './CanvasPreview';
import { Card, Drawer, message } from 'antd';

import { editMapping, listPatientCanvasMapping } from '../service';
import { trackEvent } from '../../../utils/utils';

const VisitDrawingCanvases = ({ patientId, tcmId, trackingAttrs = {} }) => {
    const [samples, setSamples] = useState([]);
    const [currentCanvas, setCurrentCanvas] = useState(null);
    const [shouldShowPreview, setShouldShowPreview] = useState(false);
    const [previewCanvasId, setPreviewCanvasId] = useState(null);

    useEffect(() => {
        let active = true;
        const fetchCanvases = async () => {
            if (patientId) {
                const res = await listPatientCanvasMapping(patientId, tcmId);
                if (res.status && res.records && active) {
                    const mapped = res.records.map(r => ({
                        id: r.mapping_id,
                        title: r.canvas_name,
                        url: r.canvas_url,
                        created_at: r.created_at || r.createdAt || r.canvas_created_at,
                        scene: null
                    }));
                    setSamples(mapped);
                } else if (!res?.status) {
                    trackEvent("drawing_canvas_api_failed", {
                        ...trackingAttrs,
                        api_name: "listPatientCanvasMapping",
                        error_code: res?.code || "FAILED",
                        error_message: res?.message || "Failed to fetch patient canvases",
                    });
                }
            }
        };
        fetchCanvases();
        return () => { active = false; };
    }, [patientId, tcmId]);

    useEffect(() => {
        trackEvent("drawing_canvas_patient_history_viewed", {
            ...trackingAttrs,
        });
    }, [trackingAttrs]);

    const handleDuplicate = (canvas) => {
        const newCanvas = {
            ...canvas,
            id: Date.now(),
            title: `${canvas.title} (Copy)`
        };
        setSamples([...samples, newCanvas]);
    };

    const handleDelete = (canvasId) => {
        setSamples(samples.filter(s => s.id !== canvasId));
    };

    const handleRename = (canvas, newTitle) => {
        setSamples(samples.map(s => s.id === canvas.id ? { ...s, title: newTitle } : s));
    };

    const handleOpen = async (canvas) => {
        if (!canvas) return;
        let activeCanvas = canvas;
        if (!canvas.scene && canvas.url) {
            try {
                const res = await fetch(canvas.url);
                const textData = await res.text();
                const sceneData = JSON.parse(textData);
                activeCanvas = { ...canvas, scene: sceneData };
                setSamples(prev => prev.map(s => s.id === canvas.id ? activeCanvas : s));
            } catch (err) {
                console.error("Failed to load scene from url", err);
                trackEvent("drawing_canvas_corrupt_scene_detected", {
                    ...trackingAttrs,
                    canvas_id: canvas?.id,
                    render_context: "history_editor_load",
                });
            }
        }
        const createdAt = canvas?.created_at ? new Date(canvas.created_at) : null;
        const canvasAgeDays = createdAt && !Number.isNaN(createdAt.getTime())
            ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
            : null;
        trackEvent("drawing_canvas_history_canvas_opened", {
            ...trackingAttrs,
            canvas_id: canvas?.id,
            canvas_age_days: canvasAgeDays,
        });
        setCurrentCanvas(activeCanvas);
    };

    const handlePreview = async (canvas) => {
        if (!canvas.scene && canvas.url) {
            try {
                const res = await fetch(canvas.url);
                const sceneData = await res.json();
                setSamples(prev => prev.map(s => s.id === canvas.id ? { ...s, scene: sceneData } : s));
            } catch (err) {
                console.error("Failed to load scene from url", err);
            }
        }
        trackEvent("drawing_canvas_preview_opened", {
            ...trackingAttrs,
            canvas_id: canvas?.id,
            preview_source: "patient_details",
        });
        setPreviewCanvasId(canvas?.id);
        setShouldShowPreview(true);
    };

    const handleBack = () => {
        setCurrentCanvas(null);
    };

    const handleSave = async (payload) => {
        if (!currentCanvas?.id) {
            message.open({
                type: "error",
                content: "Canvas mapping id not found",
                style: { zIndex: 5000 },
                duration: 4,
            });
            return false;
        }

        try {
            const file = new File(
                [JSON.stringify(payload)],
                `${currentCanvas?.title || "canvas"}.excalidraw`,
                { type: "application/json" },
            );
            const res = await editMapping(currentCanvas.id, file);
            if (res?.status !== true) {
                trackEvent("drawing_canvas_api_failed", {
                    ...trackingAttrs,
                    api_name: "editMapping",
                    error_code: res?.code || "FAILED",
                    error_message: res?.message || "Failed to save canvas",
                });
                message.open({
                    type: "error",
                    content: res?.message || "Failed to save canvas",
                    style: { zIndex: 5000 },
                    duration: 4,
                });
                return false;
            }

            setSamples((prev) =>
                prev.map((s) =>
                    s.id === currentCanvas.id ? { ...s, scene: payload } : s,
                ),
            );
            message.open({
                type: "success",
                content: "Canvas saved successfully",
                style: { zIndex: 5000 },
                duration: 3,
            });
            setCurrentCanvas(null);
            return true;
        } catch (error) {
            trackEvent("drawing_canvas_api_failed", {
                ...trackingAttrs,
                api_name: "editMapping",
                error_code: error?.code || "EXCEPTION",
                error_message: error?.message || "Failed to save canvas",
            });
            message.open({
                type: "error",
                content: "Failed to save canvas",
                style: { zIndex: 5000 },
                duration: 4,
            });
            return false;
        }
    };

    return (
        <>
            <div className="appointment-wrap PatientDetailswrap p-2">
                <Card>
                    <div
                        className="d-flex flex-column"
                        style={{
                            height: "calc(100vh - 150px)",
                            paddingBottom: "40px",
                        }}
                    >
                        <div className="row">
                        {samples.map(sample => (
                            <div className="col-lg-3 col-md-4 col-sm-6 mb-4" key={sample.id}>
                                <DrawingCanvasCard 
                                    canvas={sample} 
                                    hideShowInRx={true} 
                                    onOpen={handleOpen}
                                    onPreview={handlePreview}
                                    onDuplicate={handleDuplicate}
                                    onDelete={() => handleDelete(sample.id)}
                                    onRename={handleRename}
                                    trackingAttrs={trackingAttrs}
                                />
                            </div>
                        ))}
                        </div>
                    </div>
                </Card>
            </div>
            <Drawer
                title={null}
                placement="right"
                closable={false}
                onClose={handleBack}
                open={!!currentCanvas}
                width="100%"
                bodyStyle={{ padding: 0 }}
                push={false}
                zIndex={2000}
            >
                {currentCanvas && (
                    <div style={{ height: "100vh", position: "relative" }}>
                        <ExcalidrawEditor
                            canvasId={currentCanvas.id}
                            canvasName={currentCanvas.title}
                            initialData={currentCanvas.scene}
                            onSave={handleSave}
                            onBack={handleBack}
                            onOpenTemplates={() => {}}
                        />
                    </div>
                )}
            </Drawer>
            <Drawer
                title={null}
                placement="right"
                closable={false}
                onClose={() => setShouldShowPreview(false)}
                open={shouldShowPreview}
                width="100%"
                bodyStyle={{ padding: 0, backgroundColor: "#222222" }}
                push={false}
                zIndex={3000}
            >
                <CanvasPreview
                    onClose={() => setShouldShowPreview(false)}
                    canvasName={samples.find(c => c?.id === previewCanvasId)?.title || "Untitled Canvas"}
                    scene={samples.find(c => c?.id === previewCanvasId)?.scene}
                    handleEdit={() => {
                        trackEvent("drawing_canvas_preview_edit_clicked", {
                            ...trackingAttrs,
                            canvas_id: previewCanvasId,
                        });
                        setShouldShowPreview(false);
                        handleOpen(samples.find(c => c?.id === previewCanvasId));
                    }}
                    handleDelete={() => {
                        handleDelete(previewCanvasId);
                        setShouldShowPreview(false);
                    }}
                />
            </Drawer>
        </>
    );
};

export default VisitDrawingCanvases;
