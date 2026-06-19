// ─────────────────────────────────────────────────────────────
//  item-sheet.js — TcsItemSheet
//  무기/방어구/장비/강화장치 공용 한글 아이템 시트
// ─────────────────────────────────────────────────────────────

import {
  parseItemBonuses, parseArmourSkillReq, dmStr,
  WEAPON_LEGALITY, ARMOUR_LEGALITY, SKILL_KO, CATEGORY_LABEL,
} from './sheet.js'

const _ItemSheet = foundry.appv1?.sheets?.ItemSheet ?? globalThis.ItemSheet

const CHA_OPTIONS  = ['STR','DEX','END','INT','EDU','SOC']
const DMG_TYPES    = { standard:'표준', radiation:'방사선', psi:'초능력' }
const YESNO        = { 0:'아니오', 1:'예' }

export class TcsItemSheet extends _ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['tcs-item-sheet'],
      template: 'modules/traveller-chargen-sheet/templates/item-sheet.html',
      width: 480,
      height: 'auto',
      resizable: true,
    })
  }

  async getData() {
    const ctx  = await super.getData()
    const sys  = this.item.system
    ctx.sys    = sys
    ctx.type   = this.item.type
    ctx.editable = this.isEditable

    ctx.weaponLegality = WEAPON_LEGALITY
    ctx.armourLegality = ARMOUR_LEGALITY
    ctx.skillKo  = SKILL_KO
    ctx.dmgTypes = DMG_TYPES
    ctx.yesno    = YESNO
    ctx.chaChoices = Object.fromEntries(CHA_OPTIONS.map(c => [c, c]))
    ctx.categoryLabel = CATEGORY_LABEL[this.item.type] ?? this.item.type

    ctx.isWeapon  = this.item.type === 'weapon'
    ctx.isArmour  = this.item.type === 'armour'
    ctx.isAugment = this.item.type === 'augment'
    ctx.isItem    = this.item.type === 'item'

    // 무기 특성치 DM 표시
    if (this.item.type === 'weapon') {
      ctx.skillLabel = sys.skill
        ? sys.skill.split('.').map(p => SKILL_KO[p] || p).join(' / ')
        : '-'
      // traits 문자열을 태그 배열로 파싱
      const rawTraits = sys.weapon?.traits ?? ''
      ctx.traitTags = rawTraits ? rawTraits.split(',').map(t => t.trim()).filter(Boolean) : []
    }

    // 방어구/강화장치: 장착 시 적용될 보너스 미리보기
    if (this.item.type === 'armour' || this.item.type === 'augment') {
      const notes = sys.notes ?? ''
      const b = parseItemBonuses(notes)
      const lines = []
      const choiceM = notes.match(/중\s*하나\s*\+(\d+)/)
      if (choiceM) {
        const choice = this.item.getFlag('traveller-chargen-sheet', 'augChoice')
        lines.push(choice
          ? `${choice} +${choiceM[1]} (선택됨)`
          : `STR/DEX/END 중 하나 +${choiceM[1]} (아래에서 선택 필요)`)
        ctx.isChoiceAug = true
        ctx.augChoice   = choice ?? ''
        ctx.choiceVal   = choiceM[1]
      } else {
        for (const k of ['STR','DEX','END','INT','EDU','SOC']) if (b[k]) lines.push(`${k} +${b[k]}`)
      }
      // "기능 강화 이식" 등 — 하나의 기능에 레벨 +N 향상 (플레이어 선택)
      const skillM = notes.match(/하나의\s*기능에\s*레벨\s*\+(\d+)\s*향상/)
      if (skillM) {
        const choice = this.item.getFlag('traveller-chargen-sheet', 'augChoiceSkill')
        ctx.isSkillChoiceAug = true
        ctx.skillChoiceVal   = skillM[1]
        ctx.augChoiceSkill   = choice ?? ''
        const SKIP = new Set(['energy','slug','unarmed','blade','bludgeon','artillery','portable'])
        ctx.skillChoices = Object.fromEntries(
          Object.entries(SKILL_KO).filter(([k]) => !SKIP.has(k))
        )
        lines.push(choice
          ? `기능: ${SKILL_KO[choice] ?? choice} +${skillM[1]} (선택됨)`
          : `기능 1개에 +${skillM[1]} (아래에서 선택 필요)`)
      }
      if (b.protection) lines.push(`방호도 +${b.protection}`)
      const compM = notes.match(/컴퓨터\/(\d+)/)
      if (compM) lines.push(`컴퓨터/${compM[1]} 기능 부여`)
      if (this.item.type === 'armour') {
        const req = parseArmourSkillReq(sys.armour?.skill ?? '')
        if (req) lines.push(`요구 기능: ${req.name} ${req.level} (부족 시 전판정 패널티 -1/레벨, 미보유 -3)`)
      }
      ctx.previewLines = lines
    }

    return ctx
  }

  activateListeners(html) {
    super.activateListeners(html)
    if (!this.isEditable) return

    // 신체 강화류: STR/DEX/END 선택
    html.on('change', '.tcs-aug-choice', ev => {
      this.item.setFlag('traveller-chargen-sheet', 'augChoice', ev.currentTarget.value)
    })
    // 기능 강화 이식: 기능 선택
    html.on('change', '.tcs-aug-choice-skill', ev => {
      this.item.setFlag('traveller-chargen-sheet', 'augChoiceSkill', ev.currentTarget.value)
    })

    // ── 무기 특성 태그 편집 ──────────────────────────────
    const getTraits = () => {
      const raw = this.item.system?.weapon?.traits ?? ''
      return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : []
    }
    const saveTraits = traits => this.item.update({ 'system.weapon.traits': traits.join(', ') })

    // 드롭다운 선택 시 숫자/커스텀 입력칸 표시
    html.on('change', '.tcs-traits-select', ev => {
      const val = ev.currentTarget.value
      const needsNum = ev.currentTarget.selectedOptions[0]?.dataset?.needsNum === '1'
      html.find('.tcs-traits-num').toggle(needsNum).val('')
      html.find('.tcs-traits-custom').toggle(val === '__custom').val('')
    })

    // 추가 버튼
    html.on('click', '.tcs-traits-add-btn', () => {
      const sel = html.find('.tcs-traits-select').val()
      if (!sel) return
      let label
      if (sel === '__custom') {
        label = html.find('.tcs-traits-custom').val().trim()
        if (!label) return
      } else if (sel.endsWith('_N')) {
        const num = parseInt(html.find('.tcs-traits-num').val()) || 1
        label = sel.replace('_N', '') + ' ' + num
      } else {
        label = sel
      }
      const traits = getTraits()
      if (!traits.includes(label)) traits.push(label)
      saveTraits(traits)
      // UI 초기화
      html.find('.tcs-traits-select').val('')
      html.find('.tcs-traits-num').hide().val('')
      html.find('.tcs-traits-custom').hide().val('')
    })

    // 삭제 버튼
    html.on('click', '.tcs-trait-remove', ev => {
      const trait = ev.currentTarget.dataset.trait
      const traits = getTraits().filter(t => t !== trait)
      saveTraits(traits)
    })
  }
}
