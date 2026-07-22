import React from "react";

function ReadableStock({ quantity, unitType }) {
  if (quantity === undefined || quantity === null) return <span>—</span>;
  
  const numQuantity = Number(quantity);
  const type = String(unitType || "").toLowerCase();

  if (type === "gram" || type === "grams") {
    if (numQuantity >= 1000) {
      return <span>{(numQuantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} Kg</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} g</span>;
  }

  if (type === "millilitre" || type === "milliliter" || type === "ml") {
    if (numQuantity >= 1000) {
      return <span>{(numQuantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} L</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })} ml</span>;
  }

  if (type === "kilogram" || type === "kg" || type === "kilos") {
    if (numQuantity < 1 && numQuantity > 0) {
      return <span>{(numQuantity * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} g</span>;
    }
    return <span>{numQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} Kg</span>;
  }

  return (
    <span>
      {numQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {unitType}
    </span>
  );
}

export default ReadableStock;
