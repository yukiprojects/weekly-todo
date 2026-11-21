
// =====================================
// EDITING DOTS ANIMATION
// =====================================

let ideasEditingTimer = null;

function startIdeasEditingAnimation(label) {
  
  if (ideasEditingTimer) {
    clearInterval(ideasEditingTimer);
  }
  
  label.innerHTML = `
    <span class="editing-text">EDITING</span><span class="editing-dots"></span>
  `;
  
  let dots = 0;
  
  ideasEditingTimer = setInterval(() => {
    
    dots = (dots + 1) % 4;
    
    label.querySelector(".editing-dots").textContent =
      ".".repeat(dots);
    
  }, 450);
}

function stopIdeasEditingAnimation(label) {
  if (ideasEditingTimer) {
    clearInterval(ideasEditingTimer);
    ideasEditingTimer = null;
  }
  
  label.textContent = "EDITING";
}

/* =====================================
   IDEAS
===================================== */

const IDEAS_STORAGE_KEY = "plan-ideas";
const IDEAS_VIEW_KEY = "plan-ideas-view";
const IDEAS_CONNECTIONS_KEY = "plan-ideas-connections";

let ideasNodes = [];
let ideasConnections = [];

let editingIdeaId = null;
let selectedConnectionId = null;
let linkSourceId = null;
let pendingConnection = null;

// Canvas view
let ideasScale = 1;
let ideasPanX = 0;
let ideasPanY = 0;

let ideasEditMode = false;

/* =====================================
   INITIALIZE
===================================== */

