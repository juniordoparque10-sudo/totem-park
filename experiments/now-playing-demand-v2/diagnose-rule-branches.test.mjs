import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const cases = [
  {
    label: 'A: autenticacao sem get()',
    condition: "request.auth != null && request.auth.uid == 'owner_12345678'",
    expectations: { owner: true, outsider: false, player: false, wrongPlayer: false }
  },
  {
    label: 'B: proprietario via exists() + get() de cliente',
    condition: "request.auth != null && exists(/databases/$(database)/documents/clients/client-v5) && get(/databases/$(database)/documents/clients/client-v5).data.get('uid', '') == request.auth.uid",
    expectations: { owner: true, outsider: false, player: false, wrongPlayer: false }
  },
  {
    label: 'C: vinculo apenas com exists() de UID',
    condition: 'request.auth != null && exists(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid))',
    expectations: { owner: false, outsider: false, player: true, wrongPlayer: true }
  },
  {
    label: 'D: vinculo com exists() e get() de status/tela',
    condition: "request.auth != null && exists(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)) && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('status', '') == 'ACTIVE' && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('screenId', '') == 'tv-v5'",
    expectations: { owner: false, outsider: false, player: true, wrongPlayer: false }
  },
  {
    label: 'E: vinculo com ternario',
    condition: "request.auth != null && (exists(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)) ? (get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('status', '') == 'ACTIVE' && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('screenId', '') == 'tv-v5') : false)",
    expectations: { owner: false, outsider: false, player: true, wrongPlayer: false }
  },
  {
    label: 'F: OR entre autorizacao cliente e Player',
    condition: "request.auth != null && ((exists(/databases/$(database)/documents/clients/client-v5) && get(/databases/$(database)/documents/clients/client-v5).data.get('uid', '') == request.auth.uid) || (exists(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)) && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('status', '') == 'ACTIVE' && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.get('screenId', '') == 'tv-v5'))",
    expectations: { owner: true, outsider: false, player: true, wrongPlayer: false }
  },
  {
    label: 'G: campo direto do cliente sem exists nem map.get',
    condition: "request.auth != null && get(/databases/$(database)/documents/clients/client-v5).data.uid == request.auth.uid",
    expectations: { owner: true, outsider: false, player: false, wrongPlayer: false }
  },
  {
    label: 'H: campo direto do binding existente',
    condition: "request.auth != null && get(/databases/$(database)/documents/playerDeviceBindings/$(request.auth.uid)).data.screenId == 'tv-v5'",
    expectations: { owner: false, outsider: false, player: true, wrongPlayer: false }
  }
];

const identities = {
  owner: ['owner_12345678','owner@example.test'],
  outsider: ['outsider_12345','outside@example.test'],
  player: ['player_12345678',null],
  wrongPlayer: ['wrong_player',null]
};

const results=[];
test('Diagnostico isolado das funcoes das regras; nao modifica projeto principal', async () => {
  for (let i=0; i<cases.length; i++) {
    const entry=cases[i];
    const rules=`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /debug/screen { allow get: if ${entry.condition}; } } }`;
    const env=await initializeTestEnvironment({projectId:`demo-totem-v5-diag-branches-${i}`,firestore:{rules}});
    try {
      await env.withSecurityRulesDisabled(async ctx=>{
        const db=ctx.firestore();
        await setDoc(doc(db,'debug/screen'),{sample:true});
        await setDoc(doc(db,'clients/client-v5'),{uid:'owner_12345678',email:'owner@example.test'});
        await setDoc(doc(db,'playerDeviceBindings/player_12345678'),{status:'ACTIVE',screenId:'tv-v5'});
        await setDoc(doc(db,'playerDeviceBindings/wrong_player'),{status:'ACTIVE',screenId:'other-tv'});
      });
      for (const [kind,[uid,email]] of Object.entries(identities)) {
        const context=env.authenticatedContext(uid,email?{email}:{});
        try {
          await getDoc(doc(context.firestore(),'debug/screen'));
          results.push({case:entry.label,identity:kind,allowed:true,expected:entry.expectations[kind]});
        } catch(err) {
          results.push({case:entry.label,identity:kind,allowed:false,expected:entry.expectations[kind],code:err.code??'',evalError:/evaluation error|1000 expressions|maximum of 1000/i.test(String(err.message)),message:String(err.message).slice(0,500)});
        }
      }
    } finally {await env.cleanup();}
  }
  console.log('\n=== RELATORIO DE RAMOS DAS REGRAS (DADOS SINTETICOS) ===');
  for(const r of results) console.log(JSON.stringify(r));
  const wrong=results.filter(x=>x.allowed!==x.expected || x.evalError);
  console.log(`\nRESULTADO: ${results.length-wrong.length}/${results.length} observacoes sem divergencias nem evaluation error.`);
  // Esse diagnostico nao aprova regras; falha propositalmente se detectar problemas.
  assert.equal(wrong.length,0,`Encontradas ${wrong.length} divergencias/erros; examine as linhas do relatorio`);
});
