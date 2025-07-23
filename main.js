document.getElementById('fileInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  const progress = document.getElementById("progressWrapper");
  const bar = document.getElementById("uploadProgress");
  const status = document.getElementById("uploadStatus");

  progress.style.display = "block";
  status.innerText = "Reading file...";
  bar.value = 0;

  let updateProgress = (percent, msg) => {
    bar.value = percent;
    status.innerText = msg;
  };

  reader.onloadstart = () => updateProgress(10, "Loading file...");
  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 80;
      updateProgress(percent, "Reading file...");
    }
  };

  reader.onload = (e) => {
    updateProgress(90, "Parsing and mapping...");
    const text = e.target.result;
    const lines = text.split('\n');
    const latLon = [];

    lines.forEach((line, i) => {
      if (line.includes('Lat_deg') || line.includes('GPS fix') || !line.includes(',')) return;
      const parts = line.split('->').pop().trim().split(',');
      if (parts.length >= 3) {
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) latLon.push([lon, lat]);
      }
    });

    updateProgress(100, "Rendering map...");
    document.getElementById("map").style.display = "block";

    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: latLon[0],
      zoom: 15
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: latLon
          }
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#1f6feb',
          'line-width': 4
        }
      });

      new maplibregl.Marker({ color: 'green' })
        .setLngLat(latLon[0])
        .setPopup(new maplibregl.Popup().setText("Start"))
        .addTo(map);

      new maplibregl.Marker({ color: 'red' })
        .setLngLat(latLon[latLon.length - 1])
        .setPopup(new maplibregl.Popup().setText("End"))
        .addTo(map);
    });
  };

  reader.readAsText(file);
});