function initIdeas() {
  
  const canvas = document.getElementById("ideasCanvas");
  
  if (!canvas) return;
  
  canvas.innerHTML = `

    <div class="ideas-workspace" id="ideasWorkspace">

  <div class="ideas-guide" id="ideasGuide">
    <div class="ideas-guide-icon">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="38"
  height="38"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Bulb -->
  <path d="M9 18h6"/>
  <path d="M10 22h4"/>
  <path d="M15.1 14a6 6 0 1 0-6.2 0c.6.5 1 1.2 1.1 2h4c.1-.8.5-1.5 1.1-2z"/>

  <!-- Five evenly spread light rays -->
  <path d="M12 -3.8V-1.4"/>
  <path d="M2.5 -0.8L4.2 0.9"/>
  <path d="M21.5 -0.8L19.8 0.9"/>
  <path d="M-0.8 7H1.6"/>
  <path d="M24.8 7H22.4"/>
</svg>
</div>

    <div class="ideas-guide-title">GET STARTED</div>

    <div class="ideas-guide-main">
      Tap Edit to start creating your ideas.
    </div>

    <div class="ideas-guide-description">
      Add elements, connect your thoughts,
      and build your own mind map.
    </div>
  </div>

  <div class="ideas-link-message" id="ideasLinkMessage" hidden>
    Select a node to connect
  </div>

  <div class="ideas-world" id="ideasWorld"></div>

</div>

    <div class="ideas-modal" id="ideasModal">
      <div class="ideas-modal-content">

        <h2 id="ideasModalTitle">New Idea</h2>

        <textarea
          id="ideasText"
          placeholder="Write your idea..."
        ></textarea>

        <div class="ideas-shape-options">
          <label>
            <input type="radio" name="ideaShape" value="circle" checked>
            Circle
          </label>

          <label>
            <input type="radio" name="ideaShape" value="square">
            Square
          </label>
        </div>

        <div class="ideas-modal-buttons">
          <button id="saveIdeaButton">Save</button>
          <button id="deleteIdeaButton" style="display:none;">Delete</button>
          <button id="cancelIdeaButton">Cancel</button>
        </div>

      </div>
    </div>

    <div class="ideas-connection-modal" id="ideasConnectionModal">
      <div class="ideas-connection-content">

        <h2 id="ideasConnectionTitle">Connection</h2>

        <div class="ideas-connection-options">
          <button id="lineConnectionButton">Line</button>
          <button id="arrowConnectionButton">Arrow</button>
        </div>

        <div class="ideas-connection-buttons">
          <button id="deleteConnectionButton">Delete</button>
          <button id="cancelConnectionButton">Cancel</button>
        </div>

      </div>
    </div>
  `;
  
  const world = document.getElementById("ideasWorld");
  const workspace = document.getElementById("ideasWorkspace");
  
  world.style.position = "absolute";
  world.style.width = "1px";
  world.style.height = "1px";
  world.style.left = "0";
  world.style.top = "0";
  world.style.transformOrigin = "0 0";
  
  loadIdeas();
  loadIdeasView();
  loadIdeasConnections();
  
  updateIdeasView();
  renderIdeas();
  initIdeasCanvasGestures();
  
// =====================================
// EDIT / DONE MODE
// =====================================

const editButton = document.getElementById("ideasEditButton");
const addButton = document.getElementById("addIdeaButton");
const editingLabel = document.getElementById("ideasEditingLabel");

// Initial mode: Done
ideasEditMode = false;

if (editButton) {
  editButton.textContent = "Edit";
  
  editButton.addEventListener("click", () => {
    
    ideasEditMode = !ideasEditMode;
    
    editButton.textContent = ideasEditMode ? "Done" : "Edit";
    
    workspace.classList.toggle(
      "is-disabled",
      !ideasEditMode
    );
    
    if (addButton) {
      addButton.style.display = ideasEditMode ? "" : "none";
    }
    
    if (editingLabel) {
  editingLabel.style.display = ideasEditMode ? "block" : "none";
  
  if (ideasEditMode) {
    startIdeasEditingAnimation(editingLabel);
  } else {
    stopIdeasEditingAnimation(editingLabel);
  }
}
    
    updateIdeasGuide();
    
  });
}

if (addButton) {
  addButton.style.display = "none";
}

if (editingLabel) {
  editingLabel.style.display = "none";
}

workspace.classList.add("is-disabled");
  
  
  // ADD IDEA
  
  document.getElementById("addIdeaButton").addEventListener("click", () => {
    openIdeaModal();
  });
  
  
  // CANCEL IDEA
  
  document.getElementById("cancelIdeaButton").addEventListener("click", () => {
    closeIdeaModal();
  });
  
  
  // SAVE IDEA
  
  document.getElementById("saveIdeaButton").addEventListener("click", () => {
    saveIdea();
  });
  
  
  // DELETE IDEA
  
  document.getElementById("deleteIdeaButton").addEventListener("click", () => {
    deleteIdea();
  });
  
  
  // CANCEL LINK MODE BY TAPPING BACKGROUND
  
  workspace.addEventListener("click", e => {
    
    if (!linkSourceId) return;
    
    if (
      e.target.closest(".idea-node") ||
      e.target.closest(".idea-connection-hitbox") ||
      e.target.closest(".idea-connection")
    ) {
      return;
    }
    
    cancelLinkMode();
    
  });
  
  
  // SAVE CONNECTION
  
  document.getElementById("lineConnectionButton").addEventListener("click", () => {
    saveConnection("line");
  });
  
  document.getElementById("arrowConnectionButton").addEventListener("click", () => {
    saveConnection("arrow");
  });
  
  
  // CANCEL CONNECTION
  
  document.getElementById("cancelConnectionButton").addEventListener("click", () => {
    closeConnectionModal();
  });
  
  
  // DELETE CONNECTION
  
  document.getElementById("deleteConnectionButton").addEventListener("click", () => {
    deleteConnection();
  });
  
}

/* =====================================
   LOAD / SAVE IDEAS
===================================== */

function loadIdeas() {

  try {
    ideasNodes = JSON.parse(
      localStorage.getItem(IDEAS_STORAGE_KEY)
    ) || [];
  } catch {
    ideasNodes = [];
  }

}

function saveIdeas() {

  localStorage.setItem(
    IDEAS_STORAGE_KEY,
    JSON.stringify(ideasNodes)
  );

}

/* =====================================
   LOAD / SAVE CONNECTIONS
===================================== */

function loadIdeasConnections() {

  try {
    ideasConnections = JSON.parse(
      localStorage.getItem(IDEAS_CONNECTIONS_KEY)
    ) || [];
  } catch {
    ideasConnections = [];
  }

}

function saveIdeasConnections() {

  localStorage.setItem(
    IDEAS_CONNECTIONS_KEY,
    JSON.stringify(ideasConnections)
  );

}

/* =====================================
   CANVAS VIEW LOAD / SAVE
===================================== */

function loadIdeasView() {

  try {

    const saved = JSON.parse(
      localStorage.getItem(IDEAS_VIEW_KEY)
    );

    if (saved) {
      ideasScale = saved.scale || 1;
      ideasPanX = saved.panX || 0;
      ideasPanY = saved.panY || 0;
    }

  } catch {

    ideasScale = 1;
    ideasPanX = 0;
    ideasPanY = 0;

  }

}

