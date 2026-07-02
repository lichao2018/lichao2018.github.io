type Rect = {
  x: number
  y: number
  w: number
  h: number
}

type Gate = Rect & {
  hint: string
}

type Checkpoint = Rect & {
  name: string
  respawnX: number
  respawnY: number
  active: boolean
}

type Pickup = Rect & {
  id: 'dash' | 'doubleJump' | 'echoHeart'
  title: string
  description: string
  collected: boolean
}

type Beacon = Rect & {
  lit: boolean
}

type Enemy = Rect & {
  id: number
  originX: number
  minX: number
  maxX: number
  vx: number
  hp: number
  stun: number
  direction: 1 | -1
}

type Boss = Rect & {
  name: string
  spawnX: number
  spawnY: number
  arenaLeft: number
  arenaRight: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  stun: number
  direction: 1 | -1
  awake: boolean
  enraged: boolean
  coreExposed: boolean
  armorFlash: number
  phase: 'prowl' | 'chargeTell' | 'charge' | 'leapTell' | 'leap' | 'waveCast' | 'recover'
  phaseTimer: number
  phaseTriggered: boolean
  attackIndex: number
  targetX: number
}

type PlayerProjectile = Rect & {
  id: number
  vx: number
  ttl: number
}

type BossHazard = Rect & {
  id: number
  vx: number
  ttl: number
  damage: number
}

type Player = Rect & {
  vx: number
  vy: number
  facing: 1 | -1
  onGround: boolean
  jumpsUsed: number
  hp: number
  attackTimer: number
  attackCooldown: number
  hurtTimer: number
  dashCooldown: number
  dashTimer: number
  dashDirection: 1 | -1
  skillCooldown: number
  maxHp: number
  hasDash: boolean
  hasDoubleJump: boolean
  hasSunThread: boolean
}

type HudBindings = {
  canvas: HTMLCanvasElement
  areaName: HTMLParagraphElement
  bossHealth: HTMLParagraphElement
  objective: HTMLParagraphElement
  health: HTMLParagraphElement
  abilities: HTMLParagraphElement
  hint: HTMLDivElement
}

type World = {
  width: number
  height: number
  solids: Rect[]
  gates: Gate[]
  checkpoints: Checkpoint[]
  pickups: Pickup[]
  beacon: Beacon
  enemies: Enemy[]
  boss: Boss
}

const VIEW_WIDTH = 960
const VIEW_HEIGHT = 540
const PLAYER_SPEED = 280
const PLAYER_ACCELERATION = 2100
const PLAYER_FRICTION = 1900
const GRAVITY = 2200
const JUMP_SPEED = 760
const DASH_SPEED = 820
const MAX_HEALTH = 5

class InputState {
  private readonly down = new Set<string>()
  private readonly pressed = new Set<string>()

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.down.has(event.code)) {
      this.pressed.add(event.code)
    }

    this.down.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.down.delete(event.code)
  }

  private readonly handleBlur = () => {
    this.down.clear()
    this.pressed.clear()
  }

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
  }

  isDown(code: string): boolean {
    return this.down.has(code)
  }

  consume(code: string): boolean {
    return this.pressed.delete(code)
  }

  endFrame(): void {
    this.pressed.clear()
  }
}

class MetroidvaniaGame {
  private readonly ctx: CanvasRenderingContext2D
  private readonly input = new InputState()
  private readonly hud: HudBindings
  private readonly world = createWorld()
  private readonly player: Player = {
    x: 120,
    y: 1014,
    w: 28,
    h: 42,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    jumpsUsed: 0,
    hp: MAX_HEALTH,
    attackTimer: 0,
    attackCooldown: 0,
    hurtTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashDirection: 1,
    skillCooldown: 0,
    maxHp: MAX_HEALTH,
    hasDash: false,
    hasDoubleJump: false,
    hasSunThread: false,
  }

  private readonly struckEnemies = new Set<number>()
  private readonly projectiles: PlayerProjectile[] = []
  private readonly bossHazards: BossHazard[] = []
  private cameraX = 0
  private cameraY = 0
  private lastFrame = 0
  private currentArea = ''
  private messageTimer = 0
  private messageText = 'Climb upward. The first altar is reachable with basic jumps.'
  private checkpoint = this.world.checkpoints[0]
  private won = false
  private hitstopTimer = 0
  private shakeTimer = 0
  private shakeStrength = 0
  private flashTimer = 0
  private flashColor = '255,255,255'
  private bossDefeatTimer = 0
  private nextProjectileId = 1
  private nextHazardId = 1

  constructor(hud: HudBindings) {
    this.hud = hud

    const context = hud.canvas.getContext('2d')

    if (!context) {
      throw new Error('2D context unavailable')
    }

    this.ctx = context
    this.ctx.imageSmoothingEnabled = false
    this.syncHud()
  }

  start(): void {
    this.lastFrame = performance.now()
    window.requestAnimationFrame(this.frame)
  }

