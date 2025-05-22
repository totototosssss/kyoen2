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
let gameOptionsContainerElement;

// ------------------------------------
// p5.js Lifecycle Functions
// ------------------------------------
function preload() {
    console.log("Preload: Attempting to load stone image...");
    // ★★★ IMPORTANT: Replace 'stone.png' with YOUR stone image filename.
    // It MUST be in the SAME FOLDER as index.html and sketch.js.
    stoneDisplayImage = loadImage(
        'stone1.png', // e.g., 'IMG_0161.PNG' if you renamed it to that, or 'my_stone.png'
        () => {
            console.log("SUCCESS: Stone image ('stone1.png' or your specified name) loaded!");
        },
        (errEvent) => {
            console.error("ERROR: Failed to load stone image ('stone1.png' or your specified name).");
            console.error("1. Ensure the filename in loadImage() EXACTLY matches your image file name (CASE-SENSITIVE on web servers).");
            console.error("2. Ensure the image file is in the SAME FOLDER as index.html.");
            console.error("3. YOU MUST RUN THIS USING A LOCAL WEB SERVER (e.g., VS Code 'Live Server'). Opening index.html directly as a file (file:///...) WILL CAUSE THIS ERROR.");
            console.error("Actual error event:", errEvent);
            alert("CRITICAL ERROR: Could not load the stone image.\n\n" +
                  "Please check:\n" +
                  "1. Filename in sketch.js (loadImage('YOUR_IMAGE_NAME_HERE')) matches your actual image file name (e.g., 'stone.png', 'IMG_0161.PNG').\n" +
                  "2. The image file is in the SAME FOLDER as index.html.\n" +
                  "3. You are running this game using a LOCAL WEB SERVER (e.g., 'Open with Live Server' in VSCode, or 'python -m http.server').\n\n" +
                  "The game board cannot be displayed correctly without the stone image.");
        }
    );
    console.log("Preload: Finished image loading attempts.");
}

function setup() {
    console.log("Setup: Started.");

    boardSizeSelectElement = select('#boardSizeSelect');
    gameOptionsContainerElement = select('#gameOptionsContainer');

    if (boardSizeSelectElement) {
        GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
        boardSizeSelectElement.changed(handleBoardSettingsChange);
    } else {
        console.error("Setup ERROR: #boardSizeSelect not found. Defaulting GRID_DIVISIONS to 10.");
        GRID_DIVISIONS = 10;
    }

    recalculateCanvasDimensionsAndButtonPositions(); // Initial calculation

    canvasInstance = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    let canvasContainer = select('#canvas-container');
    if (canvasContainer) {
        canvasInstance.parent('canvas-container');
        console.log("Setup: Canvas created with size", CANVAS_WIDTH, "x", CANVAS_HEIGHT, "and parented.");
    } else {
        console.error("Setup ERROR: #canvas-container div not found! Canvas will be appended to body.");
    }

    textFont('Inter, Roboto, sans-serif');
    
    resetButton = select('#resetButton');
    if(resetButton) resetButton.mousePressed(resetGame); else console.error("Setup ERROR: Reset button not found.");

    inputPlayer1Name = select('#player1NameInput');
    inputPlayer2Name = select('#player2NameInput');
    if(inputPlayer1Name) inputPlayer1Name.input(updatePlayerNames); else console.error("Setup ERROR: Player 1 name input not found.");
    if(inputPlayer2Name) inputPlayer2Name.input(updatePlayerNames); else console.error("Setup ERROR: Player 2 name input not found.");

    challengeRuleCheckbox = select('#challengeRuleCheckbox');
    if(challengeRuleCheckbox) {
        challengeRuleCheckbox.changed(handleBoardSettingsChange);
        challengeRuleActive = challengeRuleCheckbox.checked();
    } else {
        console.error("Setup ERROR: Challenge rule checkbox not found.");
    }

    // Initialize button objects (positions are set in recalculate... and resetGame)
    placementOkButton = { x: 0, y: 0, w: ACTION_BUTTON_WIDTH, h: ACTION_BUTTON_HEIGHT, label: "Place" };
    placementCancelButton = { x: 0, y: 0, w: ACTION_BUTTON_WIDTH, h: ACTION_BUTTON_HEIGHT, label: "Cancel" };
    
    challengeButtonContainerElement = select('#challengeButtonContainer');
    challengeButtonImgElement = select('#challengeButtonImg');
    if (challengeButtonImgElement) {
        challengeButtonImgElement.mousePressed(resolveChallenge);
    } else {
        console.error("Setup ERROR: Challenge button image element ('#challengeButtonImg') not found.");
    }

    textAlign(CENTER, CENTER);
    imageMode(CENTER);
    
    updatePlayerNames();
    resetGame(); 
    console.log("Setup: Finished successfully.");
}

