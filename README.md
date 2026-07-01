GMV Gestão v13 - Firestore Sync

Esta versão usa Cloud Firestore para sincronizar chuvas e plantio entre celular, computador e colaboradores.

IMPORTANTE: no Firebase, ajuste as regras do Firestore para permitir leitura/gravação enquanto estiver sem login:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fazendas/matao/{document=**} {
      allow read, write: if true;
    }
  }
}

Depois publique esta pasta no GitHub Pages.
