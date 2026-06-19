// ─────────────────────────────────────────────────────────────
//  hooks.js — traveller-chargen-sheet 모듈 진입점
//  mgt2e traveller 액터에 커스텀 한글 시트 등록
// ─────────────────────────────────────────────────────────────

import { TravellerChargenSheet } from './sheet.js'
import { TcsItemSheet } from './item-sheet.js'

Hooks.once('init', () => {
  console.log('traveller-chargen-sheet | 초기화')

  // 부분 템플릿 사전 로드 ({{> ...}} 사용 전 필수)
  loadTemplates([
    'modules/traveller-chargen-sheet/templates/sheet.html',
    'modules/traveller-chargen-sheet/templates/tabs/info.html',
    'modules/traveller-chargen-sheet/templates/tabs/skills.html',
    'modules/traveller-chargen-sheet/templates/tabs/equipment.html',
    'modules/traveller-chargen-sheet/templates/tabs/shop.html',
    'modules/traveller-chargen-sheet/templates/tabs/career.html',
    'modules/traveller-chargen-sheet/templates/tabs/backstory.html',
    'modules/traveller-chargen-sheet/templates/item-sheet.html',
  ])

  // mgt2e traveller 타입 액터에 우리 시트 등록
  Actors.registerSheet('mgt2e', TravellerChargenSheet, {
    types: ['traveller'],
    makeDefault: false,
    label: '트래블러 한글 시트 (Chargen)',
  })

  // 무기/방어구/장비/강화장치에 우리 아이템 시트 등록
  Items.registerSheet('mgt2e', TcsItemSheet, {
    types: ['weapon', 'armour', 'item', 'augment'],
    makeDefault: true,
    label: '트래블러 한글 아이템 시트 (Chargen)',
  })
})
