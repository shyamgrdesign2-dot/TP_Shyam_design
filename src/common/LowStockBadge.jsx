const LowStockBadge = ({ show, className, style }) => {
  if (!show) return null;
  return (
    <span
      className={`d-inline-flex align-items-center text-white ${className || "ms-1"}`}
      style={{
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 10,
        background: "#d32f2f",
        ...style,
      }}
    >
      Low Stock
    </span>
  );
};

export default LowStockBadge;
