import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const CHURCH_A = 'church_a';
const CHURCH_B = 'church_b';

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-applaine-rules',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

function member(uid, churchId, roles = { worship: [], multimedia: [], secretariat: [] }) {
  return { uid, name: uid, email: `${uid}@test.dev`, churchId, roles, status: 'active' };
}

await testEnv.clearFirestore();

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', 'memberA'), member('memberA', CHURCH_A));
  await setDoc(doc(db, 'users', 'memberA2'), member('memberA2', CHURCH_A));
  await setDoc(doc(db, 'users', 'memberB'), member('memberB', CHURCH_B));
  await setDoc(doc(db, 'users', 'leaderA'), member('leaderA', CHURCH_A, { worship: ['leader'], multimedia: [], secretariat: [] }));
  await setDoc(doc(db, 'users', 'orphan'), member('orphan', ''));
  await setDoc(doc(db, 'churches', CHURCH_A), { id: CHURCH_A, name: 'Igreja A' });
  await setDoc(doc(db, 'churches', CHURCH_B), { id: CHURCH_B, name: 'Igreja B' });
  await setDoc(doc(db, 'services', `worship_scale_config_${CHURCH_A}`), { churchId: CHURCH_A, roles: {} });
  await setDoc(doc(db, 'services', `svc_a`), { churchId: CHURCH_A, name: 'Culto', dayOfWeek: 'dom' });
  await setDoc(doc(db, 'bands', 'band_a'), { churchId: CHURCH_A, name: 'Banda A', memberIds: [] });
  await setDoc(doc(db, 'visitors', 'vis_a'), { id: 'vis_a', churchId: CHURCH_A, name: 'Visitante' });
  await setDoc(doc(db, 'availability', 'memberA_2026_9'), {
    id: 'memberA_2026_9', userId: 'memberA', churchId: CHURCH_A, month: 9, year: 2026, days: [],
  });
  await setDoc(doc(db, 'schedules', 'sched_a'), {
    id: 'sched_a', date: '2026-10-01', churchId: CHURCH_A, songs: [], members: [], roles: {},
  });
});

const anon = testEnv.unauthenticatedContext().firestore();
const memberA = testEnv.authenticatedContext('memberA', { email: 'memberA@test.dev' }).firestore();
const memberB = testEnv.authenticatedContext('memberB', { email: 'memberB@test.dev' }).firestore();
const leaderA = testEnv.authenticatedContext('leaderA', { email: 'leaderA@test.dev' }).firestore();
const superAdmin = testEnv.authenticatedContext('root', { email: 'root@test.dev', super_admin: true }).firestore();

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push([true, name]);
  } catch (err) {
    results.push([false, `${name}\n      ${String(err).split('\n')[0]}`]);
  }
}

await check('anônimo NÃO lê churches', () =>
  assertFails(getDoc(doc(anon, 'churches', CHURCH_A))));

await check('anônimo lê scale_config (fluxo de cadastro)', () =>
  assertSucceeds(getDoc(doc(anon, 'services', `worship_scale_config_${CHURCH_A}`))));

await check('anônimo NÃO lê outro doc de services', () =>
  assertFails(getDoc(doc(anon, 'services', 'svc_a'))));

await check('membro lê usuário da própria igreja', () =>
  assertSucceeds(getDoc(doc(memberA, 'users', 'memberA2'))));

await check('membro NÃO lê usuário de outra igreja', () =>
  assertFails(getDoc(doc(memberA, 'users', 'memberB'))));

await check('membro NÃO se auto-promove a leader', () =>
  assertFails(updateDoc(doc(memberA, 'users', 'memberA'), {
    roles: { worship: ['leader'], multimedia: [], secretariat: [] },
  })));

await check('membro NÃO troca a própria churchId', () =>
  assertFails(updateDoc(doc(memberA, 'users', 'memberA'), { churchId: CHURCH_B })));

await check('membro NÃO vira líder pelo campo legado role', () =>
  assertFails(updateDoc(doc(memberA, 'users', 'memberA'), { role: 'líder' })));

await check('membro atualiza o próprio telefone', () =>
  assertSucceeds(updateDoc(doc(memberA, 'users', 'memberA'), { phone: '11999999999' })));

await check('líder promove membro da própria igreja', () =>
  assertSucceeds(updateDoc(doc(leaderA, 'users', 'memberA2'), {
    roles: { worship: ['leader'], multimedia: [], secretariat: [] },
  })));

