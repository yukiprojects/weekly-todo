

// =====================================
// SERVICE WORKER AUTO UPDATE
// =====================================

if ("serviceWorker" in navigator) {

  let hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) location.reload();
    hadController = true;
  });

  window.addEventListener("load", async () => {
    try {
      const registration =
        await navigator.serviceWorker.register("./sw.js", {
          scope:"./",
          updateViaCache:"none"
        });

      await registration.update();

    } catch(error) {
      console.log("Update check failed:",error);
    }
  });
}


// =====================================
// COMMON
// =====================================

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g,c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+d;
}


// =====================================
// WEEKLY TASK DATA
// =====================================

const STORAGE_KEY = "weekly-todo-data";
const TODAY_STORAGE_KEY = "today-todo-data";

function getMonday(date) {
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

let currentWeekStart = dateKey(getMonday(new Date()));

let tasks = [];
let savedWeekStart = currentWeekStart;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    const data = JSON.parse(stored);
    
    if (Array.isArray(data)) {
      tasks = data;
    } else {
      tasks = Array.isArray(data.tasks) ? data.tasks : [];
      savedWeekStart = data.weekStart || currentWeekStart;
    }
  }
} catch (e) {
  console.error("Data loading error:", e);
}


// RESET TASKS FOR NEW PERIOD

function resetTasksForNewPeriod(taskList) {
  
  const completedRepeating = taskList.filter(
    t => t.done && t.repeat
  );
  
  const remaining = taskList.filter(
    t => !t.done
  );
  
  completedRepeating.forEach(t => {
    t.done = false;
    delete t.completedAt;
  });
  
  return [
    ...completedRepeating.filter(t => t.important),
    ...remaining.filter(t => t.important),
    ...completedRepeating.filter(t => !t.important),
    ...remaining.filter(t => !t.important)
  ];
}


// WEEK RESET

if (savedWeekStart !== currentWeekStart) {
  tasks = resetTasksForNewPeriod(tasks);
  savedWeekStart = currentWeekStart;
}


function sortTasks() {
  const sorted = [
    ...tasks.filter(t => !t.done && t.important),
    ...tasks.filter(t => !t.done && !t.important && t.repeat),
    ...tasks.filter(t => !t.done && !t.important && !t.repeat),
    ...tasks.filter(t => t.done)
  ];
  
  tasks.splice(0, tasks.length, ...sorted);
}

sortTasks();


function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      weekStart: currentWeekStart,
      tasks: tasks
    }));
  } catch (e) {
    console.error("Data saving error:", e);
    alert("Could not save data.");
  }
}

save();

// =====================================
// TODAY TASK DATA
// =====================================

let todayTasks = [];
let savedTodayDate = dateKey(new Date());

try {
  const storedToday = localStorage.getItem(TODAY_STORAGE_KEY);
  
  if (storedToday) {
    const data = JSON.parse(storedToday);
    
    todayTasks = Array.isArray(data.tasks) ?
      data.tasks :
      [];
    
    savedTodayDate = data.date || savedTodayDate;
  }
} catch (e) {
  console.error("Today data loading error:", e);
}

if (savedTodayDate !== dateKey(new Date())) {
  todayTasks = resetTasksForNewPeriod(todayTasks);
  savedTodayDate = dateKey(new Date());
}

function sortTodayTasks() {
  const sorted = [
    ...todayTasks.filter(t => !t.done && t.important),
    ...todayTasks.filter(t => !t.done && !t.important && t.repeat),
    ...todayTasks.filter(t => !t.done && !t.important && !t.repeat),
    ...todayTasks.filter(t => t.done)
  ];
  
  todayTasks.splice(0, todayTasks.length, ...sorted);
}

sortTodayTasks();

function saveTodayTasks() {
  try {
    localStorage.setItem(
      TODAY_STORAGE_KEY,
      JSON.stringify({
        date: savedTodayDate,
        tasks: todayTasks
      })
    );
  } catch (e) {
    console.error("Today data saving error:", e);
    alert("Could not save Today tasks.");
  }
}

saveTodayTasks();

// =====================================
// TODO TAB CONTROL
// =====================================

let currentTodoTab = "today";

function getActiveTasks() {
  return currentTodoTab === "today"
    ? todayTasks
    : tasks;
}

function sortActiveTasks() {
  if (currentTodoTab === "today") {
    sortTodayTasks();
  } else {
    sortTasks();
  }
}

function saveActiveTasks() {
  if (currentTodoTab === "today") {
    saveTodayTasks();
  } else {
    save();
  }
}

function switchTodoTab(tab) {
  if (tab !== "today" && tab !== "week") return;

  currentTodoTab = tab;

  document.getElementById("todayTab")
    .classList.toggle("active",tab === "today");

  document.getElementById("weekTab")
    .classList.toggle("active",tab === "week");

  render();
}

  
// =====================================
// AUTOMATIC WEEK & TODAY UPDATE
// =====================================

// WEEK UPDATE

let weekCheckTimer = null;

function checkWeekChange() {
  
  const latestWeekStart = dateKey(getMonday(new Date()));
  
  if (latestWeekStart !== currentWeekStart) {
    currentWeekStart = latestWeekStart;
    
    tasks = resetTasksForNewPeriod(tasks);
    
    sortTasks();
    save();
    render();
  }
  
  scheduleNextWeekCheck();
}

