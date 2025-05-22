// --- Constants & Global Variables ---
let GRID_DIVISIONS = 10; 
const CELL_SIZE = 35;
const DOT_RADIUS = CELL_SIZE * 0.42;

let CANVAS_WIDTH;
let CANVAS_HEIGHT;
let DRAW_OFFSET = CELL_SIZE / 2;

const ACTION_BUTTON_HEIGHT = CELL_SIZE * 1.25;
const ACTION_BUTTON_WIDTH = CELL_SIZE * 3.8;
const ACTION_BUTTON_PADDING = 12;

let placedStones = [];
let currentPlayer = 1;
let playerNames = { 1: "Player 1", 2: "Player 2" };
let gameOver = false;
let gameOverReason = null;
let highlightedStones = [];
let conicPath = null;
let resetButton;
let inputPlayer1Name, inputPlayer2Name;
let canvasInstance;

let gameState = 'SELECTING_SPOT';
let previewStone = null;
let placementOkButton, placementCancelButton;
let challengeButtonContainerElement;
let challengeButtonImgElement;

let challengeRuleCheckbox;
let challengeRuleActive = false;
let lastPlacedStoneForChallenge = null;
let stoneDisplayImage;
let boardSizeSelectElement;
let gameOptionsContainerElement; // For hiding/showing board size selector
let ruleOptionsContainerElement; // For hiding/showing challenge rule selector

// ------------------------------------
// p5.js Lifecycle Functions
// ------------------------------------
function preload() {
    console.log("Preload: Attempting to load stone image...");
    // ★★★ IMPORTANT: Replace 'stone.png' with YOUR stone image filename.
    // Ensure this image file is in the SAME FOLDER as index.html and sketch.js.
    stoneDisplayImage = loadImage(
        'stone.png', 
        () => {
            console.log("SUCCESS: Stone image ('stone.png' or your specified name) loaded!");
        }, 
        (errEvent) => {
            console.error("ERROR DURING PRELOAD: Failed to load stone image ('stone.png' or your specified name).");
            console.error("1. Ensure the filename in loadImage() EXACTLY matches your actual image file name (CASE-SENSITIVE for web servers like GitHub Pages).");
            console.error("2. Ensure the image file is in the SAME FOLDER as index.html.");
            console.error("3. YOU MUST RUN THIS USING A LOCAL WEB SERVER (e.g., VS Code 'Live Server'). Opening index.html directly as a file (file:///...) WILL CAUSE THIS ERROR.");
            console.error("Actual error event:", errEvent);
            alert("CRITICAL ERROR: Could not load the stone image.\n\n" +
                  "Please check:\n" +
                  "1. Filename in sketch.js (loadImage('YOUR_IMAGE_NAME_HERE')) matches your actual image file name (e.g., 'stone.png').\n" +
                  "2. The image file is in the SAME FOLDER as index.html.\n" +
                  "3. You are running this game using a LOCAL WEB SERVER (e.g., 'Open with Live Server' in VSCode, or 'python -m http.server').\n\n" +
                  "The game board cannot be displayed correctly or at all without the stone image. Check the developer console (F12) for more details.");
        }
    );
    console.log("Preload: Finished image loading attempts.");
}

