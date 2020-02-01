import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

//const serviceAccount = require('./secret-key.json')
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  //credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nwoc-sm.firebaseio.com',
  storageBucket: 'nwoc-sm.appspot.com'
})
const firestore = admin.firestore()
const database = admin.database()
const bucket = admin.storage().bucket()

interface IScore {
  [key: string]: string|undefined|number
  name: string
  otherName?: string
  address: string
  year?: number
  publisher?: string
  singer?: string
  note?: string
}
interface IScores {
  [key: string]: object
}
interface IStringKeyValue {
  [key: string]: string
}

// Firestoreからdatabaseとstorageにバックアップする
exports.backup = functions.https.onRequest(async (req, res) => {
  let statusCode = 200
  // 一時保管ファイルとそのディレクトリ
  const tmpDitPath = os.tmpdir()
  const tmpFilePath = path.join(tmpDitPath, 'tmp.json')
  // databaseの保存先
  const scoresRef = database.ref('scores')

  try {
    // 出版社と保管場所は参照で保存してるので参照を解決する
    const publishers: IStringKeyValue = {}  // 出版社
    const addresses: IStringKeyValue = {}   // 保管場所
    const pubSnap = await firestore.collection('publishers').get()
    pubSnap.forEach(doc => {
      publishers[doc.id] = doc.data().name
    })
    const adrSnap = await firestore.collection('addresses').get()
    adrSnap.forEach(doc => {
      addresses[doc.id] = doc.data().address
    })

    // 一覧を取得
    const scores: IScores = {}
    const scoreSnap = await firestore.collection('scores').get()
    scoreSnap.forEach(async doc => {
      const data = doc.data()
      const address = addresses[data.address.id]
      let year,publisher
      if (address === '課題曲') {
        year = data.year
      } else {
        publisher = publishers[data.publisher.id]
      }
      const score: IScore = {
        name: data.name,
        otherName: data.otherName,
        address: address,
        year: year,
        publisher: publisher,
        singer: data.singer,
        note: data.note
      }
      // remove undefined value
      Object.keys(score).forEach(key => score[key] === undefined && delete score[key])
      scores[doc.id] = score

      await scoresRef.child(doc.id).set(score).catch(console.error)
    })
    //res.send(`<p>${JSON.stringify(obj)}</p>`)

    // Storageにアップロード
    fs.writeFileSync(tmpFilePath, JSON.stringify(scores))
    await bucket.upload(tmpFilePath, {
      destination: 'backup/scores.json',
      metadata: { contentType: 'application/json' }
    })
  } catch (err) {
    console.log(err)
    // エラーが発生したらサーバーエラー(500)で終了
    statusCode = 500
    res.send('<p>Error</p>')
    res.send(`<p>${JSON.stringify(err)}</p>`)
  } finally {
    if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath)
    res.status(statusCode)
    res.end()
  }
})