function scheduleNextWeekCheck() {
  
  clearTimeout(weekCheckTimer);
  
  const now = new Date();
  const nextMonday = getMonday(now);
  
  nextMonday.setDate(nextMonday.getDate() + 7);
  nextMonday.setHours(0, 0, 0, 0);
  
  weekCheckTimer = setTimeout(
    checkWeekChange,
    nextMonday.getTime() - now.getTime()
  );
}


// TODAY UPDATE

let todayCheckTimer = null;

function checkTodayChange() {
  
  const latestDate = dateKey(new Date());
  
  if (latestDate !== savedTodayDate) {
    
    todayTasks = resetTasksForNewPeriod(todayTasks);
    
    savedTodayDate = latestDate;
    
    sortTodayTasks();
    saveTodayTasks();
    render();
  }
  
  scheduleNextDayCheck();
}

function scheduleNextDayCheck() {
  
  clearTimeout(todayCheckTimer);
  
  const now = new Date();
  const tomorrow = new Date(now);
  
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  todayCheckTimer = setTimeout(
    checkTodayChange,
    tomorrow.getTime() - now.getTime()
  );
}


// =====================================
// WEEK DISPLAY
// =====================================

function getWeekDates() {

  const monday = getMonday(new Date());

  return Array.from({length:7},(_,i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate()+i);
    return d;
  });
}

let weekDates = getWeekDates();

function updateWeekDisplay() {

  weekDates = getWeekDates();

  document.getElementById("period").textContent =
    weekDates[0].toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    }).toUpperCase();
}


// =====================================
// RENDER
// =====================================

function render() {
  updateWeekDisplay();

  document.getElementById("weekdays").innerHTML =
    ["MON","TUE","WED","THU","FRI","SAT","SUN"].map((d,i)=>`
      <div class="day ${weekDates[i].toDateString()===new Date().toDateString()?"today":""}">
        <div>${d}</div>
        <div class="day-date">${weekDates[i].getDate()}</div>
      </div>
    `).join("");

  const allTasks = getActiveTasks();

  const activeTasks = allTasks.filter(t => !t.done);
  const finishedTasks = allTasks.filter(t => t.done);

  document.getElementById("list").innerHTML =
    activeTasks.length===0
      ? `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path d="M16 3v4M8 3v4M3 10h18"/>
            <path d="M8 14h3M8 17h5"/>
          </svg>
          <div class="empty-title">No tasks yet</div>
          <div class="empty-description">
            ${currentTodoTab === "today"
              ? "Your day is clear. Add a task to get started."
              : "Your week is clear. Add a task to get started."}
          </div>
        </div>
      `
      : activeTasks.map(t => {
          const i = allTasks.indexOf(t);
          return `
            <div class="task ${t.important ? "important" : ""} ${t.repeat ? "repeat" : ""}" data-index="${i}">
              <div class="circle" onclick="toggle(${i})"></div>
              <span class="task-name" onclick="editTask(${i})">${escapeHTML(t.name)}</span>
              <span class="remove" onclick="removeTask(${i})">×</span>
            </div>
          `;
        }).join("");

  document.getElementById("finishedList").innerHTML =
    finishedTasks.map(t => {
      const i = allTasks.indexOf(t);
      return `
        <div class="task done ${t.important ? "important" : ""} ${t.repeat ? "repeat" : ""}" data-index="${i}">
          <div class="circle" onclick="toggle(${i})"></div>
          <span class="task-name">${escapeHTML(t.name)}</span>
          <span class="remove" onclick="removeTask(${i})">×</span>
        </div>
      `;
    }).join("");

  const finishedCountElement =
    document.getElementById("finishedCount");

  const allCompleted =
    allTasks.length > 0 &&
    finishedTasks.length === allTasks.length;

  finishedCountElement.textContent =
    allCompleted
      ? "CONGRATS!"
      : `${finishedTasks.length}/${allTasks.length} DONE!`;

  finishedCountElement.classList.toggle(
    "congrats",
    allCompleted
  );

  setupDrag();
}
  
// =====================================
// TOGGLE TASK
// =====================================

function toggle(i) {

  checkWeekChange();

  const activeTasks = getActiveTasks();
  const task = activeTasks[i];

  if (!task) return;

  task.done = !task.done;

  if (task.done) {
    task.completedAt = dateKey(new Date());
  } else {
    delete task.completedAt;
  }

  sortActiveTasks();
  render();
  saveActiveTasks();
}

// =====================================
// ADD TASK
// =====================================

function addTask(name, important, repeat) {
  checkWeekChange();
  
  name = name.trim();
  
  if (!name) return;
  
  const activeTasks = getActiveTasks();
  
  const task = {
    name: name,
    done: false,
    important: important,
    repeat: repeat
  };
  
  const firstDone = activeTasks.findIndex(t => t.done);
  
  if (firstDone === -1) activeTasks.push(task);
  else activeTasks.splice(firstDone, 0, task);
  
  sortActiveTasks();
  
  render();
  saveActiveTasks();
}