function handleBoardSettingsChange() {
    // This function is called when board size or challenge rule changes
    // It will trigger a game reset, which will read the new settings
    resetGame();
}

function recalculateCanvasDimensionsAndButtonPositions() {
    if (boardSizeSelectElement) { // Ensure this exists before trying to read value
      GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
    } else {
      GRID_DIVISIONS = 10; // Fallback if selector not found
    }

    CANVAS_WIDTH = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;
    CANVAS_HEIGHT = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;
    // DRAW_OFFSET remains CELL_SIZE / 2;

    if (canvasInstance) {
        resizeCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        console.log("Canvas resized to:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);
    }
    
    // p5.js global width/height are updated by resizeCanvas()
    const buttonYPos = height - ACTION_BUTTON_HEIGHT - ACTION_BUTTON_PADDING;
    const totalPlacementButtonWidth = ACTION_BUTTON_WIDTH * 2 + ACTION_BUTTON_PADDING;
    const placementButtonStartX = (width - totalPlacementButtonWidth) / 2;
    
    if (placementOkButton) { // Ensure objects exist before setting properties
        placementOkButton.x = placementButtonStartX;
        placementOkButton.y = buttonYPos;
    }
    if (placementCancelButton) {
        placementCancelButton.x = placementButtonStartX + ACTION_BUTTON_WIDTH + ACTION_BUTTON_PADDING;
        placementCancelButton.y = buttonYPos;
    }
}

function draw() {
    clear(); // Use clear() to make canvas transparent for HTML body background to show

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
function drawPlacementConfirmButtons() {
    fill(76, 175, 80, 235); noStroke();
    rect(placementOkButton.x, placementOkButton.y, placementOkButton.w, placementOkButton.h, 8);
    fill(255); textSize(ACTION_BUTTON_HEIGHT * 0.38); textFont('Inter'); textStyle(BOLD);
    text(placementOkButton.label, placementOkButton.x + placementOkButton.w / 2, placementOkButton.y + placementOkButton.h / 2);

    fill(244, 67, 54, 235); noStroke();
    rect(placementCancelButton.x, placementCancelButton.y, placementCancelButton.w, placementCancelButton.h, 8);
    fill(255); 
    text(placementCancelButton.label, placementCancelButton.x + placementCancelButton.w / 2, placementCancelButton.y + placementCancelButton.h / 2);
    textStyle(NORMAL);
}
function isButtonClicked(button, mx, my) { if (!button) return false; return mx >= button.x && mx <= button.x + button.w && my >= button.y && my <= button.y + button.h; }

// --- Stone Placement and Challenge Logic ---
function handleStonePlacementConfirmed(stoneToPlace) {
    if (gameOptionsContainerElement) gameOptionsContainerElement.style('display', 'none');
    if (challengeRuleCheckbox) {
       let ruleOptionsDiv = select('.rule-options'); // Select by class
       if (ruleOptionsDiv) ruleOptionsDiv.style('display', 'none');
    }

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
function resolveChallenge() {
    if (!lastPlacedStoneForChallenge) { console.warn("Resolve challenge: No target stone."); gameState = 'SELECTING_SPOT'; if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none'); return; }
    let challengeSuccessful = false;
    if (placedStones.length >= 4) {
        const combinations = getCombinations(placedStones, 4);
        for (const combo of combinations) {
            let lastStoneInCombo = combo.some(s => s.x === lastPlacedStoneForChallenge.x && s.y === lastPlacedStoneForChallenge.y);
            if (lastStoneInCombo && arePointsConcyclicOrCollinear(combo[0], combo[1], combo[2], combo[3])) {
                challengeSuccessful = true; highlightedStones = [...combo]; prepareConicPathToDraw(); break;
            }
        }
    }
    gameOver = true; gameState = 'GAME_OVER';
    if (challengeSuccessful) { gameOverReason = 'challenge_won'; }
    else { gameOverReason = 'challenge_failed'; currentPlayer = (currentPlayer === 1) ? 2 : 1; }
    lastPlacedStoneForChallenge = null;
    if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
}

// --- Message Display ---
function updateMessageDisplay() {
    let titleHtml = ""; let detailHtml = "";
    if (gameOver) {
        const winnerName = playerNames[currentPlayer]; 
        const loserNum = (currentPlayer === 1) ? 2 : 1;
        const loserName = playerNames[loserNum];
        switch (gameOverReason) {
            case 'auto_concyclic_lose': titleHtml = `<strong style="font-size:1.6em;color:#e74c3c;display:block;margin-bottom:4px;">Concentric Set!</strong>`; detailHtml = `${loserName} formed a concentric set.<br><strong style="font-size:1.3em;color:#27ae60;">${winnerName} wins!</strong>`; break;
            case 'challenge_won': titleHtml = `<strong style="font-size:1.6em;color:#27ae60;display:block;margin-bottom:4px;">Challenge Successful!</strong>`; detailHtml = `${winnerName}'s challenge was correct.<br><strong style="font-size:1.3em;color:#27ae60;">${winnerName} wins!</strong>`; break;
            case 'challenge_failed': titleHtml = `<strong style="font-size:1.6em;color:#e74c3c;display:block;margin-bottom:4px;">Challenge Failed!</strong>`; detailHtml = `${loserName}'s challenge was incorrect.<br><strong style="font-size:1.3em;color:#27ae60;">${winnerName} wins!</strong>`; break;
            case 'board_full_draw': titleHtml = `<strong style="font-size:1.6em;display:block;margin-bottom:4px;">Draw</strong>`; detailHtml = `<span style="font-size:1.1em;">All spaces are filled.</span>`; break;
            default: titleHtml = `<strong style="font-size:1.6em;display:block;margin-bottom:4px;">Game Over</strong>`; detailHtml = `<span style="font-size:1.1em;">Result undetermined.</span>`;
        }
    } else if (gameState === 'CONFIRMING_SPOT' && previewStone) {
        const tpN = playerNames[currentPlayer]; const tpC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `Place stone here?<br><strong style="color:${tpC};font-weight:700;">${tpN}</strong>, confirm placement?`;
    } else if (gameState === 'AWAITING_CHALLENGE' && challengeRuleActive) {
        const chN = playerNames[currentPlayer]; const plN = playerNames[(currentPlayer === 1) ? 2 : 1]; const chC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `${plN} placed a stone.<br><strong style="color:${chC};font-weight:700;">${chN}</strong>, challenge this move?<br><small>(Or click board to place your stone)</small>`;
    } else { // SELECTING_SPOT
        const cpC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `Next turn: <strong style="color:${cpC};font-weight:700;">${playerNames[currentPlayer]}</strong>.<br>Choose a spot to place your stone.`;
    }
    let msgArea = select('#messageArea');
    if (msgArea) msgArea.html(titleHtml + detailHtml); else console.error("Message area not found.");
}

// --- Drawing Functions (Grid, Stones, Preview, Conic Path) ---
function drawPreviewStone() {
    if (!previewStone) return;
    if (!stoneDisplayImage || stoneDisplayImage.width === 0) {
        fill(100,100,100,100); noStroke(); ellipse(previewStone.x*CELL_SIZE,previewStone.y*CELL_SIZE,DOT_RADIUS*2,DOT_RADIUS*2); return;
    }
    const sX=previewStone.x*CELL_SIZE; const sY=previewStone.y*CELL_SIZE; const sZ=DOT_RADIUS*2;
    push(); tint(255,130); image(stoneDisplayImage,sX,sY,sZ,sZ); pop();
}
function drawGrid() {
    stroke(205,210,220); strokeWeight(1.5);
    for(let i=0;i<=GRID_DIVISIONS;i++){
        line(i*CELL_SIZE,0,i*CELL_SIZE,GRID_DIVISIONS*CELL_SIZE);
        line(0,i*CELL_SIZE,GRID_DIVISIONS*CELL_SIZE,i*CELL_SIZE);
    }
    if (GRID_DIVISIONS >= 8) {
        let starPoints = []; const q=Math.round(GRID_DIVISIONS/4); const tq=GRID_DIVISIONS-q; const c=Math.round(GRID_DIVISIONS/2);
        starPoints.push({x:q,y:q},{x:tq,y:q},{x:q,y:tq},{x:tq,y:tq});
        if(GRID_DIVISIONS%2===0 && GRID_DIVISIONS !==0)starPoints.push({x:c,y:c});
        if(GRID_DIVISIONS>=12)starPoints.push({x:q,y:c},{x:tq,y:c},{x:c,y:q},{x:c,y:tq});
        starPoints=starPoints.filter((point,index,self)=>index===self.findIndex((p)=>(p.x===point.x&&p.y===point.y)));
        fill(180,185,195);noStroke();
        for(const p of starPoints)ellipse(p.x*CELL_SIZE,p.y*CELL_SIZE,DOT_RADIUS*0.25,DOT_RADIUS*0.25);
    }
}
function drawStones() {
    if (!stoneDisplayImage || stoneDisplayImage.width === 0) {
        if (placedStones.length > 0 && frameCount % 180 === 0) console.warn("Stone image not loaded. Drawing fallback ellipses."); // Log less frequently
        for (const stone of placedStones) { fill(50); noStroke(); ellipse(stone.x*CELL_SIZE,stone.y*CELL_SIZE,DOT_RADIUS*2,DOT_RADIUS*2); }
        return;
    }
    for (const stone of placedStones) {
        const sX=stone.x*CELL_SIZE; const sY=stone.y*CELL_SIZE; const sZ=DOT_RADIUS*2;
        push(); translate(sX+2,sY+2); tint(0,30); image(stoneDisplayImage,0,0,sZ,sZ); pop();
        push(); noTint(); image(stoneDisplayImage,sX,sY,sZ,sZ); pop();
        if(gameOver&&highlightedStones.some(hS=>hS.x===stone.x&&hS.y===s.y)){stroke(255,210,0,230);strokeWeight(3.5);noFill();ellipse(sX,sY,sZ*1.08,sZ*1.08);noStroke();}
    }
}

// --- Game Logic Helper Functions ---
function updatePlayerNames() {
    if(inputPlayer1Name) playerNames[1]=inputPlayer1Name.value().trim()||"Player 1"; else playerNames[1]="Player 1";
    if(playerNames[1]==="")playerNames[1]="Player 1";
    if(inputPlayer2Name) playerNames[2]=inputPlayer2Name.value().trim()||"Player 2"; else playerNames[2]="Player 2";
    if(playerNames[2]==="")playerNames[2]="Player 2";
}
function isStoneAt(x, y) { return placedStones.some(s => s.x === x && s.y === y); }
function resetGame() {
    console.log("Resetting game...");
    if (boardSizeSelectElement) GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
    else GRID_DIVISIONS = 10;
    
    recalculateCanvasDimensionsAndButtonPositions();

    placedStones = []; currentPlayer = 1; gameOver = false; gameOverReason = null;
    highlightedStones = []; conicPath = null; previewStone = null;
    lastPlacedStoneForChallenge = null;
    if (challengeRuleCheckbox) challengeRuleActive = challengeRuleCheckbox.checked(); 
    else challengeRuleActive = false; // Default if checkbox not found
    
    gameState = 'SELECTING_SPOT';
    updatePlayerNames();
    
    const cpc = currentPlayer === 1 ? '#e06c75' : '#61afef';
    let initialMessage = `Next turn: <strong style="color:${cpc}; font-weight:700;">${playerNames[currentPlayer]}</strong>.<br>Choose a spot to place your stone.`;
    if (challengeRuleActive) initialMessage += `<br><small style="font-size:0.85em; color:#555e68;">(Challenge Rule Enabled)</small>`;
    let msgArea = select('#messageArea');
    if (msgArea) msgArea.html(initialMessage); else console.error("Message area not found for reset.");
    
    if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
    if (gameOptionsContainerElement) gameOptionsContainerElement.style('display', 'flex'); // Show options
    let ruleOptionsDiv = select('.rule-options');
    if (ruleOptionsDiv) ruleOptionsDiv.style('display', 'flex'); // Show options


    console.log("Game reset. Board:", GRID_DIVISIONS, "State:", gameState, "Challenge:", challengeRuleActive);
    if (isLooping()) { redraw(); } else { loop(); }
}

// --- Geometric Calculation Functions ---
function areThreePointsCollinear(p1,p2,p3){const a2=p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y);return Math.abs(a2)<1e-7;}
function calculateCircleFrom3Points(p1,p2,p3){if(areThreePointsCollinear(p1,p2,p3))return null;const D=2*(p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y));if(Math.abs(D)<1e-9)return null;const p1s=p1.x*p1.x+p1.y*p1.y;const p2s=p2.x*p2.x+p2.y*p2.y;const p3s=p3.x*p3.x+p3.y*p3.y;const cX=(p1s*(p2.y-p3.y)+p2s*(p3.y-p1.y)+p3s*(p1.y-p2.y))/D;const cY=(p1s*(p3.x-p2.x)+p2s*(p1.x-p3.x)+p3s*(p2.x-p1.x))/D;const r=dist(p1.x,p1.y,cX,cY);if(r<1e-4)return null;return{center:{x:cX,y:cY},radius:r};}
function arePointsConcyclicOrCollinear(p1,p2,p3,p4){const ps=[p1,p2,p3,p4];const m=[];for(const p of ps){m.push([p.x*p.x+p.y*p.y,p.x,p.y,1]);}const d3=(a,b,c,d,e,f,g,h,i)=>a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);let det=0;det+=m[0][0]*d3(m[1][1],m[1][2],m[1][3],m[2][1],m[2][2],m[2][3],m[3][1],m[3][2],m[3][3]);det-=m[0][1]*d3(m[1][0],m[1][2],m[1][3],m[2][0],m[2][2],m[2][3],m[3][0],m[3][2],m[3][3]);det+=m[0][2]*d3(m[1][0],m[1][1],m[1][3],m[2][0],m[2][1],m[2][3],m[3][0],m[3][1],m[3][3]);det-=m[0][3]*d3(m[1][0],m[1][1],m[1][2],m[2][0],m[2][1],m[2][2],m[3][0],m[3][1],m[3][2]);return Math.abs(det)<1e-7;}
function getCombinations(arr,k){if(k<0||k>arr.length)return[];if(k===0)return[[]];if(k===arr.length)return[arr];if(k===1)return arr.map(item=>[item]);const cmb=[];function find(idx,curr){if(curr.length===k){cmb.push([...curr]);return;}if(idx>=arr.length)return;curr.push(arr[idx]);find(idx+1,curr);curr.pop();if(arr.length-(idx+1)>=k-curr.length)find(idx+1,curr);}find(0,[]);return cmb;}
function prepareConicPathToDraw(){if(highlightedStones.length<4){conicPath=null;return}const[p1,p2,p3,p4]=highlightedStones;if(areThreePointsCollinear(p1,p2,p3)&&areThreePointsCollinear(p1,p2,p4)&&areThreePointsCollinear(p1,p3,p4)&&areThreePointsCollinear(p2,p3,p4)){let sS=[...highlightedStones].sort((a,b)=>(a.x!==b.x)?a.x-b.x:a.y-b.y);conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}}}else{let cD=null;const c3=getCombinations(highlightedStones,3);for(const cb of c3){const[c1,c2,c3_]=cb;if(!areThreePointsCollinear(c1,c2,c3_)){cD=calculateCircleFrom3Points(c1,c2,c3_);if(cD){const fP=highlightedStones.find(p=>(p.x!==c1.x||p.y!==c1.y)&&(p.x!==c2.x||p.y!==c2.y)&&(p.x!==c3_.x||p.y!==c3_.y));if(fP){const d=dist(fP.x,fP.y,cD.center.x,cD.center.y);const tol=Math.max(0.01,cD.radius*0.02);if(Math.abs(d-cD.radius)<tol)break}cD=null}}}}if(cD)conicPath={type:"circle",data:cD};else{console.warn("Circle identification failed in prepareConicPathToDraw:",highlightedStones);let sS=[...highlightedStones].sort((a,b)=>(a.x-b.x)||(a.y-b.y));conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}};}}}
function drawConicPath(){if(!conicPath||!conicPath.data)return;push();strokeWeight(3.5);noFill();let pC=color(255,80,50,210);if(conicPath.type==="circle"&&conicPath.data.center&&conicPath.data.radius>0){stroke(pC);ellipseMode(CENTER);ellipse(conicPath.data.center.x*CELL_SIZE,conicPath.data.center.y*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE)}else if(conicPath.type==="line"&&conicPath.data.p_start&&conicPath.data.p_end){stroke(pC);let p1px={x:conicPath.data.p_start.x*CELL_SIZE,y:conicPath.data.p_start.y*CELL_SIZE};let p2px={x:conicPath.data.p_end.x*CELL_SIZE,y:conicPath.data.p_end.y*CELL_SIZE};const minX=0;const maxX=GRID_DIVISIONS*CELL_SIZE;const minY=0;const maxY=GRID_DIVISIONS*CELL_SIZE;let ptsOB=[];if(Math.abs(p1px.x-p2px.x)<1e-6){ptsOB.push({x:p1px.x,y:minY});ptsOB.push({x:p1px.x,y:maxY})}else if(Math.abs(p1px.y-p2px.y)<1e-6){ptsOB.push({x:minX,y:p1px.y});ptsOB.push({x:maxX,y:p1px.y})}else{const sl=(p2px.y-p1px.y)/(p2px.x-p1px.x);const yI=p1px.y-sl*p1px.x;let yAMX=sl*minX+yI;if(yAMX>=minY&&yAMX<=maxY)ptsOB.push({x:minX,y:yAMX});let yAMaX=sl*maxX+yI;if(yAMaX>=minY&&yAMaX<=maxY)ptsOB.push({x:maxX,y:yAMaX});if(Math.abs(sl)>1e-6){let xAMY=(minY-yI)/sl;if(xAMY>=minX&&xAMY<=maxX)ptsOB.push({x:xAMY,y:minY});let xAMaY=(maxY-yI)/sl;if(xAMaY>=minX&&xAMaY<=maxX)ptsOB.push({x:xAMaY,y:maxY})}}let fP1=null,fP2=null,mDSq=-1;if(ptsOB.length>=2){for(let i=0;i<ptsOB.length;i++){for(let j=i+1;j<ptsOB.length;j++){let dSq=sq(ptsOB[i].x-ptsOB[j].x)+sq(ptsOB[i].y-ptsOB[j].y);if(dSq>mDSq){mDSq=dSq;fP1=ptsOB[i];fP2=ptsOB[j];}}}}if(fP1&&fP2)line(fP1.x,fP1.y,fP2.x,fP2.y)}pop()}