await check('líder NÃO escreve em usuário de outra igreja', () =>
  assertFails(updateDoc(doc(leaderA, 'users', 'memberB'), { phone: '11888888888' })));

await check('líder NÃO rouba usuário de outra igreja para a sua', () =>
  assertFails(updateDoc(doc(leaderA, 'users', 'memberB'), { churchId: CHURCH_A })));

await check('líder vincula usuário sem igreja à sua igreja', () =>
  assertSucceeds(updateDoc(doc(leaderA, 'users', 'orphan'), { churchId: CHURCH_A })));

await check('líder NÃO deleta usuário de outra igreja', () =>
  assertFails(deleteDoc(doc(leaderA, 'users', 'memberB'))));

await check('membro NÃO escreve em services', () =>
  assertFails(updateDoc(doc(memberA, 'services', 'svc_a'), { name: 'hackeado' })));

await check('líder escreve em services da própria igreja', () =>
  assertSucceeds(updateDoc(doc(leaderA, 'services', 'svc_a'), { name: 'Culto de Domingo' })));

await check('membro de outra igreja NÃO escreve em bands', () =>
  assertFails(updateDoc(doc(memberB, 'bands', 'band_a'), { name: 'hackeado' })));

await check('membro NÃO lê visitantes de outra igreja', () =>
  assertFails(getDoc(doc(memberB, 'visitors', 'vis_a'))));

await check('membro NÃO sobrescreve disponibilidade de outro', () =>
  assertFails(setDoc(doc(memberB, 'availability', 'memberA_2026_9'), {
    id: 'memberA_2026_9', userId: 'memberB', churchId: CHURCH_B, month: 9, year: 2026, days: [],
  })));

await check('membro escreve a própria disponibilidade', () =>
  assertSucceeds(setDoc(doc(memberA, 'availability', 'memberA_2026_10'), {
    id: 'memberA_2026_10', userId: 'memberA', churchId: CHURCH_A, month: 10, year: 2026, days: [1, 2],
  })));

await check('membro NÃO lê escala de outra igreja', () =>
  assertFails(getDoc(doc(memberB, 'schedules', 'sched_a'))));

await check('membro lê escala da própria igreja', () =>
  assertSucceeds(getDoc(doc(memberA, 'schedules', 'sched_a'))));

await check('membro NÃO cria igreja', () =>
  assertFails(setDoc(doc(memberA, 'churches', 'church_novo'), { id: 'church_novo', name: 'X' })));

await check('super admin cria igreja', () =>
  assertSucceeds(setDoc(doc(superAdmin, 'churches', 'church_novo'), { id: 'church_novo', name: 'X' })));

await check('super admin lê qualquer usuário', () =>
  assertSucceeds(getDoc(doc(superAdmin, 'users', 'memberB'))));

await check('membro NÃO se auto-inscreve como leader em departamento', () =>
  assertFails(setDoc(doc(memberA, 'churches', CHURCH_A, 'departments', 'worship', 'members', 'memberA'), {
    userId: 'memberA', roles: ['leader'],
  })));

await check('membro se auto-inscreve como instrumentista', () =>
  assertSucceeds(setDoc(doc(memberA, 'churches', CHURCH_A, 'departments', 'worship', 'members', 'memberA'), {
    userId: 'memberA', roles: ['drummer'],
  })));

await check('busca por email encontra doc pré-criado (merge do AuthProvider)', () =>
  assertSucceeds(getDocs(query(collection(memberA, 'users'), where('email', '==', 'memberA@test.dev')))));

await check('líder lista usuários sem igreja (vincular membro)', () =>
  assertSucceeds(getDocs(query(collection(leaderA, 'users'), where('churchId', '==', '')))));

await check('líder lista usuários da própria igreja', () =>
  assertSucceeds(getDocs(query(collection(leaderA, 'users'), where('churchId', '==', CHURCH_A)))));

await check('membro NÃO lista todos os usuários', () =>
  assertFails(getDocs(collection(memberA, 'users'))));

await testEnv.cleanup();

const failed = results.filter(([ok]) => !ok);
for (const [ok, name] of results) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
console.log(`\n${results.length - failed.length}/${results.length} passaram`);
process.exit(failed.length === 0 ? 0 : 1);
