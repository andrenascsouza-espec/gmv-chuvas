GMV GESTÃO v25.17 — TEMA ESCURO + SINCRONIZAÇÃO

COMO PUBLICAR NO GITHUB
1. Extraia este ZIP no computador.
2. No repositório do GitHub, substitua os arquivos antigos por TODOS os arquivos desta pasta.
3. Confirme o envio (Commit changes) e aguarde 2 a 5 minutos.
4. Abra o mesmo endereço do site no iPhone e no computador.

PRIMEIRO TESTE
1. Abra primeiro no iPhone, onde já estão os dados antigos.
2. Toque em “Sincronizar”.
3. Espere aparecer “Sincronizado agora”.
4. Abra no computador e toque em “Sincronizar”.
5. Os lançamentos de chuva, plantio, operações e produção devem aparecer.

IMPORTANTE SOBRE O FIREBASE
O Firestore precisa permitir leitura e gravação durante o teste. No Firebase Console:
Firestore Database > Regras

Regras temporárias de teste:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fazendas/matao/sistemas/{documento} {
      allow read, write: if true;
    }
  }
}

Depois clique em PUBLICAR.

ATENÇÃO
- O visual escuro foi mantido.
- Fotos grandes continuam salvas no aparelho, porque não cabem com segurança dentro de um único documento do Firestore. Nesta etapa, a sincronização cobre chuva, plantio, operações, produção e safras.
- Não apague o app/atalho do iPhone antes de confirmar que os dados foram enviados para a nuvem.
