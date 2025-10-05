let map = L.map('map').setView([49.25, -123.12], 11);
// Greyscale / minimal tile set (CartoDB Positron)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors & CartoDB'
}).addTo(map);

const markers = L.markerClusterGroup({
  chunkedLoading: true,
  chunkProgress: function(processed, total, elapsed) {
    // optional: log progress if loading is slow
    if (elapsed > 5000) console.log('marker load', processed, 'of', total);
  }
});
map.addLayer(markers);

async function fetchNeighbourhoods(){
  try{
    const res = await fetch('/neighbourhoods');
    if(!res.ok) throw new Error('Network response not ok');
    const list = await res.json();
    const sel = document.getElementById('neighbourhood');
    // reset options but keep the (all) placeholder
    sel.innerHTML = '';
    const placeholder = document.createElement('option'); placeholder.value=''; placeholder.text='(all)'; sel.appendChild(placeholder);
    list.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.neighbourhood;
      opt.text = n.neighbourhood;
      sel.appendChild(opt);
    });
    // initialize choices (searchable dropdown) if available
    if(window.Choices && !window.neighbourhoodChoices){
      try{
        window.neighbourhoodChoices = new Choices(sel, { removeItemButton: true, searchEnabled: true, shouldSort: false });
      }catch(e){ console.error('Choices init failed for neighbourhood', e); }
    }
  }catch(err){
    console.error('Failed to load neighbourhoods', err);
  }
}

async function fetchTypes(){
  try{
    const res = await fetch('/types');
    if(!res.ok) throw new Error('Network response not ok');
    const types = await res.json();
    const sel = document.getElementById('type');
    sel.innerHTML = '';
    // populate
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.text = t;
      sel.appendChild(opt);
    });
    if(window.Choices && !window.typeChoices){
      try{
        window.typeChoices = new Choices(sel, { removeItemButton: true, searchEnabled: true, shouldSort: false });
      }catch(e){ console.error('Choices init failed for types', e); }
    }
  }catch(err){
    console.error('Failed to load types', err);
  }
}

async function fetchDateMeta(){
  const res = await fetch('/date_meta');
  const meta = await res.json();
  const months = meta.months;
  const years = meta.years;
  const sm = document.getElementById('start_month');
  const sy = document.getElementById('start_year');
  const em = document.getElementById('end_month');
  const ey = document.getElementById('end_year');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  months.forEach(m => { const o = document.createElement('option'); o.value = m; o.text = monthNames[m-1]; sm.appendChild(o); const o2 = o.cloneNode(true); em.appendChild(o2); });
  years.forEach(y => { const o = document.createElement('option'); o.value = y; o.text = y; sy.appendChild(o); const o2 = o.cloneNode(true); ey.appendChild(o2); });
  // set defaults: Jan 2020 to current month/year (or latest available)
  // set defaults to Jan 2020 -> Oct 2025 as requested
  sm.value = 1; sy.value = 2020;
  em.value = 10; ey.value = 2025;
}

function severityColorByCount(count){
  if(count <= 1) return '#2b83ba';
  if(count <= 3) return '#ffffbf';
  if(count <= 6) return '#fdae61';
  return '#d7191c';
}

async function loadData(){
  // read month/year dropdowns; convert to start/end ISO dates if set
  const sm = document.getElementById('start_month').value;
  const sy = document.getElementById('start_year').value;
  const em = document.getElementById('end_month').value;
  const ey = document.getElementById('end_year').value;
  let start = '';
  let end = '';
  if(sm && sy){ start = `${sy}-${String(sm).padStart(2,'0')}-01`; }
  if(em && ey){
    // set end to last day of month simply by setting day 28..31 and letting Date roll
    const lastDay = new Date(ey, em, 0).getDate();
    end = `${ey}-${String(em).padStart(2,'0')}-${lastDay}`;
  }
  // read multiple selected types
  const typeSel = document.getElementById('type');
  const selected = Array.from(typeSel.selectedOptions).map(o => o.value);
  const type = selected.join(',');
  const neighbourhood = document.getElementById('neighbourhood').value;
  const params = new URLSearchParams();
  if(start) params.set('start', start);
  if(end) params.set('end', end);
  if(type) params.set('type', type);
  if(neighbourhood) params.set('neighbourhood', neighbourhood);
  const res = await fetch('/data?' + params.toString());
  const geo = await res.json();
  markers.clearLayers();
  // Add one marker per crime record so MarkerCluster can aggregate by zoom
  function severityColorByType(type){
    if(!type) return '#2b83ba';
    const s = type.toLowerCase();
    if(s.includes('murder') || s.includes('homicide') || s.includes('arson')) return '#d7191c';
    if(s.includes('assault') || s.includes('violent') || s.includes('sex') || s.includes('robbery')) return '#fdae61';
    if(s.includes('break and enter') || s.includes('theft') || s.includes('shoplifting') || s.includes('vehicle')) return '#ffffbf';
    if(s.includes('drug') || s.includes('misconduct') || s.includes('public')) return '#2b83ba';
    return '#89c2d9';
  }

  geo.features.forEach(f => {
    const coords = f.geometry.coordinates;
    const lon = coords[0], lat = coords[1];
    const p = f.properties || {};
    const color = severityColorByType(p.type);
    const radius = 6;
    const circle = L.circleMarker([lat, lon], {radius, color, fillColor: color, fillOpacity: 0.9, weight:0.8});
    const popup = `<div><b>${p.type || 'Unknown'}</b><br>${p.date || ''}<br>${p.neighbourhood || ''}<br>${p.hundred_block || ''}</div>`;
    circle.bindPopup(popup);
    markers.addLayer(circle);
  });
}

document.getElementById('apply').addEventListener('click', () => loadData());
document.getElementById('reset').addEventListener('click', () => {
  // reset to defaults: type/all, neighbourhood/all, month defaults set by fetchDateMeta
  if(window.typeChoices) window.typeChoices.removeActiveItems();
  if(window.neighbourhoodChoices) window.neighbourhoodChoices.removeActiveItems();
  // re-populate date defaults by re-fetching meta then load
  fetchDateMeta().then(() => loadData());
});

// When neighbourhood selected, zoom to its bounds
document.getElementById('neighbourhood').addEventListener('change', async (e) => {
  const name = e.target.value;
  if(!name) return;
  const res = await fetch('/neighbourhoods');
  const list = await res.json();
  const n = list.find(x => x.neighbourhood === name);
  if(n){
    const [latmin, lonmin, latmax, lonmax] = n.bounds;
    map.fitBounds([[latmin, lonmin],[latmax, lonmax]]);
    loadData();
  }
});

fetchNeighbourhoods().then(() => Promise.all([fetchTypes(), fetchDateMeta()]).then(() => loadData()));
// ensure apply uses Choices values if present
document.getElementById('apply').addEventListener('click', () => loadData());
