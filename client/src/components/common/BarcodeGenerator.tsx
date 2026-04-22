import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
  lineColor?: string;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ 
  value, 
  format = "CODE128", 
  width = 1.5, 
  height = 30, 
  displayValue = false,
  className = "",
  lineColor = "#000000"
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          margin: 0,
          background: "transparent",
          lineColor
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [value, format, width, height, displayValue, lineColor]);

  if (!value) return null;

  return (
    <svg ref={svgRef} className={className} />
  );
};

export default BarcodeGenerator;
