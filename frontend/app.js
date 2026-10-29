const STORAGE_KEY = "gym-routine-app-v2";

const catalogGrid = document.querySelector("#catalog-grid");
const catalogCount = document.querySelector("#catalog-count");
const groupFilters = document.querySelector("#group-filters");
const searchInput = document.querySelector("#exercise-search");
const routineTitle = document.querySelector("#routine-title");
const routineNameInput = document.querySelector("#routine-name");
const routineCount = document.querySelector("#routine-exercise-count");
const routineSummary = document.querySelector("#routine-summary");
const routineList = document.querySelector("#routine-list");
const routineEmpty = document.querySelector("#routine-empty");
const savedRoutines = document.querySelector("#saved-routines");
const appStatus = document.querySelector("#app-status");
const videoDialog = document.querySelector("#video-dialog");
const videoTitle = document.querySelector("#video-title");
const videoContent = document.querySelector("#video-content");

const groups = [
  { id: "pecho", name: "Pecho", icon: "🏋️", description: "Empujes y aperturas" },
  { id: "espalda", name: "Espalda", icon: "🧗", description: "Remo y tracción" },
  { id: "piernas", name: "Piernas", icon: "🦵", description: "Fuerza de tren inferior" },
  { id: "hombros", name: "Hombros", icon: "💪", description: "Press y elevaciones" },
  { id: "biceps", name: "Bíceps", icon: "💪", description: "Flexión del codo y tracción" },
  { id: "triceps", name: "Tríceps", icon: "🔥", description: "Extensión del codo y empuje" },
  { id: "core", name: "Core", icon: "⚡", description: "Estabilidad y abdomen" },
];
let exercises = [];
let selectedGroup = "todos";
let state = {
  activeRoutine: { name: "", exercises: [], seriesLocked: false },
  savedRoutines: [],
  customExercises: [],
};

function setStatus(message, isError = false) {
  if (!appStatus) return;
  appStatus.textContent = message;
  appStatus.classList.toggle("error", isError);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `No se pudo completar la solicitud (${response.status}).`);
  }
  return response.json();
}

function saveState(message = "Cambios guardados en este navegador.") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus(message);
  } catch (error) {
    setStatus(`No se pudieron guardar los cambios: ${error.message}`, true);
  }
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.activeRoutine ||
      !Array.isArray(parsed.activeRoutine.exercises) ||
      !Array.isArray(parsed.savedRoutines) ||
      (parsed.customExercises !== undefined && !Array.isArray(parsed.customExercises))
    ) {
      throw new Error("El formato de las rutinas guardadas no es válido.");
    }
    const activeRoutine = {
      ...parsed.activeRoutine,
      seriesLocked: parsed.activeRoutine.seriesLocked ?? parsed.savedRoutines.some(
        (routine) =>
          routine.name === parsed.activeRoutine.name &&
          JSON.stringify(routine.exercises) === JSON.stringify(parsed.activeRoutine.exercises),
      ),
    };
    state = {
      ...parsed,
      activeRoutine,
      customExercises: parsed.customExercises || [],
    };
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    setStatus(`No se pudieron leer las rutinas guardadas: ${error.message}`, true);
  }
}

function getRoutineExercise(exerciseId) {
  return state.activeRoutine.exercises.find((item) => item.id === exerciseId);
}

function getExerciseById(exerciseId) {
  return exercises.find((exercise) => exercise.id === exerciseId);
}

function getVideoEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId && /^[\w-]{11}$/.test(videoId)
          ? `https://www.youtube-nocookie.com/embed/${videoId}`
          : null;
      }
      const videoId = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (url.hostname === "www.youtube-nocookie.com") {
      const videoId = url.pathname.match(/^\/embed\/([\w-]{11})$/)?.[1];
      return videoId && videoId !== "VIDEO_ID" ? url.href : null;
    }

    if (url.hostname === "player.vimeo.com" && /^\/video\/\d+$/.test(url.pathname)) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

function makeFilterButton(group) {
  const button = document.createElement("button");
  button.className = "filter-button";
  button.type = "button";
  button.textContent = group.name;
  button.setAttribute("aria-pressed", String(selectedGroup === group.id));
  button.addEventListener("click", () => {
    selectedGroup = group.id;
    renderFilters();
    renderCatalog();
  });
  return button;
}

function renderFilters() {
  const allButton = makeFilterButton({ id: "todos", name: "Todos" });
  groupFilters.replaceChildren(allButton, ...groups.map(makeFilterButton));
}

