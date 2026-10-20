import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignaturePad({ onChange }) {
  const sigRef = useRef(null);
  const [saved, setSaved] = useState(false);

  const clearSignature = () => {
    sigRef.current.clear();
    onChange(null);
    setSaved(false);
  };

  const saveSignature = () => {
    console.log("Save button clicked");

    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Please draw your signature before saving.");
      return;
    }

    // FIX: react-signature-canvas NO LONGER supports getTrimmedCanvas()
    const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");

    console.log("Signature saved:", dataUrl.substring(0, 50));

    onChange(dataUrl);
    setSaved(true);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Signature</h3>

      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{
          width: 950,
          height: 250,
          className: "border rounded bg-white"
        }}
      />

      <div className="flex gap-3 mt-3">
        <button
          type="button"
          onClick={clearSignature}
          className="px-3 py-1 bg-gray-600 text-white rounded"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={saveSignature}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Save
        </button>
      </div>

      {saved && (
        <p className="mt-2 text-green-600 text-sm">
          Signature saved ✔
        </p>
      )}
    </div>
  );
}