function saveIdeasView() {

  localStorage.setItem(
    IDEAS_VIEW_KEY,
    JSON.stringify({
      scale: ideasScale,
      panX: ideasPanX,
      panY: ideasPanY
    })
  );

}

function updateIdeasView() {

  const world = document.getElementById("ideasWorld");

  if (!world) return;

  world.style.transform =
    `translate(${ideasPanX}px, ${ideasPanY}px) scale(${ideasScale})`;

}

/* =====================================
   CANVAS GESTURES
===================================== */

function initIdeasCanvasGestures() {
  
  const workspace = document.getElementById("ideasWorkspace");
  
  if (!workspace) return;
  
  const pointers = new Map();
  
  let gestureMode = null;
  
  // Canvas pan
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  
  // Pinch zoom
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchWorldX = 0;
  let pinchWorldY = 0;
  
  let releaseTimer = null;
  
  
  function setDragging() {
    
    clearTimeout(releaseTimer);
    
    document.body.classList.add("dragging");
    
  }
  
  
  function releaseDragging() {
    
    releaseTimer = setTimeout(() => {
      document.body.classList.remove("dragging");
    }, 100);
    
  }
  
  
  function getDistance(a, b) {
    
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    
    return Math.sqrt(dx * dx + dy * dy);
    
  }
  
  
  function startPan(pointer) {
    
    gestureMode = "pan";
    
    panStartX = pointer.x;
    panStartY = pointer.y;
    
    panOriginX = ideasPanX;
    panOriginY = ideasPanY;
    
  }
  
  
  function startPinch() {
    
    const points = [...pointers.values()];
    
    const a = points[0];
    const b = points[1];
    
    const rect = workspace.getBoundingClientRect();
    
    const centerX = (a.x + b.x) / 2 - rect.left;
    const centerY = (a.y + b.y) / 2 - rect.top;
    
    pinchStartDistance = getDistance(a, b);
    pinchStartScale = ideasScale;
    
    pinchWorldX = (centerX - ideasPanX) / ideasScale;
    pinchWorldY = (centerY - ideasPanY) / ideasScale;
    
    gestureMode = "pinch";
    
  }
  
  
  // POINTER DOWN
  
  workspace.addEventListener("pointerdown", e => {
    
    if (e.button !== 0) return;
    
    if (
      e.target.closest(".idea-connection-hitbox") ||
      e.target.closest(".idea-connection")
    ) {
      return;
    }
    
    e.preventDefault();
    
    if (!e.target.closest(".idea-node")) {
      workspace.setPointerCapture(e.pointerId);
    }
    
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY
    });
    
    setDragging();
    
    if (pointers.size === 1) {
      
      startPan(pointers.get(e.pointerId));
      
    } else if (pointers.size === 2) {
      
      startPinch();
      
    }
    
  });
  
  
  // POINTER MOVE
  
  workspace.addEventListener("pointermove", e => {
    
    if (!pointers.has(e.pointerId)) return;
    
    e.preventDefault();
    
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY
    });
    
    
    // CANVAS PAN
    
    if (gestureMode === "pan" && pointers.size === 1) {
      
      const pointer = pointers.get(e.pointerId);
      
      ideasPanX =
        panOriginX + pointer.x - panStartX;
      
      ideasPanY =
        panOriginY + pointer.y - panStartY;
      
      updateIdeasView();
      
    }
    
    
    // PINCH ZOOM
    
    if (gestureMode === "pinch" && pointers.size >= 2) {
      
      const points = [...pointers.values()];
      
      const distance = getDistance(points[0], points[1]);
      
      if (pinchStartDistance === 0) return;
      
      const newScale =
        pinchStartScale * (distance / pinchStartDistance);
      
      ideasScale = Math.max(
        0.2,
        Math.min(4, newScale)
      );
      
      const rect = workspace.getBoundingClientRect();
      
      const centerX =
        (points[0].x + points[1].x) / 2 - rect.left;
      
      const centerY =
        (points[0].y + points[1].y) / 2 - rect.top;
      
      ideasPanX =
        centerX - pinchWorldX * ideasScale;
      
      ideasPanY =
        centerY - pinchWorldY * ideasScale;
      
      updateIdeasView();
      
    }
    
  });
  
  
  // END GESTURE
  
  function endGesture(e) {
    
    if (!pointers.has(e.pointerId)) return;
    
    pointers.delete(e.pointerId);
    
    if (workspace.hasPointerCapture(e.pointerId)) {
      workspace.releasePointerCapture(e.pointerId);
    }
    
    if (pointers.size === 1) {
      
      const remaining = [...pointers.values()][0];
      
      startPan(remaining);
      
    } else if (pointers.size >= 2) {
      
      startPinch();
      
    } else {
      
      gestureMode = null;
      
      saveIdeasView();
      
      releaseDragging();
      
    }
    
  }
  
  
  workspace.addEventListener("pointerup", endGesture);
  workspace.addEventListener("pointercancel", endGesture);
  
}

