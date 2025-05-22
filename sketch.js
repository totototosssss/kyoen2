// --- Constants & Global Variables ---
let GRID_DIVISIONS = 10; 
const CELL_SIZE = 35;
const DOT_RADIUS = CELL_SIZE * 0.4;

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
let ruleOptionsContainerElement;
let allAssetsLoadedSuccessfully = false;

// ------------------------------------
// p5.js Lifecycle Functions
// ------------------------------------
function preload() {
    console.log("Preload: Initiated.");
    stoneDisplayImage = loadImage(
        'stone1.png', 
        () => {
            console.log("SUCCESS: Stone image ('stone1.png') loaded successfully!");
            allAssetsLoadedSuccessfully = true;
        }, 
        (errEvent) => {
            console.error("ERROR DURING PRELOAD: Failed to load stone image ('stone1.png').");
            console.error("1. Ensure filename in loadImage() EXACTLY matches 'stone1.png' (CASE-SENSITIVE).");
            console.error("2. Ensure 'stone1.png' is in the SAME FOLDER as index.html.");
            console.error("3. YOU MUST RUN THIS USING A LOCAL WEB SERVER.");
            console.error("Actual error event:", errEvent);
            allAssetsLoadedSuccessfully = false;
            alert("CRITICAL ERROR: Could not load 'stone1.png'.\n\n" +
                  "Please check:\n" +
                  "1. Filename 'stone1.png' is correct and file exists in same folder as index.html.\n" +
                  "2. You are using a LOCAL WEB SERVER (e.g., VS Code 'Live Server').\n\n" +
                  "Board may not display. Check console (F12).");
        }
    );
    console.log("Preload: Finished image loading attempts. Asset status:", allAssetsLoadedSuccessfully);
}

function setup() {
    console.log("Setup: Started. Asset loaded status from preload:", allAssetsLoadedSuccessfully);
    if (!allAssetsLoadedSuccessfully) {
        console.error("SETUP HALTED: Critical assets (stone image) failed to load in preload(). Cannot proceed.");
        let bodyNode = document.body;
        if (bodyNode && !document.getElementById('p5_error_message')) {
            let errorDiv = document.createElement('div');
            errorDiv.id = 'p5_error_message';
            errorDiv.innerHTML = '<h2 style="color:red; text-align:center; margin-top: 50px;">FATAL ERROR: Game assets failed to load.</h2><p style="text-align:center;">Please check the browser console (F12) for details. Ensure you are running the game via a local web server and all image files are correctly named and placed.</p>';
            if (bodyNode.firstChild) {
                bodyNode.insertBefore(errorDiv, bodyNode.firstChild);
            } else {
                bodyNode.appendChild(errorDiv);
            }
        }
        noLoop(); 
        return; 
    }
    console.log("Setup: Assets loaded. Proceeding...");

    boardSizeSelectElement = select('#boardSizeSelect');
    gameOptionsContainerElement = select('#gameOptionsContainer');
    challengeRuleCheckbox = select('#challengeRuleCheckbox');
    ruleOptionsContainerElement = select('#ruleOptionsContainer'); 
    resetButton = select('#resetButton');
    inputPlayer1Name = select('#player1NameInput');
    inputPlayer2Name = select('#player2NameInput');
    challengeButtonContainerElement = select('#challengeButtonContainer');
    challengeButtonImgElement = select('#challengeButtonImg');
    
    if (boardSizeSelectElement) {
        GRID_DIVISIONS = parseInt(boardSizeSelectElement.value());
        boardSizeSelectElement.changed(handleBoardSettingsChange);
    } else { GRID_DIVISIONS = 10; console.error("Setup: #boardSizeSelect not found."); }

    if (challengeRuleCheckbox) {
        challengeRuleCheckbox.changed(handleBoardSettingsChange);
        challengeRuleActive = challengeRuleCheckbox.checked();
    } else { console.error("Setup: Challenge rule checkbox not found."); }

    recalculateCanvasDimensionsAndButtonPositions(false); 

    canvasInstance = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    let canvasContainer = select('#canvas-container');
    if (canvasContainer) canvasInstance.parent('canvas-container');
    else console.error("Setup: #canvas-container div not found!");

    textFont('Inter, Roboto, sans-serif');
    if(resetButton) resetButton.mousePressed(resetGame); else console.error("Setup: Reset button not found.");
    if(inputPlayer1Name) inputPlayer1Name.input(updatePlayerNames);
    if(inputPlayer2Name) inputPlayer2Name.input(updatePlayerNames);
    if (challengeButtonImgElement) challengeButtonImgElement.mousePressed(resolveChallenge); else console.error("Setup: Challenge Img not found.");

    textAlign(CENTER, CENTER); imageMode(CENTER);
    
    placementOkButton = { x:0,y:0,w:ACTION_BUTTON_WIDTH,h:ACTION_BUTTON_HEIGHT,label:"Place" };
    placementCancelButton = { x:0,y:0,w:ACTION_BUTTON_WIDTH,h:ACTION_BUTTON_HEIGHT,label:"Cancel" };
    
    updatePlayerNames();
    resetGame(); 
    console.log("Setup: Finished successfully.");
}

