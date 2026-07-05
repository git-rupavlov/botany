const DATASET_URL = "data/comparisons/tomatoes-wild-cherry-rozova-mechta.json";

const RADAR_PRESETS = {
  botanical: {
    label: "Ботанически",
    axes: [
      "disease_resistance",
      "fungal_resistance",
      "virus_resistance",
      "drought_tolerance",
      "heat_tolerance",
      "cold_tolerance",
      "low_soil_fertility_tolerance",
      "salinity_tolerance",
      "root_power",
      "root_size",
      "root_regeneration",
      "plant_vigor",
      "plant_size",
      "pruning_recovery",
      "perennial_value",
      "breeding_value"
    ]
  },
  industrial: {
    label: "Стопански - масова индустрия",
    axes: [
      "yield_per_plant",
      "yield_per_square_meter",
      "yield_per_root_mass",
      "fruit_size",
      "harvest_ease",
      "market_value",
      "cracking_resistance",
      "disease_resistance",
      "fungal_resistance",
      "fruiting_duration",
      "greenhouse_value"
    ]
  },
  hobbyOrganic: {
    label: "Стопански - био/любителско",
    axes: [
      "flavor",
      "sugar_content",
      "vitamin_c",
      "lycopene",
      "beta_carotene",
      "antioxidants",
      "minerals",
      "disease_resistance",
      "drought_tolerance",
      "low_soil_fertility_tolerance",
      "root_power",
      "fruiting_duration",
      "perennial_value",
      "greenhouse_value"
    ]
  }
};

const state = {
  dataset: null,
  selectedAxes: [],
  selectedPreset: "custom",
  selectedEntityIds: [],
  colors: ["#78d98c", "#ffd166", "#ff6b6b", "#7cc7ff", "#c792ea"]
};

const $ = (selector) => document.querySelector(selector);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getMetric(metricId) {
  return state.dataset.metrics.find((metric) => metric.id === metricId);
}

function getScore(entity, metricId) {
  return entity.scores[metricId] ?? null;
}

function getSelectedEntities() {
  const selected = state.dataset.entities.filter((entity) => state.selectedEntityIds.includes(entity.id));
  return selected.length > 0 ? selected : state.dataset.entities.slice(0, 1);
}

