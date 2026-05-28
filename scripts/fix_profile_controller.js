const fs = require('fs');
const file = 'server/controllers/profile.controller.js';
const src = fs.readFileSync(file, 'utf8');
const lines = src.split('\n');

// ── FIX 1: Bad connections query (lines 139-145, 0-indexed) ──────────────────
// Wrong: .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`)
// Wrong: connectedSet.add(c.user_id === req.user.id ? c.connected_user_id : c.user_id)
// Right: use shop_owner_id / wholesaler_id

const badConnQuery = "      .or(`user_id.eq.${req.user.id},connected_user_id.eq.${req.user.id}`);";
const goodConnQuery = "      .or(`shop_owner_id.eq.${req.user.id},wholesaler_id.eq.${req.user.id}`);";

const badConnMap = "      connectedSet.add(c.user_id === req.user.id ? c.connected_user_id : c.user_id);";
const goodConnMap = "      connectedSet.add(c.shop_owner_id === req.user.id ? c.wholesaler_id : c.shop_owner_id);";

// ── FIX 2: City filter uses user.city which doesn't exist ────────────────────
// Replace with address-based fallback (city is part of address/location_name)
const badCityFilter = [
  "      // City filter",
  "      if (city) {",
  "        const userCity = user.city || '';",
  "        if (!userCity.toLowerCase().includes(city.toLowerCase())) {",
  "          return;",
  "        }",
  "      }",
].join('\r\n');

const goodCityFilter = [
  "      // City filter — use address/location_name since users table has no city column",
  "      if (city) {",
  "        const userLocation = (user.location_name || user.address || '').toLowerCase();",
  "        if (!userLocation.includes(city.toLowerCase())) {",
  "          return;",
  "        }",
  "      }",
].join('\r\n');

// ── FIX 3: user.city / user.state in profiles.push() ────────────────────────
// Lines 248-249 and 263-264 — replace with null (columns don't exist)
const badCityState1 = "        city: user.city,\r\n        state: user.state,";
const goodCityState1 = "        city: null,\r\n        state: null,";

const badCityState2 = "          city: user.city,\r\n          state: user.state,";
const goodCityState2 = "          city: null,\r\n          state: null,";

let out = src;

// Apply fixes
if (out.includes(badConnQuery)) {
  out = out.replace(badConnQuery, goodConnQuery);
  console.log('✅ Fix 1a: connections query column names fixed');
} else {
  console.warn('⚠️  Fix 1a: pattern not found (may already be fixed)');
}

if (out.includes(badConnMap)) {
  out = out.replace(badConnMap, goodConnMap);
  console.log('✅ Fix 1b: connectedSet mapping fixed');
} else {
  console.warn('⚠️  Fix 1b: pattern not found (may already be fixed)');
}

if (out.includes(badCityFilter)) {
  out = out.replace(badCityFilter, goodCityFilter);
  console.log('✅ Fix 2: city filter fixed');
} else {
  // Try LF version
  const badCityFilterLF = badCityFilter.replace(/\r\n/g, '\n');
  const goodCityFilterLF = goodCityFilter.replace(/\r\n/g, '\n');
  if (out.includes(badCityFilterLF)) {
    out = out.replace(badCityFilterLF, goodCityFilterLF);
    console.log('✅ Fix 2 (LF): city filter fixed');
  } else {
    console.warn('⚠️  Fix 2: city filter pattern not found');
  }
}

if (out.includes(badCityState1)) {
  out = out.replace(badCityState1, goodCityState1);
  console.log('✅ Fix 3a: profiles.push city/state fixed');
} else {
  const lf = badCityState1.replace(/\r\n/g, '\n');
  if (out.includes(lf)) {
    out = out.replace(lf, goodCityState1.replace(/\r\n/g, '\n'));
    console.log('✅ Fix 3a (LF): profiles.push city/state fixed');
  } else {
    console.warn('⚠️  Fix 3a: profiles.push city/state pattern not found');
  }
}

if (out.includes(badCityState2)) {
  out = out.replace(badCityState2, goodCityState2);
  console.log('✅ Fix 3b: wholesaler city/state fixed');
} else {
  const lf = badCityState2.replace(/\r\n/g, '\n');
  if (out.includes(lf)) {
    out = out.replace(lf, goodCityState2.replace(/\r\n/g, '\n'));
    console.log('✅ Fix 3b (LF): wholesaler city/state fixed');
  } else {
    console.warn('⚠️  Fix 3b: wholesaler city/state pattern not found');
  }
}

fs.writeFileSync(file, out, 'utf8');
console.log('\nDone. Verifying...');
