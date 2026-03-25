// Snake - 30 Levels (clean, ASCII-only)
(function(){
  var GRID=30, CELL=20, SIZE=GRID*CELL, FOODS_PER_LEVEL=5;
  // number of foods visible simultaneously with numeric labels
  var FOODS_VISIBLE=3;
  var LEVELS = Array.from({length:30}, function(_,i){
    var n=i+1; var tickMs=Math.max(60,230-n*6); var obstacles=Math.min(80, Math.floor(n*1.8));
    return {n:n, tickMs:tickMs, goal:FOODS_PER_LEVEL, obstacles:obstacles};
  });

  // DOM
  var canvas=document.getElementById('canvas');
  var ctx=canvas.getContext('2d');
  var elLevel=document.getElementById('level');
  var elScore=document.getElementById('score');
  var elGoal=document.getElementById('goal');
  var elSpeed=document.getElementById('speed');
  var overlay=document.getElementById('overlay');
  var titleEl=document.getElementById('title');
  var msgEl=document.getElementById('message');
  var btnStart=document.getElementById('btn-start');
  var btnRestart=document.getElementById('btn-restart');
  var btnNext=document.getElementById('btn-next');

  var loop=null; var state=null;

  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min }
  function eq(a,b){ return a.x===b.x && a.y===b.y }

  function spawnObstacles(count, snake){
    var occupied=new Set(snake.map(function(p){return p.x+','+p.y}));
    var out=[], tries=0; while(out.length<count && tries<10000){ tries++; var x=randInt(0,GRID-1), y=randInt(0,GRID-1); var k=x+','+y; if(occupied.has(k)) continue; if(out.some(function(o){return o.x===x&&o.y===y})) continue; out.push({x:x,y:y}); }
    return out;
  }
  function spawnFoodItem(snake, obstacles, foods){
    var occ=new Set(
      snake
        .concat(obstacles)
        .concat(foods||[])
        .map(function(p){return p.x+','+p.y})
    );
    var tries=0;
    while(tries++<10000){
      var x=randInt(0,GRID-1), y=randInt(0,GRID-1); var k=x+','+y;
      if(!occ.has(k)){
        return {x:x,y:y,val:randInt(1,99)}; // 1-3 digits
      }
    }
    return {x:5,y:5,val:randInt(1,99)};
  }

  function spawnFoods(count, snake, obstacles){
    var foods=[];
    for(var i=0;i<count;i++){
      foods.push(spawnFoodItem(snake, obstacles, foods));
    }
    return foods;
  }

  function drawCell(x,y,color){ ctx.fillStyle=color; ctx.fillRect(x*CELL, y*CELL, CELL-1, CELL-1); }
  function draw(){
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.fillStyle=state.bgColor || '#f7f9fe';
    ctx.fillRect(0,0,SIZE,SIZE);
    state.obstacles.forEach(function(o){ drawCell(o.x,o.y,'#7b61ff'); });
    // foods with numbers
    ctx.font = 'bold 12px system-ui, Arial';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    var minVal = Math.min.apply(null, state.foods.map(function(f){return f.val;}));
    state.foods.forEach(function(f){
      drawCell(f.x, f.y, '#ffcc33');
      ctx.fillStyle = '#0b1020';
      ctx.fillText(String(f.val), f.x*CELL + CELL/2, f.y*CELL + CELL/2);
      // highlight the current minimum
      if(f.val===minVal){
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x*CELL+2, f.y*CELL+2, CELL-5, CELL-5);
      }
    });
    for(var i=0;i<state.snake.length;i++){ var s=state.snake[i]; drawCell(s.x,s.y, i===0?'#14b8a6':'#38bdf8'); }
  }

  function updateHud(){
    elLevel.textContent=state.level.n; elScore.textContent=state.score; elGoal.textContent=state.eaten+'/'+state.level.goal; elSpeed.textContent=Math.round(1000/state.level.tickMs);
  }

  function showOverlay(t,m,buttons){ titleEl.textContent=t; msgEl.textContent=m; btnStart.classList.toggle('hidden', buttons.indexOf('start')<0); btnRestart.classList.toggle('hidden', buttons.indexOf('restart')<0); btnNext.classList.toggle('hidden', buttons.indexOf('next')<0); overlay.classList.remove('hidden'); }
  function hideOverlay(){ overlay.classList.add('hidden'); if(state) { state.bgColor = '#f7f9fe'; } }

  function newGame(){
    state = { levelIndex:0, level:LEVELS[0], snake:[{x:15,y:15},{x:14,y:15},{x:13,y:15}], dir:{x:1,y:0}, pendingDir:null, obstacles:[], foods:[], eaten:0, score:0, paused:false, mistakes:0, bgColor:'#f7f9fe' };
    state.obstacles=spawnObstacles(state.level.obstacles,state.snake);
    state.foods=spawnFoods(FOODS_VISIBLE, state.snake, state.obstacles);
    updateHud(); draw();
  }
  function setLevel(i){ state.levelIndex=i; state.level=LEVELS[i]; state.eaten=0; state.snake=[{x:15,y:15},{x:14,y:15},{x:13,y:15}]; state.dir={x:1,y:0}; state.obstacles=spawnObstacles(state.level.obstacles,state.snake); state.foods=spawnFoods(FOODS_VISIBLE, state.snake, state.obstacles); state.mistakes=0; state.bgColor='#f7f9fe'; updateHud(); draw(); }

  function beforeTick(){ if(state.pendingDir){ var nd=state.pendingDir, cur=state.dir; if(cur.x+nd.x!==0 || cur.y+nd.y!==0) state.dir=nd; state.pendingDir=null; } }
  function tick(){
    beforeTick();
    var head={x:state.snake[0].x, y:state.snake[0].y}; head.x+=state.dir.x; head.y+=state.dir.y;
    if(head.x<0||head.x>=GRID||head.y<0||head.y>=GRID) return gameOver('Hit the wall!');
    if(state.snake.some(function(p,i){return i>0 && eq(p,head)})) return gameOver('Bit yourself!');
    if(state.obstacles.some(function(o){return eq(o,head)})) return gameOver('Hit an obstacle!');
    state.snake.unshift(head);
    // food collision: check any food hit
    var hitIndex = -1;
    for(var i=0;i<state.foods.length;i++){ if(eq(head, state.foods[i])){ hitIndex=i; break; } }
    if(hitIndex>=0){
      var minVal = Math.min.apply(null, state.foods.map(function(f){return f.val;}));
      var picked = state.foods[hitIndex];
      if(picked.val === minVal){
        state.score+=10; state.eaten++;
        if(state.eaten>=state.level.goal) return levelClear();
      } else {
        state.mistakes+=1;
        state.bgColor = '#ffe5e5';
        if(state.mistakes===1){
          stopLoop();
          showOverlay('警告', '吃错了！请按从小到大的号码顺序吃。再错一次将游戏结束。', []);
        } else {
          return gameOver('连续两次吃错号码');
        }
      }
      // remove eaten (whether right or wrong) and spawn a replacement
      state.foods.splice(hitIndex,1);
      state.foods.push(spawnFoodItem(state.snake, state.obstacles, state.foods));
      updateHud();
    } else {
      state.snake.pop();
    }
    draw();
  }
  function startLoop(){ stopLoop(); loop=setInterval(tick, state.level.tickMs); }
  function stopLoop(){ if(loop){ clearInterval(loop); loop=null; } }
  function gameOver(msg){ stopLoop(); showOverlay('Game Over', msg + '  Score: ' + state.score, ['restart']); }
  function levelClear(){ stopLoop(); if(state.levelIndex===LEVELS.length-1){ showOverlay('All Levels Clear!', 'Total score: '+state.score, ['restart']); } else { showOverlay('Level '+state.level.n+' cleared', 'Get ready for the next level.', ['next','restart']); } }

  function handleKey(e){
    var k=e.key.toLowerCase(); if(k===' '){ e.preventDefault(); if(overlay.classList.contains('hidden')){ state.paused=!state.paused; if(state.paused){ stopLoop(); showOverlay('Paused','Press Space to continue', []); } else { hideOverlay(); startLoop(); } } else { hideOverlay(); startLoop(); } return; }
    if(k==='r'){ e.preventDefault(); stopLoop(); newGame(); showOverlay('Ready','Press Start or Space to begin.', ['start']); return; }
    var map={w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}}; if(map[k]) state.pendingDir=map[k];
  }

  // attach listeners
  document.addEventListener('keydown', handleKey);
  if(btnStart) btnStart.addEventListener('click', function(){ hideOverlay(); startLoop(); });
  if(btnRestart) btnRestart.addEventListener('click', function(){ hideOverlay(); newGame(); startLoop(); });
  if(btnNext) btnNext.addEventListener('click', function(){ hideOverlay(); setLevel(state.levelIndex+1); startLoop(); });

  // expose fallbacks for inline buttons
  window.__startGame=function(){ hideOverlay(); startLoop(); };
  window.__restartGame=function(){ hideOverlay(); newGame(); startLoop(); };
  window.__nextLevel=function(){ hideOverlay(); setLevel(state.levelIndex+1); startLoop(); };

  function boot(){ canvas.width=SIZE; canvas.height=SIZE; newGame(); showOverlay('Ready','Press Space to start. Use W/A/S/D to move.', ['start']); }
  boot();
})();
