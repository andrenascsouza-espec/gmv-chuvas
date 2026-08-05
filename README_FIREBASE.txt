GMV Gestão v25.18 - Sincronização Firebase

Projeto configurado: gmv-gestao-fazenda-matao

ANTES DO TESTE:
1. No Firebase, abra Firestore Database > Regras.
2. Para o primeiro teste, use temporariamente:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fazendas/matao/{document=**} {
      allow read, write: if true;
    }
  }
}

3. Clique em Publicar.
4. Envie todos os arquivos desta pasta ao GitHub.
5. Abra PRIMEIRO no iPhone, onde estão os dados antigos.
6. Toque em Sincronizar e aguarde a mensagem verde.
7. Abra no PC e atualize a página.

ATENÇÃO: essas regras são apenas para teste. Depois do login de usuários, devem ser fechadas com autenticação.
Fotos permanecem locais nesta etapa.