function setup() {
    console.log("Setup: Started.");

    // 1. Get references to HTML elements first
    boardSizeSelectElement = select('#boardSizeSelect');
    gameOptionsContainerElement = select('#gameOptionsContainer'); // Container for board size
    challengeRuleCheckbox = select('#challengeRuleCheckbox');
    ruleOptionsContainerElement = select('#ruleOptionsContainer'); // Container for challenge rule

    resetButton = select('#resetButton');
    inputPlayer1Name = select('#player1NameInput');
    inputPlayer2Name = select('#player2NameInput');
    challengeButtonContainerElement = select('#challengeButtonContainer');
    challengeButtonImgElement = select('#challengeButtonImg');
    
    // 2. Read initial values and set listeners for controls that affect game reset
    if (boardSizeSelectElement) {
        GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
        boardSizeSelectElement.changed(handleBoardSettingsChange);
        console.log("Setup: Initial GRID_DIVISIONS from select:", GRID_DIVISIONS);
    } else {
        console.error("Setup ERROR: #boardSizeSelect not found. Defaulting GRID_DIVISIONS to 10.");
        GRID_DIVISIONS = 10;
    }

    if (challengeRuleCheckbox) {
        challengeRuleCheckbox.changed(handleBoardSettingsChange);
        challengeRuleActive = challengeRuleCheckbox.checked();
        console.log("Setup: Initial challengeRuleActive:", challengeRuleActive);
    } else {
        console.error("Setup ERROR: Challenge rule checkbox not found.");
    }

    // 3. Calculate initial canvas dimensions (will be done again in resetGame, but good for first create)
    recalculateCanvasDimensionsAndButtonPositions(false); // false means don't resize yet, just calculate

    // 4. Create and parent the canvas
    canvasInstance = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    let canvasContainer = select('#canvas-container');
    if (canvasContainer) {
        canvasInstance.parent('canvas-container');
        console.log("Setup: Canvas created with size", CANVAS_WIDTH, "x", CANVAS_HEIGHT, "and parented.");
    } else {
        console.error("Setup ERROR: #canvas-container div not found! Canvas will be appended to body.");
    }

    // 5. Set up other p5.js settings and attach event listeners
    textFont('Inter, Roboto, sans-serif');
    if(resetButton) resetButton.mousePressed(resetGame); else console.error("Setup ERROR: Reset button event listener NOT attached.");
    if(inputPlayer1Name) inputPlayer1Name.input(updatePlayerNames);
    if(inputPlayer2Name) inputPlayer2Name.input(updatePlayerNames);
    if (challengeButtonImgElement) challengeButtonImgElement.mousePressed(resolveChallenge); else console.error("Setup ERROR: Challenge button img event listener NOT attached.");

    textAlign(CENTER, CENTER);
    imageMode(CENTER);
    
    // Initialize button objects (positions will be set by resetGame via recalculate...)
    placementOkButton = { x: 0, y: 0, w: ACTION_BUTTON_WIDTH, h: ACTION_BUTTON_HEIGHT, label: "Place" };
    placementCancelButton = { x: 0, y: 0, w: ACTION_BUTTON_WIDTH, h: ACTION_BUTTON_HEIGHT, label: "Cancel" };
    
    updatePlayerNames();
    resetGame(); // This will call recalculateCanvasDimensionsAndButtonPositions with resize
    console.log("Setup: Finished successfully. Game should be ready.");
}

function handleBoardSettingsChange() {
    console.log("Board settings changed, resetting game...");
    resetGame(); // resetGame will read the new values from HTML elements
}

function recalculateCanvasDimensionsAndButtonPositions(doResize = true) {
    console.log("Recalculating canvas dimensions and button positions...");
    if (boardSizeSelectElement) {
      GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
    } else {
      GRID_DIVISIONS = 10; 
      if(frameCount > 1) console.warn("Recalculate: boardSizeSelectElement not found, using default GRID_DIVISIONS:", GRID_DIVISIONS);
    }

    CANVAS_WIDTH = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;
    CANVAS_HEIGHT = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;

    if (doResize && canvasInstance && (width !== CANVAS_WIDTH || height !== CANVAS_HEIGHT)) {
        resizeCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        console.log("Canvas resized to:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);
    } else if (doResize && !canvasInstance) {
        console.error("Recalculate ERROR: canvasInstance is not defined! Cannot resize.");
        return; 
    }
    
    const buttonYPos = height - ACTION_BUTTON_HEIGHT - ACTION_BUTTON_PADDING; 
    const totalPlacementButtonWidth = ACTION_BUTTON_WIDTH * 2 + ACTION_BUTTON_PADDING;
    const placementButtonStartX = (width - totalPlacementButtonWidth) / 2; 
    
    if (placementOkButton) {
        placementOkButton.x = placementButtonStartX;
        placementOkButton.y = buttonYPos;
    }
    if (placementCancelButton) {
        placementCancelButton.x = placementButtonStartX + ACTION_BUTTON_WIDTH + ACTION_BUTTON_PADDING;
        placementCancelButton.y = buttonYPos;
    }
    console.log("Button positions recalculated using canvas width:", width, "height:", height);
}

function draw() {
    clear(); 

    push();
    translate(DRAW_OFFSET, DRAW_OFFSET);
    drawGrid();
    if (gameOver && conicPath) drawConicPath();
    drawStones();
    if (gameState === 'CONFIRMING_SPOT' && previewStone) drawPreviewStone();
    pop();

    if (gameState === 'CONFIRMING_SPOT' && previewStone) {
        drawPlacementConfirmButtons();
        if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
    } else if (gameState === 'AWAITING_CHALLENGE' && challengeRuleActive) {
        if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'flex');
    } else {
        if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
    }
    
    updateMessageDisplay();
}