/* =====================================
   EMPTY CANVAS GUIDE
===================================== */

function updateIdeasGuide() {
  
  const guide = document.getElementById("ideasGuide");
  
  if (!guide) return;
  
  guide.style.display =
    ideasNodes.length === 0 && !ideasEditMode ?
    "flex" :
    "none";
  
}

/* =====================================
   RENDER
===================================== */

function renderIdeas() {

  const world = document.getElementById("ideasWorld");

  if (!world) return;

  world.innerHTML = "";

  renderIdeaConnections(world);

  ideasNodes.forEach(node => {

    const element = document.createElement("div");

    element.className = `idea-node ${node.shape}`;
    element.textContent = node.text;

    element.style.left = node.x + "px";
    element.style.top = node.y + "px";

    if (linkSourceId === node.id) {
      element.classList.add("link-source");
    }

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    let moved = false;
    let longPressed = false;
    let suppressNextClick = false;
    let pressTimer = null;

    // NODE PRESS START

    element.addEventListener("pointerdown", e => {

      if (e.button !== 0) return;

      if (linkSourceId) return;

      e.preventDefault();

      startX = e.clientX;
      startY = e.clientY;

      startLeft = node.x;
      startTop = node.y;

      moved = false;
      longPressed = false;
      suppressNextClick = false;

      element.setPointerCapture(e.pointerId);

      pressTimer = setTimeout(() => {
        longPressed = true;
      }, 450);

    });

    // NODE MOVE

    element.addEventListener("pointermove", e => {

      if (!element.hasPointerCapture(e.pointerId)) return;

      const diffX = e.clientX - startX;
      const diffY = e.clientY - startY;

      // BEFORE LONG PRESS

      if (!longPressed) {

        if (
          Math.abs(diffX) > 8 ||
          Math.abs(diffY) > 8
        ) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        return;

      }

      // AFTER LONG PRESS

      e.stopPropagation();

      if (Math.abs(diffX) > 3 || Math.abs(diffY) > 3) {

        moved = true;

        document.body.classList.add("dragging");

      }

      if (!moved) return;

      // WORLD COORDINATES

      node.x = startLeft + diffX / ideasScale;
      node.y = startTop + diffY / ideasScale;

      element.style.left = node.x + "px";
      element.style.top = node.y + "px";

      renderIdeaConnections(world);

    });

    // NODE PRESS END

    function endNodePress(e) {

      clearTimeout(pressTimer);

      if (!element.hasPointerCapture(e.pointerId)) return;

      element.releasePointerCapture(e.pointerId);

      if (longPressed && moved) {

        saveIdeas();

        suppressNextClick = true;

      } else if (longPressed && !moved) {

        activateLinkMode(node.id);

        suppressNextClick = true;

      }

      if (moved) {

        setTimeout(() => {
          document.body.classList.remove("dragging");
        }, 100);

      }

    }

    element.addEventListener("pointerup", endNodePress);
    element.addEventListener("pointercancel", endNodePress);

    // NODE TAP

    element.addEventListener("click", () => {

      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      if (linkSourceId) {

        if (linkSourceId === node.id) {
          cancelLinkMode();
          return;
        }

        completeLinkSelection(node.id);
        return;

      }

      openIdeaModal(node.id);

    });

    world.appendChild(element);

  });

updateIdeasGuide();

}

/* =====================================
   RENDER CONNECTIONS
===================================== */