function renderCustomExerciseGroupOptions() {
  const select = document.querySelector("#custom-exercise-group");
  select.replaceChildren(
    ...groups.map((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      return option;
    }),
  );
}

function addCustomExercise(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const muscleGroup = String(formData.get("muscle_group") || "");
  const sets = Number(formData.get("sets"));
  const reps = String(formData.get("reps") || "").trim();
  const restSeconds = Number(formData.get("rest_seconds"));
  const videoUrl = String(formData.get("video_url") || "").trim();

  if (!name || !groups.some((group) => group.id === muscleGroup) || !reps) {
    setStatus("Completá el nombre, grupo muscular, series y repeticiones.", true);
    return;
  }
  if (!Number.isInteger(sets) || sets < 1 || sets > 10 || !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 600) {
    setStatus("Revisá las series y el descanso: ingresá valores dentro de los límites indicados.", true);
    return;
  }
  if (videoUrl && !getVideoEmbedUrl(videoUrl)) {
    setStatus("Ingresá una URL válida de YouTube o Vimeo, o dejá el campo vacío.", true);
    return;
  }
  if (exercises.some((exercise) => exercise.name.toLocaleLowerCase("es-AR") === name.toLocaleLowerCase("es-AR"))) {
    setStatus("Ya existe un ejercicio con ese nombre en el catálogo.", true);
    return;
  }

  const exercise = {
    id: `custom-${crypto.randomUUID()}`,
    name,
    muscle_group: muscleGroup,
    exercise_type: "personalizado",
    description: String(formData.get("description") || "").trim() || "Ejercicio personalizado.",
    sets,
    reps,
    rest_seconds: restSeconds,
    video_url: videoUrl,
  };
  state.customExercises.push(exercise);
  exercises.push(exercise);
  addExercise(exercise);
  form.reset();
  document.querySelector("#custom-exercise-group").value = exercise.muscle_group;
  form.querySelector('[name="sets"]').value = "3";
  form.querySelector('[name="reps"]').value = "8-12";
  form.querySelector('[name="rest_seconds"]').value = "90";
  document.querySelector(".custom-exercise-panel").open = false;
  setStatus(`«${exercise.name}» se guardó en tus ejercicios personalizados y se agregó a la rutina.`);
}

function makeCatalogCard(exercise) {
  const card = document.createElement("article");
  card.className = "catalog-card";

  const meta = document.createElement("div");
  meta.className = "catalog-meta";
  const group = groups.find((item) => item.id === exercise.muscle_group);
  const groupName = document.createElement("span");
  groupName.className = "catalog-group";
  groupName.textContent = group?.name || exercise.muscle_group;
  meta.append(groupName);

  const title = document.createElement("h3");
  title.textContent = exercise.name;
  const description = document.createElement("p");
  description.className = "exercise-description";
  description.textContent = exercise.description;

  const stats = document.createElement("div");
  stats.className = "exercise-stats";
  [
    [`${exercise.sets} series`, "BASE"],
    [`${exercise.reps} reps`, "RANGO"],
    [`${exercise.rest_seconds} s`, "DESCANSO"],
  ].forEach(([value, label]) => {
    const chip = document.createElement("span");
    chip.className = "exercise-stat";
    const strong = document.createElement("strong");
    strong.textContent = value;
    chip.append(strong, ` ${label}`);
    stats.append(chip);
  });

  const actions = document.createElement("div");
  actions.className = "catalog-actions";
  const videoButton = document.createElement("button");
  videoButton.className = "secondary-button";
  videoButton.type = "button";
  videoButton.textContent = "▶ Ver video";
  videoButton.addEventListener("click", () => openExerciseVideo(exercise));

  const addButton = document.createElement("button");
  addButton.className = "add-button";
  addButton.type = "button";
  const alreadyAdded = Boolean(getRoutineExercise(exercise.id));
  addButton.textContent = alreadyAdded ? "✓ Agregado" : "+ Agregar";
  addButton.disabled = alreadyAdded;
  addButton.addEventListener("click", () => addExercise(exercise));
  actions.append(videoButton, addButton);

  card.append(meta, title, description, stats, actions);
  return card;
}

function renderCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase("es-AR");
  const filtered = exercises.filter((exercise) => {
    const matchesGroup = selectedGroup === "todos" || exercise.muscle_group === selectedGroup;
    const text = `${exercise.name} ${exercise.description} ${exercise.muscle_group}`.toLocaleLowerCase("es-AR");
    return matchesGroup && text.includes(query);
  });

  catalogCount.textContent = `${filtered.length} DE ${exercises.length} EJERCICIOS`;
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-routine";
    empty.textContent = "No encontramos ejercicios con esa búsqueda.";
    catalogGrid.replaceChildren(empty);
    return;
  }
  catalogGrid.replaceChildren(...filtered.map(makeCatalogCard));
}

