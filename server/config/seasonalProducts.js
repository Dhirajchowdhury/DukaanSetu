const seasonalMap = {
  1: ['Warm Clothes', 'Heaters', 'Blankets', 'Sweaters', 'Winter Accessories'],
  2: ['Warm Clothes', 'Heaters', 'Blankets', 'Sweaters'],
  3: ['Stationery', 'School Supplies', 'Snacks'],
  4: ['Cold Drinks', 'Juices', 'Summer Snacks', 'Sunscreen'],
  5: ['Cold Drinks', 'Juices', 'Ice Cream', 'Electrolyte Drinks'],
  6: ['Cold Drinks', 'Fans', 'Air Coolers', 'Ice Cream', 'Mangoes'],
  7: ['Cold Drinks', 'Fans', 'Umbrellas', 'Raincoats', 'Mosquito Repellent'],
  8: ['Cold Drinks', 'School Supplies', 'Stationery'],
  9: ['Festival Sweets', 'Snacks', 'Biscuits', 'Oils & Ghee'],
  10: ['Festival Sweets', 'Snacks', 'Decorations', 'Oils & Ghee', 'Spices'],
  11: ['Festival Sweets', 'Snacks', 'Warm Clothes', 'Blankets', 'Lighting'],
  12: ['Warm Clothes', 'Heaters', 'Blankets', 'Festival Sweets', 'Sweaters', 'Party Supplies'],
};

const getCurrentSeasonalCategories = () => {
  const month = new Date().getMonth() + 1;
  return seasonalMap[month] || ['General'];
};

module.exports = { seasonalMap, getCurrentSeasonalCategories };
