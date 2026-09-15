import React from "react";

function ReadableStock({ quantity, unitType }) {
  if (quantity === undefined || quantity === null) return <span>—</span>;
  
  const numQuantity = Number(quantity);
  const type = String(unitType || "").toLowerCase();

  if (type.includes("kilo") || type === "kg") {
    if (numQuantity < 1 && numQuantity > 0) {
      return <span>{(numQuantity * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} g</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg</span>;
  }

  if (type === "gram" || type === "grams" || type === "g") {
    if (numQuantity >= 1000) {
      return <span>{(numQuantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} g</span>;
  }

  if (type === "liter" || type === "liters" || type === "l") {
    if (numQuantity < 1 && numQuantity > 0) {
      return <span>{(numQuantity * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} ml</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} L</span>;
  }

  if (type.includes("milli") || type === "ml") {
    if (numQuantity >= 1000) {
      return <span>{(numQuantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} L</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ml</span>;
  }

  return (
    <span>
      {numQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {unitType}
    </span>
  );
}

export default ReadableStock;