function addExercise(exercise) {
  if (getRoutineExercise(exercise.id)) return;
  state.activeRoutine.exercises.push({
    id: exercise.id,
    sets: exercise.sets,
    reps: exercise.reps,
    rest_seconds: exercise.rest_seconds,
    weights: Array.from({ length: exercise.sets }, () => ""),
  });
  saveState("Ejercicio agregado y guardado.");
  renderCatalog();
  renderRoutine();
}

function removeExercise(exerciseId) {
  state.activeRoutine.exercises = state.activeRoutine.exercises.filter(
    (item) => item.id !== exerciseId,
  );
  saveState("Ejercicio quitado de tu rutina.");
  renderCatalog();
  renderRoutine();
}

function updateWeight(exerciseId, setIndex, value) {
  const item = getRoutineExercise(exerciseId);
  if (!item) return;
  item.weights[setIndex] = value;
  saveState("Peso registrado.");
}

function updateSetCount(exerciseId, value) {
  const item = getRoutineExercise(exerciseId);
  const setCount = Number(value);
  if (!item || state.activeRoutine.seriesLocked) return;
  if (!Number.isInteger(setCount) || setCount < 1 || setCount > 10) {
    setStatus("La cantidad de series debe estar entre 1 y 10.", true);
    renderRoutine();
    return;
  }
  item.sets = setCount;
  item.weights = Array.from({ length: setCount }, (_, index) => item.weights[index] || "");
  saveState("Cantidad de series actualizada.");
  renderRoutine();
}

function makeRoutineCard(routineExercise, index) {
  const exercise = getExerciseById(routineExercise.id);
  if (!exercise) return null;

  const card = document.createElement("article");
  card.className = "exercise-card routine-exercise-card";

  const info = document.createElement("div");
  info.className = "exercise-info";
  const meta = document.createElement("div");
  meta.className = "exercise-meta";
  const number = document.createElement("span");
  number.className = "exercise-number";
  number.textContent = `EJERCICIO ${String(index + 1).padStart(2, "0")}`;
  meta.append(number);

  const titleRow = document.createElement("div");
  titleRow.className = "routine-exercise-title";
  const title = document.createElement("h3");
  title.textContent = exercise.name;
  const remove = document.createElement("button");
  remove.className = "remove-button";
  remove.type = "button";
  remove.textContent = "Quitar";
  remove.addEventListener("click", () => removeExercise(exercise.id));
  titleRow.append(title, remove);

  const description = document.createElement("p");
  description.className = "exercise-description";
  description.textContent = exercise.description;

  const videoButton = document.createElement("button");
  videoButton.className = "video-button";
  videoButton.type = "button";
  videoButton.textContent = "▶ Ver video";
  videoButton.addEventListener("click", () => openExerciseVideo(exercise));

  const details = document.createElement("div");
  details.className = "exercise-stats";
  [
    ["Series", `${routineExercise.sets}`],
    ["Repeticiones", routineExercise.reps],
    ["Descanso", `${routineExercise.rest_seconds} s`],
  ].forEach(([label, value]) => {
    const stat = document.createElement("span");
    stat.className = "exercise-stat";
    const strong = document.createElement("strong");
    strong.textContent = value;
    stat.append(strong, ` ${label}`);
    details.append(stat);
  });

  const setsLabel = document.createElement("p");
  setsLabel.className = "weight-heading";
  setsLabel.textContent = "PESO USADO";
  const weights = document.createElement("div");
  weights.className = "weight-grid";
  for (let setIndex = 0; setIndex < routineExercise.sets; setIndex += 1) {
    const label = document.createElement("label");
    label.className = "weight-field";
    const setName = document.createElement("span");
    setName.textContent = `Serie ${setIndex + 1}`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.5";
    input.inputMode = "decimal";
    input.placeholder = "kg";
    input.setAttribute("aria-label", `${exercise.name}, peso en la serie ${setIndex + 1} en kilos`);
    input.value = routineExercise.weights[setIndex] || "";
    input.addEventListener("input", () => updateWeight(exercise.id, setIndex, input.value));
    label.append(setName, input);
    weights.append(label);
  }

  const setCountLabel = document.createElement("label");
  setCountLabel.className = "set-count-control";
  const setCountText = document.createElement("span");
  setCountText.textContent = state.activeRoutine.seriesLocked
    ? "Series bloqueadas al guardar"
    : "Series · editable hasta guardar";
  const setCountInput = document.createElement("input");
  setCountInput.type = "number";
  setCountInput.min = "1";
  setCountInput.max = "10";
  setCountInput.step = "1";
  setCountInput.value = routineExercise.sets;
  setCountInput.disabled = state.activeRoutine.seriesLocked;
  setCountInput.setAttribute("aria-label", `Cantidad de series para ${exercise.name}`);
  setCountInput.addEventListener("change", () =>
    updateSetCount(exercise.id, setCountInput.value),
  );
  setCountLabel.append(setCountText, setCountInput);
  if (state.activeRoutine.seriesLocked) {
    setCountLabel.classList.add("set-count-locked");
    setCountInput.title = "Las series quedan bloqueadas al guardar la rutina.";
  }

  const setCountAndWeights = document.createElement("div");
  setCountAndWeights.className = "set-count-and-weights";
  setCountAndWeights.append(setCountLabel, setsLabel, weights);

  info.append(meta, titleRow, description, videoButton, details, setCountAndWeights);
  card.append(info);
  return card;
}