// =====================================
// ENTER HANDLING
// =====================================

const taskInput = document.getElementById("todoName");

let isTaskInputComposing = false;

taskInput.addEventListener("compositionstart", () => {
  isTaskInputComposing = true;
});

taskInput.addEventListener("compositionend", () => {
  isTaskInputComposing = false;
});

taskInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;

  if (
    isTaskInputComposing ||
    event.isComposing ||
    event.keyCode === 229
  ) return;

  event.preventDefault();
  saveTodo();
});

let editingTaskIndex = null;


// =====================================
// TODO EDITOR
// =====================================


// OPEN NEW TODO

function openTodoEditor() {

  editingTaskIndex = null;

  const modal = document.getElementById("todoModal");
  const input = document.getElementById("todoName");
  const important = document.getElementById("todoImportant");
  const repeat = document.getElementById("todoRepeat");

  const description =
    document.getElementById("todoImportantDescription");

  const repeatDescription =
    document.getElementById("todoRepeatDescription");

  input.value = "";
  important.checked = false;
  repeat.checked = false;

  description.textContent =
    currentTodoTab === "today"
      ? "Highlight this task in Today"
      : "Highlight this task in Weekly Todo";

  repeatDescription.textContent =
    currentTodoTab === "today"
      ? "Repeat this task every day"
      : "Repeat this task every week";

  modal.classList.add("open");

  setTimeout(() => {
    input.focus();
  }, 100);
}


// EDIT EXISTING TODO

function editTask(i) {

  const activeTasks = getActiveTasks();
  const task = activeTasks[i];

  if (!task) return;

  editingTaskIndex = i;

  const modal = document.getElementById("todoModal");
  const input = document.getElementById("todoName");
  const important = document.getElementById("todoImportant");
  const repeat = document.getElementById("todoRepeat");

  const description =
    document.getElementById("todoImportantDescription");

  const repeatDescription =
    document.getElementById("todoRepeatDescription");

  input.value = task.name;
  important.checked = !!task.important;
  repeat.checked = !!task.repeat;

  description.textContent =
    currentTodoTab === "today"
      ? "Highlight this task in Today"
      : "Highlight this task in Weekly Todo";

  repeatDescription.textContent =
    currentTodoTab === "today"
      ? "Repeat this task every day"
      : "Repeat this task every week";

  modal.classList.add("open");

  setTimeout(() => {
    input.focus();
  }, 100);
}


// CLOSE EDITOR

function closeTodoEditor() {

  document.getElementById("todoModal").classList.remove("open");

  editingTaskIndex = null;
}


// SAVE TODO

function saveTodo() {

  const input = document.getElementById("todoName");
  const important = document.getElementById("todoImportant");
  const repeat = document.getElementById("todoRepeat");

  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  // EDIT EXISTING TODO

  if (editingTaskIndex !== null) {

    checkWeekChange();

    const activeTasks = getActiveTasks();
    const task = activeTasks[editingTaskIndex];

    if (!task) {
      editingTaskIndex = null;
      closeTodoEditor();
      return;
    }

    task.name = name;
    task.important = important.checked;
    task.repeat = repeat.checked;

    sortActiveTasks();

    render();
    saveActiveTasks();

  }

  // ADD NEW TODO

  else {

    addTask(name, important.checked, repeat.checked);

  }

  closeTodoEditor();
}


// IMPORTANT / REPEAT SWITCH

document.getElementById("todoImportant").addEventListener("change", function() {

  if (this.checked) {
    document.getElementById("todoRepeat").checked = false;
  }

});

document.getElementById("todoRepeat").addEventListener("change", function() {

  if (this.checked) {
    document.getElementById("todoImportant").checked = false;
  }

});


// =====================================
// REMOVE TASK
// =====================================

function removeTask(i) {

  checkWeekChange();

  const activeTasks = getActiveTasks();

  if (i<0 || i>=activeTasks.length) return;

  activeTasks.splice(i,1);

  render();
  saveActiveTasks();
}




// =====================================
// DRAG AND DROP
// =====================================

let dragIndex = null;
let dragStarted = false;
let pressTimer = null;
let dragTargetIndex = null;

let startY = 0;
let startX = 0;


// DRAG SETUP

