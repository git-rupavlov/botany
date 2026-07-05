try {
  RADAR_PRESETS.bulgarian = {
    label: "Български",
    axes: [
      "bulgarian_heritage_value",
      "socialist_mass_value",
      "household_garden_value",
      "seed_saving_value",
      "local_adaptation",
      "availability",
      "flavor",
      "fruit_size",
      "yield_per_plant",
      "yield_per_square_meter",
      "disease_resistance",
      "drought_tolerance",
      "heat_tolerance",
      "market_value",
      "body_benefit_per_100g"
    ]
  };
} catch (error) {
  console.warn("Bulgarian preset not installed", error);
}
