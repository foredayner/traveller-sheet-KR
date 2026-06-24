// ─────────────────────────────────────────────────────────────
//  sheet.js — TravellerChargenSheet v2
// ─────────────────────────────────────────────────────────────

const _ActorSheet = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet

// ── 유틸 ──────────────────────────────────────────────────────
// ── 유틸 ──────────────────────────────────────────────────────
// 장착 중인 아이템의 notes에서 특성치/방어구 보너스 패턴을 추출
// 예: "근력·민첩 +4", "STR+4", "근력 +6", "장갑 +3", "방어 +1"
export function parseItemBonuses(notes = '') {
  const bonus = { STR: 0, DEX: 0, END: 0, INT: 0, EDU: 0, SOC: 0, protection: 0 }
  const STAT_MAP = {
    '근력':'STR', '민첩':'DEX', '인내':'END', '지능':'INT', '교육':'EDU', '지위':'SOC',
    STR:'STR', DEX:'DEX', END:'END', INT:'INT', EDU:'EDU', SOC:'SOC',
  }
  const STAT_WORD = '근력|민첩|인내|지능|교육|지위|STR|DEX|END|INT|EDU|SOC'
  const statRe = new RegExp(`((?:${STAT_WORD})(?:\\s*(?:·|,|/|또는)\\s*(?:${STAT_WORD}))*)\\s*\\+\\s*(\\d+)`, 'g')
  let m
  while ((m = statRe.exec(notes))) {
    const val = parseInt(m[2])
    const stats = m[1].match(new RegExp(STAT_WORD, 'g')) ?? []
    for (const s of stats) bonus[STAT_MAP[s]] += val
  }
  const armRe = /(?:장갑|방어)\s*\+\s*(\d+)/
  const am = notes.match(armRe)
  if (am) bonus.protection += parseInt(am[1])
  return bonus
}

// "진공복 1" 같은 방어구 요구 기능 문자열을 파싱
const ARMOUR_SKILL_MAP = { '진공복':'vaccsuit', '기계공학':'engineer', '전자기기':'electronics', '운동':'athletics' }
export function parseArmourSkillReq(str = '') {
  const m = str.trim().match(/^(\S+)\s*(\d+)$/)
  if (!m) return null
  const id = ARMOUR_SKILL_MAP[m[1]]
  if (!id) return null
  return { name: m[1], id, level: parseInt(m[2]) }
}

// 장착/이식된 아이템이 부여 중인 보너스를 짧은 문자열로 표시
function grantLabel(item) {
  const grant = item.getFlag?.('traveller-sheet-KR', 'grant')
  if (!grant) return null
  const parts = []
  for (const k of ['STR','DEX','END','INT','EDU','SOC']) if (grant[k]) parts.push(`${k}+${grant[k]}`)
  if ('computerPrev' in grant) parts.push(`컴퓨터/${item.system?.notes?.match(/컴퓨터\/(\d+)/)?.[1] ?? '?'}`)
  if (grant.armourPenalty) parts.push(`전판정 ${grant.armourPenalty}`)
  if (grant.skillChoice) parts.push(`${SKILL_KO[grant.skillChoice.key] ?? grant.skillChoice.key}+1`)
  return parts.length ? parts.join(', ') : null
}

export function calcDM(val) {
  if (val <= 0)  return -3
  if (val <= 2)  return -2
  if (val <= 5)  return -1
  if (val <= 8)  return  0
  if (val <= 11) return +1
  if (val <= 14) return +2
  return +3
}
export function dmStr(val) { const d = calcDM(val); return d >= 0 ? `+${d}` : `${d}` }

export const WEAPON_LEGALITY = {
  0:'(0) 폭발물',1:'(1) 에너지 무기',2:'(2) 군용',3:'(3) 돌격용',
  4:'(4) 은닉 가능',5:'(5) 일반 화기',6:'(6) 산탄총류',7:'(7) 도검류',
  8:'(8) 일반 무기',9:'(9) 무해',
}
export const ARMOUR_LEGALITY = {
  0:'(0) 전투 강화복',1:'(1) 전투용',2:'(2) 방탄복',3:'(3) 직물',
  4:'(4) 메시',7:'(7) 외부 노출',8:'(8) 은닉 가능',9:'(9) 일반 의복',
}
export const CATEGORY_LABEL = {
  weapon:'무기', armour:'방어구', augment:'강화 장치', item:'장비', cargo:'화물',
}

// ── 기능 한글 번역 테이블 ─────────────────────────────────────
export const SKILL_KO = {
  // 무기 기능 specialty
  energy:'에너지', slug:'실탄', unarmed:'비무장', blade:'도검', bludgeon:'타격', artillery:'포술', portable:'휴대형',
  admin:'행정', advocate:'변호', animals:'동물', art:'예술',
  astrogation:'우주 항법', athletics:'운동', broker:'중개',
  carouse:'유흥', deception:'기만', diplomat:'외교',
  drive:'운전', electronics:'전자기기', engineer:'공학',
  explosives:'폭발물', flyer:'비행', gambler:'도박',
  gunner:'포격', guncombat:'사격', heavyweapons:'중화기',
  independence:'독립심', investigate:'수사',
  jackofalltrades:'다재다능', language:'언어',
  leadership:'지도력', mechanic:'정비', medic:'의료',
  melee:'근접전', navigation:'항법', persuade:'설득',
  pilot:'우주 비행', profession:'직업', recon:'경계',
  science:'학문', seafarer:'항해', stealth:'은신',
  steward:'접객', streetwise:'세상물정', survival:'생존',
  tactics:'전술', vaccsuit:'진공복',
  telepathy:'텔레파시', clairvoyance:'투시',
  telekinesis:'염동력', awareness:'지각', teleportation:'순간 이동',
  // 전문화
  handling:'친화력', vetinary:'수의학', training:'훈련',
  performer:'공연', holography:'홀로그램', instrument:'악기',
  visualMedia:'영상 매체', write:'글쓰기',
  dexterity:'민첩(운동)', endurance:'인내(운동)', strength:'근력(운동)',
  hovercraft:'호버크래프트', mole:'굴착', track:'궤도형',
  walker:'보행형', wheel:'바퀴형',
  comms:'통신', computers:'컴퓨터', remoteOps:'원격 조작', sensors:'감지기',
  mDrive:'기동 추진', jDrive:'점프 추진', lifeSupport:'생명 유지', power:'전력',
  airship:'비행선', grav:'반중력', ornithopter:'날갯짓 비행',
  rotor:'회전익형', wing:'고정익형',
  turret:'포탑', ortillery:'궤도 포격', screen:'방어막', capital:'주력함',
  archaic:'구식 화기', energy:'에너지형', slug:'탄환형',
  artillery:'포병', portable:'휴대형', vehicle:'탑승형',
  galanglic:'갈란글릭', vilani:'빌라니', zdetl:'즈데틀',
  oynprith:'오인프리스', trokh:'트로크', gvegh:'그베그',
  unarmed:'비무장', blade:'도검', bludgeon:'둔기', natural:'자연 무기',
  smallCraft:'소형선', spacecraft:'우주선', capitalShips:'주력함',
  belter:'소행성 채굴', biologicals:'생물학적 산물',
  civilEngineering:'토목 공학', construction:'건설',
  hydroponics:'수경 재배', polymers:'폴리머', robotics:'로봇 공학',
  archaeology:'고고학', astronomy:'천문학', biology:'생물학',
  chemistry:'화학', cosmology:'우주론', cybernetics:'사이버네틱스',
  economics:'경제학', genetics:'유전학', history:'역사학',
  linquistics:'언어학', philosophy:'철학', physics:'물리학',
  planetology:'행성학', psionicology:'초능력학',
  psychology:'심리학', sophontology:'소폰트학', xenology:'외계 생물학',
  oceanShips:'해양 선박', personal:'개인선', sail:'범선', submarine:'잠수함',
  military:'지상전', naval:'우주전',
}
export function getSkillLabel(key, specKey) {
  const base = SKILL_KO[key] || key
  if (!specKey) return base
  const spec = SKILL_KO[specKey] || specKey
  return `${base} (${spec})`
}

