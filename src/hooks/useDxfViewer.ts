// src/hooks/useDxfViewer.ts
import { useRef, useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { DxfViewer } from "dxf-viewer";
import * as THREE from "three";
// Import our new flattener along with the other utils
import { convertSceneToModel } from '../utils/dxfToJsonConverter';
import type { DrawingEntity } from "../models";

const PHASE_LABELS: Record<string, string> = {
  fetch: "Downloading",
  parse: "Parsing",
  prepare: "Preparing",
  font: "Loading Fonts",
};

export function useDxfViewer() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const viewerRef = useRef<DxfViewer | null>(null);

  const [drawingData, setDrawingData] = useState<DrawingEntity[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadPhase, setLoadPhase] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new DxfViewer(containerRef.current, {
      autoResize: true,
      antialias: true,
      clearColor: new THREE.Color(0xf0f0f0),
    });
    viewerRef.current = viewer;

    return () => {
      viewer.Destroy();
    };
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewerRef.current) return;
    
    setIsLoading(true);
    setDrawingData(null); 
    setLoadProgress(0);
    setLoadPhase("");
    
    const viewer = viewerRef.current;
    
    await viewer.Load({
        url: URL.createObjectURL(file),
        fonts: [],
        progressCbk: (phase, processedSize, totalSize) => {
            const label = PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase;
            setLoadPhase(label);
            const pct = totalSize > 0 ? Math.round((processedSize * 100) / totalSize) : 0;
            setLoadProgress(pct);
        },
        workerFactory: null
    });
    
    const scene = viewer.GetScene();

    // --- NEW STEP: Flatten the scene first ---
    console.log("Flattening scene geometry...");
    
    // Now, convert the already-flattened scene to our model.
    const model = convertSceneToModel(scene);
    setDrawingData(model);
    setIsLoading(false);
  };
  
  const exportModelAsJson = () => {
    if (!drawingData || drawingData.length === 0) {
      alert("No data to export.");
      return;
    }

    const jsonString = JSON.stringify(drawingData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.json";
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    containerRef,
    handleFile,
    isLoading,
    loadProgress,
    loadPhase,
    drawingData,
    exportModelAsJson,
  };
}