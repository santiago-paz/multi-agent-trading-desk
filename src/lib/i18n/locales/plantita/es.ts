export const plantitaEs = {
  // Tabs / chrome
  'statusbar.empty': 'Plantar una semilla...',
  'statusbar.dead': 'Tu planta ha muerto',
  'statusbar.alive': '{name} · {species} · {age}',
  'statusbar.age.hours': '{n} h',
  'statusbar.age.days': '{n} d',

  // Stats
  'stat.water': 'Agua',
  'stat.sun': 'Sol',
  'stat.nutrients': 'Nutrientes',
  'stat.mood': 'Ánimo',
  'stat.health': 'Salud',
  'stat.preferred_sun': 'Prefiere {min}–{max}',
  'stat.lightmode.sun': 'Sol',
  'stat.lightmode.shade': 'Sombra',

  // Actions
  'action.water_small': 'Regar (poco)',
  'action.water_large': 'Regar (mucho)',
  'action.fertilize': 'Fertilizar',
  'action.sing': 'Hablarle',
  'action.prune': 'Podar',
  'action.repel_pests': 'Repelente',
  'action.harvest': 'Cosechar',
  'action.toggle_light': 'Sol/Sombra',
  'action.cooldown': 'En {n}s',
  'action.empty': 'Sin stock',

  // Stages
  'stage.seed': 'Semilla',
  'stage.sprout': 'Brote',
  'stage.sapling': 'Plántula',
  'stage.young': 'Joven',
  'stage.adult': 'Adulta',
  'stage.flowering': 'Floreciendo',
  'stage.fruiting': 'Con frutos',

  // Species
  'species.cactus.name': 'Cactus',
  'species.cactus.desc': 'Tolera la sequía. Odia que lo riegues mucho.',
  'species.sunflower.name': 'Girasol',
  'species.sunflower.desc': 'Vive del sol. Crece rápido y muere joven.',
  'species.fern.name': 'Helecho',
  'species.fern.desc': 'Prefiere la sombra. Es delicado.',
  'species.tomato.name': 'Tomatera',
  'species.tomato.desc': 'Da frutos cosechables. Sediento.',
  'species.bonsai.name': 'Bonsái',
  'species.bonsai.desc': 'Crece despacio. Vive mucho.',

  // Picker
  'picker.title': 'Plantar una semilla',
  'picker.name_label': 'Nombre',
  'picker.name_placeholder': 'Ej: Petunia',
  'picker.plant': 'Plantar',
  'picker.cemetery': 'Cementerio',
  'picker.back': 'Volver',

  // Cemetery
  'cemetery.title': 'Cementerio',
  'cemetery.empty': 'Aún no hay plantas pasadas.',
  'cemetery.col.name': 'Nombre',
  'cemetery.col.species': 'Especie',
  'cemetery.col.age': 'Edad',
  'cemetery.col.cause': 'Causa',
  'cemetery.cause.thirst': 'Sed',
  'cemetery.cause.drowned': 'Ahogada',
  'cemetery.cause.starved': 'Desnutrida',
  'cemetery.cause.pests': 'Plagas',
  'cemetery.cause.old_age': 'Vejez',

  // Death banner
  'death.title': 'Tu planta ha muerto',
  'death.cause': 'Causa: {cause}',
  'death.acknowledge': 'Plantar otra',

  // Inventory labels (used as tooltips/titles)
  'inv.fertilizer': 'Fertilizante',
  'inv.repellent': 'Repelente',
  'inv.pruning_shears': 'Tijeras de podar',

  // Events (start)
  'log.event_start.aphids': '¡Plaga de pulgones! 🐛',
  'log.event_start.cloudy': 'Día nublado ☁',
  'log.event_start.butterfly': 'Una mariposa visitó la planta 🦋 (+ánimo)',
  'log.event_start.drought': 'Sequía repentina 🥵',
  'log.event_start.heatwave': 'Ola de calor 🔥',
  'log.event_start.bloom': '¡Está floreciendo! 🌸',
  'log.event_start.fruit_ripens': 'Un fruto está maduro 🍅',

  // Events (end)
  'log.event_end.aphids': 'Los pulgones se fueron.',
  'log.event_end.cloudy': 'Volvió el sol.',
  'log.event_end.butterfly': '',
  'log.event_end.drought': 'La sequía pasó.',
  'log.event_end.heatwave': 'Bajó el calor.',
  'log.event_end.bloom': '',
  'log.event_end.fruit_ripens': '',

  // Action results
  'log.action.water_small.ok': 'Regaste un poco. 💧',
  'log.action.water_small.too_much': 'Le diste demasiada agua.',
  'log.action.water_large.ok': 'Riego abundante. 🌊',
  'log.action.water_large.too_much': '¡Demasiada agua! Le hiciste daño.',
  'log.action.fertilize.ok': 'Fertilizaste la tierra. 🌱',
  'log.action.sing.ok': 'Le hablaste suavemente. 🎵',
  'log.action.prune.ok': 'Podaste las hojas secas. ✂️',
  'log.action.repel_pests.ok': 'Aplicaste repelente. ✨',
  'log.action.harvest.ok': 'Cosechaste lo maduro.',
  'log.action.toggle_light.ok': 'Cambiaste la exposición a la luz.',

  // Misc engine logs
  'log.seed_planted': 'Plantaste {name} ({species}). 🌰',
  'log.stage_up': '{name} avanzó a {to}.',
  'log.health_critical': '¡{name} está muy débil!',
  'log.death.thirst': '{name} murió de sed. 🪦',
  'log.death.drowned': '{name} se ahogó. 🪦',
  'log.death.starved': '{name} murió por desnutrición. 🪦',
  'log.death.pests': '{name} sucumbió a las plagas. 🪦',
  'log.death.old_age': '{name} murió de viejita. 🪦',
  'log.harvest': 'Cosechaste {count}. +{count} fertilizante.',
  'log.pruning_shears_acquired': 'Conseguiste tijeras de podar. ✂️',

  // Buttons
  'button.reset_all': 'Reiniciar todo',
  'button.confirm_reset': '¿Borrar todo el progreso?',
} as const;

export type PlantitaKey = keyof typeof plantitaEs;