function handleBoardSettingsChange() {
    console.log("Board settings changed by user input.");
    resetGame(); 
}

function recalculateCanvasDimensionsAndButtonPositions(doResize = true) {
    console.log("Recalculating canvas dimensions and button positions. Current GRID_DIVISIONS setting:", boardSizeSelectElement ? boardSizeSelectElement.value() : "selector_not_found");
    if (boardSizeSelectElement) {
      let selectedVal = parseInt(boardSizeSelectElement.value());
      if (!isNaN(selectedVal)) { 
          GRID_DIVISIONS = selectedVal;
      } else {
          GRID_DIVISIONS = 10; 
          console.warn("Invalid value from boardSizeSelectElement, defaulting GRID_DIVISIONS to 10.");
      }
    } else {
      GRID_DIVISIONS = 10; 
      if(frameCount > 1 || !canvasInstance) console.warn("Recalculate: boardSizeSelectElement not found, using default GRID_DIVISIONS:", GRID_DIVISIONS);
    }

    CANVAS_WIDTH = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;
    CANVAS_HEIGHT = GRID_DIVISIONS * CELL_SIZE + CELL_SIZE;
    DRAW_OFFSET = CELL_SIZE / 2;

    if (doResize && canvasInstance) {
        if (width !== CANVAS_WIDTH || height !== CANVAS_HEIGHT) { 
            resizeCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            console.log("Canvas resized to:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);
        }
    } else if (doResize && !canvasInstance) { 
        console.error("Recalculate ERROR: canvasInstance is not defined! Cannot resize.");
        return; 
    }
    
    const buttonYPos = height - ACTION_BUTTON_HEIGHT - ACTION_BUTTON_PADDING; 
    const totalPlacementButtonWidth = ACTION_BUTTON_WIDTH * 2 + ACTION_BUTTON_PADDING;
    const placementButtonStartX = (width - totalPlacementButtonWidth) / 2; 
    
    if (placementOkButton) { placementOkButton.x = placementButtonStartX; placementOkButton.y = buttonYPos; }
    if (placementCancelButton) { placementCancelButton.x = placementButtonStartX + ACTION_BUTTON_WIDTH + ACTION_BUTTON_PADDING; placementCancelButton.y = buttonYPos; }
} 

function draw() {
    if (!allAssetsLoadedSuccessfully) {
      background(220); 
      fill(255,0,0,255); textAlign(CENTER,CENTER); textSize(14);
      text("ERROR: Assets failed to load. Please check console (F12).", width/2, height/2 - 10);
      text("Ensure you are using a local server and image paths are correct.", width/2, height/2 + 10);
      return;
    }
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
    if (gameOver || !allAssetsLoadedSuccessfully) return;
    if (gameState === 'CONFIRMING_SPOT' && previewStone) {
        if (isButtonClicked(placementOkButton, mouseX, mouseY)) { handleStonePlacementConfirmed(previewStone); return; }
        if (isButtonClicked(placementCancelButton, mouseX, mouseY)) { previewStone = null; gameState = 'SELECTING_SPOT'; return; }
    }
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return; 
    let inGrid = mouseX >= DRAW_OFFSET && mouseX <= CANVAS_WIDTH - DRAW_OFFSET && mouseY >= DRAW_OFFSET && mouseY <= CANVAS_HEIGHT - DRAW_OFFSET;
    if (inGrid) {
        let bX = mouseX - DRAW_OFFSET; let bY = mouseY - DRAW_OFFSET;
        let gX = Math.round(bX / CELL_SIZE); let gY = Math.round(bY / CELL_SIZE);
        if (gX < 0 || gX > GRID_DIVISIONS || gY < 0 || gY > GRID_DIVISIONS) return;
        if (gameState === 'SELECTING_SPOT' || gameState === 'AWAITING_CHALLENGE') {
            if (!isStoneAt(gX, gY)) { if (gameState === 'AWAITING_CHALLENGE') lastPlacedStoneForChallenge = null; previewStone = { x: gX, y: gY }; gameState = 'CONFIRMING_SPOT'; }
        } else if (gameState === 'CONFIRMING_SPOT') { if (!isStoneAt(gX, gY)) previewStone = { x: gX, y: gY }; }
    }
}

function drawPlacementConfirmButtons() {
    fill(76, 175, 80, 235); noStroke(); rect(placementOkButton.x, placementOkButton.y, placementOkButton.w, placementOkButton.h, 8);
    fill(255); textSize(ACTION_BUTTON_HEIGHT * 0.38); textFont('Inter'); textStyle(BOLD); text(placementOkButton.label, placementOkButton.x + placementOkButton.w / 2, placementOkButton.y + placementOkButton.h / 2);
    fill(244, 67, 54, 235); noStroke(); rect(placementCancelButton.x, placementCancelButton.y, placementCancelButton.w, placementCancelButton.h, 8);
    fill(255); text(placementCancelButton.label, placementCancelButton.x + placementCancelButton.w / 2, placementCancelButton.y + placementCancelButton.h / 2); textStyle(NORMAL);
}
function isButtonClicked(button, mx, my) { if (!button) return false; return mx >= button.x && mx <= button.x + button.w && my >= button.y && my <= button.y + button.h; }

// sketch.js の handleStonePlacementConfirmed 関数

function handleStonePlacementConfirmed(stoneToPlace) {
    if (gameOptionsContainerElement) gameOptionsContainerElement.style('display', 'none');
    if (ruleOptionsContainerElement) ruleOptionsContainerElement.style('display', 'none');

    placedStones.push({...stoneToPlace}); // 石を盤に追加
    lastPlacedStoneForChallenge = {...stoneToPlace}; // チャレンジルール用に最後に置かれた石を更新
    previewStone = null; // プレビューをクリア

    if (challengeRuleActive) {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        gameState = 'AWAITING_CHALLENGE';
    } else { 
        // チャレンジルール無効（自動判定モード）の場合
        let concyclicMade = false;
        if (placedStones.length >= 4) { // 盤上に最低4つの石が必要

            // --- ▼▼▼ ここからが変更部分 ▼▼▼ ---
            // stoneToPlace (新しく置かれた石) 以外の石のリストを作成
            const otherStones = placedStones.filter(
                s => !(s.x === stoneToPlace.x && s.y === stoneToPlace.y)
            );

            if (otherStones.length >= 3) { // 他に最低3つの石が必要
                const combinationsOf3FromOthers = getCombinations(otherStones, 3);
                for (const combo3 of combinationsOf3FromOthers) {
                    // 新しい石と、他の3つの石で4つの組み合わせを作る
                    const current4StoneCombo = [stoneToPlace, combo3[0], combo3[1], combo3[2]];
                    if (arePointsConcyclicOrCollinear(current4StoneCombo[0], current4StoneCombo[1], current4StoneCombo[2], current4StoneCombo[3])) {
                        gameOver = true;
                        gameOverReason = 'auto_concyclic_lose';
                        highlightedStones = [...current4StoneCombo];
                        prepareConicPathToDraw();
                        currentPlayer = (currentPlayer === 1) ? 2 : 1; // 勝者は相手プレイヤー
                        concyclicMade = true;
                        console.log("Auto-detected concyclic set with new stone:", current4StoneCombo);
                        break; // 共円が見つかったのでループを抜ける
                    }
                }
            }
            // --- ▲▲▲ ここまでが変更部分 ▲▲▲ ---
        }

        if (gameOver) { // 共円ができて負けた場合
            gameState = 'GAME_OVER';
        } else { // 共円なし
            if (placedStones.length === (GRID_DIVISIONS + 1) * (GRID_DIVISIONS + 1)) {
                gameOver = true;
                gameOverReason = 'board_full_draw';
                gameState = 'GAME_OVER';
            } else {
                currentPlayer = (currentPlayer === 1) ? 2 : 1; // 通常の手番交代
                gameState = 'SELECTING_SPOT';
            }
        }
    }
}

function resolveChallenge() {
    if (!lastPlacedStoneForChallenge) { gameState = 'SELECTING_SPOT'; if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none'); return; }
    let challengeSuccessful = false;
    if (placedStones.length >= 4) {
        const combinations = getCombinations(placedStones, 4);
        for (const combo of combinations) {
            if (combo.some(s => s.x === lastPlacedStoneForChallenge.x && s.y === lastPlacedStoneForChallenge.y) && arePointsConcyclicOrCollinear(combo[0], combo[1], combo[2], combo[3])) {
                challengeSuccessful = true; highlightedStones = [...combo]; prepareConicPathToDraw(); break;
            }
        }
    }
    gameOver = true; gameState = 'GAME_OVER';
    if (challengeSuccessful) gameOverReason = 'challenge_won'; else { gameOverReason = 'challenge_failed'; currentPlayer = (currentPlayer === 1) ? 2 : 1; }
    lastPlacedStoneForChallenge = null; if (challengeButtonContainerElement) challengeButtonContainerElement.style('display', 'none');
}

function updateMessageDisplay() {
    let titleHtml = ""; let detailHtml = "";
    if (gameOver) {
        const winner = playerNames[currentPlayer]; const loser = playerNames[(currentPlayer === 1)?2:1];
        switch (gameOverReason) {
            case 'auto_concyclic_lose': titleHtml = `<strong style="font-size:1.6em;color:#e74c3c;display:block;margin-bottom:4px;">Concentric Set!</strong>`; detailHtml = `${loser} formed a concentric set.<br><strong style="font-size:1.3em;color:#27ae60;">${winner} wins!</strong>`; break;
            case 'challenge_won': titleHtml = `<strong style="font-size:1.6em;color:#27ae60;display:block;margin-bottom:4px;">Challenge Successful!</strong>`; detailHtml = `${winner}'s challenge was correct.<br><strong style="font-size:1.3em;color:#27ae60;">${winner} wins!</strong>`; break;
            case 'challenge_failed': titleHtml = `<strong style="font-size:1.6em;color:#e74c3c;display:block;margin-bottom:4px;">Challenge Failed!</strong>`; detailHtml = `${loser}'s challenge was incorrect.<br><strong style="font-size:1.3em;color:#27ae60;">${winner} wins!</strong>`; break;
            case 'board_full_draw': titleHtml = `<strong style="font-size:1.6em;display:block;margin-bottom:4px;">Draw</strong>`; detailHtml = `<span style="font-size:1.1em;">All spaces are filled.</span>`; break;
            default: titleHtml = `<strong style="font-size:1.6em;display:block;margin-bottom:4px;">Game Over</strong>`; detailHtml = `<span style="font-size:1.1em;">Result undetermined.</span>`;
        }
    } else if (gameState === 'CONFIRMING_SPOT' && previewStone) {
        const tpN = playerNames[currentPlayer]; const tpC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `Place stone here?<br><strong style="color:${tpC};font-weight:700;">${tpN}</strong>, confirm placement?`;
    } else if (gameState === 'AWAITING_CHALLENGE' && challengeRuleActive) {
        const chN = playerNames[currentPlayer]; const plN = playerNames[(currentPlayer === 1) ? 2 : 1]; const chC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `${plN} placed a stone.<br><strong style="color:${chC};font-weight:700;">${chN}</strong>, challenge this move?<br><small>(Or click board to place your stone)</small>`;
    } else { 
        const cpC = currentPlayer === 1 ? '#e06c75' : '#61afef';
        detailHtml = `Next turn: <strong style="color:${cpC};font-weight:700;">${playerNames[currentPlayer]}</strong>.<br>Choose a spot to place your stone.`;
    }
    let msgArea = select('#messageArea'); if (msgArea) msgArea.html(titleHtml + detailHtml); else console.error("Message area not found.");
}

function drawPreviewStone() {
    if (!previewStone) return;

    // 画像が読み込まれていない場合のフォールバック処理 (変更なし)
    if (!stoneDisplayImage || stoneDisplayImage.width === 0) {
        fill(100, 100, 100, 100); // 半透明のグレーの円
        noStroke();
        ellipse(previewStone.x * CELL_SIZE, previewStone.y * CELL_SIZE, DOT_RADIUS * 2, DOT_RADIUS * 2);
        return;
    }

    const stoneX_on_grid = previewStone.x * CELL_SIZE; // グリッド上の中心X座標
    const stoneY_on_grid = previewStone.y * CELL_SIZE; // グリッド上の中心Y座標
    const stoneDiameter = DOT_RADIUS * 2;             // 石の直径
    const stoneRadius = stoneDiameter / 2;            // 石の半径

    push(); // p5.jsの描画スタイルとトランスフォーム行列を保存

    // 石を描画する位置に原点を移動
    translate(stoneX_on_grid, stoneY_on_grid);

    // HTML5 Canvasの描画コンテキストを操作してクリッピングパスを作成
    drawingContext.save(); // 現在のCanvasコンテキスト状態を保存
    drawingContext.beginPath(); // 新しいパスを開始
    // 移動した原点(0,0) を中心とする円形のパスを作成
    drawingContext.arc(0, 0, stoneRadius, 0, TWO_PI); // x, y, radius, startAngle, endAngle
    drawingContext.closePath();
    drawingContext.clip(); // 作成したパスを現在のクリッピング領域として設定

    // 画像を半透明にして描画 (imageMode(CENTER)がsetupで設定されている前提)
    // translateで原点を移動しているので、画像は(0,0)に描画すればよい
    push(); // tint効果をローカルにするために再度push
    tint(255, 200); // ユーザー指定の透明度 (255が不透明、200は少し透明)
    image(stoneDisplayImage, 0, 0, stoneDiameter, stoneDiameter);
    pop(); // tint効果をリセット (noTint()と同じ効果)

    drawingContext.restore(); // Canvasコンテキストの状態を元に戻す (クリッピング領域も解除される)
    
    pop(); // p5.jsの描画スタイルとトランスフォーム行列を元に戻す
}

function drawGrid() { 
    stroke(205,210,220);strokeWeight(1.5);
    for(let i=0;i<=GRID_DIVISIONS;i++){
        line(i*CELL_SIZE,0,i*CELL_SIZE,GRID_DIVISIONS*CELL_SIZE);
        line(0,i*CELL_SIZE,GRID_DIVISIONS*CELL_SIZE,i*CELL_SIZE);
    }
    if(GRID_DIVISIONS>=8){
        let sP=[];
        const q=Math.round(GRID_DIVISIONS/4);
        const tq=GRID_DIVISIONS-q;
        const c=Math.round(GRID_DIVISIONS/2);
        sP.push({x:q,y:q},{x:tq,y:q},{x:q,y:tq},{x:tq,y:tq});
        if(GRID_DIVISIONS%2===0&&GRID_DIVISIONS!==0)sP.push({x:c,y:c});
        if(GRID_DIVISIONS>=12)sP.push({x:q,y:c},{x:tq,y:c},{x:c,y:q},{x:c,y:tq});
        sP=sP.filter((p,idx,self)=>idx===self.findIndex((o)=>(o.x===p.x&&o.y===p.y)));
        fill(180,185,195);noStroke();
        for(const pt of sP)ellipse(pt.x*CELL_SIZE,pt.y*CELL_SIZE,DOT_RADIUS*0.25,DOT_RADIUS*0.25);
    }
} // ★★★ ここが drawGrid 関数の正しい閉じ括弧です ★★★

function drawStones() { 
    if(!stoneDisplayImage || stoneDisplayImage.width === 0){
        if(placedStones.length > 0 && frameCount % 180 === 0) console.warn("Stone image not loaded. Drawing fallback ellipses for placed stones.");
        for(const s of placedStones){
            fill(50); noStroke();
            ellipse(s.x * CELL_SIZE, s.y * CELL_SIZE, DOT_RADIUS * 2, DOT_RADIUS * 2);
        }
        return;
    } 
    
    for(const stone of placedStones){ // 変数名を s から stone に変更 (可読性のため)
        const stoneX_on_grid = stone.x * CELL_SIZE;
        const stoneY_on_grid = stone.y * CELL_SIZE;
        const stoneDiameter = DOT_RADIUS * 2;
        const stoneRadius = stoneDiameter / 2;

        // 1. 円形の影を描画 (オプション)
        fill(0, 0, 0, 25); // 影の色
        noStroke();
        ellipse(stoneX_on_grid + 2, stoneY_on_grid + 2, stoneDiameter, stoneDiameter); // 少しオフセット

        // 2. 石の画像を円形にクリッピングして描画
        push(); // p5.jsの描画スタイルとトランスフォームを保存
        translate(stoneX_on_grid, stoneY_on_grid); // 石の中心に原点を移動

        drawingContext.save(); // HTML5 Canvasのコンテキスト状態を保存
        drawingContext.beginPath(); // 新しいパスを開始
        drawingContext.arc(0, 0, stoneRadius, 0, TWO_PI); // 原点(0,0)中心の円形パスを作成
        drawingContext.closePath();
        drawingContext.clip(); // このパスでクリッピング領域を設定

        // 画像を描画 (クリッピングされる)
        // imageMode(CENTER) なので、(0,0)が画像の中心
        // 配置された石は半透明にしないので tint は不要
        image(stoneDisplayImage, 0, 0, stoneDiameter, stoneDiameter); 
        
        drawingContext.restore(); // クリッピング領域を解除し、コンテキスト状態を元に戻す
        pop(); // p5.jsのスタイルとトランスフォームを元に戻す

        // 3. ゲームオーバー時のハイライト枠線 (クリッピングの外側に描画)
        if(gameOver && highlightedStones.some(hS => hS.x === stone.x && hS.y === stone.y)){
            stroke(255, 210, 0, 230); 
            strokeWeight(3.5);
            noFill();
            ellipse(stoneX_on_grid, stoneY_on_grid, stoneDiameter * 1.08, stoneDiameter * 1.08); 
            noStroke();
        }
    }
}

function updatePlayerNames() { 
    if(inputPlayer1Name)playerNames[1]=inputPlayer1Name.value().trim()||"Player 1";
    if(playerNames[1]==="")playerNames[1]="Player 1";
    if(inputPlayer2Name)playerNames[2]=inputPlayer2Name.value().trim()||"Player 2";
    if(playerNames[2]==="")playerNames[2]="Player 2";
}
function isStoneAt(x,y){return placedStones.some(s=>s.x===x&&s.y===y);}

function resetGame() {
    console.log("Resetting game. Reading settings...");
    if(boardSizeSelectElement)GRID_DIVISIONS=parseInt(boardSizeSelectElement.value());else GRID_DIVISIONS=10;
    if(challengeRuleCheckbox)challengeRuleActive=challengeRuleCheckbox.checked();else challengeRuleActive=false;
    
    recalculateCanvasDimensionsAndButtonPositions(true); // true to actually resize
    
    placedStones=[];currentPlayer=1;gameOver=false;gameOverReason=null;highlightedStones=[];conicPath=null;previewStone=null;lastPlacedStoneForChallenge=null;gameState='SELECTING_SPOT';
    updatePlayerNames();
    const cpc=currentPlayer===1?'#e06c75':'#61afef';let iMsg=`Next turn: <strong style="color:${cpc};font-weight:700;">${playerNames[currentPlayer]}</strong>.<br>Choose a spot.`;if(challengeRuleActive)iMsg+=`<br><small style="font-size:0.85em;color:#555e68;">(Challenge Rule On)</small>`;
    let msgArea=select('#messageArea');if(msgArea)msgArea.html(iMsg);else console.error("Msg area not found for reset.");
    if(challengeButtonContainerElement)challengeButtonContainerElement.style('display','none');
    if(gameOptionsContainerElement)gameOptionsContainerElement.style('display','flex');
    if(ruleOptionsContainerElement)ruleOptionsContainerElement.style('display','flex');
    console.log("Reset complete. Board:",GRID_DIVISIONS,"State:",gameState,"Challenge:",challengeRuleActive);
    if(!isLooping()) loop(); else redraw();
}

function areThreePointsCollinear(p1,p2,p3){const a2=p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y);return Math.abs(a2)<1e-7;}
function calculateCircleFrom3Points(p1,p2,p3){if(areThreePointsCollinear(p1,p2,p3))return null;const D=2*(p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y));if(Math.abs(D)<1e-9)return null;const p1s=p1.x*p1.x+p1.y*p1.y;const p2s=p2.x*p2.x+p2.y*p2.y;const p3s=p3.x*p3.x+p3.y*p3.y;const cX=(p1s*(p2.y-p3.y)+p2s*(p3.y-p1.y)+p3s*(p1.y-p2.y))/D;const cY=(p1s*(p3.x-p2.x)+p2s*(p1.x-p3.x)+p3s*(p2.x-p1.x))/D;const r=dist(p1.x,p1.y,cX,cY);if(r<1e-4)return null;return{center:{x:cX,y:cY},radius:r};}
function arePointsConcyclicOrCollinear(p1,p2,p3,p4){const ps=[p1,p2,p3,p4];const m=[];for(const p of ps){m.push([p.x*p.x+p.y*p.y,p.x,p.y,1]);}const d3=(a,b,c,d,e,f,g,h,i)=>a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);let det=0;det+=m[0][0]*d3(m[1][1],m[1][2],m[1][3],m[2][1],m[2][2],m[2][3],m[3][1],m[3][2],m[3][3]);det-=m[0][1]*d3(m[1][0],m[1][2],m[1][3],m[2][0],m[2][2],m[2][3],m[3][0],m[3][2],m[3][3]);det+=m[0][2]*d3(m[1][0],m[1][1],m[1][3],m[2][0],m[2][1],m[2][3],m[3][0],m[3][1],m[3][3]);det-=m[0][3]*d3(m[1][0],m[1][1],m[1][2],m[2][0],m[2][1],m[2][2],m[3][0],m[3][1],m[3][2]);return Math.abs(det)<1e-7;}
function getCombinations(arr,k){if(k<0||k>arr.length)return[];if(k===0)return[[]];if(k===arr.length)return[arr];if(k===1)return arr.map(item=>[item]);const cmb=[];function find(idx,curr){if(curr.length===k){cmb.push([...curr]);return;}if(idx>=arr.length)return;curr.push(arr[idx]);find(idx+1,curr);curr.pop();if(arr.length-(idx+1)>=k-curr.length)find(idx+1,curr);}find(0,[]);return cmb;}
function prepareConicPathToDraw(){if(highlightedStones.length<4){conicPath=null;return}const[p1,p2,p3,p4]=highlightedStones;if(areThreePointsCollinear(p1,p2,p3)&&areThreePointsCollinear(p1,p2,p4)&&areThreePointsCollinear(p1,p3,p4)&&areThreePointsCollinear(p2,p3,p4)){let sS=[...highlightedStones].sort((a,b)=>(a.x!==b.x)?a.x-b.x:a.y-b.y);conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}}}else{let cD=null;const c3=getCombinations(highlightedStones,3);for(const cb of c3){const[c1,c2,c3_]=cb;if(!areThreePointsCollinear(c1,c2,c3_)){cD=calculateCircleFrom3Points(c1,c2,c3_);if(cD){const fP=highlightedStones.find(p=>(p.x!==c1.x||p.y!==c1.y)&&(p.x!==c2.x||p.y!==c2.y)&&(p.x!==c3_.x||p.y!==c3_.y));if(fP){const d=dist(fP.x,fP.y,cD.center.x,cD.center.y);const tol=Math.max(0.01,cD.radius*0.02);if(Math.abs(d-cD.radius)<tol)break}cD=null}}}}if(cD)conicPath={type:"circle",data:cD};else{console.warn("Circle identification failed in prepareConicPathToDraw for points:",highlightedStones,"Attempting to draw as line.");let sS=[...highlightedStones].sort((a,b)=>(a.x-b.x)||(a.y-b.y));conicPath={type:"line",data:{p_start:sS[0],p_end:sS[3]}};}}
function drawConicPath(){if(!conicPath||!conicPath.data)return;push();strokeWeight(3.5);noFill();let pC=color(255,80,50,210);if(conicPath.type==="circle"&&conicPath.data.center&&conicPath.data.radius>0){stroke(pC);ellipseMode(CENTER);ellipse(conicPath.data.center.x*CELL_SIZE,conicPath.data.center.y*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE,conicPath.data.radius*2*CELL_SIZE)}else if(conicPath.type==="line"&&conicPath.data.p_start&&conicPath.data.p_end){stroke(pC);let p1px={x:conicPath.data.p_start.x*CELL_SIZE,y:conicPath.data.p_start.y*CELL_SIZE};let p2px={x:conicPath.data.p_end.x*CELL_SIZE,y:conicPath.data.p_end.y*CELL_SIZE};const minX=0;const maxX=GRID_DIVISIONS*CELL_SIZE;const minY=0;const maxY=GRID_DIVISIONS*CELL_SIZE;let ptsOB=[];if(Math.abs(p1px.x-p2px.x)<1e-6){ptsOB.push({x:p1px.x,y:minY});ptsOB.push({x:p1px.x,y:maxY})}else if(Math.abs(p1px.y-p2px.y)<1e-6){ptsOB.push({x:minX,y:p1px.y});ptsOB.push({x:maxX,y:p1px.y})}else{const sl=(p2px.y-p1px.y)/(p2px.x-p1px.x);const yI=p1px.y-sl*p1px.x;let yAMX=sl*minX+yI;if(yAMX>=minY&&yAMX<=maxY)ptsOB.push({x:minX,y:yAMX});let yAMaX=sl*maxX+yI;if(yAMaX>=minY&&yAMaX<=maxY)ptsOB.push({x:maxX,y:yAMaX});if(Math.abs(sl)>1e-6){let xAMY=(minY-yI)/sl;if(xAMY>=minX&&xAMY<=maxX)ptsOB.push({x:xAMY,y:minY});let xAMaY=(maxY-yI)/sl;if(xAMaY>=minX&&xAMaY<=maxX)ptsOB.push({x:xAMaY,y:maxY})}}let fP1=null,fP2=null,mDSq=-1;if(ptsOB.length>=2){for(let i=0;i<ptsOB.length;i++){for(let j=i+1;j<ptsOB.length;j++){let dSq=sq(ptsOB[i].x-ptsOB[j].x)+sq(ptsOB[i].y-ptsOB[j].y);if(dSq>mDSq){mDSq=dSq;fP1=ptsOB[i];fP2=ptsOB[j];}}}}if(fP1&&fP2)line(fP1.x,fP1.y,fP2.x,fP2.y)}pop();}
// End of sketch.js - All functions included.