function setupDrag() {

  const rows = document.querySelectorAll(".task");

  rows.forEach(row => {

    row.addEventListener("touchstart", e => {

      if (
        e.target.closest(".circle") ||
        e.target.closest(".remove")
      ) return;

      const touch = e.touches[0];

      dragIndex = Number(row.dataset.index);
      dragTargetIndex = null;

      startY = touch.clientY;
      startX = touch.clientX;

      dragStarted = false;

      clearTimeout(pressTimer);

      pressTimer = setTimeout(() => {

        dragStarted = true;

        row.classList.add("dragging");
        document.body.classList.add("dragging");

      }, 300);

    }, { passive: true });


    row.addEventListener("touchmove", e => {

      const touch = e.touches[0];

      if (!dragStarted) {

        if (
          Math.abs(touch.clientY - startY) > 10 ||
          Math.abs(touch.clientX - startX) > 10
        ) {
          clearTimeout(pressTimer);
        }

        return;
      }

      e.preventDefault();

      const target = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );

      const targetRow = target
        ? target.closest(".task")
        : null;

      document.querySelectorAll(".task").forEach(r => {
        r.classList.remove(
          "drag-target",
          "drag-target-above"
        );
      });

      dragTargetIndex = null;

      if (targetRow) {

        const targetIndex = Number(targetRow.dataset.index);

        const activeTasks = getActiveTasks();

        if (
          targetIndex !== dragIndex &&
          activeTasks[dragIndex] &&
          activeTasks[targetIndex] &&
          activeTasks[dragIndex].done ===
          activeTasks[targetIndex].done
        ) {

          dragTargetIndex = targetIndex;

          targetRow.classList.add("drag-target");

          if (targetIndex < dragIndex) {
            targetRow.classList.add("drag-target-above");
          }

        }

      }

    }, { passive: false });


    row.addEventListener("touchend", () => {

      clearTimeout(pressTimer);

      if (!dragStarted) {

        dragIndex = null;
        dragTargetIndex = null;

        return;
      }

      const activeTasks = getActiveTasks();

      if (
        dragTargetIndex !== null &&
        dragTargetIndex !== dragIndex &&
        activeTasks[dragIndex] &&
        activeTasks[dragTargetIndex]
      ) {

        const moved = activeTasks.splice(dragIndex, 1)[0];

        activeTasks.splice(dragTargetIndex, 0, moved);

        saveActiveTasks();

      }

      dragIndex = null;
      dragTargetIndex = null;
      dragStarted = false;

      document.body.classList.remove("dragging");

      render();

    }, { passive: true });


    row.addEventListener("touchcancel", () => {

      clearTimeout(pressTimer);

      document.body.classList.remove("dragging");

      dragIndex = null;
      dragTargetIndex = null;
      dragStarted = false;

      render();

    });

  });

}

  
// =====================================
// DAILY DATA
// =====================================

const DAILY_STORAGE_KEY = "plan-daily-data";

let dailyData = {};
let selectedDailyDate = dateKey(new Date());
let editingEventId = null;

try {
  const storedDaily = localStorage.getItem(DAILY_STORAGE_KEY);

  if (storedDaily) {
    const parsedDaily = JSON.parse(storedDaily);

    if (
      parsedDaily &&
      typeof parsedDaily === "object" &&
      !Array.isArray(parsedDaily)
    ) {
      dailyData = parsedDaily;
    }
  }
} catch(e) {
  console.error("Daily data loading error:",e);
}

function saveDailyData() {
  try {
    localStorage.setItem(
      DAILY_STORAGE_KEY,
      JSON.stringify(dailyData)
    );
  } catch(e) {
    console.error("Daily save error:",e);
    alert("Could not save daily schedule.");
  }
}

function getDailyEvents() {
  if (!Array.isArray(dailyData[selectedDailyDate])) {
    dailyData[selectedDailyDate] = [];
  }

  return dailyData[selectedDailyDate];
}



// =====================================
// DAILY TIME HELPERS
// =====================================

// Time is stored as minutes after 05:00.
// Existing event data remains unchanged.

const HOUR_HEIGHT = 72;

  // Current time position on screen (30%)
const DAILY_TIME_SCROLL_POSITION = 0.30;

function getDailySettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("plan-daily-settings") || "null"
    );

    return {
      startTime: saved?.startTime || "05:00",
      endTime: saved?.endTime || "02:00"
    };
  } catch (e) {
    return {
      startTime: "05:00",
      endTime: "02:00"
    };
  }
}

function timeToOffset(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute - 300;
}

function getDailyTimeRange() {
  const settings = getDailySettings();

  const start = timeToOffset(settings.startTime);
  let end = timeToOffset(settings.endTime);

  while (end <= start) {
    end += 1440;
  }

  return {
    start,
    end,
    hours: (end - start) / 60
  };
}

const DAILY_START = getDailyTimeRange().start;
const DAILY_END = getDailyTimeRange().end;
const TOTAL_HOURS = getDailyTimeRange().hours;

function formatDailyTime(offset) {
  const total = 300 + Number(offset);

  const normalized = ((total % 1440) + 1440) % 1440;

  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return String(hour).padStart(2, "0") + ":" +
    String(minute).padStart(2, "0");
}

function formatDailyTimeLabel(offset) {
  const total = 300 + Number(offset);
  const time = formatDailyTime(offset);

  if (total >= 1440) {
    return time + " (+1 day)";
  }

  return time;
}

function buildTimeOptions() {
  const startSelect = document.getElementById("eventStart");
  const endSelect = document.getElementById("eventEnd");

  let html = "";

  for (
    let minute = DAILY_START;
    minute <= DAILY_END;
    minute += 15
  ) {
    html += `
      <option value="${minute}">
        ${escapeHTML(formatDailyTimeLabel(minute))}
      </option>
    `;
  }

  startSelect.innerHTML = html;
  endSelect.innerHTML = html;
}

buildTimeOptions();



// =====================================
// DAILY TIMELINE
// =====================================