  private readonly frame = (timestamp: number) => {
    const deltaSeconds = Math.min((timestamp - this.lastFrame) / 1000, 1 / 20)
    this.lastFrame = timestamp

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - deltaSeconds)
      this.decayFeedback(deltaSeconds)
    } else {
      this.update(deltaSeconds)
      this.decayFeedback(deltaSeconds)
    }

    this.render(timestamp / 1000)
    this.input.endFrame()
    window.requestAnimationFrame(this.frame)
  }

  private update(deltaSeconds: number): void {
    if (this.messageTimer > 0) {
      this.messageTimer = Math.max(0, this.messageTimer - deltaSeconds)
    }

    if (this.won) {
      this.updateCamera(deltaSeconds)
      this.syncHud()
      return
    }

    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - deltaSeconds)
    this.player.attackTimer = Math.max(0, this.player.attackTimer - deltaSeconds)
    this.player.hurtTimer = Math.max(0, this.player.hurtTimer - deltaSeconds)
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - deltaSeconds)
    this.player.skillCooldown = Math.max(0, this.player.skillCooldown - deltaSeconds)

    const horizontalInput = Number(this.input.isDown('KeyD')) - Number(this.input.isDown('KeyA'))

    if (horizontalInput !== 0) {
      this.player.facing = horizontalInput > 0 ? 1 : -1
    }

    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - deltaSeconds)
      this.player.vx = this.player.dashDirection * DASH_SPEED
      this.player.vy = 0
    } else {
      const targetSpeed = horizontalInput * PLAYER_SPEED
      const acceleration = horizontalInput === 0 ? PLAYER_FRICTION : PLAYER_ACCELERATION

      this.player.vx = moveTowards(this.player.vx, targetSpeed, acceleration * deltaSeconds)
      this.player.vy += GRAVITY * deltaSeconds

      if (this.input.consume('ShiftLeft') || this.input.consume('ShiftRight')) {
        this.tryStartDash(horizontalInput)
      }

      if (this.input.consume('Space')) {
        this.tryJump()
      }
    }

    if ((this.input.consume('KeyJ') || this.input.consume('KeyK')) && this.player.attackCooldown === 0) {
      this.player.attackTimer = 0.14
      this.player.attackCooldown = 0.28
      this.struckEnemies.clear()
    }

    if (this.input.consume('KeyL')) {
      this.tryCastSkill()
    }

    this.movePlayer(deltaSeconds)
    this.updateEnemies(deltaSeconds)
    this.updateBoss(deltaSeconds)
    this.updateProjectiles(deltaSeconds)
    this.updateBossHazards(deltaSeconds)
    this.handleAttack()
    this.handleEnemyContact()
    this.handlePickups()
    this.handleCheckpoints()
    this.handleGoal()
    this.handleFalls()
    this.updateArea()
    this.updateCamera(deltaSeconds)
    this.syncHud()
  }

  private tryStartDash(horizontalInput: number): void {
    if (!this.player.hasDash || this.player.dashCooldown > 0) {
      return
    }

    const direction = horizontalInput === 0 ? this.player.facing : horizontalInput > 0 ? 1 : -1

    this.player.dashDirection = direction
    this.player.dashTimer = 0.16
    this.player.dashCooldown = 0.6
    this.player.vx = direction * DASH_SPEED
    this.player.vy = 0
  }

  private tryJump(): void {
    const maxJumps = this.player.hasDoubleJump ? 2 : 1

    if (this.player.onGround) {
      this.player.vy = -JUMP_SPEED
      this.player.onGround = false
      this.player.jumpsUsed = 1
      return
    }

    if (this.player.jumpsUsed < maxJumps) {
      this.player.vy = -JUMP_SPEED * 0.92
      this.player.jumpsUsed += 1
      this.setMessage(this.player.hasDoubleJump ? 'Second jump engaged.' : 'You are still missing the sigil for a second jump.', 1.2)
    }
  }

  private tryCastSkill(): void {
    if (this.player.skillCooldown > 0) {
      return
    }

    this.player.skillCooldown = getSkillCooldownDuration(this.player)
    this.projectiles.push({
      id: this.nextProjectileId,
      x: this.player.facing > 0 ? this.player.x + this.player.w : this.player.x - 32,
      y: this.player.y + 12,
      w: 32,
      h: 18,
      vx: this.player.facing * 640,
      ttl: 0.55,
    })
  }

  private movePlayer(deltaSeconds: number): void {
    const solids = this.getActiveSolids()
    const wasOnGround = this.player.onGround
    const fallSpeedBeforeMove = this.player.vy

    this.player.x += this.player.vx * deltaSeconds

    for (const solid of solids) {
      if (!intersects(this.player, solid)) {
        continue
      }

      if (this.player.vx > 0) {
        this.player.x = solid.x - this.player.w
      } else if (this.player.vx < 0) {
        this.player.x = solid.x + solid.w
      }

      this.player.vx = 0

      if ('hint' in solid && !this.player.hasDash) {
        this.setMessage(solid.hint, 1.8)
      }
    }

    this.player.y += this.player.vy * deltaSeconds
    this.player.onGround = false

    for (const solid of solids) {
      if (!intersects(this.player, solid)) {
        continue
      }

      if (this.player.vy > 0) {
        this.player.y = solid.y - this.player.h
        this.player.onGround = true
        this.player.jumpsUsed = 0

        if (!wasOnGround && fallSpeedBeforeMove > 640) {
          this.startShake(0.12, 8)
        }
      } else if (this.player.vy < 0) {
        this.player.y = solid.y + solid.h
      }

      this.player.vy = 0

      if ('hint' in solid && !this.player.hasDash) {
        this.setMessage(solid.hint, 1.8)
      }
    }

    this.player.x = clamp(this.player.x, 0, this.world.width - this.player.w)
  }

  private updateEnemies(deltaSeconds: number): void {
    const solids = this.getActiveSolids()

    for (const enemy of this.world.enemies) {
      if (enemy.hp <= 0) {
        continue
      }

      enemy.stun = Math.max(0, enemy.stun - deltaSeconds)

      if (enemy.stun === 0) {
        if (enemy.x <= enemy.minX) {
          enemy.direction = 1
        } else if (enemy.x + enemy.w >= enemy.maxX) {
          enemy.direction = -1
        }

        enemy.vx = enemy.direction * 72
      } else {
        enemy.vx = moveTowards(enemy.vx, 0, 480 * deltaSeconds)
      }

      enemy.x += enemy.vx * deltaSeconds

      for (const solid of solids) {
        if (!intersects(enemy, solid)) {
          continue
        }

        if (enemy.vx > 0) {
          enemy.x = solid.x - enemy.w
          enemy.direction = -1
        } else if (enemy.vx < 0) {
          enemy.x = solid.x + solid.w
          enemy.direction = 1
        }
      }

      enemy.y += GRAVITY * deltaSeconds

      for (const solid of solids) {
        if (!intersects(enemy, solid)) {
          continue
        }

        if (enemy.y + enemy.h * 0.5 < solid.y + solid.h * 0.5) {
          enemy.y = solid.y - enemy.h
        }
      }
    }
  }

  private updateBoss(deltaSeconds: number): void {
    const boss = this.world.boss

    if (boss.hp <= 0) {
      boss.vx = 0
      boss.vy = 0
      return
    }

    if (!boss.awake) {
      if (this.player.hasDoubleJump && this.player.x >= boss.arenaLeft - 180) {
        boss.awake = true
        boss.phase = 'prowl'
        boss.phaseTimer = 0.85
        boss.phaseTriggered = false
        this.setMessage(`${boss.name} wakes beneath the tower.`, 2.4)
      }

      return
    }

    if (!boss.enraged && boss.hp <= Math.ceil(boss.maxHp * 0.5)) {
      boss.enraged = true
      boss.phase = 'waveCast'
      boss.phaseTimer = 1.1
      boss.phaseTriggered = false
      boss.coreExposed = false
      boss.vx = 0
      this.setMessage(`${boss.name} tears open the hollow wind.`, 2.2)
    }

    boss.stun = Math.max(0, boss.stun - deltaSeconds)
    boss.armorFlash = Math.max(0, boss.armorFlash - deltaSeconds)

    const playerCenterX = this.player.x + this.player.w * 0.5
    const bossCenterX = boss.x + boss.w * 0.5

    if (playerCenterX !== bossCenterX) {
      boss.direction = playerCenterX > bossCenterX ? 1 : -1
    }

    if (boss.stun === 0) {
      boss.phaseTimer = Math.max(0, boss.phaseTimer - deltaSeconds)

      if (boss.phase === 'prowl') {
        const chaseSpeed = Math.abs(playerCenterX - bossCenterX) > 110 ? (boss.enraged ? 160 : 132) : 72
        boss.vx = moveTowards(boss.vx, boss.direction * chaseSpeed, 820 * deltaSeconds)

        if (boss.phaseTimer === 0) {
          this.beginBossAttack()
        }
      } else if (boss.phase === 'chargeTell') {
        boss.coreExposed = false
        boss.vx = moveTowards(boss.vx, 0, 1000 * deltaSeconds)

        if (boss.phaseTimer === 0) {
          boss.phase = 'charge'
          boss.phaseTimer = boss.enraged ? 0.62 : 0.44
          boss.phaseTriggered = false
        }
      } else if (boss.phase === 'charge') {
        boss.coreExposed = false
        boss.vx = boss.phaseTimer > 0.12 ? boss.direction * (boss.enraged ? 660 : 520) : boss.direction * 180

        const hitArenaWall = boss.x <= boss.arenaLeft + 4 || boss.x + boss.w >= boss.arenaRight - 4

        if (boss.phaseTimer === 0 || hitArenaWall) {
          this.enterBossRecover(hitArenaWall ? 0.85 : 0.55)
          if (hitArenaWall) {
            this.spawnShockwaves(boss.x + boss.w * 0.5, boss.y + boss.h - 18, boss.enraged ? 300 : 260)
            this.setMessage('Aurex slams the arena wall. Jump the shockwave.', 1.2)
          }
        }
      } else if (boss.phase === 'leapTell') {
        boss.coreExposed = false
        boss.vx = moveTowards(boss.vx, 0, 1200 * deltaSeconds)

        if (boss.phaseTimer === 0) {
          boss.phase = 'leap'
          boss.phaseTriggered = true
          boss.targetX = clamp(playerCenterX - boss.w * 0.5, boss.arenaLeft + 8, boss.arenaRight - boss.w - 8)
          boss.vx = (boss.targetX - boss.x) / (boss.enraged ? 0.58 : 0.72)
          boss.vy = boss.enraged ? -990 : -900
        }
      } else if (boss.phase === 'waveCast') {
        boss.vx = moveTowards(boss.vx, 0, 1000 * deltaSeconds)
        boss.coreExposed = boss.phaseTriggered

        if (!boss.phaseTriggered && boss.phaseTimer <= 0.6) {
          boss.phaseTriggered = true
          this.spawnShockwaves(boss.x + boss.w * 0.5, boss.y + boss.h - 20, boss.enraged ? 360 : 300)
          this.spawnShockwaves(boss.x + boss.w * 0.5, boss.y + boss.h - 20, boss.enraged ? 500 : 420, 14)
          this.setMessage('The hollow wind tears outward. Dash or jump through it.', 1.2)
        }

        if (boss.phaseTimer === 0) {
          this.enterBossRecover(boss.enraged ? 0.4 : 0.55)
        }
      } else {
        boss.vx = moveTowards(boss.vx, 0, 980 * deltaSeconds)
        boss.coreExposed = true

        if (boss.phaseTimer === 0) {
          boss.phase = 'prowl'
          boss.phaseTimer = boss.enraged ? 0.72 : 1.05
          boss.phaseTriggered = false
        }
      }
    } else {
      boss.vx = moveTowards(boss.vx, 0, 780 * deltaSeconds)
    }

    const solids = this.getActiveSolids()

    boss.x += boss.vx * deltaSeconds
    boss.x = clamp(boss.x, boss.arenaLeft, boss.arenaRight - boss.w)

    for (const solid of solids) {
      if (!intersects(boss, solid)) {
        continue
      }

      if (boss.vx > 0) {
        boss.x = solid.x - boss.w
      } else if (boss.vx < 0) {
        boss.x = solid.x + solid.w
      }

      boss.vx = 0
    }

    const previousVy = boss.vy
    boss.vy += GRAVITY * deltaSeconds
    boss.y += boss.vy * deltaSeconds

    for (const solid of solids) {
      if (!intersects(boss, solid)) {
        continue
      }

      if (boss.vy > 0) {
        boss.y = solid.y - boss.h

        if (boss.phase === 'leap' && previousVy > 0) {
          this.spawnShockwaves(boss.x + boss.w * 0.5, boss.y + boss.h - 18, boss.enraged ? 340 : 280)
          this.enterBossRecover(boss.enraged ? 0.4 : 0.62)
          this.setMessage('Aurex crashes down. Strike before the next pattern.', 1.2)
        }
      } else if (boss.vy < 0) {
        boss.y = solid.y + solid.h
      }

      boss.vy = 0
    }
  }

  private beginBossAttack(): void {
    const boss = this.world.boss
    const nextAttack = boss.attackIndex % (boss.enraged ? 3 : 2)
    boss.attackIndex += 1
    boss.phaseTriggered = false
    boss.coreExposed = false

    if (nextAttack === 0) {
      boss.phase = 'chargeTell'
      boss.phaseTimer = boss.enraged ? 0.42 : 0.55
      this.setMessage(`${boss.name} lowers its shoulders.`, 0.9)
      return
    }

    if (nextAttack === 1) {
      boss.phase = 'leapTell'
      boss.phaseTimer = boss.enraged ? 0.3 : 0.42
      this.setMessage(`${boss.name} coils for a leap.`, 0.9)
      return
    }

    boss.phase = 'waveCast'
    boss.phaseTimer = boss.enraged ? 0.82 : 0.98
    this.setMessage(`${boss.name} summons the hollow wind.`, 1)
  }

  private enterBossRecover(durationSeconds: number): void {
    const boss = this.world.boss
    boss.phase = 'recover'
    boss.phaseTimer = durationSeconds
    boss.phaseTriggered = false
    boss.coreExposed = true
    boss.vx = 0
  }

  private spawnShockwaves(centerX: number, groundY: number, speed: number, size = 0): void {
    const height = 18 + size
    const width = 34 + size

    this.bossHazards.push({
      id: this.nextHazardId,
      x: centerX - width - 6,
      y: groundY - height,
      w: width,
      h: height,
      vx: -speed,
      ttl: 1.15,
      damage: 1,
    })
    this.nextHazardId += 1

    this.bossHazards.push({
      id: this.nextHazardId,
      x: centerX + 6,
      y: groundY - height,
      w: width,
      h: height,
      vx: speed,
      ttl: 1.15,
      damage: 1,
    })
    this.nextHazardId += 1
  }

  private updateProjectiles(deltaSeconds: number): void {
    const solids = this.getActiveSolids()

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index]
      projectile.ttl -= deltaSeconds
      projectile.x += projectile.vx * deltaSeconds

      if (projectile.ttl <= 0 || solids.some((solid) => intersects(projectile, solid))) {
        this.projectiles.splice(index, 1)
        continue
      }

      let consumed = false

      for (const enemy of this.world.enemies) {
        if (enemy.hp <= 0 || !intersects(projectile, enemy)) {
          continue
        }

        enemy.hp -= 1
        enemy.stun = 0.35
        enemy.vx = projectile.vx > 0 ? 180 : -180
        this.applyHitFeedback(enemy.hp <= 0 ? 'heavy' : 'light')
        this.projectiles.splice(index, 1)
        consumed = true
        break
      }

      if (consumed) {
        continue
      }

      const boss = this.world.boss

      if (boss.hp > 0 && boss.awake && intersects(projectile, boss)) {
        this.projectiles.splice(index, 1)

        if (boss.coreExposed) {
          boss.hp = Math.max(0, boss.hp - 1)
          boss.stun = Math.max(boss.stun, 0.18)
          this.applyHitFeedback(boss.hp === 0 ? 'kill' : 'heavy')

          if (boss.hp === 0) {
            boss.vx = 0
            boss.vy = 0
            this.bossHazards.length = 0
            this.beginBossDefeatSequence()
          }

          continue
        }

        if (boss.phase === 'chargeTell' || boss.phase === 'waveCast') {
          boss.stun = Math.max(boss.stun, 0.12)
          this.enterBossRecover(boss.enraged ? 0.55 : 0.72)
          this.applyHitFeedback('heavy')
          this.setMessage('Echo Blade cracks the shell open.', 1.2)
        } else {
          boss.armorFlash = 0.18
          this.applyHitFeedback('light')
        }
      }
    }
  }

  private updateBossHazards(deltaSeconds: number): void {
    for (let index = this.bossHazards.length - 1; index >= 0; index -= 1) {
      const hazard = this.bossHazards[index]
      hazard.ttl -= deltaSeconds
      hazard.x += hazard.vx * deltaSeconds

      if (hazard.ttl <= 0 || hazard.x + hazard.w < this.world.boss.arenaLeft || hazard.x > this.world.boss.arenaRight) {
        this.bossHazards.splice(index, 1)
      }
    }
  }

  private handleAttack(): void {
    if (this.player.attackTimer <= 0) {
      return
    }

    const hitbox: Rect = {
      x: this.player.facing > 0 ? this.player.x + this.player.w - 4 : this.player.x - 40,
      y: this.player.y + 8,
      w: 44,
      h: 28,
    }

    for (const enemy of this.world.enemies) {
      if (enemy.hp <= 0 || this.struckEnemies.has(enemy.id) || !intersects(hitbox, enemy)) {
        continue
      }

      enemy.hp -= 1
      enemy.stun = 0.25
      enemy.vx = this.player.facing * 200
      this.struckEnemies.add(enemy.id)
      this.applyHitFeedback(enemy.hp <= 0 ? 'heavy' : 'light')

      if (enemy.hp <= 0) {
        this.setMessage('Warden shattered.', 1.4)
      }
    }

    const boss = this.world.boss

    if (boss.hp > 0 && boss.awake && !this.struckEnemies.has(999) && intersects(hitbox, boss)) {
      if (!boss.coreExposed) {
        boss.armorFlash = 0.18
        this.struckEnemies.add(999)
        this.setMessage('Its shell holds. Wait for the exposed core.', 0.9)
        return
      }

      boss.hp -= 1
      boss.stun = 0.32
      this.enterBossRecover(boss.enraged ? 0.35 : 0.52)
      boss.vx = this.player.facing * 240
      this.struckEnemies.add(999)
      this.applyHitFeedback(boss.hp <= 1 ? 'kill' : 'heavy')

      if (boss.hp <= 0) {
        boss.hp = 0
        boss.vx = 0
        boss.vy = 0
        this.bossHazards.length = 0
        this.beginBossDefeatSequence()
      }
    }
  }

  private handleEnemyContact(): void {
    if (this.player.hurtTimer > 0) {
      return
    }

    for (const enemy of this.world.enemies) {
      if (enemy.hp <= 0 || !intersects(enemy, this.player)) {
        continue
      }

      this.player.hp -= 1
      this.player.hurtTimer = 1
      this.player.vx = enemy.x > this.player.x ? -280 : 280
      this.player.vy = -260
      this.flashColor = '255,120,120'
      this.flashTimer = 0.16
      this.startShake(0.12, 8)
      this.setMessage('You were struck. Return to a checkpoint if your health breaks.', 1.8)

      if (this.player.hp <= 0) {
        this.respawn()
      }

      return
    }

    const boss = this.world.boss

    if (boss.hp > 0 && boss.awake && intersects(boss, this.player)) {
      this.player.hp -= 2
      this.player.hurtTimer = 1.1
      this.player.vx = boss.x > this.player.x ? -380 : 380
      this.player.vy = -340
      this.flashColor = '255,120,120'
      this.flashTimer = 0.2
      this.startShake(0.16, 10)
      this.setMessage(`${boss.name} crushes through your guard.`, 1.8)

      if (this.player.hp <= 0) {
        this.respawn()
      }

      return
    }

    for (const hazard of this.bossHazards) {
      if (!intersects(hazard, this.player)) {
        continue
      }

      this.player.hp -= hazard.damage
      this.player.hurtTimer = 0.9
      this.player.vx = hazard.vx > 0 ? 320 : -320
      this.player.vy = -220
      this.flashColor = '255,120,120'
      this.flashTimer = 0.14
      this.startShake(0.1, 7)
      this.setMessage('The shockwave catches your footing.', 1.2)

      if (this.player.hp <= 0) {
        this.respawn()
      }

      return
    }
  }

  private handlePickups(): void {
    for (const pickup of this.world.pickups) {
      if (pickup.collected || !intersects(this.player, pickup)) {
        continue
      }

      pickup.collected = true

      if (pickup.id === 'dash') {
        this.player.hasDash = true
      } else if (pickup.id === 'doubleJump') {
        this.player.hasDoubleJump = true
      } else {
        this.player.hasSunThread = true
        this.player.maxHp = MAX_HEALTH + 1
      }

      this.player.hp = this.player.maxHp
      this.setMessage(`${pickup.title}: ${pickup.description}`, 4)
    }
  }

  private handleCheckpoints(): void {
    for (const checkpoint of this.world.checkpoints) {
      if (!intersects(this.player, checkpoint)) {
        continue
      }

      if (this.checkpoint !== checkpoint) {
        this.checkpoint.active = false
        checkpoint.active = true
        this.checkpoint = checkpoint
        this.setMessage(`Checkpoint attuned: ${checkpoint.name}.`, 2.4)
      }
    }
  }

  private handleGoal(): void {
    if (!this.player.hasDash || !this.player.hasDoubleJump || this.world.boss.hp > 0 || !intersects(this.player, this.world.beacon)) {
      return
    }

    this.world.beacon.lit = true
    this.won = true
    this.setMessage('The beacon answers. Prototype clear.', 8)
  }

  private handleFalls(): void {
    if (this.player.y <= this.world.height + 120) {
      return
    }

    this.setMessage('You vanished into the chasm and returned to the last shrine.', 2.2)
    this.respawn()
  }

  private respawn(): void {
    this.player.x = this.checkpoint.respawnX
    this.player.y = this.checkpoint.respawnY
    this.player.vx = 0
    this.player.vy = 0
    this.player.hp = this.player.maxHp
    this.player.hurtTimer = 0
    this.player.dashTimer = 0
    this.player.skillCooldown = 0
    this.player.jumpsUsed = 0
    this.projectiles.length = 0
    this.bossHazards.length = 0

    if (this.world.boss.hp > 0) {
      this.resetBoss()
    }
  }

  private updateArea(): void {
    const nextArea = getAreaName(this.player.x)

    if (nextArea !== this.currentArea) {
      this.currentArea = nextArea
      this.setMessage(`Entered ${nextArea}.`, 1.8)
    }
  }

  private updateCamera(deltaSeconds: number): void {
    const targetX = clamp(this.player.x + this.player.w * 0.5 - VIEW_WIDTH * 0.5, 0, this.world.width - VIEW_WIDTH)
    const targetY = clamp(this.player.y + this.player.h * 0.5 - VIEW_HEIGHT * 0.58, 0, this.world.height - VIEW_HEIGHT)

    this.cameraX = moveTowards(this.cameraX, targetX, 1500 * deltaSeconds)
    this.cameraY = moveTowards(this.cameraY, targetY, 1200 * deltaSeconds)
  }

  private syncHud(): void {
    this.hud.areaName.textContent = this.currentArea || getAreaName(this.player.x)
    this.hud.bossHealth.textContent = getBossStatus(this.world.boss, this.player)
    this.hud.health.textContent = `${this.player.hp} / ${this.player.maxHp}`
    this.hud.abilities.textContent = getAbilityText(this.player)
    this.hud.objective.textContent = this.won ? 'Beacon restored. You reached the end of the prototype.' : getObjectiveText(this.player, this.world.boss)
    this.hud.hint.textContent = this.messageTimer > 0 || this.won ? this.messageText : getAmbientHint(this.player, this.world.boss)
  }

  private resetBoss(): void {
    const boss = this.world.boss
    boss.x = boss.spawnX
    boss.y = boss.spawnY
    boss.vx = 0
    boss.vy = 0
    boss.hp = boss.maxHp
    boss.stun = 0
    boss.coreExposed = false
    boss.armorFlash = 0
    boss.phase = 'prowl'
    boss.phaseTimer = 0.9
    boss.phaseTriggered = false
    boss.attackIndex = 0
    boss.targetX = boss.spawnX
    boss.awake = false
    boss.enraged = false
    boss.direction = -1
  }

  private setMessage(message: string, durationSeconds: number): void {
    this.messageText = message
    this.messageTimer = durationSeconds
  }

  private applyHitFeedback(intensity: 'light' | 'heavy' | 'kill'): void {
    if (intensity === 'light') {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.03)
      this.startShake(0.08, 4)
      this.flashColor = '255,244,214'
      this.flashTimer = Math.max(this.flashTimer, 0.05)
      return
    }

    if (intensity === 'heavy') {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.05)
      this.startShake(0.12, 7)
      this.flashColor = '255,230,176'
      this.flashTimer = Math.max(this.flashTimer, 0.08)
      return
    }

    this.hitstopTimer = Math.max(this.hitstopTimer, 0.08)
    this.startShake(0.28, 14)
    this.flashColor = '255,246,220'
    this.flashTimer = Math.max(this.flashTimer, 0.16)
  }

  private startShake(durationSeconds: number, strength: number): void {
    this.shakeTimer = Math.max(this.shakeTimer, durationSeconds)
    this.shakeStrength = Math.max(this.shakeStrength, strength)
  }

  private beginBossDefeatSequence(): void {
    this.bossDefeatTimer = 1.8
    this.applyHitFeedback('kill')
    this.setMessage(`${this.world.boss.name} falls. Wind bridges rise toward the beacon crown.`, 3.2)
  }

  private decayFeedback(deltaSeconds: number): void {
    this.shakeTimer = Math.max(0, this.shakeTimer - deltaSeconds)
    this.flashTimer = Math.max(0, this.flashTimer - deltaSeconds)

    if (this.shakeTimer === 0) {
      this.shakeStrength = 0
    }

    if (this.bossDefeatTimer > 0) {
      this.bossDefeatTimer = Math.max(0, this.bossDefeatTimer - deltaSeconds)
    }
  }

  private getActiveSolids(): Array<Rect | Gate> {
    const activeGates = this.world.gates.filter((gate) => !(this.player.hasDash && this.player.dashTimer > 0 && intersects(this.player, expand(gate, 18))))
    const arenaPlatforms = getBossArenaPlatforms(this.world.boss)
    const postBossShortcut = getPostBossShortcutPlatforms(this.world.boss)

    if (this.world.boss.awake && this.world.boss.hp > 0) {
      return [...this.world.solids, ...arenaPlatforms, ...postBossShortcut, ...activeGates, ...getBossArenaSeals(this.world.boss)]
    }

    return [...this.world.solids, ...arenaPlatforms, ...postBossShortcut, ...activeGates]
  }

  private render(timeSeconds: number): void {
    this.ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    drawBackdrop(this.ctx, this.cameraX, this.cameraY, timeSeconds)

    this.ctx.save()
    const shakeX = this.shakeTimer > 0 ? (Math.random() * 2 - 1) * this.shakeStrength : 0
    const shakeY = this.shakeTimer > 0 ? (Math.random() * 2 - 1) * this.shakeStrength * 0.55 : 0
    this.ctx.translate(shakeX - Math.round(this.cameraX), shakeY - Math.round(this.cameraY))

    for (const solid of this.world.solids) {
      drawPlatform(this.ctx, solid)
    }

    for (const gate of this.world.gates) {
      drawGate(this.ctx, gate, this.player.hasDash)
    }

    for (const arenaPlatform of getBossArenaPlatforms(this.world.boss)) {
      drawPlatform(this.ctx, arenaPlatform)
    }

    for (const shortcutPlatform of getPostBossShortcutPlatforms(this.world.boss)) {
      drawWindBridge(this.ctx, shortcutPlatform, timeSeconds)
    }

    if (this.world.boss.awake && this.world.boss.hp > 0) {
      for (const seal of getBossArenaSeals(this.world.boss)) {
        drawArenaSeal(this.ctx, seal)
      }
    }

    for (const checkpoint of this.world.checkpoints) {
      drawCheckpoint(this.ctx, checkpoint)
    }

    for (const pickup of this.world.pickups) {
      if (!pickup.collected) {
        drawPickup(this.ctx, pickup, timeSeconds)
      }
    }

    drawBeacon(this.ctx, this.world.beacon, this.won, timeSeconds)

    for (const enemy of this.world.enemies) {
      if (enemy.hp > 0) {
        drawEnemy(this.ctx, enemy, timeSeconds)
      }
    }

    if (this.world.boss.hp > 0) {
      drawBoss(this.ctx, this.world.boss, timeSeconds)
    }

    for (const hazard of this.bossHazards) {
      drawBossHazard(this.ctx, hazard, timeSeconds)
    }

    for (const projectile of this.projectiles) {
      drawPlayerProjectile(this.ctx, projectile, timeSeconds)
    }

    drawPlayer(this.ctx, this.player, timeSeconds)
    this.ctx.restore()

    if (this.bossDefeatTimer > 0) {
      this.ctx.fillStyle = `rgba(255, 210, 140, ${Math.min(0.35, this.bossDefeatTimer * 0.18)})`
      this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    }

    if (this.flashTimer > 0) {
      this.ctx.fillStyle = `rgba(${this.flashColor}, ${Math.min(0.22, this.flashTimer * 1.6)})`
      this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    }
  }
}