function renderIdeaConnections(world) {

  if (!world) return;

  const oldSvg = world.querySelector(".ideas-connections");

  if (oldSvg) {
    oldSvg.remove();
  }

  const svgNS = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgNS, "svg");

  svg.classList.add("ideas-connections");

  svg.setAttribute("width", "1");
  svg.setAttribute("height", "1");
  svg.setAttribute("viewBox", "0 0 1 1");

  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";

  const defs = document.createElementNS(svgNS, "defs");

  const marker = document.createElementNS(svgNS, "marker");

  marker.setAttribute("id", "ideasArrowHead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const arrow = document.createElementNS(svgNS, "path");

  arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrow.setAttribute("class", "idea-connection-arrow");

  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  ideasConnections.forEach(connection => {

    const from = ideasNodes.find(node => node.id === connection.from);
    const to = ideasNodes.find(node => node.id === connection.to);

    if (!from || !to) return;

    const x1 = from.x;
    const y1 = from.y;

    const x2 = to.x;
    const y2 = to.y;

    // INVISIBLE HIT AREA

    const hitbox = document.createElementNS(svgNS, "line");

    hitbox.setAttribute("x1", x1);
    hitbox.setAttribute("y1", y1);
    hitbox.setAttribute("x2", x2);
    hitbox.setAttribute("y2", y2);

    hitbox.classList.add("idea-connection-hitbox");

    hitbox.addEventListener("click", e => {

      e.stopPropagation();

      openConnectionModal(connection.id);

    });

    svg.appendChild(hitbox);

    // VISIBLE LINE

    const line = document.createElementNS(svgNS, "line");

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);

    line.classList.add("idea-connection");

    if (connection.type === "arrow") {
      line.setAttribute("marker-end", "url(#ideasArrowHead)");
    }

    line.addEventListener("click", e => {

      e.stopPropagation();

      openConnectionModal(connection.id);

    });

    svg.appendChild(line);

  });

  // Keep connections behind nodes.

  world.prepend(svg);

}

/* =====================================
   LINK MODE
===================================== */

function activateLinkMode(id) {

  linkSourceId = id;

  const message = document.getElementById("ideasLinkMessage");

  if (message) {
    message.hidden = false;
  }

  renderIdeas();

}

function cancelLinkMode() {

  linkSourceId = null;

  const message = document.getElementById("ideasLinkMessage");

  if (message) {
    message.hidden = true;
  }

  renderIdeas();

}

/* =====================================
   COMPLETE LINK SELECTION
===================================== */

function completeLinkSelection(targetId) {
  
  if (!linkSourceId) return;
  
  if (linkSourceId === targetId) return;
  
  // Prevent duplicate connections.
  
  const alreadyConnected = ideasConnections.some(connection => {
    
    return (
      (connection.from === linkSourceId && connection.to === targetId) ||
      (connection.from === targetId && connection.to === linkSourceId)
    );
    
  });
  
  if (alreadyConnected) {
    
    linkSourceId = null;
    
    const message = document.getElementById("ideasLinkMessage");
    
    if (message) {
      message.hidden = true;
    }
    
    renderIdeas();
    
    return;
    
  }
  
  
  pendingConnection = {
    from: linkSourceId,
    to: targetId
  };
  
  linkSourceId = null;
  
  const message = document.getElementById("ideasLinkMessage");
  
  if (message) {
    message.hidden = true;
  }
  
  openConnectionModal();
  
}

/* =====================================
   CONNECTION MODAL
===================================== */

function openConnectionModal(id = null) {
  
  if (!ideasEditMode) return;

  selectedConnectionId = id;

  const modal = document.getElementById("ideasConnectionModal");
  const title = document.getElementById("ideasConnectionTitle");
  const deleteButton = document.getElementById("deleteConnectionButton");

  if (id) {

    title.textContent = "Edit Connection";
    deleteButton.style.display = "block";

  } else {

    title.textContent = "New Connection";
    deleteButton.style.display = "none";

  }

  modal.classList.add("active");

}

function closeConnectionModal() {

  document.getElementById("ideasConnectionModal").classList.remove("active");

  selectedConnectionId = null;
  pendingConnection = null;

}

function saveConnection(type) {

  if (selectedConnectionId) {

    const connection = ideasConnections.find(
      item => item.id === selectedConnectionId
    );

    if (!connection) return;

    connection.type = type;

  } else if (pendingConnection) {

    const existing = ideasConnections.find(item => {

      return (
        item.from === pendingConnection.from &&
        item.to === pendingConnection.to
      );

    });

    if (existing) {

      existing.type = type;

    } else {

      ideasConnections.push({
        id: Date.now().toString(),
        from: pendingConnection.from,
        to: pendingConnection.to,
        type: type
      });

    }

  } else {

    return;

  }

  saveIdeasConnections();

  closeConnectionModal();
  renderIdeas();

}

