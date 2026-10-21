"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  Check,
  Loader2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfilePhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoURL?: string | null;
  userName?: string;
  onSavePhoto: (photoURL: string | null) => Promise<void>;
}

export function ProfilePhotoCropModal({
  isOpen,
  onClose,
  currentPhotoURL,
  userName = "Integrante",
  onSavePhoto,
}: ProfilePhotoCropModalProps) {
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedImageSrc(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor, selecione um arquivo de imagem válido (JPEG, PNG ou WebP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("A imagem selecionada é muito grande. Escolha uma foto menor que 15MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    reader.onerror = () => {
      setErrorMsg("Falha ao ler o arquivo de imagem selecionado.");
    };
    reader.readAsDataURL(file);
    // Clear input so same file can be re-selected if needed
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageSrc(reader.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Mouse / Touch Pan Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedImageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!selectedImageSrc || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Crop & Compress via Canvas
  const processAndSave = useCallback(async () => {
    if (!selectedImageSrc || !imageRef.current || !containerRef.current) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const circleSize = Math.min(containerRect.width, containerRect.height);

      // Target canvas resolution (256x256 is crisp on retina and ultra compact)
      const targetSize = 256;
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Não foi possível inicializar o processador de imagem.");
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Calculate rendered scale and position of image relative to container center
      const renderedWidth = img.width * zoom;
      const renderedHeight = img.height * zoom;

      // Center offset
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;

      // Image top-left in container coords
      const imgX = centerX - renderedWidth / 2 + pan.x;
      const imgY = centerY - renderedHeight / 2 + pan.y;

      // Mask circle in container coords
      const maskX = centerX - circleSize / 2;
      const maskY = centerY - circleSize / 2;

      // Scale factor from container pixels to target canvas pixels
      const scaleToCanvas = targetSize / circleSize;

      // Draw the portion of the image that lies inside the mask onto target canvas
      const destX = (imgX - maskX) * scaleToCanvas;
      const destY = (imgY - maskY) * scaleToCanvas;
      const destW = renderedWidth * scaleToCanvas;
      const destH = renderedHeight * scaleToCanvas;

      ctx.drawImage(img, destX, destY, destW, destH);

      // Export as WebP with 0.8 quality, or JPEG fallback
      let dataUrl = canvas.toDataURL("image/webp", 0.8);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      }

      await onSavePhoto(dataUrl);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar foto de perfil:", err);
      setErrorMsg(err?.message || "Ocorreu um erro ao salvar a foto de perfil.");
    } finally {
      setSaving(false);
    }
  }, [selectedImageSrc, zoom, pan, onSavePhoto, onClose]);

  const handleRemovePhoto = async () => {
    if (!confirm("Deseja realmente remover sua foto de perfil?")) return;
    setRemoving(true);
    setErrorMsg(null);
    try {
      await onSavePhoto(null);
      onClose();
    } catch (err: any) {
      console.error("Erro ao remover foto:", err);
      setErrorMsg(err?.message || "Ocorreu um erro ao remover a foto.");
    } finally {
      setRemoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  Foto de Perfil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving || removing}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedImageSrc ? (
            /* Upload Initial Stage */
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Clique para selecionar ou arraste uma foto
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Formatos suportados: JPG, PNG ou WebP (até 15MB)
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 pointer-events-none"
                >
                  Procurar no Dispositivo
                </button>
              </div>

              {currentPhotoURL && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={currentPhotoURL}
                      alt="Foto atual"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span className="text-xs text-slate-500">Foto atual configurada</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={removing}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                  >
                    {removing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Remover Foto
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Interactive Crop & Zoom Stage */
            <div className="space-y-6">
              {/* Preview Viewport Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative w-full h-72 sm:h-80 bg-slate-950 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
              >
                {/* The Pan-able & Zoom-able Image */}
                <img
                  ref={imageRef}
                  src={selectedImageSrc}
                  alt="Recorte"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                  }}
                  draggable={false}
                  className="max-w-none max-h-none pointer-events-none select-none"
                  onLoad={(e) => {
                    // Fit image appropriately initially
                    const img = e.currentTarget;
                    const container = containerRef.current;
                    if (!container) return;
                    const containerSize = Math.min(container.clientWidth, container.clientHeight);
                    const scale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
                    img.width = img.naturalWidth * scale;
                    img.height = img.naturalHeight * scale;
                  }}
                />

                {/* Circular Mask Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)]" />
                </div>

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-white/90 pointer-events-none flex items-center gap-1.5">
                  <span>Arraste para reposicionar</span>
                </div>
              </div>

              {/* Zoom & Control Bar */}
              <div className="flex items-center gap-3 px-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Redefinir enquadramento"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Escolher Outra
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={processAndSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Foto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
