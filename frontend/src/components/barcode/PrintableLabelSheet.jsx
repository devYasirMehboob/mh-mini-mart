/**
 * Compact printable barcode labels.
 * Labels are packed together while keeping enough quiet zone for scanner reads.
 */
export default function PrintableLabelSheet({ labels, isQz = false }) {
  if (!labels || labels.length === 0) return null;

  return (
    <div
      className={`${isQz ? "" : "hidden print:block label-print-root"} font-sans text-black bg-white`}
      style={{ background: "#fff", color: "#000" }}
    >
      <style>{`
        @media print {
          @page { margin: 4mm; size: auto; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .label-print-root { display: block !important; }
        }
        .barcode-label-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 38mm);
          grid-auto-rows: 20mm;
          gap: 1.5mm 1.5mm;
          align-items: start;
          justify-content: start;
          background: #fff;
          color: #000;
        }
        .barcode-label-card {
          width: 38mm;
          height: 20mm;
          padding: 1.5mm 2mm 1mm;
          break-inside: avoid;
          page-break-inside: avoid;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #fff;
          color: #000;
        }
        .barcode-label-symbol {
          width: 34mm;
          height: 12mm;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .barcode-label-symbol svg {
          width: 100% !important;
          height: 100% !important;
          display: block;
          shape-rendering: crispEdges;
        }
        .barcode-label-digits {
          margin-top: 0.8mm;
          max-width: 34mm;
          font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
          font-size: 7px;
          line-height: 1.1;
          letter-spacing: 1px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          color: #000;
        }
      `}</style>

      <div className="barcode-label-grid">
        {labels.map((label, index) => (
          <div key={`${label.barcode}-${index}`} className="barcode-label-card">
            <div
              className="barcode-label-symbol"
              dangerouslySetInnerHTML={{ __html: label.svg }}
            />
            <div className="barcode-label-digits">{label.barcode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