// ── 주사위 굴림 다이얼로그 ─────────────────────────────────────
// 인벤토리/장착 아이템 중 이 기능(skillKey) 또는 특성치(chaKey)에 적용 가능한 DM 보너스 목록
// __로 시작하는 특수 태그 일부는 특성치 굴림에 매칭, 나머지는 "참고용"으로만 표시
const CHA_TAG = { STR:'__str', DEX:'__dex', END:'__end', INT:'__int', EDU:'__edu', SOC:'__soc' }
function getApplicableSkillDM(actor, skillKey, chaKey) {
  const out = []
  for (const item of actor.items) {
    const entries = item.system?.skillDM
    if (!entries?.length) continue
    // 방어구/강화장치/일반 장비는 장착·이식·휴대 상태에서만, cargo 등은 보유만으로 적용
    if (item.type === 'armour' && !item.system?.worn) continue
    if ((item.type === 'augment' || item.type === 'item') && !item.system?.active) continue
    for (const e of entries) {
      const isSpecial = e.skill?.startsWith('__')
      const matches = !isSpecial
        ? (skillKey && (e.skill === skillKey || e.skill === skillKey.split('.')[0]))
        : (chaKey && e.skill === CHA_TAG[chaKey])
      out.push({ itemName: item.name, dm: e.dm, label: e.label, matches, special: isSpecial })
    }
  }
  return out
}

class TcsRollDialog extends Dialog {
  constructor(actor, rollData, callback) {
    const { title, skillKey, skillVal, chaKey } = rollData

    const difficultyOptions = [
      { val: 4, label: '매우 쉬움 (4+)' },
      { val: 6, label: '쉬움 (6+)' },
      { val: 8, label: '일반 (8+)' },
      { val: 10, label: '어려움 (10+)' },
      { val: 12, label: '매우 어려움 (12+)' },
      { val: 14, label: '엄청나게 어려움 (14+)' },
    ]

    const chaOptions = ['STR','DEX','END','INT','EDU','SOC'].map(k => {
      const val = (actor.system.characteristics?.[k]?.value ?? 0)
      return `<option value="${k}" ${k === chaKey ? 'selected' : ''}>${k} (DM${dmStr(val)})</option>`
    }).join('')

    const diffOptions = difficultyOptions.map(d =>
      `<option value="${d.val}" ${d.val === 8 ? 'selected' : ''}>${d.label}</option>`
    ).join('')

    // 장착/보유 아이템의 적용 가능 DM 보너스
    const itemDMs = getApplicableSkillDM(actor, skillKey, chaKey)
    const autoDM  = itemDMs.filter(d => d.matches).reduce((s,d) => s + d.dm, 0)
    const itemDMHtml = itemDMs.length ? `
      <div class="tcs-roll-row" style="align-items:flex-start;">
        <label>아이템 보너스</label>
        <div class="tcs-roll-item-dms">
          ${itemDMs.map((d,i) => `
            <label class="tcs-roll-item-dm${d.special ? ' tcs-roll-item-dm-special' : ''}">
              <input type="checkbox" class="tcs-roll-item-dm-check" data-dm="${d.dm}" ${d.matches ? 'checked' : ''}>
              ${d.itemName} — ${d.label} (${d.dm >= 0 ? '+' : ''}${d.dm})
              ${d.special ? '<span class="tcs-roll-item-dm-note">조건부 — 직접 확인</span>' : ''}
            </label>
          `).join('')}
        </div>
      </div>
    ` : ''

    const content = `
      <div class="tcs-roll-dialog">
        <div class="tcs-roll-title">${title}</div>
        <div class="tcs-roll-skill-val">기능 레벨: <strong>${skillVal >= 0 ? skillVal : '미훈련(-3)'}</strong></div>
        <div class="tcs-roll-row">
          <label>특성치</label>
          <select id="tcs-roll-cha">${chaOptions}</select>
        </div>
        <div class="tcs-roll-row">
          <label>난이도</label>
          <select id="tcs-roll-diff">${diffOptions}</select>
        </div>
        <div class="tcs-roll-row">
          <label>굴림 유형</label>
          <select id="tcs-roll-type">
            <option value="normal">일반</option>
            <option value="boon">유리 (높은 2개)</option>
            <option value="bane">불리 (낮은 2개)</option>
          </select>
        </div>
        <div class="tcs-roll-row">
          <label>추가 DM</label>
          <input id="tcs-roll-dm" type="number" value="${autoDM}" style="width:60px">
        </div>
        ${itemDMHtml}
        <div class="tcs-roll-row">
          <label>굴림 모드</label>
          <select id="tcs-roll-mode">
            <option value="publicroll">공개</option>
            <option value="gmroll">GM만</option>
            <option value="blindroll">비공개</option>
            <option value="selfroll">본인만</option>
          </select>
        </div>
      </div>
    `

    super({
      title: `굴림: ${title}`,
      content,
      buttons: {
        roll: {
          label: '🎲 굴림',
          callback: html => {
            const cha    = html.find('#tcs-roll-cha').val()
            const diff   = parseInt(html.find('#tcs-roll-diff').val())
            const type   = html.find('#tcs-roll-type').val()
            const dm     = parseInt(html.find('#tcs-roll-dm').val()) || 0
            const mode   = html.find('#tcs-roll-mode').val()
            callback({ cha, diff, type, dm, mode, skillKey, skillVal, title })
          }
        },
        cancel: { label: '취소' }
      },
      default: 'roll',
    })
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.on('change', '.tcs-roll-item-dm-check', () => {
      let sum = 0
      html.find('.tcs-roll-item-dm-check:checked').each((_, el) => sum += parseInt(el.dataset.dm) || 0)
      html.find('#tcs-roll-dm').val(sum)
    })
  }
}

// ── 실제 굴림 실행 ────────────────────────────────────────────
async function executeRoll(actor, opts) {
  const { cha, diff, type, dm, mode, skillVal, title } = opts

  const chaVal = actor.system.characteristics?.[cha]?.value ?? 0
  const chaDM  = calcDM(chaVal)
  const sv     = skillVal >= 0 ? skillVal : -3
  const armourPenalty = actor.getFlag('traveller-sheet-KR', 'armourPenalty') ?? 0
  const totalDM = chaDM + sv + dm + armourPenalty

  let formula
  if (type === 'boon')      formula = `{3d6kh2}`
  else if (type === 'bane') formula = `{3d6kl2}`
  else                       formula = `2d6`

  const roll = new Roll(formula)
  await roll.evaluate()

  const total   = roll.total + totalDM
  const effect  = total - diff
  let resultText, resultColor

  if (effect >= 6)       { resultText = '대성공'; resultColor = '#4fc3f7' }
  else if (effect >= 4)  { resultText = '성공';   resultColor = '#81c784' }
  else if (effect >= 2)  { resultText = '아슬아슬한 성공'; resultColor = '#aed581' }
  else if (effect >= 0)  { resultText = '아슬아슬한 실패'; resultColor = '#ffb74d' }
  else if (effect >= -2) { resultText = '실패';   resultColor = '#e57373' }
  else                   { resultText = '대실패'; resultColor = '#ef5350' }

  const dmBreakdown = [
    chaDM !== 0 ? `${cha} DM${dmStr(chaVal)}` : null,
    sv !== 0    ? `기능 ${sv >= 0 ? '+' : ''}${sv}` : null,
    dm !== 0    ? `추가 ${dm >= 0 ? '+' : ''}${dm}` : null,
  ].filter(Boolean).join(', ')

  const msgContent = `
    <div class="tcs-roll-result">
      <div class="tcs-roll-result-title">${actor.name} — ${title}</div>
      <div class="tcs-roll-result-dice">🎲 ${roll.total} + (${dmBreakdown || '0'}) = <strong>${total}</strong> vs ${diff}+</div>
      <div class="tcs-roll-result-outcome" style="color:${resultColor}">
        ${resultText} (효과 ${effect >= 0 ? '+' : ''}${effect})
      </div>
    </div>
  `

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: msgContent,
    rollMode: mode,
    rolls: [roll],
  })
}

