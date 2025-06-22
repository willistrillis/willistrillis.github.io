<script>
  import { allExercises } from './exercises.js';

  let currentTab = 'workout';
  let showModal = false;
  let workoutTab = 'new';
  let workoutModeActive = false;
  let showLogWorkoutModal = false;
  let readonlyWorkout = false;
  let fromHistory = false;

  let routineName = '';
  let routine = {
    sets: [{ reps: 1, exercises: [] }]
  };

  let exerciseModalVisible = false;
  let activeSetIndex = null;

  let savedRoutines = [];

  let searchQuery = '';
  let selectedTag = '';

  let viewWorkoutModal = false;
  let workoutToView = null;

  function viewWorkout(workout) {
    routineName = workout.name;
    routine = { sets: JSON.parse(JSON.stringify(workout.sets)) };
    workoutModeActive = true;
    readonlyWorkout = true;
    fromHistory = true;
  }



  const filterOptions = ['push', 'pull', 'upper', 'core', 'lower', 'body-weight', 'cardio'];

  function toggleTag(tag) {
    selectedTag = selectedTag === tag ? '' : tag;
  }

  function logWorkout() {
  const history = JSON.parse(localStorage.getItem("history") || "[]");

  history.unshift({
    date: new Date().toISOString(),
    name: routineName || "Unnamed Routine",
    sets: JSON.parse(JSON.stringify(routine.sets)), // Deep copy
  });

  localStorage.setItem("history", JSON.stringify(history));
  showLogWorkoutModal = false;
  workoutModeActive = false;
}

let workoutHistory = [];
let displayedHistoryCount = 5;