function renderTimeline() {

  const track = document.getElementById("timelineTrack");
  const eventsLayer = document.getElementById("timelineEvents");

  let hoursHTML = "";

  // Hour lines
  for (let i = 0; i <= TOTAL_HOURS; i++) {

    const top = i * HOUR_HEIGHT;
    const offset = DAILY_START + i * 60;
    const time = formatDailyTimeLabel(offset);

    hoursHTML += `
  <div
    class="timeline-hour ${i === TOTAL_HOURS ? 'last-hour' : ''}"
    style="top:${top}px;"
  >
    <span class="timeline-hour-label">${time}</span>
  </div>
`;
  }

  track.innerHTML = hoursHTML;

  // Empty areas for adding events
  let addAreasHTML = "";

  for (let i = 0; i < TOTAL_HOURS; i++) {

    const top = i * HOUR_HEIGHT;
    const offset = DAILY_START + i * 60;

    addAreasHTML += `
      <div
        class="timeline-add"
        style="top:${top}px;"
        onclick="openEventForm(${offset})"
      ></div>
    `;
  }

  track.insertAdjacentHTML("beforeend", addAreasHTML);

  // Existing events
  const events = getDailyEvents()
    .slice()
    .sort((a, b) => Number(a.start) - Number(b.start));

  eventsLayer.innerHTML = events.map(event => {

    const start = Number(event.start);
    const end = Number(event.end);

    const top =
      (start - DAILY_START) / 60 * HOUR_HEIGHT;

    const height = Math.max(
      30,
      (end - start) / 60 * HOUR_HEIGHT
    );

    return `
      <div
        class="daily-event"
        style="top:${top}px;height:${height}px;"
        onclick="editDailyEvent(${Number(event.id)})"
      >
        <div class="daily-event-title">
          ${escapeHTML(event.title)}
        </div>
        <div class="daily-event-time">
          ${escapeHTML(formatDailyTimeLabel(start))} –
          ${escapeHTML(formatDailyTimeLabel(end))}
        </div>
      </div>
    `;

  }).join("");

  document.getElementById("timeline").style.height =
    (TOTAL_HOURS * HOUR_HEIGHT) + "px";
}


// =====================================
// DAILY DATE NAVIGATION
// =====================================

function updateDailyDateLabel() {

  document.getElementById("dailyDate").value =
    selectedDailyDate;

}

function renderDaily() {
  updateDailyDateLabel();
  updateDailyDateStyle();
  renderTimeline();
}

  // =====================================
// AUTO SCROLL TO CURRENT TIME
// =====================================

function scrollDailyToCurrentTime() {

  if (selectedDailyDate !== dateKey(new Date())) return;

  const now = new Date();

  let nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes < 300) {
    nowMinutes += 1440;
  }

  const currentOffset = nowMinutes - 300;

  const range = getDailyTimeRange();

  const clampedOffset = Math.max(
    range.start,
    Math.min(range.end, currentOffset)
  );

  const timePosition =
    (clampedOffset - range.start) / 60 * HOUR_HEIGHT;

  const scrollArea =
    document.getElementById("dailyScrollArea");

  const targetScroll =
    timePosition -
    scrollArea.clientHeight * DAILY_TIME_SCROLL_POSITION;

  scrollArea.scrollTo({
    top: Math.max(0, targetScroll),
    behavior: "instant"
  });
}

function changeDailyDate(amount) {

  const date = new Date(selectedDailyDate+"T12:00:00");

  date.setDate(date.getDate()+amount);

  selectedDailyDate = dateKey(date);

  closeEventEditor();
  renderDaily();
}

function selectDailyDate() {

  const value = document.getElementById("dailyDate").value;

  if (!value) return;

  selectedDailyDate = value;

  closeEventEditor();
  renderDaily();
}

function goToday() {
  selectedDailyDate = dateKey(new Date());
  closeEventEditor();
  renderDaily();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollDailyToCurrentTime();
    });
  });
}

function updateDailyDateStyle() {
  const input = document.getElementById("dailyDate");

  if (!input) return;

  input.classList.toggle(
    "today",
    selectedDailyDate === dateKey(new Date())
  );
}





// =====================================
// DAILY SETTINGS
// =====================================

function openDailySettings() {
  const panel = document.getElementById("dailySettingsPanel");

  // Toggle panel
  if (panel.style.display === "block") {
    closeDailySettings();
    return;
  }

  populateDailyTimeSettings();

  const saved = getDailySettings();

  document.getElementById("dailyStartTime").value =
    saved.startTime;

  document.getElementById("dailyEndTime").value =
    saved.endTime;

  // Center panel on screen
  panel.style.position = "fixed";
  panel.style.top = "50%";
  panel.style.left = "50%";
  panel.style.transform = "translate(-50%, -50%)";
  panel.style.width = "calc(100vw - 40px)";
  panel.style.maxWidth = "420px";
  panel.style.maxHeight = "80vh";
  panel.style.overflowY = "auto";
  panel.style.zIndex = "9999";
  panel.style.margin = "0";

  panel.style.display = "block";
}

function closeDailySettings() {
  const panel = document.getElementById("dailySettingsPanel");
  panel.style.display = "none";
}

