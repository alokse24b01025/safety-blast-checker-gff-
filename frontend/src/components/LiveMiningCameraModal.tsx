import { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { detectMiningVisionStream } from '../api/client.ts';

interface LiveMiningCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDetection: (data: any) => void;
}

export default function LiveMiningCameraModal({ isOpen, onClose, onApplyDetection }: LiveMiningCameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('● Initializing Live AI Camera Feed...');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<any>(null);

  // Initialize WebRTC MediaDevices Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let activeStream: MediaStream | null = null;
    const startWebRTCCamera = async () => {
      try {
        setCameraError(null);
        setStatusMessage('● Accessing Mining Camera Stream...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setStatusMessage('● Detecting mining area parameters in real time...');
      } catch (err: any) {
        console.warn('WebRTC Camera Notice:', err);
        setCameraError('Camera stream blocked or unavailable. Visual detection simulation mode active.');
        setStatusMessage('● Visual Object Detection Pipeline Active');
      }
    };

    startWebRTCCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [isOpen]);

  // Continuous Frame Analysis Loop (300ms stream interval)
  useEffect(() => {
    if (!isOpen) return;

    const processLiveFrame = async () => {
      if (isDetecting) return;

      let base64Frame = '';
      if (videoRef.current && hiddenCanvasRef.current) {
        const video = videoRef.current;
        const canvas = hiddenCanvasRef.current;
        if (video.readyState >= 2) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            base64Frame = canvas.toDataURL('image/jpeg', 0.80);
          }
        }
      }

      setIsDetecting(true);
      try {
        const res = await detectMiningVisionStream(base64Frame || 'mock_frame');
        setTelemetry(res);
        if (res.status) {
          setStatusMessage(res.status);
        }

        // Draw Bounding Boxes on Overlay Canvas
        if (overlayCanvasRef.current && videoRef.current && res.bounding_boxes) {
          const overlayCanvas = overlayCanvasRef.current;
          const video = videoRef.current;
          overlayCanvas.width = video.clientWidth || 640;
          overlayCanvas.height = video.clientHeight || 480;
          const ctx = overlayCanvas.getContext('2d');

          if (ctx) {
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            const scaleX = overlayCanvas.width / 1000;
            const scaleY = overlayCanvas.height / 1000;

            res.bounding_boxes.forEach((b: any) => {
              const [ymin, xmin, ymax, xmax] = b.box_normalized || [200, 200, 800, 800];
              const x = xmin * scaleX;
              const y = ymin * scaleY;
              const w = (xmax - xmin) * scaleX;
              const h = (ymax - ymin) * scaleY;

              const isHelmet = b.label === 'helmet';
              const isWarning = b.label === 'no_helmet';
              const strokeColor = isWarning ? '#ef4444' : isHelmet ? '#eab308' : '#22c55e';

              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 3;
              ctx.strokeRect(x, y, w, h);

              // Label background banner
              ctx.fillStyle = strokeColor;
              const labelText = `${b.label.toUpperCase()} ${Math.round((b.confidence || 0.95) * 100)}%`;
              ctx.font = 'bold 11px monospace';
              const textWidth = ctx.measureText(labelText).width;
              ctx.fillRect(x, Math.max(0, y - 18), textWidth + 10, 18);

              ctx.fillStyle = '#000000';
              ctx.fillText(labelText, x + 5, Math.max(12, y - 4));
            });
          }
        }
      } catch (err) {
        console.warn('Stream processing loop note:', err);
      } finally {
        setIsDetecting(false);
      }
    };

    streamIntervalRef.current = setInterval(processLiveFrame, 400);

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [isOpen, isDetecting]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    onClose();
  };

  const handleApply = () => {
    onApplyDetection(telemetry);
    handleClose();
  };

  if (!isOpen) return null;

  const checklist = telemetry?.checklist || {
    worker_detected: false,
    helmet_detected: false,
    no_helmet_warning: false,
    equipment_detected: false,
    lighting_detected: false,
    detonator_detected: false,
  };

  const isCompleted = telemetry?.completed || (checklist.worker_detected && checklist.helmet_detected);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-mining-card border border-mining-border w-full max-w-2xl rounded-2xl p-5 flex flex-col gap-4 shadow-2xl relative font-sans">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center pb-3 border-b border-mining-border">
          <div className="flex items-center gap-2">
            <Camera className="text-blue-400" size={20} />
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Live AI Mining Vision Camera Detector
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-white bg-mining-dark border border-mining-border rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {cameraError && (
          <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Live Camera Viewfinder Screen with Bounding Boxes */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-blue-500/40 flex items-center justify-center shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={hiddenCanvasRef} className="hidden" />
          <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {/* Real-time Status Banner Top Overlay */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm border border-blue-500/40 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold text-blue-300 flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
              <span>LIVE YOLO VISION ENGINE • FASTAPI</span>
            </div>

            {isCompleted ? (
              <div className="bg-green-950/90 border border-green-500/80 px-3.5 py-1.5 rounded-xl text-xs font-mono font-black text-green-300 flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-bounce">
                <ShieldCheck size={15} />
                <span>✓ Detection Successfully Completed</span>
              </div>
            ) : (
              <div className="bg-black/80 border border-amber-500/40 px-3 py-1.5 rounded-xl text-[11px] font-mono text-amber-300 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                <span>● Detecting mining parameters...</span>
              </div>
            )}
          </div>

          {/* Real-Time Detection Checklist Status Indicator Overlay (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-20 bg-black/85 backdrop-blur-md p-3 rounded-xl border border-blue-500/30 font-mono text-[11px] flex flex-col gap-1.5 shadow-2xl min-w-[220px]">
            <div className="text-gray-400 font-bold border-b border-gray-800 pb-1 flex justify-between items-center">
              <span>DETECTION TELEMETRY</span>
              <span className="text-[9px] text-blue-400">YOLOv8</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Workers / Personnel:</span>
              {checklist.worker_detected ? (
                <span className="text-green-400 font-bold">✓ Worker detected</span>
              ) : (
                <span className="text-gray-500">Not detected</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>Safety Helmets:</span>
              {checklist.helmet_detected ? (
                <span className="text-green-400 font-bold">✓ Helmet detected</span>
              ) : checklist.no_helmet_warning ? (
                <span className="text-red-400 font-bold">🔴 No Helmet Warning</span>
              ) : (
                <span className="text-amber-400">Needs verification</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>Mining Equipment:</span>
              {checklist.equipment_detected ? (
                <span className="text-green-400 font-bold">✓ Equipment detected</span>
              ) : (
                <span className="text-gray-500">Not detected</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>Mining Area Lighting:</span>
              {checklist.lighting_detected ? (
                <span className="text-green-400 font-bold">✓ Lighting detected</span>
              ) : (
                <span className="text-gray-500">Not detected</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>Detonator Enclosure:</span>
              {checklist.detonator_detected ? (
                <span className="text-green-400 font-bold">✓ Verified Secure</span>
              ) : (
                <span className="text-gray-500">Not detected</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-gray-400 font-mono">
            {statusMessage}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-mining-dark border border-mining-border rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleApply}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-black uppercase transition-all flex items-center gap-2 shadow-lg ${
                isCompleted
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              }`}
            >
              <Check size={14} />
              <span>✓ APPLY DETECTION TO FORM</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
