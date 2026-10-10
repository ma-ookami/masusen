// Firebase の設定。手順書(README.md)の「4. 設定をコピーする」で表示される
// firebaseConfig の中身を、下の {} の中にそのまま貼り付けてください。
// この値は公開しても問題ありません(データは firestore.rules で守ります)。
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyBPCmCnPafjmc9N4qsjifFLktq1awch6OA",
    authDomain: "masusen-30328.firebaseapp.com",
    projectId: "masusen-30328",
    storageBucket: "masusen-30328.firebasestorage.app",
    messagingSenderId: "996131294955",
    appId: "1:996131294955:web:963f32670d2aff97f9f8ae"
};

// App Check(本物のアプリ以外からのアクセスを防ぐ)の reCAPTCHA Enterprise のキー(サイトキー)。
// README.md の「App Check を設定する」で、Google Cloud コンソールで作ったキーを "" の中に貼り付けてください。
// 空のままなら App Check は使いません。
window.APPCHECK_SITE_KEY = "6LeCvugtAAAAAOq5G9RiAuvFBvEgD1TW5JxVrYHX";