function deleteConnection() {

  if (!selectedConnectionId) return;

  ideasConnections = ideasConnections.filter(
    item => item.id !== selectedConnectionId
  );

  saveIdeasConnections();

  closeConnectionModal();
  renderIdeas();

}

/* =====================================
   OPEN IDEA MODAL
===================================== */

function openIdeaModal(id = null) {
  
  if (!ideasEditMode) return;

  editingIdeaId = id;

  const modal = document.getElementById("ideasModal");
  const title = document.getElementById("ideasModalTitle");
  const textarea = document.getElementById("ideasText");
  const deleteButton = document.getElementById("deleteIdeaButton");

  const circleRadio = document.querySelector(
    'input[name="ideaShape"][value="circle"]'
  );

  const squareRadio = document.querySelector(
    'input[name="ideaShape"][value="square"]'
  );

  if (id) {

    const node = ideasNodes.find(item => item.id === id);

    if (!node) return;

    title.textContent = "Edit Idea";
    textarea.value = node.text;

    circleRadio.checked = node.shape === "circle";
    squareRadio.checked = node.shape === "square";

    deleteButton.style.display = "block";

  } else {

    title.textContent = "New Idea";
    textarea.value = "";

    circleRadio.checked = true;
    squareRadio.checked = false;

    deleteButton.style.display = "none";

  }

  modal.classList.add("active");

  textarea.focus();

}

/* =====================================
   CLOSE IDEA MODAL
===================================== */

function closeIdeaModal() {

  document.getElementById("ideasModal").classList.remove("active");

  editingIdeaId = null;

}

/* =====================================
   SAVE IDEA
===================================== */

function saveIdea() {
  
  const text = document.getElementById("ideasText").value.trim();
  
  if (!text) return;
  
  const shape = document.querySelector(
    'input[name="ideaShape"]:checked'
  ).value;
  
  
  // EDIT EXISTING IDEA
  
  if (editingIdeaId) {
    
    const node = ideasNodes.find(item => item.id === editingIdeaId);
    
    if (!node) return;
    
    node.text = text;
    node.shape = shape;
    
  }
  
  
  // CREATE NEW IDEA
  
  else {
    
    const workspace = document.getElementById("ideasWorkspace");
    
    if (!workspace) return;
    
    // Center of the visible screen in world coordinates.
    
    const centerX =
      (workspace.clientWidth / 2 - ideasPanX) / ideasScale;
    
    const centerY =
      (workspace.clientHeight / 2 - ideasPanY) / ideasScale;
    
    
    // Slightly offset each new node.
    
    const count = ideasNodes.length;
    
    const offsets = [
      { x: 0, y: 0 },
      { x: 180, y: 0 },
      { x: -180, y: 0 },
      { x: 0, y: 180 },
      { x: 0, y: -180 },
      { x: 180, y: 180 },
      { x: -180, y: -180 },
      { x: 180, y: -180 },
      { x: -180, y: 180 }
    ];
    
    const offset = offsets[count % offsets.length];
    
    ideasNodes.push({
      id: Date.now().toString(),
      text: text,
      shape: shape,
      x: centerX + offset.x,
      y: centerY + offset.y
    });
    
  }
  
  
  saveIdeas();
  
  renderIdeas();
  
  closeIdeaModal();
  
}
/* =====================================
   DELETE IDEA
===================================== */

function deleteIdea() {
  
  if (!editingIdeaId) return;
  
  const id = editingIdeaId;
  
  // Delete the idea
  ideasNodes = ideasNodes.filter(node => node.id !== id);
  
  // Delete connections attached to this idea
  ideasConnections = ideasConnections.filter(connection => {
    return connection.from !== id && connection.to !== id;
  });
  
  // Clear link mode if necessary
  if (linkSourceId === id) {
    linkSourceId = null;
    
    const message = document.getElementById("ideasLinkMessage");
    
    if (message) {
      message.hidden = true;
    }
  }
  
  // Clear pending connection if necessary
  if (
    pendingConnection &&
    (pendingConnection.from === id || pendingConnection.to === id)
  ) {
    pendingConnection = null;
  }
  
  saveIdeas();
  saveIdeasConnections();
  
  closeIdeaModal();
  renderIdeas();
  
}

/* =====================================
   START
===================================== */

document.addEventListener("DOMContentLoaded", initIdeas);
