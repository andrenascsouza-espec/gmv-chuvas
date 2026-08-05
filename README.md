# GMV Gestão Rural v26.0

Versão focada em sincronização entre iPhone, computador e futuros celulares de operadores.

## Publicação no GitHub Pages
1. Apague/substitua os arquivos antigos do repositório pelos arquivos desta pasta.
2. Aguarde o GitHub Pages publicar.
3. No iPhone e no PC, abra o mesmo endereço do site.
4. Abra primeiro o aparelho que já contém os lançamentos e toque em **Sincronizar**.
5. Depois abra o outro aparelho e toque em **Sincronizar**.

## Firebase Firestore
A configuração do projeto já está em `firebase-config.js`. O Firestore precisa estar criado e com regras permitindo leitura e escrita para o sistema. Para o teste inicial, use no console do Firebase > Firestore Database > Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fazendas/matao/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Essas regras são apenas para o teste. Depois do login dos operadores, devem ser fechadas com autenticação.

## Importante
Abra primeiro no telefone que já tem os dados antigos; a v26.0 migra os lançamentos locais para a nuvem. Fotos antigas também são enviadas separadamente para evitar o limite de tamanho do Firestore.
