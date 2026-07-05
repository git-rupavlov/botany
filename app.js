const DATASET_URL = "data/comparisons/tomatoes-wild-cherry-rozova-mechta.json";

const state = {
  dataset: null,
  selectedAxes: [],
  colors: ["#78d98c", "#ffd166", "#ff6b6b", "#7cc7ff", "#c792ea"]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getMetric(metricId) {
  return state.dataset.metrics.find((metric) => metric.id === metricId);
}

function getScore(entity, metricId) {
  return entity.scores[metricId] ?? null;
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

  const w = canvas.width / scale;
  const h = canvas.height / scale;
  const centerX = w / 2;
  const centerY = h / 2 + 10;
  const radius = Math.min(w, h) * 0.34;
  const axes = state.selectedAxes.map(getMetric).filter(Boolean);
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

  state.dataset.entities.forEach((entity, entityIndex) => {
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
    ctx.strokeStyle = state.colors[entityIndex % state.colors.length];
    ctx.fillStyle = `${state.colors[entityIndex % state.colors.length]}26`;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  });

  drawLegend(ctx, state.dataset.entities.map((entity, i) => ({ label: entity.name, color: state.colors[i % state.colors.length] })), 18, 18);
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

  const w = canvas.width / scale;
  const h = canvas.height / scale;
  const pad = { left: 46, right: 20, top: 30, bottom: 42 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const timeline = state.dataset.timeline;
  const maxY = 10;

  drawAxes(ctx, pad, plotW, plotH, maxY);

  timeline.labels.forEach((label, index) => {
    const x = pad.left + (plotW * index) / (timeline.labels.length - 1);
    drawText(ctx, label, x, h - 18, { color: "#a8b8ac", font: "12px Inter, system-ui, sans-serif" });
  });

  state.dataset.entities.forEach((entity, entityIndex) => {
    const series = timeline.series[entity.id]?.[metricId] || [];
    ctx.beginPath();
    series.forEach((value, index) => {
      const x = pad.left + (plotW * index) / (series.length - 1);
      const y = pad.top + plotH - plotH * (value / maxY);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = state.colors[entityIndex % state.colors.length];
    ctx.lineWidth = 2.5;
    ctx.stroke();
    series.forEach((value, index) => {
      const x = pad.left + (plotW * index) / (series.length - 1);
      const y = pad.top + plotH - plotH * (value / maxY);
      ctx.fillStyle = state.colors[entityIndex % state.colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  drawLegend(ctx, state.dataset.entities.map((entity, i) => ({ label: entity.name, color: state.colors[i % state.colors.length] })), pad.left, 8);
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

  const w = canvas.width / scale;
  const h = canvas.height / scale;
  const pad = { left: 56, right: 24, top: 28, bottom: 52 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

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

  drawText(ctx, xMetric.shortLabel || xMetric.label, pad.left + plotW / 2, h - 18, { color: "#a8b8ac", font: "13px Inter, system-ui, sans-serif" });
  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  drawText(ctx, yMetric.shortLabel || yMetric.label, 0, 0, { color: "#a8b8ac", font: "13px Inter, system-ui, sans-serif" });
  ctx.restore();

  state.dataset.entities.forEach((entity, entityIndex) => {
    const xValue = getScore(entity, xMetricId) ?? 0;
    const yValue = getScore(entity, yMetricId) ?? 0;
    const x = pad.left + plotW * (xValue / 10);
    const y = pad.top + plotH - plotH * (yValue / 10);
    ctx.fillStyle = state.colors[entityIndex % state.colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, entity.name, x + 13, y - 12, { align: "left", color: "#eef7ef", font: "13px Inter, system-ui, sans-serif" });
  });
}

function renderAxisControls() {
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

  state.dataset.entities.forEach((entity) => {
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
  state.dataset.entities.forEach((entity) => {
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
  const metrics = state.dataset.metrics.filter((metric) => {
    const haystack = `${metric.label} ${metric.group} ${metric.note || ""}`.toLowerCase();
    return !filter || haystack.includes(filter);
  });

  const head = `
    <thead>
      <tr>
        <th>Показател</th>
        <th>Група</th>
        ${state.dataset.entities.map((entity) => `<th>${entity.name}</th>`).join("")}
        <th>Бележка</th>
      </tr>
    </thead>`;

  const body = metrics.map((metric) => `
    <tr>
      <td><strong>${metric.label}</strong><small>${metric.unit || "оценка 0-10"}</small></td>
      <td>${metric.group}</td>
      ${state.dataset.entities.map((entity) => `<td>${formatMetricValue(entity, metric)}</td>`).join("")}
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

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(state.dataset, null, 2));
}

function downloadCsv() {
  const rows = [["metric", "group", ...state.dataset.entities.map((entity) => entity.name), "note"]];
  state.dataset.metrics.forEach((metric) => {
    rows.push([
      metric.label,
      metric.group,
      ...state.dataset.entities.map((entity) => getScore(entity, metric.id) ?? ""),
      metric.note || ""
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.dataset.id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function init() {
  const response = await fetch(DATASET_URL);
  state.dataset = await response.json();
  state.selectedAxes = state.dataset.defaultRadarAxes;

  $("#datasetTitle").textContent = state.dataset.title;
  $("#datasetMeta").textContent = `${state.dataset.entities.length} вида · ${state.dataset.metrics.length} показателя · ${state.dataset.updated}`;
  $("#rawData").textContent = JSON.stringify(state.dataset, null, 2);

  renderPlantProfiles();
  renderAxisControls();
  renderProfiles();
  renderTable();

  const metrics = state.dataset.metrics;
  populateSelect($("#timelineMetric"), metrics.filter((metric) => metric.timeline), "yield_per_plant");
  populateSelect($("#xMetric"), metrics, "disease_resistance");
  populateSelect($("#yMetric"), metrics, "yield_per_square_meter");

  drawRadar();
  drawTimeline();
  drawQuadrant();

  $("#resetAxes").addEventListener("click", () => {
    state.selectedAxes = state.dataset.defaultRadarAxes;
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