function populateDailyTimeSettings() {
  const startSelect = document.getElementById("dailyStartTime");
  const endSelect = document.getElementById("dailyEndTime");

  startSelect.innerHTML = "";
  endSelect.innerHTML = "";

  // Start time: 00:00–23:00
  for (let hour = 0; hour < 24; hour++) {
    const value = String(hour).padStart(2, "0") + ":00";

    startSelect.add(new Option(value, value));
  }

  // End time: 00:00–27:00
  for (let hour = 0; hour <= 27; hour++) {
    const value = String(hour).padStart(2, "0") + ":00";

    let label = value;

    if (hour >= 24) {
      const nextDayHour = hour - 24;

      label =
        String(nextDayHour).padStart(2, "0") +
        ":00 (+1 day)";
    }

    endSelect.add(new Option(label, value));
  }
}

function saveDailySettings() {
  const startTime =
    document.getElementById("dailyStartTime").value;

  const endTime =
    document.getElementById("dailyEndTime").value;

  localStorage.setItem(
    "plan-daily-settings",
    JSON.stringify({
      startTime,
      endTime
    })
  );

  location.reload();
}




// =====================================
// DAILY EVENT EDITOR
// =====================================

function openEventForm(startOffset) {

  editingEventId = null;

  document.getElementById("editorTitle").textContent = "NEW EVENT";
  document.getElementById("eventName").value = "";

  const start = Math.max(
    DAILY_START,
    Math.min(
      DAILY_END - 15,
      Math.round(startOffset / 15) * 15
    )
  );

  document.getElementById("eventStart").value = String(start);

  document.getElementById("eventEnd").value = String(
    Math.min(DAILY_END, start + 60)
  );

  document.getElementById("deleteEventButton").style.display = "none";

  // Open modal
  document.getElementById("eventModal").style.display = "flex";

  setTimeout(() => {
    document.getElementById("eventName").focus();
  }, 250);
}


function editDailyEvent(id) {

  const event = getDailyEvents().find(
    e => Number(e.id) === Number(id)
  );

  if (!event) return;

  editingEventId = Number(id);

  document.getElementById("editorTitle").textContent = "EDIT EVENT";
  document.getElementById("eventName").value = event.title;
  document.getElementById("eventStart").value = String(event.start);
  document.getElementById("eventEnd").value = String(event.end);

  document.getElementById("deleteEventButton").style.display = "block";

  // Open modal
  document.getElementById("eventModal").style.display = "flex";
}


function closeEventEditor() {

  // Close modal
  document.getElementById("eventModal").style.display = "none";

  editingEventId = null;
}


function saveDailyEvent() {

  const title = document.getElementById("eventName").value.trim();

  const start = Number(document.getElementById("eventStart").value);
  const end = Number(document.getElementById("eventEnd").value);

  if (!title) {
    alert("Please enter an event title.");
    document.getElementById("eventName").focus();
    return;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < DAILY_START ||
    end > DAILY_END ||
    end <= start
  ) {
    alert("Please select a valid start and end time.");
    return;
  }

  const events = getDailyEvents();

  // Prevent overlapping events.
  const conflict = events.find(event => {

    if (
      editingEventId !== null &&
      Number(event.id) === Number(editingEventId)
    ) {
      return false;
    }

    return start < Number(event.end) &&
      end > Number(event.start);
  });

  if (conflict) {
    alert("This time overlaps with another event.");
    return;
  }

  if (editingEventId !== null) {

    const index = events.findIndex(
      e => Number(e.id) === Number(editingEventId)
    );

    if (index !== -1) {
      events[index] = {
        ...events[index],
        title: title,
        start: start,
        end: end
      };
    }

  } else {

    events.push({
      id: Date.now(),
      title: title,
      start: start,
      end: end
    });

  }

  saveDailyData();
  closeEventEditor();
  renderTimeline();
}


function deleteDailyEvent() {
  
  if (editingEventId === null) return;

  if (!confirm("Delete this event?")) return;

  dailyData[selectedDailyDate] = getDailyEvents().filter(
    event => Number(event.id) !== Number(editingEventId)
  );

  saveDailyData();
  closeEventEditor();
  renderTimeline();
}


// =====================================
// DAILY ENTER HANDLING
// =====================================

document.getElementById("eventName").addEventListener(
  "keydown",
  event => {

    if (event.key!=="Enter") return;

    if (event.isComposing || event.keyCode===229) return;

    event.preventDefault();
    saveDailyEvent();

  }
);


// =====================================
// MONTHLY DATA
// =====================================

const MONTHLY_STORAGE_KEY = "plan-monthly-data";

const MONTHLY_FIELDS = [
  {key:"futureSelf",label:"MY FUTURE SELF"},
  {key:"newSkills",label:"NEW SKILLS"},
  {key:"monthlyGoals",label:"MY GOALS"},
  {key:"oneThing",label:"ONE THING TO CHANGE"}
];

function getMonthKey(date) {
  return date.getFullYear()+"-"+
    String(date.getMonth()+1).padStart(2,"0");
}

function getMonthName(date) {
  return date.toLocaleDateString("en-US",{
    month:"long",
    year:"numeric"
  }).toUpperCase();
}

let currentMonthKey = getMonthKey(new Date());
let monthlyData = {};

