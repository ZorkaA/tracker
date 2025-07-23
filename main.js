const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('uploadProgress');
const progressText = document.getElementById('uploadStatus');
const uploadSection = document.getElementById('upload-section');
const mapPage = document.getElementById('map-page');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const speedSlider = document.getElementById('speedSlider');
const positionSlider = document.getElementById('positionSlider');

let map, marker, route = [], intervalId = null, currentIndex = 0, speed = 1000;

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  progressBar.style.width = '0%';
  progressText.textContent = 'Reading file...';

  reader.onloadstart = () => {
    progressBar.style.width = '10%';
    progressText.textContent = 'Loading...';
  };

  reader.onload = () => {
    progressBar.style.width = '100%';
    progressText.textContent = 'Processing...';

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
      return;
    }

    transitionToMap();
  };

  reader.readAsText(file);
});

function transitionToMap() {
  uploadSection.style.display = 'none';
  mapPage.style.display = 'block';
  setupMap();
}

function setupMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: route[0],
    zoom: 16
  });

  map.on('load', () => {
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      }
    });

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#58a6ff',
        'line-width': 4
      }
    });

    marker = new maplibregl.Marker({ color: '#f0f6fc' })
      .setLngLat(route[0])
      .addTo(map);

    positionSlider.max = route.length - 1;
  });
}

playBtn.addEventListener('click', () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    if (currentIndex >= route.length) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    marker.setLngLat(route[currentIndex]);
    positionSlider.value = currentIndex;
    currentIndex++;
  }, 1000 / parseFloat(speedSlider.value));
});

pauseBtn.addEventListener('click', () => {
  clearInterval(intervalId);
  intervalId = null;
});

speedSlider.addEventListener('input', () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    playBtn.click();
  }
});

positionSlider.addEventListener('input', (e) => {
  currentIndex = parseInt(e.target.value);
  marker.setLngLat(route[currentIndex]);
});
