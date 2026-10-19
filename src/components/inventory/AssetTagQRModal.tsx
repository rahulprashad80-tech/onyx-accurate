import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Building2,
  Cpu,
  Monitor,
  Laptop,
} from 'lucide-react';
import { Computer } from '../../types';

interface AssetTagQRModalProps {
  computer: Computer | null;
  isOpen: boolean;
  onClose: () => void;
  onTestInScanner?: () => void;
}

export const AssetTagQRModal: React.FC<AssetTagQRModalProps> = ({
  computer,
  isOpen,
  onClose,
  onTestInScanner,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!computer) return;
    // Generate QR code data URL containing the asset tag
    QRCode.toDataURL(computer.assetTag, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [computer]);

  if (!isOpen || !computer) return null;

  const handleCopyTag = () => {
    navigator.clipboard.writeText(computer.assetTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `AssetTag-${computer.assetTag}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Physical Asset Tag Sticker</h2>
              <p className="text-xs text-slate-500">Official IT hardware barcode & QR label</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Asset Tag Sticker Card */}
        <div className="p-6 flex flex-col items-center">
          <div
            id="printable-asset-tag"
            className="w-full max-w-xs bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sm text-center flex flex-col items-center space-y-2.5"
          >
            {/* Header label */}
            <div className="flex items-center justify-between w-full border-b-2 border-slate-900 pb-1.5 text-left">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block">
                  IT Hardware Asset
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Property of Enterprise IT</span>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-900" />
            </div>

            {/* High-res QR Code */}
            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR tag for ${computer.assetTag}`}
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Big Asset Tag in Monospace */}
            <div className="w-full bg-slate-100 py-1.5 px-2 rounded border border-slate-300">
              <span className="text-xs font-mono font-black text-slate-900 tracking-wider">
                {computer.assetTag}
              </span>
            </div>

            {/* Hardware specifications summary */}
            <div className="w-full text-[11px] text-slate-700 text-left space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Hardware:</span>
                <span className="font-semibold truncate max-w-[170px] text-slate-900">
                  {computer.brand} {computer.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Serial:</span>
                <span className="font-mono font-medium text-slate-800">
                  {computer.serialNumber || 'N/A'}
                </span>
              </div>
              {computer.hostname && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Hostname:</span>
                  <span className="font-mono text-slate-800">{computer.hostname}</span>
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-400 italic">
              Scan with helpdesk camera to lookup specifications & tickets
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs">
            <button
              type="button"
              onClick={handleCopyTag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Tag'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Sticker dimensions: standard 2" x 2" label</span>
          {onTestInScanner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onTestInScanner();
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Test Tag in Scanner →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
