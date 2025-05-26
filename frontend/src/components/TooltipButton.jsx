import React from "react";

const Tooltip = ({ children, tooltip, position = "top", className = "" }) => {
  return (
    <div className={`tooltip-container ${className}`}>
      {children}
      <span className={`tooltip-text ${position === "bottom" ? "tooltip-bottom" : ""}`}>
        {tooltip}
      </span>
    </div>
  );
};

export default Tooltip;