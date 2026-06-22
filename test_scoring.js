const fs = require('fs');
const path = require('path');
const https = require('https');

// --- 1. Parse .env to retrieve GOOGLE_MAPS_API_KEY ---
function getApiKey() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('.env file not found. Fallback to mock coords/times.');
      return null;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('#') || !line) continue;
      const parts = line.split('=');
      if (parts[0].trim() === 'GOOGLE_MAPS_API_KEY') {
        let val = parts.slice(1).join('=').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        return val;
      }
    }
  } catch (err) {
    console.error('Error parsing .env file:', err);
  }
  return null;
}

// --- 2. Fallback Coordinates ---
const FALLBACK_COORDS = {
  '台北車站': { name: '台北車站', lat: 25.0478, lng: 121.5170 },
  '台北101': { name: '台北101', lat: 25.0330, lng: 121.5654 },
  '士林夜市': { name: '士林夜市', lat: 25.0879, lng: 121.5241 },
  '大安森林公園': { name: '大安森林公園', lat: 25.0270, lng: 121.5360 },
  '西門町': { name: '西門町', lat: 25.0422, lng: 121.5080 }
};

// --- 3. https helper ---
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// --- 4. Geocode using Google Geocoding API with fallback ---
async function geocode(address, apiKey) {
  if (!apiKey) {
    console.log(`No API Key. Fallback to hardcoded coordinates for: ${address}`);
    return FALLBACK_COORDS[address];
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=zh-TW`;
  try {
    const data = await httpsGetJson(url);
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      console.log(`Successfully geocoded ${address} via Google Maps API: ${loc.lat}, ${loc.lng}`);
      return { name: address, lat: loc.lat, lng: loc.lng };
    } else {
      console.warn(`Geocoding status was ${data.status} for ${address}. Fallback to hardcoded coordinates.`);
      return FALLBACK_COORDS[address];
    }
  } catch (err) {
    console.warn(`Geocoding request failed for ${address}: ${err.message}. Fallback to hardcoded coordinates.`);
    return FALLBACK_COORDS[address];
  }
}

// --- 5. Distance calculations (Haversine & Mock) ---
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

const MODE_FACTOR = {
  transit: { speed: 25, overhead: 8 }
};

function mockTravelMinutes(origin, dest) {
  const km = haversineKm(origin, dest);
  const { speed, overhead } = MODE_FACTOR.transit;
  return Math.round((km / speed) * 60 + overhead);
}

function mockDistanceMatrix(origins, destinations) {
  return origins.map(o => destinations.map(d => mockTravelMinutes(o, d)));
}

// --- 6. Get Distance Matrix with Google API & fallback ---
async function getDistanceMatrix(origins, destinations, apiKey) {
  if (!apiKey) {
    console.log('No API Key. Using Mock distance matrix calculation.');
    return mockDistanceMatrix(origins, destinations);
  }
  const origStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
  const destStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origStr)}&destinations=${encodeURIComponent(destStr)}&mode=transit&key=${apiKey}&language=zh-TW`;
  
  try {
    const data = await httpsGetJson(url);
    if (data.status === 'OK') {
      console.log('Distance Matrix API call succeeded.');
      const matrix = data.rows.map(row =>
        row.elements.map(el => (el.status === 'OK' ? Math.round(el.duration.value / 60) : null))
      );
      return matrix;
    } else {
      console.warn(`Distance Matrix API returned status ${data.status}. Fallback to mock.`);
      return mockDistanceMatrix(origins, destinations);
    }
  } catch (err) {
    console.warn(`Distance Matrix API request failed: ${err.message}. Fallback to mock.`);
    return mockDistanceMatrix(origins, destinations);
  }
}

// --- 7. Main Runner ---
async function main() {
  console.log('=== Starting Scoring Test Script ===');
  const apiKey = getApiKey();
  
  const originAddresses = ['台北車站', '台北101', '士林夜市'];
  const destinationAddresses = ['大安森林公園', '西門町'];

  console.log('\n--- Geocoding Phase ---');
  const origins = [];
  for (const addr of originAddresses) {
    const loc = await geocode(addr, apiKey);
    origins.push(loc);
  }
  
  const destinations = [];
  for (const addr of destinationAddresses) {
    const loc = await geocode(addr, apiKey);
    destinations.push(loc);
  }

  console.log('\n--- Distance Matrix Phase ---');
  const matrix = await getDistanceMatrix(origins, destinations, apiKey);
  console.log('Matrix (rows: origins, columns: destinations):');
  console.log(matrix);

  console.log('\n--- Core Scoring Calculation Phase ---');
  // For each destination candidate
  destinations.forEach((dest, j) => {
    // Get travel times for each origin to this destination
    const times = origins.map((origin, i) => {
      return {
        name: origin.name,
        minutes: matrix[i][j] ?? 999
      };
    });

    const total = times.reduce((s, t) => s + t.minutes, 0);
    const avg = total / times.length;
    const maxT = Math.max(...times.map(t => t.minutes));
    const minT = Math.min(...times.map(t => t.minutes));
    const spread = maxT - minT;

    // Population Standard Deviation
    const variance = times.reduce((s, t) => s + Math.pow(t.minutes - avg, 2), 0) / times.length;
    const unfairnessScore = Math.sqrt(variance);

    // Red Flag Condition
    const redFlag = unfairnessScore > 15 || spread > 30;

    // Print results
    console.log(`\nDestination: ${dest.name}`);
    console.log(`- Individual Travel Times: ${times.map(t => `${t.name}: ${t.minutes}m`).join(', ')}`);
    console.log(`- Total Time: ${total} minutes`);
    console.log(`- Average Time: ${avg.toFixed(2)} minutes`);
    console.log(`- Min Time: ${minT} minutes`);
    console.log(`- Max Time: ${maxT} minutes`);
    console.log(`- Spread (Max - Min): ${spread} minutes`);
    console.log(`- Unfairness Score (Std Dev): ${unfairnessScore.toFixed(4)}`);
    console.log(`- Red Flag Triggered: ${redFlag ? 'YES ⚠️' : 'NO'}`);
  });
  
  console.log('\n=== Test Completed ===');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
