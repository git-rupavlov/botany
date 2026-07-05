function waitForDatasetForGrowthLayer() {
  return new Promise((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof state !== "undefined" && state?.dataset?.entities?.length) {
        clearInterval(timer);
        resolve(true);
      }
      if (tries > 120) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

function entityText(entity) {
  return `${entity.id || ""} ${entity.name || ""} ${entity.latin || ""} ${entity.role || ""} ${entity.summary || ""} ${entity.raw?.use || ""} ${entity.raw?.growth_type || ""}`.toLowerCase();
}

function inferGrowthType(entity) {
  if (entity.raw?.growth_type) return entity.raw.growth_type;
  const text = entityText(entity);

  if (text.includes("processing") || text.includes("консерв") || text.includes("roma") || text.includes("rio grande") || text.includes("heinz") || text.includes("novichok")) return "детерминантен храстовиден / консервен тип";
  if (text.includes("vilma") || text.includes("balconi") || text.includes("venus") || text.includes("mini")) return "детерминантен джудже / компактен саксиен тип";
  if (text.includes("f1") && (text.includes("compact") || text.includes("балкон"))) return "компактен F1, обикновено детерминантен";
  if (text.includes("solanum pimpinellifolium") || text.includes("sweet pea") || text.includes("wild") || text.includes("див")) return "силно индетерминантен див/касисов тип";
  if (text.includes("розова") || text.includes("розов") || text.includes("pink") || text.includes("сърце") || text.includes("гигант")) return "индетерминантен едроплоден салатен тип";
  if (text.includes("cherry") || text.includes("чери")) return "индетерминантен или полуиндетерминантен чери тип";
  if ((entity.section || "").includes("cultivated-f1")) return "култивиран F1, типът зависи от конкретната линия";
  if ((entity.section || "").includes("cultivated-stable")) return "култивиран стабилен тип, растежът зависи от сорта";
  return "неуточнен тип растеж";
}

function ensureGrowthType(entity) {
  entity.raw = entity.raw || {};
  entity.raw.growth_type = inferGrowthType(entity);
  entity.profile = entity.profile || {};
  entity.profile.growthHabit = entity.raw.growth_type;
  return entity;
}

function renderProfileStatLine(label, value) {
  return `<div class="profile-stat"><span>${label}</span><strong>${value || "n/a"}</strong></div>`;
}

function renderProfileListBlock(title, items) {
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

function patchPlantProfiles() {
  renderPlantProfiles = function renderPlantProfilesWithGrowthType() {
    const container = document.querySelector("#plantProfiles");
    if (!container) return;
    container.innerHTML = "";

    getSelectedEntities().forEach((entity) => {
      ensureGrowthType(entity);
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
            <span class="badge">${profile.category || entity.section || "Tomato"}</span>
          </div>
          <p class="muted">${profile.overview || entity.summary}</p>
        </header>
        <div class="profile-stats">
          ${renderProfileStatLine("Тип растеж", entity.raw?.growth_type)}
          ${renderProfileStatLine("Плод", entity.fruitWeight)}
          ${renderProfileStatLine("Добив / растение", entity.yieldPerPlant)}
          ${renderProfileStatLine("Захари", entity.sugarPer100g)}
        </div>
        ${renderProfileListBlock("Силни страни", profile.strengths)}
        ${renderProfileListBlock("Слаби страни", profile.weaknesses)}
        ${renderProfileListBlock("Най-добра употреба", profile.bestUse)}
        <div class="profile-tags">
          ${(profile.tags || []).map((tag) => `<span class="profile-tag">${tag}</span>`).join("")}
        </div>
      `;
      container.appendChild(article);
    });
  };
}

function patchQuickProfiles() {
  renderProfiles = function renderProfilesWithGrowthType() {
    const container = document.querySelector("#profiles");
    if (!container) return;
    container.innerHTML = "";
    getSelectedEntities().forEach((entity) => {
      ensureGrowthType(entity);
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <h3>${entity.name}</h3>
        <p class="muted">${entity.summary}</p>
        <dl>
          <dt>Роля</dt><dd>${entity.role}</dd>
          <dt>Тип растеж</dt><dd>${entity.raw?.growth_type || "n/a"}</dd>
          <dt>Плод</dt><dd>${entity.fruitWeight}</dd>
          <dt>Добив / растение</dt><dd>${entity.yieldPerPlant}</dd>
          <dt>Добив / m²</dt><dd>${entity.yieldPerSquareMeter}</dd>
          <dt>Захари / 100 g</dt><dd>${entity.sugarPer100g}</dd>
        </dl>
      `;
      container.appendChild(card);
    });
  };
}

async function loadGrowthTypeLayer() {
  const ready = await waitForDatasetForGrowthLayer();
  if (!ready) return;
  state.dataset.entities.forEach(ensureGrowthType);
  patchPlantProfiles();
  patchQuickProfiles();
  refreshComparisonViews();
  document.querySelector("#rawData").textContent = JSON.stringify(state.dataset, null, 2);
}

loadGrowthTypeLayer();