function mousePressed() {
    if (gameOver) return;

    if (gameState === 'CONFIRMING_SPOT' && previewStone) {
        if (isButtonClicked(placementOkButton, mouseX, mouseY)) { handleStonePlacementConfirmed(previewStone); return; }
        if (isButtonClicked(placementCancelButton, mouseX, mouseY)) { previewStone = null; gameState = 'SELECTING_SPOT'; return; }
    }
    
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return; 
    
    let inGridArea = mouseX >= DRAW_OFFSET && mouseX <= CANVAS_WIDTH - DRAW_OFFSET &&
                     mouseY >= DRAW_OFFSET && mouseY <= CANVAS_HEIGHT - DRAW_OFFSET;

    if (inGridArea) {
        let boardMouseX = mouseX - DRAW_OFFSET;
        let boardMouseY = mouseY - DRAW_OFFSET;
        let gridX = Math.round(boardMouseX / CELL_SIZE);
        let gridY = Math.round(boardMouseY / CELL_SIZE);

        if (gridX < 0 || gridX > GRID_DIVISIONS || gridY < 0 || gridY > GRID_DIVISIONS) return;

        if (gameState === 'SELECTING_SPOT' || gameState === 'AWAITING_CHALLENGE') {
            if (!isStoneAt(gridX, gridY)) {
                if (gameState === 'AWAITING_CHALLENGE') lastPlacedStoneForChallenge = null; 
                previewStone = { x: gridX, y: gridY }; gameState = 'CONFIRMING_SPOT';
            }
        } else if (gameState === 'CONFIRMING_SPOT') {
            if (!isStoneAt(gridX, gridY)) previewStone = { x: gridX, y: gridY };
        }
    }
}

// --- Button Drawing & Helper ---
function drawPlacementConfirmButtons() { /* ... (No change from previous full code) ... */ }
function isButtonClicked(button, mx, my) { /* ... (No change from previous full code) ... */ }

// --- Stone Placement and Challenge Logic ---
function handleStonePlacementConfirmed(stoneToPlace) {
    if (gameOptionsContainerElement) gameOptionsContainerElement.style('display', 'none');
    if (ruleOptionsContainerElement) ruleOptionsContainerElement.style('display', 'none'); // Hide challenge rule too

    placedStones.push({...stoneToPlace});
    lastPlacedStoneForChallenge = {...stoneToPlace};
    previewStone = null;
    if (challengeRuleActive) {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        gameState = 'AWAITING_CHALLENGE';
    } else { 
        let concyclicMade = false;
        if (placedStones.length >= 4) {
            const combinations = getCombinations(placedStones, 4);
            for (const combo of combinations) {
                let newStoneInCombo = combo.some(s => s.x === stoneToPlace.x && s.y === stoneToPlace.y);
                if (newStoneInCombo && arePointsConcyclicOrCollinear(combo[0], combo[1], combo[2], combo[3])) {
                    gameOver = true; gameOverReason = 'auto_concyclic_lose'; highlightedStones = [...combo]; prepareConicPathToDraw();
                    currentPlayer = (currentPlayer === 1) ? 2 : 1; 
                    concyclicMade = true; break;
                }
            }
        }
        if (gameOver) gameState = 'GAME_OVER';
        else {
            if (placedStones.length === (GRID_DIVISIONS + 1) * (GRID_DIVISIONS + 1)) {
                gameOver = true; gameOverReason = 'board_full_draw'; gameState = 'GAME_OVER';
            } else {
                currentPlayer = (currentPlayer === 1) ? 2 : 1; gameState = 'SELECTING_SPOT';
            }
        }
    }
}
function resolveChallenge() { /* ... (No change from previous full code) ... */ }

// --- Message Display ---
function updateMessageDisplay() { /* ... (No change, but uses English) ... */ }

// --- Drawing Functions (Grid, Stones, Preview, Conic Path) ---
function drawPreviewStone() { /* ... (No change from previous full code) ... */ }
function drawGrid() { /* ... (Star logic updated in previous full code) ... */ }
function drawStones() { /* ... (Image drawing logic from previous full code) ... */ }
function prepareConicPathToDraw() { /* ... (No change from previous full code) ... */ }
function drawConicPath() { /* ... (No change from previous full code) ... */ }

