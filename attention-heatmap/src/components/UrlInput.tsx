'use client';

import { useState, useRef, useCallback } from 'react';

interface UrlInputProps {
  onAnalyseUrl: (url: string) => void;
  onAnalyseImage: (base64: string) => void;
  isLoading: boolean;
  status: string;
}

export default function UrlInput({ onAnalyseUrl, onAnalyseImage, isLoading, status }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyseUrl(url.trim());
    }
  };

  const handleFileChange = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
        alert('Please upload a PNG, JPG, or WEBP image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        onAnalyseImage(base64);
      };
      reader.readAsDataURL(file);
    },
    [onAnalyseImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [handleFileChange]
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? 'Working…' : 'Analyse'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-zinc-700" />
        <span className="text-zinc-500 text-sm uppercase tracking-wider">or upload a screenshot</span>
        <div className="flex-1 h-px bg-zinc-700" />
      </div>

      {/* File Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
          className="hidden"
        />
        <div className="text-zinc-400">
          <svg
            className="w-8 h-8 mx-auto mb-3 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">
            Drop a screenshot here, or <span className="text-blue-400 underline">browse</span>
          </p>
          <p className="text-xs text-zinc-600 mt-1">PNG, JPG, or WEBP</p>
        </div>
      </div>

      {/* Loading Status */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 text-zinc-400">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">{status}</span>
        </div>
      )}
    </div>
  );
}