export function startGame(hud: HudBindings): void {
  const game = new MetroidvaniaGame(hud)
  game.start()
}

function createWorld(): World {
  const solids: Rect[] = [
    { x: 0, y: 1056, w: 930, h: 288 },
    { x: 980, y: 1056, w: 1260, h: 288 },
    { x: 2280, y: 1056, w: 980, h: 288 },
    { x: 3360, y: 1056, w: 1248, h: 288 },
    { x: 0, y: 0, w: 24, h: 1344 },
    { x: 4584, y: 0, w: 24, h: 1344 },
    { x: 280, y: 924, w: 170, h: 24 },
    { x: 520, y: 834, w: 180, h: 24 },
    { x: 770, y: 738, w: 180, h: 24 },
    { x: 970, y: 654, w: 170, h: 24 },
    { x: 1300, y: 800, w: 440, h: 24 },
    { x: 1730, y: 946, w: 160, h: 24 },
    { x: 1930, y: 850, w: 150, h: 24 },
    { x: 2130, y: 756, w: 150, h: 24 },
    { x: 2340, y: 664, w: 170, h: 24 },
    { x: 2520, y: 578, w: 180, h: 24 },
    { x: 2970, y: 930, w: 160, h: 24 },
    { x: 3140, y: 842, w: 110, h: 24 },
    { x: 3320, y: 756, w: 132, h: 24 },
    { x: 3500, y: 676, w: 136, h: 24 },
    { x: 3190, y: 640, w: 110, h: 24 },
    { x: 3040, y: 736, w: 88, h: 24 },
    { x: 3380, y: 566, w: 108, h: 24 },
    { x: 2870, y: 844, w: 112, h: 24 },
    { x: 2740, y: 752, w: 108, h: 24 },
    { x: 2610, y: 660, w: 104, h: 24 },
    { x: 2540, y: 578, w: 120, h: 24 },
    { x: 2888, y: 612, w: 96, h: 24 },
    { x: 2762, y: 522, w: 104, h: 24 },
    { x: 4100, y: 838, w: 116, h: 24 },
    { x: 4240, y: 726, w: 108, h: 24 },
    { x: 4090, y: 616, w: 120, h: 24 },
    { x: 3920, y: 504, w: 126, h: 24 },
    { x: 4060, y: 396, w: 120, h: 24 },
  ]

  const gates: Gate[] = [
    {
      x: 1544,
      y: 824,
      w: 32,
      h: 232,
      hint: 'The aether gate resists normal movement. Dash through it with Shift after taking the shrine above.',
    },
  ]

  const checkpoints: Checkpoint[] = [
    {
      x: 96,
      y: 1000,
      w: 38,
      h: 56,
      name: 'Lower Gate',
      respawnX: 120,
      respawnY: 1014,
      active: true,
    },
    {
      x: 2570,
      y: 522,
      w: 38,
      h: 56,
      name: 'Wind Reliquary',
      respawnX: 2558,
      respawnY: 536,
      active: false,
    },
    {
      x: 3328,
      y: 700,
      w: 38,
      h: 56,
      name: 'Sunspire Gate',
      respawnX: 3316,
      respawnY: 714,
      active: false,
    },
  ]

  const pickups: Pickup[] = [
    {
      x: 1034,
      y: 604,
      w: 42,
      h: 50,
      id: 'dash',
      title: 'Aether Dash',
      description: 'Shift now propels you through phase barriers and across long gaps.',
      collected: false,
    },
    {
      x: 2584,
      y: 528,
      w: 42,
      h: 50,
      id: 'doubleJump',
      title: 'Wing Sigil',
      description: 'A second jump blooms in midair. The tower path is open.',
      collected: false,
    },
    {
      x: 2792,
      y: 472,
      w: 42,
      h: 50,
      id: 'echoHeart',
      title: 'Sun Thread Relic',
      description: 'Your vessel deepens to 6 vitality, and Echo Blade returns faster.',
      collected: false,
    },
  ]

  const beacon: Beacon = {
    x: 4024,
    y: 336,
    w: 40,
    h: 90,
    lit: false,
  }

  const enemies: Enemy[] = [
    {
      id: 1,
      x: 600,
      y: 1018,
      w: 34,
      h: 38,
      originX: 600,
      minX: 520,
      maxX: 860,
      vx: 0,
      hp: 2,
      stun: 0,
      direction: 1,
    },
    {
      id: 2,
      x: 1870,
      y: 1018,
      w: 34,
      h: 38,
      originX: 1870,
      minX: 1720,
      maxX: 2200,
      vx: 0,
      hp: 2,
      stun: 0,
      direction: -1,
    },
    {
      id: 3,
      x: 3200,
      y: 796,
      w: 34,
      h: 38,
      originX: 3200,
      minX: 3180,
      maxX: 3330,
      vx: 0,
      hp: 2,
      stun: 0,
      direction: 1,
    },
  ]

  const boss: Boss = {
    name: 'Aurex, Hollow Warden',
    x: 3596,
    y: 984,
    w: 72,
    h: 72,
    spawnX: 3596,
    spawnY: 984,
    arenaLeft: 3440,
    arenaRight: 4290,
    vx: 0,
    vy: 0,
    hp: 8,
    maxHp: 8,
    stun: 0,
    direction: -1,
    awake: false,
    enraged: false,
    coreExposed: false,
    armorFlash: 0,
    phase: 'prowl',
    phaseTimer: 0.9,
    phaseTriggered: false,
    attackIndex: 0,
    targetX: 3596,
  }

  return {
    width: 4608,
    height: 1344,
    solids,
    gates,
    checkpoints,
    pickups,
    beacon,
    enemies,
    boss,
  }
}

