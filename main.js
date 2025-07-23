const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('uploadProgress');
const progressText = document.getElementById('uploadStatus');
const uploadSection = document.getElementById('upload-section');
const mapPage = document.getElementById('map-page');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const speedSlider = document.getElementById('speedSlider');
const positionSlider = document.getElementById('positionSlider');
const speedValue = document.getElementById('speedValue');
const positionValue = document.getElementById('positionValue');
const backBtn = document.getElementById('backBtn');

let map, marker, route = [], intervalId = null, currentIndex = 0, speed = 1000;

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  progressBar.style.width = '0%';
  progressText.textContent = '';
  progressText.innerHTML = '<span class="spinner"></span> Reading file...';
  reader.onloadstart = () => {
    progressBar.style.width = '10%';
    progressText.innerHTML = '<span class="spinner"></span> Loading...';
  };
  reader.onload = () => {
    progressBar.style.width = '100%';
    progressText.innerHTML = '<span class="spinner"></span> Processing...';
    const lines = reader.result.split('\n');
    for (let line of lines) {
      if (line.includes('Lat_deg') || line.includes('GPS fix') || !line.includes(',')) continue;
      const raw = line.split('->').pop().trim();
      const parts = raw.split(',');
      if (parts.length >= 3) {
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) route.push([lon, lat]);
      }
    }
    if (route.length === 0) {
      alert("No valid coordinates found.");
      progressText.textContent = 'No valid coordinates found.';
      return;
    }
    progressText.textContent = '';
    transitionToMap();
  };
  reader.readAsText(file);
});

function transitionToMap() {
  uploadSection.style.display = 'none';
  mapPage.style.display = 'block';
  setupMap();
  // Attach back button event listener now that it exists in the DOM
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      // Reset state and show upload page
      mapPage.style.display = 'none';
      uploadSection.style.display = 'flex';
      // Optionally reset route and map
      if (map) {
        map.remove();
        map = null;
      }
      route = [];
      currentIndex = 0;
      progressBar.style.width = '0%';
      progressText.textContent = 'Waiting for file...';
      fileInput.value = '';
    };
  }
}

function setupMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: route[0],
    zoom: 16
  });
  map.on('load', () => {
    // Calculate speed between points (distance per step, as a proxy)
    const speeds = [];
    for (let i = 1; i < route.length; i++) {
      const [lon1, lat1] = route[i - 1];
      const [lon2, lat2] = route[i];
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const R = 6371; // km
      const distance = R * c;
      speeds.push(distance);
    }
    // Normalize speeds for color mapping
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    function speedToColor(speed) {
      // 0 = red, 1 = green
      const t = (speed - minSpeed) / (maxSpeed - minSpeed || 1);
      const r = Math.round(255 * (1 - t));
      const g = Math.round(200 * t);
      return `rgb(${r},${g},60)`;
    }
    // Create a GeoJSON MultiLineString for colored segments
    const features = [];
    for (let i = 1; i < route.length; i++) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [route[i - 1], route[i]]
        },
        properties: {
          color: speedToColor(speeds[i - 1])
        }
      });
    }
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });
    // Add a layer for each segment (for color)
    features.forEach((feature, idx) => {
      map.addLayer({
        id: `route-line-${idx}`,
        type: 'line',
        source: 'route',
        filter: ['==', ['id'], null], // Hide by default
        paint: {
          'line-color': feature.properties.color,
          'line-width': 4
        }
      });
      // Show only this segment
      map.setFilter(`route-line-${idx}`, ['==', ['id'], null]);
      map.setFilter(`route-line-${idx}`, ['==', ['get', 'color'], feature.properties.color]);
    });
    marker = new maplibregl.Marker({ color: '#f0f6fc' })
      .setLngLat(route[0])
      .addTo(map);
    positionSlider.max = route.length - 1;
  });
}

playBtn.addEventListener('click', () => {
  if (intervalId) return;
  playBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-block';
  intervalId = setInterval(() => {
    if (currentIndex >= route.length) {
      clearInterval(intervalId);
      intervalId = null;
      playBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
      return;
    }
    marker.setLngLat(route[currentIndex]);
    positionSlider.value = currentIndex;
    positionValue.textContent = `${Math.round((currentIndex / (route.length - 1)) * 100)}%`;
    currentIndex++;
  }, 1000 / parseFloat(speedSlider.value));
});

pauseBtn.addEventListener('click', () => {
  clearInterval(intervalId);
  intervalId = null;
  playBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
});

restartBtn.addEventListener('click', () => {
  clearInterval(intervalId);
  intervalId = null;
  currentIndex = 0;
  marker.setLngLat(route[0]);
  positionSlider.value = 0;
  positionValue.textContent = '0%';
  playBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
});

speedSlider.addEventListener('input', () => {
  speedValue.textContent = `${speedSlider.value}x`;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    playBtn.click();
  }
});

positionSlider.addEventListener('input', (e) => {
  currentIndex = parseInt(e.target.value);
  marker.setLngLat(route[currentIndex]);
  positionValue.textContent = `${Math.round((currentIndex / (route.length - 1)) * 100)}%`;
});
