"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useState } from "react";

export function AvatarUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500 mx-auto shadow-lg">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <CldUploadWidget
  uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
  options={{ sources: ["local", "camera"], maxFiles: 1, multiple: false, resourceType: "image" }}
  onSuccess={(result: any) => {
    if (result?.info?.secure_url) {
      setPreview(result.info.secure_url);
      onUpload(result.info.secure_url);
    }
  }}
  onError={(err: any) => console.error("Upload failed:", err)}
>
        {({ open }: any) => (
          <button type="button" onClick={() => open()} className="w-full rounded-xl bg-slate-100 py-3 px-4 font-medium text-slate-700 hover:bg-slate-200 transition flex items-center justify-center gap-2">
            <span className="text-xl">📷</span>
            {preview ? "Cambiar foto" : "Subir foto"}
          </button>
        )}
      </CldUploadWidget>
      <p className="text-xs text-slate-400 text-center">Máx 5MB · JPG, PNG, WebP</p>
    </div>
  );
}
