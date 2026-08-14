// Roda uma vez: seta isOwner=true no doc users/{uid} no Firestore.
//
// Uso:
//   LUNA_FIREBASE_KEY=C:\Users\ethan\Documents\Projects\Luna\Keys\minha-chave.json \
//     node set-owner-flag.js <seu-uid>
//
// Por padrão procura em ./serviceAccountKey.json (pasta do script).
//
// Pega o UID em: Firebase Console → Authentication → seu user → UID.

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

const uid = process.argv[2]
if (!uid) {
  console.error('Uso: node set-owner-flag.js <uid>')
  console.error('Defina LUNA_FIREBASE_KEY=/caminho/para/chave.json se não estiver na mesma pasta.')
  process.exit(1)
}

const keyPath = process.env.LUNA_FIREBASE_KEY || path.join(__dirname, 'serviceAccountKey.json')
if (!fs.existsSync(keyPath)) {
  console.error(`Chave não encontrada em: ${keyPath}`)
  console.error('Defina LUNA_FIREBASE_KEY com o caminho absoluto da chave.')
  process.exit(1)
}

const serviceAccount = require(keyPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function main() {
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()

  if (!snap.exists) {
    console.log(`Doc users/${uid} não existe. Criando...`)
    await ref.set(
      {
        isOwner: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    console.log(`✓ Doc criado com isOwner=true`)
  } else {
    const current = snap.data()
    if (current.isOwner === true) {
      console.log(`✓ users/${uid} já tem isOwner=true`)
      return
    }
    await ref.update({ isOwner: true })
    console.log(`✓ users/${uid} atualizado: isOwner=true`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err.message)
    process.exit(1)
  })

