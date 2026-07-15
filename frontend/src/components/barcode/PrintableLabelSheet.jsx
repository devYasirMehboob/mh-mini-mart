/**
 * A hidden component that only shows up when printing.
 * Configured for A4 sheets with standard labels (e.g. 3x8 layout = 24 labels/sheet)
 */
export default function PrintableLabelSheet({ labels, isQz = false }) {
  if (!labels || labels.length === 0) return null;

  return (
    <div className={`${isQz ? "" : "hidden print:block"} font-sans text-black bg-white`}>
      {/* We apply a CSS grid for standard 3-column A4 sticker sheets. */}
      {/* Adjust gap and sizing to match specific physical label paper if needed. */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 p-4 text-center">
        {labels.map((label, index) => (
          <div key={index} className="flex flex-col items-center justify-center border border-dashed border-gray-300 p-2 break-inside-avoid h-[1.5in]">
            {/* Store Name & Price */}
            <div className="flex w-full justify-between px-1 text-xs font-bold mb-1">
              <span className="truncate w-3/4 text-left">{label.product_name}</span>
              <span className="w-1/4 text-right">${Number(label.price).toFixed(2)}</span>
            </div>
            
            {/* SVG Barcode rendered inline via dangerouslySetInnerHTML */}
            <div 
              className="w-full flex-1 flex items-center justify-center overflow-hidden" 
              dangerouslySetInnerHTML={{ __html: label.svg }} 
            />
            
            {/* Barcode digits */}
            <div className="text-[10px] font-mono tracking-widest mt-0.5">
              {label.barcode}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