function getEntityColor(entity) {
  const index = state.dataset.entities.findIndex((item) => item.id === entity.id);
  return state.colors[index % state.colors.length];
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function detectPreset() {
  const match = Object.entries(RADAR_PRESETS).find(([, preset]) => arraysEqual(preset.axes, state.selectedAxes));
  state.selectedPreset = match ? match[0] : "custom";
}

function refreshComparisonViews() {
  renderPlantProfiles();
  renderProfiles();
  renderTable();
  drawRadar();
  drawTimeline();
  drawQuadrant();
  updateDatasetMeta();
}

function drawText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color || "#eef7ef";
  ctx.font = options.font || "13px Inter, system-ui, sans-serif";
  ctx.textAlign = options.align || "center";
  ctx.textBaseline = options.baseline || "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * scale));
  canvas.height = Math.max(260, Math.floor((rect.width * 0.72) * scale));
  return scale;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawRadar() {
  const canvas = $("#radarCanvas");
  const scale = fitCanvas(canvas);
  const ctx = clearCanvas(canvas);
  ctx.scale(scale, scale);

  const width = canvas.width / scale;
  const height = canvas.height / scale;
  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const radius = Math.min(width, height) * 0.34;
  const axes = state.selectedAxes.map(getMetric).filter(Boolean);
  const entities = getSelectedEntities();
  const axisCount = axes.length;

  if (axisCount < 3) {
    drawText(ctx, "Избери поне 3 оси за radar диаграма", centerX, centerY, { color: "#a8b8ac", font: "16px Inter, system-ui, sans-serif" });
    return;
  }

  ctx.lineWidth = 1;
  for (let level = 2; level <= 10; level += 2) {
    ctx.beginPath();
    axes.forEach((axis, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisCount;
      const r = radius * (level / 10);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(168,184,172,0.22)";
    ctx.stroke();
  }

  axes.forEach((axis, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisCount;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(168,184,172,0.18)";
    ctx.stroke();

    const labelX = centerX + Math.cos(angle) * (radius + 58);
    const labelY = centerY + Math.sin(angle) * (radius + 28);
    const label = axis.shortLabel || axis.label;
    const words = label.split(" ");
    const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [label];
    lines.forEach((line, lineIndex) => {
      drawText(ctx, line, labelX, labelY + lineIndex * 15, { color: "#a8b8ac", font: "12px Inter, system-ui, sans-serif" });
    });
  });

  entities.forEach((entity) => {
    const color = getEntityColor(entity);
    ctx.beginPath();
    axes.forEach((axis, axisIndex) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * axisIndex) / axisCount;
      const value = clamp(getScore(entity, axis.id) ?? 0, 0, 10);
      const r = radius * (value / 10);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (axisIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}26`;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  });

  drawLegend(ctx, entities.map((entity) => ({ label: entity.name, color: getEntityColor(entity) })), 18, 18);
}

function drawLegend(ctx, items, x, y) {
  items.forEach((item, index) => {
    const yy = y + index * 22;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x + 7, yy + 7, 6, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, item.label, x + 23, yy + 8, { align: "left", color: "#eef7ef", font: "13px Inter, system-ui, sans-serif" });
  });
}

function drawTimeline() {
  const metricId = $("#timelineMetric").value;
  const canvas = $("#timelineCanvas");
  const scale = fitCanvas(canvas);
  const ctx = clearCanvas(canvas);
  ctx.scale(scale, scale);

  const width = canvas.width / scale;
  const height = canvas.height / scale;
  const pad = { left: 46, right: 20, top: 30, bottom: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const timeline = state.dataset.timeline;
  const entities = getSelectedEntities();

  drawAxes(ctx, pad, plotW, plotH, 10);

  timeline.labels.forEach((label, index) => {
    const x = pad.left + (plotW * index) / (timeline.labels.length - 1);
    drawText(ctx, label, x, height - 18, { color: "#a8b8ac", font: "12px Inter, system-ui, sans-serif" });
  });

  entities.forEach((entity) => {
    const series = timeline.series[entity.id]?.[metricId] || [];
    const color = getEntityColor(entity);
    ctx.beginPath();
    series.forEach((value, index) => {
      const x = pad.left + (plotW * index) / (series.length - 1);
      const y = pad.top + plotH - plotH * (value / 10);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    series.forEach((value, index) => {
      const x = pad.left + (plotW * index) / (series.length - 1);
      const y = pad.top + plotH - plotH * (value / 10);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  drawLegend(ctx, entities.map((entity) => ({ label: entity.name, color: getEntityColor(entity) })), pad.left, 8);
}

function drawAxes(ctx, pad, plotW, plotH, maxY) {
  ctx.strokeStyle = "rgba(168,184,172,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  for (let y = 0; y <= maxY; y += 2) {
    const yy = pad.top + plotH - plotH * (y / maxY);
    ctx.strokeStyle = "rgba(168,184,172,0.12)";
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(pad.left + plotW, yy);
    ctx.stroke();
    drawText(ctx, String(y), pad.left - 18, yy, { color: "#a8b8ac", font: "12px Inter, system-ui, sans-serif" });
  }
}

function drawQuadrant() {
  const xMetricId = $("#xMetric").value;
  const yMetricId = $("#yMetric").value;
  const xMetric = getMetric(xMetricId);
  const yMetric = getMetric(yMetricId);
  const canvas = $("#quadrantCanvas");
  const scale = fitCanvas(canvas);
  const ctx = clearCanvas(canvas);
  ctx.scale(scale, scale);

  const width = canvas.width / scale;
  const height = canvas.height / scale;
  const pad = { left: 56, right: 24, top: 28, bottom: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const entities = getSelectedEntities();

  drawAxes(ctx, pad, plotW, plotH, 10);
  const midX = pad.left + plotW / 2;
  const midY = pad.top + plotH / 2;
  ctx.strokeStyle = "rgba(255,209,102,0.35)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(midX, pad.top);
  ctx.lineTo(midX, pad.top + plotH);
  ctx.moveTo(pad.left, midY);
  ctx.lineTo(pad.left + plotW, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  drawText(ctx, xMetric.shortLabel || xMetric.label, pad.left + plotW / 2, height - 18, { color: "#a8b8ac", font: "13px Inter, system-ui, sans-serif" });
  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  drawText(ctx, yMetric.shortLabel || yMetric.label, 0, 0, { color: "#a8b8ac", font: "13px Inter, system-ui, sans-serif" });
  ctx.restore();

  entities.forEach((entity) => {
    const xValue = getScore(entity, xMetricId) ?? 0;
    const yValue = getScore(entity, yMetricId) ?? 0;
    const x = pad.left + plotW * (xValue / 10);
    const y = pad.top + plotH - plotH * (yValue / 10);
    ctx.fillStyle = getEntityColor(entity);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, entity.name, x + 13, y - 12, { align: "left", color: "#eef7ef", font: "13px Inter, system-ui, sans-serif" });
  });
}

function renderEntityControls() {
  const container = $("#entityControls");
  container.innerHTML = "";

  state.dataset.entities.forEach((entity) => {
    const isActive = state.selectedEntityIds.includes(entity.id);
    const label = document.createElement("label");
    label.className = `entity-toggle ${isActive ? "active" : ""}`;
    label.innerHTML = `
      <input type="checkbox" value="${entity.id}" ${isActive ? "checked" : ""} />
      <span>${entity.name}</span>
      <small>${entity.profile?.category || "plant"}</small>
    `;
    label.querySelector("input").addEventListener("change", (event) => {
      const next = new Set(state.selectedEntityIds);
      if (event.target.checked) next.add(entity.id);
      else next.delete(entity.id);
      if (next.size === 0) {
        event.target.checked = true;
        return;
      }
      state.selectedEntityIds = Array.from(next);
      renderEntityControls();
      refreshComparisonViews();
    });
    container.appendChild(label);
  });
}

function renderRadarPresets() {
  const container = $("#radarPresets");
  container.innerHTML = "";

  Object.entries(RADAR_PRESETS).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset-button ${state.selectedPreset === key ? "active" : ""}`;
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      state.selectedAxes = preset.axes;
      state.selectedPreset = key;
      renderRadarPresets();
      renderAxisControls();
      drawRadar();
    });
    container.appendChild(button);
  });
}

function renderAxisControls() {
  detectPreset();
  const container = $("#axisControls");
  container.innerHTML = "";

  state.dataset.metrics.forEach((metric) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${state.selectedAxes.includes(metric.id) ? "active" : ""}`;
    button.textContent = metric.shortLabel || metric.label;
    button.addEventListener("click", () => {
      if (state.selectedAxes.includes(metric.id)) {
        state.selectedAxes = state.selectedAxes.filter((id) => id !== metric.id);
      } else {
        state.selectedAxes.push(metric.id);
      }
      detectPreset();
      renderRadarPresets();
      renderAxisControls();
      drawRadar();
    });
    container.appendChild(button);
  });
}

function renderPlantProfiles() {
  const container = $("#plantProfiles");
  if (!container) return;
  container.innerHTML = "";

  getSelectedEntities().forEach((entity) => {
    const profile = entity.profile || {};
    const article = document.createElement("article");
    article.className = "plant-profile";
    article.innerHTML = `
      <header class="plant-profile-header">
        <div class="plant-profile-title">
          <div>
            <h3>${entity.name}</h3>
            <div class="latin">${entity.latin}</div>
          </div>
          <span class="badge">${profile.category || "Tomato"}</span>
        </div>
        <p class="muted">${profile.overview || entity.summary}</p>
      </header>
      <div class="profile-stats">
        ${renderProfileStat("Растеж", profile.growthHabit)}
        ${renderProfileStat("Плод", entity.fruitWeight)}
        ${renderProfileStat("Добив / растение", entity.yieldPerPlant)}
        ${renderProfileStat("Захари", entity.sugarPer100g)}
      </div>
      ${renderProfileBlock("Силни страни", profile.strengths)}
      ${renderProfileBlock("Слаби страни", profile.weaknesses)}
      ${renderProfileBlock("Най-добра употреба", profile.bestUse)}
      <div class="profile-tags">
        ${(profile.tags || []).map((tag) => `<span class="profile-tag">${tag}</span>`).join("")}
      </div>
    `;
    container.appendChild(article);
  });
}

function renderProfileStat(label, value) {
  return `<div class="profile-stat"><span>${label}</span><strong>${value || "n/a"}</strong></div>`;
}

function renderProfileBlock(title, items) {
  if (!items || items.length === 0) return "";
  return `
    <section class="profile-block">
      <h4>${title}</h4>
      <ul class="profile-list">
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderProfiles() {
  const container = $("#profiles");
  container.innerHTML = "";
  getSelectedEntities().forEach((entity) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${entity.name}</h3>
      <p class="muted">${entity.summary}</p>
      <dl>
        <dt>Роля</dt><dd>${entity.role}</dd>
        <dt>Плод</dt><dd>${entity.fruitWeight}</dd>
        <dt>Добив / растение</dt><dd>${entity.yieldPerPlant}</dd>
        <dt>Добив / m²</dt><dd>${entity.yieldPerSquareMeter}</dd>
        <dt>Захари / 100 g</dt><dd>${entity.sugarPer100g}</dd>
      </dl>
    `;
    container.appendChild(card);
  });
}

function renderTable() {
  const filter = $("#metricFilter").value.toLowerCase().trim();
  const table = $("#comparisonTable");
  const entities = getSelectedEntities();
  const metrics = state.dataset.metrics.filter((metric) => {
    const haystack = `${metric.label} ${metric.group} ${metric.note || ""}`.toLowerCase();
    return !filter || haystack.includes(filter);
  });

  const head = `
    <thead>
      <tr>
        <th>Показател</th>
        <th>Група</th>
        ${entities.map((entity) => `<th>${entity.name}</th>`).join("")}
        <th>Бележка</th>
      </tr>
    </thead>`;

  const body = metrics.map((metric) => `
    <tr>
      <td><strong>${metric.label}</strong><small>${metric.unit || "оценка 0-10"}</small></td>
      <td>${metric.group}</td>
      ${entities.map((entity) => `<td>${formatMetricValue(entity, metric)}</td>`).join("")}
      <td class="muted">${metric.note || ""}</td>
    </tr>
  `).join("");

  table.innerHTML = `${head}<tbody>${body}</tbody>`;
}

function formatMetricValue(entity, metric) {
  if (metric.rawValues && entity.raw?.[metric.id]) {
    return `${entity.raw[metric.id]}<small>score: ${getScore(entity, metric.id) ?? "n/a"}/10</small>`;
  }
  const value = getScore(entity, metric.id);
  return value === null ? "n/a" : `${value}/10`;
}

function populateSelect(select, metrics, selectedValue) {
  select.innerHTML = "";
  metrics.forEach((metric) => {
    const option = document.createElement("option");
    option.value = metric.id;
    option.textContent = metric.shortLabel || metric.label;
    select.appendChild(option);
  });
  if (selectedValue) select.value = selectedValue;
}

function updateDatasetMeta() {
  const selectedCount = getSelectedEntities().length;
  $("#datasetMeta").textContent = `${selectedCount}/${state.dataset.entities.length} вида избрани · ${state.dataset.metrics.length} показателя · ${state.dataset.updated}`;
}

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(state.dataset, null, 2));
}

function downloadCsv() {
  const entities = getSelectedEntities();
  const rows = [["metric", "group", ...entities.map((entity) => entity.name), "note"]];
  state.dataset.metrics.forEach((metric) => {
    rows.push([
      metric.label,
      metric.group,
      ...entities.map((entity) => getScore(entity, metric.id) ?? ""),
      metric.note || ""
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.dataset.id}-selected.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function init() {
  const response = await fetch(DATASET_URL);
  state.dataset = await response.json();
  state.selectedAxes = RADAR_PRESETS.botanical.axes;
  state.selectedPreset = "botanical";
  state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);

  $("#datasetTitle").textContent = state.dataset.title;
  $("#rawData").textContent = JSON.stringify(state.dataset, null, 2);

  renderEntityControls();
  renderRadarPresets();
  renderAxisControls();
  renderPlantProfiles();
  renderProfiles();
  renderTable();
  updateDatasetMeta();

  const metrics = state.dataset.metrics;
  populateSelect($("#timelineMetric"), metrics.filter((metric) => metric.timeline), "yield_per_plant");
  populateSelect($("#xMetric"), metrics, "disease_resistance");
  populateSelect($("#yMetric"), metrics, "yield_per_square_meter");

  drawRadar();
  drawTimeline();
  drawQuadrant();

  $("#selectAllEntities").addEventListener("click", () => {
    state.selectedEntityIds = state.dataset.entities.map((entity) => entity.id);
    renderEntityControls();
    refreshComparisonViews();
  });
  $("#clearEntitySelection").addEventListener("click", () => {
    state.selectedEntityIds = [state.dataset.entities[0].id];
    renderEntityControls();
    refreshComparisonViews();
  });
  $("#resetAxes").addEventListener("click", () => {
    state.selectedAxes = state.dataset.defaultRadarAxes;
    state.selectedPreset = "custom";
    renderRadarPresets();
    renderAxisControls();
    drawRadar();
  });
  $("#metricFilter").addEventListener("input", renderTable);
  $("#timelineMetric").addEventListener("change", drawTimeline);
  $("#xMetric").addEventListener("change", drawQuadrant);
  $("#yMetric").addEventListener("change", drawQuadrant);
  $("#copyJson").addEventListener("click", copyJson);
  $("#downloadCsv").addEventListener("click", downloadCsv);
  window.addEventListener("resize", () => {
    drawRadar();
    drawTimeline();
    drawQuadrant();
  });
}

init().catch((error) => {
  document.body.innerHTML = `<main class="panel"><h1>Грешка при зареждане</h1><pre>${error.stack || error.message}</pre></main>`;
});