function renderRoutine() {
  const current = state.activeRoutine;
  routineNameInput.value = current.name;
  routineTitle.textContent = current.name || "Mi rutina";
  routineCount.textContent = `${current.exercises.length} EJERCICIOS`;
  routineEmpty.hidden = current.exercises.length > 0;

  const totalSets = current.exercises.reduce((total, item) => total + Number(item.sets), 0);
  routineSummary.replaceChildren();
  [
    [`${current.exercises.length} ejercicios`, "EN TU RUTINA"],
    [`${totalSets} series`, "EN TOTAL"],
    ["Registro de peso", "POR SERIE · KG"],
  ].forEach(([value, label]) => {
    const chip = document.createElement("span");
    chip.className = "summary-chip";
    const strong = document.createElement("strong");
    strong.textContent = value;
    chip.append(strong, ` · ${label}`);
    routineSummary.append(chip);
  });

  routineList.replaceChildren(
    ...current.exercises
      .map(makeRoutineCard)
      .filter((card) => card !== null),
  );
}

function renderSavedRoutines(selectedId = "") {
  savedRoutines.replaceChildren();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Elegí una rutina guardada...";
  savedRoutines.append(emptyOption);
  state.savedRoutines.forEach((routine) => {
    const option = document.createElement("option");
    option.value = routine.id;
    option.textContent = routine.name;
    option.selected = routine.id === selectedId;
    savedRoutines.append(option);
  });
}

function saveRoutine() {
  const name = routineNameInput.value.trim();
  if (!name) {
    setStatus("Poné un nombre para guardar la rutina.", true);
    routineNameInput.focus();
    return;
  }
  if (!state.activeRoutine.exercises.length) {
    setStatus("Agregá al menos un ejercicio antes de guardar.", true);
    return;
  }

  const existing = state.savedRoutines.find(
    (item) => item.name.toLocaleLowerCase("es-AR") === name.toLocaleLowerCase("es-AR"),
  );
  const saved = {
    id: existing?.id || crypto.randomUUID(),
    name,
    exercises: JSON.parse(JSON.stringify(state.activeRoutine.exercises)),
    updatedAt: new Date().toISOString(),
  };
  if (existing) {
    state.savedRoutines = state.savedRoutines.map((item) =>
      item.id === existing.id ? saved : item,
    );
  } else {
    state.savedRoutines.push(saved);
  }
  state.activeRoutine.name = name;
  state.activeRoutine.seriesLocked = true;
  renderSavedRoutines(saved.id);
  renderRoutine();
  saveState(existing ? "Rutina actualizada." : "Rutina guardada.");
}

function loadSavedRoutine() {
  const saved = state.savedRoutines.find((item) => item.id === savedRoutines.value);
  if (!saved) {
    setStatus("Elegí una rutina guardada para cargarla.", true);
    return;
  }
  state.activeRoutine = {
    name: saved.name,
    exercises: JSON.parse(JSON.stringify(saved.exercises)),
    seriesLocked: true,
  };
  saveState(`Rutina «${saved.name}» cargada.`);
  renderCatalog();
  renderRoutine();
}

