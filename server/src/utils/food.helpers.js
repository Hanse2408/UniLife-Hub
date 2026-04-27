function calculateTotals(items = []) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);
    return sum + price * quantity;
  }, 0);

  const deliveryFee = subtotal > 0 ? 300 : 0;
  const total = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    total,
  };
}

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day; // make Monday the first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  calculateTotals,
  getStartOfWeek,
};