try {
  const stored = localStorage.getItem(MONTHLY_STORAGE_KEY);

  if (stored) {
    const parsed = JSON.parse(stored);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      monthlyData = parsed;
    }
  }
} catch(e) {
  console.error("Monthly data loading error:",e);
}

function getCurrentMonthData() {

  if (
    !monthlyData[currentMonthKey] ||
    typeof monthlyData[currentMonthKey] !== "object"
  ) {
    monthlyData[currentMonthKey] = {
      futureSelf:"",
      newSkills:"",
      monthlyGoals:"",
      oneThing:""
    };
  }

  return monthlyData[currentMonthKey];
}

function saveMonthly() {

  const data = getCurrentMonthData();

  data.futureSelf = document.getElementById("futureSelf").value;
  data.newSkills = document.getElementById("newSkills").value;
  data.monthlyGoals = document.getElementById("monthlyGoals").value;
  data.oneThing = document.getElementById("oneThing").value;

  try {
    localStorage.setItem(
      MONTHLY_STORAGE_KEY,
      JSON.stringify(monthlyData)
    );

    document.getElementById("saveStatus").textContent = "SAVED";

  } catch(e) {
    document.getElementById("saveStatus").textContent = "SAVE ERROR";
    console.error("Monthly save error:",e);
  }
}

function loadMonthly() {

  const now = new Date();

  currentMonthKey = getMonthKey(now);

  document.getElementById("monthPeriod").textContent =
    getMonthName(now);

  const data = getCurrentMonthData();

  document.getElementById("futureSelf").value = data.futureSelf || "";
  document.getElementById("newSkills").value = data.newSkills || "";
  document.getElementById("monthlyGoals").value = data.monthlyGoals || "";
  document.getElementById("oneThing").value = data.oneThing || "";
}

function updateMonthlyFields() {
  document.querySelectorAll(".month-textarea").forEach(textarea => {
    textarea.classList.toggle(
      "filled",
      textarea.value.trim().length > 0
    );
  });
}

document.querySelectorAll(".month-textarea").forEach(textarea => {
  textarea.addEventListener("input", () => {
    updateMonthlyFields();
    saveMonthly();
  });
});

loadMonthly();
updateMonthlyFields();


// =====================================
// PAST MONTHS ARCHIVE
// =====================================

function formatArchiveMonth(monthKey) {

  const parts = monthKey.split("-");

  if (parts.length!==2) return monthKey;

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month<1 ||
    month>12
  ) {
    return monthKey;
  }

  return getMonthName(new Date(year,month-1,1));
}

function hasRecordedContent(data) {

  if (!data || typeof data!=="object") return false;

  return MONTHLY_FIELDS.some(field => {
    return String(data[field.key] || "").trim()!=="";
  });
}

function renderArchive() {

  const historyList = document.getElementById("historyList");
  const nowMonthKey = getMonthKey(new Date());

  const pastMonths = Object.keys(monthlyData)
    .filter(key => (
      /^\d{4}-\d{2}$/.test(key) &&
      key<nowMonthKey &&
      hasRecordedContent(monthlyData[key])
    ))
    .sort((a,b) => b.localeCompare(a));

  if (pastMonths.length===0) {

    historyList.innerHTML = `
      <div class="archive-empty">
        <div class="archive-empty-title">
          No past records yet
        </div>
        <div class="archive-empty-description">
          Your previous monthly reflections<br>
          will appear here.
        </div>
      </div>
    `;

    return;
  }

  historyList.innerHTML = pastMonths.map(monthKey => {

    const data = monthlyData[monthKey] || {};

    const items = MONTHLY_FIELDS.map(field => {

      const value = String(data[field.key] || "").trim();

      return `
        <div class="history-item">
          <div class="history-label">${field.label}</div>
          <div class="history-value ${value ? "" : "empty"}">${value ? escapeHTML(value) : "Not recorded"}</div>
        </div>
      `;

    }).join("");

    return `
      <div class="history-month">
        <div class="history-month-title">
          ${escapeHTML(formatArchiveMonth(monthKey))}
        </div>
        ${items}
      </div>
    `;

  }).join("");
}

function showArchive() {

  saveMonthly();
  renderArchive();

  document.getElementById("monthlyMain").style.display = "none";
  document.getElementById("archive").style.display = "block";

  window.scrollTo(0,0);
}

function closeArchive() {

  document.getElementById("archive").style.display = "none";
  document.getElementById("monthlyMain").style.display = "block";

  window.scrollTo(0,0);
}

function closeArchiveIfOpen() {
  document.getElementById("archive").style.display = "none";
  document.getElementById("monthlyMain").style.display = "block";
}


// =====================================
// PAGE NAVIGATION
// =====================================

// Page order
const PAGE_CONFIGS = [
  { id: "daily", label: "CALENDAR" },
  { id: "weekly", label: "TODO" },
  { id: "monthly", label: "GOALS" },
  { id: "ideas", label: "IDEAS" }
];

let currentPage = "weekly";

const weeklyPage = document.getElementById("weekly");
const dailyPage = document.getElementById("daily");
const monthlyPage = document.getElementById("monthly");
const ideasPage = document.getElementById("ideas");


