const admin = require('firebase-admin');

// Inicializa o Firebase Admin com as credenciais padrão do ambiente apontando para o projeto.
// Isso assume que as variáveis de ambiente necessárias (como GOOGLE_APPLICATION_CREDENTIALS 
// ou FIREBASE_CONFIG) estão presentes.
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const args = process.argv.slice(2);
const emailOrUid = args[0];

if (!emailOrUid) {
  console.error("Por favor, forneça o email ou UID do usuário como argumento.");
  console.error("Exemplo: npx ts-node scripts/make-admin.ts meuemail@example.com");
  process.exit(1);
}

async function makeAdmin() {
  try {
    let user;
    if (emailOrUid.includes('@')) {
      user = await admin.auth().getUserByEmail(emailOrUid);
    } else {
      user = await admin.auth().getUser(emailOrUid);
    }

    await admin.auth().setCustomUserClaims(user.uid, {
      ...user.customClaims,
      super_admin: true,
    });

    console.log(`✅ Sucesso: O usuário ${user.email} (${user.uid}) agora é um super_admin.`);
    console.log(`O usuário precisa fazer logout e login novamente no aplicativo para que as mudanças façam efeito.`);
  } catch (error) {
    console.error("❌ Erro ao tentar tornar o usuário super admin:");
    console.error(error);
  }
}

makeAdmin();
