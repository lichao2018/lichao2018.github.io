import './style.css'
import { startGame } from './metroidvania.ts'

document.title = 'Echoes of the Hollow'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

app.innerHTML = `
  <main class="shell">
    <section class="masthead">
      <div>
        <p class="eyebrow">2D Metroidvania Prototype</p>
        <h1>Echoes of the Hollow</h1>
        <p class="subtitle">探索断裂遗迹，解锁冲刺与二段跳，在一张连续横版地图里打通前往灯塔的路线。</p>
      </div>
      <div class="legend">
        <p><span>A D</span> 移动</p>
        <p><span>Space</span> 跳跃 / 二段跳</p>
        <p><span>Shift</span> 冲刺</p>
        <p><span>J</span> 攻击</p>
        <p><span>L</span> Echo Blade</p>
      </div>
    </section>

    <section class="game-frame">
      <canvas id="game" width="960" height="540" aria-label="Echoes of the Hollow game canvas"></canvas>
      <div class="overlay top-left">
        <p class="label">Area</p>
        <p id="area-name" class="value">Lower Gate</p>
      </div>
      <div class="overlay top-center">
        <p class="label">Boss</p>
        <p id="boss-health" class="value narrow">Dormant</p>
      </div>
      <div class="overlay top-right">
        <p class="label">Objective</p>
        <p id="objective" class="value narrow">Reach the shrine above the ruins.</p>
      </div>
      <div class="overlay bottom-left">
        <p class="label">Vital</p>
        <p id="health" class="value">5 / 5</p>
      </div>
      <div class="overlay bottom-right">
        <p class="label">Abilities</p>
        <p id="abilities" class="value narrow">None</p>
      </div>
      <div class="banner" id="hint">Climb upward. The first altar is reachable with basic jumps.</div>
    </section>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const areaName = document.querySelector<HTMLParagraphElement>('#area-name')
const bossHealth = document.querySelector<HTMLParagraphElement>('#boss-health')
const objective = document.querySelector<HTMLParagraphElement>('#objective')
const health = document.querySelector<HTMLParagraphElement>('#health')
const abilities = document.querySelector<HTMLParagraphElement>('#abilities')
const hint = document.querySelector<HTMLDivElement>('#hint')

if (!canvas || !areaName || !bossHealth || !objective || !health || !abilities || !hint) {
  throw new Error('Game UI failed to initialize')
}

startGame({
  canvas,
  areaName,
  bossHealth,
  objective,
  health,
  abilities,
  hint,
})