// =====================================
// RENDER PAGE INDICATOR
// =====================================

function renderPageIndicator() {
  
  const indicator = document.getElementById("pageIndicator");
  
  if (!indicator) return;
  
  indicator.innerHTML = "";
  
  PAGE_CONFIGS.forEach(config => {
    
    const dot = document.createElement("button");
    
    dot.type = "button";
    dot.className = "page-dot";
    dot.setAttribute("aria-label", config.label);
    
    dot.classList.toggle(
      "active",
      config.id === currentPage
    );
    
    dot.addEventListener("click", () => {
      showPage(config.id);
    });
    
    indicator.appendChild(dot);
    
  });
  
}


// =====================================
// SHOW PAGE
// =====================================

function showPage(page, force = false) {
  
  if (page === currentPage && !force) {
    renderPageIndicator();
    return;
  }
  
  localStorage.setItem("plan-last-page", page);
  
  if (page !== "monthly") {
    closeArchiveIfOpen();
  }
  
  if (page === "monthly") {
    saveMonthly();
  }
  
  currentPage = page;
  
  weeklyPage.style.display = page === "weekly" ? "block" : "none";
  dailyPage.style.display = page === "daily" ? "flex" : "none";
  monthlyPage.style.display = page === "monthly" ? "block" : "none";
  ideasPage.style.display = page === "ideas" ? "block" : "none";
  
  if (page === "daily") {
    renderDaily();
  }
  
  if (page === "monthly") {
    loadMonthly();
  }
  
  if (page === "weekly") {
    checkWeekChange();
  }
  
  renderPageIndicator();
  
  window.scrollTo(0, 0);
  
  if (
    page === "daily" &&
    selectedDailyDate === dateKey(new Date())
  ) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollDailyToCurrentTime();
      });
    });
  }
  
}


// Initial dots
renderPageIndicator();

// =====================================
// PREVENT PAGE PINCH ZOOM
// =====================================

document.addEventListener("touchmove", e => {
  
  if (e.touches.length < 2) return;
  
  const target = e.target;
  
  const isIdeasCanvas =
    target.closest &&
    target.closest(".ideas-workspace");
  
  // Allow pinch zoom only on Ideas canvas in Edit mode.
  if (isIdeasCanvas && ideasEditMode) return;
  
  // Prevent page zoom everywhere else.
  e.preventDefault();
  
}, {
  passive: false,
  capture: true
});


// =====================================
// SWIPE DETECTION
// =====================================

let swipeStartX = 0;
let swipeStartY = 0;
let swipeDirection = null;
let swipeTracking = false;


// TOUCH START

document.addEventListener("touchstart", e => {

  if (e.touches.length !== 1) {
    swipeTracking = false;
    swipeDirection = null;
    return;
  }

  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;

  swipeDirection = null;
  swipeTracking = true;

}, { passive: true });


// TOUCH MOVE

document.addEventListener("touchmove", e => {

  if (!swipeTracking) return;

  const touch = e.touches[0];

  const diffX = touch.clientX - swipeStartX;
  const diffY = touch.clientY - swipeStartY;

  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  if (swipeDirection === null) {

    if (Math.max(absX, absY) < 6) return;

    if (absX > absY * 1.2) {
      swipeDirection = "horizontal";
    } else if (absY > absX * 1.2) {
      swipeDirection = "vertical";
    }

  }

  if (swipeDirection === "horizontal") {
    e.preventDefault();
  }

}, { passive: false });


// TOUCH END

document.addEventListener("touchend", e => {

  if (!swipeTracking) return;

  swipeTracking = false;

  // Do not navigate while dragging a task.
  if (document.body.classList.contains("dragging")) return;

  // Do not navigate while the archive is open.
  if (
    document.getElementById("archive").style.display === "block"
  ) return;

  if (swipeDirection !== "horizontal") return;

  const touch = e.changedTouches[0];
  const diffX = touch.clientX - swipeStartX;

  // Require a minimum horizontal movement.
  if (Math.abs(diffX) < 65) return;


  // =====================================
  // PAGE NAVIGATION
  // CALENDAR ⇄ TODO ⇄ GOALS ⇄ IDEAS
  // =====================================

  if (currentPage === "weekly") {

    // Swipe left → GOALS
    if (diffX < 0) showPage("monthly");

    // Swipe right → CALENDAR
    if (diffX > 0) showPage("daily");

  } else if (currentPage === "daily") {

    // Swipe left → TODO
    if (diffX < 0) showPage("weekly");

  } else if (currentPage === "monthly") {

    // Swipe right → TODO
    if (diffX > 0) showPage("weekly");

    // Swipe left → IDEAS
    if (diffX < 0) showPage("ideas");

  } else if (currentPage === "ideas") {

    // Swipe right → GOALS
    if (diffX > 0) showPage("monthly");

  }

}, { passive: true });


// TOUCH CANCEL

document.addEventListener("touchcancel", () => {

  swipeTracking = false;
  swipeDirection = null;

}, { passive: true });

// =====================================
// START APP
// =====================================

checkWeekChange();
checkTodayChange();

render();
renderDaily();

const lastPage = localStorage.getItem("plan-last-page") || "weekly";

showPage(lastPage, true);