// --- Game Logic Helper Functions ---
function updatePlayerNames() { /* ... (No change from previous full code) ... */ }
function isStoneAt(x, y) { /* ... (No change from previous full code) ... */ }

function resetGame() {
    console.log("Resetting game...");
    // Read settings from HTML elements
    if (boardSizeSelectElement) GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
    else GRID_DIVISIONS = 10; 
    if (challengeRuleCheckbox) challengeRuleActive = challengeRuleCheckbox.checked(); 
    else challengeRuleActive = false;
    
    recalculateCanvasDimensionsAndButtonPositions(true); // true to actually resize

    placedStones = []; currentPlayer = 1; gameOver = false; gameOverReason = null;
    highlightedStones = []; conicPath = null; previewStone = null;
    lastPlacedStoneForChallenge = null;
    gameState = 'SELECTING_SPOT';
    
    updatePlayerNames(); 
    
    const cpc = currentPlayer === 1 ? '#e06c75' : '#61afef';
    let initialMessage = `Next turn: <strong style="color:${cpc}; font-weight:700;">${playerNames[currentPlayer]}</strong>.<br>Choose a spot to place your stone.`;
    if (challengeRuleActive) initialMessage += `<br><small style="font-size:0.85em; color:#555e68;">(Challenge Rule Enabled)</small>`;
    let msgArea = select('#messageArea');
    if (msgArea) msgArea.html(initialMessage); else console.error("Message area not found for reset.");
    
    if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
    
    // Show game options selectors
    if (gameOptionsContainerElement) gameOptionsContainerElement.style('display', 'flex');
    if (ruleOptionsContainerElement) ruleOptionsContainerElement.style('display', 'flex');

    console.log("Game reset. Board:", GRID_DIVISIONS, "State:", gameState, "Challenge:", challengeRuleActive);
    if (isLooping()) { 
        redraw(); // Request a redraw to reflect changes immediately
    } else { 
        loop(); 
    }
}

