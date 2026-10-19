import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  X,
  QrCode,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  Monitor,
  Laptop,
  Server,
  Printer,
  Network,
  Cpu,
  Plus,
  ArrowRight,
  Sparkles,
  FileImage,
  Layers,
} from 'lucide-react';
import { Computer } from '../../types';
import { Badge } from '../common/Badge';
import { ComputerStatusIndicator } from './ComputerStatusIndicator';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  computers: Computer[];
  onSelectComputer: (computer: Computer) => void;
  onSearchAndClose: (searchTerm: string) => void;
  onOpenCreateWithTag?: (assetTag: string) => void;
  onOpenCreateTicketWithAsset?: (asset: Computer) => void;
  canManage?: boolean;
}

type TabMode = 'camera' | 'upload' | 'samples';

export const QRCodeScannerModal: React.FC<QRCodeScannerModalProps> = ({
  isOpen,
  onClose,
  computers,
  onSelectComputer,
  onSearchAndClose,
  onOpenCreateWithTag,
  onOpenCreateTicketWithAsset,
  canManage = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scan state
  const [isScanning, setIsScanning] = useState(true);
  const [scannedRawText, setScannedRawText] = useState<string | null>(null);
  const [matchedComputer, setMatchedComputer] = useState<Computer | null>(null);
  const [noMatchDetected, setNoMatchDetected] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Image Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play pleasant sound chime on detection
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      // Also trigger light haptic vibration if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {
      // AudioContext might be blocked or unavailable; fail silently
    }
  }, [soundEnabled]);

  // Clean raw scanned text to match asset tag, serial, or id
  const parseScannedPayload = useCallback(
    (text: string): { cleanTag: string; matched: Computer | null } => {
      const raw = text.trim();

      // Check if it's a URL (e.g., https://.../inventory?tag=AST-2024-001 or ?id=123)
      let extracted = raw;
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
          const parsedUrl = new URL(raw);
          const tagParam = parsedUrl.searchParams.get('tag') ||
                           parsedUrl.searchParams.get('assetTag') ||
                           parsedUrl.searchParams.get('id');
          if (tagParam) {
            extracted = tagParam.trim();
          } else {
            // Check last segment of pathname
            const segments = parsedUrl.pathname.split('/').filter(Boolean);
            if (segments.length > 0) {
              extracted = segments[segments.length - 1];
            }
          }
        } catch {
          // ignore url parse error
        }
      }

      // Check if it's a JSON string
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const obj = JSON.parse(raw);
          if (obj.assetTag) extracted = String(obj.assetTag).trim();
          else if (obj.tag) extracted = String(obj.tag).trim();
          else if (obj.serialNumber) extracted = String(obj.serialNumber).trim();
          else if (obj.id) extracted = String(obj.id).trim();
        } catch {
          // ignore json parse error
        }
      }

      const query = extracted.toLowerCase();
      // Look up in computers list
      const found = computers.find((c) => {
        const matchTag = c.assetTag && c.assetTag.toLowerCase() === query;
        const matchSerial = c.serialNumber && c.serialNumber.toLowerCase() === query;
        const matchHostname = c.hostname && c.hostname.toLowerCase() === query;
        const matchId = c.id && c.id.toLowerCase() === query;
        return matchTag || matchSerial || matchHostname || matchId;
      });

      return { cleanTag: extracted, matched: found || null };
    },
    [computers]
  );

  // Stop video stream and release tracks
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Handle successful QR detection
  const handleDecodedString = useCallback(
    (codeData: string) => {
      setIsScanning(false);
      setScannedRawText(codeData);
      playScanBeep();

      const { cleanTag, matched } = parseScannedPayload(codeData);

      if (matched) {
        setMatchedComputer(matched);
        setNoMatchDetected(false);
      } else {
        setMatchedComputer(null);
        setNoMatchDetected(true);
        setScannedRawText(cleanTag);
      }
    },
    [parseScannedPayload, playScanBeep]
  );

  // Continuous frame loop for scanning
  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'],
        });
      } catch {
        barcodeDetector = null;
      }
    }

    const tick = async () => {
      if (!isScanning) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Try BarcodeDetector first if supported
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(canvas);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0];
              if (detected.boundingBox) {
                setDetectedLocation({
                  top: detected.boundingBox.top,
                  left: detected.boundingBox.left,
                  width: detected.boundingBox.width,
                  height: detected.boundingBox.height,
                });
              }
              handleDecodedString(detected.rawValue);
              return;
            }
          } catch {
            // fallback to jsQR below
          }
        }

        // Standard jsQR fallback (pure JS, 100% reliable)
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleDecodedString(code.data);
            return;
          }
        } catch {
          // ignore per-frame parse error
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);
  }, [isScanning, handleDecodedString]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser environment. You can use the "Upload Tag Image" or "Sample Tags" tab instead.'
      );
      return;
    }

    try {
      // Build video constraints
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraints.facingMode = { ideal: 'environment' };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : null;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        setIsScanning(true);
        startScanLoop();
      }

      // Enumerate devices for selector
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const error = err as Error;
      let friendlyMessage = 'Unable to access the camera.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        friendlyMessage =
          'Camera access was denied. Please allow camera permissions in your browser or switch to "Upload Tag Image".';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        friendlyMessage =
          'No camera was found on this device. Please connect a webcam or use the "Upload Tag Image" option.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        friendlyMessage =
          'Camera is already in use by another application or tab. Please close other camera apps and retry.';
      }
      setCameraError(friendlyMessage);
      setIsCameraActive(false);
    }
  }, [selectedDeviceId, startScanLoop, stopCamera]);

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !isTorchOn;
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
    } catch {
      // Torch toggle failed
    }
  };

  // Reset scan state to scan again
  const handleScanAgain = () => {
    setMatchedComputer(null);
    setNoMatchDetected(false);
    setScannedRawText(null);
    setDetectedLocation(null);
    setIsScanning(true);
    if (activeTab === 'camera') {
      startScanLoop();
    }
  };

  // Handle image file upload for scanning
  const handleImageUpload = (file: File) => {
    if (!file) return;
    setUploadLoading(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImagePreview(dataUrl);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadLoading(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        setUploadLoading(false);

        if (code && code.data) {
          handleDecodedString(code.data);
        } else {
          setNoMatchDetected(true);
          setScannedRawText('No readable QR code found in uploaded image');
        }
      };
      img.onerror = () => {
        setUploadLoading(false);
        setCameraError('Failed to load image file. Please provide a valid JPG, PNG, or WebP file.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Lifecycle when modal opens/closes or activeTab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
      setMatchedComputer(null);
      setNoMatchDetected(false);
      setScannedRawText(null);
      setIsScanning(true);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  if (!isOpen) return null;

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'desktop':
      case 'workstation':
        return <Monitor className="w-5 h-5 text-indigo-600" />;
      case 'laptop':
        return <Laptop className="w-5 h-5 text-indigo-600" />;
      case 'server':
        return <Server className="w-5 h-5 text-indigo-600" />;
      case 'printer':
        return <Printer className="w-5 h-5 text-indigo-600" />;
      case 'network_device':
        return <Network className="w-5 h-5 text-indigo-600" />;
      default:
        return <Cpu className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Scan Hardware Physical Tag</h2>
              <p className="text-xs text-slate-500">
                Point your camera at a computer's QR code or barcode sticker to pull up details instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
              title={soundEnabled ? 'Mute scan beep' : 'Enable scan beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                handleScanAgain();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('samples');
                stopCamera();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Quick Test Tags</span>
            </button>
          </div>

          {activeTab === 'camera' && availableDevices.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setTimeout(() => startCamera(), 100);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Camera Feed Viewport */}
              <div className="relative w-full aspect-video sm:aspect-16/10 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Reticle / Viewfinder Overlay */}
                {isCameraActive && isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Darkened backdrop with transparent scanning center box */}
                    <div className="relative w-64 h-64 border-2 border-indigo-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] flex items-center justify-center overflow-hidden">
                      {/* Laser scanning line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_#818cf8] animate-pulse -translate-y-full animate-[bounce_2s_infinite]" />

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-indigo-300 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-indigo-300 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-indigo-300 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-indigo-300 rounded-br-lg" />

                      <p className="text-[11px] font-medium text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full shadow-xs tracking-wide">
                        Align tag in frame
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 font-medium mt-4 bg-slate-900/70 backdrop-blur-xs px-3 py-1 rounded-full shadow-sm">
                      Supports QR codes, asset barcodes & serial labels
                    </p>
                  </div>
                )}

                {/* Camera Inactive / Error Overlay */}
                {(!isCameraActive || cameraError) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white space-y-3 z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                      <CameraOff className="w-6 h-6" />
                    </div>
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-white">Camera Access Required</p>
                      <p className="text-xs text-slate-300 mt-1">
                        {cameraError ||
                          'Click Start Camera to initialize the live video stream from your device.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Start Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo Instead</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Torch / Flash Toggle Button */}
                {isCameraActive && hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`absolute bottom-3 right-3 p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-slate-800/90 text-white hover:bg-slate-700'
                    }`}
                    title="Toggle Camera Flashlight"
                  >
                    {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label
                htmlFor="tag-image-upload"
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <FileImage className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Select or drag a computer tag image
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload a photo of an asset sticker, QR label, or barcode from your computer or phone.
                </p>
                <input
                  id="tag-image-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Browse Image Files</span>
                </span>
              </label>

              {uploadLoading && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Scanning uploaded image for QR code or barcode...</span>
                </div>
              )}

              {uploadedImagePreview && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded tag preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">Image Analyzed</p>
                    <p className="text-slate-500">Processed by internal high-precision decoder</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SAMPLES TAB */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-700">
                <p className="font-semibold text-indigo-950 mb-0.5">Quick Testing Sandbox</p>
                <p className="text-slate-600">
                  Click any hardware tag below to simulate a real physical scan without needing to aim a camera:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {computers.slice(0, 10).map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => handleDecodedString(comp.assetTag)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 text-left transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getAssetIcon(comp.type)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-mono font-bold text-slate-900 group-hover:text-indigo-600">
                          {comp.assetTag}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {comp.brand} {comp.model}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Simulate Scan →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MATCH RESULT CARD */}
          {matchedComputer && (
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 shadow-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Hardware Asset Matched
                      </span>
                      <ComputerStatusIndicator status={matchedComputer.status} size="sm" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {matchedComputer.brand} {matchedComputer.model}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
                >
                  Scan another
                </button>
              </div>

              {/* Asset Meta Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Asset Tag</span>
                  <p className="font-mono font-bold text-slate-900">{matchedComputer.assetTag}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Serial Number</span>
                  <p className="font-mono font-medium text-slate-800">{matchedComputer.serialNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Assigned Custody</span>
                  <p className="font-medium text-slate-800 truncate">
                    {matchedComputer.assignedEmployeeName || 'Unassigned / In Pool'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Location</span>
                  <p className="font-medium text-slate-800 truncate">
                    {matchedComputer.location || 'HQ'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectComputer(matchedComputer);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-2xs transition-colors"
                >
                  <span>Open Full Asset Specs & History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSearchAndClose(matchedComputer.assetTag);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter Inventory View</span>
                </button>

                {onOpenCreateTicketWithAsset && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateTicketWithAsset(matchedComputer);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Ticket for this Asset</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* NO MATCH DETECTED WARNING */}
          {noMatchDetected && !matchedComputer && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 shadow-2xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Tag Decoded, But Asset Not Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Scanned code: <span className="font-mono font-bold text-slate-900">{scannedRawText}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    No hardware asset currently in the system matches this tag or serial number.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => {
                    if (scannedRawText) onSearchAndClose(scannedRawText);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Search Inventory for "{scannedRawText}"</span>
                </button>

                {canManage && onOpenCreateWithTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (scannedRawText) onOpenCreateWithTag(scannedRawText);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Computer with this Tag</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Again</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {computers.length} assets cataloged in inventory database
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