function startNewRoutine() {
  if (
    state.activeRoutine.exercises.length &&
    !window.confirm("Se reemplazará la rutina actual. Las rutinas guardadas no se borran. ¿Continuar?")
  ) {
    return;
  }
  state.activeRoutine = { name: "", exercises: [], seriesLocked: false };
  savedRoutines.value = "";
  saveState("Rutina nueva lista para armar.");
  renderCatalog();
  renderRoutine();
}

function renderHomeRoutines() {
  const list = document.querySelector("#saved-routine-list");
  const empty = document.querySelector("#saved-routines-empty");
  const count = document.querySelector("#saved-count");
  count.textContent = `${state.savedRoutines.length} RUTINAS`;
  empty.hidden = state.savedRoutines.length > 0;
  list.replaceChildren(
    ...state.savedRoutines.map((routine, index) => {
      const card = document.createElement("article");
      card.className = "saved-routine-card";

      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = `RUTINA ${String(index + 1).padStart(2, "0")}`;
      const title = document.createElement("h3");
      title.textContent = routine.name;
      const details = document.createElement("p");
      details.className = "saved-routine-details";
      const totalSets = routine.exercises.reduce(
        (total, exercise) => total + Number(exercise.sets || 0),
        0,
      );
      details.textContent = `${routine.exercises.length} ejercicios · ${totalSets} series`;

      const action = document.createElement("button");
      action.className = "secondary-button";
      action.type = "button";
      action.textContent = "Abrir rutina →";
      action.addEventListener("click", () => {
        state.activeRoutine = {
          name: routine.name,
          exercises: JSON.parse(JSON.stringify(routine.exercises)),
          seriesLocked: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.location.href = "./crear.html";
      });

      card.append(eyebrow, title, details, action);
      return card;
    }),
  );
}

function createRoutineFromHome() {
  if (
    state.activeRoutine.exercises.length &&
    !window.confirm("Se reemplazará el borrador actual. Las rutinas guardadas no se borran. ¿Continuar?")
  ) {
    return;
  }
  state.activeRoutine = { name: "", exercises: [], seriesLocked: false };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.location.href = "./crear.html";
}

function openExerciseVideo(exercise) {
  videoTitle.textContent = `Video: ${exercise.name}`;
  videoContent.replaceChildren();
  const embedUrl = getVideoEmbedUrl(exercise.video_url);
  if (embedUrl) {
    const frame = document.createElement("iframe");
    frame.className = "video-frame";
    frame.src = embedUrl;
    frame.title = `Demostración: ${exercise.name}`;
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    videoContent.append(frame);
  } else {
    const message = document.createElement("p");
    message.textContent =
      "Todavía no hay un video directo cargado. Podés elegir una demostración de este ejercicio en YouTube:";
    const searchLink = document.createElement("a");
    searchLink.className = "video-search-link";
    searchLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} técnica ejercicio`)}`;
    searchLink.target = "_blank";
    searchLink.rel = "noopener noreferrer";
    searchLink.textContent = `Buscar «${exercise.name}» en YouTube ↗`;
    videoContent.append(message, searchLink);
  }
  videoDialog.showModal();
}

async function initializeBuilder() {
  loadState();
  try {
    exercises = await fetchJson("./data/exercises.json");
    exercises = [...exercises, ...state.customExercises];
    renderFilters();
    renderCustomExerciseGroupOptions();
    renderCatalog();
    renderRoutine();
    renderSavedRoutines();
    catalogCount.textContent = `${exercises.length} EJERCICIOS`;
  } catch (error) {
    catalogGrid.replaceChildren();
    setStatus(error.message, true);
  }
}

if (catalogGrid) {
  searchInput.addEventListener("input", renderCatalog);
  routineNameInput.addEventListener("input", () => {
    state.activeRoutine.name = routineNameInput.value;
    routineTitle.textContent = routineNameInput.value.trim() || "Mi rutina";
    saveState();
  });
  document.querySelector("#save-routine").addEventListener("click", saveRoutine);
  document
    .querySelector("#custom-exercise-form")
    .addEventListener("submit", addCustomExercise);
  document.querySelector("#load-routine").addEventListener("click", loadSavedRoutine);
  document.querySelector("#new-routine").addEventListener("click", startNewRoutine);
  document.querySelector("#close-video").addEventListener("click", () => videoDialog.close());
  videoDialog.addEventListener("close", () => videoContent.replaceChildren());
  videoDialog.addEventListener("click", (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });
  initializeBuilder();
} else {
  loadState();
  renderHomeRoutines();
  document
    .querySelector(".create-routine-link")
    .addEventListener("click", (event) => {
      event.preventDefault();
      createRoutineFromHome();
    });
}