function drawBackdrop(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, timeSeconds: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT)
  gradient.addColorStop(0, '#1c1a2d')
  gradient.addColorStop(0.52, '#102033')
  gradient.addColorStop(1, '#070a12')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)

  for (let index = 0; index < 64; index += 1) {
    const starX = ((index * 157) % 1200) - (cameraX * 0.1 % 1200)
    const starY = ((index * 91) % 540) - (cameraY * 0.03 % 540)
    const pulse = 0.35 + ((Math.sin(timeSeconds * 0.8 + index) + 1) * 0.22)
    ctx.fillStyle = `rgba(255, 240, 209, ${pulse})`
    ctx.fillRect(starX, starY, 2, 2)
  }

  ctx.fillStyle = 'rgba(23, 42, 56, 0.7)'
  for (let index = 0; index < 6; index += 1) {
    const x = (index * 220 - cameraX * 0.2) % 1320
    const height = 120 + index * 18
    ctx.beginPath()
    ctx.moveTo(x, VIEW_HEIGHT)
    ctx.lineTo(x + 110, VIEW_HEIGHT - height)
    ctx.lineTo(x + 230, VIEW_HEIGHT)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(168, 98, 46, 0.16)'
  ctx.beginPath()
  ctx.ellipse(150 - cameraX * 0.08, 110, 140, 80, 0.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawPlatform(ctx: CanvasRenderingContext2D, platform: Rect): void {
  ctx.fillStyle = '#2a303f'
  ctx.fillRect(platform.x, platform.y, platform.w, platform.h)
  ctx.fillStyle = '#5a4c43'
  ctx.fillRect(platform.x, platform.y, platform.w, 8)
  ctx.fillStyle = 'rgba(255, 226, 166, 0.06)'
  ctx.fillRect(platform.x + 8, platform.y + 8, Math.max(0, platform.w - 16), Math.max(0, platform.h - 16))
}

function drawGate(ctx: CanvasRenderingContext2D, gate: Gate, hasDash: boolean): void {
  ctx.fillStyle = hasDash ? 'rgba(123, 211, 255, 0.18)' : 'rgba(123, 211, 255, 0.34)'
  ctx.fillRect(gate.x, gate.y, gate.w, gate.h)

  ctx.strokeStyle = hasDash ? 'rgba(171, 237, 255, 0.5)' : '#9ae4ff'
  ctx.lineWidth = 2
  ctx.strokeRect(gate.x, gate.y, gate.w, gate.h)

  for (let stripe = 0; stripe < gate.h; stripe += 12) {
    ctx.fillStyle = stripe % 24 === 0 ? 'rgba(229, 252, 255, 0.42)' : 'rgba(66, 184, 220, 0.24)'
    ctx.fillRect(gate.x + 4, gate.y + stripe, gate.w - 8, 4)
  }
}

function drawCheckpoint(ctx: CanvasRenderingContext2D, checkpoint: Checkpoint): void {
  ctx.fillStyle = checkpoint.active ? '#f6cf73' : '#6d7587'
  ctx.fillRect(checkpoint.x + 14, checkpoint.y, 10, checkpoint.h)
  ctx.fillStyle = checkpoint.active ? 'rgba(255, 222, 137, 0.36)' : 'rgba(157, 169, 191, 0.2)'
  ctx.beginPath()
  ctx.arc(checkpoint.x + 19, checkpoint.y + 12, 18, 0, Math.PI * 2)
  ctx.fill()
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, timeSeconds: number): void {
  const bob = Math.sin(timeSeconds * 2.6 + pickup.x * 0.01) * 6
  const centerX = pickup.x + pickup.w * 0.5
  const centerY = pickup.y + pickup.h * 0.5 + bob
  const color = pickup.id === 'dash' ? '#8ef3ff' : '#ffdc8f'

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - 18)
  ctx.lineTo(centerX + 14, centerY)
  ctx.lineTo(centerX, centerY + 18)
  ctx.lineTo(centerX - 14, centerY)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = pickup.id === 'dash' ? 'rgba(142, 243, 255, 0.22)' : 'rgba(255, 220, 143, 0.22)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 34, 0, Math.PI * 2)
  ctx.fill()
}

function drawBeacon(ctx: CanvasRenderingContext2D, beacon: Beacon, lit: boolean, timeSeconds: number): void {
  ctx.fillStyle = '#4a5668'
  ctx.fillRect(beacon.x + 12, beacon.y, 16, beacon.h)
  ctx.fillStyle = lit ? '#ffe297' : '#73809a'
  ctx.beginPath()
  ctx.arc(beacon.x + 20, beacon.y - 2, 22, 0, Math.PI * 2)
  ctx.fill()

  if (lit) {
    const pulse = 40 + Math.sin(timeSeconds * 3) * 8
    ctx.fillStyle = 'rgba(255, 226, 151, 0.24)'
    ctx.beginPath()
    ctx.arc(beacon.x + 20, beacon.y - 2, pulse, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, timeSeconds: number): void {
  const pulse = Math.sin(timeSeconds * 6 + enemy.originX * 0.02) * 2
  ctx.fillStyle = '#8d5342'
  ctx.fillRect(enemy.x, enemy.y + 8, enemy.w, enemy.h - 8)
  ctx.fillStyle = '#d6b37a'
  ctx.fillRect(enemy.x + 6, enemy.y, enemy.w - 12, 16 + pulse)
  ctx.fillStyle = '#11131a'
  ctx.fillRect(enemy.x + (enemy.direction > 0 ? 20 : 8), enemy.y + 5, 5, 5)
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, timeSeconds: number): void {
  const pulse = 0.4 + (Math.sin(timeSeconds * 5) + 1) * 0.12

  ctx.fillStyle = `rgba(${boss.enraged ? '255, 120, 72' : '214, 114, 70'}, ${boss.awake ? pulse : 0.18})`
  ctx.beginPath()
  ctx.ellipse(boss.x + boss.w * 0.5, boss.y + boss.h * 0.62, 56, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = boss.armorFlash > 0 ? '#d7efff' : boss.phase === 'charge' || boss.phase === 'waveCast' ? '#f1d47b' : boss.enraged ? '#ac4736' : '#8e5242'
  ctx.fillRect(boss.x + 10, boss.y + 24, boss.w - 20, boss.h - 24)
  ctx.fillStyle = '#dcb78b'
  ctx.fillRect(boss.x + 18, boss.y + 2, boss.w - 36, 28)
  ctx.fillStyle = '#40241d'
  ctx.fillRect(boss.x + (boss.direction > 0 ? boss.w - 28 : 18), boss.y + 10, 8, 8)
  ctx.fillRect(boss.x + (boss.direction > 0 ? boss.w - 46 : 36), boss.y + 10, 8, 8)

  if (boss.coreExposed) {
    ctx.fillStyle = boss.enraged ? '#9bf8ff' : '#c8f3ff'
    ctx.beginPath()
    ctx.arc(boss.x + boss.w * 0.5, boss.y + 42, 11 + Math.sin(timeSeconds * 10) * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255, 240, 207, 0.16)'
  ctx.fillRect(boss.x + 8, boss.y - 14, boss.w - 16, 6)
  ctx.fillStyle = '#f07d4c'
  ctx.fillRect(boss.x + 8, boss.y - 14, (boss.w - 16) * (boss.hp / boss.maxHp), 6)
}

function drawPlayerProjectile(ctx: CanvasRenderingContext2D, projectile: PlayerProjectile, timeSeconds: number): void {
  const shimmer = 0.55 + (Math.sin(timeSeconds * 14 + projectile.id) + 1) * 0.12
  ctx.fillStyle = `rgba(156, 240, 255, ${shimmer})`
  ctx.beginPath()
  ctx.ellipse(projectile.x + projectile.w * 0.5, projectile.y + projectile.h * 0.5, projectile.w * 0.55, projectile.h * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(241, 252, 255, 0.9)'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawBossHazard(ctx: CanvasRenderingContext2D, hazard: BossHazard, timeSeconds: number): void {
  const wave = 0.42 + (Math.sin(timeSeconds * 18 + hazard.id) + 1) * 0.08
  ctx.fillStyle = `rgba(255, 162, 98, ${wave})`
  ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h)
  ctx.fillStyle = 'rgba(255, 227, 164, 0.6)'
  ctx.fillRect(hazard.x, hazard.y + 2, hazard.w, 4)
}

function drawArenaSeal(ctx: CanvasRenderingContext2D, seal: Rect): void {
  ctx.fillStyle = 'rgba(117, 204, 255, 0.18)'
  ctx.fillRect(seal.x, seal.y, seal.w, seal.h)
  ctx.strokeStyle = 'rgba(170, 234, 255, 0.75)'
  ctx.lineWidth = 2
  ctx.strokeRect(seal.x + 2, seal.y + 2, seal.w - 4, seal.h - 4)
}

function drawWindBridge(ctx: CanvasRenderingContext2D, bridge: Rect, timeSeconds: number): void {
  const pulse = 0.28 + (Math.sin(timeSeconds * 5 + bridge.x * 0.01) + 1) * 0.08
  ctx.fillStyle = `rgba(134, 227, 255, ${pulse})`
  ctx.fillRect(bridge.x, bridge.y, bridge.w, bridge.h)
  ctx.strokeStyle = 'rgba(224, 250, 255, 0.82)'
  ctx.lineWidth = 2
  ctx.strokeRect(bridge.x + 2, bridge.y + 2, bridge.w - 4, bridge.h - 4)
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, timeSeconds: number): void {
  if (player.hurtTimer > 0 && Math.floor(timeSeconds * 18) % 2 === 0) {
    return
  }

  ctx.fillStyle = player.hasDash ? '#ecf8ff' : '#f3ead8'
  ctx.fillRect(player.x + 6, player.y, 16, 14)
  ctx.fillStyle = '#c87f5f'
  ctx.fillRect(player.x + 3, player.y + 14, 22, 28)
  ctx.fillStyle = player.hasDoubleJump ? '#f0cf73' : '#556173'
  ctx.fillRect(player.x + (player.facing > 0 ? 18 : 2), player.y + 16, 8, 10)

  if (player.dashTimer > 0) {
    ctx.fillStyle = 'rgba(144, 233, 255, 0.24)'
    ctx.fillRect(player.x - player.facing * 24, player.y + 8, 52, 24)
  }

  if (player.attackTimer > 0) {
    ctx.strokeStyle = '#ffd991'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(player.x + player.w * 0.5 + player.facing * 18, player.y + 20, 24, player.facing > 0 ? -0.8 : Math.PI - 0.8, player.facing > 0 ? 0.8 : Math.PI + 0.8)
    ctx.stroke()
  }
}

function getAreaName(x: number): string {
  if (x < 1260) {
    return 'Lower Gate'
  }

  if (x < 2840) {
    return 'Shiver Vault'
  }

  if (x < 3440) {
    return 'Sunspire Ascent'
  }

  if (x < 3920) {
    return 'Sunspire Arena'
  }

  return 'Beacon Crown'
}

function getAbilityText(player: Player): string {
  const abilities: string[] = ['Echo Blade']

  if (player.hasDash) {
    abilities.push('Dash')
  }

  if (player.hasDoubleJump) {
    abilities.push('Double Jump')
  }

  if (player.hasSunThread) {
    abilities.push('Sun Thread')
  }

  return abilities.length > 0 ? abilities.join(' / ') : 'None'
}

function getObjectiveText(player: Player, boss: Boss): string {
  if (!player.hasDash) {
    return 'Reach the shrine above the ruins.'
  }

  if (!player.hasDoubleJump) {
    return 'Dash through the phase gate and claim the Wing Sigil.'
  }

  if (!player.hasSunThread && !boss.awake) {
    return 'Search the ascent for an optional relic, then face Aurex.'
  }

  if (boss.hp > 0) {
    return 'Break Aurex open in the arena, then climb the tower to the beacon.'
  }

  return 'Take the wind bridges and climb to the beacon.'
}

function getAmbientHint(player: Player, boss: Boss): string {
  if (!player.hasDash) {
    return 'Use basic jumps to reach the altar above the opening ruins.'
  }

  if (!player.hasDoubleJump) {
    return 'Phase gates only yield while the dash is active.'
  }

  if (!player.hasSunThread && !boss.awake) {
    return 'A warmer current slips west of the ascent. A hidden relic can strengthen Echo Blade before Aurex.'
  }

  if (boss.hp <= 0) {
    return 'The tower is clear. Use the eastern terraces to spiral up to the beacon.'
  }

  return 'Echo Blade interrupts cast windows. Melee only works when Aurex exposes its core after a failed attack.'
}

function getBossStatus(boss: Boss, player: Player): string {
  if (!player.hasDoubleJump) {
    return 'Dormant'
  }

  if (boss.hp <= 0) {
    return 'Aurex Fallen'
  }

  if (!boss.awake) {
    return 'Awaiting the challenger'
  }

  return `${boss.name} ${boss.hp} / ${boss.maxHp}${boss.coreExposed ? ' Core Exposed' : boss.enraged ? ' Enraged' : ''}`
}

function getBossArenaSeals(boss: Boss): Rect[] {
  return [
    { x: boss.arenaLeft - 20, y: 896, w: 20, h: 160 },
    { x: boss.arenaRight, y: 896, w: 20, h: 160 },
  ]
}

function getBossArenaPlatforms(boss: Boss): Rect[] {
  const platforms: Rect[] = [
    { x: 3470, y: 910, w: 126, h: 24 },
    { x: 3660, y: 834, w: 142, h: 24 },
    { x: 3950, y: 910, w: 126, h: 24 },
    { x: 3850, y: 760, w: 118, h: 24 },
  ]

  if (!boss.enraged) {
    platforms.push({ x: 3736, y: 704, w: 118, h: 24 })
  }

  return platforms
}

function getPostBossShortcutPlatforms(boss: Boss): Rect[] {
  if (boss.hp > 0) {
    return []
  }

  return [
    { x: 3856, y: 640, w: 114, h: 18 },
    { x: 3696, y: 566, w: 112, h: 18 },
    { x: 3534, y: 492, w: 112, h: 18 },
  ]
}

function getSkillCooldownDuration(player: Player): number {
  return player.hasSunThread ? 1 : 1.6
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function moveTowards(current: number, target: number, amount: number): number {
  if (current < target) {
    return Math.min(target, current + amount)
  }

  if (current > target) {
    return Math.max(target, current - amount)
  }

  return target
}

function expand(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  }
}