export class TravellerChargenSheet extends _ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes:  ['traveller-sheet-KR'],
      template: 'modules/traveller-sheet-KR/templates/sheet.html',
      width:    860,
      height:   720,
      resizable: true,
      tabs: [{
        navSelector:     '.tcs-tabs',
        contentSelector: '.tcs-body',
        initial:         'info',
      }],
    })
  }

  get template() {
    return 'modules/traveller-sheet-KR/templates/sheet.html'
  }

  // Enter 키 / 입력칸 change 시 폼 전체 자동제출 방지
  // (각 필드는 개별 change 핸들러에서 actor.update로 직접 처리함.
  //  자동제출이 동시에 발동하면 두 update가 충돌해 값이 사라지거나
  //  피해 적용이 누락되는 문제가 있었음)
  async _onSubmit(event, options) {
    if (event?.type === 'submit' || event?.type === 'change') {
      event.preventDefault()
      return
    }
    return super._onSubmit(event, options)
  }

  async _render(force, options) {
    // 렌더 전 현재 상태 저장
    const psiOpen    = this.element?.find('.tcs-psi-body')?.is(':visible') ?? false
    const activeTab  = this._tabs?.[0]?.active ?? 'info'

    await super._render(force, options)

    // PSI 섹션 상태 복원
    if (psiOpen) {
      this.element.find('.tcs-psi-body').show()
      this.element.find('.tcs-psi-arrow').text('▲')
    }

    // 우리 시트가 재렌더링되며 앞으로 올 때, 열려있는 "시트 설정" 창이
    // 뒤로 가려지지 않도록 다시 맨 앞으로 가져옴
    // (Foundry v14: AppV1 창은 ui.windows, AppV2 창은 foundry.applications.instances)
    setTimeout(() => {
      const v1Apps = Object.values(ui.windows ?? {})
      const v2Apps = [...(foundry.applications?.instances?.values?.() ?? [])]
      for (const app of [...v1Apps, ...v2Apps]) {
        if (app === this) continue
        const ctorName = app.constructor?.name ?? ''
        if (!ctorName.includes('SheetConfig')) continue
        const doc = app.document ?? app.object
        if (doc !== this.actor) continue
        if (typeof app.bringToFront === 'function') app.bringToFront()
        else app.bringToTop?.()
      }
    }, 0)
  }

  // ── 데이터 준비 ────────────────────────────────────────────
  async getData() {
    const ctx = await super.getData()
    const sys = this.actor.system

    // 이식형 방어구(피하 방어구 등)의 보호도 보너스 — mgt2e에 해당 AE 타입이
    // 없어서 notes의 "장갑/방어 +N" 패턴을 파싱해 합산 (이식됨 상태일 때만)
    let protectionBonus = 0
    for (const item of this.actor.items) {
      if (item.type === 'augment' && item.system?.active) {
        protectionBonus += parseItemBonuses(item.system?.notes ?? '').protection
      }
    }
    ctx.protectionBonus = protectionBonus
    ctx.armourPenalty = this.actor.getFlag('traveller-sheet-KR', 'armourPenalty') ?? 0

    // 배경/관계/메모 (백스토리 탭)
    ctx.backstoryRelationships = this.actor.getFlag('traveller-sheet-KR', 'backstoryRelationships') ?? ''
    ctx.backstoryNotes         = this.actor.getFlag('traveller-sheet-KR', 'backstoryNotes') ?? ''

    // 특성치 — mgt2e가 prepareDerivedData에서 .current/.dm을 이미 계산해줌
    // (augment 필드에는 ActiveEffect의 chaAug 보너스도 합산되어 들어있음)
    ctx.chars = {}
    const charKeys = ['STR','DEX','END','INT','EDU','SOC','PSI']
    const charKO   = {STR:'근력',DEX:'민첩',END:'인내',INT:'지능',EDU:'교육',SOC:'지위',PSI:'초능력'}
    for (const k of charKeys) {
      const raw = sys.characteristics?.[k]
      if (!raw) continue
      const val = raw.current ?? raw.value ?? 0
      ctx.chars[k] = {
        val, dm: dmStr(val),
        ko: charKO[k], aug: raw.augment ?? 0,
        dmg: sys.damage?.[k]?.value ?? 0, boon: raw.boon ?? null,
      }
    }

    // 체력 — mgt2e가 prepareDerivedData에서 hits.value/max를 이미 계산해줌
    ctx.hits        = sys.hits ?? {}
    ctx.hitsMax     = sys.hits?.max ?? 0
    ctx.hitsCurrent = sys.hits?.value ?? 0
    ctx.hitsPercent = ctx.hitsMax > 0 ? Math.round((ctx.hitsCurrent / ctx.hitsMax) * 100) : 100

    // 기능 — 훈련된/미훈련 전체 표시
    ctx.trainedSkills   = []
    ctx.untrainedSkills = []
    const psiKeys = new Set(['telepathy','clairvoyance','telekinesis','awareness','teleportation'])
    const skills = sys.skills ?? {}

    for (const [key, skill] of Object.entries(skills)) {
      if (key === 'untrained') continue

      const specs    = skill.specialities ?? {}
      const hasSpecs = Object.keys(specs).length > 0
      const isPsi    = skill.trait === 'psionic' || psiKeys.has(key)

      if (hasSpecs) {
        for (const [specKey, spec] of Object.entries(specs)) {
          const label = getSkillLabel(key, specKey)
          // trained 플래그 우선, 없으면 value > 0 (0은 미훈련 기본값일 수 있음)
          const trained = spec.trained === true
          const val     = trained ? (spec.value ?? 0) : -3
          const entry = {
            key: `${key}.${specKey}`, label, value: val,
            trained, isPsi,
            chaDefault: spec.default || skill.default || this._getDefaultCha(key),
          }
          if (isPsi) { /* PSI 기능은 아래서 별도 처리 */ }
          else if (trained) ctx.trainedSkills.push(entry)
          else ctx.untrainedSkills.push(entry)
        }
      } else {
        const label   = getSkillLabel(key)
        // trained 플래그 우선
        const trained = skill.trained === true
        const val     = trained ? (skill.value ?? 0) : -3
        const entry = {
          key, label, value: val, trained, isPsi,
          chaDefault: skill.default || this._getDefaultCha(key),
        }
        if (isPsi) { /* PSI 기능은 아래서 별도 처리 */ }
        else if (trained) ctx.trainedSkills.push(entry)
        else ctx.untrainedSkills.push(entry)
      }
    }

    ctx.trainedSkills.sort((a,b)   => a.label.localeCompare(b.label, 'ko'))
    ctx.untrainedSkills.sort((a,b) => a.label.localeCompare(b.label, 'ko'))
    ctx.skills = ctx.trainedSkills

    // 재정
    ctx.finance  = sys.finance ?? {}
    ctx.sophont  = sys.sophont ?? {}
    ctx.terms    = sys.terms ?? 0
    ctx.editable = this.isEditable

    // 혜택 목록 + 현금 표시
    const finDesc = ctx.finance.description ?? ''
    if (finDesc.startsWith('혜택: ')) {
      ctx.benefits = finDesc.replace('혜택: ', '').split(', ').filter(Boolean)
    } else {
      ctx.benefits = finDesc ? finDesc.split('\n').filter(Boolean) : []
    }
    // 현금 혜택 표시용
    ctx.cashBenefit = ctx.finance.cash ?? 0

    // PSI 특성치 + 기능
    const psiRaw   = sys.characteristics?.PSI
    ctx.hasPsi     = !!(psiRaw && (psiRaw.value ?? 0) > 0)
    ctx.psiVal     = psiRaw?.value ?? 0
    ctx.psiDm      = dmStr(ctx.psiVal)
    ctx.psiSkills  = Object.entries(skills)
      .filter(([k, s]) => psiKeys.has(k) || s.trait === 'psionic')
      .map(([k, s]) => ({
        key: k,
        label: getSkillLabel(k) || k,
        value: s.value ?? 0,
        trained: s.trained === true,
        chaDefault: 'PSI',
      }))
      .sort((a,b) => a.label.localeCompare(b.label, 'ko'))

    // 기능명 영문 → 한글 변환 맵
    const WEAPON_SKILL_KO = {
      'melee.blade':            '근접전 (도검)',
      'melee.unarmed':          '근접전 (비무장)',
      'melee.bludgeon':         '근접전 (둔기)',
      'melee.natural':          '근접전 (자연)',
      'guncombat.slug':         '사격 (탄환형)',
      'guncombat.energy':       '사격 (에너지형)',
      'guncombat.archaic':      '사격 (구식)',
      'heavyweapons.portable':  '중화기 (휴대형)',
      'heavyweapons.vehicle':   '중화기 (탑승형)',
      'heavyweapons.artillery': '중화기 (포병)',
      'explosives':             '폭발물',
    }

    // 아이템 분류
    const items = this.actor.items.contents
    ctx.weapons = items.filter(i => i.type === 'weapon').map(w => ({
      ...w.toObject ? w.toObject() : w,
      id: w.id,
      name: w.name,
      system: {
        ...w.system,
        weapon: {
          ...w.system.weapon,
          skillKo: WEAPON_SKILL_KO[w.system?.weapon?.skill] || w.system?.weapon?.skill || '',
        }
      }
    }))
    ctx.armours    = items.filter(i => i.type === 'armour')
    ctx.augments   = items.filter(i => i.type === 'augment')
    ctx.gear       = items.filter(i => ['item','cargo'].includes(i.type))
    ctx.grantLabels = {}
    ctx.armourReqLabels = {}
    for (const it of [...ctx.armours, ...ctx.augments, ...ctx.gear]) {
      const lbl = grantLabel(it)
      if (lbl) ctx.grantLabels[it.id] = lbl
    }
    for (const it of ctx.armours) {
      const req = parseArmourSkillReq(it.system?.armour?.skill ?? '')
      if (!req) continue
      const sk = sys.skills?.[req.id]
      const have = sk?.trained ? (sk.value ?? 0) : null
      const havePart = have === null ? '미보유' : `보유 ${have}`
      const penalty = have === null ? -3 : Math.min(0, have - req.level)
      ctx.armourReqLabels[it.id] = `요구: ${req.name} ${req.level} (${havePart}${penalty < 0 ? `, 페널티 ${penalty}` : ''})`
    }
    ctx.termItems  = items.filter(i => i.type === 'term')

    // 연줄 분류 (associate 아이템)
    const assocItems = items.filter(i => i.type === 'associate')
    ctx.associates = assocItems
    ctx.allies    = assocItems.filter(i => i.system?.associate?.relationship === 'ally')
    ctx.contacts  = assocItems.filter(i => i.system?.associate?.relationship === 'contact')
    ctx.rivals    = assocItems.filter(i => i.system?.associate?.relationship === 'rival')
    ctx.enemies   = assocItems.filter(i => i.system?.associate?.relationship === 'enemy')

    // 경력 이력
    ctx.careerHistory = ctx.termItems.map(t => ({
      id:      t.id,
      career:  t.name,
      terms:   t.system?.number ?? 1,
      notes:   t.system?.notes ?? '',
    }))

    // 경력 타임라인 로그 (wizard에서 export된 flag)
    const careerLog  = this.actor.getFlag('traveller-sheet-KR', 'careerLog') ?? []
    const careersRaw = this.actor.getFlag('traveller-sheet-KR', 'careers')   ?? []

    // careerLog(교육/특수 이벤트) + 주기별 careers log를 시간순으로 합산
    const timeline = []

    // 1. 교육 로그 (careerLog에서 phase==='education')
    for (const entry of careerLog) {
      timeline.push({
        phase:   entry.phase,
        label:   entry.label,
        entries: entry.entries ?? [],
        isEducation: entry.phase === 'education',
      })
    }

    // 2. 경력 주기별 로그
    for (const c of careersRaw) {
      const careerName = c.careerId ?? '알 수 없음'
      const specId     = c.specialtyId ?? ''
      timeline.push({
        phase:    'term',
        label:    `${c.term ?? '?'}주기 — ${careerName}${specId ? ' / ' + specId : ''}${c.isOfficer ? ' (장교)' : ''} | 직급 ${c.rank ?? 0}`,
        entries:  c.log ?? [],
        isTerm:   true,
        survived: c.survived ?? true,
      })
    }

    ctx.careerTimeline = timeline

    // 장착 중인 방어구 합산 (+ 이식형 방어구 보너스)
    ctx.totalProtection = ctx.armours
      .filter(a => a.system.worn)
      .reduce((s, a) => s + (a.system.armour?.protection ?? 0), 0)
      + protectionBonus

    // 소지 무게
    ctx.totalWeight = items.reduce((s, i) =>
      s + (i.system?.weight ?? 0) * (i.system?.quantity ?? 1), 0)

    ctx.shopAvailable = game.modules.get('traveller-items-KR')?.active ?? false

    return ctx
  }

  // 기능별 기본 특성치
  _getDefaultCha(key) {
    const map = {
      athletics:'STR', melee:'STR', guncombat:'DEX', heavyweapons:'DEX',
      gunner:'DEX', pilot:'DEX', flyer:'DEX', drive:'DEX', seafarer:'DEX',
      stealth:'DEX', vaccsuit:'DEX', medic:'EDU', engineer:'EDU',
      electronics:'EDU', mechanic:'EDU', science:'EDU', astrogation:'INT',
      navigation:'INT', recon:'INT', investigate:'INT', survival:'INT',
      tactics:'INT', admin:'EDU', advocate:'EDU', broker:'INT',
      carouse:'SOC', deception:'INT', diplomat:'SOC', language:'EDU',
      leadership:'SOC', persuade:'SOC', streetwise:'INT', steward:'EDU',
      explosives:'EDU', gambler:'INT', jackofalltrades:'INT',
    }
    return map[key] ?? 'INT'
  }

  // ── 이벤트 핸들러 ──────────────────────────────────────────
  activateListeners(html) {
    super.activateListeners(html)

    // 읽기 전용이어도 주사위는 가능
    html.on('click', '.tcs-roll-char', ev => this._onRollChar(ev))
    html.on('click', '.tcs-roll-skill', ev => this._onRollSkill(ev))

    if (!this.isEditable) return

    // 상점 탭
    html.find('.tcs-tab[data-tab="shop"]').on('click', () => {
      setTimeout(() => this._loadShop(html), 50)
    })
    html.on('click', '.tcs-shop-buy', ev => this._buyItem(ev))
    html.on('click', '.tcs-item-sell', ev => this._sellItem(ev))

    // PSI 섹션 접기/펼치기
    html.on('click', '.tcs-psi-toggle', ev => {
      const body = html.find('.tcs-psi-body')
      body.toggle()
      const icon = ev.currentTarget.querySelector('.tcs-psi-arrow')
      if (icon) icon.textContent = body.is(':visible') ? '▲' : '▼'
    })

    // 기능 추가
    html.on('click', '#tcs-add-skill', () => this._onAddSkill())

    // 기능 레벨 인라인 수정 (숫자 클릭)
    html.on('click', '.tcs-skill-level-edit', ev => {
      ev.stopPropagation()
      const row = ev.currentTarget.closest('.tcs-skill-row')
      const key = row.dataset.skillKey
      if (!key) return

      const current = parseInt(ev.currentTarget.dataset.value) || 0
      const input = $(`<input type="number" class="tcs-skill-level-input"
        value="${current}" min="-3" max="5"
        style="width:40px;font-size:0.85rem;text-align:center;
               background:var(--tcs-deep);border:1px solid var(--tcs-cyan);
               border-radius:3px;color:var(--tcs-text);">`)

      $(ev.currentTarget).replaceWith(input)
      input.focus().select()

      const apply = async () => {
        const newVal = parseInt(input.val()) ?? current
        await this._updateSkillLevel(key, newVal)
      }
      input.on('blur', apply)
      input.on('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); apply() }
        if (e.key === 'Escape') { this.render() }
      })
    })

    // PSI 강도 직접 수정
    html.on('click', '#tcs-psi-val-edit', ev => {
      ev.stopPropagation()
      const current = parseInt(ev.currentTarget.dataset.value) || 0
      const input = $(`<input type="number" value="${current}" min="0" max="15"
        style="width:50px;font-size:1.1rem;text-align:center;font-weight:700;
               background:var(--tcs-deep);border:1px solid var(--tcs-cyan);
               border-radius:3px;color:var(--tcs-cyan);">`)
      $(ev.currentTarget).replaceWith(input)
      input.focus().select()
      const apply = async () => {
        const v = Math.max(0, Math.min(15, parseInt(input.val()) || 0))
        await this.actor.update({ 'system.characteristics.PSI.value': v })
      }
      input.on('blur', apply)
      input.on('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); apply() }
        if (e.key === 'Escape') { this.render() }
      })
    })

    // PSI 기능 추가
    html.on('click', '#tcs-add-psi-skill', () => this._onAddPsiSkill())

    // PSI 기능 레벨 수정
    html.on('click', '.tcs-psi-skill-level', ev => {
      ev.stopPropagation()
      const key     = ev.currentTarget.dataset.key
      const current = parseInt(ev.currentTarget.dataset.value) || 0
      const input   = $(`<input type="number" value="${current}" min="0" max="5"
        style="width:40px;font-size:0.85rem;text-align:center;
               background:var(--tcs-deep);border:1px solid var(--tcs-cyan);
               border-radius:3px;color:var(--tcs-cyan);">`)
      $(ev.currentTarget).replaceWith(input)
      input.focus().select()
      const apply = async () => {
        const v = Math.max(0, Math.min(5, parseInt(input.val()) || 0))
        await this.actor.update({
          [`system.skills.${key}.value`]:   v,
          [`system.skills.${key}.trained`]: true,
          [`system.skills.${key}.trait`]:   'psionic',
        })
      }
      input.on('blur', apply)
      input.on('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); apply() }
        if (e.key === 'Escape') { this.render() }
      })
    })

    // 장비 추가 (커스텀 입력)
    html.on('click', '#tcs-add-item', () => this._onAddItem())

    // 연줄 추가
    html.on('click', '#tcs-add-contact', () => this._onAddContact())

    // 아이템 삭제 (연줄 포함)
    html.on('click', '.tcs-item-delete', ev => {
      const id = ev.currentTarget.closest('[data-item-id]').dataset.itemId
      this.actor.items.get(id)?.delete()
    })

    // 수량 변경
    html.on('change', '.tcs-qty-input', ev => {
      const id  = ev.currentTarget.closest('[data-item-id]').dataset.itemId
      const qty = Math.max(1, parseInt(ev.currentTarget.value) || 1)
      this.actor.items.get(id)?.update({ 'system.quantity': qty })
    })

    // 무기/방어구 장착, 강화장치 이식
    // notes에서 특성치 보너스("근력·민첩 +4" 등)와 "컴퓨터/N 내장"을 파싱해
    // 장착 시 system.characteristics.X.augment / 컴퓨터 기능에 직접 가감한다.
    // 배경/관계/메모 (백스토리 탭) — flag로 저장
    html.on('change', '.tcs-backstory-relationships', ev => {
      this.actor.setFlag('traveller-sheet-KR', 'backstoryRelationships', ev.currentTarget.value)
    })
    html.on('change', '.tcs-backstory-notes', ev => {
      this.actor.setFlag('traveller-sheet-KR', 'backstoryNotes', ev.currentTarget.value)
    })

    // 또한 방어구의 "요구 기능"(system.armour.skill) 대비 부족한 만큼
    // 전체 판정에 DM 페널티(코어 p.94: 부족 레벨당 -1, 미보유 시 -3)를 적용한다.
    html.on('click', '.tcs-item-equip', async ev => {
      const id   = ev.currentTarget.closest('[data-item-id]').dataset.itemId
      const item = this.actor.items.get(id)
      if (!item) return
      const field  = item.type === 'armour' ? 'system.worn' : 'system.active'
      const turnOn = !foundry.utils.getProperty(item, field)
      const sys    = this.actor.system
      const charUpdates = {}

      if (turnOn) {
        const b = parseItemBonuses(item.system?.notes ?? '')
        // "STR, DEX 또는 END 중 하나 +N" 같은 선택형 보너스 처리
        const choiceM = (item.system?.notes ?? '').match(/중\s*하나\s*\+(\d+)/)
        if (choiceM) {
          const choice = item.getFlag('traveller-sheet-KR', 'augChoice')
          if (!['STR','DEX','END'].includes(choice)) {
            ui.notifications.warn(`"${item.name}"의 보너스를 받을 특성치를 먼저 선택해주세요 (아이템 시트에서 설정).`)
            return
          }
          b[choice] += parseInt(choiceM[1])
        }
        const grant = { STR: b.STR, DEX: b.DEX, END: b.END, INT: b.INT, EDU: b.EDU, SOC: b.SOC }
        for (const k of ['STR','DEX','END','INT','EDU','SOC']) {
          if (b[k]) charUpdates[`system.characteristics.${k}.augment`] = (sys.characteristics?.[k]?.augment ?? 0) + b[k]
        }
        const compM = (item.system?.notes ?? '').match(/컴퓨터\/(\d+)/)
        if (compM) {
          const n   = parseInt(compM[1])
          const cur = sys.skills?.electronics?.specialities?.computers
          const curVal = cur?.trained ? (cur.value ?? 0) : null
          if (curVal === null || n > curVal) {
            charUpdates['system.skills.electronics.specialities.computers'] = { value: n, trained: true }
            grant.computerPrev = curVal  // null이면 미훈련 상태였음
          }
        }
        // "기능 강화 이식" 등 — 선택한 기능에 레벨 +N
        const skillM = (item.system?.notes ?? '').match(/하나의\s*기능에\s*레벨\s*\+(\d+)\s*향상/)
        if (skillM) {
          const skKey = item.getFlag('traveller-sheet-KR', 'augChoiceSkill')
          if (!skKey) {
            ui.notifications.warn(`"${item.name}"의 보너스를 받을 기능을 먼저 선택해주세요 (아이템 시트에서 설정).`)
            return
          }
          const n   = parseInt(skillM[1])
          const cur = sys.skills?.[skKey]
          const prevTrained = cur?.trained === true
          const prevValue   = cur?.value ?? 0
          charUpdates[`system.skills.${skKey}.value`]   = prevValue + n
          charUpdates[`system.skills.${skKey}.trained`] = true
          grant.skillChoice = { key: skKey, prevTrained, prevValue }
        }
        // 방어구 요구 기능 부족 페널티 (코어 p.94)
        if (item.type === 'armour') {
          const req = parseArmourSkillReq(item.system?.armour?.skill ?? '')
          if (req) {
            const sk = sys.skills?.[req.id]
            const actorLevel = sk?.trained ? (sk.value ?? 0) : null
            const penalty = actorLevel === null ? -3 : Math.min(0, actorLevel - req.level)
            if (penalty < 0) {
              grant.armourPenalty = penalty
              charUpdates['flags.traveller-sheet-KR.armourPenalty'] =
                (this.actor.getFlag('traveller-sheet-KR', 'armourPenalty') ?? 0) + penalty
            }
          }
        }
        await item.setFlag('traveller-sheet-KR', 'grant', grant)
      } else {
        const grant = item.getFlag('traveller-sheet-KR', 'grant') ?? {}
        for (const k of ['STR','DEX','END','INT','EDU','SOC']) {
          if (grant[k]) charUpdates[`system.characteristics.${k}.augment`] = (sys.characteristics?.[k]?.augment ?? 0) - grant[k]
        }
        if ('computerPrev' in grant) {
          charUpdates['system.skills.electronics.specialities.computers'] = grant.computerPrev === null
            ? { value: 0, trained: false }
            : { value: grant.computerPrev, trained: true }
        }
        if (grant.armourPenalty) {
          charUpdates['flags.traveller-sheet-KR.armourPenalty'] =
            (this.actor.getFlag('traveller-sheet-KR', 'armourPenalty') ?? 0) - grant.armourPenalty
        }
        if (grant.skillChoice) {
          const { key, prevTrained, prevValue } = grant.skillChoice
          charUpdates[`system.skills.${key}.value`]   = prevValue
          charUpdates[`system.skills.${key}.trained`] = prevTrained
        }
        await item.unsetFlag('traveller-sheet-KR', 'grant')
      }

      await item.update({ [field]: turnOn })
      if (Object.keys(charUpdates).length) await this.actor.update(charUpdates)
    })

    // 특성치 직접 수정 (표시값=current → value 환산: value = current - augment + damage)
    html.on('change click', '.tcs-char-val-input', ev => ev.stopPropagation())
    html.on('change', '.tcs-char-val-input', ev => {
      const key = ev.currentTarget.dataset.cha
      const aug = parseInt(ev.currentTarget.dataset.aug) || 0
      const dmg = parseInt(ev.currentTarget.dataset.dmg) || 0
      const total = parseInt(ev.currentTarget.value) || 0
      const value = Math.max(0, total - aug + dmg)
      this.actor.update({ [`system.characteristics.${key}.value`]: value })
    })

    // 현금 편집
    html.on('change', '.tcs-cash-input', ev => {
      const val = parseInt(ev.currentTarget.value.replace(/,/g, '')) || 0
      this.actor.update({ 'system.finance.cash': val })
    })

    // 피해 입력 (STR/DEX/END) — mgt2e 네이티브 필드 system.damage.{key}.value
    html.on('change', '.tcs-damage-input', ev => {
      const key = ev.currentTarget.dataset.cha
      const val = Math.max(0, parseInt(ev.currentTarget.value) || 0)
      this.actor.update({ [`system.damage.${key}.value`]: val })
    })

    // form 내 Enter 키 → submit 방지
    html.on('keydown', 'input', ev => {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        ev.stopPropagation()
        ev.currentTarget.blur()  // 포커스 해제로 change 이벤트 발생
      }
    })

    // 장비 우클릭 → 정보 표시
    html.on('contextmenu', '[data-item-id]', ev => {
      ev.preventDefault()
      const id   = ev.currentTarget.closest('[data-item-id]').dataset.itemId
      const item = this.actor.items.get(id)
      if (!item) return
      this._showItemInfo(item)
    })

    // 상점 아이템 우클릭 → 정보 보기 (읽기 전용)
    html.on('contextmenu', '#tcs-shop-tbody tr', async ev => {
      ev.preventDefault()
      const uuid = ev.currentTarget.closest('tr')?.dataset?.uuid
      if (!uuid) return
      const item = await fromUuid(uuid)
      if (!item) return
      item.sheet.render(true)
    })

    // 상점 필터/검색
    html.on('change', '#tcs-shop-filter', ev => this._filterShop(html, ev.currentTarget.value))
    html.on('input',  '#tcs-shop-search', ev => this._searchShop(html, ev.currentTarget.value))
  }

  // ── PSI 기능 추가 ─────────────────────────────────────────
  async _onAddPsiSkill() {
    const PSI_SKILLS = [
      { id: 'telepathy',    label: '텔레파시' },
      { id: 'clairvoyance', label: '투시' },
      { id: 'telekinesis',  label: '염동력' },
      { id: 'awareness',    label: '지각' },
      { id: 'teleportation',label: '순간 이동' },
    ]
    const options = PSI_SKILLS.map(s =>
      `<option value="${s.id}">${s.label} (${s.id})</option>`
    ).join('')

    const content = `
      <div class="tcs-add-dialog">
        <div class="tcs-add-row">
          <label>초능력 기능</label>
          <select id="tcs-psi-key" style="flex:1">${options}</select>
        </div>
        <div class="tcs-add-row">
          <label>직접 입력</label>
          <input id="tcs-psi-custom" type="text" placeholder="커스텀 초능력명 (선택 무시)">
        </div>
        <div class="tcs-add-row">
          <label>레벨</label>
          <input id="tcs-psi-val" type="number" value="1" min="0" max="5" style="width:70px">
        </div>
      </div>
    `

    new Dialog({
      title: '초능력 기능 추가',
      content,
      buttons: {
        add: {
          label: '✓ 추가',
          callback: async html => {
            const custom = html.find('#tcs-psi-custom').val().trim()
            const key    = custom || html.find('#tcs-psi-key').val()
            const val    = Math.max(0, Math.min(5, parseInt(html.find('#tcs-psi-val').val()) || 1))

            await this.actor.update({
              [`system.skills.${key}.value`]:   val,
              [`system.skills.${key}.trained`]: true,
              [`system.skills.${key}.trait`]:   'psionic',
              [`system.skills.${key}.default`]: 'PSI',
              [`system.skills.${key}.requires`]:'PSI',
              [`system.skills.${key}.id`]:      key,
            })

            // PSI 강도가 0이면 자동으로 기본값 설정
            const psiVal = this.actor.system.characteristics?.PSI?.value ?? 0
            if (psiVal === 0) {
              await this.actor.update({ 'system.characteristics.PSI.value': val })
            }

            ui.notifications.info(`${key} (레벨 ${val}) 초능력 추가됨`)
          }
        },
        cancel: { label: '취소' }
      },
      default: 'add',
    }).render(true)
  }

  // ── 특성치 굴림 ───────────────────────────────────────────
  _onRollChar(ev) {
    const chaKey = ev.currentTarget.dataset.cha
    const chaVal = this.actor.system.characteristics?.[chaKey]?.value ?? 0
    const title  = `${chaKey} (${dmStr(chaVal)}) 판정`

    new TcsRollDialog(this.actor, {
      title, skillKey: null, skillVal: -3, chaKey
    }, opts => executeRoll(this.actor, opts)).render(true)
  }

  // ── 기능 굴림 ─────────────────────────────────────────────
  _onRollSkill(ev) {
    const skillKey = ev.currentTarget.dataset.skill
    const label    = ev.currentTarget.dataset.label
    const val      = parseInt(ev.currentTarget.dataset.val) || 0
    const chaKey   = ev.currentTarget.dataset.cha || 'INT'

    new TcsRollDialog(this.actor, {
      title: label, skillKey, skillVal: val, chaKey
    }, opts => executeRoll(this.actor, opts)).render(true)
  }

  // ── 아이템 정보 팝업 — mgt2e 기본 시트 사용 ─────────────
  _showItemInfo(item) {
    item.sheet.render(true)
  }

  // ── 상점 로드 (캐시 + 병렬) ──────────────────────────────
  async _loadShop(html) {
    // 인스턴스 변수로 로드 상태 관리 (re-render 후에도 유지)
    if (this._shopLoaded && this._shopItems) {
      html.find('.tcs-loading').hide()
      html.find('.tcs-shop-table').show()
      this._renderShopTable(html, this._getFilteredItems())
      return
    }

    if (TravellerChargenSheet._shopCache) {
      this._shopItems  = TravellerChargenSheet._shopCache
      this._shopLoaded = true
      html.find('.tcs-loading').hide()
      html.find('.tcs-shop-table').show()
      this._renderShopTable(html, this._shopItems)
      return
    }

    const PACKS = [
      'traveller-items-KR.armour',
      'traveller-items-KR.weapons-melee',
      'traveller-items-KR.weapons-ranged',
      'traveller-items-KR.weapons-heavy',
      'traveller-items-KR.equipment',
      'traveller-items-KR.augments',
    ]

    const results = await Promise.all(PACKS.map(async packId => {
      const pack = game.packs.get(packId)
      if (!pack) return []
      const index = await pack.getIndex({ fields: [
        'name','type','system.tl','system.cost',
        'system.weight','system.legality','system.notes',
        'system.weapon','system.armour',
      ]})
      return index.map(e => ({
        ...e,
        uuid: `Compendium.${packId}.Item.${e._id}`,
        packId,
      }))
    }))

    this._shopItems  = results.flat()
    this._shopLoaded = true
    TravellerChargenSheet._shopCache = this._shopItems

    html.find('.tcs-loading').hide()
    html.find('.tcs-shop-table').show()
    this._renderShopTable(html, this._shopItems)
  }

  static clearShopCache() { TravellerChargenSheet._shopCache = null }

  // ── 상점 테이블 렌더 ─────────────────────────────────────
  _renderShopTable(html, items) {
    const cash  = this.actor.system.finance?.cash ?? 0
    const tbody = html.find('#tcs-shop-tbody')
    tbody.empty()

    if (!items.length) {
      tbody.append('<tr><td colspan="6" style="text-align:center;color:var(--tcs-muted)">아이템 없음</td></tr>')
      return
    }

    for (const item of items) {
      const sys     = item.system ?? {}
      const cost    = sys.cost ?? 0
      const canBuy  = cash >= cost
      const legText = item.type === 'armour'
        ? (ARMOUR_LEGALITY[sys.legality] ?? sys.legality)
        : (WEAPON_LEGALITY[sys.legality] ?? sys.legality)
      const typeLabel = CATEGORY_LABEL[item.type] ?? item.type

      tbody.append(`
        <tr data-uuid="${item.uuid}" data-type="${item.type}">
          <td>
            <span class="tcs-type-badge tcs-type-${item.type}">${typeLabel}</span>
            ${item.name}
          </td>
          <td>TL${sys.tl ?? 0}</td>
          <td>${sys.weight ?? 0}kg</td>
          <td title="${legText}">${sys.legality ?? 9}</td>
          <td class="${canBuy ? 'tcs-gold' : 'tcs-cant-afford'}">Cr ${cost.toLocaleString()}</td>
          <td>
            <button class="tcs-shop-buy ${canBuy ? '' : 'tcs-disabled'}"
              data-uuid="${item.uuid}" data-cost="${cost}"
              ${canBuy ? '' : 'disabled'}>구매</button>
          </td>
        </tr>
      `)
    }
  }

  _filterShop(html, type) {
    if (!this._shopItems) return
    const base   = type === 'all' ? this._shopItems : this._shopItems.filter(i => i.type === type)
    const search = html.find('#tcs-shop-search').val()?.toLowerCase() ?? ''
    this._renderShopTable(html, search ? base.filter(i => i.name.toLowerCase().includes(search)) : base)
  }

  _searchShop(html, query) {
    if (!this._shopItems) return
    const type = html.find('#tcs-shop-filter').val() ?? 'all'
    const base = type === 'all' ? this._shopItems : this._shopItems.filter(i => i.type === type)
    this._renderShopTable(html, query ? base.filter(i => i.name.toLowerCase().includes(query.toLowerCase())) : base)
  }

  // ── 구매 ──────────────────────────────────────────────────
  async _buyItem(ev) {
    const btn  = ev.currentTarget
    const uuid = btn.dataset.uuid
    const cost = parseInt(btn.dataset.cost) || 0
    const cash = this.actor.system.finance?.cash ?? 0

    if (cash < cost) { ui.notifications.warn('크레딧이 부족합니다!'); return }

    const source = await fromUuid(uuid)
    if (!source) return

    const existing = this.actor.items.find(i =>
      foundry.utils.getProperty(i, 'flags.core.sourceId') === uuid || i.name === source.name
    )
    if (existing) {
      await existing.update({ 'system.quantity': (existing.system.quantity ?? 1) + 1 })
    } else {
      const data = source.toObject()
      foundry.utils.setProperty(data, 'flags.core.sourceId', uuid)
      await this.actor.createEmbeddedDocuments('Item', [data])
    }

    await this.actor.update({ 'system.finance.cash': cash - cost })
    ui.notifications.info(`${source.name} 구매! (Cr ${cost.toLocaleString()} 차감)`)
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `🛒 <b>${this.actor.name}</b>이(가) <b>${source.name}</b>을(를) 구매했습니다.`
        + `<br>Cr -${cost.toLocaleString()} → 잔액 Cr ${(cash - cost).toLocaleString()}`,
    })
    // 상점 테이블만 갱신 (전체 재로딩 없이)
    const shopHtml = this.element
    if (shopHtml && this._shopItems) {
      this._renderShopTable(shopHtml, this._getFilteredItems())
    }
  }

  // ── 판매 ──────────────────────────────────────────────────
  async _sellItem(ev) {
    const id   = ev.currentTarget.closest('[data-item-id]').dataset.itemId
    const item = this.actor.items.get(id)
    if (!item) return

    const price = Math.floor((item.system.cost ?? 0) * 0.75)
    const cash  = this.actor.system.finance?.cash ?? 0

    const ok = await Dialog.confirm({
      title: '아이템 판매',
      content: `<p><b>${item.name}</b>을(를) Cr ${price.toLocaleString()}에 판매하겠습니까? <small>(구매가의 75%)</small></p>`,
    })
    if (!ok) return

    await item.delete()
    await this.actor.update({ 'system.finance.cash': cash + price })
    ui.notifications.info(`${item.name} 판매! (Cr ${price.toLocaleString()} 획득)`)
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `💰 <b>${this.actor.name}</b>이(가) <b>${item.name}</b>을(를) 판매했습니다.`
        + `<br>Cr +${price.toLocaleString()} → 잔액 Cr ${(cash + price).toLocaleString()}`,
    })
  }

  _getFilteredItems() {
    if (!this._shopItems) return []
    const html   = this.element
    const type   = html.find('#tcs-shop-filter').val() ?? 'all'
    const search = html.find('#tcs-shop-search').val()?.toLowerCase() ?? ''
    const base   = type === 'all' ? this._shopItems : this._shopItems.filter(i => i.type === type)
    return search ? base.filter(i => i.name.toLowerCase().includes(search)) : base
  }

  // ── 기능 레벨 업데이트 ───────────────────────────────────
  async _updateSkillLevel(key, val) {
    const dotIdx  = key.indexOf('.')
    const hasSpec = dotIdx > -1
    const baseKey = hasSpec ? key.slice(0, dotIdx) : key
    const specKey = hasSpec ? key.slice(dotIdx + 1) : null
    const trained = val >= 0

    const update = {}
    if (hasSpec) {
      update[`system.skills.${baseKey}.specialities.${specKey}.value`]   = val
      update[`system.skills.${baseKey}.specialities.${specKey}.trained`] = trained
      // 전문화가 모두 미훈련이면 부모도 미훈련
      const specs  = this.actor.system.skills?.[baseKey]?.specialities ?? {}
      const anyTrained = Object.entries(specs).some(([k, s]) =>
        k === specKey ? trained : (s.trained ?? false)
      )
      update[`system.skills.${baseKey}.trained`] = anyTrained
    } else {
      update[`system.skills.${baseKey}.value`]   = val
      update[`system.skills.${baseKey}.trained`] = trained
    }

    await this.actor.update(update)
  }

  // ── 기능 수동 추가 ────────────────────────────────────────
  async _onAddSkill() {
    const content = `
      <div class="tcs-add-dialog">
        <div class="tcs-add-row">
          <label>기능명 <span class="tcs-req">*</span></label>
          <input id="tcs-skill-custom" type="text" placeholder="예: 우주 비행, 근접전(도검)..." style="flex:1" autofocus>
        </div>
        <div class="tcs-add-row">
          <label>레벨</label>
          <input id="tcs-skill-val" type="number" value="0" min="-3" max="5" style="width:70px">
        </div>
        <p style="font-size:0.75rem;color:#8892a4;margin-top:0.5rem;">
          mgt2e 기능 키를 그대로 입력하면 시스템 기능으로 등록됩니다.<br>
          (예: deception, guncombat, melee)
        </p>
      </div>
    `

    new Dialog({
      title: '기능 추가',
      content,
      buttons: {
        add: {
          label: '✓ 추가',
          callback: async html => {
            const raw = html.find('#tcs-skill-custom').val().trim()
            const val = parseInt(html.find('#tcs-skill-val').val()) ?? 0
            if (!raw) return

            // key.spec 형식 파싱
            const dotIdx = raw.indexOf('.')
            const hasSpec = dotIdx > -1
            const baseKey = hasSpec ? raw.slice(0, dotIdx) : raw
            const specKey = hasSpec ? raw.slice(dotIdx + 1) : null

            const sys = this.actor.system.skills ?? {}
            const update = {}

            if (hasSpec) {
              // 전문화 기능
              update[`system.skills.${baseKey}.trained`] = true
              update[`system.skills.${baseKey}.specialities.${specKey}.value`]   = val
              update[`system.skills.${baseKey}.specialities.${specKey}.trained`] = val >= 0
            } else if (sys[baseKey] !== undefined) {
              // 기존 mgt2e 스킬
              update[`system.skills.${baseKey}.value`]   = val
              update[`system.skills.${baseKey}.trained`] = val >= 0
            } else {
              // 완전 커스텀 — system.skills에 새 키로 추가
              update[`system.skills.${baseKey}`] = {
                id: baseKey, value: val, trained: val >= 0,
                specialities: {}, icon: ''
              }
            }

            await this.actor.update(update)
            ui.notifications.info(`${raw} (레벨 ${val}) 추가됨`)
          }
        },
        cancel: { label: '취소' }
      },
      default: 'add',
    }).render(true)
  }

  // ── 장비 수동 추가 ────────────────────────────────────────
  async _onAddItem() {
    const content = `
      <div class="tcs-add-dialog">
        <div class="tcs-add-row">
          <label>이름 <span class="tcs-req">*</span></label>
          <input id="tcs-item-name" type="text" placeholder="아이템 이름" style="flex:1">
        </div>
        <div class="tcs-add-row">
          <label>종류</label>
          <select id="tcs-item-type" style="flex:1">
            <option value="item">일반 장비</option>
            <option value="weapon">무기</option>
            <option value="armour">방어구</option>
            <option value="augment">강화 장치</option>
          </select>
        </div>
        <div class="tcs-add-row">
          <label>가격 (Cr)</label>
          <input id="tcs-item-cost" type="number" value="0" min="0">
        </div>
        <div class="tcs-add-row">
          <label>무게 (kg)</label>
          <input id="tcs-item-weight" type="number" value="0" min="0" step="0.1">
        </div>
        <div class="tcs-add-row">
          <label>TL</label>
          <input id="tcs-item-tl" type="number" value="0" min="0" max="25" style="width:60px">
        </div>
        <div class="tcs-add-row">
          <label>메모</label>
          <input id="tcs-item-notes" type="text" placeholder="간단한 설명" style="flex:1">
        </div>
        <div id="tcs-weapon-fields" style="display:none">
          <div class="tcs-add-row">
            <label>피해</label>
            <input id="tcs-item-damage" type="text" placeholder="2D6" style="width:80px">
          </div>
          <div class="tcs-add-row">
            <label>사거리 (m)</label>
            <input id="tcs-item-range" type="number" value="0" min="0" style="width:80px">
          </div>
          <div class="tcs-add-row">
            <label>탄창</label>
            <input id="tcs-item-magazine" type="number" value="0" min="0" style="width:80px">
          </div>
          <div class="tcs-add-row">
            <label>탄약비 (Cr)</label>
            <input id="tcs-item-ammo-cost" type="number" value="0" min="0" style="width:80px">
          </div>
          <div class="tcs-add-row">
            <label>기능</label>
            <select id="tcs-item-skill">
              <option value="melee.blade">근접전 (도검)</option>
              <option value="melee.unarmed">근접전 (비무장)</option>
              <option value="melee.bludgeon">근접전 (둔기)</option>
              <option value="guncombat.slug">사격 (탄환형)</option>
              <option value="guncombat.energy">사격 (에너지형)</option>
              <option value="heavyweapons.portable">중화기 (휴대형)</option>
              <option value="explosives">폭발물</option>
            </select>
          </div>
          <div class="tcs-add-row">
            <label>특성</label>
            <input id="tcs-item-traits" type="text" placeholder="Auto 2, Bulky..." style="flex:1">
          </div>
        </div>
        <div id="tcs-armour-fields" style="display:none">
          <div class="tcs-add-row">
            <label>방어값</label>
            <input id="tcs-item-protection" type="number" value="0" min="0" style="width:60px">
          </div>
        </div>
      </div>
      <script>
        document.getElementById('tcs-item-type').addEventListener('change', function() {
          document.getElementById('tcs-weapon-fields').style.display = this.value === 'weapon' ? '' : 'none'
          document.getElementById('tcs-armour-fields').style.display = this.value === 'armour' ? '' : 'none'
        })
      </script>
    `

    new Dialog({
      title: '장비 추가',
      content,
      buttons: {
        add: {
          label: '✓ 추가',
          callback: async html => {
            const name = html.find('#tcs-item-name').val().trim()
            if (!name) { ui.notifications.warn('이름을 입력해주세요!'); return }

            const type       = html.find('#tcs-item-type').val()
            const cost       = parseInt(html.find('#tcs-item-cost').val()) || 0
            const weight     = parseFloat(html.find('#tcs-item-weight').val()) || 0
            const tl         = parseInt(html.find('#tcs-item-tl').val()) || 0
            const notes      = html.find('#tcs-item-notes').val().trim()
            const damage      = html.find('#tcs-item-damage').val().trim() || '2D6'
            const range       = parseInt(html.find('#tcs-item-range').val()) || 0
            const magazine    = parseInt(html.find('#tcs-item-magazine').val()) || 0
            const magazineCost= parseInt(html.find('#tcs-item-ammo-cost').val()) || 0
            const skill       = html.find('#tcs-item-skill').val() || 'melee.blade'
            const traits      = html.find('#tcs-item-traits').val().trim() || ''
            const protection  = parseInt(html.find('#tcs-item-protection').val()) || 0

            const itemData = {
              name, type,
              system: {
                cost, weight, tl, quantity: 1, legality: 9,
                notes, active: false,
              }
            }

            if (type === 'weapon') {
              itemData.system.weapon = {
                damage, skill, range, magazine, magazineCost,
                characteristic: 'DEX', traits, scale: 'traveller',
              }
            } else if (type === 'armour') {
              itemData.system.armour = {
                protection, worn: false, otherProtection: 0,
                rad: 0, form: 'standard',
              }
            }

            await this.actor.createEmbeddedDocuments('Item', [itemData])
            ui.notifications.info(`${name} 추가됨!`)
          }
        },
        cancel: { label: '취소' }
      },
      default: 'add',
    }).render(true)
  }

  // ── 연줄 추가 ─────────────────────────────────────────────
  async _onAddContact() {
    const content = `
      <div class="tcs-add-dialog">
        <div class="tcs-add-row">
          <label>종류</label>
          <select id="tcs-contact-type" style="flex:1">
            <option value="contact">연줄</option>
            <option value="ally">조력자</option>
            <option value="rival">경쟁자</option>
            <option value="enemy">적수</option>
          </select>
        </div>
        <div class="tcs-add-row">
          <label>이름/설명</label>
          <input id="tcs-contact-name" type="text" placeholder="예: 해군 장교, 전직 동료..."
            style="flex:1" autofocus>
        </div>
      </div>
    `
    new Dialog({
      title: '연줄 추가',
      content,
      buttons: {
        add: {
          label: '✓ 추가',
          callback: async html => {
            const type = html.find('#tcs-contact-type').val()
            const name = html.find('#tcs-contact-name').val().trim() || type
            const REL_LABEL = { contact:'연줄', ally:'조력자', rival:'경쟁자', enemy:'적수' }
            await this.actor.createEmbeddedDocuments('Item', [{
              name,
              type: 'associate',
              system: {
                associate: { relationship: type, affinity: 1, enmity: 0, power: 0, influence: 0 },
                notes: name,
              }
            }])
            ui.notifications.info(`${REL_LABEL[type]} "${name}" 추가됨!`)
          }
        },
        cancel: { label: '취소' }
      },
      default: 'add',
    }).render(true)
  }
}
