import { auth } from 'firebase-admin';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp({
  projectId: firebaseConfig.projectId
}) : getApp();

async function setSuperAdmin(email: string) {
  try {
    const user = await auth().getUserByEmail(email);
    await auth().setCustomUserClaims(user.uid, { super_admin: true });
    console.log(`Sucesso: Custom Claim '{ super_admin: true }' foi injetado no usuário ${email} (UID: ${user.uid}).`);
    console.log('Lembre-se de fazer o logout e login novamente na aplicação para que o novo token seja gerado e validado.');
  } catch (error) {
    console.error('Erro ao definir super_admin:', error);
  }
}

// Para executar, passe o e-mail como argumento, ex:
// npx tsx scripts/set-super-admin.ts pedrohenriqueribei@gmail.com
const emailArg = process.argv[2];

if (!emailArg) {
  console.log('Por favor, informe o email do usuário como argumento.');
  console.log('Uso: npx tsx scripts/set-super-admin.ts <email>');
  process.exit(1);
}

setSuperAdmin(emailArg);