$: workoutHistory = JSON.parse(localStorage.getItem("history") || "[]");
$: workoutsThisWeek = workoutHistory.filter(w => {
  const date = new Date(w.date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek;
}).length;

function showMoreHistory() {
  displayedHistoryCount += 5;
}

  $: if (workoutTab === 'saved') {
    const codes = JSON.parse(localStorage.getItem('routines') || '[]');
    savedRoutines = codes.map(code => {
      const nameMatch = code.match(/^e\.([^\.]+)/);
      return {
        name: nameMatch ? nameMatch[1] : 'Unnamed',
        code
      };
    });
  }

  $: filteredExercises = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || ex.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  function startWorkout() {
  // Only use current routine editor if on 'new' tab
  if (workoutTab === 'new') {
    workoutModeActive = true;
    readonlyWorkout = false;
    fromHistory = false;
  }
}

  function selectTab(tab) {
    currentTab = tab;
  }

  function toggleModal() {
    showModal = !showModal;
  }

  function addSet() {
    routine.sets = [...routine.sets, { reps: 1, exercises: [] }];
  }

$: exerciseFrequency = (() => {
  const freq = {};
  for (const entry of workoutHistory) {
    for (const set of entry.sets) {
      for (const ex of set.exercises) {
        freq[ex.name] = (freq[ex.name] || 0) + 1;
      }
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
})();

  function openExerciseModal(setIndex) {
    activeSetIndex = setIndex;
    exerciseModalVisible = true;
  }

  function closeExerciseModal() {
    exerciseModalVisible = false;
    activeSetIndex = null;
  }

  function addExerciseToSet(exerciseTemplate) {
    if (activeSetIndex !== null) {
      const exercise = {
        name: exerciseTemplate.name,
        fields: exerciseTemplate.fields,
        weight: '',
        reps: '',
        time: ''
      };
      routine.sets[activeSetIndex].exercises = [
        ...routine.sets[activeSetIndex].exercises,
        exercise
      ];
      closeExerciseModal();
    }
  }

  function removeSet(index) {
    if (routine.sets.length === 1) return; // Don't allow removing the only set
    routine.sets = routine.sets.filter((_, i) => i !== index);
  }

  function handleNewRoutineClick() {
    workoutTab = 'new';
  }

  function serializeRoutine(routineName, sets) {
    const parts = [`e.${routineName}`];

    for (const set of sets) {
      if (!set.exercises.length) return null; // Prevent saving empty sets

      const setPart = `${set.reps}s${sets.indexOf(set) + 1}`;
      const exercisesPart = set.exercises
        .map(ex => {
          const code = allExercises.find(e => e.name === ex.name)?.code;
          if (!code) return null;

          const metadata = ex.fields.map(field => `${field[0]}${ex[field]}`).join('.');
          return `${code}.${metadata}`;
        })
        .filter(Boolean)
        .join('.');

      parts.push(`${setPart}.${exercisesPart}`);
    }

    return parts.join('.');
  }

  function saveRoutine() {
    const name = routineName.trim();
    if (!name) {
      alert("Please enter a routine name.");
      return;
    }

    const code = serializeRoutine(name, routine.sets);
    if (!code) {
      alert("Please remove empty sets.");
      return;
    }

    let saved = JSON.parse(localStorage.getItem('routines') || '[]');
    if (saved.includes(code)) {
      return;
    }

    saved.push(code);
    localStorage.setItem('routines', JSON.stringify(saved));
  }

  function loadRoutineFromCode() {
    const inputCode = prompt("Enter your routine code:");
    if (!inputCode) return;

    if (!inputCode.startsWith('e.')) {
      alert("Invalid code.");
      return;
    }

    try {
      const [prefix, loadedRoutineName, ...rest] = inputCode.split('.');
      const sets = [];
      let i = 0;

      while (i < rest.length) {
        const match = rest[i].match(/^(\d+)s(\d+)$/);
        if (!match) throw new Error("Invalid set format.");

        const reps = parseInt(match[1], 10);
        const exercises = [];
        i++;

        while (i < rest.length && !/^\d+s\d+$/.test(rest[i])) {
          const code = rest[i];
          const exerciseTemplate = allExercises.find(e => e.code === code);
          if (!exerciseTemplate) throw new Error(`Unknown exercise code: ${code}`);

          const metadata = {};
          for (let j = 0; j < exerciseTemplate.fields.length; j++) {
            i++;
            const fieldData = rest[i];
            if (!fieldData || fieldData[0] !== exerciseTemplate.fields[j][0]) {
              throw new Error(`Expected metadata for ${exerciseTemplate.fields[j]} in ${code}`);
            }
            metadata[exerciseTemplate.fields[j]] = fieldData.slice(1);
          }

          exercises.push({
            name: exerciseTemplate.name,
            fields: exerciseTemplate.fields,
            weight: metadata.weight || '',
            reps: metadata.reps || '',
            time: metadata.time || ''
          });

          i++;
        }

        sets.push({ reps, exercises });
      }

      if (!sets.length) throw new Error("No sets found.");

      routine = { sets };
      workoutTab = 'new';
      routineName = loadedRoutineName;

    } catch (err) {
      alert("Invalid code.");
    }
  }

  function clearRoutine() {
    const hasExercises = routine.sets.some(set => set.exercises.length > 0);
    if (hasExercises) {
      const confirmed = window.confirm("Are you sure you want to clear this routine? This cannot be undone.");
      if (!confirmed) return;
    }

    routine = { sets: [{ reps: 1, exercises: [] }] };
    routineName = '';

    // Optionally clear the routine name input
    requestAnimationFrame(() => {
      const routineNameInput = document.getElementById("routine-name");
      if (routineNameInput) routineNameInput.value = '';
    });
  }

  function removeExerciseFromSet(setIndex, exerciseIndex) {
    routine.sets[setIndex].exercises = routine.sets[setIndex].exercises.filter((_, i) => i !== exerciseIndex);
  }

  function editRoutine(routineCode) {
    const hasExercises = routine.sets.some(set => set.exercises.length > 0);
    if (hasExercises) {
      const confirmed = window.confirm("Editing this will override your current routine. Continue?");
      if (!confirmed) return;
    }

    try {
      const [_, loadedRoutineName, ...rest] = routineCode.split('.');
      const sets = [];
      let i = 0;

      while (i < rest.length) {
        const match = rest[i].match(/^(\d+)s(\d+)$/);
        if (!match) throw new Error("Invalid set format.");

        const reps = parseInt(match[1], 10);
        const exercises = [];
        i++;

        while (i < rest.length && !/^\d+s\d+$/.test(rest[i])) {
          const code = rest[i];
          const exerciseTemplate = allExercises.find(e => e.code === code);
          if (!exerciseTemplate) throw new Error(`Unknown exercise code: ${code}`);

          const metadata = {};
          for (let j = 0; j < exerciseTemplate.fields.length; j++) {
            i++;
            const fieldData = rest[i];
            if (!fieldData || fieldData[0] !== exerciseTemplate.fields[j][0]) {
              throw new Error(`Expected metadata for ${exerciseTemplate.fields[j]} in ${code}`);
            }
            metadata[exerciseTemplate.fields[j]] = fieldData.slice(1);
          }

          exercises.push({
            name: exerciseTemplate.name,
            fields: exerciseTemplate.fields,
            weight: metadata.weight || '',
            reps: metadata.reps || '',
            time: metadata.time || ''
          });

          i++;
        }

        sets.push({ reps, exercises });
      }

      routine = { sets };
      workoutTab = 'new';
      routineName = loadedRoutineName;
    } catch (err) {
      alert("Invalid routine code.");
    }
  }

  let shareModalVisible = false;
  let shareCode = '';

  function openShareModal(code) {
    shareCode = code;
    shareModalVisible = true;
  }

  function closeShareModal() {
    shareModalVisible = false;
    shareCode = '';
  }

  function startWorkoutFromCode(code) {
    editRoutine(code);
    workoutModeActive = true;
  }

  function deleteRoutine(code) {
    const confirmed = window.confirm("Are you sure you want to delete this routine? This cannot be undone.");
    if (!confirmed) return;

    let saved = JSON.parse(localStorage.getItem('routines') || '[]');
    saved = saved.filter(item => item !== code);
    localStorage.setItem('routines', JSON.stringify(saved));

    // Refresh list
    if (workoutTab === 'saved') {
      savedRoutines = saved.map(code => {
        const nameMatch = code.match(/^e\.([^\.]+)/);
        return {
          name: nameMatch ? nameMatch[1] : 'Unnamed',
          code
        };
      });
    }
  }
</script>


<header>
  <h1>eMotion</h1>
  <nav>
    <button on:click={toggleModal}>About</button>
    <button class:selected={currentTab === 'workout'} on:click={() => selectTab('workout')}>Workout</button>
    <button class:selected={currentTab === 'history'} on:click={() => selectTab('history')}>History</button>
  </nav>
</header>

<main>
  {#if currentTab === 'workout'}
    <h2>Let's Build Your Workout!</h2>

    <div class="workout-tabs">
      <button class:selected={workoutTab === 'new'} on:click={handleNewRoutineClick}>
        New Routine
      </button>
      <button class:selected={workoutTab === 'saved'} on:click={() => workoutTab = 'saved'}>Saved Routines</button>
    </div>

    <hr class="section-divider" />

    {#if workoutTab === 'new'}
      <div class="new-routine">
        <div class="routine-controls">
          <button on:click={addSet}>+ Add Set</button>
          <button on:click={loadRoutineFromCode}>+ Add Routine from Code</button>
          <button on:click={clearRoutine}>- Clear Routine</button>
        </div>
        

        {#if routine.sets.length > 0}
          <div class="routine-name-wrapper">
            <label for="routine-name">Routine Name:</label>
            <input
              id="routine-name"
              type="text"
              bind:value={routineName}
              placeholder="Enter a name for your routine"
            />
          </div>
        {/if}

        {#each routine.sets as set, index}
          <div class="set-wrapper">
            <div class="set-layout">
              <div class="rep-column-wrapper">
                <div class="rep-column">
                  <label>Reps:</label>
                  <input
                    type="number"
                    class="set-reps-input"
                    bind:value={set.reps}
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>

              <div class="bracket-and-set">
                <div class="bracket-top">
                  <div class="bracket-line"></div>
                  <span class="set-label">Set {index + 1}</span>
                  <div class="bracket-line"></div>
                </div>
                <div class="bracket-body">
                  <div class="set-content">
                    <div class="vertical-bracket"></div>
                
                    {#each set.exercises as exercise, exIndex}
                      <div class="exercise-card">
                        <button
                          class="remove-exercise-button"
                          on:click={() => removeExerciseFromSet(index, exIndex)}>
                          ✕
                        </button>
                      
                        <div class="exercise-name-title">
                          {exercise.name}
                        </div>
                      
                        {#if exercise.fields.includes('weight')}
                          <div class="exercise-input-group">
                            <label>Weight:</label>
                            <input type="number" bind:value={exercise.weight} placeholder="lbs" />
                          </div>
                        {/if}

                        {#if exercise.fields.includes('reps')}
                          <div class="exercise-input-group">
                            <label>Reps:</label>
                            <input type="number" bind:value={exercise.reps} placeholder="1" />
                          </div>
                        {/if}

                        {#if exercise.fields.includes('time')}
                          <div class="exercise-input-group">
                            <label>Time:</label>
                            <input type="text" bind:value={exercise.time} placeholder="e.g. 30s" />
                          </div>
                        {/if}
                      </div>
                    {/each}
                
                    <button class="add-exercise" on:click={() => openExerciseModal(index)}>+ Exercise</button>
                    {#if routine.sets.length > 1}
                      <button class="delete-set" on:click={() => removeSet(index)}>- Delete Set</button>
                    {/if}
                  </div>
                </div>
              </div>

            </div>
          </div>
        {/each}
      </div>

      {#if routine.sets.some(set => set.exercises.length > 0)}
        <div class="routine-action-buttons">
          <button class="save-routine" on:click={saveRoutine}>Save Routine</button>
          <button class="start-workout" on:click={startWorkout}>Workout</button>
        </div>
      {/if}

    {:else if workoutTab === 'saved'}
      <div class="saved-routines">
        {#if savedRoutines.length === 0}
          <p>Your saved routines will appear here.</p>
        {:else}
          <ul>
            <ul class="saved-routine-list">
              {#each savedRoutines as routine}
                <li class="saved-routine-item">
                  <span class="routine-title">{routine.name}</span>
                  <div class="routine-buttons">
                    <button on:click={() => editRoutine(routine.code)}>Edit</button>
                    <button on:click={() => openShareModal(routine.code)}>Share</button>
                    <button on:click={() => startWorkoutFromCode(routine.code)}>Workout</button>
                    <button on:click={() => deleteRoutine(routine.code)}>Delete</button>
                  </div>
                </li>
              {/each}
            </ul>            
          </ul>
        {/if}
      </div>
    {/if}

  {:else if currentTab === 'history'}
  <h2>Your Journey So Far</h2>
  <p>Look back and celebrate your progress!</p>
  
  <section>
    <section class="past-workouts">
      <h3>— Past Workouts —</h3>
      {#if workoutsThisWeek > 0}
        <p>You have logged {workoutsThisWeek} workouts this week!</p>
      {:else}
        <p>Let’s get moving! Your next workout starts today 💪</p>
      {/if}
    
      {#each workoutHistory.slice(0, displayedHistoryCount) as workout}
        <div class="saved-routine-item">
          <span class="routine-date">{new Date(workout.date).toLocaleDateString()}</span>
          <span class="routine-name">{workout.name}</span>
          <button on:click={() => viewWorkout(workout)}>View</button>
        </div>
      {/each}
    
      {#if workoutHistory.length > displayedHistoryCount}
        <button on:click={showMoreHistory}>View more</button>
      {:else if workoutHistory.length > 5}
        <p>End of workout history.</p>
      {/if}
    </section>

    <section class="movements">
      <h3>— Your Movements —</h3>
    
      <div class="movement-grid">
        {#each exerciseFrequency as name}
          <button class="exercise-option">{name}</button>
        {/each}
      </div>
    </section>    
  </section>
  {/if}

  {#if exerciseModalVisible}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    on:click={closeExerciseModal}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeExerciseModal()}>

    <div class="modal exercise-modal" on:click|stopPropagation>
      <h2>Select an Exercise</h2>

      <input
        type="text"
        placeholder="Search exercises..."
        bind:value={searchQuery}
        class="exercise-search"
      />

      <div class="exercise-filters">
        {#each filterOptions as tag}
          <button
            class:selected={selectedTag === tag}
            on:click={() => toggleTag(tag)}
          >
            {tag}
          </button>
        {/each}
      </div>

      <div class="exercise-list">
        {#each filteredExercises as exercise}
          <button class="exercise-option" on:click={() => addExerciseToSet(exercise)}>
            {exercise.name}
          </button>
        {/each}
      </div>
      <button class="close-exercise" on:click={closeExerciseModal}>Cancel</button>
    </div>
  </div>
{/if}
</main>

{#if shareModalVisible}
  <div class="modal-overlay" role="dialog">
    <div class="modal" on:click|stopPropagation>
      <h2>Share Routine Code</h2>
      <p style="word-break: break-word;">{shareCode}</p>
      <button on:click={closeShareModal}>Close</button>
    </div>
  </div>
{/if}

{#if showModal}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    on:click={toggleModal}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleModal()}>
    
    <div class="modal" aria-hidden="true" on:click|stopPropagation>
      <h2>About eMotion</h2>
      <p>eMotion helps you move with purpose and joy! Build routines, track strength, and feel proud of your journey — all stored safely on your device.</p>
      <button on:click={toggleModal}>Let's Go!</button>
    </div>
  </div>
{/if}

{#if workoutModeActive}
  <div class="workout-modal-overlay">
    <div class="workout-modal">
      <header class="workout-header">
        <h2>{routineName || "Unnamed Routine"}</h2>
      </header>

      <div class="workout-content">
        {#each routine.sets.filter(set => set.exercises.length > 0) as set, index}
          <div class="set-wrapper">
            <div class="set-layout">
              <div class="rep-column-wrapper">
                <div class="rep-column">
                  <label>Reps:</label>
                  <div class="set-reps-text">x{set.reps}</div>
                </div>
              </div>

              <div class="bracket-and-set">
                <div class="bracket-top">
                  <div class="bracket-line"></div>
                  <span class="set-label">Set {index + 1}</span>
                  <div class="bracket-line"></div>
                </div>
                <div class="bracket-body">
                  <div class="set-content">
                    <div class="vertical-bracket"></div>

                    {#each set.exercises as exercise}
                      <div class="exercise-card">
                        <div class="exercise-name-title">{exercise.name}</div>

                        {#if exercise.fields.includes('reps')}
                          <div class="exercise-input-group horizontal-group">
                            <label>Reps:</label>
                            {#each Array(set.reps) as _, repIndex}
                              {#if readonlyWorkout}
                                <span>{exercise.reps || '—'}</span>
                              {:else}
                                <input type="number" placeholder="1" />
                              {/if}
                            {/each}
                          </div>
                        {/if}

                        {#if exercise.fields.includes('weight')}
                          <div class="exercise-input-group horizontal-group">
                            <label>Weight:</label>
                            {#each Array(set.reps) as _, repIndex}
                              {#if readonlyWorkout}
                                <span>{exercise.weight || '—'}</span>
                              {:else}
                                <input type="number" placeholder="lbs" />
                              {/if}
                            {/each}
                          </div>
                        {/if}

                        {#if exercise.fields.includes('time')}
                          <div class="exercise-input-group horizontal-group">
                            <label>Time:</label>
                            {#each Array(set.reps) as _, repIndex}
                              {#if readonlyWorkout}
                                <span>{exercise.time || '—'}</span>
                              {:else}
                                <input type="text" placeholder="e.g. 30s" />
                              {/if}
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <footer class="workout-footer">
        {#if readonlyWorkout && fromHistory}
          <!-- Viewing a past workout (read-only) -->
          <div style="display: flex; gap: 1rem;">
            <button class="end-workout-button" on:click={() => {
              workoutModeActive = false;
              readonlyWorkout = false;
              fromHistory = false;
            }}>
              Close
            </button>
      
            <button class="end-workout-button" on:click={() => {
              readonlyWorkout = false;
            }}>
              Edit
            </button>
      
            <button class="end-workout-button" on:click={() => {
              const confirmDelete = window.confirm("Delete this logged workout from history?");
              if (confirmDelete) {
                const history = JSON.parse(localStorage.getItem("history") || "[]");
                const updated = history.filter(
                  h => !(h.name === routineName && JSON.stringify(h.sets) === JSON.stringify(routine.sets))
                );
                localStorage.setItem("history", JSON.stringify(updated));
                workoutModeActive = false;
                readonlyWorkout = false;
                fromHistory = false;
              }
            }}>
              Delete
            </button>
          </div>
      
        {:else if !readonlyWorkout && fromHistory}
          <!-- Editing a past workout -->
          <div style="display: flex; gap: 1rem;">
            <button class="end-workout-button" on:click={() => {
              workoutModeActive = false;
              readonlyWorkout = false;
              fromHistory = false;
            }}>
              Close
            </button>
      
            <button class="end-workout-button" on:click={() => {
              const history = JSON.parse(localStorage.getItem("history") || "[]");
            
              // Match by date instead of content to prevent false negatives
              const updated = history.map(h => {
                if (
                  h.name === routineName &&
                  JSON.stringify(h.sets) !== JSON.stringify(routine.sets) &&
                  new Date(h.date).toISOString() === new Date(workoutToView.date).toISOString()
                ) {
                  return {
                    ...h,
                    sets: JSON.parse(JSON.stringify(routine.sets))
                  };
                }
                return h;
              });
            
              localStorage.setItem("history", JSON.stringify(updated));
            
              // Stay in modal and editable mode
              readonlyWorkout = false;
            }}>
              Save Changes
            </button>
      
            <button class="end-workout-button" on:click={() => {
              const confirmDelete = window.confirm("Delete this logged workout from history?");
              if (confirmDelete) {
                const history = JSON.parse(localStorage.getItem("history") || "[]");
                const updated = history.filter(
                  h => !(h.name === routineName && JSON.stringify(h.sets) === JSON.stringify(routine.sets))
                );
                localStorage.setItem("history", JSON.stringify(updated));
                workoutModeActive = false;
                readonlyWorkout = false;
                fromHistory = false;
              }
            }}>
              Delete
            </button>
          </div>
      
        {:else}
          <!-- Normal workout mode -->
          <button class="end-workout-button" on:click={() => showLogWorkoutModal = true}>
            End Workout
          </button>
        {/if}
      </footer>   
    </div>
  </div>
{/if}

{#if showLogWorkoutModal}
  <div class="modal-overlay" role="dialog">
    <div class="modal" on:click|stopPropagation>
      <h2>Log Workout?</h2>
      <p>Would you like to save this workout to your history?</p>
      <div style="display: flex; gap: 1rem;">
        <button on:click={logWorkout}>Yes</button>
        <button on:click={() => {
          showLogWorkoutModal = false;
          workoutModeActive = false;
        }}>No</button>
      </div>
    </div>
  </div>
{/if}

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #A88BEB;
    color: white;
    padding: 1rem 2rem;
    border-bottom: 3px solid #C0AFFF;
    position: sticky;
    z-index: 10;
  }

  nav {
    display: flex;
    justify-content: flex-end; 
    gap: 0.5rem;
  }

  nav button.selected {
    background: #8C66DA;
    color: white;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0;
  }

  main {
    padding: 2rem;
    display: flex;
    flex-direction: column;
  }

  main h2 {
    color: #8C66DA;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(172, 146, 235, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }

  .modal h2 {
    margin-top: 0;
    color: #8C66DA;
  }

  .modal button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #8C66DA;
    border: none;
    color: white;
    font-weight: bold;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .modal button:hover {
    background: #7752C9;
  }

  .workout-tabs {
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .set-wrapper {
    margin: 2rem auto;
    max-width: 50%;
  }

  .set-layout {
    display: flex;
    align-items: stretch;
    gap: 1rem;
  }

  .rep-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #8C66DA;
    font-weight: bold;
  }
  
  .set-reps-input {
    width: 3rem;
    padding: 0.25rem;
    text-align: center;
    font-weight: bold;
    color: #8C66DA;
    border: 2px solid #8C66DA;
    border-radius: 6px;
    background: white;
    margin-top: 0.25rem;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .bracket-and-set {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .bracket-top {
    display: flex;
    align-items: center;
    margin-bottom: -0.6rem;
  }

  .bracket-body {
    display: flex;
    flex-direction: column;
  }

  .vertical-bracket {
    position: absolute;
    left: 0;
    top: -4px;
    bottom: 0;
    width: 4px;
    background-color: #8C66DA;
    border-radius: 4px;
  }

  .set-content {
    position: relative;
    background: #f9f7ff;
    border-radius: 12px;
    padding: 1rem;
    flex: 1;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    text-align: left;
  }

  .set-label {
    padding: 0 0.5rem;
    background: #f9f7ff;
    font-weight: bold;
    color: #8C66DA;
    white-space: nowrap;
    z-index: 1;
    position: relative;
  }

  .bracket-line {
    flex: 1;
    height: 4px;
    background-color: #8C66DA;
    border-radius: 2px;
  }

  .routine-name-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2rem auto;
    margin-bottom: -1rem;
    max-width: 30%;
    gap: 0.5rem
  }

  .routine-name-wrapper label {
    font-weight: bold;
    color: #8C66DA;
    white-space: nowrap;
  }

  .routine-name-wrapper input {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 2px solid #C7B6EB;
    border-radius: 6px;
    font-weight: bold;
    color: #5A4E9D;
    background: white;
  }

  .exercise-modal {
  max-width: 550px;
  height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-inline: 1.5rem;
  padding-right: 2.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

  .exercise-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .exercise-option {
    flex: 1 1 40%;
    padding: 0.5rem;
    background: #E6E1FA;
    border: 2px solid #8C66DA;
    border-radius: 8px;
    color: #5A4E9D;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .exercise-option:hover {
    background: #D2C7F6;
  }

  .close-exercise {
    margin-top: 1rem;
    background: #ccc;
    color: #333;
  }

  .exercise-name-title {
    font-weight: bold;
    color: #5A4E9D;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .exercise-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-left: 1.5rem; /* indent from the title */
    max-width: 3rem;
  }

  .exercise-input-group label {
    font-size: 0.75rem;
    font-weight: bold;
    color: #8C66DA;
    margin-bottom: 0.1rem;
  }

  .exercise-input-group input {
    width: 100%; /* <--- add this line */
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    font-weight: bold;
    color: #5A4E9D;
    border: 1px solid #C7B6EB;
    border-radius: 6px;
    background: white;
  }

  .rep-column-wrapper {
    display: flex;
    align-items: center; /* vertically centers rep-column */
  }

  .exercise-card {
    position: relative;
    border: 2px solid #C0AFFF;
    border-radius: 12px;
    background: white;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .remove-exercise-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #fdd;
    color: #900;
    border: 1px solid #e99;
    border-radius: 9999px;
    width: 1.5rem;
    height: 1.5rem;
    font-weight: bold;
    font-size: 0.9rem;
    cursor: pointer;
    line-height: 1.1rem;
    padding: 0;
    text-align: center;
  }

  .remove-exercise-button:hover {
    background: #fbb;
  }

  .workout-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  z-index: 100;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.workout-modal {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
}

.workout-header {
  background-color: #8C66DA;
  padding: 1.5rem;
  text-align: center;
  border-bottom: 3px solid #C0AFFF;

  display: flex;
  justify-content: center;
  align-items: center;
}

.workout-header h2 {
  margin: 0;
  color: white;
  font-size: 2rem;
}

.set-reps-text {
  font-weight: bold;
  font-size: 1.2rem;
  color: #5A4E9D;
  margin-top: 0.25rem;
}

.workout-footer {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.end-workout-button {
  background: #8C66DA;
  color: white;
  font-weight: bold;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.end-workout-button:hover {
  background: #7752C9;
}

.horizontal-group {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.horizontal-group label {
  min-width: 60px;
}

.workout-modal .exercise-input-group.horizontal-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.workout-modal .exercise-input-group.horizontal-group label {
  font-size: 0.85rem;
  font-weight: bold;
  color: #8C66DA;
  margin-right: 0.5rem;
  min-width: 50px;
}

.workout-modal .exercise-input-group.horizontal-group input {
  width: 3rem;
  padding: 0.3rem;
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
  color: #5A4E9D;
  border: 1px solid #C7B6EB;
  border-radius: 6px;
  background: white;
}

.workout-modal .exercise-card .exercise-input-group.horizontal-group {
  flex-direction: row;
  max-width: none;
  margin-left: 0;
}

.saved-routine-list {
  width: 100%;
  max-width: 40rem;
  margin: 1rem auto;
  padding: 0;
  list-style: none;
}

.saved-routine-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f3f0ff;
  border: 2px solid #d8cfff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-sizing: border-box;

  max-width: 35rem;
  margin-left: 0.5rem auto;
}


.routine-title {
  font-weight: bold;
  color: #5A4E9D;
}

.routine-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap; /* Handles smaller screens */
  justify-content: center; /* Optional for visual centering */
}

.exercise-search {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 2px solid #C7B6EB;
  border-radius: 8px;
  font-size: 1rem;
  color: #5A4E9D;
  background-color: white;
}

.exercise-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: auto;
  margin-bottom: 1rem;
}

.exercise-filters button {
  padding: 0.3rem 0.75rem;
  border: 2px solid #C7B6EB;
  border-radius: 9999px;
  background: white;
  color: #5A4E9D;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
}

.exercise-filters button:hover {
  color: white;
  background: #9de4dd;
  border-color: #9de4dd;
}

.exercise-filters button.selected {
  background: #5ED0C4;
  color: white;
  border-color: #5ED0C4;
}

.past-workouts {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2rem;
}

.movements {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
}

.movement-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  max-width: 40%;
  width: 100%;
}

.exercise-option {
  flex: 0 0 calc(50% - 0.5rem);
  text-align: center;
}

.saved-routine-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: #f3f0ff;
  border: 2px solid #d8cfff;
  border-radius: 8px;
  padding: 1rem;
  width: rem;
  box-sizing: border-box;
}
</style>