// --- Geometric Calculation Functions (These MUST be complete) ---
function areThreePointsCollinear(p1,p2,p3){const a2=p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y);return Math.abs(a2)<1e-7;}
function calculateCircleFrom3Points(p1,p2,p3){if(areThreePointsCollinear(p1,p2,p3))return null;const D=2*(p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y));if(Math.abs(D)<1e-9)return null;const p1s=p1.x*p1.x+p1.y*p1.y;const p2s=p2.x*p2.x+p2.y*p2.y;const p3s=p3.x*p3.x+p3.y*p3.y;const cX=(p1s*(p2.y-p3.y)+p2s*(p3.y-p1.y)+p3s*(p1.y-p2.y))/D;const cY=(p1s*(p3.x-p2.x)+p2s*(p1.x-p3.x)+p3s*(p2.x-p1.x))/D;const r=dist(p1.x,p1.y,cX,cY);if(r<1e-4)return null;return{center:{x:cX,y:cY},radius:r};}
function arePointsConcyclicOrCollinear(p1,p2,p3,p4){const ps=[p1,p2,p3,p4];const m=[];for(const p of ps){m.push([p.x*p.x+p.y*p.y,p.x,p.y,1]);}const d3=(a,b,c,d,e,f,g,h,i)=>a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);let det=0;det+=m[0][0]*d3(m[1][1],m[1][2],m[1][3],m[2][1],m[2][2],m[2][3],m[3][1],m[3][2],m[3][3]);det-=m[0][1]*d3(m[1][0],m[1][2],m[1][3],m[2][0],m[2][2],m[2][3],m[3][0],m[3][2],m[3][3]);det+=m[0][2]*d3(m[1][0],m[1][1],m[1][3],m[2][0],m[2][1],m[2][3],m[3][0],m[3][1],m[3][3]);det-=m[0][3]*d3(m[1][0],m[1][1],m[1][2],m[2][0],m[2][1],m[2][2],m[3][0],m[3][1],m[3][2]);return Math.abs(det)<1e-7;}
function getCombinations(arr,k){if(k<0||k>arr.length)return[];if(k===0)return[[]];if(k===arr.length)return[arr];if(k===1)return arr.map(item=>[item]);const cmb=[];function find(idx,curr){if(curr.length===k){cmb.push([...curr]);return;}if(idx>=arr.length)return;curr.push(arr[idx]);find(idx+1,curr);curr.pop();if(arr.length-(idx+1)>=k-curr.length)find(idx+1,curr);}find(0,[]);return cmb;}
function prepareConicPathToDraw(){if(highlightedStones.length<4){conicPath=null;return}const[p1,p2,p3,p4]=highlightedStones;if(areThreePointsCollinear(p1,p2,p3)&&areThreePointsCollinear(p1,p2,p4)&&areThreePointsCollinear(p1,p3,p4)&&areThreePointsCollinear(p2,p3,p4)){let sS=[...highlightedStones].sort((a,b)=>(a.x!==b.x)?a.x-b.x:a.y-b.y);conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}}}else{let cD=null;const c3=getCombinations(highlightedStones,3);for(const cb of c3){const[c1,c2,c3_]=cb;if(!areThreePointsCollinear(c1,c2,c3_)){cD=calculateCircleFrom3Points(c1,c2,c3_);if(cD){const fP=highlightedStones.find(p=>(p.x!==c1.x||p.y!==c1.y)&&(p.x!==c2.x||p.y!==c2.y)&&(p.x!==c3_.x||p.y!==c3_.y));if(fP){const d=dist(fP.x,fP.y,cD.center.x,cD.center.y);const tol=Math.max(0.01,cD.radius*0.02);if(Math.abs(d-cD.radius)<tol)break}cD=null}}}}if(cD)conicPath={type:"circle",data:cD};else{console.warn("Circle identification failed in prepareConicPathToDraw:",highlightedStones);let sS=[...highlightedStones].sort((a,b)=>(a.x-b.x)||(a.y-b.y));conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}};}}}
function drawConicPath(){if(!conicPath||!conicPath.data)return;push();strokeWeight(3.5);noFill();let pC=color(255,80,50,210);if(conicPath.type==="circle"&&conicPath.data.center&&conicPath.data.radius>0){stroke(pC);ellipseMode(CENTER);ellipse(conicPath.data.center.x*CELL_SIZE,conicPath.data.center.y*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE)}else if(conicPath.type==="line"&&conicPath.data.p_start&&conicPath.data.p_end){stroke(pC);let p1px={x:conicPath.data.p_start.x*CELL_SIZE,y:conicPath.data.p_start.y*CELL_SIZE};let p2px={x:conicPath.data.p_end.x*CELL_SIZE,y:conicPath.data.p_end.y*CELL_SIZE};const minX=0;const maxX=GRID_DIVISIONS*CELL_SIZE;const minY=0;const maxY=GRID_DIVISIONS*CELL_SIZE;let ptsOB=[];if(Math.abs(p1px.x-p2px.x)<1e-6){ptsOB.push({x:p1px.x,y:minY});ptsOB.push({x:p1px.x,y:maxY})}else if(Math.abs(p1px.y-p2px.y)<1e-6){ptsOB.push({x:minX,y:p1px.y});ptsOB.push({x:maxX,y:p1px.y})}else{const sl=(p2px.y-p1px.y)/(p2px.x-p1px.x);const yI=p1px.y-sl*p1px.x;let yAMX=sl*minX+yI;if(yAMX>=minY&&yAMX<=maxY)ptsOB.push({x:minX,y:yAMX});let yAMaX=sl*maxX+yI;if(yAMaX>=minY&&yAMaX<=maxY)ptsOB.push({x:maxX,y:yAMaX});if(Math.abs(sl)>1e-6){let xAMY=(minY-yI)/sl;if(xAMY>=minX&&xAMY<=maxX)ptsOB.push({x:xAMY,y:minY});let xAMaY=(maxY-yI)/sl;if(xAMaY>=minX&&xAMaY<=maxX)ptsOB.push({x:xAMaY,y:maxY})}}let fP1=null,fP2=null,mDSq=-1;if(ptsOB.length>=2){for(let i=0;i<ptsOB.length;i++){for(let j=i+1;j<ptsOB.length;j++){let dSq=sq(ptsOB[i].x-ptsOB[j].x)+sq(ptsOB[i].y-ptsOB[j].y);if(dSq>mDSq){mDSq=dSq;fP1=ptsOB[i];fP2=ptsOB[j];}}}}if(fP1&&fP2)line(fP1.x,fP1.y,fP2.x,fP2.y)}pop()}
